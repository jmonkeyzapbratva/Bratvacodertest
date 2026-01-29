/**
 * Build Modes Service - Modos de construcao Design-first e Full-app
 * Similar ao Replit Agent 3: escolha entre prototipo rapido ou app completo
 */

export type BuildMode = "design-first" | "full-app" | "fast";

interface BuildModeConfig {
  name: string;
  description: string;
  estimatedTime: string;
  features: string[];
  aiModel: "fast" | "standard" | "powerful";
  maxIterations: number;
  autoTest: boolean;
  generateTests: boolean;
}

const BUILD_MODES: Record<BuildMode, BuildModeConfig> = {
  "design-first": {
    name: "Design First",
    description: "Prototipo visual clicavel em 3 minutos. Ideal para validar ideias rapidamente.",
    estimatedTime: "~3 minutos",
    features: [
      "Frontend completo com React",
      "UI responsiva e bonita",
      "Navegacao funcional",
      "Mock data para preview",
      "Sem backend real"
    ],
    aiModel: "fast",
    maxIterations: 3,
    autoTest: false,
    generateTests: false
  },
  "full-app": {
    name: "App Completo",
    description: "Aplicacao funcional completa em 10 minutos. Frontend, backend e banco de dados.",
    estimatedTime: "~10 minutos",
    features: [
      "Frontend React completo",
      "Backend Express com API",
      "Banco de dados PostgreSQL",
      "Autenticacao de usuarios",
      "Deploy ready"
    ],
    aiModel: "standard",
    maxIterations: 10,
    autoTest: true,
    generateTests: true
  },
  "fast": {
    name: "Modo Rapido",
    description: "Geracao ultra-rapida com menos iteracoes. Para tarefas simples.",
    estimatedTime: "~1 minuto",
    features: [
      "Codigo minimo viavel",
      "Sem refinamentos extras",
      "Uma unica iteracao"
    ],
    aiModel: "fast",
    maxIterations: 1,
    autoTest: false,
    generateTests: false
  }
};

interface BuildSession {
  id: string;
  projectId: number;
  mode: BuildMode;
  status: "planning" | "generating" | "testing" | "refining" | "completed" | "failed";
  currentIteration: number;
  maxIterations: number;
  startedAt: Date;
  completedAt?: Date;
  progress: number;
  logs: BuildLog[];
  generatedFiles: string[];
  testsRun: number;
  testsPassed: number;
}

interface BuildLog {
  timestamp: Date;
  level: "info" | "warn" | "error" | "success";
  message: string;
  details?: any;
}

class BuildModesService {
  private sessions: Map<string, BuildSession> = new Map();

  /**
   * Retorna configuracoes de todos os modos
   */
  getModes(): Record<BuildMode, BuildModeConfig> {
    return BUILD_MODES;
  }

  /**
   * Retorna configuracao de um modo especifico
   */
  getModeConfig(mode: BuildMode): BuildModeConfig {
    return BUILD_MODES[mode];
  }

  /**
   * Inicia uma nova sessao de build
   */
  async startBuildSession(
    projectId: number,
    mode: BuildMode,
    prompt: string
  ): Promise<BuildSession> {
    const config = BUILD_MODES[mode];
    
    const session: BuildSession = {
      id: `build_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      mode,
      status: "planning",
      currentIteration: 0,
      maxIterations: config.maxIterations,
      startedAt: new Date(),
      progress: 0,
      logs: [],
      generatedFiles: [],
      testsRun: 0,
      testsPassed: 0
    };

    this.sessions.set(session.id, session);
    this.addLog(session.id, "info", `Iniciando build no modo ${config.name}`);
    this.addLog(session.id, "info", `Prompt: "${prompt.substring(0, 100)}..."`);

    return session;
  }

  /**
   * Atualiza progresso da sessao
   */
  updateProgress(
    sessionId: string,
    progress: number,
    status?: BuildSession["status"]
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.progress = Math.min(100, Math.max(0, progress));
      if (status) {
        session.status = status;
      }
    }
  }

  /**
   * Adiciona log a sessao
   */
  addLog(
    sessionId: string,
    level: BuildLog["level"],
    message: string,
    details?: any
  ): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.logs.push({
        timestamp: new Date(),
        level,
        message,
        details
      });
    }
  }

  /**
   * Registra arquivo gerado
   */
  addGeneratedFile(sessionId: string, filePath: string): void {
    const session = this.sessions.get(sessionId);
    if (session && !session.generatedFiles.includes(filePath)) {
      session.generatedFiles.push(filePath);
    }
  }

  /**
   * Incrementa iteracao
   */
  nextIteration(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.currentIteration++;
    
    if (session.currentIteration >= session.maxIterations) {
      this.addLog(sessionId, "info", "Maximo de iteracoes atingido");
      return false;
    }

    this.addLog(sessionId, "info", `Iteracao ${session.currentIteration}/${session.maxIterations}`);
    return true;
  }

  /**
   * Registra resultado de teste
   */
  recordTestResult(sessionId: string, passed: boolean): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.testsRun++;
      if (passed) {
        session.testsPassed++;
      }
    }
  }

  /**
   * Completa a sessao
   */
  completeSession(sessionId: string, success: boolean): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = success ? "completed" : "failed";
      session.completedAt = new Date();
      session.progress = 100;
      
      const duration = (session.completedAt.getTime() - session.startedAt.getTime()) / 1000;
      this.addLog(
        sessionId,
        success ? "success" : "error",
        `Build ${success ? "concluido" : "falhou"} em ${duration.toFixed(1)}s`
      );
    }
  }

  /**
   * Obtem sessao por ID
   */
  getSession(sessionId: string): BuildSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Lista sessoes de um projeto
   */
  getProjectSessions(projectId: number): BuildSession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.projectId === projectId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  }

  /**
   * Gera prompt do sistema baseado no modo
   */
  getSystemPrompt(mode: BuildMode): string {
    const config = BUILD_MODES[mode];

    if (mode === "design-first") {
      return `Voce e um especialista em UI/UX e frontend React.
Seu objetivo e criar um PROTOTIPO VISUAL CLICAVEL em menos de 3 minutos.

REGRAS:
- Foque 100% no frontend - NAO crie backend
- Use dados mockados diretamente no codigo
- Crie uma UI bonita e responsiva com Tailwind
- Todas as paginas devem ser navegaveis
- Use componentes Shadcn/UI
- NAO se preocupe com persistencia de dados

O usuario quer ver a APARENCIA e NAVEGACAO do app rapidamente.`;
    }

    if (mode === "full-app") {
      return `Voce e um desenvolvedor full-stack senior.
Seu objetivo e criar uma APLICACAO COMPLETA e FUNCIONAL.

REGRAS:
- Crie frontend React com UI profissional
- Crie backend Express com API RESTful
- Configure banco de dados PostgreSQL com Drizzle ORM
- Implemente autenticacao se necessario
- Adicione validacao de dados com Zod
- Crie testes basicos
- Prepare para deploy

A aplicacao deve estar PRONTA PARA PRODUCAO.`;
    }

    return `Voce e um desenvolvedor eficiente.
Gere o CODIGO MINIMO VIAVEL para atender o pedido.
Uma unica iteracao, sem refinamentos extras.`;
  }
}

export const buildModesService = new BuildModesService();
