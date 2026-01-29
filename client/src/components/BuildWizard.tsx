import { useState } from "react";
import { Globe, ShoppingCart, Bot, Smartphone, Plug, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProjectType {
  id: string;
  icon: typeof Globe;
  title: string;
  description: string;
  examples: string[];
}

const projectTypes: ProjectType[] = [
  {
    id: "website",
    icon: Globe,
    title: "Site/Website",
    description: "Landing page, blog, portfolio",
    examples: ["pagina de vendas", "site institucional", "blog pessoal"],
  },
  {
    id: "ecommerce",
    icon: ShoppingCart,
    title: "Loja Online",
    description: "Vendas, pagamentos, carrinho",
    examples: ["loja de roupas", "loja de doces", "marketplace"],
  },
  {
    id: "bot",
    icon: Bot,
    title: "Bot/Automacao",
    description: "WhatsApp, Telegram, Discord",
    examples: ["bot de atendimento", "automacao de vendas", "chatbot IA"],
  },
  {
    id: "app",
    icon: Smartphone,
    title: "Aplicativo",
    description: "Mobile, desktop, PWA",
    examples: ["app de delivery", "app de tarefas", "app social"],
  },
  {
    id: "api",
    icon: Plug,
    title: "API/Sistema",
    description: "Backend, database, integracoes",
    examples: ["API REST", "sistema de usuarios", "integracao com pagamentos"],
  },
];

interface BuildWizardProps {
  onStartBuild: (projectType: string, description: string) => void;
  isBuilding?: boolean;
}

export function BuildWizard({ onStartBuild, isBuilding }: BuildWizardProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<"select" | "describe">("select");

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    setStep("describe");
  };

  const handleBuild = () => {
    if (selectedType && description.trim()) {
      onStartBuild(selectedType, description);
    }
  };

  const handleBack = () => {
    setStep("select");
    setSelectedType(null);
  };

  if (step === "describe" && selectedType) {
    const selected = projectTypes.find((t) => t.id === selectedType);
    const Icon = selected?.icon || Globe;

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack} data-testid="button-back-wizard">
            Voltar
          </Button>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-4 w-4" />
            <span className="text-sm">{selected?.title}</span>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Descreva seu projeto</CardTitle>
            <CardDescription>
              Quanto mais detalhes, melhor o resultado!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Ex: "${selected?.examples[0] || "descreva aqui"}"`}
              className="min-h-[120px] text-base"
              data-testid="input-project-description"
            />
            
            <div className="flex flex-wrap gap-2">
              {selected?.examples.map((example, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setDescription(example)}
                  data-testid={`button-example-${i}`}
                >
                  {example}
                </Button>
              ))}
            </div>

            <Button
              onClick={handleBuild}
              disabled={!description.trim() || isBuilding}
              className="w-full"
              size="lg"
              data-testid="button-generate-project"
            >
              {isBuilding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando projeto...
                </>
              ) : (
                <>
                  Gerar Projeto
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">O que voce quer construir?</h3>
        <p className="text-sm text-muted-foreground">
          Escolha uma opcao ou descreva com suas palavras
        </p>
      </div>

      <div className="grid gap-2">
        {projectTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => handleTypeSelect(type.id)}
              className="flex items-center gap-3 rounded-lg border p-3 text-left hover-elevate active-elevate-2 transition-colors"
              data-testid={`wizard-option-${type.id}`}
            >
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{type.title}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {type.description}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          );
        })}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            ou descreva livremente
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: 'quero um site para meu restaurante com cardapio online e reservas'"
          className="min-h-[80px]"
          data-testid="input-free-description"
        />
        <Button
          onClick={() => {
            if (description.trim()) {
              onStartBuild("custom", description);
            }
          }}
          disabled={!description.trim() || isBuilding}
          className="w-full"
          data-testid="button-generate-free"
        >
          {isBuilding ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            "Gerar Projeto"
          )}
        </Button>
      </div>
    </div>
  );
}
