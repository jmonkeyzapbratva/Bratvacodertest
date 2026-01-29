import { Lock, Users, Key, Settings, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export function AuthPanel() {
  const [authEnabled, setAuthEnabled] = useState(false);

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Auth</span>
        </div>
        <Badge variant={authEnabled ? "default" : "outline"} className="text-xs">
          {authEnabled ? "Ativo" : "Inativo"}
        </Badge>
      </div>
      
      <div className="flex-1 overflow-auto p-3 space-y-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Autenticacao</CardTitle>
            <CardDescription className="text-xs">
              Adicione login de usuarios ao seu app
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Habilitar Auth</span>
              <Switch 
                checked={authEnabled} 
                onCheckedChange={setAuthEnabled}
                data-testid="auth-toggle"
              />
            </div>
            
            {authEnabled && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-green-500 text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Auth configurado</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Provedores
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50">
              <span>Google</span>
              <Badge variant="outline" className="text-xs">Disponivel</Badge>
            </div>
            <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50">
              <span>GitHub</span>
              <Badge variant="outline" className="text-xs">Disponivel</Badge>
            </div>
            <div className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50">
              <span>Email/Senha</span>
              <Badge variant="outline" className="text-xs">Disponivel</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
