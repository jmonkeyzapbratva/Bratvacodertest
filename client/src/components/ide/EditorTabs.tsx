import { X, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Tab {
  path: string;
  name: string;
  isDirty?: boolean;
}

interface EditorTabsProps {
  tabs: Tab[];
  activeTab: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const colorMap: Record<string, string> = {
    js: "text-yellow-500",
    jsx: "text-yellow-500",
    ts: "text-blue-500",
    tsx: "text-blue-500",
    html: "text-orange-500",
    css: "text-blue-400",
    json: "text-yellow-600",
    md: "text-gray-500",
  };
  return colorMap[ext || ""] || "text-muted-foreground";
}

export function EditorTabs({ tabs, activeTab, onSelectTab, onCloseTab }: EditorTabsProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="h-9 bg-muted/50 border-b flex items-end shrink-0">
      <ScrollArea className="w-full">
        <div className="flex">
          {tabs.map((tab) => (
            <div
              key={tab.path}
              className={cn(
                "group flex items-center gap-1.5 h-8 px-3 border-r cursor-pointer text-sm",
                activeTab === tab.path
                  ? "bg-background border-t-2 border-t-primary"
                  : "bg-muted/30 hover-elevate"
              )}
              onClick={() => onSelectTab(tab.path)}
              data-testid={`tab-${tab.name}`}
            >
              <File className={cn("h-3.5 w-3.5", getFileIcon(tab.name))} />
              <span className="truncate max-w-[120px]">{tab.name}</span>
              {tab.isDirty && <span className="h-2 w-2 rounded-full bg-primary" />}
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.path);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
