import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { 
  Bot, Play, Pause, Square, Clock, CheckCircle2, XCircle, 
  AlertTriangle, Zap, Timer, TrendingUp, Loader2 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AutonomyConfig {
  name: string;
  description: string;
  maxDurationMinutes: number;
  selfSupervision: boolean;
  autoRecovery: boolean;
  maxConsecutiveErrors: number;
  pauseOnError: boolean;
}

interface AutonomySession {
  id: string;
  projectId: number;
  userId: string;
  mode: string;
  status: "active" | "paused" | "completed" | "failed";
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  taskQueue: Array<{
    id: string;
    description: string;
    type: string;
    priority: string;
    status: string;
  }>;
  executedTasks: Array<{
    id: string;
    description: string;
    status: string;
    result?: string;
  }>;
  maxDurationMinutes: number;
  autoRecovery: boolean;
  selfSupervision: boolean;
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
    taskId?: string;
  }>;
}

interface AutonomyStats {
  duration: string;
  progress: number;
  tasksPerHour: number;
  successRate: number;
}

interface AutonomyControlsProps {
  projectId: number;
  userId: string;
}

const MODE_LEVELS = ["low", "medium", "high", "max"] as const;

export function AutonomyControls({ projectId, userId }: AutonomyControlsProps) {
  const [selectedLevel, setSelectedLevel] = useState(2);
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");

  const { data: configs } = useQuery<Record<string, AutonomyConfig>>({
    queryKey: ["/api/autonomy/configs"],
  });

  const { data: activeSession, refetch: refetchSession } = useQuery<AutonomySession | null>({
    queryKey: ["/api/autonomy/active", projectId],
    refetchInterval: (query) => {
      const data = query.state.data as AutonomySession | null;
      return data?.status === "active" ? 2000 : false;
    },
  });

  const { data: stats } = useQuery<AutonomyStats | null>({
    queryKey: ["/api/autonomy", activeSession?.id, "stats"],
    enabled: !!activeSession,
    refetchInterval: activeSession?.status === "active" ? 5000 : false,
  });

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const mode = MODE_LEVELS[selectedLevel];
      const response = await apiRequest("POST", "/api/autonomy/start", {
        projectId,
        userId,
        mode,
        tasks
      });
      return response.json();
    },
    onSuccess: () => {
      refetchSession();
      setTasks([]);
    }
  });

  const pauseSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/autonomy/${activeSession?.id}/pause`, {});
      return response.json();
    },
    onSuccess: () => refetchSession()
  });

  const resumeSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/autonomy/${activeSession?.id}/resume`, {});
      return response.json();
    },
    onSuccess: () => refetchSession()
  });

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()]);
      setNewTask("");
    }
  };

  const currentMode = MODE_LEVELS[selectedLevel];
  const currentConfig = configs?.[currentMode];

  if (activeSession) {
    const progress = activeSession.totalTasks > 0 
      ? ((activeSession.completedTasks + activeSession.failedTasks) / activeSession.totalTasks) * 100 
      : 0;

    return (
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Sessao Autonoma
            </CardTitle>
            <Badge 
              variant={activeSession.status === "active" ? "default" : "secondary"}
              className="text-xs"
            >
              {activeSession.status === "active" ? "Ativo" : 
               activeSession.status === "paused" ? "Pausado" :
               activeSession.status === "completed" ? "Concluido" : "Falhou"}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {configs?.[activeSession.mode]?.name} - ate {activeSession.maxDurationMinutes}min
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2 rounded bg-muted/30">
              <div className="text-lg font-semibold">{stats?.duration || "0 min"}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Timer className="w-3 h-3" />
                Duracao
              </div>
            </div>
            <div className="p-2 rounded bg-muted/30">
              <div className="text-lg font-semibold">{stats?.tasksPerHour || 0}/h</div>
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Velocidade
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tarefas</span>
              <span className="font-medium">
                {activeSession.completedTasks}/{activeSession.totalTasks}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {activeSession.completedTasks} sucesso
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-destructive" />
                {activeSession.failedTasks} falhas
              </span>
            </div>
          </div>

          {activeSession.taskQueue.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Fila de tarefas:</span>
              <ScrollArea className="h-20">
                <div className="space-y-1">
                  {activeSession.taskQueue.slice(0, 5).map((task) => (
                    <div 
                      key={task.id}
                      className="text-xs p-1.5 rounded bg-muted/30 flex items-center gap-2"
                    >
                      <Badge variant="outline" className="text-[10px]">
                        {task.type}
                      </Badge>
                      <span className="truncate">{task.description}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <ScrollArea className="h-24 rounded border p-2 bg-muted/30">
            <div className="space-y-1 font-mono text-xs">
              {activeSession.logs.slice(-8).map((log, i) => (
                <div 
                  key={i}
                  className={`${
                    log.level === "error" ? "text-destructive" :
                    log.level === "warn" ? "text-yellow-500" :
                    "text-muted-foreground"
                  }`}
                >
                  {log.message}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            {activeSession.status === "active" ? (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => pauseSessionMutation.mutate()}
                disabled={pauseSessionMutation.isPending}
                data-testid="button-pause-autonomy"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pausar
              </Button>
            ) : activeSession.status === "paused" ? (
              <Button 
                className="flex-1"
                onClick={() => resumeSessionMutation.mutate()}
                disabled={resumeSessionMutation.isPending}
                data-testid="button-resume-autonomy"
              >
                <Play className="w-4 h-4 mr-2" />
                Retomar
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Autonomia
        </CardTitle>
        <CardDescription className="text-xs">
          Configure o nivel de independencia do agente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{currentConfig?.name}</span>
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {currentConfig?.maxDurationMinutes}min
            </Badge>
          </div>
          <Slider
            value={[selectedLevel]}
            onValueChange={([v]) => setSelectedLevel(v)}
            max={3}
            step={1}
            className="w-full"
            data-testid="slider-autonomy-level"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Baixa</span>
            <span>Media</span>
            <span>Alta</span>
            <span>Max</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {currentConfig?.description}
        </p>

        <div className="flex flex-wrap gap-1">
          {currentConfig?.autoRecovery && (
            <Badge variant="secondary" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Auto-recovery
            </Badge>
          )}
          {currentConfig?.selfSupervision && (
            <Badge variant="secondary" className="text-xs">
              <Bot className="w-3 h-3 mr-1" />
              Auto-supervisao
            </Badge>
          )}
          {currentConfig?.pauseOnError && (
            <Badge variant="secondary" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Pausa em erros
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Tarefas iniciais:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Descreva uma tarefa..."
              className="flex-1 px-2 py-1 text-sm rounded border bg-background"
              data-testid="input-autonomy-task"
            />
            <Button size="sm" variant="outline" onClick={addTask} data-testid="button-add-task">
              +
            </Button>
          </div>
          {tasks.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tasks.map((task, i) => (
                <Badge 
                  key={i} 
                  variant="secondary" 
                  className="text-xs cursor-pointer"
                  onClick={() => setTasks(tasks.filter((_, j) => j !== i))}
                  data-testid={`badge-task-${i}`}
                >
                  {task.substring(0, 20)}...
                  <XCircle className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Button
          className="w-full"
          onClick={() => startSessionMutation.mutate()}
          disabled={startSessionMutation.isPending}
          data-testid="button-start-autonomy"
        >
          {startSessionMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Iniciar Sessao
        </Button>
      </CardContent>
    </Card>
  );
}
