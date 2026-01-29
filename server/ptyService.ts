import { spawn, ChildProcess } from "child_process";
import { WebSocket } from "ws";
import path from "path";
import fs from "fs";

interface PtySession {
  id: string;
  process: ChildProcess;
  ws: WebSocket | null;
  projectId: number;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  buffer: string;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS_PER_USER = 5;
const MAX_BUFFER_SIZE = 100000; // 100KB max buffer

class PtyService {
  private sessions: Map<string, PtySession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 60000); // Check every minute
  }

  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const sessionsToRemove: string[] = [];

    this.sessions.forEach((session, id) => {
      const inactiveTime = now - session.lastActivity.getTime();
      if (inactiveTime > SESSION_TIMEOUT_MS) {
        sessionsToRemove.push(id);
      }
    });

    sessionsToRemove.forEach(id => {
      console.log(`[PTY] Cleaning up inactive session ${id}`);
      this.closeSession(id);
    });
  }

  private getWorkspacePath(projectId: number): string {
    const workspacesDir = path.join(process.cwd(), "workspaces");
    return path.join(workspacesDir, `project_${projectId}`);
  }

  private countUserSessions(userId: string): number {
    let count = 0;
    this.sessions.forEach(session => {
      if (session.userId === userId) count++;
    });
    return count;
  }

  createSession(projectId: number, userId: string): { id: string | null; error?: string } {
    if (this.countUserSessions(userId) >= MAX_SESSIONS_PER_USER) {
      return { id: null, error: "Limite de sessões atingido. Feche algumas sessões primeiro." };
    }

    const id = `pty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const workspacePath = this.getWorkspacePath(projectId);
    
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }

    const shell = process.env.SHELL || "/bin/bash";
    
    const proc = spawn(shell, ["-i"], {
      cwd: workspacePath,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        PS1: "\\[\\033[32m\\]bratvacoder:\\[\\033[34m\\]\\W\\[\\033[0m\\]$ ",
        HOME: workspacePath,
        PROJECT_ID: String(projectId),
        USER_ID: userId,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const session: PtySession = {
      id,
      process: proc,
      ws: null,
      projectId,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      buffer: "",
    };

    this.sessions.set(id, session);

    proc.stdout?.on("data", (data) => {
      const output = data.toString();
      session.lastActivity = new Date();
      
      session.buffer += output;
      if (session.buffer.length > MAX_BUFFER_SIZE) {
        session.buffer = session.buffer.slice(-MAX_BUFFER_SIZE);
      }
      
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({ type: "output", data: output }));
      }
    });

    proc.stderr?.on("data", (data) => {
      const output = data.toString();
      session.lastActivity = new Date();
      
      session.buffer += output;
      if (session.buffer.length > MAX_BUFFER_SIZE) {
        session.buffer = session.buffer.slice(-MAX_BUFFER_SIZE);
      }
      
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({ type: "output", data: output }));
      }
    });

    proc.on("exit", (code) => {
      console.log(`[PTY] Session ${id} exited with code ${code}`);
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({ type: "exit", code }));
      }
      this.sessions.delete(id);
    });

    proc.on("error", (error) => {
      console.error(`[PTY] Session ${id} error:`, error);
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({ type: "error", message: error.message }));
      }
    });

    console.log(`[PTY] Session ${id} created for project ${projectId}, user ${userId}, cwd: ${workspacePath}`);
    return { id };
  }

  validateSession(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    return session.userId === userId;
  }

  attachWebSocket(sessionId: string, ws: WebSocket, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    if (session.userId !== userId) {
      console.warn(`[PTY] Unauthorized attach attempt: session ${sessionId} belongs to ${session.userId}, not ${userId}`);
      return false;
    }

    session.ws = ws;
    session.lastActivity = new Date();

    if (session.buffer) {
      ws.send(JSON.stringify({ type: "output", data: session.buffer }));
    }

    ws.on("message", (message) => {
      session.lastActivity = new Date();
      
      try {
        const parsed = JSON.parse(message.toString());
        
        if (parsed.type === "input") {
          session.process.stdin?.write(parsed.data);
        } else if (parsed.type === "resize") {
          // Note: resize not supported without node-pty
        }
      } catch (e) {
        if (typeof message === "string" || Buffer.isBuffer(message)) {
          session.process.stdin?.write(message.toString());
        }
      }
    });

    ws.on("close", () => {
      session.ws = null;
    });

    return true;
  }

  writeToSession(sessionId: string, data: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    if (session.userId !== userId) return false;
    
    session.lastActivity = new Date();
    session.process.stdin?.write(data);
    return true;
  }

  closeSession(sessionId: string, userId?: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    if (userId && session.userId !== userId) {
      console.warn(`[PTY] Unauthorized close attempt: session ${sessionId}`);
      return false;
    }

    try {
      session.process.kill();
    } catch (e) {}

    if (session.ws) {
      try {
        session.ws.close();
      } catch (e) {}
    }

    this.sessions.delete(sessionId);
    console.log(`[PTY] Session ${sessionId} closed`);
    return true;
  }

  getSession(sessionId: string, userId?: string): PtySession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    if (userId && session.userId !== userId) return undefined;
    return session;
  }

  listSessions(userId: string, projectId?: number): { id: string; projectId: number; createdAt: Date }[] {
    const sessions: { id: string; projectId: number; createdAt: Date }[] = [];
    
    this.sessions.forEach((session, id) => {
      if (session.userId === userId) {
        if (!projectId || session.projectId === projectId) {
          sessions.push({
            id,
            projectId: session.projectId,
            createdAt: session.createdAt,
          });
        }
      }
    });
    
    return sessions;
  }

  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.forEach((_, id) => {
      this.closeSession(id);
    });
  }
}

export const ptyService = new PtyService();
