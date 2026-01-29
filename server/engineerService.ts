import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EngineerReviewResult {
  approved: boolean;
  score: number;
  summary: string;
  issues: EngineerIssue[];
  improvements: EngineerImprovement[];
  securityFindings: SecurityFinding[];
  performanceFindings: PerformanceFinding[];
  codeQuality: CodeQualityMetrics;
  fixedCode?: string;
}

export interface EngineerIssue {
  severity: "critical" | "high" | "medium" | "low";
  type: "bug" | "security" | "performance" | "logic" | "style";
  line?: number;
  file?: string;
  description: string;
  suggestion: string;
}

export interface EngineerImprovement {
  type: "refactor" | "optimization" | "readability" | "best-practice";
  description: string;
  currentCode?: string;
  improvedCode?: string;
  impact: "high" | "medium" | "low";
}

export interface SecurityFinding {
  vulnerability: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  remediation: string;
  cweId?: string;
}

export interface PerformanceFinding {
  issue: string;
  impact: "critical" | "high" | "medium" | "low";
  description: string;
  optimization: string;
  estimatedImprovement?: string;
}

export interface CodeQualityMetrics {
  maintainability: number;
  readability: number;
  testability: number;
  complexity: number;
  documentation: number;
  overallScore: number;
}

export interface EngineerContext {
  projectType?: string;
  language: string;
  framework?: string;
  existingCode?: string;
  requirements?: string;
  focusAreas?: ("security" | "performance" | "quality" | "bugs")[];
}

const ENGINEER_SYSTEM_PROMPT = `Você é o Engineer, um revisor de código especializado de nível sênior. Sua função é analisar código de forma profunda e rigorosa, igual a um arquiteto de software experiente.

## Suas Responsabilidades:

### 1. Análise de Bugs e Lógica
- Identificar bugs potenciais e erros de lógica
- Verificar edge cases não tratados
- Detectar race conditions e problemas de concorrência
- Encontrar null pointer exceptions potenciais
- Verificar tratamento de erros adequado

### 2. Segurança
- Detectar vulnerabilidades (SQL Injection, XSS, CSRF, etc)
- Verificar validação de entrada
- Analisar autenticação e autorização
- Identificar exposição de dados sensíveis
- Verificar uso seguro de APIs e bibliotecas

### 3. Performance
- Identificar operações O(n²) ou piores
- Detectar memory leaks potenciais
- Verificar uso eficiente de recursos
- Sugerir caching onde apropriado
- Otimizar queries de banco de dados

### 4. Qualidade de Código
- Verificar aderência a padrões e convenções
- Avaliar legibilidade e manutenibilidade
- Sugerir refatorações quando necessário
- Verificar DRY (Don't Repeat Yourself)
- Avaliar separação de responsabilidades

### 5. Melhorias
- Sugerir padrões de design apropriados
- Recomendar bibliotecas ou abordagens melhores
- Propor melhorias de arquitetura
- Sugerir testes necessários

## Formato de Resposta
Responda SEMPRE em JSON válido com a estrutura:
{
  "approved": boolean,
  "score": number (0-100),
  "summary": "resumo em português",
  "issues": [...],
  "improvements": [...],
  "securityFindings": [...],
  "performanceFindings": [...],
  "codeQuality": {
    "maintainability": 0-100,
    "readability": 0-100,
    "testability": 0-100,
    "complexity": 0-100,
    "documentation": 0-100,
    "overallScore": 0-100
  }
}

Seja rigoroso mas construtivo. Aprove apenas código que esteja pronto para produção.`;

const ENGINEER_IMPROVE_PROMPT = `Você é o Engineer, um revisor de código que também corrige e melhora código.

Dado o código e os problemas identificados, você deve:
1. Corrigir todos os bugs e problemas de segurança
2. Aplicar as melhorias de performance
3. Melhorar a legibilidade e manutenibilidade
4. Manter a funcionalidade original

Retorne o código corrigido e melhorado, com comentários explicando as mudanças importantes.`;

