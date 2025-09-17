"""
Configuration settings    # Oceanographic regions mapping
    REGIONS = {
        "bay of bengal": {"lat_min": 5, "lat_max": 22, "lon_min": 80, "lon_max": 95},
        "arabian sea": {"lat_min": 8, "lat_max": 25, "lon_min": 50, "lon_max": 80},
        "north pacific": {"lat_min": 20, "lat_max": 60, "lon_min": 120, "lon_max": 180},  # Adjusted to match data
        "north atlantic": {"lat_min": 30, "lat_max": 70, "lon_min": -80, "lon_max": 20},
        "southern ocean": {"lat_min": -70, "lat_max": -40, "lon_min": -180, "lon_max": 180},
        "mediterranean sea": {"lat_min": 30, "lat_max": 46, "lon_min": -6, "lon_max": 36},
        "indian ocean": {"lat_min": -40, "lat_max": 25, "lon_min": 40, "lon_max": 120},
    }gentic AI system
"""
import os
from typing import Dict, Any

class AgenticConfig:
    # Gemini API Configuration
    GEMINI_MODEL = "gemini-2.0-flash-001"
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    
    # System Prompts
    SYSTEM_PROMPT = """
    You are an expert oceanographic data analyst with deep knowledge of ARGO float data,
    marine parameters, and ocean science. You help users query and analyze oceanographic data
    through natural language conversations.

    When users ask questions about oceanographic data, you should:
    1. First try to understand what they're looking for
    2. Use the appropriate function call based on the query type:
       - For basic statistics (averages, max, min, counts): use query_aggregate_statistics
       - For anomaly detection or unusual trends: use detect_anomalies_and_trends
       - For detailed profile data: use query_profile_data
       - For comparisons between regions/time periods: use compare_oceanographic_data
    3. For anomaly detection:
       - If no timeframe is specified, the system will analyze the last year
       - If no parameters are specified, the system will analyze all available parameters
       - The analysis includes monthly trends, statistical anomalies, and trend directions
    4. Analyze the data and provide clear, scientific insights
    5. Always explain your findings in context
    6. CRITICAL: When you receive function results, ALWAYS enumerate ALL parameters and their values in your response. Do not omit any parameters from the results.

    You have access to comprehensive ARGO float data including temperature, salinity,
    pressure, oxygen, chlorophyll, nitrate, and pH parameters across global oceans.

    IMPORTANT: Always use function calls to query the database. Do not try to answer from general knowledge alone.
    IMPORTANT: When summarizing function results, list EVERY parameter that was returned, even if the user only asked about some of them.
    """    # Oceanographic regions mapping
    REGIONS = {
        "bay of bengal": {"lat_min": 5, "lat_max": 22, "lon_min": 80, "lon_max": 95},
        "arabian sea": {"lat_min": 8, "lat_max": 25, "lon_min": 50, "lon_max": 80},
        "north pacific": {"lat_min": 0, "lat_max": 60, "lon_min": 120, "lon_max": 180},  # Adjusted to match data
        "north atlantic": {"lat_min": 30, "lat_max": 70, "lon_min": -80, "lon_max": 20},
        "southern ocean": {"lat_min": -70, "lat_max": -40, "lon_min": -180, "lon_max": 180},
        "mediterranean sea": {"lat_min": 30, "lat_max": 46, "lon_min": -6, "lon_max": 36},
        "indian ocean": {"lat_min": -40, "lat_max": 25, "lon_min": 40, "lon_max": 120},
    }
    
    # Available oceanographic parameters
    PARAMETERS = [
        "temperature", "temp",
        "salinity", "sal", 
        "pressure", "pres",
        "oxygen", "o2", "dissolved_oxygen",
        "chlorophyll", "chl", "chla",
        "nitrate", "no3",
        "phosphate", "po4",
        "ph", "ph_total",
        "alkalinity", "alk",
        "density", "sigma",
        "mixed_layer_depth", "mld"
    ]
    
    # Statistical operations
    OPERATIONS = [
        "average", "mean", "avg",
        "maximum", "max", "minimum", "min",
        "count", "sum", "std", "standard_deviation",
        "trend", "anomaly", "unusual", "compare",
        "profile", "vertical", "time_series", "temporal"
    ]

    @staticmethod
    def get_region_bounds(region_name: str) -> Dict[str, float]:
        """Get lat/lon bounds for a named region"""
        region_key = region_name.lower().strip()
        
        # Handle common variations
        if "bay of bengal" in region_key or "bengal" in region_key:
            return AgenticConfig.REGIONS.get("bay of bengal", {})
        elif "arabian sea" in region_key or "arabian" in region_key:
            return AgenticConfig.REGIONS.get("arabian sea", {})
        elif "north pacific" in region_key or "pacific" in region_key:
            return AgenticConfig.REGIONS.get("north pacific", {})
        elif "north atlantic" in region_key or "atlantic" in region_key:
            return AgenticConfig.REGIONS.get("north atlantic", {})
        elif "southern ocean" in region_key or "southern" in region_key:
            return AgenticConfig.REGIONS.get("southern ocean", {})
        elif "mediterranean" in region_key:
            return AgenticConfig.REGIONS.get("mediterranean sea", {})
        elif "indian ocean" in region_key or "indian" in region_key:
            return AgenticConfig.REGIONS.get("indian ocean", {})
        
        return AgenticConfig.REGIONS.get(region_key, {})
    
    @staticmethod
    def normalize_parameter(param: str) -> str:
        """Normalize parameter names to database column names"""
        param_lower = param.lower().strip()
        
        if param_lower in ["temp", "temperature"]:
            return "temp"
        elif param_lower in ["sal", "salinity"]:
            return "psal"
        elif param_lower in ["pres", "pressure"]:
            return "pressure"
        elif param_lower in ["o2", "oxygen", "dissolved_oxygen"]:
            return "doxy"
        elif param_lower in ["chl", "chla", "chlorophyll"]:
            return "chla"
        elif param_lower in ["no3", "nitrate"]:
            return "nitrate"
        elif param_lower in ["ph", "ph_total"]:
            return "ph"
        elif param_lower in ["bbp700"]:
            return "bbp700"
        else:
            return param_lower
