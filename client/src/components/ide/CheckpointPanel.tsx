import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  History, 
  RotateCcw, 
  Clock, 
  GitCommit,
  Database,
  FileCode,
  MessageSquare,
  Loader2,
  ChevronRight,
  AlertTriangle
} from "lucide-react";

interface Checkpoint {
  id: string;
  projectId: number;
  name: string;
  description: string;
  createdAt: string;
  type: "auto" | "manual";
  filesCount: number;
  hasDatabase: boolean;
  hasConversation: boolean;
}

interface CheckpointPanelProps {
  projectId: number;
}

export function CheckpointPanel({ projectId }: CheckpointPanelProps) {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const { data: checkpoints = [], isLoading } = useQuery<Checkpoint[]>({
    queryKey: ["/api/checkpoints", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const response = await fetch(`/api/checkpoints?projectId=${projectId}`, { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!projectId && projectId > 0,
  });

  const createCheckpointMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/checkpoints", {
        projectId,
        name: `Checkpoint manual - ${new Date().toLocaleString("pt-BR")}`,
        description: "Checkpoint criado manualmente",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkpoints", projectId] });
    },
  });

  const restoreCheckpointMutation = useMutation({
    mutationFn: async (checkpointId: string) => {
      const response = await apiRequest("POST", `/api/checkpoints/${checkpointId}/restore`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkpoints", projectId] });
      setShowRestoreDialog(false);
      setSelectedCheckpoint(null);
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <>
      <Card className="border-0 shadow-none h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" />
              Checkpoints
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => createCheckpointMutation.mutate()}
              disabled={createCheckpointMutation.isPending}
              data-testid="button-create-checkpoint"
            >
              {createCheckpointMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GitCommit className="w-4 h-4" />
              )}
            </Button>
          </div>
          <CardDescription className="text-xs">
            Restaure versões anteriores do projeto
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : checkpoints.length > 0 ? (
                checkpoints.map((checkpoint) => (
                  <div
                    key={checkpoint.id}
                    className="p-3 rounded-md border bg-card hover-elevate cursor-pointer"
                    onClick={() => {
                      setSelectedCheckpoint(checkpoint);
                      setShowRestoreDialog(true);
                    }}
                    data-testid={`checkpoint-${checkpoint.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded bg-muted/50">
                        <GitCommit className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {checkpoint.name}
                          </span>
                          {checkpoint.type === "auto" && (
                            <Badge variant="secondary" className="text-[10px]">
                              Auto
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {checkpoint.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(checkpoint.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileCode className="w-3 h-3" />
                            {checkpoint.filesCount} arquivos
                          </span>
                          {checkpoint.hasDatabase && (
                            <span className="flex items-center gap-1">
                              <Database className="w-3 h-3" />
                              DB
                            </span>
                          )}
                          {checkpoint.hasConversation && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              Chat
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum checkpoint</p>
                  <p className="text-xs mt-1">
                    Checkpoints sao criados automaticamente
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Restaurar Checkpoint?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso ira substituir os arquivos atuais pelos do checkpoint{" "}
              <strong>"{selectedCheckpoint?.name}"</strong>.
              {selectedCheckpoint?.hasDatabase && (
                <span className="block mt-2 text-amber-600">
                  O banco de dados tambem sera restaurado.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restore">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCheckpoint && restoreCheckpointMutation.mutate(selectedCheckpoint.id)}
              disabled={restoreCheckpointMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600"
              data-testid="button-confirm-restore"
            >
              {restoreCheckpointMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
