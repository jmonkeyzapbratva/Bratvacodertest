import { storage } from "./storage";
import { workspaceService } from "./workspaceService";
import type { Conversation, Message, InsertMessage, InsertConversation, InsertAgentTask } from "@shared/schema";

async function createTask(conversationId: number, type: string, title: string, projectId?: number): Promise<number> {
  const task = await storage.createAgentTask({
    conversationId,
    projectId: projectId || null,
    type,
    title,
    status: "running",
  });
  return task.id;
}

async function completeTask(taskId: number, output?: string): Promise<void> {
  await storage.updateAgentTask(taskId, {
    status: "completed",
    output,
    completedAt: new Date(),
  });
}

async function failTask(taskId: number, output?: string): Promise<void> {
  await storage.updateAgentTask(taskId, {
    status: "failed",
    output,
    completedAt: new Date(),
  });
}

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const CONVERSATIONAL_PROMPT = `Você é o BratvaCoder, um agente de programação autônomo igual ao Replit Agent.

VOCÊ É UM AGENTE QUE PROGRAMA, NÃO UM CHATBOT:
- Quando o usuário descreve um projeto, você IMEDIATAMENTE cria o código
- Você não fica fazendo perguntas intermináveis - você age
- Você é como um dev senior que recebe uma tarefa e executa

COMPORTAMENTO DE AGENTE REPLIT:
1. ENTENDA RÁPIDO - 1-2 perguntas máximo se algo estiver muito vago
2. AGE RÁPIDO - Cria o projeto assim que entender o que é pedido
3. MOSTRA O QUE FEZ - Explica brevemente o que criou
4. ESTÁ PRONTO PRA ITERAR - Se o usuário pedir mudanças, faz na hora

GATILHOS PARA GERAR CÓDIGO IMEDIATAMENTE:
- "quero um app/site/sistema de..." → GERA
- "cria um..." → GERA
- "faz um..." → GERA  
- "preciso de um..." → GERA
- "monta um..." → GERA
- Qualquer descrição clara de projeto → GERA
- "sim", "ok", "isso" após descrever projeto → GERA

QUANDO NÃO GERAR:
- Perguntas genéricas ("como funciona X?")
- Só batendo papo
- Pedindo explicação de conceitos

FORMATO DE CÓDIGO:
Quando for gerar, SEMPRE inclua [CODIGO_PRONTO] e use:

=== ARQUIVO: nome.ext ===
(código completo e funcional)
=== FIM ARQUIVO ===

SEMPRE INCLUA:
- package.json com dependências corretas
- Arquivos de configuração necessários
- README.md com instruções
- Todos os arquivos para o projeto FUNCIONAR

APÓS GERAR, INDIQUE COMANDOS A EXECUTAR:
[EXECUTAR_COMANDO: npm install]
[EXECUTAR_COMANDO: npm run dev]

STACK PADRÃO (se não especificado):
- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- Database: PostgreSQL + Drizzle

PERSONALIDADE:
- Brasileiro, informal mas profissional
- Eficiente, vai direto ao ponto
- Explica o que fez depois de fazer, não antes
- Sempre entrega código FUNCIONAL e COMPLETO`;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatResponse {
  success?: boolean;
  message: string;
  isCodeReady: boolean;
  code?: string;
  files?: GeneratedFile[];
  messageType: "text" | "question" | "code";
  projectId?: number;
  workspaceError?: string;
  workspaceSuccess?: boolean;
  filesCreated?: number;
  filesTotal?: number;
}

interface GeneratedFile {
  filename: string;
  content: string;
  language: string;
}

function isProjectDescription(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Padrões que indicam que o usuário quer um projeto/app
  const projectPatterns = [
    "quero um", "quero uma", "cria um", "cria uma", "faz um", "faz uma",
    "preciso de um", "preciso de uma", "monta um", "monta uma",
    "desenvolve um", "desenvolve uma", "constroi um", "constrói uma",
    "me faz um", "me cria um", "gera um", "gera uma",
    "app de", "site de", "sistema de", "aplicativo de", "plataforma de",
    "landing page", "dashboard", "painel", "loja", "e-commerce", "ecommerce",
    "blog", "portfolio", "portfólio", "todo", "to-do", "calculadora",
    "api de", "backend de", "frontend de", "bot de", "chatbot",
    "aplicacao", "aplicação", "website", "webpage"
  ];
  
  return projectPatterns.some(pattern => lowerMessage.includes(pattern));
}

function isExplicitCodeRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  const codeRequestPhrases = [
    "gera o codigo", "gera o código", "gere o codigo", "gere o código",
    "manda o codigo", "manda o código",
    "cria pra mim", "crie pra mim", "cria para mim", "crie para mim",
    "pode fazer", "pode criar", "pode gerar", "pode montar",
    "faz isso", "faça isso", "faz pra mim", "faça pra mim",
    "quero o projeto", "quero o codigo", "quero o código",
    "monta isso", "monte isso", "monta pra mim",
    "implementa", "desenvolve", "desenvolva",
    "gera agora", "gere agora", "manda agora",
    "pode mandar", "manda ai", "manda aí",
    "faz o codigo", "faz o código", "faça o código",
    "cria o projeto", "crie o projeto",
    "gera tudo", "gere tudo", "manda tudo",
    "sim", "ok", "isso", "beleza", "pode ser", "manda", "vai"
  ];
  
  // Se é uma descrição de projeto, também conta como pedido de código
  if (isProjectDescription(message)) {
    return true;
  }
  
  return codeRequestPhrases.some(phrase => lowerMessage.includes(phrase));
}

function parseCommands(response: string): string[] {
  const commands: string[] = [];
  const commandPattern = /\[EXECUTAR_COMANDO:\s*(.+?)\]/gi;
  let match;
  
  while ((match = commandPattern.exec(response)) !== null) {
    commands.push(match[1].trim());
  }
  
  return commands;
}

function parseGeneratedFiles(response: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  
  const filePattern = /=== ARQUIVO: (.+?) ===([\s\S]*?)(?:=== FIM ARQUIVO ===|(?==== ARQUIVO:)|$)/gi;
  let match;
  
  while ((match = filePattern.exec(response)) !== null) {
    const filename = match[1].trim();
    const content = match[2].trim();
    
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'yml': 'yaml',
      'yaml': 'yaml',
    };
    
    files.push({
      filename,
      content,
      language: languageMap[ext] || 'plaintext'
    });
  }
  
  if (files.length === 0) {
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    let blockIndex = 0;
    
    while ((match = codeBlockPattern.exec(response)) !== null) {
      const language = match[1] || 'javascript';
      const content = match[2].trim();
      
      let filename = `file_${blockIndex}.${language === 'javascript' ? 'js' : language}`;
      
      if (content.includes('express') || content.includes('app.listen')) {
        filename = 'index.js';
      } else if (content.includes('"dependencies"') || content.includes('"name"')) {
        filename = 'package.json';
      } else if (content.includes('<!DOCTYPE') || content.includes('<html')) {
        filename = 'index.html';
      } else if (content.includes('CREATE TABLE') || content.includes('SELECT')) {
        filename = 'schema.sql';
      }
      
      files.push({ filename, content, language });
      blockIndex++;
    }
  }
  
  return files;
}

