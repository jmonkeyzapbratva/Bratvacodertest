/**
 * Agent Spawner Service - Cria agentes especializados para workflows
 * Similar ao Replit: spawna agentes para tarefas especificas automatizadas
 */

interface SpawnedAgent {
  id: string;
  projectId: number;
  name: string;
  description: string;
  type: AgentType;
  status: "idle" | "running" | "paused" | "stopped" | "error";
  config: AgentConfig;
  schedule?: AgentSchedule;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  logs: AgentLog[];
}

type AgentType = 
  | "slack-bot"
  | "telegram-bot"
  | "email-automation"
  | "data-sync"
  | "report-generator"
  | "webhook-handler"
  | "scheduled-task"
  | "monitor"
  | "custom";

interface AgentConfig {
  trigger: "schedule" | "webhook" | "event" | "manual";
  actions: AgentAction[];
  integrations: AgentIntegration[];
  variables: Record<string, string>;
  errorHandling: "stop" | "retry" | "notify" | "ignore";
  maxRetries: number;
  timeout: number;
}

interface AgentAction {
  id: string;
  type: "api-call" | "database-query" | "send-message" | "file-operation" | "code-execution" | "condition" | "loop";
  config: Record<string, any>;
  nextOnSuccess?: string;
  nextOnFailure?: string;
}

interface AgentIntegration {
  service: "slack" | "telegram" | "email" | "database" | "api" | "storage";
  credentials: string;
  config: Record<string, any>;
}

interface AgentSchedule {
  type: "interval" | "cron" | "once";
  value: string;
  timezone: string;
  enabled: boolean;
}

interface AgentLog {
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  runId?: string;
  data?: any;
}

interface AgentRun {
  id: string;
  agentId: string;
  status: "running" | "completed" | "failed" | "cancelled";
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  result?: any;
  error?: string;
  actionsExecuted: number;
}

const AGENT_TEMPLATES: Record<AgentType, {
  name: string;
  description: string;
  defaultConfig: Partial<AgentConfig>;
  requiredIntegrations: string[];
}> = {
  "slack-bot": {
    name: "Bot do Slack",
    description: "Responde mensagens, envia notificacoes e automatiza tarefas no Slack",
    defaultConfig: {
      trigger: "webhook",
      errorHandling: "notify",
      maxRetries: 3,
      timeout: 30000
    },
    requiredIntegrations: ["slack"]
  },
  "telegram-bot": {
    name: "Bot do Telegram",
    description: "Bot para Telegram com comandos personalizados",
    defaultConfig: {
      trigger: "webhook",
      errorHandling: "retry",
      maxRetries: 3,
      timeout: 30000
    },
    requiredIntegrations: ["telegram"]
  },
  "email-automation": {
    name: "Automacao de Email",
    description: "Envia emails automaticos baseado em gatilhos",
    defaultConfig: {
      trigger: "event",
      errorHandling: "notify",
      maxRetries: 2,
      timeout: 60000
    },
    requiredIntegrations: ["email"]
  },
  "data-sync": {
    name: "Sincronizacao de Dados",
    description: "Sincroniza dados entre sistemas periodicamente",
    defaultConfig: {
      trigger: "schedule",
      errorHandling: "retry",
      maxRetries: 5,
      timeout: 120000
    },
    requiredIntegrations: ["database", "api"]
  },
  "report-generator": {
    name: "Gerador de Relatorios",
    description: "Gera e envia relatorios automaticamente",
    defaultConfig: {
      trigger: "schedule",
      errorHandling: "notify",
      maxRetries: 2,
      timeout: 300000
    },
    requiredIntegrations: ["database", "email"]
  },
  "webhook-handler": {
    name: "Handler de Webhook",
    description: "Processa webhooks de servicos externos",
    defaultConfig: {
      trigger: "webhook",
      errorHandling: "retry",
      maxRetries: 3,
      timeout: 30000
    },
    requiredIntegrations: []
  },
  "scheduled-task": {
    name: "Tarefa Agendada",
    description: "Executa codigo em horarios especificos",
    defaultConfig: {
      trigger: "schedule",
      errorHandling: "notify",
      maxRetries: 1,
      timeout: 60000
    },
    requiredIntegrations: []
  },
  "monitor": {
    name: "Monitor",
    description: "Monitora URLs, APIs ou servicos e alerta em caso de problemas",
    defaultConfig: {
      trigger: "schedule",
      errorHandling: "ignore",
      maxRetries: 0,
      timeout: 10000
    },
    requiredIntegrations: []
  },
  "custom": {
    name: "Agente Personalizado",
    description: "Agente completamente customizavel",
    defaultConfig: {
      trigger: "manual",
      errorHandling: "stop",
      maxRetries: 0,
      timeout: 60000
    },
    requiredIntegrations: []
  }
};

class AgentSpawnerService {
  private agents: Map<string, SpawnedAgent> = new Map();
  private runs: Map<string, AgentRun> = new Map();
  private scheduledIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Retorna templates disponiveis
   */
  getTemplates() {
    return AGENT_TEMPLATES;
  }

  /**
   * Cria novo agente
   */
  async createAgent(
    projectId: number,
    name: string,
    type: AgentType,
    config: Partial<AgentConfig> = {}
  ): Promise<SpawnedAgent> {
    const template = AGENT_TEMPLATES[type];
    const agentId = `agent_${projectId}_${Date.now()}`;

    const agent: SpawnedAgent = {
      id: agentId,
      projectId,
      name,
      description: template.description,
      type,
      status: "idle",
      config: {
        trigger: config.trigger || template.defaultConfig.trigger || "manual",
        actions: config.actions || [],
        integrations: config.integrations || [],
        variables: config.variables || {},
        errorHandling: config.errorHandling || template.defaultConfig.errorHandling || "stop",
        maxRetries: config.maxRetries ?? template.defaultConfig.maxRetries ?? 0,
        timeout: config.timeout || template.defaultConfig.timeout || 60000
      },
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: new Date(),
      logs: []
    };

    this.agents.set(agentId, agent);
    this.addLog(agent, "info", `Agente "${name}" criado`);

    return agent;
  }

