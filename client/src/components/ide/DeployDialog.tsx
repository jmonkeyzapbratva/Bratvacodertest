import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Rocket, Github, ExternalLink, Loader2, Plus, Check, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ProjectFile } from "./FileExplorer";

interface DeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: ProjectFile[];
  projectName: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  updatedAt: string;
}

interface GitHubUser {
  login: string;
  name: string | null;
  email: string | null;
  avatarUrl: string;
}

export function DeployDialog({ open, onOpenChange, files, projectName }: DeployDialogProps) {
  const [step, setStep] = useState<"select" | "creating" | "pushing" | "done">("select");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [newRepoName, setNewRepoName] = useState("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [deployResult, setDeployResult] = useState<{ repoUrl: string } | null>(null);
  const { toast } = useToast();

  const { data: githubStatus, isLoading: statusLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/github/status"],
    enabled: open,
  });

  const { data: githubUser } = useQuery<GitHubUser>({
    queryKey: ["/api/github/user"],
    enabled: open && githubStatus?.connected,
  });

  const { data: repos, isLoading: reposLoading } = useQuery<GitHubRepo[]>({
    queryKey: ["/api/github/repos"],
    enabled: open && githubStatus?.connected,
  });

  const createRepoMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/github/repos", {
        name,
        description: `Projeto gerado pelo BRATVACODER: ${projectName}`,
        isPrivate: false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/github/repos"] });
    },
    onError: () => {
      toast({
        title: "Erro ao criar repositorio",
        description: "Nao foi possivel criar o repositorio no GitHub.",
        variant: "destructive",
      });
    },
  });

  const pushProjectMutation = useMutation({
    mutationFn: async ({ repoName, isNew }: { repoName: string; isNew: boolean }) => {
      const res = await apiRequest("POST", "/api/github/push-project", {
        projectName,
        files: files.map(f => ({ path: f.path, content: f.content })),
        repoName: isNew ? repoName : undefined,
        existingRepo: !isNew ? repoName : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setDeployResult({
        repoUrl: data.repoUrl,
      });
      setStep("done");
      toast({
        title: "Projeto publicado!",
        description: "Seu projeto foi enviado para o GitHub com sucesso.",
      });
    },
    onError: () => {
      setStep("select");
      toast({
        title: "Erro ao publicar",
        description: "Nao foi possivel enviar o projeto para o GitHub.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (open) {
      setStep("select");
      setSelectedRepo("");
      setNewRepoName(projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40));
      setIsCreatingNew(false);
      setDeployResult(null);
    }
  }, [open, projectName]);

  const handleDeploy = async () => {
    if (isCreatingNew) {
      if (!newRepoName.trim()) return;
      setStep("creating");
      try {
        await createRepoMutation.mutateAsync(newRepoName);
        setStep("pushing");
        await pushProjectMutation.mutateAsync({ repoName: newRepoName, isNew: true });
      } catch {
        setStep("select");
      }
    } else {
      if (!selectedRepo) return;
      setStep("pushing");
      await pushProjectMutation.mutateAsync({ repoName: selectedRepo, isNew: false });
    }
  };

  const isLoading = statusLoading || reposLoading;
  const isPushing = step === "creating" || step === "pushing";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Publicar no GitHub
          </DialogTitle>
          <DialogDescription>
            Publique seu projeto no GitHub para compartilhar com o mundo.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !githubStatus?.connected ? (
          <div className="py-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <span>GitHub nao conectado</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Conecte sua conta GitHub nas configuracoes do Replit para publicar projetos.
            </p>
            <Button variant="outline" asChild>
              <a href="https://replit.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ir para Configuracoes
              </a>
            </Button>
          </div>
        ) : step === "done" && deployResult ? (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-500">
              <Check className="h-6 w-6" />
              <span className="text-lg font-medium">Publicado com sucesso!</span>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-muted space-y-1">
                <Label className="text-xs text-muted-foreground">Repositorio</Label>
                <a
                  href={deployResult.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                  data-testid="link-deployed-repo"
                >
                  <Github className="h-4 w-4" />
                  {deployResult.repoUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

            </div>

            <Button className="w-full" onClick={() => onOpenChange(false)} data-testid="button-close-deploy">
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {githubUser && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Github className="h-4 w-4" />
                <span>Conectado como <strong>{githubUser.login}</strong></span>
              </div>
            )}

            <RadioGroup
              value={isCreatingNew ? "new" : "existing"}
              onValueChange={(v) => setIsCreatingNew(v === "new")}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" data-testid="radio-new-repo" />
                <Label htmlFor="new">Criar novo repositorio</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" data-testid="radio-existing-repo" />
                <Label htmlFor="existing">Usar repositorio existente</Label>
              </div>
            </RadioGroup>

            {isCreatingNew ? (
              <div className="space-y-2">
                <Label htmlFor="repo-name">Nome do repositorio</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{githubUser?.login}/</span>
                  <Input
                    id="repo-name"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                    placeholder="meu-projeto"
                    disabled={isPushing}
                    data-testid="input-new-repo-name"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Selecione um repositorio</Label>
                <ScrollArea className="h-48 border rounded-md">
                  {repos && repos.length > 0 ? (
                    <div className="p-1">
                      {repos.map((repo) => (
                        <button
                          key={repo.id}
                          onClick={() => setSelectedRepo(repo.name)}
                          disabled={isPushing}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-md text-sm",
                            "hover-elevate active-elevate-2",
                            selectedRepo === repo.name && "bg-primary/10"
                          )}
                          data-testid={`repo-option-${repo.name}`}
                        >
                          <div className="font-medium">{repo.name}</div>
                          {repo.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {repo.description}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      Nenhum repositorio encontrado. Crie um novo acima.
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isPushing}
                data-testid="button-cancel-deploy"
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleDeploy}
                disabled={isPushing || (isCreatingNew ? !newRepoName.trim() : !selectedRepo)}
                data-testid="button-confirm-deploy"
              >
                {isPushing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {step === "creating" ? "Criando..." : "Publicando..."}
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Publicar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
