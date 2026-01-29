import { WebContainer } from "@webcontainer/api";

export interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

type OutputCallback = (data: string) => void;
type ServerReadyCallback = (port: number, url: string) => void;

class WebContainerService {
  private instance: WebContainer | null = null;
  private isBooting = false;
  private bootPromise: Promise<WebContainer> | null = null;
  private currentProcess: any = null;
  private outputCallbacks: Set<OutputCallback> = new Set();
  private serverReadyCallbacks: Set<ServerReadyCallback> = new Set();

  async boot(): Promise<WebContainer> {
    if (this.instance) {
      return this.instance;
    }

    if (this.isBooting && this.bootPromise) {
      return this.bootPromise;
    }

    this.isBooting = true;
    this.bootPromise = this.initContainer();
    
    try {
      this.instance = await this.bootPromise;
      return this.instance;
    } finally {
      this.isBooting = false;
    }
  }

  private async initContainer(): Promise<WebContainer> {
    console.log("[WebContainer] Iniciando boot...");
    
    const container = await WebContainer.boot({ coep: "credentialless" });
    
    container.on("server-ready", (port: number, url: string) => {
      console.log(`[WebContainer] Server ready on port ${port}: ${url}`);
      this.serverReadyCallbacks.forEach((cb) => cb(port, url));
    });

    console.log("[WebContainer] Boot completo!");
    return container;
  }

  async mountFiles(files: ProjectFile[]): Promise<void> {
    if (!this.instance) {
      await this.boot();
    }

    if (!this.instance) {
      throw new Error("WebContainer não inicializado");
    }

    console.log(`[WebContainer] Montando ${files.length} arquivos...`);

    const fileTree: Record<string, any> = {};

    for (const file of files) {
      const parts = file.path.split("/");
      let current = fileTree;

      for (let i = 0; i < parts.length - 1; i++) {
        const dir = parts[i];
        if (!current[dir]) {
          current[dir] = { directory: {} };
        }
        current = current[dir].directory;
      }

      const fileName = parts[parts.length - 1];
      current[fileName] = {
        file: {
          contents: file.content,
        },
      };
    }

    await this.instance.mount(fileTree);
    console.log("[WebContainer] Arquivos montados!");
  }

  async runCommand(command: string, args: string[] = []): Promise<number> {
    if (!this.instance) {
      await this.boot();
    }

    if (!this.instance) {
      throw new Error("WebContainer não inicializado");
    }

    this.emit(`\r\n\x1b[36m$ ${command} ${args.join(" ")}\x1b[0m\r\n`);

    try {
      this.currentProcess = await this.instance.spawn(command, args);

      this.currentProcess.output.pipeTo(
        new WritableStream({
          write: (data: string) => {
            this.emit(data);
          },
        })
      );

      const exitCode = await this.currentProcess.exit;
      this.currentProcess = null;

      if (exitCode !== 0) {
        this.emit(`\r\n\x1b[31mProcesso terminou com código ${exitCode}\x1b[0m\r\n`);
      }

      return exitCode;
    } catch (error: any) {
      this.emit(`\r\n\x1b[31mErro: ${error.message}\x1b[0m\r\n`);
      throw error;
    }
  }

  async installDependencies(): Promise<void> {
    this.emit("\r\n\x1b[33mInstalando dependências...\x1b[0m\r\n");
    await this.runCommand("npm", ["install"]);
    this.emit("\r\n\x1b[32mDependências instaladas!\x1b[0m\r\n");
  }

  async startServer(command: string = "npm", args: string[] = ["start"]): Promise<void> {
    this.emit(`\r\n\x1b[33mIniciando servidor...\x1b[0m\r\n`);
    
    this.runCommand(command, args).catch((error) => {
      console.error("[WebContainer] Erro ao iniciar servidor:", error);
    });
  }

  async stopProcess(): Promise<void> {
    if (this.currentProcess) {
      await this.currentProcess.kill();
      this.currentProcess = null;
      this.emit("\r\n\x1b[31mProcesso encerrado\x1b[0m\r\n");
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.instance) {
      throw new Error("WebContainer não inicializado");
    }

    await this.instance.fs.writeFile(path, content);
  }

  async readFile(path: string): Promise<string> {
    if (!this.instance) {
      throw new Error("WebContainer não inicializado");
    }

    return await this.instance.fs.readFile(path, "utf-8");
  }

  async listFiles(path: string = "."): Promise<string[]> {
    if (!this.instance) {
      throw new Error("WebContainer não inicializado");
    }

    const entries = await this.instance.fs.readdir(path, { withFileTypes: true });
    return entries.map((entry: any) => 
      entry.isDirectory() ? `${entry.name}/` : entry.name
    );
  }

  addOutputCallback(callback: OutputCallback): () => void {
    this.outputCallbacks.add(callback);
    return () => this.outputCallbacks.delete(callback);
  }

  addServerReadyCallback(callback: ServerReadyCallback): () => void {
    this.serverReadyCallbacks.add(callback);
    return () => this.serverReadyCallbacks.delete(callback);
  }

  setOutputCallback(callback: OutputCallback): void {
    this.outputCallbacks.clear();
    this.outputCallbacks.add(callback);
  }

  setServerReadyCallback(callback: ServerReadyCallback): void {
    this.serverReadyCallbacks.clear();
    this.serverReadyCallbacks.add(callback);
  }

  private emit(data: string): void {
    this.outputCallbacks.forEach((cb) => cb(data));
  }

  isRunning(): boolean {
    return this.currentProcess !== null;
  }

  isReady(): boolean {
    return this.instance !== null;
  }
}

export const webcontainerService = new WebContainerService();

export function detectLanguage(files: ProjectFile[]): "node" | "python" | "static" {
  const hasPackageJson = files.some((f) => f.path === "package.json");
  const hasNodeFiles = files.some(
    (f) => f.path.endsWith(".js") || f.path.endsWith(".ts")
  );
  const hasPythonFiles = files.some((f) => f.path.endsWith(".py"));
  const hasHtmlOnly = files.every(
    (f) =>
      f.path.endsWith(".html") ||
      f.path.endsWith(".css") ||
      f.path.endsWith(".js")
  ) && !hasPackageJson;

  if (hasPythonFiles) return "python";
  if (hasHtmlOnly) return "static";
  if (hasPackageJson || hasNodeFiles) return "node";
  
  return "static";
}

export function getRunCommand(
  language: "node" | "python" | "static",
  files: ProjectFile[]
): { command: string; args: string[] } {
  switch (language) {
    case "node":
      const pkg = files.find((f) => f.path === "package.json");
      if (pkg) {
        try {
          const parsed = JSON.parse(pkg.content);
          if (parsed.scripts?.dev) return { command: "npm", args: ["run", "dev"] };
          if (parsed.scripts?.start) return { command: "npm", args: ["start"] };
        } catch {}
      }
      const mainFile = files.find(
        (f) => f.path === "index.js" || f.path === "main.js" || f.path === "app.js"
      );
      if (mainFile) return { command: "node", args: [mainFile.path] };
      return { command: "npm", args: ["start"] };

    case "python":
      const pyFile = files.find((f) => f.path.endsWith(".py"));
      return { command: "python", args: [pyFile?.path || "main.py"] };

    case "static":
      return { command: "npx", args: ["serve", "-s", ".", "-l", "3000"] };

    default:
      return { command: "npm", args: ["start"] };
  }
}
