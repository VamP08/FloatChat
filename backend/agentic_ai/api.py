"""
FastAPI integration for the Agentic AI system
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import asyncio
import os
from datetime import datetime

from .agent import OceanographicAgent

app = FastAPI(
    title="Agentic AI Oceanographic Query System",
    description="Natural language interface for oceanographic data analysis using Gemini 2.5 Flash",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class QueryRequest(BaseModel):
    query: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class QueryResponse(BaseModel):
    success: bool
    response: str
    query: str
    timestamp: str
    function_calls_made: bool = False
    data_queried: bool = False
    function_results: Optional[List[Dict[str, Any]]] = None
    summary_stats: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class DataSummaryRequest(BaseModel):
    region: Optional[str] = None
    lat_bounds: Optional[List[float]] = None
    lon_bounds: Optional[List[float]] = None
    date_range: Optional[List[str]] = None

# Global agent instance
agent: Optional[OceanographicAgent] = None

def get_agent() -> OceanographicAgent:
    """Get or create the agent instance"""
    global agent
    if agent is None:
        db_path = os.getenv('DATABASE_PATH', './argo_data.sqlite')
        api_key = os.getenv('GEMINI_API_KEY')
        agent = OceanographicAgent(db_path=db_path, api_key=api_key)
    return agent

@app.on_event("startup")
async def startup_event():
    """Initialize the agent on startup"""
    get_agent()
    print("Agentic AI Oceanographic Query System started")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Agentic AI Oceanographic Query System",
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    agent = get_agent()
    return {
        "status": "healthy",
        "gemini_available": agent.gemini_available,
        "database_path": agent.db_path,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """
    Process a natural language oceanographic query
    
    This endpoint accepts natural language queries about oceanographic data
    and returns analyzed results using the agentic AI system.
    """
    try:
        agent = get_agent()
        result = await agent.process_query(request.query)
        
        return QueryResponse(
            success=result.get('success', False),
            response=result.get('response', ''),
            query=request.query,
            timestamp=datetime.now().isoformat(),
            function_calls_made=result.get('function_calls_made', False),
            data_queried=result.get('data_queried', False),
            function_results=result.get('function_results'),
            summary_stats=result.get('summary_stats'),
            error=result.get('error')
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/data-summary")
async def get_data_summary(request: DataSummaryRequest):
    """
    Get a summary of available oceanographic data for specified constraints
    """
    try:
        agent = get_agent()
        
        # Convert request to kwargs
        kwargs = {}
        if request.region:
            kwargs['region'] = request.region
        if request.lat_bounds:
            kwargs['lat_bounds'] = request.lat_bounds
        if request.lon_bounds:
            kwargs['lon_bounds'] = request.lon_bounds
        if request.date_range:
            kwargs['date_range'] = request.date_range
        
        summary = agent.get_available_data_summary(**kwargs)
        
        return {
            "success": True,
            "summary": summary,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/examples")
async def get_query_examples():
    """
    Get example queries that the system can handle
    """
    examples = [
        {
            "category": "Basic Statistics",
            "queries": [
                "What is the average temperature in the Bay of Bengal last year?",
                "Show me the maximum salinity values in the Arabian Sea during 2023",
                "What's the oxygen concentration at 500m depth in the North Pacific?",
            ]
        },
        {
            "category": "Anomaly Detection",
            "queries": [
                "Are there any unusual trends in Bay of Bengal in the last year?",
                "Detect temperature anomalies in the Arabian Sea during summer 2023",
                "Show me any strange patterns in oxygen levels in the Indian Ocean",
            ]
        },
        {
            "category": "Comparative Analysis",
            "queries": [
                "Compare average temperatures between Bay of Bengal and Arabian Sea",
                "How does salinity in 2023 compare to 2022 in the North Pacific?",
                "Show differences in oxygen levels between surface and 1000m depth",
            ]
        },
        {
            "category": "Profile Data",
            "queries": [
                "Show me vertical temperature profiles in the Southern Ocean",
                "Get salinity profiles from the Mediterranean Sea in March 2023",
                "Display recent oxygen measurements in the North Atlantic",
            ]
        },
        {
            "category": "Temporal Analysis",
            "queries": [
                "Show temperature trends over the past 5 years in the Bay of Bengal",
                "What are the seasonal patterns in salinity in the Arabian Sea?",
                "Display monthly oxygen variations in the North Pacific",
            ]
        }
    ]
    
    return {
        "examples": examples,
        "total_categories": len(examples),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/config")
async def get_system_config():
    """
    Get system configuration information
    """
    agent = get_agent()
    
    return {
        "gemini_model": agent.config.GEMINI_MODEL,
        "gemini_available": agent.gemini_available,
        "available_regions": list(agent.config.REGIONS.keys()),
        "available_parameters": agent.config.PARAMETERS[:8],
        "available_operations": agent.config.OPERATIONS[:8],
        "database_connected": os.path.exists(agent.db_path),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
