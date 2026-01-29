import { MessageSquare, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function AssistantPanel() {
  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Assistant</span>
        </div>
        <Badge variant="secondary" className="text-xs">AI</Badge>
      </div>
      
      <div className="flex-1 overflow-auto p-3 space-y-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Assistente IA
            </CardTitle>
            <CardDescription className="text-xs">
              Responde perguntas e ajuda a refinar seu codigo
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-xs text-muted-foreground space-y-2">
              <p>Use o chat lateral para:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Fazer perguntas sobre codigo</li>
                <li>Pedir explicacoes</li>
                <li>Sugerir melhorias</li>
                <li>Debugar problemas</li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        <div className="p-3 rounded-md bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            O Assistant esta integrado no painel de chat a direita. 
            Digite sua mensagem para comecar uma conversa.
          </p>
        </div>
      </div>
    </div>
  );
}
