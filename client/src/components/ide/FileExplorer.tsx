import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, Trash2, Edit2, FilePlus, FolderPlus, Copy, Clipboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}

interface FileNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FileNode[];
}

interface FileExplorerProps {
  files: ProjectFile[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  onAddFile?: (path: string, content: string) => void;
  onDeleteFile?: (path: string) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
  onDuplicateFile?: (path: string) => void;
  projectName?: string;
}

function buildFileTree(files: ProjectFile[]): FileNode[] {
  const root: FileNode[] = [];
  
  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    let currentPath = "";
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = i === parts.length - 1;
      
      let node = current.find(n => n.name === part);
      
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          isFolder: !isLast,
          children: isLast ? undefined : [],
        };
        current.push(node);
      }
      
      if (!isLast && node.children) {
        current = node.children;
      }
    }
  }
  
  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    }).map(node => ({
      ...node,
      children: node.children ? sortNodes(node.children) : undefined,
    }));
  };
  
  return sortNodes(root);
}

function getFileIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    js: "text-yellow-500",
    jsx: "text-yellow-500",
    ts: "text-blue-500",
    tsx: "text-blue-500",
    html: "text-orange-500",
    css: "text-blue-400",
    json: "text-yellow-600",
    md: "text-gray-500",
    py: "text-green-500",
    sql: "text-purple-500",
  };
  return iconMap[ext || ""] || "text-muted-foreground";
}

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascriptreact",
    ts: "typescript",
    tsx: "typescriptreact",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    py: "python",
    sql: "sql",
  };
  return langMap[ext] || "plaintext";
}

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  onDelete?: (path: string) => void;
  onRename?: (oldPath: string, newPath: string) => void;
  onDuplicate?: (path: string) => void;
  onCopyPath?: (path: string) => void;
  onAddFileInFolder?: (folderPath: string) => void;
  editingPath: string | null;
  setEditingPath: (path: string | null) => void;
  editValue: string;
  setEditValue: (value: string) => void;
  onFinishEdit: () => void;
}

