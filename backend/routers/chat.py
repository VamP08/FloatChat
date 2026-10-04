from fastapi import APIRouter, Depends
from .. import schemas
from ..agent_manager import get_agent
from ..ratelimit import rate_limit
from typing import Any, Dict, List, Optional

router = APIRouter(prefix="/chat", tags=["chat"])

def _create_visualization_data(function_results: List[Dict[str, Any]]) -> Optional[schemas.VisualizationData]:
    """
    Create visualization data from function results - generic approach
    """
    if not function_results:
        return None
    
    # Get the first successful function result
    successful_result = None
    for result in function_results:
        if 'results' in result and 'error' not in result:
            successful_result = result
            break
    
    if not successful_result:
        return None
    
    func_name = successful_result['function']
    results = successful_result['results']
    params = successful_result.get('parameters', {})
    
    # Route to appropriate visualization based on function type
    if func_name == 'query_aggregate_statistics':
        return _create_aggregate_visualization(results, params)
    elif func_name == 'detect_anomalies_and_trends':
        return _create_anomaly_visualization(results, params)
    elif func_name == 'compare_oceanographic_data':
        return _create_comparison_visualization(results, params)
    elif func_name == 'query_profile_data':
        return _create_profile_visualization(results, params)
    
    return _create_table_visualization(results, params)

def _create_table_visualization(results: List[Dict[str, Any]], params: Dict[str, Any]) -> schemas.VisualizationData:
    """Create table format for complex data"""
    if not results:
        return None
    
    title = "Query Results"
    if params.get('parameters'):
        title += f" - {', '.join(params['parameters'])}"
    
    return schemas.VisualizationData(
        chart_type='table',
        title=title,
        data=results,
        parameters={
            'columns': list(results[0].keys()) if results else []
        }
    )

def _create_aggregate_visualization(results: List[Dict[str, Any]], params: Dict[str, Any]) -> schemas.VisualizationData:
    """Create bar chart for aggregate statistics - generic approach"""
    if not results:
        return None
    
    # Filter out results with errors and extract valid data
    valid_results = []
    for result in results:
        if isinstance(result, dict) and result.get('value') is not None and 'error' not in result:
            valid_results.append(result)
        elif isinstance(result, dict) and 'parameter' in result and 'value' in result:
            valid_results.append(result)
    
    if not valid_results:
        return None
    
    chart_data = []
    for result in valid_results:
        if result.get('value') is None:
            # No rows matched for this parameter. Charting it would draw an empty slot
            # next to real bars; the written answer still reports that it found nothing.
            continue
        chart_data.append({
            'parameter': result.get('parameter', 'Unknown').title(),
            'value': round(result['value'], 3),
            'count': result.get('count', 0),
            'operation': result.get('operation', 'avg')
        })

    if not chart_data:
        return None
    
    title = "Aggregate Statistics"
    if params.get('operation'):
        title += f" ({params['operation']})"
    if params.get('region'):
        title += f" - {params['region'].title()}"
    if params.get('date_range'):
        title += f" ({params['date_range'][0]} to {params['date_range'][1]})"
    
    return schemas.VisualizationData(
        chart_type='bar',
        title=title,
        data=chart_data,
        parameters={
            'x_axis': 'parameter',
            'y_axis': 'value'
        }
    )

