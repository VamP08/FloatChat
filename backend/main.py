from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import floats, profiles, chat
from .agent_manager import initialize_agent

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

# Initialize agentic AI agent
agent_instance = initialize_agent()

# Include your routers in the main application
app.include_router(floats.router)
app.include_router(profiles.router)
app.include_router(chat.router)

@app.get("/")
def root():
    """A simple root endpoint to confirm the API is running."""
    return {
        "message": "FloatChat API is running",
        "agentic_ai_enabled": agent_instance is not None,
        "endpoints": {
            "traditional": "/floats, /profiles, /chat",
            "agentic_ai": "/agentic/query, /agentic/capabilities" if agent_instance else "Not available"
        }
    }