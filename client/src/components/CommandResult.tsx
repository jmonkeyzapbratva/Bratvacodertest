import { CheckCircle, AlertTriangle, Info, XCircle, Loader2, Database, Lock, CreditCard, Cloud, Zap, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface CommandStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "error";
  detail?: string;
}

interface StackItem {
  tech: string;
  reason: string;
  icon?: string;
}

interface FeatureConfig {
  name: string;
  type: "database" | "auth" | "payments" | "storage" | "api";
  provider: string;
  status: "configured" | "pending" | "manual";
  details?: string;
}

interface ProjectConfig {
  id?: number;
  name: string;
  type: string;
  stack: StackItem[];
  features: FeatureConfig[];
  estimatedCost: string;
}

interface AnalysisItem {
  type: "error" | "warning" | "info" | "success";
  title: string;
  description: string;
  fix?: string;
  line?: number;
}

interface AnalysisResult {
  type: "design" | "debug" | "memory";
  score?: number;
  items: AnalysisItem[];
  recommendations: string[];
}

interface CommandResultData {
  type: "build" | "design" | "debug" | "memory" | "deploy" | "chat";
  message: string;
  steps?: CommandStep[];
  project?: ProjectConfig;
  analysis?: AnalysisResult;
  isComplete: boolean;
  previewUrl?: string;
}

interface CommandResultProps {
  result: CommandResultData;
  onViewCode?: () => void;
  onTestSite?: () => void;
  onPublish?: () => void;
  onCustomize?: () => void;
}

const featureIcons: Record<string, typeof Database> = {
  database: Database,
  auth: Lock,
  payments: CreditCard,
  storage: Cloud,
  api: Zap,
};

const statusColors: Record<string, string> = {
  configured: "bg-green-500/10 text-green-600 dark:text-green-400",
  pending: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  manual: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export function CommandResult({ result, onViewCode, onTestSite, onPublish, onCustomize }: CommandResultProps) {
  if (result.type === "build" && result.project) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Projeto Criado!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.steps && (
              <div className="space-y-2">
                {result.steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 text-sm">
                    {step.status === "completed" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : step.status === "running" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : step.status === "error" ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted" />
                    )}
                    <span className={step.status === "completed" ? "text-muted-foreground" : ""}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg bg-muted p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{result.project.name}</p>
                  <p className="text-sm text-muted-foreground">{result.project.type}</p>
                </div>
                <Badge variant="secondary">{result.project.estimatedCost}</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {result.project.stack.map((item) => (
                  <Badge key={item.tech} variant="outline" className="text-xs">
                    {item.tech}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Configuracoes Automaticas:</p>
              {result.project.features.map((feature) => {
                const Icon = featureIcons[feature.type] || Zap;
                return (
                  <div key={feature.name} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{feature.name}</p>
                        <p className="text-xs text-muted-foreground">{feature.provider}</p>
                      </div>
                    </div>
                    <Badge className={statusColors[feature.status]} variant="secondary">
                      {feature.status === "configured" ? "Pronto" : 
                       feature.status === "pending" ? "Configurar" : "Manual"}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {result.previewUrl && (
              <div className="flex items-center gap-2 rounded-lg bg-primary/10 p-3">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="text-sm">Preview: {result.previewUrl}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={onViewCode} data-testid="button-view-code">
                Ver Codigo
              </Button>
              <Button variant="outline" size="sm" onClick={onTestSite} data-testid="button-test-site">
                Testar Site
              </Button>
              <Button variant="outline" size="sm" onClick={onCustomize} data-testid="button-customize">
                Personalizar
              </Button>
              <Button size="sm" onClick={onPublish} data-testid="button-publish">
                Publicar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result.analysis) {
    const successCount = result.analysis.items.filter(i => i.type === "success").length;
    const warningCount = result.analysis.items.filter(i => i.type === "warning").length;
    const errorCount = result.analysis.items.filter(i => i.type === "error").length;
    
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {result.type === "debug" ? "Analise de Codigo" : 
               result.type === "design" ? "Analise de Design" : "Analise de Memoria"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.analysis.score !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Pontuacao</span>
                  <span className="font-medium">{result.analysis.score}/100</span>
                </div>
                <Progress value={result.analysis.score} className="h-2" />
              </div>
            )}

            <div className="flex gap-4 text-sm">
              {successCount > 0 && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>{successCount} OK</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-1 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{warningCount} Avisos</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span>{errorCount} Erros</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {result.analysis.items.map((item, index) => (
                <div 
                  key={index} 
                  className={`rounded-lg border p-3 ${
                    item.type === "error" ? "border-red-500/30 bg-red-500/5" :
                    item.type === "warning" ? "border-yellow-500/30 bg-yellow-500/5" :
                    item.type === "success" ? "border-green-500/30 bg-green-500/5" :
                    "border-blue-500/30 bg-blue-500/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {item.type === "error" ? <XCircle className="h-4 w-4 mt-0.5 text-red-500" /> :
                     item.type === "warning" ? <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500" /> :
                     item.type === "success" ? <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" /> :
                     <Info className="h-4 w-4 mt-0.5 text-blue-500" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                      {item.fix && (
                        <p className="mt-2 text-xs bg-muted rounded p-2 font-mono">{item.fix}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {result.analysis.recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Recomendacoes:</p>
                <ul className="space-y-1">
                  {result.analysis.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (result.type === "deploy") {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium">{result.message}</p>
              <p className="text-sm text-muted-foreground">Clique em Publicar para colocar online</p>
            </div>
          </div>
          <Button className="w-full mt-4" onClick={onPublish}>
            Publicar Agora
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm">{result.message}</p>
      </CardContent>
    </Card>
  );
}
