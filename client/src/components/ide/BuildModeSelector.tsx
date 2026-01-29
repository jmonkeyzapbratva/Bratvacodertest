import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, Palette, Rocket, Clock, Check, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface BuildModeConfig {
  name: string;
  description: string;
  estimatedTime: string;
  features: string[];
  aiModel: string;
  maxIterations: number;
  autoTest: boolean;
  generateTests: boolean;
}

interface BuildSession {
  id: string;
  projectId: number;
  mode: string;
  status: "planning" | "generating" | "testing" | "refining" | "completed" | "failed";
  currentIteration: number;
  maxIterations: number;
  startedAt: string;
  completedAt?: string;
  progress: number;
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
  generatedFiles: string[];
  testsRun: number;
  testsPassed: number;
}

interface BuildModeSelectorProps {
  projectId: number;
  onBuildStart?: (session: BuildSession) => void;
  prompt: string;
}

const MODE_ICONS = {
  "design-first": Palette,
  "full-app": Rocket,
  "fast": Zap
};

const MODE_COLORS = {
  "design-first": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "full-app": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "fast": "bg-green-500/10 text-green-600 dark:text-green-400"
};

export function BuildModeSelector({ projectId, onBuildStart, prompt }: BuildModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const { data: modes } = useQuery<Record<string, BuildModeConfig>>({
    queryKey: ["/api/build-modes"],
  });

  const { data: activeSession } = useQuery<BuildSession | null>({
    queryKey: ["/api/build-modes/session", activeSessionId],
    enabled: !!activeSessionId,
    refetchInterval: (query) => {
      const data = query.state.data as BuildSession | null;
      if (!data) return 1000;
      return data.status === "completed" || data.status === "failed" ? false : 1000;
    },
  });

  const startBuildMutation = useMutation({
    mutationFn: async (mode: string) => {
      const response = await apiRequest("POST", "/api/build-modes/start", {
        projectId,
        mode,
        prompt
      });
      return response.json();
    },
    onSuccess: (session: BuildSession) => {
      setActiveSessionId(session.id);
      onBuildStart?.(session);
    }
  });

  if (activeSession) {
    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              {activeSession.status === "completed" ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : activeSession.status === "failed" ? (
                <AlertCircle className="w-4 h-4 text-destructive" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Build em Progresso
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {modes?.[activeSession.mode]?.name || activeSession.mode}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Iteracao {activeSession.currentIteration}/{activeSession.maxIterations}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span>{activeSession.progress}%</span>
            </div>
            <Progress value={activeSession.progress} className="h-2" />
          </div>

          {activeSession.generatedFiles.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Arquivos gerados:</span>
              <div className="flex flex-wrap gap-1">
                {activeSession.generatedFiles.slice(0, 5).map((file, i) => (
                  <Badge key={i} variant="secondary" className="text-xs font-mono">
                    {file}
                  </Badge>
                ))}
                {activeSession.generatedFiles.length > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    +{activeSession.generatedFiles.length - 5}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <ScrollArea className="h-32 rounded border p-2 bg-muted/30">
            <div className="space-y-1 font-mono text-xs">
              {activeSession.logs.slice(-10).map((log, i) => (
                <div 
                  key={i} 
                  className={`${
                    log.level === "error" ? "text-destructive" :
                    log.level === "success" ? "text-green-500" :
                    log.level === "warn" ? "text-yellow-500" :
                    "text-muted-foreground"
                  }`}
                >
                  {log.message}
                </div>
              ))}
            </div>
          </ScrollArea>

          {(activeSession.status === "completed" || activeSession.status === "failed") && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setActiveSessionId(null)}
              data-testid="button-new-build"
            >
              Novo Build
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Modo de Build</CardTitle>
        <CardDescription className="text-xs">
          Escolha como voce quer gerar seu projeto
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {modes && Object.entries(modes).map(([key, config]) => {
          const Icon = MODE_ICONS[key as keyof typeof MODE_ICONS] || Zap;
          const colorClass = MODE_COLORS[key as keyof typeof MODE_COLORS] || "";
          const isSelected = selectedMode === key;
          
          return (
            <button
              key={key}
              onClick={() => setSelectedMode(key)}
              className={`w-full text-left p-3 rounded-md border transition-all ${
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover-elevate"
              }`}
              data-testid={`button-build-mode-${key}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{config.name}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {config.estimatedTime}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {config.description}
                  </p>
                  {isSelected && (
                    <ul className="mt-2 space-y-0.5">
                      {config.features.slice(0, 3).map((feature, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                          <Check className="w-3 h-3 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        <Button
          className="w-full"
          disabled={!selectedMode || !prompt || startBuildMutation.isPending}
          onClick={() => selectedMode && startBuildMutation.mutate(selectedMode)}
          data-testid="button-start-build"
        >
          {startBuildMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Iniciando...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              Iniciar Build
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
