import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const WORKSPACES_DIR = path.join(process.cwd(), 'workspaces');

export interface PackageInfo {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency';
}

export interface InstallResult {
  success: boolean;
  installedPackages: string[];
  error?: string;
}

function getWorkspacePath(projectId: number): string {
  return path.join(WORKSPACES_DIR, `project-${projectId}`);
}

async function runCommand(cwd: string, command: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code || 0 });
    });
    
    proc.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message, exitCode: 1 });
    });
  });
}

export function detectProjectType(projectId: number): 'node' | 'python' | 'unknown' {
  const workspacePath = getWorkspacePath(projectId);
  
  if (fs.existsSync(path.join(workspacePath, 'package.json'))) {
    return 'node';
  }
  
  if (fs.existsSync(path.join(workspacePath, 'requirements.txt')) ||
      fs.existsSync(path.join(workspacePath, 'pyproject.toml'))) {
    return 'python';
  }
  
  const files = fs.existsSync(workspacePath) ? fs.readdirSync(workspacePath) : [];
  if (files.some(f => f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.tsx'))) {
    return 'node';
  }
  if (files.some(f => f.endsWith('.py'))) {
    return 'python';
  }
  
  return 'unknown';
}

export function extractImportsFromCode(code: string, language: 'javascript' | 'python'): string[] {
  const imports: Set<string> = new Set();
  
  if (language === 'javascript') {
    const requireRegex = /require\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\)/g;
    const importRegex = /import\s+(?:(?:\{[^}]*\}|[\w*]+(?:\s*,\s*\{[^}]*\})?)\s+from\s+)?['"]([^'"./][^'"]*)['"]/g;
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"./][^'"]*)['"]\s*\)/g;
    
    let match;
    while ((match = requireRegex.exec(code)) !== null) {
      imports.add(match[1].split('/')[0]);
    }
    while ((match = importRegex.exec(code)) !== null) {
      imports.add(match[1].split('/')[0]);
    }
    while ((match = dynamicImportRegex.exec(code)) !== null) {
      imports.add(match[1].split('/')[0]);
    }
    
    const builtins = new Set([
      'fs', 'path', 'http', 'https', 'url', 'querystring', 'stream', 'buffer',
      'crypto', 'util', 'events', 'os', 'child_process', 'cluster', 'worker_threads',
      'net', 'dns', 'tls', 'assert', 'console', 'process', 'readline', 'zlib',
      'string_decoder', 'timers', 'vm', 'module', 'perf_hooks', 'async_hooks',
    ]);
    
    return Array.from(imports).filter(pkg => !builtins.has(pkg) && !pkg.startsWith('@types/'));
  }
  
  if (language === 'python') {
    const importRegex = /^(?:from\s+(\w+)|import\s+(\w+))/gm;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const pkg = match[1] || match[2];
      imports.add(pkg);
    }
    
    const builtins = new Set([
      'os', 'sys', 'json', 'time', 'datetime', 're', 'math', 'random', 'collections',
      'itertools', 'functools', 'operator', 'string', 'io', 'pathlib', 'typing',
      'abc', 'contextlib', 'copy', 'enum', 'gc', 'inspect', 'logging', 'pickle',
      'pprint', 'shutil', 'subprocess', 'tempfile', 'threading', 'multiprocessing',
      'socket', 'ssl', 'http', 'urllib', 'email', 'html', 'xml', 'sqlite3', 'csv',
      'hashlib', 'hmac', 'secrets', 'base64', 'binascii', 'struct', 'codecs',
      'unicodedata', 'locale', 'gettext', 'argparse', 'configparser', 'fileinput',
      'stat', 'glob', 'fnmatch', 'linecache', 'traceback', 'warnings', 'weakref',
      'types', 'dataclasses', 'asyncio', 'concurrent', 'queue', 'select', 'selectors',
      'signal', 'mmap', 'readline', 'rlcompleter', 'textwrap', 'difflib', 'heapq',
      'bisect', 'array', 'memoryview', 'decimal', 'fractions', 'statistics', 'cmath',
      'numbers', 'builtins', '__future__', 'importlib', 'pkgutil', 'zipimport', 'site',
    ]);
    
    return Array.from(imports).filter(pkg => !builtins.has(pkg));
  }
  
  return [];
}

