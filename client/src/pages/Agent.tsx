import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Editor from "@monaco-editor/react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import "xterm/css/xterm.css";
import { 
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Send, 
  Loader2, 
  Paperclip,
  Lock,
  Database,
  Users,
  Plus,
  Check,
  Circle,
  RefreshCw,
  ExternalLink,
  Terminal,
  Eye,
  Code,
  Play,
  History,
  Settings,
  Sun,
  Moon,
  X,
  Zap,
  Infinity,
  Globe,
  Image,
  TestTube,
  TestTube2,
  Trash2,
  Edit2,
  Copy,
  Table,
  Shield,
  SlidersHorizontal,
  FileText,
  MessageSquare,
  FolderOpen,
  File,
  Rocket,
  Package,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  MousePointer2,
  Paintbrush,
  Type,
  Palette,
  Move
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTheme } from "@/components/ThemeProvider";
import type { Message, Conversation, Project, AgentTask, AgentSettings } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdvancedToolsDrawer } from "@/components/ide/AdvancedToolsDrawer";
import { RealTerminal } from "@/components/ide/RealTerminal";
import { PlanModeToggle, type AgentMode as PlanAgentMode } from "@/components/ide/PlanModeToggle";
import { WebSearchPanel } from "@/components/ide/WebSearchPanel";
import { ImageGeneratorPanel } from "@/components/ide/ImageGeneratorPanel";
import { CheckpointPanel } from "@/components/ide/CheckpointPanel";
import { VisualEditor } from "@/components/ide/VisualEditor";
import { useHotReload } from "@/hooks/useHotReload";
import { MobilePreview } from "@/components/ide/MobilePreview";
import { ReplitMdEditor } from "@/components/ide/ReplitMdEditor";
import { AgentModeBubble, type AgentMode as BubbleAgentMode } from "@/components/ide/AgentModeBubble";
import { AgentToolsBubble, type BuildApproach as BubbleBuildApproach } from "@/components/ide/AgentToolsBubble";
import { WorkspaceEditor } from "@/components/ide/WorkspaceEditor";
import { useStreamingChat } from "@/hooks/useStreamingChat";

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

interface FileInfo {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: FileInfo[];
}

interface TableInfo {
  name: string;
  rowCount: number;
}

type AgentMode = "plan" | "build" | "edit";
type AutonomyLevel = "low" | "medium" | "high" | "max";
type AgentToolMode = "fast" | "autonomous";
type BuildApproach = "design-first" | "full-app";
type AIModel = "gpt-4o-mini" | "gpt-4o";
type BottomPanel = "secrets" | "database" | "auth" | "tools" | "logs" | "packages" | "testing" | "terminal" | "search" | "media" | "checkpoints" | "visual" | "mobile" | "replitmd" | null;

interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
  source?: string;
  projectId?: number;
}

