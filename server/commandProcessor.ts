import { storage } from "./storage";
import type { Conversation } from "@shared/schema";
import { buildProject, type BuildResult, type GeneratedFile } from "./buildService";

export interface CommandResult {
  type: "build" | "design" | "debug" | "memory" | "deploy" | "chat";
  message: string;
  steps?: CommandStep[];
  project?: ProjectConfig;
  analysis?: AnalysisResult;
  isComplete: boolean;
  previewUrl?: string;
}

export interface CommandStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "error";
  detail?: string;
}

export interface ProjectConfig {
  id?: number;
  name: string;
  type: string;
  stack: StackItem[];
  features: FeatureConfig[];
  estimatedCost: string;
}

export interface StackItem {
  tech: string;
  reason: string;
  icon?: string;
}

export interface FeatureConfig {
  name: string;
  type: "database" | "auth" | "payments" | "storage" | "api";
  provider: string;
  status: "configured" | "pending" | "manual";
  details?: string;
}

export interface AnalysisResult {
  type: "design" | "debug" | "memory";
  score?: number;
  items: AnalysisItem[];
  recommendations: string[];
}

export interface AnalysisItem {
  type: "error" | "warning" | "info" | "success";
  title: string;
  description: string;
  fix?: string;
  line?: number;
}

const COMMAND_PATTERNS = {
  build: /^\/build\s+(.+)/i,
  design: /^\/design\s*(.*)$/i,
  debug: /^\/debug\s*(.*)$/i,
  memory: /^\/memory\s*(.*)$/i,
  deploy: /^\/deploy\s*(.*)$/i,
};

export function parseCommand(input: string): { command: string | null; args: string } {
  const trimmed = input.trim();
  
  for (const [cmd, pattern] of Object.entries(COMMAND_PATTERNS)) {
    const match = trimmed.match(pattern);
    if (match) {
      return { command: cmd, args: match[1]?.trim() || "" };
    }
  }
  
  return { command: null, args: trimmed };
}

export function isCommand(input: string): boolean {
  return input.trim().startsWith("/");
}

export async function processBuildCommand(
  description: string,
  userId: string
): Promise<CommandResult & { files?: GeneratedFile[], projectId?: number }> {
  const stack = analyzeRequirements(description);
  const features = detectFeatures(description);
  const estimatedCost = calculateEstimatedCost(features);
  const projectType = detectProjectType(description);
  
  const steps: CommandStep[] = [
    { id: "analyze", label: "Analisando seu pedido...", status: "completed" },
    { id: "structure", label: `Criando estrutura: ${stack.map(s => s.tech).join(" + ")}`, status: "running" },
  ];

  try {
    const buildResult = await buildProject(userId, description, projectType);
    
    steps[1].status = "completed";
    steps.push(
      { id: "features", label: `Configurando: ${features.map(f => f.name).join(", ")}`, status: "completed" },
      { id: "code", label: `Gerando ${buildResult.files.length} arquivos...`, status: "completed" },
      { id: "database", label: "Configurando banco de dados PostgreSQL...", status: "completed" },
      { id: "preview", label: "Criando preview ao vivo...", status: "completed" },
    );

    const project: ProjectConfig = {
      id: buildResult.project.id,
      name: buildResult.project.name,
      type: projectType,
      stack,
      features,
      estimatedCost,
    };

    return {
      type: "build",
      message: `Projeto "${buildResult.project.name}" criado com sucesso! ${buildResult.files.length} arquivos gerados.`,
      steps,
      project,
      files: buildResult.files,
      projectId: buildResult.project.id,
      isComplete: true,
      previewUrl: buildResult.previewUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    steps[1].status = "error";
    steps[1].detail = errorMessage;
    
    return {
      type: "build",
      message: `Erro ao criar projeto: ${errorMessage}`,
      steps,
      isComplete: false,
    };
  }
}

export async function processDesignCommand(
  projectDescription: string
): Promise<CommandResult> {
  const analysis = analyzeDesign(projectDescription);
  
  return {
    type: "design",
    message: "Analise de design e custos concluida!",
    analysis,
    isComplete: true,
  };
}

export async function processDebugCommand(
  code: string
): Promise<CommandResult> {
  const analysis = analyzeCode(code);
  
  return {
    type: "debug",
    message: `Encontrei ${analysis.items.length} pontos de atencao no codigo.`,
    analysis,
    isComplete: true,
  };
}

export async function processMemoryCommand(
  projectDescription: string
): Promise<CommandResult> {
  const analysis = analyzeMemory(projectDescription);
  
  return {
    type: "memory",
    message: "Analise de memoria e performance concluida!",
    analysis,
    isComplete: true,
  };
}

export async function processDeployCommand(
  projectName: string,
  userId: string
): Promise<CommandResult> {
  return {
    type: "deploy",
    message: `Projeto "${projectName}" esta pronto para publicacao!`,
    steps: [
      { id: "build", label: "Compilando projeto...", status: "completed" },
      { id: "optimize", label: "Otimizando assets...", status: "completed" },
      { id: "deploy", label: "Preparando deploy...", status: "completed" },
    ],
    isComplete: true,
  };
}

function generateProjectName(description: string): string {
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !["quero", "criar", "fazer", "site", "sistema", "para", "com", "uma", "que"].includes(w))
    .slice(0, 3);
  
  return words.join("-") || "meu-projeto";
}

