import * as path from "path";
import * as fs from "fs";
import { workspaceService } from "./workspaceService";

export interface DiagnosticError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
  code?: string;
  suggestion?: string;
}

export interface FileDiagnostics {
  file: string;
  errors: DiagnosticError[];
  warnings: DiagnosticError[];
}

const COMMON_ERROR_PATTERNS: { pattern: RegExp; suggestion: string }[] = [
  {
    pattern: /Cannot find module ['"]([@\w/-]+)['"]/,
    suggestion: "Instale o pacote com: npm install $1"
  },
  {
    pattern: /Module not found: Error: Can't resolve ['"]([@\w/-]+)['"]/,
    suggestion: "Pacote nao encontrado. Instale com: npm install $1"
  },
  {
    pattern: /is not defined/,
    suggestion: "Variavel nao declarada. Verifique se foi importada ou declarada corretamente."
  },
  {
    pattern: /Unexpected token/,
    suggestion: "Erro de sintaxe. Verifique virgulas, parenteses ou chaves faltando."
  },
  {
    pattern: /TypeError: Cannot read propert/,
    suggestion: "Tentativa de acessar propriedade de valor undefined/null. Use optional chaining (?.)."
  },
  {
    pattern: /ECONNREFUSED/,
    suggestion: "Conexao recusada. Verifique se o servidor/servico esta rodando."
  },
  {
    pattern: /ENOENT/,
    suggestion: "Arquivo ou diretorio nao encontrado. Verifique o caminho."
  },
  {
    pattern: /SyntaxError: Unexpected end of/,
    suggestion: "Arquivo incompleto. Verifique chaves ou parenteses nao fechados."
  },
  {
    pattern: /Cannot use import statement outside/,
    suggestion: "Use 'type: module' no package.json ou mude para require()."
  },
  {
    pattern: /ERR_MODULE_NOT_FOUND/,
    suggestion: "Modulo nao encontrado. Verifique o caminho do import."
  }
];

const PYTHON_ERROR_PATTERNS: { pattern: RegExp; suggestion: string }[] = [
  {
    pattern: /ModuleNotFoundError: No module named ['"]([\w_]+)['"]/,
    suggestion: "Instale o pacote com: pip install $1"
  },
  {
    pattern: /ImportError: cannot import name/,
    suggestion: "Nome de import incorreto. Verifique a documentacao do modulo."
  },
  {
    pattern: /IndentationError/,
    suggestion: "Erro de indentacao. Use espacos ou tabs consistentemente."
  },
  {
    pattern: /SyntaxError: invalid syntax/,
    suggestion: "Erro de sintaxe Python. Verifique dois-pontos, parenteses ou aspas."
  },
  {
    pattern: /NameError: name .+ is not defined/,
    suggestion: "Variavel nao definida. Verifique se foi declarada antes do uso."
  }
];

export function parseConsoleErrors(output: string): DiagnosticError[] {
  const errors: DiagnosticError[] = [];
  const lines = output.split("\n");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const nodeErrorMatch = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (nodeErrorMatch) {
      const [, , file, lineNum, col] = nodeErrorMatch;
      const errorLine = lines.slice(Math.max(0, i - 3), i).find(l => l.includes("Error:") || l.includes("TypeError:") || l.includes("SyntaxError:"));
      
      if (errorLine) {
        errors.push({
          file: file,
          line: parseInt(lineNum),
          column: parseInt(col),
          message: errorLine.trim(),
          severity: "error",
          suggestion: findSuggestion(errorLine)
        });
      }
    }
    
    const simpleErrorMatch = line.match(/^(\w+Error|Error):\s*(.+)/);
    if (simpleErrorMatch) {
      errors.push({
        file: "unknown",
        line: 0,
        column: 0,
        message: line.trim(),
        severity: "error",
        suggestion: findSuggestion(line)
      });
    }
  }
  
  return errors;
}

function findSuggestion(errorMessage: string): string | undefined {
  for (const { pattern, suggestion } of [...COMMON_ERROR_PATTERNS, ...PYTHON_ERROR_PATTERNS]) {
    const match = errorMessage.match(pattern);
    if (match) {
      return suggestion.replace(/\$1/g, match[1] || "");
    }
  }
  return undefined;
}

