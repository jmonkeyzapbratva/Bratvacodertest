import { db } from "./db";
import {
  projects,
  projectFiles,
  projectSecrets,
  projectRuns,
  Project,
  InsertProject,
  ProjectFile,
  InsertProjectFile,
  ProjectSecret,
  InsertProjectSecret,
  ProjectRun,
  InsertProjectRun,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

function getEncryptionKey(): string {
  const key = process.env.SESSION_SECRET;
  if (!key || key.length < 32) {
    console.warn("[SECURITY] SESSION_SECRET not configured or too short. Secrets will not be encrypted securely.");
    throw new Error("SESSION_SECRET must be configured with at least 32 characters for secure encryption");
  }
  return key;
}

function encrypt(text: string): string {
  const ENCRYPTION_KEY = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    const [ivHex, encrypted] = text.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  icon: string;
  files: { path: string; content: string }[];
  startCommand: string;
  entryPoint: string;
  port: number;
}

const PROJECT_TEMPLATES: Record<string, ProjectTemplate> = {
  "whatsapp-bot": {
    id: "whatsapp-bot",
    name: "Bot WhatsApp",
    description: "Bot de WhatsApp com Baileys",
    language: "javascript",
    icon: "MessageCircle",
    startCommand: "node index.js",
    entryPoint: "index.js",
    port: 3000,
    files: [
      {
        path: "package.json",
        content: JSON.stringify({
          name: "whatsapp-bot",
          version: "1.0.0",
          main: "index.js",
          scripts: {
            start: "node index.js",
            dev: "node index.js"
          },
          dependencies: {
            "@whiskeysockets/baileys": "^6.6.0",
            "qrcode-terminal": "^0.12.0",
            "pino": "^8.16.0"
          }
        }, null, 2)
      },
      {
        path: "index.js",
        content: `const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const PREFIX = '!';

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' })
  });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update;
    
    if (qr) {
      console.log('\\n[BOT] Escaneie o QR Code abaixo:');
      qrcode.generate(qr, { small: true });
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log('[BOT] Reconectando...');
        startBot();
      } else {
        console.log('[BOT] Desconectado. Escaneie o QR novamente.');
      }
    } else if (connection === 'open') {
      console.log('[BOT] Conectado com sucesso!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    
    const text = msg.message.conversation || 
                 msg.message.extendedTextMessage?.text || '';
    const from = msg.key.remoteJid;
    
    if (text.startsWith(PREFIX)) {
      const command = text.slice(PREFIX.length).split(' ')[0].toLowerCase();
      const args = text.slice(PREFIX.length + command.length + 1);
      
      switch (command) {
        case 'ping':
          await sock.sendMessage(from, { text: 'Pong! O bot esta funcionando.' });
          break;
        case 'oi':
        case 'ola':
          await sock.sendMessage(from, { text: 'Ola! Como posso ajudar?' });
          break;
        case 'help':
        case 'ajuda':
          await sock.sendMessage(from, { 
            text: '*Comandos disponiveis:*\\n\\n' +
                  '!ping - Verifica se o bot esta online\\n' +
                  '!oi - Saudacao\\n' +
                  '!ajuda - Mostra esta mensagem'
          });
          break;
        default:
          await sock.sendMessage(from, { 
            text: 'Comando nao reconhecido. Digite !ajuda para ver os comandos.' 
          });
      }
    }
  });
}

console.log('[BOT] Iniciando Bot WhatsApp...');
startBot();
`
      }
    ]
  },
  "rest-api": {
    id: "rest-api",
    name: "API REST",
    description: "API REST com Express.js",
    language: "javascript",
    icon: "Server",
    startCommand: "node index.js",
    entryPoint: "index.js",
    port: 3000,
    files: [
      {
        path: "package.json",
        content: JSON.stringify({
          name: "rest-api",
          version: "1.0.0",
          main: "index.js",
          scripts: {
            start: "node index.js",
            dev: "node index.js"
          },
          dependencies: {
            express: "^4.18.2",
            cors: "^2.8.5"
          }
        }, null, 2)
      },
      {
        path: "index.js",
        content: `const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Dados em memoria
let items = [
  { id: 1, name: 'Item 1', description: 'Primeiro item' },
  { id: 2, name: 'Item 2', description: 'Segundo item' }
];

// GET - Listar todos
app.get('/api/items', (req, res) => {
  res.json(items);
});

// GET - Buscar por ID
app.get('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item nao encontrado' });
  res.json(item);
});

// POST - Criar novo
app.post('/api/items', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatorio' });
  
  const newItem = {
    id: items.length + 1,
    name,
    description: description || ''
  };
  items.push(newItem);
  res.status(201).json(newItem);
});

// PUT - Atualizar
app.put('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).json({ error: 'Item nao encontrado' });
  
  const { name, description } = req.body;
  if (name) item.name = name;
  if (description) item.description = description;
  res.json(item);
});

// DELETE - Remover
app.delete('/api/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Item nao encontrado' });
  
  items.splice(index, 1);
  res.json({ message: 'Item removido com sucesso' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`API rodando em http://localhost:\${PORT}\`);
});
`
      }
    ]
  },
  "landing-page": {
    id: "landing-page",
    name: "Landing Page",
    description: "Pagina de apresentacao responsiva",
    language: "html",
    icon: "Layout",
    startCommand: "npx serve .",
    entryPoint: "index.html",
    port: 3000,
    files: [
      {
        path: "package.json",
        content: JSON.stringify({
          name: "landing-page",
          version: "1.0.0",
          scripts: {
            start: "npx serve . -l 3000",
            dev: "npx serve . -l 3000"
          },
          dependencies: {
            serve: "^14.2.1"
          }
        }, null, 2)
      },
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minha Landing Page</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="hero">
    <nav>
      <div class="logo">MeuProjeto</div>
      <ul>
        <li><a href="#features">Recursos</a></li>
        <li><a href="#about">Sobre</a></li>
        <li><a href="#contact">Contato</a></li>
      </ul>
    </nav>
    <div class="hero-content">
      <h1>Transforme suas ideias em realidade</h1>
      <p>A solucao perfeita para o seu negocio crescer</p>
      <a href="#contact" class="btn">Comecar Agora</a>
    </div>
  </header>

  <section id="features" class="features">
    <h2>Nossos Recursos</h2>
    <div class="feature-grid">
      <div class="feature-card">
        <h3>Rapido</h3>
        <p>Performance otimizada para resultados instantaneos</p>
      </div>
      <div class="feature-card">
        <h3>Seguro</h3>
        <p>Seus dados protegidos com a melhor tecnologia</p>
      </div>
      <div class="feature-card">
        <h3>Facil</h3>
        <p>Interface intuitiva que qualquer um pode usar</p>
      </div>
    </div>
  </section>

  <section id="about" class="about">
    <h2>Sobre Nos</h2>
    <p>Somos apaixonados por criar solucoes que fazem a diferenca.</p>
  </section>

  <section id="contact" class="contact">
    <h2>Entre em Contato</h2>
    <form>
      <input type="text" placeholder="Seu nome" required>
      <input type="email" placeholder="Seu email" required>
      <textarea placeholder="Sua mensagem" required></textarea>
      <button type="submit" class="btn">Enviar</button>
    </form>
  </section>

  <footer>
    <p>2024 MeuProjeto. Todos os direitos reservados.</p>
  </footer>
</body>
</html>`
      },
      {
        path: "style.css",
        content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
}

.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  min-height: 100vh;
  padding: 20px;
}

nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
}

