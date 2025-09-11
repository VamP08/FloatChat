"""
Example usage and testing for the Agentic AI system
"""
import asyncio
import os
from typing import Dict, Any

from .agent import OceanographicAgent

async def run_examples():
    """Run example queries to demonstrate the system"""
    
    # Initialize agent
    db_path = os.getenv('DATABASE_PATH', '../argo_data.sqlite')
    api_key = os.getenv('GEMINI_API_KEY')
    
    agent = OceanographicAgent(db_path=db_path, api_key=api_key)
    
    print("=== Agentic AI Oceanographic Query System Examples ===\n")
    
    example_queries = [
        "What is the average temperature in the Bay of Bengal last year?",
        "Are there any unusual trends in Bay of Bengal in the last year?",
        "Show me the maximum salinity values in the Arabian Sea during 2023",
        "Compare average temperatures between Bay of Bengal and Arabian Sea",
        "What's the oxygen concentration at 500m depth in the North Pacific?",
        "Detect temperature anomalies in the Arabian Sea",
        "Show me recent temperature profiles in the Southern Ocean",
    ]
    
    for i, query in enumerate(example_queries, 1):
        print(f"--- Example {i}: {query} ---")
        
        try:
            result = await agent.process_query(query)
            
            if result['success']:
                print(f"Response: {result['response']}")
                
                if result.get('function_calls_made'):
                    print(f"Function calls made: {result.get('function_calls_made')}")
                    
                if result.get('summary_stats'):
                    stats = result['summary_stats']
                    print(f"Data analyzed: {stats.get('data_points_analyzed', 0)} points, "
                          f"Parameters: {', '.join(stats.get('parameters_analyzed', []))}")
            else:
                print(f"Error: {result.get('error', 'Unknown error')}")
                
        except Exception as e:
            print(f"Exception: {str(e)}")
        
        print("\n" + "="*80 + "\n")

async def test_data_summary():
    """Test data summary functionality"""
    
    db_path = os.getenv('DATABASE_PATH', '../argo_data.sqlite')
    agent = OceanographicAgent(db_path=db_path)
    
    print("=== Data Summary Test ===\n")
    
    # Test overall summary
    print("Overall data summary:")
    summary = agent.get_available_data_summary()
    print(f"Total profiles: {summary.get('total_profiles', 0)}")
    print(f"Date range: {summary.get('date_range', ['N/A', 'N/A'])}")
    print(f"Geographic coverage: {summary.get('lat_range', [])} lat, {summary.get('lon_range', [])} lon")
    print(f"Depth range: {summary.get('depth_range', [])} meters")
    print("Available parameters:")
    for param in summary.get('available_parameters', []):
        print(f"  - {param['parameter']}: {param['count']} measurements ({param['coverage']}% coverage)")
    
    print("\n" + "="*50 + "\n")
    
    # Test regional summary
    print("Bay of Bengal data summary:")
    regional_summary = agent.get_available_data_summary(region="bay of bengal")
    print(f"Regional profiles: {regional_summary.get('total_profiles', 0)}")
    print(f"Regional date range: {regional_summary.get('date_range', ['N/A', 'N/A'])}")

def test_parameter_extraction():
    """Test parameter extraction functions"""
    
    print("=== Parameter Extraction Test ===\n")
    
    agent = OceanographicAgent(db_path="dummy.db")  # Just for config access
    
    test_queries = [
        "What is the average temperature in the Bay of Bengal last year?",
        "Are there any unusual oxygen trends in Arabian Sea?",
        "Compare salinity between North Pacific and Indian Ocean in 2023",
        "Show temperature profiles at 100m depth",
    ]
    
    for query in test_queries:
        print(f"Query: {query}")
        params = agent._extract_parameters_fallback(query)
        print(f"Extracted parameters: {params}")
        print()

if __name__ == "__main__":
    print("Choose test to run:")
    print("1. Run example queries")
    print("2. Test data summary")
    print("3. Test parameter extraction")
    
    choice = input("Enter choice (1-3): ")
    
    if choice == "1":
        asyncio.run(run_examples())
    elif choice == "2":
        asyncio.run(test_data_summary())
    elif choice == "3":
        test_parameter_extraction()
    else:
        print("Invalid choice")
