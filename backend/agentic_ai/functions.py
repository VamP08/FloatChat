"""
Function schemas for Gemini function calling
"""
from google.genai import types
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

class OceanQueryFunctions:
    """Define function schemas for oceanographic data queries"""
    
    @staticmethod
    def get_query_parameters_function():
        """Function to extract oceanographic query parameters"""
        return types.FunctionDeclaration(
            name='extract_ocean_query_parameters',
            description='Extract structured parameters from a natural language oceanographic query',
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    'region': types.Schema(
                        type=types.Type.STRING,
                        description='Geographic region (e.g., Bay of Bengal, Arabian Sea, North Pacific)',
                    ),
                    'lat_bounds': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.NUMBER),
                        description='Latitude bounds [min, max] in decimal degrees',
                    ),
                    'lon_bounds': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.NUMBER),
                        description='Longitude bounds [min, max] in decimal degrees',
                    ),
                    'date_range': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                        description='Date range [start_date, end_date] in YYYY-MM-DD format',
                    ),
                    'parameters': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                        description='Oceanographic parameters (temperature, salinity, oxygen, etc.) or "all" for all parameters',
                    ),
                    'depth_range': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.NUMBER),
                        description='Depth range [min, max] in pressure (decibar). Note: 1 decibar ≈ 1 meter depth. Pressure values represent ocean depth.',
                    ),
                    'operation': types.Schema(
                        type=types.Type.STRING,
                        description='Analysis operation (average, trend, anomaly, profile, compare, count, max, min)',
                    ),
                    'aggregation_level': types.Schema(
                        type=types.Type.STRING,
                        description='Temporal aggregation (daily, monthly, yearly, seasonal)',
                    ),
                    'comparison_reference': types.Schema(
                        type=types.Type.STRING,
                        description='Reference for comparison (historical_average, previous_year, climatology)',
                    ),
                    'statistical_threshold': types.Schema(
                        type=types.Type.NUMBER,
                        description='Threshold for anomaly detection (e.g., 2 for 2-sigma anomalies)',
                    ),
                },
                required=['operation'],
            ),
        )
    
    @staticmethod
    def get_aggregate_data_function():
        """Function to query aggregate statistics"""
        return types.FunctionDeclaration(
            name='query_aggregate_statistics',
            description='Query aggregate statistics (mean, max, min, count, standard deviation) for oceanographic parameters like temperature, salinity, oxygen, etc.',
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    'region': types.Schema(
                        type=types.Type.STRING,
                        description='Geographic region (e.g., Bay of Bengal, Arabian Sea, North Pacific)',
                    ),
                    'lat_bounds': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.NUMBER),
                        description='Latitude bounds [min, max] in decimal degrees',
                    ),
                    'lon_bounds': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.NUMBER),
                        description='Longitude bounds [min, max] in decimal degrees',
                    ),
                    'date_range': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                        description='Date range [start_date, end_date] in YYYY-MM-DD format',
                    ),
                    'parameters': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                        description='Oceanographic parameters: temperature, salinity, oxygen, chlorophyll, nitrate, ph, pressure',
                    ),
                    'depth_range': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.NUMBER),
                        description='Depth range [min, max] in pressure (decibar). Note: 1 decibar ≈ 1 meter depth. Pressure values represent ocean depth.',
                    ),
                    'operation': types.Schema(
                        type=types.Type.STRING,
                        description='Statistical operation: average, maximum, minimum, count, standard_deviation',
                    ),
                    'aggregation_level': types.Schema(
                        type=types.Type.STRING,
                        description='Temporal aggregation level: daily, monthly, yearly',
                    ),
                },
                required=['parameters'],
            ),
        )
    
    @staticmethod
    def get_anomaly_detection_function():
        """Function to detect anomalies and trends with enhanced analysis"""
        return types.FunctionDeclaration(
            name='detect_anomalies_and_trends',
            description='Advanced anomaly detection and trend analysis for oceanographic parameters. Analyzes monthly patterns, statistical anomalies, and trend directions. If no timeframe specified, analyzes the last year. If no parameters specified, analyzes all available parameters.',
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    'region': types.Schema(type=types.Type.STRING, description='Geographic region to analyze'),
                    'parameters': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                        description='Parameters to analyze: temperature, salinity, oxygen, chlorophyll, nitrate, ph. Use "all" for comprehensive analysis.',
                    ),
                    'date_range': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                        description='Optional date range [start_date, end_date] in YYYY-MM-DD format. Defaults to last year if not specified.',
                    ),
                    'statistical_threshold': types.Schema(
                        type=types.Type.NUMBER,
                        description='Z-score threshold for anomaly detection (default: 2.0)',
                    ),
                },
                required=['region'],
            ),
        )
    
    @staticmethod
    def get_profile_data_function():
        """Function to retrieve detailed profile data"""
        return types.FunctionDeclaration(
            name='query_profile_data',
            description='Retrieve detailed vertical profiles or time series data',
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    'region': types.Schema(type=types.Type.STRING),
                    'lat_bounds': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.NUMBER),
                    ),
                    'lon_bounds': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.NUMBER),
                    ),
                    'date_range': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                    ),
                    'parameters': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                    ),
                    'max_profiles': types.Schema(
                        type=types.Type.INTEGER,
                        description='Maximum number of profiles to return',
                    ),
                    'profile_type': types.Schema(
                        type=types.Type.STRING,
                        description='Type of profile data (vertical, temporal, spatial)',
                    ),
                },
                required=['parameters', 'profile_type'],
            ),
        )
    
    @staticmethod
    def get_comparison_function():
        """Function to compare data across regions, time periods, or parameters"""
        return types.FunctionDeclaration(
            name='compare_oceanographic_data',
            description='Compare oceanographic data across different regions, time periods, or parameters',
            parameters=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    'comparison_type': types.Schema(
                        type=types.Type.STRING,
                        description='Type of comparison (regional, temporal, parametric)',
                    ),
                    'regions': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                        description='List of regions to compare',
                    ),
                    'time_periods': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(
                            type=types.Type.ARRAY,
                            items=types.Schema(type=types.Type.STRING),
                        ),
                        description='List of time periods [start, end] to compare',
                    ),
                    'parameters': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING),
                    ),
                    'depth_range': types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.NUMBER),
                    ),
                    'operation': types.Schema(type=types.Type.STRING),
                },
                required=['comparison_type', 'parameters'],
            ),
        )

    @staticmethod
    def get_all_functions():
        """Get all function declarations as tools"""
        functions = [
            OceanQueryFunctions.get_aggregate_data_function(),
            OceanQueryFunctions.get_anomaly_detection_function(),
            OceanQueryFunctions.get_profile_data_function(),
            OceanQueryFunctions.get_comparison_function(),
        ]
        return [types.Tool(function_declarations=[func]) for func in functions]
