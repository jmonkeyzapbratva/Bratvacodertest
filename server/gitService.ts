import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const WORKSPACES_DIR = path.join(process.cwd(), 'workspaces');

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  timestamp: number;
}

export interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  isRepo: boolean;
}

export interface GitDiff {
  file: string;
  additions: number;
  deletions: number;
  hunks: GitHunk[];
}

export interface GitHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: GitDiffLine[];
}

export interface GitDiffLine {
  type: 'add' | 'delete' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

function getWorkspacePath(projectId: number): string {
  return path.join(WORKSPACES_DIR, `project-${projectId}`);
}

async function runGitCommand(projectId: number, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const workspacePath = getWorkspacePath(projectId);
    
    if (!fs.existsSync(workspacePath)) {
      resolve({ stdout: '', stderr: 'Workspace not found', exitCode: 1 });
      return;
    }
    
    const git = spawn('git', args, { cwd: workspacePath });
    let stdout = '';
    let stderr = '';
    
    git.stdout.on('data', (data) => { stdout += data.toString(); });
    git.stderr.on('data', (data) => { stderr += data.toString(); });
    
    git.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code || 0 });
    });
    
    git.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message, exitCode: 1 });
    });
  });
}

export async function initGitRepo(projectId: number): Promise<boolean> {
  const workspacePath = getWorkspacePath(projectId);
  const gitDir = path.join(workspacePath, '.git');
  
  if (fs.existsSync(gitDir)) {
    return true;
  }
  
  const result = await runGitCommand(projectId, ['init']);
  if (result.exitCode === 0) {
    await runGitCommand(projectId, ['config', 'user.email', 'bratvacoder@local']);
    await runGitCommand(projectId, ['config', 'user.name', 'BratvaCoder']);
    return true;
  }
  return false;
}

export async function getGitStatus(projectId: number): Promise<GitStatus> {
  const workspacePath = getWorkspacePath(projectId);
  const gitDir = path.join(workspacePath, '.git');
  
  if (!fs.existsSync(gitDir)) {
    return {
      branch: 'main',
      staged: [],
      unstaged: [],
      untracked: [],
      isRepo: false,
    };
  }
  
  const branchResult = await runGitCommand(projectId, ['branch', '--show-current']);
  const branch = branchResult.stdout.trim() || 'main';
  
  const statusResult = await runGitCommand(projectId, ['status', '--porcelain']);
  const lines = statusResult.stdout.split('\n').filter(l => l.trim());
  
  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];
  
  for (const line of lines) {
    const indexStatus = line[0];
    const worktreeStatus = line[1];
    const file = line.slice(3);
    
    if (indexStatus === '?' && worktreeStatus === '?') {
      untracked.push(file);
    } else {
      if (indexStatus !== ' ' && indexStatus !== '?') {
        staged.push(file);
      }
      if (worktreeStatus !== ' ' && worktreeStatus !== '?') {
        unstaged.push(file);
      }
    }
  }
  
  return { branch, staged, unstaged, untracked, isRepo: true };
}

export async function getGitLog(projectId: number, limit: number = 50): Promise<GitCommit[]> {
  const result = await runGitCommand(projectId, [
    'log',
    '--pretty=format:%H|%h|%s|%an|%aI|%at',
    `-n${limit}`,
  ]);
  
  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return [];
  }
  
  const commits: GitCommit[] = [];
  const lines = result.stdout.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    const [hash, shortHash, message, author, date, timestamp] = line.split('|');
    commits.push({
      hash,
      shortHash,
      message,
      author,
      date,
      timestamp: parseInt(timestamp, 10),
    });
  }
  
  return commits;
}

export async function stageFiles(projectId: number, files: string[]): Promise<boolean> {
  const args = files.length > 0 ? ['add', ...files] : ['add', '.'];
  const result = await runGitCommand(projectId, args);
  return result.exitCode === 0;
}

export async function unstageFiles(projectId: number, files: string[]): Promise<boolean> {
  const args = ['reset', 'HEAD', ...files];
  const result = await runGitCommand(projectId, args);
  return result.exitCode === 0;
}

