"""Auth Manager service for JWT token management and auto-renewal.

This service handles authentication with Supabase and manages JWT tokens
for MCP servers, including automatic token refresh.
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Optional

import httpx
import jwt
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class AuthToken(BaseModel):
    """Authentication token model."""

    access_token: str
    refresh_token: Optional[str] = None
    expires_at: datetime
    user_id: str
    user_email: str


class AuthManager:
    """Manages authentication tokens for MCP servers."""

    def __init__(
        self,
        api_base_url: str,
        supabase_url: str,
        supabase_key: str,
        jwt_secret: str,
    ):
        """Initialize Auth Manager.

        Args:
            api_base_url: LangConnect API base URL
            supabase_url: Supabase project URL
            supabase_key: Supabase anon key
            jwt_secret: JWT secret for token validation
        """
        self.api_base_url = api_base_url.rstrip("/")
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_key = supabase_key
        self.jwt_secret = jwt_secret
        self._tokens: dict[str, AuthToken] = {}
        self._refresh_tasks: dict[str, asyncio.Task] = {}

    async def sign_in(self, email: str, password: str) -> AuthToken:
        """Sign in user and get authentication token.

        Args:
            email: User email
            password: User password

        Returns:
            Authentication token

        Raises:
            ValueError: If sign in fails
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base_url}/auth/signin",
                json={"email": email, "password": password},
            )

            if response.status_code != 200:
                error = response.json()
                raise ValueError(f"Sign in failed: {error.get('detail', 'Unknown error')}")

            data = response.json()

        # Decode token to get user info and expiry
        token_data = self._decode_token(data["access_token"])

        auth_token = AuthToken(
            access_token=data["access_token"],
            refresh_token=data.get("refresh_token"),
            expires_at=datetime.fromtimestamp(token_data["exp"]),
            user_id=token_data["sub"],
            user_email=email,
        )

        # Store token and start refresh task
        self._tokens[auth_token.user_id] = auth_token
        self._start_refresh_task(auth_token.user_id)

        logger.info(f"User signed in: {email} ({auth_token.user_id})")
        return auth_token

    async def refresh_token(self, user_id: str) -> Optional[AuthToken]:
        """Refresh authentication token.

        Args:
            user_id: User ID

        Returns:
            New authentication token or None if refresh fails
        """
        current_token = self._tokens.get(user_id)
        if not current_token or not current_token.refresh_token:
            logger.warning(f"No refresh token available for user {user_id}")
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.supabase_url}/auth/v1/token?grant_type=refresh_token",
                    headers={
                        "apikey": self.supabase_key,
                        "Content-Type": "application/json",
                    },
                    json={"refresh_token": current_token.refresh_token},
                )

                if response.status_code != 200:
                    logger.error(f"Token refresh failed: {response.text}")
                    return None

                data = response.json()

            # Decode new token
            token_data = self._decode_token(data["access_token"])

            new_token = AuthToken(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token", current_token.refresh_token),
                expires_at=datetime.fromtimestamp(token_data["exp"]),
                user_id=token_data["sub"],
                user_email=current_token.user_email,
            )

            # Update stored token
            self._tokens[user_id] = new_token

            logger.info(f"Token refreshed for user {user_id}")
            return new_token

        except Exception as e:
            logger.error(f"Failed to refresh token: {e}")
            return None

    async def get_token(self, user_id: str) -> Optional[str]:
        """Get valid access token for user.

        Args:
            user_id: User ID

        Returns:
            Access token or None if not available
        """
        token = self._tokens.get(user_id)
        if not token:
            return None

        # Check if token is still valid (with 5 minute buffer)
        if datetime.utcnow() >= token.expires_at - timedelta(minutes=5):
            # Token expired or about to expire, refresh it
            logger.info(f"Token expired for user {user_id}, refreshing...")
            token = await self.refresh_token(user_id)
            if not token:
                return None

        return token.access_token

    async def validate_token(self, access_token: str) -> Optional[dict]:
        """Validate JWT token.

        Args:
            access_token: JWT access token

        Returns:
            Decoded token data or None if invalid
        """
        try:
            # Decode and verify token
            payload = jwt.decode(
                access_token,
                self.jwt_secret,
                algorithms=["HS256"],
                options={"verify_exp": True},
            )
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None

    async def get_or_create_token(
        self, email: str, password: str, user_id: Optional[str] = None
    ) -> AuthToken:
        """Get existing token or create new one.

        Args:
            email: User email
            password: User password
            user_id: Optional user ID to check for existing token

        Returns:
            Authentication token
        """
        # Check for existing valid token
        if user_id and user_id in self._tokens:
            token = await self.get_token(user_id)
            if token:
                return self._tokens[user_id]

        # Sign in to get new token
        return await self.sign_in(email, password)

    def _decode_token(self, access_token: str) -> dict:
        """Decode JWT token without verification.

        Args:
            access_token: JWT access token

        Returns:
            Decoded token payload
        """
        # Decode without verification to get expiry
        # In production, you might want to verify with the actual secret
        return jwt.decode(access_token, options={"verify_signature": False})

    def _start_refresh_task(self, user_id: str) -> None:
        """Start background task to refresh token before expiry.

        Args:
            user_id: User ID
        """
        # Cancel existing task if any
        if user_id in self._refresh_tasks:
            self._refresh_tasks[user_id].cancel()

        # Create new refresh task
        task = asyncio.create_task(self._refresh_loop(user_id))
        self._refresh_tasks[user_id] = task

    async def _refresh_loop(self, user_id: str) -> None:
        """Background task to refresh token periodically.

        Args:
            user_id: User ID
        """
        while user_id in self._tokens:
            token = self._tokens[user_id]

            # Calculate when to refresh (10 minutes before expiry)
            refresh_at = token.expires_at - timedelta(minutes=10)
            wait_seconds = max(0, (refresh_at - datetime.utcnow()).total_seconds())

            if wait_seconds > 0:
                logger.info(
                    f"Scheduling token refresh for user {user_id} in {wait_seconds:.0f} seconds"
                )
                await asyncio.sleep(wait_seconds)

            # Refresh the token
            new_token = await self.refresh_token(user_id)
            if not new_token:
                logger.error(f"Failed to refresh token for user {user_id}")
                break

    async def sign_out(self, user_id: str) -> None:
        """Sign out user and remove tokens.

        Args:
            user_id: User ID
        """
        # Cancel refresh task
        if user_id in self._refresh_tasks:
            self._refresh_tasks[user_id].cancel()
            del self._refresh_tasks[user_id]

        # Remove token
        if user_id in self._tokens:
            del self._tokens[user_id]

        logger.info(f"User signed out: {user_id}")

    async def close(self) -> None:
        """Clean up resources."""
        # Cancel all refresh tasks
        for task in self._refresh_tasks.values():
            task.cancel()

        # Wait for tasks to complete
        if self._refresh_tasks:
            await asyncio.gather(
                *self._refresh_tasks.values(), return_exceptions=True
            )

        self._refresh_tasks.clear()
        self._tokens.clear()

    def get_user_tokens(self) -> dict[str, str]:
        """Get all current user tokens.

        Returns:
            Dictionary of user_id -> access_token
        """
        return {
            user_id: token.access_token
            for user_id, token in self._tokens.items()
            if datetime.utcnow() < token.expires_at
        }

    async def update_server_token(self, server_id: str, user_id: str) -> Optional[str]:
        """Update token for a specific MCP server.

        Args:
            server_id: MCP server ID
            user_id: User ID who owns the server

        Returns:
            Access token or None if not available
        """
        token = await self.get_token(user_id)
        if token:
            # Here you could update the server's environment variables
            # or configuration with the new token
            logger.info(f"Updated token for server {server_id}")

        return token