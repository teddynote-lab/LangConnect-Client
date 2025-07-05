# LangConnect MCP Servers

This directory contains Model Context Protocol (MCP) server implementations for LangConnect, providing a standardized interface for AI assistants to interact with the LangConnect document management system.

## Overview

LangConnect provides two MCP server implementations using the FastMCP framework:

1. **stdio Server** (`mcp_server.py`) - For desktop applications like Claude Desktop
2. **SSE Server** (`mcp_sse_server.py`) - For web-based clients using Server-Sent Events

Both servers provide the same set of tools but use different transport mechanisms.

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌────────────┐
│ MCP Client  │────▶│ MCP Server  │────▶│ LangConnect  │────▶│ PostgreSQL │
│(Claude, etc)│     │  (FastMCP)  │     │     API      │     │ + pgvector │
└─────────────┘     └─────────────┘     └──────────────┘     └────────────┘
                           │                     │
                           └─────────────────────┘
                                Supabase Auth
                                   (JWT)
```

## Available Tools

The MCP servers provide 10 tools for document management:

### 1. **search_documents**
Search for documents using semantic, keyword, or hybrid search.
```python
Parameters:
- collection_id: str     # Collection to search in
- query: str            # Search query
- limit: int = 5        # Maximum results
- search_type: str = "semantic"  # "semantic", "keyword", or "hybrid"
- filter_json: Optional[str]     # JSON filter criteria
```

### 2. **list_collections**
List all available document collections.
```python
Parameters:
- skip: int = 0         # Pagination offset
- limit: int = 10       # Maximum results
```

### 3. **get_collection**
Get details of a specific collection.
```python
Parameters:
- collection_id: str    # Collection ID
```

### 4. **create_collection**
Create a new document collection.
```python
Parameters:
- name: str             # Collection name
- description: str = "" # Collection description
```

### 5. **delete_collection**
Delete a collection and all its documents.
```python
Parameters:
- collection_id: str    # Collection to delete
```

### 6. **list_documents**
List documents in a collection.
```python
Parameters:
- collection_id: str    # Collection ID
- skip: int = 0         # Pagination offset
- limit: int = 10       # Maximum results
```

### 7. **add_documents**
Add documents to a collection (text only).
```python
Parameters:
- collection_id: str    # Target collection
- content: str          # Document content
- metadata_json: str = "{}"  # JSON metadata
```

### 8. **delete_document**
Delete a specific document.
```python
Parameters:
- collection_id: str    # Collection ID
- document_id: str      # Document ID
```

### 9. **multi_query**
Generate multiple search queries from a single question using AI.
```python
Parameters:
- question: str         # Original question
- num_queries: int = 3  # Number of queries to generate
```

### 10. **get_health_status**
Check the health status of the LangConnect API.
```python
Parameters: None
```

## File Structure

```
mcp/
├── README.md                # This file
├── mcp_server.py           # stdio transport MCP server
├── mcp_sse_server.py       # SSE transport MCP server
├── get_access_token.py     # Helper to obtain JWT tokens
├── create_mcp_json.py      # Interactive config generator
├── __init__.py             # Package initialization
└── server/                 # Low-level server stubs
    ├── __init__.py
    └── lowlevel/
        └── __init__.py
```

## Authentication

Both MCP servers require Supabase JWT authentication. You need a valid access token to use these servers.

### Getting Your Access Token

#### Option 1: Using the Helper Script (Recommended)

```bash
cd mcp
python get_access_token.py
```

This script will:
- Prompt for your email and password
- Sign you in via the LangConnect API
- Test the token validity
- Display the access token for copying

#### Option 2: Interactive Configuration Generator

```bash
cd mcp
python create_mcp_json.py
```

This script will:
- Prompt for credentials
- Automatically obtain a token
- Generate `mcp_config.json` with the token
- Update your `.env` file

#### Option 3: From the Next.js UI

1. Sign in at http://localhost:3000
2. Open Browser Developer Tools (F12)
3. Go to Application/Storage → Session Storage
4. Find `access_token` for localhost:3000
5. Copy the JWT token value

### Token Configuration

#### For stdio Server (Claude Desktop)

Update `mcp_config.json`:
```json
{
  "mcpServers": {
    "langconnect-rag-mcp": {
      "command": "/path/to/python",
      "args": ["/path/to/mcp_server.py"],
      "env": {
        "API_BASE_URL": "http://localhost:8080",
        "SUPABASE_JWT_SECRET": "YOUR_JWT_TOKEN_HERE"
      }
    }
  }
}
```

#### For SSE Server

Set environment variable:
```bash
export SUPABASE_JWT_SECRET="YOUR_JWT_TOKEN_HERE"
python mcp/mcp_sse_server.py
```

Or add to `.env`:
```env
SUPABASE_JWT_SECRET=YOUR_JWT_TOKEN_HERE
```

## Setup Guide

### Prerequisites

- Python 3.11 or higher
- LangConnect API running (default: http://localhost:8080)
- Valid Supabase credentials
- Environment variables configured in `.env`

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Get an access token using one of the methods above

### Running the Servers

#### stdio Server (for Claude Desktop)
```bash
# Direct run
export SUPABASE_JWT_SECRET="your-token"
python mcp/mcp_server.py

