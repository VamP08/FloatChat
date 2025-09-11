from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import floats, profiles, chat

app = FastAPI(title="Argo Dashboard API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include your routers in the main application
app.include_router(floats.router)
app.include_router(profiles.router)
app.include_router(chat.router)

@app.get("/")
def root():
    """A simple root endpoint to confirm the API is running."""
    return {"message": "Argo API is running"}