import OpenAI from "openai";
import { workspaceService } from "./workspaceService";
import * as diagnosticService from "./diagnosticService";

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

export interface CodeAnalysis {
  quality: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  security: {
    vulnerabilities: SecurityIssue[];
    score: number;
  };
  performance: {
    issues: PerformanceIssue[];
    score: number;
  };
  complexity: {
    cyclomaticComplexity: number;
    linesOfCode: number;
    functions: number;
    classes: number;
  };
  bestPractices: string[];
}

export interface SecurityIssue {
  severity: "low" | "medium" | "high" | "critical";
  type: string;
  description: string;
  line?: number;
  recommendation: string;
}

export interface PerformanceIssue {
  type: string;
  description: string;
  impact: "low" | "medium" | "high";
  suggestion: string;
}

export interface CodeSuggestion {
  type: "refactor" | "fix" | "improve" | "security" | "performance";
  title: string;
  description: string;
  code?: string;
  line?: number;
}

export async function analyzeCode(code: string, language: string): Promise<CodeAnalysis> {
  const staticAnalysis = performStaticAnalysis(code, language);
  
  if (openai) {
    try {
      const aiAnalysis = await performAIAnalysis(code, language);
      return mergeAnalysis(staticAnalysis, aiAnalysis);
    } catch (error) {
      console.error("AI analysis failed, using static analysis only:", error);
    }
  }
  
  return staticAnalysis;
}

