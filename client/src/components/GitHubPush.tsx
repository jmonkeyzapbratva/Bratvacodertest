import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SiGithub } from "react-icons/si";
import { Loader2, ExternalLink, GitBranch, Plus } from "lucide-react";

interface GitHubPushProps {
  projectId: number;
  projectName: string;
  disabled?: boolean;
}

interface GitHubUser {
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
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

export function GitHubPush({ projectId, projectName, disabled }: GitHubPushProps) {
  const [open, setOpen] = useState(false);
  const [createNew, setCreateNew] = useState(true);
  const [repoName, setRepoName] = useState(projectName.replace(/\s+/g, "-").toLowerCase());
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [isPrivate, setIsPrivate] = useState(false);
  const { toast } = useToast();

  const { data: status } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/github/status"],
  });

  const { data: user } = useQuery<GitHubUser>({
    queryKey: ["/api/github/user"],
    enabled: status?.connected === true,
  });

  const { data: repos } = useQuery<GitHubRepo[]>({
    queryKey: ["/api/github/repos"],
    enabled: status?.connected === true && !createNew,
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/github/push-project", {
        projectId,
        repoName: createNew ? repoName : selectedRepo,
        isPrivate,
        createNew,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Projeto enviado com sucesso!",
        description: (
          <a 
            href={data.repoUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 underline"
          >
            Ver no GitHub <ExternalLink className="h-3 w-3" />
          </a>
        ),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar projeto",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  if (!status?.connected) {
    return (
      <Button variant="outline" disabled={true} data-testid="button-github-not-connected">
        <SiGithub className="h-4 w-4 mr-2" />
        GitHub não conectado
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} data-testid="button-github-push">
          <SiGithub className="h-4 w-4 mr-2" />
          Enviar para GitHub
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SiGithub className="h-5 w-5" />
            Enviar para GitHub
          </DialogTitle>
          <DialogDescription>
            {user && (
              <span className="flex items-center gap-2 mt-2">
                Logado como <strong>@{user.login}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant={createNew ? "default" : "outline"}
              size="sm"
              onClick={() => setCreateNew(true)}
              data-testid="button-create-new-repo"
            >
              <Plus className="h-4 w-4 mr-1" />
              Novo Repositório
            </Button>
            <Button
              variant={!createNew ? "default" : "outline"}
              size="sm"
              onClick={() => setCreateNew(false)}
              data-testid="button-use-existing-repo"
            >
              <GitBranch className="h-4 w-4 mr-1" />
              Existente
            </Button>
          </div>

          {createNew ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="repo-name">Nome do Repositório</Label>
                <Input
                  id="repo-name"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value.replace(/\s+/g, "-").toLowerCase())}
                  placeholder="meu-projeto"
                  data-testid="input-repo-name"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="private-repo">Repositório Privado</Label>
                <Switch
                  id="private-repo"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                  data-testid="switch-private-repo"
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Selecionar Repositório</Label>
              <Select value={selectedRepo} onValueChange={setSelectedRepo}>
                <SelectTrigger data-testid="select-repo">
                  <SelectValue placeholder="Escolha um repositório" />
                </SelectTrigger>
                <SelectContent>
                  {repos?.map((repo) => (
                    <SelectItem key={repo.id} value={repo.name}>
                      {repo.name} {repo.private && "(privado)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            data-testid="button-cancel-push"
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => pushMutation.mutate()}
            disabled={pushMutation.isPending || (createNew ? !repoName : !selectedRepo)}
            data-testid="button-confirm-push"
          >
            {pushMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <SiGithub className="h-4 w-4 mr-2" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
