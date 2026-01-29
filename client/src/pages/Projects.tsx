import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  FolderKanban, 
  Download, 
  Trash2, 
  Code2, 
  Calendar,
  MoreVertical,
  Eye,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CodePreview } from "@/components/CodePreview";
import { GitHubPush } from "@/components/GitHubPush";
import type { Project } from "@shared/schema";
import { SiGithub } from "react-icons/si";

const languageColors: Record<string, string> = {
  javascript: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  typescript: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  python: "bg-green-500/10 text-green-600 dark:text-green-400",
  html: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

export default function Projects() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Projeto excluído",
        description: "O projeto foi removido com sucesso.",
      });
      setDeleteProjectId(null);
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o projeto.",
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (project: Project) => {
    if (!project.generatedCode) {
      toast({
        title: "Sem código",
        description: "Este projeto não possui código para download.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: project.generatedCode,
          language: project.language || "javascript",
          projectName: project.name.toLowerCase().replace(/\s+/g, "-"),
        }),
      });

      if (!response.ok) throw new Error("Erro ao gerar download");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.toLowerCase().replace(/\s+/g, "-")}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download iniciado!",
        description: "Seu projeto foi baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o projeto.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Data desconhecida";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardFooter>
                <Skeleton className="h-4 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Meus Projetos</h1>
        <p className="text-muted-foreground">
          Gerencie todos os projetos que você criou com o BRATVACODER
        </p>
      </div>

      {!projects || projects.length === 0 ? (
        <Card className="max-w-md mx-auto text-center p-12">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FolderKanban className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">Nenhum projeto ainda</h3>
          <p className="text-muted-foreground mb-6">
            Comece criando seu primeiro projeto no chat com a IA.
          </p>
          <Button asChild>
            <a href="/">Criar Primeiro Projeto</a>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate mb-1">{project.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description || "Sem descrição"}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`project-menu-${project.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedProject(project)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(project)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteProjectId(project.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className={languageColors[project.language || "javascript"]}
                  >
                    <Code2 className="h-3 w-3 mr-1" />
                    {project.language || "javascript"}
                  </Badge>
                  <Badge variant="outline">
                    {project.templateType}
                  </Badge>
                  {project.githubRepo && (
                    <Badge variant="outline" className="bg-muted">
                      <SiGithub className="h-3 w-3 mr-1" />
                      GitHub
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(project.createdAt)}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedProject?.name}</DialogTitle>
            <DialogDescription>
              {selectedProject?.description || "Sem descrição"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {selectedProject?.generatedCode && (
              <CodePreview
                code={selectedProject.generatedCode}
                language={selectedProject.language || "javascript"}
                projectName={selectedProject.name.toLowerCase().replace(/\s+/g, "-")}
              />
            )}
          </div>
          {selectedProject && (
            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              {selectedProject.githubRepo ? (
                <Button variant="outline" asChild>
                  <a 
                    href={`https://github.com/${selectedProject.githubRepo}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    data-testid="link-github-repo"
                  >
                    <SiGithub className="h-4 w-4 mr-2" />
                    Ver no GitHub
                  </a>
                </Button>
              ) : (
                <GitHubPush 
                  projectId={selectedProject.id} 
                  projectName={selectedProject.name}
                />
              )}
              <Button onClick={() => handleDownload(selectedProject)} data-testid="button-download-modal">
                <Download className="h-4 w-4 mr-2" />
                Download ZIP
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O projeto será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProjectId && deleteProject.mutate(deleteProjectId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProject.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
