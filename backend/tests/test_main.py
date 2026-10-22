def test_inicio(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "API do Amigo da Vizinhança funcionando!"
    }


def test_health(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok"
    }


def test_db_health(client, monkeypatch):
    class ResultadoFalso:
        def one(self):
            return ("amigo_vizinhanca_test", "amigo_user_test")

    class ConexaoFalsa:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc_value, traceback):
            pass

        def execute(self, query):
            return ResultadoFalso()

    class EngineFalso:
        def connect(self):
            return ConexaoFalsa()

    monkeypatch.setattr(
        "backend.app.main.engine",
        EngineFalso()
    )

    response = client.get("/db-health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "amigo_vizinhanca_test",
        "user": "amigo_user_test"
    }


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

    assert response.json() == {
        "id": 1,
        "nome": "Iluminação"
    }


def test_buscar_categoria_inexistente(client):
    response = client.get("/categorias/999")

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Categoria não encontrada"
    }


def test_buscar_categoria_id_invalido(client):
    response = client.get("/categorias/abc")

    assert response.status_code == 422