export async function commit(projectId: number, message: string): Promise<{ success: boolean; hash?: string; error?: string }> {
  const result = await runGitCommand(projectId, ['commit', '-m', message]);
  
  if (result.exitCode !== 0) {
    return { success: false, error: result.stderr || 'Commit failed' };
  }
  
  const hashMatch = result.stdout.match(/\[[\w\s]+\s([a-f0-9]+)\]/);
  return { success: true, hash: hashMatch?.[1] };
}

export async function getFileDiff(projectId: number, file: string, staged: boolean = false): Promise<GitDiff | null> {
  const args = staged ? ['diff', '--cached', '--', file] : ['diff', '--', file];
  const result = await runGitCommand(projectId, args);
  
  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return null;
  }
  
  return parseDiff(result.stdout, file);
}

export async function getAllDiffs(projectId: number, staged: boolean = false): Promise<GitDiff[]> {
  const args = staged ? ['diff', '--cached'] : ['diff'];
  const result = await runGitCommand(projectId, args);
  
  if (result.exitCode !== 0 || !result.stdout.trim()) {
    return [];
  }
  
  const diffs: GitDiff[] = [];
  const fileDiffs = result.stdout.split(/^diff --git/m).filter(d => d.trim());
  
  for (const fileDiff of fileDiffs) {
    const fileMatch = fileDiff.match(/a\/(.+?) b\//);
    if (fileMatch) {
      const parsed = parseDiff('diff --git ' + fileDiff, fileMatch[1]);
      if (parsed) diffs.push(parsed);
    }
  }
  
  return diffs;
}

function parseDiff(diffOutput: string, fileName: string): GitDiff | null {
  const lines = diffOutput.split('\n');
  let additions = 0;
  let deletions = 0;
  const hunks: GitHunk[] = [];
  let currentHunk: GitHunk | null = null;
  let oldLine = 0;
  let newLine = 0;
  
  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    
    if (hunkMatch) {
      if (currentHunk) {
        hunks.push(currentHunk);
      }
      
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[3], 10);
      
      currentHunk = {
        oldStart: oldLine,
        oldLines: parseInt(hunkMatch[2] || '1', 10),
        newStart: newLine,
        newLines: parseInt(hunkMatch[4] || '1', 10),
        lines: [],
      };
    } else if (currentHunk) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        additions++;
        currentHunk.lines.push({
          type: 'add',
          content: line.slice(1),
          newLineNumber: newLine++,
        });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletions++;
        currentHunk.lines.push({
          type: 'delete',
          content: line.slice(1),
          oldLineNumber: oldLine++,
        });
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1),
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        });
      }
    }
  }
  
  if (currentHunk) {
    hunks.push(currentHunk);
  }
  
  return { file: fileName, additions, deletions, hunks };
}

export async function rollbackToCommit(projectId: number, commitHash: string): Promise<{ success: boolean; error?: string }> {
  const result = await runGitCommand(projectId, ['checkout', commitHash, '--', '.']);
  
  if (result.exitCode !== 0) {
    return { success: false, error: result.stderr };
  }
  
  return { success: true };
}

export async function createBranch(projectId: number, branchName: string): Promise<boolean> {
  const result = await runGitCommand(projectId, ['checkout', '-b', branchName]);
  return result.exitCode === 0;
}

export async function switchBranch(projectId: number, branchName: string): Promise<boolean> {
  const result = await runGitCommand(projectId, ['checkout', branchName]);
  return result.exitCode === 0;
}

export async function listBranches(projectId: number): Promise<string[]> {
  const result = await runGitCommand(projectId, ['branch', '--list']);
  if (result.exitCode !== 0) return [];
  
  return result.stdout
    .split('\n')
    .map(b => b.replace('*', '').trim())
    .filter(b => b);
}

export async function autoCommit(projectId: number, description?: string): Promise<{ success: boolean; hash?: string }> {
  await initGitRepo(projectId);
  await stageFiles(projectId, []);
  
  const status = await getGitStatus(projectId);
  if (status.staged.length === 0 && status.untracked.length === 0) {
    return { success: false };
  }
  
  await runGitCommand(projectId, ['add', '.']);
  
  const message = description || `Auto-commit: ${new Date().toLocaleString('pt-BR')}`;
  return commit(projectId, message);
}
