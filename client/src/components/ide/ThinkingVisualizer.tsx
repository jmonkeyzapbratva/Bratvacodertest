import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, Sparkles, Lightbulb, CheckCircle2, Loader2, 
  ChevronRight, Cpu, Clock, Target
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ModelConfig {
  name: string;
  description: string;
  maxTokens: number;
  costPer1kTokens: number;
  bestFor: string[];
  thinkingCapability: string;
}

interface ThinkingStep {
  step: number;
  phase: string;
  thought: string;
  timestamp: string;
  duration: number;
}

interface ThinkingSession {
  id: string;
  projectId: number;
  prompt: string;
  mode: string;
  status: "thinking" | "analyzing" | "planning" | "completed";
  startedAt: string;
  completedAt?: string;
  thinkingSteps: ThinkingStep[];
  finalAnalysis?: string;
  recommendations: string[];
  confidence: number;
  tokensUsed: number;
}

interface ThinkingVisualizerProps {
  projectId: number;
  prompt?: string;
}

const THINKING_MODES = {
  standard: { name: "Padrao", phases: 3 },
  extended: { name: "Estendido", phases: 5 },
  "high-power": { name: "Alta Potencia", phases: 7 }
};

export function ThinkingVisualizer({ projectId, prompt = "" }: ThinkingVisualizerProps) {
  const [selectedMode, setSelectedMode] = useState<keyof typeof THINKING_MODES>("extended");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const { data: models } = useQuery<Record<string, ModelConfig>>({
    queryKey: ["/api/thinking/models"],
  });

  const { data: activeSession } = useQuery<ThinkingSession | null>({
    queryKey: ["/api/thinking/session", activeSessionId],
    enabled: !!activeSessionId,
    refetchInterval: (query) => {
      const data = query.state.data as ThinkingSession | null;
      if (!data) return 500;
      return data.status === "completed" ? false : 500;
    },
  });

  const startThinkingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/thinking/start", {
        projectId,
        prompt,
        mode: selectedMode
      });
      return response.json();
    },
    onSuccess: (session: ThinkingSession) => {
      setActiveSessionId(session.id);
    }
  });

  const recommendModelMutation = useMutation({
    mutationFn: async (taskDescription: string) => {
      const response = await apiRequest("POST", "/api/thinking/recommend-model", {
        taskDescription
      });
      return response.json();
    }
  });

  if (activeSession) {
    const totalPhases = THINKING_MODES[activeSession.mode as keyof typeof THINKING_MODES]?.phases || 3;
    const progress = (activeSession.thinkingSteps.length / totalPhases) * 100;

    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              Pensamento {activeSession.status !== "completed" && (
                <Loader2 className="w-3 h-3 animate-spin" />
              )}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {THINKING_MODES[activeSession.mode as keyof typeof THINKING_MODES]?.name}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Analisando: "{activeSession.prompt.substring(0, 50)}..."
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Fases completadas</span>
              <span>{activeSession.thinkingSteps.length}/{totalPhases}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <ScrollArea className="h-48">
            <div className="space-y-3">
              {activeSession.thinkingSteps.map((step, i) => (
                <div 
                  key={i}
                  className="relative pl-6 pb-3 border-l-2 border-purple-500/30 last:border-l-transparent"
                >
                  <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-purple-500 flex items-center justify-center">
                    <CheckCircle2 className="w-2 h-2 text-white" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{step.phase}</span>
                      <span className="text-xs text-muted-foreground">
                        {(step.duration / 1000).toFixed(1)}s
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {step.thought}
                    </p>
                  </div>
                </div>
              ))}
              
              {activeSession.status !== "completed" && (
                <div className="relative pl-6">
                  <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-muted animate-pulse" />
                  <span className="text-xs text-muted-foreground italic">
                    Processando proxima fase...
                  </span>
                </div>
              )}
            </div>
          </ScrollArea>

          {activeSession.status === "completed" && (
            <>
              {activeSession.finalAnalysis && (
                <div className="p-3 rounded bg-purple-500/10 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    Analise Final
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activeSession.finalAnalysis}
                  </p>
                </div>
              )}

              {activeSession.recommendations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Recomendacoes
                  </span>
                  <div className="space-y-1">
                    {activeSession.recommendations.map((rec, i) => (
                      <div 
                        key={i}
                        className="text-xs p-2 rounded bg-muted/30 flex items-start gap-2"
                      >
                        <ChevronRight className="w-3 h-3 mt-0.5 text-green-500" />
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Confianca: {activeSession.confidence}%
                </span>
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3" />
                  {activeSession.tokensUsed} tokens
                </span>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setActiveSessionId(null)}
                data-testid="button-new-thinking"
              >
                Nova Analise
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Pensamento Estendido
        </CardTitle>
        <CardDescription className="text-xs">
          Analise profunda antes de gerar codigo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Modo de analise:</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(THINKING_MODES) as [keyof typeof THINKING_MODES, typeof THINKING_MODES[keyof typeof THINKING_MODES]][]).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedMode(key)}
                className={`p-2 rounded text-center transition-all ${
                  selectedMode === key 
                    ? "bg-purple-500/20 border border-purple-500" 
                    : "bg-muted/30 border border-transparent hover-elevate"
                }`}
                data-testid={`button-thinking-mode-${key}`}
              >
                <div className="text-sm font-medium">{config.name}</div>
                <div className="text-xs text-muted-foreground">{config.phases} fases</div>
              </button>
            ))}
          </div>
        </div>

        {models && (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Modelos de IA disponiveis:</label>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {Object.entries(models).slice(0, 4).map(([key, config]) => (
                  <div 
                    key={key}
                    className="p-2 rounded bg-muted/30 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-medium">{config.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {config.description.substring(0, 40)}...
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {config.thinkingCapability}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <Button
          className="w-full"
          disabled={!prompt || startThinkingMutation.isPending}
          onClick={() => startThinkingMutation.mutate()}
          data-testid="button-start-thinking"
        >
          {startThinkingMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Brain className="w-4 h-4 mr-2" />
          )}
          Iniciar Analise Profunda
        </Button>
      </CardContent>
    </Card>
  );
}
