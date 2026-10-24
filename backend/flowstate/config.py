from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr
from typing import Literal
import os
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FLOW_", env_file=".env", extra="ignore")
    environment: Literal["local", "hosted"] = "local"
    free_hosting: bool = False
    storage_mode: Literal["persistent", "ephemeral"] = "persistent"
    demo_password: SecretStr = SecretStr("")
    frontend_dir: str = "frontend/dist"
    allowed_hosts: list[str] = ["localhost","127.0.0.1","testserver"]
    @property
    def trusted_hosts(self):
        hostname = os.getenv("RENDER_EXTERNAL_HOSTNAME")
        return self.allowed_hosts + ([hostname] if hostname else [])
    database_url: str = "sqlite:///./flowstate.db"
    api_token: SecretStr = SecretStr("")
    provider: str = "local"
    model: str = ""
    provider_key: SecretStr = SecretStr("")
    provider_url: str = "https://api.openai.com/v1"
settings = Settings()
