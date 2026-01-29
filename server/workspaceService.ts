import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

const WORKSPACES_DIR = path.join(process.cwd(), 'workspaces');

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileInfo[];
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
}

export interface WorkspaceProcess {
  process: ChildProcess;
  port: number;
  command: string;
}

class WorkspaceService extends EventEmitter {
  private runningProcesses: Map<number, WorkspaceProcess> = new Map();
  private nextPort = 3001;

  constructor() {
    super();
    this.ensureWorkspacesDir();
  }

  private ensureWorkspacesDir(): void {
    if (!fs.existsSync(WORKSPACES_DIR)) {
      fs.mkdirSync(WORKSPACES_DIR, { recursive: true });
    }
  }

  getWorkspacePath(projectId: number): string {
    return path.join(WORKSPACES_DIR, `project-${projectId}`);
  }

  async initWorkspace(projectId: number): Promise<string> {
    const workspacePath = this.getWorkspacePath(projectId);
    
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true });
    }
    
    return workspacePath;
  }

  async createFile(projectId: number, filePath: string, content: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(projectId);
    const fullPath = path.join(workspacePath, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf-8');
    this.emit('fileCreated', { projectId, filePath, content });
  }

  async readFile(projectId: number, filePath: string): Promise<string> {
    const workspacePath = this.getWorkspacePath(projectId);
    const fullPath = path.join(workspacePath, filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    return fs.readFileSync(fullPath, 'utf-8');
  }

  async updateFile(projectId: number, filePath: string, content: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(projectId);
    const fullPath = path.join(workspacePath, filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    fs.writeFileSync(fullPath, content, 'utf-8');
    this.emit('fileUpdated', { projectId, filePath, content });
  }

  async deleteFile(projectId: number, filePath: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(projectId);
    const fullPath = path.join(workspacePath, filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    this.emit('fileDeleted', { projectId, filePath });
  }

  async createDirectory(projectId: number, dirPath: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(projectId);
    const fullPath = path.join(workspacePath, dirPath);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    this.emit('directoryCreated', { projectId, dirPath });
  }

  async listFiles(projectId: number, subPath: string = ''): Promise<FileInfo[]> {
    const workspacePath = this.getWorkspacePath(projectId);
    const targetPath = path.join(workspacePath, subPath);
    
    if (!fs.existsSync(targetPath)) {
      return [];
    }
    
    const items = fs.readdirSync(targetPath, { withFileTypes: true });
    const files: FileInfo[] = [];
    
    for (const item of items) {
      if (item.name.startsWith('.') || item.name === 'node_modules') {
        continue;
      }
      
      const itemPath = path.join(subPath, item.name);
      const fullItemPath = path.join(targetPath, item.name);
      
      if (item.isDirectory()) {
        const children = await this.listFiles(projectId, itemPath);
        files.push({
          name: item.name,
          path: itemPath,
          type: 'directory',
          children,
        });
      } else {
        const stat = fs.statSync(fullItemPath);
        files.push({
          name: item.name,
          path: itemPath,
          type: 'file',
          size: stat.size,
        });
      }
    }
    
    return files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  async clearAndRestoreWorkspace(projectId: number, filesSnapshot: Record<string, string>): Promise<void> {
    const workspacePath = this.getWorkspacePath(projectId);
    
    const runningProcess = this.runningProcesses.get(projectId);
    if (runningProcess) {
      try {
        await this.stopProcess(projectId);
      } catch (e) {
        console.log(`[Workspace] Could not stop process for project ${projectId}`);
      }
    }
    
    const existingFiles: string[] = [];
    if (fs.existsSync(workspacePath)) {
      const collectFiles = (dir: string, base: string = '') => {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.name === 'node_modules' || item.name === '.git') continue;
          const fullPath = path.join(dir, item.name);
          const relPath = base ? `${base}/${item.name}` : item.name;
          if (item.isDirectory()) {
            collectFiles(fullPath, relPath);
          } else {
            existingFiles.push(relPath);
          }
        }
      };
      collectFiles(workspacePath);
      
      const failedOps: string[] = [];
      for (const file of existingFiles) {
        if (!filesSnapshot[file]) {
          const fullPath = path.join(workspacePath, file);
          try {
            fs.unlinkSync(fullPath);
            this.emit('fileDeleted', { projectId, filePath: file });
          } catch (e: any) {
            failedOps.push(`delete:${file}:${e.message}`);
          }
        }
      }
      if (failedOps.length > 0) {
        throw new Error(`Falha ao deletar arquivos: ${failedOps.join(', ')}`);
      }
    } else {
      fs.mkdirSync(workspacePath, { recursive: true });
    }
    
    for (const [filePath, content] of Object.entries(filesSnapshot)) {
      const fullPath = path.join(workspacePath, filePath);
      const dir = path.dirname(fullPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const existed = fs.existsSync(fullPath);
      fs.writeFileSync(fullPath, content, 'utf-8');
      
      if (existed) {
        this.emit('fileUpdated', { projectId, filePath, content });
      } else {
        this.emit('fileCreated', { projectId, filePath, content });
      }
    }
    
    this.emit('workspaceRestored', { projectId, filesCount: Object.keys(filesSnapshot).length });
  }

  async runCommand(
    projectId: number, 
    command: string, 
    onOutput?: (data: string) => void
  ): Promise<CommandResult> {
    return this.runCommandWithStreams(projectId, command, onOutput, onOutput);
  }

  async runCommandWithStreams(
    projectId: number, 
    command: string, 
    onStdout?: (data: string) => void,
    onStderr?: (data: string) => void
  ): Promise<CommandResult> {
    const workspacePath = this.getWorkspacePath(projectId);
    
    if (!fs.existsSync(workspacePath)) {
      await this.initWorkspace(projectId);
    }
    
    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(' ');
      
      const proc = spawn(cmd, args, {
        cwd: workspacePath,
        shell: true,
        env: { ...process.env, FORCE_COLOR: '1' },
      });
      
      let output = '';
      let error = '';
      
      proc.stdout.on('data', (data) => {
        const str = data.toString();
        output += str;
        onStdout?.(str);
        this.emit('commandOutput', { projectId, command, output: str });
      });
      
      proc.stderr.on('data', (data) => {
        const str = data.toString();
        error += str;
        onStderr?.(str);
        this.emit('commandError', { projectId, command, error: str });
      });
      
      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          output,
          error: error || undefined,
          exitCode: code ?? 1,
        });
        this.emit('commandComplete', { projectId, command, exitCode: code });
      });
      
      proc.on('error', (err) => {
        resolve({
          success: false,
          output,
          error: err.message,
          exitCode: 1,
        });
      });
    });
  }

  async startDevServer(projectId: number): Promise<{ port: number; url: string }> {
    const existingProcess = this.runningProcesses.get(projectId);
    if (existingProcess) {
      return { port: existingProcess.port, url: `http://localhost:${existingProcess.port}` };
    }
    
    const workspacePath = this.getWorkspacePath(projectId);
    const port = this.nextPort++;
    
    const packageJsonPath = path.join(workspacePath, 'package.json');
    let command = 'npx serve -l ' + port;
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (packageJson.scripts?.dev) {
        command = `PORT=${port} npm run dev`;
      } else if (packageJson.scripts?.start) {
        command = `PORT=${port} npm start`;
      }
    }
    
    const [cmd, ...args] = command.split(' ');
    
    const proc = spawn(cmd, args, {
      cwd: workspacePath,
      shell: true,
      env: { ...process.env, PORT: String(port) },
      detached: false,
    });
    
    this.runningProcesses.set(projectId, { process: proc, port, command });
    
    proc.stdout.on('data', (data) => {
      this.emit('serverOutput', { projectId, output: data.toString() });
    });
    
    proc.stderr.on('data', (data) => {
      this.emit('serverError', { projectId, error: data.toString() });
    });
    
    proc.on('close', () => {
      this.runningProcesses.delete(projectId);
      this.emit('serverStopped', { projectId });
    });
    
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    return { port, url: `http://localhost:${port}` };
  }

  async stopDevServer(projectId: number): Promise<void> {
    const proc = this.runningProcesses.get(projectId);
    if (proc) {
      proc.process.kill();
      this.runningProcesses.delete(projectId);
    }
  }

  async installDependencies(
    projectId: number, 
    packages: string[] = [],
    onOutput?: (data: string) => void
  ): Promise<CommandResult> {
    const cmd = packages.length > 0 
      ? `npm install ${packages.join(' ')}`
      : 'npm install';
    
    return this.runCommand(projectId, cmd, onOutput);
  }

  async detectImports(projectId: number): Promise<string[]> {
    const workspacePath = this.getWorkspacePath(projectId);
    const imports = new Set<string>();
    
    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        if (item.name === 'node_modules' || item.name.startsWith('.')) continue;
        
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(js|ts|jsx|tsx)$/.test(item.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          const importRegex = /(?:import|require)\s*\(?['"]([^'"./][^'"]*)['"]\)?/g;
          let match;
          while ((match = importRegex.exec(content)) !== null) {
            const pkg = match[1].split('/')[0];
            if (pkg.startsWith('@')) {
              imports.add(match[1].split('/').slice(0, 2).join('/'));
            } else {
              imports.add(pkg);
            }
          }
        }
      }
    };
    
    scanDir(workspacePath);
    
    const builtins = ['fs', 'path', 'http', 'https', 'crypto', 'os', 'util', 'events', 'stream', 'child_process'];
    return Array.from(imports).filter(pkg => !builtins.includes(pkg));
  }

  async createProjectFromTemplate(projectId: number, template: string): Promise<void> {
    await this.initWorkspace(projectId);
    
    const templates: Record<string, Record<string, string>> = {
      'react': {
        'package.json': JSON.stringify({
          name: `project-${projectId}`,
          version: '1.0.0',
          type: 'module',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview'
          },
          dependencies: {
            react: '^18.2.0',
            'react-dom': '^18.2.0'
          },
          devDependencies: {
            vite: '^5.0.0',
            '@vitejs/plugin-react': '^4.0.0'
          }
        }, null, 2),
        'index.html': `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meu Projeto React</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`,
        'src/main.jsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
        'src/App.jsx': `import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Olá, Mundo!</h1>
      <p>Contador: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Incrementar
      </button>
    </div>
  )
}

export default App`,
        'src/index.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
}`,
        'vite.config.js': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 3000
  }
})`
      },
      'node': {
        'package.json': JSON.stringify({
          name: `project-${projectId}`,
          version: '1.0.0',
          type: 'module',
          scripts: {
            start: 'node index.js',
            dev: 'node --watch index.js'
          },
          dependencies: {
            express: '^4.18.2'
          }
        }, null, 2),
        'index.js': `import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Olá do BRATVACODER!' });
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Servidor rodando em http://localhost:\${PORT}\`);
});`
      },
      'html': {
        'index.html': `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meu Site</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <nav>
      <h1>Meu Site</h1>
    </nav>
  </header>
  
  <main>
    <section class="hero">
      <h2>Bem-vindo!</h2>
      <p>Este é um site criado com BRATVACODER.</p>
    </section>
  </main>
  
  <footer>
    <p>&copy; 2024 - Criado com BRATVACODER</p>
  </footer>
  
  <script src="script.js"></script>
</body>
</html>`,
        'style.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
}

