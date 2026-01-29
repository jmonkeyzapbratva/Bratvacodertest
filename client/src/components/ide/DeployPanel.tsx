import { useState } from "react";
import { Rocket, Download, RefreshCw, Check, Clock, AlertCircle, ExternalLink, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";

interface DeployConfig {
  projectId?: number;
  name?: string;
  type: string | null;
  entryPoint?: string;
  buildCommand?: string;
  startCommand?: string;
}

interface DeploymentStatus {
  id: string;
  projectId: number;
  status: "pending" | "building" | "deploying" | "live" | "failed";
  url?: string;
  createdAt: string;
  error?: string;
}

interface DeployPanelProps {
  projectId?: number;
}

const projectTypes = [
  { value: "nodejs", label: "Node.js" },
  { value: "python", label: "Python" },
  { value: "static", label: "Site Estatico" },
  { value: "docker", label: "Docker" },
];

const statusConfig = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "Aguardando" },
  building: { icon: RefreshCw, color: "text-blue-500", label: "Construindo" },
  deploying: { icon: Rocket, color: "text-amber-500", label: "Publicando" },
  live: { icon: Check, color: "text-green-500", label: "Online" },
  failed: { icon: AlertCircle, color: "text-destructive", label: "Falhou" },
};

export function DeployPanel({ projectId }: DeployPanelProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editConfig, setEditConfig] = useState<Partial<DeployConfig>>({});

  const { data: config, isLoading: configLoading, refetch: refetchConfig } = useQuery<DeployConfig>({
    queryKey: ["/api/projects", projectId, "deploy/config"],
    enabled: !!projectId,
  });

  const { data: deployments = [], refetch: refetchDeployments } = useQuery<DeploymentStatus[]>({
    queryKey: ["/api/projects", projectId, "deploy/history"],
    enabled: !!projectId,
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<DeployConfig>) => {
      return apiRequest("POST", `/api/projects/${projectId}/deploy/config`, newConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "deploy/config"] });
      setIsEditing(false);
      toast({
        title: "Configuracao atualizada",
        description: "Configuracao de deploy salva com sucesso.",
      });
    },
  });

  const deployMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/projects/${projectId}/deploy`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "deploy/history"] });
      toast({
        title: "Deploy iniciado",
        description: "Seu projeto esta sendo publicado...",
      });
      pollDeployStatus(data.id);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao iniciar deploy",
        variant: "destructive",
      });
    },
  });

  const pollDeployStatus = async (deployId: string) => {
    const maxAttempts = 30;
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/deploy/${deployId}/status`);
        const status: DeploymentStatus = await response.json();
        
        if (status.status === "live") {
          refetchDeployments();
          toast({
            title: "Deploy concluido!",
            description: `Seu projeto esta online em ${status.url}`,
          });
          return;
        }
        
        if (status.status === "failed") {
          refetchDeployments();
          toast({
            title: "Deploy falhou",
            description: status.error || "Erro durante o deploy",
            variant: "destructive",
          });
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        }
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        }
      }
    };
    
    poll();
  };

  const handleDownloadPackage = () => {
    if (projectId) {
      window.open(`/api/projects/${projectId}/deploy/package`, "_blank");
    }
  };

  const startEdit = () => {
    setEditConfig({
      name: config?.name,
      type: config?.type,
      entryPoint: config?.entryPoint,
      buildCommand: config?.buildCommand,
      startCommand: config?.startCommand,
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    updateConfigMutation.mutate(editConfig);
  };

  if (!projectId) {
    return (
      <div className="h-full flex flex-col bg-sidebar items-center justify-center p-4">
        <Rocket className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          Selecione um projeto para gerenciar o deploy.
        </p>
      </div>
    );
  }

  const latestDeploy = deployments[0];

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Deploy</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { refetchConfig(); refetchDeployments(); }}
            disabled={configLoading}
            data-testid="button-refresh-deploy"
          >
            <RefreshCw className={cn("h-4 w-4", configLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {latestDeploy?.status === "live" && latestDeploy.url && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      Online
                    </span>
                  </div>
                  <a 
                    href={latestDeploy.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {latestDeploy.url.replace("https://", "")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-2 px-3 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-sm">Configuracao</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={isEditing ? saveEdit : startEdit}
                disabled={updateConfigMutation.isPending}
              >
                {isEditing ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Settings className="h-3.5 w-3.5" />
                )}
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              {isEditing ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Nome</label>
                    <Input
                      value={editConfig.name || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, name: e.target.value })}
                      className="text-sm"
                      data-testid="input-deploy-name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Tipo</label>
                    <Select 
                      value={editConfig.type || undefined} 
                      onValueChange={(v) => setEditConfig({ ...editConfig, type: v })}
                    >
                      <SelectTrigger className="text-sm" data-testid="select-deploy-type">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectTypes.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Comando de Build</label>
                    <Input
                      value={editConfig.buildCommand || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, buildCommand: e.target.value })}
                      className="text-sm font-mono"
                      placeholder="npm run build"
                      data-testid="input-build-command"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Comando de Start</label>
                    <Input
                      value={editConfig.startCommand || ""}
                      onChange={(e) => setEditConfig({ ...editConfig, startCommand: e.target.value })}
                      className="text-sm font-mono"
                      placeholder="npm start"
                      data-testid="input-start-command"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(false)}
                    className="w-full"
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <Badge variant="outline">{config?.type || "Nao configurado"}</Badge>
                  </div>
                  {config?.entryPoint && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entrada:</span>
                      <span className="font-mono text-xs">{config.entryPoint}</span>
                    </div>
                  )}
                  {config?.buildCommand && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Build:</span>
                      <span className="font-mono text-xs">{config.buildCommand}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => deployMutation.mutate()}
              disabled={deployMutation.isPending || !config?.type}
              data-testid="button-deploy"
            >
              {deployMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4 mr-2" />
              )}
              Publicar
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDownloadPackage}
              disabled={!config?.type}
              data-testid="button-download-package"
              title="Baixar pacote ZIP"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {deployments.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">
                Historico de Deploys
              </span>
              {deployments.slice(0, 5).map((deploy) => {
                const statusInfo = statusConfig[deploy.status];
                const StatusIcon = statusInfo.icon;
                return (
                  <div
                    key={deploy.id}
                    className="flex items-center justify-between gap-2 p-2 rounded border bg-background text-xs"
                    data-testid={`deploy-history-${deploy.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <StatusIcon className={cn("h-3.5 w-3.5", statusInfo.color, 
                        deploy.status === "building" && "animate-spin")} />
                      <span className={statusInfo.color}>{statusInfo.label}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(deploy.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
