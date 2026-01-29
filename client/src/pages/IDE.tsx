import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileExplorer, type ProjectFile } from "@/components/ide/FileExplorer";
import { CodeEditor } from "@/components/ide/CodeEditor";
import { Terminal } from "@/components/ide/Terminal";
import { Preview } from "@/components/ide/Preview";
import { ChatAssistant } from "@/components/ide/ChatAssistant";
import { Sidebar } from "@/components/ide/Sidebar";
import { Header } from "@/components/ide/Header";
import { EditorTabs } from "@/components/ide/EditorTabs";
import { FileBreadcrumb } from "@/components/ide/FileBreadcrumb";
import { SearchPanel } from "@/components/ide/SearchPanel";
import { GitPanel } from "@/components/ide/GitPanel";
import { SecretsPanel } from "@/components/ide/SecretsPanel";
import { PackagesPanel } from "@/components/ide/PackagesPanel";
import { DeployDialog } from "@/components/ide/DeployDialog";
import { StatusBar } from "@/components/ide/StatusBar";
import { BottomBar } from "@/components/ide/BottomBar";
import { AgentPanel } from "@/components/ide/AgentPanel";
import { AssistantPanel } from "@/components/ide/AssistantPanel";
import { PublishingPanel } from "@/components/ide/PublishingPanel";
import { StoragePanel } from "@/components/ide/StoragePanel";
import { AuthPanel } from "@/components/ide/AuthPanel";
import { ConsolePanel } from "@/components/ide/ConsolePanel";
import { DatabasePanel } from "@/components/ide/DatabasePanel";
import { DeveloperPanel } from "@/components/ide/DeveloperPanel";
import { IntegrationsPanel } from "@/components/ide/IntegrationsPanel";
import { MultiplayerPanel } from "@/components/ide/MultiplayerPanel";
import { PreviewPanel } from "@/components/ide/PreviewPanel";
import { useToast } from "@/hooks/use-toast";
import { useHotReload } from "@/hooks/useHotReload";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { webcontainerService, detectLanguage, getRunCommand } from "@/lib/webcontainerService";
import { ChevronLeft, ChevronRight, Bot, Eye, Terminal as TerminalIcon, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
}

interface ConversationData {
  id: number;
  title: string;
  status: string;
}

interface MessageData {
  id: number;
  role: string;
  content: string;
  messageType: string;
  codeGenerated?: string;
  metadata?: string;
}

interface ChatResponse {
  message: string;
  isCodeReady: boolean;
  code?: string;
  files?: { filename: string; content: string; language: string }[];
  messageType: string;
}

interface Project {
  id: number;
  name: string;
  code: string;
  language: string;
}

function parseProjectFiles(code: string, language: string): ProjectFile[] {
  const files: ProjectFile[] = [];
  const fileRegex = /===\s*ARQUIVO:\s*([^\s=]+)\s*===/g;
  const parts = code.split(fileRegex);
  
  if (parts.length > 1) {
    for (let i = 1; i < parts.length; i += 2) {
      const filename = parts[i];
      const content = parts[i + 1]?.trim() || "";
      const ext = filename.split(".").pop() || "";
      const langMap: Record<string, string> = {
        js: "javascript",
        ts: "typescript",
        jsx: "javascriptreact",
        tsx: "typescriptreact",
        py: "python",
        html: "html",
        css: "css",
        json: "json",
        md: "markdown",
      };
      files.push({
        path: filename,
        content,
        language: langMap[ext] || language,
      });
    }
  } else if (code.trim()) {
    const extMap: Record<string, string> = {
      python: "py",
      typescript: "ts",
      javascript: "js",
      html: "html",
      css: "css",
    };
    const ext = extMap[language] || "js";
    const filename = language === "html" ? "index.html" : `main.${ext}`;
    files.push({
      path: filename,
      content: code,
      language,
    });
  }
  
  return files;
}

