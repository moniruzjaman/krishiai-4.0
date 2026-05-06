import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Credentials are obtained from the environment
    api_key: str = os.getenv("API_KEY", "")
    supabase_url: str = "https://nmngzjrrysjzuxfcklrk.supabase.co"
    supabase_key: str = os.getenv("SUPABASE_KEY", "")
    hf_token: str = os.getenv("HF_TOKEN", "")

settings = Settings()
