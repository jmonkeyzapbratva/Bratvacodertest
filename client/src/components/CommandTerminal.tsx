import { useEffect, useRef, useState } from "react";
import { Terminal, Play, Square, Trash2, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCommandRunner, type CommandOutput } from "@/hooks/useCommandRunner";

interface CommandTerminalProps {
  projectId: number | null;
  className?: string;
  onOutput?: (output: CommandOutput) => void;
}

export function CommandTerminal({ projectId, className, onOutput }: CommandTerminalProps) {
  const { isRunning, outputs, runCommand, stopCommand, clearOutputs } = useCommandRunner(projectId);
  const [command, setCommand] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isRunning) return;

    setCommandHistory((prev) => [command, ...prev.slice(0, 50)]);
    setHistoryIndex(-1);

    await runCommand(command, onOutput);
    setCommand("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      if (newIndex >= 0 && commandHistory[newIndex]) {
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIndex = historyIndex - 1;
      if (newIndex < 0) {
        setHistoryIndex(-1);
        setCommand("");
      } else if (commandHistory[newIndex]) {
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    }
  };

  const getOutputColor = (type: string) => {
    switch (type) {
      case "stderr":
      case "error":
        return "text-red-400";
      case "complete":
        return "text-green-400";
      case "status":
        return "text-yellow-400";
      default:
        return "text-[#d4d4d4]";
    }
  };

  if (!projectId) {
    return (
      <div className={`flex items-center justify-center h-32 bg-[#1e1e1e] text-[#808080] text-sm ${className}`}>
        Selecione um projeto para usar o terminal
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-[#1e1e1e] border border-[#333] rounded-md overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-[#333] bg-[#252526]">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-[#4ec9b0]" />
          <span className="text-xs font-medium text-[#d4d4d4]">Terminal</span>
          {isRunning && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Executando...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 text-[#808080] hover:text-[#d4d4d4] hover:bg-[#333]"
            data-testid="button-minimize-terminal"
          >
            {isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={clearOutputs}
            className="h-6 w-6 text-[#808080] hover:text-[#d4d4d4] hover:bg-[#333]"
            data-testid="button-clear-terminal"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {isRunning ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={stopCommand}
              className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-900/20"
              data-testid="button-stop-command"
            >
              <Square className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
      </div>

      {!isMinimized && (
        <>
          <ScrollArea className="flex-1 max-h-48">
            <div className="p-2 font-mono text-xs space-y-0.5 min-h-[100px]">
              {outputs.length === 0 ? (
                <div className="text-[#808080] py-2">
                  Digite um comando e pressione Enter
                </div>
              ) : (
                outputs.map((output, i) => (
                  <div key={i} className={`${getOutputColor(output.type)} whitespace-pre-wrap`}>
                    {output.data}
                  </div>
                ))
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <form onSubmit={handleSubmit} className="border-t border-[#333] p-2">
            <div className="flex items-center gap-2">
              <span className="text-[#4ec9b0] text-xs">$</span>
              <Input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="npm install, npm run dev..."
                className="flex-1 h-7 bg-transparent border-0 text-[#d4d4d4] text-xs font-mono placeholder:text-[#808080] focus-visible:ring-0"
                disabled={isRunning}
                data-testid="input-command"
              />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-green-400 hover:text-green-300 hover:bg-green-900/20"
                disabled={!command.trim() || isRunning}
                data-testid="button-run-command"
              >
                <Play className="h-3 w-3" />
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
