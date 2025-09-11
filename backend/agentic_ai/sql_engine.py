"""
SQL Template Engine for Oceanographic Queries
"""
import sqlite3
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
import json
import numpy as np
from .config import AgenticConfig

class SQLTemplateEngine:
    """Deterministic SQL template engine for oceanographic data queries"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.config = AgenticConfig()
    
    def _get_connection(self):
        """Get database connection"""
        return sqlite3.connect(self.db_path)
    
    def _parse_date_range(self, date_range: List[str]) -> tuple:
        """Parse and validate date range"""
        if len(date_range) == 2:
            return date_range[0], date_range[1]
        elif len(date_range) == 1:
            # Single date - make it a day range
            date = datetime.strptime(date_range[0], '%Y-%m-%d')
            end_date = (date + timedelta(days=1)).strftime('%Y-%m-%d')
            return date_range[0], end_date
        else:
            raise ValueError("Invalid date range format")
    
    def _build_spatial_filter(self, lat_bounds: Optional[List[float]], 
                            lon_bounds: Optional[List[float]], 
                            region: Optional[str]) -> tuple:
        """Build spatial filtering conditions"""
        conditions = []
        params = []
        
        if region:
            region_bounds = self.config.get_region_bounds(region)
            if region_bounds:
                lat_bounds = [region_bounds['lat_min'], region_bounds['lat_max']]
                lon_bounds = [region_bounds['lon_min'], region_bounds['lon_max']]
        
        if lat_bounds and len(lat_bounds) == 2:
            conditions.append("p.latitude BETWEEN ? AND ?")
            params.extend(lat_bounds)
        
        if lon_bounds and len(lon_bounds) == 2:
            lon_min, lon_max = lon_bounds
            if lon_min > lon_max:  # Crosses the 180/-180 meridian
                conditions.append("(p.longitude >= ? OR p.longitude <= ?)")
                params.extend([lon_min, lon_max])
            else:
                conditions.append("p.longitude BETWEEN ? AND ?")
                params.extend(lon_bounds)
        
        return " AND ".join(conditions), params
    
    def _build_temporal_filter(self, date_range: Optional[List[str]]) -> tuple:
        """Build temporal filtering conditions"""
        if not date_range:
            return "", []
        
        start_date, end_date = self._parse_date_range(date_range)
        return "p.profile_date BETWEEN ? AND ?", [start_date, end_date]
    
    def _build_depth_filter(self, depth_range: Optional[List[float]]) -> tuple:
        """Build depth filtering conditions"""
        if not depth_range:
            return "", []
        
        if len(depth_range) == 1:
            # Allow for some tolerance around the target depth
            depth = depth_range[0]
            tolerance = max(depth * 0.1, 50)  # 10% tolerance or minimum 50m
            return "ABS(m.pressure - ?) <= ?", [depth, tolerance]
        elif len(depth_range) == 2:
            return "m.pressure BETWEEN ? AND ?", depth_range
        else:
            return "", []
    
    def query_aggregate_statistics(self, **kwargs) -> List[Dict[str, Any]]:
        """Query aggregate statistics"""
        operation = kwargs.get('operation', 'average')
        parameters = kwargs.get('parameters', [])
        
        if 'all' in parameters:
            parameters = ['temp', 'psal', 'pressure', 'doxy']
        
        # Build filters
        spatial_filter, spatial_params = self._build_spatial_filter(
            kwargs.get('lat_bounds'), 
            kwargs.get('lon_bounds'), 
            kwargs.get('region')
        )
        temporal_filter, temporal_params = self._build_temporal_filter(
            kwargs.get('date_range')
        )
        depth_filter, depth_params = self._build_depth_filter(
            kwargs.get('depth_range')
        )
        
        # Combine filters
        filters = []
        all_params = []
        
        if spatial_filter:
            filters.append(spatial_filter)
            all_params.extend(spatial_params)
        
        if temporal_filter:
            filters.append(temporal_filter)
            all_params.extend(temporal_params)
        
        if depth_filter:
            filters.append(depth_filter)
            all_params.extend(depth_params)
        
        where_clause = " AND ".join(filters) if filters else "1=1"
        
        # Build aggregate operation
        agg_ops = {
            'average': 'AVG',
            'mean': 'AVG',
            'avg': 'AVG',
            'maximum': 'MAX',
            'max': 'MAX',
            'minimum': 'MIN',
            'min': 'MIN',
            'count': 'COUNT',
            'sum': 'SUM',
            'std': 'SQRT(AVG(({param} - avg_val) * ({param} - avg_val)))',
        }
        
        agg_func = agg_ops.get(operation.lower(), 'AVG')
        
        results = []
        
        with self._get_connection() as conn:
            for param in parameters:
                # Map parameter names to actual column names
                param_mapping = {
                    'temperature': 'temp',
                    'salinity': 'psal',
                    'oxygen': 'doxy',
                    'chlorophyll': 'chla',
                    'nitrate': 'nitrate',
                    'ph': 'ph',
                    'bbp700': 'bbp700',
                    'pressure': 'pressure'
                }
                
                param_norm = param_mapping.get(param, param)
                
                # Build SQL query with JOIN between profiles and measurements
                if operation.lower() in ['std', 'standard_deviation']:
                    # For standard deviation, need subquery
                    sql = f"""
                    WITH avg_data AS (
                        SELECT AVG(m.{param_norm}) as avg_val 
                        FROM profiles p 
                        JOIN measurements m ON p.id = m.profile_id
                        WHERE {where_clause} AND m.{param_norm} IS NOT NULL
                    )
                    SELECT 
                        '{param}' as parameter,
                        SQRT(AVG((m.{param_norm} - avg_val) * (m.{param_norm} - avg_val))) as value,
                        COUNT(m.{param_norm}) as count,
                        '{operation}' as operation
                    FROM profiles p 
                    JOIN measurements m ON p.id = m.profile_id, avg_data
                    WHERE {where_clause} AND m.{param_norm} IS NOT NULL
                    """
                else:
                    sql = f"""
                    SELECT 
                        '{param}' as parameter,
                        {agg_func}(m.{param_norm}) as value,
                        COUNT(m.{param_norm}) as count,
                        '{operation}' as operation
                    FROM profiles p 
                    JOIN measurements m ON p.id = m.profile_id
                    WHERE {where_clause} AND m.{param_norm} IS NOT NULL
                    """
                
                cursor = conn.execute(sql, all_params)
                row = cursor.fetchone()
                
                if row and row[1] is not None:
                    results.append({
                        'parameter': row[0],
                        'value': float(row[1]) if row[1] else None,
                        'count': int(row[2]) if row[2] else 0,
                        'operation': row[3],
                        'filters': {
                            'region': kwargs.get('region'),
                            'date_range': kwargs.get('date_range'),
                            'depth_range': kwargs.get('depth_range'),
                        }
                    })
                else:
                    # No data found - provide informative message
                    results.append({
                        'parameter': param,
                        'value': None,
                        'count': 0,
                        'operation': operation,
                        'error': f'No data found for {param} in the specified region/time range',
                        'filters': {
                            'region': kwargs.get('region'),
                            'date_range': kwargs.get('date_range'),
                            'depth_range': kwargs.get('depth_range'),
                        }
                    })
        
        return results
    
    def detect_anomalies_and_trends(self, **kwargs) -> List[Dict[str, Any]]:
        """Enhanced anomaly detection with trend analysis and comprehensive parameter coverage"""
        parameters = kwargs.get('parameters', [])
        statistical_threshold = kwargs.get('statistical_threshold', 2.0)

        # Auto-set timeframe if not provided
        if not kwargs.get('date_range'):
            from datetime import datetime, timedelta
            end_date = datetime.now()
            start_date = end_date - timedelta(days=365)
            kwargs['date_range'] = [start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')]

        # If no parameters specified or 'all' requested, analyze all available parameters
        if not parameters or 'all' in parameters:
            parameters = ['temp', 'psal', 'doxy', 'chla', 'nitrate', 'ph']

        # Build filters
        spatial_filter, spatial_params = self._build_spatial_filter(
            kwargs.get('lat_bounds'),
            kwargs.get('lon_bounds'),
            kwargs.get('region')
        )
        temporal_filter, temporal_params = self._build_temporal_filter(
            kwargs.get('date_range')
        )
        depth_filter, depth_params = self._build_depth_filter(
            kwargs.get('depth_range')
        )

        filters = []
        all_params = []

        if spatial_filter:
            filters.append(spatial_filter)
            all_params.extend(spatial_params)

        if temporal_filter:
            filters.append(temporal_filter)
            all_params.extend(temporal_params)

        if depth_filter:
            filters.append(depth_filter)
            all_params.extend(depth_params)

        where_clause = " AND ".join(filters) if filters else "1=1"

        results = []

        with self._get_connection() as conn:
            for param in parameters:
                # Map parameter names to actual column names
                param_mapping = {
                    'temperature': 'temp',
                    'salinity': 'psal',
                    'oxygen': 'doxy',
                    'chlorophyll': 'chla',
                    'nitrate': 'nitrate',
                    'ph': 'ph',
                    'bbp700': 'bbp700',
                    'pressure': 'pressure'
                }

                param_norm = param_mapping.get(param, param)

                # Enhanced anomaly detection with multiple methods
                sql = f"""
                WITH monthly_stats AS (
                    SELECT
                        strftime('%Y-%m', p.profile_date) as month,
                        AVG(m.{param_norm}) as avg_value,
                        MIN(m.{param_norm}) as min_value,
                        MAX(m.{param_norm}) as max_value,
                        COUNT(m.{param_norm}) as sample_count
                    FROM profiles p
                    JOIN measurements m ON p.id = m.profile_id
                    WHERE {where_clause} AND m.{param_norm} IS NOT NULL
                    GROUP BY strftime('%Y-%m', p.profile_date)
                    ORDER BY month
                ),
                overall_stats AS (
                    SELECT
                        AVG(avg_value) as overall_avg,
                        SQRT(AVG(POWER(avg_value - (SELECT AVG(avg_value) FROM monthly_stats), 2))) as overall_std
                    FROM monthly_stats
                ),
                anomalies AS (
                    SELECT
                        month,
                        avg_value,
                        min_value,
                        max_value,
                        sample_count,
                        (avg_value - overall_avg) / NULLIF(overall_std, 0) as z_score,
                        CASE
                            WHEN ABS(avg_value - overall_avg) / NULLIF(overall_std, 0) > {statistical_threshold}
                            THEN 'ANOMALY'
                            ELSE 'NORMAL'
                        END as status
                    FROM monthly_stats, overall_stats
                ),
                trend_analysis AS (
                    SELECT
                        AVG(CASE WHEN status = 'ANOMALY' THEN 1 ELSE 0 END) as anomaly_rate,
                        COUNT(*) as total_months,
                        AVG(avg_value) as period_avg,
                        MIN(avg_value) as period_min,
                        MAX(avg_value) as period_max,
                        (MAX(avg_value) - MIN(avg_value)) / NULLIF(AVG(avg_value), 0) as variability_ratio
                    FROM anomalies
                )
                SELECT
                    '{param}' as parameter,
                    anomaly_rate,
                    total_months,
                    period_avg,
                    period_min,
                    period_max,
                    variability_ratio,
                    (SELECT COUNT(*) FROM anomalies WHERE status = 'ANOMALY') as anomaly_count,
                    (SELECT GROUP_CONCAT(month || ':' || ROUND(avg_value, 3) || '(' || status || ')')
                     FROM anomalies ORDER BY month) as monthly_data
                FROM trend_analysis
                """

                cursor = conn.execute(sql, all_params)
                row = cursor.fetchone()

                if row and row[2] and row[2] > 0:  # total_months > 0
                    # Parse monthly data for better analysis
                    monthly_data_str = row[8] if row[8] else ""
                    monthly_entries = []
                    if monthly_data_str:
                        for entry in monthly_data_str.split(','):
                            if ':' in entry:
                                month, rest = entry.split(':', 1)
                                if '(' in rest and ')' in rest:
                                    value_status = rest.split('(')
                                    if len(value_status) == 2:
                                        value = value_status[0]
                                        status = value_status[1].rstrip(')')
                                        monthly_entries.append({
                                            'month': month,
                                            'value': float(value) if value.replace('.', '').isdigit() else 0,
                                            'status': status
                                        })

                    results.append({
                        'parameter': row[0],
                        'anomaly_rate': float(row[1]) if row[1] else 0,
                        'total_months': int(row[2]),
                        'period_avg': float(row[3]) if row[3] else None,
                        'period_min': float(row[4]) if row[4] else None,
                        'period_max': float(row[5]) if row[5] else None,
                        'variability_ratio': float(row[6]) if row[6] else 0,
                        'anomaly_count': int(row[7]) if row[7] else 0,
                        'monthly_trends': monthly_entries,
                        'analysis_summary': self._generate_trend_summary(row, monthly_entries),
                        'filters': {
                            'region': kwargs.get('region'),
                            'date_range': kwargs.get('date_range'),
                            'depth_range': kwargs.get('depth_range'),
                        }
                    })
                else:
                    results.append({
                        'parameter': param,
                        'error': f'Insufficient data for {param} analysis in the specified region/time range',
                        'filters': {
                            'region': kwargs.get('region'),
                            'date_range': kwargs.get('date_range'),
                            'depth_range': kwargs.get('depth_range'),
                        }
                    })

        return results

    def _generate_trend_summary(self, row, monthly_entries):
        """Generate a human-readable trend summary"""
        anomaly_rate = float(row[1]) if row[1] else 0
        total_months = int(row[2])
        period_avg = float(row[3]) if row[3] else 0
        anomaly_count = int(row[7]) if row[7] else 0

        summary = f"Analyzed {total_months} months of data. "

        if anomaly_count > 0:
            summary += f"Found {anomaly_count} anomalous months ({anomaly_rate*100:.1f}% of period). "
        else:
            summary += "No significant anomalies detected. "

        # Analyze trend direction
        if len(monthly_entries) >= 3:
            recent_values = [entry['value'] for entry in monthly_entries[-3:]]
            earlier_values = [entry['value'] for entry in monthly_entries[:3]]

            if recent_values and earlier_values:
                recent_avg = sum(recent_values) / len(recent_values)
                earlier_avg = sum(earlier_values) / len(earlier_values)

                if abs(recent_avg - earlier_avg) / max(abs(earlier_avg), 0.01) > 0.05:  # 5% change
                    if recent_avg > earlier_avg:
                        summary += f"Trending upward (recent avg: {recent_avg:.3f} vs earlier: {earlier_avg:.3f})."
                    else:
                        summary += f"Trending downward (recent avg: {recent_avg:.3f} vs earlier: {earlier_avg:.3f})."
                else:
                    summary += "Relatively stable trend observed."

        return summary

    def query_profile_data(self, **kwargs) -> List[Dict[str, Any]]:
        """Query detailed profile data"""
        parameters = kwargs.get('parameters', [])
        profile_type = kwargs.get('profile_type', 'vertical')
        max_profiles = kwargs.get('max_profiles', 100)
        
        # Build filters
        spatial_filter, spatial_params = self._build_spatial_filter(
            kwargs.get('lat_bounds'), 
            kwargs.get('lon_bounds'), 
            kwargs.get('region')
        )
        temporal_filter, temporal_params = self._build_temporal_filter(
            kwargs.get('date_range')
        )
        
        filters = []
        all_params = []
        
        if spatial_filter:
            filters.append(spatial_filter)
            all_params.extend(spatial_params)
        
        if temporal_filter:
            filters.append(temporal_filter)
            all_params.extend(temporal_params)
        
        where_clause = " AND ".join(filters) if filters else "1=1"
        
        # Build column selection with parameter mapping
        param_mapping = {
            'temperature': 'temp',
            'salinity': 'psal',
            'oxygen': 'doxy',
            'chlorophyll': 'chla',
            'nitrate': 'nitrate',
            'ph': 'ph',
            'bbp700': 'bbp700',
            'pressure': 'pressure'
        }
        
        param_columns = []
        for param in parameters:
            param_norm = param_mapping.get(param, param)
            param_columns.append(f"m.{param_norm} as {param}")
        
        columns_str = ", ".join(param_columns)
        
        sql = f"""
        SELECT 
            p.profile_date as date,
            p.latitude,
            p.longitude,
            m.pressure,
            {columns_str}
        FROM profiles p 
        JOIN measurements m ON p.id = m.profile_id
        WHERE {where_clause}
        ORDER BY p.profile_date DESC, m.pressure ASC
        LIMIT ?
        """
        
        all_params.append(max_profiles)
        
        results = []
        with self._get_connection() as conn:
            cursor = conn.execute(sql, all_params)
            rows = cursor.fetchall()
            
            # Get column names
            col_names = [desc[0] for desc in cursor.description]
            
            for row in rows:
                profile_data = dict(zip(col_names, row))
                results.append(profile_data)
        
        return results
    
    def compare_oceanographic_data(self, **kwargs) -> List[Dict[str, Any]]:
        """Compare data across regions, time periods, or parameters"""
        comparison_type = kwargs.get('comparison_type', 'regional')
        parameters = kwargs.get('parameters', [])
        operation = kwargs.get('operation', 'average')
        
        results = []
        
        if comparison_type == 'regional':
            regions = kwargs.get('regions', [])
            if not regions:
                # If no regions specified, try to extract from other parameters
                region = kwargs.get('region')
                if region:
                    regions = [region]
                else:
                    # Default comparison between major regions
                    regions = ['bay of bengal', 'arabian sea']
            
            for region in regions:
                region_kwargs = {**kwargs, 'region': region, 'regions': None}
                region_results = self.query_aggregate_statistics(**region_kwargs)
                for result in region_results:
                    result['comparison_group'] = region.title()
                    result['comparison_type'] = 'regional'
                results.extend(region_results)
        
        elif comparison_type == 'temporal':
            time_periods = kwargs.get('time_periods', [])
            for i, period in enumerate(time_periods):
                period_kwargs = {**kwargs, 'date_range': period}
                period_results = self.query_aggregate_statistics(**period_kwargs)
                for result in period_results:
                    result['comparison_group'] = f"period_{i+1}_{period[0]}_to_{period[1]}"
                    result['comparison_type'] = 'temporal'
                results.extend(period_results)
        
        elif comparison_type == 'parametric':
            for param in parameters:
                param_kwargs = {**kwargs, 'parameters': [param]}
                param_results = self.query_aggregate_statistics(**param_kwargs)
                for result in param_results:
                    result['comparison_group'] = param
                    result['comparison_type'] = 'parametric'
                results.extend(param_results)
        
        return results
    
    def get_data_summary(self, **kwargs) -> Dict[str, Any]:
        """Get a summary of available data"""
        spatial_filter, spatial_params = self._build_spatial_filter(
            kwargs.get('lat_bounds'), 
            kwargs.get('lon_bounds'), 
            kwargs.get('region')
        )
        temporal_filter, temporal_params = self._build_temporal_filter(
            kwargs.get('date_range')
        )
        
        filters = []
        all_params = []
        
        if spatial_filter:
            filters.append(spatial_filter)
            all_params.extend(spatial_params)
        
        if temporal_filter:
            filters.append(temporal_filter)
            all_params.extend(temporal_params)
        
        where_clause = " AND ".join(filters) if filters else "1=1"
        
        with self._get_connection() as conn:
            # Get overall summary
            summary_sql = f"""
            SELECT 
                COUNT(DISTINCT p.id) as total_profiles,
                COUNT(DISTINCT p.profile_date) as unique_dates,
                MIN(p.profile_date) as earliest_date,
                MAX(p.profile_date) as latest_date,
                MIN(p.latitude) as min_lat,
                MAX(p.latitude) as max_lat,
                MIN(p.longitude) as min_lon,
                MAX(p.longitude) as max_lon,
                MIN(m.pressure) as min_depth,
                MAX(m.pressure) as max_depth
            FROM profiles p 
            JOIN measurements m ON p.id = m.profile_id
            WHERE {where_clause}
            """
            
            cursor = conn.execute(summary_sql, all_params)
            row = cursor.fetchone()
            
            summary = {
                'total_profiles': row[0],
                'unique_dates': row[1],
                'date_range': [row[2], row[3]],
                'lat_range': [row[4], row[5]],
                'lon_range': [row[6], row[7]],
                'depth_range': [row[8], row[9]],
                'available_parameters': []
            }
            
            # Check which parameters have data
            param_mapping = {
                'temperature': 'temp',
                'salinity': 'psal',
                'oxygen': 'doxy',
                'chlorophyll': 'chla',
                'nitrate': 'nitrate',
                'ph': 'ph',
                'bbp700': 'bbp700',
                'pressure': 'pressure'
            }
            
            for param in self.config.PARAMETERS[:8]:  # Check main parameters
                param_norm = param_mapping.get(param, param)
                param_sql = f"SELECT COUNT(*) FROM profiles p JOIN measurements m ON p.id = m.profile_id WHERE {where_clause} AND m.{param_norm} IS NOT NULL"
                cursor = conn.execute(param_sql, all_params)
                count = cursor.fetchone()[0]
                if count > 0:
                    summary['available_parameters'].append({
                        'parameter': param,
                        'count': count,
                        'coverage': round(count / summary['total_profiles'] * 100, 1) if summary['total_profiles'] > 0 else 0
                    })
        
        return summary