# Or use generated config
# Place mcp_config.json in Claude Desktop's config directory
```

#### SSE Server (for web clients)
```bash
# Default port 8765
export SUPABASE_JWT_SECRET="your-token"
python mcp/mcp_sse_server.py

# Custom port
export SSE_PORT=9000
python mcp/mcp_sse_server.py
```

## Testing with MCP Inspector

[MCP Inspector](https://github.com/modelcontextprotocol/inspector) is a useful tool for testing MCP servers.

### Testing stdio Server

```bash
export SUPABASE_JWT_SECRET="your-token"
npx @modelcontextprotocol/inspector python mcp/mcp_server.py
```

### Testing SSE Server

1. Start the SSE server:
```bash
export SUPABASE_JWT_SECRET="your-token"
python mcp/mcp_sse_server.py
```

2. In MCP Inspector:
   - URL: `http://localhost:8765`
   - Transport: `sse`

## Usage Examples

### Search for Documents
```python
# Semantic search
result = await search_documents(
    collection_id="123",
    query="machine learning algorithms",
    search_type="semantic",
    limit=10
)

# Keyword search with filter
result = await search_documents(
    collection_id="123",
    query="python tutorial",
    search_type="keyword",
    filter_json='{"category": "programming"}'
)
```

### Manage Collections
```python
# Create collection
collection = await create_collection(
    name="Technical Docs",
    description="Technical documentation and guides"
)

# List collections
collections = await list_collections(limit=20)

# Delete collection
await delete_collection(collection_id="123")
```

### Work with Documents
```python
# Add document
doc = await add_documents(
    collection_id="123",
    content="This is my document content...",
    metadata_json='{"author": "John Doe", "category": "tutorial"}'
)

# List documents
docs = await list_documents(collection_id="123", limit=50)

# Delete document
await delete_document(collection_id="123", document_id="456")
```

### AI-Powered Query Expansion
```python
# Generate multiple search queries
queries = await multi_query(
    question="How do I implement authentication in FastAPI?",
    num_queries=5
)
# Returns: ["FastAPI authentication", "FastAPI JWT tokens", ...]
```

## Environment Variables

Required environment variables (set in `.env`):

```env
# API Configuration
API_BASE_URL=http://localhost:8080

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-token  # User's access token

# OpenAI (for multi_query tool)
OPENAI_API_KEY=sk-...

# SSE Server Port (optional)
SSE_PORT=8765
```

## Troubleshooting

### Common Issues

1. **"Authentication failed" error**
   - Ensure your JWT token is valid and not expired
   - Tokens expire after ~1 hour, get a new one using helper scripts

2. **"Connection refused" error**
   - Check if LangConnect API is running on the correct port
   - Verify API_BASE_URL in environment variables

3. **"Tool not found" error**
   - Ensure you're using the correct tool names (case-sensitive)
   - Check that the MCP server started successfully

4. **SSE connection drops**
   - SSE connections may timeout after periods of inactivity
   - Clients should implement reconnection logic

### Debug Mode

Enable debug logging by setting:
```bash
export MCP_DEBUG=true
```

### Token Expiration Handling

When tokens expire:
1. Use `get_access_token.py` to get a new token
2. Update your configuration with the new token
3. Restart the MCP server

Consider implementing a token refresh mechanism for production use.

## Security Notes

- **Never commit tokens** to version control
- Keep `.env` and `mcp_config.json` in `.gitignore`
- Tokens are user-specific and grant access to that user's data
- Use HTTPS in production environments
- Rotate tokens regularly
- Consider implementing token refresh for long-running sessions

## Development

### Adding New Tools

To add a new tool to the MCP servers:

1. Define the tool function with the `@mcp.tool` decorator
2. Add proper type hints and docstring
3. Implement the API call using the `LangConnectClient`
4. Update this README with the new tool documentation

Example:
```python
@mcp.tool
async def my_new_tool(param1: str, param2: int = 10) -> str:
    """Description of what this tool does.
    
    Args:
        param1: Description of param1
        param2: Description of param2 (default: 10)
    
    Returns:
        Description of return value
    """
    result = await client.request("POST", "/endpoint", json={
        "param1": param1,
        "param2": param2
    })
    return format_result(result)
```

### Testing

Run tests with:
```bash
pytest tests/test_mcp_server.py -v
```

## Related Documentation

- [FastMCP Documentation](../docs/FASTMCP_SUMMARY.md)
- [LangConnect API Documentation](http://localhost:8080/docs)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Main Project README](../README.md)