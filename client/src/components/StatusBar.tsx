import { Check, Globe, CreditCard, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StatusBarProps {
  databaseConnected?: boolean;
  previewUrl?: string;
  estimatedCost?: string;
  onDeploy?: () => void;
  isDeploying?: boolean;
}

export function StatusBar({
  databaseConnected = false,
  previewUrl,
  estimatedCost,
  onDeploy,
  isDeploying,
}: StatusBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 border-t bg-muted/30 text-sm">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          {databaseConnected ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <div className="h-3.5 w-3.5 rounded-full bg-muted-foreground/30" />
          )}
          <span className="text-muted-foreground">
            Database {databaseConnected ? "conectado" : "desconectado"}
          </span>
        </div>

        {previewUrl && (
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              Preview: {previewUrl}
            </span>
          </div>
        )}

        {estimatedCost && (
          <div className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              Custo estimado: {estimatedCost}
            </span>
          </div>
        )}
      </div>

      {onDeploy && (
        <Button
          size="sm"
          onClick={onDeploy}
          disabled={isDeploying}
          className="gap-2"
          data-testid="button-deploy-status"
        >
          <Rocket className="h-3.5 w-3.5" />
          Publicar Agora
        </Button>
      )}
    </div>
  );
}
