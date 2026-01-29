import { useState } from "react";
import { Copy, Check, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";

interface CodePreviewProps {
  code: string;
  language?: string;
  filename?: string;
  showDownload?: boolean;
  projectName?: string;
}

const languageLabels: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  html: "HTML",
  css: "CSS",
  json: "JSON",
  markup: "HTML",
};

export function CodePreview({ 
  code, 
  language = "javascript", 
  filename,
  showDownload = true,
  projectName = "projeto"
}: CodePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "Copiado!",
        description: "Código copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code, 
          language,
          projectName,
        }),
      });

      if (!response.ok) throw new Error("Erro ao gerar download");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName}.zip`;
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
    } finally {
      setDownloading(false);
    }
  };

  const prismLanguage = language === "html" ? "markup" : language;
  const highlightedCode = Prism.highlight(
    code,
    Prism.languages[prismLanguage] || Prism.languages.javascript,
    prismLanguage
  );

  const lineCount = code.split("\n").length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4 p-3 bg-muted/50">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" size="sm">
            {languageLabels[language] || language}
          </Badge>
          {filename && (
            <span className="text-sm text-muted-foreground font-mono">
              {filename}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {lineCount} linhas
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            data-testid="button-copy-code"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          {showDownload && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              disabled={downloading}
              data-testid="button-download-code"
            >
              <Download className={`h-4 w-4 ${downloading ? "animate-pulse" : ""}`} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            data-testid="button-toggle-code"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="p-0">
          <div className="relative overflow-x-auto bg-[#1e1e1e] dark:bg-[#0d0d0d]">
            <pre className="p-4 text-sm leading-relaxed overflow-x-auto">
              <code
                className="font-mono text-[#d4d4d4]"
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              />
            </pre>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
