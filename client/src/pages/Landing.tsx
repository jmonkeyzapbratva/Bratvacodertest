import { Code2, MessageSquare, Download, Zap, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  {
    icon: MessageSquare,
    title: "Chat Inteligente",
    description: "Descreva seu projeto em português e a IA entende exatamente o que você precisa.",
  },
  {
    icon: Code2,
    title: "Código Funcional",
    description: "Receba código completo e pronto para usar, não apenas snippets incompletos.",
  },
  {
    icon: Download,
    title: "Download Instantâneo",
    description: "Baixe seu projeto como .zip com toda a estrutura de pastas organizada.",
  },
  {
    icon: Zap,
    title: "Templates Prontos",
    description: "5 templates pré-configurados para começar rapidamente: Bot WhatsApp, API REST, Landing Page e mais.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Code2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight">BRATVACODER</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">Entrar</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Gerador de Código com IA
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Transforme suas ideias em{" "}
              <span className="text-primary">código funcional</span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
              Descreva o que você quer criar em português brasileiro e receba código completo, 
              organizado e pronto para usar. Sem complicações, sem conhecimento técnico necessário.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
              <Button size="lg" asChild className="gap-2" data-testid="button-get-started">
                <a href="/api/login">
                  Começar Grátis
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild data-testid="button-learn-more">
                <a href="#como-funciona">Como Funciona</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/30 py-20" id="como-funciona">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Como Funciona
              </h2>
              <p className="text-muted-foreground">
                Três passos simples para transformar sua ideia em código funcionando
              </p>
            </div>

            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  1
                </div>
                <h3 className="text-xl font-semibold">Descreva</h3>
                <p className="text-muted-foreground">
                  Escreva em português o que você quer criar. Pode ser informal, a IA entende.
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  2
                </div>
                <h3 className="text-xl font-semibold">Gere</h3>
                <p className="text-muted-foreground">
                  A IA analisa seu pedido e gera código completo, estruturado e documentado.
                </p>
              </div>
              
              <div className="text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  3
                </div>
                <h3 className="text-xl font-semibold">Baixe</h3>
                <p className="text-muted-foreground">
                  Faça download do projeto como .zip e execute localmente ou faça deploy.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Recursos Poderosos
            </h2>
            <p className="text-muted-foreground">
              Tudo que você precisa para criar software rapidamente
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate">
                <CardContent className="flex gap-4 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/30 py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-2xl space-y-6">
              <h2 className="text-3xl font-bold tracking-tight">
                Pronto para Começar?
              </h2>
              <p className="text-muted-foreground">
                Crie sua primeira aplicação em minutos, sem complicações.
              </p>
              <Button size="lg" asChild className="gap-2" data-testid="button-cta-bottom">
                <a href="/api/login">
                  Criar Conta Grátis
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>BRATVACODER - Gerador de Código com Inteligência Artificial</p>
        </div>
      </footer>
    </div>
  );
}
