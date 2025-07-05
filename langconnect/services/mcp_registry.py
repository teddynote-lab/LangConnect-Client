"""MCP Registry service for server metadata management.

This service manages MCP server configurations and status in the database,
providing a central registry for all MCP server instances.
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Optional

import asyncpg

from langconnect.models.mcp_server import (
    MCPServer,
    MCPServerConfig,
    MCPServerCreate,
    MCPServerList,
    MCPServerStatus,
    MCPServerUpdate,
    ServerStatus,
)

logger = logging.getLogger(__name__)


class MCPRegistry:
    """Registry service for MCP server metadata."""

    def __init__(self, database_url: str):
        """Initialize MCP Registry.

        Args:
            database_url: PostgreSQL connection URL
        """
        self.database_url = database_url
        self._pool: Optional[asyncpg.Pool] = None

    async def initialize(self) -> None:
        """Initialize database connection pool and tables."""
        self._pool = await asyncpg.create_pool(self.database_url, min_size=2, max_size=10)
        await self._create_tables()

    async def close(self) -> None:
        """Close database connections."""
        if self._pool:
            await self._pool.close()

    async def _create_tables(self) -> None:
        """Create required database tables if they don't exist."""
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS mcp_servers (
                    id TEXT PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    config JSONB NOT NULL,
                    status JSONB NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    created_by TEXT NOT NULL,
                    
                    -- Indexes
                    CONSTRAINT idx_mcp_server_name UNIQUE (name)
                );
                
                CREATE INDEX IF NOT EXISTS idx_mcp_server_status 
                ON mcp_servers ((status->>'status'));
                
                CREATE INDEX IF NOT EXISTS idx_mcp_server_created_by 
                ON mcp_servers (created_by);
                
                -- Trigger to update updated_at
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
                
                DROP TRIGGER IF EXISTS update_mcp_servers_updated_at ON mcp_servers;
                
                CREATE TRIGGER update_mcp_servers_updated_at 
                BEFORE UPDATE ON mcp_servers 
                FOR EACH ROW 
                EXECUTE FUNCTION update_updated_at_column();
                """
            )

    async def register_server(
        self, server_create: MCPServerCreate, user_id: str
    ) -> MCPServer:
        """Register a new MCP server.

        Args:
            server_create: Server creation request
            user_id: ID of user creating the server

        Returns:
            Created MCP server

        Raises:
            ValueError: If server name already exists
        """
        server_id = str(uuid.uuid4())

        # Auto-assign port if not provided
        if server_create.port is None:
            server_create.port = await self._get_next_available_port()

        # Create config
        config = MCPServerConfig(
            name=server_create.name,
            description=server_create.description,
            transport=server_create.transport,
            port=server_create.port,
            environment=server_create.environment,
            docker_image=server_create.docker_image,
            memory_limit=server_create.memory_limit,
            cpu_limit=server_create.cpu_limit,
            middleware_config=server_create.middleware_config,
        )

        # Initial status
        status = MCPServerStatus(
            server_id=server_id,
            status=ServerStatus.STOPPED,
        )

        # Create server object
        server = MCPServer(
            id=server_id,
            config=config,
            status=status,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            created_by=user_id,
        )

        # Insert into database
        try:
            async with self._pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO mcp_servers (id, name, config, status, created_by)
                    VALUES ($1, $2, $3, $4, $5)
                    """,
                    server.id,
                    server.config.name,
                    json.dumps(server.config.model_dump(mode="json")),
                    json.dumps(server.status.model_dump(mode="json")),
                    server.created_by,
                )
        except asyncpg.UniqueViolationError:
            raise ValueError(f"Server name '{server_create.name}' already exists")

        logger.info(f"Registered MCP server: {server.config.name} ({server.id})")
        return server

    async def get_server(self, server_id: str) -> Optional[MCPServer]:
        """Get server by ID.

        Args:
            server_id: Server ID

        Returns:
            MCP server or None if not found
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM mcp_servers WHERE id = $1", server_id
            )

        if not row:
            return None

        return self._row_to_server(row)

    async def get_server_by_name(self, name: str) -> Optional[MCPServer]:
        """Get server by name.

        Args:
            name: Server name

        Returns:
            MCP server or None if not found
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM mcp_servers WHERE name = $1", name.lower()
            )

        if not row:
            return None

        return self._row_to_server(row)

    async def list_servers(
        self,
        user_id: Optional[str] = None,
        status: Optional[ServerStatus] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> MCPServerList:
        """List MCP servers with optional filters.

        Args:
            user_id: Filter by creator user ID
            status: Filter by server status
            page: Page number (1-based)
            page_size: Items per page

        Returns:
            List of MCP servers
        """
        conditions = []
        params = []
        param_count = 0

        if user_id:
            param_count += 1
            conditions.append(f"created_by = ${param_count}")
            params.append(user_id)

        if status:
            param_count += 1
            conditions.append(f"status->>'status' = ${param_count}")
            params.append(status.value)

        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

        # Get total count
        async with self._pool.acquire() as conn:
            count_row = await conn.fetchrow(
                f"SELECT COUNT(*) as total FROM mcp_servers{where_clause}", *params
            )
            total = count_row["total"]

            # Get paginated results
            offset = (page - 1) * page_size
            rows = await conn.fetch(
                f"""
                SELECT * FROM mcp_servers{where_clause}
                ORDER BY created_at DESC
                LIMIT {page_size} OFFSET {offset}
                """,
                *params,
            )

        servers = [self._row_to_server(row) for row in rows]

        return MCPServerList(
            servers=servers,
            total=total,
            page=page,
            page_size=page_size,
        )

    async def update_server(
        self, server_id: str, update: MCPServerUpdate
    ) -> Optional[MCPServer]:
        """Update server configuration.

        Args:
            server_id: Server ID
            update: Update data

        Returns:
            Updated server or None if not found
        """
        server = await self.get_server(server_id)
        if not server:
            return None

        # Update config fields
        update_dict = update.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(server.config, field) and value is not None:
                setattr(server.config, field, value)

        # Update in database
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE mcp_servers
                SET config = $2
                WHERE id = $1
                """,
                server_id,
                json.dumps(server.config.model_dump(mode="json")),
            )

        logger.info(f"Updated MCP server configuration: {server_id}")
        return await self.get_server(server_id)

    async def update_server_status(
        self, server_id: str, status: MCPServerStatus
    ) -> Optional[MCPServer]:
        """Update server status.

        Args:
            server_id: Server ID
            status: New status

        Returns:
            Updated server or None if not found
        """
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE mcp_servers
                SET status = $2
                WHERE id = $1
                """,
                server_id,
                json.dumps(status.model_dump(mode="json")),
            )

        logger.info(f"Updated MCP server status: {server_id} -> {status.status}")
        return await self.get_server(server_id)

    async def delete_server(self, server_id: str) -> bool:
        """Delete a server from registry.

        Args:
            server_id: Server ID

        Returns:
            True if deleted, False if not found
        """
        async with self._pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM mcp_servers WHERE id = $1", server_id
            )

        deleted = result.split()[-1] == "1"
        if deleted:
            logger.info(f"Deleted MCP server from registry: {server_id}")

        return deleted

    async def _get_next_available_port(self, start_port: int = 8765) -> int:
        """Find next available port for MCP server.

        Args:
            start_port: Port to start searching from

        Returns:
            Next available port
        """
        async with self._pool.acquire() as conn:
            # Get all used ports
            rows = await conn.fetch(
                """
                SELECT (config->>'port')::int as port 
                FROM mcp_servers 
                WHERE config->>'port' IS NOT NULL
                ORDER BY port
                """
            )

        used_ports = {row["port"] for row in rows}

        # Find first available port
        port = start_port
        while port in used_ports:
            port += 1

        return port

    def _row_to_server(self, row: asyncpg.Record) -> MCPServer:
        """Convert database row to MCPServer object."""
        return MCPServer(
            id=row["id"],
            config=MCPServerConfig(**json.loads(row["config"])),
            status=MCPServerStatus(**json.loads(row["status"])),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            created_by=row["created_by"],
        )

    async def get_servers_by_status(self, status: ServerStatus) -> list[MCPServer]:
        """Get all servers with specific status.

        Args:
            status: Server status to filter by

        Returns:
            List of servers with the specified status
        """
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM mcp_servers 
                WHERE status->>'status' = $1
                ORDER BY created_at DESC
                """,
                status.value,
            )

        return [self._row_to_server(row) for row in rows]

    async def cleanup_orphaned_servers(self) -> int:
        """Clean up servers with missing containers.

        Returns:
            Number of servers cleaned up
        """
        # This would be called periodically to clean up servers
        # whose containers have been removed outside of the system
        # Implementation would check with Docker and update statuses
        # For now, just return 0
        return 0