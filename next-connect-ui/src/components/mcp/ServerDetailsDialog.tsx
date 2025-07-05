'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { type MCPServer } from '@/types/mcp';
import { 
  Server, 
  Clock, 
  Activity, 
  Settings, 
  Key,
  Network,
  Cpu,
  MemoryStick,
  HardDrive
} from 'lucide-react';

interface ServerDetailsDialogProps {
  server: MCPServer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServerDetailsDialog({
  server,
  open,
  onOpenChange,
}: ServerDetailsDialogProps) {
  const t = useTranslations('mcp');

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{server.config.name}</DialogTitle>
          <DialogDescription>
            {server.config.description || t('server.noDescription')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{t('server.overview')}</TabsTrigger>
            <TabsTrigger value="configuration">{t('server.configuration')}</TabsTrigger>
            <TabsTrigger value="status">{t('server.status')}</TabsTrigger>
            <TabsTrigger value="metrics">{t('server.metrics')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    {t('server.basicInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.id')}:</span>
                    <span className="font-mono">{server.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.transport')}:</span>
                    <Badge variant="outline">{server.config.transport.toUpperCase()}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.port')}:</span>
                    <span>{server.config.port || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.authRequired')}:</span>
                    <span>{server.config.auth_required ? t('common.yes') : t('common.no')}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('server.timestamps')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.createdAt')}:</span>
                    <span>{formatDate(server.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.updatedAt')}:</span>
                    <span>{formatDate(server.updated_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.startedAt')}:</span>
                    <span>{formatDate(server.status.started_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.createdBy')}:</span>
                    <span className="font-mono text-xs">{server.created_by}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {server.container_name && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    {t('server.containerInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.containerName')}:</span>
                    <span className="font-mono">{server.container_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.containerId')}:</span>
                    <span className="font-mono text-xs">{server.status.container_id || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.apiUrl')}:</span>
                    <span className="font-mono text-xs">{server.api_url || '-'}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="configuration" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('server.command')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                  {server.config.command}
                  {server.config.args && ` ${server.config.args.join(' ')}`}
                </pre>
              </CardContent>
            </Card>

            {server.config.env && Object.keys(server.config.env).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    {t('server.environmentVariables')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    {Object.entries(server.config.env).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-mono text-gray-600">{key}:</span>
                        <span className="font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {server.config.resources && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    {t('server.resourceLimits')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.cpuLimit')}:</span>
                    <span>{server.config.resources.cpu_limit || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.memoryLimit')}:</span>
                    <span>{server.config.resources.memory_limit || '-'}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {server.config.middleware && server.config.middleware.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    {t('server.middleware')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {server.config.middleware.map((mw, index) => (
                      <Badge key={index} variant="secondary">{mw}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="status" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  {t('server.currentStatus')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('server.state')}:</span>
                  <Badge>{server.status.state}</Badge>
                </div>
                {server.status.message && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.message')}:</span>
                    <span>{server.status.message}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {server.status.health && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    {t('server.health')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.healthStatus')}:</span>
                    <Badge 
                      variant={server.status.health.status === 'healthy' ? 'default' : 'destructive'}
                    >
                      {server.status.health.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('server.lastCheck')}:</span>
                    <span>{formatDate(server.status.health.last_check)}</span>
                  </div>
                  {server.status.health.details && (
                    <pre className="bg-gray-100 p-2 rounded text-xs mt-2">
                      {JSON.stringify(server.status.health.details, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4 mt-4">
            {server.status.metrics ? (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      {t('server.cpuUsage')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {server.status.metrics.cpu_usage?.toFixed(2) || 0}%
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MemoryStick className="h-4 w-4" />
                      {t('server.memoryUsage')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatBytes(server.status.metrics.memory_usage)}
                    </div>
                  </CardContent>
                </Card>

                {server.status.metrics.network_io && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Network className="h-4 w-4" />
                        {t('server.networkIO')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('server.bytesReceived')}:</span>
                        <span>{formatBytes(server.status.metrics.network_io.rx_bytes)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('server.bytesSent')}:</span>
                        <span>{formatBytes(server.status.metrics.network_io.tx_bytes)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">{t('server.noMetricsAvailable')}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}