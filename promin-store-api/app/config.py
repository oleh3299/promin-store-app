from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Promin Store API"
    environment: str = "local"
    debug: bool = False

    database_url: str = "postgresql+psycopg://promin:promin@localhost:5432/promin_store"

    secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    frontend_origin: str = "https://store.prominuz.org"
    one_c_integration_api_key: str | None = None
    one_c_hr_candidates_url: str | None = None
    one_c_hr_api_key: str | None = None
    one_c_hr_timeout_seconds: float = 10.0
    rocket_chat_base_url: str = "https://chat.prominuz.org"
    rocket_chat_user_id: str | None = None
    rocket_chat_auth_token: str | None = None
    rocket_chat_bot_username: str = "promin-store-bot"
    rocket_chat_timeout_seconds: float = 8.0
    rocket_chat_webhook_token: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
