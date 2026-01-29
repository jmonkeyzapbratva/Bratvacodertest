import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Bot, Plus, Play, Square, Trash2, Clock, CheckCircle2, 
  XCircle, MessageSquare, Mail, Database, Globe, Webhook, 
  CalendarClock, Activity, Settings, Loader2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface AgentTemplate {
  name: string;
  description: string;
  defaultConfig: {
    trigger: string;
    errorHandling: string;
    maxRetries: number;
    timeout: number;
  };
  requiredIntegrations: string[];
}

interface SpawnedAgent {
  id: string;
  projectId: number;
  name: string;
  description: string;
  type: string;
  status: "idle" | "running" | "paused" | "stopped" | "error";
  runCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
}

interface AgentRun {
  id: string;
  agentId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  actionsExecuted: number;
}

interface AgentMarketplaceProps {
  projectId: number;
}

const AGENT_ICONS: Record<string, typeof Bot> = {
  "slack-bot": MessageSquare,
  "telegram-bot": MessageSquare,
  "email-automation": Mail,
  "data-sync": Database,
  "report-generator": Activity,
  "webhook-handler": Webhook,
  "scheduled-task": CalendarClock,
  "monitor": Globe,
  "custom": Settings
};

const AGENT_COLORS: Record<string, string> = {
  "slack-bot": "bg-purple-500/10 text-purple-500",
  "telegram-bot": "bg-blue-500/10 text-blue-500",
  "email-automation": "bg-orange-500/10 text-orange-500",
  "data-sync": "bg-green-500/10 text-green-500",
  "report-generator": "bg-cyan-500/10 text-cyan-500",
  "webhook-handler": "bg-pink-500/10 text-pink-500",
  "scheduled-task": "bg-yellow-500/10 text-yellow-500",
  "monitor": "bg-red-500/10 text-red-500",
  "custom": "bg-gray-500/10 text-gray-500"
};

export function AgentMarketplace({ projectId }: AgentMarketplaceProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: templates } = useQuery<Record<string, AgentTemplate>>({
    queryKey: ["/api/agents/templates"],
  });

  const { data: agents, refetch: refetchAgents } = useQuery<SpawnedAgent[]>({
    queryKey: ["/api/agents/project", projectId],
  });

  const createAgentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/agents", {
        projectId,
        name: agentName,
        type: selectedTemplate,
        config: {}
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents/project", projectId] });
      refetchAgents();
      setShowCreateDialog(false);
      setAgentName("");
      setSelectedTemplate(null);
    }
  });

  const runAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const response = await apiRequest("POST", `/api/agents/${agentId}/run`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents/project", projectId] });
      refetchAgents();
    }
  });

  const stopAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const response = await apiRequest("POST", `/api/agents/${agentId}/stop`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents/project", projectId] });
      refetchAgents();
    }
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const response = await apiRequest("DELETE", `/api/agents/${agentId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents/project", projectId] });
      refetchAgents();
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge className="bg-green-500/10 text-green-500 text-xs">Executando</Badge>;
      case "idle":
        return <Badge variant="secondary" className="text-xs">Ocioso</Badge>;
      case "error":
        return <Badge variant="destructive" className="text-xs">Erro</Badge>;
      case "stopped":
        return <Badge variant="outline" className="text-xs">Parado</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Agentes
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" data-testid="button-create-agent">
                <Plus className="w-4 h-4 mr-1" />
                Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Criar Novo Agente</DialogTitle>
                <DialogDescription>
                  Escolha um tipo de agente para automatizar tarefas
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do agente</label>
                  <Input
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="Meu Bot do Slack"
                    data-testid="input-agent-name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de agente</label>
                  <ScrollArea className="h-64">
                    <div className="grid grid-cols-2 gap-2">
                      {templates && Object.entries(templates).map(([key, template]) => {
                        const Icon = AGENT_ICONS[key] || Bot;
                        const colorClass = AGENT_COLORS[key] || "";
                        const isSelected = selectedTemplate === key;

                        return (
                          <button
                            key={key}
                            onClick={() => setSelectedTemplate(key)}
                            className={`p-3 rounded-md border text-left transition-all ${
                              isSelected 
                                ? "border-primary bg-primary/5" 
                                : "border-border hover-elevate"
                            }`}
                            data-testid={`button-template-${key}`}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`p-2 rounded ${colorClass}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium">{template.name}</div>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {template.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                <Button
                  className="w-full"
                  disabled={!selectedTemplate || !agentName || createAgentMutation.isPending}
                  onClick={() => createAgentMutation.mutate()}
                  data-testid="button-confirm-create-agent"
                >
                  {createAgentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Criar Agente
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription className="text-xs">
          Crie e gerencie agentes automatizados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {agents && agents.length > 0 ? (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {agents.map((agent) => {
                const Icon = AGENT_ICONS[agent.type] || Bot;
                const colorClass = AGENT_COLORS[agent.type] || "";

                return (
                  <div 
                    key={agent.id}
                    className="p-3 rounded-md border bg-card space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm">{agent.name}</span>
                          {getStatusBadge(agent.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {agent.description.substring(0, 50)}...
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          {agent.successCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-destructive" />
                          {agent.failureCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {agent.runCount} exec
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {agent.status === "running" ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => stopAgentMutation.mutate(agent.id)}
                          disabled={stopAgentMutation.isPending}
                          data-testid={`button-stop-agent-${agent.id}`}
                        >
                          <Square className="w-3 h-3 mr-1" />
                          Parar
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => runAgentMutation.mutate(agent.id)}
                          disabled={runAgentMutation.isPending || agent.status === "error"}
                          data-testid={`button-run-agent-${agent.id}`}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Executar
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteAgentMutation.mutate(agent.id)}
                        disabled={deleteAgentMutation.isPending}
                        data-testid={`button-delete-agent-${agent.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-6 text-center space-y-3">
            <Bot className="w-10 h-10 mx-auto text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Nenhum agente criado</p>
              <p className="text-xs text-muted-foreground">
                Crie agentes para automatizar bots, sincronizacao de dados, relatorios e muito mais
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(true)}
              data-testid="button-create-first-agent"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Agente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