nav ul {
  display: flex;
  list-style: none;
  gap: 20px;
}

nav a {
  color: white;
  text-decoration: none;
  transition: opacity 0.3s;
}

nav a:hover {
  opacity: 0.8;
}

.hero-content {
  text-align: center;
  padding: 100px 20px;
  max-width: 800px;
  margin: 0 auto;
}

.hero-content h1 {
  font-size: 3rem;
  margin-bottom: 20px;
}

.hero-content p {
  font-size: 1.25rem;
  margin-bottom: 30px;
  opacity: 0.9;
}

.btn {
  display: inline-block;
  background: white;
  color: #667eea;
  padding: 15px 30px;
  border-radius: 30px;
  text-decoration: none;
  font-weight: bold;
  transition: transform 0.3s;
  border: none;
  cursor: pointer;
}

.btn:hover {
  transform: scale(1.05);
}

section {
  padding: 80px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  text-align: center;
  margin-bottom: 40px;
  font-size: 2rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 30px;
}

.feature-card {
  background: #f8f9fa;
  padding: 30px;
  border-radius: 10px;
  text-align: center;
}

.feature-card h3 {
  margin-bottom: 15px;
  color: #667eea;
}

.about {
  background: #f8f9fa;
  text-align: center;
}

.contact form {
  max-width: 500px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.contact input,
.contact textarea {
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
}

.contact textarea {
  min-height: 150px;
  resize: vertical;
}

footer {
  background: #333;
  color: white;
  text-align: center;
  padding: 20px;
}

@media (max-width: 768px) {
  .hero-content h1 {
    font-size: 2rem;
  }
  
  nav ul {
    display: none;
  }
}`
      }
    ]
  },
  "react-app": {
    id: "react-app",
    name: "App React",
    description: "Aplicacao React com Vite",
    language: "javascript",
    icon: "Atom",
    startCommand: "npm run dev",
    entryPoint: "src/App.jsx",
    port: 5173,
    files: [
      {
        path: "package.json",
        content: JSON.stringify({
          name: "react-app",
          version: "1.0.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "vite build",
            preview: "vite preview"
          },
          dependencies: {
            react: "^18.2.0",
            "react-dom": "^18.2.0"
          },
          devDependencies: {
            "@vitejs/plugin-react": "^4.2.0",
            vite: "^5.0.0"
          }
        }, null, 2)
      },
      {
        path: "vite.config.js",
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
})`
      },
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Meu App React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`
      },
      {
        path: "src/main.jsx",
        content: `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)`
      },
      {
        path: "src/App.jsx",
        content: `import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <h1>Meu App React</h1>
      <div className="card">
        <button onClick={() => setCount(c => c + 1)}>
          Contagem: {count}
        </button>
        <p>Edite src/App.jsx e salve para ver as mudancas</p>
      </div>
    </div>
  )
}

