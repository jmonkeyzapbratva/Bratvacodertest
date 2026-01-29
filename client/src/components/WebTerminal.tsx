import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { webcontainerService } from "@/lib/webcontainerService";
import { Button } from "@/components/ui/button";
import { Play, Square, RefreshCw, Terminal as TerminalIcon } from "lucide-react";
import "xterm/css/xterm.css";

interface WebTerminalProps {
  className?: string;
  onServerReady?: (port: number, url: string) => void;
}

export function WebTerminal({ className, onServerReady }: WebTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const currentLineRef = useRef("");

  const showPrompt = useCallback(() => {
    if (!xtermRef.current) return;
    xtermRef.current.write("\x1b[32m$ \x1b[0m");
  }, []);

  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim()) {
      showPrompt();
      return;
    }

    commandHistory.current.push(command);
    historyIndex.current = commandHistory.current.length;

    const parts = command.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    if (webcontainerService.isRunning()) {
      xtermRef.current?.writeln("\x1b[31mUm processo ja esta em execucao. Aguarde ou encerre-o.\x1b[0m");
      showPrompt();
      return;
    }

    setIsRunning(true);

    try {
      if (cmd === "clear" || cmd === "cls") {
        xtermRef.current?.clear();
        showPrompt();
        setIsRunning(false);
        return;
      }

      if (cmd === "help") {
        xtermRef.current?.writeln("\x1b[36mComandos disponiveis:\x1b[0m");
        xtermRef.current?.writeln("  clear, cls     - Limpa o terminal");
        xtermRef.current?.writeln("  help           - Mostra esta ajuda");
        xtermRef.current?.writeln("  npm [args]     - Executa npm");
        xtermRef.current?.writeln("  node [file]    - Executa arquivo Node.js");
        xtermRef.current?.writeln("  ls [dir]       - Lista arquivos");
        showPrompt();
        setIsRunning(false);
        return;
      }

      await webcontainerService.runCommand(cmd, args);
    } catch (error: any) {
      xtermRef.current?.writeln(`\x1b[31mErro: ${error.message}\x1b[0m`);
    } finally {
      setIsRunning(false);
      showPrompt();
    }
  }, [showPrompt]);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const terminal = new Terminal({
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
      fontFamily: "JetBrains Mono, Consolas, Monaco, monospace",
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 1000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.writeln("\x1b[36m  ____  ____      _____ _____   ___    ____ ___  ____  _____ ____");
    terminal.writeln(" | __ )|  _ \\    / ____|  __ \\ / _ \\  / ___/ _ \\|  _ \\| ____|  _ \\");
    terminal.writeln(" |  _ \\| |_) |  | |    | |  | | | | || |  | | | | | | |  _| | |_) |");
    terminal.writeln(" | |_) |  _ <   | |    | |  | | | | || |  | | | | | | | |___|  _ <");
    terminal.writeln(" |____/|_| \\_\\  |____ |____/ \\___/  \\____\\___/|____/|_____|_| \\_\\\x1b[0m");
    terminal.writeln("");
    terminal.writeln("\x1b[33mTerminal WebContainer - Node.js no navegador\x1b[0m");
    terminal.writeln("Digite 'help' para ver comandos disponiveis.");
    terminal.writeln("");

    const removeOutputCallback = webcontainerService.addOutputCallback((data: string) => {
      terminal.write(data);
    });

    const removeServerCallback = webcontainerService.addServerReadyCallback((port: number, url: string) => {
      terminal.writeln(`\r\n\x1b[32mServidor rodando em ${url}:${port}\x1b[0m`);
      onServerReady?.(port, url);
    });

    terminal.onKey(({ key, domEvent }) => {
      const code = domEvent.keyCode;

      if (domEvent.keyCode === 13) {
        terminal.write("\r\n");
        executeCommand(currentLineRef.current);
        currentLineRef.current = "";
      } else if (code === 8) {
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          terminal.write("\b \b");
        }
      } else if (code === 38) {
        if (historyIndex.current > 0) {
          historyIndex.current--;
          const historyCmd = commandHistory.current[historyIndex.current];
          terminal.write("\x1b[2K\r\x1b[32m$ \x1b[0m" + historyCmd);
          currentLineRef.current = historyCmd;
        }
      } else if (code === 40) {
        if (historyIndex.current < commandHistory.current.length - 1) {
          historyIndex.current++;
          const historyCmd = commandHistory.current[historyIndex.current];
          terminal.write("\x1b[2K\r\x1b[32m$ \x1b[0m" + historyCmd);
          currentLineRef.current = historyCmd;
        } else {
          historyIndex.current = commandHistory.current.length;
          terminal.write("\x1b[2K\r\x1b[32m$ \x1b[0m");
          currentLineRef.current = "";
        }
      } else if (key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey) {
        currentLineRef.current += key;
        terminal.write(key);
      }
    });

    webcontainerService.boot().then(() => {
      terminal.writeln("\x1b[32mWebContainer pronto!\x1b[0m");
      terminal.write("\x1b[32m$ \x1b[0m");
      setIsReady(true);
    }).catch((error: any) => {
      terminal.writeln(`\x1b[31mErro ao iniciar WebContainer: ${error.message}\x1b[0m`);
    });

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      removeOutputCallback();
      removeServerCallback();
      terminal.dispose();
      xtermRef.current = null;
    };
  }, [executeCommand, onServerReady, showPrompt]);

  const handleClear = () => {
    xtermRef.current?.clear();
    showPrompt();
  };

  const handleNpmInstall = async () => {
    if (isRunning || webcontainerService.isRunning()) {
      xtermRef.current?.writeln("\x1b[31mUm processo ja esta em execucao.\x1b[0m");
      return;
    }
    setIsRunning(true);
    try {
      await webcontainerService.installDependencies();
    } catch (error: any) {
      xtermRef.current?.writeln(`\x1b[31mErro: ${error.message}\x1b[0m`);
    }
    setIsRunning(false);
    showPrompt();
  };

  const handleStartDev = async () => {
    if (isRunning || webcontainerService.isRunning()) {
      xtermRef.current?.writeln("\x1b[31mUm processo ja esta em execucao.\x1b[0m");
      return;
    }
    setIsRunning(true);
    try {
      await webcontainerService.startServer("npm", ["run", "dev"]);
    } catch (error: any) {
      xtermRef.current?.writeln(`\x1b[31mErro: ${error.message}\x1b[0m`);
      setIsRunning(false);
      showPrompt();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#1e1e1e] ${className || ""}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Terminal</span>
          {!isReady && (
            <span className="text-xs text-yellow-500">Iniciando...</span>
          )}
          {isRunning && (
            <span className="text-xs text-green-500">Executando...</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleNpmInstall}
            disabled={!isReady || isRunning}
            className="h-7 px-2 text-xs"
            data-testid="button-npm-install"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            npm install
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleStartDev}
            disabled={!isReady || isRunning}
            className="h-7 px-2 text-xs"
            data-testid="button-start-dev"
          >
            <Play className="w-3 h-3 mr-1" />
            Start
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            className="h-7 px-2 text-xs"
            data-testid="button-clear-terminal"
          >
            <Square className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>
      <div 
        ref={terminalRef} 
        className="flex-1 p-1"
        data-testid="terminal-container"
      />
    </div>
  );
}

export default WebTerminal;
