import { Terminal, Trash2, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ConsolePanelProps {
  output: string[];
  onClear?: () => void;
}

export function ConsolePanel({ output, onClear }: ConsolePanelProps) {
  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Console</span>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-xs">{output.length}</Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={onClear}
            data-testid="clear-console"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-2 font-mono text-xs bg-background">
        {output.length === 0 ? (
          <div className="text-muted-foreground p-2">
            Console vazio. Execute o projeto para ver a saida.
          </div>
        ) : (
          output.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap py-0.5">
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
