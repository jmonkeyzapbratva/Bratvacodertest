// Template: WhatsApp Bot com Baileys
// Categoria: bots
// Palavras-chave: whatsapp, bot, zap, wpp, baileys, mensagem, chat

export const whatsappBotTemplate = {
  id: "whatsapp-bot",
  name: "WhatsApp Bot",
  category: "bots",
  description: "Bot para WhatsApp usando Baileys com comandos, prefixo customizável e verificação de admin",
  keywords: [
    "whatsapp", "bot", "zap", "wpp", "baileys", "mensagem", "chat",
    "automação", "responder", "comando", "prefixo", "admin", "dono",
    "ping", "pong", "mensagem automática"
  ],
  files: {
    "package.json": `{
  "name": "whatsapp-bot",
  "version": "1.0.0",
  "description": "Bot WhatsApp com Baileys",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.6.0",
    "qrcode-terminal": "^0.12.0",
    "pino": "^8.16.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`,
    "src/index.js": `const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

// ===== CONFIGURAÇÕES =====
const config = {
  prefix: '!',                    // Prefixo dos comandos
  ownerNumber: '5511999999999',   // Número do dono (com código do país)
  botName: 'MeuBot'
};

// Lista de admins (adicione números aqui)
const admins = new Set([
  config.ownerNumber,
  // Adicione mais admins: '5511888888888'
]);

// ===== FUNÇÕES AUXILIARES =====
function isOwner(sender) {
  return sender.replace('@s.whatsapp.net', '') === config.ownerNumber;
}

function isAdmin(sender) {
  const number = sender.replace('@s.whatsapp.net', '');
  return admins.has(number) || isOwner(sender);
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return \`\${days}d \${hours % 24}h \${minutes % 60}m\`;
  if (hours > 0) return \`\${hours}h \${minutes % 60}m \${seconds % 60}s\`;
  if (minutes > 0) return \`\${minutes}m \${seconds % 60}s\`;
  return \`\${seconds}s\`;
}

// ===== COMANDOS =====
const commands = {
  // Comando ping - apenas admin/dono
  ping: {
    description: 'Verifica latência do bot',
    adminOnly: true,
    execute: async (sock, msg, args, startTime) => {
      const responseTime = Date.now() - startTime;
      await sock.sendMessage(msg.key.remoteJid, {
        text: \`🏓 *Pong!*\\n\\n⏱️ Tempo de resposta: *\${responseTime}ms*\\n🤖 Bot: *\${config.botName}*\\n⏰ Uptime: *\${formatUptime(process.uptime() * 1000)}*\`
      });
    }
  },
  
  // Comando help - público
  help: {
    description: 'Lista comandos disponíveis',
    adminOnly: false,
    execute: async (sock, msg, args, startTime) => {
      let helpText = \`🤖 *\${config.botName} - Comandos*\\n\\n\`;
      helpText += \`Prefixo: *\${config.prefix}*\\n\\n\`;
      
      for (const [cmd, data] of Object.entries(commands)) {
        const adminTag = data.adminOnly ? ' 🔒' : '';
        helpText += \`*\${config.prefix}\${cmd}*\${adminTag}\\n\`;
        helpText += \`└ \${data.description}\\n\\n\`;
      }
      
      helpText += \`\\n🔒 = Apenas admins/dono\`;
      
      await sock.sendMessage(msg.key.remoteJid, { text: helpText });
    }
  },
  
  // Comando info - público
  info: {
    description: 'Informações do bot',
    adminOnly: false,
    execute: async (sock, msg, args, startTime) => {
      await sock.sendMessage(msg.key.remoteJid, {
        text: \`🤖 *\${config.botName}*\\n\\n📊 Status: Online\\n⏰ Uptime: \${formatUptime(process.uptime() * 1000)}\\n🔧 Prefixo: \${config.prefix}\\n\\nDesenvolvido com Baileys\`
      });
    }
  },
  
  // Comando sticker - público
  sticker: {
    description: 'Converte imagem em sticker',
    adminOnly: false,
    execute: async (sock, msg, args, startTime) => {
      // Verifica se tem imagem
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quotedMsg?.imageMessage && !msg.message?.imageMessage) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ Envie ou responda uma imagem!'
        });
        return;
      }
      
      await sock.sendMessage(msg.key.remoteJid, {
        text: '⏳ Criando sticker... (implemente a lógica de conversão)'
      });
    }
  }
};

// ===== INICIALIZAÇÃO =====
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' })
  });
  
  // Eventos de conexão
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('\\n📱 Escaneie o QR Code abaixo:\\n');
      qrcode.generate(qr, { small: true });
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexão fechada. Reconectando:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(\`\\n✅ \${config.botName} conectado com sucesso!\\n\`);
    }
  });
  
  // Salvar credenciais
  sock.ev.on('creds.update', saveCreds);
  
  // Processar mensagens
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    for (const msg of messages) {
      // Ignorar mensagens próprias
      if (msg.key.fromMe) continue;
      
      const startTime = Date.now();
      const text = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text || '';
      
      // Verificar se começa com prefixo
      if (!text.startsWith(config.prefix)) continue;
      
      // Extrair comando e argumentos
      const args = text.slice(config.prefix.length).trim().split(/\\s+/);
      const commandName = args.shift()?.toLowerCase();
      
      if (!commandName) continue;
      
      const command = commands[commandName];
      if (!command) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: \`❌ Comando não encontrado. Use *\${config.prefix}help*\`
        });
        continue;
      }
      
      // Verificar permissão de admin
      if (command.adminOnly && !isAdmin(msg.key.participant || msg.key.remoteJid)) {
        await sock.sendMessage(msg.key.remoteJid, {
          text: '🔒 Apenas admins e o dono podem usar este comando!'
        });
        continue;
      }
      
      // Executar comando
      try {
        await command.execute(sock, msg, args, startTime);
      } catch (error) {
        console.error('Erro ao executar comando:', error);
        await sock.sendMessage(msg.key.remoteJid, {
          text: '❌ Erro ao executar comando. Tente novamente.'
        });
      }
    }
  });
}

// Iniciar
console.log(\`🚀 Iniciando \${config.botName}...\\n\`);
startBot();`,
    "README.md": `# WhatsApp Bot com Baileys

Bot para WhatsApp usando a biblioteca Baileys.

## Funcionalidades

- ✅ Prefixo customizável (padrão: !)
- ✅ Sistema de permissões (dono/admin)
- ✅ Comando ping com tempo de resposta
- ✅ Comando help automático
- ✅ Fácil de adicionar novos comandos

## Instalação

\`\`\`bash
npm install
npm start
\`\`\`

## Comandos

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| !ping | Mostra latência | Admin/Dono |
| !help | Lista comandos | Público |
| !info | Info do bot | Público |
| !sticker | Cria sticker | Público |

## Configuração

Edite as configurações em \`src/index.js\`:

\`\`\`javascript
const config = {
  prefix: '!',
  ownerNumber: '5511999999999',
  botName: 'MeuBot'
};
\`\`\`

## Adicionar Admins

\`\`\`javascript
const admins = new Set([
  config.ownerNumber,
  '5511888888888', // Adicione aqui
]);
\`\`\`

## Adicionar Comandos

\`\`\`javascript
commands.meucomando = {
  description: 'Descrição do comando',
  adminOnly: false,
  execute: async (sock, msg, args, startTime) => {
    await sock.sendMessage(msg.key.remoteJid, {
      text: 'Resposta do comando'
    });
  }
};
\`\`\`
`
  }
};

export default whatsappBotTemplate;
