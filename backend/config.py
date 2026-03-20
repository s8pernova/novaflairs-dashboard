"""Application configuration."""

import os
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"
LOGS_DIR = BASE_DIR / "logs"
SQL_DIR = BACKEND_DIR / "sql"

CURRENT_YEAR = datetime.now().year


class Settings(BaseSettings):
    """Application settings from environment variables."""

    model_config = SettingsConfigDict(
        case_sensitive=False,
        extra="ignore",
        env_file_encoding="utf-8",
    )

    # Environment
    ENVIRONMENT: Literal["local", "production"] = "local"

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    env_file = os.getenv("ENV_FILE")

    if not env_file:
        environment = os.getenv("ENVIRONMENT", "local").lower()
        local_env = BACKEND_DIR / ".env"
        if environment in {"local", "dev", "development"} and local_env.exists():
            env_file = str(local_env)

    return Settings(_env_file=env_file or None)
