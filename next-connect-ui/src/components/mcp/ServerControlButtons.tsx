'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, RotateCw, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ServerStatus, type MCPServer } from '@/types/mcp';
import { mcpApi } from '@/lib/api/mcp';
import { useToast } from '@/hooks/use-toast';

interface ServerControlButtonsProps {
  server: MCPServer;
  onServerUpdated: (server: MCPServer) => void;
  size?: 'sm' | 'default' | 'lg';
}

export function ServerControlButtons({ 
  server, 
  onServerUpdated,
  size = 'sm' 
}: ServerControlButtonsProps) {
  const t = useTranslations('mcp');
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading('start');
    try {
      const updatedServer = await mcpApi.startServer(server.id);
      onServerUpdated(updatedServer);
      toast({
        title: t('server.startSuccess'),
        description: t('server.startSuccessDescription', { name: server.config.name }),
      });
    } catch (error) {
      toast({
        title: t('server.startError'),
        description: error instanceof Error ? error.message : t('server.startErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleStop = async () => {
    setLoading('stop');
    try {
      const updatedServer = await mcpApi.stopServer(server.id);
      onServerUpdated(updatedServer);
      toast({
        title: t('server.stopSuccess'),
        description: t('server.stopSuccessDescription', { name: server.config.name }),
      });
    } catch (error) {
      toast({
        title: t('server.stopError'),
        description: error instanceof Error ? error.message : t('server.stopErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleRestart = async () => {
    setLoading('restart');
    try {
      const updatedServer = await mcpApi.restartServer(server.id);
      onServerUpdated(updatedServer);
      toast({
        title: t('server.restartSuccess'),
        description: t('server.restartSuccessDescription', { name: server.config.name }),
      });
    } catch (error) {
      toast({
        title: t('server.restartError'),
        description: error instanceof Error ? error.message : t('server.restartErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const isTransitioning = 
    server.status.state === ServerStatus.STARTING ||
    server.status.state === ServerStatus.STOPPING;

  const canStart = 
    server.status.state === ServerStatus.STOPPED ||
    server.status.state === ServerStatus.ERROR;

  const canStop = 
    server.status.state === ServerStatus.RUNNING;

  const canRestart = 
    server.status.state === ServerStatus.RUNNING;

  return (
    <div className="flex items-center gap-1">
      <Button
        size={size}
        variant="ghost"
        onClick={handleStart}
        disabled={!canStart || loading !== null || isTransitioning}
        title={t('server.start')}
      >
        {loading === 'start' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <Button
        size={size}
        variant="ghost"
        onClick={handleStop}
        disabled={!canStop || loading !== null || isTransitioning}
        title={t('server.stop')}
      >
        {loading === 'stop' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </Button>

      <Button
        size={size}
        variant="ghost"
        onClick={handleRestart}
        disabled={!canRestart || loading !== null || isTransitioning}
        title={t('server.restart')}
      >
        {loading === 'restart' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RotateCw className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}