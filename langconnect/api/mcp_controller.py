"""MCP Controller API endpoints.

This module provides REST API endpoints for managing MCP servers,
integrating Docker management, registry, and authentication services.
"""

import asyncio
import logging
from typing import AsyncIterator, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from langconnect.api.auth import get_current_user
from langconnect.models.mcp_server import (
    ElicitationRequest,
    ElicitationResponse,
    MCPServer,
    MCPServerCreate,
    MCPServerList,
    MCPServerLog,
    MCPServerStatus,
    MCPServerUpdate,
    ServerStatus,
)
from langconnect.services.auth_manager import AuthManager
from langconnect.services.docker_manager import DockerManager
from langconnect.services.mcp_registry import MCPRegistry

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/mcp", tags=["MCP Controller"])

# Service instances (will be initialized in app startup)
docker_manager: Optional[DockerManager] = None
mcp_registry: Optional[MCPRegistry] = None
auth_manager: Optional[AuthManager] = None


def get_docker_manager() -> DockerManager:
    """Get Docker manager instance."""
    if not docker_manager:
        raise HTTPException(status_code=503, detail="Docker manager not initialized")
    return docker_manager


def get_mcp_registry() -> MCPRegistry:
    """Get MCP registry instance."""
    if not mcp_registry:
        raise HTTPException(status_code=503, detail="MCP registry not initialized")
    return mcp_registry


def get_auth_manager() -> AuthManager:
    """Get Auth manager instance."""
    if not auth_manager:
        raise HTTPException(status_code=503, detail="Auth manager not initialized")
    return auth_manager


class ServerActionResponse(BaseModel):
    """Response for server action endpoints."""

    success: bool
    message: str
    server: Optional[MCPServer] = None


# Server Management Endpoints


@router.get("/servers", response_model=MCPServerList)
async def list_servers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[ServerStatus] = None,
    current_user: dict = Depends(get_current_user),
    registry: MCPRegistry = Depends(get_mcp_registry),
) -> MCPServerList:
    """List MCP servers for current user."""
    return await registry.list_servers(
        user_id=current_user["user_id"],
        status=status,
        page=page,
        page_size=page_size,
    )


@router.post("/servers", response_model=MCPServer)
async def create_server(
    server_create: MCPServerCreate,
    current_user: dict = Depends(get_current_user),
    registry: MCPRegistry = Depends(get_mcp_registry),
    docker: DockerManager = Depends(get_docker_manager),
) -> MCPServer:
    """Create a new MCP server."""
    try:
        # Register server in database
        server = await registry.register_server(server_create, current_user["user_id"])

        # Create Docker container
        container_id, status = await docker.create_container(server.id, server.config)

        if status.status == ServerStatus.ERROR:
            # Clean up registry entry if container creation failed
            await registry.delete_server(server.id)
            raise HTTPException(status_code=500, detail=status.error_message)

        # Update server status with container ID
        status.server_id = server.id
        await registry.update_server_status(server.id, status)

        # Return updated server
        return await registry.get_server(server.id)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create server: {e}")
        raise HTTPException(status_code=500, detail="Failed to create server")


@router.get("/servers/{server_id}", response_model=MCPServer)
async def get_server(
    server_id: str,
    current_user: dict = Depends(get_current_user),
    registry: MCPRegistry = Depends(get_mcp_registry),
) -> MCPServer:
    """Get MCP server details."""
    server = await registry.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    # Check ownership
    if server.created_by != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return server


@router.put("/servers/{server_id}", response_model=MCPServer)
async def update_server(
    server_id: str,
    server_update: MCPServerUpdate,
    current_user: dict = Depends(get_current_user),
    registry: MCPRegistry = Depends(get_mcp_registry),
) -> MCPServer:
    """Update MCP server configuration."""
    # Get server and check ownership
    server = await registry.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.created_by != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Update configuration
    updated = await registry.update_server(server_id, server_update)
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update server")

    return updated


