
from supabase import create_client, Client
from app_config import settings

# Initialize Supabase client
url: str = settings.supabase_url
key: str = settings.supabase_key
supabase: Client = create_client(url, key)

def get_user_profile(user_id: str):
    """Fetch user profile from Supabase."""
    return supabase.table("profiles").select("*").eq("id", user_id).execute()

def update_user_xp(user_id: str, new_xp: int):
    """Update user progress data."""
    return supabase.table("profiles").update({"progress": {"xp": new_xp}}).eq("id", user_id).execute()

def save_diagnostic_report(report_data: dict):
    """Save a verified diagnostic report."""
    return supabase.table("reports").insert(report_data).execute()
