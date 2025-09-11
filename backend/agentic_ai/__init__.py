"""
Agentic AI System for Oceanographic Data Analysis

This package provides a comprehensive agentic AI system that combines:
- Google Gemini 2.5 Flash with function calling for natural language understanding
- Deterministic SQL template engine for reliable data querying
- FastAPI integration for web service deployment

Main components:
- agent.py: Main agentic AI orchestrator
- functions.py: Gemini function calling schemas
- sql_engine.py: SQL template engine
- api.py: FastAPI web service
- config.py: Configuration and constants
"""

from .agent import OceanographicAgent
from .api import app
from .config import AgenticConfig

__version__ = "1.0.0"
__all__ = ["OceanographicAgent", "app", "AgenticConfig"]
