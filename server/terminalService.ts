import { spawn, ChildProcess } from "child_process";
import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { workspaceService } from "./workspaceService";
import { terminalTokenStore } from "./terminalTokenStore";

interface TerminalSession {
  id: string;
  process: ChildProcess;
  ws: WebSocket;
  projectId?: number;
  userId: string;
  cwd: string;
  lastActivity: Date;
}

const sessions = new Map<string, TerminalSession>();
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MAX_SESSIONS_PER_USER = 5;

let cleanupInterval: NodeJS.Timeout | null = null;

function cleanupInactiveSessions(): void {
  const now = Date.now();
  const toRemove: string[] = [];

  sessions.forEach((session, id) => {
    const inactive = now - session.lastActivity.getTime();
    if (inactive > SESSION_TIMEOUT_MS) {
      toRemove.push(id);
    }
  });

  toRemove.forEach(id => {
    const session = sessions.get(id);
    if (session) {
      console.log(`[Terminal] Cleaning up inactive session ${id}`);
      try { session.process.kill("SIGTERM"); } catch (e) {}
      try { session.ws.close(); } catch (e) {}
      sessions.delete(id);
    }
  });
}

function countUserSessions(userId: string): number {
  let count = 0;
  sessions.forEach(s => {
    if (s.userId === userId) count++;
  });
  return count;
}

export function setupTerminalWebSocket(server: Server): void {
  // Start cleanup interval
  if (!cleanupInterval) {
    cleanupInterval = setInterval(cleanupInactiveSessions, 60000);
  }

  const wss = new WebSocketServer({ 
    server,
    path: "/ws/terminal"
  });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");
    
    // Require authentication token
    if (!token) {
      ws.send(JSON.stringify({ 
        type: "error", 
        message: "Token de autenticação necessário. Faça login primeiro." 
      }));
      ws.close(4001, "Unauthorized");
      return;
    }

    // Validate token using shared token store (one-time use, auto-expires)
    const tokenData = terminalTokenStore.validate(token);
    
    if (!tokenData.valid || !tokenData.userId) {
      ws.send(JSON.stringify({ 
        type: "error", 
        message: "Token inválido ou expirado. Faça login novamente." 
      }));
      ws.close(4001, "Invalid Token");
      return;
    }

    const userId = tokenData.userId;
    const projectId = tokenData.projectId;

    // Check user session limit
    if (countUserSessions(userId) >= MAX_SESSIONS_PER_USER) {
      ws.send(JSON.stringify({ 
        type: "error", 
        message: "Limite de sessões atingido. Feche algumas sessões primeiro." 
      }));
      ws.close(4029, "Too Many Sessions");
      return;
    }

    const sessionId = generateSessionId();
    
    // Use project workspace or a default sandbox
    let cwd = process.cwd();
    if (projectId) {
      cwd = workspaceService.getWorkspacePath(projectId);
    }

    const proc = spawn("/bin/bash", ["-c", `
      trap '' SIGINT SIGTERM
      export PS1='bratvacoder:\\w$ '
      export TERM=dumb
      exec /bin/bash --norc --noprofile -i
    `], {
      cwd,
      env: {
        ...process.env,
        TERM: "dumb",
        HOME: cwd,
        HISTFILE: '',
        PROJECT_ID: projectId?.toString() || '',
        USER_ID: userId,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    proc.stdin?.write('echo "Shell pronto!"\n');

    console.log(`[Terminal] Session ${sessionId} started for user ${userId} in ${cwd}`);

    const session: TerminalSession = {
      id: sessionId,
      process: proc,
      ws,
      projectId,
      userId,
      cwd,
      lastActivity: new Date(),
    };

    sessions.set(sessionId, session);

    ws.send(JSON.stringify({
      type: "connected",
      sessionId,
      cwd,
    }));

    proc.stdout?.on("data", (data: Buffer) => {
      session.lastActivity = new Date();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "output",
          data: data.toString("utf-8"),
        }));
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      session.lastActivity = new Date();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "output",
          data: data.toString("utf-8"),
        }));
      }
    });

    proc.on("exit", (code) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "exit",
          code,
        }));
      }
      sessions.delete(sessionId);
    });

    proc.on("error", (err) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "error",
          message: err.message,
        }));
      }
    });

    ws.on("message", (message: Buffer) => {
      session.lastActivity = new Date();
      
      try {
        const msg = JSON.parse(message.toString());
        
        switch (msg.type) {
          case "input":
            if (proc.stdin?.writable) {
              proc.stdin.write(msg.data);
            }
            break;
            
          case "resize":
            break;
            
          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;
        }
      } catch (err) {
        if (proc.stdin?.writable) {
          proc.stdin.write(message.toString());
        }
      }
    });

    ws.on("close", () => {
      proc.kill("SIGTERM");
      sessions.delete(sessionId);
    });

    ws.on("error", (err) => {
      console.error(`[Terminal] WebSocket error for session ${sessionId}:`, err.message);
      proc.kill("SIGTERM");
      sessions.delete(sessionId);
    });
  });

  console.log("[Terminal] WebSocket server initialized on /ws/terminal");
}

function generateSessionId(): string {
  return `term_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function getActiveSessionCount(): number {
  return sessions.size;
}

export function killSession(sessionId: string, userId?: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  if (userId && session.userId !== userId) {
    return false;
  }
  
  session.process.kill("SIGTERM");
  session.ws.close();
  sessions.delete(sessionId);
  return true;
}

export function killAllSessions(): void {
  sessions.forEach((session, id) => {
    session.process.kill("SIGTERM");
    session.ws.close();
    sessions.delete(id);
  });
}

export function listUserSessions(userId: string): { id: string; projectId?: number; createdAt: Date }[] {
  const result: { id: string; projectId?: number; createdAt: Date }[] = [];
  sessions.forEach((session, id) => {
    if (session.userId === userId) {
      result.push({
        id,
        projectId: session.projectId,
        createdAt: session.lastActivity,
      });
    }
  });
  return result;
}
