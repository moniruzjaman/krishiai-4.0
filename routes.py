from fastapi import APIRouter, HTTPException
from models import DiagnosticLog
from typing import List

router = APIRouter()

@router.post("/diagnostics/log")
async def log_diagnostic(log: DiagnosticLog):
    """
    Endpoint for logging AI-generated diagnostics to the backend.
    In production, this would persist to a verified database.
    """
    try:
        print(f"Audit Log - User: {log.user_id} | Crop: {log.crop} | Diagnosis: {log.diagnosis}")
        return {"status": "success", "message": "Diagnostic report logged for official audit."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/advisory/official")
async def get_official_advisory(crop: str, condition: str):
    """
    Simulated government advisory endpoint providing supplemental verified data.
    """
    return {
        "crop": crop,
        "condition": condition,
        "source": "BARI/BRRI Grounded Database 2025",
        "advisory": f"Official protocol for {condition} in {crop} confirms AI diagnosis steps."
    }
