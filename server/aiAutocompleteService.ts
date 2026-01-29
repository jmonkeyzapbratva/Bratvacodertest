import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

export interface CompletionRequest {
  code: string;
  language: string;
  cursorPosition: number;
  prefix: string;
  suffix: string;
  filePath?: string;
  projectContext?: string;
}

export interface CompletionResult {
  suggestions: CompletionSuggestion[];
  cached: boolean;
}

export interface CompletionSuggestion {
  text: string;
  displayText: string;
  type: "snippet" | "function" | "variable" | "keyword" | "class" | "property";
  documentation?: string;
  insertText?: string;
}

const completionCache = new Map<string, { result: CompletionResult; timestamp: number }>();
const CACHE_TTL = 60000;

export async function getCompletions(request: CompletionRequest): Promise<CompletionResult> {
  const cacheKey = generateCacheKey(request);
  const cached = completionCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached.result, cached: true };
  }
  
  const staticCompletions = getStaticCompletions(request);
  
  if (openai && request.prefix.length > 10) {
    try {
      const aiCompletions = await getAICompletions(request);
      const merged = mergeCompletions(staticCompletions, aiCompletions);
      
      const result = { suggestions: merged, cached: false };
      completionCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error("AI completion error:", error);
    }
  }
  
  return { suggestions: staticCompletions, cached: false };
}

function generateCacheKey(request: CompletionRequest): string {
  return `${request.language}:${request.prefix.slice(-50)}`;
}

function getStaticCompletions(request: CompletionRequest): CompletionSuggestion[] {
  const suggestions: CompletionSuggestion[] = [];
  const lastWord = getLastWord(request.prefix);
  
  switch (request.language) {
    case "javascript":
    case "typescript":
    case "jsx":
    case "tsx":
      suggestions.push(...getJavaScriptCompletions(lastWord, request.prefix));
      break;
    case "python":
      suggestions.push(...getPythonCompletions(lastWord, request.prefix));
      break;
    case "html":
      suggestions.push(...getHtmlCompletions(lastWord, request.prefix));
      break;
    case "css":
      suggestions.push(...getCssCompletions(lastWord, request.prefix));
      break;
  }
  
  return suggestions.filter(s => 
    s.displayText.toLowerCase().startsWith(lastWord.toLowerCase())
  ).slice(0, 10);
}

function getLastWord(text: string): string {
  const match = text.match(/[\w$]+$/);
  return match ? match[0] : "";
}

