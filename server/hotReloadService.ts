import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { workspaceService } from "./workspaceService";

interface HotReloadClient {
  ws: WebSocket;
  projectId: number;
}

const clients = new Map<WebSocket, HotReloadClient>();

export function setupHotReloadWebSocket(server: Server): void {
  const wss = new WebSocketServer({ 
    server,
    path: "/ws/hotreload"
  });

  workspaceService.on("fileCreated", ({ projectId, filePath }) => {
    notifyClients(projectId, {
      type: "fileCreated",
      filePath,
      timestamp: Date.now(),
    });
  });

  workspaceService.on("fileUpdated", ({ projectId, filePath }) => {
    notifyClients(projectId, {
      type: "fileUpdated",
      filePath,
      timestamp: Date.now(),
    });
  });

  workspaceService.on("fileDeleted", ({ projectId, filePath }) => {
    notifyClients(projectId, {
      type: "fileDeleted",
      filePath,
      timestamp: Date.now(),
    });
  });

  workspaceService.on("processStarted", ({ projectId, port }) => {
    notifyClients(projectId, {
      type: "processStarted",
      port,
      timestamp: Date.now(),
    });
  });

  workspaceService.on("processStopped", ({ projectId }) => {
    notifyClients(projectId, {
      type: "processStopped",
      timestamp: Date.now(),
    });
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const projectIdStr = url.searchParams.get("projectId");
    
    if (!projectIdStr) {
      ws.close(1008, "projectId required");
      return;
    }

    const projectId = parseInt(projectIdStr);
    
    clients.set(ws, { ws, projectId });
    
    ws.send(JSON.stringify({
      type: "connected",
      projectId,
      timestamp: Date.now(),
    }));

    ws.on("message", (message: Buffer) => {
      try {
        const msg = JSON.parse(message.toString());
        
        switch (msg.type) {
          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;
            
          case "requestRefresh":
            ws.send(JSON.stringify({
              type: "refreshRequired",
              timestamp: Date.now(),
            }));
            break;
        }
      } catch (err) {
        console.error("Hot reload message parse error:", err);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", (err) => {
      console.error("Hot reload WebSocket error:", err);
      clients.delete(ws);
    });
  });

  console.log("Hot reload WebSocket initialized at /ws/hotreload");
}

function notifyClients(projectId: number, message: object): void {
  const payload = JSON.stringify(message);
  
  clients.forEach((client, ws) => {
    if (client.projectId === projectId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

export function triggerHotReload(projectId: number): void {
  notifyClients(projectId, {
    type: "hotReload",
    timestamp: Date.now(),
  });
}
