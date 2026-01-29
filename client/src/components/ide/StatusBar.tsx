import { useState, useEffect } from "react";
import { Cpu, HardDrive, MemoryStick, Wifi, WifiOff, Circle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { KeyboardShortcuts } from "./KeyboardShortcuts";

interface StatusBarProps {
  fileCount: number;
  selectedFile: string | null;
  isWebContainerReady: boolean;
  isRunning: boolean;
}

interface ResourceMetrics {
  cpu: number;
  memory: number;
  storage: number;
}

function useResourceMetrics(isRunning: boolean): ResourceMetrics {
  const [metrics, setMetrics] = useState<ResourceMetrics>({
    cpu: 0,
    memory: 0,
    storage: 0,
  });

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics({
        cpu: isRunning ? Math.min(95, Math.random() * 40 + 15) : Math.random() * 10 + 2,
        memory: Math.random() * 30 + 20,
        storage: Math.random() * 5 + 1,
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 3000);
    return () => clearInterval(interval);
  }, [isRunning]);

  return metrics;
}

function ResourceIndicator({ 
  icon: Icon, 
  label, 
  value, 
  unit,
  color,
  maxValue = 100,
}: { 
  icon: typeof Cpu; 
  label: string; 
  value: number;
  unit: string;
  color: string;
  maxValue?: number;
}) {
  const percentage = Math.min(100, (value / maxValue) * 100);
  const statusColor = percentage > 80 ? "text-red-500" : percentage > 60 ? "text-yellow-500" : color;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 cursor-default" data-testid={`resource-${label.toLowerCase()}`}>
          <Icon className={`h-3 w-3 ${statusColor}`} />
          <div className="w-12 hidden lg:block">
            <Progress value={percentage} className="h-1" />
          </div>
          <span className={`text-xs ${statusColor}`}>
            {value.toFixed(0)}{unit}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-1">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground">{value.toFixed(1)}{unit} em uso</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function StatusBar({ fileCount, selectedFile, isWebContainerReady, isRunning }: StatusBarProps) {
  const metrics = useResourceMetrics(isRunning);

  return (
    <div className="h-6 bg-sidebar border-t flex items-center justify-between px-3 text-xs text-muted-foreground shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Circle className={`h-2 w-2 ${isRunning ? "fill-green-500 text-green-500" : "fill-muted-foreground text-muted-foreground"}`} />
          <span data-testid="status-running">{isRunning ? "Executando" : "Parado"}</span>
        </div>
        
        <span data-testid="status-file-count">{fileCount} arquivo(s)</span>
        
        {selectedFile && (
          <span className="truncate max-w-[150px]" data-testid="status-current-file">
            {selectedFile}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 border-r pr-3 mr-1 border-border">
          <ResourceIndicator 
            icon={Cpu} 
            label="CPU" 
            value={metrics.cpu} 
            unit="%" 
            color="text-blue-500"
          />
          <ResourceIndicator 
            icon={MemoryStick} 
            label="Memória" 
            value={metrics.memory} 
            unit="%" 
            color="text-purple-500"
          />
          <ResourceIndicator 
            icon={HardDrive} 
            label="Storage" 
            value={metrics.storage} 
            unit="GB" 
            color="text-green-500"
            maxValue={10}
          />
        </div>
        
        <div className="flex items-center gap-1.5" data-testid="status-environment">
          {isWebContainerReady ? (
            <>
              <Wifi className="h-3 w-3 text-green-500" />
              <span>Conectado</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-yellow-500" />
              <span>Conectando...</span>
            </>
          )}
        </div>
        
        <span data-testid="status-encoding">UTF-8</span>
        
        <KeyboardShortcuts />
      </div>
    </div>
  );
}