header {
  background: #2563eb;
  color: white;
  padding: 1rem 2rem;
}

main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.hero {
  text-align: center;
  padding: 4rem 0;
}

.hero h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

footer {
  background: #1f2937;
  color: white;
  text-align: center;
  padding: 1rem;
  margin-top: 4rem;
}`,
        'script.js': `console.log('Site carregado com sucesso!');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM pronto!');
});`
      }
    };
    
    const templateFiles = templates[template] || templates['html'];
    
    for (const [filePath, content] of Object.entries(templateFiles)) {
      await this.createFile(projectId, filePath, content);
    }
  }

  getProjectStats(projectId: number): { fileCount: number; totalSize: number } {
    const workspacePath = this.getWorkspacePath(projectId);
    let fileCount = 0;
    let totalSize = 0;
    
    const countFiles = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        if (item.name === 'node_modules' || item.name.startsWith('.')) continue;
        
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          countFiles(fullPath);
        } else {
          fileCount++;
          totalSize += fs.statSync(fullPath).size;
        }
      }
    };
    
    countFiles(workspacePath);
    
    return { fileCount, totalSize };
  }

  // Logs storage per project
  private processLogs: Map<number, string[]> = new Map();

  async deleteWorkspace(projectId: number): Promise<void> {
    const workspacePath = this.getWorkspacePath(projectId);
    
    // Stop any running process first
    await this.stopProcess(projectId);
    
    if (fs.existsSync(workspacePath)) {
      fs.rmSync(workspacePath, { recursive: true, force: true });
    }
    
    this.processLogs.delete(projectId);
    this.emit('workspaceDeleted', { projectId });
  }

  async startProcess(projectId: number, command: string): Promise<{ port: number; url: string }> {
    const existingProcess = this.runningProcesses.get(projectId);
    if (existingProcess) {
      return { port: existingProcess.port, url: `http://localhost:${existingProcess.port}` };
    }
    
    const workspacePath = this.getWorkspacePath(projectId);
    
    if (!fs.existsSync(workspacePath)) {
      await this.initWorkspace(projectId);
    }
    
    const port = this.nextPort++;
    
    // Initialize logs array
    this.processLogs.set(projectId, []);
    
    const [cmd, ...args] = command.split(' ');
    
    const proc = spawn(cmd, args, {
      cwd: workspacePath,
      shell: true,
      env: { ...process.env, PORT: String(port), FORCE_COLOR: '1' },
      detached: false,
    });
    
    this.runningProcesses.set(projectId, { process: proc, port, command });
    
    proc.stdout.on('data', (data) => {
      const str = data.toString();
      const logs = this.processLogs.get(projectId) || [];
      logs.push(str);
      if (logs.length > 1000) logs.shift(); // Keep last 1000 lines
      this.processLogs.set(projectId, logs);
      this.emit('processOutput', { projectId, output: str });
    });
    
    proc.stderr.on('data', (data) => {
      const str = data.toString();
      const logs = this.processLogs.get(projectId) || [];
      logs.push(`[stderr] ${str}`);
      if (logs.length > 1000) logs.shift();
      this.processLogs.set(projectId, logs);
      this.emit('processError', { projectId, error: str });
    });
    
    proc.on('close', (code) => {
      this.runningProcesses.delete(projectId);
      const logs = this.processLogs.get(projectId) || [];
      logs.push(`[process] Exited with code ${code}`);
      this.processLogs.set(projectId, logs);
      this.emit('processStopped', { projectId, exitCode: code });
    });
    
    // Wait a bit for process to start
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    return { port, url: `http://localhost:${port}` };
  }

  async stopProcess(projectId: number): Promise<void> {
    const proc = this.runningProcesses.get(projectId);
    if (proc) {
      proc.process.kill('SIGTERM');
      this.runningProcesses.delete(projectId);
      
      const logs = this.processLogs.get(projectId) || [];
      logs.push('[process] Stopped');
      this.processLogs.set(projectId, logs);
      
      this.emit('processStopped', { projectId });
    }
  }

  getProcessLogs(projectId: number): string {
    const logs = this.processLogs.get(projectId) || [];
    return logs.join('');
  }

  async executeCommand(projectId: number, command: string): Promise<CommandResult> {
    return this.runCommand(projectId, command);
  }

  isProcessRunning(projectId: number): boolean {
    return this.runningProcesses.has(projectId);
  }

  getRunningPort(projectId: number): number | null {
    const proc = this.runningProcesses.get(projectId);
    return proc ? proc.port : null;
  }
}

export const workspaceService = new WorkspaceService();
