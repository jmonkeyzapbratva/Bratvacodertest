// BRATVACODER - Índice de Templates
// Sistema de templates expansível com detecção inteligente

// Importar templates
import { whatsappBotTemplate } from "./bots/whatsapp-bot";
import { telegramBotTemplate } from "./bots/telegram-bot";
import { slackBotTemplate } from "./bots/slack-bot";
import { discordBotTemplate } from "./bots/discord-bot";
import { restExpressTemplate } from "./api/rest-express";
import { jwtAuthTemplate } from "./api/jwt-auth";
import { crudCompletoTemplate } from "./api/crud-completo";
import { fastapiTemplate } from "./api/fastapi";
import { landingPageTemplate } from "./web/landing-page";
import { staticSiteTemplate } from "./web/static-site";
import { realtimeChatTemplate } from "./web/realtime-chat";
import { adminDashboardTemplate } from "./web/admin-dashboard";
import { reactAppTemplate } from "./web/react-app";
import { nextjsAppTemplate } from "./web/nextjs-app";
import { pythonScriptTemplate } from "./automation/python-script";

// Tipo do template
export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  keywords: string[];
  files: Record<string, string>;
}

// Lista de todos os templates
export const templates: Template[] = [
  whatsappBotTemplate,
  telegramBotTemplate,
  slackBotTemplate,
  discordBotTemplate,
  restExpressTemplate,
  jwtAuthTemplate,
  crudCompletoTemplate,
  fastapiTemplate,
  landingPageTemplate,
  staticSiteTemplate,
  realtimeChatTemplate,
  adminDashboardTemplate,
  reactAppTemplate,
  nextjsAppTemplate,
  pythonScriptTemplate,
];

// Mapa de templates por ID para acesso rápido
export const templateById = new Map<string, Template>(
  templates.map(t => [t.id, t])
);

// Mapa de templates por categoria
export const templatesByCategory = templates.reduce((acc, t) => {
  if (!acc[t.category]) acc[t.category] = [];
  acc[t.category].push(t);
  return acc;
}, {} as Record<string, Template[]>);

// Palavras-chave expandidas para detecção em PT-BR
const keywordMappings: Record<string, string[]> = {
  "whatsapp-bot": [
    "whatsapp", "wpp", "zap", "zapzap", "bot whatsapp", "baileys",
    "mensagem whatsapp", "automação whatsapp", "responder whatsapp",
    "bot zap", "bot wpp", "chatbot whatsapp", "whats", "whatsap",
    "comando whatsapp", "prefixo", "ping pong", "admin whatsapp"
  ],
  "telegram-bot": [
    "telegram", "bot telegram", "telegraf", "tg bot", "mensagem telegram",
    "chatbot telegram", "automação telegram"
  ],
  "slack-bot": [
    "slack", "bot slack", "bolt", "workspace", "mensagem slack",
    "chatbot slack", "automação slack", "equipe", "empresa"
  ],
  "discord-bot": [
    "discord", "bot discord", "discord.js", "servidor discord", "guild",
    "mensagem discord", "chatbot discord", "jogos", "gaming"
  ],
  "rest-express": [
    "api", "rest", "express", "backend", "servidor", "rotas", "endpoint",
    "get post", "http", "json", "restful", "api rest"
  ],
  "jwt-auth": [
    "jwt", "autenticação", "login", "registro", "cadastro", "usuário",
    "senha", "token", "bearer", "auth", "session", "sessão", "logar",
    "fazer login", "sistema de login", "autenticar"
  ],
  "crud-completo": [
    "crud", "banco de dados", "database", "sql", "postgres", "mysql",
    "sqlite", "inserir", "atualizar", "deletar", "listar", "tabela",
    "persistir", "salvar dados", "armazenar"
  ],
  "landing-page": [
    "landing", "landing page", "página inicial", "site institucional",
    "apresentação", "empresa", "produto", "serviço", "homepage",
    "página de vendas", "conversão"
  ],
  "static-site": [
    "site", "website", "portfolio", "blog", "pessoal", "currículo",
    "cv", "página", "html", "estático", "simples"
  ],
  "realtime-chat": [
    "chat", "realtime", "tempo real", "websocket", "socket", "sala",
    "conversa", "bate-papo", "live", "instantâneo", "mensagem ao vivo"
  ],
  "admin-dashboard": [
    "dashboard", "admin", "painel", "administrativo", "gestão", "controle",
    "gráficos", "relatórios", "analytics", "métricas", "gerenciamento"
  ],
  "python-script": [
    "python", "script", "automação", "scraping", "dados", "requests",
    "pandas", "excel", "csv", "web scraping", "crawling", "py"
  ],
  "react-app": [
    "react", "vite", "spa", "aplicativo", "app react", "frontend react",
    "typescript react", "tailwind react", "react moderno", "aplicação react"
  ],
  "nextjs-app": [
    "next", "nextjs", "next.js", "ssr", "fullstack", "react server",
    "server components", "app router", "next 14", "next js"
  ],
  "fastapi": [
    "fastapi", "fast api", "python api", "api python", "uvicorn",
    "pydantic", "async python", "python backend", "python rest"
  ]
};

