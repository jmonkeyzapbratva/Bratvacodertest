import { workspaceService, FileInfo } from "./workspaceService";
import { storage } from "./storage";

export interface ProjectContext {
  projectId: number;
  projectName: string;
  projectType: "nodejs" | "python" | "static" | "unknown";
  files: FileInfo[];
  structure: string;
  dependencies: string[];
  recentChanges: string[];
  codeSnippets: Map<string, string>;
}

const contextCache = new Map<number, ProjectContext>();
const MAX_SNIPPET_SIZE = 2000;

export async function buildProjectContext(projectId: number): Promise<ProjectContext> {
  const cached = contextCache.get(projectId);
  if (cached) return cached;
  
  const project = await storage.getProject(projectId);
  if (!project) {
    throw new Error("Projeto nao encontrado");
  }
  
  const files = await workspaceService.listFiles(projectId);
  const projectType = detectProjectType(files);
  const structure = buildStructureString(files);
  const dependencies = await extractDependencies(projectId, files);
  const codeSnippets = await extractCodeSnippets(projectId, files);
  
  const context: ProjectContext = {
    projectId,
    projectName: project.name,
    projectType,
    files,
    structure,
    dependencies,
    recentChanges: [],
    codeSnippets
  };
  
  contextCache.set(projectId, context);
  return context;
}

export function invalidateContext(projectId: number): void {
  contextCache.delete(projectId);
}

function detectProjectType(files: FileInfo[]): ProjectContext["projectType"] {
  const hasPackageJson = files.some(f => f.name === "package.json");
  const hasRequirements = files.some(f => f.name === "requirements.txt" || f.name === "setup.py");
  const hasIndexHtml = files.some(f => f.name === "index.html");
  
  if (hasPackageJson) return "nodejs";
  if (hasRequirements) return "python";
  if (hasIndexHtml) return "static";
  return "unknown";
}

function buildStructureString(files: FileInfo[], indent = ""): string {
  let result = "";
  
  for (const file of files) {
    const icon = file.type === "directory" ? "[DIR]" : "[FILE]";
    result += `${indent}${icon} ${file.name}\n`;
    
    if (file.children) {
      result += buildStructureString(file.children, indent + "  ");
    }
  }
  
  return result;
}

async function extractDependencies(projectId: number, files: FileInfo[]): Promise<string[]> {
  const deps: string[] = [];
  
  const packageJson = files.find(f => f.name === "package.json");
  if (packageJson) {
    try {
      const content = await workspaceService.readFile(projectId, "package.json");
      const pkg = JSON.parse(content);
      if (pkg.dependencies) {
        deps.push(...Object.keys(pkg.dependencies).map(d => `npm:${d}`));
      }
      if (pkg.devDependencies) {
        deps.push(...Object.keys(pkg.devDependencies).map(d => `npm-dev:${d}`));
      }
    } catch {}
  }
  
  const requirements = files.find(f => f.name === "requirements.txt");
  if (requirements) {
    try {
      const content = await workspaceService.readFile(projectId, "requirements.txt");
      const lines = content.split("\n").filter(l => l.trim() && !l.startsWith("#"));
      deps.push(...lines.map(l => `pip:${l.split("==")[0].split(">=")[0].trim()}`));
    } catch {}
  }
  
  return deps;
}

async function extractCodeSnippets(projectId: number, files: FileInfo[]): Promise<Map<string, string>> {
  const snippets = new Map<string, string>();
  const codeExtensions = [".js", ".jsx", ".ts", ".tsx", ".py", ".html", ".css"];
  
  const flatFiles = flattenFiles(files).filter(f => 
    f.type === "file" && codeExtensions.some(ext => f.name.endsWith(ext))
  );
  
  for (const file of flatFiles.slice(0, 20)) {
    try {
      const content = await workspaceService.readFile(projectId, file.path);
      snippets.set(file.path, content.slice(0, MAX_SNIPPET_SIZE));
    } catch {}
  }
  
  return snippets;
}

function flattenFiles(files: FileInfo[]): FileInfo[] {
  const result: FileInfo[] = [];
  
  for (const file of files) {
    result.push(file);
    if (file.children) {
      result.push(...flattenFiles(file.children));
    }
  }
  
  return result;
}

export function generateContextPrompt(context: ProjectContext): string {
  let prompt = `## Contexto do Projeto\n\n`;
  prompt += `**Nome:** ${context.projectName}\n`;
  prompt += `**Tipo:** ${context.projectType}\n\n`;
  
  prompt += `### Estrutura de Arquivos\n\`\`\`\n${context.structure}\`\`\`\n\n`;
  
  if (context.dependencies.length > 0) {
    prompt += `### Dependencias\n`;
    for (const dep of context.dependencies.slice(0, 20)) {
      prompt += `- ${dep}\n`;
    }
    prompt += "\n";
  }
  
  if (context.codeSnippets.size > 0) {
    prompt += `### Arquivos Principais\n\n`;
    for (const [path, content] of Array.from(context.codeSnippets.entries()).slice(0, 5)) {
      const lang = path.split(".").pop() || "text";
      prompt += `**${path}:**\n\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
    }
  }
  
  prompt += `\n---\n`;
  prompt += `Ao modificar o projeto, mantenha compatibilidade com a estrutura existente.\n`;
  prompt += `Use as mesmas tecnologias e padroes ja utilizados.\n`;
  
  return prompt;
}

export async function getContextualSystemPrompt(projectId: number): Promise<string> {
  try {
    const context = await buildProjectContext(projectId);
    return generateContextPrompt(context);
  } catch {
    return "";
  }
}

export function recordChange(projectId: number, description: string): void {
  const context = contextCache.get(projectId);
  if (context) {
    context.recentChanges.unshift(description);
    if (context.recentChanges.length > 10) {
      context.recentChanges.pop();
    }
  }
}

export async function analyzeExistingCode(projectId: number, filePath: string): Promise<{
  imports: string[];
  exports: string[];
  functions: string[];
  classes: string[];
  summary: string;
}> {
  try {
    const content = await workspaceService.readFile(projectId, filePath);
    
    const imports = Array.from(content.matchAll(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g)).map(m => m[1]);
    const exports = Array.from(content.matchAll(/export\s+(default\s+)?(function|class|const|let|var)\s+(\w+)/g)).map(m => m[3]);
    const functions = Array.from(content.matchAll(/(?:function|async\s+function)\s+(\w+)/g)).map(m => m[1]);
    const classes = Array.from(content.matchAll(/class\s+(\w+)/g)).map(m => m[1]);
    
    const lines = content.split("\n").length;
    const summary = `Arquivo com ${lines} linhas, ${functions.length} funcoes, ${classes.length} classes`;
    
    return { imports, exports, functions, classes, summary };
  } catch {
    return { imports: [], exports: [], functions: [], classes: [], summary: "Arquivo nao encontrado" };
  }
}
