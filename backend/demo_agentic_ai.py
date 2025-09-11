"""
Demo script for the Agentic AI Oceanographic Query System
Run this to see the system in action with example queries
"""
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()
# Add backend to path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

async def run_demo():
    """Run a comprehensive demo of the agentic AI system"""
    
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║         Agentic AI Oceanographic Query System Demo          ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    
    try:
        from agentic_ai import OceanographicAgent
        
        # Initialize agent
        project_root = backend_dir.parent
        db_path = os.path.join(project_root, "argo_data.sqlite") 
        api_key = os.getenv('GEMINI_API_KEY')
        
        print(f"📁 Database: {db_path}")
        print(f"🔑 API Key: {'✅ Set' if api_key else '❌ Not set (using fallback mode)'}")
        print()
        
        agent = OceanographicAgent(db_path=db_path, api_key=api_key)
        
        print(f"🤖 Agent Status:")
        print(f"   - Gemini Available: {agent.gemini_available}")
        print(f"   - Database Connected: {os.path.exists(db_path)}")
        print()
        
        # Demo queries showcasing different capabilities
        demo_queries = [
            {
                "category": "Basic Statistics",
                "query": "What is the average temperature in the Bay of Bengal?",
                "description": "Simple aggregation query"
            },
            {
                "category": "Anomaly Detection", 
                "query": "Are there any unusual trends in Bay of Bengal?",
                "description": "Enhanced anomaly detection with automatic timeframe and comprehensive parameter analysis"
            },
            {
                "category": "Multi-parameter Analysis",
                "query": "Show me oxygen and temperature statistics in Arabian Sea",
                "description": "Multiple parameter analysis"
            },
            {
                "category": "Regional Comparison",
                "query": "Compare average temperatures between Bay of Bengal and Arabian Sea",
                "description": "Cross-regional comparison"
            },
            {
                "category": "Depth Analysis",
                "query": "What's the temperature at 500m depth in the North Pacific?",
                "description": "Depth-specific query"
            }
        ]
        
        for i, demo in enumerate(demo_queries, 1):
            print(f"\n{'='*80}")
            print(f"Demo {i}: {demo['category']}")
            print(f"{'='*80}")
            print(f"📝 Query: {demo['query']}")
            print(f"💡 Purpose: {demo['description']}")
            print(f"⏱️  Processing...")
            
            try:
                result = await agent.process_query(demo['query'])
                
                if result.get('success'):
                    print(f"\n✅ Success!")
                    print(f"🤖 Response:\n{result['response']}")
                    
                    if result.get('function_calls_made'):
                        print(f"\n📊 Analysis Details:")
                        print(f"   - Function calls made: {result.get('function_calls_made')}")
                        
                        if result.get('summary_stats'):
                            stats = result['summary_stats']
                            print(f"   - Data points analyzed: {stats.get('data_points_analyzed', 'N/A')}")
                            print(f"   - Parameters: {', '.join(stats.get('parameters_analyzed', []))}")
                            print(f"   - Functions called: {stats.get('total_functions_called', 0)}")
                            
                            # Enhanced stats for anomaly detection
                            if stats.get('anomalies_detected', 0) > 0:
                                print(f"   - Anomalies detected: {stats['anomalies_detected']}")
                                print(f"   - Months analyzed: {stats.get('total_months_analyzed', 0)}")
                                print(f"   - Anomaly rate: {stats.get('anomaly_rate', 0)*100:.1f}%")
                    
                    # Show some raw results if available
                    if result.get('function_results') and len(result['function_results']) > 0:
                        print(f"\n📈 Sample Data:")
                        for func_result in result['function_results'][:2]:  # Show first 2
                            if 'results' in func_result and func_result['results']:
                                print(f"   Function: {func_result['function']}")
                                
                                # Enhanced display for anomaly detection results
                                if func_result['function'] == 'detect_anomalies_and_trends':
                                    for res in func_result['results'][:2]:  # Show first 2 parameters
                                        if isinstance(res, dict) and 'parameter' in res:
                                            param = res.get('parameter', 'Unknown')
                                            anomaly_count = res.get('anomaly_count', 0)
                                            total_months = res.get('total_months', 0)
                                            anomaly_rate = res.get('anomaly_rate', 0)
                                            period_avg = res.get('period_avg')
                                            
                                            print(f"     📊 {param}:")
                                            print(f"        - Anomalies: {anomaly_count}/{total_months} months ({anomaly_rate*100:.1f}%)")
                                            if period_avg:
                                                print(f"        - Average: {period_avg:.3f}")
                                            if res.get('analysis_summary'):
                                                print(f"        - Analysis: {res['analysis_summary']}")
                                            
                                            # Show recent monthly trends
                                            monthly_trends = res.get('monthly_trends', [])
                                            if monthly_trends:
                                                print(f"        - Recent trends:")
                                                for trend in monthly_trends[-3:]:  # Last 3 months
                                                    status_icon = "🔴" if trend.get('status') == 'ANOMALY' else "🟢"
                                                    print(f"           {status_icon} {trend.get('month')}: {trend.get('value', 0):.3f}")
                                else:
                                    # Original display for other function types
                                    for res in func_result['results'][:3]:  # Show first 3 results
                                        if isinstance(res, dict):
                                            param = res.get('parameter', 'Unknown')
                                            value = res.get('value', 'N/A')
                                            count = res.get('count', 0)
                                            print(f"     - {param}: {value} (n={count})")
                else:
                    print(f"\n❌ Error: {result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                print(f"\n💥 Exception: {str(e)}")
            
            # Pause between demos
            if i < len(demo_queries):
                print(f"\n⏸️  Press Enter for next demo...")
                input()
        
        # System capabilities summary
        print(f"\n{'='*80}")
        print("🎯 System Capabilities Summary")
        print(f"{'='*80}")
        
        print(f"✅ Natural Language Processing: {'Gemini 2.5 Flash' if agent.gemini_available else 'Fallback mode'}")
        print(f"✅ Function Calling: {'Enabled' if agent.gemini_available else 'Disabled'}")
        print(f"✅ SQL Template Engine: Enabled")
        print(f"✅ Multi-parameter Analysis: Enabled")
        print(f"✅ Anomaly Detection: Enabled")
        print(f"✅ Regional Comparisons: Enabled")
        print(f"✅ Temporal Analysis: Enabled")
        
        print(f"\n🌊 Supported Regions: {len(agent.config.REGIONS)}")
        for region in list(agent.config.REGIONS.keys())[:5]:
            print(f"   - {region.title()}")
        if len(agent.config.REGIONS) > 5:
            print(f"   - ... and {len(agent.config.REGIONS) - 5} more")
        
        print(f"\n📊 Supported Parameters: {len(agent.config.PARAMETERS)}")
        for param in agent.config.PARAMETERS[:8]:
            print(f"   - {param.title()}")
        if len(agent.config.PARAMETERS) > 8:
            print(f"   - ... and {len(agent.config.PARAMETERS) - 8} more")
        
        print(f"\n🔬 Analysis Operations:")
        for op in agent.config.OPERATIONS[:10]:
            print(f"   - {op.title()}")
        
        print(f"\n🚀 Enhanced Features:")
        print(f"   - 🤖 Intelligent Timeframe Inference: Auto-detects 'last year' when not specified")
        print(f"   - 📊 Comprehensive Parameter Analysis: Analyzes all parameters when 'all' requested")
        print(f"   - 📈 Advanced Trend Detection: Monthly patterns, anomaly rates, trend directions")
        print(f"   - 🎯 Smart Anomaly Detection: Z-score analysis with configurable thresholds")
        print(f"   - 📋 Rich Data Summaries: Detailed analysis summaries for LLM interpretation")
        
        print(f"\n🚀 Ready for deployment!")
        print(f"   - Standalone API: python -m agentic_ai.api")
        print(f"   - Integrated: python -m uvicorn main:app --reload")
        print(f"   - Test endpoint: POST /agentic/query")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Please run setup first: python setup_agentic_ai.py")
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main entry point"""
    if len(sys.argv) > 1 and sys.argv[1] == "--quick":
        # Quick test mode - just verify imports and basic functionality
        print("🔍 Quick test mode...")
        try:
            from agentic_ai import OceanographicAgent
            agent = OceanographicAgent("dummy.db")
            print("✅ System imports and initializes correctly")
            return
        except Exception as e:
            print(f"❌ Quick test failed: {e}")
            return
    
    # Full demo mode
    print("Starting full demo... (use --quick for just import test)")
    asyncio.run(run_demo())

if __name__ == "__main__":
    main()
