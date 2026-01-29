import { spawn, exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

interface PackageInfo {
  name: string;
  version: string;
  description?: string;
  installed: boolean;
  isDevDependency?: boolean;
}

interface InstallResult {
  success: boolean;
  package: string;
  version?: string;
  error?: string;
  logs: string[];
}

class PackageManagerService {
  private installQueue: Map<string, Promise<InstallResult>> = new Map();

  async getInstalledPackages(projectPath: string = process.cwd()): Promise<PackageInfo[]> {
    try {
      const packageJsonPath = path.join(projectPath, "package.json");
      
      if (!fs.existsSync(packageJsonPath)) {
        return [];
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const packages: PackageInfo[] = [];

      const deps = packageJson.dependencies || {};
      for (const [name, version] of Object.entries(deps)) {
        packages.push({
          name,
          version: version as string,
          installed: true,
          isDevDependency: false,
        });
      }

      const devDeps = packageJson.devDependencies || {};
      for (const [name, version] of Object.entries(devDeps)) {
        packages.push({
          name,
          version: version as string,
          installed: true,
          isDevDependency: true,
        });
      }

      return packages.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("[PackageManager] Error reading packages:", error);
      return [];
    }
  }

  async searchPackages(query: string): Promise<PackageInfo[]> {
    try {
      const { stdout } = await execAsync(`npm search ${query} --json 2>/dev/null || echo "[]"`, {
        timeout: 10000,
      });

      const results = JSON.parse(stdout || "[]");
      
      return results.slice(0, 20).map((pkg: any) => ({
        name: pkg.name,
        version: pkg.version || "latest",
        description: pkg.description,
        installed: false,
      }));
    } catch (error) {
      console.error("[PackageManager] Search error:", error);
      
      return this.getSuggestedPackages(query);
    }
  }

  private getSuggestedPackages(query: string): PackageInfo[] {
    const allPackages: PackageInfo[] = [
      { name: "express", version: "latest", description: "Web framework for Node.js", installed: false },
      { name: "react", version: "latest", description: "Library for building UIs", installed: false },
      { name: "typescript", version: "latest", description: "TypeScript compiler", installed: false },
      { name: "axios", version: "latest", description: "HTTP client", installed: false },
      { name: "lodash", version: "latest", description: "Utility library", installed: false },
      { name: "dayjs", version: "latest", description: "Date library", installed: false },
      { name: "zod", version: "latest", description: "Schema validation", installed: false },
      { name: "prisma", version: "latest", description: "Database ORM", installed: false },
      { name: "drizzle-orm", version: "latest", description: "TypeScript ORM", installed: false },
      { name: "tailwindcss", version: "latest", description: "CSS framework", installed: false },
      { name: "socket.io", version: "latest", description: "Real-time communication", installed: false },
      { name: "jsonwebtoken", version: "latest", description: "JWT authentication", installed: false },
      { name: "bcrypt", version: "latest", description: "Password hashing", installed: false },
      { name: "puppeteer", version: "latest", description: "Browser automation", installed: false },
      { name: "sharp", version: "latest", description: "Image processing", installed: false },
    ];

    const q = query.toLowerCase();
    return allPackages.filter(p => 
      p.name.includes(q) || (p.description?.toLowerCase().includes(q))
    );
  }

  async installPackage(
    packageName: string,
    options: { dev?: boolean; version?: string; projectPath?: string } = {}
  ): Promise<InstallResult> {
    const cacheKey = `${packageName}@${options.version || "latest"}`;
    
    const existing = this.installQueue.get(cacheKey);
    if (existing) return existing;

    const installPromise = this.doInstall(packageName, options);
    this.installQueue.set(cacheKey, installPromise);

    try {
      return await installPromise;
    } finally {
      this.installQueue.delete(cacheKey);
    }
  }

  private async doInstall(
    packageName: string,
    options: { dev?: boolean; version?: string; projectPath?: string }
  ): Promise<InstallResult> {
    const logs: string[] = [];
    const projectPath = options.projectPath || process.cwd();
    const versionSpec = options.version ? `@${options.version}` : "";
    const devFlag = options.dev ? " --save-dev" : "";

    logs.push(`Instalando ${packageName}${versionSpec}...`);

    try {
      const command = `npm install ${packageName}${versionSpec}${devFlag}`;
      logs.push(`Executando: ${command}`);

      const { stdout, stderr } = await execAsync(command, {
        cwd: projectPath,
        timeout: 120000,
      });

      if (stdout) logs.push(stdout);
      if (stderr && !stderr.includes("npm WARN")) logs.push(stderr);

      const versionMatch = stdout.match(/\+ ([^@]+)@([\d.]+)/);
      
      logs.push(`Pacote ${packageName} instalado com sucesso!`);

      return {
        success: true,
        package: packageName,
        version: versionMatch?.[2] || options.version || "latest",
        logs,
      };
    } catch (error: any) {
      logs.push(`Erro: ${error.message}`);
      
      return {
        success: false,
        package: packageName,
        error: error.message,
        logs,
      };
    }
  }

  async uninstallPackage(
    packageName: string,
    projectPath: string = process.cwd()
  ): Promise<InstallResult> {
    const logs: string[] = [];
    
    logs.push(`Removendo ${packageName}...`);

    try {
      const { stdout, stderr } = await execAsync(`npm uninstall ${packageName}`, {
        cwd: projectPath,
        timeout: 60000,
      });

      if (stdout) logs.push(stdout);
      if (stderr) logs.push(stderr);

      logs.push(`Pacote ${packageName} removido com sucesso!`);

      return {
        success: true,
        package: packageName,
        logs,
      };
    } catch (error: any) {
      logs.push(`Erro: ${error.message}`);
      
      return {
        success: false,
        package: packageName,
        error: error.message,
        logs,
      };
    }
  }

  async updatePackage(
    packageName: string,
    projectPath: string = process.cwd()
  ): Promise<InstallResult> {
    return this.installPackage(packageName, { projectPath, version: "latest" });
  }

  async getOutdatedPackages(projectPath: string = process.cwd()): Promise<{
    name: string;
    current: string;
    wanted: string;
    latest: string;
  }[]> {
    try {
      const { stdout } = await execAsync("npm outdated --json", {
        cwd: projectPath,
        timeout: 30000,
      });

      const outdated = JSON.parse(stdout || "{}");
      
      return Object.entries(outdated).map(([name, info]: [string, any]) => ({
        name,
        current: info.current,
        wanted: info.wanted,
        latest: info.latest,
      }));
    } catch (error) {
      return [];
    }
  }

  async runNpmScript(
    scriptName: string,
    projectPath: string = process.cwd()
  ): Promise<{ success: boolean; output: string; error?: string }> {
    try {
      const { stdout, stderr } = await execAsync(`npm run ${scriptName}`, {
        cwd: projectPath,
        timeout: 300000,
      });

      return {
        success: true,
        output: stdout + (stderr ? `\n${stderr}` : ""),
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || "",
        error: error.message,
      };
    }
  }
}

export const packageManagerService = new PackageManagerService();