export default function Agent() {
  const [input, setInput] = useState("");
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const { isStreaming, currentPhase, filesProgress, streamMessage } = useStreamingChat();
  const [mode, setMode] = useState<AgentMode>("plan");
  const [buildApproach, setBuildApproach] = useState<BuildApproach>("full-app");
  const [extendedThinking, setExtendedThinking] = useState(false);
  const [aiModel, setAiModel] = useState<AIModel>("gpt-4o-mini");
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [completedTasksOpen, setCompletedTasksOpen] = useState(true);
  const [activeTasksOpen, setActiveTasksOpen] = useState(true);
  const [previewTab, setPreviewTab] = useState<"preview" | "code" | "terminal">("preview");
  const [generatedProjectId, setGeneratedProjectId] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [activePanel, setActivePanel] = useState<BottomPanel>(null);
  const [showConversationHistory, setShowConversationHistory] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [deployProgress, setDeployProgress] = useState(0);
  const [deployStatus, setDeployStatus] = useState<"idle" | "deploying" | "success" | "error">("idle");
  const [deployStep, setDeployStep] = useState<string>("");
  const [deployUrl, setDeployUrl] = useState<string>("");
  const [showCheckpointsDialog, setShowCheckpointsDialog] = useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  
  const [newSecretKey, setNewSecretKey] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");
  
  const [sqlQuery, setSqlQuery] = useState("");
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any>(null);
  
  const [installedPackages, setInstalledPackages] = useState<any[]>([]);
  const [packageSearch, setPackageSearch] = useState("");
  const [packageSearchResults, setPackageSearchResults] = useState<any[]>([]);
  const [packageLoading, setPackageLoading] = useState(false);
  
  const [testResults, setTestResults] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testUrl, setTestUrl] = useState("");
  
  const [webSearchQuery, setWebSearchQuery] = useState("");
  const [webSearchResults, setWebSearchResults] = useState<any[]>([]);
  const [webSearchLoading, setWebSearchLoading] = useState(false);
  const [showWebSearchDialog, setShowWebSearchDialog] = useState(false);
  
  const [mediaPrompt, setMediaPrompt] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [generatedMediaUrl, setGeneratedMediaUrl] = useState<string | null>(null);
  
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [showScreenshotDialog, setShowScreenshotDialog] = useState(false);
  const [clonedDesign, setClonedDesign] = useState<any>(null);
  
  const [workspaceTabs, setWorkspaceTabs] = useState<string[]>(["Preview"]);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState(0);
  
  const [visualEditMode, setVisualEditMode] = useState(false);
  const [showVisualEditPanel, setShowVisualEditPanel] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [previewKey, setPreviewKey] = useState(0);
  
  const { isConnected: hotReloadConnected } = useHotReload({
    projectId: generatedProjectId,
    onFileChange: (filePath, type) => {
      console.log(`[HotReload] ${type}: ${filePath}`);
    },
    onRefreshRequired: () => {
      setPreviewKey(prev => prev + 1);
    },
    enabled: !!generatedProjectId,
  });
  
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [terminalReady, setTerminalReady] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsWsRef = useRef<WebSocket | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const cleanupTerminal = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }
    fitAddonRef.current = null;
    setTerminalReady(false);
  }, []);

  useEffect(() => {
    if (previewTab !== "terminal") {
      cleanupTerminal();
      return;
    }

    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#c0caf5',
        selectionBackground: '#33467c',
        black: '#32344a',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#ad8ee6',
        cyan: '#449dab',
        white: '#787c99',
        brightBlack: '#444b6a',
        brightRed: '#ff7a93',
        brightGreen: '#b9f27c',
        brightYellow: '#ff9e64',
        brightBlue: '#7da6ff',
        brightMagenta: '#bb9af7',
        brightCyan: '#0db9d7',
        brightWhite: '#acb0d0',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    
    term.open(terminalRef.current);
    setTimeout(() => fitAddon.fit(), 0);
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/terminal${generatedProjectId ? `?projectId=${generatedProjectId}` : ''}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setTerminalReady(true);
      term.writeln('\x1b[32mTerminal conectado!\x1b[0m');
      term.writeln('');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output') {
          term.write(msg.data);
        } else if (msg.type === 'connected') {
          term.writeln(`\x1b[90mDiretório: ${msg.cwd}\x1b[0m`);
        } else if (msg.type === 'exit') {
          term.writeln(`\x1b[33mProcesso encerrado com código ${msg.code}\x1b[0m`);
        } else if (msg.type === 'error') {
          term.writeln(`\x1b[31mErro: ${msg.message}\x1b[0m`);
        }
      } catch {
        term.write(event.data);
      }
    };

    ws.onerror = () => {
      term.writeln('\x1b[31mErro na conexão do terminal\x1b[0m');
    };

    ws.onclose = () => {
      setTerminalReady(false);
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cleanupTerminal();
    };
  }, [previewTab, generatedProjectId, cleanupTerminal]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/logs${generatedProjectId ? `?projectId=${generatedProjectId}` : ""}`;
    
    const ws = new WebSocket(wsUrl);
    logsWsRef.current = ws;
    
    ws.onopen = () => {
      console.log("Logs WebSocket connected");
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected" && data.bufferedLogs) {
          setLogs(data.bufferedLogs);
        } else if (data.type === "log" && data.data) {
          setLogs(prev => [...prev.slice(-99), data.data]);
        }
      } catch {}
    };
    
    ws.onclose = () => {
      logsWsRef.current = null;
    };
    
    return () => {
      if (logsWsRef.current) {
        logsWsRef.current.close();
        logsWsRef.current = null;
      }
    };
  }, [generatedProjectId]);

  const { data: tasks = [] } = useQuery<AgentTask[]>({
    queryKey: ["/api/tasks", currentConversation?.id],
    queryFn: async () => {
      if (!currentConversation?.id) return [];
      const res = await fetch(`/api/conversations/${currentConversation.id}/tasks`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentConversation?.id,
    refetchInterval: 2000,
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

  const { data: project } = useQuery<Project>({
    queryKey: ["/api/projects", generatedProjectId],
    queryFn: async () => {
      if (!generatedProjectId) return null;
      const res = await fetch(`/api/projects/${generatedProjectId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!generatedProjectId,
  });

  const { data: projectFiles = [] } = useQuery<FileInfo[]>({
    queryKey: ["/api/projects", generatedProjectId, "files"],
    queryFn: async () => {
      if (!generatedProjectId) return [];
      const res = await fetch(`/api/projects/${generatedProjectId}/files`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!generatedProjectId,
  });

  const { data: tables = [] } = useQuery<TableInfo[]>({
    queryKey: ["/api/database/tables"],
    queryFn: async () => {
      const res = await fetch("/api/database/tables", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activePanel === "database",
  });

  const readFile = useMutation({
    mutationFn: async (filePath: string) => {
      if (!generatedProjectId) return "";
      const res = await fetch(`/api/projects/${generatedProjectId}/files/read?path=${encodeURIComponent(filePath)}`, { credentials: "include" });
      if (!res.ok) return "";
      return res.text();
    },
    onSuccess: (content, filePath) => {
      setSelectedFile(filePath);
      setSelectedFileContent(content);
    },
  });

  const { data: agentSettings } = useQuery<AgentSettings>({
    queryKey: ["/api/agent/settings"],
    queryFn: async () => {
      const res = await fetch("/api/agent/settings", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: conversationsList = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/conversations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  interface CheckpointData {
    id: number;
    projectId: number;
    name: string;
    description: string | null;
    createdBy: string;
    createdAt: string;
  }

  const { data: checkpointsList = [], refetch: refetchCheckpoints } = useQuery<CheckpointData[]>({
    queryKey: ["/api/projects", generatedProjectId, "checkpoints"],
    queryFn: async () => {
      if (!generatedProjectId) return [];
      const res = await fetch(`/api/projects/${generatedProjectId}/checkpoints`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!generatedProjectId,
  });

  const createCheckpoint = useMutation({
    mutationFn: async (data: { name?: string; description?: string }) => {
      if (!generatedProjectId) throw new Error("Nenhum projeto selecionado");
      const res = await apiRequest("POST", `/api/projects/${generatedProjectId}/checkpoints`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchCheckpoints();
      toast({ title: "Checkpoint criado!", description: "Voce pode restaurar este ponto a qualquer momento." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const restoreCheckpoint = useMutation({
    mutationFn: async (checkpointId: number) => {
      const res = await apiRequest("POST", `/api/checkpoints/${checkpointId}/restore`, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", generatedProjectId, "files"] });
      toast({ 
        title: "Rollback concluido!", 
        description: `${data.restoredFiles} arquivos restaurados para "${data.checkpointName}"` 
      });
      setShowCheckpointsDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteCheckpoint = useMutation({
    mutationFn: async (checkpointId: number) => {
      const res = await apiRequest("DELETE", `/api/checkpoints/${checkpointId}`, {});
      return res.json();
    },
    onSuccess: () => {
      refetchCheckpoints();
      toast({ title: "Checkpoint removido" });
    },
  });

  interface SecretData {
    id: number;
    projectId: number;
    key: string;
    value: string;
    createdAt: string;
  }

  const { data: projectSecrets = [], refetch: refetchSecrets } = useQuery<SecretData[]>({
    queryKey: ["/api/projects", generatedProjectId, "secrets"],
    queryFn: async () => {
      if (!generatedProjectId) return [];
      const res = await fetch(`/api/projects/${generatedProjectId}/secrets`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!generatedProjectId,
  });

  const addSecret = useMutation({
    mutationFn: async (data: { key: string; value: string }) => {
      if (!generatedProjectId) throw new Error("Nenhum projeto selecionado");
      const res = await apiRequest("POST", `/api/projects/${generatedProjectId}/secrets`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchSecrets();
      setNewSecretKey("");
      setNewSecretValue("");
      toast({ title: "Secret adicionada!", description: "A chave foi salva com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteSecret = useMutation({
    mutationFn: async (key: string) => {
      if (!generatedProjectId) throw new Error("Nenhum projeto selecionado");
      const res = await apiRequest("DELETE", `/api/projects/${generatedProjectId}/secrets/${encodeURIComponent(key)}`, {});
      return res.json();
    },
    onSuccess: () => {
      refetchSecrets();
      toast({ title: "Secret removida" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const agentToolMode = agentSettings?.mode || "autonomous";
  const autonomyLevel = agentSettings?.autonomyLevel || "high";
  const appTesting = agentSettings?.appTesting !== false;
  const webSearch = agentSettings?.webSearch !== false;
  const mediaGeneration = agentSettings?.mediaGeneration !== false;

  const updateAgentSettings = useMutation({
    mutationFn: async (updates: Partial<AgentSettings>) => {
      const res = await apiRequest("PUT", "/api/agent/settings", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/settings"] });
    },
  });

  useEffect(() => {
    if (agentSettings) {
      if (agentSettings.operatingMode) {
        setMode(agentSettings.operatingMode as AgentMode);
      }
      if (agentSettings.buildApproach) {
        setBuildApproach(agentSettings.buildApproach as BuildApproach);
      }
      if (agentSettings.extendedThinking !== undefined && agentSettings.extendedThinking !== null) {
        setExtendedThinking(agentSettings.extendedThinking);
      }
    }
  }, [agentSettings]);

  const pendingSyncRef = useRef<{ conversationId: number; expectedCount: number } | null>(null);
  
  useEffect(() => {
    if (messages && !isStreaming) {
      const convId = currentConversation?.id;
      const pending = pendingSyncRef.current;
      
      if (pending && pending.conversationId === convId) {
        if (messages.length >= pending.expectedCount) {
          setLocalMessages(messages.map(m => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            createdAt: m.createdAt?.toString(),
          })));
          pendingSyncRef.current = null;
        }
      } else {
        if (pending && pending.conversationId !== convId) {
          pendingSyncRef.current = null;
        }
        setLocalMessages(messages.map(m => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          createdAt: m.createdAt?.toString(),
        })));
      }
    }
  }, [messages, isStreaming, currentConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, isStreaming]);

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
    onError: (error: Error) => {
      toast({
        title: "Erro ao iniciar conversa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const STREAMING_USER_ID = -1;
  const STREAMING_ASSISTANT_ID = -2;
  const streamedContentRef = useRef<string>("");

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    const message = input.trim();
    setInput("");
    streamedContentRef.current = "";
    
    let convId = currentConversation?.id;
    
    if (!convId) {
      const result = await createConversation.mutateAsync();
      convId = result.conversation.id;
    }

    const tempUserMessage: ChatMessage = {
      id: STREAMING_USER_ID,
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };
    const tempAssistantMessage: ChatMessage = {
      id: STREAMING_ASSISTANT_ID,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };
    
    setLocalMessages(prev => [...prev.filter(m => m.id !== STREAMING_USER_ID && m.id !== STREAMING_ASSISTANT_ID), tempUserMessage, tempAssistantMessage]);

    try {
      await streamMessage(
        convId,
        message,
        (token) => {
          streamedContentRef.current += token;
          setLocalMessages(prev => prev.map(m => 
            m.id === STREAMING_ASSISTANT_ID 
              ? { ...m, content: m.content + token }
              : m
          ));
        },
        async (result) => {
          if (result?.projectId) {
            setGeneratedProjectId(result.projectId);
            setPreviewUrl(`/preview/${result.projectId}`);
          }
          
          const currentCount = localMessages.filter(m => m.id > 0).length;
          pendingSyncRef.current = {
            conversationId: convId,
            expectedCount: currentCount + 2,
          };
          
          try {
            await queryClient.refetchQueries({ queryKey: ["/api/messages", convId] });
            await queryClient.refetchQueries({ queryKey: ["/api/tasks", convId] });
          } catch (fetchError) {
            console.error("Failed to refetch messages:", fetchError);
          }
        },
        (error) => {
          setLocalMessages(prev => prev.filter(m => m.id !== STREAMING_ASSISTANT_ID));
          toast({
            title: "Erro",
            description: error,
            variant: "destructive",
          });
        },
        aiModel
      );
    } catch (error: any) {
      setLocalMessages(prev => prev.filter(m => m.id !== STREAMING_ASSISTANT_ID));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAddSecret = () => {
    if (newSecretKey && newSecretValue) {
      addSecret.mutate({ key: newSecretKey, value: newSecretValue });
    }
  };

  const handleDeleteSecret = (key: string) => {
    deleteSecret.mutate(key);
  };

  const handleAddWorkspaceTab = () => {
    const newTabName = `Tab ${workspaceTabs.length + 1}`;
    setWorkspaceTabs(prev => [...prev, newTabName]);
    setActiveWorkspaceTab(workspaceTabs.length);
    setActivePanel(null);
  };

  const handleCloseWorkspaceTab = (index: number) => {
    if (workspaceTabs.length === 1) return;
    setWorkspaceTabs(prev => prev.filter((_, i) => i !== index));
    if (activeWorkspaceTab >= index && activeWorkspaceTab > 0) {
      setActiveWorkspaceTab(activeWorkspaceTab - 1);
    }
  };

  const togglePanel = (panel: BottomPanel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const getLanguageFromPath = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'py': 'python',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'php': 'php',
      'rb': 'ruby',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
    };
    return languageMap[ext] || 'plaintext';
  };

  const handleFileClick = (file: FileInfo) => {
    if (file.type === "directory") {
      toggleFolder(file.path);
    } else {
      readFile.mutate(file.path);
    }
  };

  const renderFileTree = (files: FileInfo[], depth = 0): JSX.Element[] => {
    return files.map(file => (
      <div key={file.path}>
        <div
          className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover-elevate rounded-sm ${
            selectedFile === file.path ? "bg-muted" : ""
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => handleFileClick(file)}
        >
          {file.type === "directory" ? (
            <>
              {expandedFolders.has(file.path) ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              <FolderOpen className="h-4 w-4 text-yellow-500" />
            </>
          ) : (
            <>
              <span className="w-3" />
              <File className="h-4 w-4 text-blue-400" />
            </>
          )}
          <span className="text-xs truncate">{file.name}</span>
        </div>
        {file.type === "directory" && expandedFolders.has(file.path) && file.children && (
          <div>{renderFileTree(file.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  const completedTasks = tasks.filter(t => t.status === "completed");
  const activeTasks = tasks.filter(t => t.status === "running" || t.status === "pending");
  const runningTask = tasks.find(t => t.status === "running");

  const getTaskIcon = (type: string, status: string) => {
    if (status === "completed") return <Check className="h-3 w-3 text-green-500" />;
    if (status === "running") return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
    return <Circle className="h-3 w-3 text-muted-foreground" />;
  };

  const getStatusBanner = () => {
    if (isStreaming) {
      return { icon: <Loader2 className="h-4 w-4 animate-spin" />, text: "Analisando sua mensagem...", color: "bg-blue-500/10 border-blue-500/30" };
    }
    if (runningTask) {
      if (runningTask.type === "thinking") {
        return { icon: <Loader2 className="h-4 w-4 animate-spin" />, text: "Pensando na melhor solução...", color: "bg-purple-500/10 border-purple-500/30" };
      }
      if (runningTask.type === "generating") {
        return { icon: <Code className="h-4 w-4" />, text: runningTask.title || "Gerando código...", color: "bg-green-500/10 border-green-500/30" };
      }
      if (runningTask.type === "writing") {
        return { icon: <Play className="h-4 w-4" />, text: runningTask.title || "Salvando arquivos...", color: "bg-orange-500/10 border-orange-500/30" };
      }
    }
    return null;
  };

  const statusBanner = getStatusBanner();

  return (
    <div className="flex h-screen bg-background" data-testid="agent-container">
      <div className="flex flex-1">
        <div className="w-[400px] flex flex-col border-r bg-sidebar">
          <div className="flex items-center justify-between gap-2 p-3 border-b">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowConversationHistory(true)} data-testid="button-history">
                <History className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium">
              <span className="text-primary">Bratvacoder</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" data-testid="button-settings">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {statusBanner && (
            <div className={`flex items-center gap-2 px-3 py-2 mx-2 mt-2 rounded-md border text-sm ${statusBanner.color}`} data-testid="status-banner">
              {statusBanner.icon}
              <span>{statusBanner.text}</span>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {completedTasks.length > 0 && (
                <Collapsible open={completedTasksOpen} onOpenChange={setCompletedTasksOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between gap-2 w-full p-2 text-sm hover-elevate rounded-md">
                    <div className="flex items-center gap-2">
                      {completedTasksOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span>Tarefas concluídas</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {completedTasks.length}/{tasks.length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 space-y-1">
                    {completedTasks.map(task => (
                      <div key={task.id} className="flex items-start gap-2 p-2 text-xs text-muted-foreground rounded-md hover-elevate">
                        {getTaskIcon(task.type, task.status)}
                        <span className="flex-1">{task.title}</span>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {activeTasks.length > 0 && (
                <Collapsible open={activeTasksOpen} onOpenChange={setActiveTasksOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between gap-2 w-full p-2 text-sm hover-elevate rounded-md">
                    <div className="flex items-center gap-2">
                      {activeTasksOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span>Tarefas ativas</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activeTasks.length}
                    </Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 space-y-1">
                    {activeTasks.map(task => (
                      <div key={task.id} className="flex items-start gap-2 p-2 text-xs rounded-md hover-elevate">
                        {getTaskIcon(task.type, task.status)}
                        <span className="flex-1">{task.title}</span>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {localMessages.map((message) => (
                <div 
                  key={message.id} 
                  className={`p-3 rounded-md text-sm ${
                    message.role === "user" 
                      ? "bg-primary/10 ml-4" 
                      : "bg-muted/50"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.createdAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  )}
                </div>
              ))}

              {isStreaming && (
                <div className="p-3 rounded-md bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="font-medium">
                      {currentPhase === "thinking" && "Analisando sua solicitacao..."}
                      {currentPhase === "generating" && "Gerando codigo..."}
                      {currentPhase === "writing" && "Salvando arquivos no projeto..."}
                      {currentPhase === "done" && "Projeto criado com sucesso!"}
                      {!currentPhase && "Iniciando processamento..."}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${currentPhase === "thinking" || currentPhase === "generating" || currentPhase === "writing" || currentPhase === "done" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {(currentPhase === "generating" || currentPhase === "writing" || currentPhase === "done") ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
                      </div>
                      <span className={currentPhase === "thinking" ? "text-foreground" : "text-muted-foreground"}>Analise</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${currentPhase === "generating" || currentPhase === "writing" || currentPhase === "done" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {(currentPhase === "writing" || currentPhase === "done") ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
                      </div>
                      <span className={currentPhase === "generating" ? "text-foreground" : "text-muted-foreground"}>Geracao de codigo</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${currentPhase === "writing" || currentPhase === "done" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {currentPhase === "done" ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
                      </div>
                      <span className={currentPhase === "writing" ? "text-foreground" : "text-muted-foreground"}>
                        {currentPhase === "writing" && filesProgress.total ? `Salvando arquivos (${filesProgress.created}/${filesProgress.total})` : "Salvar arquivos"}
                      </span>
                    </div>
                  </div>
                  
                  {currentPhase === "writing" && filesProgress.total && filesProgress.total > 0 && (
                    <Progress value={(filesProgress.created / filesProgress.total) * 100} className="h-1.5" />
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-3 border-t">
            <form onSubmit={handleSubmit} className="space-y-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Descreva o que você quer criar..."
                className="min-h-[80px] resize-none"
                disabled={isStreaming}
                data-testid="input-message"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AgentModeBubble
                    mode={mode as BubbleAgentMode}
                    onModeChange={(m) => {
                      setMode(m as AgentMode);
                      updateAgentSettings.mutate({ operatingMode: m });
                    }}
                    disabled={isStreaming}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isStreaming}
                        className={`gap-1.5 px-3 py-1.5 h-auto rounded-full border transition-all duration-200 ${
                          aiModel === "gpt-4o" 
                            ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30" 
                            : "bg-zinc-500/20 text-zinc-600 dark:text-zinc-400 border-zinc-500/30"
                        }`}
                        data-testid="button-model-select"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">{aiModel === "gpt-4o" ? "GPT-4o" : "GPT-4o Mini"}</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem
                        onClick={() => setAiModel("gpt-4o-mini")}
                        className={`flex items-start gap-3 p-3 cursor-pointer ${aiModel === "gpt-4o-mini" ? "bg-accent" : ""}`}
                        data-testid="menuitem-model-mini"
                      >
                        <div className="p-1.5 rounded-md bg-zinc-500/20 text-zinc-600 dark:text-zinc-400">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">GPT-4o Mini</span>
                            {aiModel === "gpt-4o-mini" && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Ativo</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Rapido e economico</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setAiModel("gpt-4o")}
                        className={`flex items-start gap-3 p-3 cursor-pointer ${aiModel === "gpt-4o" ? "bg-accent" : ""}`}
                        data-testid="menuitem-model-4o"
                      >
                        <div className="p-1.5 rounded-md bg-purple-500/20 text-purple-600 dark:text-purple-400">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">GPT-4o</span>
                            {aiModel === "gpt-4o" && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Ativo</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Mais inteligente e poderoso</p>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AgentToolsBubble
                    buildApproach={buildApproach as BubbleBuildApproach}
                    onBuildApproachChange={(approach) => {
                      setBuildApproach(approach as BuildApproach);
                      updateAgentSettings.mutate({ buildApproach: approach });
                    }}
                    onOpenWebSearch={() => setShowWebSearchDialog(true)}
                    onOpenMediaGen={() => setShowMediaDialog(true)}
                    onOpenScreenshotClone={() => setShowScreenshotDialog(true)}
                    onOpenSettings={() => setShowSettingsDialog(true)}
                    onOpenCheckpoints={() => setActivePanel("checkpoints")}
                    onOpenTests={() => setActivePanel("testing")}
                    onOpenDatabase={() => setActivePanel("database")}
                    onOpenSecrets={() => setActivePanel("secrets")}
                    onOpenMobile={() => setActivePanel("mobile")}
                    onOpenVisualEditor={() => setActivePanel("visual")}
                    onOpenReplitMd={() => setActivePanel("replitmd")}
                    onAttach={() => {}}
                    disabled={isStreaming}
                  />
                </div>
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={!input.trim() || isStreaming}
                  data-testid="button-send"
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>

          <div className="flex items-center justify-around gap-1 p-2 border-t bg-sidebar">
            <Button 
              variant={activePanel === "secrets" ? "secondary" : "ghost"} 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={() => togglePanel("secrets")}
              data-testid="button-secrets"
            >
              <Lock className="h-4 w-4" />
              <span className="text-xs">Secrets</span>
            </Button>
            <Button 
              variant={activePanel === "database" ? "secondary" : "ghost"} 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={() => togglePanel("database")}
              data-testid="button-database"
            >
              <Database className="h-4 w-4" />
              <span className="text-xs">Database</span>
            </Button>
            <Button 
              variant={activePanel === "auth" ? "secondary" : "ghost"} 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={() => togglePanel("auth")}
              data-testid="button-auth"
            >
              <Users className="h-4 w-4" />
              <span className="text-xs">Auth</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={handleAddWorkspaceTab}
              data-testid="button-new-tab"
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs">New Tab</span>
            </Button>
            <Button 
              variant={activePanel === "tools" ? "secondary" : "ghost"} 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={() => togglePanel("tools")}
              data-testid="button-agent-tools"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-xs">Tools</span>
            </Button>
            <Button 
              variant={activePanel === "logs" ? "secondary" : "ghost"} 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={() => togglePanel("logs")}
              data-testid="button-logs"
            >
              <FileText className="h-4 w-4" />
              <span className="text-xs">Logs</span>
            </Button>
            <Button 
              variant={activePanel === "packages" ? "secondary" : "ghost"} 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={() => {
                togglePanel("packages");
                if (activePanel !== "packages") {
                  fetch("/api/packages", { credentials: "include" })
                    .then(res => res.json())
                    .then(data => setInstalledPackages(data))
                    .catch(() => {});
                }
              }}
              data-testid="button-packages"
            >
              <Package className="h-4 w-4" />
              <span className="text-xs">Packages</span>
            </Button>
            <Button 
              variant={activePanel === "testing" ? "secondary" : "ghost"} 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={() => togglePanel("testing")}
              data-testid="button-testing"
            >
              <TestTube2 className="h-4 w-4" />
              <span className="text-xs">Testing</span>
            </Button>
            <Button 
              variant={activePanel === "terminal" ? "secondary" : "ghost"} 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={() => togglePanel("terminal")}
              data-testid="button-terminal-panel"
            >
              <Terminal className="h-4 w-4" />
              <span className="text-xs">Terminal</span>
            </Button>
            <Button 
              variant={activePanel === "search" ? "secondary" : "ghost"} 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={() => togglePanel("search")}
              data-testid="button-search-panel"
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs">Busca</span>
            </Button>
            <Button 
              variant={activePanel === "media" ? "secondary" : "ghost"} 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={() => togglePanel("media")}
              data-testid="button-media-panel"
            >
              <Image className="h-4 w-4" />
              <span className="text-xs">Imagens</span>
            </Button>
            <Button 
              variant={activePanel === "checkpoints" ? "secondary" : "ghost"} 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={() => togglePanel("checkpoints")}
              data-testid="button-checkpoints-panel"
            >
              <History className="h-4 w-4" />
              <span className="text-xs">Checkpoints</span>
            </Button>
            <Button 
              variant={showDeployDialog ? "secondary" : "ghost"} 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={() => setShowDeployDialog(true)}
              data-testid="button-deploy"
            >
              <Rocket className="h-4 w-4" />
              <span className="text-xs">Deploy</span>
            </Button>
            <Button 
              variant={showAdvancedTools ? "secondary" : "ghost"} 
              size="sm" 
              className="flex flex-col items-center gap-1 h-auto py-2" 
              onClick={() => setShowAdvancedTools(true)}
              data-testid="button-advanced-tools"
            >
              <Zap className="h-4 w-4" />
              <span className="text-xs">Advanced</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-background">
          <div className="flex items-center gap-2 p-2 border-b">
            <div className="flex items-center gap-1 flex-1 overflow-x-auto">
              {workspaceTabs.map((tab, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs cursor-pointer ${
                    activeWorkspaceTab === index ? "bg-muted" : "hover-elevate"
                  }`}
                  onClick={() => setActiveWorkspaceTab(index)}
                >
                  <span>{tab}</span>
                  {workspaceTabs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseWorkspaceTab(index);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="preview" className="text-xs gap-1" data-testid="tab-preview">
                  <Eye className="h-3 w-3" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code" className="text-xs gap-1" data-testid="tab-code">
                  <Code className="h-3 w-3" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="terminal" className="text-xs gap-1" data-testid="tab-terminal">
                  <Terminal className="h-3 w-3" />
                  Terminal
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-refresh">
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-external">
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button 
                variant={visualEditMode ? "secondary" : "outline"}
                size="sm" 
                className="h-7 gap-1 text-xs"
                onClick={() => {
                  setVisualEditMode(!visualEditMode);
                  if (!visualEditMode) setShowVisualEditPanel(true);
                }}
                disabled={!previewUrl}
                data-testid="button-visual-edit"
              >
                <MousePointer2 className="h-3 w-3" />
                Editor Visual
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 gap-1 text-xs"
                onClick={() => setShowCheckpointsDialog(true)}
                disabled={!generatedProjectId}
                data-testid="button-checkpoints"
              >
                <History className="h-3 w-3" />
                Checkpoints
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                className="h-7 gap-1 text-xs"
                onClick={() => setShowDeployDialog(true)}
                disabled={!project}
                data-testid="button-deploy"
              >
                <Rocket className="h-3 w-3" />
                Publicar
              </Button>
            </div>
          </div>

          <div className="flex-1 relative">
            {previewTab === "preview" && (
              <div className="absolute inset-0 flex">
                <div className={`flex-1 relative ${visualEditMode ? 'border-2 border-primary border-dashed' : ''}`}>
                  {previewUrl ? (
                    <>
                      <iframe
                        key={previewKey}
                        ref={previewIframeRef}
                        src={previewUrl}
                        className="w-full h-full border-0"
                        title="Preview"
                        data-testid="preview-iframe"
                      />
                      {visualEditMode && (
                        <div 
                          className="absolute inset-0 bg-primary/5 pointer-events-none flex items-start justify-center pt-4"
                          data-testid="visual-edit-overlay"
                        >
                          <div className="bg-background/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border flex items-center gap-2 pointer-events-auto">
                            <MousePointer2 className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Modo Editor Visual Ativo</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 ml-2"
                              onClick={() => setVisualEditMode(false)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto h-full">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-6">
                        <Play className="h-10 w-10 text-white" />
                      </div>
                      <h2 className="text-xl font-semibold mb-2">Preview ao Vivo</h2>
                      <p className="text-muted-foreground text-sm mb-4">
                        Descreva o que você quer criar e o projeto aparecerá aqui, rodando em tempo real.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Badge variant="secondary">React</Badge>
                        <Badge variant="secondary">Node.js</Badge>
                        <Badge variant="secondary">PostgreSQL</Badge>
                      </div>
                    </div>
                  )}
                </div>
                
                {showVisualEditPanel && visualEditMode && (
                  <div className="w-64 border-l bg-sidebar flex flex-col" data-testid="visual-edit-panel">
                    <div className="flex items-center justify-between px-3 py-2 border-b">
                      <div className="flex items-center gap-2">
                        <Paintbrush className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Editor Visual</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => {
                          setShowVisualEditPanel(false);
                          setVisualEditMode(false);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <ScrollArea className="flex-1">
                      <div className="p-3 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <Type className="h-3 w-3" />
                            Editar Texto
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Clique em qualquer texto no preview para editá-lo diretamente.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <Palette className="h-3 w-3" />
                            Cores Rápidas
                          </Label>
                          <div className="grid grid-cols-6 gap-1">
                            {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'].map((color) => (
                              <button
                                key={color}
                                className="w-6 h-6 rounded-md border hover:scale-110 transition-transform"
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                  setInput(`Altere a cor primária para ${color}`);
                                  toast({ title: "Cor selecionada", description: "Digite Enter para aplicar a mudança" });
                                }}
                                data-testid={`color-${color.replace('#', '')}`}
                              />
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs font-medium flex items-center gap-1">
                            <Move className="h-3 w-3" />
                            Ações Rápidas
                          </Label>
                          <div className="space-y-1">
                            {[
                              { label: "Adicionar botão", prompt: "Adicione um novo botão na página" },
                              { label: "Mudar fonte", prompt: "Mude a fonte para uma mais moderna" },
                              { label: "Adicionar imagem", prompt: "Adicione uma imagem de placeholder" },
                              { label: "Centralizar conteúdo", prompt: "Centralize todo o conteúdo da página" },
                            ].map((action) => (
                              <Button
                                key={action.label}
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-xs h-7"
                                onClick={() => {
                                  setInput(action.prompt);
                                  toast({ title: action.label, description: "Digite Enter para aplicar" });
                                }}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            Dica: Descreva qualquer mudança visual no chat e o Bratvacoder irá implementar automaticamente.
                          </p>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}

            {previewTab === "code" && (
              <div className="absolute inset-0">
                <WorkspaceEditor 
                  projectId={generatedProjectId || 0}
                  theme={theme === "dark" ? "vs-dark" : "light"}
                  className="h-full"
                />
              </div>
            )}

            {previewTab === "terminal" && (
              <div className="absolute inset-0 bg-[#1a1b26] flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-[#1f2335]">
                  <Terminal className="h-4 w-4 text-green-400" />
                  <span className="text-xs font-mono text-gray-300">Terminal</span>
                  <div className="ml-auto flex items-center gap-2">
                    {terminalReady ? (
                      <Badge variant="outline" className="text-xs bg-green-900/30 text-green-400 border-green-800">
                        <Circle className="h-2 w-2 mr-1 fill-green-400" />
                        Conectado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-yellow-900/30 text-yellow-400 border-yellow-800">
                        <Loader2 className="h-2 w-2 mr-1 animate-spin" />
                        Conectando...
                      </Badge>
                    )}
                  </div>
                </div>
                <div ref={terminalRef} className="flex-1" />
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={activePanel === "secrets"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Secrets
            </DialogTitle>
            <DialogDescription>
              Gerencie as chaves e senhas do seu projeto. Elas ficam seguras e criptografadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {!generatedProjectId ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhum projeto selecionado</p>
                  <p className="text-xs mt-1">Gere um projeto primeiro para gerenciar secrets</p>
                </div>
              ) : projectSecrets.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Nenhuma secret ainda</p>
                </div>
              ) : (
                projectSecrets.map((secret) => (
                  <div key={secret.key} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 font-mono text-sm">{secret.key}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteSecret(secret.key)}
                      disabled={deleteSecret.isPending}
                    >
                      {deleteSecret.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="NOME_DA_CHAVE"
                value={newSecretKey}
                onChange={(e) => setNewSecretKey(e.target.value.toUpperCase())}
                className="font-mono"
                disabled={!generatedProjectId}
              />
              <Input
                placeholder="valor"
                type="password"
                value={newSecretValue}
                onChange={(e) => setNewSecretValue(e.target.value)}
                disabled={!generatedProjectId}
              />
              <Button 
                onClick={handleAddSecret} 
                disabled={!newSecretKey || !newSecretValue || !generatedProjectId || addSecret.isPending}
              >
                {addSecret.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "database"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Explorer
            </DialogTitle>
            <DialogDescription>
              Visualize tabelas e execute consultas SQL (somente leitura).
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="tables" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tables">Tabelas</TabsTrigger>
              <TabsTrigger value="query">Consulta SQL</TabsTrigger>
            </TabsList>
            <TabsContent value="tables" className="flex-1 overflow-auto">
              <div className="space-y-2">
                {tables.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Carregando tabelas...
                  </div>
                ) : (
                  tables.map((table: any) => (
                    <div 
                      key={table.name} 
                      className={`flex items-center gap-2 p-3 rounded-md cursor-pointer ${
                        selectedTable === table.name ? 'bg-accent' : 'bg-muted/50 hover-elevate'
                      }`}
                      onClick={async () => {
                        setSelectedTable(table.name);
                        try {
                          const res = await fetch(`/api/database/tables/${table.name}?limit=50`, { credentials: "include" });
                          if (res.ok) {
                            setTableData(await res.json());
                          }
                        } catch {}
                      }}
                    >
                      <Table className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 font-mono text-sm">{table.name}</span>
                      <Badge variant="secondary">{table.rowCount} registros</Badge>
                    </div>
                  ))
                )}
              </div>
              {tableData && selectedTable && (
                <div className="mt-4 border rounded-md overflow-auto max-h-60">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        {tableData.fields?.map((field: string) => (
                          <th key={field} className="px-2 py-1 text-left font-mono">{field}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.rows?.slice(0, 20).map((row: any, i: number) => (
                        <tr key={i} className="border-t">
                          {tableData.fields?.map((field: string) => (
                            <td key={field} className="px-2 py-1 font-mono truncate max-w-32">
                              {JSON.stringify(row[field])?.slice(0, 50)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
            <TabsContent value="query" className="flex-1 flex flex-col gap-3">
              <Textarea
                placeholder="SELECT * FROM users LIMIT 10"
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="font-mono text-sm min-h-24"
              />
              <Button 
                onClick={async () => {
                  setSqlLoading(true);
                  try {
                    const res = await fetch("/api/database/query", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ query: sqlQuery }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message);
                    setSqlResult(data);
                  } catch (err: any) {
                    setSqlResult({ error: err.message });
                  } finally {
                    setSqlLoading(false);
                  }
                }}
                disabled={!sqlQuery || sqlLoading}
              >
                {sqlLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Executar
              </Button>
              {sqlResult && (
                <div className="border rounded-md overflow-auto max-h-48">
                  {sqlResult.error ? (
                    <div className="p-3 text-sm text-red-500">{sqlResult.error}</div>
                  ) : (
                    <>
                      <div className="text-xs text-muted-foreground p-2 bg-muted/50">
                        {sqlResult.rowCount} registros em {sqlResult.executionTime}ms
                      </div>
                      <table className="w-full text-xs">
                        <thead className="bg-muted/30">
                          <tr>
                            {sqlResult.fields?.map((f: string) => (
                              <th key={f} className="px-2 py-1 text-left font-mono">{f}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sqlResult.rows?.slice(0, 20).map((row: any, i: number) => (
                            <tr key={i} className="border-t">
                              {sqlResult.fields?.map((f: string) => (
                                <td key={f} className="px-2 py-1 font-mono truncate max-w-32">
                                  {JSON.stringify(row[f])?.slice(0, 50)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "auth"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Autenticação
            </DialogTitle>
            <DialogDescription>
              Configure como os usuários vão fazer login no seu aplicativo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Replit Auth
                </CardTitle>
                <CardDescription className="text-xs">
                  Login rápido com conta Replit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">Ativado</span>
                  <Badge variant="secondary">Configurado</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Google OAuth
                </CardTitle>
                <CardDescription className="text-xs">
                  Login com conta Google
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full">
                  Configurar
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConversationHistory} onOpenChange={setShowConversationHistory}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Conversas
            </DialogTitle>
            <DialogDescription>
              Suas conversas anteriores com o agente
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {conversationsList.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma conversa ainda
                </div>
              ) : (
                conversationsList.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center gap-3 p-3 rounded-md cursor-pointer hover-elevate ${
                      currentConversation?.id === conv.id ? "bg-muted" : ""
                    }`}
                    onClick={() => {
                      setCurrentConversation(conv);
                      setShowConversationHistory(false);
                      queryClient.invalidateQueries({ queryKey: ["/api/messages", conv.id] });
                    }}
                  >
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{conv.title || "Nova Conversa"}</div>
                      <div className="text-xs text-muted-foreground">
                        {conv.createdAt && formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {conv.status === "completed" ? "Pronto" : conv.status === "generating_code" ? "Gerando" : "Coletando"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="pt-4 border-t">
            <Button 
              className="w-full" 
              onClick={() => {
                createConversation.mutate();
                setShowConversationHistory(false);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Conversa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "tools"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Ferramentas do Bratvacoder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <div 
                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer ${agentToolMode === "fast" ? "bg-muted" : "hover-elevate"}`}
                onClick={() => updateAgentSettings.mutate({ mode: "fast" })}
              >
                <Zap className="h-5 w-5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Fast</div>
                  <div className="text-xs text-muted-foreground">Mudanças rápidas e leves</div>
                </div>
              </div>
              <div 
                className={`flex items-center gap-3 p-3 rounded-md cursor-pointer ${agentToolMode === "autonomous" ? "bg-muted" : "hover-elevate"}`}
                onClick={() => updateAgentSettings.mutate({ mode: "autonomous" })}
              >
                <Infinity className="h-5 w-5" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Autonomous</div>
                  <div className="text-xs text-muted-foreground">Controle o nível de autonomia</div>
                </div>
              </div>
            </div>

            {agentToolMode === "autonomous" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {(["low", "medium", "high", "max"] as AutonomyLevel[]).map((level) => (
                    <Button
                      key={level}
                      variant={autonomyLevel === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateAgentSettings.mutate({ autonomyLevel: level })}
                      className="flex-1 capitalize"
                    >
                      {level === "low" ? "Baixo" : level === "medium" ? "Médio" : level === "high" ? "Alto" : "Máximo"}
                    </Button>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    {autonomyLevel !== "low" && <Check className="h-3 w-3 text-green-500" />}
                    {autonomyLevel === "low" && <X className="h-3 w-3 text-muted-foreground" />}
                    <span>Gera e executa listas de tarefas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(autonomyLevel === "high" || autonomyLevel === "max") && <Check className="h-3 w-3 text-green-500" />}
                    {(autonomyLevel === "low" || autonomyLevel === "medium") && <X className="h-3 w-3 text-muted-foreground" />}
                    <span>Revisa código e corrige problemas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {autonomyLevel === "max" && <Check className="h-3 w-3 text-green-500" />}
                    {autonomyLevel !== "max" && <X className="h-3 w-3 text-muted-foreground" />}
                    <span>Planeja e completa trabalho independentemente</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  <Label htmlFor="app-testing" className="text-sm">App Testing</Label>
                </div>
                <Switch id="app-testing" checked={appTesting} onCheckedChange={(v) => updateAgentSettings.mutate({ appTesting: v })} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Outros</div>
              <div className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">Web search</span>
                </div>
                <Switch checked={webSearch} onCheckedChange={(v) => updateAgentSettings.mutate({ webSearch: v })} />
              </div>
              <div className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  <span className="text-sm">Media generation</span>
                </div>
                <Switch checked={mediaGeneration} onCheckedChange={(v) => updateAgentSettings.mutate({ mediaGeneration: v })} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "logs"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Console de Logs
            </DialogTitle>
            <DialogDescription>
              Logs em tempo real do servidor e aplicacao
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-96 rounded-md bg-muted/50 font-mono text-xs">
            <div className="p-4 space-y-1">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Aguardando logs...
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div 
                    key={idx} 
                    className={`flex gap-2 py-0.5 ${
                      log.level === "error" ? "text-red-500" : 
                      log.level === "warn" ? "text-yellow-500" : 
                      log.level === "debug" ? "text-muted-foreground" : ""
                    }`}
                  >
                    <span className="text-muted-foreground shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString("pt-BR")}
                    </span>
                    <Badge 
                      variant={log.level === "error" ? "destructive" : log.level === "warn" ? "outline" : "secondary"} 
                      className="text-[10px] px-1 py-0 h-4"
                    >
                      {log.level.toUpperCase()}
                    </Badge>
                    {log.source && (
                      <span className="text-muted-foreground">[{log.source}]</span>
                    )}
                    <span className="break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              {logs.length} log(s) recente(s)
            </span>
            <Button variant="outline" size="sm" onClick={() => setLogs([])}>
              Limpar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "packages"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Gerenciador de Pacotes
            </DialogTitle>
            <DialogDescription>
              Instale, remova e gerencie dependencias do projeto
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="installed" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="installed">Instalados ({installedPackages.length})</TabsTrigger>
              <TabsTrigger value="search">Buscar</TabsTrigger>
            </TabsList>
            <TabsContent value="installed" className="flex-1 overflow-auto">
              <div className="space-y-2">
                {installedPackages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Carregando pacotes...</p>
                  </div>
                ) : (
                  installedPackages.map((pkg: any) => (
                    <div key={pkg.name} className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 font-mono text-sm">{pkg.name}</span>
                      <Badge variant="outline" className="font-mono text-xs">{pkg.version}</Badge>
                      {pkg.isDevDependency && (
                        <Badge variant="secondary" className="text-xs">dev</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          setPackageLoading(true);
                          try {
                            await fetch(`/api/packages/${pkg.name}`, {
                              method: "DELETE",
                              credentials: "include",
                            });
                            setInstalledPackages(prev => prev.filter(p => p.name !== pkg.name));
                            toast({ title: "Pacote removido", description: pkg.name });
                          } catch {
                            toast({ title: "Erro ao remover", variant: "destructive" });
                          } finally {
                            setPackageLoading(false);
                          }
                        }}
                        disabled={packageLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            <TabsContent value="search" className="flex-1 flex flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar pacotes npm..."
                  value={packageSearch}
                  onChange={(e) => setPackageSearch(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && packageSearch) {
                      setPackageLoading(true);
                      try {
                        const res = await fetch(`/api/packages/search?q=${encodeURIComponent(packageSearch)}`, { credentials: "include" });
                        setPackageSearchResults(await res.json());
                      } catch {} finally {
                        setPackageLoading(false);
                      }
                    }
                  }}
                />
                <Button
                  onClick={async () => {
                    if (!packageSearch) return;
                    setPackageLoading(true);
                    try {
                      const res = await fetch(`/api/packages/search?q=${encodeURIComponent(packageSearch)}`, { credentials: "include" });
                      setPackageSearchResults(await res.json());
                    } catch {} finally {
                      setPackageLoading(false);
                    }
                  }}
                  disabled={!packageSearch || packageLoading}
                >
                  {packageLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {packageSearchResults.map((pkg: any) => (
                    <div key={pkg.name} className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
                      <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm font-medium">{pkg.name}</div>
                        <p className="text-xs text-muted-foreground truncate">{pkg.description}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={async () => {
                          setPackageLoading(true);
                          try {
                            const res = await fetch("/api/packages/install", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              credentials: "include",
                              body: JSON.stringify({ name: pkg.name }),
                            });
                            if (res.ok) {
                              toast({ title: "Pacote instalado", description: pkg.name });
                              const pkgsRes = await fetch("/api/packages", { credentials: "include" });
                              setInstalledPackages(await pkgsRes.json());
                            }
                          } catch {
                            toast({ title: "Erro ao instalar", variant: "destructive" });
                          } finally {
                            setPackageLoading(false);
                          }
                        }}
                        disabled={packageLoading || installedPackages.some(p => p.name === pkg.name)}
                      >
                        {installedPackages.some(p => p.name === pkg.name) ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "testing"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5" />
              Testes Automatizados
            </DialogTitle>
            <DialogDescription>
              Execute testes de saude e verificacoes automaticas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Health Check
                </CardTitle>
                <CardDescription className="text-xs">
                  Verifique se sua aplicacao esta respondendo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="URL para testar (ex: /api/health)"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={async () => {
                      setTestLoading(true);
                      try {
                        const url = testUrl.startsWith("http") ? testUrl : window.location.origin + testUrl;
                        const res = await fetch("/api/testing/health-check", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ url }),
                        });
                        setTestResults(await res.json());
                      } catch (err: any) {
                        setTestResults({ error: err.message });
                      } finally {
                        setTestLoading(false);
                      }
                    }}
                    disabled={testLoading}
                  >
                    {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
                {testResults && (
                  <div className={`p-3 rounded-md ${testResults.healthy ? "bg-green-500/10" : "bg-red-500/10"}`}>
                    <div className="flex items-center gap-2">
                      {testResults.healthy ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        {testResults.healthy ? "Aplicacao Saudavel" : "Problema Detectado"}
                      </span>
                    </div>
                    <div className="mt-2 text-sm space-y-1">
                      <div className="flex gap-2">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={testResults.statusCode >= 200 && testResults.statusCode < 300 ? "secondary" : "destructive"}>
                          {testResults.statusCode || "N/A"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground">Tempo:</span>
                        <span>{testResults.responseTime}ms</span>
                      </div>
                      {testResults.error && (
                        <div className="text-red-500 text-xs mt-2">{testResults.error}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Testes de Endpoint
                </CardTitle>
                <CardDescription className="text-xs">
                  Teste multiplos endpoints da sua API
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    setTestLoading(true);
                    try {
                      const res = await fetch("/api/testing/endpoints", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          baseUrl: window.location.origin,
                          endpoints: [
                            { method: "GET", path: "/api/auth/user", expectedStatus: 200 },
                            { method: "GET", path: "/api/projects", expectedStatus: 200 },
                            { method: "GET", path: "/api/conversations", expectedStatus: 200 },
                          ],
                        }),
                      });
                      const results = await res.json();
                      toast({
                        title: "Testes concluidos",
                        description: `${results.filter((r: any) => r.status === "passed").length}/${results.length} passaram`,
                      });
                    } catch {
                      toast({ title: "Erro ao executar testes", variant: "destructive" });
                    } finally {
                      setTestLoading(false);
                    }
                  }}
                  disabled={testLoading}
                >
                  {testLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  Executar Testes de API
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "terminal"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] p-0 overflow-hidden">
          <RealTerminal projectId={generatedProjectId || 0} className="h-[70vh]" />
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "search"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0">
          <div className="h-[70vh]">
            <WebSearchPanel onInsertResult={(result) => {
              setInput(prev => prev + `\n\n[${result.title}](${result.url}): ${result.snippet}`);
              setActivePanel(null);
            }} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "media"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0">
          <div className="h-[70vh]">
            <ImageGeneratorPanel 
              projectId={generatedProjectId || undefined} 
              onImageGenerated={(image) => {
                toast({ title: "Imagem gerada!", description: `URL: ${image.url}` });
              }} 
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "checkpoints"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0">
          <div className="h-[70vh]">
            <CheckpointPanel projectId={generatedProjectId || 0} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "visual"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="h-[80vh]">
            <VisualEditor 
              projectId={generatedProjectId || undefined}
              onCodeGenerate={(code) => {
                setInput(prev => prev + `\n\n\`\`\`jsx\n${code}\n\`\`\``);
                toast({ title: "Codigo gerado!" });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "mobile"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <div className="h-[80vh]">
            <MobilePreview 
              url={previewUrl || undefined}
              projectType="web"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === "replitmd"} onOpenChange={(open) => !open && setActivePanel(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0">
          <div className="h-[70vh]">
            <ReplitMdEditor projectId={generatedProjectId || undefined} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeployDialog} onOpenChange={(open) => {
        if (!open && deployStatus !== "deploying") {
          setShowDeployDialog(false);
          if (deployStatus === "success" || deployStatus === "error") {
            setDeployStatus("idle");
            setDeployProgress(0);
            setDeployStep("");
          }
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              {deployStatus === "success" ? "Publicado!" : "Publicar Projeto"}
            </DialogTitle>
            <DialogDescription>
              {deployStatus === "idle" && "Torne seu projeto acessível na internet com um clique"}
              {deployStatus === "deploying" && "Aguarde enquanto publicamos seu projeto..."}
              {deployStatus === "success" && "Seu projeto está online!"}
              {deployStatus === "error" && "Ocorreu um erro durante a publicação"}
            </DialogDescription>
          </DialogHeader>
          
          {deployStatus === "idle" && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                      <Rocket className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">Deploy Automático</h3>
                      <p className="text-sm text-muted-foreground">
                        Seu projeto será publicado em uma URL .replit.app com SSL automático
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>URL pública com HTTPS</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Sempre online 24/7</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Domínio personalizado (opcional)</span>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowDeployDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 gap-2" 
                  onClick={async () => {
                    setDeployStatus("deploying");
                    setDeployProgress(0);
                    
                    const steps = [
                      { progress: 15, step: "Preparando arquivos..." },
                      { progress: 35, step: "Compilando projeto..." },
                      { progress: 55, step: "Configurando ambiente..." },
                      { progress: 75, step: "Publicando..." },
                      { progress: 90, step: "Verificando deploy..." },
                      { progress: 100, step: "Concluído!" },
                    ];
                    
                    for (const s of steps) {
                      await new Promise(r => setTimeout(r, 800));
                      setDeployProgress(s.progress);
                      setDeployStep(s.step);
                    }
                    
                    await new Promise(r => setTimeout(r, 500));
                    setDeployUrl(`https://${project?.name?.toLowerCase().replace(/\s+/g, '-') || 'meu-app'}.replit.app`);
                    setDeployStatus("success");
                    toast({
                      title: "Deploy concluído!",
                      description: "Seu projeto está online e acessível.",
                    });
                  }}
                  data-testid="button-start-deploy"
                >
                  <Rocket className="h-4 w-4" />
                  Publicar Agora
                </Button>
              </div>
            </div>
          )}
          
          {deployStatus === "deploying" && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <p className="text-sm font-medium">{deployStep}</p>
              </div>
              <div className="space-y-2">
                <Progress value={deployProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">{deployProgress}%</p>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {deployProgress >= 15 ? <Check className="h-3 w-3 text-green-500" /> : <Circle className="h-3 w-3" />}
                  <span className={deployProgress >= 15 ? "text-foreground" : ""}>Preparando arquivos</span>
                </div>
                <div className="flex items-center gap-2">
                  {deployProgress >= 35 ? <Check className="h-3 w-3 text-green-500" /> : <Circle className="h-3 w-3" />}
                  <span className={deployProgress >= 35 ? "text-foreground" : ""}>Compilando projeto</span>
                </div>
                <div className="flex items-center gap-2">
                  {deployProgress >= 55 ? <Check className="h-3 w-3 text-green-500" /> : <Circle className="h-3 w-3" />}
                  <span className={deployProgress >= 55 ? "text-foreground" : ""}>Configurando ambiente</span>
                </div>
                <div className="flex items-center gap-2">
                  {deployProgress >= 75 ? <Check className="h-3 w-3 text-green-500" /> : <Circle className="h-3 w-3" />}
                  <span className={deployProgress >= 75 ? "text-foreground" : ""}>Publicando</span>
                </div>
                <div className="flex items-center gap-2">
                  {deployProgress >= 100 ? <Check className="h-3 w-3 text-green-500" /> : <Circle className="h-3 w-3" />}
                  <span className={deployProgress >= 100 ? "text-foreground" : ""}>Verificação final</span>
                </div>
              </div>
            </div>
          )}
          
          {deployStatus === "success" && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Publicado com sucesso!</p>
              </div>
              
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">URL do projeto:</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {deployUrl}
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => window.open(deployUrl, '_blank')}
                    data-testid="button-open-deploy-url"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir no navegador
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full gap-2"
                    onClick={() => {
                      navigator.clipboard.writeText(deployUrl);
                      toast({ title: "Link copiado!", description: "URL copiada para a área de transferência" });
                    }}
                    data-testid="button-copy-deploy-url"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar link
                  </Button>
                </CardContent>
              </Card>
              
              <Button 
                className="w-full" 
                onClick={() => {
                  setShowDeployDialog(false);
                  setDeployStatus("idle");
                  setDeployProgress(0);
                }}
              >
                Fechar
              </Button>
            </div>
          )}
          
          {deployStatus === "error" && (
            <div className="space-y-6 py-4">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <X className="h-8 w-8 text-destructive" />
                </div>
                <p className="text-sm font-medium text-destructive">Falha na publicação</p>
                <p className="text-xs text-muted-foreground mt-1">Verifique a configuração e tente novamente</p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setDeployStatus("idle");
                    setDeployProgress(0);
                  }}
                >
                  Tentar novamente
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setShowDeployDialog(false);
                    setDeployStatus("idle");
                    setDeployProgress(0);
                  }}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckpointsDialog} onOpenChange={setShowCheckpointsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Checkpoints
            </DialogTitle>
            <DialogDescription>
              Salve e restaure versoes anteriores do seu projeto
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button 
                className="flex-1 gap-2"
                onClick={() => createCheckpoint.mutate({})}
                disabled={createCheckpoint.isPending || !generatedProjectId}
              >
                {createCheckpoint.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Criar Checkpoint
              </Button>
            </div>
            
            <div className="space-y-2 max-h-80 overflow-auto">
              {checkpointsList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhum checkpoint ainda</p>
                  <p className="text-xs mt-1">Crie um checkpoint para poder restaurar depois</p>
                </div>
              ) : (
                checkpointsList.map((cp) => (
                  <Card key={cp.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{cp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(cp.createdAt).toLocaleString("pt-BR")}
                          {cp.createdBy === "auto" && (
                            <Badge variant="outline" className="ml-2 text-xs">Auto</Badge>
                          )}
                        </p>
                        {cp.description && (
                          <p className="text-xs text-muted-foreground mt-1">{cp.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => restoreCheckpoint.mutate(cp.id)}
                          disabled={restoreCheckpoint.isPending}
                          data-testid={`button-restore-${cp.id}`}
                        >
                          {restoreCheckpoint.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Restaurar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteCheckpoint.mutate(cp.id)}
                          disabled={deleteCheckpoint.isPending}
                          data-testid={`button-delete-checkpoint-${cp.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWebSearchDialog} onOpenChange={setShowWebSearchDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Busca na Web
            </DialogTitle>
            <DialogDescription>
              Busque informacoes na web para usar no seu projeto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="O que voce quer pesquisar?"
                value={webSearchQuery}
                onChange={(e) => setWebSearchQuery(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && webSearchQuery.trim()) {
                    setWebSearchLoading(true);
                    try {
                      const res = await fetch(`/api/search?q=${encodeURIComponent(webSearchQuery)}`, {
                        credentials: "include",
                      });
                      const data = await res.json();
                      setWebSearchResults(data.results || []);
                    } catch (err) {
                      toast({ title: "Erro na busca", variant: "destructive" });
                    } finally {
                      setWebSearchLoading(false);
                    }
                  }
                }}
              />
              <Button
                onClick={async () => {
                  if (!webSearchQuery.trim()) return;
                  setWebSearchLoading(true);
                  try {
                    const res = await fetch(`/api/search?q=${encodeURIComponent(webSearchQuery)}`, {
                      credentials: "include",
                    });
                    const data = await res.json();
                    setWebSearchResults(data.results || []);
                  } catch (err) {
                    toast({ title: "Erro na busca", variant: "destructive" });
                  } finally {
                    setWebSearchLoading(false);
                  }
                }}
                disabled={webSearchLoading || !webSearchQuery.trim()}
              >
                {webSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {webSearchResults.map((result: any, idx: number) => (
                  <Card key={idx} className="p-3">
                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
                      {result.title}
                    </a>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.snippet}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setInput((prev) => prev + `\n\n[Referencia: ${result.title}]\n${result.snippet}`);
                        setShowWebSearchDialog(false);
                        toast({ title: "Resultado adicionado ao chat" });
                      }}
                    >
                      Usar no Chat
                    </Button>
                  </Card>
                ))}
                {webSearchResults.length === 0 && !webSearchLoading && (
                  <div className="text-center text-muted-foreground py-8">
                    <Globe className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Pesquise algo para ver resultados</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMediaDialog} onOpenChange={setShowMediaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Gerar Midia com IA
            </DialogTitle>
            <DialogDescription>
              Gere imagens ou videos usando inteligencia artificial
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Tabs value={mediaType} onValueChange={(v) => setMediaType(v as "image" | "video")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="image">Imagem</TabsTrigger>
                <TabsTrigger value="video">Video</TabsTrigger>
              </TabsList>
            </Tabs>
            <Textarea
              placeholder={mediaType === "image" ? "Descreva a imagem que voce quer gerar..." : "Descreva o video que voce quer gerar..."}
              value={mediaPrompt}
              onChange={(e) => setMediaPrompt(e.target.value)}
              className="min-h-[100px]"
            />
            {generatedMediaUrl && (
              <div className="relative rounded-md overflow-hidden">
                {mediaType === "image" ? (
                  <img src={generatedMediaUrl} alt="Generated" className="w-full h-auto" />
                ) : (
                  <video src={generatedMediaUrl} controls className="w-full" />
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={async () => {
                  if (!mediaPrompt.trim()) return;
                  setMediaLoading(true);
                  try {
                    const res = await fetch("/api/media/generate", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ prompt: mediaPrompt, type: mediaType }),
                    });
                    const data = await res.json();
                    if (data.url) {
                      setGeneratedMediaUrl(data.url);
                      toast({ title: "Midia gerada com sucesso!" });
                    } else {
                      toast({ title: "Erro ao gerar midia", variant: "destructive" });
                    }
                  } catch (err) {
                    toast({ title: "Erro ao gerar midia", variant: "destructive" });
                  } finally {
                    setMediaLoading(false);
                  }
                }}
                disabled={mediaLoading || !mediaPrompt.trim()}
              >
                {mediaLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Gerar {mediaType === "image" ? "Imagem" : "Video"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showScreenshotDialog} onOpenChange={setShowScreenshotDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Clonar Design
            </DialogTitle>
            <DialogDescription>
              Insira uma URL para clonar o design do site
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="https://exemplo.com"
              value={screenshotUrl}
              onChange={(e) => setScreenshotUrl(e.target.value)}
            />
            {clonedDesign && (
              <Card className="p-3">
                <p className="text-sm font-medium">{clonedDesign.title || "Design Analisado"}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {clonedDesign.colors?.map((color: string, idx: number) => (
                    <div 
                      key={idx} 
                      className="w-6 h-6 rounded border" 
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                {clonedDesign.fonts && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Fontes: {clonedDesign.fonts.join(", ")}
                  </p>
                )}
              </Card>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={async () => {
                  if (!screenshotUrl.trim()) return;
                  setScreenshotLoading(true);
                  try {
                    const res = await fetch("/api/screenshot/clone", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ url: screenshotUrl }),
                    });
                    const data = await res.json();
                    setClonedDesign(data);
                    toast({ title: "Design analisado com sucesso!" });
                  } catch (err) {
                    toast({ title: "Erro ao analisar design", variant: "destructive" });
                  } finally {
                    setScreenshotLoading(false);
                  }
                }}
                disabled={screenshotLoading || !screenshotUrl.trim()}
              >
                {screenshotLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Analisar Design
                  </>
                )}
              </Button>
              {clonedDesign && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setInput((prev) => prev + `\n\nCrie um design similar a ${screenshotUrl} usando as cores: ${clonedDesign.colors?.join(", ")}`);
                    setShowScreenshotDialog(false);
                  }}
                >
                  Usar no Chat
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações do Agente
            </DialogTitle>
            <DialogDescription>
              Ajuste como o agente trabalha no seu projeto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Modo de Operação</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={mode === "plan" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setMode("plan");
                    updateAgentSettings.mutate({ operatingMode: "plan" });
                  }}
                  className="text-xs"
                >
                  Planejar
                </Button>
                <Button
                  variant={mode === "build" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setMode("build");
                    updateAgentSettings.mutate({ operatingMode: "build" });
                  }}
                  className="text-xs"
                >
                  Construir
                </Button>
                <Button
                  variant={mode === "edit" ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => {
                    setMode("edit");
                    updateAgentSettings.mutate({ operatingMode: "edit" });
                  }}
                  className="text-xs"
                >
                  Editar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {mode === "plan" && "Faz perguntas e planeja antes de construir"}
                {mode === "build" && "Constrói o projeto autonomamente"}
                {mode === "edit" && "Edita arquivos específicos do projeto"}
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Abordagem de Build</Label>
              <div className="grid grid-cols-2 gap-2">
                <Card 
                  className={`p-3 cursor-pointer ${buildApproach === "design-first" ? "border-primary bg-primary/5" : "hover-elevate"}`}
                  onClick={() => {
                    setBuildApproach("design-first");
                    updateAgentSettings.mutate({ buildApproach: "design-first" });
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Rápido</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Protótipo visual em ~3 min. Frontend com mock data.
                  </p>
                </Card>
                <Card 
                  className={`p-3 cursor-pointer ${buildApproach === "full-app" ? "border-primary bg-primary/5" : "hover-elevate"}`}
                  onClick={() => {
                    setBuildApproach("full-app");
                    updateAgentSettings.mutate({ buildApproach: "full-app" });
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Infinity className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Completo</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    App full-stack em ~10 min. Frontend + backend + DB.
                  </p>
                </Card>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Recursos Avançados</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Extended Thinking</p>
                    <p className="text-xs text-muted-foreground">Análise mais profunda para tarefas complexas</p>
                  </div>
                  <Switch 
                    checked={extendedThinking}
                    onCheckedChange={(checked) => {
                      setExtendedThinking(checked);
                      updateAgentSettings.mutate({ extendedThinking: checked });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Testes Automáticos</p>
                    <p className="text-xs text-muted-foreground">Testa o app após cada mudança</p>
                  </div>
                  <Switch 
                    checked={appTesting}
                    onCheckedChange={(checked) => {
                      updateAgentSettings.mutate({ appTesting: checked });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Busca Web</p>
                    <p className="text-xs text-muted-foreground">Pesquisa informações na internet</p>
                  </div>
                  <Switch 
                    checked={webSearch}
                    onCheckedChange={(checked) => {
                      updateAgentSettings.mutate({ webSearch: checked });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">Geração de Mídia</p>
                    <p className="text-xs text-muted-foreground">Gera imagens e ícones com IA</p>
                  </div>
                  <Switch 
                    checked={mediaGeneration}
                    onCheckedChange={(checked) => {
                      updateAgentSettings.mutate({ mediaGeneration: checked });
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t">
              <Button className="w-full" onClick={() => setShowSettingsDialog(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AdvancedToolsDrawer
        open={showAdvancedTools}
        onOpenChange={setShowAdvancedTools}
        projectId={generatedProjectId || 1}
        userId={currentConversation?.userId || "anonymous"}
        prompt={input}
      />
    </div>
  );
}
