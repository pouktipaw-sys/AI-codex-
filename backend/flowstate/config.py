from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FLOW_", env_file=".env", extra="ignore")
    database_url: str = "sqlite:///./flowstate.db"
    api_token: SecretStr = SecretStr("")
    provider: str = "local"
    model: str = ""
    provider_key: SecretStr = SecretStr("")
    provider_url: str = "https://api.openai.com/v1"
settings = Settings()
