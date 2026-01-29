import { useState, useEffect } from "react";
import { Key, Plus, Eye, EyeOff, Trash2, Save, AlertCircle, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";

interface EnvVariable {
  key: string;
  value: string;
  isSecret?: boolean;
}

interface SecretsPanelProps {
  projectId?: number;
}

export function SecretsPanel({ projectId }: SecretsPanelProps) {
  const { toast } = useToast();
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isSecret, setIsSecret] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: envVars = [], isLoading, refetch } = useQuery<EnvVariable[]>({
    queryKey: ["/api/projects", projectId, "env"],
    enabled: !!projectId,
  });

  const { data: missingVars } = useQuery<{ missing: string[] }>({
    queryKey: ["/api/projects", projectId, "env/missing"],
    enabled: !!projectId,
  });

  const addEnvMutation = useMutation({
    mutationFn: async ({ key, value, isSecret }: { key: string; value: string; isSecret: boolean }) => {
      return apiRequest("POST", `/api/projects/${projectId}/env`, { key, value, isSecret });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "env"] });
      toast({
        title: "Variavel adicionada",
        description: "A variavel de ambiente foi salva com sucesso.",
      });
      setNewKey("");
      setNewValue("");
      setIsAdding(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar variavel",
        variant: "destructive",
      });
    },
  });

  const updateEnvMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return apiRequest("POST", `/api/projects/${projectId}/env`, { key, value, isSecret: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "env"] });
      setEditingKey(null);
      toast({
        title: "Atualizado",
        description: "Variavel atualizada com sucesso.",
      });
    },
  });

  const deleteEnvMutation = useMutation({
    mutationFn: async (key: string) => {
      return apiRequest("DELETE", `/api/projects/${projectId}/env/${key}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "env"] });
      toast({
        title: "Removido",
        description: "Variavel removida com sucesso.",
      });
    },
  });

  const toggleVisibility = (key: string) => {
    setVisibleSecrets(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleAddSecret = () => {
    if (newKey.trim() && newValue.trim()) {
      const exists = envVars.some(v => v.key === newKey.trim());
      if (!exists) {
        addEnvMutation.mutate({ key: newKey.trim(), value: newValue.trim(), isSecret });
      } else {
        toast({
          title: "Erro",
          description: "Ja existe uma variavel com esse nome",
          variant: "destructive",
        });
      }
    }
  };

  const handleStartEdit = (env: EnvVariable) => {
    setEditingKey(env.key);
    setEditValue(env.value);
  };

  const handleSaveEdit = () => {
    if (editingKey && editValue) {
      updateEnvMutation.mutate({ key: editingKey, value: editValue });
    }
  };

  const handleAddMissing = (key: string) => {
    setNewKey(key);
    setNewValue("");
    setIsSecret(true);
    setIsAdding(true);
  };

  if (!projectId) {
    return (
      <div className="h-full flex flex-col bg-sidebar items-center justify-center p-4">
        <Settings className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          Selecione um projeto para gerenciar variaveis de ambiente.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Variaveis de Ambiente</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-env"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAdding(true)}
            data-testid="button-add-secret"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {missingVars?.missing && missingVars.missing.length > 0 && (
            <div className="p-2 rounded border border-amber-500/30 bg-amber-500/10 space-y-2">
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Variaveis faltantes detectadas no codigo:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {missingVars.missing.map(key => (
                  <Badge 
                    key={key} 
                    variant="outline" 
                    className="text-xs cursor-pointer hover-elevate"
                    onClick={() => handleAddMissing(key)}
                  >
                    {key}
                    <Plus className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Variaveis de ambiente sao valores de configuracao. Marque como "secret" para proteger chaves e senhas.
            </span>
          </div>

          {isAdding && (
            <div className="p-3 border rounded-md space-y-2 bg-background">
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
                placeholder="NOME_DA_VARIAVEL"
                className="text-sm font-mono"
                data-testid="input-new-secret-key"
              />
              <Input
                type={isSecret ? "password" : "text"}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="valor"
                className="text-sm font-mono"
                data-testid="input-new-secret-value"
              />
              <div className="flex items-center gap-2">
                <Button
                  variant={isSecret ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsSecret(!isSecret)}
                  className="text-xs"
                >
                  <Key className="h-3 w-3 mr-1" />
                  {isSecret ? "Secret" : "Publica"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddSecret}
                  disabled={!newKey.trim() || !newValue.trim() || addEnvMutation.isPending}
                  data-testid="button-confirm-add-secret"
                >
                  {addEnvMutation.isPending ? (
                    <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : null}
                  Adicionar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAdding(false);
                    setNewKey("");
                    setNewValue("");
                  }}
                  data-testid="button-cancel-add-secret"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : envVars.length === 0 && !isAdding ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nenhuma variavel configurada.
              <br />
              <button
                onClick={() => setIsAdding(true)}
                className="text-primary hover:underline mt-2"
                data-testid="link-add-first-secret"
              >
                Adicionar variavel
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {envVars.map((env) => {
                const isVisible = visibleSecrets.has(env.key);
                const isEditing = editingKey === env.key;
                return (
                  <div
                    key={env.key}
                    className={cn(
                      "p-2 border rounded-md space-y-1.5 bg-background",
                      env.isSecret && "border-primary/30"
                    )}
                    data-testid={`secret-item-${env.key}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium text-foreground">
                          {env.key}
                        </span>
                        {env.isSecret && (
                          <Badge variant="secondary" className="text-xs">
                            <Key className="h-2.5 w-2.5 mr-1" />
                            Secret
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {env.isSecret && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleVisibility(env.key)}
                            data-testid={`button-toggle-visibility-${env.key}`}
                          >
                            {isVisible ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteEnvMutation.mutate(env.key)}
                          disabled={deleteEnvMutation.isPending}
                          data-testid={`button-delete-secret-${env.key}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Input
                          type={env.isSecret && !isVisible ? "password" : "text"}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="text-xs font-mono h-7 flex-1"
                        />
                        <Button size="sm" onClick={handleSaveEdit} className="h-7">
                          <Save className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => handleStartEdit(env)}
                      >
                        {env.isSecret && !isVisible 
                          ? "••••••••" 
                          : env.value
                        }
                      </div>
                    )}
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
