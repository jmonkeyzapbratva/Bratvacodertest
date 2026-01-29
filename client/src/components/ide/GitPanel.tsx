import { useState, useEffect } from "react";
import { GitBranch, GitCommit, Clock, RefreshCw, Plus, Check, AlertCircle, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface GitPanelProps {
  projectId?: number;
  projectName: string;
}

interface FileChange {
  path: string;
  status: "modified" | "added" | "deleted" | "untracked";
  staged: boolean;
}

interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  relativeTime: string;
}

export function GitPanel({ projectId, projectName }: GitPanelProps) {
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentBranch, setCurrentBranch] = useState("main");
  const [stagedChanges, setStagedChanges] = useState<FileChange[]>([]);
  const [unstagedChanges, setUnstagedChanges] = useState<FileChange[]>([]);
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [stagedOpen, setStagedOpen] = useState(true);
  const [unstagedOpen, setUnstagedOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  const { toast } = useToast();

  const fetchGitStatus = async () => {
    if (!projectId) return;
    
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/managed-projects/${projectId}/git/status`, {
        credentials: "include"
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsInitialized(data.isInitialized);
        setCurrentBranch(data.branch || "main");
        setStagedChanges(data.staged || []);
        setUnstagedChanges(data.unstaged || []);
      }
    } catch (error) {
      console.error("Error fetching git status:", error);
    }
    setIsRefreshing(false);
  };

  const fetchCommitHistory = async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/managed-projects/${projectId}/git/log?limit=20`, {
        credentials: "include"
      });
      
      if (response.ok) {
        const data = await response.json();
        setCommits(data || []);
      }
    } catch (error) {
      console.error("Error fetching commit history:", error);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchGitStatus();
      fetchCommitHistory();
    }
  }, [projectId]);

  const initializeGit = async () => {
    if (!projectId) return;
    
    try {
      const response = await apiRequest("POST", `/api/managed-projects/${projectId}/git/init`);
      const data = await response.json();
      if (data.success) {
        setIsInitialized(true);
        toast({
          title: "Git inicializado",
          description: "Repositorio Git criado com sucesso"
        });
        fetchGitStatus();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao inicializar Git",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const stageFile = async (path: string) => {
    if (!projectId) return;
    
    try {
      await apiRequest("POST", `/api/managed-projects/${projectId}/git/stage`, { files: [path] });
      await fetchGitStatus();
    } catch (error: any) {
      toast({
        title: "Erro ao fazer stage",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const unstageFile = async (path: string) => {
    if (!projectId) return;
    
    try {
      await apiRequest("POST", `/api/managed-projects/${projectId}/git/unstage`, { files: [path] });
      await fetchGitStatus();
    } catch (error: any) {
      toast({
        title: "Erro ao fazer unstage",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const stageAll = async () => {
    if (!projectId) return;
    
    try {
      await apiRequest("POST", `/api/managed-projects/${projectId}/git/stage`, { files: [] });
      await fetchGitStatus();
    } catch (error: any) {
      toast({
        title: "Erro ao fazer stage",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleCommit = async () => {
    if (!projectId || stagedChanges.length === 0 || !commitMessage.trim()) return;

    setIsCommitting(true);
    try {
      const response = await apiRequest("POST", `/api/managed-projects/${projectId}/git/commit`, {
        message: commitMessage.trim()
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Commit realizado",
          description: `Hash: ${data.shortHash}`
        });
        setCommitMessage("");
        await fetchGitStatus();
        await fetchCommitHistory();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao commitar",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsCommitting(false);
  };

  const handleRollback = async (hash: string) => {
    if (!projectId) return;
    
    if (!confirm("Tem certeza que deseja voltar para este commit? Alteracoes nao commitadas serao perdidas.")) {
      return;
    }
    
    try {
      const response = await apiRequest("POST", `/api/managed-projects/${projectId}/git/rollback`, {
        commitHash: hash
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Rollback realizado",
          description: "Projeto restaurado para a versao anterior"
        });
        await fetchGitStatus();
        await fetchCommitHistory();
      }
    } catch (error: any) {
      toast({
        title: "Erro no rollback",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: FileChange["status"]) => {
    switch (status) {
      case "added": return "text-green-500";
      case "modified": return "text-yellow-500";
      case "deleted": return "text-red-500";
      case "untracked": return "text-blue-500";
      default: return "text-muted-foreground";
    }
  };

  const getStatusLabel = (status: FileChange["status"]) => {
    switch (status) {
      case "added": return "A";
      case "modified": return "M";
      case "deleted": return "D";
      case "untracked": return "U";
      default: return "?";
    }
  };

  if (!projectId) {
    return (
      <div className="h-full flex flex-col bg-sidebar p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <GitBranch className="h-4 w-4" />
          <span className="text-sm">Selecione um projeto para ver o controle de versao</span>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="h-full flex flex-col bg-sidebar p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <GitBranch className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Git nao inicializado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Inicialize o Git para comecar a versionar seu projeto
            </p>
          </div>
          <Button onClick={initializeGit} data-testid="button-git-init">
            <GitBranch className="h-4 w-4 mr-2" />
            Inicializar Git
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <span className="text-sm font-medium">{currentBranch}</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => { fetchGitStatus(); fetchCommitHistory(); }}
          disabled={isRefreshing}
          data-testid="button-git-refresh"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <Collapsible open={stagedOpen} onOpenChange={setStagedOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <div className="flex items-center gap-1">
                {stagedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Staged ({stagedChanges.length})
                </span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {stagedChanges.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2">
                  Nenhuma mudanca staged
                </div>
              ) : (
                <div className="space-y-1">
                  {stagedChanges.map(change => (
                    <button
                      key={change.path}
                      onClick={() => unstageFile(change.path)}
                      className="w-full flex items-center gap-2 px-2 py-1 text-sm rounded hover-elevate active-elevate-2"
                      data-testid={`git-staged-${change.path}`}
                    >
                      <span className={cn("text-xs font-mono", getStatusColor(change.status))}>
                        {getStatusLabel(change.status)}
                      </span>
                      <span className="truncate text-xs">{change.path}</span>
                    </button>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={unstagedOpen} onOpenChange={setUnstagedOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full group">
              <div className="flex items-center gap-1">
                {unstagedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Changes ({unstagedChanges.length})
                </span>
              </div>
              {unstagedChanges.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); stageAll(); }}
                  data-testid="button-stage-all"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Stage All
                </Button>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {unstagedChanges.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2">
                  Nenhuma mudanca pendente
                </div>
              ) : (
                <div className="space-y-1">
                  {unstagedChanges.map(change => (
                    <button
                      key={change.path}
                      onClick={() => stageFile(change.path)}
                      className="w-full flex items-center gap-2 px-2 py-1 text-sm rounded hover-elevate active-elevate-2"
                      data-testid={`git-unstaged-${change.path}`}
                    >
                      <span className={cn("text-xs font-mono", getStatusColor(change.status))}>
                        {getStatusLabel(change.status)}
                      </span>
                      <span className="truncate text-xs">{change.path}</span>
                    </button>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          <div className="pt-2 border-t space-y-2">
            <Textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Mensagem do commit..."
              className="min-h-[60px] text-sm resize-none"
              data-testid="input-commit-message"
            />
            <Button
              className="w-full"
              disabled={stagedChanges.length === 0 || !commitMessage.trim() || isCommitting}
              onClick={handleCommit}
              data-testid="button-commit"
            >
              {isCommitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Commitando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Commit ({stagedChanges.length})
                </>
              )}
            </Button>
          </div>

          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="pt-2 border-t">
            <CollapsibleTrigger className="flex items-center gap-1 w-full">
              {historyOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Historico ({commits.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {commits.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2">
                  Nenhum commit ainda
                </div>
              ) : (
                <div className="space-y-2">
                  {commits.map((commit, index) => (
                    <div 
                      key={commit.hash} 
                      className="flex items-start gap-2 text-xs group"
                      data-testid={`commit-${commit.shortHash}`}
                    >
                      <GitCommit className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-foreground truncate">{commit.message}</div>
                        <div className="text-muted-foreground flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {commit.shortHash}
                          </Badge>
                          <span>{commit.relativeTime}</span>
                        </div>
                      </div>
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRollback(commit.hash)}
                          title="Voltar para este commit"
                          data-testid={`button-rollback-${commit.shortHash}`}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
