import { WebSocket, WebSocketServer } from "ws";
import { Server, IncomingMessage } from "http";
import { parse as parseUrl } from "url";
import { storage } from "./storage";
import * as sharingService from "./sharingService";

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursor?: CursorPosition;
  selection?: SelectionRange;
}

export interface CursorPosition {
  line: number;
  column: number;
  filePath: string;
}

export interface SelectionRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  filePath: string;
}

export interface CollaborationMessage {
  type: 
    | "join" 
    | "leave" 
    | "cursor" 
    | "selection" 
    | "edit" 
    | "sync" 
    | "chat"
    | "collaborators"
    | "file-change";
  projectId: number;
  userId: string;
  userName?: string;
  payload: any;
}

export interface TextOperation {
  type: "insert" | "delete" | "replace";
  filePath: string;
  position: { line: number; column: number };
  text?: string;
  length?: number;
  newText?: string;
}

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
];

class CollaborationRoom {
  projectId: number;
  collaborators: Map<string, { ws: WebSocket; collaborator: Collaborator }> = new Map();
  fileContents: Map<string, string> = new Map();
  operationHistory: TextOperation[] = [];
  chatHistory: Array<{ userId: string; userName: string; message: string; timestamp: Date }> = [];
  
  constructor(projectId: number) {
    this.projectId = projectId;
  }
  
  addCollaborator(userId: string, userName: string, ws: WebSocket): Collaborator {
    const colorIndex = this.collaborators.size % COLORS.length;
    const collaborator: Collaborator = {
      id: userId,
      name: userName,
      color: COLORS[colorIndex],
    };
    
    this.collaborators.set(userId, { ws, collaborator });
    return collaborator;
  }
  
  removeCollaborator(userId: string): void {
    this.collaborators.delete(userId);
  }
  
  getCollaborators(): Collaborator[] {
    return Array.from(this.collaborators.values()).map(c => c.collaborator);
  }
  
  updateCursor(userId: string, cursor: CursorPosition): void {
    const entry = this.collaborators.get(userId);
    if (entry) {
      entry.collaborator.cursor = cursor;
    }
  }
  
  updateSelection(userId: string, selection: SelectionRange): void {
    const entry = this.collaborators.get(userId);
    if (entry) {
      entry.collaborator.selection = selection;
    }
  }
  
  applyOperation(operation: TextOperation): void {
    this.operationHistory.push(operation);
    
    if (this.operationHistory.length > 1000) {
      this.operationHistory = this.operationHistory.slice(-500);
    }
  }
  
  addChatMessage(userId: string, userName: string, message: string): void {
    this.chatHistory.push({
      userId,
      userName,
      message,
      timestamp: new Date(),
    });
    
    if (this.chatHistory.length > 100) {
      this.chatHistory = this.chatHistory.slice(-50);
    }
  }
  
  broadcast(message: CollaborationMessage, excludeUserId?: string): void {
    const messageStr = JSON.stringify(message);
    
    this.collaborators.forEach(({ ws }, odUserId) => {
      if (odUserId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }
  
  sendTo(userId: string, message: CollaborationMessage): void {
    const entry = this.collaborators.get(userId);
    if (entry && entry.ws.readyState === WebSocket.OPEN) {
      entry.ws.send(JSON.stringify(message));
    }
  }
  
  isEmpty(): boolean {
    return this.collaborators.size === 0;
  }
}

class CollaborationService {
  private wss: WebSocketServer | null = null;
  private rooms: Map<number, CollaborationRoom> = new Map();
  private userSockets: Map<WebSocket, { userId: string; projectId: number; authenticated: boolean }> = new Map();
  private pendingAuth: Map<WebSocket, NodeJS.Timeout> = new Map();
  
  initialize(httpServer: Server): void {
    this.wss = new WebSocketServer({ 
      server: httpServer, 
      path: "/ws/collaboration" 
    });
    
    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      console.log("Collaboration WebSocket connected");
      
      const timeout = setTimeout(() => {
        if (!this.userSockets.get(ws)?.authenticated) {
          console.log("WebSocket authentication timeout - closing connection");
          ws.close(4001, "Authentication timeout");
        }
        this.pendingAuth.delete(ws);
      }, 30000);
      
      this.pendingAuth.set(ws, timeout);
      
      ws.on("message", (data: Buffer) => {
        try {
          const message: CollaborationMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error("Error parsing collaboration message:", error);
          ws.send(JSON.stringify({ type: "error", payload: { message: "Invalid message format" } }));
        }
      });
      
      ws.on("close", () => {
        const timeout = this.pendingAuth.get(ws);
        if (timeout) {
          clearTimeout(timeout);
          this.pendingAuth.delete(ws);
        }
        this.handleDisconnect(ws);
      });
      
      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.handleDisconnect(ws);
      });
    });
    
