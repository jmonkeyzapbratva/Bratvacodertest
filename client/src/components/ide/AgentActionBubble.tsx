import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Loader2, 
  Check, 
  X,
  Brain,
  Code,
  FileText,
  Terminal,
  Package,
  Play,
  Search,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export type ActionType = 
  | "thinking" 
  | "generating" 
  | "writing" 
  | "installing" 
  | "running" 
  | "searching"
  | "command";

export type ActionStatus = "pending" | "running" | "completed" | "failed";

export interface AgentAction {
  id: string;
  type: ActionType;
  title: string;
  description?: string;
  status: ActionStatus;
  details?: string[];
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

interface AgentActionBubbleProps {
  action: AgentAction;
  defaultExpanded?: boolean;
}

const actionConfig: Record<ActionType, { icon: typeof Brain; color: string; bgColor: string }> = {
  thinking: {
    icon: Brain,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  },
  generating: {
    icon: Code,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
  writing: {
    icon: FileText,
    color: "text-green-500",
    bgColor: "bg-green-500/10"
  },
  installing: {
    icon: Package,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10"
  },
  running: {
    icon: Play,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10"
  },
  searching: {
    icon: Search,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10"
  },
  command: {
    icon: Terminal,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10"
  }
};

export function AgentActionBubble({ action, defaultExpanded = false }: AgentActionBubbleProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const config = actionConfig[action.type];
  const Icon = config.icon;

  const getStatusIcon = () => {
    switch (action.status) {
      case "running":
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
      case "completed":
        return <Check className="h-3.5 w-3.5 text-green-500" />;
      case "failed":
        return <X className="h-3.5 w-3.5 text-red-500" />;
      default:
        return null;
    }
  };

  const getDuration = () => {
    if (!action.startTime) return null;
    const end = action.endTime || new Date();
    const ms = end.getTime() - action.startTime.getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const hasDetails = action.details && action.details.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full" data-testid={`action-bubble-${action.id}`}>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} hover:opacity-90 transition-opacity cursor-pointer`}>
          <div className={`p-1 rounded ${config.bgColor}`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
          
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{action.title}</span>
              {action.status === "running" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 animate-pulse">
                  Em andamento
                </Badge>
              )}
            </div>
            {action.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {getDuration() && (
              <span className="text-xs text-muted-foreground">{getDuration()}</span>
            )}
            {getStatusIcon()}
            {hasDetails && (
              isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      {hasDetails && (
        <CollapsibleContent>
          <div className="ml-6 mt-1 pl-4 border-l-2 border-muted space-y-1">
            {action.details?.map((detail, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
                <Check className="h-3 w-3 text-green-500" />
                <span>{detail}</span>
              </div>
            ))}
            {action.error && (
              <div className="flex items-start gap-2 text-xs text-red-500 py-0.5">
                <AlertCircle className="h-3 w-3 mt-0.5" />
                <span>{action.error}</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

interface AgentActionsListProps {
  actions: AgentAction[];
}

export function AgentActionsList({ actions }: AgentActionsListProps) {
  if (actions.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="actions-list">
      {actions.map((action) => (
        <AgentActionBubble 
          key={action.id} 
          action={action} 
          defaultExpanded={action.status === "running"}
        />
      ))}
    </div>
  );
}