export default App`
      },
      {
        path: "src/index.css",
        content: `:root {
  font-family: Inter, system-ui, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: #213547;
  background-color: #ffffff;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
  margin-bottom: 1rem;
}

.card {
  padding: 2em;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  color: white;
  cursor: pointer;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}

button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}`
      }
    ]
  }
};

export class ProjectService {
  async createProject(data: InsertProject, templateId?: string): Promise<Project> {
    const template = templateId ? PROJECT_TEMPLATES[templateId] : null;
    
    const projectData: InsertProject = {
      ...data,
      status: "draft",
      runtimeStatus: "idle",
      startCommand: template?.startCommand || data.startCommand || "npm start",
      entryPoint: template?.entryPoint || data.entryPoint || "index.js",
      port: template?.port || data.port || 3000,
    };

    const [project] = await db.insert(projects).values(projectData).returning();

    if (template) {
      await this.createFilesFromTemplate(project.id, template);
    }

    return project;
  }

  async createFilesFromTemplate(projectId: number, template: ProjectTemplate): Promise<void> {
    const fileInserts = template.files.map((file) => ({
      projectId,
      path: file.path,
      content: file.content,
      isDirectory: false,
      version: 1,
    }));

    if (fileInserts.length > 0) {
      await db.insert(projectFiles).values(fileInserts);
    }
  }

  async getProject(projectId: number): Promise<Project | null> {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    return project || null;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt));
  }

  async updateProject(projectId: number, data: Partial<InsertProject>): Promise<Project | null> {
    const [updated] = await db.update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, projectId))
      .returning();
    return updated || null;
  }

  async deleteProject(projectId: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, projectId));
    return true;
  }

  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId));
  }

  async getFile(projectId: number, path: string): Promise<ProjectFile | null> {
    const [file] = await db.select().from(projectFiles)
      .where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, path)));
    return file || null;
  }

  async createFile(data: InsertProjectFile): Promise<ProjectFile> {
    const [file] = await db.insert(projectFiles).values(data).returning();
    return file;
  }

  async updateFile(projectId: number, path: string, content: string): Promise<ProjectFile | null> {
    const existing = await this.getFile(projectId, path);
    if (!existing) {
      const [created] = await db.insert(projectFiles).values({
        projectId,
        path,
        content,
        version: 1,
      }).returning();
      return created;
    }

    const [updated] = await db.update(projectFiles)
      .set({ 
        content, 
        version: (existing.version || 1) + 1,
        updatedAt: new Date() 
      })
      .where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, path)))
      .returning();
    return updated || null;
  }

  async deleteFile(projectId: number, path: string): Promise<boolean> {
    await db.delete(projectFiles)
      .where(and(eq(projectFiles.projectId, projectId), eq(projectFiles.path, path)));
    return true;
  }

  async getSecrets(projectId: number): Promise<Array<{ id: number; name: string; description: string | null }>> {
    const secrets = await db.select().from(projectSecrets).where(eq(projectSecrets.projectId, projectId));
    return secrets.map(s => ({ id: s.id, name: s.name, description: s.description }));
  }

  async createSecret(projectId: number, name: string, value: string, description?: string): Promise<void> {
    const encryptedValue = encrypt(value);
    await db.insert(projectSecrets).values({
      projectId,
      name,
      encryptedValue,
      description,
    });
  }

  async getSecretValue(projectId: number, name: string): Promise<string | null> {
    const [secret] = await db.select().from(projectSecrets)
      .where(and(eq(projectSecrets.projectId, projectId), eq(projectSecrets.name, name)));
    if (!secret) return null;
    return decrypt(secret.encryptedValue);
  }

  async deleteSecret(projectId: number, name: string): Promise<boolean> {
    await db.delete(projectSecrets)
      .where(and(eq(projectSecrets.projectId, projectId), eq(projectSecrets.name, name)));
    return true;
  }

  async createRun(data: InsertProjectRun): Promise<ProjectRun> {
    const [run] = await db.insert(projectRuns).values(data).returning();
    return run;
  }

  async updateRun(runId: number, data: Partial<ProjectRun>): Promise<ProjectRun | null> {
    const [updated] = await db.update(projectRuns)
      .set(data)
      .where(eq(projectRuns.id, runId))
      .returning();
    return updated || null;
  }

  async getProjectRuns(projectId: number, limit = 10): Promise<ProjectRun[]> {
    return await db.select().from(projectRuns)
      .where(eq(projectRuns.projectId, projectId))
      .orderBy(desc(projectRuns.startedAt))
      .limit(limit);
  }

  async updateProjectStatus(projectId: number, status: string, runtimeStatus?: string): Promise<void> {
    const updates: Record<string, any> = { status, updatedAt: new Date() };
    if (runtimeStatus) updates.runtimeStatus = runtimeStatus;
    if (runtimeStatus === "running") updates.lastRunAt = new Date();
    await db.update(projects).set(updates).where(eq(projects.id, projectId));
  }

  getTemplates(): ProjectTemplate[] {
    return Object.values(PROJECT_TEMPLATES);
  }

  getTemplate(id: string): ProjectTemplate | null {
    return PROJECT_TEMPLATES[id] || null;
  }
}

export const projectService = new ProjectService();