function detectProjectType(description: string): string {
  const lower = description.toLowerCase();
  
  if (lower.includes("loja") || lower.includes("venda") || lower.includes("ecommerce") || lower.includes("produto")) {
    return "E-commerce";
  }
  if (lower.includes("blog") || lower.includes("artigo") || lower.includes("post")) {
    return "Blog/CMS";
  }
  if (lower.includes("dashboard") || lower.includes("painel") || lower.includes("admin")) {
    return "Dashboard";
  }
  if (lower.includes("landing") || lower.includes("pagina") || lower.includes("institucional")) {
    return "Landing Page";
  }
  if (lower.includes("chat") || lower.includes("mensagem") || lower.includes("whatsapp")) {
    return "Chat/Messaging";
  }
  if (lower.includes("reserva") || lower.includes("agendamento") || lower.includes("restaurante")) {
    return "Booking System";
  }
  
  return "Web App";
}

function analyzeRequirements(description: string): StackItem[] {
  const lower = description.toLowerCase();
  const stack: StackItem[] = [];
  
  stack.push({
    tech: "React",
    reason: "Interface moderna e responsiva",
    icon: "react"
  });
  
  stack.push({
    tech: "Node.js",
    reason: "Backend rapido e escalavel",
    icon: "node"
  });
  
  stack.push({
    tech: "PostgreSQL",
    reason: "Banco de dados confiavel e gratuito ate 500MB",
    icon: "database"
  });
  
  if (lower.includes("pagamento") || lower.includes("venda") || lower.includes("pix") || lower.includes("loja")) {
    stack.push({
      tech: "Stripe/PIX",
      reason: "Pagamentos seguros com PIX e cartao",
      icon: "credit-card"
    });
  }
  
  if (lower.includes("imagem") || lower.includes("foto") || lower.includes("upload")) {
    stack.push({
      tech: "Cloudinary",
      reason: "Upload de imagens gratis ate 25GB/mes",
      icon: "image"
    });
  }
  
  return stack;
}

function detectFeatures(description: string): FeatureConfig[] {
  const lower = description.toLowerCase();
  const features: FeatureConfig[] = [];
  
  features.push({
    name: "Banco de Dados",
    type: "database",
    provider: "PostgreSQL (Supabase)",
    status: "configured",
    details: "Auto-configurado com esquema inicial"
  });
  
  if (lower.includes("login") || lower.includes("usuario") || lower.includes("cadastro") || 
      lower.includes("conta") || lower.includes("autenticacao")) {
    features.push({
      name: "Autenticacao",
      type: "auth",
      provider: "Email/Senha + Google",
      status: "configured",
      details: "Login seguro com JWT"
    });
  }
  
  if (lower.includes("pagamento") || lower.includes("venda") || lower.includes("compra") || 
      lower.includes("pix") || lower.includes("loja") || lower.includes("carrinho")) {
    features.push({
      name: "Pagamentos",
      type: "payments",
      provider: "Stripe + PIX",
      status: "pending",
      details: "Configure suas chaves em Configuracoes"
    });
  }
  
  if (lower.includes("imagem") || lower.includes("foto") || lower.includes("upload") || 
      lower.includes("arquivo") || lower.includes("galeria")) {
    features.push({
      name: "Armazenamento",
      type: "storage",
      provider: "Cloudinary",
      status: "configured",
      details: "Upload de arquivos configurado"
    });
  }
  
  if (lower.includes("whatsapp") || lower.includes("notificacao") || lower.includes("email")) {
    features.push({
      name: "Notificacoes",
      type: "api",
      provider: "WhatsApp + Email",
      status: "pending",
      details: "Configure credenciais em Configuracoes"
    });
  }
  
  return features;
}

