/**
 * Autonomy Service - Sessoes longas sem interrupcao
 * Similar ao Replit Agent 3: ate 200 minutos de trabalho autonomo
 */

interface AutonomySession {
  id: string;
  projectId: number;
  userId: string;
  mode: "low" | "medium" | "high" | "max";
  status: "active" | "paused" | "completed" | "failed";
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  taskQueue: AutonomyTask[];
  executedTasks: AutonomyTask[];
  maxDurationMinutes: number;
  autoRecovery: boolean;
  selfSupervision: boolean;
  logs: AutonomyLog[];
}

interface AutonomyTask {
  id: string;
  description: string;
  type: "code" | "test" | "fix" | "refactor" | "deploy" | "research";
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  dependencies: string[];
  estimatedMinutes: number;
  actualMinutes?: number;
  result?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface AutonomyLog {
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  taskId?: string;
}

type AutonomyMode = "low" | "medium" | "high" | "max";

const AUTONOMY_CONFIGS: Record<AutonomyMode, {
  name: string;
  description: string;
  maxDurationMinutes: number;
  selfSupervision: boolean;
  autoRecovery: boolean;
  maxConsecutiveErrors: number;
  pauseOnError: boolean;
}> = {
  low: {
    name: "Baixa Autonomia",
    description: "Pergunta confirmacao antes de cada acao importante",
    maxDurationMinutes: 15,
    selfSupervision: false,
    autoRecovery: false,
    maxConsecutiveErrors: 1,
    pauseOnError: true
  },
  medium: {
    name: "Autonomia Media",
    description: "Trabalha de forma independente mas pede confirmacao periodicamente",
    maxDurationMinutes: 30,
    selfSupervision: false,
    autoRecovery: true,
    maxConsecutiveErrors: 2,
    pauseOnError: true
  },
  high: {
    name: "Alta Autonomia",
    description: "Trabalha de forma autonoma e se recupera de erros automaticamente",
    maxDurationMinutes: 60,
    selfSupervision: true,
    autoRecovery: true,
    maxConsecutiveErrors: 5,
    pauseOnError: false
  },
  max: {
    name: "Autonomia Maxima",
    description: "Ate 200 minutos de trabalho continuo com auto-supervisao completa",
    maxDurationMinutes: 200,
    selfSupervision: true,
    autoRecovery: true,
    maxConsecutiveErrors: 10,
    pauseOnError: false
  }
};

class AutonomyService {
  private sessions: Map<string, AutonomySession> = new Map();
  private activeSessionByProject: Map<number, string> = new Map();

  /**
   * Retorna configuracoes de autonomia
   */
  getAutonomyConfigs() {
    return AUTONOMY_CONFIGS;
  }

  /**
   * Inicia sessao de autonomia
   */
  async startSession(
    projectId: number,
    userId: string,
    mode: AutonomyMode,
    initialTasks: string[]
  ): Promise<AutonomySession> {
    // Encerra sessao anterior se existir
    const existingSessionId = this.activeSessionByProject.get(projectId);
    if (existingSessionId) {
      await this.endSession(existingSessionId);
    }

    const config = AUTONOMY_CONFIGS[mode];
    const sessionId = `autonomy_${projectId}_${Date.now()}`;

    const session: AutonomySession = {
      id: sessionId,
      projectId,
      userId,
      mode,
      status: "active",
      startedAt: new Date(),
      lastActivityAt: new Date(),
      totalTasks: initialTasks.length,
      completedTasks: 0,
      failedTasks: 0,
      taskQueue: initialTasks.map((desc, i) => ({
        id: `task_${i}_${Date.now()}`,
        description: desc,
        type: this.inferTaskType(desc),
        priority: "medium",
        status: "pending",
        dependencies: [],
        estimatedMinutes: 5,
        createdAt: new Date()
      })),
      executedTasks: [],
      maxDurationMinutes: config.maxDurationMinutes,
      autoRecovery: config.autoRecovery,
      selfSupervision: config.selfSupervision,
      logs: []
    };

    this.sessions.set(sessionId, session);
    this.activeSessionByProject.set(projectId, sessionId);

    this.addLog(session, "info", `Sessao iniciada em modo ${config.name}`);
    this.addLog(session, "info", `${session.totalTasks} tarefas na fila`);

    // Inicia execucao em background
    this.executeSessionTasks(session);

    return session;
  }

  /**
   * Infere tipo de tarefa pela descricao
   */
  private inferTaskType(description: string): AutonomyTask["type"] {
    const lower = description.toLowerCase();
    
    if (lower.includes("test") || lower.includes("teste")) return "test";
    if (lower.includes("fix") || lower.includes("corrig") || lower.includes("bug")) return "fix";
    if (lower.includes("refactor") || lower.includes("refator")) return "refactor";
    if (lower.includes("deploy") || lower.includes("public")) return "deploy";
    if (lower.includes("pesquis") || lower.includes("busca") || lower.includes("analisa")) return "research";
    return "code";
  }

