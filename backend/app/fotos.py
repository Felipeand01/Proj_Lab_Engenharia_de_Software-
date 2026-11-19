"""Foto da ocorrência: validação, reencode seguro e armazenamento.

FOTO_STORAGE=local (padrão, só desenvolvimento/testes): grava em FOTO_DIR e serve em /fotos.
FOTO_STORAGE=cloudinary: envia ao Cloudinary (HTTPS + Basic Auth); os segredos ficam só aqui.
"""

import io
import logging
import os
import secrets
from pathlib import Path

import httpx
from fastapi import HTTPException, Request
from PIL import Image, ImageOps, UnidentifiedImageError

logger = logging.getLogger(__name__)

MAX_BYTES = int(os.getenv("FOTO_MAX_BYTES", 5 * 1024 * 1024))
MAX_LADO = 1600  # maior lado, em pixels, após reduzir
MAX_PIXELS = 25_000_000  # evita imagens enormes em pixels (decompression bomb)
FORMATOS = {"JPEG", "PNG", "WEBP"}

PASTA = Path(os.getenv("FOTO_DIR") or Path(__file__).resolve().parents[1] / "uploads")
PASTA.mkdir(parents=True, exist_ok=True)


def reencodar(conteudo: bytes) -> bytes:
    """Valida o conteúdo real e devolve um JPEG sem metadados (EXIF/GPS)."""
    if len(conteudo) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="A foto excede o tamanho máximo")
    invalida = HTTPException(
        status_code=422, detail="Envie uma imagem JPEG, PNG ou WebP válida"
    )
    try:
        imagem = Image.open(io.BytesIO(conteudo))
        if imagem.format not in FORMATOS or imagem.width * imagem.height > MAX_PIXELS:
            raise invalida
        # Aplica a rotação do EXIF antes de descartá-lo.
        imagem = ImageOps.exif_transpose(imagem)
        # Transparência vira fundo branco.
        fundo = Image.new("RGB", imagem.size, "white")
        imagem = imagem.convert("RGBA")
        fundo.paste(imagem, mask=imagem.getchannel("A"))
        fundo.thumbnail((MAX_LADO, MAX_LADO))
        saida = io.BytesIO()
        fundo.save(saida, format="JPEG", quality=85, optimize=True)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise invalida from None
    return saida.getvalue()


def _salvar_local(jpeg: bytes, request: Request) -> str:
    nome = f"{secrets.token_urlsafe(16)}.jpg"  # nome gerado: nunca vem do cliente
    (PASTA / nome).write_bytes(jpeg)
    # URL absoluta montada com o host da requisição, acessível pelo navegador.
    return str(request.url_for("fotos", path=nome))


def _salvar_cloudinary(jpeg: bytes) -> str:
    nuvem = os.getenv("CLOUDINARY_CLOUD_NAME")
    chave = os.getenv("CLOUDINARY_API_KEY")
    segredo = os.getenv("CLOUDINARY_API_SECRET")
    if not (nuvem and chave and segredo):
        logger.error("Cloudinary selecionado, mas as credenciais não estão no ambiente")
        raise HTTPException(
            status_code=503, detail="Armazenamento de fotos indisponível no momento"
        )
    try:
        resposta = httpx.post(
            f"https://api.cloudinary.com/v1_1/{nuvem}/image/upload",
            auth=(chave, segredo),
            files={"file": ("foto.jpg", jpeg, "image/jpeg")},
            data={"folder": "amigo-da-vizinhanca"},
            timeout=20,
        )
        resposta.raise_for_status()
        return resposta.json()["secure_url"]
    except (httpx.HTTPError, KeyError, ValueError) as erro:
        # Registra só o código HTTP ou o tipo do erro: a mensagem pode conter a URL da requisição.
        if isinstance(erro, httpx.HTTPStatusError):
            logger.error("Upload Cloudinary falhou: HTTP %s", erro.response.status_code)
        else:
            logger.error("Falha ao enviar foto ao Cloudinary: %s", type(erro).__name__)
        raise HTTPException(
            status_code=502, detail="Não foi possível armazenar a foto agora"
        ) from None


def armazenar(jpeg: bytes, request: Request) -> str:
    """Guarda o JPEG já validado e devolve a URL pública."""
    if os.getenv("FOTO_STORAGE", "local") == "cloudinary":
        return _salvar_cloudinary(jpeg)
    return _salvar_local(jpeg, request)
