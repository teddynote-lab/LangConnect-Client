'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, X, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ServerTransport, type MCPServerConfig } from '@/types/mcp';
import { mcpApi } from '@/lib/api/mcp';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  description: z.string().optional(),
  transport: z.nativeEnum(ServerTransport),
  image: z.string().optional(),
  command: z.string().min(1, 'Command is required'),
  args: z.array(z.string()).optional(),
  port: z.number().min(1024).max(65535).optional(),
  auth_required: z.boolean(),
  elicitation: z.boolean(),
  env: z.record(z.string()).optional(),
  resources: z.object({
    cpu_limit: z.string().optional(),
    memory_limit: z.string().optional(),
  }).optional(),
  middleware: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServerCreated: (server: any) => void;
}

export function CreateServerDialog({
  open,
  onOpenChange,
  onServerCreated,
}: CreateServerDialogProps) {
  const t = useTranslations('mcp');
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [envKey, setEnvKey] = useState('');
  const [envValue, setEnvValue] = useState('');
  const [argValue, setArgValue] = useState('');
  const [middlewareValue, setMiddlewareValue] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      transport: ServerTransport.SSE,
      image: 'langconnect-mcp:latest',
      command: 'python -m mcp.mcp_langconnect_sse_server',
      args: [],
      auth_required: true,
      elicitation: false,
      env: {},
      resources: {
        cpu_limit: '',
        memory_limit: '',
      },
      middleware: [],
    },
  });

  const onSubmit = async (data: FormData) => {
    setCreating(true);
    try {
      // Clean up empty values
      const config: MCPServerConfig = {
        name: data.name,
        description: data.description || undefined,
        transport: data.transport,
        image: data.image || undefined,
        command: data.command,
        args: data.args && data.args.length > 0 ? data.args : undefined,
        port: data.port || undefined,
        auth_required: data.auth_required,
        elicitation: data.elicitation,
        env: data.env && Object.keys(data.env).length > 0 ? data.env : undefined,
        resources: data.resources?.cpu_limit || data.resources?.memory_limit ? {
          cpu_limit: data.resources.cpu_limit || undefined,
          memory_limit: data.resources.memory_limit || undefined,
        } : undefined,
        middleware: data.middleware && data.middleware.length > 0 ? data.middleware : undefined,
      };

      const server = await mcpApi.createServer({ config });
      onServerCreated(server);
      toast({
        title: t('server.createSuccess'),
        description: t('server.createSuccessDescription', { name: server.config.name }),
      });
      form.reset();
    } catch (error) {
      toast({
        title: t('server.createError'),
        description: error instanceof Error ? error.message : t('server.createErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const addEnvVariable = () => {
    if (envKey && envValue) {
      const currentEnv = form.getValues('env') || {};
      form.setValue('env', { ...currentEnv, [envKey]: envValue });
      setEnvKey('');
      setEnvValue('');
    }
  };

  const removeEnvVariable = (key: string) => {
    const currentEnv = form.getValues('env') || {};
    const { [key]: _, ...rest } = currentEnv;
    form.setValue('env', rest);
  };

  const addArg = () => {
    if (argValue) {
      const currentArgs = form.getValues('args') || [];
      form.setValue('args', [...currentArgs, argValue]);
      setArgValue('');
    }
  };

  const removeArg = (index: number) => {
    const currentArgs = form.getValues('args') || [];
    form.setValue('args', currentArgs.filter((_, i) => i !== index));
  };

  const addMiddleware = () => {
    if (middlewareValue) {
      const currentMiddleware = form.getValues('middleware') || [];
      form.setValue('middleware', [...currentMiddleware, middlewareValue]);
      setMiddlewareValue('');
    }
  };

  const removeMiddleware = (index: number) => {
    const currentMiddleware = form.getValues('middleware') || [];
    form.setValue('middleware', currentMiddleware.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('server.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('server.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">{t('server.basicTab')}</TabsTrigger>
                <TabsTrigger value="runtime">{t('server.runtimeTab')}</TabsTrigger>
                <TabsTrigger value="environment">{t('server.environmentTab')}</TabsTrigger>
                <TabsTrigger value="advanced">{t('server.advancedTab')}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('server.name')}</FormLabel>
                      <FormControl>
                        <Input placeholder="my-mcp-server" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('server.nameDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('server.description')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t('server.descriptionPlaceholder')}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('server.transport')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ServerTransport.SSE}>
                            SSE (Server-Sent Events)
                          </SelectItem>
                          <SelectItem value={ServerTransport.STDIO}>
                            STDIO (Standard I/O)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {t('server.transportDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('server.port')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="8765"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        {t('server.portDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="runtime" className="space-y-4">
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('server.dockerImage')}</FormLabel>
                      <FormControl>
                        <Input placeholder="langconnect-mcp:latest" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('server.dockerImageDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="command"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('server.command')}</FormLabel>
                      <FormControl>
                        <Input placeholder="python -m mcp.server" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('server.commandDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>{t('server.arguments')}</FormLabel>
                  <div className="space-y-2 mt-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder={t('server.argumentPlaceholder')}
                        value={argValue}
                        onChange={(e) => setArgValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArg())}
                      />
                      <Button type="button" onClick={addArg} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.watch('args')?.map((arg, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex-1">
                          {arg}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArg(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="environment" className="space-y-4">
                <div>
                  <FormLabel>{t('server.environmentVariables')}</FormLabel>
                  <div className="space-y-2 mt-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="KEY"
                        value={envKey}
                        onChange={(e) => setEnvKey(e.target.value)}
                      />
                      <Input
                        placeholder="VALUE"
                        value={envValue}
                        onChange={(e) => setEnvValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEnvVariable())}
                      />
                      <Button type="button" onClick={addEnvVariable} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {Object.entries(form.watch('env') || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex-1">
                          {key}={value}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEnvVariable(key)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="resources.cpu_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('server.cpuLimit')}</FormLabel>
                      <FormControl>
                        <Input placeholder="0.5" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('server.cpuLimitDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="resources.memory_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('server.memoryLimit')}</FormLabel>
                      <FormControl>
                        <Input placeholder="512m" {...field} />
                      </FormControl>
                      <FormDescription>
                        {t('server.memoryLimitDescription')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <FormField
                  control={form.control}
                  name="auth_required"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>{t('server.authRequired')}</FormLabel>
                        <FormDescription>
                          {t('server.authRequiredDescription')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="elicitation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>{t('server.elicitation')}</FormLabel>
                        <FormDescription>
                          {t('server.elicitationDescription')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>{t('server.middleware')}</FormLabel>
                  <div className="space-y-2 mt-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder={t('server.middlewarePlaceholder')}
                        value={middlewareValue}
                        onChange={(e) => setMiddlewareValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMiddleware())}
                      />
                      <Button type="button" onClick={addMiddleware} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.watch('middleware')?.map((mw, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="secondary" className="flex-1">
                          {mw}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMiddleware(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <FormDescription className="mt-2">
                    {t('server.middlewareDescription')}
                  </FormDescription>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={creating}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? t('common.creating') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}