export default function IDE() {
  const [, params] = useRoute("/ide/:projectId");
  const projectId = params?.projectId;
  
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [terminalWriter, setTerminalWriter] = useState<((data: string) => void) | null>(null);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [activePanel, setActivePanel] = useState("files");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [projectName, setProjectName] = useState("Novo Projeto");
  const [isWebContainerReady, setIsWebContainerReady] = useState(false);
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const filesRef = useRef<ProjectFile[]>([]);
  const [dirtyFiles, setDirtyFiles] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastSavedContentRef = useRef<Map<string, string>>(new Map());
  
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState("preview");
  
  const { toast } = useToast();
  
  const handleHotReloadRefresh = useCallback(() => {
    setPreviewUrl(prev => prev ? `${prev.split('?')[0]}?_hr=${Date.now()}` : undefined);
    queryClient.invalidateQueries({ queryKey: ["/api/managed-projects", projectId] });
  }, [projectId]);

  const { isConnected: isHotReloadConnected, lastUpdate: lastHotReloadUpdate } = useHotReload({
    projectId: projectId ? parseInt(projectId) : null,
    onFileChange: (filePath, type) => {
      if (type === "updated" || type === "created") {
        queryClient.invalidateQueries({ queryKey: ["/api/managed-projects", projectId, "files"] });
      }
    },
    onRefreshRequired: handleHotReloadRefresh,
    enabled: !!projectId && isRunning,
  });
  
  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Erro ao carregar projeto");
      return res.json();
    },
    enabled: !!projectId,
  });
  
  useEffect(() => {
    if (project) {
      const parsedFiles = parseProjectFiles(project.code, project.language);
      setFiles(parsedFiles);
      setProjectName(project.name);
      parsedFiles.forEach((f) => {
        lastSavedContentRef.current.set(f.path, f.content);
      });
      setDirtyFiles(new Set());
      setSaveStatus("saved");
      if (parsedFiles.length > 0) {
        setSelectedFile(parsedFiles[0].path);
        setOpenTabs([parsedFiles[0].path]);
      }
      if (terminalWriter) {
        terminalWriter(`\r\n\x1b[32m✓ Projeto "${project.name}" carregado\x1b[0m\r\n  ${parsedFiles.length} arquivo(s)\r\n`);
      }
    }
  }, [project, terminalWriter]);
  
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  
  useEffect(() => {
    const initWebContainer = async () => {
      if (terminalWriter) {
        terminalWriter(`\r\n\x1b[36mInicializando ambiente...\x1b[0m\r\n`);
      }
      
      webcontainerService.setOutputCallback((data) => {
        if (terminalWriter) {
          terminalWriter(data);
        }
        setConsoleOutput(prev => [...prev.slice(-100), data]);
      });
      
      webcontainerService.setServerReadyCallback((port, url) => {
        setPreviewUrl(url);
        setPreviewHtml(undefined);
        setIsRunning(false);
        if (terminalWriter) {
          terminalWriter(`\r\n\x1b[32m✓ Servidor pronto na porta ${port}\x1b[0m\r\n`);
        }
      });
      
      try {
        await webcontainerService.boot();
        setIsWebContainerReady(true);
        if (terminalWriter) {
          terminalWriter(`\x1b[32m✓ Ambiente pronto!\x1b[0m\r\n`);
        }
      } catch (error: any) {
        console.error("Erro ao iniciar WebContainer:", error);
        if (terminalWriter) {
          terminalWriter(`\r\n\x1b[31mErro ao iniciar ambiente: ${error.message}\x1b[0m\r\n`);
          terminalWriter(`\x1b[33mUsando preview estático...\x1b[0m\r\n`);
        }
      }
    };
    
    if (terminalWriter) {
      initWebContainer();
    }
  }, [terminalWriter]);
  
  const currentFile = files.find(f => f.path === selectedFile) || null;
  
  const handleSelectFile = (path: string) => {
    setSelectedFile(path);
    if (!openTabs.includes(path)) {
      setOpenTabs(prev => [...prev, path]);
    }
  };
  
  const handleCloseTab = (path: string) => {
    setOpenTabs(prev => {
      const remaining = prev.filter(p => p !== path);
      if (selectedFile === path) {
        setSelectedFile(remaining[remaining.length - 1] || null);
      }
      return remaining;
    });
  };

  const handleAddFile = (path: string, content: string) => {
    const ext = path.split(".").pop() || "";
    const langMap: Record<string, string> = {
      js: "javascript", jsx: "javascriptreact", ts: "typescript", tsx: "typescriptreact",
      html: "html", css: "css", json: "json", md: "markdown", py: "python",
    };
    setFiles(prev => [...prev, { path, content, language: langMap[ext] || "plaintext" }]);
  };

  const handleDeleteFile = (path: string) => {
    setFiles(prev => prev.filter(f => f.path !== path && !f.path.startsWith(path + "/")));
    if (selectedFile === path) {
      setSelectedFile(null);
    }
    setOpenTabs(prev => prev.filter(p => p !== path));
  };

  const handleRenameFile = (oldPath: string, newPath: string) => {
    setFiles(prev => prev.map(f => f.path === oldPath ? { ...f, path: newPath } : f));
    if (selectedFile === oldPath) {
      setSelectedFile(newPath);
    }
    setOpenTabs(prev => prev.map(p => p === oldPath ? newPath : p));
  };

  const handleNewTab = () => {
    const newFileName = `untitled-${Date.now()}.js`;
    handleAddFile(newFileName, "// Novo arquivo\n");
    handleSelectFile(newFileName);
  };
  
  const tabs = openTabs.map(path => ({
    path,
    name: path.split("/").pop() || path,
    isDirty: dirtyFiles.has(path),
  }));
  
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations/new");
      return res.json() as Promise<{ conversation: ConversationData; messages: MessageData[] }>;
    },
    onSuccess: (data) => {
      setConversationId(data.conversation.id);
      setChatMessages(
        data.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
    },
  });
  
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, forceCode }: { message: string; forceCode?: boolean }) => {
      const res = await apiRequest("POST", "/api/chat", {
        conversationId,
        message,
        forceCode,
      });
      return res.json() as Promise<ChatResponse>;
    },
    onSuccess: (data) => {
      setChatMessages((prev) =>
        prev
          .filter((m) => !m.isLoading)
          .concat({
            id: Date.now(),
            role: "assistant",
            content: data.message,
          })
      );
      setIsChatLoading(false);
      
      if (data.isCodeReady && data.files && data.files.length > 0) {
        const newFiles: ProjectFile[] = data.files.map((f) => ({
          path: f.filename,
          content: f.content,
          language: f.language,
        }));
        setFiles(newFiles);
        newFiles.forEach((f) => {
          lastSavedContentRef.current.set(f.path, f.content);
        });
        setDirtyFiles(new Set());
        setSaveStatus("saved");
        setSelectedFile(newFiles[0]?.path || null);
        setOpenTabs(newFiles.map(f => f.path).slice(0, 3));
        
        toast({
          title: "Projeto gerado!",
          description: `${newFiles.length} arquivos foram criados.`,
        });
        
        if (terminalWriter) {
          terminalWriter(`\r\n\x1b[32m✓ Projeto gerado com sucesso!\x1b[0m\r\n`);
          terminalWriter(`  ${newFiles.length} arquivos criados:\r\n`);
          newFiles.forEach((f) => terminalWriter(`    - ${f.path}\r\n`));
        }
      }
    },
    onError: (error) => {
      setChatMessages((prev) => prev.filter((m) => !m.isLoading));
      setIsChatLoading(false);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    },
  });
  
  useEffect(() => {
    if (!conversationId) {
      createConversationMutation.mutate();
    }
  }, []);
  
  const handleSendMessage = (message: string, forceCode?: boolean) => {
    if (!conversationId) return;
    
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: message },
      { id: Date.now() + 1, role: "assistant", content: "", isLoading: true },
    ]);
    setIsChatLoading(true);
    sendMessageMutation.mutate({ message, forceCode });
  };
  
  const handleFileChange = useCallback((content: string) => {
    if (!selectedFile) return;
    
    const filePath = selectedFile;
    const fileContent = content;
    
    setFiles((prev) =>
      prev.map((f) => (f.path === filePath ? { ...f, content: fileContent } : f))
    );
    
    const lastSaved = lastSavedContentRef.current.get(filePath);
    if (lastSaved !== fileContent) {
      setDirtyFiles((prev) => new Set(prev).add(filePath));
      setSaveStatus("unsaved");
      
      const existingTimeout = saveTimeoutsRef.current.get(filePath);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      const timeout = setTimeout(() => {
        setSaveStatus("saving");
        setTimeout(() => {
          setDirtyFiles((prev) => {
            const next = new Set(prev);
            next.delete(filePath);
            if (next.size === 0) {
              setSaveStatus("saved");
            } else {
              setSaveStatus("unsaved");
            }
            return next;
          });
          lastSavedContentRef.current.set(filePath, fileContent);
          saveTimeoutsRef.current.delete(filePath);
        }, 300);
      }, 1000);
      
      saveTimeoutsRef.current.set(filePath, timeout);
    }
  }, [selectedFile]);
  
  const handleRun = async () => {
    setIsRunning(true);
    setConsoleOutput([]);
    
    if (files.length === 0) {
      if (terminalWriter) {
        terminalWriter(`\r\n\x1b[33mNenhum arquivo para executar. Crie um projeto primeiro.\x1b[0m\r\n`);
      }
      setIsRunning(false);
      return;
    }
    
    const buildStaticPreview = () => {
      const htmlFile = files.find((f) => f.path.endsWith(".html"));
      if (htmlFile) {
        let html = htmlFile.content;
        
        const cssFile = files.find((f) => f.path.endsWith(".css"));
        if (cssFile) {
          html = html.replace("</head>", `<style>${cssFile.content}</style></head>`);
        }
        
        const jsFile = files.find((f) => f.path.endsWith(".js") && !f.path.includes("server"));
        if (jsFile) {
          html = html.replace("</body>", `<script>${jsFile.content}</script></body>`);
        }
        
        setPreviewHtml(html);
        setPreviewUrl(undefined);
        
        if (terminalWriter) {
          terminalWriter(`\r\n\x1b[32m✓ Preview estático atualizado\x1b[0m\r\n`);
        }
        return true;
      }
      return false;
    };
    
    if (isWebContainerReady) {
      try {
        await webcontainerService.mountFiles(files);
        
        const language = detectLanguage(files);
        const { command, args } = getRunCommand(language, files);
        
        if (language === "static") {
          buildStaticPreview();
          setIsRunning(false);
        } else if (language === "node") {
          const hasDeps = files.some((f) => f.path === "package.json");
          if (hasDeps) {
            await webcontainerService.installDependencies();
          }
          webcontainerService.startServer(command, args);
        }
      } catch (error: any) {
        if (terminalWriter) {
          terminalWriter(`\r\n\x1b[31mErro: ${error.message}\x1b[0m\r\n`);
        }
        setIsRunning(false);
      }
    } else {
      if (!buildStaticPreview() && terminalWriter) {
        terminalWriter(`\r\n\x1b[33mWebContainer não disponível. Preview estático apenas.\x1b[0m\r\n`);
      }
      setIsRunning(false);
    }
  };
  
  const handleStop = async () => {
    try {
      await webcontainerService.stopProcess();
    } catch {}
    setIsRunning(false);
  };
  
  const handleTerminalReady = (writer: (data: string) => void) => {
    setTerminalWriter(() => writer);
  };
  
  const handleDownload = async () => {
    if (files.length === 0) {
      toast({
        title: "Nenhum arquivo",
        description: "Gere um projeto primeiro usando o chat.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const res = await apiRequest("POST", "/api/projects/download", { files });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "projeto-bratvacoder.zip";
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download iniciado",
        description: "Seu projeto foi baixado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o projeto.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeploy = () => {
    if (files.length === 0) {
      toast({
        title: "Nenhum arquivo",
        description: "Gere um projeto primeiro usando o chat.",
        variant: "destructive",
      });
      return;
    }
    setDeployDialogOpen(true);
  };
  
  const handleSaveNow = useCallback(() => {
    if (dirtyFiles.size > 0) {
      setSaveStatus("saving");
      setTimeout(() => {
        dirtyFiles.forEach((filePath) => {
          const file = filesRef.current.find((f) => f.path === filePath);
          if (file) {
            lastSavedContentRef.current.set(filePath, file.content);
          }
        });
        setDirtyFiles(new Set());
        setSaveStatus("saved");
        toast({
          title: "Salvo",
          description: "Todos os arquivos foram salvos.",
        });
      }, 200);
    } else {
      toast({
        title: "Tudo salvo",
        description: "Nenhuma alteração pendente.",
      });
    }
  }, [dirtyFiles, toast]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (modKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveNow();
      }
      
      if (modKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsLeftPanelVisible(prev => !prev);
      }
      
      if (modKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setActiveRightTab("shell");
        setIsRightPanelVisible(true);
      }
      
      if (modKey && e.key.toLowerCase() === '\\') {
        e.preventDefault();
        setIsRightPanelVisible(prev => !prev);
      }
      
      if (modKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setActivePanel("search");
        setIsLeftPanelVisible(true);
      }
      
      if (modKey && e.key === 'Enter') {
        e.preventDefault();
        if (isRunning) {
          handleStop();
        } else {
          handleRun();
        }
      }
      
      if (modKey && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setActivePanel("files");
        setIsLeftPanelVisible(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveNow, isRunning, handleRun, handleStop]);

  const renderLeftPanelContent = () => {
    switch (activePanel) {
      case "files":
        return (
          <FileExplorer
            files={files}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
            onAddFile={handleAddFile}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            projectName={projectName}
          />
        );
      case "search":
        return (
          <SearchPanel 
            files={files} 
            onSelectFile={handleSelectFile}
            onReplaceInFile={(path, searchTerm, replaceTerm, caseSensitive, wholeWord) => {
              const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
              const flags = caseSensitive ? 'g' : 'gi';
              const regex = new RegExp(pattern, flags);
              setFiles(prev => prev.map(f => {
                if (f.path === path) {
                  return { ...f, content: f.content.replace(regex, replaceTerm) };
                }
                return f;
              }));
              setDirtyFiles(prev => new Set(prev).add(path));
              setSaveStatus("unsaved");
              toast({ title: "Substituído", description: `Substituições feitas em ${path.split("/").pop()}` });
            }}
            onReplaceAll={(searchTerm, replaceTerm, caseSensitive, wholeWord) => {
              const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
              const flags = caseSensitive ? 'g' : 'gi';
              const regex = new RegExp(pattern, flags);
              let count = 0;
              setFiles(prev => prev.map(f => {
                const matches = (f.content.match(regex) || []).length;
                if (matches > 0) {
                  count += matches;
                  setDirtyFiles(d => new Set(d).add(f.path));
                  return { ...f, content: f.content.replace(regex, replaceTerm) };
                }
                return f;
              }));
              setSaveStatus("unsaved");
              toast({ title: "Substituído", description: `${count} ocorrência(s) substituída(s) em todos os arquivos` });
            }}
          />
        );
      case "packages":
        return <PackagesPanel files={files} />;
      case "git":
        return <GitPanel projectId={projectId ? parseInt(projectId) : undefined} projectName={projectName} />;
      case "settings":
        return <SecretsPanel />;
      case "agent":
        return <AgentPanel />;
      case "assistant":
        return <AssistantPanel />;
      case "publishing":
        return <PublishingPanel onDeploy={handleDeploy} hasFiles={files.length > 0} />;
      case "storage":
        return <StoragePanel />;
      case "auth":
        return <AuthPanel />;
      case "console":
        return <ConsolePanel output={consoleOutput} onClear={() => setConsoleOutput([])} />;
      case "database":
        return <DatabasePanel />;
      case "developer":
        return <DeveloperPanel />;
      case "integrations":
        return <IntegrationsPanel projectId={projectId ? parseInt(projectId) : undefined} />;
      case "multiplayer":
        return <MultiplayerPanel />;
      case "preview":
        return <PreviewPanel 
          url={previewUrl} 
          html={previewHtml} 
          isLoading={isRunning}
          isHotReloadConnected={isHotReloadConnected}
          lastHotReloadUpdate={lastHotReloadUpdate}
        />;
      default:
        return null;
    }
  };
  
  return (
    <div className="flex h-screen bg-background">
      <Sidebar activePanel={activePanel} onPanelChange={setActivePanel} />
      
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          projectName={projectName}
          isRunning={isRunning}
          hasFiles={files.length > 0}
          onRun={handleRun}
          onStop={handleStop}
          onDownload={handleDownload}
          onDeploy={handleDeploy}
          saveStatus={saveStatus}
        />
        
        <div className="flex-1 flex overflow-hidden">
          {isLeftPanelVisible && (
            <div className="w-60 flex-shrink-0 border-r border-border flex flex-col bg-muted/30">
              <div className="h-9 px-3 flex items-center justify-between border-b border-border bg-muted/50">
                <span className="text-xs font-medium uppercase text-muted-foreground truncate">
                  {activePanel}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsLeftPanelVisible(false)}
                  data-testid="button-collapse-left-panel"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                {renderLeftPanelContent()}
              </div>
            </div>
          )}
          
          {!isLeftPanelVisible && (
            <div className="w-8 flex-shrink-0 border-r border-border bg-muted/20 flex flex-col items-center pt-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsLeftPanelVisible(true)}
                data-testid="button-expand-left-panel"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          
          <div className="flex-1 flex flex-col min-w-0">
            <EditorTabs
              tabs={tabs}
              activeTab={selectedFile}
              onSelectTab={setSelectedFile}
              onCloseTab={handleCloseTab}
            />
            <FileBreadcrumb path={selectedFile} projectName={projectName} />
            <div className="flex-1 overflow-hidden">
              <CodeEditor file={currentFile} onChange={handleFileChange} />
            </div>
          </div>
          
          {isRightPanelVisible && (
            <div className="w-80 flex-shrink-0 border-l border-border flex flex-col bg-muted/30">
              <Tabs value={activeRightTab} onValueChange={setActiveRightTab} className="flex flex-col h-full">
                <div className="flex items-center border-b border-border bg-muted/50">
                  <TabsList className="h-9 bg-transparent rounded-none border-none p-0 flex-1">
                    <TabsTrigger 
                      value="preview" 
                      className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 gap-1.5"
                      data-testid="tab-preview"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span className="text-xs">Preview</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="console" 
                      className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 gap-1.5"
                      data-testid="tab-console"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="text-xs">Console</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="shell" 
                      className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 gap-1.5"
                      data-testid="tab-shell"
                    >
                      <TerminalIcon className="h-3.5 w-3.5" />
                      <span className="text-xs">Shell</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="chat" 
                      className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 gap-1.5"
                      data-testid="tab-chat"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span className="text-xs">AI</span>
                    </TabsTrigger>
                  </TabsList>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 mr-1"
                    onClick={() => setIsRightPanelVisible(false)}
                    data-testid="button-collapse-right-panel"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
                
                <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
                  <Preview html={previewHtml} url={previewUrl} isLoading={isRunning} />
                </TabsContent>
                
                <TabsContent value="console" className="flex-1 m-0 overflow-hidden">
                  <div className="h-full bg-background p-2 overflow-auto font-mono text-xs">
                    {consoleOutput.length === 0 ? (
                      <div className="text-muted-foreground">Console vazio. Execute o projeto para ver a saída.</div>
                    ) : (
                      consoleOutput.map((line, i) => (
                        <div key={i} className="whitespace-pre-wrap">{line}</div>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="shell" className="flex-1 m-0 overflow-hidden">
                  <Terminal
                    isRunning={isRunning}
                    onRun={handleRun}
                    onStop={handleStop}
                    onReady={handleTerminalReady}
                  />
                </TabsContent>
                
                <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
                  <ChatAssistant
                    messages={chatMessages}
                    isLoading={isChatLoading}
                    onSendMessage={handleSendMessage}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          {!isRightPanelVisible && (
            <div className="w-8 flex-shrink-0 border-l border-border bg-muted/20 flex flex-col items-center pt-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsRightPanelVisible(true)}
                data-testid="button-expand-right-panel"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        
        <BottomBar
          onPanelChange={setActivePanel}
          activePanel={activePanel}
          onNewTab={handleNewTab}
        />
        
        <StatusBar
          fileCount={files.length}
          selectedFile={selectedFile}
          isWebContainerReady={isWebContainerReady}
          isRunning={isRunning}
        />
      </div>

      <DeployDialog
        open={deployDialogOpen}
        onOpenChange={setDeployDialogOpen}
        files={files}
        projectName={projectName}
      />
    </div>
  );
}
