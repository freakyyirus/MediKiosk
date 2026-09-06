"""
MediKiosk Application Configuration.

Loads settings from environment variables / .env file using Pydantic Settings.
"""

import shutil
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ---- Application ----
    app_env: str = "development"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    app_secret_key: str = "change-me-to-a-random-secret-key"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # ---- PostgreSQL ----
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "medikiosk"
    postgres_user: str = "medikiosk"
    postgres_password: str = "medikiosk_dev_password"

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    @property
    def database_url_sync(self) -> str:
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    # ---- Redis ----
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: str = ""

    @property
    def redis_url(self) -> str:
        if self.redis_password:
            return f"redis://:{self.redis_password}@{self.redis_host}:{self.redis_port}/0"
        return f"redis://{self.redis_host}:{self.redis_port}/0"

    # ---- MinIO ----
    minio_host: str = "localhost"
    minio_port: int = 9000
    minio_root_user: str = "medikiosk"
    minio_root_password: str = "medikiosk_minio_password"
    minio_bucket: str = "medikiosk-documents"

    # ---- Supabase (managed PostgREST + Storage) ----
    # Backend talks to Supabase with the SERVICE ROLE key (server-side ONLY).
    # The anon key is for the frontend kiosk only and never grants PHI access.
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_bucket: str = "medikiosk-documents"

    # ---- Clerk (single source of auth) ----
    # Clerk issues JWTs signed with RSA keys published at:
    #   {clerk_issuer}/.well-known/jwks.json
    # Derivable from the pub key if CLERK_JWKS/ISSUER are unset.
    clerk_issuer: str = ""
    clerk_jwks_url: str = ""

    # ---- JWT ----
    jwt_secret_key: str = "change-me-to-a-random-jwt-secret"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7

    # ---- Bhashini ASR ----
    bhashini_api_key: str = ""
    bhashini_user_id: str = ""
    bhashini_ulca_api_key: str = ""
    bhashini_pipeline_url: str = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"

    # ---- Google Gemini ----
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"

    # ---- ABDM Sandbox ----
    abdm_base_url: str = "https://dev.abdm.gov.in/gateway"
    abdm_client_id: str = ""
    abdm_client_secret: str = ""

    # ---- Google Cloud Vision (Fallback OCR) ----
    google_cloud_vision_api_key: str = ""

    # ---- Tesseract ----
    tesseract_cmd: str = shutil.which("tesseract") or "/usr/bin/tesseract"

    # ---- Logging ----
    log_level: str = "INFO"
    log_format: str = "json"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
