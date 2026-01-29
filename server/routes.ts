import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertProjectSchema, insertConversationSchema, insertMessageSchema, insertCheckpointSchema } from "@shared/schema";
import { generateCode, generateCodeFromTemplate } from "./codeGenerator";
import { createProjectZip, parseCodeToFiles } from "./zipService";
import { sendChatMessage, createNewConversation, streamChatMessage } from "./chatService";
import { 
  parseCommand, 
  isCommand, 
  processBuildCommand, 
  processDesignCommand, 
  processDebugCommand, 
  processMemoryCommand, 
  processDeployCommand 
} from "./commandProcessor";
import { z } from "zod";
import {
  getGitHubUser,
  listUserRepos,
  createRepository,
  commitFiles,
  isGitHubConnected,
} from "./github";
import { cacheService, getServicesStatus } from "./services";
import { workspaceService } from "./workspaceService";
import * as gitService from "./gitService";
import * as packageService from "./packageService";
import * as diagnosticService from "./diagnosticService";
import * as aiContextService from "./aiContextService";
import * as envService from "./envService";
import * as databaseService from "./databaseService";
import * as deployService from "./deployService";
import * as authTemplateService from "./authTemplateService";
import * as aiAnalysisService from "./aiAnalysisService";
import * as aiAutocompleteService from "./aiAutocompleteService";
import { collaborationService } from "./collaborationService";
import * as sharingService from "./sharingService";
import * as commentsService from "./commentsService";
import * as engineerService from "./engineerService";
import { projectService } from "./projectService";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  
  // Inicializar serviços
  await cacheService.init().then(({ type }) => {
    console.log(`[SERVICES] Cache inicializado: ${type}`);
  });

  // Status dos serviços (público para diagnóstico)
  app.get("/api/services/status", async (_req, res) => {
    try {
      const status = await getServicesStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Falha ao obter status dos serviços" });
    }
  });

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Falha ao buscar usuário" });
    }
  });

  // Streaming chat endpoint using Server-Sent Events
  app.post("/api/chat/stream", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, conversationId, forceCode, model } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Mensagem é obrigatória" });
      }

      if (!conversationId) {
        return res.status(400).json({ message: "ID da conversa é obrigatório" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      try {
        const selectedModel = model === "gpt-4o" ? "gpt-4o" : "gpt-4o-mini";
        const stream = streamChatMessage(conversationId, message, userId, forceCode === true, selectedModel);
        let hadWorkspaceError = false;
        let completeEvent: any = null;
        
        for await (const event of stream) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
          
          if (event.type === "complete") {
            completeEvent = event;
            if (event.data?.workspaceError && event.data?.filesCreated === 0) {
              hadWorkspaceError = true;
            }
          }
        }
        
        if (hadWorkspaceError) {
          res.write(`data: ${JSON.stringify({ type: "failed", data: { message: "Falha ao criar workspace" } })}\n\n`);
        }
      } catch (streamError: any) {
        res.write(`data: ${JSON.stringify({ type: "error", data: { message: streamError.message } })}\n\n`);
      }

      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Error in streaming chat:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: error.message || "Erro ao processar mensagem" });
      }
    }
  });

  // Chat endpoint - main AI conversation with contextual understanding
  app.post("/api/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, conversationId, forceCode } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Mensagem é obrigatória" });
      }

      if (!conversationId) {
        return res.status(400).json({ message: "ID da conversa é obrigatório" });
      }

      const result = await sendChatMessage(conversationId, message, userId, forceCode === true);

      // Create project if code was generated (project is created in chatService now)
      // Skip duplicate project creation here

      // Check for workspace failure (code generated but no files written)
      if (result.workspaceError && result.filesCreated === 0) {
        return res.status(500).json({
          conversationId,
          message: result.message,
          isCodeReady: false,
          code: result.code,
          files: result.files,
          messageType: result.messageType,
          error: result.workspaceError,
          workspaceError: result.workspaceError,
        });
      }

      res.json({
        conversationId,
        message: result.message,
        isCodeReady: result.isCodeReady,
        code: result.code,
        files: result.files,
        messageType: result.messageType,
        projectId: result.projectId,
        workspaceSuccess: result.workspaceSuccess,
        filesCreated: result.filesCreated,
        filesTotal: result.filesTotal,
      });
    } catch (error: any) {
      console.error("Error in chat:", error);
      res.status(500).json({ message: error.message || "Erro ao processar mensagem" });
    }
  });

  // Contextual edit endpoint - edits existing files with AI context
  app.post("/api/chat/edit", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, conversationId: providedConvId, projectId, fileContext } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Mensagem é obrigatória" });
      }

      if (!projectId) {
        return res.status(400).json({ message: "projectId é obrigatório para edições" });
      }

      // Verify project belongs to user
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Acesso negado ao projeto" });
      }

      // Ensure we have a valid conversation
      let conversationId = providedConvId;
      if (!conversationId) {
        const newConv = await createNewConversation(userId);
        conversationId = newConv.id;
      }

      // Build contextual prompt
      let contextualPrompt = message;
      let fileExists = false;
      
      if (fileContext?.path) {
        try {
          const currentContent = await workspaceService.readFile(projectId, fileContext.path);
          fileExists = true;
          contextualPrompt = `Edite o arquivo "${fileContext.path}" conforme a instrução do usuário.

ARQUIVO ATUAL:
\`\`\`${fileContext.language || 'plaintext'}
${currentContent}
\`\`\`

INSTRUÇÃO DO USUÁRIO: ${message}

Responda com o código COMPLETO e atualizado do arquivo. Use o formato:
=== ARQUIVO: ${fileContext.path} ===
(código completo)
=== FIM ARQUIVO ===`;
        } catch (error) {
          // File doesn't exist, create new file prompt
          contextualPrompt = `Crie um novo arquivo "${fileContext.path}" conforme a instrução do usuário.

INSTRUÇÃO DO USUÁRIO: ${message}

Responda com o código do novo arquivo. Use o formato:
=== ARQUIVO: ${fileContext.path} ===
(código)
=== FIM ARQUIVO ===`;
          console.log(`[EDIT] Arquivo ${fileContext.path} não existe, criando novo`);
        }
      }

      // Use chat service with valid conversation
      const result = await sendChatMessage(conversationId, contextualPrompt, userId, true);

      // Write files to existing project workspace with path validation
      if (result.files && result.files.length > 0) {
        await workspaceService.initWorkspace(projectId);
        let filesUpdated = 0;
        
        // Allowed file path for contextual edit
        const allowedPath = fileContext?.path;
        
        for (const file of result.files) {
          try {
            let normalizedPath = file.filename.replace(/\\/g, "/");
            
            // Security: prevent path traversal attacks
            if (normalizedPath.includes("..") || normalizedPath.startsWith("/")) {
              console.warn(`[EDIT] Blocked path traversal attempt: ${normalizedPath}`);
              continue;
            }
            
            // Security: when editing specific file, only allow that exact file
            if (allowedPath && normalizedPath !== allowedPath) {
              console.warn(`[EDIT] Blocked unexpected file write: ${normalizedPath} (expected: ${allowedPath})`);
              continue;
            }
            
            await workspaceService.createFile(projectId, normalizedPath, file.content);
            filesUpdated++;
          } catch (fileError: any) {
            console.error(`[EDIT] Erro ao atualizar ${file.filename}: ${fileError.message}`);
          }
        }

        return res.json({
          success: true,
          message: result.message,
          filesUpdated,
          files: result.files,
          projectId,
          conversationId,
        });
      }

      res.json({
        success: true,
        message: result.message,
        filesUpdated: 0,
        projectId,
        conversationId,
      });
    } catch (error: any) {
      console.error("Error in contextual edit:", error);
      res.status(500).json({ message: error.message || "Erro ao processar edição" });
    }
  });

  // Command processor endpoint - handles /build, /design, /debug, /memory, /deploy
  app.post("/api/command", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { input, conversationId } = req.body;

      if (!input || typeof input !== "string") {
        return res.status(400).json({ message: "Comando é obrigatório" });
      }

      const { command, args } = parseCommand(input);

      if (!command) {
        return res.status(400).json({ 
          message: "Comando inválido. Use /build, /design, /debug, /memory ou /deploy" 
        });
      }

      let result;

      switch (command) {
        case "build":
          if (!args) {
            return res.status(400).json({ 
              message: "Descreva o que você quer criar. Ex: /build loja de roupas online" 
            });
          }
          result = await processBuildCommand(args, userId);
          break;

        case "design":
          result = await processDesignCommand(args);
          break;

        case "debug":
          result = await processDebugCommand(args);
          break;

        case "memory":
          result = await processMemoryCommand(args);
          break;

        case "deploy":
          result = await processDeployCommand(args, userId);
          break;

        default:
          return res.status(400).json({ message: "Comando não reconhecido" });
      }

      // Save command and result to conversation if provided
      if (conversationId) {
        await storage.createMessage({
          conversationId,
          role: "user",
          messageType: "command",
          content: input,
        });

        await storage.createMessage({
          conversationId,
          role: "assistant",
          messageType: "command-result",
          content: result.message,
          metadata: JSON.stringify(result),
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error processing command:", error);
      res.status(500).json({ message: error.message || "Erro ao processar comando" });
    }
  });

  // Project preview endpoint - serves generated project as HTML
  app.get("/preview/:projectId", async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Projeto nao encontrado</title>
            <style>
              body { font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
              .container { text-align: center; padding: 2rem; }
              h1 { color: #333; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Projeto nao encontrado</h1>
              <p>O projeto com ID ${projectId} nao existe.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Try to get real index.html from workspace
      const rewriteHtmlForPreview = (html: string, projectId: number): string => {
        const basePath = `/preview/${projectId}`;
        
        let result = html;
        
        // Rewrite double-quoted src/href attributes starting with /
        result = result.replace(/(src|href|action|data|poster|content)="\/([^"]*?)"/gi, `$1="${basePath}/$2"`);
        // Rewrite single-quoted src/href attributes starting with /
        result = result.replace(/(src|href|action|data|poster|content)='\/([^']*?)'/gi, `$1='${basePath}/$2'`);
        
        // Rewrite modulepreload and preload links
        result = result.replace(/(<link[^>]+rel=["']modulepreload["'][^>]+href=")\/([^"]+)"/gi, `$1${basePath}/$2"`);
        
        // Rewrite CSS url() references in inline styles
        result = result.replace(/url\(["']?\/([^)"']+)["']?\)/gi, `url("${basePath}/$1")`);
        
        // Rewrite import statements in inline scripts
        result = result.replace(/import\s+(?:[\w{},\s*]+\s+from\s+)?["']\/([^"']+)["']/gi, (match, path) => {
          return match.replace(`"/${path}"`, `"${basePath}/${path}"`).replace(`'/${path}'`, `'${basePath}/${path}'`);
        });
        
        // Rewrite fetch/XMLHttpRequest calls to /api
        result = result.replace(/fetch\(["']\/([^"']+)["']/gi, `fetch("${basePath}/$1"`);
        
        // Inject base tag for any remaining relative URLs
        const baseTag = `<base href="${basePath}/">`;
        if (result.includes('<head>')) {
          result = result.replace('<head>', `<head>\n    ${baseTag}`);
        } else if (result.includes('<html>')) {
          result = result.replace('<html>', `<html>\n  <head>\n    ${baseTag}\n  </head>`);
        } else {
          result = `<!DOCTYPE html>\n<html>\n  <head>\n    ${baseTag}\n  </head>\n  <body>\n${result}\n  </body>\n</html>`;
        }
        
        return result;
      };

      try {
        const indexHtml = await workspaceService.readFile(projectId, "index.html");
        return res.type('html').send(rewriteHtmlForPreview(indexHtml, projectId));
      } catch (e) {
        // No index.html in workspace, check for other HTML files
      }

      // Try public/index.html
      try {
        const publicIndexHtml = await workspaceService.readFile(projectId, "public/index.html");
        return res.type('html').send(rewriteHtmlForPreview(publicIndexHtml, projectId));
      } catch (e) {
        // No public/index.html either
      }

      // Fallback: Generate preview from project data
      const previewHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${project.name} - Preview</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; }
          </style>
        </head>
        <body class="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
          <header class="container mx-auto px-4 py-6">
            <nav class="flex justify-between items-center">
              <h1 class="text-2xl font-bold text-white">${project.name}</h1>
              <div class="space-x-4">
                <span class="text-white/70 text-sm">Preview ao Vivo</span>
              </div>
            </nav>
          </header>
          
          <main class="container mx-auto px-4 py-20 text-center">
            <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto">
              <h2 class="text-4xl font-bold text-white mb-6">
                ${project.name}
              </h2>
              <p class="text-xl text-purple-100 mb-8">
                ${project.description || 'Seu projeto incrivel esta pronto!'}
              </p>
              <div class="flex flex-wrap gap-2 justify-center mb-8">
                <span class="bg-white/20 text-white px-3 py-1 rounded-full text-sm">React</span>
                <span class="bg-white/20 text-white px-3 py-1 rounded-full text-sm">Node.js</span>
                <span class="bg-white/20 text-white px-3 py-1 rounded-full text-sm">PostgreSQL</span>
              </div>
              <button class="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-purple-100 transition">
                Acessar Site
              </button>
            </div>
          </main>
          
          <footer class="container mx-auto px-4 py-8 text-center">
            <p class="text-white/50 text-sm">
              Criado automaticamente pelo BratvaCoder
            </p>
          </footer>
        </body>
        </html>
      `;

      res.type('html').send(previewHtml);
    } catch (error: any) {
      console.error("Error generating preview:", error);
      res.status(500).send("Erro ao gerar preview");
    }
  });

  // Serve static files from project workspace
  app.get("/preview/:projectId/*", async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const filePath = req.params[0]; // Everything after projectId/
      
      if (!filePath || filePath.includes("..")) {
        return res.status(400).send("Invalid file path");
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).send("Project not found");
      }

      try {
        const fileContent = await workspaceService.readFile(projectId, filePath);
        
        // Determine content type
        const ext = filePath.split('.').pop()?.toLowerCase();
        const contentTypes: Record<string, string> = {
          'html': 'text/html',
          'css': 'text/css',
          'js': 'application/javascript',
          'json': 'application/json',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'svg': 'image/svg+xml',
          'ico': 'image/x-icon',
        };
        
        res.type(contentTypes[ext || ''] || 'text/plain').send(fileContent);
      } catch (e) {
        res.status(404).send("File not found");
      }
    } catch (error: any) {
      console.error("Error serving file:", error);
      res.status(500).send("Error serving file");
    }
  });

  // Create new conversation with welcome message
  app.post("/api/conversations/new", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await createNewConversation(userId);
      
      const messages = await storage.getMessages(conversation.id);
      
      res.json({
        conversation,
        messages,
      });
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: error.message || "Erro ao criar conversa" });
    }
  });

  // Legacy endpoint for template-based generation (keeping for backwards compatibility)
  app.post("/api/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, templateId } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Mensagem é obrigatória" });
      }

      let response: string;
      let code: string | null = null;

      if (templateId) {
        const result = await generateCodeFromTemplate(templateId, message);
        response = result.explanation;
        code = result.code;
      } else {
        const result = await generateCode(message);
        response = result.explanation;
        code = result.code;
      }

      // Create project if code was generated
      if (code) {
        const projectName = extractProjectName(message);
        await storage.createProject({
          userId,
          name: projectName,
          description: message.slice(0, 200),
          templateType: templateId || "custom",
          generatedCode: code,
          language: detectLanguage(code),
        });
      }

      res.json({
        response,
        code,
      });
    } catch (error) {
      console.error("Error in generate:", error);
      res.status(500).json({ message: "Erro ao gerar código" });
    }
  });

  // Conversations
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Erro ao buscar conversas" });
    }
  });

  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const conversation = await storage.getConversation(parseInt(req.params.id));
      if (!conversation) {
        return res.status(404).json({ message: "Conversa não encontrada" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Erro ao buscar conversa" });
    }
  });

  app.delete("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteConversation(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ message: "Erro ao excluir conversa" });
    }
  });

  // Messages
  app.get("/api/messages/:conversationId", isAuthenticated, async (req: any, res) => {
    try {
      const messages = await storage.getMessages(parseInt(req.params.conversationId));
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Erro ao buscar mensagens" });
    }
  });

  // Agent Tasks
  app.get("/api/conversations/:conversationId/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const tasks = await storage.getConversationTasks(conversationId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Erro ao buscar tarefas" });
    }
  });

  // Agent Settings
  app.get("/api/agent/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let settings = await storage.getAgentSettings(userId);
      
      if (!settings) {
        settings = await storage.upsertAgentSettings({
          userId,
          mode: "autonomous",
          operatingMode: "build",
          autonomyLevel: "high",
          buildApproach: "full-app",
          extendedThinking: false,
          appTesting: true,
          webSearch: true,
          mediaGeneration: true,
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching agent settings:", error);
      res.status(500).json({ message: "Erro ao buscar configurações do agente" });
    }
  });

  app.put("/api/agent/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { mode, operatingMode, autonomyLevel, buildApproach, extendedThinking, appTesting, webSearch, mediaGeneration } = req.body;
      
      const settings = await storage.upsertAgentSettings({
        userId,
        mode: mode || "autonomous",
        operatingMode: operatingMode || "build",
        autonomyLevel: autonomyLevel || "high",
        buildApproach: buildApproach || "full-app",
        extendedThinking: extendedThinking || false,
        appTesting: appTesting !== false,
        webSearch: webSearch !== false,
        mediaGeneration: mediaGeneration !== false,
      });
      
      res.json(settings);
    } catch (error) {
      console.error("Error updating agent settings:", error);
      res.status(500).json({ message: "Erro ao atualizar configurações do agente" });
    }
  });

  // Project Files
  app.get("/api/projects/:id/files", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const files = await storage.getProjectFiles(projectId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching project files:", error);
      res.status(500).json({ message: "Erro ao buscar arquivos do projeto" });
    }
  });

  // Projects
  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Erro ao buscar projetos" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(parseInt(req.params.id));
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Erro ao buscar projeto" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteProject(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Erro ao excluir projeto" });
    }
  });

  // Workspace API - Monaco Editor Integration
  app.get("/api/workspace/files", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.query.projectId as string);
      if (!projectId || isNaN(projectId)) {
        return res.status(400).json({ message: "ID do projeto é obrigatório" });
      }

      const files = await workspaceService.listFiles(projectId);
      res.json(files);
    } catch (error: any) {
      console.error("Error fetching workspace files:", error);
      res.status(500).json({ message: error.message || "Erro ao buscar arquivos" });
    }
  });

  app.get("/api/workspace/file/:projectId/:path(*)", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const filePath = req.params.path;
      
      if (!projectId || !filePath) {
        return res.status(400).json({ message: "projectId e path são obrigatórios" });
      }

      const content = await workspaceService.readFile(projectId, filePath);
      res.json({ path: filePath, content });
    } catch (error: any) {
      console.error("Error reading workspace file:", error);
      res.status(500).json({ message: error.message || "Erro ao ler arquivo" });
    }
  });

  app.post("/api/workspace/save", isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, path, content } = req.body;
      
      if (!projectId || !path) {
        return res.status(400).json({ message: "projectId e path são obrigatórios" });
      }

      await workspaceService.initWorkspace(projectId);
      
      try {
        await workspaceService.updateFile(projectId, path, content);
      } catch (e) {
        await workspaceService.createFile(projectId, path, content);
      }
      
      res.json({ success: true, path });
    } catch (error: any) {
      console.error("Error saving workspace file:", error);
      res.status(500).json({ message: error.message || "Erro ao salvar arquivo" });
    }
  });

  app.post("/api/workspace/create", isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, path, content = "" } = req.body;
      
      if (!projectId || !path) {
        return res.status(400).json({ message: "projectId e path são obrigatórios" });
      }

      await workspaceService.initWorkspace(projectId);
      await workspaceService.createFile(projectId, path, content);
      
      res.json({ success: true, path });
    } catch (error: any) {
      console.error("Error creating workspace file:", error);
      res.status(500).json({ message: error.message || "Erro ao criar arquivo" });
    }
  });

  app.delete("/api/workspace/file", isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, path } = req.body;
      
      if (!projectId || !path) {
        return res.status(400).json({ message: "projectId e path são obrigatórios" });
      }

      await workspaceService.deleteFile(projectId, path);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting workspace file:", error);
      res.status(500).json({ message: error.message || "Erro ao deletar arquivo" });
    }
  });

  // Download ZIP
  app.post("/api/download", async (req, res) => {
    try {
      const { code, language, projectName } = req.body;

      if (!code) {
        return res.status(400).json({ message: "Código é obrigatório" });
      }

      const zipBuffer = await createProjectZip(code, language || "javascript", projectName || "projeto");

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${projectName || "projeto"}.zip"`);
      res.send(zipBuffer);
    } catch (error) {
      console.error("Error creating zip:", error);
      res.status(500).json({ message: "Erro ao criar arquivo ZIP" });
    }
  });

  // Download ZIP from IDE files
  app.post("/api/projects/download", isAuthenticated, async (req: any, res) => {
    try {
      const { files, projectName } = req.body;

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ message: "Arquivos são obrigatórios" });
      }

      const archiver = require("archiver");
      const archive = archiver("zip", { zlib: { level: 9 } });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${projectName || "projeto-bratvacoder"}.zip"`
      );

      archive.pipe(res);

      for (const file of files) {
        if (file.path && file.content !== undefined) {
          archive.append(file.content, { name: file.path });
        }
      }

      await archive.finalize();
    } catch (error) {
      console.error("Error creating zip from IDE files:", error);
      res.status(500).json({ message: "Erro ao criar arquivo ZIP" });
    }
  });

  // GitHub Integration Routes
  app.get("/api/github/status", isAuthenticated, async (req: any, res) => {
    try {
      const connected = await isGitHubConnected();
      res.json({ connected });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  app.get("/api/github/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = await getGitHubUser();
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching GitHub user:", error);
      res.status(500).json({ message: "Erro ao buscar usuário do GitHub" });
    }
  });

  app.get("/api/github/repos", isAuthenticated, async (req: any, res) => {
    try {
      const repos = await listUserRepos();
      res.json(repos);
    } catch (error: any) {
      console.error("Error fetching repos:", error);
      res.status(500).json({ message: "Erro ao buscar repositórios" });
    }
  });

  app.post("/api/github/repos", isAuthenticated, async (req: any, res) => {
    try {
      const { name, description, isPrivate } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Nome do repositório é obrigatório" });
      }

      const repo = await createRepository({ name, description, isPrivate });
      res.json(repo);
    } catch (error: any) {
      console.error("Error creating repo:", error);
      if (error.status === 422) {
        res.status(422).json({ message: "Repositório já existe ou nome inválido" });
      } else {
        res.status(500).json({ message: "Erro ao criar repositório" });
      }
    }
  });

  app.post("/api/github/commit", isAuthenticated, async (req: any, res) => {
    try {
      const { owner, repo, code, message, language } = req.body;

      if (!owner || !repo || !code) {
        return res.status(400).json({ message: "Dados incompletos para commit" });
      }

      const files = parseCodeToFiles(code, language || "javascript");
      
      const result = await commitFiles({
        owner,
        repo,
        files,
        message: message || "Código gerado pelo BRATVACODER",
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error committing files:", error);
      res.status(500).json({ message: "Erro ao fazer commit" });
    }
  });

  app.post("/api/github/push-project", isAuthenticated, async (req: any, res) => {
    try {
      const { projectId, repoName, isPrivate, createNew } = req.body;

      if (!projectId) {
        return res.status(400).json({ message: "ID do projeto é obrigatório" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const user = await getGitHubUser();
      let targetRepo = repoName;

      if (createNew) {
        const newRepo = await createRepository({
          name: repoName || project.name.replace(/\s+/g, "-").toLowerCase(),
          description: project.description || "Projeto gerado pelo BRATVACODER",
          isPrivate: isPrivate ?? false,
        });
        targetRepo = newRepo.name;
      }

      if (!project.generatedCode) {
        return res.status(400).json({ message: "Projeto não possui código gerado" });
      }

      const files = parseCodeToFiles(project.generatedCode, project.language || "javascript");
      
      const result = await commitFiles({
        owner: user.login,
        repo: targetRepo,
        files,
        message: `Projeto ${project.name} - Gerado pelo BRATVACODER`,
      });

      await storage.updateProject(projectId, {
        githubRepo: `${user.login}/${targetRepo}`,
      });

      res.json({
        ...result,
        repoUrl: `https://github.com/${user.login}/${targetRepo}`,
      });
    } catch (error: any) {
      console.error("Error pushing project:", error);
      if (error.status === 422) {
        res.status(422).json({ message: "Repositório já existe" });
      } else {
        res.status(500).json({ message: "Erro ao enviar projeto para o GitHub" });
      }
    }
  });

  // ========================================
  // WORKSPACE & FILES API - Sistema de Arquivos Real
  // ========================================

  // Inicializar workspace para um projeto
  app.post("/api/projects/:id/workspace/init", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { template } = req.body;
      
      const workspacePath = await workspaceService.initWorkspace(projectId);
      
      if (template) {
        await workspaceService.createProjectFromTemplate(projectId, template);
      }
      
      res.json({ 
        success: true, 
        path: workspacePath,
        message: template ? `Workspace inicializado com template ${template}` : "Workspace inicializado"
      });
    } catch (error: any) {
      console.error("Error initializing workspace:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Listar arquivos do projeto
  app.get("/api/projects/:id/files", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const subPath = req.query.path as string || "";
      
      const files = await workspaceService.listFiles(projectId, subPath);
      res.json(files);
    } catch (error: any) {
      console.error("Error listing files:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Ler conteúdo de um arquivo
  app.get("/api/projects/:id/files/read", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const filePath = req.query.path as string;
      
      if (!filePath) {
        return res.status(400).json({ message: "Caminho do arquivo é obrigatório" });
      }
      
      const content = await workspaceService.readFile(projectId, filePath);
      res.json({ path: filePath, content });
    } catch (error: any) {
      console.error("Error reading file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Criar novo arquivo
  app.post("/api/projects/:id/files", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { path: filePath, content } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: "Caminho do arquivo é obrigatório" });
      }
      
      await workspaceService.createFile(projectId, filePath, content || "");
      res.json({ success: true, path: filePath });
    } catch (error: any) {
      console.error("Error creating file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Atualizar arquivo existente
  app.put("/api/projects/:id/files", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { path: filePath, content } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: "Caminho do arquivo é obrigatório" });
      }
      
      await workspaceService.updateFile(projectId, filePath, content);
      res.json({ success: true, path: filePath });
    } catch (error: any) {
      console.error("Error updating file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Deletar arquivo (aceita path de query params OU body)
  app.delete("/api/projects/:id/files", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const filePath = (req.query.path as string) || (req.body?.path as string);
      
      if (!filePath) {
        return res.status(400).json({ message: "Caminho do arquivo é obrigatório" });
      }
      
      await workspaceService.deleteFile(projectId, filePath);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Criar diretório
  app.post("/api/projects/:id/folders", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { path: folderPath } = req.body;
      
      if (!folderPath) {
        return res.status(400).json({ message: "Caminho do diretório é obrigatório" });
      }
      
      await workspaceService.createDirectory(projectId, folderPath);
      res.json({ success: true, path: folderPath });
    } catch (error: any) {
      console.error("Error creating folder:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // COMMAND RUNNER - Executar comandos npm, etc
  // ========================================

  // Executar comando no workspace (SSE para streaming de output)
  app.post("/api/projects/:id/run", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { command } = req.body;
      
      if (!command) {
        return res.status(400).json({ message: "Comando é obrigatório" });
      }
      
      // SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      
      res.write(`data: ${JSON.stringify({ type: "start", command })}\n\n`);
      
      const onStdout = (data: string) => {
        res.write(`data: ${JSON.stringify({ type: "stdout", data })}\n\n`);
      };
      
      const onStderr = (data: string) => {
        res.write(`data: ${JSON.stringify({ type: "stderr", data })}\n\n`);
      };
      
      const result = await workspaceService.runCommandWithStreams(projectId, command, onStdout, onStderr);
      
      res.write(`data: ${JSON.stringify({ type: "complete", ...result })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Error running command:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: error.message });
      }
    }
  });

  // Instalar dependências
  app.post("/api/projects/:id/install", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { packages } = req.body;
      
      // SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      
      const pkgList = packages || [];
      res.write(`data: ${JSON.stringify({ type: "start", packages: pkgList })}\n\n`);
      
      const result = await workspaceService.installDependencies(projectId, pkgList, (output) => {
        res.write(`data: ${JSON.stringify({ type: "output", data: output })}\n\n`);
      });
      
      res.write(`data: ${JSON.stringify({ type: "complete", ...result })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Error installing dependencies:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: error.message });
      }
    }
  });

  // Detectar imports e instalar dependências faltantes
  app.post("/api/projects/:id/detect-deps", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const imports = await workspaceService.detectImports(projectId);
      res.json({ imports });
    } catch (error: any) {
      console.error("Error detecting dependencies:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // DEV SERVER - Preview ao vivo
  // ========================================

  // Iniciar servidor de desenvolvimento
  app.post("/api/projects/:id/server/start", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { port, url } = await workspaceService.startDevServer(projectId);
      res.json({ success: true, port, url });
    } catch (error: any) {
      console.error("Error starting dev server:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Parar servidor de desenvolvimento
  app.post("/api/projects/:id/server/stop", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      await workspaceService.stopDevServer(projectId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error stopping dev server:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Estatísticas do projeto
  app.get("/api/projects/:id/stats", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const stats = workspaceService.getProjectStats(projectId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting project stats:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // GIT API - Controle de Versão Local
  // ========================================

  // Inicializar repositório Git
  app.post("/api/projects/:id/git/init", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const success = await gitService.initGitRepo(projectId);
      res.json({ success });
    } catch (error: any) {
      console.error("Error initializing git:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Status do Git
  app.get("/api/projects/:id/git/status", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const status = await gitService.getGitStatus(projectId);
      res.json(status);
    } catch (error: any) {
      console.error("Error getting git status:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Log de commits
  app.get("/api/projects/:id/git/log", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      const commits = await gitService.getGitLog(projectId, limit);
      res.json(commits);
    } catch (error: any) {
      console.error("Error getting git log:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Stage arquivos
  app.post("/api/projects/:id/git/stage", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { files } = req.body;
      const success = await gitService.stageFiles(projectId, files || []);
      res.json({ success });
    } catch (error: any) {
      console.error("Error staging files:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Unstage arquivos
  app.post("/api/projects/:id/git/unstage", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { files } = req.body;
      const success = await gitService.unstageFiles(projectId, files || []);
      res.json({ success });
    } catch (error: any) {
      console.error("Error unstaging files:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Commit
  app.post("/api/projects/:id/git/commit", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ message: "Mensagem de commit é obrigatória" });
      }
      const result = await gitService.commit(projectId, message);
      res.json(result);
    } catch (error: any) {
      console.error("Error committing:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Auto-commit
  app.post("/api/projects/:id/git/auto-commit", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { description } = req.body;
      const result = await gitService.autoCommit(projectId, description);
      res.json(result);
    } catch (error: any) {
      console.error("Error auto-committing:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Diff de arquivo
  app.get("/api/projects/:id/git/diff", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const file = req.query.file as string;
      const staged = req.query.staged === "true";
      
      if (file) {
        const diff = await gitService.getFileDiff(projectId, file, staged);
        res.json(diff);
      } else {
        const diffs = await gitService.getAllDiffs(projectId, staged);
        res.json(diffs);
      }
    } catch (error: any) {
      console.error("Error getting diff:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Rollback para commit
  app.post("/api/projects/:id/git/rollback", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { commitHash } = req.body;
      if (!commitHash) {
        return res.status(400).json({ message: "Hash do commit é obrigatório" });
      }
      const result = await gitService.rollbackToCommit(projectId, commitHash);
      res.json(result);
    } catch (error: any) {
      console.error("Error rolling back:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Listar branches
  app.get("/api/projects/:id/git/branches", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const branches = await gitService.listBranches(projectId);
      res.json(branches);
    } catch (error: any) {
      console.error("Error listing branches:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // PACKAGES API - Gerenciamento de Dependências
  // ========================================

  // Listar pacotes instalados
  app.get("/api/projects/:id/packages", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const packages = await packageService.listInstalledPackages(projectId);
      res.json(packages);
    } catch (error: any) {
      console.error("Error listing packages:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Detectar pacotes faltantes
  app.get("/api/projects/:id/packages/missing", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const missing = await packageService.detectMissingPackages(projectId);
      res.json({ missing });
    } catch (error: any) {
      console.error("Error detecting missing packages:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Instalar pacotes
  app.post("/api/projects/:id/packages/install", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { packages, isDev } = req.body;
      
      if (!packages || !Array.isArray(packages) || packages.length === 0) {
        return res.status(400).json({ message: "Lista de pacotes é obrigatória" });
      }
      
      const result = await packageService.installPackages(projectId, packages, isDev);
      res.json(result);
    } catch (error: any) {
      console.error("Error installing packages:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Auto-instalar pacotes faltantes
  app.post("/api/projects/:id/packages/auto-install", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const result = await packageService.autoInstallMissing(projectId);
      res.json(result);
    } catch (error: any) {
      console.error("Error auto-installing packages:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Remover pacote
  app.delete("/api/projects/:id/packages/:name", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const packageName = req.params.name;
      const result = await packageService.removePackage(projectId, packageName);
      res.json(result);
    } catch (error: any) {
      console.error("Error removing package:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Detectar tipo de projeto
  app.get("/api/projects/:id/type", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const projectType = packageService.detectProjectType(projectId);
      res.json({ type: projectType });
    } catch (error: any) {
      console.error("Error detecting project type:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // DIAGNOSTICS API - Deteccao de Erros
  // ========================================

  // Analisar projeto para erros e warnings
  app.get("/api/projects/:id/diagnostics", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const diagnostics = await diagnosticService.getProjectDiagnostics(projectId);
      res.json(diagnostics);
    } catch (error: any) {
      console.error("Error getting diagnostics:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Parsear erros do console
  app.post("/api/diagnostics/parse", isAuthenticated, async (req: any, res) => {
    try {
      const { output } = req.body;
      if (!output) {
        return res.status(400).json({ message: "Output e obrigatorio" });
      }
      const errors = diagnosticService.parseConsoleErrors(output);
      const missingModules = diagnosticService.extractMissingModules(errors);
      res.json({ errors, missingModules });
    } catch (error: any) {
      console.error("Error parsing errors:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Gerar relatorio de erros
  app.post("/api/projects/:id/diagnostics/report", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const diagnostics = await diagnosticService.getProjectDiagnostics(projectId);
      const allErrors = diagnostics.flatMap(d => [...d.errors, ...d.warnings]);
      const report = diagnosticService.generateErrorReport(allErrors);
      res.json({ report, totalIssues: allErrors.length });
    } catch (error: any) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // AI CONTEXT API - Contexto do Projeto
  // ========================================

  // Obter contexto do projeto
  app.get("/api/projects/:id/context", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const context = await aiContextService.buildProjectContext(projectId);
      res.json({
        projectName: context.projectName,
        projectType: context.projectType,
        structure: context.structure,
        dependencies: context.dependencies,
        recentChanges: context.recentChanges,
        fileCount: context.files.length
      });
    } catch (error: any) {
      console.error("Error getting context:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Analisar arquivo existente
  app.get("/api/projects/:id/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const filePath = req.query.file as string;
      if (!filePath) {
        return res.status(400).json({ message: "Caminho do arquivo e obrigatorio" });
      }
      const analysis = await aiContextService.analyzeExistingCode(projectId, filePath);
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Invalidar cache de contexto
  app.post("/api/projects/:id/context/refresh", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      aiContextService.invalidateContext(projectId);
      const context = await aiContextService.buildProjectContext(projectId);
      res.json({ success: true, fileCount: context.files.length });
    } catch (error: any) {
      console.error("Error refreshing context:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // ENVIRONMENT & SECRETS API
  // ========================================

  // Listar variaveis de ambiente
  app.get("/api/projects/:id/env", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const variables = await envService.readEnvFile(projectId);
      const maskedVars = variables.map(v => ({
        ...v,
        value: v.isSecret ? envService.getSecrets(projectId).then(s => s.find(sec => sec.key === v.key)?.masked || "***") : v.value
      }));
      res.json(variables);
    } catch (error: any) {
      console.error("Error reading env:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Definir variavel de ambiente
  app.post("/api/projects/:id/env", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { key, value, isSecret } = req.body;
      
      if (!key || !value) {
        return res.status(400).json({ message: "Key e value sao obrigatorios" });
      }
      
      if (isSecret) {
        await envService.setSecret(projectId, key, value);
      } else {
        await envService.setEnvVariable(projectId, key, value);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error setting env:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Deletar variavel de ambiente
  app.delete("/api/projects/:id/env/:key", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const key = req.params.key;
      await envService.deleteEnvVariable(projectId, key);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting env:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Listar secrets (mascarados)
  app.get("/api/projects/:id/secrets", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const secrets = await envService.getSecrets(projectId);
      res.json(secrets);
    } catch (error: any) {
      console.error("Error getting secrets:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Adicionar secret
  app.post("/api/projects/:id/secrets", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { key, value } = req.body;
      
      if (!key || !value) {
        return res.status(400).json({ message: "Key e value sao obrigatorios" });
      }
      
      await envService.setSecret(projectId, key, value);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error setting secret:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Deletar secret
  app.delete("/api/projects/:id/secrets/:key", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const key = req.params.key;
      await envService.deleteSecret(projectId, key);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting secret:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Detectar variaveis de ambiente faltantes
  app.get("/api/projects/:id/env/missing", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const missing = await envService.getMissingEnvVars(projectId);
      res.json({ missing });
    } catch (error: any) {
      console.error("Error detecting missing env:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // DATABASE API - Gerenciamento de BD
  // ========================================

  // Obter configuracao do banco
  app.get("/api/projects/:id/database", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const config = await databaseService.getDatabaseConfig(projectId);
      res.json(config || { type: null, tables: [] });
    } catch (error: any) {
      console.error("Error getting database config:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Inicializar banco de dados
  app.post("/api/projects/:id/database/init", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { type, name } = req.body;
      const config = await databaseService.initializeDatabase(projectId, { type, name });
      res.json(config);
    } catch (error: any) {
      console.error("Error initializing database:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Adicionar tabela
  app.post("/api/projects/:id/database/tables", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const table = req.body;
      
      if (!table.name || !table.columns) {
        return res.status(400).json({ message: "Nome e colunas sao obrigatorios" });
      }
      
      const config = await databaseService.addTable(projectId, table);
      res.json(config);
    } catch (error: any) {
      console.error("Error adding table:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Remover tabela
  app.delete("/api/projects/:id/database/tables/:name", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const tableName = req.params.name;
      await databaseService.removeTable(projectId, tableName);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing table:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Setup automatico a partir de descricao
  app.post("/api/projects/:id/database/auto-setup", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { description } = req.body;
      
      if (!description) {
        return res.status(400).json({ message: "Descricao e obrigatoria" });
      }
      
      const config = await databaseService.setupDatabaseFromDescription(projectId, description);
      res.json(config);
    } catch (error: any) {
      console.error("Error auto-setting up database:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Detectar tabelas a partir de descricao
  app.post("/api/database/detect-tables", isAuthenticated, async (req: any, res) => {
    try {
      const { description } = req.body;
      
      if (!description) {
        return res.status(400).json({ message: "Descricao e obrigatoria" });
      }
      
      const tables = databaseService.detectTablesFromDescription(description);
      res.json({ tables });
    } catch (error: any) {
      console.error("Error detecting tables:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // DEPLOY API - Publicacao de Projetos
  // ========================================

  // Obter configuracao de deploy
  app.get("/api/projects/:id/deploy/config", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const config = await deployService.getDeployConfig(projectId);
      res.json(config || { type: null });
    } catch (error: any) {
      console.error("Error getting deploy config:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Configurar deploy
  app.post("/api/projects/:id/deploy/config", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const config = await deployService.setDeployConfig(projectId, req.body);
      res.json(config);
    } catch (error: any) {
      console.error("Error setting deploy config:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Gerar pacote de deploy (ZIP)
  app.get("/api/projects/:id/deploy/package", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const zipBuffer = await deployService.generateDeployPackage(projectId);
      
      res.set({
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=project-${projectId}.zip`,
        "Content-Length": zipBuffer.length,
      });
      
      res.send(zipBuffer);
    } catch (error: any) {
      console.error("Error generating deploy package:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Iniciar deploy
  app.post("/api/projects/:id/deploy", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const status = await deployService.createDeployment(projectId);
      res.json(status);
    } catch (error: any) {
      console.error("Error creating deployment:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Status do deploy
  app.get("/api/deploy/:deployId/status", isAuthenticated, async (req: any, res) => {
    try {
      const { deployId } = req.params;
      const status = await deployService.getDeploymentStatus(deployId);
      if (!status) {
        return res.status(404).json({ message: "Deploy nao encontrado" });
      }
      res.json(status);
    } catch (error: any) {
      console.error("Error getting deploy status:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Listar deploys do projeto
  app.get("/api/projects/:id/deploy/history", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const deployments = await deployService.listDeployments(projectId);
      res.json(deployments);
    } catch (error: any) {
      console.error("Error listing deployments:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Gerar README
  app.get("/api/projects/:id/readme", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const readme = await deployService.generateReadme(projectId);
      res.json({ content: readme });
    } catch (error: any) {
      console.error("Error generating readme:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // AUTH TEMPLATES API - Templates de Autenticacao
  // ========================================

  // Listar templates de autenticacao
  app.get("/api/auth-templates", isAuthenticated, async (req: any, res) => {
    try {
      const templates = authTemplateService.getAuthTemplatesList();
      res.json(templates);
    } catch (error: any) {
      console.error("Error listing auth templates:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Obter template de autenticacao
  app.get("/api/auth-templates/:type", isAuthenticated, async (req: any, res) => {
    try {
      const { type } = req.params;
      const template = authTemplateService.generateAuthTemplate(type as any);
      res.json(template);
    } catch (error: any) {
      console.error("Error getting auth template:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Aplicar template de autenticacao em um projeto
  app.post("/api/projects/:id/auth-template", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { type } = req.body;
      
      if (!type) {
        return res.status(400).json({ message: "Tipo de autenticacao e obrigatorio" });
      }
      
      const template = authTemplateService.generateAuthTemplate(type);
      
      for (const file of template.files) {
        await workspaceService.createFile(projectId, file.path, file.content);
      }
      
      res.json({
        success: true,
        filesCreated: template.files.length,
        dependencies: template.dependencies,
      });
    } catch (error: any) {
      console.error("Error applying auth template:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // AI ANALYSIS API - Analise Avancada de Codigo
  // ========================================

  // Analisar codigo
  app.post("/api/analyze/code", isAuthenticated, async (req: any, res) => {
    try {
      const { code, language } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Codigo e obrigatorio" });
      }
      
      const analysis = await aiAnalysisService.analyzeCode(code, language || "javascript");
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing code:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Analisar arquivo de projeto
  app.get("/api/projects/:id/analyze/:filePath(*)", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const filePath = req.params.filePath;
      
      const content = await workspaceService.readFile(projectId, filePath);
      const language = filePath.split(".").pop() || "text";
      const analysis = await aiAnalysisService.analyzeCode(content, language);
      
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Gerar sugestoes para arquivo
  app.get("/api/projects/:id/suggestions/:filePath(*)", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const filePath = req.params.filePath;
      
      const suggestions = await aiAnalysisService.generateCodeSuggestions(projectId, filePath);
      res.json({ suggestions });
    } catch (error: any) {
      console.error("Error generating suggestions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Explicar codigo
  app.post("/api/analyze/explain", isAuthenticated, async (req: any, res) => {
    try {
      const { code, language } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Codigo e obrigatorio" });
      }
      
      const explanation = await aiAnalysisService.explainCode(code, language || "javascript");
      res.json({ explanation });
    } catch (error: any) {
      console.error("Error explaining code:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Sugerir refatoracao
  app.post("/api/analyze/refactor", isAuthenticated, async (req: any, res) => {
    try {
      const { code, language } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Codigo e obrigatorio" });
      }
      
      const suggestions = await aiAnalysisService.suggestRefactor(code, language || "javascript");
      res.json({ suggestions });
    } catch (error: any) {
      console.error("Error suggesting refactor:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // AI AUTOCOMPLETE API - Copilot-style Completions
  // ========================================

  // Obter autocomplete suggestions
  app.post("/api/autocomplete", isAuthenticated, async (req: any, res) => {
    try {
      const { code, language, cursorPosition, prefix, suffix } = req.body;
      
      const result = await aiAutocompleteService.getCompletions({
        code: code || "",
        language: language || "javascript",
        cursorPosition: cursorPosition || 0,
        prefix: prefix || code || "",
        suffix: suffix || "",
      });
      
      res.json(result);
    } catch (error: any) {
      console.error("Error getting completions:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Obter inline completion (ghost text)
  app.post("/api/autocomplete/inline", isAuthenticated, async (req: any, res) => {
    try {
      const { code, cursorLine, cursorColumn, language } = req.body;
      
      const completion = await aiAutocompleteService.getInlineCompletion(
        code || "",
        cursorLine || 0,
        cursorColumn || 0,
        language || "javascript"
      );
      
      res.json({ completion });
    } catch (error: any) {
      console.error("Error getting inline completion:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // ENGINEER API - Code Review & Improvement
  // ========================================

  const engineerReviewSchema = z.object({
    code: z.string().min(1).max(100000),
    language: z.string().optional().default("javascript"),
    framework: z.string().optional(),
    projectType: z.string().optional(),
    focusAreas: z.array(z.enum(["security", "performance", "quality", "bugs"])).optional(),
  });

  const engineerFilesSchema = z.object({
    files: z.array(z.object({
      path: z.string().min(1).max(500),
      content: z.string().min(0).max(100000),
    })).min(1).max(50),
    framework: z.string().optional(),
    projectType: z.string().optional(),
  });

  // Revisar codigo com Engineer
  app.post("/api/engineer/review", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = engineerReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados invalidos", errors: parsed.error.errors });
      }
      
      const { code, language, framework, projectType, focusAreas } = parsed.data;
      
      const review = await engineerService.reviewCode(code, {
        language: language || "javascript",
        framework,
        projectType,
        focusAreas,
      });
      
      res.json(review);
    } catch (error: any) {
      console.error("Error in engineer review:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Melhorar codigo com Engineer
  app.post("/api/engineer/improve", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = engineerReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados invalidos", errors: parsed.error.errors });
      }
      
      const { code, language, framework, projectType } = parsed.data;
      
      const context = {
        language: language || "javascript",
        framework,
        projectType,
      };
      
      const result = await engineerService.reviewAndImprove(code, context);
      res.json(result);
    } catch (error: any) {
      console.error("Error in engineer improve:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Revisar multiplos arquivos
  app.post("/api/engineer/review-files", isAuthenticated, async (req: any, res) => {
    try {
      const parsed = engineerFilesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Dados invalidos", errors: parsed.error.errors });
      }
      
      const { files, framework, projectType } = parsed.data;
      
      const reviews = await engineerService.reviewMultipleFiles(files, {
        language: "javascript",
        framework,
        projectType,
      });
      
      res.json({ reviews });
    } catch (error: any) {
      console.error("Error in engineer review-files:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // COLLABORATION API - Multiplayer Editing
  // ========================================
  
  collaborationService.initialize(httpServer);
  
  // Obter info de colaboracao de um projeto
  app.get("/api/projects/:id/collaboration", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const info = collaborationService.getRoomInfo(projectId);
      
      if (!info) {
        return res.json({ collaborators: [], chatHistory: [] });
      }
      
      res.json(info);
    } catch (error: any) {
      console.error("Error getting collaboration info:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Listar projetos com colaboracao ativa
  app.get("/api/collaboration/active", isAuthenticated, async (req: any, res) => {
    try {
      const activeRooms = collaborationService.getActiveRooms();
      res.json({ projects: activeRooms });
    } catch (error: any) {
      console.error("Error listing active rooms:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // SHARING API - Compartilhamento de Projetos
  // ========================================

  // Criar link de compartilhamento
  app.post("/api/projects/:id/share", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { shareType, password, expiresIn } = req.body;
      
      const share = await sharingService.createShareLink(projectId, userId, {
        shareType,
        password,
        expiresIn,
      });
      
      res.json(share);
    } catch (error: any) {
      console.error("Error creating share link:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Obter links de compartilhamento de um projeto
  app.get("/api/projects/:id/shares", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const shares = await sharingService.getProjectShareLinks(projectId, userId);
      res.json({ shares });
    } catch (error: any) {
      console.error("Error getting share links:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Revogar link de compartilhamento
  app.delete("/api/share/:shareId", isAuthenticated, async (req: any, res) => {
    try {
      const shareId = req.params.shareId;
      const userId = req.user.claims.sub;
      
      const success = await sharingService.revokeShareLink(shareId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Link nao encontrado ou sem permissao" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error revoking share link:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Acessar projeto via link
  app.get("/api/share/:shareId", async (req: any, res) => {
    try {
      const shareId = req.params.shareId;
      const password = req.query.password as string | undefined;
      
      const result = await sharingService.getShareByLink(shareId, password);
      
      if (!result.valid) {
        return res.status(403).json({ message: result.error });
      }
      
      res.json(result.share);
    } catch (error: any) {
      console.error("Error accessing shared project:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Adicionar colaborador a um projeto
  app.post("/api/projects/:id/collaborators", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const ownerId = req.user.claims.sub;
      const { collaboratorId, permission } = req.body;
      
      if (!collaboratorId) {
        return res.status(400).json({ message: "ID do colaborador e obrigatorio" });
      }
      
      const sharePermission = await sharingService.addCollaborator(
        projectId,
        ownerId,
        collaboratorId,
        permission || "view"
      );
      
      res.json(sharePermission);
    } catch (error: any) {
      console.error("Error adding collaborator:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Remover colaborador de um projeto
  app.delete("/api/projects/:id/collaborators/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.params.userId;
      
      const success = await sharingService.removeCollaborator(projectId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Colaborador nao encontrado" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error removing collaborator:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Listar colaboradores de um projeto
  app.get("/api/projects/:id/collaborators", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const collaborators = await sharingService.getProjectCollaborators(projectId);
      res.json({ collaborators });
    } catch (error: any) {
      console.error("Error listing collaborators:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Verificar acesso a projeto
  app.get("/api/projects/:id/access", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const access = await sharingService.checkAccess(projectId, userId);
      res.json(access);
    } catch (error: any) {
      console.error("Error checking access:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Fork de projeto
  app.post("/api/projects/:id/fork", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const result = await sharingService.forkProject(projectId, userId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.error });
      }
      
      res.json({ success: true, projectId: result.newProjectId });
    } catch (error: any) {
      console.error("Error forking project:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Listar projetos compartilhados comigo
  app.get("/api/projects/shared-with-me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const shared = await sharingService.getSharedWithMe(userId);
      res.json({ projects: shared });
    } catch (error: any) {
      console.error("Error listing shared projects:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // COMMENTS API - Comentarios em Codigo
  // ========================================

  // Criar comentario
  app.post("/api/projects/:id/comments", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const userName = req.user.claims.name || "Usuario";
      const { filePath, lineStart, lineEnd, content } = req.body;
      
      if (!filePath || !content || lineStart === undefined) {
        return res.status(400).json({ message: "filePath, lineStart e content sao obrigatorios" });
      }
      
      const comment = await commentsService.createComment(
        projectId,
        filePath,
        lineStart,
        lineEnd || lineStart,
        content,
        userId,
        userName
      );
      
      res.json(comment);
    } catch (error: any) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Listar comentarios de um projeto
  app.get("/api/projects/:id/comments", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const filePath = req.query.filePath as string | undefined;
      const includeResolved = req.query.includeResolved === "true";
      
      const comments = await commentsService.getProjectComments(projectId, filePath, includeResolved);
      res.json({ comments });
    } catch (error: any) {
      console.error("Error listing comments:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Obter threads de comentarios
  app.get("/api/projects/:id/comment-threads", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const threads = await commentsService.getCommentThreads(projectId);
      res.json({ threads });
    } catch (error: any) {
      console.error("Error getting comment threads:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Obter contagem de comentarios nao resolvidos
  app.get("/api/projects/:id/comments/unresolved-count", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const count = await commentsService.getUnresolvedCount(projectId);
      res.json({ count });
    } catch (error: any) {
      console.error("Error getting unresolved count:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Atualizar comentario
  app.patch("/api/projects/:id/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const commentId = req.params.commentId;
      const userId = req.user.claims.sub;
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "content e obrigatorio" });
      }
      
      const comment = await commentsService.updateComment(projectId, commentId, content, userId);
      
      if (!comment) {
        return res.status(404).json({ message: "Comentario nao encontrado ou sem permissao" });
      }
      
      res.json(comment);
    } catch (error: any) {
      console.error("Error updating comment:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Deletar comentario
  app.delete("/api/projects/:id/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const commentId = req.params.commentId;
      const userId = req.user.claims.sub;
      
      const success = await commentsService.deleteComment(projectId, commentId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Comentario nao encontrado ou sem permissao" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Resolver comentario
  app.post("/api/projects/:id/comments/:commentId/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const commentId = req.params.commentId;
      const userId = req.user.claims.sub;
      
      const comment = await commentsService.resolveComment(projectId, commentId, userId);
      
      if (!comment) {
        return res.status(404).json({ message: "Comentario nao encontrado" });
      }
      
      res.json(comment);
    } catch (error: any) {
      console.error("Error resolving comment:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Reabrir comentario
  app.post("/api/projects/:id/comments/:commentId/unresolve", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const commentId = req.params.commentId;
      
      const comment = await commentsService.unresolveComment(projectId, commentId);
      
      if (!comment) {
        return res.status(404).json({ message: "Comentario nao encontrado" });
      }
      
      res.json(comment);
    } catch (error: any) {
      console.error("Error unresolving comment:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Adicionar resposta a comentario
  app.post("/api/projects/:id/comments/:commentId/replies", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const commentId = req.params.commentId;
      const userId = req.user.claims.sub;
      const userName = req.user.claims.name || "Usuario";
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "content e obrigatorio" });
      }
      
      const reply = await commentsService.addReply(projectId, commentId, content, userId, userName);
      
      if (!reply) {
        return res.status(404).json({ message: "Comentario nao encontrado" });
      }
      
      res.json(reply);
    } catch (error: any) {
      console.error("Error adding reply:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Deletar resposta
  app.delete("/api/projects/:id/comments/:commentId/replies/:replyId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const commentId = req.params.commentId;
      const replyId = req.params.replyId;
      const userId = req.user.claims.sub;
      
      const success = await commentsService.deleteReply(projectId, commentId, replyId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Resposta nao encontrada ou sem permissao" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting reply:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ========================================
  // PROJECT SERVICE API - Gerenciamento Completo de Projetos
  // ========================================

  // Listar templates disponiveis
  app.get("/api/project-templates", async (_req, res) => {
    try {
      const templates = projectService.getTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error("Error listing templates:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Obter template especifico
  app.get("/api/project-templates/:id", async (req, res) => {
    try {
      const template = projectService.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template nao encontrado" });
      }
      res.json(template);
    } catch (error: any) {
      console.error("Error getting template:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Criar novo projeto (com ou sem template)
  app.post("/api/managed-projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, description, templateType, templateId } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Nome do projeto e obrigatorio" });
      }
      
      const project = await projectService.createProject({
        userId,
        name,
        description: description || "",
        templateType: templateType || templateId || "custom",
      }, templateId);
      
      // Sincronizar arquivos com workspace fisico
      const files = await projectService.getProjectFiles(project.id);
      await workspaceService.initWorkspace(project.id);
      
      for (const file of files) {
        await workspaceService.createFile(project.id, file.path, file.content);
      }
      
      res.status(201).json(project);
    } catch (error: any) {
      console.error("Error creating managed project:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Listar projetos do usuario
  app.get("/api/managed-projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await projectService.getProjectsByUser(userId);
      res.json(projects);
    } catch (error: any) {
      console.error("Error listing managed projects:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Obter projeto especifico
  app.get("/api/managed-projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await projectService.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto nao encontrado" });
      }
      
      res.json(project);
    } catch (error: any) {
      console.error("Error getting managed project:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Atualizar projeto
  app.patch("/api/managed-projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { name, description, startCommand, entryPoint, port } = req.body;
      
      const project = await projectService.updateProject(projectId, {
        name,
        description,
        startCommand,
        entryPoint,
        port,
      });
      
      if (!project) {
        return res.status(404).json({ message: "Projeto nao encontrado" });
      }
      
      res.json(project);
    } catch (error: any) {
      console.error("Error updating managed project:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Deletar projeto
  app.delete("/api/managed-projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      await projectService.deleteProject(projectId);
      
      // Limpar workspace fisico tambem
      try {
        await workspaceService.deleteWorkspace(projectId);
      } catch (e) {
        // Ignorar se workspace nao existe
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting managed project:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Listar arquivos do projeto
  app.get("/api/managed-projects/:id/files", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const files = await projectService.getProjectFiles(projectId);
      res.json(files);
    } catch (error: any) {
      console.error("Error listing project files:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Obter conteudo de arquivo
  app.get("/api/managed-projects/:id/files/:path(*)", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const filePath = req.params.path;
      
      const file = await projectService.getFile(projectId, filePath);
      if (!file) {
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }
      
      res.json(file);
    } catch (error: any) {
      console.error("Error getting project file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Criar ou atualizar arquivo
  app.put("/api/managed-projects/:id/files/:path(*)", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const filePath = req.params.path;
      const { content } = req.body;
      
      if (content === undefined) {
        return res.status(400).json({ message: "Conteudo e obrigatorio" });
      }
      
      // Salvar no banco
      const file = await projectService.updateFile(projectId, filePath, content);
      
      // Sincronizar com workspace fisico
      await workspaceService.createFile(projectId, filePath, content);
      
      res.json(file);
    } catch (error: any) {
      console.error("Error updating project file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Deletar arquivo
  app.delete("/api/managed-projects/:id/files/:path(*)", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const filePath = req.params.path;
      
      await projectService.deleteFile(projectId, filePath);
      
      // Deletar do workspace fisico tambem
      try {
        await workspaceService.deleteFile(projectId, filePath);
      } catch (e) {
        // Ignorar se arquivo nao existe no workspace
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting project file:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Listar secrets do projeto (sem valores)
  app.get("/api/managed-projects/:id/secrets", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const secrets = await projectService.getSecrets(projectId);
      res.json(secrets);
    } catch (error: any) {
      console.error("Error listing project secrets:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Criar secret
  app.post("/api/managed-projects/:id/secrets", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { name, value, description } = req.body;
      
      if (!name || !value) {
        return res.status(400).json({ message: "Nome e valor sao obrigatorios" });
      }
      
      await projectService.createSecret(projectId, name, value, description);
      res.status(201).json({ success: true, name });
    } catch (error: any) {
      console.error("Error creating project secret:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Deletar secret
  app.delete("/api/managed-projects/:id/secrets/:name", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const secretName = req.params.name;
      
      await projectService.deleteSecret(projectId, secretName);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting project secret:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Iniciar projeto (executar no runtime)
  app.post("/api/managed-projects/:id/start", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await projectService.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto nao encontrado" });
      }
      
      // Atualizar status
      await projectService.updateProjectStatus(projectId, "ready", "starting");
      
      // Sincronizar arquivos do banco para o workspace
      const files = await projectService.getProjectFiles(projectId);
      await workspaceService.initWorkspace(projectId);
      
      for (const file of files) {
        await workspaceService.createFile(projectId, file.path, file.content);
      }
      
      // Instalar dependencias e iniciar
      const command = project.startCommand || "npm start";
      
      // Registrar run
      const run = await projectService.createRun({
        projectId,
        command,
        status: "running",
      });
      
      // Iniciar processo
      try {
        const result = await workspaceService.startProcess(projectId, command);
        await projectService.updateProjectStatus(projectId, "running", "running");
        
        res.json({
          success: true,
          runId: run.id,
          port: result.port,
          message: "Projeto iniciado com sucesso",
        });
      } catch (startError: any) {
        await projectService.updateProjectStatus(projectId, "error", "crashed");
        await projectService.updateRun(run.id, {
          status: "failed",
          logs: startError.message,
          endedAt: new Date(),
        });
        throw startError;
      }
    } catch (error: any) {
      console.error("Error starting project:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Parar projeto
  app.post("/api/managed-projects/:id/stop", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Capturar logs antes de parar
      const logs = workspaceService.getProcessLogs(projectId);
      
      await workspaceService.stopProcess(projectId);
      await projectService.updateProjectStatus(projectId, "stopped", "idle");
      
      // Buscar ultimo run e salvar logs
      const runs = await projectService.getProjectRuns(projectId, 1);
      if (runs.length > 0 && runs[0].status === "running") {
        await projectService.updateRun(runs[0].id, {
          status: "success",
          logs,
          endedAt: new Date(),
          exitCode: 0,
        });
      }
      
      res.json({ success: true, message: "Projeto parado" });
    } catch (error: any) {
      console.error("Error stopping project:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Reiniciar projeto
  app.post("/api/managed-projects/:id/restart", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await projectService.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Projeto nao encontrado" });
      }
      
      // Capturar logs e salvar run anterior
      const logs = workspaceService.getProcessLogs(projectId);
      const runs = await projectService.getProjectRuns(projectId, 1);
      if (runs.length > 0 && runs[0].status === "running") {
        await projectService.updateRun(runs[0].id, {
          status: "success",
          logs,
          endedAt: new Date(),
          exitCode: 0,
        });
      }
      
      // Parar se estiver rodando
      try {
        await workspaceService.stopProcess(projectId);
      } catch (e) {
        // Ignorar se nao estava rodando
      }
      
      // Iniciar novamente
      const command = project.startCommand || "npm start";
      
      // Criar novo run
      const newRun = await projectService.createRun({
        projectId,
        command,
        status: "running",
      });
      
      const result = await workspaceService.startProcess(projectId, command);
      await projectService.updateProjectStatus(projectId, "running", "running");
      
      res.json({
        success: true,
        runId: newRun.id,
        port: result.port,
        message: "Projeto reiniciado",
      });
    } catch (error: any) {
      console.error("Error restarting project:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Obter logs do projeto
  app.get("/api/managed-projects/:id/logs", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const logs = workspaceService.getProcessLogs(projectId);
      res.json({ logs });
    } catch (error: any) {
      console.error("Error getting project logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Historico de execucoes
  app.get("/api/managed-projects/:id/runs", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 10;
      const runs = await projectService.getProjectRuns(projectId, limit);
      res.json(runs);
    } catch (error: any) {
      console.error("Error getting project runs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Executar comando no projeto
  app.post("/api/managed-projects/:id/exec", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { command } = req.body;
      
      if (!command) {
        return res.status(400).json({ message: "Comando e obrigatorio" });
      }
      
      const result = await workspaceService.executeCommand(projectId, command);
      res.json(result);
    } catch (error: any) {
      console.error("Error executing command:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Git routes para managed-projects (alias para compatibilidade)
  app.get("/api/managed-projects/:id/git/status", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const files = await projectService.getProjectFiles(projectId);
      res.json({
        isInitialized: true,
        branch: "main",
        staged: [],
        unstaged: files.map(f => ({
          path: f.path,
          status: "modified" as const,
          staged: false
        }))
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/managed-projects/:id/git/log", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const runs = await projectService.getProjectRuns(projectId, 10);
      res.json(runs.map(run => ({
        hash: `run-${run.id}`,
        shortHash: `r${run.id}`,
        message: run.command || "Execucao",
        author: "system",
        date: run.startedAt?.toISOString() || new Date().toISOString(),
        relativeTime: "Recentemente"
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/managed-projects/:id/git/init", isAuthenticated, async (req: any, res) => {
    res.json({ success: true, message: "Git inicializado" });
  });

  app.post("/api/managed-projects/:id/git/stage", isAuthenticated, async (req: any, res) => {
    res.json({ success: true });
  });

  app.post("/api/managed-projects/:id/git/unstage", isAuthenticated, async (req: any, res) => {
    res.json({ success: true });
  });

  app.post("/api/managed-projects/:id/git/commit", isAuthenticated, async (req: any, res) => {
    const { message } = req.body;
    res.json({ success: true, shortHash: `${Date.now().toString(36).slice(-6)}` });
  });

  app.post("/api/managed-projects/:id/git/rollback", isAuthenticated, async (req: any, res) => {
    res.json({ success: true });
  });

  // ===== INTEGRATION ROUTES =====
  
  const { integrationService } = await import("./integrationService");

  // Get integration status for a project
  app.get("/api/managed-projects/:id/integrations", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const status = await integrationService.getIntegrationStatus(projectId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Webhook routes
  app.get("/api/managed-projects/:id/webhooks", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const projectWebhooks = await integrationService.getProjectWebhooks(projectId);
      res.json(projectWebhooks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/managed-projects/:id/webhooks", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { path } = req.body;
      const webhook = await integrationService.createWebhook(projectId, path || "/webhook");
      res.json(webhook);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/managed-projects/:id/webhooks/:webhookId", isAuthenticated, async (req: any, res) => {
    try {
      const success = await integrationService.deleteWebhook(req.params.webhookId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // WhatsApp integration routes
  app.get("/api/managed-projects/:id/whatsapp/session", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const session = await integrationService.getWhatsAppSession(projectId);
      res.json(session || { status: "disconnected" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/managed-projects/:id/whatsapp/connect", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const session = await integrationService.initWhatsAppSession(projectId);
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/managed-projects/:id/whatsapp/disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const success = await integrationService.disconnectWhatsApp(projectId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // External auth providers
  app.get("/api/auth-providers", async (req, res) => {
    try {
      const providers = await integrationService.getExternalAuthProviders();
      res.json(providers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // =============================================
  // CHECKPOINTS / ROLLBACK ROUTES
  // =============================================
  
  // List checkpoints for a project
  app.get("/api/projects/:id/checkpoints", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const checkpoints = await storage.getCheckpoints(projectId);
      res.json(checkpoints);
    } catch (error: any) {
      console.error("Error fetching checkpoints:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create a new checkpoint
  app.post("/api/projects/:id/checkpoints", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { name, description, createdBy = "manual" } = req.body;
      
      // Get current project files from workspace
      const files = await workspaceService.listFiles(projectId);
      
      // Read all file contents for the snapshot
      const filesSnapshot: Array<{ path: string; content: string; type: string }> = [];
      
      const readFilesRecursively = async (fileList: any[], basePath = "") => {
        for (const file of fileList) {
          const fullPath = basePath ? `${basePath}/${file.name}` : file.name;
          if (file.type === "directory" && file.children) {
            await readFilesRecursively(file.children, fullPath);
          } else if (file.type === "file") {
            try {
              const content = await workspaceService.readFile(projectId, fullPath);
              filesSnapshot.push({ path: fullPath, content, type: "file" });
            } catch {
              // Skip files that can't be read
            }
          }
        }
      };
      
      await readFilesRecursively(files);
      
      const checkpoint = await storage.createCheckpoint({
        projectId,
        name: name || `Checkpoint ${new Date().toLocaleString("pt-BR")}`,
        description,
        filesSnapshot,
        createdBy,
      });
      
      res.json(checkpoint);
    } catch (error: any) {
      console.error("Error creating checkpoint:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Restore a checkpoint (rollback)
  app.post("/api/checkpoints/:id/restore", isAuthenticated, async (req: any, res) => {
    try {
      const checkpointId = parseInt(req.params.id);
      const checkpoint = await storage.getCheckpoint(checkpointId);
      
      if (!checkpoint) {
        return res.status(404).json({ message: "Checkpoint nao encontrado" });
      }
      
      const projectId = checkpoint.projectId;
      
      // Restore files from snapshot
      const filesSnapshot = checkpoint.filesSnapshot as Array<{ path: string; content: string; type: string }>;
      
      let restoredCount = 0;
      for (const file of filesSnapshot) {
        try {
          await workspaceService.createFile(projectId, file.path, file.content);
          restoredCount++;
        } catch (err) {
          console.error(`Error restoring file ${file.path}:`, err);
        }
      }
      
      res.json({ 
        success: true, 
        restoredFiles: restoredCount,
        checkpointName: checkpoint.name,
      });
    } catch (error: any) {
      console.error("Error restoring checkpoint:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a checkpoint
  app.delete("/api/checkpoints/:id", isAuthenticated, async (req: any, res) => {
    try {
      const checkpointId = parseInt(req.params.id);
      await storage.deleteCheckpoint(checkpointId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting checkpoint:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get recent logs
  app.get("/api/logs", isAuthenticated, async (req: any, res) => {
    try {
      const { logsService } = await import("./logsService");
      const count = parseInt(req.query.count as string) || 50;
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const logs = logsService.getRecentLogs(count, projectId);
      res.json(logs);
    } catch (error: any) {
      console.error("Error getting logs:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Health check for a project
  app.get("/api/projects/:id/health", isAuthenticated, async (req: any, res) => {
    try {
      const { healthCheckService } = await import("./healthCheckService");
      const projectId = parseInt(req.params.id);
      const health = healthCheckService.getProjectHealth(projectId);
      res.json(health || { status: "unknown", message: "No health data available" });
    } catch (error: any) {
      console.error("Error getting project health:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Run health check for a project
  app.post("/api/projects/:id/health/check", isAuthenticated, async (req: any, res) => {
    try {
      const { healthCheckService } = await import("./healthCheckService");
      const projectId = parseInt(req.params.id);
      const { previewUrl } = req.body;
      const result = await healthCheckService.checkProjectHealth(projectId, previewUrl);
      res.json(result);
    } catch (error: any) {
      console.error("Error running health check:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Start monitoring a project
  app.post("/api/projects/:id/health/monitor", isAuthenticated, async (req: any, res) => {
    try {
      const { healthCheckService } = await import("./healthCheckService");
      const projectId = parseInt(req.params.id);
      const { previewUrl } = req.body;
      healthCheckService.startMonitoring(projectId, previewUrl);
      res.json({ success: true, message: "Monitoring started" });
    } catch (error: any) {
      console.error("Error starting health monitoring:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Stop monitoring a project
  app.delete("/api/projects/:id/health/monitor", isAuthenticated, async (req: any, res) => {
    try {
      const { healthCheckService } = await import("./healthCheckService");
      const projectId = parseInt(req.params.id);
      healthCheckService.stopMonitoring(projectId);
      res.json({ success: true, message: "Monitoring stopped" });
    } catch (error: any) {
      console.error("Error stopping health monitoring:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Public webhook endpoint (no auth required)
  app.all("/webhook/:webhookId", async (req, res) => {
    const startTime = Date.now();
    let statusCode = 200;
    
    try {
      const webhook = await integrationService.getWebhook(req.params.webhookId);
      
      if (!webhook) {
        statusCode = 404;
        return res.status(statusCode).json({ error: "Webhook not found" });
      }
      
      if (!webhook.enabled) {
        statusCode = 403;
        await integrationService.recordWebhookEvent(
          req.params.webhookId, req.method, req.headers as Record<string, any>, 
          JSON.stringify(req.body), statusCode, Date.now() - startTime
        );
        return res.status(statusCode).json({ error: "Webhook disabled" });
      }

      const response = {
        success: true,
        received: {
          method: req.method,
          path: webhook.path,
          body: req.body,
          timestamp: new Date().toISOString(),
        },
      };
      
      await integrationService.recordWebhookEvent(
        req.params.webhookId, req.method, req.headers as Record<string, any>, 
        JSON.stringify(req.body), statusCode, Date.now() - startTime
      );
      
      res.json(response);
    } catch (error: any) {
      statusCode = 500;
      res.status(statusCode).json({ error: error.message });
    }
  });

  // ============= DATABASE VIEWER ROUTES =============
  
  // Get all database tables
  app.get("/api/database/tables", isAuthenticated, async (_req, res) => {
    try {
      const { databaseViewerService } = await import("./databaseViewerService");
      const tables = await databaseViewerService.getTables();
      res.json(tables);
    } catch (error: any) {
      console.error("Error getting tables:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get table data
  app.get("/api/database/tables/:tableName", isAuthenticated, async (req, res) => {
    try {
      const { databaseViewerService } = await import("./databaseViewerService");
      const { tableName } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const data = await databaseViewerService.getTableData(tableName, limit, offset);
      res.json(data);
    } catch (error: any) {
      console.error("Error getting table data:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Execute SQL query (read-only)
  app.post("/api/database/query", isAuthenticated, async (req, res) => {
    try {
      const { databaseViewerService } = await import("./databaseViewerService");
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Query é obrigatória" });
      }
      const result = await databaseViewerService.executeQuery(query);
      res.json(result);
    } catch (error: any) {
      console.error("Error executing query:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============= WEB SEARCH ROUTES =============

  // Search the web
  app.get("/api/search", isAuthenticated, async (req, res) => {
    try {
      const { webSearchService } = await import("./webSearchService");
      const query = req.query.q as string;
      const maxResults = parseInt(req.query.limit as string) || 10;
      if (!query) {
        return res.status(400).json({ message: "Query é obrigatória" });
      }
      const results = await webSearchService.search(query, maxResults);
      res.json(results);
    } catch (error: any) {
      console.error("Error searching:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Search documentation
  app.get("/api/search/docs/:technology", isAuthenticated, async (req, res) => {
    try {
      const { webSearchService } = await import("./webSearchService");
      const results = await webSearchService.searchDocumentation(req.params.technology);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Search error solutions
  app.post("/api/search/error", isAuthenticated, async (req, res) => {
    try {
      const { webSearchService } = await import("./webSearchService");
      const { errorMessage } = req.body;
      const results = await webSearchService.searchErrorSolution(errorMessage);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============= MEDIA GENERATION ROUTES =============

  // Generate image
  app.post("/api/media/image", isAuthenticated, async (req, res) => {
    try {
      const { mediaGenerationService } = await import("./mediaGenerationService");
      const { prompt, size, style, quality } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Prompt é obrigatório" });
      }
      const result = await mediaGenerationService.generateImage(prompt, { size, style, quality });
      res.json(result);
    } catch (error: any) {
      console.error("Error generating image:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Generate icon
  app.post("/api/media/icon", isAuthenticated, async (req, res) => {
    try {
      const { mediaGenerationService } = await import("./mediaGenerationService");
      const { name, style } = req.body;
      const result = await mediaGenerationService.generateIcon(name, style);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate logo
  app.post("/api/media/logo", isAuthenticated, async (req, res) => {
    try {
      const { mediaGenerationService } = await import("./mediaGenerationService");
      const { brandName, style } = req.body;
      const result = await mediaGenerationService.generateLogo(brandName, style);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Unified media generation endpoint
  app.post("/api/media/generate", isAuthenticated, async (req, res) => {
    try {
      const { mediaGenerationService } = await import("./mediaGenerationService");
      const { prompt, type } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Prompt e obrigatorio" });
      }
      if (type === "video") {
        // Video generation placeholder - return mock for now
        res.json({ url: null, message: "Geracao de video ainda nao implementada" });
      } else {
        const result = await mediaGenerationService.generateImage(prompt, { size: "1024x1024" });
        res.json(result);
      }
    } catch (error: any) {
      console.error("Error generating media:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============= SCREENSHOT CLONING ROUTES =============

  // Unified screenshot clone endpoint (for frontend)
  app.post("/api/screenshot/clone", isAuthenticated, async (req, res) => {
    try {
      const { screenshotCloningService } = await import("./screenshotCloningService");
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL e obrigatoria" });
      }
      const analysis = await screenshotCloningService.analyzeScreenshot(url);
      res.json(analysis);
    } catch (error: any) {
      console.error("Error cloning screenshot:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Analyze screenshot
  app.post("/api/clone/analyze", isAuthenticated, async (req, res) => {
    try {
      const { screenshotCloningService } = await import("./screenshotCloningService");
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ message: "URL da imagem é obrigatória" });
      }
      const analysis = await screenshotCloningService.analyzeScreenshot(imageUrl);
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing screenshot:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Clone design from screenshot
  app.post("/api/clone/design", isAuthenticated, async (req, res) => {
    try {
      const { screenshotCloningService } = await import("./screenshotCloningService");
      const { imageUrl, framework } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ message: "URL da imagem é obrigatória" });
      }
      const result = await screenshotCloningService.cloneDesign(imageUrl, framework || "react");
      res.json(result);
    } catch (error: any) {
      console.error("Error cloning design:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // ============= TESTING SERVICE ROUTES =============

  // Quick health check
  app.post("/api/testing/health-check", isAuthenticated, async (req, res) => {
    try {
      const { testingService } = await import("./testingService");
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ message: "URL é obrigatória" });
      }
      const result = await testingService.runQuickHealthCheck(url);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Run endpoint tests
  app.post("/api/testing/endpoints", isAuthenticated, async (req, res) => {
    try {
      const { testingService } = await import("./testingService");
      const { baseUrl, endpoints } = req.body;
      if (!baseUrl || !endpoints) {
        return res.status(400).json({ message: "baseUrl e endpoints são obrigatórios" });
      }
      const results = await testingService.runEndpointTests(baseUrl, endpoints);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Run UI test
  app.post("/api/testing/ui", isAuthenticated, async (req, res) => {
    try {
      const { testingService } = await import("./testingService");
      const { projectId, testPlan } = req.body;
      if (!projectId || !testPlan) {
        return res.status(400).json({ message: "projectId e testPlan são obrigatórios" });
      }
      const result = await testingService.runUITest(projectId, testPlan);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get test history
  app.get("/api/testing/history", isAuthenticated, async (req, res) => {
    try {
      const { testingService } = await import("./testingService");
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const history = testingService.getTestHistory(projectId);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get test report
  app.get("/api/testing/report/:runId", isAuthenticated, async (req, res) => {
    try {
      const { testingService } = await import("./testingService");
      const report = await testingService.generateTestReport(req.params.runId);
      res.json({ report });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============= PACKAGE MANAGER ROUTES =============

  // Get installed packages
  app.get("/api/packages", isAuthenticated, async (req, res) => {
    try {
      const { packageManagerService } = await import("./packageManagerService");
      const projectPath = req.query.path as string || process.cwd();
      const packages = await packageManagerService.getInstalledPackages(projectPath);
      res.json(packages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Search packages
  app.get("/api/packages/search", isAuthenticated, async (req, res) => {
    try {
      const { packageManagerService } = await import("./packageManagerService");
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Query é obrigatória" });
      }
      const packages = await packageManagerService.searchPackages(query);
      res.json(packages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Install package
  app.post("/api/packages/install", isAuthenticated, async (req, res) => {
    try {
      const { packageManagerService } = await import("./packageManagerService");
      const { packageName, dev, version, projectPath } = req.body;
      if (!packageName) {
        return res.status(400).json({ message: "Nome do pacote é obrigatório" });
      }
      const result = await packageManagerService.installPackage(packageName, { dev, version, projectPath });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Uninstall package
  app.delete("/api/packages/:packageName", isAuthenticated, async (req, res) => {
    try {
      const { packageManagerService } = await import("./packageManagerService");
      const projectPath = req.query.path as string || process.cwd();
      const result = await packageManagerService.uninstallPackage(req.params.packageName, projectPath);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get outdated packages
  app.get("/api/packages/outdated", isAuthenticated, async (req, res) => {
    try {
      const { packageManagerService } = await import("./packageManagerService");
      const projectPath = req.query.path as string || process.cwd();
      const outdated = await packageManagerService.getOutdatedPackages(projectPath);
      res.json(outdated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============= CHECKPOINT/ROLLBACK ROUTES =============

  // Create checkpoint
  app.post("/api/checkpoints", isAuthenticated, async (req, res) => {
    try {
      const { checkpointService } = await import("./checkpointService");
      const { projectId, name, description } = req.body;
      const checkpoint = await checkpointService.createCheckpoint(
        projectId,
        name || "Checkpoint manual",
        description || "",
        "manual"
      );
      res.json(checkpoint);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // List checkpoints
  app.get("/api/checkpoints/:projectId", isAuthenticated, async (req, res) => {
    try {
      const { checkpointService } = await import("./checkpointService");
      const checkpoints = await checkpointService.listCheckpoints(parseInt(req.params.projectId));
      res.json(checkpoints);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Restore checkpoint
  app.post("/api/checkpoints/:projectId/restore/:checkpointId", isAuthenticated, async (req, res) => {
    try {
      const { checkpointService } = await import("./checkpointService");
      const result = await checkpointService.restoreCheckpoint(
        parseInt(req.params.projectId),
        parseInt(req.params.checkpointId)
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Compare checkpoints
  app.get("/api/checkpoints/:projectId/compare", isAuthenticated, async (req, res) => {
    try {
      const { checkpointService } = await import("./checkpointService");
      const { cp1, cp2 } = req.query;
      const diff = await checkpointService.compareCheckpoints(
        parseInt(req.params.projectId),
        parseInt(cp1 as string),
        parseInt(cp2 as string)
      );
      res.json(diff);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============= BUILD MODES ROUTES =============

  // Get build modes
  app.get("/api/build-modes", async (req, res) => {
    try {
      const { buildModesService } = await import("./buildModesService");
      res.json(buildModesService.getModes());
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Start build session
  app.post("/api/build-modes/start", isAuthenticated, async (req, res) => {
    try {
      const { buildModesService } = await import("./buildModesService");
      const { projectId, mode, prompt } = req.body;
      const session = await buildModesService.startBuildSession(projectId, mode, prompt);
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get build session
  app.get("/api/build-modes/session/:sessionId", isAuthenticated, async (req, res) => {
    try {
      const { buildModesService } = await import("./buildModesService");
      const session = buildModesService.getSession(req.params.sessionId);
      res.json(session || { error: "Session not found" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============= PLAYWRIGHT TESTING ROUTES =============

  // Generate test cases
  app.post("/api/playwright/generate-tests", isAuthenticated, async (req, res) => {
    try {
      const { playwrightTestService } = await import("./playwrightTestService");
      const { projectId, appDescription, routes } = req.body;
      const tests = await playwrightTestService.generateTestCases(projectId, appDescription, routes || ["/"]);
      res.json(tests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Run tests
  app.post("/api/playwright/run", isAuthenticated, async (req, res) => {
    try {
      const { playwrightTestService } = await import("./playwrightTestService");
      const { projectId, baseUrl, tests } = req.body;
      const run = await playwrightTestService.runTests(projectId, baseUrl, tests);
      res.json(run);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get test run
  app.get("/api/playwright/run/:runId", isAuthenticated, async (req, res) => {
    try {
      const { playwrightTestService } = await import("./playwrightTestService");
      const run = playwrightTestService.getTestRun(req.params.runId);
      res.json(run || { error: "Run not found" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get coverage report
  app.get("/api/playwright/coverage/:projectId", isAuthenticated, async (req, res) => {
    try {
      const { playwrightTestService } = await import("./playwrightTestService");
      const report = await playwrightTestService.generateCoverageReport(parseInt(req.params.projectId));
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============= EXTENDED THINKING ROUTES =============

  // Get available models
  app.get("/api/thinking/models", async (req, res) => {
    try {
      const { extendedThinkingService } = await import("./extendedThinkingService");
      res.json(extendedThinkingService.getAvailableModels());
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Start thinking session
  app.post("/api/thinking/start", isAuthenticated, async (req, res) => {
    try {
      const { extendedThinkingService } = await import("./extendedThinkingService");
      const { projectId, prompt, mode } = req.body;
      const session = await extendedThinkingService.startThinkingSession(projectId, prompt, mode || "standard");
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get thinking session
  app.get("/api/thinking/session/:sessionId", isAuthenticated, async (req, res) => {
    try {
      const { extendedThinkingService } = await import("./extendedThinkingService");
      const session = extendedThinkingService.getSession(req.params.sessionId);
      res.json(session || { error: "Session not found" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Recommend model
  app.post("/api/thinking/recommend-model", async (req, res) => {
    try {
      const { extendedThinkingService } = await import("./extendedThinkingService");
      const { taskDescription } = req.body;
      const model = extendedThinkingService.recommendModel(taskDescription);
      res.json({ model });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============= AUTONOMY ROUTES =============

  // Get autonomy configs
  app.get("/api/autonomy/configs", async (req, res) => {
    try {
      const { autonomyService } = await import("./autonomyService");
      res.json(autonomyService.getAutonomyConfigs());
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Start autonomy session
  app.post("/api/autonomy/start", isAuthenticated, async (req, res) => {
    try {
      const { autonomyService } = await import("./autonomyService");
      const userId = (req as any).user?.id || "anonymous";
      const { projectId, mode, tasks } = req.body;
      const session = await autonomyService.startSession(projectId, userId, mode, tasks || []);
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get active session
  app.get("/api/autonomy/active/:projectId", isAuthenticated, async (req, res) => {
    try {
      const { autonomyService } = await import("./autonomyService");
      const session = autonomyService.getActiveSession(parseInt(req.params.projectId));
      res.json(session || null);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Pause session
  app.post("/api/autonomy/:sessionId/pause", isAuthenticated, async (req, res) => {
    try {
      const { autonomyService } = await import("./autonomyService");
      const success = autonomyService.pauseSession(req.params.sessionId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Resume session
  app.post("/api/autonomy/:sessionId/resume", isAuthenticated, async (req, res) => {
    try {
      const { autonomyService } = await import("./autonomyService");
      const success = autonomyService.resumeSession(req.params.sessionId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get session stats
  app.get("/api/autonomy/:sessionId/stats", isAuthenticated, async (req, res) => {
    try {
      const { autonomyService } = await import("./autonomyService");
      const stats = autonomyService.getStats(req.params.sessionId);
      res.json(stats || { error: "Session not found" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============= AGENT SPAWNER ROUTES =============

  // Get agent templates
  app.get("/api/agents/templates", async (req, res) => {
    try {
      const { agentSpawnerService } = await import("./agentSpawnerService");
      res.json(agentSpawnerService.getTemplates());
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create agent
  app.post("/api/agents", isAuthenticated, async (req, res) => {
    try {
      const { agentSpawnerService } = await import("./agentSpawnerService");
      const { projectId, name, type, config } = req.body;
      const agent = await agentSpawnerService.createAgent(projectId, name, type, config);
      res.json(agent);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // List project agents
  app.get("/api/agents/project/:projectId", isAuthenticated, async (req, res) => {
    try {
      const { agentSpawnerService } = await import("./agentSpawnerService");
      const agents = agentSpawnerService.getProjectAgents(parseInt(req.params.projectId));
      res.json(agents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Run agent
  app.post("/api/agents/:agentId/run", isAuthenticated, async (req, res) => {
    try {
      const { agentSpawnerService } = await import("./agentSpawnerService");
      const run = await agentSpawnerService.runAgent(req.params.agentId, req.body.input);
      res.json(run);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Stop agent
  app.post("/api/agents/:agentId/stop", isAuthenticated, async (req, res) => {
    try {
      const { agentSpawnerService } = await import("./agentSpawnerService");
      const success = agentSpawnerService.stopAgent(req.params.agentId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete agent
  app.delete("/api/agents/:agentId", isAuthenticated, async (req, res) => {
    try {
      const { agentSpawnerService } = await import("./agentSpawnerService");
      const success = agentSpawnerService.deleteAgent(req.params.agentId);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Set agent schedule
  app.post("/api/agents/:agentId/schedule", isAuthenticated, async (req, res) => {
    try {
      const { agentSpawnerService } = await import("./agentSpawnerService");
      const success = agentSpawnerService.setSchedule(req.params.agentId, req.body.schedule);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get agent runs
  app.get("/api/agents/:agentId/runs", isAuthenticated, async (req, res) => {
    try {
      const { agentSpawnerService } = await import("./agentSpawnerService");
      const runs = agentSpawnerService.getAgentRuns(req.params.agentId);
      res.json(runs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Terminal Token Authentication =====
  // Uses shared token store for secure WebSocket authentication
  const { terminalTokenStore } = await import("./terminalTokenStore");
  
  app.post("/api/terminal/token", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { projectId } = req.body;
      
      // Validate project ownership if provided
      if (projectId) {
        const project = await storage.getProject(projectId);
        if (!project || project.userId !== userId) {
          return res.status(403).json({ message: "Acesso negado ao projeto" });
        }
      }
      
      // Generate short-lived one-time-use token
      const { token, expiresAt } = terminalTokenStore.generate(userId, projectId);
      
      res.json({ token, expiresAt: expiresAt.toISOString() });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== PTY Terminal Routes =====
  app.post("/api/pty/create", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ptyService } = await import("./ptyService");
      const { projectId } = req.body;
      
      // Validate project belongs to user if projectId provided
      if (projectId) {
        const project = await storage.getProject(projectId);
        if (!project || project.userId !== userId) {
          return res.status(403).json({ message: "Acesso negado ao projeto" });
        }
      }
      
      const result = ptyService.createSession(projectId || 0, userId);
      
      if (!result.id) {
        return res.status(429).json({ message: result.error || "Erro ao criar sessão" });
      }
      
      res.json({ sessionId: result.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/pty/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ptyService } = await import("./ptyService");
      const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
      const sessions = ptyService.listSessions(userId, projectId);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/pty/:sessionId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { ptyService } = await import("./ptyService");
      const success = ptyService.closeSession(req.params.sessionId, userId);
      
      if (!success) {
        return res.status(403).json({ message: "Acesso negado ou sessão não encontrada" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Image Generation Routes =====
  app.post("/api/media/generate", isAuthenticated, async (req, res) => {
    try {
      const { imageGenerationService } = await import("./imageGenerationService");
      const { prompt, style, projectId } = req.body;
      const image = await imageGenerationService.generate({ prompt, style, projectId });
      res.json(image);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/media/icon", isAuthenticated, async (req, res) => {
    try {
      const { imageGenerationService } = await import("./imageGenerationService");
      const { name, color } = req.body;
      const icon = await imageGenerationService.generateIcon(name, color);
      res.json(icon);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/media/logo", isAuthenticated, async (req, res) => {
    try {
      const { imageGenerationService } = await import("./imageGenerationService");
      const { companyName, style } = req.body;
      const logo = await imageGenerationService.generateLogo(companyName, style);
      res.json(logo);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== App Testing Routes =====
  app.post("/api/app-testing/session", isAuthenticated, async (req, res) => {
    try {
      const { appTestingService } = await import("./appTestingService");
      const { projectId, baseUrl } = req.body;
      const session = await appTestingService.createTestSession(projectId, baseUrl);
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/app-testing/:sessionId/run", isAuthenticated, async (req, res) => {
    try {
      const { appTestingService } = await import("./appTestingService");
      const { scenarios, baseUrl } = req.body;
      const session = await appTestingService.runTests(req.params.sessionId, scenarios, baseUrl);
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/app-testing/:sessionId", isAuthenticated, async (req, res) => {
    try {
      const { appTestingService } = await import("./appTestingService");
      const session = appTestingService.getSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/app-testing/generate-scenarios", isAuthenticated, async (req, res) => {
    try {
      const { appTestingService } = await import("./appTestingService");
      const { appDescription, routes } = req.body;
      const scenarios = await appTestingService.generateScenarios(appDescription, routes);
      res.json(scenarios);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== replit.md Routes =====
  app.get("/api/replit-md/:projectId", isAuthenticated, async (req, res) => {
    try {
      const projectId = Number(req.params.projectId);
      let content = "# Meu Projeto\n\n## Preferencias\n\nDescreva suas preferencias aqui.";
      
      try {
        content = await workspaceService.readFile(projectId, "replit.md");
      } catch (e) {
        // File doesn't exist yet, use default
      }
      
      res.json({
        content,
        lastModified: new Date().toISOString(),
        defaults: {
          codingStyle: "typescript",
          preferredLanguage: "pt-BR",
          projectType: "fullstack",
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/replit-md/:projectId", isAuthenticated, async (req, res) => {
    try {
      const projectId = Number(req.params.projectId);
      const { content } = req.body;
      
      await workspaceService.initWorkspace(projectId);
      await workspaceService.createFile(projectId, "replit.md", content);
      
      res.json({ 
        success: true, 
        content,
        lastModified: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/replit-md/:projectId/reset", isAuthenticated, async (req, res) => {
    try {
      const projectId = Number(req.params.projectId);
      const defaultContent = `# Meu Projeto

## Preferencias

### Estilo de Codigo
- Usar TypeScript
- Componentes funcionais React
- Tailwind CSS para estilos

### Arquitetura
- Frontend: React + Vite
- Backend: Express + Node.js
- Banco: PostgreSQL + Drizzle ORM

## Contexto do Projeto

Descreva aqui o contexto do seu projeto.
`;
      
      await workspaceService.initWorkspace(projectId);
      await workspaceService.createFile(projectId, "replit.md", defaultContent);
      
      res.json({ 
        success: true, 
        content: defaultContent,
        lastModified: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}

function extractProjectName(message: string): string {
  const keywords = ["bot", "api", "site", "página", "sistema", "app", "aplicativo", "script"];
  const words = message.toLowerCase().split(/\s+/);
  
  for (let i = 0; i < words.length; i++) {
    if (keywords.some(k => words[i].includes(k))) {
      const nextWords = words.slice(i, i + 3).join(" ");
      return nextWords.slice(0, 50).replace(/[^a-zA-Z0-9áàâãéèêíìóòôõúùûçÁÀÂÃÉÈÊÍÌÓÒÔÕÚÙÛÇ\s]/g, "").trim() || "Novo Projeto";
    }
  }
  
  return message.slice(0, 30).replace(/[^a-zA-Z0-9áàâãéèêíìóòôõúùûçÁÀÂÃÉÈÊÍÌÓÒÔÕÚÙÛÇ\s]/g, "").trim() || "Novo Projeto";
}

function detectLanguage(code: string): string {
  if (code.includes("<!DOCTYPE html") || code.includes("<html")) return "html";
  if (code.includes("import ") && code.includes("def ")) return "python";
  if (code.includes("func ") && code.includes("package ")) return "go";
  if (code.includes("require(") || code.includes("const ") || code.includes("async ")) return "javascript";
  return "javascript";
}
