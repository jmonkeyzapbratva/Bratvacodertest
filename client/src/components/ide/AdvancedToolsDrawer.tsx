import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Rocket, Bot, Brain, TestTube2, Zap } from "lucide-react";
import { BuildModeSelector } from "./BuildModeSelector";
import { AutonomyControls } from "./AutonomyControls";
import { ThinkingVisualizer } from "./ThinkingVisualizer";
import { PlaywrightTestPanel } from "./PlaywrightTestPanel";
import { AgentMarketplace } from "./AgentMarketplace";

interface AdvancedToolsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  userId: string;
  prompt: string;
}

export function AdvancedToolsDrawer({ 
  open, 
  onOpenChange, 
  projectId, 
  userId, 
  prompt 
}: AdvancedToolsDrawerProps) {
  const [activeTab, setActiveTab] = useState("build");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Ferramentas Avançadas
          </DialogTitle>
          <DialogDescription>
            Recursos do Agent 3: modos de build, autonomia estendida, pensamento profundo e mais
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="build" className="text-xs gap-1" data-testid="tab-build-modes">
              <Rocket className="w-3 h-3" />
              <span className="hidden sm:inline">Build</span>
            </TabsTrigger>
            <TabsTrigger value="autonomy" className="text-xs gap-1" data-testid="tab-autonomy">
              <Bot className="w-3 h-3" />
              <span className="hidden sm:inline">Autonomia</span>
            </TabsTrigger>
            <TabsTrigger value="thinking" className="text-xs gap-1" data-testid="tab-thinking">
              <Brain className="w-3 h-3" />
              <span className="hidden sm:inline">Pensamento</span>
            </TabsTrigger>
            <TabsTrigger value="tests" className="text-xs gap-1" data-testid="tab-playwright">
              <TestTube2 className="w-3 h-3" />
              <span className="hidden sm:inline">Testes</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs gap-1" data-testid="tab-agents">
              <Zap className="w-3 h-3" />
              <span className="hidden sm:inline">Agentes</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="build" className="mt-0">
              <BuildModeSelector 
                projectId={projectId} 
                prompt={prompt}
                onBuildStart={(session) => console.log("Build started:", session)}
              />
            </TabsContent>

            <TabsContent value="autonomy" className="mt-0">
              <AutonomyControls 
                projectId={projectId} 
                userId={userId} 
              />
            </TabsContent>

            <TabsContent value="thinking" className="mt-0">
              <ThinkingVisualizer 
                projectId={projectId} 
                prompt={prompt}
              />
            </TabsContent>

            <TabsContent value="tests" className="mt-0">
              <PlaywrightTestPanel 
                projectId={projectId} 
                appDescription={prompt}
                baseUrl="http://localhost:5000"
              />
            </TabsContent>

            <TabsContent value="agents" className="mt-0">
              <AgentMarketplace projectId={projectId} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
