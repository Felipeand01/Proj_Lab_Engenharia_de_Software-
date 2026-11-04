"""Testes da foto da ocorrência: upload, validação, reencode e armazenamento."""

import io

import pytest
from PIL import Image

from backend.app import fotos
from backend.tests.test_admin import autenticar_admin
from backend.tests.test_ocorrencias import autenticar, criar, definir_status


def imagem(formato="PNG", tamanho=(40, 30), modo="RGB", **opcoes) -> bytes:
    saida = io.BytesIO()
    Image.new(modo, tamanho, "red").save(saida, format=formato, **opcoes)
    return saida.getvalue()


def enviar(client, ocorrencia_id, headers=None, conteudo=None, nome="foto.png"):
    conteudo = imagem() if conteudo is None else conteudo
    return client.post(
        f"/ocorrencias/{ocorrencia_id}/foto",
        files={"arquivo": (nome, conteudo, "image/png")},
        headers=headers or {},
    )


@pytest.fixture
def morador(client):
    return autenticar(client)


@pytest.fixture
def ocorrencia(client, morador):
    return criar(client, morador)


def baixar(client, url) -> bytes:
    resposta = client.get(url)
    assert resposta.status_code == 200
    assert resposta.headers["content-type"] == "image/jpeg"
    return resposta.content


# --- caminho feliz e armazenamento local ---


def test_autor_envia_foto_e_ela_fica_acessivel_por_url_http(
    client, morador, ocorrencia
):
    resposta = enviar(client, ocorrencia["id"], morador)

    assert resposta.status_code == 200, resposta.text
    url = resposta.json()["foto_url"]
    assert url.startswith("http://testserver/fotos/") and url.endswith(".jpg")
    assert baixar(client, url).startswith(b"\xff\xd8")  # JPEG real
    detalhe = client.get(f"/ocorrencias/{ocorrencia['id']}").json()
    assert detalhe["foto_url"] == url


def test_nova_foto_substitui_a_anterior(client, morador, ocorrencia):
    primeira = enviar(client, ocorrencia["id"], morador).json()["foto_url"]
    segunda = enviar(client, ocorrencia["id"], morador).json()["foto_url"]

    assert primeira != segunda
    detalhe = client.get(f"/ocorrencias/{ocorrencia['id']}").json()
    assert detalhe["foto_url"] == segunda


def test_admin_tambem_pode_enviar_foto(client, ocorrencia):
    admin = autenticar_admin(client)

    assert enviar(client, ocorrencia["id"], admin).status_code == 200


def test_exif_e_removido_e_imagem_e_reencodada_como_jpeg(client, morador, ocorrencia):
    exif = Image.Exif()
    exif[0x010F] = "Camera Secreta"
    original = imagem("JPEG", exif=exif)
    assert Image.open(io.BytesIO(original)).getexif()  # o original tem EXIF

    url = enviar(client, ocorrencia["id"], morador, original, "x.jpg").json()[
        "foto_url"
    ]

    processada = Image.open(io.BytesIO(baixar(client, url)))
    assert processada.format == "JPEG"
    assert not processada.getexif()


def test_png_com_transparencia_e_aceito(client, morador, ocorrencia):
    conteudo = imagem("PNG", modo="RGBA")

    assert enviar(client, ocorrencia["id"], morador, conteudo).status_code == 200


def test_imagem_grande_e_reduzida(client, morador, ocorrencia):
    conteudo = imagem("PNG", tamanho=(3000, 2000))

    url = enviar(client, ocorrencia["id"], morador, conteudo).json()["foto_url"]

    largura, altura = Image.open(io.BytesIO(baixar(client, url))).size
    assert max(largura, altura) == fotos.MAX_LADO


def test_foto_inexistente_retorna_404(client):
    assert client.get("/fotos/nao-existe.jpg").status_code == 404


# --- autenticação e autorização ---


def test_enviar_foto_sem_token_retorna_401(client, ocorrencia):
    assert enviar(client, ocorrencia["id"]).status_code == 401


def test_outro_morador_nao_envia_foto_retorna_403(client, ocorrencia):
    outro = autenticar(client)

    assert enviar(client, ocorrencia["id"], outro).status_code == 403
    assert client.get(f"/ocorrencias/{ocorrencia['id']}").json()["foto_url"] is None


def test_enviar_foto_de_ocorrencia_inexistente_retorna_404(client, morador):
    assert enviar(client, 999999, morador).status_code == 404


def test_ocorrencia_arquivada_nao_aceita_foto(client, morador, ocorrencia):
    definir_status(ocorrencia["id"], "Arquivado")

    assert enviar(client, ocorrencia["id"], morador).status_code == 409


