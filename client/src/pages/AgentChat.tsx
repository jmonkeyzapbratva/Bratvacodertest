import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  ChevronLeft, 
  History, 
  MoreVertical, 
  Send, 
  Loader2, 
  Paperclip,
  Lock,
  Database,
  Users,
  Plus,
  Search,
  X,
  Folder,
  Sun,
  Moon,
  Settings,
  ChevronDown,
  Hammer,
  MessageSquare,
  Trash2,
  ExternalLink,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Code,
  Terminal,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTheme } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Message, Conversation, Project } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ActionsFeed, type ActionItem } from "@/components/ActionCard";
import { WorkspaceExplorer } from "@/components/WorkspaceExplorer";
import { Terminal as TerminalComponent } from "@/components/Terminal";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface ConversationWithMessages {
  conversation: Conversation;
  messages: Message[];
}

type AgentMode = "plan" | "build";

export default function AgentChat() {
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<AgentMode>("plan");
  const [searchQuery, setSearchQuery] = useState("");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedProjectId, setGeneratedProjectId] = useState<number | null>(null);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<Array<{type: "info" | "error" | "success" | "status", message: string, timestamp: Date}>>([]);
  const [systemActions, setSystemActions] = useState<ActionItem[]>([]);
  const [filesOpen, setFilesOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<"preview" | "terminal">("preview");
  
  const [historyOpen, setHistoryOpen] = useState(false);
  const [secretsOpen, setSecretsOpen] = useState(false);
  const [databaseOpen, setDatabaseOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newSecretDialog, setNewSecretDialog] = useState(false);
  const [newSecretKey, setNewSecretKey] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");
  const [showSecretValues, setShowSecretValues] = useState<Record<string, boolean>>({});
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const addLog = (type: "info" | "error" | "success" | "status", message: string) => {
    setConsoleLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
  };

  const clearLogs = () => {
    setConsoleLogs([]);
  };

  const addSystemAction = (action: Omit<ActionItem, "id" | "timestamp">) => {
    const newAction: ActionItem = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    setSystemActions(prev => [...prev, newAction]);
    return newAction.id;
  };

  const updateSystemAction = (id: string, updates: Partial<ActionItem>) => {
    setSystemActions(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const clearSystemActions = () => {
    setSystemActions([]);
  };

  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: messages } = useQuery<Message[]>({
    queryKey: ["/api/messages", currentConversation?.id],
    queryFn: async () => {
      if (!currentConversation?.id) return [];
      const res = await fetch(`/api/messages/${currentConversation.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!currentConversation?.id,
  });

  useEffect(() => {
    if (messages) {
      setLocalMessages(messages.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.createdAt?.toString(),
      })));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, isTyping, streamingContent]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs]);

  const createConversation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations/new", {});
      return response.json() as Promise<ConversationWithMessages>;
    },
    onSuccess: (data) => {
      setCurrentConversation(data.conversation);
      setLocalMessages(data.messages.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.createdAt?.toString(),
      })));
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Conversa excluida" });
    },
  });

  const sendStreamingMessage = async (message: string, conversationId?: number) => {
    const tempUserMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages(prev => [...prev, tempUserMessage]);
    setInput("");
    setIsTyping(true);
    setIsSending(true);
    setStreamingContent("");
    setStatusMessage("Conectando...");
    
    const connectActionId = addSystemAction({
      type: "command_run",
      title: "Conectando ao servidor",
      status: "running",
    });

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message,
          conversationId: conversationId || currentConversation?.id,
          mode,
          forceCode: mode === "build",
        }),
      });

      if (!response.ok) {
        updateSystemAction(connectActionId, { status: "error", details: `Erro HTTP: ${response.status}` });
        throw new Error("Falha na conexao");
      }

      updateSystemAction(connectActionId, { status: "success", title: "Conectado ao servidor" });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let isCodeReady = false;
      let buffer = "";
      let chunkCount = 0;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const eventData = JSON.parse(line.slice(6));
              
              if (eventData.type === "status") {
                setStatusMessage(eventData.data.message || "");
              } else if (eventData.type === "chunk") {
                fullContent += eventData.data.content || "";
                setStreamingContent(fullContent);
                chunkCount++;
              } else if (eventData.type === "complete") {
                isCodeReady = eventData.data.isCodeReady || false;
                if (eventData.data.fullMessage) {
                  fullContent = eventData.data.fullMessage;
                }
                if (eventData.data.projectId) {
                  setGeneratedProjectId(eventData.data.projectId);
                  setPreviewUrl(`/preview/${eventData.data.projectId}`);
                  addSystemAction({
                    type: "build",
                    title: "Projeto criado",
                    status: "success",
                    details: `Projeto #${eventData.data.projectId} gerado com sucesso`,
                  });
                }
              } else if (eventData.type === "error") {
                addSystemAction({
                  type: "command_run",
                  title: "Erro",
                  status: "error",
                  details: eventData.data.error || "Erro desconhecido",
                });
                throw new Error(eventData.data.error || "Erro desconhecido");
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE event:", line);
            }
          }
        }
      }

      setIsTyping(false);
      setStreamingContent("");
      setStatusMessage("");
      
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: fullContent,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, assistantMessage]);

      if (isCodeReady) {
        toast({
          title: "Codigo gerado!",
          description: "Seu projeto foi criado com sucesso. Clique em 'Abrir no IDE' para editar.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        setPreviewOpen(true);
        setFilesOpen(true);
      }
    } catch (error) {
      setIsTyping(false);
      setStreamingContent("");
      setStatusMessage("");
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      updateSystemAction(connectActionId, { status: "error", details: errorMessage });
      toast({
        title: "Erro ao enviar mensagem",
        description: errorMessage,
        variant: "destructive",
      });
      setLocalMessages(prev => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    
    let conversationId = currentConversation?.id;
    if (!currentConversation) {
      const result = await createConversation.mutateAsync();
      conversationId = result.conversation.id;
    }
    
    sendStreamingMessage(input.trim(), conversationId);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleNewConversation = async () => {
    setLocalMessages([]);
    setCurrentConversation(null);
    await createConversation.mutateAsync();
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setCurrentConversation(conv);
    setHistoryOpen(false);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setInput(prev => prev + `\n\n[Arquivo: ${file.name}]\n${content.slice(0, 1000)}${content.length > 1000 ? '...' : ''}`);
      };
      reader.readAsText(file);
      toast({ title: `Arquivo ${file.name} anexado` });
    }
  };

  const handleCopySecret = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedSecret(key);
    setTimeout(() => setCopiedSecret(null), 2000);
  };

  const handleAddSecret = () => {
    if (newSecretKey && newSecretValue) {
      toast({ title: `Secret ${newSecretKey} adicionada` });
      setNewSecretDialog(false);
      setNewSecretKey("");
      setNewSecretValue("");
    }
  };

  const filteredConversations = conversations?.filter(conv => 
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    searchQuery === ""
  );

  useEffect(() => {
    if (!currentConversation) {
      createConversation.mutate();
    }
  }, []);

  const mockSecrets = [
    { key: "OPENAI_API_KEY", value: "sk-..." },
    { key: "DATABASE_URL", value: "postgresql://..." },
    { key: "SESSION_SECRET", value: "..." },
  ];

  const latestProject = projects?.[0];
  
  useEffect(() => {
    if (latestProject?.id) {
      setPreviewUrl(`/preview/${latestProject.id}`);
    }
  }, [latestProject?.id]);

  return (
    <div className="flex h-screen bg-background">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        accept=".txt,.js,.ts,.jsx,.tsx,.json,.md,.py,.html,.css"
      />

      {leftSidebarOpen && (
        <div className="w-12 bg-sidebar border-r flex flex-col items-center py-3 gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={() => setLeftSidebarOpen(false)}
            data-testid="button-close-sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 flex flex-col gap-1 mt-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={toggleTheme}
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => navigate("/projetos")}
              data-testid="button-files"
            >
              <Folder className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => setSettingsOpen(true)}
              data-testid="button-settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      <div className={`flex-1 flex ${previewOpen ? 'w-1/2' : 'w-full'} transition-all`}>
        <div className="flex-1 flex flex-col">
          <header className="h-12 border-b flex items-center justify-between px-3 gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => navigate("/projetos")}
              data-testid="button-back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setHistoryOpen(true)}
              data-testid="button-history"
            >
              <History className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-primary">
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-1.5 h-1.5 rounded-sm bg-primary" />
                <div className="w-1.5 h-1.5 rounded-sm bg-primary" />
                <div className="w-1.5 h-1.5 rounded-sm bg-primary" />
                <div className="w-1.5 h-1.5 rounded-sm bg-primary" />
              </div>
              <span className="font-semibold text-sm">Bratvacoder</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant={consoleOpen ? "secondary" : "ghost"}
              size="icon" 
              className="h-8 w-8 relative"
              onClick={() => setConsoleOpen(!consoleOpen)}
              data-testid="button-console-toggle"
            >
              <Terminal className="h-5 w-5" />
              {consoleLogs.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {consoleLogs.length > 99 ? "99+" : consoleLogs.length}
                </span>
              )}
            </Button>
            
            <Button 
              variant={previewOpen ? "secondary" : "ghost"}
              size="icon" 
              className="h-8 w-8"
              onClick={() => setPreviewOpen(!previewOpen)}
              data-testid="button-preview-toggle"
            >
              <Eye className="h-5 w-5" />
            </Button>
            
            <Button 
              variant={filesOpen ? "secondary" : "ghost"}
              size="icon" 
              className="h-8 w-8"
              onClick={() => setFilesOpen(!filesOpen)}
              data-testid="button-files"
            >
              <Folder className="h-5 w-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  data-testid="button-more"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleNewConversation} data-testid="menu-new-conversation">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova conversa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configuracoes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open("https://docs.replit.com", "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ajuda
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="max-w-2xl mx-auto px-4 py-6">
            {systemActions.length > 0 && (
              <ActionsFeed 
                actions={systemActions} 
                title="Acoes do agente"
                collapsible={true}
              />
            )}
            
            {localMessages.map((message, index) => (
              <div
                key={message.id || index}
                className={`mb-4 ${message.role === "user" ? "text-right" : ""}`}
                data-testid={`message-${message.role}-${index}`}
              >
                <div
                  className={`inline-block max-w-[85%] text-left px-4 py-3 rounded-2xl ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="mb-4" data-testid="streaming-response">
                <div className="inline-block max-w-[85%] text-left bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                  {statusMessage && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2" data-testid="status-message">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {statusMessage}
                    </div>
                  )}
                  {streamingContent ? (
                    <p className="text-sm whitespace-pre-wrap">{streamingContent}<span className="animate-pulse">|</span></p>
                  ) : (
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t bg-background shrink-0">
          <div className="max-w-2xl mx-auto p-3">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode === "build" ? "Descreva o que voce quer criar..." : "Faca uma pergunta ou descreva seu projeto..."}
                  className="min-h-[80px] max-h-[200px] resize-none pr-12 text-base"
                  disabled={isSending}
                  data-testid="input-chat"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-2 bottom-2"
                  disabled={!input.trim() || isSending}
                  data-testid="button-send"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 gap-2 text-muted-foreground"
                      data-testid="button-mode-selector"
                    >
                      {mode === "plan" ? (
                        <>
                          <MessageSquare className="h-4 w-4" />
                          Plan
                        </>
                      ) : (
                        <>
                          <Hammer className="h-4 w-4" />
                          Build
                        </>
                      )}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setMode("build")} className="gap-2">
                      <Hammer className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Build</div>
                        <div className="text-xs text-muted-foreground">Gera codigo automaticamente</div>
                      </div>
                      {mode === "build" && <Check className="h-4 w-4 ml-auto text-primary" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMode("plan")} className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Plan</div>
                        <div className="text-xs text-muted-foreground">Conversa e planeja seu projeto</div>
                      </div>
                      {mode === "plan" && <Check className="h-4 w-4 ml-auto text-primary" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={handleFileUpload}
                  data-testid="button-attach"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="border-t bg-muted/50 shrink-0">
          <div className="flex items-center justify-around py-3 border-b">
            <button 
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSecretsOpen(true)}
              data-testid="button-secrets"
            >
              <Lock className="h-6 w-6" />
              <span className="text-xs">Secrets</span>
            </button>
            
            <button 
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setDatabaseOpen(true)}
              data-testid="button-database"
            >
              <Database className="h-6 w-6" />
              <span className="text-xs">Database</span>
            </button>
            
            <button 
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setAuthOpen(true)}
              data-testid="button-auth"
            >
              <Users className="h-6 w-6" />
              <span className="text-xs">Auth</span>
            </button>
            
            <button 
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigate("/ide")}
              data-testid="button-new-tab"
            >
              <Plus className="h-6 w-6" />
              <span className="text-xs">New Tab</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 shrink-0"
              onClick={() => navigate("/projetos")}
              data-testid="button-folder"
            >
              <Folder className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setHistoryOpen(true)}
                className="w-full h-9 pl-9 pr-9 rounded-md bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="input-search"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery("")}
                  data-testid="button-clear-search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 shrink-0"
              onClick={() => { setSearchQuery(""); }}
              data-testid="button-close-search"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        </div>

        {filesOpen && generatedProjectId && (
          <div className="w-72 border-l flex flex-col bg-sidebar" data-testid="files-panel">
            <div className="h-12 border-b flex items-center justify-between px-3 gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Arquivos</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setFilesOpen(false)}
                data-testid="files-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <WorkspaceExplorer 
                projectId={generatedProjectId}
                onFileSelect={(filePath) => {
                  navigate(`/ide/${generatedProjectId}?file=${encodeURIComponent(filePath)}`);
                }}
              />
            </div>
          </div>
        )}

        {previewOpen && (
          <div className="w-1/2 border-l flex flex-col bg-sidebar" data-testid="preview-panel">
            <div className="h-12 border-b flex items-center justify-between px-3 gap-2 shrink-0">
              <div className="flex items-center gap-1">
                <Button
                  variant={previewTab === "preview" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setPreviewTab("preview")}
                  data-testid="tab-preview"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  variant={previewTab === "terminal" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setPreviewTab("terminal")}
                  data-testid="tab-terminal"
                >
                  <Terminal className="h-4 w-4" />
                  Terminal
                </Button>
              </div>
              <div className="flex items-center gap-1">
                {previewTab === "preview" && generatedProjectId && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => navigate(`/ide/${generatedProjectId}`)}
                    data-testid="button-open-ide"
                  >
                    <Code className="h-4 w-4" />
                    Abrir no IDE
                  </Button>
                )}
                {previewTab === "preview" && previewUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(previewUrl, "_blank")}
                    data-testid="preview-open-external"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPreviewOpen(false)}
                  data-testid="preview-close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 bg-background">
              {previewTab === "preview" ? (
                <div className="h-full p-2">
                  {previewUrl ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full rounded-md border"
                      title="Preview do projeto"
                      data-testid="preview-iframe"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Eye className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-sm">Nenhum preview disponivel</p>
                      <p className="text-xs">Crie um projeto para ver o preview</p>
                    </div>
                  )}
                </div>
              ) : (
                <TerminalComponent 
                  projectId={generatedProjectId || undefined}
                  className="h-full"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {consoleOpen && (
        <div 
          className="fixed bottom-0 left-0 right-0 h-48 bg-[#1e1e1e] border-t border-[#333] flex flex-col z-50"
          data-testid="console-panel"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-[#333] shrink-0">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-[#4ec9b0]" />
              <span className="text-xs font-medium text-[#d4d4d4]">Console</span>
              <span className="text-xs text-[#808080]">({consoleLogs.length} logs)</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={clearLogs}
                className="h-6 w-6 text-[#808080] hover:text-[#d4d4d4] hover:bg-[#333]"
                data-testid="button-clear-console"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setConsoleOpen(false)}
                className="h-6 w-6 text-[#808080] hover:text-[#d4d4d4] hover:bg-[#333]"
                data-testid="button-close-console"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 font-mono text-xs space-y-1">
              {consoleLogs.length === 0 ? (
                <div className="text-[#808080] py-2">
                  Console vazio. Envie uma mensagem para ver os logs.
                </div>
              ) : (
                consoleLogs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`flex items-start gap-2 py-0.5 ${
                      log.type === "error" ? "text-[#f44747]" : 
                      log.type === "success" ? "text-[#6a9955]" : 
                      log.type === "status" ? "text-[#dcdcaa]" : 
                      "text-[#d4d4d4]"
                    }`}
                    data-testid={`log-entry-${i}`}
                  >
                    <span className="text-[#569cd6] shrink-0">
                      [{log.timestamp.toLocaleTimeString("pt-BR")}]
                    </span>
                    <span className={`shrink-0 ${
                      log.type === "error" ? "text-[#f44747]" : 
                      log.type === "success" ? "text-[#6a9955]" : 
                      log.type === "status" ? "text-[#dcdcaa]" : 
                      "text-[#808080]"
                    }`}>
                      {log.type === "error" ? "[ERROR]" : 
                       log.type === "success" ? "[OK]" : 
                       log.type === "status" ? "[STATUS]" : 
                       "[INFO]"}
                    </span>
                    <span>{log.message}</span>
                  </div>
                ))
              )}
              <div ref={consoleEndRef} />
            </div>
          </ScrollArea>
        </div>
      )}

      {consoleOpen && (
        <div className="h-48 shrink-0" />
      )}

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle>Historico de Conversas</SheetTitle>
            <SheetDescription>Suas conversas anteriores</SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <Button 
              className="w-full mb-4" 
              onClick={handleNewConversation}
              data-testid="button-new-conversation"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Conversa
            </Button>
            
            <ScrollArea className="h-[calc(100vh-200px)]">
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredConversations?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma conversa encontrada
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredConversations?.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 rounded-lg cursor-pointer hover-elevate ${
                        currentConversation?.id === conv.id ? "bg-muted" : ""
                      }`}
                      onClick={() => handleSelectConversation(conv)}
                      data-testid={`conversation-${conv.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{conv.title || "Nova conversa"}</p>
                          <p className="text-xs text-muted-foreground">
                            {conv.updatedAt && formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation.mutate(conv.id);
                          }}
                          data-testid={`delete-conversation-${conv.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={secretsOpen} onOpenChange={setSecretsOpen}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Secrets
            </SheetTitle>
            <SheetDescription>
              Gerencie suas variaveis de ambiente e chaves de API
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <Button onClick={() => setNewSecretDialog(true)} className="mb-4" data-testid="button-add-secret">
              <Plus className="h-4 w-4 mr-2" />
              Nova Secret
            </Button>
            
            <ScrollArea className="h-[calc(70vh-180px)]">
              <div className="space-y-3">
                {mockSecrets.map((secret) => (
                  <div key={secret.key} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-mono text-sm font-medium">{secret.key}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {showSecretValues[secret.key] ? secret.value : "••••••••••"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSecretValues(prev => ({ ...prev, [secret.key]: !prev[secret.key] }))}
                      >
                        {showSecretValues[secret.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopySecret(secret.key, secret.value)}
                      >
                        {copiedSecret === secret.key ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={databaseOpen} onOpenChange={setDatabaseOpen}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database
            </SheetTitle>
            <SheetDescription>
              Visualize e gerencie seu banco de dados PostgreSQL
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <div className="p-4 rounded-lg bg-muted mb-4">
              <p className="text-sm font-medium mb-2">Conexao</p>
              <p className="font-mono text-xs text-muted-foreground break-all">
                postgresql://user:****@host:5432/database
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Tabelas</p>
              {["users", "sessions", "projects", "conversations", "messages"].map((table) => (
                <div key={table} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="font-mono text-sm">{table}</span>
                  <Button variant="ghost" size="sm" onClick={() => toast({ title: `Visualizando ${table}` })}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={authOpen} onOpenChange={setAuthOpen}>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Authentication
            </SheetTitle>
            <SheetDescription>
              Configure autenticacao para seu projeto
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Replit Auth</p>
                <span className="text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded">Ativo</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Autenticacao integrada com contas Replit
              </p>
            </div>
            
            <div className="p-4 rounded-lg border border-dashed">
              <p className="font-medium mb-2">Adicionar Provedores</p>
              <div className="flex flex-wrap gap-2">
                {["Google", "GitHub", "Discord", "Email"].map((provider) => (
                  <Button key={provider} variant="outline" size="sm" onClick={() => toast({ title: `${provider} em breve` })}>
                    {provider}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Configuracoes</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Tema</p>
                <p className="text-sm text-muted-foreground">Alterar aparencia</p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                {theme === "dark" ? "Claro" : "Escuro"}
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Projetos</p>
                <p className="text-sm text-muted-foreground">{projects?.length || 0} projetos criados</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setSettingsOpen(false); navigate("/projetos"); }}>
                Ver todos
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Conversas</p>
                <p className="text-sm text-muted-foreground">{conversations?.length || 0} conversas</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setSettingsOpen(false); setHistoryOpen(true); }}>
                Ver todas
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={newSecretDialog} onOpenChange={setNewSecretDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Secret</DialogTitle>
            <DialogDescription>
              Adicione uma nova variavel de ambiente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="secret-key">Nome</Label>
              <Input
                id="secret-key"
                placeholder="MINHA_API_KEY"
                value={newSecretKey}
                onChange={(e) => setNewSecretKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
                data-testid="input-secret-key"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secret-value">Valor</Label>
              <Input
                id="secret-value"
                type="password"
                placeholder="Valor da secret"
                value={newSecretValue}
                onChange={(e) => setNewSecretValue(e.target.value)}
                data-testid="input-secret-value"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSecretDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddSecret} disabled={!newSecretKey || !newSecretValue} data-testid="button-save-secret">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
