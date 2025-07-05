"""MCP Server models for the controller system.

This module defines Pydantic models for MCP server management,
including configuration, status tracking, and runtime metadata.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


class ServerStatus(str, Enum):
    """MCP Server status enumeration."""

    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    ERROR = "error"
    UNHEALTHY = "unhealthy"


class ServerTransport(str, Enum):
    """MCP Server transport types."""

    STDIO = "stdio"
    SSE = "sse"
    HTTP = "http"


class MCPServerConfig(BaseModel):
    """Configuration for an MCP server instance."""

    name: str = Field(..., description="Unique server name")
    description: str = Field("", description="Server description")
    transport: ServerTransport = Field(
        ServerTransport.SSE, description="Transport mechanism"
    )
    port: int = Field(8765, ge=1024, le=65535, description="Server port")
    environment: dict[str, str] = Field(
        default_factory=dict, description="Environment variables"
    )
    docker_image: str = Field(
        "langconnect-mcp:latest", description="Docker image to use"
    )
    memory_limit: str = Field("512m", description="Container memory limit")
    cpu_limit: float = Field(1.0, gt=0, le=4, description="CPU limit (cores)")
    restart_policy: str = Field("unless-stopped", description="Docker restart policy")
    volumes: list[str] = Field(
        default_factory=list, description="Volume mounts (host:container)"
    )
    labels: dict[str, str] = Field(
        default_factory=dict, description="Docker container labels"
    )
    middleware_config: dict[str, Any] = Field(
        default_factory=dict, description="FastMCP middleware configuration"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate server name format."""
        if not v or not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Server name must be alphanumeric with - or _")
        return v.lower()


class MCPServerCreate(BaseModel):
    """Request model for creating a new MCP server."""

    name: str
    description: str = ""
    transport: ServerTransport = ServerTransport.SSE
    port: Optional[int] = None  # Auto-assign if not provided
    environment: dict[str, str] = Field(default_factory=dict)
    docker_image: str = "langconnect-mcp:latest"
    memory_limit: str = "512m"
    cpu_limit: float = 1.0
    middleware_config: dict[str, Any] = Field(default_factory=dict)


class MCPServerUpdate(BaseModel):
    """Request model for updating MCP server configuration."""

    description: Optional[str] = None
    environment: Optional[dict[str, str]] = None
    memory_limit: Optional[str] = None
    cpu_limit: Optional[float] = None
    middleware_config: Optional[dict[str, Any]] = None
    restart_policy: Optional[str] = None


class MCPServerStatus(BaseModel):
    """Runtime status of an MCP server."""

    server_id: str
    status: ServerStatus
    container_id: Optional[str] = None
    started_at: Optional[datetime] = None
    stopped_at: Optional[datetime] = None
    health_check_passed: bool = False
    last_health_check: Optional[datetime] = None
    error_message: Optional[str] = None
    resource_usage: dict[str, Any] = Field(
        default_factory=dict,
        description="CPU, memory usage stats",
    )


class MCPServer(BaseModel):
    """Complete MCP server model with config and status."""

    id: str = Field(..., description="Unique server ID")
    config: MCPServerConfig
    status: MCPServerStatus
    created_at: datetime
    updated_at: datetime
    created_by: str = Field(..., description="User ID who created the server")

    @property
    def container_name(self) -> str:
        """Generate Docker container name."""
        return f"mcp-{self.config.name}"

    @property
    def is_running(self) -> bool:
        """Check if server is in running state."""
        return self.status.status == ServerStatus.RUNNING

    @property
    def can_start(self) -> bool:
        """Check if server can be started."""
        return self.status.status in [ServerStatus.STOPPED, ServerStatus.ERROR]

    @property
    def can_stop(self) -> bool:
        """Check if server can be stopped."""
        return self.status.status in [ServerStatus.RUNNING, ServerStatus.UNHEALTHY]


class MCPServerList(BaseModel):
    """Response model for listing MCP servers."""

    servers: list[MCPServer]
    total: int
    page: int = 1
    page_size: int = 20


class MCPServerLog(BaseModel):
    """Log entry from an MCP server."""

    server_id: str
    timestamp: datetime
    level: str = Field(..., description="Log level (DEBUG, INFO, WARN, ERROR)")
    message: str
    source: str = Field("server", description="Log source (server, middleware, etc)")
    metadata: dict[str, Any] = Field(default_factory=dict)


class ElicitationRequest(BaseModel):
    """Request for user elicitation from MCP server."""

    server_id: str
    tool_name: str
    request_id: str
    prompt: str
    response_schema: dict[str, Any]
    timeout: int = Field(300, description="Timeout in seconds")


class ElicitationResponse(BaseModel):
    """User response to elicitation request."""

    request_id: str
    accepted: bool
    data: Optional[dict[str, Any]] = None
    declined_reason: Optional[str] = None