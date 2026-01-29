import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Key, Database, Lock, Plus, Search, Terminal, Settings, Bug, FileCode } from "lucide-react";

interface BottomBarProps {
  onPanelChange: (panel: string) => void;
  activePanel: string;
  onNewTab?: () => void;
}

const quickActions = [
  { id: "settings", icon: Key, label: "Secrets" },
  { id: "database", icon: Database, label: "Database" },
  { id: "auth", icon: Lock, label: "Auth" },
];

const toolActions = [
  { id: "console", icon: Terminal, label: "Console" },
  { id: "developer", icon: Bug, label: "Debug" },
];

export function BottomBar({ onPanelChange, activePanel, onNewTab }: BottomBarProps) {
  return (
    <div className="h-7 bg-sidebar border-t border-sidebar-border flex items-center justify-between px-1 shrink-0">
      <div className="flex items-center">
        {quickActions.map((action) => (
          <Tooltip key={action.id} delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 px-2 text-xs gap-1.5 ${
                  activePanel === action.id 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-muted-foreground"
                }`}
                onClick={() => onPanelChange(action.id)}
                data-testid={`bottombar-${action.id}`}
              >
                <action.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {action.label}
            </TooltipContent>
          </Tooltip>
        ))}
        
        <div className="w-px h-4 bg-border mx-1" />
        
        {toolActions.map((action) => (
          <Tooltip key={action.id} delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 px-2 text-xs gap-1.5 ${
                  activePanel === action.id 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-muted-foreground"
                }`}
                onClick={() => onPanelChange(action.id)}
                data-testid={`bottombar-${action.id}`}
              >
                <action.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{action.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {action.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      
      <div className="flex items-center gap-1">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1.5 text-muted-foreground"
              onClick={() => onPanelChange("search")}
              data-testid="bottombar-search"
            >
              <Search className="h-3 w-3" />
              <span className="hidden sm:inline">Buscar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            Buscar nos arquivos (Ctrl+Shift+F)
          </TooltipContent>
        </Tooltip>
        
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1.5 text-muted-foreground"
              onClick={onNewTab}
              data-testid="bottombar-new-tab"
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">Nova Aba</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            Abrir nova aba
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