# --- validação do arquivo ---


def test_texto_renomeado_como_png_retorna_422(client, morador, ocorrencia):
    resposta = enviar(client, ocorrencia["id"], morador, b"nao sou imagem", "a.png")

    assert resposta.status_code == 422


def test_arquivo_vazio_retorna_422(client, morador, ocorrencia):
    assert enviar(client, ocorrencia["id"], morador, b"").status_code == 422


def test_formato_nao_permitido_retorna_422(client, morador, ocorrencia):
    gif = imagem("GIF")

    assert enviar(client, ocorrencia["id"], morador, gif, "a.gif").status_code == 422


def test_sem_campo_arquivo_retorna_422(client, morador, ocorrencia):
    resposta = client.post(f"/ocorrencias/{ocorrencia['id']}/foto", headers=morador)

    assert resposta.status_code == 422


def test_arquivo_acima_do_limite_retorna_413(client, morador, ocorrencia, monkeypatch):
    monkeypatch.setattr(fotos, "MAX_BYTES", 1000)

    resposta = enviar(client, ocorrencia["id"], morador, b"x" * 2000)

    assert resposta.status_code == 413


def test_imagem_com_pixels_demais_retorna_422(client, morador, ocorrencia, monkeypatch):
    monkeypatch.setattr(fotos, "MAX_PIXELS", 100)

    assert enviar(client, ocorrencia["id"], morador).status_code == 422


def test_criar_ocorrencia_ignora_foto_url_enviada_pelo_cliente(client, morador):
    criada = criar(client, morador, foto_url="https://exemplo.com/foto.jpg")

    assert criada["foto_url"] is None


# --- Cloudinary (HTTPS + Basic Auth), sem rede real ---


class RespostaFalsa:
    def __init__(self, dados=None, erro=None):
        self._dados, self._erro = dados, erro

    def raise_for_status(self):
        if self._erro:
            raise self._erro

    def json(self):
        return self._dados


@pytest.fixture
def cloudinary(monkeypatch):
    monkeypatch.setenv("FOTO_STORAGE", "cloudinary")
    monkeypatch.setenv("CLOUDINARY_CLOUD_NAME", "nuvem-teste")
    monkeypatch.setenv("CLOUDINARY_API_KEY", "chave-teste")
    monkeypatch.setenv("CLOUDINARY_API_SECRET", "segredo-teste")


def test_cloudinary_usa_https_e_basic_auth_e_salva_secure_url(
    client, morador, ocorrencia, cloudinary, monkeypatch
):
    chamadas = []

    def falso(url, **kwargs):
        chamadas.append((url, kwargs))
        return RespostaFalsa({"secure_url": "https://res.cloudinary.com/x/foto.jpg"})

    monkeypatch.setattr(fotos.httpx, "post", falso)

    resposta = enviar(client, ocorrencia["id"], morador)

    assert resposta.status_code == 200
    assert resposta.json()["foto_url"] == "https://res.cloudinary.com/x/foto.jpg"
    url, kwargs = chamadas[0]
    assert url == "https://api.cloudinary.com/v1_1/nuvem-teste/image/upload"
    assert kwargs["auth"] == ("chave-teste", "segredo-teste")
    assert kwargs["files"]["file"][2] == "image/jpeg"
    assert "segredo-teste" not in resposta.text


def test_falha_do_cloudinary_retorna_502_e_nao_altera_a_ocorrencia(
    client, morador, ocorrencia, cloudinary, monkeypatch
):
    def falso(url, **kwargs):
        raise fotos.httpx.ConnectError("sem rede")

    monkeypatch.setattr(fotos.httpx, "post", falso)

    resposta = enviar(client, ocorrencia["id"], morador)

    assert resposta.status_code == 502
    assert "sem rede" not in resposta.text
    assert client.get(f"/ocorrencias/{ocorrencia['id']}").json()["foto_url"] is None


def test_resposta_do_cloudinary_sem_secure_url_retorna_502(
    client, morador, ocorrencia, cloudinary, monkeypatch
):
    monkeypatch.setattr(fotos.httpx, "post", lambda url, **kw: RespostaFalsa({}))

    assert enviar(client, ocorrencia["id"], morador).status_code == 502


def test_cloudinary_sem_credenciais_retorna_503(
    client, morador, ocorrencia, cloudinary, monkeypatch
):
    monkeypatch.delenv("CLOUDINARY_API_SECRET")

    assert enviar(client, ocorrencia["id"], morador).status_code == 503