export async function sendChatMessage(
  conversationId: number,
  userMessage: string,
  userId: string,
  forceCodeGeneration: boolean = false
): Promise<ChatResponse> {
  const conversation = await storage.getConversation(conversationId);
  if (!conversation) {
    throw new Error("Conversa não encontrada");
  }

  if (conversation.userId !== userId) {
    throw new Error("Acesso negado");
  }

  await storage.createMessage({
    conversationId,
    role: "user",
    messageType: "text",
    content: userMessage,
  });

  const history = await storage.getConversationMessages(conversationId);
  
  const shouldGenerateCode = forceCodeGeneration || isExplicitCodeRequest(userMessage);
  
  let systemContent = CONVERSATIONAL_PROMPT;
  if (shouldGenerateCode) {
    systemContent += `\n\nATENÇÃO: O usuário está pedindo para gerar código AGORA. 
Gere o código completo usando [CODIGO_PRONTO] e o formato === ARQUIVO: nome.ext ===.
Inclua TODOS os arquivos necessários (package.json, README.md, etc).`;
    console.log("[CHAT] Usuário pediu código explicitamente");
  }

  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemContent },
    ...history.map((msg: Message) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
  ];

  let aiResponse: string;
  
  const thinkingTaskId = await createTask(conversationId, "thinking", "Analisando sua mensagem...");
  
  try {
    console.log(`[CHAT] Chamando OpenAI (${history.length} msgs, codeRequested=${shouldGenerateCode})...`);
    aiResponse = await callOpenAI(chatMessages);
    console.log("[CHAT] Resposta recebida!");
    await completeTask(thinkingTaskId);
    
  } catch (error) {
    console.error("[CHAT] Erro OpenAI:", error);
    await failTask(thinkingTaskId, "Erro ao processar");
    aiResponse = "Opa, tive um problema técnico aqui. Pode repetir o que você disse?";
  }

  const isCodeReady = aiResponse.includes("[CODIGO_PRONTO]") || aiResponse.includes("=== ARQUIVO:");
  let cleanResponse = aiResponse.replace("[CODIGO_PRONTO]", "").trim();
  let code: string | undefined;
  let files: GeneratedFile[] = [];
  let messageType: "text" | "question" | "code" = "text";

  if (isCodeReady) {
    files = parseGeneratedFiles(aiResponse);
    
    if (files.length > 0) {
      code = files.map(f => `// ${f.filename}\n${f.content}`).join("\n\n");
    }
    
    messageType = "code";
    
    await storage.updateConversation(conversationId, {
      status: "completed",
    });
    
    console.log(`[CHAT] Código gerado! ${files.length} arquivos`);
  } else if (cleanResponse.includes("?")) {
    messageType = "question";
  }

  const metadata = files.length > 0 ? { files } : undefined;

  await storage.createMessage({
    conversationId,
    role: "assistant",
    messageType,
    content: cleanResponse,
    codeGenerated: code,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
  });

  if (!conversation.title || conversation.title === "Nova Conversa") {
    const title = generateConversationTitle(userMessage);
    await storage.updateConversation(conversationId, { title });
  }

  let projectId: number | undefined;
  let workspaceError: string | undefined;
  let filesCreated = 0;

  if (isCodeReady && code) {
    const codeTaskId = await createTask(conversationId, "generating", `Gerando ${files.length} arquivos...`);
    
    try {
      const projectName = generateConversationTitle(userMessage);
      const project = await storage.createProject({
        userId,
        name: projectName,
        description: `Projeto gerado a partir da conversa`,
        templateType: "custom",
        generatedCode: code,
        language: files.length > 0 ? detectLanguageFromFiles(files) : "javascript",
      });
      projectId = project.id;
      
      await completeTask(codeTaskId, `Projeto "${projectName}" criado`);

      if (files.length > 0 && projectId) {
        const filesTaskId = await createTask(conversationId, "writing", `Salvando ${files.length} arquivos...`, projectId);
        
        try {
          await workspaceService.initWorkspace(projectId);
          
          for (const file of files) {
            try {
              if (file.filename && file.content !== undefined) {
                const normalizedPath = file.filename.replace(/\\/g, "/");
                await workspaceService.createFile(projectId, normalizedPath, file.content);
                filesCreated++;
                console.log(`[WORKSPACE] Arquivo criado: ${normalizedPath}`);
              }
            } catch (fileError: any) {
              console.error(`[WORKSPACE] Erro ao criar ${file.filename}: ${fileError.message}`);
            }
          }
          
          await completeTask(filesTaskId, `${filesCreated}/${files.length} arquivos salvos`);
          console.log(`[WORKSPACE] ${filesCreated}/${files.length} arquivos salvos no workspace do projeto ${projectId}`);
        } catch (wsError: any) {
          workspaceError = wsError.message;
          await failTask(filesTaskId, wsError.message);
          console.error(`[WORKSPACE] Erro ao salvar arquivos: ${wsError.message}`);
        }
      }
    } catch (projectError: any) {
      await failTask(codeTaskId, projectError.message);
      console.error(`[PROJECT] Erro ao criar projeto: ${projectError.message}`);
    }
  }

  const workspaceSuccess = files.length === 0 || (filesCreated === files.length && !workspaceError);
  const success = !workspaceError || filesCreated > 0;

  return {
    success,
    message: cleanResponse,
    isCodeReady: isCodeReady && success,
    code,
    files: files.length > 0 ? files : undefined,
    messageType,
    projectId,
    workspaceSuccess,
    workspaceError,
    filesCreated,
    filesTotal: files.length,
  };
}

async function callOpenAI(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 4000,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Não entendi, pode reformular?";
}

