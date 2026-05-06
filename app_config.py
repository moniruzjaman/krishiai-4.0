from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Credentials are obtained from the environment
    api_key: str = ""
    supabase_url: str = "https://nmngzjrrysjzuxfcklrk.supabase.co"
    supabase_key: str = ""
    hf_token: str = ""

    model_config = SettingsConfigDict(
        env_file=('.env', '.env.example'),
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()
