import { useState } from "react";
import { 
  Wrench, 
  Palette, 
  Bug, 
  BarChart3, 
  Rocket, 
  Key, 
  Database, 
  FolderOpen 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Tool {
  id: string;
  icon: typeof Wrench;
  label: string;
  description: string;
}

const tools: Tool[] = [
  { id: "build", icon: Wrench, label: "Build", description: "Criar projeto" },
  { id: "design", icon: Palette, label: "Design", description: "Estilo visual" },
  { id: "debug", icon: Bug, label: "Debug", description: "Corrigir erros" },
  { id: "analytics", icon: BarChart3, label: "Analytics", description: "Metricas" },
  { id: "deploy", icon: Rocket, label: "Deploy", description: "Publicar" },
  { id: "secrets", icon: Key, label: "Secrets", description: "Chaves API" },
  { id: "database", icon: Database, label: "Database", description: "Banco de dados" },
  { id: "files", icon: FolderOpen, label: "Files", description: "Arquivos" },
];

interface ToolSidebarProps {
  activeTool: string;
  onToolChange: (toolId: string) => void;
}

export function ToolSidebar({ activeTool, onToolChange }: ToolSidebarProps) {
  return (
    <div className="flex flex-col gap-1 p-2">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        
        return (
          <Tooltip key={tool.id} delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToolChange(tool.id)}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover-elevate"
                )}
                data-testid={`tool-${tool.id}`}
              >
                <Icon className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="flex flex-col">
              <span className="font-medium">{tool.label}</span>
              <span className="text-xs text-muted-foreground">{tool.description}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
