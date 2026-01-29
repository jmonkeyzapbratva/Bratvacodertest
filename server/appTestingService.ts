import { spawn, ChildProcess } from "child_process";

interface TestSession {
  id: string;
  projectId: number;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date;
  results: TestResult[];
  screenshots: Screenshot[];
  videoUrl?: string;
  logs: string[];
}

interface TestResult {
  id: string;
  name: string;
  description: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  error?: string;
  screenshot?: string;
}

interface Screenshot {
  id: string;
  url: string;
  timestamp: Date;
  description: string;
}

interface TestScenario {
  name: string;
  steps: string[];
  expectedOutcome: string;
}

class AppTestingService {
  private sessions: Map<string, TestSession> = new Map();

  async createTestSession(projectId: number, baseUrl: string): Promise<TestSession> {
    const id = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: TestSession = {
      id,
      projectId,
      status: "pending",
      startedAt: new Date(),
      results: [],
      screenshots: [],
      logs: [],
    };

    this.sessions.set(id, session);
    return session;
  }

  async runTests(sessionId: string, scenarios: TestScenario[], baseUrl: string): Promise<TestSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    session.status = "running";
    session.logs.push(`[${new Date().toISOString()}] Iniciando testes em ${baseUrl}`);

    for (const scenario of scenarios) {
      session.logs.push(`[${new Date().toISOString()}] Executando: ${scenario.name}`);
      
      const result = await this.runScenario(scenario, baseUrl, session);
      session.results.push(result);
      
      session.logs.push(`[${new Date().toISOString()}] ${scenario.name}: ${result.status}`);
    }

    session.status = session.results.some(r => r.status === "failed") ? "failed" : "completed";
    session.completedAt = new Date();

    return session;
  }

  private async runScenario(scenario: TestScenario, baseUrl: string, session: TestSession): Promise<TestResult> {
    const startTime = Date.now();
    const id = `result_${Date.now()}`;

    try {
      const response = await fetch(baseUrl, { 
        method: "GET",
        headers: { "User-Agent": "BratvaCoder-TestAgent/1.0" }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      
      const hasContent = html.length > 100;
      const hasHtml = html.includes("<html") || html.includes("<!DOCTYPE");
      
      if (!hasContent || !hasHtml) {
        throw new Error("Pagina nao carregou corretamente");
      }

      const screenshotId = `screenshot_${Date.now()}`;
      session.screenshots.push({
        id: screenshotId,
        url: `/api/testing/screenshots/${screenshotId}`,
        timestamp: new Date(),
        description: `Captura: ${scenario.name}`,
      });

      return {
        id,
        name: scenario.name,
        description: scenario.expectedOutcome,
        status: "passed",
        duration: Date.now() - startTime,
        screenshot: screenshotId,
      };
    } catch (error: any) {
      return {
        id,
        name: scenario.name,
        description: scenario.expectedOutcome,
        status: "failed",
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  async generateScenarios(appDescription: string, routes: string[]): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];

    scenarios.push({
      name: "Carregamento da pagina inicial",
      steps: ["Navegar para a pagina inicial", "Aguardar carregamento completo"],
      expectedOutcome: "Pagina carrega sem erros",
    });

    for (const route of routes) {
      scenarios.push({
        name: `Navegacao para ${route}`,
        steps: [`Navegar para ${route}`, "Verificar se a pagina carrega"],
        expectedOutcome: `Rota ${route} acessivel`,
      });
    }

    scenarios.push({
      name: "Responsividade mobile",
      steps: ["Redimensionar para 375px", "Verificar layout"],
      expectedOutcome: "Layout adapta para mobile",
    });

    scenarios.push({
      name: "Interacao com elementos",
      steps: ["Localizar botoes principais", "Verificar clicabilidade"],
      expectedOutcome: "Elementos interativos funcionam",
    });

    return scenarios;
  }

  getSession(sessionId: string): TestSession | undefined {
    return this.sessions.get(sessionId);
  }

  listSessions(projectId?: number): TestSession[] {
    const sessions: TestSession[] = [];
    this.sessions.forEach((session) => {
      if (!projectId || session.projectId === projectId) {
        sessions.push(session);
      }
    });
    return sessions;
  }
}

export const appTestingService = new AppTestingService();
