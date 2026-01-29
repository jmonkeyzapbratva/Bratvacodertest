import { useState, useCallback, useRef } from "react";
import type { AgentAction, ActionType, ActionStatus } from "@/components/ide/AgentActionBubble";

interface StreamEvent {
  type: "start" | "token" | "code_detected" | "file" | "files" | "file_created" | "file_error" | 
        "status" | "warning" | "command_start" | "command_complete" | "command_error" |
        "dev_server_start" | "complete" | "error" | "failed";
  data?: {
    message?: string;
    token?: string;
    filename?: string;
    content?: string;
    projectId?: number;
    filesCreated?: number;
    filesTotal?: number;
    isCodeReady?: boolean;
    workspaceError?: string;
    command?: string;
    success?: boolean;
    error?: string;
    files?: Array<{ filename: string; content: string }>;
  };
}

interface StreamingChatResult {
  projectId?: number;
  isCodeReady?: boolean;
  filesCreated?: number;
  filesTotal?: number;
  files?: Array<{ filename: string; content: string }>;
  devServerCommand?: string;
}

export function useStreamingChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [currentPhase, setCurrentPhase] = useState<string>("");
  const [filesProgress, setFilesProgress] = useState<{ created: number; total: number }>({ created: 0, total: 0 });
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const actionIdCounter = useRef(0);
  const currentActionIdRef = useRef<string>("");

  const addAction = useCallback((type: ActionType, title: string, description?: string): string => {
    const id = `action-${++actionIdCounter.current}`;
    const action: AgentAction = {
      id,
      type,
      title,
      description,
      status: "running",
      details: [],
      startTime: new Date(),
    };
    setActions(prev => [...prev, action]);
    currentActionIdRef.current = id;
    return id;
  }, []);

  const completeCurrentAction = useCallback((details?: string[]) => {
    const id = currentActionIdRef.current;
    if (!id) return;
    setActions(prev => prev.map(a => 
      a.id === id 
        ? { ...a, status: "completed" as ActionStatus, details: details || a.details, endTime: new Date() } 
        : a
    ));
  }, []);

  const failCurrentAction = useCallback((error: string) => {
    const id = currentActionIdRef.current;
    if (!id) return;
    setActions(prev => prev.map(a => 
      a.id === id 
        ? { ...a, status: "failed" as ActionStatus, error, endTime: new Date() } 
        : a
    ));
  }, []);

  const addDetailToCurrentAction = useCallback((detail: string) => {
    const id = currentActionIdRef.current;
    if (!id) return;
    setActions(prev => prev.map(a => 
      a.id === id 
        ? { ...a, details: [...(a.details || []), detail] }
        : a
    ));
  }, []);

  const streamMessage = useCallback(async (
    conversationId: number,
    message: string,
    onToken?: (token: string) => void,
    onComplete?: (result: StreamingChatResult) => void,
    onError?: (error: string) => void,
    model: string = "gpt-4o-mini"
  ) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsStreaming(true);
    setStreamedText("");
    setCurrentPhase("thinking");
    setFilesProgress({ created: 0, total: 0 });
    setActions([]);
    setStatusMessage("");
    
    addAction("thinking", "Analisando sua mensagem...");

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId, model }),
        credentials: "include",
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro na requisição");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Stream não disponível");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let result: StreamingChatResult = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            
            if (data === "[DONE]") {
              setCurrentPhase("done");
              await onComplete?.(result);
              setIsStreaming(false);
              return result;
            }

            try {
              const event: StreamEvent = JSON.parse(data);
              
              switch (event.type) {
                case "start":
                  completeCurrentAction();
                  addAction("generating", "Gerando codigo...");
                  setCurrentPhase("generating");
                  break;
                  
                case "token":
                  if (event.data?.token) {
                    fullText += event.data.token;
                    setStreamedText(fullText);
                    onToken?.(event.data.token);
                  }
                  break;
                  
                case "code_detected":
                case "files":
                  completeCurrentAction();
                  addAction("writing", "Salvando arquivos...");
                  setCurrentPhase("writing");
                  if (event.data?.files) {
                    setFilesProgress({ created: 0, total: event.data.files.length });
                  }
                  break;
                  
                case "file":
                case "file_created":
                  if (event.data?.filename) {
                    setFilesProgress(prev => ({ ...prev, created: prev.created + 1 }));
                    addDetailToCurrentAction(event.data.filename);
                    if (!result.files) result.files = [];
                    result.files.push({
                      filename: event.data.filename,
                      content: event.data.content || "",
                    });
                  }
                  break;

                case "file_error":
                  if (event.data?.filename) {
                    addDetailToCurrentAction(`Erro: ${event.data.filename}`);
                  }
                  break;

                case "status":
                  setStatusMessage(event.data?.message || "");
                  if (event.data?.message?.includes("Instalando")) {
                    completeCurrentAction();
                    addAction("installing", event.data.message);
                  } else if (event.data?.message?.includes("Iniciando")) {
                    completeCurrentAction();
                    addAction("running", event.data.message);
                  }
                  break;

                case "warning":
                  setStatusMessage(event.data?.message || "");
                  break;

                case "command_start":
                  completeCurrentAction();
                  addAction("command", `Executando: ${event.data?.command}`);
                  break;

                case "command_complete":
                  if (event.data?.success) {
                    completeCurrentAction();
                  } else {
                    failCurrentAction(event.data?.error || "Comando falhou");
                  }
                  break;

                case "command_error":
                  failCurrentAction(event.data?.error || "Erro ao executar comando");
                  break;

                case "dev_server_start":
                  result.devServerCommand = event.data?.command;
                  completeCurrentAction();
                  addAction("running", `Servidor iniciado: ${event.data?.command}`);
                  break;
                  
                case "complete":
                  completeCurrentAction();
                  result.projectId = event.data?.projectId;
                  result.isCodeReady = event.data?.isCodeReady;
                  result.filesCreated = event.data?.filesCreated;
                  result.filesTotal = event.data?.filesTotal;
                  setFilesProgress({ 
                    created: event.data?.filesCreated || 0, 
                    total: event.data?.filesTotal || 0 
                  });
                  break;
                  
                case "error":
                case "failed":
                  failCurrentAction(event.data?.message || "Erro desconhecido");
                  throw new Error(event.data?.message || "Erro desconhecido");
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) continue;
              throw parseError;
            }
          }
        }
      }

      await onComplete?.(result);
      setIsStreaming(false);
      return result;
    } catch (error: any) {
      if (error.name === "AbortError") {
        setIsStreaming(false);
        return null;
      }
      setIsStreaming(false);
      setCurrentPhase("error");
      onError?.(error.message);
      throw error;
    }
  }, []);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setCurrentPhase("");
  }, []);

  const clearActions = useCallback(() => {
    setActions([]);
  }, []);

  return {
    isStreaming,
    streamedText,
    currentPhase,
    filesProgress,
    actions,
    statusMessage,
    streamMessage,
    abort,
    clearActions,
  };
}
