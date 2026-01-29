import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { 
  MousePointer2, 
  Move, 
  Square, 
  Type, 
  Image as ImageIcon,
  Layers,
  Palette,
  Settings2,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown
} from "lucide-react";

interface VisualElement {
  id: string;
  type: "container" | "text" | "image" | "button";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  locked: boolean;
  styles: {
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
    borderRadius?: number;
    padding?: number;
  };
  content?: string;
}

interface VisualEditorProps {
  projectId?: number;
  onCodeGenerate?: (code: string) => void;
}

const elementTemplates = {
  container: { type: "container", width: 200, height: 100, styles: { backgroundColor: "#f3f4f6", borderRadius: 8, padding: 16 } },
  text: { type: "text", width: 150, height: 40, content: "Texto aqui", styles: { color: "#111827", fontSize: 16 } },
  image: { type: "image", width: 150, height: 150, styles: { borderRadius: 8 } },
  button: { type: "button", width: 120, height: 40, content: "Botão", styles: { backgroundColor: "#3b82f6", color: "#ffffff", borderRadius: 6 } },
} as const;

export function VisualEditor({ projectId, onCodeGenerate }: VisualEditorProps) {
  const [elements, setElements] = useState<VisualElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [tool, setTool] = useState<"select" | "move">("select");
  const canvasRef = useRef<HTMLDivElement>(null);

  const typeLabels: Record<string, string> = {
    container: "Contêiner",
    text: "Texto",
    image: "Imagem",
    button: "Botão",
  };

  const addElement = (type: keyof typeof elementTemplates) => {
    const template = elementTemplates[type];
    const label = typeLabels[type] || type;
    const newElement: VisualElement = {
      id: `el_${Date.now()}`,
      type: template.type as VisualElement["type"],
      name: `${label}_${elements.length + 1}`,
      x: 50 + elements.length * 20,
      y: 50 + elements.length * 20,
      width: template.width,
      height: template.height,
      visible: true,
      locked: false,
      styles: { ...template.styles },
      content: (template as any).content,
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<VisualElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    if (selectedElement === id) setSelectedElement(null);
  };

  const duplicateElement = (id: string) => {
    const element = elements.find(el => el.id === id);
    if (!element) return;
    
    const newElement: VisualElement = {
      ...element,
      id: `el_${Date.now()}`,
      name: `${element.name}_copy`,
      x: element.x + 20,
      y: element.y + 20,
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  const moveElementOrder = (id: string, direction: "up" | "down") => {
    const index = elements.findIndex(el => el.id === id);
    if (index === -1) return;
    
    const newIndex = direction === "up" ? index + 1 : index - 1;
    if (newIndex < 0 || newIndex >= elements.length) return;
    
    const newElements = [...elements];
    [newElements[index], newElements[newIndex]] = [newElements[newIndex], newElements[index]];
    setElements(newElements);
  };

  const selectedEl = elements.find(el => el.id === selectedElement);

  const generateCode = () => {
    const code = elements.map(el => {
      const style = Object.entries(el.styles)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${typeof v === "number" ? v + "px" : v}`)
        .join(", ");
      
      if (el.type === "text") {
        return `<p style={{ ${style}, position: "absolute", left: ${el.x}, top: ${el.y} }}>${el.content}</p>`;
      }
      if (el.type === "button") {
        return `<button style={{ ${style}, position: "absolute", left: ${el.x}, top: ${el.y}, width: ${el.width}, height: ${el.height} }}>${el.content}</button>`;
      }
      return `<div style={{ ${style}, position: "absolute", left: ${el.x}, top: ${el.y}, width: ${el.width}, height: ${el.height} }} />`;
    }).join("\n");
    
    onCodeGenerate?.(code);
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r flex flex-col">
        <div className="p-3 border-b">
          <h3 className="text-sm font-medium mb-2">Componentes</h3>
          <div className="grid grid-cols-4 gap-1">
            <Button
              size="icon"
              variant={tool === "select" ? "default" : "ghost"}
              onClick={() => setTool("select")}
              data-testid="tool-select"
            >
              <MousePointer2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => addElement("container")}
              data-testid="add-container"
            >
              <Square className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => addElement("text")}
              data-testid="add-text"
            >
              <Type className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => addElement("button")}
              data-testid="add-button"
            >
              <Square className="w-4 h-4 fill-current" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {elements.map((el) => (
              <div
                key={el.id}
                className={`p-2 rounded text-sm flex items-center gap-2 cursor-pointer ${
                  selectedElement === el.id ? "bg-primary/10 border border-primary" : "hover-elevate"
                }`}
                onClick={() => setSelectedElement(el.id)}
                data-testid={`layer-${el.id}`}
              >
                <Layers className="w-3 h-3 text-muted-foreground" />
                <span className="flex-1 truncate">{el.name}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); updateElement(el.id, { visible: !el.visible }); }}
                  title={el.visible ? "Ocultar" : "Mostrar"}
                  data-testid={`button-visibilidade-${el.id}`}
                >
                  {el.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        <div
          ref={canvasRef}
          className="flex-1 bg-muted/30 relative overflow-hidden"
          style={{ backgroundImage: "radial-gradient(circle, #ddd 1px, transparent 1px)", backgroundSize: "20px 20px" }}
          data-testid="visual-canvas"
        >
          {elements.filter(el => el.visible).map((el) => (
            <div
              key={el.id}
              className={`absolute cursor-move ${selectedElement === el.id ? "ring-2 ring-primary" : ""}`}
              style={{
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                backgroundColor: el.styles.backgroundColor,
                color: el.styles.color,
                fontSize: el.styles.fontSize,
                borderRadius: el.styles.borderRadius,
                padding: el.styles.padding,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => setSelectedElement(el.id)}
              data-testid={`element-${el.id}`}
            >
              {el.content}
            </div>
          ))}
        </div>
      </div>

      {selectedEl && (
        <div className="w-64 border-l">
          <div className="p-3 border-b">
            <h3 className="text-sm font-medium">Propriedades</h3>
            <p className="text-xs text-muted-foreground">{selectedEl.name}</p>
          </div>
          <ScrollArea className="h-[calc(100%-80px)]">
            <div className="p-3 space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Posição</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={selectedEl.x}
                    onChange={(e) => updateElement(selectedEl.id, { x: Number(e.target.value) })}
                    placeholder="X"
                    data-testid="input-x"
                  />
                  <Input
                    type="number"
                    value={selectedEl.y}
                    onChange={(e) => updateElement(selectedEl.id, { y: Number(e.target.value) })}
                    placeholder="Y"
                    data-testid="input-y"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Tamanho</label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    value={selectedEl.width}
                    onChange={(e) => updateElement(selectedEl.id, { width: Number(e.target.value) })}
                    placeholder="Largura"
                    data-testid="input-width"
                  />
                  <Input
                    type="number"
                    value={selectedEl.height}
                    onChange={(e) => updateElement(selectedEl.id, { height: Number(e.target.value) })}
                    placeholder="Altura"
                    data-testid="input-height"
                  />
                </div>
              </div>

              {selectedEl.content !== undefined && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Conteúdo</label>
                  <Input
                    value={selectedEl.content}
                    onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                    data-testid="input-content"
                  />
                </div>
              )}

              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => duplicateElement(selectedEl.id)} data-testid="button-duplicate-element" title="Duplicar">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteElement(selectedEl.id)} data-testid="button-delete-element" title="Excluir">
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => moveElementOrder(selectedEl.id, "up")} data-testid="button-move-element-up" title="Subir">
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => moveElementOrder(selectedEl.id, "down")} data-testid="button-move-element-down" title="Descer">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </ScrollArea>
          <div className="p-3 border-t">
            <Button className="w-full" onClick={generateCode} data-testid="button-generate-visual-code">
              Gerar Código
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
