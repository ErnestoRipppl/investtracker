"""
Configuration module using Pydantic Settings.
Loads from environment variables and .env file.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    DATABASE_URL: str = "sqlite:///./data/portfolio.db"
    DEBUG: bool = False
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]
    ALPHA_VANTAGE_API_KEY: str = ""

    # Auth configuration
    JWT_SECRET: str = "default-local-jwt-secret-key-please-change-in-production"
    AUTH_PASSWORD_HASH: str = "$2b$12$Ra4c0ZiFIyq357eukqQ2UOotgNIttYrDgn.sJvplqyT0aWGQuBOxC"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return v

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
