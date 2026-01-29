import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ShortcutItem {
  keys: string[];
  description: string;
}

const shortcuts: ShortcutItem[] = [
  { keys: ["Ctrl/Cmd", "S"], description: "Salvar todos os arquivos" },
  { keys: ["Ctrl/Cmd", "B"], description: "Alternar painel esquerdo" },
  { keys: ["Ctrl/Cmd", "J"], description: "Alternar Console/Shell" },
  { keys: ["Ctrl/Cmd", "\\"], description: "Alternar AI Chat" },
  { keys: ["Ctrl/Cmd", "P"], description: "Buscar arquivos" },
  { keys: ["Ctrl/Cmd", "Enter"], description: "Executar/Parar projeto" },
  { keys: ["Ctrl/Cmd", "Shift", "E"], description: "Abrir explorador de arquivos" },
];

export function KeyboardShortcuts() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-6 w-6"
          data-testid="button-keyboard-shortcuts"
        >
          <Keyboard className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {shortcuts.map((shortcut, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between gap-4"
              data-testid={`shortcut-item-${index}`}
            >
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex}>
                    <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">
                      {key}
                    </kbd>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="text-muted-foreground mx-0.5">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
