// Template: Telegram Bot
// Categoria: bots
// Palavras-chave: telegram, bot, chat, mensagem

export const telegramBotTemplate = {
  id: "telegram-bot",
  name: "Telegram Bot",
  category: "bots",
  description: "Bot para Telegram com comandos, inline keyboard e webhooks",
  keywords: [
    "telegram", "bot", "chat", "mensagem", "telegraf", "comando",
    "teclado", "inline", "webhook", "notificação"
  ],
  files: {
    "package.json": `{
  "name": "telegram-bot",
  "version": "1.0.0",
  "description": "Bot Telegram com Telegraf",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "telegraf": "^4.15.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`,
    "src/index.js": `require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');

// Configuração
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN não configurado!');
  console.log('1. Crie um bot com @BotFather no Telegram');
  console.log('2. Copie o token e adicione no .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Middleware de logging
bot.use((ctx, next) => {
  const user = ctx.from;
  console.log(\`[\${new Date().toISOString()}] \${user?.username || user?.id}: \${ctx.message?.text || 'ação'}\`);
  return next();
});

// Comando /start
bot.command('start', (ctx) => {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('📋 Comandos', 'show_commands')],
    [Markup.button.callback('ℹ️ Sobre', 'show_about')],
    [Markup.button.url('🌐 Site', 'https://example.com')]
  ]);
  
  ctx.reply(
    \`👋 Olá, \${ctx.from.first_name}!\\n\\nEu sou um bot de exemplo. Use os botões abaixo ou digite /help para ver os comandos disponíveis.\`,
    keyboard
  );
});

// Comando /help
bot.command('help', (ctx) => {
  ctx.reply(\`📋 *Comandos Disponíveis*

/start - Iniciar o bot
/help - Ver esta mensagem
/ping - Verificar se estou online
/echo [texto] - Repetir uma mensagem
/info - Suas informações

*Exemplos:*
\\\`/echo Olá mundo!\\\`\`, { parse_mode: 'Markdown' });
});

// Comando /ping
bot.command('ping', (ctx) => {
  const start = Date.now();
  ctx.reply('🏓 Pong!').then(() => {
    const latency = Date.now() - start;
    ctx.reply(\`⏱️ Latência: \${latency}ms\`);
  });
});

// Comando /echo
bot.command('echo', (ctx) => {
  const text = ctx.message.text.split(' ').slice(1).join(' ');
  if (!text) {
    ctx.reply('❌ Uso: /echo [mensagem]');
    return;
  }
  ctx.reply(\`📢 \${text}\`);
});

// Comando /info
bot.command('info', (ctx) => {
  const user = ctx.from;
  ctx.reply(\`👤 *Suas Informações*

ID: \\\`\${user.id}\\\`
Nome: \${user.first_name} \${user.last_name || ''}
Username: @\${user.username || 'não definido'}
Idioma: \${user.language_code || 'não definido'}\`, { parse_mode: 'Markdown' });
});

// Callbacks dos botões inline
bot.action('show_commands', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(\`📋 *Comandos:*
/start - Iniciar
/help - Ajuda
/ping - Latência
/echo - Repetir
/info - Suas infos\`, { parse_mode: 'Markdown' });
});

bot.action('show_about', (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(\`ℹ️ *Sobre o Bot*

Versão: 1.0.0
Framework: Telegraf
Criado com Node.js\`, { parse_mode: 'Markdown' });
});

// Responder mensagens de texto genéricas
bot.on('text', (ctx) => {
  // Só responde se não for comando
  if (ctx.message.text.startsWith('/')) return;
  
  ctx.reply(\`Você disse: "\${ctx.message.text}"\\n\\nDigite /help para ver os comandos.\`);
});

// Tratamento de erros
bot.catch((err, ctx) => {
  console.error('Erro:', err);
  ctx.reply('❌ Ocorreu um erro. Tente novamente.');
});

// Iniciar bot
bot.launch()
  .then(() => {
    console.log('🤖 Bot iniciado com sucesso!');
    console.log('Aguardando mensagens...');
  })
  .catch((err) => {
    console.error('Falha ao iniciar:', err.message);
  });

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));`,
    ".env.example": `TELEGRAM_BOT_TOKEN=seu_token_aqui`,
    "README.md": `# Telegram Bot

Bot para Telegram usando Telegraf.

## Configuração

1. Fale com @BotFather no Telegram
2. Crie um novo bot com /newbot
3. Copie o token
4. Crie arquivo .env:

\`\`\`
TELEGRAM_BOT_TOKEN=seu_token_aqui
\`\`\`

## Instalação

\`\`\`bash
npm install
npm start
\`\`\`

## Comandos

| Comando | Descrição |
|---------|-----------|
| /start | Iniciar bot |
| /help | Ver comandos |
| /ping | Testar latência |
| /echo | Repetir mensagem |
| /info | Suas informações |

## Adicionar Comandos

\`\`\`javascript
bot.command('meucomando', (ctx) => {
  ctx.reply('Resposta do comando');
});
\`\`\`
`
  }
};

export default telegramBotTemplate;
