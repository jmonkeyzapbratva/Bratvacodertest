import { Wrench, RefreshCw, Bug, Gauge, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export function DeveloperPanel() {
  const [devMode, setDevMode] = useState(true);
  const [hotReload, setHotReload] = useState(true);

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Developer</span>
        </div>
        <Badge variant="secondary" className="text-xs">Dev</Badge>
      </div>
      
      <div className="flex-1 overflow-auto p-3 space-y-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Ferramentas Dev</CardTitle>
            <CardDescription className="text-xs">
              Configuracoes para desenvolvimento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Modo Debug</span>
              </div>
              <Switch 
                checked={devMode} 
                onCheckedChange={setDevMode}
                data-testid="dev-mode-toggle"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Hot Reload</span>
              </div>
              <Switch 
                checked={hotReload} 
                onCheckedChange={setHotReload}
                data-testid="hot-reload-toggle"
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Build Time</span>
              <span>1.2s</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Bundle Size</span>
              <span>245 KB</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Memory</span>
              <span>128 MB</span>
            </div>
          </CardContent>
        </Card>
        
        <Button variant="outline" size="sm" className="w-full" data-testid="clear-cache">
          <RefreshCw className="h-4 w-4 mr-2" />
          Limpar Cache
        </Button>
      </div>
    </div>
  );
}
