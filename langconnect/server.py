import logging
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from langconnect.api import auth_router, collections_router, documents_router
from langconnect.api.mcp_controller import (
    router as mcp_router,
    initialize_services as init_mcp_services,
    cleanup_services as cleanup_mcp_services,
)
from langconnect.config import ALLOWED_ORIGINS
from langconnect.database.collections import CollectionsManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)


# Initialize FastAPI app


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for FastAPI application."""
    logger.info("App is starting up. Creating background worker...")
    
    # Initialize collections manager
    await CollectionsManager.setup()
    
    # Initialize MCP services
    logger.info("Initializing MCP Controller services...")
    database_url = os.getenv("DATABASE_URL", "")
    api_base_url = os.getenv("API_BASE_URL", "http://localhost:8080")
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_KEY", "")
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
    
    await init_mcp_services(
        database_url=database_url,
        api_base_url=api_base_url,
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        jwt_secret=jwt_secret,
    )
    
    yield
    
    logger.info("App is shutting down. Stopping background worker...")
    
    # Cleanup MCP services
    logger.info("Cleaning up MCP Controller services...")
    await cleanup_mcp_services()


APP = FastAPI(
    title="LangConnect API",
    description="A REST API for a RAG system using FastAPI and LangChain",
    version="0.1.0",
    lifespan=lifespan,
)

# Add CORS middleware
APP.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
APP.include_router(auth_router)
APP.include_router(collections_router)
APP.include_router(documents_router)
APP.include_router(mcp_router, prefix="/api")


@APP.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("langconnect.server:APP", host="0.0.0.0", port=8080)
