# GEMINI.md

This file provides guidance to Gemini when working with code in this repository. It is adapted from `CLAUDE.md` to align with Gemini's capabilities and workflow.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Commands](#development-commands)
3. [Architecture Overview](#architecture-overview)
4. [Environment Variables](#environment-variables)
5. [Development Workflow](#development-workflow)
6. [Code Style Guidelines](#code-style-guidelines)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)
9. [Memory Bank System](#memory-bank-system)
10. [Codebase Analysis](#codebase-analysis)
11. [Development Methodology & Processes](#development-methodology--processes)
12. [Performance Optimization](#performance-optimization)
13. [Additional Resources](#additional-resources)

## Quick Start

To get the project running quickly, I will follow these essential steps:

```bash
# 1. Clone and setup (if not already done)
# git clone https://github.com/teddynote-lab/langconnect-client.git
# cd langconnect-client
# cp .env.example .env

# 2. I will ask the user to configure environment variables in the .env file.
# Required: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_KEY, NEXTAUTH_SECRET

# 3. Build and run using Makefile commands
make build
make up

# 4. Access services
# Frontend: http://localhost:3000
# API Docs: http://localhost:8080/docs

# 5. MCP Setup (optional)
make mcp
```

## Development Commands

I will use the following `make` commands for project management and code quality tasks.

### Project Management

```bash
# Start services
make up-dev          # Development mode with logs
docker compose up -d # Background execution

# Stop services
make down

# Clean and reset (WARNING: removes all data)
make clean
make build
```

### Code Quality

```bash
# Python formatting and linting (using ruff)
make format          # Auto-fix issues
make lint           # Check only
make unsafe_fixes   # Apply unsafe fixes

# Run tests
make test           # All tests
make test TEST_FILE=tests/unit_tests/test_specific.py  # Specific test

# View available commands
make help
```

### Development Operations

```bash
# Service management
make restart        # Restart all services
make logs          # View logs

# Frontend development
# cd next-connect-ui
# pnpm install       # Install dependencies (first time)
# pnpm dev          # Run dev server (port 3893)
# pnpm build        # Production build
# pnpm lint         # Run ESLint
```

### MCP Server Management

```bash
# UI Control available at http://localhost:3000/mcp

# Manual control via shell commands
docker compose --profile mcp up -d mcp  # Start MCP server
docker compose stop mcp                 # Stop MCP server
docker logs -f langconnect-mcp         # View logs
```

## Architecture Overview

I will use this architectural information to understand the project structure and data flows.

### Service Structure

- **Frontend (Port 3000)**: Next.js 15 App Router, React 19, TypeScript
- **Backend API (Port 8080)**: FastAPI + LangChain, Python 3.11+
- **Database**: PostgreSQL with pgvector extension
- **MCP Server (Port 8765)**: FastMCP SSE server (optional)
- **Authentication**: Supabase integration

### Core Module Structure

#### Backend (`/langconnect/`)
```
├── server.py          # FastAPI application entry point
├── api/              # REST endpoints
├── database/         # DB connection and queries
├── models/          # Pydantic data models
└── services/        # Business logic (processing, embeddings)
```

#### Frontend (`/next-connect-ui/src/`)
```
├── app/              # Next.js App Router pages
├── components/      # Reusable React components
├── providers/      # Context providers
├── hooks/          # Custom React hooks
└── translations/   # i18n support (Korean/English)
```

#### MCP Integration (`/mcp/`)
- Provides 9 document management tools
- stdio and SSE-based servers
- UI-controllable (start/stop/restart, real-time logs)

### Key Feature Flows

I will keep these flows in mind when implementing related features.

#### 1. Document Upload & Processing
`File Upload → LangChain Document Loaders → Text Extraction → RecursiveCharacterTextSplitter → OpenAI Embeddings → Store in PGVector`

#### 2. Search System
- **Semantic Search**: Vector similarity based
- **Keyword Search**: PostgreSQL full-text search
- **Hybrid Search**: Combination of both methods

#### 3. Authentication Flow
- Supabase Auth, JWT tokens, NextAuth.js, and FastAPI middleware.

## Environment Variables

I will rely on the user to set up the `.env` file correctly based on `.env.example`. I will remind the user if required variables seem to be missing.

Key variables:
- `OPENAI_API_KEY`
- `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_JWT_SECRET`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_API_URL`
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `SSE_PORT`

## Development Workflow

I will follow this general workflow for development tasks.

### Initial Setup
1. Confirm the repository is cloned and I am in the `langconnect-client` directory.
2. Confirm with the user that `.env` is configured.
3. Use `make build` and `make up` to start the environment.

### Backend Development
1. After making changes, I will use `docker compose restart api` to apply them.
2. I will use `docker logs -f langconnect-api` to debug.
3. If Python dependencies are added, I will inform the user that `make build` is necessary after updating `pyproject.toml`.

### Frontend Development
1. For frontend tasks, I can work within the `next-connect-ui` directory.
2. I will use `pnpm dev` for the development server and `pnpm build` for production builds.

## Code Style Guidelines

I will strictly adhere to the following code style guidelines.

### Python (Backend)
- **Formatter**: `ruff`. I will use `make format` to apply formatting.
- **Style**: Google Python Style Guide.
- **Type hints**: I will add type hints for all functions.
- **Docstrings**: I will use Google style for docstrings.

### TypeScript/React (Frontend)
- **Formatter**: Prettier.
- **Linter**: ESLint with Next.js config.
- **Components**: I will use functional components.
- **Styling**: I will use Tailwind CSS.

### Commit Messages
I will follow the conventional commit format: `<type>(<scope>): <subject>`.

## Testing Guide

I will use the following commands to run tests and verify my changes.

### Backend Testing
```bash
# Run all tests
make test

# Run a specific test file
make test TEST_FILE=tests/unit_tests/test_collections_api.py

# Run a specific test function using pytest
pytest tests/unit_tests/test_collections_api.py::test_create_collection

# Check test coverage
pytest --cov=langconnect tests/
```

### API Endpoint Testing
I can use `curl` or similar tools to test API endpoints directly if needed.

## Troubleshooting

If I encounter issues, I will refer to these common problems and solutions.

- **Docker Container Failure**: I will suggest `make clean`, `make build`, `make up`.
- **PostgreSQL Issues**: I will check logs with `docker logs langconnect-postgres`.
- **Frontend Errors**: I will suggest reinstalling dependencies in `next-connect-ui`.
- **MCP Auth Errors**: I will suggest regenerating the token with `make mcp` or `uv run python mcp/get_access_token.py`.

## Memory Bank System

I will use the Memory Bank system in the `memory-bank/` directory to maintain context and track progress for long-term tasks.

- **`σ₁: projectbrief.md`**: Understand project goals.
- **`σ₂: systemPatterns.md`**: Adhere to architecture and coding patterns.
- **`σ₃: techContext.md`**: Refer to for tech stack details.
- **`σ₄: activeContext.md`**: Use to track the current task, goals, and relevant files.
- **`σ₅: progress.md`**: Log completed work, issues, and insights.
- **`σ₆: protection.md`**: Note and respect areas of the code that should not be modified.

I will update these files, especially `activeContext.md` and `progress.md`, to ensure continuity and accurate state tracking.

## Codebase Analysis

To understand the project, I will use my available tools to analyze the codebase.

### Analysis Strategy
- For **single file analysis**, I will use `read_file`.
  - Example: To understand the FastAPI entry point, I will `read_file('langconnect/server.py')`.
- For **directory-wide analysis**, I will use `glob` to find relevant files and `read_many_files` to read their content.
  - Example: To summarize the backend architecture, I will use `read_many_files(paths=['langconnect/'])`.
- For **cross-module analysis**, I will read files from multiple directories to understand their interactions.
  - Example: To check authentication implementation, I will read files from both `langconnect/` and `next-connect-ui/src/`.

### Special Note: `docs/` Directory
**IMPORTANT**: The `.txt` files in the `docs/` directory contain extensive library documentation and are very large. I must not read them whole. Instead, if information from them is needed, I will inform the user about the large file size and ask for specific questions that I can try to answer by searching within the file content if possible, or rely on my existing knowledge.

## Development Methodology & Processes

I will follow the systematic development methodologies defined in the `rules/` folder. Before starting work, I will read the relevant files to ensure I am following the established processes.

- **`rules/RIPER-SIGMA.mdc`**: I will follow the five-phase development workflow (Research, Innovate, Plan, Execute, Review).
- **`rules/CodeProtection.mdc`**: I will check and respect the protection levels of code (`@PROTECTED`, `@CRITICAL`, etc.) before making modifications.
- **`rules/bmad_roles.mdc`**: I will operate according to the permissions and responsibilities of my role (Developer/Analyst).
- **`rules/prd_system.mdc`**: I will reference this for structuring new feature development.
- **`rules/quality_gates.mdc`**: I will ensure my work meets the quality standards defined in the five-stage process.

I will not execute abstract commands like `@riper-mode` but will adhere to the principles outlined in these documents.

## Performance Optimization

I will keep these optimization strategies in mind when working on relevant parts of the application.

- **Vector Search**: Consider index creation (`ivfflat`), chunk size, and batch processing.
- **Frontend**: Utilize Next.js Image component, dynamic imports, and optimized caching.

## Additional Resources

- **Project Repository**: <https://github.com/teddynote-lab/langconnect-client>
- **Original Project**: <https://github.com/langchain-ai/langconnect>
- **MCP Documentation**: <https://modelcontextprotocol.io>
- **Community**: Vibe Coding KR Facebook Group
