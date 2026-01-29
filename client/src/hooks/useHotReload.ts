import { useEffect, useCallback, useState, useRef } from "react";

interface HotReloadMessage {
  type: "connected" | "fileCreated" | "fileUpdated" | "fileDeleted" | "hotReload" | "processStarted" | "processStopped" | "refreshRequired" | "pong";
  projectId?: number;
  filePath?: string;
  port?: number;
  timestamp?: number;
}

interface UseHotReloadOptions {
  projectId: number | null;
  onFileChange?: (filePath: string, type: "created" | "updated" | "deleted") => void;
  onProcessChange?: (status: "started" | "stopped", port?: number) => void;
  onRefreshRequired?: () => void;
  enabled?: boolean;
}

export function useHotReload({
  projectId,
  onFileChange,
  onProcessChange,
  onRefreshRequired,
  enabled = true,
}: UseHotReloadOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (!projectId || !enabled) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/hotreload?projectId=${projectId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log("[HotReload] Connected to project", projectId);
      };

      ws.onmessage = (event) => {
        try {
          const message: HotReloadMessage = JSON.parse(event.data);

          switch (message.type) {
            case "connected":
              console.log("[HotReload] Session established");
              break;

            case "fileCreated":
              if (message.filePath) {
                setLastUpdate(message.timestamp || Date.now());
                onFileChange?.(message.filePath, "created");
              }
              break;

            case "fileUpdated":
              if (message.filePath) {
                setLastUpdate(message.timestamp || Date.now());
                onFileChange?.(message.filePath, "updated");
              }
              break;

            case "fileDeleted":
              if (message.filePath) {
                setLastUpdate(message.timestamp || Date.now());
                onFileChange?.(message.filePath, "deleted");
              }
              break;

            case "hotReload":
              setLastUpdate(message.timestamp || Date.now());
              onRefreshRequired?.();
              break;

            case "processStarted":
              onProcessChange?.("started", message.port);
              break;

            case "processStopped":
              onProcessChange?.("stopped");
              break;

            case "refreshRequired":
              onRefreshRequired?.();
              break;
          }
        } catch (err) {
          console.error("[HotReload] Message parse error:", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        
        if (enabled && projectId) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = (err) => {
        console.error("[HotReload] WebSocket error:", err);
      };
    } catch (err) {
      console.error("[HotReload] Connection error:", err);
    }
  }, [projectId, enabled, onFileChange, onProcessChange, onRefreshRequired]);

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
  }, []);

  const requestRefresh = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "requestRefresh" }));
    }
  }, []);

  useEffect(() => {
    if (projectId && enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [projectId, enabled, connect, disconnect]);

  return {
    isConnected,
    lastUpdate,
    requestRefresh,
    disconnect,
  };
}