export function analyzeJavaScriptFile(content: string, filePath: string): DiagnosticError[] {
  const errors: DiagnosticError[] = [];
  const lines = content.split("\n");
  
  const imports = new Set<string>();
  const requires = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    const importMatch = line.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/);
    if (importMatch) {
      const moduleName = importMatch[1];
      if (!moduleName.startsWith(".") && !moduleName.startsWith("@/")) {
        const packageName = moduleName.startsWith("@") 
          ? moduleName.split("/").slice(0, 2).join("/")
          : moduleName.split("/")[0];
        imports.add(packageName);
      }
    }
    
    const requireMatch = line.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (requireMatch) {
      const moduleName = requireMatch[1];
      if (!moduleName.startsWith(".")) {
        const packageName = moduleName.startsWith("@")
          ? moduleName.split("/").slice(0, 2).join("/")
          : moduleName.split("/")[0];
        requires.add(packageName);
      }
    }
    
    if (line.includes("console.log") && !line.includes("//")) {
      errors.push({
        file: filePath,
        line: lineNum,
        column: line.indexOf("console.log"),
        message: "console.log encontrado - considere remover antes de produção",
        severity: "warning",
        suggestion: "Remova logs de debug antes de publicar."
      });
    }
    
    if (/var\s+\w+/.test(line)) {
      errors.push({
        file: filePath,
        line: lineNum,
        column: line.indexOf("var"),
        message: "Uso de 'var' - prefira 'const' ou 'let'",
        severity: "info",
        suggestion: "Use 'const' para valores que nao mudam e 'let' para variaveis."
      });
    }
    
    if (/==(?!=)/.test(line) && !line.includes("===")) {
      errors.push({
        file: filePath,
        line: lineNum,
        column: line.indexOf("=="),
        message: "Uso de '==' - prefira '===' para comparacao estrita",
        severity: "warning",
        suggestion: "Use '===' para evitar conversao de tipo implicita."
      });
    }
  }
  
  return errors;
}

export function analyzePythonFile(content: string, filePath: string): DiagnosticError[] {
  const errors: DiagnosticError[] = [];
  const lines = content.split("\n");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    if (line.includes("print(") && !line.trim().startsWith("#")) {
      errors.push({
        file: filePath,
        line: lineNum,
        column: line.indexOf("print("),
        message: "print() encontrado - considere usar logging",
        severity: "info",
        suggestion: "Use o modulo logging para melhor controle de output."
      });
    }
    
    if (/except:/.test(line) && !line.includes("except Exception")) {
      errors.push({
        file: filePath,
        line: lineNum,
        column: line.indexOf("except"),
        message: "except generico - capture excecoes especificas",
        severity: "warning",
        suggestion: "Capture excecoes especificas como 'except ValueError:'"
      });
    }
  }
  
  return errors;
}

export async function getProjectDiagnostics(projectId: number): Promise<FileDiagnostics[]> {
  const fileInfos = await workspaceService.listFiles(projectId);
  const diagnostics: FileDiagnostics[] = [];
  
  const codeExtensions = [".js", ".jsx", ".ts", ".tsx", ".py"];
  const codeFiles = fileInfos.filter(f => 
    f.type === 'file' && codeExtensions.some(ext => f.path.endsWith(ext))
  );
  
  for (const fileInfo of codeFiles) {
    try {
      const content = await workspaceService.readFile(projectId, fileInfo.path);
      let fileErrors: DiagnosticError[] = [];
      
      if (fileInfo.path.endsWith(".js") || fileInfo.path.endsWith(".jsx") || 
          fileInfo.path.endsWith(".ts") || fileInfo.path.endsWith(".tsx")) {
        fileErrors = analyzeJavaScriptFile(content, fileInfo.path);
      } else if (fileInfo.path.endsWith(".py")) {
        fileErrors = analyzePythonFile(content, fileInfo.path);
      }
      
      if (fileErrors.length > 0) {
        diagnostics.push({
          file: fileInfo.path,
          errors: fileErrors.filter(e => e.severity === "error"),
          warnings: fileErrors.filter(e => e.severity === "warning" || e.severity === "info")
        });
      }
    } catch (error) {
      console.error(`Error reading file ${fileInfo.path}:`, error);
    }
  }
  
  return diagnostics;
}

export function generateErrorReport(errors: DiagnosticError[]): string {
  if (errors.length === 0) {
    return "Nenhum erro encontrado.";
  }
  
  let report = `## Diagnostico do Projeto\n\n`;
  report += `Encontrados ${errors.length} problemas:\n\n`;
  
  const grouped = errors.reduce((acc, err) => {
    if (!acc[err.file]) acc[err.file] = [];
    acc[err.file].push(err);
    return acc;
  }, {} as Record<string, DiagnosticError[]>);
  
  for (const [file, fileErrors] of Object.entries(grouped)) {
    report += `### ${file}\n\n`;
    for (const err of fileErrors) {
      const icon = err.severity === "error" ? "[ERRO]" : err.severity === "warning" ? "[AVISO]" : "[INFO]";
      report += `- ${icon} Linha ${err.line}: ${err.message}\n`;
      if (err.suggestion) {
        report += `  Sugestao: ${err.suggestion}\n`;
      }
    }
    report += "\n";
  }
  
  return report;
}

export function extractMissingModules(errors: DiagnosticError[]): string[] {
  const modules = new Set<string>();
  
  for (const error of errors) {
    const npmMatch = error.message.match(/Cannot find module ['"]([@\w/-]+)['"]/);
    if (npmMatch) {
      const packageName = npmMatch[1].startsWith("@")
        ? npmMatch[1].split("/").slice(0, 2).join("/")
        : npmMatch[1].split("/")[0];
      modules.add(packageName);
    }
    
    const pipMatch = error.message.match(/ModuleNotFoundError: No module named ['"]([\w_]+)['"]/);
    if (pipMatch) {
      modules.add(pipMatch[1]);
    }
  }
  
  return Array.from(modules);
}
