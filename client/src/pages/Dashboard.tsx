import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { 
  Plus, 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  ExternalLink,
  Code,
  Server,
  Layout,
  MessageCircle,
  Folder,
  Clock,
  Loader2
} from "lucide-react";

interface Project {
  id: number;
  name: string;
  description: string | null;
  templateType: string;
  status: string;
  runtimeStatus: string;
  language: string | null;
  port: number | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  icon: string;
}

const TEMPLATE_ICONS: Record<string, any> = {
  "MessageCircle": MessageCircle,
  "Server": Server,
  "Layout": Layout,
  "Code": Code,
  "Folder": Folder,
};

function getTemplateIcon(iconName: string) {
  return TEMPLATE_ICONS[iconName] || Folder;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "running": return "bg-green-500";
    case "starting": return "bg-yellow-500";
    case "stopped": case "idle": return "bg-gray-500";
    case "error": case "crashed": return "bg-red-500";
    default: return "bg-gray-500";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "running": return "Rodando";
    case "starting": return "Iniciando";
    case "stopped": case "idle": return "Parado";
    case "error": case "crashed": return "Erro";
    case "draft": return "Rascunho";
    case "ready": return "Pronto";
    default: return status;
  }
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/managed-projects"],
  });

  const { data: templates = [] } = useQuery<ProjectTemplate[]>({
    queryKey: ["/api/project-templates"],
  });

  const createProject = useMutation({
    mutationFn: async (data: { name: string; description: string; templateId: string }) => {
      const res = await apiRequest("POST", "/api/managed-projects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/managed-projects"] });
      setIsCreateOpen(false);
      setSelectedTemplate(null);
      setNewProjectName("");
      setNewProjectDescription("");
      toast({ title: "Projeto criado com sucesso!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao criar projeto", description: error.message, variant: "destructive" });
    },
  });

  const startProject = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest("POST", `/api/managed-projects/${projectId}/start`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/managed-projects"] });
      toast({ title: "Projeto iniciado!" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao iniciar", description: error.message, variant: "destructive" });
    },
  });

  const stopProject = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest("POST", `/api/managed-projects/${projectId}/stop`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/managed-projects"] });
      toast({ title: "Projeto parado" });
    },
  });

  const restartProject = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest("POST", `/api/managed-projects/${projectId}/restart`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/managed-projects"] });
      toast({ title: "Projeto reiniciado!" });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: number) => {
      const res = await apiRequest("DELETE", `/api/managed-projects/${projectId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/managed-projects"] });
      toast({ title: "Projeto removido" });
    },
  });

  const handleCreateProject = () => {
    if (!newProjectName.trim() || !selectedTemplate) {
      toast({ title: "Preencha o nome e selecione um template", variant: "destructive" });
      return;
    }
    createProject.mutate({
      name: newProjectName.trim(),
      description: newProjectDescription.trim(),
      templateId: selectedTemplate,
    });
  };

  const openProjectIDE = (projectId: number) => {
    setLocation(`/ide/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Meus Projetos</h1>
            <p className="text-muted-foreground mt-1">Gerencie e execute seus projetos</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-project">
                <Plus className="w-4 h-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Projeto</DialogTitle>
                <DialogDescription>
                  Escolha um template e configure seu novo projeto
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Nome do Projeto</Label>
                  <Input
                    id="project-name"
                    placeholder="Meu Projeto Incrivel"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    data-testid="input-project-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="project-description">Descricao (opcional)</Label>
                  <Textarea
                    id="project-description"
                    placeholder="Descreva o que seu projeto faz..."
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    data-testid="input-project-description"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Escolha um Template</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {templates.map((template) => {
                      const Icon = getTemplateIcon(template.icon);
                      const isSelected = selectedTemplate === template.id;
                      
                      return (
                        <Card
                          key={template.id}
                          className={`cursor-pointer transition-all hover-elevate ${
                            isSelected ? "ring-2 ring-primary" : ""
                          }`}
                          onClick={() => setSelectedTemplate(template.id)}
                          data-testid={`card-template-${template.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-md bg-primary/10">
                                <Icon className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {template.language}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreateProject}
                  disabled={createProject.isPending || !newProjectName.trim() || !selectedTemplate}
                  data-testid="button-create-project"
                >
                  {createProject.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Projeto
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {projectsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Folder className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Nenhum projeto ainda</h2>
              <p className="text-muted-foreground mb-6">
                Crie seu primeiro projeto e comece a desenvolver!
              </p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-project">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Projeto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="flex flex-col" data-testid={`card-project-${project.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {project.description || "Sem descricao"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(project.runtimeStatus || project.status)}`} />
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(project.runtimeStatus || project.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 pb-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Code className="w-4 h-4" />
                      {project.language || project.templateType}
                    </div>
                    {project.lastRunAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(project.lastRunAt).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="pt-3 border-t flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openProjectIDE(project.id)}
                    data-testid={`button-open-ide-${project.id}`}
                  >
                    <Code className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  
                  {project.runtimeStatus === "running" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => stopProject.mutate(project.id)}
                        disabled={stopProject.isPending}
                        data-testid={`button-stop-${project.id}`}
                      >
                        <Square className="w-4 h-4 mr-1" />
                        Parar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restartProject.mutate(project.id)}
                        disabled={restartProject.isPending}
                        data-testid={`button-restart-${project.id}`}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Reiniciar
                      </Button>
                      {project.port && (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a
                            href={`http://localhost:${project.port}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`link-preview-${project.id}`}
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Abrir
                          </a>
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => startProject.mutate(project.id)}
                      disabled={startProject.isPending}
                      data-testid={`button-start-${project.id}`}
                    >
                      {startProject.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-1" />
                      )}
                      Iniciar
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Tem certeza que deseja remover este projeto?")) {
                        deleteProject.mutate(project.id);
                      }
                    }}
                    data-testid={`button-delete-${project.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