// Mapa de caracteres acentuados para não-acentuados (não depende de full-icu)
const accentMap: Record<string, string> = {
  'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a', 'ä': 'a',
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
  'ó': 'o', 'ò': 'o', 'õ': 'o', 'ô': 'o', 'ö': 'o',
  'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
  'ç': 'c', 'ñ': 'n',
  'Á': 'a', 'À': 'a', 'Ã': 'a', 'Â': 'a', 'Ä': 'a',
  'É': 'e', 'È': 'e', 'Ê': 'e', 'Ë': 'e',
  'Í': 'i', 'Ì': 'i', 'Î': 'i', 'Ï': 'i',
  'Ó': 'o', 'Ò': 'o', 'Õ': 'o', 'Ô': 'o', 'Ö': 'o',
  'Ú': 'u', 'Ù': 'u', 'Û': 'u', 'Ü': 'u',
  'Ç': 'c', 'Ñ': 'n'
};

// Normalizar texto para busca (sem dependência de full-icu)
function normalizeText(text: string): string {
  let result = text.toLowerCase();
  
  // Remover acentos usando mapa
  for (const [accented, plain] of Object.entries(accentMap)) {
    result = result.split(accented.toLowerCase()).join(plain);
  }
  
  // Remover pontuação
  result = result.replace(/[^\w\s]/g, " ").trim();
  
  return result;
}

// Detectar template baseado na mensagem do usuário
export function detectTemplate(message: string): Template | null {
  const normalizedMessage = normalizeText(message);
  const words = normalizedMessage.split(/\s+/);
  
  let bestMatch: { template: Template; score: number } | null = null;
  
  for (const [templateId, keywords] of Object.entries(keywordMappings)) {
    let score = 0;
    
    for (const keyword of keywords) {
      const normalizedKeyword = normalizeText(keyword);
      
      // Verificar se a keyword está contida na mensagem
      if (normalizedMessage.includes(normalizedKeyword)) {
        // Keywords maiores têm mais peso
        score += normalizedKeyword.split(" ").length * 2;
      }
      
      // Verificar palavras individuais
      const keywordWords = normalizedKeyword.split(" ");
      for (const kw of keywordWords) {
        if (words.includes(kw)) {
          score += 1;
        }
      }
    }
    
    // Também verificar keywords do próprio template
    const template = templateById.get(templateId);
    if (template) {
      for (const keyword of template.keywords) {
        const normalizedKeyword = normalizeText(keyword);
        if (normalizedMessage.includes(normalizedKeyword)) {
          score += normalizedKeyword.split(" ").length;
        }
      }
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      const template = templateById.get(templateId);
      if (template) {
        bestMatch = { template, score };
      }
    }
  }
  
  // Só retornar se score mínimo atingido
  if (bestMatch && bestMatch.score >= 2) {
    return bestMatch.template;
  }
  
  return null;
}

// Buscar templates por texto
export function searchTemplates(query: string): Template[] {
  const normalizedQuery = normalizeText(query);
  
  return templates.filter(t => {
    const normalizedName = normalizeText(t.name);
    const normalizedDesc = normalizeText(t.description);
    const normalizedKeywords = t.keywords.map(normalizeText);
    
    return (
      normalizedName.includes(normalizedQuery) ||
      normalizedDesc.includes(normalizedQuery) ||
      normalizedKeywords.some(k => k.includes(normalizedQuery))
    );
  });
}

// Obter template por ID
export function getTemplateById(id: string): Template | null {
  return templateById.get(id) || null;
}

// Listar todas as categorias
export function getCategories(): string[] {
  return Object.keys(templatesByCategory);
}

// Listar templates por categoria
export function getTemplatesByCategory(category: string): Template[] {
  return templatesByCategory[category] || [];
}

// Estatísticas
export function getTemplateStats() {
  return {
    total: templates.length,
    byCategory: Object.entries(templatesByCategory).map(([cat, temps]) => ({
      category: cat,
      count: temps.length
    }))
  };
}

export default templates;
