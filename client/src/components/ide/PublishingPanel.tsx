import { Upload, Globe, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface PublishingPanelProps {
  onDeploy?: () => void;
  hasFiles?: boolean;
}

export function PublishingPanel({ onDeploy, hasFiles }: PublishingPanelProps) {
  const [isPublished, setIsPublished] = useState(false);

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Publishing</span>
        </div>
        <Badge variant={isPublished ? "default" : "outline"} className="text-xs">
          {isPublished ? "Publicado" : "Rascunho"}
        </Badge>
      </div>
      
      <div className="flex-1 overflow-auto p-3 space-y-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Publicar App
            </CardTitle>
            <CardDescription className="text-xs">
              Torne seu app acessivel publicamente
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {isPublished ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-500 text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>App publicado com sucesso!</span>
                </div>
                <Button variant="outline" size="sm" className="w-full" data-testid="view-published-app">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver App
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {!hasFiles && (
                  <div className="flex items-center gap-2 text-amber-500 text-xs">
                    <AlertCircle className="h-4 w-4" />
                    <span>Crie um projeto primeiro</span>
                  </div>
                )}
                <Button 
                  className="w-full" 
                  size="sm" 
                  onClick={onDeploy}
                  disabled={!hasFiles}
                  data-testid="publish-app"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Publicar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="text-xs text-muted-foreground space-y-2">
          <p>Ao publicar:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Seu app tera uma URL publica</li>
            <li>Qualquer pessoa podera acessar</li>
            <li>Atualizacoes sao automaticas</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
