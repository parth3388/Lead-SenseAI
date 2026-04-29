from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from .config import settings

# configuration-driven URL
DATABASE_URL = settings.database_url

# ``check_same_thread`` is only needed for SQLite; SQLAlchemy will
# ignore the option for other databases.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

# ``autocommit``/``autoflush`` left at defaults; application code should
# control transaction boundaries explicitly via session scopes.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
