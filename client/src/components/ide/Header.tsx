import { Play, Square, Download, Rocket, Share2, GitFork, Users, MoreHorizontal, Copy, Eye, RefreshCw, Check, Loader2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  color: string;
}

interface HeaderProps {
  projectName: string;
  isRunning: boolean;
  hasFiles: boolean;
  onRun: () => void;
  onStop: () => void;
  onDownload?: () => void;
  onDeploy?: () => void;
  collaborators?: Collaborator[];
  onFork?: () => void;
  onShare?: () => void;
  saveStatus?: "saved" | "saving" | "unsaved";
}

const DEFAULT_COLLABORATORS: Collaborator[] = [
  { id: "1", name: "Você", color: "bg-green-500" },
];

export function Header({ 
  projectName, 
  isRunning, 
  hasFiles, 
  onRun, 
  onStop, 
  onDownload, 
  onDeploy,
  collaborators = DEFAULT_COLLABORATORS,
  onFork,
  onShare,
  saveStatus = "saved",
}: HeaderProps) {
  const { toast } = useToast();

  const handleFork = () => {
    if (onFork) {
      onFork();
    } else {
      toast({
        title: "Fork criado",
        description: "Uma cópia do projeto foi criada na sua conta.",
      });
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado",
        description: "O link do projeto foi copiado para a área de transferência.",
      });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copiado",
      description: "Link copiado para área de transferência.",
    });
  };

  return (
    <header className="h-12 bg-background border-b flex items-center justify-between gap-4 px-3 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">B</span>
          </div>
          <span className="font-semibold text-sm hidden sm:block">BratvaCoder</span>
        </div>
        
        <div className="h-4 w-px bg-border" />
        
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate max-w-[200px]" data-testid="text-project-name">
            {projectName || "Sem título"}
          </span>
          <Badge variant="secondary" className="text-xs">
            Draft
          </Badge>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="save-status">
                {saveStatus === "saved" && (
                  <>
                    <Check className="h-3 w-3 text-green-500" />
                    <span className="hidden sm:inline">Salvo</span>
                  </>
                )}
                {saveStatus === "saving" && (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span className="hidden sm:inline">Salvando...</span>
                  </>
                )}
                {saveStatus === "unsaved" && (
                  <>
                    <Circle className="h-3 w-3 fill-amber-500 text-amber-500" />
                    <span className="hidden sm:inline">Não salvo</span>
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {saveStatus === "saved" && "Todas as alterações foram salvas"}
              {saveStatus === "saving" && "Salvando alterações..."}
              {saveStatus === "unsaved" && "Alterações não salvas"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={onStop}
            className="gap-1.5"
            data-testid="button-stop"
          >
            <Square className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Parar</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onRun}
            className="gap-1.5 bg-green-600 border-green-700"
            data-testid="button-run"
          >
            <Play className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Run</span>
          </Button>
        )}
        
        <div className="h-4 w-px bg-border hidden md:block" />
        
        <div className="hidden md:flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleFork}
                className="gap-1.5"
                data-testid="button-fork"
              >
                <GitFork className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Fork</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Criar uma cópia deste projeto</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleShare}
                className="gap-1.5"
                data-testid="button-share"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Share</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Compartilhar projeto</TooltipContent>
          </Tooltip>
        </div>
        
        <div className="h-4 w-px bg-border" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center -space-x-1.5" data-testid="collaborators-avatars">
              {collaborators.slice(0, 3).map((collab) => (
                <Avatar key={collab.id} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className={`text-xs text-white ${collab.color}`}>
                    {collab.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {collaborators.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">+{collaborators.length - 3}</span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {collaborators.length === 1 
              ? "Você está editando sozinho" 
              : `${collaborators.length} colaboradores online`}
          </TooltipContent>
        </Tooltip>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" data-testid="button-more-options">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDownload} disabled={!hasFiles} data-testid="menu-download">
              <Download className="h-4 w-4 mr-2" />
              Baixar ZIP
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDeploy} disabled={!hasFiles} data-testid="menu-deploy">
              <Rocket className="h-4 w-4 mr-2" />
              Deploy
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopyLink} data-testid="menu-copy-link">
              <Copy className="h-4 w-4 mr-2" />
              Copiar link
            </DropdownMenuItem>
            <DropdownMenuItem className="md:hidden" onClick={handleFork} data-testid="menu-fork-mobile">
              <GitFork className="h-4 w-4 mr-2" />
              Fork
            </DropdownMenuItem>
            <DropdownMenuItem className="md:hidden" onClick={handleShare} data-testid="menu-share-mobile">
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <ThemeToggle />
      </div>
    </header>
  );
}
