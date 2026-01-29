import { useState, useEffect, useRef, useCallback } from "react";

interface TerminalMessage {
  type: "connected" | "output" | "exit" | "error" | "pong";
  sessionId?: string;
  cwd?: string;
  data?: string;
  code?: number;
  message?: string;
}

interface UseTerminalOptions {
  projectId?: number;
  onConnect?: (sessionId: string, cwd: string) => void;
  onOutput?: (data: string) => void;
  onExit?: (code: number) => void;
  onError?: (message: string) => void;
}

async function getTerminalToken(projectId?: number): Promise<string | null> {
  try {
    const response = await fetch("/api/terminal/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
      credentials: "include",
    });
    
    if (!response.ok) {
      console.error("[Terminal] Failed to get token:", response.status);
      return null;
    }
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("[Terminal] Token request error:", error);
    return null;
  }
}

export function useTerminal(options: UseTerminalOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cwd, setCwd] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Get authentication token first
    const token = await getTerminalToken(options.projectId);
    if (!token) {
      options.onError?.("Falha na autenticação. Faça login novamente.");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/terminal?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg: TerminalMessage = JSON.parse(event.data);
        
        switch (msg.type) {
          case "connected":
            setSessionId(msg.sessionId || null);
            setCwd(msg.cwd || "");
            options.onConnect?.(msg.sessionId || "", msg.cwd || "");
            break;
            
          case "output":
            options.onOutput?.(msg.data || "");
            break;
            
          case "exit":
            options.onExit?.(msg.code || 0);
            setIsConnected(false);
            break;
            
          case "error":
            options.onError?.(msg.message || "Unknown error");
            break;
        }
      } catch (err) {
        options.onOutput?.(event.data);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setSessionId(null);
      wsRef.current = null;
    };

    ws.onerror = () => {
      setIsConnected(false);
    };
  }, [options.projectId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setSessionId(null);
  }, []);

  const sendInput = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "input", data }));
    }
  }, []);

  const resize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "resize", cols, rows }));
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    sessionId,
    cwd,
    connect,
    disconnect,
    sendInput,
    resize,
  };
}