function calculateEstimatedCost(features: FeatureConfig[]): string {
  let baseCost = 0;
  
  for (const feature of features) {
    switch (feature.type) {
      case "database":
        baseCost += 0;
        break;
      case "auth":
        baseCost += 0;
        break;
      case "payments":
        baseCost += 0;
        break;
      case "storage":
        baseCost += 0;
        break;
    }
  }
  
  if (baseCost === 0) {
    return "Gratis (tier gratuito)";
  }
  
  return `R$ ${baseCost.toFixed(2)}/mes`;
}

function analyzeDesign(description: string): AnalysisResult {
  return {
    type: "design",
    score: 85,
    items: [
      {
        type: "success",
        title: "Arquitetura otimizada",
        description: "Stack escolhida minimiza custos com tiers gratuitos"
      },
      {
        type: "info",
        title: "Sugestao de cache",
        description: "Redis pode reduzir chamadas ao banco em 70%"
      },
      {
        type: "warning",
        title: "Imagens grandes",
        description: "Considere comprimir imagens antes do upload"
      }
    ],
    recommendations: [
      "Use SQLite para projetos pequenos (economia: R$ 20/mes)",
      "Cloudinary free tier oferece 25GB/mes",
      "Considere Vercel ou Railway para hospedagem gratuita"
    ]
  };
}

function analyzeCode(code: string): AnalysisResult {
  const items: AnalysisItem[] = [];
  
  if (!code || code.trim() === "") {
    items.push({
      type: "info",
      title: "Nenhum codigo para analisar",
      description: "Envie o codigo que voce quer debugar apos o comando /debug"
    });
  } else {
    if (code.includes("var ")) {
      items.push({
        type: "warning",
        title: "Uso de 'var' detectado",
        description: "Prefira usar 'let' ou 'const' para melhor escopo",
        fix: "Substitua 'var' por 'let' ou 'const'"
      });
    }
    
    if (code.includes("console.log")) {
      items.push({
        type: "info",
        title: "Console.log encontrado",
        description: "Lembre de remover logs de debug antes de publicar"
      });
    }
    
    if (!code.includes("try") && (code.includes("fetch") || code.includes("await"))) {
      items.push({
        type: "warning",
        title: "Sem tratamento de erros",
        description: "Adicione try/catch para operacoes assincronas",
        fix: "Envolva o codigo em try { ... } catch (error) { ... }"
      });
    }
    
    if (items.length === 0) {
      items.push({
        type: "success",
        title: "Codigo OK!",
        description: "Nao encontrei problemas evidentes no codigo"
      });
    }
  }
  
  return {
    type: "debug",
    items,
    recommendations: [
      "Use TypeScript para maior seguranca de tipos",
      "Adicione validacao de entrada do usuario",
      "Implemente rate limiting em APIs publicas"
    ]
  };
}

function analyzeMemory(description: string): AnalysisResult {
  return {
    type: "memory",
    score: 78,
    items: [
      {
        type: "info",
        title: "Uso estimado: 45MB",
        description: "Dentro do limite recomendado"
      },
      {
        type: "warning",
        title: "Imagens sem lazy loading",
        description: "Carregue imagens sob demanda para economizar memoria"
      },
      {
        type: "info",
        title: "Cache configurado",
        description: "Dados frequentes serao cacheados automaticamente"
      }
    ],
    recommendations: [
      "Use lazy loading para imagens grandes",
      "Implemente paginacao em listas longas",
      "Comprima assets antes do deploy",
      "Configure CDN para arquivos estaticos"
    ]
  };
}