def _create_anomaly_visualization(results: List[Dict[str, Any]], params: Dict[str, Any]) -> schemas.VisualizationData:
    """Create visualization for anomaly detection results - generic approach"""
    if not results:
        return None
    
    # Look for results with temporal data (monthly trends or time series)
    chart_data = []
    
    for result in results:
        if isinstance(result, dict):
            # Check for monthly trends (enhanced anomaly detection)
            if 'monthly_trends' in result and result['monthly_trends']:
                param = result.get('parameter', 'Unknown')
                for trend in result['monthly_trends']:
                    chart_data.append({
                        'date': trend.get('month', ''),
                        'parameter': param.title(),
                        'value': trend.get('value', 0),
                        'status': trend.get('status', 'normal'),
                        'is_anomaly': trend.get('status') == 'ANOMALY'
                    })
            # Check for simple anomaly data
            elif 'anomaly_count' in result and result.get('total_months', 0) > 0:
                param = result.get('parameter', 'Unknown')
                anomaly_rate = result.get('anomaly_rate', 0)
                total_months = result.get('total_months', 0)
                period_avg = result.get('period_avg', 0)
                
                # Create synthetic data points for visualization
                chart_data.append({
                    'parameter': param.title(),
                    'anomaly_rate': round((anomaly_rate or 0) * 100, 1),
                    'total_months': total_months,
                    'average': round(period_avg, 3) if period_avg is not None else 0,
                    'anomalies': result.get('anomaly_count', 0)
                })
    
    if not chart_data:
        return None
    
    # If we have time series data, create a scatter plot
    if any('date' in item and item.get('date') for item in chart_data):
        title = "Anomaly Detection Over Time"
        if params.get('region'):
            title += f" - {params['region'].title()}"
        
        return schemas.VisualizationData(
            chart_type='scatter',
            title=title,
            data=chart_data,
            parameters={
                'x_axis': 'date',
                'y_axis': 'value',
                'color_by': 'is_anomaly',
                'group_by': 'parameter'
            }
        )
    else:
        # Create a bar chart for anomaly statistics
        title = "Anomaly Detection Summary"
        if params.get('region'):
            title += f" - {params['region'].title()}"
        
        return schemas.VisualizationData(
            chart_type='bar',
            title=title,
            data=chart_data,
            parameters={
                'x_axis': 'parameter',
                'y_axis': 'anomaly_rate'
            }
        )

def _create_comparison_visualization(results: List[Dict[str, Any]], params: Dict[str, Any]) -> schemas.VisualizationData:
    """Create time series comparison chart for the regions"""
    if not results:
        return None
    
    # For comparison queries, we want to show time series data
    # Get the raw data from the SQL engine for time series visualization
    agent = get_agent()
    if not agent:
        return None
    
    # Extract parameters from the comparison results
    regions = params.get('regions', [])
    parameters = params.get('parameters', [])
    time_periods = params.get('time_periods', [])
    
    if not regions or not parameters:
        return None
    
    # Get time series data for each region
    chart_data = []
    for region in regions:
        for param in parameters:
            try:
                # Query time series data for this region and parameter
                ts_data = agent.sql_engine.query_time_series_data(
                    regions=[region],
                    parameters=[param],
                    date_range=time_periods[0] if time_periods else None
                )
                
                # Format for visualization
                for item in ts_data:
                    chart_data.append({
                        'date': item.get('profile_date', ''),
                        'value': item.get(param, 0),
                        'region': region,
                        'parameter': param.title()
                    })
            except Exception as e:
                print(f"Error getting time series data for {region} {param}: {e}")
    
    if not chart_data:
        return None
    
    title = f"{parameters[0].title()} Comparison: {regions[0]} vs {regions[1]}"
    if time_periods:
        start_date = time_periods[0][0] if time_periods[0] else 'Unknown'
        end_date = time_periods[0][1] if len(time_periods[0]) > 1 else 'Unknown'
        title += f" ({start_date} to {end_date})"
    
    return schemas.VisualizationData(
        chart_type='line',
        title=title,
        data=chart_data,
        parameters={
            'x_axis': 'date',
            'y_axis': 'value',
            'group_by': 'region',
            'color_by': 'region'
        }
    )

