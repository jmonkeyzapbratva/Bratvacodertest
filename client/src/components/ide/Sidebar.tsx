import { 
  Files, 
  Search, 
  GitBranch, 
  Settings,
  Package,
  Bot,
  MessageSquare,
  Upload,
  HardDrive,
  Users,
  Lock,
  Terminal,
  Database,
  Wrench,
  Plug,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  activePanel: string;
  onPanelChange: (panel: string) => void;
}

const topItems = [
  { id: "agent", icon: Bot, label: "Bratvacoder" },
  { id: "assistant", icon: MessageSquare, label: "Assistente" },
];

const mainItems = [
  { id: "files", icon: Files, label: "Files" },
  { id: "search", icon: Search, label: "Search" },
  { id: "packages", icon: Package, label: "Packages" },
  { id: "git", icon: GitBranch, label: "Git" },
];

const toolItems = [
  { id: "publishing", icon: Upload, label: "Publishing" },
  { id: "storage", icon: HardDrive, label: "App Storage" },
  { id: "auth", icon: Lock, label: "Auth" },
  { id: "console", icon: Terminal, label: "Console" },
  { id: "database", icon: Database, label: "Database" },
  { id: "developer", icon: Wrench, label: "Developer" },
  { id: "integrations", icon: Plug, label: "Integrations" },
  { id: "multiplayer", icon: Users, label: "Multiplayer" },
  { id: "preview", icon: Eye, label: "Preview" },
];

const bottomItems = [
  { id: "settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ activePanel, onPanelChange }: SidebarProps) {
  const renderItem = (item: { id: string; icon: React.ElementType; label: string }) => (
    <Tooltip key={item.id} delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 ${activePanel === item.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"}`}
          onClick={() => onPanelChange(item.id)}
          data-testid={`sidebar-${item.id}`}
        >
          <item.icon className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div className="w-12 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      <div className="flex flex-col gap-1 p-1.5 pt-3">
        {topItems.map(renderItem)}
      </div>
      
      <Separator className="mx-1.5 my-1 w-auto" />
      
      <div className="flex-1 flex flex-col gap-1 p-1.5 overflow-y-auto">
        {mainItems.map(renderItem)}
        
        <Separator className="my-1" />
        
        {toolItems.map(renderItem)}
      </div>
      
      <Separator className="mx-1.5 my-1 w-auto" />
      
      <div className="flex flex-col gap-1 p-1.5 pb-3">
        {bottomItems.map(renderItem)}
      </div>
    </div>
  );
}
