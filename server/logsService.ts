import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";

interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
  source?: string;
  projectId?: number;
}

class LogsService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, { ws: WebSocket; projectId?: number }> = new Map();
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  initialize(httpServer: Server): void {
    this.wss = new WebSocketServer({ 
      server: httpServer,
      path: "/ws/logs"
    });
    
    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      this.handleConnection(ws, url);
    });

    console.log("[Logs] WebSocket server initialized on /ws/logs");
  }

  private handleConnection(ws: WebSocket, url: URL): void {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const projectId = url.searchParams.get("projectId");
    
    this.clients.set(clientId, { 
      ws, 
      projectId: projectId ? parseInt(projectId) : undefined 
    });

    ws.send(JSON.stringify({
      type: "connected",
      message: "Conectado ao sistema de logs",
      bufferedLogs: this.logBuffer.slice(-20),
    }));

    ws.on("close", () => {
      this.clients.delete(clientId);
    });

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "subscribe" && data.projectId) {
          const client = this.clients.get(clientId);
          if (client) {
            client.projectId = data.projectId;
          }
        }
      } catch {}
    });
  }

  log(level: LogEntry["level"], message: string, source?: string, projectId?: number): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      source,
      projectId,
    };

    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    this.broadcast(entry);
  }

  debug(message: string, source?: string, projectId?: number): void {
    this.log("debug", message, source, projectId);
  }

  info(message: string, source?: string, projectId?: number): void {
    this.log("info", message, source, projectId);
  }

  warn(message: string, source?: string, projectId?: number): void {
    this.log("warn", message, source, projectId);
  }

  error(message: string, source?: string, projectId?: number): void {
    this.log("error", message, source, projectId);
  }

  private broadcast(entry: LogEntry): void {
    const message = JSON.stringify({ type: "log", data: entry });
    
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        if (!client.projectId || !entry.projectId || client.projectId === entry.projectId) {
          client.ws.send(message);
        }
      }
    });
  }

  getRecentLogs(count = 50, projectId?: number): LogEntry[] {
    let logs = this.logBuffer;
    if (projectId) {
      logs = logs.filter(l => !l.projectId || l.projectId === projectId);
    }
    return logs.slice(-count);
  }
}

export const logsService = new LogsService();
