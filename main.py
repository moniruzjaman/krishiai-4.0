from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routes import router as api_router
import uvicorn
import os

app = FastAPI(title="Krishi AI Backend")

# Include the API routes defined in routes.py
app.include_router(api_router, prefix="/api/v1")

@app.get("/api")
async def root():
    return {"status": "online", "service": "Krishi AI Backend", "version": "2.1.0"}

# Serve static files in production
if os.path.exists("dist"):
    if os.path.exists("dist/assets"):
        app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # If the file exists in dist, serve it
        file_path = os.path.join("dist", full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise, fallback to index.html for SPA routing
        return FileResponse("dist/index.html")
else:
    @app.get("/")
    async def root_dev():
        return {"status": "online", "service": "Krishi AI Backend", "version": "2.1.0"}

if __name__ == "__main__":
    is_prod = os.environ.get("NODE_ENV") == "production"
    port = 3000 if is_prod else 8000
    # Run the server
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=not is_prod)
