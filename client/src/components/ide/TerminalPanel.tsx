import { useEffect, useRef } from "react";
import { Terminal as TerminalIcon, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TerminalPanelProps {
  logs: string[];
  isRunning: boolean;
  onClear?: () => void;
}

export function TerminalPanel({ logs, isRunning, onClear }: TerminalPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a] text-green-400 font-mono text-sm">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#252525] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4" />
          <span className="text-xs text-gray-400">Terminal</span>
          {isRunning && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Rodando
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-gray-400 hover:text-white"
          onClick={onClear}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 space-y-0.5">
        {logs.length === 0 ? (
          <div className="text-gray-500">
            $ Pressione "Run" para iniciar o projeto...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
