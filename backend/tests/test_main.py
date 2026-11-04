def test_inicio(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "API do Amigo da Vizinhança funcionando!"}


def test_health(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_db_health_consulta_o_banco_e_nao_expoe_detalhes(client):
    response = client.get("/db-health")

    assert response.status_code == 200
    # Resposta pública: sem nome do banco, usuário ou qualquer detalhe interno.
    assert response.json() == {"status": "ok"}


def test_engine_valida_conexoes_antes_de_usar():
    from backend.app.database import engine

    # Bancos gerenciados (Neon/Render) suspendem conexões ociosas.
    assert engine.pool._pre_ping is True


def test_listar_categorias(client):
    response = client.get("/categorias")

    assert response.status_code == 200

    categorias = response.json()

    assert len(categorias) == 5

    assert [categoria["nome"] for categoria in categorias] == [
        "Iluminação",
        "Limpeza",
        "Infraestrutura",
        "Segurança",
        "Outros",
    ]


def test_buscar_categoria_existente(client):
    response = client.get("/categorias/1")

    assert response.status_code == 200

    assert response.json() == {"id": 1, "nome": "Iluminação"}


def test_buscar_categoria_inexistente(client):
    response = client.get("/categorias/999")

    assert response.status_code == 404

    assert response.json() == {"detail": "Categoria não encontrada"}


def test_buscar_categoria_id_invalido(client):
    response = client.get("/categorias/abc")

    assert response.status_code == 422
