"""
Agent instance management for the FloatChat backend
"""
from typing import Optional, Any
from pathlib import Path
import os

# Import agentic AI
try:
    from .agentic_ai.agent import OceanographicAgent
    AGENTIC_AI_AVAILABLE = True
except ImportError:
    print("Agentic AI not available. Install dependencies with: pip install -r agentic_ai/requirements.txt")
    AGENTIC_AI_AVAILABLE = False
    OceanographicAgent = None

# Global agent instance
agent_instance: Optional[Any] = None

def initialize_agent() -> Optional[Any]:
    """
    Initialize the agentic AI agent
    """
    global agent_instance

    if not AGENTIC_AI_AVAILABLE or agent_instance is not None:
        return agent_instance

    try:
        # Get database path
        project_root = Path(__file__).parent.parent
        db_path = os.path.join(project_root, "argo_data.sqlite")

        # Initialize agent
        agent_instance = OceanographicAgent(db_path=db_path)
        print("🤖 Agentic AI agent initialized successfully")
        print(f"   - Gemini Available: {agent_instance.gemini_available}")
        print(f"   - Database: {db_path}")
        return agent_instance
    except Exception as e:
        print(f"❌ Failed to initialize agentic AI: {e}")
        return None

def get_agent() -> Optional[Any]:
    """
    Get the initialized agent instance
    """
    return agent_instance