from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import the router from your floats endpoint file
from .api.float import floats

# Initialize the main FastAPI application
app = FastAPI(title="FloatChat API")

# Configure CORS to allow your React frontend to communicate with this backend
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the router from the floats.py file.
# We'll add a prefix, so the URLs will be /api/v1/floats and /api/v1/query.
app.include_router(floats.router, prefix="/api/v1", tags=["Floats"])

# A simple "health check" endpoint at the root URL
@app.get("/")
def read_root():
    return {"status": "FloatChat API is running"}