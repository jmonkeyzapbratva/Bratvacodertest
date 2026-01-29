import * as fs from "fs";
import * as path from "path";
import { workspaceService } from "./workspaceService";

export interface EnvVariable {
  key: string;
  value: string;
  isSecret?: boolean;
}

const projectSecrets = new Map<number, Map<string, string>>();

export function getProjectEnvPath(projectId: number): string {
  const workspacePath = workspaceService.getWorkspacePath(projectId);
  return path.join(workspacePath, ".env");
}

export async function readEnvFile(projectId: number): Promise<EnvVariable[]> {
  const envPath = getProjectEnvPath(projectId);
  
  if (!fs.existsSync(envPath)) {
    return [];
  }
  
  const content = fs.readFileSync(envPath, "utf-8");
  const variables: EnvVariable[] = [];
  
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        let value = match[2];
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        variables.push({
          key: match[1],
          value: value,
          isSecret: isSensitiveKey(match[1])
        });
      }
    }
  }
  
  return variables;
}

export async function writeEnvFile(projectId: number, variables: EnvVariable[]): Promise<void> {
  const envPath = getProjectEnvPath(projectId);
  
  let content = "# Environment Variables\n";
  content += "# Gerado automaticamente por BRATVACODER\n\n";
  
  for (const variable of variables) {
    const valueNeedsQuotes = variable.value.includes(" ") || 
                             variable.value.includes("=") ||
                             variable.value.includes("#");
    const quotedValue = valueNeedsQuotes ? `"${variable.value}"` : variable.value;
    content += `${variable.key}=${quotedValue}\n`;
  }
  
  const workspacePath = workspaceService.getWorkspacePath(projectId);
  if (!fs.existsSync(workspacePath)) {
    fs.mkdirSync(workspacePath, { recursive: true });
  }
  
  fs.writeFileSync(envPath, content, "utf-8");
}

export async function setEnvVariable(projectId: number, key: string, value: string): Promise<void> {
  const variables = await readEnvFile(projectId);
  const existing = variables.findIndex(v => v.key === key);
  
  if (existing >= 0) {
    variables[existing].value = value;
  } else {
    variables.push({ key, value, isSecret: isSensitiveKey(key) });
  }
  
  await writeEnvFile(projectId, variables);
}

export async function deleteEnvVariable(projectId: number, key: string): Promise<void> {
  const variables = await readEnvFile(projectId);
  const filtered = variables.filter(v => v.key !== key);
  await writeEnvFile(projectId, filtered);
}

export async function setSecret(projectId: number, key: string, value: string): Promise<void> {
  if (!projectSecrets.has(projectId)) {
    projectSecrets.set(projectId, new Map());
  }
  projectSecrets.get(projectId)!.set(key, value);
  
  await setEnvVariable(projectId, key, value);
}

export async function getSecrets(projectId: number): Promise<Array<{ key: string; masked: string }>> {
  const secrets = projectSecrets.get(projectId);
  if (!secrets) return [];
  
  return Array.from(secrets.entries()).map(([key, value]) => ({
    key,
    masked: maskValue(value)
  }));
}

export async function deleteSecret(projectId: number, key: string): Promise<void> {
  const secrets = projectSecrets.get(projectId);
  if (secrets) {
    secrets.delete(key);
  }
  await deleteEnvVariable(projectId, key);
}

function maskValue(value: string): string {
  if (value.length <= 4) {
    return "*".repeat(value.length);
  }
  return value.slice(0, 2) + "*".repeat(value.length - 4) + value.slice(-2);
}

function isSensitiveKey(key: string): boolean {
  const sensitivePatterns = [
    /SECRET/i,
    /PASSWORD/i,
    /KEY/i,
    /TOKEN/i,
    /API/i,
    /AUTH/i,
    /PRIVATE/i,
    /CREDENTIAL/i,
  ];
  return sensitivePatterns.some(p => p.test(key));
}

export async function getEnvForExecution(projectId: number): Promise<Record<string, string>> {
  const variables = await readEnvFile(projectId);
  const secrets = projectSecrets.get(projectId);
  
  const env: Record<string, string> = {};
  
  for (const variable of variables) {
    env[variable.key] = variable.value;
  }
  
  if (secrets) {
    secrets.forEach((value, key) => {
      env[key] = value;
    });
  }
  
  return env;
}

export async function detectRequiredEnvVars(projectId: number): Promise<string[]> {
  const fileInfos = await workspaceService.listFiles(projectId);
  const required = new Set<string>();
  
  const codeFiles = fileInfos.filter(f => 
    f.type === "file" && 
    (f.path.endsWith(".js") || f.path.endsWith(".ts") || 
     f.path.endsWith(".jsx") || f.path.endsWith(".tsx") ||
     f.path.endsWith(".py"))
  );
  
  for (const file of codeFiles.slice(0, 20)) {
    try {
      const content = await workspaceService.readFile(projectId, file.path);
      
      let match: RegExpExecArray | null;
      
      const jsEnvRegex = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
      while ((match = jsEnvRegex.exec(content)) !== null) {
        required.add(match[1]);
      }
      
      const viteEnvRegex = /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g;
      while ((match = viteEnvRegex.exec(content)) !== null) {
        required.add(match[1]);
      }
      
      const pyEnvRegex = /os\.(?:environ|getenv)\s*\[\s*["']([A-Z_][A-Z0-9_]*)["']\s*\]/g;
      while ((match = pyEnvRegex.exec(content)) !== null) {
        required.add(match[1]);
      }
      
      const pyGetenvRegex = /os\.getenv\s*\(\s*["']([A-Z_][A-Z0-9_]*)["']/g;
      while ((match = pyGetenvRegex.exec(content)) !== null) {
        required.add(match[1]);
      }
    } catch {}
  }
  
  return Array.from(required);
}

export async function getMissingEnvVars(projectId: number): Promise<string[]> {
  const required = await detectRequiredEnvVars(projectId);
  const existing = await readEnvFile(projectId);
  const existingKeys = new Set(existing.map(v => v.key));
  
  return required.filter(key => !existingKeys.has(key));
}
