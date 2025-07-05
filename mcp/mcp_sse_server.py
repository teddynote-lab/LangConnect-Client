#!/usr/bin/env python3
"""LangConnect MCP Server using FastMCP"""

import json
import os
import sys
from datetime import datetime
from getpass import getpass
from pathlib import Path
from typing import Optional

import httpx
import requests
from dotenv import load_dotenv
from langchain_core.output_parsers import BaseOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

from fastmcp import FastMCP

load_dotenv()


# Configuration
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SSE_PORT = int(os.getenv("SSE_PORT", "8765"))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


# Output parser for multi-query generation
class LineListOutputParser(BaseOutputParser[list[str]]):
    """Output parser for a list of lines."""

    def parse(self, text: str) -> list[str]:
        # Split into lines, strip whitespace, and remove empties
        lines = [line.strip() for line in text.strip().split("\n")]
        return [line for line in lines if line]


# Create FastMCP server
mcp = FastMCP(name="LangConnect")


# Authentication functions
def sign_in(email: str, password: str):
    """Sign in to Supabase and get access token."""
    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/signin",
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            data = response.json()
            return data.get("access_token"), data.get("refresh_token")
        error = response.json()
        print(f"Sign in failed: {error.get('detail', 'Unknown error')}")
        return None, None

    except Exception as e:
        print(f"Error during sign in: {e!s}")
        return None, None


def test_token(token: str):
    """Test if the token works by calling the collections endpoint."""
    # In testing mode, always return True for test tokens
    if os.getenv("IS_TESTING", "").lower() == "true" and token in ["user1", "user2"]:
        return True
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/collections", headers={"Authorization": f"Bearer {token}"}
        )
        return response.status_code == 200
    except:
        return False


def update_env_file(token: str):
    """Update the .env file with the new access token."""
    env_path = Path(__file__).parent.parent / ".env"

    if not env_path.exists():
        print("⚠️  .env file not found. Creating new one...")
        with open(env_path, "w") as f:
            f.write(f"SUPABASE_JWT_SECRET={token}\n")
        return

    # Read existing .env file
    with open(env_path) as f:
        lines = f.readlines()

    # Update or add SUPABASE_JWT_SECRET
    updated = False
    new_lines = []

    for line in lines:
        if line.strip().startswith("SUPABASE_JWT_SECRET="):
            new_lines.append(f"SUPABASE_JWT_SECRET={token}\n")
            updated = True
        else:
            new_lines.append(line)

    # If SUPABASE_JWT_SECRET wasn't found, add it
    if not updated:
        # Add newline if file doesn't end with one
        if new_lines and not new_lines[-1].endswith("\n"):
            new_lines[-1] += "\n"
        new_lines.append(f"SUPABASE_JWT_SECRET={token}\n")

    # Write back to .env file
    with open(env_path, "w") as f:
        f.writelines(new_lines)

    print("✅ Updated .env file with new access token")


def get_access_token():
    """Get Supabase access token through user authentication."""
    print("\n🔐 Authentication Required")
    print("=" * 40)
    print("Please sign in to generate your access token")
    print()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file")
        return None

    # Get credentials
    email = input("Enter your email: ")
    password = getpass("Enter your password: ")

    print("\nSigning in...")
    access_token, refresh_token = sign_in(email, password)

    if access_token:
        print("✅ Sign in successful!")
        print("Testing token...")

        if test_token(access_token):
            print("✅ Token is valid and working!")
            # Update .env file with new token
            update_env_file(access_token)
            return access_token
        print("❌ Token validation failed.")
        return None
    print("❌ Sign in failed. Please check your credentials.")
    return None