export async function* streamChatMessage(
  conversationId: number,
  userMessage: string,
  userId: string,
  forceCodeGeneration: boolean = false,
  model: string = "gpt-4o-mini"
): AsyncGenerator<{ type: string; data: any }> {
  const conversation = await storage.getConversation(conversationId);
  if (!conversation) {
    throw new Error("Conversa não encontrada");
  }

  if (conversation.userId !== userId) {
    throw new Error("Acesso negado");
  }

  yield { type: "status", data: { message: "Processando sua mensagem..." } };

  await storage.createMessage({
    conversationId,
    role: "user",
    messageType: "text",
    content: userMessage,
  });

  yield { type: "status", data: { message: "Analisando contexto..." } };

  const history = await storage.getConversationMessages(conversationId);
  const shouldGenerateCode = forceCodeGeneration || isExplicitCodeRequest(userMessage);

  let systemContent = CONVERSATIONAL_PROMPT;
  if (shouldGenerateCode) {
    systemContent += `\n\nATENÇÃO: O usuário está pedindo para gerar código AGORA. 
Gere o código completo usando [CODIGO_PRONTO] e o formato === ARQUIVO: nome.ext ===.
Inclua TODOS os arquivos necessários (package.json, README.md, etc).`;
    yield { type: "status", data: { message: "Gerando codigo..." } };
  }

  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemContent },
    ...history.map((msg: Message) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
  ];

  yield { type: "status", data: { message: "Conectando com IA..." } };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: chatMessages,
      max_tokens: 4000,
      temperature: 0.8,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  yield { type: "status", data: { message: "Recebendo resposta..." } };

  let fullContent = "";
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error("Failed to get response reader");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(line => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              yield { type: "chunk", data: { content } };
            }
          } catch (e) {
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const isCodeReady = fullContent.includes("[CODIGO_PRONTO]") || fullContent.includes("=== ARQUIVO:");
  let cleanResponse = fullContent.replace("[CODIGO_PRONTO]", "").trim();
  let code: string | undefined;
  let files: GeneratedFile[] = [];
  let messageType: "text" | "question" | "code" = "text";

  if (isCodeReady) {
    files = parseGeneratedFiles(fullContent);
    
    if (files.length > 0) {
      code = files.map(f => `// ${f.filename}\n${f.content}`).join("\n\n");
      yield { type: "files", data: { files } };
    }
    
    messageType = "code";
    
    await storage.updateConversation(conversationId, {
      status: "completed",
    });
  } else if (cleanResponse.includes("?")) {
    messageType = "question";
  }

  const metadata = files.length > 0 ? { files } : undefined;

  await storage.createMessage({
    conversationId,
    role: "assistant",
    messageType,
    content: cleanResponse,
    codeGenerated: code,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
  });

  if (!conversation.title || conversation.title === "Nova Conversa") {
    const title = generateConversationTitle(userMessage);
    await storage.updateConversation(conversationId, { title });
  }

  let projectId: number | undefined;
  let workspaceError: string | undefined;
  let filesCreated = 0;

  if (isCodeReady && code) {
    const projectName = generateConversationTitle(userMessage);
    const project = await storage.createProject({
      userId,
      name: projectName,
      description: `Projeto gerado a partir da conversa`,
      templateType: "custom",
      generatedCode: code,
      language: files.length > 0 ? detectLanguageFromFiles(files) : "javascript",
    });
    projectId = project.id;

    if (files.length > 0 && projectId) {
      try {
        await workspaceService.initWorkspace(projectId);
        yield { type: "status", data: { message: "Salvando arquivos no workspace..." } };
        
        for (const file of files) {
          try {
            if (file.filename && file.content !== undefined) {
              const normalizedPath = file.filename.replace(/\\/g, "/");
              await workspaceService.createFile(projectId, normalizedPath, file.content);
              filesCreated++;
              console.log(`[WORKSPACE] Arquivo criado: ${normalizedPath}`);
              yield { type: "file_created", data: { filename: normalizedPath } };
            }
          } catch (fileError: any) {
            console.error(`[WORKSPACE] Erro ao criar ${file.filename}: ${fileError.message}`);
            yield { type: "file_error", data: { filename: file.filename, error: fileError.message } };
          }
        }
        
        console.log(`[WORKSPACE] ${filesCreated}/${files.length} arquivos salvos no workspace do projeto ${projectId}`);
        
        const hasPackageJson = files.some(f => f.filename === "package.json" || f.filename.endsWith("/package.json"));
        if (hasPackageJson && projectId) {
          yield { type: "status", data: { message: "Instalando dependencias..." } };
          try {
            const installResult = await workspaceService.runCommand(projectId, "npm install");
            if (installResult.success) {
              console.log(`[WORKSPACE] npm install concluido com sucesso`);
              yield { type: "status", data: { message: "Dependencias instaladas com sucesso!" } };
              
              // Parse and execute any commands from the AI response
              const commands = parseCommands(fullContent);
              for (const cmd of commands) {
                if (cmd !== "npm install") { // Skip npm install since we already ran it
                  yield { type: "command_start", data: { command: cmd } };
                  try {
                    const cmdResult = await workspaceService.runCommand(projectId, cmd);
                    if (cmdResult.success) {
                      yield { type: "command_complete", data: { command: cmd, success: true } };
                    } else {
                      yield { type: "command_complete", data: { command: cmd, success: false, error: cmdResult.error } };
                    }
                  } catch (cmdError: any) {
                    yield { type: "command_error", data: { command: cmd, error: cmdError.message } };
                  }
                }
              }
              
              // Auto-start dev server if project has a dev script
              const packageJsonFile = files.find(f => f.filename === "package.json" || f.filename.endsWith("/package.json"));
              if (packageJsonFile) {
                try {
                  const pkgJson = JSON.parse(packageJsonFile.content);
                  if (pkgJson.scripts?.dev || pkgJson.scripts?.start) {
                    const startCmd = pkgJson.scripts?.dev ? "npm run dev" : "npm start";
                    yield { type: "status", data: { message: `Iniciando servidor com ${startCmd}...` } };
                    yield { type: "dev_server_start", data: { command: startCmd, projectId } };
                  }
                } catch (e) {
                  console.error("[WORKSPACE] Erro ao parsear package.json:", e);
                }
              }
            } else {
              console.warn(`[WORKSPACE] npm install falhou: ${installResult.error || installResult.output}`);
              yield { type: "warning", data: { message: "Aviso: instalacao de dependencias pode ter falhado" } };
            }
          } catch (npmError: any) {
            console.error(`[WORKSPACE] Erro ao instalar dependencias: ${npmError.message}`);
          }
        }
      } catch (wsError: any) {
        workspaceError = wsError.message;
        console.error(`[WORKSPACE] Erro ao salvar arquivos: ${wsError.message}`);
        yield { type: "error", data: { message: `Erro ao inicializar workspace: ${wsError.message}` } };
      }
      
      if (filesCreated < files.length && !workspaceError) {
        yield { type: "warning", data: { message: `${filesCreated}/${files.length} arquivos salvos` } };
      }
    }
  }

  const workspaceSuccess = files.length === 0 || (filesCreated === files.length && !workspaceError);
  const success = !workspaceError || filesCreated > 0;

  if (workspaceError && filesCreated === 0) {
    yield {
      type: "error",
      data: {
        message: `Falha ao criar projeto: ${workspaceError}`,
        code,
        files,
      }
    };
  }

  yield { 
    type: "complete", 
    data: { 
      success,
      message: cleanResponse,
      isCodeReady: isCodeReady && success,
      code,
      files: files.length > 0 ? files : undefined,
      messageType,
      projectId,
      workspaceSuccess,
      workspaceError,
      filesCreated,
      filesTotal: files.length,
    } 
  };
}

function generateConversationTitle(firstMessage: string): string {
  const words = firstMessage.split(" ").slice(0, 5).join(" ");
  return words.length > 40 ? words.substring(0, 40) + "..." : words;
}

function detectLanguageFromFiles(files: GeneratedFile[]): string {
  const extPriority = ["tsx", "ts", "jsx", "js", "py", "html", "php"];
  for (const ext of extPriority) {
    if (files.some(f => f.filename.endsWith(`.${ext}`))) {
      const langMap: Record<string, string> = {
        tsx: "typescript",
        ts: "typescript",
        jsx: "javascript",
        js: "javascript",
        py: "python",
        html: "html",
        php: "php",
      };
      return langMap[ext] || "javascript";
    }
  }
  return "javascript";
}

export async function createNewConversation(userId: string): Promise<Conversation> {
  const conversation = await storage.createConversation({
    userId,
    title: "Nova Conversa",
    status: "collecting_requirements",
  });

  await storage.createMessage({
    conversationId: conversation.id,
    role: "assistant",
    messageType: "text",
    content: `E aí! Sou o BratvaCoder, seu parceiro de programação! 

O que você quer criar hoje? Me conta sua ideia que a gente desenvolve juntos.`,
  });

  return conversation;
}
