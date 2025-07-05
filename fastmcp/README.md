# FastMCP Stub Package

## Overview

This directory contains a **stub/mock implementation** of the FastMCP library used for testing purposes in the LangConnect Client project. This is NOT the actual FastMCP library but rather a minimal implementation that provides the same API interface for testing scenarios.

## Purpose

- **Testing Support**: Allows running tests without requiring the full FastMCP dependency
- **API Compatibility**: Maintains the same interface as the real FastMCP library
- **Development Isolation**: Enables development and testing in environments where FastMCP might not be available

## Directory Structure

```
fastmcp/
├── __init__.py          # Package initialization, exports FastMCP class
├── server/              # Server module directory
│   ├── __init__.py      # Server subpackage initialization
│   └── server.py        # Contains the stub FastMCP class implementation
└── README.md            # This file
```

## Implementation Details

### FastMCP Class (fastmcp/server/server.py)

The stub implementation provides a minimal FastMCP class with the following methods:

```python
class FastMCP:
    def __init__(self, name=None):
        """Initialize FastMCP instance with optional name"""
        self.name = name

    def tool(self, func=None, **kwargs):
        """Decorator for registering tools - returns function unchanged"""
        if func is None:
            def decorator(f):
                return f
            return decorator
        return func

    def run(self):
        """Run method - empty implementation for compatibility"""
        pass
```

### Key Features

1. **Constructor**: Accepts an optional `name` parameter
2. **Tool Decorator**: Provides a `@tool` decorator that can be used with or without parentheses
3. **Run Method**: Empty implementation to maintain API compatibility

## Usage in Project

The actual LangConnect Client project uses the real FastMCP library (version >=0.1.0) as specified in `pyproject.toml`. This stub is used when:

1. Running unit tests that don't require full FastMCP functionality
2. Developing in isolation without external dependencies
3. Testing import statements and basic API compatibility

### Example Usage in Project

From `mcp/mcp_sse_server.py`:
```python
from fastmcp import FastMCP

# Create FastMCP server
mcp = FastMCP(name="LangConnect")

# Use tool decorator
@mcp.tool
def some_tool_function():
    pass

# Run the server
mcp.run()
```

## Important Notes

⚠️ **This is a stub implementation for testing only**
- The real FastMCP library provides full MCP (Model Context Protocol) server functionality
- For production use, install the actual FastMCP package: `pip install fastmcp>=0.1.0`
- This stub should maintain API compatibility with the real FastMCP library

## Relationship to MCP Servers

The project includes several MCP server implementations that use FastMCP:
- `mcp/mcp_sse_server.py` - SSE-based MCP server using FastMCP
- `mcp/mcp_server.py` - Standard MCP server implementation

These servers import from the real `fastmcp` package in production but can use this stub for testing.

## Development Guidelines

When modifying this stub:
1. Ensure API compatibility with the real FastMCP library
2. Keep the implementation minimal - only add what's needed for tests
3. Document any new methods or parameters added
4. Update this README if the structure changes

## References

- Real FastMCP documentation: Check `docs/fastmcp.txt` for complete library documentation
- Project MCP implementation: See `mcp/` directory for actual usage
- Dependencies: Listed in `pyproject.toml`