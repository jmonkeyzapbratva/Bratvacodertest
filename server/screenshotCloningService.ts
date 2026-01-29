import OpenAI from "openai";

interface ClonedDesign {
  html: string;
  css: string;
  analysis: {
    colors: string[];
    fonts: string[];
    layout: string;
    components: string[];
  };
}

interface ScreenshotAnalysis {
  description: string;
  elements: string[];
  colors: string[];
  layout: string;
  suggestedTechnologies: string[];
}

class ScreenshotCloningService {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async analyzeScreenshot(imageUrl: string): Promise<ScreenshotAnalysis> {
    if (!this.openai) {
      return this.getDefaultAnalysis();
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em análise de design de interfaces. Analise a imagem e extraia informações sobre:
- Descrição geral do layout
- Elementos de UI presentes (botões, cards, menus, etc.)
- Paleta de cores utilizada
- Tipo de layout (grid, flexbox, etc.)
- Tecnologias recomendadas para implementar

Responda em formato JSON.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
              {
                type: "text",
                text: "Analise esta interface e extraia informações de design.",
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content || "";
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as ScreenshotAnalysis;
        }
      } catch {}

      return this.parseTextAnalysis(content);
    } catch (error) {
      console.error("[ScreenshotCloning] Analysis error:", error);
      return this.getDefaultAnalysis();
    }
  }

  async cloneDesign(imageUrl: string, framework: "react" | "html" = "react"): Promise<ClonedDesign> {
    const analysis = await this.analyzeScreenshot(imageUrl);

    if (!this.openai) {
      return this.generateTemplateDesign(analysis, framework);
    }

    try {
      const prompt = framework === "react" 
        ? this.getReactClonePrompt(analysis)
        : this.getHtmlClonePrompt(analysis);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
              {
                type: "text",
                text: `Clone esta interface usando ${framework === "react" ? "React com Tailwind CSS" : "HTML e CSS puro"}. Gere código funcional e responsivo.`,
              },
            ],
          },
        ],
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content || "";
      return this.parseGeneratedCode(content, analysis);
    } catch (error) {
      console.error("[ScreenshotCloning] Clone error:", error);
      return this.generateTemplateDesign(analysis, framework);
    }
  }

  private getReactClonePrompt(analysis: ScreenshotAnalysis): string {
    return `Você é um expert em React e Tailwind CSS. Gere código React funcional que replica o design mostrado na imagem.

Análise prévia do design:
${JSON.stringify(analysis, null, 2)}

Requisitos:
1. Use React com componentes funcionais
2. Use Tailwind CSS para estilização
3. Mantenha o layout responsivo
4. Use as cores identificadas na análise
5. Inclua interações básicas (hover, focus)

Retorne o código no formato:
\`\`\`jsx
// Componente React aqui
\`\`\`

\`\`\`css
/* CSS adicional se necessário */
\`\`\``;
  }

  private getHtmlClonePrompt(analysis: ScreenshotAnalysis): string {
    return `Você é um expert em HTML e CSS. Gere código que replica o design mostrado na imagem.

Análise prévia do design:
${JSON.stringify(analysis, null, 2)}

Requisitos:
1. HTML5 semântico
2. CSS moderno (flexbox/grid)
3. Design responsivo
4. Acessibilidade básica

Retorne o código no formato:
\`\`\`html
<!-- HTML aqui -->
\`\`\`

\`\`\`css
/* CSS aqui */
\`\`\``;
  }

  private parseGeneratedCode(content: string, analysis: ScreenshotAnalysis): ClonedDesign {
    const htmlMatch = content.match(/```(?:html|jsx)\n([\s\S]*?)```/);
    const cssMatch = content.match(/```css\n([\s\S]*?)```/);

    return {
      html: htmlMatch?.[1]?.trim() || this.getDefaultHtml(),
      css: cssMatch?.[1]?.trim() || this.getDefaultCss(analysis.colors),
      analysis: {
        colors: analysis.colors,
        fonts: ["Inter", "system-ui"],
        layout: analysis.layout,
        components: analysis.elements,
      },
    };
  }

  private parseTextAnalysis(text: string): ScreenshotAnalysis {
    return {
      description: text.slice(0, 200),
      elements: ["header", "content", "footer"],
      colors: ["#1a1b26", "#a9b1d6", "#7aa2f7"],
      layout: "flexbox",
      suggestedTechnologies: ["React", "Tailwind CSS"],
    };
  }

  private getDefaultAnalysis(): ScreenshotAnalysis {
    return {
      description: "Interface web moderna",
      elements: ["header", "navigation", "content-area", "sidebar", "footer"],
      colors: ["#1a1b26", "#a9b1d6", "#7aa2f7", "#9ece6a"],
      layout: "flexbox com sidebar",
      suggestedTechnologies: ["React", "Tailwind CSS", "TypeScript"],
    };
  }

  private generateTemplateDesign(analysis: ScreenshotAnalysis, framework: string): ClonedDesign {
    const primaryColor = analysis.colors[0] || "#1a1b26";
    const textColor = analysis.colors[1] || "#a9b1d6";
    const accentColor = analysis.colors[2] || "#7aa2f7";

    if (framework === "react") {
      return {
        html: `export default function ClonedPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">
        <h1 className="text-xl font-bold">Header</h1>
      </header>
      <main className="container mx-auto p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Content cards */}
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold">Card 1</h2>
            <p className="text-muted-foreground">Conteúdo do card</p>
          </div>
        </div>
      </main>
    </div>
  );
}`,
        css: "",
        analysis: {
          colors: analysis.colors,
          fonts: ["Inter"],
          layout: analysis.layout,
          components: analysis.elements,
        },
      };
    }

    return {
      html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Página Clonada</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="header">
    <h1>Header</h1>
  </header>
  <main class="main">
    <div class="grid">
      <div class="card">
        <h2>Card 1</h2>
        <p>Conteúdo do card</p>
      </div>
    </div>
  </main>
</body>
</html>`,
      css: `:root {
  --bg-primary: ${primaryColor};
  --text-primary: ${textColor};
  --accent: ${accentColor};
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
}

.header {
  padding: 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.card {
  background: rgba(255,255,255,0.05);
  border-radius: 0.5rem;
  padding: 1rem;
}`,
      analysis: {
        colors: analysis.colors,
        fonts: ["Inter", "system-ui"],
        layout: analysis.layout,
        components: analysis.elements,
      },
    };
  }

  private getDefaultHtml(): string {
    return `<div class="container">
  <h1>Design Clonado</h1>
  <p>Conteúdo gerado automaticamente</p>
</div>`;
  }

  private getDefaultCss(colors: string[]): string {
    return `.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  background: ${colors[0] || "#1a1b26"};
  color: ${colors[1] || "#a9b1d6"};
}`;
  }
}

export const screenshotCloningService = new ScreenshotCloningService();
