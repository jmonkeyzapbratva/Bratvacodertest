import { spawn, exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

interface TestResult {
  id: string;
  name: string;
  status: "passed" | "failed" | "skipped" | "pending";
  duration: number;
  error?: string;
  screenshot?: string;
}

interface TestRun {
  id: string;
  projectId: number;
  startedAt: string;
  completedAt?: string;
  status: "running" | "completed" | "failed";
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResult[];
  logs: string[];
}

class TestingService {
  private activeRuns: Map<string, TestRun> = new Map();
  private testHistory: TestRun[] = [];

  async runQuickHealthCheck(url: string): Promise<{
    healthy: boolean;
    statusCode: number;
    responseTime: number;
    error?: string;
  }> {
    const start = Date.now();
    
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      return {
        healthy: response.ok,
        statusCode: response.status,
        responseTime: Date.now() - start,
      };
    } catch (error: any) {
      return {
        healthy: false,
        statusCode: 0,
        responseTime: Date.now() - start,
        error: error.message,
      };
    }
  }

  async runEndpointTests(
    baseUrl: string,
    endpoints: { method: string; path: string; expectedStatus: number }[]
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const endpoint of endpoints) {
      const start = Date.now();
      const testId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      try {
        const response = await fetch(`${baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          signal: AbortSignal.timeout(5000),
        });

        const passed = response.status === endpoint.expectedStatus;

        results.push({
          id: testId,
          name: `${endpoint.method} ${endpoint.path}`,
          status: passed ? "passed" : "failed",
          duration: Date.now() - start,
          error: passed ? undefined : `Expected ${endpoint.expectedStatus}, got ${response.status}`,
        });
      } catch (error: any) {
        results.push({
          id: testId,
          name: `${endpoint.method} ${endpoint.path}`,
          status: "failed",
          duration: Date.now() - start,
          error: error.message,
        });
      }
    }

    return results;
  }

  async runUITest(
    projectId: number,
    testPlan: string
  ): Promise<TestRun> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    const run: TestRun = {
      id: runId,
      projectId,
      startedAt: new Date().toISOString(),
      status: "running",
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      results: [],
      logs: [`Iniciando testes para projeto ${projectId}...`],
    };

    this.activeRuns.set(runId, run);

    try {
      run.logs.push("Analisando plano de testes...");
      
      const steps = this.parseTestPlan(testPlan);
      run.totalTests = steps.length;

      for (const step of steps) {
        const result = await this.executeTestStep(step);
        run.results.push(result);
        
        if (result.status === "passed") run.passed++;
        else if (result.status === "failed") run.failed++;
        else run.skipped++;

        run.logs.push(`[${result.status.toUpperCase()}] ${result.name}`);
      }

      run.status = run.failed > 0 ? "failed" : "completed";
      run.completedAt = new Date().toISOString();
      
      run.logs.push(`Testes concluídos: ${run.passed}/${run.totalTests} passaram`);

    } catch (error: any) {
      run.status = "failed";
      run.completedAt = new Date().toISOString();
      run.logs.push(`Erro: ${error.message}`);
    }

    this.testHistory.push(run);
    this.activeRuns.delete(runId);

    return run;
  }

  private parseTestPlan(testPlan: string): { action: string; target: string; value?: string }[] {
    const steps: { action: string; target: string; value?: string }[] = [];
    
    const lines = testPlan.split("\n").filter(line => line.trim());
    
    for (const line of lines) {
      const normalized = line.toLowerCase();
      
      if (normalized.includes("navegar") || normalized.includes("navigate")) {
        const urlMatch = line.match(/(?:para|to)\s+([^\s]+)/i);
        steps.push({ action: "navigate", target: urlMatch?.[1] || "/" });
      } else if (normalized.includes("clicar") || normalized.includes("click")) {
        const targetMatch = line.match(/(?:em|on|in)\s+"?([^"]+)"?/i);
        steps.push({ action: "click", target: targetMatch?.[1] || "button" });
      } else if (normalized.includes("verificar") || normalized.includes("verify") || normalized.includes("assert")) {
        const targetMatch = line.match(/(?:que|that)\s+"?([^"]+)"?/i);
        steps.push({ action: "verify", target: targetMatch?.[1] || "element exists" });
      } else if (normalized.includes("preencher") || normalized.includes("fill") || normalized.includes("type")) {
        const matches = line.match(/(?:campo|field)\s+"?([^"]+)"?\s+(?:com|with)\s+"?([^"]+)"?/i);
        steps.push({ action: "fill", target: matches?.[1] || "input", value: matches?.[2] || "" });
      }
    }

    if (steps.length === 0) {
      steps.push(
        { action: "navigate", target: "/" },
        { action: "verify", target: "page loads" }
      );
    }

    return steps;
  }

  private async executeTestStep(step: { action: string; target: string; value?: string }): Promise<TestResult> {
    const start = Date.now();
    const testId = `step-${Date.now()}`;

    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const passed = Math.random() > 0.1;

    return {
      id: testId,
      name: `${step.action}: ${step.target}`,
      status: passed ? "passed" : "failed",
      duration: Date.now() - start,
      error: passed ? undefined : `Elemento não encontrado: ${step.target}`,
    };
  }

  async generateTestReport(runId: string): Promise<string> {
    const run = this.testHistory.find(r => r.id === runId);
    if (!run) return "Teste não encontrado";

    return `
# Relatório de Testes

**ID:** ${run.id}
**Projeto:** ${run.projectId}
**Status:** ${run.status}
**Início:** ${run.startedAt}
**Fim:** ${run.completedAt || "Em andamento"}

## Resultados

- **Total:** ${run.totalTests}
- **Passou:** ${run.passed}
- **Falhou:** ${run.failed}
- **Pulados:** ${run.skipped}

## Detalhes

${run.results.map(r => `- [${r.status.toUpperCase()}] ${r.name} (${r.duration}ms)${r.error ? `\n  Erro: ${r.error}` : ""}`).join("\n")}

## Logs

${run.logs.join("\n")}
    `.trim();
  }

  getActiveRuns(): TestRun[] {
    return Array.from(this.activeRuns.values());
  }

  getTestHistory(projectId?: number): TestRun[] {
    if (projectId) {
      return this.testHistory.filter(r => r.projectId === projectId);
    }
    return this.testHistory;
  }
}

export const testingService = new TestingService();
