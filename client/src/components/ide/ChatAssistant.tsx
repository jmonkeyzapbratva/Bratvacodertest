import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
}

interface ChatAssistantProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string, forceCode?: boolean) => void;
}

export function ChatAssistant({ messages, isLoading, onSendMessage }: ChatAssistantProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const hasConversation = messages.filter(m => m.role === "user").length >= 1;
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    onSendMessage(input.trim(), false);
    setInput("");
    
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };
  
  const handleGenerateCode = () => {
    if (isLoading) return;
    onSendMessage("Pode gerar o código agora!", true);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex items-center gap-2 p-3 border-b">
        <Bot className="h-5 w-5 text-primary" />
        <span className="font-medium text-sm">Assistente IA</span>
        <Sparkles className="h-3 w-3 text-yellow-500 ml-auto" />
      </div>
      
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                E aí! Me conta o que você quer criar. Vou te ajudar a desenvolver seu projeto!
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="shrink-0 mt-1">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  </div>
                )}
                
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm max-w-[85%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Pensando...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>
                
                {message.role === "user" && (
                  <div className="shrink-0 mt-1">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      {hasConversation && (
        <div className="px-3 pb-2">
          <Button
            onClick={handleGenerateCode}
            disabled={isLoading}
            className="w-full"
            variant="secondary"
            data-testid="button-generate-code"
          >
            <Code2 className="h-4 w-4 mr-2" />
            Gerar Código Agora
          </Button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descreva seu projeto..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            disabled={isLoading}
            data-testid="input-chat-assistant"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            data-testid="button-send-assistant"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
