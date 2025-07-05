'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash, 
  Terminal,
  Settings,
  MessageSquare
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ServerStatus, type MCPServer } from '@/types/mcp';
import { ServerControlButtons } from './ServerControlButtons';
import { ServerDetailsDialog } from './ServerDetailsDialog';
import { ServerLogsDialog } from './ServerLogsDialog';
import { ElicitationDialog } from './ElicitationDialog';
import { mcpApi } from '@/lib/api/mcp';
import { useToast } from '@/hooks/use-toast';

interface ServerListProps {
  servers: MCPServer[];
  selectedServer: MCPServer | null;
  onServerSelect: (server: MCPServer | null) => void;
  onServerUpdated: (server: MCPServer) => void;
  onServerDeleted: (serverId: string) => void;
  getStatusIcon: (status: ServerStatus) => React.ReactNode;
  getStatusBadgeVariant: (status: ServerStatus) => any;
}

export function ServerList({
  servers,
  selectedServer,
  onServerSelect,
  onServerUpdated,
  onServerDeleted,
  getStatusIcon,
  getStatusBadgeVariant,
}: ServerListProps) {
  const t = useTranslations('mcp');
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<MCPServer | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [elicitationDialogOpen, setElicitationDialogOpen] = useState(false);
  const [selectedServerForDialog, setSelectedServerForDialog] = useState<MCPServer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!serverToDelete) return;

    setDeleting(true);
    try {
      await mcpApi.deleteServer(serverToDelete.id);
      onServerDeleted(serverToDelete.id);
      toast({
        title: t('server.deleteSuccess'),
        description: t('server.deleteSuccessDescription', { name: serverToDelete.config.name }),
      });
    } catch (error) {
      toast({
        title: t('server.deleteError'),
        description: error instanceof Error ? error.message : t('server.deleteErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setServerToDelete(null);
    }
  };

  const openDetailsDialog = (server: MCPServer) => {
    setSelectedServerForDialog(server);
    setDetailsDialogOpen(true);
  };

  const openLogsDialog = (server: MCPServer) => {
    setSelectedServerForDialog(server);
    setLogsDialogOpen(true);
  };

  const openElicitationDialog = (server: MCPServer) => {
    setSelectedServerForDialog(server);
    setElicitationDialogOpen(true);
  };

  if (servers.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-gray-500">{t('dashboard.noServers')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.serverList')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('server.name')}</TableHead>
                <TableHead>{t('server.transport')}</TableHead>
                <TableHead>{t('server.status')}</TableHead>
                <TableHead>{t('server.port')}</TableHead>
                <TableHead>{t('server.controls')}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow
                  key={server.id}
                  className={`cursor-pointer ${selectedServer?.id === server.id ? 'bg-gray-50' : ''}`}
                  onClick={() => onServerSelect(server)}
                >
                  <TableCell className="font-medium">
                    <div>
                      <div>{server.config.name}</div>
                      {server.config.description && (
                        <div className="text-sm text-gray-500">{server.config.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{server.config.transport.toUpperCase()}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(server.status.state)}
                      <Badge variant={getStatusBadgeVariant(server.status.state)}>
                        {server.status.state}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {server.config.port || '-'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <ServerControlButtons
                      server={server}
                      onServerUpdated={onServerUpdated}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetailsDialog(server)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('server.viewDetails')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openLogsDialog(server)}>
                          <Terminal className="h-4 w-4 mr-2" />
                          {t('server.viewLogs')}
                        </DropdownMenuItem>
                        {server.config.elicitation && (
                          <DropdownMenuItem onClick={() => openElicitationDialog(server)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {t('server.elicitation')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setServerToDelete(server);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          {t('server.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('server.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('server.deleteConfirmDescription', { name: serverToDelete?.config.name || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t('common.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Server Details Dialog */}
      {selectedServerForDialog && (
        <ServerDetailsDialog
          server={selectedServerForDialog}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
        />
      )}

      {/* Server Logs Dialog */}
      {selectedServerForDialog && (
        <ServerLogsDialog
          server={selectedServerForDialog}
          open={logsDialogOpen}
          onOpenChange={setLogsDialogOpen}
        />
      )}

      {/* Elicitation Dialog */}
      {selectedServerForDialog && (
        <ElicitationDialog
          server={selectedServerForDialog}
          open={elicitationDialogOpen}
          onOpenChange={setElicitationDialogOpen}
        />
      )}
    </>
  );
}