export async function detectMissingPackages(projectId: number): Promise<string[]> {
  const workspacePath = getWorkspacePath(projectId);
  const projectType = detectProjectType(projectId);
  
  if (!fs.existsSync(workspacePath)) {
    return [];
  }
  
  const allImports: Set<string> = new Set();
  const installedPackages: Set<string> = new Set();
  
  const walkDir = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'venv', '__pycache__', 'dist', 'build'].includes(entry.name)) {
          walkDir(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        
        if (projectType === 'node' && ['.js', '.jsx', '.ts', '.tsx', '.mjs'].includes(ext)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          extractImportsFromCode(content, 'javascript').forEach(i => allImports.add(i));
        } else if (projectType === 'python' && ext === '.py') {
          const content = fs.readFileSync(fullPath, 'utf-8');
          extractImportsFromCode(content, 'python').forEach(i => allImports.add(i));
        }
      }
    }
  };
  
  walkDir(workspacePath);
  
  if (projectType === 'node') {
    const pkgJsonPath = path.join(workspacePath, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        Object.keys(pkgJson.dependencies || {}).forEach(d => installedPackages.add(d));
        Object.keys(pkgJson.devDependencies || {}).forEach(d => installedPackages.add(d));
      } catch { }
    }
  } else if (projectType === 'python') {
    const reqPath = path.join(workspacePath, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
      const content = fs.readFileSync(reqPath, 'utf-8');
      content.split('\n')
        .map(l => l.trim().split(/[=<>!~\[]/)[0])
        .filter(l => l && !l.startsWith('#'))
        .forEach(p => installedPackages.add(p));
    }
  }
  
  return Array.from(allImports).filter(pkg => !installedPackages.has(pkg));
}

export async function installPackages(projectId: number, packages: string[], isDev: boolean = false): Promise<InstallResult> {
  const workspacePath = getWorkspacePath(projectId);
  const projectType = detectProjectType(projectId);
  
  if (packages.length === 0) {
    return { success: true, installedPackages: [] };
  }
  
  if (projectType === 'node') {
    const pkgJsonPath = path.join(workspacePath, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) {
      await runCommand(workspacePath, 'npm', ['init', '-y']);
    }
    
    const args = ['install', ...packages];
    if (isDev) args.push('--save-dev');
    
    const result = await runCommand(workspacePath, 'npm', args);
    
    if (result.exitCode !== 0) {
      return { success: false, installedPackages: [], error: result.stderr };
    }
    
    return { success: true, installedPackages: packages };
  }
  
  if (projectType === 'python') {
    const result = await runCommand(workspacePath, 'pip', ['install', ...packages]);
    
    if (result.exitCode !== 0) {
      return { success: false, installedPackages: [], error: result.stderr };
    }
    
    const reqPath = path.join(workspacePath, 'requirements.txt');
    let existingReqs = '';
    if (fs.existsSync(reqPath)) {
      existingReqs = fs.readFileSync(reqPath, 'utf-8');
    }
    
    const newReqs = packages.filter(p => !existingReqs.includes(p)).join('\n');
    if (newReqs) {
      fs.appendFileSync(reqPath, (existingReqs ? '\n' : '') + newReqs);
    }
    
    return { success: true, installedPackages: packages };
  }
  
  return { success: false, installedPackages: [], error: 'Unknown project type' };
}

export async function removePackage(projectId: number, packageName: string): Promise<{ success: boolean; error?: string }> {
  const workspacePath = getWorkspacePath(projectId);
  const projectType = detectProjectType(projectId);
  
  if (projectType === 'node') {
    const result = await runCommand(workspacePath, 'npm', ['uninstall', packageName]);
    return { success: result.exitCode === 0, error: result.stderr };
  }
  
  if (projectType === 'python') {
    const result = await runCommand(workspacePath, 'pip', ['uninstall', '-y', packageName]);
    
    const reqPath = path.join(workspacePath, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
      const content = fs.readFileSync(reqPath, 'utf-8');
      const newContent = content
        .split('\n')
        .filter(l => !l.startsWith(packageName))
        .join('\n');
      fs.writeFileSync(reqPath, newContent);
    }
    
    return { success: result.exitCode === 0, error: result.stderr };
  }
  
  return { success: false, error: 'Unknown project type' };
}

export async function listInstalledPackages(projectId: number): Promise<PackageInfo[]> {
  const workspacePath = getWorkspacePath(projectId);
  const projectType = detectProjectType(projectId);
  const packages: PackageInfo[] = [];
  
  if (projectType === 'node') {
    const pkgJsonPath = path.join(workspacePath, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
        
        for (const [name, version] of Object.entries(pkgJson.dependencies || {})) {
          packages.push({ name, version: version as string, type: 'dependency' });
        }
        
        for (const [name, version] of Object.entries(pkgJson.devDependencies || {})) {
          packages.push({ name, version: version as string, type: 'devDependency' });
        }
      } catch { }
    }
  } else if (projectType === 'python') {
    const reqPath = path.join(workspacePath, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
      const content = fs.readFileSync(reqPath, 'utf-8');
      content.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .forEach(line => {
          const match = line.match(/^([a-zA-Z0-9_-]+)(?:([=<>!~]+)(.+))?/);
          if (match) {
            packages.push({
              name: match[1],
              version: match[3] || 'latest',
              type: 'dependency',
            });
          }
        });
    }
  }
  
  return packages;
}

export async function autoInstallMissing(projectId: number): Promise<InstallResult> {
  const missing = await detectMissingPackages(projectId);
  
  if (missing.length === 0) {
    return { success: true, installedPackages: [] };
  }
  
  return installPackages(projectId, missing);
}
