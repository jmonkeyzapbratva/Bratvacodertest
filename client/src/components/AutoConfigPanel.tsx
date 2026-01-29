import { Database, Lock, CreditCard, Upload, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ConfigStep {
  id: string;
  icon: typeof Database;
  title: string;
  description: string;
  detail?: string;
  status: "pending" | "active" | "completed";
}

interface AutoConfigPanelProps {
  projectName?: string;
  previewUrl?: string;
  steps?: ConfigStep[];
}

const defaultSteps: ConfigStep[] = [
  {
    id: "database",
    icon: Database,
    title: "Database",
    description: "PostgreSQL configurado",
    detail: "Tabelas criadas automaticamente",
    status: "pending",
  },
  {
    id: "auth",
    icon: Lock,
    title: "Autenticacao",
    description: "Login com email/Google",
    detail: "Sistema seguro pronto",
    status: "pending",
  },
  {
    id: "payments",
    icon: CreditCard,
    title: "Pagamentos",
    description: "PIX + Cartao configurados",
    detail: "Integrado com Stripe",
    status: "pending",
  },
  {
    id: "storage",
    icon: Upload,
    title: "Armazenamento",
    description: "Upload de imagens ativado",
    detail: "Ate 10GB disponivel",
    status: "pending",
  },
];

export function AutoConfigPanel({
  projectName = "Seu Projeto",
  previewUrl,
  steps = defaultSteps,
}: AutoConfigPanelProps) {
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h3 className="font-semibold truncate">{projectName}</h3>
          <Badge variant={progress === 100 ? "default" : "secondary"}>
            {progress}%
          </Badge>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        <p className="text-sm text-muted-foreground mb-4">
          Configurando tudo automaticamente...
        </p>

        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                step.status === "active" && "border-primary bg-primary/5",
                step.status === "completed" && "bg-muted/50"
              )}
              data-testid={`config-step-${step.id}`}
            >
              <div
                className={cn(
                  "rounded-lg p-2",
                  step.status === "completed"
                    ? "bg-green-500/10 text-green-600"
                    : step.status === "active"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{step.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">{step.description}</p>
                {step.detail && step.status === "completed" && (
                  <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                )}
              </div>

              <div className="shrink-0">
                {step.status === "completed" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : step.status === "active" ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <div className="h-4 w-4" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {previewUrl && (
        <div className="p-4 border-t space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Preview ao Vivo</span>
            <Badge variant="outline" className="text-xs">
              Atualiza automatico
            </Badge>
          </div>
          <div className="aspect-video rounded-lg border bg-muted overflow-hidden">
            <iframe
              src={previewUrl}
              className="w-full h-full"
              title="Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
