import OpenAI from "openai";

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

interface AIGenerationResult {
  success: boolean;
  files: GeneratedFile[];
  explanation: string;
  error?: string;
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `Você é um gerador de código especializado em criar projetos web completos.
Você SEMPRE responde em português brasileiro.
Gere código limpo, bem estruturado e pronto para produção.

IMPORTANTE: Você DEVE responder APENAS com um JSON válido no seguinte formato:
{
  "explanation": "Breve explicação do projeto (1-2 frases)",
  "files": [
    {
      "path": "caminho/do/arquivo.ext",
      "content": "conteúdo completo do arquivo",
      "language": "javascript|typescript|html|css|json|markdown"
    }
  ]
}

Regras para geração:
1. Sempre inclua package.json com scripts "dev" e "build"
2. Use React 18 com Vite para o frontend
3. Use Tailwind CSS via CDN no index.html
4. Crie componentes funcionais e modernos
5. Adicione comentários em português quando útil
6. O código deve ser executável imediatamente
7. Para e-commerce: inclua carrinho, listagem de produtos, checkout
8. Para landing pages: inclua header, hero, features, CTA, footer
9. Para dashboards: inclua sidebar, cards, gráficos
10. Para bots: inclua setup completo com instruções

NÃO inclua markdown, explicações fora do JSON, ou blocos de código. APENAS o JSON.`;

export async function generateProjectWithAI(
  description: string,
  projectType: string
): Promise<AIGenerationResult> {
  try {
    const userPrompt = `Crie um projeto completo: "${description}"
    
Tipo de projeto: ${projectType}

Gere todos os arquivos necessários para um projeto funcional.
Lembre-se: responda APENAS com JSON válido, sem texto adicional.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 8000,
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Resposta não contém JSON válido");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.files || !Array.isArray(parsed.files)) {
      throw new Error("JSON não contém array de arquivos");
    }

    return {
      success: true,
      files: parsed.files.map((f: any) => ({
        path: f.path || "index.js",
        content: f.content || "",
        language: f.language || "javascript",
      })),
      explanation: parsed.explanation || "Projeto gerado com sucesso!",
    };
  } catch (error) {
    console.error("[AI Generator] Erro:", error);
    return {
      success: false,
      files: [],
      explanation: "",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

export async function generateCodeSnippet(
  prompt: string,
  language: string = "javascript"
): Promise<{ code: string; explanation: string } | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um assistente de programação. Gere código em ${language}.
Responda em português brasileiro.
Formato da resposta:
1. Breve explicação (2-3 frases)
2. Código em bloco \`\`\`${language}\n...\n\`\`\``
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : content;
    const explanation = content.split("```")[0].trim();

    return { code, explanation };
  } catch (error) {
    console.error("[AI Generator] Erro ao gerar snippet:", error);
    return null;
  }
}

export async function analyzeAndFixCode(
  code: string,
  error: string
): Promise<{ fixedCode: string; explanation: string } | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um debugger especializado. Analise o código com erro e corrija.
Responda em português brasileiro.
Formato:
1. Explicação do problema
2. Código corrigido em bloco de código`
        },
        {
          role: "user",
          content: `Código:\n\`\`\`\n${code}\n\`\`\`\n\nErro:\n${error}\n\nCorrija o código.`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
    const fixedCode = codeMatch ? codeMatch[1].trim() : code;
    const explanation = content.split("```")[0].trim();

    return { fixedCode, explanation };
  } catch (error) {
    console.error("[AI Generator] Erro ao corrigir código:", error);
    return null;
  }
}
