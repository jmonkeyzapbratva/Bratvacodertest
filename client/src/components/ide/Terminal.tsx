import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";
import { Button } from "@/components/ui/button";
import { Play, Square, Trash2, Loader2 } from "lucide-react";

interface TerminalProps {
  isRunning: boolean;
  isBooting?: boolean;
  onRun: () => void;
  onStop: () => void;
  onReady?: (writeCallback: (data: string) => void) => void;
  onInput?: (data: string) => void;
}

export function Terminal({ 
  isRunning, 
  isBooting = false,
  onRun, 
  onStop,
  onReady,
  onInput
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const writeToTerminal = useCallback((data: string) => {
    if (xtermRef.current) {
      xtermRef.current.write(data);
    }
  }, []);
  
  useEffect(() => {
    if (!terminalRef.current || isInitialized) return;
    
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
      scrollback: 5000,
      convertEol: true,
    });
    
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();
    
    term.writeln("\x1b[36m╔════════════════════════════════════════╗\x1b[0m");
    term.writeln("\x1b[36m║\x1b[0m  \x1b[33mBratvaCoder Terminal\x1b[0m                  \x1b[36m║\x1b[0m");
    term.writeln("\x1b[36m║\x1b[0m  Clique em \x1b[32m▶ Run\x1b[0m para executar         \x1b[36m║\x1b[0m");
    term.writeln("\x1b[36m╚════════════════════════════════════════╝\x1b[0m");
    term.writeln("");
    
    term.onData((data) => {
      if (onInput) {
        onInput(data);
      }
    });
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    setIsInitialized(true);
    
    if (onReady) {
      onReady(writeToTerminal);
    }
    
    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch (e) {}
    };
    
    window.addEventListener("resize", handleResize);
    
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    if (terminalRef.current.parentElement) {
      resizeObserver.observe(terminalRef.current.parentElement);
    }
    
    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [isInitialized, onReady, onInput, writeToTerminal]);
  
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current?.fit();
        } catch (e) {}
      }, 100);
    }
  }, []);
  
  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.writeln("\x1b[90mTerminal limpo.\x1b[0m\r\n");
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-[#333]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#d4d4d4]">Terminal</span>
          {isBooting && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Iniciando...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isRunning ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onStop}
              className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
              data-testid="button-stop"
            >
              <Square className="h-3 w-3 mr-1" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRun}
              disabled={isBooting}
              className="h-6 px-2 text-green-400 hover:text-green-300 hover:bg-green-900/20 disabled:opacity-50"
              data-testid="button-run"
            >
              <Play className="h-3 w-3 mr-1" />
              Run
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClear}
            className="h-6 w-6 text-[#808080] hover:text-[#d4d4d4]"
            data-testid="button-clear-terminal"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  );
}
