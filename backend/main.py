from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import floats, profiles, chat

# Import agentic AI integration
try:
    from .integration_example import agentic_router
    AGENTIC_AI_AVAILABLE = True
except ImportError:
    print("Agentic AI not available. Install dependencies with: pip install -r agentic_ai/requirements.txt")
    AGENTIC_AI_AVAILABLE = False
    agentic_router = None

app = FastAPI(
    title="FloatChat API with Agentic AI",
    description="Oceanographic data analysis with traditional queries and intelligent natural language processing"
)

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

# Include agentic AI router if available
if AGENTIC_AI_AVAILABLE and agentic_router:
    app.include_router(agentic_router)
    print("Agentic AI system enabled")

@app.get("/")
def root():
    """A simple root endpoint to confirm the API is running."""
    return {
        "message": "FloatChat API is running",
        "agentic_ai_enabled": AGENTIC_AI_AVAILABLE,
        "endpoints": {
            "traditional": "/floats, /profiles, /chat",
            "agentic_ai": "/agentic/query, /agentic/capabilities" if AGENTIC_AI_AVAILABLE else "Not available"
        }
    }