import { logsService } from "./logsService";

interface HealthCheckResult {
  status: "healthy" | "unhealthy" | "unknown";
  responseTime?: number;
  statusCode?: number;
  error?: string;
  checkedAt: string;
}

interface ProjectHealth {
  projectId: number;
  lastCheck: HealthCheckResult | null;
  consecutiveFailures: number;
}

class HealthCheckService {
  private projectHealth: Map<number, ProjectHealth> = new Map();
  private intervals: Map<number, ReturnType<typeof setInterval>> = new Map();
  private checkInterval = 30000;

  async checkProjectHealth(projectId: number, previewUrl?: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    if (!previewUrl) {
      return {
        status: "unknown",
        error: "No preview URL configured",
        checkedAt: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(previewUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "User-Agent": "BRATVACODER-HealthCheck/1.0",
        },
      });
      
      clearTimeout(timeout);
      
      const responseTime = Date.now() - startTime;
      const isHealthy = response.status >= 200 && response.status < 400;
      
      const result: HealthCheckResult = {
        status: isHealthy ? "healthy" : "unhealthy",
        responseTime,
        statusCode: response.status,
        checkedAt: new Date().toISOString(),
      };
      
      this.updateProjectHealth(projectId, result);
      
      if (isHealthy) {
        logsService.info(`Health check OK: ${previewUrl} (${responseTime}ms)`, "healthcheck", projectId);
      } else {
        logsService.warn(`Health check failed: ${previewUrl} - Status ${response.status}`, "healthcheck", projectId);
      }
      
      return result;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        status: "unhealthy",
        responseTime,
        error: error.name === "AbortError" ? "Request timeout" : error.message,
        checkedAt: new Date().toISOString(),
      };
      
      this.updateProjectHealth(projectId, result);
      logsService.error(`Health check error: ${previewUrl} - ${result.error}`, "healthcheck", projectId);
      
      return result;
    }
  }

  private updateProjectHealth(projectId: number, result: HealthCheckResult): void {
    const existing = this.projectHealth.get(projectId) || {
      projectId,
      lastCheck: null,
      consecutiveFailures: 0,
    };

    if (result.status === "healthy") {
      existing.consecutiveFailures = 0;
    } else if (result.status === "unhealthy") {
      existing.consecutiveFailures++;
    }

    existing.lastCheck = result;
    this.projectHealth.set(projectId, existing);
  }

  getProjectHealth(projectId: number): ProjectHealth | null {
    return this.projectHealth.get(projectId) || null;
  }

  startMonitoring(projectId: number, previewUrl: string): void {
    if (this.intervals.has(projectId)) {
      this.stopMonitoring(projectId);
    }

    this.checkProjectHealth(projectId, previewUrl);

    const interval = setInterval(() => {
      this.checkProjectHealth(projectId, previewUrl);
    }, this.checkInterval);

    this.intervals.set(projectId, interval);
    logsService.info(`Started health monitoring for project ${projectId}`, "healthcheck", projectId);
  }

  stopMonitoring(projectId: number): void {
    const interval = this.intervals.get(projectId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(projectId);
      logsService.info(`Stopped health monitoring for project ${projectId}`, "healthcheck", projectId);
    }
  }

  getMonitoredProjects(): number[] {
    return Array.from(this.intervals.keys());
  }
}

export const healthCheckService = new HealthCheckService();
