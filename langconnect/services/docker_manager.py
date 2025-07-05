"""Docker Manager service for MCP server container management.

This service handles all Docker operations for MCP servers including
container lifecycle management, health checks, and log streaming.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import AsyncIterator, Optional

import docker
from docker.errors import ContainerError, ImageNotFound, NotFound
from docker.models.containers import Container

from langconnect.models.mcp_server import (
    MCPServerConfig,
    MCPServerStatus,
    ServerStatus,
)

logger = logging.getLogger(__name__)


class DockerManager:
    """Manages Docker containers for MCP servers."""

    def __init__(self, network_name: str = "langconnect-network"):
        """Initialize Docker manager.

        Args:
            network_name: Docker network name for container communication
        """
        self.client = docker.from_env()
        self.network_name = network_name
        self._ensure_network()

    def _ensure_network(self) -> None:
        """Ensure Docker network exists for MCP servers."""
        try:
            self.client.networks.get(self.network_name)
        except NotFound:
            logger.info(f"Creating Docker network: {self.network_name}")
            self.client.networks.create(
                self.network_name,
                driver="bridge",
                labels={"app": "langconnect", "component": "mcp"},
            )

    async def create_container(
        self, server_id: str, config: MCPServerConfig
    ) -> tuple[str, MCPServerStatus]:
        """Create a new Docker container for MCP server.

        Args:
            server_id: Unique server ID
            config: Server configuration

        Returns:
            Tuple of (container_id, status)
        """
        container_name = f"mcp-{config.name}"

        try:
            # Check if container already exists
            existing = self._get_container(container_name)
            if existing:
                await self.remove_container(container_name)

            # Prepare environment variables
            environment = {
                "MCP_SERVER_NAME": config.name,
                "MCP_SERVER_ID": server_id,
                "MCP_TRANSPORT": config.transport.value,
                "MCP_PORT": str(config.port),
                **config.environment,
            }

            # Add middleware configuration as JSON
            if config.middleware_config:
                environment["MCP_MIDDLEWARE_CONFIG"] = json.dumps(
                    config.middleware_config
                )

            # Prepare labels
            labels = {
                "com.langconnect.type": "mcp-server",
                "com.langconnect.server-id": server_id,
                "com.langconnect.server-name": config.name,
                **config.labels,
            }

            # Create container
            container = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.containers.create(
                    image=config.docker_image,
                    name=container_name,
                    environment=environment,
                    ports={f"{config.port}/tcp": config.port},
                    volumes=config.volumes,
                    labels=labels,
                    restart_policy={"Name": config.restart_policy},
                    mem_limit=config.memory_limit,
                    cpu_quota=int(config.cpu_limit * 100000),  # Convert to microseconds
                    cpu_period=100000,
                    network=self.network_name,
                    detach=True,
                ),
            )

            status = MCPServerStatus(
                server_id=server_id,
                status=ServerStatus.STOPPED,
                container_id=container.id,
                health_check_passed=False,
            )

            logger.info(f"Created container {container_name} ({container.id})")
            return container.id, status

        except ImageNotFound:
            logger.error(f"Docker image not found: {config.docker_image}")
            return "", MCPServerStatus(
                server_id=server_id,
                status=ServerStatus.ERROR,
                error_message=f"Docker image not found: {config.docker_image}",
            )
        except Exception as e:
            logger.error(f"Failed to create container: {e}")
            return "", MCPServerStatus(
                server_id=server_id,
                status=ServerStatus.ERROR,
                error_message=str(e),
            )

    async def start_container(self, container_id: str) -> MCPServerStatus:
        """Start a Docker container.

        Args:
            container_id: Container ID or name

        Returns:
            Updated server status
        """
        try:
            container = self._get_container(container_id)
            if not container:
                return MCPServerStatus(
                    server_id="",
                    status=ServerStatus.ERROR,
                    error_message="Container not found",
                )

            await asyncio.get_event_loop().run_in_executor(None, container.start)

            # Wait for container to be running
            await asyncio.sleep(1)
            container.reload()

            if container.status == "running":
                return MCPServerStatus(
                    server_id=container.labels.get("com.langconnect.server-id", ""),
                    status=ServerStatus.RUNNING,
                    container_id=container.id,
                    started_at=datetime.utcnow(),
                    health_check_passed=False,
                )
            else:
                return MCPServerStatus(
                    server_id=container.labels.get("com.langconnect.server-id", ""),
                    status=ServerStatus.ERROR,
                    container_id=container.id,
                    error_message=f"Container failed to start: {container.status}",
                )

        except Exception as e:
            logger.error(f"Failed to start container: {e}")
            return MCPServerStatus(
                server_id="",
                status=ServerStatus.ERROR,
                error_message=str(e),
            )

    async def stop_container(
        self, container_id: str, timeout: int = 10
    ) -> MCPServerStatus:
        """Stop a Docker container.

        Args:
            container_id: Container ID or name
            timeout: Stop timeout in seconds

        Returns:
            Updated server status
        """
        try:
            container = self._get_container(container_id)
            if not container:
                return MCPServerStatus(
                    server_id="",
                    status=ServerStatus.ERROR,
                    error_message="Container not found",
                )

            await asyncio.get_event_loop().run_in_executor(
                None, lambda: container.stop(timeout=timeout)
            )

            return MCPServerStatus(
                server_id=container.labels.get("com.langconnect.server-id", ""),
                status=ServerStatus.STOPPED,
                container_id=container.id,
                stopped_at=datetime.utcnow(),
            )

        except Exception as e:
            logger.error(f"Failed to stop container: {e}")
            return MCPServerStatus(
                server_id="",
                status=ServerStatus.ERROR,
                error_message=str(e),
            )

    async def restart_container(
        self, container_id: str, timeout: int = 10
    ) -> MCPServerStatus:
        """Restart a Docker container.

        Args:
            container_id: Container ID or name
            timeout: Stop timeout in seconds

        Returns:
            Updated server status
        """
        try:
            container = self._get_container(container_id)
            if not container:
                return MCPServerStatus(
                    server_id="",
                    status=ServerStatus.ERROR,
                    error_message="Container not found",
                )

            await asyncio.get_event_loop().run_in_executor(
                None, lambda: container.restart(timeout=timeout)
            )

            # Wait for container to be running
            await asyncio.sleep(2)
            container.reload()

            if container.status == "running":
                return MCPServerStatus(
                    server_id=container.labels.get("com.langconnect.server-id", ""),
                    status=ServerStatus.RUNNING,
                    container_id=container.id,
                    started_at=datetime.utcnow(),
                    health_check_passed=False,
                )
            else:
                return MCPServerStatus(
                    server_id=container.labels.get("com.langconnect.server-id", ""),
                    status=ServerStatus.ERROR,
                    container_id=container.id,
                    error_message=f"Container failed to restart: {container.status}",
                )

        except Exception as e:
            logger.error(f"Failed to restart container: {e}")
            return MCPServerStatus(
                server_id="",
                status=ServerStatus.ERROR,
                error_message=str(e),
            )

    async def remove_container(self, container_id: str, force: bool = True) -> bool:
        """Remove a Docker container.

        Args:
            container_id: Container ID or name
            force: Force removal even if running

        Returns:
            True if successful, False otherwise
        """
        try:
            container = self._get_container(container_id)
            if not container:
                return True  # Already removed

            await asyncio.get_event_loop().run_in_executor(
                None, lambda: container.remove(force=force)
            )
            return True

        except Exception as e:
            logger.error(f"Failed to remove container: {e}")
            return False

    async def get_container_status(self, container_id: str) -> Optional[MCPServerStatus]:
        """Get current status of a container.

        Args:
            container_id: Container ID or name

        Returns:
            Server status or None if not found
        """
        try:
            container = self._get_container(container_id)
            if not container:
                return None

            container.reload()

            # Map Docker status to ServerStatus
            status_map = {
                "running": ServerStatus.RUNNING,
                "exited": ServerStatus.STOPPED,
                "paused": ServerStatus.STOPPED,
                "restarting": ServerStatus.STARTING,
                "dead": ServerStatus.ERROR,
            }

            status = status_map.get(container.status, ServerStatus.ERROR)

            # Get resource stats
            stats = await self._get_container_stats(container)

            return MCPServerStatus(
                server_id=container.labels.get("com.langconnect.server-id", ""),
                status=status,
                container_id=container.id,
                health_check_passed=self._check_container_health(container),
                last_health_check=datetime.utcnow(),
                resource_usage=stats,
            )

        except Exception as e:
            logger.error(f"Failed to get container status: {e}")
            return None

    async def stream_container_logs(
        self,
        container_id: str,
        follow: bool = True,
        tail: int = 100,
    ) -> AsyncIterator[str]:
        """Stream container logs.

        Args:
            container_id: Container ID or name
            follow: Follow log output
            tail: Number of lines to tail initially

        Yields:
            Log lines
        """
        try:
            container = self._get_container(container_id)
            if not container:
                yield f"Container {container_id} not found"
                return

            # Get logs generator
            logs = container.logs(
                stream=True,
                follow=follow,
                tail=tail,
                timestamps=True,
            )

            # Stream logs
            for line in logs:
                if isinstance(line, bytes):
                    yield line.decode("utf-8", errors="replace").strip()
                else:
                    yield str(line).strip()

        except Exception as e:
            logger.error(f"Failed to stream logs: {e}")
            yield f"Error streaming logs: {e}"

    async def health_check(self, container_id: str) -> tuple[bool, Optional[str]]:
        """Perform health check on container.

        Args:
            container_id: Container ID or name

        Returns:
            Tuple of (is_healthy, error_message)
        """
        try:
            container = self._get_container(container_id)
            if not container:
                return False, "Container not found"

            container.reload()

            if container.status != "running":
                return False, f"Container is {container.status}"

            # Check if container has health check
            health = container.attrs.get("State", {}).get("Health")
            if health:
                status = health.get("Status", "unknown")
                if status == "healthy":
                    return True, None
                else:
                    last_log = health.get("Log", [{}])[-1].get("Output", "")
                    return False, f"Health check {status}: {last_log}"

            # No built-in health check, assume healthy if running
            return True, None

        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False, str(e)

    def _get_container(self, container_id: str) -> Optional[Container]:
        """Get container by ID or name."""
        try:
            return self.client.containers.get(container_id)
        except NotFound:
            return None
        except Exception as e:
            logger.error(f"Failed to get container: {e}")
            return None

    def _check_container_health(self, container: Container) -> bool:
        """Check if container is healthy."""
        try:
            health = container.attrs.get("State", {}).get("Health")
            if health:
                return health.get("Status") == "healthy"
            # No health check defined, assume healthy if running
            return container.status == "running"
        except Exception:
            return False

    async def _get_container_stats(self, container: Container) -> dict:
        """Get container resource statistics."""
        try:
            stats = await asyncio.get_event_loop().run_in_executor(
                None, lambda: container.stats(stream=False)
            )

            # Calculate CPU percentage
            cpu_delta = stats["cpu_stats"]["cpu_usage"]["total_usage"] - stats[
                "precpu_stats"
            ]["cpu_usage"]["total_usage"]
            system_delta = (
                stats["cpu_stats"]["system_cpu_usage"]
                - stats["precpu_stats"]["system_cpu_usage"]
            )
            cpu_percent = 0.0
            if system_delta > 0:
                cpu_percent = (cpu_delta / system_delta) * 100.0

            # Calculate memory usage
            memory_usage = stats["memory_stats"]["usage"]
            memory_limit = stats["memory_stats"]["limit"]
            memory_percent = (memory_usage / memory_limit) * 100.0

            return {
                "cpu_percent": round(cpu_percent, 2),
                "memory_usage_mb": round(memory_usage / 1024 / 1024, 2),
                "memory_limit_mb": round(memory_limit / 1024 / 1024, 2),
                "memory_percent": round(memory_percent, 2),
            }

        except Exception as e:
            logger.error(f"Failed to get container stats: {e}")
            return {}

    async def list_mcp_containers(self) -> list[dict]:
        """List all MCP server containers.

        Returns:
            List of container info dictionaries
        """
        try:
            containers = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.containers.list(
                    all=True,
                    filters={"label": "com.langconnect.type=mcp-server"},
                ),
            )

            result = []
            for container in containers:
                result.append(
                    {
                        "id": container.id,
                        "name": container.name,
                        "status": container.status,
                        "server_id": container.labels.get(
                            "com.langconnect.server-id", ""
                        ),
                        "server_name": container.labels.get(
                            "com.langconnect.server-name", ""
                        ),
                    }
                )

            return result

        except Exception as e:
            logger.error(f"Failed to list containers: {e}")
            return []