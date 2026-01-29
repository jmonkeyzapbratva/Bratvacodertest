import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TestTube2, Play, CheckCircle2, XCircle, AlertCircle, 
  Camera, Video, Loader2, RefreshCw, Wand2, BarChart3
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TestStep {
  action: string;
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
  assertion?: {
    type: string;
    expected: string;
  };
}

interface TestCase {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
  status: "pending" | "running" | "passed" | "failed" | "skipped";
  error?: string;
  duration?: number;
  screenshot?: string;
}

interface TestRun {
  id: string;
  projectId: number;
  startedAt: string;
  completedAt?: string;
  status: "running" | "passed" | "failed" | "cancelled";
  tests: TestCase[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  selfHealingAttempts: number;
  selfHealingSuccesses: number;
}

interface CoverageReport {
  totalRoutes: number;
  testedRoutes: number;
  coveragePercent: number;
  untestedRoutes: string[];
}

interface PlaywrightTestPanelProps {
  projectId: number;
  appDescription?: string;
  baseUrl?: string;
}

export function PlaywrightTestPanel({ 
  projectId, 
  appDescription = "", 
  baseUrl = "http://localhost:5000" 
}: PlaywrightTestPanelProps) {
  const [generatedTests, setGeneratedTests] = useState<TestCase[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const { data: coverage } = useQuery<CoverageReport>({
    queryKey: ["/api/playwright/coverage", projectId],
    enabled: !!projectId,
  });

  const { data: activeRun } = useQuery<TestRun | null>({
    queryKey: ["/api/playwright/run", activeRunId],
    enabled: !!activeRunId,
    refetchInterval: (query) => {
      const data = query.state.data as TestRun | null;
      if (!data) return 1000;
      return data.status === "passed" || data.status === "failed" || data.status === "cancelled" ? false : 1000;
    },
  });

  const generateTestsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/playwright/generate-tests", {
        projectId,
        appDescription,
        routes: ["/", "/about", "/dashboard"]
      });
      return response.json();
    },
    onSuccess: (tests: TestCase[]) => {
      setGeneratedTests(tests);
    }
  });

  const runTestsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/playwright/run", {
        projectId,
        baseUrl,
        tests: generatedTests
      });
      return response.json();
    },
    onSuccess: (run: TestRun) => {
      setActiveRunId(run.id);
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-destructive" />;
      case "running": return <Loader2 className="w-4 h-4 animate-spin" />;
      case "skipped": return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TestTube2 className="w-4 h-4" />
            Testes E2E
          </CardTitle>
          {coverage && (
            <Badge 
              variant={coverage.coveragePercent >= 80 ? "default" : "secondary"}
              className="text-xs"
            >
              {coverage.coveragePercent.toFixed(0)}% cobertura
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Testes automatizados com Playwright e self-healing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {coverage && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Cobertura de rotas</span>
              <span>{coverage.testedRoutes}/{coverage.totalRoutes}</span>
            </div>
            <Progress value={coverage.coveragePercent} className="h-2" />
            {coverage.untestedRoutes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Nao testadas:</span>
                {coverage.untestedRoutes.map((route, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-mono">
                    {route}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {activeRun ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeRun.status === "running" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : activeRun.status === "passed" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive" />
                )}
                <span className="text-sm font-medium">
                  {activeRun.status === "running" ? "Executando..." : 
                   activeRun.status === "passed" ? "Todos passaram!" : "Alguns falharam"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                {activeRun.passedTests}
                <XCircle className="w-3 h-3 text-destructive" />
                {activeRun.failedTests}
              </div>
            </div>

            <Progress 
              value={(activeRun.passedTests + activeRun.failedTests) / activeRun.totalTests * 100} 
              className="h-2" 
            />

            {activeRun.selfHealingAttempts > 0 && (
              <div className="p-2 rounded bg-purple-500/10 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-500" />
                <span className="text-xs">
                  Self-healing: {activeRun.selfHealingSuccesses}/{activeRun.selfHealingAttempts} corrigidos
                </span>
              </div>
            )}

            <ScrollArea className="h-48">
              <div className="space-y-2">
                {activeRun.tests.map((test) => (
                  <div 
                    key={test.id}
                    className="p-2 rounded bg-muted/30 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(test.status)}
                      <span className="text-sm font-medium flex-1">{test.name}</span>
                      {test.duration && (
                        <span className="text-xs text-muted-foreground">
                          {test.duration}ms
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                      {test.description}
                    </p>
                    {test.error && (
                      <div className="text-xs text-destructive pl-6 font-mono">
                        {test.error}
                      </div>
                    )}
                    {test.screenshot && (
                      <Button variant="ghost" size="sm" className="ml-6 text-xs" data-testid={`button-screenshot-${test.id}`}>
                        <Camera className="w-3 h-3 mr-1" />
                        Ver screenshot
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setActiveRunId(null)}
              data-testid="button-new-test-run"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Nova Execucao
            </Button>
          </div>
        ) : generatedTests.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {generatedTests.length} testes gerados
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGeneratedTests([])}
                data-testid="button-clear-tests"
              >
                Limpar
              </Button>
            </div>

            <ScrollArea className="h-40">
              <div className="space-y-1">
                {generatedTests.map((test) => (
                  <div 
                    key={test.id}
                    className="p-2 rounded bg-muted/30 flex items-center gap-2"
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-muted" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{test.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {test.steps.length} passos
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button
              className="w-full"
              onClick={() => runTestsMutation.mutate()}
              disabled={runTestsMutation.isPending}
              data-testid="button-run-tests"
            >
              {runTestsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Executar Testes
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded bg-muted/30 text-center space-y-2">
              <TestTube2 className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Gere testes automaticamente baseados na sua aplicacao
              </p>
            </div>

            <Button
              className="w-full"
              onClick={() => generateTestsMutation.mutate()}
              disabled={generateTestsMutation.isPending}
              data-testid="button-generate-tests"
            >
              {generateTestsMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              Gerar Testes Automaticamente
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" size="sm" data-testid="button-video-replay">
                <Video className="w-4 h-4 mr-1" />
                Video Replay
              </Button>
              <Button variant="outline" className="flex-1" size="sm" data-testid="button-coverage-report">
                <BarChart3 className="w-4 h-4 mr-1" />
                Relatorio
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
