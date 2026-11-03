from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ContinuityOS"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/continuityos"
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
    STORAGE_DIR: str = "storage"
    ENVIRONMENT: str = "development"
    LLM_PROVIDER: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20240620"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if self.ENVIRONMENT.lower() == "production":
            if len(self.SECRET_KEY) < 32 or "replace" in self.SECRET_KEY.lower() or "change-me" in self.SECRET_KEY.lower():
                raise ValueError("Production requires a non-placeholder SECRET_KEY of at least 32 characters")
            if "postgres:postgres@" in self.DATABASE_URL or "replace-with" in self.DATABASE_URL.lower():
                raise ValueError("Production requires a non-default database password")
        return self


settings = Settings()
