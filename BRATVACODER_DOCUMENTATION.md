# BRATVACODER - Documentação Técnica Completa

## Visão Geral

**BRATVACODER** é um agente de IA para geração de código em Português Brasileiro, projetado para ser uma alternativa ao Replit Agent. Permite que usuários não-programadores criem aplicações completas através de linguagem natural.

**Repositório GitHub:** https://github.com/jmonkeyzapbratva/Bratvacodertest

---

## Índice

1. [Arquitetura do Sistema](#arquitetura-do-sistema)
2. [Funcionalidades Implementadas](#funcionalidades-implementadas)
3. [Estrutura de Arquivos](#estrutura-de-arquivos)
4. [Como Rodar Localmente](#como-rodar-localmente)
5. [APIs e Variáveis de Ambiente](#apis-e-variáveis-de-ambiente)
6. [Banco de Dados](#banco-de-dados)
7. [Serviços do Backend](#serviços-do-backend)
8. [Componentes do Frontend](#componentes-do-frontend)
9. [Comparação com Replit Agent](#comparação-com-replit-agent)
10. [O Que Falta Para Funcionar Igual ao Replit](#o-que-falta-para-funcionar-igual-ao-replit)
11. [Roadmap de Implementação](#roadmap-de-implementação)

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        BRATVACODER                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    FRONTEND (React)                      │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │    │
│  │  │ Chat Panel  │ │Code Editor  │ │ Preview Panel   │    │    │
│  │  │ (Agent AI)  │ │ (Monaco)    │ │ (Live Reload)   │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐    │    │
│  │  │ File        │ │ Terminal    │ │ Git Panel       │    │    │
│  │  │ Explorer    │ │ (PTY Real)  │ │ (GitHub)        │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                         WebSocket + REST                         │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   BACKEND (Node/Express)                 │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │              Core Services (50+)                  │   │    │
│  │  │  • chatService      • aiCodeGeneratorService     │   │    │
│  │  │  • webSearchService • workspaceService           │   │    │
│  │  │  • gitService       • deployService              │   │    │
│  │  │  • ptyService       • packageManagerService      │   │    │
│  │  │  • checkpointService • databaseService           │   │    │
│  │  └──────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   DATABASE (PostgreSQL)                  │    │
│  │  users, sessions, projects, conversations, messages,     │    │
│  │  agentTasks, webhooks, whatsapp_sessions, webhook_events │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **UI** | Tailwind CSS + Shadcn/ui + Radix UI |
| **State** | TanStack React Query |
| **Roteamento** | Wouter |
| **Editor** | Monaco Editor (VSCode) |
| **Terminal** | Xterm.js + node-pty |
| **Backend** | Node.js + Express + TypeScript |
| **ORM** | Drizzle ORM |
| **Database** | PostgreSQL |
| **Auth** | Replit OIDC + Passport.js |
| **AI** | OpenAI GPT-4o-mini |
| **Web Search** | Brave Search API + Tavily |

---

## Status das Funcionalidades

### Legenda de Status
- ✅ **Operacional** - Código implementado, rota disponível, UI funcional
- ⚠️ **Implementado** - Código existe mas pode requerer API key ou configuração
- 🔧 **Parcial** - Funcionalidade básica pronta, recursos avançados pendentes
- ❌ **Não Implementado** - Requer desenvolvimento

---

## Funcionalidades Implementadas

### ✅ Funcionalidades Operacionais (50+ Serviços)

#### 1. Chat com IA (Agente Conversacional)
- **Arquivo:** `server/chatService.ts`
- **Descrição:** Chat AI que entende o contexto do projeto e gera código
- **Streaming:** Server-Sent Events (SSE) para respostas em tempo real
- **Comandos especiais:** `/build`, `/design`, `/debug`, `/memory`, `/deploy`

#### 2. Geração de Código AI
- **Arquivo:** `server/aiCodeGeneratorService.ts`
- **Descrição:** Gera arquivos completos com base em descrições em português
- **Modelo:** GPT-4o-mini
- **Saída:** Múltiplos arquivos (frontend, backend, configs)

#### 3. Editor de Código Monaco
- **Arquivos:** `client/src/components/ide/WorkspaceEditor.tsx`, `CodeEditor.tsx`
- **Funcionalidades:**
  - Syntax highlighting para 50+ linguagens
  - Autocomplete AI integrado
  - Tabs múltiplas
  - Breadcrumbs de navegação
  - Busca e substituição

#### 4. Terminal Real (PTY)
- **Arquivos:** `server/ptyService.ts`, `client/src/components/ide/RealTerminal.tsx`
- **Funcionalidades:**
  - Terminal real com node-pty
  - WebSocket para comunicação bidirecional
  - Suporte a comandos npm, git, etc.
  - Histórico de comandos

#### 5. File Explorer
- **Arquivo:** `client/src/components/ide/FileExplorer.tsx`
- **Funcionalidades:**
  - Navegação em árvore de arquivos
  - Criar/renomear/excluir arquivos/pastas
  - Drag & drop
  - Ícones por tipo de arquivo

#### 6. Preview com Hot Reload
- **Arquivos:** `client/src/components/ide/PreviewPanel.tsx`, `server/hotReloadService.ts`
- **Funcionalidades:**
  - Visualização ao vivo do projeto
  - Recarregamento automático ao salvar
  - WebSocket para sincronização
  - Mobile preview (responsivo)

#### 7. Action Bubbles (Thinking, Generating, Writing)
- **Arquivo:** `client/src/components/ide/AgentActionBubble.tsx`
- **Descrição:** Mostra visualmente o que o agente está fazendo
- **Estados:** thinking, generating, writing, installing, running, command

#### 8. Plan/Build Mode Toggle
- **Arquivo:** `client/src/components/ide/PlanModeToggle.tsx`
- **Descrição:** Alterna entre modo de planejamento e construção

#### 9. Web Search (Brave + Tavily)
- **Arquivo:** `server/webSearchService.ts`
- **Providers:**
  - **Brave Search API** (primário) - 2000 queries grátis/mês
  - **Tavily** (fallback) - API nativa para AI
- **Funcionalidades:**
  - Busca de documentação
  - Busca de soluções para erros
  - Cache de 5 minutos

#### 10. Git Integration
- **Arquivos:** `server/gitService.ts`, `server/github.ts`, `client/src/components/ide/GitPanel.tsx`
- **Funcionalidades:**
  - Clone, commit, push, pull
  - Status de arquivos
  - Histórico de commits
  - Integração com GitHub OAuth

#### 11. Checkpoints (Snapshots)
- **Arquivo:** `server/checkpointService.ts`
- **Descrição:** Salva estados do projeto para rollback

#### 12. Database Viewer
- **Arquivos:** `server/databaseViewerService.ts`, `client/src/components/ide/DatabasePanel.tsx`
- **Funcionalidades:**
  - Visualizar tabelas
  - Executar queries SQL
  - Ver estrutura do schema

#### 13. Secrets Manager
- **Arquivo:** `client/src/components/ide/SecretsPanel.tsx`
- **Descrição:** Gerencia variáveis de ambiente e segredos

#### 14. Screenshot-to-Code
- **Arquivo:** `server/screenshotCloningService.ts`
- **Descrição:** Analisa screenshots e gera código HTML/CSS

#### 15. Image Generation (DALL-E)
- **Arquivo:** `server/imageGenerationService.ts`
- **Descrição:** Gera imagens com DALL-E para usar nos projetos

#### 16. Autocomplete AI
- **Arquivo:** `server/aiAutocompleteService.ts`
- **Descrição:** Sugestões de código com IA enquanto digita

#### 17. Deploy Service
- **Arquivo:** `server/deployService.ts`
- **Descrição:** Prepara e exporta projetos para deploy

#### 18. Package Manager
- **Arquivo:** `server/packageManagerService.ts`
- **Funcionalidades:**
  - Instalar/remover pacotes npm
  - Atualizar dependências
  - Ver pacotes instalados

#### 19. Collaboration Real-time
- **Arquivo:** `server/collaborationService.ts`
- **Descrição:** Múltiplos usuários editando simultaneamente

#### 20. Comments System
- **Arquivo:** `server/commentsService.ts`
- **Descrição:** Comentários em código para review

#### 21. Extended Thinking
- **Arquivo:** `server/extendedThinkingService.ts`
- **Descrição:** Raciocínio estendido para problemas complexos

#### 22. Playwright Testing
- **Arquivo:** `server/playwrightTestService.ts`
- **Descrição:** Testes E2E automatizados

#### 23. Build Modes
- **Arquivo:** `server/buildModesService.ts`
- **Descrição:** Diferentes modos de construção (rápido, completo)

#### 24. Autonomy Service
- **Arquivo:** `server/autonomyService.ts`
- **Descrição:** Agente autônomo que executa tarefas complexas

---

## Estrutura de Arquivos

```
bratvacoder/
├── client/                      # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── ide/             # Componentes da IDE (50+)
│   │   │   │   ├── AgentActionBubble.tsx
│   │   │   │   ├── AgentModeBubble.tsx
│   │   │   │   ├── AgentToolsBubble.tsx
│   │   │   │   ├── AutonomyControls.tsx
│   │   │   │   ├── BuildModeSelector.tsx
│   │   │   │   ├── ChatAssistant.tsx
│   │   │   │   ├── CheckpointPanel.tsx
│   │   │   │   ├── CodeEditor.tsx
│   │   │   │   ├── DatabasePanel.tsx
│   │   │   │   ├── DeployPanel.tsx
│   │   │   │   ├── FileExplorer.tsx
│   │   │   │   ├── GitPanel.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── ImageGeneratorPanel.tsx
│   │   │   │   ├── IntegrationsPanel.tsx
│   │   │   │   ├── MobilePreview.tsx
│   │   │   │   ├── PackagesPanel.tsx
│   │   │   │   ├── PlanModeToggle.tsx
│   │   │   │   ├── PlaywrightTestPanel.tsx
│   │   │   │   ├── PreviewPanel.tsx
│   │   │   │   ├── Preview.tsx
│   │   │   │   ├── RealTerminal.tsx
│   │   │   │   ├── ReplitMdEditor.tsx
│   │   │   │   ├── SearchPanel.tsx
│   │   │   │   ├── SecretsPanel.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── StatusBar.tsx
│   │   │   │   ├── Terminal.tsx
│   │   │   │   ├── ThinkingVisualizer.tsx
│   │   │   │   ├── VisualEditor.tsx
│   │   │   │   ├── WebSearchPanel.tsx
│   │   │   │   └── WorkspaceEditor.tsx
│   │   │   └── ui/              # Componentes Shadcn
│   │   ├── hooks/               # React hooks customizados
│   │   │   ├── useStreamingChat.ts
│   │   │   ├── use-toast.ts
│   │   │   └── use-mobile.tsx
│   │   ├── lib/                 # Utilitários
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   ├── pages/               # Páginas
│   │   │   ├── Agent.tsx        # Página principal do agente
│   │   │   ├── Home.tsx
│   │   │   └── not-found.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   └── index.html
│
├── server/                      # Backend Express
│   ├── services/                # Serviços auxiliares
│   │   ├── cache.ts
│   │   ├── logger.ts
│   │   └── index.ts
│   ├── agentSpawnerService.ts   # Spawn de agentes
│   ├── aiAnalysisService.ts     # Análise de código
│   ├── aiAutocompleteService.ts # Autocomplete IA
│   ├── aiCodeGeneratorService.ts # Geração de código
│   ├── aiContextService.ts      # Contexto AI
│   ├── appTestingService.ts     # Testes de app
│   ├── authTemplateService.ts   # Templates de auth
│   ├── autonomyService.ts       # Agente autônomo
│   ├── buildModesService.ts     # Modos de build
│   ├── buildService.ts          # Serviço de build
│   ├── chatService.ts           # Chat AI principal
│   ├── checkpointService.ts     # Checkpoints
│   ├── codeGenerator.ts         # Gerador de templates
│   ├── collaborationService.ts  # Colaboração real-time
│   ├── commandProcessor.ts      # Processador de comandos
│   ├── commentsService.ts       # Comentários
│   ├── databaseService.ts       # Operações de DB
│   ├── databaseViewerService.ts # Viewer de DB
│   ├── db.ts                    # Conexão PostgreSQL
│   ├── deployService.ts         # Deploy
│   ├── diagnosticService.ts     # Diagnósticos
│   ├── engineerService.ts       # Engenheiro AI
│   ├── envService.ts            # Variáveis de ambiente
│   ├── extendedThinkingService.ts # Pensamento estendido
│   ├── github.ts                # GitHub API
│   ├── gitService.ts            # Git operations
│   ├── healthCheckService.ts    # Health checks
│   ├── hotReloadService.ts      # Hot reload
│   ├── imageGenerationService.ts # DALL-E
│   ├── index.ts                 # Entry point
│   ├── integrationService.ts    # Integrações
│   ├── logsService.ts           # Logs
│   ├── mediaGenerationService.ts # Media gen
│   ├── packageManagerService.ts # NPM
│   ├── packageService.ts        # Pacotes
│   ├── playwrightTestService.ts # Testes E2E
│   ├── projectService.ts        # Projetos
│   ├── ptyService.ts            # Terminal PTY
│   ├── replitAuth.ts            # Auth OIDC
│   ├── routes.ts                # Todas as rotas (153KB!)
│   ├── screenshotCloningService.ts # Clone de screenshots
│   ├── sharingService.ts        # Compartilhamento
│   ├── static.ts                # Arquivos estáticos
│   ├── storage.ts               # Storage interface
│   ├── terminalService.ts       # Terminal
│   ├── terminalTokenStore.ts    # Tokens
│   ├── testingService.ts        # Testes
│   ├── vite.ts                  # Vite dev server
│   ├── webSearchService.ts      # Brave/Tavily search
│   ├── workspaceService.ts      # Workspaces
│   └── zipService.ts            # ZIP export
│
├── shared/                      # Código compartilhado
│   └── schema.ts                # Drizzle schema
│
├── templates/                   # Templates de projetos
│
├── workspaces/                  # Projetos dos usuários
│
├── docs/                        # Documentação
│
├── .env.example                 # Exemplo de variáveis
├── drizzle.config.ts            # Config Drizzle
├── package.json                 # Dependências
├── tailwind.config.ts           # Tailwind
├── tsconfig.json                # TypeScript
├── vite.config.ts               # Vite
└── replit.md                    # Memória do projeto
```

---

## Como Rodar Localmente

### Pré-requisitos

- Node.js 20+
- PostgreSQL 14+
- Git
- npm ou yarn

### Passo 1: Clone o Repositório

```bash
git clone https://github.com/jmonkeyzapbratva/Bratvacodertest.git
cd Bratvacodertest
```

### Passo 2: Instale as Dependências

```bash
npm install
```

### Passo 3: Configure o Banco de Dados PostgreSQL

**Opção A: PostgreSQL Local**

```bash
# Instale PostgreSQL
# Ubuntu/Debian:
sudo apt install postgresql postgresql-contrib

# macOS com Homebrew:
brew install postgresql

# Inicie o serviço
sudo service postgresql start  # Linux
brew services start postgresql  # macOS

# Crie o banco
createdb bratvacoder

# Obtenha a URL de conexão
# Formato: postgresql://usuario:senha@localhost:5432/bratvacoder
```

**Opção B: Docker**

```bash
docker run --name bratvacoder-db \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=bratvacoder \
  -p 5432:5432 \
  -d postgres:14
```

URL: `postgresql://postgres:mysecretpassword@localhost:5432/bratvacoder`

**Opção C: SQLite Local (Armazenamento Interno - EXPERIMENTAL)**

Para rodar 100% offline sem PostgreSQL, você pode modificar para usar SQLite:

1. Instale o pacote SQLite:
```bash
npm install better-sqlite3 drizzle-orm/better-sqlite3
```

2. Crie um arquivo `server/db-sqlite.ts`:
```typescript
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const sqlite = new Database('bratvacoder.db');
export const db = drizzle(sqlite);
```

3. Modifique `server/db.ts` para usar SQLite:
```typescript
// Troque o import do PostgreSQL pelo SQLite
import { db } from './db-sqlite';
export { db };
```

4. Atualize o schema em `shared/schema.ts` para compatibilidade SQLite:
- Substitua `serial` por `integer` com autoincrement
- Substitua `text[]` por JSON string

**Nota:** A opção SQLite é experimental e requer adaptações no schema Drizzle. A maioria das funcionalidades funcionará, mas algumas features como `ARRAY` columns precisam ser convertidas para JSON.

**Opção D: In-Memory Storage (Desenvolvimento Rápido)**

Para testes rápidos sem persistência:

1. Em `server/storage.ts`, use o `MemStorage` padrão
2. Os dados são armazenados em memória e perdidos ao reiniciar
3. Útil para desenvolvimento e testes

### Passo 4: Configure as Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```bash
# Database (OBRIGATÓRIO)
DATABASE_URL=postgresql://usuario:senha@localhost:5432/bratvacoder

# Sessões (OBRIGATÓRIO)
SESSION_SECRET=gere-uma-string-aleatoria-longa-aqui

# OpenAI (OBRIGATÓRIO para AI)
OPENAI_API_KEY=sk-...sua-chave-aqui...

# Brave Search (RECOMENDADO - 2000 queries grátis/mês)
# Obter em: https://brave.com/search/api/
BRAVE_SEARCH_API_KEY=BSA...sua-chave...

# Tavily Search (OPCIONAL - fallback)
# Obter em: https://tavily.com/
TAVILY_API_KEY=tvly-...sua-chave...

# Poe.com API (OPCIONAL - templates fallback)
# Obter em: https://poe.com/api_key
POE_API_KEY=...sua-chave...

# Redis (OPCIONAL - cache de performance)
REDIS_URL=redis://localhost:6379

# Loggly (OPCIONAL - logs centralizados)
LOGGLY_TOKEN=...seu-token...

# Auth Replit (apenas no Replit - NÃO necessário local)
# ISSUER_URL=https://replit.com/oidc
# REPL_ID=...
```

### Passo 5: Configure o Banco de Dados

```bash
# Aplique o schema
npm run db:push
```

### Passo 6: Inicie o Servidor

```bash
# Desenvolvimento (com hot reload)
npm run dev

# Produção
npm run build
npm start
```

### Passo 7: Acesse no Navegador

Abra: http://localhost:5000

---

## APIs e Variáveis de Ambiente

### APIs Obrigatórias

| API | Uso | Como Obter |
|-----|-----|------------|
| **OpenAI** | Geração de código, chat, autocomplete | https://platform.openai.com/api-keys |

### APIs Recomendadas

| API | Uso | Como Obter | Tier Gratuito |
|-----|-----|------------|---------------|
| **Brave Search** | Web search para o agente | https://brave.com/search/api/ | 2000 queries/mês |
| **Tavily** | Web search AI-native (fallback) | https://tavily.com/ | 1000 queries/mês |

### APIs Opcionais

| API | Uso | Como Obter |
|-----|-----|------------|
| **Poe.com** | Templates de código fallback | https://poe.com/api_key |
| **Redis** | Cache de performance | Redis Cloud ou local |
| **Loggly** | Logs centralizados | https://www.loggly.com/ |

### Variáveis do Sistema (Auto-configuradas no Replit)

| Variável | Descrição |
|----------|-----------|
| `ISSUER_URL` | URL do OIDC Replit |
| `REPL_ID` | ID do Repl |
| `REPL_SLUG` | Nome do Repl |
| `REPL_OWNER` | Dono do Repl |
| `PORT` | Porta (default: 5000) |

---

## Banco de Dados

### Schema (Drizzle ORM)

**Arquivo:** `shared/schema.ts`

```typescript
// Tabelas principais
users           // Usuários autenticados
sessions        // Sessões de login
projects        // Projetos criados
conversations   // Conversas do chat
messages        // Mensagens do chat
agentTasks      // Tarefas do agente (thinking, generating, etc)
webhooks        // Webhooks configurados
whatsapp_sessions // Sessões de bots WhatsApp
webhook_events  // Eventos de webhooks
```

### Comandos Úteis

```bash
# Aplicar mudanças no schema
npm run db:push

# Gerar migrations (se necessário)
npx drizzle-kit generate

# Ver studio do Drizzle
npx drizzle-kit studio
```

### Armazenamento Local (SQLite) - Alternativa

Para rodar 100% local sem PostgreSQL, seria necessário modificar o `server/db.ts`:

```typescript
// Atual (PostgreSQL)
import { Pool } from "@neondatabase/serverless";
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Alternativa (SQLite com better-sqlite3)
import Database from 'better-sqlite3';
export const db = new Database('bratvacoder.db');
```

**Nota:** Isso requer adaptações significativas no código.

---

## Serviços do Backend

### Serviços Principais (Arquivos > 10KB)

| Serviço | Arquivo | Linhas | Descrição |
|---------|---------|--------|-----------|
| Routes | `routes.ts` | ~4000 | Todas as rotas da API |
| Code Generator | `codeGenerator.ts` | ~1800 | Templates de código |
| Chat Service | `chatService.ts` | ~700 | Chat AI com streaming |
| Project Service | `projectService.ts` | ~550 | CRUD de projetos |
| Workspace Service | `workspaceService.ts` | ~600 | Gerenciamento de workspaces |
| Database Panel | `DatabasePanel.tsx` | ~550 | UI do viewer de DB |

### Endpoints da API

**Projetos:**
- `GET /api/projects` - Lista projetos
- `POST /api/projects` - Cria projeto
- `GET /api/projects/:id` - Detalhes do projeto
- `PUT /api/projects/:id` - Atualiza projeto
- `DELETE /api/projects/:id` - Remove projeto

**Chat:**
- `POST /api/chat` - Envia mensagem (SSE streaming)
- `GET /api/conversations/:id/messages` - Histórico

**Arquivos:**
- `GET /api/workspace/:projectId/files` - Lista arquivos
- `GET /api/workspace/:projectId/file` - Lê arquivo
- `POST /api/workspace/:projectId/file` - Salva arquivo
- `DELETE /api/workspace/:projectId/file` - Remove arquivo

**Git:**
- `POST /api/git/init` - Inicializa repo
- `POST /api/git/commit` - Commit
- `POST /api/git/push` - Push
- `GET /api/git/status` - Status

**Terminal:**
- `WS /ws/terminal/:projectId` - WebSocket PTY

**Web Search:**
- `POST /api/search` - Busca na web (Brave/Tavily)

---

## Componentes do Frontend

### Componentes da IDE (50+)

| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| `AgentActionBubble` | `AgentActionBubble.tsx` | Mostra ações do agente |
| `WorkspaceEditor` | `WorkspaceEditor.tsx` | Editor Monaco principal |
| `FileExplorer` | `FileExplorer.tsx` | Navegador de arquivos |
| `PreviewPanel` | `PreviewPanel.tsx` | Preview com hot reload |
| `RealTerminal` | `RealTerminal.tsx` | Terminal PTY |
| `GitPanel` | `GitPanel.tsx` | Controle de versão |
| `DatabasePanel` | `DatabasePanel.tsx` | Viewer de banco de dados |
| `SecretsPanel` | `SecretsPanel.tsx` | Variáveis de ambiente |
| `PackagesPanel` | `PackagesPanel.tsx` | Gerenciador npm |
| `DeployPanel` | `DeployPanel.tsx` | Deploy e export |
| `CheckpointPanel` | `CheckpointPanel.tsx` | Snapshots |
| `WebSearchPanel` | `WebSearchPanel.tsx` | Busca na web |
| `ImageGeneratorPanel` | `ImageGeneratorPanel.tsx` | Gerador DALL-E |
| `ThinkingVisualizer` | `ThinkingVisualizer.tsx` | Visualização de pensamento |
| `AutonomyControls` | `AutonomyControls.tsx` | Controles do agente autônomo |
| `BuildModeSelector` | `BuildModeSelector.tsx` | Seletor de modo |
| `PlanModeToggle` | `PlanModeToggle.tsx` | Toggle plan/build |
| `IntegrationsPanel` | `IntegrationsPanel.tsx` | Integrações externas |
| `PlaywrightTestPanel` | `PlaywrightTestPanel.tsx` | Testes E2E |
| `MobilePreview` | `MobilePreview.tsx` | Preview responsivo |

### Hooks Customizados

| Hook | Arquivo | Descrição |
|------|---------|-----------|
| `useStreamingChat` | `useStreamingChat.ts` | Chat com SSE streaming |
| `useToast` | `use-toast.ts` | Notificações toast |
| `useMobile` | `use-mobile.tsx` | Detecção de mobile |

---

## Comparação com Replit Agent

### ✅ Funcionalidades Equivalentes

| Funcionalidade | BRATVACODER | Replit Agent |
|----------------|-------------|--------------|
| Chat AI conversacional | ✅ | ✅ |
| Geração de código | ✅ | ✅ |
| Editor Monaco | ✅ | ✅ |
| Terminal real | ✅ | ✅ |
| File explorer | ✅ | ✅ |
| Preview com hot reload | ✅ | ✅ |
| Action bubbles | ✅ | ✅ |
| Plan/Build modes | ✅ | ✅ |
| Web search | ✅ | ✅ |
| Git integration | ✅ | ✅ |
| Checkpoints | ✅ | ✅ |
| Database viewer | ✅ | ✅ |
| Secrets manager | ✅ | ✅ |
| Screenshot-to-code | ✅ | ✅ |
| Package manager | ✅ | ✅ |

### ⚠️ Funcionalidades Parciais

| Funcionalidade | BRATVACODER | Replit Agent | O que falta |
|----------------|-------------|--------------|-------------|
| Deploy automático | ⚠️ Prepara ZIP | ✅ Um clique | Integração Vercel/Railway |
| Workspaces isolados | ⚠️ Pastas | ✅ Containers | Docker/VMs |
| Banco por projeto | ⚠️ Compartilhado | ✅ Isolado | Provisionar DBs |
| Logs de produção | ⚠️ Local | ✅ Tempo real | WebSocket para prod |

### ❌ Funcionalidades Faltantes

| Funcionalidade | BRATVACODER | Replit Agent | Complexidade |
|----------------|-------------|--------------|--------------|
| Apps rodando 24/7 | ❌ | ✅ | Alta - Docker/Cloud Run |
| Domínios personalizados | ❌ | ✅ | Média - Cloudflare API |
| Auto-scaling | ❌ | ✅ | Alta - Kubernetes |
| Colaboração em tempo real | ❌ | ✅ | Alta - CRDTs |
| Rollback de produção | ❌ | ✅ | Média - CI/CD |

---

## O Que Falta Para Funcionar Igual ao Replit

### 1. Infraestrutura de Produção (CRÍTICO)

**Problema:** Projetos criados não rodam 24/7

**Solução necessária:**
```
┌─────────────────────────────────────────────────────────┐
│                  Runtime Infrastructure                  │
├─────────────────────────────────────────────────────────┤
│  Opção A: Docker Containers                              │
│  • Cada projeto roda em container isolado               │
│  • Docker Compose para orquestração                     │
│  • Volume mounts para persistência                      │
│                                                         │
│  Opção B: Cloud Run / AWS ECS                           │
│  • Deploy automático via API                            │
│  • Auto-scaling baseado em tráfego                      │
│  • Pay-per-use                                          │
│                                                         │
│  Opção C: VPS + PM2                                     │
│  • PM2 para gerenciar processos Node.js                 │
│  • Nginx como reverse proxy                             │
│  • Mais controle, menos escalável                       │
└─────────────────────────────────────────────────────────┘
```

**Arquivos a criar:**
- `server/containerService.ts` - Gerenciamento de containers
- `server/orchestrationService.ts` - Orquestração
- `docker-compose.template.yml` - Template para projetos

### 2. Deploy Automático Real

**Problema:** Atualmente só exporta ZIP

**Solução necessária:**
```typescript
// server/productionDeployService.ts
interface DeployTarget {
  provider: 'vercel' | 'railway' | 'render' | 'cloudrun';
  apiKey: string;
  projectId: string;
}

async function deployToProduction(project: Project, target: DeployTarget) {
  // 1. Build do projeto
  // 2. Upload para provider
  // 3. Configurar domínio
  // 4. Retornar URL de produção
}
```

**APIs necessárias:**
- Vercel API: https://vercel.com/docs/rest-api
- Railway API: https://docs.railway.app/reference/public-api
- Render API: https://api-docs.render.com/
- Google Cloud Run API

### 3. Banco de Dados Isolado por Projeto

**Problema:** Todos os projetos usam o mesmo banco

**Solução necessária:**
```typescript
// server/projectDatabaseService.ts
async function provisionDatabase(projectId: string) {
  // Opção A: Neon.tech (PostgreSQL serverless)
  const db = await neon.createDatabase({
    name: `project_${projectId}`,
  });
  
  // Opção B: PlanetScale (MySQL serverless)
  // Opção C: Supabase (PostgreSQL + mais)
  
  return db.connectionString;
}
```

### 4. Monitoramento e Logs em Tempo Real

**Problema:** Não há logs de apps em produção

**Solução necessária:**
```typescript
// server/monitoringService.ts
class MonitoringService {
  private connections: Map<string, WebSocket[]>;
  
  streamLogs(projectId: string, ws: WebSocket) {
    // 1. Conectar ao container/serviço
    // 2. Stream de logs via WebSocket
    // 3. Persistir logs para histórico
  }
  
  getMetrics(projectId: string) {
    // CPU, memória, requests, errors
  }
}
```

### 5. Domínios Personalizados

**Problema:** Apps não têm URLs customizadas

**Solução necessária:**
```typescript
// server/domainService.ts
interface DomainConfig {
  domain: string;
  projectId: string;
  ssl: boolean;
}

async function configureDomain(config: DomainConfig) {
  // 1. Verificar DNS
  // 2. Configurar no Cloudflare/Route53
  // 3. Provisionar SSL (Let's Encrypt)
  // 4. Configurar reverse proxy
}
```

---

## Roadmap de Implementação

### Fase 1: APIs Essenciais (1-2 semanas)
1. ✅ Configurar Brave Search API (FEITO)
2. ⬜ Adicionar BRAVE_SEARCH_API_KEY ao ambiente
3. ⬜ Testar web search funcionando

### Fase 2: Deploy Básico (2-3 semanas)
1. ⬜ Integrar Vercel API para deploy one-click
2. ⬜ Integrar Railway API como alternativa
3. ⬜ UI de deploy com status em tempo real

### Fase 3: Workspaces Isolados (3-4 semanas)
1. ⬜ Criar containerService.ts com Docker API
2. ⬜ Templates de Dockerfile para cada tipo de projeto
3. ⬜ Sistema de billing/quotas

### Fase 4: Monitoramento (2-3 semanas)
1. ⬜ WebSocket para logs em tempo real
2. ⬜ Dashboard de métricas
3. ⬜ Alertas de erros

### Fase 5: Features Avançadas (4+ semanas)
1. ⬜ Domínios personalizados
2. ⬜ Auto-scaling
3. ⬜ Colaboração em tempo real (CRDTs)

---

## Conclusão

O **BRATVACODER** já possui a maior parte das funcionalidades do Replit Agent em termos de **desenvolvimento e edição**. O que falta são as funcionalidades de **produção e infraestrutura**:

| Categoria | Completude |
|-----------|------------|
| Chat e IA | 95% |
| Editor de código | 100% |
| Terminal | 100% |
| File system | 100% |
| Preview | 95% |
| Git | 90% |
| **Deploy/Produção** | **20%** |
| **Infraestrutura** | **10%** |

Para rodar **localmente** como ambiente de desenvolvimento, está praticamente completo. Para ser uma **plataforma de produção** como o Replit, precisa da infraestrutura de containers, deploy automático e monitoramento.

---

## Arquivos no GitHub

### O que está incluído no repositório:
- ✅ Todo o código fonte (TypeScript, JavaScript)
- ✅ Configurações (package.json, tsconfig, vite, tailwind)
- ✅ Componentes UI (React, Shadcn)
- ✅ Serviços backend (Express, APIs)
- ✅ Schema do banco (Drizzle)
- ✅ Templates de projetos
- ✅ Documentação (MD files)
- ✅ Assets de branding (JSON)

### O que NÃO está no repositório:
- ❌ `node_modules/` - Dependências (instalar com `npm install`)
- ❌ `workspaces/` - Projetos de usuários (dados sensíveis)
- ❌ `.env` - Variáveis de ambiente (configurar manualmente)
- ❌ `dist/` - Build compilado (gerar com `npm run build`)
- ❌ Arquivos binários grandes (imagens, vídeos)
- ❌ Cache temporário (`.cache/`, `.upm/`)

**Total de arquivos no repositório:** 236 arquivos de código

---

## Suporte

- **Repositório:** https://github.com/jmonkeyzapbratva/Bratvacodertest
- **Issues:** https://github.com/jmonkeyzapbratva/Bratvacodertest/issues

---

*Documentação gerada em Janeiro de 2026*
*Última atualização: Correções de armazenamento local e status de funcionalidades*