def ensure_valid_token():
    """Ensure we have a valid token, prompting for login if necessary."""
    global SUPABASE_JWT_SECRET

    # Check if we're in testing mode
    if os.getenv("IS_TESTING", "").lower() == "true":
        print("🧪 Running in testing mode - authentication bypassed")
        return "user1"  # Use test token

    # First check if we have a token
    if SUPABASE_JWT_SECRET:
        print("Testing existing token...")
        if test_token(SUPABASE_JWT_SECRET):
            print("✅ Existing token is valid!")
            return SUPABASE_JWT_SECRET
        else:
            print("❌ Existing token is invalid or expired.")

    # Get new token
    print("\n⚠️  No valid token found. Please authenticate.")
    new_token = get_access_token()

    if new_token:
        SUPABASE_JWT_SECRET = new_token
        # Reload the token for the current session
        os.environ["SUPABASE_JWT_SECRET"] = new_token
        return new_token

    return None


# HTTP client
class LangConnectClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if token:
            self.headers["Authorization"] = f"Bearer {token}"

    def update_token(self, token: str):
        """Update the authorization token."""
        self.token = token
        if token:
            self.headers["Authorization"] = f"Bearer {token}"
        else:
            self.headers.pop("Authorization", None)

    async def request(self, method: str, endpoint: str, **kwargs):
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}{endpoint}"
            response = await client.request(
                method, url, headers=self.headers, timeout=60.0, **kwargs
            )
            response.raise_for_status()
            return (
                response.json()
                if response.status_code != 204
                else {"status": "success"}
            )


# Initialize client (will be updated with valid token on startup)
client = LangConnectClient(API_BASE_URL, "")


@mcp.tool
async def search_documents(
    collection_id: str,
    query: str,
    limit: int = 5,
    search_type: str = "semantic",
    filter_json: Optional[str] = None,
) -> str:
    """Search documents in a collection using semantic, keyword, or hybrid search."""
    search_data = {"query": query, "limit": limit, "search_type": search_type}

    if filter_json:
        try:
            search_data["filter"] = json.loads(filter_json)
        except json.JSONDecodeError:
            return "Error: Invalid JSON in filter parameter"

    results = await client.request(
        "POST", f"/collections/{collection_id}/documents/search", json=search_data
    )

    if not results:
        return "No results found."

    output = f"## Search Results ({search_type})\n\n"
    for i, result in enumerate(results, 1):
        output += f"### Result {i} (Score: {result.get('score', 0):.4f})\n"
        output += f"{result.get('page_content', '')}\n"
        output += f"Document ID: {result.get('id', 'Unknown')}\n\n"

    return output


@mcp.tool
async def list_collections() -> str:
    """List all available document collections."""
    collections = await client.request("GET", "/collections")

    if not collections:
        return "No collections found."

    output = "## Collections\n\n"
    for coll in collections:
        output += (
            f"- **{coll.get('name', 'Unnamed')}** (ID: {coll.get('uuid', 'Unknown')})\n"
        )

    return output


@mcp.tool
async def get_collection(collection_id: str) -> str:
    """Get details of a specific collection."""
    collection = await client.request("GET", f"/collections/{collection_id}")
    return f"**{collection.get('name', 'Unnamed')}**\nID: {collection.get('uuid', 'Unknown')}"


@mcp.tool
async def create_collection(name: str, metadata_json: Optional[str] = None) -> str:
    """Create a new collection."""
    data = {"name": name}

    if metadata_json:
        try:
            data["metadata"] = json.loads(metadata_json)
        except json.JSONDecodeError:
            return "Error: Invalid JSON in metadata"

    result = await client.request("POST", "/collections", json=data)
    return f"Collection '{result.get('name')}' created with ID: {result.get('uuid')}"


@mcp.tool
async def delete_collection(collection_id: str) -> str:
    """Delete a collection and all its documents."""
    await client.request("DELETE", f"/collections/{collection_id}")
    return f"Collection {collection_id} deleted successfully!"


