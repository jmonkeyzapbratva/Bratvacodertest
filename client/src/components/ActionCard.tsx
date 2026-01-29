import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  FileEdit, 
  Play, 
  RefreshCw, 
  Terminal as TerminalIcon,
  Check,
  AlertCircle,
  Loader2,
  FolderPlus,
  Download,
  Upload
} from "lucide-react";

export type ActionType = 
  | "file_edit" 
  | "file_create" 
  | "command_run" 
  | "install" 
  | "restart" 
  | "build"
  | "deploy";

export interface ActionItem {
  id: string;
  type: ActionType;
  title: string;
  description?: string;
  status: "pending" | "running" | "success" | "error";
  timestamp: Date;
  details?: string;
  filePath?: string;
}

interface ActionCardProps {
  action: ActionItem;
  onExpand?: () => void;
}

const actionIcons: Record<ActionType, typeof FileEdit> = {
  file_edit: FileEdit,
  file_create: FolderPlus,
  command_run: TerminalIcon,
  install: Download,
  restart: RefreshCw,
  build: Play,
  deploy: Upload,
};

const actionLabels: Record<ActionType, string> = {
  file_edit: "Editou arquivo",
  file_create: "Criou arquivo",
  command_run: "Executou comando",
  install: "Instalou dependencias",
  restart: "Reiniciou aplicacao",
  build: "Build do projeto",
  deploy: "Deploy realizado",
};

const statusColors = {
  pending: "text-muted-foreground",
  running: "text-blue-500",
  success: "text-green-500",
  error: "text-red-500",
};

export function ActionCard({ action, onExpand }: ActionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = actionIcons[action.type];
  
  const handleToggle = () => {
    setExpanded(!expanded);
    if (!expanded) onExpand?.();
  };

  return (
    <div 
      className="border rounded-md bg-card overflow-hidden"
      data-testid={`action-card-${action.id}`}
    >
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 p-3 hover-elevate active-elevate-2 text-left"
        data-testid={`action-toggle-${action.id}`}
      >
        <div className={`shrink-0 ${statusColors[action.status]}`}>
          {action.status === "running" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : action.status === "success" ? (
            <Check className="h-4 w-4" />
          ) : action.status === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {action.title}
            </span>
          </div>
          {action.filePath && (
            <span className="text-xs text-muted-foreground font-mono truncate block">
              {action.filePath}
            </span>
          )}
        </div>
        
        <div className="shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      {expanded && action.details && (
        <div className="px-3 pb-3 border-t">
          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto max-h-48 font-mono">
            {action.details}
          </pre>
        </div>
      )}
    </div>
  );
}

interface ActionsFeedProps {
  actions: ActionItem[];
  title?: string;
  collapsible?: boolean;
}

export function ActionsFeed({ actions, title = "Acoes do agente", collapsible = true }: ActionsFeedProps) {
  const [collapsed, setCollapsed] = useState(false);
  const completedCount = actions.filter(a => a.status === "success").length;
  
  if (actions.length === 0) return null;

  return (
    <div 
      className="border rounded-lg bg-card overflow-hidden mb-4"
      data-testid="actions-feed"
    >
      {collapsible && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-between p-3 hover-elevate"
          data-testid="actions-feed-toggle"
        >
          <div className="flex items-center gap-2">
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">{title}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {completedCount} / {actions.length}
          </span>
        </button>
      )}
      
      {!collapsed && (
        <div className="px-3 pb-3 space-y-2">
          {actions.map(action => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}
