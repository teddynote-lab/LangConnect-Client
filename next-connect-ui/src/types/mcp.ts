// MCP Server Types
export enum ServerStatus {
  STOPPED = "stopped",
  STARTING = "starting",
  RUNNING = "running",
  STOPPING = "stopping",
  ERROR = "error",
}

export enum ServerTransport {
  STDIO = "stdio",
  SSE = "sse",
}

export interface MCPServerConfig {
  name: string;
  description?: string;
  transport: ServerTransport;
  image?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  port?: number;
  resources?: {
    cpu_limit?: string;
    memory_limit?: string;
  };
  middleware?: string[];
  elicitation?: boolean;
  auth_required?: boolean;
  metadata?: Record<string, any>;
}

export interface MCPServerStatus {
  state: ServerStatus;
  message?: string;
  container_id?: string;
  health?: {
    status: string;
    last_check: string;
    details?: Record<string, any>;
  };
  metrics?: {
    cpu_usage?: number;
    memory_usage?: number;
    network_io?: Record<string, number>;
  };
  started_at?: string;
  stopped_at?: string;
}

export interface MCPServer {
  id: string;
  config: MCPServerConfig;
  status: MCPServerStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  container_name?: string;
  access_token?: string;
  api_url?: string;
}

// Request/Response types
export interface CreateServerRequest {
  config: MCPServerConfig;
}

export interface UpdateServerRequest {
  config?: Partial<MCPServerConfig>;
}

export interface ServerListResponse {
  servers: MCPServer[];
  total: number;
}

export interface ServerLogEntry {
  timestamp: string;
  level: string;
  message: string;
  container_id?: string;
}

export interface ElicitationRequest {
  prompt: string;
  context?: Record<string, any>;
}

export interface ElicitationResponse {
  response: string;
  tool_calls?: any[];
  metadata?: Record<string, any>;
}