function getJavaScriptCompletions(lastWord: string, context: string): CompletionSuggestion[] {
  const suggestions: CompletionSuggestion[] = [];
  
  const keywords = [
    "const", "let", "var", "function", "async", "await", "return", 
    "if", "else", "for", "while", "switch", "case", "break", "continue",
    "try", "catch", "finally", "throw", "class", "extends", "export", 
    "import", "from", "default", "new", "this", "typeof", "instanceof"
  ];
  
  for (const kw of keywords) {
    if (kw.startsWith(lastWord.toLowerCase())) {
      suggestions.push({
        text: kw,
        displayText: kw,
        type: "keyword",
        documentation: `Palavra-chave JavaScript: ${kw}`,
      });
    }
  }
  
  const snippets: Array<{ trigger: string; text: string; insert: string; doc: string }> = [
    { trigger: "func", text: "function", insert: "function ${1:name}(${2:params}) {\n  ${3}\n}", doc: "Declaracao de funcao" },
    { trigger: "afunc", text: "async function", insert: "async function ${1:name}(${2:params}) {\n  ${3}\n}", doc: "Funcao assincrona" },
    { trigger: "arrow", text: "arrow function", insert: "const ${1:name} = (${2:params}) => {\n  ${3}\n}", doc: "Arrow function" },
    { trigger: "iife", text: "IIFE", insert: "(() => {\n  ${1}\n})()", doc: "Immediately Invoked Function Expression" },
    { trigger: "for", text: "for loop", insert: "for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n  ${3}\n}", doc: "Loop for tradicional" },
    { trigger: "forin", text: "for...in", insert: "for (const ${1:key} in ${2:object}) {\n  ${3}\n}", doc: "Loop for...in" },
    { trigger: "forof", text: "for...of", insert: "for (const ${1:item} of ${2:array}) {\n  ${3}\n}", doc: "Loop for...of" },
    { trigger: "if", text: "if statement", insert: "if (${1:condition}) {\n  ${2}\n}", doc: "Condicional if" },
    { trigger: "ifelse", text: "if...else", insert: "if (${1:condition}) {\n  ${2}\n} else {\n  ${3}\n}", doc: "Condicional if...else" },
    { trigger: "try", text: "try...catch", insert: "try {\n  ${1}\n} catch (${2:error}) {\n  ${3}\n}", doc: "Bloco try...catch" },
    { trigger: "class", text: "class", insert: "class ${1:Name} {\n  constructor(${2:params}) {\n    ${3}\n  }\n}", doc: "Declaracao de classe" },
    { trigger: "imp", text: "import", insert: "import { ${1:module} } from '${2:package}'", doc: "Import ES6" },
    { trigger: "impd", text: "import default", insert: "import ${1:name} from '${2:package}'", doc: "Import default" },
    { trigger: "exp", text: "export", insert: "export { ${1:name} }", doc: "Export ES6" },
    { trigger: "expd", text: "export default", insert: "export default ${1:name}", doc: "Export default" },
    { trigger: "cons", text: "console.log", insert: "console.log(${1})", doc: "Console.log" },
    { trigger: "fetch", text: "fetch request", insert: "const ${1:response} = await fetch('${2:url}', {\n  method: '${3:GET}',\n  headers: { 'Content-Type': 'application/json' },\n})", doc: "Fetch API request" },
    { trigger: "usestate", text: "useState hook", insert: "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue})", doc: "React useState hook" },
    { trigger: "useeffect", text: "useEffect hook", insert: "useEffect(() => {\n  ${1}\n}, [${2:deps}])", doc: "React useEffect hook" },
    { trigger: "usequery", text: "useQuery hook", insert: "const { data, isLoading } = useQuery({\n  queryKey: ['${1:key}'],\n})", doc: "TanStack Query useQuery" },
  ];
  
  for (const snippet of snippets) {
    if (snippet.trigger.startsWith(lastWord.toLowerCase()) || 
        snippet.text.toLowerCase().includes(lastWord.toLowerCase())) {
      suggestions.push({
        text: snippet.text,
        displayText: snippet.text,
        type: "snippet",
        documentation: snippet.doc,
        insertText: snippet.insert,
      });
    }
  }
  
  return suggestions;
}

function getPythonCompletions(lastWord: string, context: string): CompletionSuggestion[] {
  const suggestions: CompletionSuggestion[] = [];
  
  const keywords = [
    "def", "class", "if", "elif", "else", "for", "while", "try", "except",
    "finally", "with", "as", "import", "from", "return", "yield", "lambda",
    "pass", "break", "continue", "raise", "assert", "global", "nonlocal",
    "True", "False", "None", "and", "or", "not", "in", "is", "async", "await"
  ];
  
  for (const kw of keywords) {
    if (kw.toLowerCase().startsWith(lastWord.toLowerCase())) {
      suggestions.push({
        text: kw,
        displayText: kw,
        type: "keyword",
        documentation: `Palavra-chave Python: ${kw}`,
      });
    }
  }
  
  const snippets: Array<{ trigger: string; text: string; insert: string; doc: string }> = [
    { trigger: "def", text: "def function", insert: "def ${1:name}(${2:params}):\n    ${3:pass}", doc: "Definicao de funcao" },
    { trigger: "adef", text: "async def", insert: "async def ${1:name}(${2:params}):\n    ${3:pass}", doc: "Funcao assincrona" },
    { trigger: "class", text: "class", insert: "class ${1:Name}:\n    def __init__(self${2:, params}):\n        ${3:pass}", doc: "Definicao de classe" },
    { trigger: "if", text: "if statement", insert: "if ${1:condition}:\n    ${2:pass}", doc: "Condicional if" },
    { trigger: "for", text: "for loop", insert: "for ${1:item} in ${2:iterable}:\n    ${3:pass}", doc: "Loop for" },
    { trigger: "try", text: "try...except", insert: "try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:pass}", doc: "Bloco try...except" },
    { trigger: "with", text: "with statement", insert: "with ${1:expression} as ${2:var}:\n    ${3:pass}", doc: "Context manager" },
  ];
  
  for (const snippet of snippets) {
    if (snippet.trigger.startsWith(lastWord.toLowerCase())) {
      suggestions.push({
        text: snippet.text,
        displayText: snippet.text,
        type: "snippet",
        documentation: snippet.doc,
        insertText: snippet.insert,
      });
    }
  }
  
  return suggestions;
}

