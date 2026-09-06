"""Natural-language querying over the Argo database.

A language model chooses which of a fixed set of functions to call and with what
arguments; the SQL itself comes from templates in sql_engine.py, never from the model.

- agent.py       orchestrates the model and the function results
- functions.py   the function schemas the model is allowed to call
- sql_engine.py  the SQL templates and their execution
- config.py      region bounds, parameter names, and the system prompt
"""

from .agent import OceanographicAgent
from .config import AgenticConfig

__all__ = ["OceanographicAgent", "AgenticConfig"]
