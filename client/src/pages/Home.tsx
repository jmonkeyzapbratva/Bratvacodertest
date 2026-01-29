import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, Loader2, Plus, Sparkles, Bot, User, MessageSquare, Code, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CodePreview } from "@/components/CodePreview";
import { CommandResult } from "@/components/CommandResult";
import { ToolSidebar } from "@/components/ToolSidebar";
import { BuildWizard } from "@/components/BuildWizard";
import { AutoConfigPanel } from "@/components/AutoConfigPanel";
import { StatusBar } from "@/components/StatusBar";
import { Database, Lock, CreditCard, Upload } from "lucide-react";
import type { Message, Conversation } from "@shared/schema";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  messageType?: string;
  content: string;
  codeGenerated?: string | null;
  commandResult?: any;
  createdAt?: string;
}

interface ConversationWithMessages {
  conversation: Conversation;
  messages: Message[];
}

interface ConfigStep {
  id: string;
  icon: any;
  title: string;
  description: string;
  detail?: string;
  status: "pending" | "active" | "completed";
}

export default function Home() {
  const [input, setInput] = useState("");
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeTool, setActiveTool] = useState("build");
  const [activeTab, setActiveTab] = useState("chat");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [configSteps, setConfigSteps] = useState<ConfigStep[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const { data: messages, refetch: refetchMessages } = useQuery<Message[]>({
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
        messageType: m.messageType || "text",
        content: m.content,
        codeGenerated: m.codeGenerated,
        commandResult: m.metadata ? (typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata) : undefined,
        createdAt: m.createdAt?.toString(),
      })));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, isTyping]);

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
        messageType: m.messageType || "text",
        content: m.content,
        codeGenerated: m.codeGenerated,
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

  const sendCommand = useMutation({
    mutationFn: async (commandInput: string) => {
      const response = await apiRequest("POST", "/api/command", {
        input: commandInput,
        conversationId: currentConversation?.id,
      });
      return response.json();
    },
    onMutate: async (commandInput) => {
      const tempUserMessage: ChatMessage = {
        id: Date.now(),
        role: "user",
        messageType: "command",
        content: commandInput,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, tempUserMessage]);
      setInput("");
      setIsTyping(true);
      
      // Start config animation
      setConfigSteps([
        { id: "database", icon: Database, title: "Database", description: "Configurando PostgreSQL...", status: "active" },
        { id: "auth", icon: Lock, title: "Autenticacao", description: "Aguardando...", status: "pending" },
        { id: "payments", icon: CreditCard, title: "Pagamentos", description: "Aguardando...", status: "pending" },
        { id: "storage", icon: Upload, title: "Armazenamento", description: "Aguardando...", status: "pending" },
      ]);
    },
    onSuccess: (data: any) => {
      setIsTyping(false);
      setIsBuilding(false);
      
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        messageType: "command-result",
        content: data.message,
        commandResult: data,
        createdAt: new Date().toISOString(),
      };
      
      setLocalMessages(prev => [...prev, assistantMessage]);
      
      if (data.previewUrl) {
        setPreviewUrl(data.previewUrl);
        setActiveTab("preview");
      }
      
      if (data.projectName) {
        setProjectName(data.projectName);
      }
      
      // Update config steps to completed
      if (data.command === "build" || data.success) {
        setConfigSteps([
          { id: "database", icon: Database, title: "Database", description: "PostgreSQL configurado", detail: "Tabelas criadas", status: "completed" },
          { id: "auth", icon: Lock, title: "Autenticacao", description: "Login ativado", detail: "Email + Google", status: "completed" },
          { id: "payments", icon: CreditCard, title: "Pagamentos", description: "PIX + Cartao", detail: "Stripe integrado", status: "completed" },
          { id: "storage", icon: Upload, title: "Armazenamento", description: "Upload ativado", detail: "Ate 10GB", status: "completed" },
        ]);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
    onError: (error: Error) => {
      setIsTyping(false);
      setIsBuilding(false);
      toast({
        title: "Erro ao processar",
        description: error.message,
        variant: "destructive",
      });
      setLocalMessages(prev => prev.slice(0, -1));
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        message,
        conversationId: currentConversation?.id,
      });
      return response.json();
    },
    onMutate: async (message) => {
      const tempUserMessage: ChatMessage = {
        id: Date.now(),
        role: "user",
        messageType: "text",
        content: message,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, tempUserMessage]);
      setInput("");
      setIsTyping(true);
    },
    onSuccess: (data: any) => {
      setIsTyping(false);
      
      const assistantMessage: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        messageType: data.messageType || "text",
        content: data.message,
        codeGenerated: data.code,
        createdAt: new Date().toISOString(),
      };
      
      setLocalMessages(prev => [...prev, assistantMessage]);
      
      if (currentConversation?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/messages", currentConversation.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      if (data.isCodeReady) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      }
    },
    onError: (error: Error) => {
      setIsTyping(false);
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
      setLocalMessages(prev => prev.slice(0, -1));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sendMessage.isPending || sendCommand.isPending) return;
    
    if (!currentConversation) {
      await createConversation.mutateAsync();
    }
    
    if (input.trim().startsWith("/")) {
      sendCommand.mutate(input.trim());
    } else {
      sendMessage.mutate(input.trim());
    }
  };

  const handleNewConversation = () => {
    setCurrentConversation(null);
    setLocalMessages([]);
    setPreviewUrl(null);
    setProjectName("");
    createConversation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleStartBuild = async (projectType: string, description: string) => {
    setIsBuilding(true);
    
    if (!currentConversation) {
      await createConversation.mutateAsync();
    }
    
    const command = `/build ${projectType}: ${description}`;
    setActiveTool("build");
    setActiveTab("chat");
    sendCommand.mutate(command);
  };

  const handleDeploy = () => {
    toast({
      title: "Publicando projeto",
      description: "Em breve seu projeto estara no ar!",
    });
  };

  const formatMessageContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (/^\d+\./.test(line.trim())) {
        return <p key={i} className="pl-4 py-0.5">{line}</p>;
      }
      return <p key={i} className="py-0.5">{line}</p>;
    });
  };

  const renderToolContent = () => {
    switch (activeTool) {
      case "build":
        return (
          <BuildWizard 
            onStartBuild={handleStartBuild} 
            isBuilding={isBuilding}
          />
        );
      case "design":
        return (
          <div className="p-4 text-center text-muted-foreground">
            <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Analise e otimize o design do seu projeto</p>
          </div>
        );
      case "debug":
        return (
          <div className="p-4 text-center text-muted-foreground">
            <Code className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Encontre e corrija erros no codigo</p>
          </div>
        );
      default:
        return (
          <div className="p-4 text-center text-muted-foreground">
            <p>Selecione uma ferramenta</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tool Icons */}
        <div className="w-14 border-r bg-muted/30 shrink-0">
          <ToolSidebar activeTool={activeTool} onToolChange={setActiveTool} />
        </div>

        {/* Tool Panel */}
        <div className="w-72 border-r overflow-auto shrink-0">
          <div className="sticky top-0 bg-background border-b px-4 py-3">
            <h2 className="font-semibold capitalize">{activeTool}</h2>
          </div>
          {renderToolContent()}
        </div>

        {/* Main Content - Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b px-4 shrink-0">
              <TabsList className="h-12">
                <TabsTrigger value="chat" className="gap-2" data-testid="tab-chat">
                  <MessageSquare className="h-4 w-4" />
                  Chat IA
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-2" data-testid="tab-code">
                  <Code className="h-4 w-4" />
                  Codigo
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2" data-testid="tab-preview">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">
              <ScrollArea className="flex-1 px-4 py-6">
                <div className="mx-auto max-w-3xl space-y-6">
                  {localMessages.length === 0 && !createConversation.isPending && (
                    <div className="space-y-6 py-8 text-center">
                      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mx-auto">
                        <Sparkles className="h-8 w-8 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <h1 className="text-2xl font-bold" data-testid="text-welcome">
                          BratvaCoder
                        </h1>
                        <p className="text-muted-foreground max-w-md mx-auto">
                          Use o painel ao lado para criar seu projeto ou converse comigo!
                        </p>
                      </div>
                      
                      <Button 
                        onClick={() => createConversation.mutate()}
                        disabled={createConversation.isPending}
                        data-testid="button-start-chat"
                      >
                        {createConversation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Plus className="h-4 w-4 mr-2" />
                        )}
                        Iniciar Conversa
                      </Button>
                    </div>
                  )}

                  {createConversation.isPending && localMessages.length === 0 && (
                    <div className="flex justify-center py-8">
                      <div className="flex items-center gap-3 rounded-2xl bg-muted px-6 py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-muted-foreground">Iniciando conversa...</span>
                      </div>
                    </div>
                  )}

                  {localMessages.map((message, index) => (
                    <div
                      key={message.id || index}
                      className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                      data-testid={`message-${message.role}-${index}`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}>
                          {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={`flex-1 ${message.role === "user" ? "text-right" : ""}`}>
                        <div
                          className={`inline-block max-w-full text-left ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5"
                              : "bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5"
                          }`}
                        >
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">
                            {formatMessageContent(message.content)}
                          </div>
                        </div>
                        
                        {message.commandResult && (
                          <div className="text-left mt-3">
                            <CommandResult 
                              result={message.commandResult}
                              onViewCode={() => setActiveTab("code")}
                              onTestSite={() => setActiveTab("preview")}
                              onPublish={() => {
                                toast({
                                  title: "Publicando projeto",
                                  description: "Em breve seu projeto estara no ar!",
                                });
                              }}
                              onCustomize={() => {}}
                            />
                          </div>
                        )}
                        
                        {message.codeGenerated && !message.commandResult && (
                          <div className="text-left mt-3">
                            <CodePreview 
                              code={message.codeGenerated} 
                              language="javascript"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex gap-4">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-secondary">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t bg-background p-4 shrink-0">
                <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
                  <div className="flex gap-2">
                    {currentConversation && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleNewConversation}
                        disabled={sendMessage.isPending || sendCommand.isPending || createConversation.isPending}
                        title="Nova conversa"
                        data-testid="button-new-chat"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="relative flex-1">
                      <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={currentConversation 
                          ? "Descreva o que voce precisa..." 
                          : "Clique em 'Iniciar Conversa' para comecar"}
                        className="min-h-[48px] max-h-[120px] resize-none pr-12 text-base"
                        disabled={sendMessage.isPending || sendCommand.isPending || !currentConversation}
                        data-testid="input-chat"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        disabled={!input.trim() || sendMessage.isPending || sendCommand.isPending || !currentConversation}
                        data-testid="button-send"
                      >
                        {sendMessage.isPending || sendCommand.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="code" className="flex-1 m-0 overflow-auto p-4">
              {localMessages.some(m => m.codeGenerated) ? (
                <div className="space-y-4">
                  {localMessages
                    .filter(m => m.codeGenerated)
                    .map((m, i) => (
                      <CodePreview key={i} code={m.codeGenerated!} language="javascript" />
                    ))
                  }
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Code className="h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhum codigo gerado ainda</p>
                  <p className="text-sm">Use o Build para criar seu projeto</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="flex-1 m-0 p-4">
              {previewUrl ? (
                <div className="h-full rounded-lg border bg-background overflow-hidden">
                  <iframe
                    src={previewUrl}
                    className="w-full h-full"
                    title="Preview do projeto"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Eye className="h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhum preview disponivel</p>
                  <p className="text-sm">Crie um projeto para ver o preview</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar - Auto Config */}
        <div className="w-72 border-l overflow-auto shrink-0">
          <AutoConfigPanel
            projectName={projectName || "Seu Projeto"}
            previewUrl={previewUrl || undefined}
            steps={configSteps.length > 0 ? configSteps : undefined}
          />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        databaseConnected={true}
        previewUrl={previewUrl ? "localhost:5000" : undefined}
        estimatedCost="R$ 0,00/mes"
        onDeploy={handleDeploy}
      />
    </div>
  );
}