export async function reviewCode(
  code: string,
  context: EngineerContext
): Promise<EngineerReviewResult> {
  if (!process.env.OPENAI_API_KEY) {
    return createFallbackReview(code, context);
  }

  try {
    const contextInfo = buildContextInfo(context);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: ENGINEER_SYSTEM_PROMPT },
        {
          role: "user",
          content: `${contextInfo}

## Código para Revisar:
\`\`\`${context.language}
${code}
\`\`\`

Analise este código de forma completa e rigorosa. Retorne sua análise em JSON.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return createFallbackReview(code, context);
    }

    const result = JSON.parse(content) as EngineerReviewResult;
    return normalizeReviewResult(result);
  } catch (error) {
    console.error("Engineer review error:", error);
    return createFallbackReview(code, context);
  }
}

export async function improveCode(
  code: string,
  review: EngineerReviewResult,
  context: EngineerContext
): Promise<{ improvedCode: string; changes: string[] }> {
  if (!process.env.OPENAI_API_KEY) {
    return { improvedCode: code, changes: ["API não configurada - código não modificado"] };
  }

  try {
    const issuesSummary = review.issues
      .map((i) => `- [${i.severity}] ${i.type}: ${i.description}`)
      .join("\n");
    
    const improvementsSummary = review.improvements
      .map((i) => `- [${i.impact}] ${i.type}: ${i.description}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: ENGINEER_IMPROVE_PROMPT },
        {
          role: "user",
          content: `## Contexto
Linguagem: ${context.language}
${context.framework ? `Framework: ${context.framework}` : ""}
${context.projectType ? `Tipo: ${context.projectType}` : ""}

## Código Original:
\`\`\`${context.language}
${code}
\`\`\`

## Problemas Identificados:
${issuesSummary || "Nenhum problema crítico"}

## Melhorias Sugeridas:
${improvementsSummary || "Nenhuma melhoria sugerida"}

Por favor, corrija e melhore o código. Retorne em JSON:
{
  "improvedCode": "código corrigido completo",
  "changes": ["lista de mudanças feitas"]
}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 8000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { improvedCode: code, changes: ["Erro na API"] };
    }

    const result = JSON.parse(content);
    return {
      improvedCode: result.improvedCode || code,
      changes: result.changes || [],
    };
  } catch (error) {
    console.error("Engineer improve error:", error);
    return { improvedCode: code, changes: ["Erro ao processar melhorias"] };
  }
}

export async function reviewAndImprove(
  code: string,
  context: EngineerContext
): Promise<{
  review: EngineerReviewResult;
  improvedCode?: string;
  changes?: string[];
}> {
  const review = await reviewCode(code, context);

  const normalizedReview: EngineerReviewResult = {
    approved: review.approved ?? false,
    score: review.score ?? 50,
    issues: review.issues || [],
    improvements: review.improvements || [],
    summary: review.summary || "Revisão concluída",
    securityFindings: review.securityFindings || [],
    performanceFindings: review.performanceFindings || [],
    codeQuality: review.codeQuality || {
      maintainability: 50,
      readability: 50,
      testability: 50,
      complexity: 50,
      documentation: 50,
      overallScore: 50,
    },
    fixedCode: review.fixedCode,
  };

  const hasCriticalIssues = normalizedReview.issues.some((i) => i.severity === "critical" || i.severity === "high");
  
  if (!normalizedReview.approved && hasCriticalIssues) {
    const improved = await improveCode(code, normalizedReview, context);
    return {
      review: normalizedReview,
      improvedCode: improved.improvedCode,
      changes: improved.changes,
    };
  }

  return { review: normalizedReview };
}

export async function reviewMultipleFiles(
  files: { path: string; content: string }[],
  context: EngineerContext
): Promise<{ path: string; review: EngineerReviewResult; error?: string }[]> {
  const reviews = await Promise.all(
    files.map(async (file) => {
      try {
        const fileContext = {
          ...context,
          language: detectLanguage(file.path),
        };
        const review = await reviewCode(file.content, fileContext);
        return { path: file.path, review };
      } catch (error: any) {
        return { 
          path: file.path, 
          review: createFallbackReview(file.content, { ...context, language: detectLanguage(file.path) }),
          error: error.message 
        };
      }
    })
  );

  return reviews;
}

function buildContextInfo(context: EngineerContext): string {
  const parts = [`## Contexto do Projeto`];
  
  if (context.projectType) {
    parts.push(`Tipo de Projeto: ${context.projectType}`);
  }
  parts.push(`Linguagem: ${context.language}`);
  
  if (context.framework) {
    parts.push(`Framework: ${context.framework}`);
  }
  
  if (context.requirements) {
    parts.push(`\nRequisitos:\n${context.requirements}`);
  }
  
  if (context.focusAreas && context.focusAreas.length > 0) {
    parts.push(`\nÁreas de Foco: ${context.focusAreas.join(", ")}`);
  }
  
  if (context.existingCode) {
    parts.push(`\nCódigo Existente Relacionado:\n\`\`\`\n${context.existingCode.slice(0, 2000)}\n\`\`\``);
  }

  return parts.join("\n");
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    sql: "sql",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sh: "bash",
    bash: "bash",
  };
  return langMap[ext] || "text";
}

