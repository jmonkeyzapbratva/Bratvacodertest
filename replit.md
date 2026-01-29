# BRATVACODER

## Overview
BRATVACODER is an AI-powered code generator for Brazilian Portuguese speakers, aiming to be a "Replit for non-programmers." Users describe desired projects in Portuguese, and the system automatically generates complete, functional applications. Key capabilities include command-based project generation (`/build`, `/design`, `/debug`, `/memory`, `/deploy`), automatic configuration of databases, authentication, and payments, a live preview, and a natural language AI assistant that generates full-stack applications (React, Node.js, PostgreSQL). The business vision is to empower non-programmers to create applications, tapping into the Brazilian market with a localized and intuitive development experience.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: Shadcn/ui built on Radix UI
- **Styling**: Tailwind CSS with CSS variables
- **Build Tool**: Vite
- **Design System**: Linear Design + GitHub/VSCode aesthetic, Inter and JetBrains Mono fonts, Dark/light theme support, all UI text in Brazilian Portuguese.

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM
- **Build**: esbuild
- **Core Services**: AI code generation, project packaging, Replit authentication, GitHub integration, conversational AI chat orchestration, AI code analysis, real-time collaboration, project sharing, code commenting, hot reload, webhook management, package installation, web search, AI media generation, screenshot cloning for design analysis, database viewer, project checkpoints, and experimental features like build modes and E2E testing.
- **Agent Tools**: Integrated tools for package management, testing, web search, AI media generation, site cloning, database interaction, secrets management, real-time logs, checkpoints, and experimental build/testing/AI autonomy features.

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema**: `shared/schema.ts`
- **Migrations**: `drizzle-kit push`
- **Key Tables**: `users`, `sessions`, `projects`, `conversations`, `messages`, `agentTasks`, `webhooks`, `whatsapp_sessions`, `webhook_events`.

### Authentication
- **Provider**: Replit OpenID Connect
- **Session Storage**: PostgreSQL via `connect-pg-simple`
- **Implementation**: Passport.js with `openid-client` strategy.

### Security
- **Terminal Security**: Token-based WebSocket authentication with short-lived, one-time use tokens, session limits, inactivity timeouts, and project ownership validation.
- **Contextual Code Editing Security**: Path validation, file restriction for specific edits, and project ownership validation.

### Live Preview System
- Serves workspace files with intelligent URL rewriting for `index.html`, static assets, and dynamic content like `fetch()` calls. Injects `<base href>` for relative URLs.
- Hot Reload: Automatic preview updates via WebSocket when files are modified, triggering an iframe reload.

### Agent Task System
- Automatic task creation (`thinking`, `generating`, `writing`, `installing`, `running`, `command`) during chat processing, with statuses (pending, running, completed, failed) and visual progress indicators.
- UI component `AgentActionBubble` shows expandable action bubbles like Replit Agent.
- Streaming hook `useStreamingChat` tracks actions using ref-based state management for accurate progress updates.

### Web Search
- Real web search using DuckDuckGo Instant Answers API with fallback to curated programming resources.
- Caches results for 5 minutes to reduce API calls.

### Chat System
- Conversational AI chat that engages with the user to refine project understanding before generating code. Supports special commands (`/build`, `/design`, `/debug`, `/memory`, `/deploy`).

### Template System
- Expandable template system (`templates/`) with intelligent keyword detection in Brazilian Portuguese, offering web, API, bot, and automation categories. Includes a 3-layer fallback: Poe.com API, predefined templates, and generic JavaScript code.

## External Dependencies

### Authentication & Sessions
- Replit OIDC (requires `ISSUER_URL`, `REPL_ID`)
- `express-session` with PostgreSQL store

### Database
- PostgreSQL (via `DATABASE_URL`)
- Drizzle ORM

### AI/Code Generation
- OpenAI API (via `OPENAI_API_KEY`) using `gpt-4o-mini` model. Falls back to intelligent templates if API fails.
- Poe.com API (optional, via `POE_API_KEY`) for template system.

### File Handling
- Archiver for ZIP file creation.

### GitHub Integration
- `@octokit/rest` for GitHub API
- Replit Connectors for OAuth token management.

### Services Layer
- **CacheService**: Redis (if `REDIS_URL` is set) or in-memory fallback.
- **LoggingService**: Console logging with optional Loggly integration (via `LOGGLY_TOKEN`).

### Required Environment Variables
- `DATABASE_URL`
- `SESSION_SECRET`
- `REPL_ID`
- `ISSUER_URL`
- `POE_API_KEY` (or templates will fallback)
- `OPENAI_API_KEY`