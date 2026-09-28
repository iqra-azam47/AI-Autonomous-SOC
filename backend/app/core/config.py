import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    ENVIRONMENT: str = Field(default="development")
    PORT: int = Field(default=8000)
    HOST: str = Field(default="0.0.0.0")

    # Database
    # Default to local sqlite for instant zero-dependency testing, Neon PostgreSQL in production
    DATABASE_URL: str = Field(default="sqlite:///./soc.db")

    # JWT
    JWT_SECRET: str = Field(default="soc-super-secret-jwt-key-for-development-purposes-only-32b")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440) # 24 hours

    # Gemini
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash")

    # Threat Intelligence
    ABUSEIPDB_API_KEY: str = Field(default="")
    VIRUSTOTAL_API_KEY: str = Field(default="")

    # CORS
    CORS_ORIGINS: str = Field(default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
    BACKEND_URL: str = Field(default="http://localhost:8000")
    FRONTEND_URL: str = Field(default="http://localhost:5173")

    # Risk Thresholds
    RISK_THRESHOLD_LOW: int = Field(default=25)
    RISK_THRESHOLD_MEDIUM: int = Field(default=50)
    RISK_THRESHOLD_HIGH: int = Field(default=75)

    # Ingestion
    MAX_UPLOAD_SIZE_BYTES: int = Field(default=10 * 1024 * 1024) # 10MB limit

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["*"]
        origins = []
        for origin in self.CORS_ORIGINS.split(","):
            cleaned = origin.strip()
            if cleaned:
                # Browser Origin headers never contain a trailing slash (RFC 6454 Section 6.2)
                origins.append(cleaned.rstrip("/"))
                if cleaned.endswith("/"):
                    origins.append(cleaned)
        return list(dict.fromkeys(origins))

    @property
    def clean_database_url(self) -> str:
        url = self.DATABASE_URL
        # Neon or other postgres URLs may start with postgres://, SQLAlchemy expects postgresql://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        return url

settings = Settings()
