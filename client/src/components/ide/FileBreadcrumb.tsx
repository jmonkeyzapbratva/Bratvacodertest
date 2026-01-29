import { ChevronRight, Folder, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileBreadcrumbProps {
  path: string | null;
  projectName: string;
  onNavigate?: (path: string) => void;
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
    py: "text-green-500",
  };
  return colorMap[ext || ""] || "text-muted-foreground";
}

export function FileBreadcrumb({ path, projectName, onNavigate }: FileBreadcrumbProps) {
  if (!path) {
    return (
      <div className="h-7 px-3 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 border-b" data-testid="breadcrumb-empty">
        <Folder className="h-3.5 w-3.5" />
        <span>{projectName || "Projeto"}</span>
      </div>
    );
  }

  const segments = path.split("/");
  const filename = segments.pop() || "";
  const folders = segments;

  return (
    <div className="h-7 px-3 flex items-center gap-1 text-xs bg-muted/30 border-b overflow-x-auto" data-testid="breadcrumb-path">
      <button
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        onClick={() => onNavigate?.("")}
        data-testid="breadcrumb-root"
      >
        <Folder className="h-3.5 w-3.5" />
        <span>{projectName || "Projeto"}</span>
      </button>

      {folders.map((folder, index) => {
        const folderPath = folders.slice(0, index + 1).join("/");
        return (
          <div key={folderPath} className="flex items-center shrink-0">
            <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
            <button
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onNavigate?.(folderPath)}
              data-testid={`breadcrumb-folder-${folder}`}
            >
              <Folder className="h-3.5 w-3.5" />
              <span>{folder}</span>
            </button>
          </div>
        );
      })}

      <div className="flex items-center shrink-0">
        <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
        <span className={cn("flex items-center gap-1", getFileIcon(filename))} data-testid="breadcrumb-file">
          <File className="h-3.5 w-3.5" />
          <span className="text-foreground">{filename}</span>
        </span>
      </div>
    </div>
  );
}