    console.log("Collaboration WebSocket server initialized at /ws/collaboration");
  }
  
  private async validateAccess(projectId: number, userId: string): Promise<boolean> {
    if (!projectId || !userId || typeof projectId !== "number") {
      return false;
    }
    
    try {
      const access = await sharingService.checkAccess(projectId, userId);
      return access.hasAccess;
    } catch (error) {
      console.error("Error validating access:", error);
      return false;
    }
  }
  
  private handleMessage(ws: WebSocket, message: CollaborationMessage): void {
    const socketInfo = this.userSockets.get(ws);
    
    if (message.type === "join") {
      this.handleJoin(ws, message);
      return;
    }
    
    if (!socketInfo?.authenticated) {
      ws.send(JSON.stringify({ type: "error", payload: { message: "Not authenticated" } }));
      return;
    }
    
    if (socketInfo.userId !== message.userId) {
      ws.send(JSON.stringify({ type: "error", payload: { message: "User ID mismatch" } }));
      return;
    }
    
    switch (message.type) {
      case "leave":
        this.handleLeave(ws, message);
        break;
      case "cursor":
        this.handleCursor(ws, message);
        break;
      case "selection":
        this.handleSelection(ws, message);
        break;
      case "edit":
        this.handleEdit(ws, message);
        break;
      case "chat":
        this.handleChat(ws, message);
        break;
      case "file-change":
        this.handleFileChange(ws, message);
        break;
    }
  }
  
  private async handleJoin(ws: WebSocket, message: CollaborationMessage): Promise<void> {
    const { projectId, userId, userName } = message;
    
    if (!projectId || !userId) {
      ws.send(JSON.stringify({ type: "error", payload: { message: "projectId and userId are required" } }));
      ws.close(4002, "Invalid join request");
      return;
    }
    
    const hasAccess = await this.validateAccess(projectId, userId);
    if (!hasAccess) {
      ws.send(JSON.stringify({ type: "error", payload: { message: "Access denied to project" } }));
      ws.close(4003, "Access denied");
      return;
    }
    
    const timeout = this.pendingAuth.get(ws);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingAuth.delete(ws);
    }
    
    let room = this.rooms.get(projectId);
    if (!room) {
      room = new CollaborationRoom(projectId);
      this.rooms.set(projectId, room);
    }
    
    const collaborator = room.addCollaborator(userId, userName || "Anonymous", ws);
    this.userSockets.set(ws, { userId, projectId, authenticated: true });
    
    room.sendTo(userId, {
      type: "sync",
      projectId,
      userId,
      payload: {
        collaborators: room.getCollaborators(),
        chatHistory: room.chatHistory.slice(-20),
      },
    });
    
    room.broadcast({
      type: "join",
      projectId,
      userId,
      userName: collaborator.name,
      payload: { collaborator },
    }, userId);
    
    room.broadcast({
      type: "collaborators",
      projectId,
      userId,
      payload: { collaborators: room.getCollaborators() },
    });
    
    console.log(`User ${userName} joined project ${projectId} (authenticated)`);
  }
  
  private handleLeave(ws: WebSocket, message: CollaborationMessage): void {
    const info = this.userSockets.get(ws);
    if (!info) return;
    
    const room = this.rooms.get(info.projectId);
    if (!room) return;
    
    room.removeCollaborator(info.userId);
    this.userSockets.delete(ws);
    
    room.broadcast({
      type: "leave",
      projectId: info.projectId,
      userId: info.userId,
      payload: {},
    });
    
    room.broadcast({
      type: "collaborators",
      projectId: info.projectId,
      userId: info.userId,
      payload: { collaborators: room.getCollaborators() },
    });
    
    if (room.isEmpty()) {
      this.rooms.delete(info.projectId);
    }
    
    console.log(`User ${info.userId} left project ${info.projectId}`);
  }
  
  private handleDisconnect(ws: WebSocket): void {
    const info = this.userSockets.get(ws);
    if (info) {
      this.handleLeave(ws, {
        type: "leave",
        projectId: info.projectId,
        userId: info.userId,
        payload: {},
      });
    }
  }
  
  private handleCursor(ws: WebSocket, message: CollaborationMessage): void {
    const info = this.userSockets.get(ws);
    if (!info) return;
    
    const room = this.rooms.get(info.projectId);
    if (!room) return;
    
    room.updateCursor(info.userId, message.payload.cursor);
    
    room.broadcast({
      type: "cursor",
      projectId: info.projectId,
      userId: info.userId,
      payload: { cursor: message.payload.cursor },
    }, info.userId);
  }
  
  private handleSelection(ws: WebSocket, message: CollaborationMessage): void {
    const info = this.userSockets.get(ws);
    if (!info) return;
    
    const room = this.rooms.get(info.projectId);
    if (!room) return;
    
    room.updateSelection(info.userId, message.payload.selection);
    
    room.broadcast({
      type: "selection",
      projectId: info.projectId,
      userId: info.userId,
      payload: { selection: message.payload.selection },
    }, info.userId);
  }
  
  private handleEdit(ws: WebSocket, message: CollaborationMessage): void {
    const info = this.userSockets.get(ws);
    if (!info) return;
    
    const room = this.rooms.get(info.projectId);
    if (!room) return;
    
    const operation: TextOperation = message.payload.operation;
    room.applyOperation(operation);
    
    room.broadcast({
      type: "edit",
      projectId: info.projectId,
      userId: info.userId,
      payload: { operation },
    }, info.userId);
  }
  
  private handleChat(ws: WebSocket, message: CollaborationMessage): void {
    const info = this.userSockets.get(ws);
    if (!info) return;
    
    const room = this.rooms.get(info.projectId);
    if (!room) return;
    
    const entry = room.collaborators.get(info.userId);
    const userName = entry?.collaborator.name || "Anonymous";
    
    room.addChatMessage(info.userId, userName, message.payload.message);
    
    room.broadcast({
      type: "chat",
      projectId: info.projectId,
      userId: info.userId,
      userName,
      payload: { 
        message: message.payload.message,
        timestamp: new Date().toISOString(),
      },
    });
  }
  
  private handleFileChange(ws: WebSocket, message: CollaborationMessage): void {
    const info = this.userSockets.get(ws);
    if (!info) return;
    
    const room = this.rooms.get(info.projectId);
    if (!room) return;
    
    room.broadcast({
      type: "file-change",
      projectId: info.projectId,
      userId: info.userId,
      payload: message.payload,
    }, info.userId);
  }
  
  getRoomInfo(projectId: number): { collaborators: Collaborator[]; chatHistory: any[] } | null {
    const room = this.rooms.get(projectId);
    if (!room) return null;
    
    return {
      collaborators: room.getCollaborators(),
      chatHistory: room.chatHistory,
    };
  }
  
  getActiveRooms(): number[] {
    return Array.from(this.rooms.keys());
  }
}

export const collaborationService = new CollaborationService();
