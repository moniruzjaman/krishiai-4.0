from pydantic import BaseModel
from typing import Optional

class DiagnosticLog(BaseModel):
    user_id: str
    crop: str
    diagnosis: str
    category: str
    confidence: float
    advisory: str
    location: Optional[str] = "Detected via Frontend"

class OfficialAdvisoryRequest(BaseModel):
    crop: str
    condition: str
