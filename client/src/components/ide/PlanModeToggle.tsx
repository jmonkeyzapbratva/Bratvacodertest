import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lightbulb, Hammer, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AgentMode = "plan" | "build";

interface PlanModeToggleProps {
  mode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  className?: string;
}

const modeConfig = {
  plan: {
    label: "Planejar",
    icon: Lightbulb,
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    description: "Planejar sem executar código",
  },
  build: {
    label: "Construir",
    icon: Hammer,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    description: "Executar e modificar código",
  },
};

export function PlanModeToggle({ mode, onModeChange, className }: PlanModeToggleProps) {
  const currentConfig = modeConfig[mode];
  const Icon = currentConfig.icon;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`gap-1.5 ${currentConfig.color} border ${className || ""}`}
              data-testid="button-mode-toggle"
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{currentConfig.label}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{currentConfig.description}</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem
          onClick={() => onModeChange("plan")}
          className={mode === "plan" ? "bg-amber-500/10" : ""}
          data-testid="menu-item-plan-mode"
        >
          <Lightbulb className="w-4 h-4 mr-2 text-amber-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Planejar</span>
            <span className="text-xs text-muted-foreground">
              Planejar e discutir ideias
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onModeChange("build")}
          className={mode === "build" ? "bg-blue-500/10" : ""}
          data-testid="menu-item-build-mode"
        >
          <Hammer className="w-4 h-4 mr-2 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">Construir</span>
            <span className="text-xs text-muted-foreground">
              Executar e modificar código
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PlanModeIndicator({ mode }: { mode: AgentMode }) {
  const config = modeConfig[mode];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.color} text-xs`}>
      <Icon className="w-3 h-3 mr-1" />
      Modo {config.label}
    </Badge>
  );
}