def _create_profile_visualization(results: List[Dict[str, Any]], params: Dict[str, Any]) -> schemas.VisualizationData:
    """Create visualization for profile data - generic approach"""
    if not results:
        return None
    
    # Analyze the profile data structure
    first_result = results[0] if results else {}
    
    # If we have pressure/depth data, create a profile plot
    if 'pressure' in first_result or 'depth' in first_result:
        chart_data = []
        for result in results[:100]:  # Limit for performance
            if isinstance(result, dict):
                pressure = result.get('pressure', result.get('depth', 0))
                # Add data points for each parameter
                for key, value in result.items():
                    if key not in ['date', 'latitude', 'longitude', 'pressure', 'depth'] and isinstance(value, (int, float)):
                        chart_data.append({
                            'pressure': pressure,
                            'parameter': key.title(),
                            'value': value,
                            'date': result.get('date', ''),
                            'latitude': result.get('latitude', 0),
                            'longitude': result.get('longitude', 0)
                        })
        
        if chart_data:
            title = "Profile Data"
            if params.get('profile_type'):
                title += f" - {params['profile_type']} profiles"
            if params.get('region'):
                title += f" ({params['region'].title()})"
            
            return schemas.VisualizationData(
                chart_type='scatter',
                title=title,
                data=chart_data,
                parameters={
                    'x_axis': 'value',
                    'y_axis': 'pressure',
                    'group_by': 'parameter'
                }
            )
    
    # For location-based data, create a table
    elif 'latitude' in first_result and 'longitude' in first_result:
        title = "Profile Locations"
        if params.get('profile_type'):
            title += f" - {params['profile_type']} profiles"
        
        return schemas.VisualizationData(
            chart_type='table',
            title=title,
            data=results[:50],  # Limit for display
            parameters={
                'columns': ['date', 'latitude', 'longitude', 'pressure']
            }
        )
    
    # Fallback to generic table
    return _create_table_visualization(results, params)

@router.post("", response_model=schemas.ChatMessage, dependencies=[Depends(rate_limit)])
async def handle_chat_message(request: schemas.ChatRequest):
    """
    Receives the chat history and returns the AI's response using agentic AI.
    """
    agent_instance = get_agent()
    
    if not agent_instance:
        # No model configured: say so rather than answer.
        return schemas.ChatMessage(
            role="ai",
            content=(
                "Questions are unavailable right now because the language model is not "
                "configured on this server. The map, the float pages and every chart "
                "still work, and they read the same database a question would."
            ),
        )
    
    try:
        # Extract the user's latest message from the chat history
        user_message = request.history[-1].content if request.history else ""
        
        if not user_message.strip():
            return schemas.ChatMessage(role="ai", content="I didn't receive a message. Please ask me something about the oceanographic data!")
        
        print(f"chat query: {user_message}")
        
        # Process the query using the agentic AI
        result = await agent_instance.process_query(user_message)
        
        if result.get('success'):
            ai_response_content = result.get('response', 'I processed your query but couldn\'t generate a response.')

            # Create visualization data if function results are available
            visualization = None
            if result.get('function_results'):
                visualization = _create_visualization_data(result['function_results'])
            
            return schemas.ChatMessage(
                role="ai", 
                content=ai_response_content,
                visualization=visualization
            )
        else:
            error_msg = result.get('error', 'Unknown error occurred')
            # The provider's own error text is not for the visitor. A rate limit is
            # worth naming because waiting fixes it; anything else is ours.
            lowered = str(error_msg).lower()
            if "429" in lowered or "rate limit" in lowered:
                ai_response_content = (
                    "The language model is rate limited at the moment. Wait a minute and "
                    "ask again. The map, the float pages and the charts are unaffected."
                )
            else:
                ai_response_content = (
                    "Something went wrong answering that. The map, the float pages and "
                    "the charts still work, and they read the same database."
                )
            print(f"chat agent error: {error_msg}")
        
        return schemas.ChatMessage(role="ai", content=ai_response_content)
        
    except Exception as e:
        # Same reasoning as above: a driver or provider message means nothing to a
        # visitor and can carry a table name or a fragment of SQL with it.
        print(f"chat handler failed: {type(e).__name__}: {e}")
        return schemas.ChatMessage(
            role="ai",
            content=(
                "Something went wrong answering that. The map, the float pages and "
                "the charts still work, and they read the same database."
            ),
        )

# Questions the template engine can actually answer against the ingested region, used
# as the starting suggestions in the interface. Every one of these was run against the
# database before being listed here.
EXAMPLE_QUESTIONS = [
    "What is the average temperature in the Arabian Sea?",
    "Compare salinity between the Arabian Sea and the Bay of Bengal",
    "Show dissolved oxygen below 500 decibar in the Bay of Bengal",
    "Are there unusual chlorophyll trends in the Arabian Sea?",
    "What is the maximum nitrate concentration in the equatorial Indian Ocean?",
]


@router.get("/examples", response_model=List[str])
def read_examples():
    """Starting questions for the chat, chosen to match what the data can support."""
    return EXAMPLE_QUESTIONS
