from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session

DB_PATH = Path(__file__).resolve().parent.parent.parent / "floodops.db"
DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

print(f"[DB] Using database at: {DB_PATH}")

engine = create_engine(
    DATABASE_URL,
    echo=True,
    connect_args={"check_same_thread": False},
)

def create_db_and_tables():
    print("[DB] Creating tables...")
    SQLModel.metadata.create_all(engine)
    print("[DB] Tables created.")

def get_session():
    with Session(engine) as session:
        yield session