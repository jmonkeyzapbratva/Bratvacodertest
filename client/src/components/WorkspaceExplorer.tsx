import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Plus,
  RefreshCw,
  Loader2,
  FileCode,
  FileJson,
  FileText,
  Image,
  FolderPlus,
  Trash2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface FileInfo {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: FileInfo[];
}

interface WorkspaceExplorerProps {
  projectId: number;
  onFileSelect?: (filePath: string) => void;
  onClose?: () => void;
}

const fileIcons: Record<string, typeof File> = {
  js: FileCode,
  jsx: FileCode,
  ts: FileCode,
  tsx: FileCode,
  json: FileJson,
  md: FileText,
  txt: FileText,
  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  svg: Image,
};

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return fileIcons[ext] || File;
}

function FileTreeItem({ 
  item, 
  depth = 0, 
  onSelect,
  projectId,
  onRefresh
}: { 
  item: FileInfo; 
  depth?: number;
  onSelect?: (path: string) => void;
  projectId: number;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isFolder = item.type === "directory";
  const Icon = isFolder ? Folder : getFileIcon(item.name);
  
  const deleteFile = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/projects/${projectId}/files?path=${encodeURIComponent(item.path)}`);
    },
    onSuccess: onRefresh,
  });

  const handleClick = () => {
    if (isFolder) {
      setExpanded(!expanded);
    } else {
      onSelect?.(item.path);
    }
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <button
            onClick={handleClick}
            className="w-full flex items-center gap-2 py-1 px-2 hover-elevate rounded text-left text-sm"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            data-testid={`file-item-${item.path.replace(/\//g, "-")}`}
          >
            {isFolder && (
              expanded ? (
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              )
            )}
            {!isFolder && <span className="w-3" />}
            
            <Icon className={`h-4 w-4 shrink-0 ${isFolder ? "text-yellow-500" : "text-muted-foreground"}`} />
            <span className="truncate">{item.name}</span>
            
            {item.size !== undefined && !isFolder && (
              <span className="ml-auto text-xs text-muted-foreground">
                {item.size < 1024 ? `${item.size}B` : `${(item.size / 1024).toFixed(1)}KB`}
              </span>
            )}
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem 
            className="text-destructive"
            onClick={() => deleteFile.mutate()}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {isFolder && expanded && item.children && (
        <div>
          {item.children.map(child => (
            <FileTreeItem 
              key={child.path} 
              item={child} 
              depth={depth + 1}
              onSelect={onSelect}
              projectId={projectId}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkspaceExplorer({ projectId, onFileSelect, onClose }: WorkspaceExplorerProps) {
  const [newFileDialog, setNewFileDialog] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [newFileType, setNewFileType] = useState<"file" | "folder">("file");

  const { data: files, isLoading, refetch } = useQuery<FileInfo[]>({
    queryKey: ["/api/projects", projectId, "files"],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/files`, { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar arquivos");
      return res.json();
    },
    enabled: !!projectId,
  });

  const createFile = useMutation({
    mutationFn: async ({ path, isFolder }: { path: string; isFolder: boolean }) => {
      if (isFolder) {
        await apiRequest("POST", `/api/projects/${projectId}/folders`, { path });
      } else {
        await apiRequest("POST", `/api/projects/${projectId}/files`, { path, content: "" });
      }
    },
    onSuccess: () => {
      refetch();
      setNewFileDialog(false);
      setNewFilePath("");
    },
  });

  const initWorkspace = useMutation({
    mutationFn: async (template: string) => {
      await apiRequest("POST", `/api/projects/${projectId}/workspace/init`, { template });
    },
    onSuccess: () => refetch(),
  });

  return (
    <div className="flex flex-col h-full bg-sidebar" data-testid="workspace-explorer">
      <div className="h-12 border-b flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <Folder className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Arquivos</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setNewFileType("file"); setNewFileDialog(true); }}
            data-testid="button-new-file"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setNewFileType("folder"); setNewFileDialog(true); }}
            data-testid="button-new-folder"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => refetch()}
            data-testid="button-refresh-files"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              data-testid="button-close-explorer"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : files && files.length > 0 ? (
          <div className="py-2">
            {files.map(file => (
              <FileTreeItem 
                key={file.path} 
                item={file} 
                onSelect={onFileSelect}
                projectId={projectId}
                onRefresh={() => refetch()}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <Folder className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Nenhum arquivo ainda
            </p>
            <div className="space-y-2">
              <Button
                size="sm"
                onClick={() => initWorkspace.mutate("react")}
                disabled={initWorkspace.isPending}
                data-testid="button-template-react"
              >
                {initWorkspace.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Iniciar com React
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => initWorkspace.mutate("node")}
                disabled={initWorkspace.isPending}
                data-testid="button-template-node"
              >
                Iniciar com Node.js
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => initWorkspace.mutate("html")}
                disabled={initWorkspace.isPending}
                data-testid="button-template-html"
              >
                Iniciar com HTML/CSS
              </Button>
            </div>
          </div>
        )}
      </ScrollArea>

      <Dialog open={newFileDialog} onOpenChange={setNewFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newFileType === "file" ? "Novo Arquivo" : "Nova Pasta"}
            </DialogTitle>
            <DialogDescription>
              Digite o caminho do {newFileType === "file" ? "arquivo" : "pasta"}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newFilePath}
            onChange={(e) => setNewFilePath(e.target.value)}
            placeholder={newFileType === "file" ? "src/components/Button.tsx" : "src/utils"}
            data-testid="input-new-file-path"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFileDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createFile.mutate({ path: newFilePath, isFolder: newFileType === "folder" })}
              disabled={!newFilePath.trim() || createFile.isPending}
            >
              {createFile.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