@mcp.tool
async def list_documents(collection_id: str, limit: int = 20) -> str:
    """List documents in a collection."""
    docs = await client.request(
        "GET", f"/collections/{collection_id}/documents", params={"limit": limit}
    )

    if not docs:
        return "No documents found."

    output = f"## Documents ({len(docs)} items)\n\n"
    for i, doc in enumerate(docs, 1):
        content_preview = doc.get("page_content", "")[:200]
        if len(doc.get("page_content", "")) > 200:
            content_preview += "..."
        output += f"{i}. {content_preview}\n   ID: {doc.get('id', 'Unknown')}\n\n"

    return output


@mcp.tool
async def add_documents(collection_id: str, text: str) -> str:
    """Add a text document to a collection."""
    metadata = {"source": "mcp-input", "created_at": datetime.now().isoformat()}

    files = [("files", ("document.txt", text.encode("utf-8"), "text/plain"))]
    data = {"metadatas_json": json.dumps([metadata])}

    # Remove Content-Type for multipart
    headers = client.headers.copy()
    headers.pop("Content-Type", None)

    async with httpx.AsyncClient() as http_client:
        response = await http_client.post(
            f"{client.base_url}/collections/{collection_id}/documents",
            headers=headers,
            files=files,
            data=data,
            timeout=60.0,
        )
        response.raise_for_status()
        result = response.json()

    if result.get("success"):
        return f"Document added successfully! Created {len(result.get('added_chunk_ids', []))} chunks."
    return f"Failed to add document: {result.get('message', 'Unknown error')}"


@mcp.tool
async def delete_document(collection_id: str, document_id: str) -> str:
    """Delete a document from a collection."""
    await client.request(
        "DELETE", f"/collections/{collection_id}/documents/{document_id}"
    )
    return f"Document {document_id} deleted successfully!"


@mcp.tool
async def multi_query(question: str) -> str:
    """Generate multiple queries (3-5) for better vector search results from a single user question."""
    if not OPENAI_API_KEY:
        return json.dumps({"error": "OpenAI API key not configured"})

    try:
        # Initialize LLM
        llm = ChatOpenAI(temperature=0, api_key=OPENAI_API_KEY)

        # Create prompt template
        query_prompt = PromptTemplate(
            input_variables=["question"],
            template="""You are an AI language model assistant. Your task is to generate 3 to 5 
different versions of the given user question to retrieve relevant documents from a vector 
database. By generating multiple perspectives on the user question, your goal is to help
the user overcome some of the limitations of the distance-based similarity search. 
Provide these alternative questions separated by newlines. Do not number them.
Original question: {question}""",
        )

        # Create parser
        output_parser = LineListOutputParser()

        # Create chain
        chain = query_prompt | llm | output_parser

        # Generate queries
        queries = await chain.ainvoke({"question": question})

        # Return as JSON array
        return json.dumps(queries, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"error": f"Failed to generate queries: {e!s}"})


@mcp.tool
async def get_health_status() -> str:
    """Check API health status."""
    result = await client.request("GET", "/health")
    return f"Status: {result.get('status', 'Unknown')}\nAPI: {API_BASE_URL}\nAuth: {'✓' if SUPABASE_JWT_SECRET else '✗'}"


if __name__ == "__main__":
    print("🚀 LangConnect MCP SSE Server")
    print("=" * 50)

    # Ensure we have a valid token before starting
    valid_token = ensure_valid_token()

    if not valid_token:
        print("\n❌ Unable to obtain valid authentication token.")
        print("Please check your credentials and try again.")
        sys.exit(1)

    # Update the client with the valid token
    client.update_token(valid_token)

    print(f"\n✅ Starting MCP SSE server on http://127.0.0.1:{SSE_PORT}")
    print(
        "This server is for MCP clients only and cannot be accessed directly in a browser."
    )
    print("\n⚠️  Note: The access token will expire in about 1 hour.")
    print("When it expires, restart the server to get a new token.")

    try:
        mcp.run(transport="sse", port=SSE_PORT)
    except KeyboardInterrupt:
        print("\n\n✅ Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        sys.exit(1)
