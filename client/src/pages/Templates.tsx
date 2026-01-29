import { useLocation } from "wouter";
import { MessageCircle, Server, Layout, Cog, Globe, ArrowRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { codeTemplates, type CodeTemplate } from "@shared/schema";

const iconMap = {
  MessageCircle,
  Server,
  Layout,
  Cog,
  Globe,
};

const templateDetails: Record<string, { features: string[]; examples: string[] }> = {
  "whatsapp-bot": {
    features: [
      "Conexão via QR Code",
      "Resposta automática a mensagens",
      "Comandos personalizáveis",
      "Suporte a grupos",
    ],
    examples: [
      "Bot de atendimento ao cliente",
      "Bot de enquetes",
      "Notificações automáticas",
    ],
  },
  "rest-api": {
    features: [
      "CRUD completo",
      "Validação de dados",
      "Tratamento de erros",
      "Documentação automática",
    ],
    examples: [
      "API de produtos",
      "Sistema de usuários",
      "Gerenciamento de tarefas",
    ],
  },
  "landing-page": {
    features: [
      "Design responsivo",
      "Seções customizáveis",
      "Formulário de contato",
      "Animações suaves",
    ],
    examples: [
      "Página de startup",
      "Portfolio pessoal",
      "Página de produto",
    ],
  },
  "python-automation": {
    features: [
      "Scripts reutilizáveis",
      "Tratamento de erros",
      "Logs detalhados",
      "Configuração flexível",
    ],
    examples: [
      "Web scraping",
      "Envio de emails",
      "Processamento de arquivos",
    ],
  },
  "static-site": {
    features: [
      "Tailwind CSS",
      "Múltiplas páginas",
      "SEO otimizado",
      "Performance otimizada",
    ],
    examples: [
      "Blog pessoal",
      "Site institucional",
      "Documentação",
    ],
  },
};

export default function Templates() {
  const [, setLocation] = useLocation();

  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName as keyof typeof iconMap] || Cog;
    return Icon;
  };

  const handleUseTemplate = (template: CodeTemplate) => {
    setLocation("/");
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-2">Templates de Código</h1>
        <p className="text-muted-foreground">
          Escolha um template para começar rapidamente seu projeto
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {codeTemplates.map((template) => {
          const Icon = getIcon(template.icon);
          const details = templateDetails[template.id];

          return (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{template.name}</h3>
                    <p className="text-muted-foreground">{template.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Recursos incluídos:</h4>
                  <div className="flex flex-wrap gap-2">
                    {details?.features.map((feature) => (
                      <Badge key={feature} variant="secondary" size="sm">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Exemplos de uso:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {details?.examples.map((example) => (
                      <li key={example} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t">
                <div className="flex items-center justify-between w-full gap-4">
                  <Badge variant="outline">
                    {template.language}
                  </Badge>
                  <Button 
                    className="gap-2"
                    onClick={() => handleUseTemplate(template)}
                    data-testid={`use-template-${template.id}`}
                  >
                    Usar Template
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
