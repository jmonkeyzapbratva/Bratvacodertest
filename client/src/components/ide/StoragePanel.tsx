import { HardDrive, Upload, Trash2, FolderOpen, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function StoragePanel() {
  const usedStorage = 12; // MB
  const totalStorage = 500; // MB
  const usagePercent = (usedStorage / totalStorage) * 100;

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">App Storage</span>
        </div>
        <Badge variant="secondary" className="text-xs">{usedStorage} MB</Badge>
      </div>
      
      <div className="flex-1 overflow-auto p-3 space-y-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Object Storage</CardTitle>
            <CardDescription className="text-xs">
              Armazene arquivos para seu app
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Uso</span>
                <span>{usedStorage} MB / {totalStorage} MB</span>
              </div>
              <Progress value={usagePercent} className="h-2" />
            </div>
            
            <Button className="w-full" size="sm" variant="outline" data-testid="upload-file">
              <Upload className="h-4 w-4 mr-2" />
              Fazer Upload
            </Button>
          </CardContent>
        </Card>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Arquivos</span>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <FolderOpen className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground p-3 rounded-md bg-muted/50 border border-border">
            Nenhum arquivo armazenado ainda.
          </div>
        </div>
      </div>
    </div>
  );
}
