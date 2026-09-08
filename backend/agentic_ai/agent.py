"""The natural-language layer.

A question goes to a language model together with four tool declarations. The model
chooses one and supplies typed arguments; this file executes that choice against the SQL
template engine and hands the result back for the model to phrase. The model never sees
the database and never writes SQL.

Groq hosts the model behind an OpenAI-compatible API, so the tool declarations in
functions.py are plain JSON Schema and the loop below is the standard two-turn tool
exchange: ask, execute what came back, answer with the results in hand.
"""
import os
import json
from typing import Dict, List, Any, Optional
from datetime import date, timedelta, datetime
import asyncio

try:
    from groq import Groq

    GROQ_AVAILABLE = True
except ImportError:
    print("Groq SDK not available. Install with: pip install groq")
    GROQ_AVAILABLE = False

from .config import AgenticConfig
from .sql_engine import SQLTemplateEngine
from .functions import OceanQueryFunctions


class OceanographicAgent:
    """Answers questions about the Argo database using declared tools only."""

    def __init__(self, db_url: str, api_key: Optional[str] = None):
        self.db_url = db_url
        self.config = AgenticConfig()
        self.sql_engine = SQLTemplateEngine(db_url)
        self.functions = OceanQueryFunctions()
        self.tools = self.functions.get_all_functions()

        key = api_key or self.config.GROQ_API_KEY
        if GROQ_AVAILABLE and key:
            self.client = Groq(api_key=key)
            self.model_available = True
        else:
            self.client = None
            self.model_available = False
            print("Warning: GROQ_API_KEY not set. Falling back to keyword extraction.")

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
        """Answer one question. Falls back to keyword extraction without a key."""
        try:
            if self.model_available:
                return await self._process_with_model(user_query)
            return await self._process_with_fallback(user_query)
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "An error occurred while processing your query.",
                "query": user_query,
            }

    def _complete(self, messages: List[Dict[str, Any]], with_tools: bool):
        """One call to the model. Tools are offered only on the first turn."""
        kwargs: Dict[str, Any] = {
            "model": self.config.MODEL,
            "messages": messages,
            "temperature": 0.2,
        }
        if with_tools:
            kwargs["tools"] = self.tools
            kwargs["tool_choice"] = "auto"
        return self.client.chat.completions.create(**kwargs).choices[0].message

    async def _process_with_model(self, user_query: str) -> Dict[str, Any]:
        """Ask, execute whatever tools come back, then answer with the results."""
        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": self.config.SYSTEM_PROMPT},
            {"role": "user", "content": user_query},
        ]

        try:
            first = await asyncio.to_thread(self._complete, messages, True)
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "Could not reach the language model.",
                "query": user_query,
            }

        if not getattr(first, "tool_calls", None):
            # No tool call means nothing was read from the database, so nothing here is
            # grounded. Say that rather than dressing it up as an answer.
            return {
                "success": True,
                "response": first.content or "I could not turn that into a query I can run.",
                "query": user_query,
                "function_calls_made": False,
                "data_queried": False,
            }

        return await self._handle_function_calls(user_query, messages, first)

    async def _handle_function_calls(
        self, user_query: str, messages: List[Dict[str, Any]], assistant_message
    ) -> Dict[str, Any]:
        """Run each requested tool and let the model phrase the results."""
        function_results: List[Dict[str, Any]] = []
        data_summaries: List[str] = []

        messages.append(
            {
                "role": "assistant",
                "content": assistant_message.content or "",
                "tool_calls": [
                    {
                        "id": call.id,
                        "type": "function",
                        "function": {
                            "name": call.function.name,
                            "arguments": call.function.arguments,
                        },
                    }
                    for call in assistant_message.tool_calls
                ],
            }
        )

        runners = {
            "query_aggregate_statistics": (
                self.sql_engine.query_aggregate_statistics,
                self._summarize_aggregate_results,
            ),
            "detect_anomalies_and_trends": (
                self.sql_engine.detect_anomalies_and_trends,
                self._summarize_anomaly_results,
            ),
            "query_profile_data": (self.sql_engine.query_profile_data, None),
            "compare_oceanographic_data": (
                self.sql_engine.compare_oceanographic_data,
                self._summarize_comparison_results,
            ),
        }

        for call in assistant_message.tool_calls:
            name = call.function.name
            try:
                args = json.loads(call.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}

            print(f"executing {name} with {args}")

            if name not in runners:
                message = f"{name} is not a function this system has."
                function_results.append(
                    {"function": name, "error": message, "parameters": args}
                )
                payload = {"error": message}
            else:
                runner, summarizer = runners[name]
                try:
                    results = runner(**args)
                    entry = {"function": name, "results": results, "parameters": args}
                    if name == "query_profile_data":
                        entry["results"] = results[:10]
                        entry["total_profiles"] = len(results)
                        data_summaries.extend(
                            self._summarize_profile_results(results, args)
                        )
                    elif summarizer:
                        data_summaries.extend(summarizer(results))
                    function_results.append(entry)
                    payload = {
                        "results": entry["results"],
                        "summary": data_summaries[-1] if data_summaries else None,
                    }
                except Exception as e:
                    # UnsupportedRegion lands here, and its message is exactly what the
                    # visitor should be told: which regions actually exist.
                    function_results.append(
                        {"function": name, "error": str(e), "parameters": args}
                    )
                    payload = {"error": str(e)}

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "name": name,
                    "content": json.dumps(payload, default=str)[:12000],
                }
            )

        try:
            final = await asyncio.to_thread(self._complete, messages, False)
            response_text = final.content
        except Exception:
            response_text = None

        if not response_text:
            response_text = self._generate_fallback_from_function_results(
                function_results, user_query
            )

        return {
            "success": True,
            "response": response_text,
            "query": user_query,
            "function_calls_made": True,
            "function_results": function_results,
            "data_queried": True,
            "summary_stats": self._generate_summary_stats(function_results),
        }

    async def _process_with_fallback(self, user_query: str) -> Dict[str, Any]:
        """Answer without a language model, by pulling parameters out of the text"""
        
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
        if params.get('depth_range'):
            depth_min, depth_max = params['depth_range'][0], params['depth_range'][-1]
            response += f"\nDepth range: {depth_min}-{depth_max} decibar (≈{depth_min}-{depth_max} meters)"
        
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
            
            # Add depth context if applicable
            if params.get('depth_range'):
                depth_min, depth_max = params['depth_range'][0], params['depth_range'][-1]
                response += f"\n\nNote: Analysis performed at {depth_min}-{depth_max} decibar pressure (≈{depth_min}-{depth_max} meters depth)."
            
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
        
        # Add depth context if applicable
        if params.get('depth_range'):
            depth_min, depth_max = params['depth_range'][0], params['depth_range'][-1]
            response += f"\n\nNote: Analysis performed at {depth_min}-{depth_max} decibar pressure (≈{depth_min}-{depth_max} meters depth)."
        
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
