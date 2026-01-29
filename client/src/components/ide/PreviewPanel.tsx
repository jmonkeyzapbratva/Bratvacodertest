import { Eye, RefreshCw, ExternalLink, Smartphone, Monitor, Tablet, RotateCw, Maximize2, Minimize2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface PreviewPanelProps {
  url?: string;
  html?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  isHotReloadConnected?: boolean;
  lastHotReloadUpdate?: number | null;
}

type DeviceType = "desktop" | "tablet" | "mobile" | "custom";
type Orientation = "portrait" | "landscape";

interface DevicePreset {
  name: string;
  width: number;
  height: number;
  type: DeviceType;
}

const devicePresets: DevicePreset[] = [
  { name: "Desktop", width: 1920, height: 1080, type: "desktop" },
  { name: "Laptop", width: 1366, height: 768, type: "desktop" },
  { name: "iPad Pro", width: 1024, height: 1366, type: "tablet" },
  { name: "iPad", width: 768, height: 1024, type: "tablet" },
  { name: "iPhone 14 Pro", width: 393, height: 852, type: "mobile" },
  { name: "iPhone SE", width: 375, height: 667, type: "mobile" },
  { name: "Galaxy S21", width: 360, height: 800, type: "mobile" },
  { name: "Pixel 7", width: 412, height: 915, type: "mobile" },
];

export function PreviewPanel({ url, html, isLoading, onRefresh, isHotReloadConnected, lastHotReloadUpdate }: PreviewPanelProps) {
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const [selectedPreset, setSelectedPreset] = useState<string>("Desktop");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentPreset = devicePresets.find(d => d.name === selectedPreset) || devicePresets[0];
  
  const getFrameSize = () => {
    if (deviceType === "desktop") {
      return { width: "100%", height: "100%" };
    }
    
    const preset = currentPreset;
    const width = orientation === "portrait" ? preset.width : preset.height;
    const height = orientation === "portrait" ? preset.height : preset.width;
    
    return { 
      width: `${width}px`, 
      height: `${height}px` 
    };
  };

  const frameSize = getFrameSize();

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    onRefresh?.();
  };

  const handleDeviceChange = (type: DeviceType) => {
    setDeviceType(type);
    const preset = devicePresets.find(d => d.type === type);
    if (preset) {
      setSelectedPreset(preset.name);
    }
  };

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = devicePresets.find(d => d.name === presetName);
    if (preset) {
      setDeviceType(preset.type);
    }
  };

  const toggleOrientation = () => {
    setOrientation(o => o === "portrait" ? "landscape" : "portrait");
  };

  const handleOpenExternal = () => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(f => !f);
  };

  return (
    <div className={cn(
      "flex flex-col bg-sidebar",
      isFullscreen ? "fixed inset-0 z-50" : "h-full"
    )}>
      <div className="flex items-center justify-between gap-2 p-2 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Preview</span>
          {isHotReloadConnected && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-600/50 gap-1">
              <Zap className="h-3 w-3" />
              Hot Reload
            </Badge>
          )}
          {deviceType !== "desktop" && (
            <Badge variant="outline" className="text-xs">
              {currentPreset.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant={deviceType === "desktop" ? "secondary" : "ghost"} 
            size="icon" 
            onClick={() => handleDeviceChange("desktop")}
            data-testid="preview-desktop"
            title="Desktop"
          >
            <Monitor className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant={deviceType === "tablet" ? "secondary" : "ghost"} 
            size="icon" 
            onClick={() => handleDeviceChange("tablet")}
            data-testid="preview-tablet"
            title="Tablet"
          >
            <Tablet className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant={deviceType === "mobile" ? "secondary" : "ghost"} 
            size="icon" 
            onClick={() => handleDeviceChange("mobile")}
            data-testid="preview-mobile"
            title="Mobile"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </Button>
          
          <div className="w-px h-4 bg-border mx-1" />
          
          {deviceType !== "desktop" && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleOrientation}
              data-testid="preview-rotate"
              title="Girar dispositivo"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isLoading}
            data-testid="preview-refresh"
            title="Recarregar"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleFullscreen}
            data-testid="preview-fullscreen"
            title={isFullscreen ? "Sair fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
      
      {deviceType !== "desktop" && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-sidebar-border bg-muted/30">
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="h-7 w-[160px] text-xs" data-testid="select-device-preset">
              <SelectValue placeholder="Dispositivo" />
            </SelectTrigger>
            <SelectContent>
              {devicePresets.filter(d => d.type === deviceType).map(preset => (
                <SelectItem key={preset.name} value={preset.name} className="text-xs">
                  {preset.name} ({preset.width}x{preset.height})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-xs">
            {orientation === "portrait" 
              ? `${currentPreset.width} x ${currentPreset.height}`
              : `${currentPreset.height} x ${currentPreset.width}`
            }
          </Badge>
        </div>
      )}
      
      <div className="flex-1 overflow-auto p-3 flex items-start justify-center bg-background">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground mt-20">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-xs">Carregando preview...</span>
          </div>
        ) : url ? (
          <div 
            className={cn(
              "border border-border rounded-md overflow-hidden bg-white transition-all shadow-lg",
              deviceType !== "desktop" && "flex-shrink-0"
            )}
            style={{ 
              width: frameSize.width, 
              height: frameSize.height,
              maxWidth: deviceType === "desktop" ? "100%" : undefined,
              maxHeight: deviceType === "desktop" ? "100%" : undefined
            }}
          >
            <iframe 
              key={refreshKey}
              ref={iframeRef}
              src={url} 
              className="w-full h-full"
              title="Preview"
              data-testid="preview-iframe"
            />
          </div>
        ) : html ? (
          <div 
            className={cn(
              "border border-border rounded-md overflow-hidden bg-white transition-all shadow-lg",
              deviceType !== "desktop" && "flex-shrink-0"
            )}
            style={{ 
              width: frameSize.width, 
              height: frameSize.height,
              maxWidth: deviceType === "desktop" ? "100%" : undefined,
              maxHeight: deviceType === "desktop" ? "100%" : undefined
            }}
          >
            <iframe 
              key={refreshKey}
              ref={iframeRef}
              srcDoc={html} 
              className="w-full h-full"
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
              data-testid="preview-iframe"
            />
          </div>
        ) : (
          <div className="text-center text-muted-foreground mt-20">
            <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Execute o projeto para ver o preview</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              O preview aparecera aqui automaticamente
            </p>
          </div>
        )}
      </div>
      
      {url && (
        <div className="p-2 border-t border-sidebar-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{url}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleOpenExternal}
            data-testid="open-external"
            title="Abrir em nova aba"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
