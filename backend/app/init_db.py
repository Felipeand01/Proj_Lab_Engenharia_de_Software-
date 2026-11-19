from backend.app.database import SessionLocal, engine
from backend.app.models import Base
from backend.app.seed import semear_categorias

Base.metadata.create_all(bind=engine)

with SessionLocal() as session:
    semear_categorias(session)

print("Tabelas criadas e categorias iniciais garantidas!")
