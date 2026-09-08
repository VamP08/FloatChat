"""The four operations the language model is allowed to ask for.

These are plain JSON Schema, which is what Groq's OpenAI-compatible tool-calling API
expects. The model chooses one and fills in typed arguments; it never sees the database,
the schema, or any SQL.

Optional arguments accept ``null`` as well as their own type. The model emits null
for fields it does not want, and Groq validates the arguments against this schema
before returning the call, so a bare ``"type": "array"`` rejects the whole call.

Regions are an ``enum`` rather than a description. A described constraint is advice the
model may ignore; an enum is a constraint the API enforces, so a question about the
Pacific cannot even be expressed as a call. The engine still raises if one gets through,
because two layers of the same guarantee is the point.
"""

from typing import Any, Dict, List

from .config import AgenticConfig

REGION_NAMES = sorted(AgenticConfig.REGIONS)
# Taken from the same synonym table the engine resolves against. Written out by hand,
# this list once offered the model "backscatter" while the engine only knew "bbp700",
# so the name reached Postgres as a column and the visitor was shown
# "column m.backscatter does not exist".
PARAMETER_NAMES = [words[0] for words in AgenticConfig.PARAMETER_SYNONYMS.values()]

_REGION = {
    "type": ["string", "null"],
    "enum": REGION_NAMES,
    "description": (
        "Region to query. The database covers the northern Indian Ocean only; no other "
        "ocean has any data at all."
    ),
}
_PARAMETERS = {
    "type": "array",
    "items": {"type": "string", "enum": PARAMETER_NAMES},
    "description": "Which measurements to report.",
}
_DATE_RANGE = {
    "type": ["array", "null"],
    "items": {"type": "string"},
    "description": "Date range as [start, end] in YYYY-MM-DD. Data runs 2014 to 2026.",
}
_DEPTH_RANGE = {
    "type": ["array", "null"],
    "items": {"type": "number"},
    "description": (
        "Depth range as [min, max] in decibar, where one decibar is about one metre. "
        "Floats reach roughly 2000."
    ),
}


def _tool(name: str, description: str, properties: Dict[str, Any], required: List[str]):
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
            },
        },
    }


TOOLS: List[Dict[str, Any]] = [
    _tool(
        "query_aggregate_statistics",
        "Average, maximum, minimum, count or standard deviation of one or more "
        "measurements, optionally within a region, date range or depth band.",
        {
            "region": _REGION,
            "parameters": _PARAMETERS,
            "date_range": _DATE_RANGE,
            "depth_range": _DEPTH_RANGE,
            "operation": {
                "type": ["string", "null"],
                "enum": ["average", "maximum", "minimum", "count", "std"],
                "description": "Which statistic to compute. Defaults to average.",
            },
        },
        ["parameters"],
    ),
    _tool(
        "detect_anomalies_and_trends",
        "Find months whose values sit far from the period average, and describe how a "
        "measurement has trended over time. Use for questions about unusual values, "
        "changes or trends.",
        {
            "region": _REGION,
            "parameters": _PARAMETERS,
            "date_range": _DATE_RANGE,
            "depth_range": _DEPTH_RANGE,
            "statistical_threshold": {
                "type": ["number", "null"],
                "description": "Standard deviations from the mean before a month counts "
                               "as anomalous. Defaults to 2.",
            },
        },
        ["parameters"],
    ),
    _tool(
        "query_profile_data",
        "Individual vertical profiles: the measured values at each depth for dives "
        "matching a region, date range or depth band.",
        {
            "region": _REGION,
            "parameters": _PARAMETERS,
            "date_range": _DATE_RANGE,
            "depth_range": _DEPTH_RANGE,
            "limit": {
                "type": ["integer", "null"],
                "description": "Maximum profiles to return. Defaults to 100.",
            },
        },
        ["parameters"],
    ),
    _tool(
        "compare_oceanographic_data",
        "Compare one region or time period against another for the same measurements.",
        {
            "regions": {
                "type": ["array", "null"],
                "items": {"type": "string", "enum": REGION_NAMES},
                "description": "The two regions to compare.",
            },
            "parameters": _PARAMETERS,
            "time_periods": {
                "type": ["array", "null"],
                "items": {"type": "array", "items": {"type": "string"}},
                "description": "Optional [start, end] pairs, one per period compared.",
            },
            "depth_range": _DEPTH_RANGE,
        },
        ["parameters"],
    ),
]

TOOL_NAMES = [tool["function"]["name"] for tool in TOOLS]


class OceanQueryFunctions:
    """Kept as a class because the agent asks it for the tool list."""

    @staticmethod
    def get_all_functions() -> List[Dict[str, Any]]:
        return TOOLS
