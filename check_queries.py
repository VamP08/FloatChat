"""Checks the query layer's guards against the demo database: the words the model sends reach
the SQL only after they are validated, and every synonym it may use produces a valid statement.

    python check_queries.py

Each case below was a real failure: a crafted operation rewrote the statement, a null operation
crashed the aggregate, and "dissolved oxygen" made the profile query invalid.
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
os.environ["DATABASE_URL"] = f"sqlite:///{ROOT / 'data' / 'argo_demo.sqlite'}"
sys.path.insert(0, str(ROOT))

from backend.agentic_ai.config import AgenticConfig  # noqa: E402
from backend.agentic_ai.sql_engine import SQLTemplateEngine, UnknownOperation  # noqa: E402
from backend.database import DATABASE_URL  # noqa: E402

engine = SQLTemplateEngine(DATABASE_URL)

# A statistic outside the list is refused before any SQL is built.
for bad in ["x' as parameter --", "median", "drop"]:
    try:
        engine.query_aggregate_statistics(parameters=["salinity"], region="arabian sea", operation=bad)
    except UnknownOperation:
        pass
    else:
        sys.exit(f"operation {bad!r} was not refused")

# A null operation is an average, not a crash.
rows = engine.query_aggregate_statistics(parameters=["salinity"], region="arabian sea", operation=None)
assert rows and rows[0]["operation"] == "average" and rows[0]["value"], rows

# Every word the model may use for a measurement produces a valid profile and time-series query.
for words in AgenticConfig.PARAMETER_SYNONYMS.values():
    for word in words:
        rows = engine.query_profile_data(parameters=[word], region="arabian sea", limit=2)
        assert rows and word in rows[0], (word, rows[:1])
        engine.query_time_series_data(regions=["arabian sea"], parameters=[word])

print("ok: operations refused, null operation averaged, every synonym queries")
