import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hammer, Palette, Bug, Cpu, Rocket } from "lucide-react";

interface CommandHelpProps {
  onSelectCommand: (command: string) => void;
}

const commands = [
  {
    command: "/build",
    description: "Gera projeto COMPLETO automaticamente",
    example: "/build loja de doces caseiros com carrinho e PIX",
    icon: Hammer,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    command: "/design",
    description: "Analisa design e otimiza custos",
    example: "/design analise meu projeto",
    icon: Palette,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    command: "/debug",
    description: "Analisa erros e sugere correcoes",
    example: "/debug [cole seu codigo aqui]",
    icon: Bug,
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    command: "/memory",
    description: "Analisa uso de memoria e performance",
    example: "/memory analise meu projeto",
    icon: Cpu,
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  {
    command: "/deploy",
    description: "Publica seu projeto automaticamente",
    example: "/deploy meu-projeto",
    icon: Rocket,
    color: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
];

export function CommandHelp({ onSelectCommand }: CommandHelpProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Comandos Disponiveis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {commands.map((cmd) => {
          const Icon = cmd.icon;
          return (
            <button
              key={cmd.command}
              onClick={() => onSelectCommand(cmd.command + " ")}
              className="w-full text-left rounded-lg border p-3 hover-elevate active-elevate-2 transition-colors"
              data-testid={`button-command-${cmd.command.slice(1)}`}
            >
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${cmd.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {cmd.command}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{cmd.description}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 font-mono truncate">
                    Ex: {cmd.example}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
