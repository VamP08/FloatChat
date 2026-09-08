"""Configuration for the natural-language layer: coverage, vocabulary, system prompt."""

import os
from typing import Dict


class AgenticConfig:
    # Groq hosts the model behind an OpenAI-compatible API. Any tool-calling model
    # works; this one supports parallel tool use and is fast enough that the answer
    # arrives before the chart does.
    MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")

    # Only regions the ingested data actually covers. Naming a region the database has
    # never seen produces an empty result the model then has to explain away, so the
    # vocabulary is kept to the area the floats occupy.
    REGIONS: Dict[str, Dict[str, float]] = {
        "arabian sea": {"lat_min": 8, "lat_max": 25, "lon_min": 50, "lon_max": 78},
        "bay of bengal": {"lat_min": 5, "lat_max": 23, "lon_min": 80, "lon_max": 95},
        "laccadive sea": {"lat_min": 6, "lat_max": 14, "lon_min": 71, "lon_max": 78},
        "equatorial indian ocean": {
            "lat_min": -10,
            "lat_max": 5,
            "lon_min": 45,
            "lon_max": 95,
        },
        "north indian ocean": {"lat_min": -10, "lat_max": 26, "lon_min": 40, "lon_max": 100},
    }

    # Aliases a person might type, mapped to a key in REGIONS.
    REGION_ALIASES = {
        "bengal": "bay of bengal",
        "arabian": "arabian sea",
        "laccadive": "laccadive sea",
        "equator": "equatorial indian ocean",
        "equatorial": "equatorial indian ocean",
        "indian ocean": "north indian ocean",
        "indian": "north indian ocean",
    }

    # Column name -> the words a person is likely to use for it.
    PARAMETER_SYNONYMS = {
        "temp": ("temperature", "temp"),
        "psal": ("salinity", "sal", "psal"),
        "pressure": ("pressure", "pres", "depth"),
        "doxy": ("oxygen", "o2", "dissolved oxygen", "doxy"),
        "chla": ("chlorophyll", "chl", "chla"),
        "nitrate": ("nitrate", "no3"),
        "bbp700": ("backscatter", "bbp700", "particle backscatter"),
        "ph": ("ph", "acidity", "ph_total"),
    }

    PARAMETERS = [word for words in PARAMETER_SYNONYMS.values() for word in words]

    OPERATIONS = [
        "average", "mean", "avg",
        "maximum", "max", "minimum", "min",
        "count", "sum", "std", "standard_deviation",
        "trend", "anomaly", "unusual", "compare",
        "profile", "vertical", "time_series", "temporal",
    ]

    SYSTEM_PROMPT = """
    You are an oceanographic data analyst working with Argo float measurements.

    COVERAGE -- state this plainly whenever a question falls outside it:
    The database holds biogeochemical Argo floats in the northern Indian Ocean only,
    roughly 10S to 26N and 40E to 100E: the Arabian Sea, the Bay of Bengal, the
    Laccadive Sea and the equatorial Indian Ocean. There is no data for the Pacific,
    the Atlantic, the Mediterranean or the Southern Ocean. If a question names one of
    those, say so directly rather than returning an empty result.

    Available parameters: temperature, salinity, pressure, dissolved oxygen,
    chlorophyll, nitrate, particle backscatter (bbp700) and pH. Not every float carries
    every sensor, and readings that failed quality control were discarded at ingest, so
    a parameter can be absent for a given float or period. Say when that happens.

    How to answer:
    1. Choose the function that matches the question:
       - averages, maxima, minima, counts -> query_aggregate_statistics
       - unusual values or trends over time -> detect_anomalies_and_trends
       - individual vertical profiles -> query_profile_data
       - one region or period against another -> compare_oceanographic_data
    2. Always call a function. Do not answer measurement questions from general
       knowledge, and never invent a number.
    3. Report every parameter the function returned, including the ones the question
       did not ask about, and give the sample count behind each figure.
    4. Depth and pressure: pressure is recorded in decibar, and one decibar is close
       enough to one metre of depth to treat them as equivalent. Say which you mean.
    5. Profiles were binned onto standard pressure levels during ingest, so a value at
       a given depth is the mean of the readings within that level.
    """

    @staticmethod
    def get_region_bounds(region_name: str) -> Dict[str, float]:
        """Resolve a region name, including common aliases, to its bounding box."""
        key = (region_name or "").lower().strip()
        if key in AgenticConfig.REGIONS:
            return AgenticConfig.REGIONS[key]
        for alias, canonical in AgenticConfig.REGION_ALIASES.items():
            if alias in key:
                return AgenticConfig.REGIONS[canonical]
        return {}

    @staticmethod
    def normalize_parameter(param: str) -> str:
        """Map whatever a person called a parameter to its database column name."""
        word = (param or "").lower().strip()
        for column, synonyms in AgenticConfig.PARAMETER_SYNONYMS.items():
            if word in synonyms:
                return column
        return word
