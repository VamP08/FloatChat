"""Holds the single natural-language agent instance used by the chat endpoint."""

from typing import Any, Optional

from .database import DATABASE_URL

try:
    from .agentic_ai.agent import OceanographicAgent

    AGENT_IMPORTABLE = True
except ImportError as error:  # the Groq SDK is optional; data endpoints work without it
    print(f"Natural-language agent unavailable: {error}")
    AGENT_IMPORTABLE = False
    IMPORT_ERROR = str(error)
    OceanographicAgent = None
else:
    IMPORT_ERROR = None

agent_instance: Optional[Any] = None
# Why the agent is or is not available, so a deployment can be diagnosed without
# shell access to the container. 'unavailable' alone sent this debugging in circles.
agent_status: str = "not initialised"


def initialize_agent() -> Optional[Any]:
    """Build the agent once at startup. Returns None if it cannot be configured."""
    global agent_instance, agent_status

    if agent_instance is not None:
        return agent_instance

    if not AGENT_IMPORTABLE:
        agent_status = f"sdk not importable: {IMPORT_ERROR}"
        return None

    try:
        agent_instance = OceanographicAgent(db_url=DATABASE_URL)
        agent_status = (
            "ready" if agent_instance.model_available else "no GROQ_API_KEY set"
        )
        print(f"Natural-language agent: {agent_status}")
        return agent_instance
    except Exception as error:
        agent_status = f"failed to initialise: {type(error).__name__}: {error}"
        print(agent_status)
        return None


def get_agent_status() -> str:
    return agent_status


def get_agent() -> Optional[Any]:
    return agent_instance
