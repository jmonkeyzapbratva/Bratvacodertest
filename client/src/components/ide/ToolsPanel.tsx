import { useState } from "react";
import { Eye, Terminal as TerminalIcon, SquareTerminal, Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ToolsPanelProps {
  previewContent: React.ReactNode;
  consoleContent: React.ReactNode;
  shellContent: React.ReactNode;
  isPreviewLoading?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ToolsPanel({ 
  previewContent, 
  consoleContent, 
  shellContent, 
  isPreviewLoading,
  isCollapsed = false,
  onToggleCollapse
}: ToolsPanelProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  if (isCollapsed) {
    return (
      <div className="h-full bg-muted/20 flex flex-col items-center pt-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onToggleCollapse}
          data-testid="button-expand-tools-panel"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", isMaximized && "fixed inset-0 z-50")}>
      <Tabs defaultValue="webview" className="flex flex-col h-full">
        <div className="h-9 bg-muted/30 border-b flex items-center justify-between gap-2 px-2 shrink-0">
          <TabsList className="h-7 p-0.5 bg-transparent">
            <TabsTrigger 
              value="webview" 
              className="gap-1.5 text-xs px-2.5 py-1 data-[state=active]:bg-background"
              data-testid="tools-tab-webview"
            >
              <Eye className="h-3.5 w-3.5" />
              Webview
            </TabsTrigger>
            <TabsTrigger 
              value="console" 
              className="gap-1.5 text-xs px-2.5 py-1 data-[state=active]:bg-background"
              data-testid="tools-tab-console"
            >
              <TerminalIcon className="h-3.5 w-3.5" />
              Console
            </TabsTrigger>
            <TabsTrigger 
              value="shell" 
              className="gap-1.5 text-xs px-2.5 py-1 data-[state=active]:bg-background"
              data-testid="tools-tab-shell"
            >
              <SquareTerminal className="h-3.5 w-3.5" />
              Shell
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMaximized(!isMaximized)}
              data-testid="button-maximize-tools"
            >
              {isMaximized ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onToggleCollapse}
                data-testid="button-collapse-tools-panel"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="webview" className="flex-1 m-0 overflow-hidden">
          <div className="h-full relative">
            {isPreviewLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando preview...</span>
                </div>
              </div>
            )}
            {previewContent}
          </div>
        </TabsContent>
        
        <TabsContent value="console" className="flex-1 m-0 overflow-hidden">
          {consoleContent}
        </TabsContent>
        
        <TabsContent value="shell" className="flex-1 m-0 overflow-hidden">
          {shellContent}
        </TabsContent>
      </Tabs>
    </div>
  );
}
