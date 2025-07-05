# MCP Server Docker Image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy MCP server files
COPY mcp_sse_server.py .
COPY mcp_server.py .
COPY __init__.py .
COPY get_access_token.py .
COPY create_mcp_json.py .

# Create directory for middleware if needed
RUN mkdir -p middleware

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV MCP_TRANSPORT=sse
ENV MCP_PORT=8765

# Expose default MCP SSE port
EXPOSE 8765

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:${MCP_PORT:-8765}/health')" || exit 1

# Default command runs SSE server
CMD ["python", "mcp_sse_server.py"]