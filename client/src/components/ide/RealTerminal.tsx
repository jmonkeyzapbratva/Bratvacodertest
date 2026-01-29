import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Trash2, Terminal as TerminalIcon, RefreshCw } from "lucide-react";
import "xterm/css/xterm.css";

interface RealTerminalProps {
  projectId: number;
  className?: string;
}

export function RealTerminal({ projectId, className }: RealTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const hasValidProject = !!projectId && projectId > 0;

  const initTerminal = useCallback(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      theme: {
        background: "#1e1e1e",
        foreground: "#d4d4d4",
        cursor: "#d4d4d4",
        cursorAccent: "#1e1e1e",
        selectionBackground: "#264f78",
        black: "#1e1e1e",
        red: "#f44747",
        green: "#6a9955",
        yellow: "#dcdcaa",
        blue: "#569cd6",
        magenta: "#c586c0",
        cyan: "#4ec9b0",
        white: "#d4d4d4",
        brightBlack: "#808080",
        brightRed: "#f44747",
        brightGreen: "#6a9955",
        brightYellow: "#dcdcaa",
        brightBlue: "#569cd6",
        brightMagenta: "#c586c0",
        brightCyan: "#4ec9b0",
        brightWhite: "#ffffff",
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 10000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => {
      try {
        fitAddon.fit();
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "resize",
            cols: term.cols,
            rows: term.rows,
          }));
        }
      } catch (e) {}
    };

    window.addEventListener("resize", handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  const connect = async () => {
    if (isConnecting || isConnected || !hasValidProject) return;
    
    setIsConnecting(true);

    try {
      const response = await fetch("/api/pty/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) throw new Error("Failed to create PTY session");

      const { sessionId: newSessionId } = await response.json();
      setSessionId(newSessionId);

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/pty/${newSessionId}`);

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        xtermRef.current?.writeln("\x1b[32mConectado ao terminal.\x1b[0m\r\n");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "output") {
            xtermRef.current?.write(data.data);
          } else if (data.type === "exit") {
            xtermRef.current?.writeln(`\r\n\x1b[33mProcesso encerrado (código ${data.code})\x1b[0m`);
            setIsConnected(false);
          } else if (data.type === "error") {
            xtermRef.current?.writeln(`\r\n\x1b[31mErro: ${data.message}\x1b[0m`);
          }
        } catch (e) {
          xtermRef.current?.write(event.data);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        xtermRef.current?.writeln("\r\n\x1b[33mDesconectado do terminal.\x1b[0m");
      };

      ws.onerror = () => {
        setIsConnected(false);
        setIsConnecting(false);
        xtermRef.current?.writeln("\r\n\x1b[31mErro de conexão.\x1b[0m");
      };

      wsRef.current = ws;

      xtermRef.current?.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data }));
        }
      });

    } catch (error: any) {
      setIsConnecting(false);
      xtermRef.current?.writeln(`\x1b[31mErro: ${error.message}\x1b[0m\r\n`);
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setSessionId(null);
  };

  const clear = () => {
    xtermRef.current?.clear();
  };

  useEffect(() => {
    const cleanup = initTerminal();
    return () => {
      cleanup?.();
      disconnect();
      xtermRef.current?.dispose();
    };
  }, [initTerminal]);

  return (
    <div className={`flex flex-col h-full bg-[#1e1e1e] ${className || ""}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-zinc-700 bg-zinc-900">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-zinc-400" />
          <span className="text-xs text-zinc-400 font-mono">Terminal</span>
          <Badge 
            variant={isConnected ? "default" : "secondary"} 
            className={`text-[10px] ${isConnected ? "bg-green-500/20 text-green-400" : ""}`}
          >
            {isConnected ? "Conectado" : isConnecting ? "Conectando..." : "Desconectado"}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {hasValidProject ? (
            <>
              {!isConnected ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-green-400 hover:text-green-300"
                  onClick={connect}
                  disabled={isConnecting}
                  data-testid="button-connect-terminal"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Conectar
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-red-400 hover:text-red-300"
                  onClick={disconnect}
                  data-testid="button-disconnect-terminal"
                >
                  <Square className="w-3 h-3 mr-1" />
                  Desconectar
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-zinc-400 hover:text-zinc-300"
                onClick={() => { disconnect(); setTimeout(connect, 100); }}
                title="Reiniciar"
                data-testid="button-restart-terminal"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-zinc-400 hover:text-zinc-300"
                onClick={clear}
                title="Limpar"
                data-testid="button-clear-terminal"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <span className="text-xs text-zinc-500">Selecione um projeto</span>
          )}
        </div>
      </div>
      <div ref={terminalRef} className="flex-1 p-1" data-testid="real-terminal-container" />
    </div>
  );
}
