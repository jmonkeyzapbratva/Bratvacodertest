import { useState, useEffect } from "react";
import { webcontainerService } from "@/lib/webcontainerService";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  ExternalLink, 
  Smartphone, 
  Tablet, 
  Monitor,
  Loader2 
} from "lucide-react";

interface WebPreviewProps {
  className?: string;
  initialUrl?: string;
}

type DeviceType = "desktop" | "tablet" | "mobile";

const deviceSizes: Record<DeviceType, { width: string; height: string }> = {
  desktop: { width: "100%", height: "100%" },
  tablet: { width: "768px", height: "1024px" },
  mobile: { width: "375px", height: "667px" },
};

export function WebPreview({ className, initialUrl }: WebPreviewProps) {
  const [url, setUrl] = useState<string | null>(initialUrl || null);
  const [isLoading, setIsLoading] = useState(true);
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    const removeServerCallback = webcontainerService.addServerReadyCallback((port: number, serverUrl: string) => {
      setUrl(serverUrl);
      setIsLoading(false);
    });

    return () => {
      removeServerCallback();
    };
  }, []);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenExternal = () => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleDeviceChange = (newDevice: DeviceType) => {
    setDevice(newDevice);
  };

  return (
    <div className={`flex flex-col h-full bg-background ${className || ""}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted border-b">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Preview</span>
          {url && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {url}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant={device === "mobile" ? "secondary" : "ghost"}
            className="h-7 w-7"
            onClick={() => handleDeviceChange("mobile")}
            title="Mobile"
            data-testid="button-device-mobile"
          >
            <Smartphone className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant={device === "tablet" ? "secondary" : "ghost"}
            className="h-7 w-7"
            onClick={() => handleDeviceChange("tablet")}
            title="Tablet"
            data-testid="button-device-tablet"
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant={device === "desktop" ? "secondary" : "ghost"}
            className="h-7 w-7"
            onClick={() => handleDeviceChange("desktop")}
            title="Desktop"
            data-testid="button-device-desktop"
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleRefresh}
            disabled={!url}
            title="Recarregar"
            data-testid="button-preview-refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleOpenExternal}
            disabled={!url}
            title="Abrir em nova aba"
            data-testid="button-preview-external"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-[#1e1e1e] overflow-auto p-4">
        {!url ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            {isLoading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span>Aguardando servidor...</span>
                <span className="text-xs mt-1">Execute npm run dev no terminal</span>
              </>
            ) : (
              <>
                <Monitor className="w-8 h-8 mb-2 opacity-50" />
                <span>Nenhum servidor rodando</span>
                <span className="text-xs mt-1">Inicie um projeto para ver o preview</span>
              </>
            )}
          </div>
        ) : (
          <div 
            className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
            style={{
              width: deviceSizes[device].width,
              height: deviceSizes[device].height,
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          >
            <iframe
              key={iframeKey}
              src={url}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              data-testid="preview-iframe"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default WebPreview;
