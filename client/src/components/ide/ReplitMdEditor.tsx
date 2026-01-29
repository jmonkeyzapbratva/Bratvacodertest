import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Save, 
  RotateCcw,
  Code,
  Eye,
  Settings,
  Loader2,
  CheckCircle2,
  Info
} from "lucide-react";

interface ReplitMdEditorProps {
  projectId?: number;
}

interface ReplitMdConfig {
  content: string;
  lastModified: string;
  defaults: {
    codingStyle: string;
    preferredLanguage: string;
    projectType: string;
  };
}

const defaultContent = `# Meu Projeto

## Preferências

### Estilo de Código
- Usar TypeScript
- Componentes funcionais React
- Tailwind CSS para estilos

### Arquitetura
- Interface: React + Vite
- Servidor: Express + Node.js
- Banco de dados: PostgreSQL + Drizzle ORM

### Convenções
- Nomes de variáveis em camelCase
- Componentes em PascalCase
- Arquivos em kebab-case

## Contexto do Projeto

Descreva aqui o contexto e objetivo do seu projeto para que a IA entenda melhor o que você quer construir.

## Instruções Especiais

Adicione aqui instruções específicas para a IA seguir ao gerar código.
`;

export function ReplitMdEditor({ projectId }: ReplitMdEditorProps) {
  const [content, setContent] = useState(defaultContent);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery<ReplitMdConfig>({
    queryKey: ["/api/replit-md", projectId],
    enabled: !!projectId,
  });

  useEffect(() => {
    if (config?.content) {
      setContent(config.content);
      setHasChanges(false);
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PUT", `/api/replit-md/${projectId}`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/replit-md", projectId] });
      setHasChanges(false);
      toast({
        title: "Salvo!",
        description: "Suas preferências foram atualizadas.",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/replit-md/${projectId}/reset`, {});
      return response.json();
    },
    onSuccess: (data) => {
      setContent(data.content);
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/replit-md", projectId] });
      toast({
        title: "Resetado!",
        description: "Preferências restauradas para o padrão.",
      });
    },
  });

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasChanges(true);
  };

  const renderMarkdown = (md: string) => {
    return md
      .replace(/^### (.*$)/gim, '<h3 class="text-sm font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold mb-4">$1</h1>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4 text-sm text-muted-foreground">$1</li>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code class="px-1 py-0.5 bg-muted rounded text-xs">$1</code>')
      .replace(/\n\n/g, '</p><p class="mt-2 text-sm">')
      .replace(/^(?!<)/gm, '<p class="text-sm">');
  };

  return (
    <Card className="border-0 shadow-none h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            replit.md
            {hasChanges && (
              <Badge variant="secondary" className="text-[10px]">
                Não salvo
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              data-testid="button-reset-md"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !hasChanges}
              data-testid="button-save-md"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs">
          Configure preferências e contexto para a IA
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="p-3 rounded bg-blue-500/10 border border-blue-500/20 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Este arquivo define como a IA gera código para seu projeto.
            Adicione preferências, contexto e instruções especiais.
          </p>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "edit" | "preview")} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="edit" className="text-xs" data-testid="tab-edit-replit-md">
              <Code className="w-3 h-3 mr-1" />
              Editar
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs" data-testid="tab-preview-replit-md">
              <Eye className="w-3 h-3 mr-1" />
              Visualizar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="flex-1 mt-3">
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="h-full min-h-[300px] font-mono text-sm resize-none"
              placeholder="# Meu Projeto..."
              data-testid="textarea-replit-md"
            />
          </TabsContent>

          <TabsContent value="preview" className="flex-1 mt-3">
            <ScrollArea className="h-full min-h-[300px] rounded border p-4">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {config?.lastModified && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3 h-3" />
            Última modificação: {new Date(config.lastModified).toLocaleString("pt-BR")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
