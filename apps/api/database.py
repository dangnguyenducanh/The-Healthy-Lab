from pathlib import Path
import os

from sqlalchemy import create_engine
from sqlalchemy import inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool


DEFAULT_DB_PATH = Path(__file__).with_name("healthy_lab.db")


def _normalise_url(url: str) -> str:
    # Supabase and most hosts hand out postgres:// URLs; SQLAlchemy needs the psycopg 3 driver named.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


DATABASE_URL = _normalise_url(os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}"))
IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Serverless: each function instance is short-lived and Supabase's transaction pooler holds the
    # real connections, so no client-side pool, and no server-side prepared statements (the pooler
    # may hand the next transaction to a different backend).
    engine = create_engine(DATABASE_URL, poolclass=NullPool, connect_args={"prepare_threshold": None})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def create_db_and_tables():
    import models  # noqa: F401  (registers every table on Base)

    Base.metadata.create_all(bind=engine)
    apply_startup_schema_patches()


# Local SQLite files made by older versions get new columns added in place; Postgres is created
# fresh by seed.py, so these patches never run there.
SQLITE_SCHEMA_PATCHES = {
    "order_items": [
        ("product_id", "ALTER TABLE order_items ADD COLUMN product_id INTEGER"),
        ("custom_data", "ALTER TABLE order_items ADD COLUMN custom_data TEXT"),
    ],
    "users": [
        ("is_active", "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"),
    ],
}


def apply_startup_schema_patches():
    if not IS_SQLITE:
        return

    with engine.begin() as connection:
        inspector = inspect(connection)
        table_names = set(inspector.get_table_names())
        for table_name, patches in SQLITE_SCHEMA_PATCHES.items():
            if table_name not in table_names:
                continue
            column_names = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, statement in patches:
                if column_name not in column_names:
                    connection.execute(text(statement))
                    column_names.add(column_name)


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
