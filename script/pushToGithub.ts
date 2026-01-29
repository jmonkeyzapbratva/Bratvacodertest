import { getGitHubClient, commitFiles } from '../server/github';
import * as fs from 'fs';
import * as path from 'path';

const OWNER = 'jmonkeyzapbratva';
const REPO = 'Bratvacodertest';
const BRANCH = 'main';
const BATCH_SIZE = 50;

const IGNORE_PATHS = [
  'node_modules',
  '.git',
  'dist',
  '.cache',
  '.upm',
  '.local',
  '.config',
  'workspaces',
  'package-lock.json',
];

const ALLOWED_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.html', '.md',
  '.config.ts', '.config.js', '.gitignore', '.replit', '.env.example'
];

function shouldIncludeFile(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  for (const ignorePath of IGNORE_PATHS) {
    if (normalizedPath.includes(`/${ignorePath}/`) || normalizedPath.includes(`/${ignorePath}`)) {
      return false;
    }
  }
  
  const ext = path.extname(filePath);
  const basename = path.basename(filePath);
  
  if (basename.startsWith('.') && basename !== '.gitignore' && basename !== '.replit' && basename !== '.env.example') {
    return false;
  }
  
  return ALLOWED_EXTENSIONS.some(allowedExt => filePath.endsWith(allowedExt)) || 
         basename === '.gitignore' || 
         basename === '.replit' ||
         basename === '.env.example';
}

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (IGNORE_PATHS.some(ignore => entry.name === ignore || relativePath.startsWith(ignore))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        files.push(...getAllFiles(fullPath, baseDir));
      } else if (entry.isFile() && shouldIncludeFile(fullPath)) {
        files.push(relativePath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

async function pushAllFiles() {
  console.log('Collecting files to push...');
  
  const rootDir = process.cwd();
  const allFiles = getAllFiles(rootDir);
  
  console.log(`Found ${allFiles.length} files to push.`);
  
  if (allFiles.length === 0) {
    console.log('No files found to push.');
    return;
  }
  
  console.log('Reading file contents...');
  
  const fileContents: Array<{ path: string; content: string }> = [];
  
  for (const filePath of allFiles) {
    try {
      const fullPath = path.join(rootDir, filePath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      fileContents.push({
        path: filePath.replace(/\\/g, '/'),
        content: content,
      });
    } catch (error) {
      console.warn(`Skipping file ${filePath}: ${error}`);
    }
  }
  
  console.log(`Prepared ${fileContents.length} files for upload.`);
  
  const batches: Array<Array<{ path: string; content: string }>> = [];
  for (let i = 0; i < fileContents.length; i += BATCH_SIZE) {
    batches.push(fileContents.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`Uploading in ${batches.length} batch(es)...`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const message = batches.length === 1 
      ? 'BRATVACODER: Upload completo de todos os arquivos'
      : `BRATVACODER: Upload batch ${i + 1}/${batches.length}`;
    
    console.log(`Uploading batch ${i + 1}/${batches.length} (${batch.length} files)...`);
    console.log(`Files: ${batch.map(f => f.path).slice(0, 5).join(', ')}${batch.length > 5 ? '...' : ''}`);
    
    try {
      const result = await commitFiles({
        owner: OWNER,
        repo: REPO,
        files: batch,
        message: message,
        branch: BRANCH,
      });
      
      console.log(`Batch ${i + 1} pushed successfully!`);
      console.log(`Commit SHA: ${result.sha}`);
    } catch (error: any) {
      console.error(`Error pushing batch ${i + 1}:`, error.message || error);
      
      if (error.status === 422) {
        console.log('Trying to push files individually...');
        for (const file of batch) {
          try {
            await commitFiles({
              owner: OWNER,
              repo: REPO,
              files: [file],
              message: `BRATVACODER: Update ${file.path}`,
              branch: BRANCH,
            });
            console.log(`Pushed: ${file.path}`);
          } catch (fileError: any) {
            console.error(`Failed to push ${file.path}: ${fileError.message}`);
          }
        }
      }
    }
  }
  
  console.log('\nUpload complete!');
  console.log(`Repository: https://github.com/${OWNER}/${REPO}`);
}

pushAllFiles().catch(console.error);
