"""
Main Agentic AI Agent for Oceanographic Data Analysis
"""
import os
import json
from typing import Dict, List, Any, Optional
from datetime import date, timedelta, datetime
import asyncio
from dotenv import load_dotenv
load_dotenv()
# Import Google GenAI when available
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    print("Google GenAI not available. Install with: pip install google-genai")
    GENAI_AVAILABLE = False

from .config import AgenticConfig
from .sql_engine import SQLTemplateEngine
from .functions import OceanQueryFunctions

class OceanographicAgent:
    """
    Agentic AI Agent that combines Gemini 2.5 Flash with SQL Template Engine
    for natural language oceanographic data queries
    """
    
    def __init__(self, db_path: str, api_key: Optional[str] = None):
        self.db_path = db_path
        self.config = AgenticConfig()
        self.sql_engine = SQLTemplateEngine(db_path)
        
        # Initialize Gemini client if available
        if GENAI_AVAILABLE and (api_key or self.config.GEMINI_API_KEY):
            self.api_key = api_key or self.config.GEMINI_API_KEY
            self.client = genai.Client(api_key=self.api_key)
            self.gemini_available = True
        else:
            self.client = None
            self.gemini_available = False
            print("Warning: Gemini API not configured. Using fallback query processing.")
        
        # Initialize function tools
        if GENAI_AVAILABLE:
            self.functions = OceanQueryFunctions()
            self.tools = self.functions.get_all_functions()
        else:
            self.functions = None
            self.tools = []
    
    def _extract_parameters_fallback(self, query: str) -> Dict[str, Any]:
        """
        Fallback parameter extraction using simple text analysis
        when Gemini is not available
        """
        query_lower = query.lower()
        params = {'operation': 'average'}  # default
        
        # Extract regions
        for region_name in self.config.REGIONS.keys():
            if region_name in query_lower:
                params['region'] = region_name
                break
        
        # Extract parameters
        parameters = []
        for param in self.config.PARAMETERS[:8]:  # Main parameters
            if param in query_lower:
                parameters.append(self.config.normalize_parameter(param))
        
        if not parameters:
            parameters = ['temperature', 'salinity', 'oxygen']  # default
        params['parameters'] = parameters
        
        # Extract operations
        for op in self.config.OPERATIONS:
            if op in query_lower:
                params['operation'] = op
                break
        
        # Extract temporal references
        if 'last year' in query_lower or 'past year' in query_lower:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=365)
            params['date_range'] = [start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')]
        elif 'last month' in query_lower:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            params['date_range'] = [start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')]
        
        # Detect anomaly/trend queries
        if any(word in query_lower for word in ['unusual', 'anomal', 'trend', 'strange', 'different']):
            params['operation'] = 'anomaly'
            params['statistical_threshold'] = 2.0
        
        return params
    
    async def process_query(self, user_query: str) -> Dict[str, Any]:
        """
        Main method to process a natural language oceanographic query
        """
        try:
            if self.gemini_available:
                return await self._process_with_gemini(user_query)
            else:
                return await self._process_with_fallback(user_query)
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'An error occurred while processing your query.',
                'query': user_query
            }
    
    async def _process_with_gemini(self, user_query: str) -> Dict[str, Any]:
        """Process query using Gemini function calling"""
        
        try:
            # First, let Gemini analyze the query and decide what to do
            initial_response = self.client.models.generate_content(
                model=self.config.GEMINI_MODEL,
                contents=f"""
                {self.config.SYSTEM_PROMPT}
                
                User query: "{user_query}"
                
                Analyze this oceanographic query. If you need to query the database, use the appropriate function calls.
                If you can answer directly based on general oceanographic knowledge, do so.
                """,
                config=types.GenerateContentConfig(
                    tools=self.tools,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(
                        disable=True  # We want to handle function calls manually for better control
                    ),
                ),
            )
            
            # Check if function calling is needed
            if initial_response.function_calls:
                # Process function calls
                return await self._handle_function_calls(user_query, initial_response)
            else:
                # Direct response without database query
                return {
                    'success': True,
                    'response': initial_response.text,
                    'query': user_query,
                    'function_calls_made': False,
                    'data_queried': False
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'Error processing query with Gemini',
                'query': user_query
            }
    
    async def _handle_function_calls(self, user_query: str, gemini_response) -> Dict[str, Any]:
        """Handle function calls from Gemini response"""
        
        function_results = []
        data_summaries = []
        
        for function_call in gemini_response.function_calls:
            function_name = function_call.name
            function_args = function_call.args
            
            print(f"🔧 Executing function: {function_name}")
            print(f"   Args: {function_args}")
            
            # Execute the appropriate SQL query based on function call
            try:
                if function_name == 'query_aggregate_statistics':
                    results = self.sql_engine.query_aggregate_statistics(**function_args)
                    function_results.append({
                        'function': function_name,
                        'results': results,
                        'parameters': function_args
                    })
                    data_summaries.extend(self._summarize_aggregate_results(results))
                    
                elif function_name == 'detect_anomalies_and_trends':
                    results = self.sql_engine.detect_anomalies_and_trends(**function_args)
                    function_results.append({
                        'function': function_name,
                        'results': results,
                        'parameters': function_args
                    })
                    data_summaries.extend(self._summarize_anomaly_results(results))
                    
                elif function_name == 'query_profile_data':
                    results = self.sql_engine.query_profile_data(**function_args)
                    function_results.append({
                        'function': function_name,
                        'results': results[:10],  # Limit for summary
                        'total_profiles': len(results),
                        'parameters': function_args
                    })
                    data_summaries.extend(self._summarize_profile_results(results, function_args))
                    
                elif function_name == 'compare_oceanographic_data':
                    results = self.sql_engine.compare_oceanographic_data(**function_args)
                    function_results.append({
                        'function': function_name,
                        'results': results,
                        'parameters': function_args
                    })
                    data_summaries.extend(self._summarize_comparison_results(results))
                    
            except Exception as e:
                function_results.append({
                    'function': function_name,
                    'error': str(e),
                    'parameters': function_args
                })
        
        # Create function response content
        function_response_parts = []
        for i, result in enumerate(function_results):
            if 'error' in result:
                response_data = {'error': result['error']}
            else:
                response_data = {'result': data_summaries[i] if i < len(data_summaries) else result}

            function_response_part = types.Part.from_function_response(
                name=gemini_response.function_calls[i].name,
                response=response_data,
            )
            function_response_parts.append(function_response_part)
        
        function_response_content = types.Content(
            role='model', 
            parts=function_response_parts
        )
        
        # Get final response from Gemini with the function results
        user_content = types.Content(
            role='user',
            parts=[types.Part.from_text(text=user_query)],
        )
        
        final_response = self.client.models.generate_content(
            model=self.config.GEMINI_MODEL,
            contents=[
                user_content,
                gemini_response.candidates[0].content,
                function_response_content,
            ],
            config=types.GenerateContentConfig(
                tools=self.tools,
            ),
        )
        
        # Handle case where Gemini response might not have text
        response_text = final_response.text
        if response_text is None:
            # Generate a fallback response using the function results
            response_text = self._generate_fallback_from_function_results(function_results, user_query)
        
        return {
            'success': True,
            'response': response_text,
            'query': user_query,
            'function_calls_made': True,
            'function_results': function_results,
            'data_queried': True,
            'summary_stats': self._generate_summary_stats(function_results)
        }
    
    async def _process_with_fallback(self, user_query: str) -> Dict[str, Any]:
        """Process query using fallback method when Gemini is not available"""
        
        # Extract parameters using simple text analysis
        params = self._extract_parameters_fallback(user_query)
        
        # Determine query type and execute
        if params.get('operation') == 'anomaly':
            results = self.sql_engine.detect_anomalies_and_trends(**params)
            response_text = self._generate_fallback_anomaly_response(results, params)
        else:
            results = self.sql_engine.query_aggregate_statistics(**params)
            response_text = self._generate_fallback_aggregate_response(results, params)
        
        return {
            'success': True,
            'response': response_text,
            'query': user_query,
            'function_calls_made': False,
            'data_queried': True,
            'results': results,
            'extracted_parameters': params
        }
    
    def _summarize_aggregate_results(self, results: List[Dict[str, Any]]) -> List[str]:
        """Create concise summaries of aggregate results for LLM"""
        summaries = []
        for result in results:
            if result.get('value') is not None:
                summary = f"{result['parameter']}: {result['operation']} = {result['value']:.3f} (n={result['count']})"
                if result.get('filters', {}).get('region'):
                    summary += f" in {result['filters']['region']}"
                summaries.append(summary)
        return summaries
    
    def _summarize_anomaly_results(self, results: List[Dict[str, Any]]) -> List[str]:
        """Create concise summaries of enhanced anomaly detection results for LLM"""
        summaries = []
        for result in results:
            if 'error' in result:
                summaries.append(f"{result['parameter']}: {result['error']}")
            else:
                param = result['parameter']
                anomaly_count = result.get('anomaly_count', 0)
                total_months = result.get('total_months', 0)
                anomaly_rate = result.get('anomaly_rate', 0)
                period_avg = result.get('period_avg')

                if anomaly_count > 0:
                    summary = f"{param}: {anomaly_count}/{total_months} months anomalous ({anomaly_rate*100:.1f}%)"
                    if period_avg:
                        summary += f", avg: {period_avg:.3f}"
                    summary += f". {result.get('analysis_summary', '')}"
                else:
                    summary = f"{param}: No anomalies detected in {total_months} months"
                    if period_avg:
                        summary += f", avg: {period_avg:.3f}"
                    summary += ". Stable conditions observed."

                summaries.append(summary)

        return summaries
    
    def _summarize_profile_results(self, results: List[Dict[str, Any]], params: Dict[str, Any]) -> List[str]:
        """Create concise summaries of profile data for LLM"""
        if not results:
            return ["No profile data found matching the criteria"]
        
        summary = f"Retrieved {len(results)} profiles"
        if params.get('profile_type'):
            summary += f" ({params['profile_type']} type)"
        
        # Basic statistics
        if results:
            dates = [r.get('date') for r in results if r.get('date')]
            if dates:
                summary += f", date range: {min(dates)} to {max(dates)}"
        
        return [summary]
    
    def _summarize_comparison_results(self, results: List[Dict[str, Any]]) -> List[str]:
        """Create concise summaries of comparison results for LLM"""
        summaries = []
        
        # Group by parameter
        param_groups = {}
        for result in results:
            param = result.get('parameter')
            if param not in param_groups:
                param_groups[param] = []
            param_groups[param].append(result)
        
        for param, param_results in param_groups.items():
            summary = f"{param} comparison: "
            values = [(r.get('comparison_group', 'unknown'), r.get('value')) for r in param_results if r.get('value') is not None]
            summary += ", ".join([f"{group}={value:.3f}" for group, value in values])
            summaries.append(summary)
        
        return summaries
    
    def _generate_summary_stats(self, function_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate summary statistics from function results"""
        stats = {
            'total_functions_called': len(function_results),
            'successful_queries': len([r for r in function_results if 'error' not in r]),
            'failed_queries': len([r for r in function_results if 'error' in r]),
            'data_points_analyzed': 0,
            'parameters_analyzed': set(),
            'anomalies_detected': 0,
            'total_months_analyzed': 0,
            'anomaly_rate': 0.0
        }
        
        total_anomalies = 0
        total_months = 0
        
        for result in function_results:
            if 'results' in result:
                if isinstance(result['results'], list):
                    # Handle aggregate statistics
                    stats['data_points_analyzed'] += sum(r.get('count', 0) for r in result['results'] if isinstance(r, dict))
                    for r in result['results']:
                        if isinstance(r, dict) and 'parameter' in r:
                            stats['parameters_analyzed'].add(r['parameter'])
                            
                            # Handle enhanced anomaly detection results
                            if 'anomaly_count' in r:
                                total_anomalies += r.get('anomaly_count', 0)
                                total_months += r.get('total_months', 0)
        
        stats['parameters_analyzed'] = list(stats['parameters_analyzed'])
        stats['anomalies_detected'] = total_anomalies
        stats['total_months_analyzed'] = total_months
        if total_months > 0:
            stats['anomaly_rate'] = total_anomalies / total_months
        
        return stats
    
    def _generate_fallback_aggregate_response(self, results: List[Dict[str, Any]], params: Dict[str, Any]) -> str:
        """Generate response text for aggregate results in fallback mode"""
        if not results:
            return "No data found matching your query criteria."
        
        response = f"Based on your query, here are the {params.get('operation', 'aggregate')} statistics:\n\n"
        
        for result in results:
            if result.get('value') is not None:
                response += f"• {result['parameter'].title()}: {result['value']:.3f}"
                if result.get('count'):
                    response += f" (based on {result['count']} measurements)"
                response += "\n"
        
        # Add context
        if params.get('region'):
            response += f"\nRegion: {params['region'].title()}"
        if params.get('date_range'):
            response += f"\nTime period: {params['date_range'][0]} to {params['date_range'][1]}"
        
        return response
    
    def _generate_fallback_anomaly_response(self, results: List[Dict[str, Any]], params: Dict[str, Any]) -> str:
        """Generate response text for enhanced anomaly results in fallback mode"""
        if not results:
            return "No data found for anomaly analysis in the specified region and time period."
        
        # Check for enhanced anomaly results
        enhanced_results = [r for r in results if 'analysis_summary' in r]
        if enhanced_results:
            response = "Enhanced anomaly and trend analysis results:\n\n"
            
            for result in enhanced_results:
                if 'error' in result:
                    response += f"• {result['parameter'].title()}: {result['error']}\n"
                else:
                    param = result.get('parameter', 'Unknown')
                    anomaly_count = result.get('anomaly_count', 0)
                    total_months = result.get('total_months', 0)
                    anomaly_rate = result.get('anomaly_rate', 0)
                    period_avg = result.get('period_avg')
                    
                    response += f"• {param.title()}: "
                    if anomaly_count > 0:
                        response += f"{anomaly_count}/{total_months} anomalous months ({anomaly_rate*100:.1f}%)"
                    else:
                        response += f"No anomalies detected in {total_months} months"
                    
                    if period_avg:
                        response += f", average: {period_avg:.3f}"
                    response += "\n"
                    
                    if result.get('analysis_summary'):
                        response += f"  Analysis: {result['analysis_summary']}\n"
                    
                    response += "\n"
            
            response += "This analysis examines monthly patterns and statistical deviations from normal conditions."
            return response
        
        # Fallback to old format for backward compatibility
        anomalies_found = [r for r in results if r.get('anomaly_count', 0) > 0]
        
        if not anomalies_found:
            return "No significant anomalies were detected in the analyzed parameters."
        
        response = "Unusual trends and anomalies detected:\n\n"
        
        for result in anomalies_found:
            response += f"• {result['parameter'].title()}: "
            response += f"{result['anomaly_count']} anomalous measurements detected "
            response += f"(max deviation: {result['max_z_score']:.1f} standard deviations)\n"
            response += f"  Period: {result['first_anomaly']} to {result['last_anomaly']}\n\n"
        
        response += "These anomalies exceed the statistical threshold and may indicate significant oceanographic events or changes."
        
        return response
    
    def _generate_fallback_from_function_results(self, function_results: List[Dict[str, Any]], user_query: str) -> str:
        """Generate a fallback response when Gemini doesn't return text"""
        if not function_results:
            return "I processed your query but couldn't generate a response. Please try rephrasing your question."
        
        response_parts = []
        
        for result in function_results:
            if 'error' in result:
                response_parts.append(f"Error in {result['function']}: {result['error']}")
            elif 'results' in result:
                func_name = result['function']
                results = result['results']
                
                if func_name == 'query_aggregate_statistics':
                    response_parts.append("Here are the aggregate statistics I found:")
                    for r in results:
                        if isinstance(r, dict) and r.get('value') is not None:
                            param = r.get('parameter', 'Unknown')
                            value = r.get('value')
                            count = r.get('count', 0)
                            response_parts.append(f"• {param.title()}: {value:.3f} (based on {count} measurements)")
                        elif isinstance(r, dict) and 'error' in r:
                            response_parts.append(f"• {r.get('parameter', 'Unknown')}: {r['error']}")
                
                elif func_name == 'detect_anomalies_and_trends':
                    response_parts.append("Anomaly detection results:")
                    for r in results:
                        if isinstance(r, dict) and 'error' in r:
                            response_parts.append(f"• {r.get('parameter', 'Unknown')}: {r['error']}")
                        elif isinstance(r, dict):
                            param = r.get('parameter', 'Unknown')
                            anomaly_count = r.get('anomaly_count', 0)
                            total_months = r.get('total_months', 0)
                            if anomaly_count > 0:
                                response_parts.append(f"• {param.title()}: {anomaly_count}/{total_months} anomalous months")
                            else:
                                response_parts.append(f"• {param.title()}: No anomalies detected")
                
                elif func_name == 'query_profile_data':
                    total_profiles = result.get('total_profiles', 0)
                    response_parts.append(f"Retrieved {total_profiles} profile records")
                
                elif func_name == 'compare_oceanographic_data':
                    response_parts.append("Comparison results:")
                    for r in results:
                        if isinstance(r, dict) and r.get('value') is not None:
                            param = r.get('parameter', 'Unknown')
                            value = r.get('value')
                            group = r.get('comparison_group', 'Unknown')
                            response_parts.append(f"• {param.title()} ({group}): {value:.3f}")
        
        if response_parts:
            return "\n".join(response_parts)
        else:
            return "I processed your query and retrieved data, but couldn't format a clear response. Please try a more specific question."
    
    def get_available_data_summary(self, **kwargs) -> Dict[str, Any]:
        """Get summary of available data for the specified constraints"""
        return self.sql_engine.get_data_summary(**kwargs)
