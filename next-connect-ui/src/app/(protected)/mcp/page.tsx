'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Square, 
  RotateCw, 
  Plus, 
  Server, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { mcpApi } from '@/lib/api/mcp';
import { ServerStatus, type MCPServer } from '@/types/mcp';
import { ServerControlButtons } from '@/components/mcp/ServerControlButtons';
import { ServerList } from '@/components/mcp/ServerList';
import { CreateServerDialog } from '@/components/mcp/CreateServerDialog';

export default function MCPDashboard() {
  const t = useTranslations('mcp');
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchServers = async () => {
    try {
      setError(null);
      const response = await mcpApi.listServers();
      setServers(response.servers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch servers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServers();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchServers, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchServers();
  };

  const handleServerCreated = (server: MCPServer) => {
    setServers([...servers, server]);
    setCreateDialogOpen(false);
  };

  const handleServerUpdated = (updatedServer: MCPServer) => {
    setServers(servers.map(s => s.id === updatedServer.id ? updatedServer : s));
    if (selectedServer?.id === updatedServer.id) {
      setSelectedServer(updatedServer);
    }
  };

  const handleServerDeleted = (serverId: string) => {
    setServers(servers.filter(s => s.id !== serverId));
    if (selectedServer?.id === serverId) {
      setSelectedServer(null);
    }
  };

  const getStatusIcon = (status: ServerStatus) => {
    switch (status) {
      case ServerStatus.RUNNING:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case ServerStatus.STOPPED:
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case ServerStatus.STARTING:
      case ServerStatus.STOPPING:
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case ServerStatus.ERROR:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: ServerStatus) => {
    switch (status) {
      case ServerStatus.RUNNING:
        return 'success';
      case ServerStatus.STOPPED:
        return 'secondary';
      case ServerStatus.STARTING:
      case ServerStatus.STOPPING:
        return 'default';
      case ServerStatus.ERROR:
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RotateCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {t('dashboard.refresh')}
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('dashboard.createServer')}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Server Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.totalServers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-gray-400" />
              <span className="text-2xl font-bold">{servers.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.runningServers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                {servers.filter(s => s.status.state === ServerStatus.RUNNING).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.stoppedServers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-500" />
              <span className="text-2xl font-bold">
                {servers.filter(s => s.status.state === ServerStatus.STOPPED).length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('dashboard.errorServers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">
                {servers.filter(s => s.status.state === ServerStatus.ERROR).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Server List */}
      <ServerList
        servers={servers}
        selectedServer={selectedServer}
        onServerSelect={setSelectedServer}
        onServerUpdated={handleServerUpdated}
        onServerDeleted={handleServerDeleted}
        getStatusIcon={getStatusIcon}
        getStatusBadgeVariant={getStatusBadgeVariant}
      />

      {/* Create Server Dialog */}
      <CreateServerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onServerCreated={handleServerCreated}
      />
    </div>
  );
}