function TreeNode({
  node,
  depth,
  selectedFile,
  onSelectFile,
  expandedFolders,
  toggleFolder,
  onDelete,
  onRename,
  onDuplicate,
  onCopyPath,
  onAddFileInFolder,
  editingPath,
  setEditingPath,
  editValue,
  setEditValue,
  onFinishEdit,
}: TreeNodeProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFile === node.path;
  const isEditing = editingPath === node.path;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onFinishEdit();
    } else if (e.key === "Escape") {
      setEditingPath(null);
    }
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "group flex items-center gap-1 py-1 px-2 cursor-pointer hover-elevate rounded-sm",
              isSelected && "bg-accent"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => {
              if (node.isFolder) {
                toggleFolder(node.path);
              } else {
                onSelectFile(node.path);
              }
            }}
            data-testid={`file-${node.path.replace(/\//g, "-")}`}
          >
            {node.isFolder ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-yellow-500" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-yellow-500" />
                )}
              </>
            ) : (
              <>
                <span className="w-3" />
                <File className={cn("h-4 w-4 shrink-0", getFileIcon(node.name))} />
              </>
            )}
            
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={onFinishEdit}
                onKeyDown={handleKeyDown}
                className="h-5 py-0 px-1 text-sm"
                onClick={(e) => e.stopPropagation()}
                data-testid="input-rename-file"
              />
            ) : (
              <span className="text-sm truncate flex-1">{node.name}</span>
            )}

            {!isEditing && (onDelete || onRename) && (
              <div className="invisible group-hover:visible flex items-center gap-0.5 ml-auto">
                {onRename && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditValue(node.name);
                      setEditingPath(node.path);
                    }}
                    className="p-0.5 rounded hover:bg-muted"
                    data-testid={`button-rename-${node.path.replace(/\//g, "-")}`}
                  >
                    <Edit2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(node.path);
                    }}
                    className="p-0.5 rounded hover:bg-destructive/20"
                    data-testid={`button-delete-${node.path.replace(/\//g, "-")}`}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                )}
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48" data-testid="context-menu-file">
          {node.isFolder && onAddFileInFolder && (
            <>
              <ContextMenuItem
                onClick={() => onAddFileInFolder(node.path)}
                data-testid="context-new-file"
              >
                <FilePlus className="h-4 w-4 mr-2" />
                Novo Arquivo
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => onAddFileInFolder(node.path + "/")}
                data-testid="context-new-folder"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova Pasta
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          {onRename && (
            <ContextMenuItem
              onClick={() => {
                setEditValue(node.name);
                setEditingPath(node.path);
              }}
              data-testid="context-rename"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Renomear
            </ContextMenuItem>
          )}
          {onDuplicate && !node.isFolder && (
            <ContextMenuItem
              onClick={() => onDuplicate(node.path)}
              data-testid="context-duplicate"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </ContextMenuItem>
          )}
          {onCopyPath && (
            <ContextMenuItem
              onClick={() => onCopyPath(node.path)}
              data-testid="context-copy-path"
            >
              <Clipboard className="h-4 w-4 mr-2" />
              Copiar Caminho
            </ContextMenuItem>
          )}
          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onDelete(node.path)}
                className="text-destructive focus:text-destructive"
                data-testid="context-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      
      {node.isFolder && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onDelete={onDelete}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onCopyPath={onCopyPath}
              onAddFileInFolder={onAddFileInFolder}
              editingPath={editingPath}
              setEditingPath={setEditingPath}
              editValue={editValue}
              setEditValue={setEditValue}
              onFinishEdit={onFinishEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({
  files,
  selectedFile,
  onSelectFile,
  onAddFile,
  onDeleteFile,
  onRenameFile,
  onDuplicateFile,
  projectName = "meu-projeto",
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["src", "public"]));
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [addingInFolder, setAddingInFolder] = useState<string | null>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  
  const tree = buildFileTree(files);
  
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFinishEdit = () => {
    if (editingPath && editValue.trim() && onRenameFile) {
      const parts = editingPath.split("/");
      parts[parts.length - 1] = editValue.trim();
      const newPath = parts.join("/");
      if (newPath !== editingPath) {
        onRenameFile(editingPath, newPath);
      }
    }
    setEditingPath(null);
    setEditValue("");
  };

  const handleAddFile = () => {
    if (newFileName.trim() && onAddFile) {
      let path = newFileName.trim();
      if (addingInFolder && !path.startsWith(addingInFolder)) {
        path = `${addingInFolder}/${path}`;
      }
      onAddFile(path, "");
      setNewFileName("");
      setIsAddingFile(false);
      setAddingInFolder(null);
      if (!path.endsWith("/")) {
        onSelectFile(path);
      }
    }
  };

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
  };

  const handleAddFileInFolder = (folderPath: string) => {
    const isNewFolder = folderPath.endsWith("/");
    if (isNewFolder) {
      setNewFileName("nova-pasta/");
      setAddingInFolder(folderPath.slice(0, -1));
    } else {
      setNewFileName("");
      setAddingInFolder(folderPath);
    }
    setIsAddingFile(true);
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.add(folderPath.replace(/\/$/, ""));
      return next;
    });
  };

  const handleDuplicate = (path: string) => {
    if (onDuplicateFile) {
      onDuplicateFile(path);
    } else if (onAddFile) {
      const file = files.find(f => f.path === path);
      if (file) {
        const parts = path.split(".");
        const ext = parts.pop() || "";
        const baseName = parts.join(".");
        const newPath = `${baseName}-copy.${ext}`;
        onAddFile(newPath, file.content);
        onSelectFile(newPath);
      }
    }
  };

  useEffect(() => {
    if (isAddingFile && newFileInputRef.current) {
      newFileInputRef.current.focus();
    }
  }, [isAddingFile]);
  
  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex items-center justify-between gap-2 p-2 border-b">
        <span className="text-sm font-medium truncate">{projectName}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" data-testid="button-add-file">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setIsAddingFile(true)}
              data-testid="menu-new-file"
            >
              <FilePlus className="h-4 w-4 mr-2" />
              Novo Arquivo
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setNewFileName("nova-pasta/");
                setIsAddingFile(true);
              }}
              data-testid="menu-new-folder"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Nova Pasta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="py-2">
          {isAddingFile && (
            <div className="px-2 py-1 flex items-center gap-1">
              <File className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                ref={newFileInputRef}
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onBlur={() => {
                  if (newFileName.trim()) {
                    handleAddFile();
                  } else {
                    setIsAddingFile(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddFile();
                  } else if (e.key === "Escape") {
                    setIsAddingFile(false);
                    setNewFileName("");
                  }
                }}
                placeholder="nome-do-arquivo.ts"
                className="h-5 py-0 px-1 text-sm"
                data-testid="input-new-file-name"
              />
            </div>
          )}
          
          {tree.length === 0 && !isAddingFile ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
              Nenhum arquivo ainda.
              <br />
              Converse com a IA para gerar seu projeto!
            </div>
          ) : (
            tree.map(node => (
              <TreeNode
                key={node.path}
                node={node}
                depth={0}
                selectedFile={selectedFile}
                onSelectFile={onSelectFile}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                onDelete={onDeleteFile}
                onRename={onRenameFile}
                onDuplicate={handleDuplicate}
                onCopyPath={handleCopyPath}
                onAddFileInFolder={handleAddFileInFolder}
                editingPath={editingPath}
                setEditingPath={setEditingPath}
                editValue={editValue}
                setEditValue={setEditValue}
                onFinishEdit={handleFinishEdit}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
