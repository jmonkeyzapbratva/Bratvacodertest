import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CollapsiblePanelHeaderProps {
  title: string;
  icon?: React.ReactNode;
  isCollapsed?: boolean;
  isMaximized?: boolean;
  onToggleCollapse?: () => void;
  onToggleMaximize?: () => void;
  showMaximize?: boolean;
  collapseDirection?: "left" | "right";
  children?: React.ReactNode;
  className?: string;
}

export function CollapsiblePanelHeader({
  title,
  icon,
  isCollapsed = false,
  isMaximized = false,
  onToggleCollapse,
  onToggleMaximize,
  showMaximize = false,
  collapseDirection = "left",
  children,
  className,
}: CollapsiblePanelHeaderProps) {
  const CollapseIcon = collapseDirection === "left" 
    ? (isCollapsed ? ChevronRight : ChevronLeft)
    : (isCollapsed ? ChevronLeft : ChevronRight);

  return (
    <div className={cn(
      "h-9 bg-muted/30 border-b flex items-center justify-between gap-2 px-2 shrink-0",
      className
    )}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <span className="text-xs font-medium truncate">{title}</span>
      </div>
      
      <div className="flex items-center gap-1 shrink-0">
        {children}
        
        {showMaximize && onToggleMaximize && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggleMaximize}
            data-testid={`button-maximize-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {isMaximized ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
        
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggleCollapse}
            data-testid={`button-collapse-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <CollapseIcon className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
