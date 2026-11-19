import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://amigo_user:amigo_pass@localhost:5432/amigo_vizinhanca",
)

# pool_pre_ping: bancos gerenciados suspendem conexões ociosas; testa antes de usar.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)