  /**
   * Executa tarefas da sessao
   */
  private async executeSessionTasks(session: AutonomySession): Promise<void> {
    const config = AUTONOMY_CONFIGS[session.mode];
    let consecutiveErrors = 0;

    while (session.status === "active") {
      // Verifica timeout
      const elapsedMinutes = (Date.now() - session.startedAt.getTime()) / (1000 * 60);
      if (elapsedMinutes >= session.maxDurationMinutes) {
        this.addLog(session, "info", "Tempo maximo atingido");
        session.status = "completed";
        break;
      }

      // Pega proxima tarefa
      const task = session.taskQueue.find(t => t.status === "pending");
      if (!task) {
        this.addLog(session, "info", "Todas as tarefas concluidas");
        session.status = "completed";
        break;
      }

      // Executa tarefa
      try {
        await this.executeTask(session, task);
        consecutiveErrors = 0;
        session.completedTasks++;
      } catch (error: any) {
        consecutiveErrors++;
        session.failedTasks++;
        this.addLog(session, "error", `Erro na tarefa: ${error.message}`, task.id);

        if (config.pauseOnError || consecutiveErrors >= config.maxConsecutiveErrors) {
          if (session.autoRecovery && consecutiveErrors < config.maxConsecutiveErrors) {
            this.addLog(session, "warn", "Tentando recuperacao automatica");
            await this.attemptRecovery(session, task);
          } else {
            this.addLog(session, "error", "Muitos erros consecutivos, pausando sessao");
            session.status = "paused";
            break;
          }
        }
      }

      session.lastActivityAt = new Date();
    }

    session.completedAt = new Date();
  }

  /**
   * Executa uma tarefa individual
   */
  private async executeTask(session: AutonomySession, task: AutonomyTask): Promise<void> {
    task.status = "running";
    task.startedAt = new Date();
    
    this.addLog(session, "info", `Executando: ${task.description}`, task.id);

    // Simula execucao da tarefa
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // 90% de sucesso
    if (Math.random() > 0.1) {
      task.status = "completed";
      task.result = `Tarefa "${task.description}" concluida com sucesso`;
    } else {
      throw new Error("Erro durante execucao da tarefa");
    }

    task.completedAt = new Date();
    task.actualMinutes = (task.completedAt.getTime() - task.startedAt.getTime()) / (1000 * 60);

    session.executedTasks.push(task);
    session.taskQueue = session.taskQueue.filter(t => t.id !== task.id);
  }

  /**
   * Tenta recuperacao apos erro
   */
  private async attemptRecovery(session: AutonomySession, failedTask: AutonomyTask): Promise<void> {
    this.addLog(session, "info", "Analisando causa do erro...", failedTask.id);
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 70% de chance de recuperacao
    if (Math.random() > 0.3) {
      failedTask.status = "pending";
      failedTask.error = undefined;
      this.addLog(session, "info", "Recuperacao bem sucedida, tentando novamente", failedTask.id);
    } else {
      failedTask.status = "failed";
      this.addLog(session, "warn", "Recuperacao falhou, pulando tarefa", failedTask.id);
    }
  }

  /**
   * Adiciona tarefa a sessao ativa
   */
  addTask(
    sessionId: string,
    description: string,
    priority: AutonomyTask["priority"] = "medium"
  ): AutonomyTask | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "active") return null;

    const task: AutonomyTask = {
      id: `task_${Date.now()}`,
      description,
      type: this.inferTaskType(description),
      priority,
      status: "pending",
      dependencies: [],
      estimatedMinutes: 5,
      createdAt: new Date()
    };

    session.taskQueue.push(task);
    session.totalTasks++;
    
    this.addLog(session, "info", `Nova tarefa adicionada: ${description}`);

    return task;
  }

  /**
   * Pausa sessao
   */
  pauseSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "active") return false;

    session.status = "paused";
    this.addLog(session, "info", "Sessao pausada pelo usuario");
    
    return true;
  }

  /**
   * Retoma sessao
   */
  resumeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== "paused") return false;

    session.status = "active";
    this.addLog(session, "info", "Sessao retomada");
    
    // Reinicia execucao
    this.executeSessionTasks(session);
    
    return true;
  }

  /**
   * Encerra sessao
   */
  async endSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = "completed";
    session.completedAt = new Date();
    
    this.addLog(session, "info", "Sessao encerrada");
    this.activeSessionByProject.delete(session.projectId);

    return true;
  }

  /**
   * Adiciona log
   */
  private addLog(
    session: AutonomySession,
    level: AutonomyLog["level"],
    message: string,
    taskId?: string
  ): void {
    session.logs.push({
      timestamp: new Date(),
      level,
      message,
      taskId
    });
  }

  /**
   * Obtem sessao
   */
  getSession(sessionId: string): AutonomySession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Obtem sessao ativa do projeto
   */
  getActiveSession(projectId: number): AutonomySession | undefined {
    const sessionId = this.activeSessionByProject.get(projectId);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  /**
   * Lista sessoes do projeto
   */
  getProjectSessions(projectId: number): AutonomySession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.projectId === projectId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Obtem estatisticas
   */
  getStats(sessionId: string): {
    duration: string;
    progress: number;
    tasksPerHour: number;
    successRate: number;
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const durationMs = (session.completedAt || new Date()).getTime() - session.startedAt.getTime();
    const durationMinutes = durationMs / (1000 * 60);
    const durationHours = durationMinutes / 60;

    const progress = session.totalTasks > 0 
      ? ((session.completedTasks + session.failedTasks) / session.totalTasks) * 100 
      : 0;

    const tasksPerHour = durationHours > 0 
      ? session.completedTasks / durationHours 
      : 0;

    const successRate = (session.completedTasks + session.failedTasks) > 0
      ? (session.completedTasks / (session.completedTasks + session.failedTasks)) * 100
      : 100;

    return {
      duration: durationMinutes < 60 
        ? `${Math.round(durationMinutes)} min` 
        : `${Math.round(durationHours * 10) / 10} h`,
      progress: Math.round(progress),
      tasksPerHour: Math.round(tasksPerHour * 10) / 10,
      successRate: Math.round(successRate)
    };
  }
}

export const autonomyService = new AutonomyService();