function createFallbackReview(code: string, context: EngineerContext): EngineerReviewResult {
  const issues: EngineerIssue[] = [];
  const securityFindings: SecurityFinding[] = [];
  const performanceFindings: PerformanceFinding[] = [];
  const improvements: EngineerImprovement[] = [];

  if (code.includes("eval(")) {
    securityFindings.push({
      vulnerability: "Uso de eval()",
      severity: "critical",
      description: "eval() pode executar código arbitrário e é uma vulnerabilidade de segurança",
      remediation: "Use alternativas seguras como JSON.parse() ou Function constructor controlado",
      cweId: "CWE-95",
    });
  }

  if (code.includes("innerHTML") && !code.includes("DOMPurify")) {
    securityFindings.push({
      vulnerability: "XSS via innerHTML",
      severity: "high",
      description: "innerHTML pode permitir ataques XSS se usado com dados não sanitizados",
      remediation: "Use textContent ou sanitize com DOMPurify",
      cweId: "CWE-79",
    });
  }

  if (/password.*=.*['"][^'"]+['"]/.test(code)) {
    securityFindings.push({
      vulnerability: "Senha hardcoded",
      severity: "critical",
      description: "Senhas não devem ser incluídas diretamente no código",
      remediation: "Use variáveis de ambiente ou gerenciadores de secrets",
      cweId: "CWE-798",
    });
  }

  if (code.includes("console.log")) {
    issues.push({
      severity: "low",
      type: "style",
      description: "console.log encontrado no código",
      suggestion: "Remova logs de debug antes de produção ou use um logger apropriado",
    });
  }

  const nestedLoops = (code.match(/for.*\{[^}]*for.*\{/g) || []).length;
  if (nestedLoops > 0) {
    performanceFindings.push({
      issue: "Loops aninhados detectados",
      impact: "medium",
      description: `Encontrados ${nestedLoops} loops aninhados que podem ter complexidade O(n²)`,
      optimization: "Considere usar Map/Set para lookups O(1) ou reestruturar a lógica",
    });
  }

  const lines = code.split("\n");
  const longFunctions = lines.filter((l) => l.includes("function") || l.includes("=>")).length;
  const totalLines = lines.length;

  const readability = Math.min(100, Math.max(50, 100 - (totalLines / 10)));
  const complexity = Math.min(100, Math.max(30, 100 - (nestedLoops * 15) - (longFunctions * 2)));
  
  const score = Math.round(
    (readability + complexity + (securityFindings.length > 0 ? 40 : 80)) / 3
  );

  return {
    approved: securityFindings.filter((f) => f.severity === "critical").length === 0 && score >= 60,
    score,
    summary: `Análise automática: ${issues.length} problemas, ${securityFindings.length} alertas de segurança, ${performanceFindings.length} pontos de performance`,
    issues,
    improvements,
    securityFindings,
    performanceFindings,
    codeQuality: {
      maintainability: Math.round(readability * 0.9),
      readability: Math.round(readability),
      testability: 70,
      complexity: Math.round(complexity),
      documentation: code.includes("/**") || code.includes("//") ? 60 : 30,
      overallScore: score,
    },
  };
}

function normalizeReviewResult(result: Partial<EngineerReviewResult>): EngineerReviewResult {
  return {
    approved: result.approved ?? false,
    score: result.score ?? 0,
    summary: result.summary ?? "Revisão concluída",
    issues: result.issues ?? [],
    improvements: result.improvements ?? [],
    securityFindings: result.securityFindings ?? [],
    performanceFindings: result.performanceFindings ?? [],
    codeQuality: result.codeQuality ?? {
      maintainability: 50,
      readability: 50,
      testability: 50,
      complexity: 50,
      documentation: 50,
      overallScore: 50,
    },
    fixedCode: result.fixedCode,
  };
}

export default {
  reviewCode,
  improveCode,
  reviewAndImprove,
  reviewMultipleFiles,
};