@router.delete("/servers/{server_id}")
async def delete_server(
    server_id: str,
    current_user: dict = Depends(get_current_user),
    registry: MCPRegistry = Depends(get_mcp_registry),
    docker: DockerManager = Depends(get_docker_manager),
) -> ServerActionResponse:
    """Delete MCP server."""
    # Get server and check ownership
    server = await registry.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.created_by != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Remove Docker container
    if server.status.container_id:
        await docker.remove_container(server.status.container_id)

    # Delete from registry
    deleted = await registry.delete_server(server_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete server")

    return ServerActionResponse(
        success=True,
        message=f"Server '{server.config.name}' deleted successfully",
    )


# Server Control Endpoints


@router.post("/servers/{server_id}/start")
async def start_server(
    server_id: str,
    current_user: dict = Depends(get_current_user),
    registry: MCPRegistry = Depends(get_mcp_registry),
    docker: DockerManager = Depends(get_docker_manager),
    auth: AuthManager = Depends(get_auth_manager),
) -> ServerActionResponse:
    """Start MCP server."""
    # Get server and check ownership
    server = await registry.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.created_by != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    if not server.can_start:
        raise HTTPException(
            status_code=400,
            detail=f"Server cannot be started from {server.status.status} state",
        )

    # Get fresh auth token
    token = await auth.get_token(current_user["user_id"])
    if token:
        # Update server environment with fresh token
        server.config.environment["SUPABASE_JWT_SECRET"] = token

    # Start container
    if not server.status.container_id:
        # Container doesn't exist, create it
        container_id, status = await docker.create_container(server.id, server.config)
        if status.status == ServerStatus.ERROR:
            raise HTTPException(status_code=500, detail=status.error_message)
        server.status.container_id = container_id

    # Start the container
    status = await docker.start_container(server.status.container_id)
    await registry.update_server_status(server_id, status)

    # Get updated server
    server = await registry.get_server(server_id)

    return ServerActionResponse(
        success=status.status == ServerStatus.RUNNING,
        message=f"Server '{server.config.name}' started successfully"
        if status.status == ServerStatus.RUNNING
        else f"Failed to start server: {status.error_message}",
        server=server,
    )


@router.post("/servers/{server_id}/stop")
async def stop_server(
    server_id: str,
    current_user: dict = Depends(get_current_user),
    registry: MCPRegistry = Depends(get_mcp_registry),
    docker: DockerManager = Depends(get_docker_manager),
) -> ServerActionResponse:
    """Stop MCP server."""
    # Get server and check ownership
    server = await registry.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.created_by != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    if not server.can_stop:
        raise HTTPException(
            status_code=400,
            detail=f"Server cannot be stopped from {server.status.status} state",
        )

    if not server.status.container_id:
        raise HTTPException(status_code=400, detail="No container found for server")

    # Stop container
    status = await docker.stop_container(server.status.container_id)
    await registry.update_server_status(server_id, status)

    # Get updated server
    server = await registry.get_server(server_id)

    return ServerActionResponse(
        success=status.status == ServerStatus.STOPPED,
        message=f"Server '{server.config.name}' stopped successfully"
        if status.status == ServerStatus.STOPPED
        else f"Failed to stop server: {status.error_message}",
        server=server,
    )


@router.post("/servers/{server_id}/restart")
async def restart_server(
    server_id: str,
    current_user: dict = Depends(get_current_user),
    registry: MCPRegistry = Depends(get_mcp_registry),
    docker: DockerManager = Depends(get_docker_manager),
    auth: AuthManager = Depends(get_auth_manager),
) -> ServerActionResponse:
    """Restart MCP server."""
    # Get server and check ownership
    server = await registry.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.created_by != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    if not server.status.container_id:
        raise HTTPException(status_code=400, detail="No container found for server")

    # Get fresh auth token
    token = await auth.get_token(current_user["user_id"])
    if token:
        # Update server environment with fresh token
        server.config.environment["SUPABASE_JWT_SECRET"] = token
        # TODO: Update running container environment

    # Restart container
    status = await docker.restart_container(server.status.container_id)
    await registry.update_server_status(server_id, status)

    # Get updated server
    server = await registry.get_server(server_id)

    return ServerActionResponse(
        success=status.status == ServerStatus.RUNNING,
        message=f"Server '{server.config.name}' restarted successfully"
        if status.status == ServerStatus.RUNNING
        else f"Failed to restart server: {status.error_message}",
        server=server,
    )


# Server Monitoring Endpoints


@router.get("/servers/{server_id}/status", response_model=MCPServerStatus)
async def get_server_status(
    server_id: str,
    current_user: dict = Depends(get_current_user),
    registry: MCPRegistry = Depends(get_mcp_registry),
    docker: DockerManager = Depends(get_docker_manager),
) -> MCPServerStatus:
    """Get current server status."""
    # Get server and check ownership
    server = await registry.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.created_by != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    if not server.status.container_id:
        return server.status

    # Get live status from Docker
    status = await docker.get_container_status(server.status.container_id)
    if status:
        # Update registry with latest status
        await registry.update_server_status(server_id, status)
        return status

    return server.status


@router.get("/servers/{server_id}/logs")
async def stream_server_logs(
    server_id: str,
    follow: bool = Query(True, description="Follow log output"),
    tail: int = Query(100, description="Number of lines to tail"),
    current_user: dict = Depends(get_current_user),
    registry: MCPRegistry = Depends(get_mcp_registry),
    docker: DockerManager = Depends(get_docker_manager),
) -> StreamingResponse:
    """Stream server logs using Server-Sent Events."""
    # Get server and check ownership
    server = await registry.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.created_by != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    if not server.status.container_id:
        raise HTTPException(status_code=400, detail="No container found for server")

    async def log_generator() -> AsyncIterator[str]:
        """Generate SSE formatted log events."""
        try:
            async for line in docker.stream_container_logs(
                server.status.container_id, follow=follow, tail=tail
            ):
                # Format as SSE event
                yield f"data: {line}\n\n"
        except Exception as e:
            logger.error(f"Error streaming logs: {e}")
            yield f"data: Error: {e}\n\n"

    return StreamingResponse(
        log_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable proxy buffering
        },
    )


