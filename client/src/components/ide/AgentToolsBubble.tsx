import { useState } from "react";
import { 
  Wrench, 
  ChevronDown, 
  Globe, 
  Image, 
  Copy, 
  Zap, 
  Infinity, 
  Settings,
  Paperclip,
  TestTube,
  Database,
  Shield,
  History,
  FileText,
  Smartphone,
  Paintbrush
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

export type BuildApproach = "design-first" | "full-app";

interface AgentToolsBubbleProps {
  buildApproach: BuildApproach;
  onBuildApproachChange: (approach: BuildApproach) => void;
  onOpenWebSearch: () => void;
  onOpenMediaGen: () => void;
  onOpenScreenshotClone: () => void;
  onOpenSettings: () => void;
  onOpenCheckpoints: () => void;
  onOpenTests: () => void;
  onOpenDatabase: () => void;
  onOpenSecrets: () => void;
  onOpenMobile: () => void;
  onOpenVisualEditor: () => void;
  onOpenReplitMd: () => void;
  onAttach: () => void;
  disabled?: boolean;
}

export function AgentToolsBubble({
  buildApproach,
  onBuildApproachChange,
  onOpenWebSearch,
  onOpenMediaGen,
  onOpenScreenshotClone,
  onOpenSettings,
  onOpenCheckpoints,
  onOpenTests,
  onOpenDatabase,
  onOpenSecrets,
  onOpenMobile,
  onOpenVisualEditor,
  onOpenReplitMd,
  onAttach,
  disabled
}: AgentToolsBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);

  const tools = [
    { id: "search", label: "Buscar na Web", icon: Globe, onClick: onOpenWebSearch },
    { id: "media", label: "Gerar Imagem", icon: Image, onClick: onOpenMediaGen },
    { id: "clone", label: "Clonar Design", icon: Copy, onClick: onOpenScreenshotClone },
    { id: "attach", label: "Anexar Arquivo", icon: Paperclip, onClick: onAttach },
  ];

  const devTools = [
    { id: "tests", label: "Testes", icon: TestTube, onClick: onOpenTests },
    { id: "database", label: "Banco de Dados", icon: Database, onClick: onOpenDatabase },
    { id: "secrets", label: "Variáveis", icon: Shield, onClick: onOpenSecrets },
    { id: "checkpoints", label: "Histórico", icon: History, onClick: onOpenCheckpoints },
  ];

  const editorTools = [
    { id: "visual", label: "Editor Visual", icon: Paintbrush, onClick: onOpenVisualEditor },
    { id: "mobile", label: "Preview Mobile", icon: Smartphone, onClick: onOpenMobile },
    { id: "replitmd", label: "Configurações", icon: FileText, onClick: onOpenReplitMd },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-1.5 px-3 py-1.5 h-auto rounded-full transition-all duration-200"
          data-testid="button-tools-bubble"
        >
          <Wrench className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Ferramentas</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Velocidade de Build
        </DropdownMenuLabel>
        <div className="px-2 py-2 flex items-center gap-2">
          <Button
            variant={buildApproach === "design-first" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1 text-xs gap-1"
            onClick={() => onBuildApproachChange("design-first")}
            data-testid="button-approach-fast"
          >
            <Zap className="h-3 w-3" />
            Rápido (~3min)
          </Button>
          <Button
            variant={buildApproach === "full-app" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1 text-xs gap-1"
            onClick={() => onBuildApproachChange("full-app")}
            data-testid="button-approach-full"
          >
            <Infinity className="h-3 w-3" />
            Completo (~10min)
          </Button>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Assistente IA
        </DropdownMenuLabel>
        {tools.map((tool) => (
          <DropdownMenuItem
            key={tool.id}
            onClick={tool.onClick}
            className="gap-2 cursor-pointer"
            data-testid={`menuitem-tool-${tool.id}`}
          >
            <tool.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{tool.label}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Desenvolvimento
        </DropdownMenuLabel>
        {devTools.map((tool) => (
          <DropdownMenuItem
            key={tool.id}
            onClick={tool.onClick}
            className="gap-2 cursor-pointer"
            data-testid={`menuitem-tool-${tool.id}`}
          >
            <tool.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{tool.label}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Editor
        </DropdownMenuLabel>
        {editorTools.map((tool) => (
          <DropdownMenuItem
            key={tool.id}
            onClick={tool.onClick}
            className="gap-2 cursor-pointer"
            data-testid={`menuitem-tool-${tool.id}`}
          >
            <tool.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{tool.label}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onOpenSettings}
          className="gap-2 cursor-pointer"
          data-testid="menuitem-tool-settings"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Configurações do Agente</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
