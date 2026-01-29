// Template: Slack Bot
// Categoria: bots
// Palavras-chave: slack, bot, workspace, mensagem, canal

export const slackBotTemplate = {
  id: "slack-bot",
  name: "Slack Bot",
  category: "bots",
  description: "Bot para Slack com comandos, eventos e mensagens interativas",
  keywords: [
    "slack", "bot", "workspace", "mensagem", "canal", "equipe",
    "comando slack", "automação slack", "bolt", "team", "empresa"
  ],
  files: {
    "package.json": `{
  "name": "slack-bot",
  "version": "1.0.0",
  "description": "Bot Slack com Bolt.js",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "@slack/bolt": "^3.17.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`,
    "src/index.js": `require('dotenv').config();
const { App } = require('@slack/bolt');

// Validação de variáveis de ambiente
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const APP_TOKEN = process.env.SLACK_APP_TOKEN;

if (!BOT_TOKEN || !SIGNING_SECRET || !APP_TOKEN) {
  console.error('Erro: Variaveis de ambiente obrigatorias nao configuradas!');
  console.log('');
  console.log('Configure as seguintes variaveis no arquivo .env:');
  console.log('');
  if (!BOT_TOKEN) console.log('  SLACK_BOT_TOKEN - Obtenha em api.slack.com/apps > OAuth & Permissions');
  if (!SIGNING_SECRET) console.log('  SLACK_SIGNING_SECRET - Obtenha em api.slack.com/apps > Basic Information');
  if (!APP_TOKEN) console.log('  SLACK_APP_TOKEN - Obtenha em api.slack.com/apps > Basic Information > App-Level Tokens');
  console.log('');
  console.log('Consulte o README.md para instrucoes detalhadas.');
  process.exit(1);
}

// Configuração
const app = new App({
  token: BOT_TOKEN,
  signingSecret: SIGNING_SECRET,
  socketMode: true,
  appToken: APP_TOKEN
});

// Middleware de logging
app.use(async ({ event, next }) => {
  if (event) {
    console.log(\`[\${new Date().toISOString()}] Evento: \${event.type}\`);
  }
  await next();
});

// Responder a menções do bot
app.event('app_mention', async ({ event, say }) => {
  await say(\`Olá <@\${event.user}>! Eu sou um bot de exemplo. Digite /ajuda para ver os comandos.\`);
});

// Comando /ping
app.command('/ping', async ({ command, ack, respond }) => {
  await ack();
  const start = Date.now();
  await respond(\`Pong! Latência: \${Date.now() - start}ms\`);
});

// Comando /ajuda
app.command('/ajuda', async ({ command, ack, respond }) => {
  await ack();
  await respond({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Comandos Disponíveis*\\n\\n/ping - Verificar latência\\n/ajuda - Ver esta mensagem\\n/info - Suas informações\\n/tarefa [texto] - Criar tarefa'
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Você também pode me mencionar para interagir!'
        }
      }
    ]
  });
});

// Comando /info
app.command('/info', async ({ command, ack, respond }) => {
  await ack();
  await respond({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: \`*Suas Informações*\\n\\nUsuário: <@\${command.user_id}>\\nCanal: <#\${command.channel_id}>\\nWorkspace: \${command.team_domain || 'N/A'}\`
        }
      }
    ]
  });
});

// Comando /tarefa
app.command('/tarefa', async ({ command, ack, respond }) => {
  await ack();
  
  const taskText = command.text;
  if (!taskText) {
    await respond('Uso: /tarefa [descrição da tarefa]');
    return;
  }
  
  await respond({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: \`*Nova Tarefa Criada*\\n\\n\${taskText}\`
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Marcar Concluída'
          },
          action_id: 'complete_task',
          style: 'primary'
        }
      }
    ]
  });
});

// Ação do botão de completar tarefa
app.action('complete_task', async ({ body, ack, say }) => {
  await ack();
  try {
    await say('Tarefa marcada como concluida!');
  } catch (e) {
    console.log('Resposta enviada via ack');
  }
});

// Responder a mensagens diretas
app.message(async ({ message, say }) => {
  // Ignora mensagens de bots
  if (message.subtype === 'bot_message') return;
  
  // Ignora mensagens de comandos
  if (message.text && message.text.startsWith('/')) return;
  
  // Ignora mensagens em threads para evitar duplicatas
  if (message.thread_ts) return;
  
  await say(\`Voce disse: "\${message.text}"\\n\\nDigite /ajuda para ver os comandos disponiveis.\`);
});

// Tratamento de erros
app.error(async (error) => {
  console.error('Erro:', error);
});

// Iniciar app
(async () => {
  try {
    const port = process.env.PORT || 3000;
    await app.start(port);
    console.log('Bot Slack iniciado com sucesso!');
    console.log('Socket Mode: ativado');
    console.log('Aguardando comandos...');
  } catch (error) {
    console.error('Falha ao iniciar o bot:', error.message);
    console.log('');
    console.log('Verifique:');
    console.log('1. Se os tokens estao corretos');
    console.log('2. Se Socket Mode esta ativado no app');
    console.log('3. Se as permissoes OAuth estao configuradas');
    process.exit(1);
  }
})();`,
    ".env.example": `# Obtenha em api.slack.com/apps
SLACK_BOT_TOKEN=xoxb-seu-token-aqui
SLACK_SIGNING_SECRET=seu-signing-secret
SLACK_APP_TOKEN=xapp-seu-app-token`,
    "README.md": `# Slack Bot

Bot para Slack usando Bolt.js com Socket Mode.

## Configuracao

1. Acesse [api.slack.com/apps](https://api.slack.com/apps)
2. Clique "Create New App" > "From scratch"
3. Configure as permissoes OAuth (OAuth & Permissions > Scopes):
   - \`app_mentions:read\`
   - \`channels:history\`
   - \`chat:write\`
   - \`commands\`
   - \`im:history\`
4. Ative Socket Mode:
   - Va em "Socket Mode" no menu lateral
   - Ative "Enable Socket Mode"
   - Crie um App-Level Token com scope \`connections:write\`
   - Copie o token (comeca com xapp-)
5. Crie os Slash Commands:
   - Va em "Slash Commands" no menu lateral
   - Clique "Create New Command" para cada:
     - \`/ping\` - Testar latencia
     - \`/ajuda\` - Ver comandos
     - \`/info\` - Suas informacoes
     - \`/tarefa\` - Criar tarefa
6. Instale o app no workspace:
   - Va em "Install App"
   - Clique "Install to Workspace"
7. Copie os tokens para o .env:
   - SLACK_BOT_TOKEN: OAuth & Permissions > Bot User OAuth Token
   - SLACK_SIGNING_SECRET: Basic Information > Signing Secret
   - SLACK_APP_TOKEN: Basic Information > App-Level Tokens

## Instalacao

\`\`\`bash
npm install
npm start
\`\`\`

## Comandos

| Comando | Descricao |
|---------|-----------|
| /ping | Testar latencia |
| /ajuda | Ver comandos |
| /info | Suas informacoes |
| /tarefa | Criar tarefa |

## Adicionar Comandos

1. Crie o comando no Slack (Slash Commands > Create New Command)
2. Adicione o handler no codigo:

\`\`\`javascript
app.command('/meucomando', async ({ command, ack, respond }) => {
  await ack();
  await respond('Resposta do comando');
});
\`\`\`
`
  }
};

export default slackBotTemplate;