@router.post("/servers/{server_id}/health")
async def check_server_health(
    server_id: str,
    current_user: dict = Depends(get_current_user),
    registry: MCPRegistry = Depends(get_mcp_registry),
    docker: DockerManager = Depends(get_docker_manager),
) -> dict:
    """Check server health."""
    # Get server and check ownership
    server = await registry.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.created_by != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    if not server.status.container_id:
        return {"healthy": False, "error": "No container found"}

    # Perform health check
    is_healthy, error = await docker.health_check(server.status.container_id)

    # Update status
    server.status.health_check_passed = is_healthy
    server.status.last_health_check = datetime.utcnow()
    if error:
        server.status.error_message = error

    await registry.update_server_status(server_id, server.status)

    return {"healthy": is_healthy, "error": error}


# Elicitation Endpoints (for interactive tools)


@router.post("/servers/{server_id}/elicit/respond")
async def respond_to_elicitation(
    server_id: str,
    response: ElicitationResponse,
    current_user: dict = Depends(get_current_user),
    registry: MCPRegistry = Depends(get_mcp_registry),
) -> dict:
    """Respond to elicitation request from MCP server."""
    # Get server and check ownership
    server = await registry.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.created_by != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # TODO: Implement elicitation response handling
    # This would communicate with the MCP server to provide the response

    return {"success": True, "message": "Response submitted"}


# Initialization functions for service instances


async def initialize_services(
    database_url: str,
    api_base_url: str,
    supabase_url: str,
    supabase_key: str,
    jwt_secret: str,
) -> None:
    """Initialize service instances.

    This should be called during app startup.
    """
    global docker_manager, mcp_registry, auth_manager

    # Initialize services
    docker_manager = DockerManager()
    mcp_registry = MCPRegistry(database_url)
    auth_manager = AuthManager(api_base_url, supabase_url, supabase_key, jwt_secret)

    # Initialize database
    await mcp_registry.initialize()

    logger.info("MCP Controller services initialized")


async def cleanup_services() -> None:
    """Clean up service resources.

    This should be called during app shutdown.
    """
    if mcp_registry:
        await mcp_registry.close()
    if auth_manager:
        await auth_manager.close()

    logger.info("MCP Controller services cleaned up")