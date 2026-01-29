import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { useTerminal } from "@/hooks/useTerminal";
import { Button } from "@/components/ui/button";
import { RotateCcw, X, Terminal as TerminalIcon, Maximize2, Minimize2 } from "lucide-react";
import "xterm/css/xterm.css";

interface TerminalProps {
  projectId?: number;
  className?: string;
  onClose?: () => void;
}

export function Terminal({ projectId, className = "", onClose }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  const { isConnected, cwd, connect, disconnect, sendInput, resize } = useTerminal({
    projectId,
    onConnect: (sessionId, workingDir) => {
      terminalRef.current?.writeln(`\x1b[32mConectado ao terminal\x1b[0m`);
      terminalRef.current?.writeln(`\x1b[90mDiretorio: ${workingDir}\x1b[0m`);
      terminalRef.current?.writeln("");
    },
    onOutput: (data) => {
      terminalRef.current?.write(data);
    },
    onExit: (code) => {
      terminalRef.current?.writeln("");
      terminalRef.current?.writeln(`\x1b[33mProcesso encerrado (codigo: ${code})\x1b[0m`);
    },
    onError: (message) => {
      terminalRef.current?.writeln(`\x1b[31mErro: ${message}\x1b[0m`);
    },
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
      theme: {
        background: "#1a1a2e",
        foreground: "#e4e4e7",
        cursor: "#22c55e",
        cursorAccent: "#1a1a2e",
        selectionBackground: "#3b3b5c",
        black: "#1a1a2e",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#e4e4e7",
        brightBlack: "#52525b",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(containerRef.current);
    fitAddon.fit();

    terminal.onData((data) => {
      sendInput(data);
    });

    terminal.onResize(({ cols, rows }) => {
      resize(cols, rows);
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.writeln("\x1b[36m=== BRATVACODER Terminal ===\x1b[0m");
    terminal.writeln("\x1b[90mClique em 'Conectar' para iniciar\x1b[0m");
    terminal.writeln("");

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      terminal.dispose();
      disconnect();
    };
  }, []);

  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, [isMaximized]);

  const handleReconnect = () => {
    if (terminalRef.current) {
      terminalRef.current.clear();
      terminalRef.current.writeln("\x1b[33mReconectando...\x1b[0m");
    }
    disconnect();
    setTimeout(() => {
      connect();
    }, 500);
  };

  return (
    <div
      className={`flex flex-col bg-[#1a1a2e] rounded-md overflow-hidden ${className} ${
        isMaximized ? "fixed inset-4 z-50" : ""
      }`}
      data-testid="terminal-container"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#16162a] border-b border-[#2a2a4a]">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-zinc-300">Terminal</span>
          {isConnected && (
            <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
              Conectado
            </span>
          )}
          {!isConnected && (
            <span className="px-2 py-0.5 text-xs bg-zinc-500/20 text-zinc-400 rounded">
              Desconectado
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isConnected ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={connect}
              className="h-7 px-2 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10"
              data-testid="button-terminal-connect"
            >
              Conectar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReconnect}
              className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-300"
              data-testid="button-terminal-reconnect"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reconectar
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsMaximized(!isMaximized)}
            className="h-7 w-7 text-zinc-400 hover:text-zinc-300"
            data-testid="button-terminal-maximize"
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </Button>

          {onClose && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-7 w-7 text-zinc-400 hover:text-red-400"
              data-testid="button-terminal-close"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 p-2 min-h-[300px]" />

      {cwd && (
        <div className="px-3 py-1 text-xs text-zinc-500 bg-[#16162a] border-t border-[#2a2a4a] truncate">
          {cwd}
        </div>
      )}
    </div>
  );
}
