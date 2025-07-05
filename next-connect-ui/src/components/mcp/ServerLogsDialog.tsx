'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Terminal, 
  Download, 
  Trash2, 
  Pause, 
  Play,
  Copy,
  Check
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type MCPServer } from '@/types/mcp';
import { mcpApi } from '@/lib/api/mcp';
import { useToast } from '@/hooks/use-toast';

interface ServerLogsDialogProps {
  server: MCPServer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export function ServerLogsDialog({
  server,
  open,
  onOpenChange,
}: ServerLogsDialogProps) {
  const t = useTranslations('mcp');
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [streaming, setStreaming] = useState(true);
  const [copied, setCopied] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (open && streaming) {
      startStreaming();
    } else {
      stopStreaming();
    }

    return () => {
      stopStreaming();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, streaming, server.id]);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (shouldAutoScrollRef.current && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs]);

  const startStreaming = useCallback(() => {
    eventSourceRef.current = mcpApi.streamLogs(
      server.id,
      (logData) => {
        try {
          const logEntry = JSON.parse(logData) as LogEntry;
          setLogs(prev => [...prev, logEntry]);
        } catch (error) {
          // Handle plain text logs
          setLogs(prev => [...prev, {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: logData
          }]);
        }
      },
      (error) => {
        toast({
          title: t('logs.streamError'),
          description: error.message,
          variant: 'destructive',
        });
        setStreaming(false);
      }
    );
  }, [server.id, t, toast]);

  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const toggleStreaming = () => {
    setStreaming(!streaming);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const downloadLogs = () => {
    const logText = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${server.config.name}-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyLogs = async () => {
    const logText = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    try {
      await navigator.clipboard.writeText(logText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: t('logs.copyError'),
        description: t('logs.copyErrorDescription'),
        variant: 'destructive',
      });
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'text-red-500';
      case 'warn':
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      case 'debug':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
    shouldAutoScrollRef.current = isAtBottom;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            {t('logs.title', { name: server.config.name })}
          </DialogTitle>
          <DialogDescription>
            {streaming ? t('logs.streamingDescription') : t('logs.pausedDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-2">
            <Badge variant={streaming ? 'default' : 'secondary'}>
              {streaming ? t('logs.live') : t('logs.paused')}
            </Badge>
            <span className="text-sm text-gray-500">
              {t('logs.count', { count: logs.length })}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={toggleStreaming}
            >
              {streaming ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  {t('logs.pause')}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {t('logs.resume')}
                </>
              )}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={copyLogs}
              disabled={logs.length === 0}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('logs.copied')}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('logs.copy')}
                </>
              )}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={downloadLogs}
              disabled={logs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('logs.download')}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('logs.clear')}
            </Button>
          </div>
        </div>

        <ScrollArea 
          ref={scrollAreaRef}
          className="flex-1 p-4 bg-gray-900 rounded-md"
          onScroll={handleScroll}
        >
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {t('logs.noLogs')}
            </div>
          ) : (
            <div className="space-y-1 font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-2 hover:bg-gray-800 px-2 py-1 rounded">
                  <span className="text-gray-500 text-xs whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className={`uppercase text-xs font-bold ${getLogLevelColor(log.level)}`}>
                    [{log.level}]
                  </span>
                  <span className="text-gray-200 break-all flex-1">
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}