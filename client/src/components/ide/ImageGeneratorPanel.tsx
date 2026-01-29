import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Image as ImageIcon, 
  Palette, 
  Wand2, 
  Loader2,
  Download,
  Copy,
  Check,
  Sparkles
} from "lucide-react";

interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  width: number;
  height: number;
  createdAt: string;
}

type ImageStyle = "icon" | "logo" | "illustration" | "photo" | "ui";

const styleConfig: Record<ImageStyle, { label: string; description: string }> = {
  icon: { label: "Ícone", description: "Ícones simples e flat" },
  logo: { label: "Logo", description: "Logos profissionais" },
  illustration: { label: "Ilustração", description: "Ilustrações digitais" },
  photo: { label: "Foto", description: "Imagens fotorrealistas" },
  ui: { label: "Interface", description: "Elementos de interface" },
};

interface ImageGeneratorPanelProps {
  projectId?: number;
  onImageGenerated?: (image: GeneratedImage) => void;
}

export function ImageGeneratorPanel({ projectId, onImageGenerated }: ImageGeneratorPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<ImageStyle>("illustration");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const hasValidProject = !!projectId && projectId > 0;

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!hasValidProject) {
        return null;
      }
      const response = await apiRequest("POST", "/api/media/generate", {
        prompt,
        style,
        projectId,
      });
      return response.json();
    },
    onSuccess: (image: GeneratedImage | null) => {
      if (!image) return;
      setGeneratedImages([image, ...generatedImages]);
      onImageGenerated?.(image);
      setPrompt("");
      toast({ title: "Imagem gerada!", description: "Clique para copiar ou baixar" });
    },
    onError: (error: any) => {
      if (hasValidProject) {
        toast({ title: "Erro ao gerar imagem", description: error.message, variant: "destructive" });
      }
    },
  });

  const copyToClipboard = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {}
  };

  return (
    <Card className="border-0 shadow-none h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Geração de Imagens
        </CardTitle>
        <CardDescription className="text-xs">
          Crie ícones, logos e ilustrações com IA
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="space-y-3">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva a imagem que você quer..."
            data-testid="input-image-prompt"
          />

          <Tabs value={style} onValueChange={(v) => setStyle(v as ImageStyle)}>
            <TabsList className="grid grid-cols-5 h-8">
              {(Object.keys(styleConfig) as ImageStyle[]).map((s) => (
                <TabsTrigger
                  key={s}
                  value={s}
                  className="text-xs"
                  data-testid={`tab-style-${s}`}
                >
                  {styleConfig[s].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <p className="text-xs text-muted-foreground">
            {styleConfig[style].description}
          </p>

          <Button
            className="w-full"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !prompt.trim() || !hasValidProject}
            data-testid="button-generate-image"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Gerar Imagem
              </>
            )}
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 gap-2 pr-2">
            {generatedImages.map((image) => (
              <div
                key={image.id}
                className="relative group rounded-md overflow-hidden border bg-muted/30"
                data-testid={`card-imagem-${image.id}`}
              >
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(image.url, image.id)}
                    title="Copiar link"
                    data-testid={`button-copiar-imagem-${image.id}`}
                  >
                    {copiedId === image.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    asChild
                    title="Baixar imagem"
                  >
                    <a href={image.url} download data-testid={`button-baixar-imagem-${image.id}`}>
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-[10px] text-white truncate">
                    {image.prompt}
                  </p>
                </div>
              </div>
            ))}

            {generatedImages.length === 0 && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma imagem gerada</p>
                <p className="text-xs mt-1">
                  {hasValidProject 
                    ? "Descreva o que você precisa acima" 
                    : "Selecione um projeto para gerar imagens"}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