  /**
   * Configura agendamento
   */
  setSchedule(
    agentId: string,
    schedule: AgentSchedule
  ): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    // Remove agendamento anterior
    const existingInterval = this.scheduledIntervals.get(agentId);
    if (existingInterval) {
      clearInterval(existingInterval);
      this.scheduledIntervals.delete(agentId);
    }

    agent.schedule = schedule;

    if (schedule.enabled) {
      // Calcula proxima execucao
      agent.nextRunAt = this.calculateNextRun(schedule);
      
      // Configura intervalo
      if (schedule.type === "interval") {
        const intervalMs = this.parseInterval(schedule.value);
        const interval = setInterval(() => {
          this.runAgent(agentId);
        }, intervalMs);
        this.scheduledIntervals.set(agentId, interval);
      }

      this.addLog(agent, "info", `Agendamento configurado: ${schedule.value}`);
    }

    return true;
  }

  /**
   * Executa agente manualmente
   */
  async runAgent(agentId: string, input?: any): Promise<AgentRun> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error("Agente nao encontrado");

    const runId = `run_${agentId}_${Date.now()}`;
    
    const run: AgentRun = {
      id: runId,
      agentId,
      status: "running",
      startedAt: new Date(),
      actionsExecuted: 0
    };

    this.runs.set(runId, run);
    agent.status = "running";
    agent.lastRunAt = new Date();
    agent.runCount++;

    this.addLog(agent, "info", `Execucao iniciada`, runId);

    try {
      // Executa acoes
      for (const action of agent.config.actions) {
        await this.executeAction(agent, action, run, input);
        run.actionsExecuted++;
      }

      run.status = "completed";
      run.completedAt = new Date();
      run.duration = run.completedAt.getTime() - run.startedAt.getTime();
      agent.successCount++;
      agent.status = "idle";

      this.addLog(agent, "info", `Execucao concluida em ${run.duration}ms`, runId);

      // Atualiza proxima execucao se agendado
      if (agent.schedule?.enabled) {
        agent.nextRunAt = this.calculateNextRun(agent.schedule);
      }

    } catch (error: any) {
      run.status = "failed";
      run.error = error.message;
      run.completedAt = new Date();
      run.duration = run.completedAt.getTime() - run.startedAt.getTime();
      agent.failureCount++;
      agent.status = "error";

      this.addLog(agent, "error", `Erro: ${error.message}`, runId);

      // Retry se configurado
      if (agent.config.errorHandling === "retry" && agent.config.maxRetries > 0) {
        // Implementaria logica de retry aqui
      }
    }

    return run;
  }

  /**
   * Executa uma acao
   */
  private async executeAction(
    agent: SpawnedAgent,
    action: AgentAction,
    run: AgentRun,
    input?: any
  ): Promise<any> {
    this.addLog(agent, "debug", `Executando acao: ${action.type}`, run.id);

    // Simula execucao
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));

    switch (action.type) {
      case "api-call":
        return { status: 200, data: {} };
      case "database-query":
        return { rows: [], rowCount: 0 };
      case "send-message":
        return { sent: true };
      case "file-operation":
        return { success: true };
      case "code-execution":
        return { result: null };
      default:
        return null;
    }
  }

  /**
   * Para agente
   */
  stopAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    const interval = this.scheduledIntervals.get(agentId);
    if (interval) {
      clearInterval(interval);
      this.scheduledIntervals.delete(agentId);
    }

    agent.status = "stopped";
    if (agent.schedule) {
      agent.schedule.enabled = false;
    }

    this.addLog(agent, "info", "Agente parado");

    return true;
  }

  /**
   * Deleta agente
   */
  deleteAgent(agentId: string): boolean {
    this.stopAgent(agentId);
    return this.agents.delete(agentId);
  }

  /**
   * Lista agentes do projeto
   */
  getProjectAgents(projectId: number): SpawnedAgent[] {
    return Array.from(this.agents.values())
      .filter(a => a.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Obtem agente
   */
  getAgent(agentId: string): SpawnedAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Lista execucoes de um agente
   */
  getAgentRuns(agentId: string): AgentRun[] {
    return Array.from(this.runs.values())
      .filter(r => r.agentId === agentId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Adiciona log
   */
  private addLog(
    agent: SpawnedAgent,
    level: AgentLog["level"],
    message: string,
    runId?: string
  ): void {
    agent.logs.push({
      timestamp: new Date(),
      level,
      message,
      runId
    });

    // Limita a 100 logs
    if (agent.logs.length > 100) {
      agent.logs = agent.logs.slice(-100);
    }
  }

  /**
   * Calcula proxima execucao
   */
  private calculateNextRun(schedule: AgentSchedule): Date {
    const now = new Date();
    
    if (schedule.type === "interval") {
      const intervalMs = this.parseInterval(schedule.value);
      return new Date(now.getTime() + intervalMs);
    }

    if (schedule.type === "once") {
      return new Date(schedule.value);
    }

    // Para cron, retorna aproximacao
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  /**
   * Parseia intervalo
   */
  private parseInterval(value: string): number {
    const match = value.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 60000; // Default 1 minuto

    const num = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s": return num * 1000;
      case "m": return num * 60 * 1000;
      case "h": return num * 60 * 60 * 1000;
      case "d": return num * 24 * 60 * 60 * 1000;
      default: return 60000;
    }
  }
}

export const agentSpawnerService = new AgentSpawnerService();
