# pydantic v2 separates settings functionality into its own package
from pathlib import Path

from pydantic_settings import BaseSettings


SERVICE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATABASE_PATH = SERVICE_ROOT / "data" / "leadsense.db"
DEFAULT_MODEL_PATH = SERVICE_ROOT / "models" / "xgb_model.pkl"


class Settings(BaseSettings):
    """Application configuration pulled from environment or .env file."""

    database_url: str = f"sqlite:///{DEFAULT_DATABASE_PATH.as_posix()}"
    model_path: str = str(DEFAULT_MODEL_PATH)

    class Config:
        env_file = str(SERVICE_ROOT / ".env")


settings = Settings()
