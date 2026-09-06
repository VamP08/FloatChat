"""Holds the single natural-language agent instance used by the chat endpoint."""

from typing import Any, Optional

from .database import DATABASE_URL

try:
    from .agentic_ai.agent import OceanographicAgent

    AGENT_IMPORTABLE = True
except ImportError as error:  # google-genai is optional; the API still serves data without it
    print(f"Natural-language agent unavailable: {error}")
    AGENT_IMPORTABLE = False
    OceanographicAgent = None

agent_instance: Optional[Any] = None


def initialize_agent() -> Optional[Any]:
    """Build the agent once at startup. Returns None if it cannot be configured."""
    global agent_instance

    if not AGENT_IMPORTABLE or agent_instance is not None:
        return agent_instance

    try:
        agent_instance = OceanographicAgent(db_url=DATABASE_URL)
        print(
            "Natural-language agent ready "
            f"(language model configured: {agent_instance.gemini_available})"
        )
        return agent_instance
    except Exception as error:
        print(f"Failed to initialise the natural-language agent: {error}")
        return None


def get_agent() -> Optional[Any]:
    return agent_instance
