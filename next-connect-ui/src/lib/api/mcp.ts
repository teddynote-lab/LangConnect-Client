import { getSession } from 'next-auth/react';
import type {
  MCPServer,
  CreateServerRequest,
  UpdateServerRequest,
  ServerListResponse,
  ElicitationRequest,
  ElicitationResponse,
} from '@/types/mcp';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

class MCPApiClient {
  private async getHeaders(): Promise<HeadersInit> {
    const session = await getSession();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    return headers;
  }

  async listServers(): Promise<ServerListResponse> {
    const response = await fetch(`${API_BASE_URL}/api/mcp/servers`, {
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch servers: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getServer(serverId: string): Promise<MCPServer> {
    const response = await fetch(`${API_BASE_URL}/api/mcp/servers/${serverId}`, {
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch server: ${response.statusText}`);
    }
    
    return response.json();
  }

  async createServer(data: CreateServerRequest): Promise<MCPServer> {
    const response = await fetch(`${API_BASE_URL}/api/mcp/servers`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create server');
    }
    
    return response.json();
  }

  async updateServer(serverId: string, data: UpdateServerRequest): Promise<MCPServer> {
    const response = await fetch(`${API_BASE_URL}/api/mcp/servers/${serverId}`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update server');
    }
    
    return response.json();
  }

  async deleteServer(serverId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/mcp/servers/${serverId}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete server');
    }
  }

  async startServer(serverId: string): Promise<MCPServer> {
    const response = await fetch(`${API_BASE_URL}/api/mcp/servers/${serverId}/start`, {
      method: 'POST',
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to start server');
    }
    
    return response.json();
  }

  async stopServer(serverId: string): Promise<MCPServer> {
    const response = await fetch(`${API_BASE_URL}/api/mcp/servers/${serverId}/stop`, {
      method: 'POST',
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to stop server');
    }
    
    return response.json();
  }

  async restartServer(serverId: string): Promise<MCPServer> {
    const response = await fetch(`${API_BASE_URL}/api/mcp/servers/${serverId}/restart`, {
      method: 'POST',
      headers: await this.getHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to restart server');
    }
    
    return response.json();
  }

  async elicit(serverId: string, data: ElicitationRequest): Promise<ElicitationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/mcp/servers/${serverId}/elicit`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to send elicitation request');
    }
    
    return response.json();
  }

  streamLogs(serverId: string, onMessage: (log: string) => void, onError?: (error: Error) => void): EventSource {
    const eventSource = new EventSource(`${API_BASE_URL}/api/mcp/servers/${serverId}/logs`);
    
    eventSource.onmessage = (event) => {
      onMessage(event.data);
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      if (onError) {
        onError(new Error('Failed to stream logs'));
      }
      eventSource.close();
    };
    
    return eventSource;
  }
}

export const mcpApi = new MCPApiClient();