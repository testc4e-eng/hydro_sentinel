from typing import List, Union
from pydantic import AnyHttpUrl, EmailStr, validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Hydro Sentinel"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = []

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("["):
                # Parse JSON array
                import json
                return json.loads(v)
            # Fallback: split by comma
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        # Default for development
        return ["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"]

    # Database
    # Default to SQLite for local dev if Postgres generic URL is present or if env var is missing
    # In production, this will be overridden by the actual Postgres URL
    DATABASE_URL: str = "sqlite+aiosqlite:///./sql_app.db"

    @staticmethod
    def _normalize_asyncpg_query_params(url: str) -> str:
        parts = urlsplit(url)
        query_items = parse_qsl(parts.query, keep_blank_values=True)
        normalized_items = []

        for key, value in query_items:
            lowered = key.lower()
            if lowered == "sslmode":
                normalized_items.append(("ssl", value or "require"))
                continue
            if lowered == "channel_binding":
                continue
            normalized_items.append((key, value))

        return urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urlencode(normalized_items), parts.fragment)
        )

    @validator("DATABASE_URL", pre=True)
    def normalize_database_url(cls, v: str) -> str:
        if not isinstance(v, str) or not v.strip():
            return "sqlite+aiosqlite:///./sql_app.db"

        value = v.strip()
        if value.startswith("psql "):
            value = value[5:].strip()
        value = value.strip("'\"")

        if value.startswith("postgresql+asyncpg://"):
            return cls._normalize_asyncpg_query_params(value)
        if value.startswith("postgresql://"):
            converted = value.replace("postgresql://", "postgresql+asyncpg://", 1)
            return cls._normalize_asyncpg_query_params(converted)
        if value.startswith("postgres://"):
            converted = value.replace("postgres://", "postgresql+asyncpg://", 1)
            return cls._normalize_asyncpg_query_params(converted)
        return value
    
    # JWT
    SECRET_KEY: str = "CHANGE_THIS_SECRET_KEY_IN_PRODUCTION_982347982374"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30 * 24 * 60  # 30 days

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