function performStaticAnalysis(code: string, language: string): CodeAnalysis {
  const lines = code.split("\n");
  const linesOfCode = lines.filter(l => l.trim() && !l.trim().startsWith("//") && !l.trim().startsWith("#")).length;
  
  const functionMatches = code.match(/function\s+\w+|const\s+\w+\s*=\s*(async\s+)?(\([^)]*\)|[a-z_]\w*)\s*=>/gi) || [];
  const classMatches = code.match(/class\s+\w+/gi) || [];
  
  const ifMatches = code.match(/\bif\s*\(/g) || [];
  const whileMatches = code.match(/\bwhile\s*\(/g) || [];
  const forMatches = code.match(/\bfor\s*\(/g) || [];
  const switchMatches = code.match(/\bswitch\s*\(/g) || [];
  const ternaryMatches = code.match(/\?[^?:]+:/g) || [];
  
  const cyclomaticComplexity = 1 + ifMatches.length + whileMatches.length + 
    forMatches.length + switchMatches.length + ternaryMatches.length;
  
  const securityVulnerabilities: SecurityIssue[] = [];
  const performanceIssues: PerformanceIssue[] = [];
  const qualityIssues: string[] = [];
  const suggestions: string[] = [];
  
  if (code.includes("eval(")) {
    securityVulnerabilities.push({
      severity: "critical",
      type: "code-injection",
      description: "Uso de eval() pode permitir execucao de codigo malicioso",
      recommendation: "Substitua eval() por alternativas seguras como JSON.parse()"
    });
  }
  
  if (code.match(/innerHTML\s*=/)) {
    securityVulnerabilities.push({
      severity: "high",
      type: "xss",
      description: "Uso de innerHTML pode causar vulnerabilidade XSS",
      recommendation: "Use textContent ou bibliotecas de sanitizacao"
    });
  }
  
  const sqlRegex = /(?:query|execute)\s*\([^)]*\+|`SELECT.*\$\{/i;
  if (sqlRegex.test(code)) {
    securityVulnerabilities.push({
      severity: "critical",
      type: "sql-injection",
      description: "Possivel vulnerabilidade de SQL Injection",
      recommendation: "Use queries parametrizadas ou ORM"
    });
  }
  
  if (code.includes("console.log") && language !== "javascript") {
    qualityIssues.push("Console.log encontrado - remova antes de producao");
  }
  
  const todoMatches = code.match(/\/\/\s*TODO|\/\/\s*FIXME|\/\/\s*HACK/gi) || [];
  if (todoMatches.length > 0) {
    qualityIssues.push(`${todoMatches.length} TODOs/FIXMEs encontrados`);
  }
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 120) {
      qualityIssues.push(`Linha ${i + 1} muito longa (${lines[i].length} caracteres)`);
    }
  }
  
  if (code.match(/for\s*\([^)]+\.length/)) {
    performanceIssues.push({
      type: "loop-optimization",
      description: "Acesso a .length dentro de loop pode ser otimizado",
      impact: "low",
      suggestion: "Armazene .length em variavel antes do loop"
    });
  }
  
  if ((code.match(/await\s+/g) || []).length > 5 && !code.includes("Promise.all")) {
    performanceIssues.push({
      type: "sequential-async",
      description: "Multiplas operacoes async sequenciais detectadas",
      impact: "medium",
      suggestion: "Considere usar Promise.all() para paralelizar"
    });
  }
  
  if (linesOfCode > 300) {
    suggestions.push("Arquivo muito grande - considere dividir em modulos menores");
  }
  
  if (cyclomaticComplexity > 10) {
    suggestions.push("Complexidade ciclomatica alta - considere simplificar a logica");
  }
  
  if (functionMatches.length > 15) {
    suggestions.push("Muitas funcoes no arquivo - considere extrair para modulos");
  }
  
  const qualityScore = Math.max(0, 100 - (qualityIssues.length * 5) - (cyclomaticComplexity > 10 ? 10 : 0));
  const securityScore = Math.max(0, 100 - (securityVulnerabilities.reduce((acc, v) => {
    return acc + (v.severity === "critical" ? 25 : v.severity === "high" ? 15 : v.severity === "medium" ? 10 : 5);
  }, 0)));
  const performanceScore = Math.max(0, 100 - (performanceIssues.length * 10));
  
  return {
    quality: {
      score: qualityScore,
      issues: qualityIssues,
      suggestions,
    },
    security: {
      vulnerabilities: securityVulnerabilities,
      score: securityScore,
    },
    performance: {
      issues: performanceIssues,
      score: performanceScore,
    },
    complexity: {
      cyclomaticComplexity,
      linesOfCode,
      functions: functionMatches.length,
      classes: classMatches.length,
    },
    bestPractices: generateBestPractices(code, language),
  };
}

async function performAIAnalysis(code: string, language: string): Promise<Partial<CodeAnalysis>> {
  if (!openai) return {};
  
  const prompt = `Analise este codigo ${language} e forneca um resumo em JSON:
  
\`\`\`${language}
${code.slice(0, 4000)}
\`\`\`

Responda apenas com JSON no formato:
{
  "quality_issues": ["lista de problemas de qualidade"],
  "security_issues": ["lista de vulnerabilidades"],
  "performance_suggestions": ["lista de melhorias de performance"],
  "best_practices": ["lista de boas praticas recomendadas"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.3,
    });
    
    const content = response.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiResult = JSON.parse(jsonMatch[0]);
      return {
        quality: {
          score: 0,
          issues: aiResult.quality_issues || [],
          suggestions: [],
        },
        bestPractices: aiResult.best_practices || [],
      };
    }
  } catch (error) {
    console.error("AI analysis error:", error);
  }
  
  return {};
}

function mergeAnalysis(static_: CodeAnalysis, ai: Partial<CodeAnalysis>): CodeAnalysis {
  const issuesSet = new Set([...static_.quality.issues, ...(ai.quality?.issues || [])]);
  const practicesSet = new Set([...static_.bestPractices, ...(ai.bestPractices || [])]);
  
  return {
    ...static_,
    quality: {
      ...static_.quality,
      issues: Array.from(issuesSet),
    },
    bestPractices: Array.from(practicesSet),
  };
}

function generateBestPractices(code: string, language: string): string[] {
  const practices: string[] = [];
  
  if (!code.includes("try") && code.includes("await")) {
    practices.push("Adicione tratamento de erros (try/catch) para operacoes async");
  }
  
  if (!code.match(/\/\*\*|\/\/\s*@/)) {
    practices.push("Adicione documentacao JSDoc para funcoes publicas");
  }
  
  if (code.match(/var\s+/)) {
    practices.push("Use 'const' ou 'let' em vez de 'var'");
  }
  
  if (code.match(/==[^=]|[^!=]==[^=]/)) {
    practices.push("Prefira === e !== para comparacoes estritas");
  }
  
  if (!code.includes("export") && !code.includes("module.exports")) {
    practices.push("Considere exportar funcoes para reutilizacao");
  }
  
  return practices;
}

export async function generateCodeSuggestions(
  projectId: number, 
  filePath: string
): Promise<CodeSuggestion[]> {
  const suggestions: CodeSuggestion[] = [];
  
  try {
    const content = await workspaceService.readFile(projectId, filePath);
    const language = detectLanguage(filePath);
    const analysis = await analyzeCode(content, language);
    
    for (const vuln of analysis.security.vulnerabilities) {
      suggestions.push({
        type: "security",
        title: `Corrigir: ${vuln.type}`,
        description: vuln.description,
        line: vuln.line,
      });
    }
    
    for (const issue of analysis.performance.issues) {
      suggestions.push({
        type: "performance",
        title: issue.type,
        description: issue.description,
      });
    }
    
    for (const practice of analysis.bestPractices) {
      suggestions.push({
        type: "improve",
        title: "Boa pratica",
        description: practice,
      });
    }
    
  } catch (error) {
    console.error("Error generating suggestions:", error);
  }
  
  return suggestions;
}

export async function explainCode(code: string, language: string): Promise<string> {
  if (!openai) {
    return "Explicacao indisponivel - configure OPENAI_API_KEY";
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Voce e um assistente que explica codigo de forma simples e clara em portugues brasileiro."
        },
        {
          role: "user",
          content: `Explique este codigo ${language} de forma simples:\n\n${code}`
        }
      ],
      max_tokens: 500,
      temperature: 0.5,
    });
    
    return response.choices[0]?.message?.content || "Nao foi possivel gerar explicacao";
  } catch (error) {
    console.error("Error explaining code:", error);
    return "Erro ao gerar explicacao";
  }
}

export async function suggestRefactor(code: string, language: string): Promise<string> {
  if (!openai) {
    return "Refatoracao indisponivel - configure OPENAI_API_KEY";
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Voce e um assistente que sugere refatoracoes de codigo. Responda em portugues brasileiro."
        },
        {
          role: "user",
          content: `Sugira melhorias e refatoracoes para este codigo ${language}:\n\n${code}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.5,
    });
    
    return response.choices[0]?.message?.content || "Nao foi possivel gerar sugestoes";
  } catch (error) {
    console.error("Error suggesting refactor:", error);
    return "Erro ao gerar sugestoes de refatoracao";
  }
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    cpp: "cpp",
    c: "c",
    rb: "ruby",
    php: "php",
  };
  return languageMap[ext || ""] || "text";
}