function getHtmlCompletions(lastWord: string, context: string): CompletionSuggestion[] {
  const suggestions: CompletionSuggestion[] = [];
  
  const tags = [
    "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "button", "input", "form", "label", "select", "option", "textarea",
    "ul", "ol", "li", "table", "tr", "td", "th", "thead", "tbody",
    "img", "video", "audio", "canvas", "svg",
    "header", "footer", "nav", "main", "section", "article", "aside",
    "script", "style", "link", "meta", "head", "body", "html"
  ];
  
  for (const tag of tags) {
    if (tag.startsWith(lastWord.toLowerCase())) {
      suggestions.push({
        text: tag,
        displayText: `<${tag}>`,
        type: "snippet",
        documentation: `Tag HTML: ${tag}`,
        insertText: `<${tag}>\${1}</${tag}>`,
      });
    }
  }
  
  return suggestions;
}

function getCssCompletions(lastWord: string, context: string): CompletionSuggestion[] {
  const suggestions: CompletionSuggestion[] = [];
  
  const properties = [
    "display", "flex", "grid", "position", "top", "right", "bottom", "left",
    "width", "height", "max-width", "min-width", "max-height", "min-height",
    "margin", "padding", "border", "border-radius", "background", "background-color",
    "color", "font-size", "font-weight", "font-family", "text-align", "line-height",
    "justify-content", "align-items", "gap", "flex-direction", "flex-wrap",
    "box-shadow", "overflow", "z-index", "opacity", "transform", "transition"
  ];
  
  for (const prop of properties) {
    if (prop.startsWith(lastWord.toLowerCase())) {
      suggestions.push({
        text: prop,
        displayText: prop,
        type: "property",
        documentation: `Propriedade CSS: ${prop}`,
        insertText: `${prop}: \${1};`,
      });
    }
  }
  
  return suggestions;
}

async function getAICompletions(request: CompletionRequest): Promise<CompletionSuggestion[]> {
  if (!openai) return [];
  
  const contextLines = request.prefix.split("\n").slice(-10).join("\n");
  
  const prompt = `Voce e um assistente de autocomplete de codigo. 
Dado o contexto abaixo em ${request.language}, sugira de 1 a 3 completions curtas e relevantes.
Responda APENAS com um JSON array contendo objetos com: text, displayText, type, documentation.

Contexto:
\`\`\`${request.language}
${contextLines}
\`\`\`

O cursor esta no final. Sugira completions que continuem o codigo logicamente.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    });
    
    const content = response.choices[0]?.message?.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]);
      return suggestions.map((s: any) => ({
        text: s.text || s.displayText,
        displayText: s.displayText || s.text,
        type: s.type || "snippet",
        documentation: s.documentation || "",
      }));
    }
  } catch (error) {
    console.error("AI completion parsing error:", error);
  }
  
  return [];
}

function mergeCompletions(
  static_: CompletionSuggestion[], 
  ai: CompletionSuggestion[]
): CompletionSuggestion[] {
  const seen = new Set<string>();
  const merged: CompletionSuggestion[] = [];
  
  for (const suggestion of ai) {
    if (!seen.has(suggestion.text.toLowerCase())) {
      seen.add(suggestion.text.toLowerCase());
      merged.push(suggestion);
    }
  }
  
  for (const suggestion of static_) {
    if (!seen.has(suggestion.text.toLowerCase())) {
      seen.add(suggestion.text.toLowerCase());
      merged.push(suggestion);
    }
  }
  
  return merged.slice(0, 15);
}

export async function getInlineCompletion(
  code: string,
  cursorLine: number,
  cursorColumn: number,
  language: string
): Promise<string | null> {
  if (!openai) return null;
  
  const lines = code.split("\n");
  const contextBefore = lines.slice(Math.max(0, cursorLine - 10), cursorLine + 1).join("\n");
  const currentLine = lines[cursorLine] || "";
  const lineBeforeCursor = currentLine.slice(0, cursorColumn);
  
  if (lineBeforeCursor.trim().length < 3) return null;
  
  const prompt = `Complete esta linha de codigo ${language}. 
Responda APENAS com a continuacao do codigo (sem a parte que ja existe).
Se nao houver nada logico para completar, responda com string vazia.

${contextBefore}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
      temperature: 0.2,
    });
    
    const completion = response.choices[0]?.message?.content?.trim() || "";
    
    if (completion && !completion.includes("```") && completion.length < 100) {
      return completion;
    }
  } catch (error) {
    console.error("Inline completion error:", error);
  }
  
  return null;
}
