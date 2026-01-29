import { Bot, Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export function AgentPanel() {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Bratvacoder</span>
        </div>
        <Badge variant="secondary" className="text-xs">Beta</Badge>
      </div>
      
      <div className="flex-1 overflow-auto p-3 space-y-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Agente Autônomo</CardTitle>
            <CardDescription className="text-xs">
              IA que faz mudancas automaticamente no seu codigo
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={isRunning ? "default" : "outline"} className="text-xs">
                  {isRunning ? "Executando" : "Parado"}
                </Badge>
              </div>
              
              <Button
                className="w-full"
                size="sm"
                onClick={() => setIsRunning(!isRunning)}
                data-testid="agent-toggle"
              >
                {isRunning ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Parar Agente
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Agente
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-xs text-muted-foreground space-y-2">
          <p>O Bratvacoder pode:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Escrever e editar codigo</li>
            <li>Criar novos arquivos</li>
            <li>Instalar dependencias</li>
            <li>Executar comandos</li>
            <li>Corrigir erros automaticamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
