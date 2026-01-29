import { useState, useCallback, useRef, useMemo } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  X, 
  Save, 
  FileCode, 
  Loader2,
  Circle,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  AlertTriangle,
  Sparkles,
  Send
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
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

interface FileInfo {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: FileInfo[];
}

interface WorkspaceFile {
  id: string;
  path: string;
  content: string;
  language: string;
  isModified: boolean;
  originalContent: string;
}

interface WorkspaceEditorProps {
  projectId: number | null;
  theme?: "vs-dark" | "light";
  className?: string;
}

const getLanguageFromPath = (path: string): string => {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
    py: "python",
    sql: "sql",
    sh: "shell",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    php: "php",
  };
  return langMap[ext] || "plaintext";
};

export function WorkspaceEditor({ projectId, theme = "vs-dark", className }: WorkspaceEditorProps) {
  const [openFiles, setOpenFiles] = useState<WorkspaceFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingCloseFileId, setPendingCloseFileId] = useState<string | null>(null);
  const openFilesRef = useRef<WorkspaceFile[]>([]);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  openFilesRef.current = openFiles;
  
  const { toast } = useToast();

  // Autosave after 2 seconds of inactivity
  const scheduleAutosave = useCallback((file: WorkspaceFile) => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(() => {
      if (file.isModified) {
        saveFileMutation.mutate(file);
      }
    }, 2000);
  }, []);

  const { data: fileTree, isLoading: filesLoading, error: filesError } = useQuery<FileInfo[]>({
    queryKey: ["/api/workspace/files", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/workspace/files?projectId=${projectId}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Falha ao carregar arquivos");
      return response.json();
    },
    enabled: !!projectId && projectId > 0,
  });

  const saveFileMutation = useMutation({
    mutationFn: async (file: WorkspaceFile) => {
      const response = await apiRequest("POST", "/api/workspace/save", {
        projectId,
        path: file.path,
        content: file.content,
      });
      return response.json();
    },
    onSuccess: (_, savedFile) => {
      setOpenFiles(prev => 
        prev.map(f => f.id === savedFile.id 
          ? { ...f, isModified: false, originalContent: savedFile.content } 
          : f
        )
      );
      toast({ title: "Salvo!", description: savedFile.path });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao salvar", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const activeFile = useMemo(() => 
    openFiles.find(f => f.id === activeFileId),
    [openFiles, activeFileId]
  );

  const loadFileContent = useCallback(async (path: string) => {
    if (!projectId) return null;
    
    try {
      const response = await fetch(`/api/workspace/file/${projectId}/${encodeURIComponent(path)}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Falha ao carregar arquivo");
      const data = await response.json();
      return data.content;
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar arquivo", variant: "destructive" });
      return null;
    }
  }, [projectId, toast]);

  const openFile = useCallback(async (path: string) => {
    const existing = openFilesRef.current.find(f => f.path === path);
    if (existing) {
      setActiveFileId(existing.id);
      return;
    }

    const content = await loadFileContent(path);
    if (content === null) return;

    const newFile: WorkspaceFile = {
      id: path,
      path,
      content,
      language: getLanguageFromPath(path),
      isModified: false,
      originalContent: content,
    };
    setOpenFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  }, [loadFileContent]);

  const closeFileById = useCallback((fileId: string, currentActiveId: string | null) => {
    setOpenFiles(prev => {
      const filtered = prev.filter(f => f.id !== fileId);
      
      if (currentActiveId === fileId) {
        if (filtered.length > 0) {
          const lastFile = filtered[filtered.length - 1];
          setActiveFileId(lastFile.id);
        } else {
          setActiveFileId(null);
        }
      }
      
      return filtered;
    });
  }, []);

  const requestCloseFile = useCallback((fileId: string) => {
    const file = openFilesRef.current.find(f => f.id === fileId);
    if (file?.isModified) {
      setPendingCloseFileId(fileId);
      setShowUnsavedDialog(true);
      return;
    }

    closeFileById(fileId, activeFileId);
  }, [closeFileById, activeFileId]);

  const forceCloseFile = useCallback(() => {
    if (!pendingCloseFileId) return;
    
    closeFileById(pendingCloseFileId, activeFileId);
    setPendingCloseFileId(null);
    setShowUnsavedDialog(false);
  }, [pendingCloseFileId, closeFileById, activeFileId]);

  const saveAndCloseFile = useCallback(() => {
    if (!pendingCloseFileId) return;
    
    const file = openFilesRef.current.find(f => f.id === pendingCloseFileId);
    if (file) {
      saveFileMutation.mutate(file, {
        onSuccess: () => {
          forceCloseFile();
        }
      });
    }
  }, [pendingCloseFileId, saveFileMutation, forceCloseFile]);

  const handleContentChange = useCallback((value: string | undefined) => {
    if (!activeFileId || value === undefined) return;
    
    setOpenFiles(prev => {
      const updated = prev.map(f => {
        if (f.id !== activeFileId) return f;
        const isModified = value !== f.originalContent;
        const updatedFile = { ...f, content: value, isModified };
        if (isModified) {
          scheduleAutosave(updatedFile);
        }
        return updatedFile;
      });
      return updated;
    });
  }, [activeFileId, scheduleAutosave]);

  const handleSave = useCallback(() => {
    const file = openFilesRef.current.find(f => f.id === activeFileId);
    if (file && file.isModified) {
      saveFileMutation.mutate(file);
    }
  }, [activeFileId, saveFileMutation]);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  }, [handleSave]);

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const renderFileTree = useCallback((items: FileInfo[], depth: number = 0): JSX.Element[] => {
    return items.map((item) => {
      const isExpanded = expandedDirs.has(item.path);
      const isActive = activeFileId === item.path;

      if (item.type === "directory") {
        return (
          <div key={item.path}>
            <div
              className="flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover-elevate rounded-sm"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={() => toggleDir(item.path)}
              data-testid={`folder-${item.name}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-3.5 w-3.5 text-yellow-500" />
              ) : (
                <Folder className="h-3.5 w-3.5 text-yellow-500" />
              )}
              <span className="truncate text-zinc-300">{item.name}</span>
            </div>
            {isExpanded && item.children && (
              <div>{renderFileTree(item.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      return (
        <div
          key={item.path}
          className={`flex items-center gap-1 px-2 py-1 text-xs cursor-pointer hover-elevate rounded-sm text-zinc-300 ${
            isActive ? "bg-accent" : ""
          }`}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
          onClick={() => openFile(item.path)}
          data-testid={`file-${item.name}`}
        >
          <FileCode className="h-3.5 w-3.5 text-blue-400" />
          <span className="truncate">{item.name}</span>
        </div>
      );
    });
  }, [expandedDirs, activeFileId, toggleDir, openFile]);

  if (!projectId || projectId <= 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-[#1e1e1e] text-zinc-400 ${className}`}>
        <FileCode className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">Nenhum projeto selecionado</p>
        <p className="text-xs mt-1 text-zinc-500">Crie ou selecione um projeto para editar arquivos</p>
      </div>
    );
  }

  const pendingFile = pendingCloseFileId 
    ? openFilesRef.current.find(f => f.id === pendingCloseFileId) 
    : null;

  return (
    <>
      <div className={`flex h-full bg-[#1e1e1e] ${className}`}>
        <div className="w-48 border-r border-[#3c3c3c] bg-[#252526] flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[#3c3c3c]">
            <FolderOpen className="h-4 w-4 text-yellow-500" />
            <span className="text-xs font-medium text-zinc-300">Arquivos</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-1">
              {filesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
                </div>
              ) : filesError ? (
                <div className="px-3 py-4 text-xs text-red-400 text-center">
                  Erro ao carregar arquivos
                </div>
              ) : fileTree && fileTree.length > 0 ? (
                renderFileTree(fileTree)
              ) : (
                <div className="px-3 py-4 text-xs text-zinc-500 text-center">
                  Nenhum arquivo ainda
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-1 bg-[#252526] border-b border-[#3c3c3c] min-h-[36px]">
            <ScrollArea className="flex-1">
              <div className="flex items-center">
                {openFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    className={`
                      group flex items-center gap-2 px-3 py-2 border-r border-[#3c3c3c] cursor-pointer
                      ${activeFileId === file.id 
                        ? "bg-[#1e1e1e] text-white" 
                        : "bg-[#2d2d2d] text-zinc-400 hover:bg-[#323232]"
                      }
                    `}
                    data-testid={`tab-file-${file.path.replace(/\//g, "-")}`}
                  >
                    <FileCode className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-xs whitespace-nowrap">
                      {file.path.split("/").pop()}
                    </span>
                    {file.isModified && (
                      <Circle className="h-2 w-2 fill-orange-400 text-orange-400" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); requestCloseFile(file.id); }}
                      className="opacity-0 group-hover:opacity-100 hover:bg-zinc-600 rounded p-0.5 transition-opacity"
                      data-testid={`button-close-${file.path.replace(/\//g, "-")}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {activeFile && (
              <div className="flex items-center gap-1 px-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleSave}
                  disabled={!activeFile.isModified || saveFileMutation.isPending}
                  data-testid="button-save-file"
                >
                  {saveFileMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            {activeFile ? (
              <Editor
                height="100%"
                language={activeFile.language}
                value={activeFile.content}
                theme={theme}
                onChange={handleContentChange}
                onMount={handleEditorMount}
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  tabSize: 2,
                  automaticLayout: true,
                  padding: { top: 10 },
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <FileCode className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">Selecione um arquivo para editar</p>
                <p className="text-xs mt-1 text-zinc-600">Clique em um arquivo na árvore à esquerda</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showUnsavedDialog} onOpenChange={(open) => {
        if (!open) {
          setShowUnsavedDialog(false);
          setPendingCloseFileId(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alterações não salvas
            </AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo "{pendingFile?.path.split("/").pop()}" tem alterações não salvas. O que deseja fazer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowUnsavedDialog(false);
              setPendingCloseFileId(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={saveAndCloseFile}
              disabled={saveFileMutation.isPending}
            >
              {saveFileMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar e fechar
            </Button>
            <Button
              variant="destructive"
              onClick={forceCloseFile}
            >
              Descartar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
