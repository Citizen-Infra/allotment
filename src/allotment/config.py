from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ALLOTMENT_", env_file=".env")
    database_url: str = "postgresql+psycopg://allotment:allotment@localhost:5432/allotment"
    admin_token: str = "dev-token-change-me"
    secret_key: str = "dev-secret-change-me-32-bytes-min!!"
    pool_retention_days: int = 30
    harmonica_base_url: str = ""
    harmonica_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
