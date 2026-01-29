import { useState } from "react";
import { ChevronDown, Lightbulb, Hammer, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type AgentMode = "plan" | "build" | "edit";

interface AgentModeBubbleProps {
  mode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  disabled?: boolean;
}

const modeConfig: Record<AgentMode, { label: string; icon: typeof Lightbulb; color: string; description: string }> = {
  plan: {
    label: "Planejar",
    icon: Lightbulb,
    color: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
    description: "Pergunta e planeja antes de construir"
  },
  build: {
    label: "Construir",
    icon: Hammer,
    color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    description: "Constrói o projeto automaticamente"
  },
  edit: {
    label: "Editar",
    icon: Pencil,
    color: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    description: "Edita arquivos específicos"
  }
};

export function AgentModeBubble({ mode, onModeChange, disabled }: AgentModeBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentMode = modeConfig[mode];
  const Icon = currentMode.icon;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={`gap-1.5 px-3 py-1.5 h-auto rounded-full border ${currentMode.color} transition-all duration-200`}
          data-testid="button-mode-bubble"
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{currentMode.label}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {(Object.keys(modeConfig) as AgentMode[]).map((m) => {
          const config = modeConfig[m];
          const ModeIcon = config.icon;
          const isActive = mode === m;
          
          return (
            <DropdownMenuItem
              key={m}
              onClick={() => onModeChange(m)}
              className={`flex items-start gap-3 p-3 cursor-pointer ${isActive ? "bg-accent" : ""}`}
              data-testid={`menuitem-mode-${m}`}
            >
              <div className={`p-1.5 rounded-md ${config.color}`}>
                <ModeIcon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{config.label}</span>
                  {isActive && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Ativo</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
