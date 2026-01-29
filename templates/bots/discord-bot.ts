// Template: Discord Bot
// Categoria: bots
// Palavras-chave: discord, bot, servidor, mensagem, canal

export const discordBotTemplate = {
  id: "discord-bot",
  name: "Discord Bot",
  category: "bots",
  description: "Bot para Discord com comandos slash, eventos e embeds",
  keywords: [
    "discord", "bot", "servidor", "mensagem", "canal", "jogos",
    "comando discord", "automação discord", "discord.js", "guild"
  ],
  files: {
    "package.json": `{
  "name": "discord-bot",
  "version": "1.0.0",
  "description": "Bot Discord com Discord.js",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "deploy": "node src/deploy-commands.js"
  },
  "dependencies": {
    "discord.js": "^14.14.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`,
    "src/index.js": `require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, Collection, REST, Routes, SlashCommandBuilder } = require('discord.js');

// Configuração
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('Configure DISCORD_TOKEN e DISCORD_CLIENT_ID no .env');
  process.exit(1);
}

// Criar cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Coleção de comandos
client.commands = new Collection();

// Definir comandos slash
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Verifica a latência do bot'),
  new SlashCommandBuilder()
    .setName('info')
    .setDescription('Mostra informações sobre você'),
  new SlashCommandBuilder()
    .setName('servidor')
    .setDescription('Mostra informações do servidor'),
  new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Lista todos os comandos'),
  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Mostra o avatar de um usuário')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('O usuário para ver o avatar')
        .setRequired(false)
    )
];

// Registrar comandos na inicialização
async function deployCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('Registrando comandos slash...');
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands.map(cmd => cmd.toJSON()) }
    );
    console.log('Comandos registrados!');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
}

// Evento: Bot pronto
client.once(Events.ClientReady, async (c) => {
  console.log(\`Bot conectado como \${c.user.tag}!\`);
  console.log(\`Servidores: \${c.guilds.cache.size}\`);
  
  // Registrar comandos
  await deployCommands();
  
  // Status do bot
  client.user.setActivity('Digite /ajuda', { type: 0 });
});

// Evento: Interação (comandos slash)
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const { commandName } = interaction;
  
  // Comando /ping
  if (commandName === 'ping') {
    const sent = await interaction.reply({ content: 'Calculando...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(\`Pong! Latencia: \${latency}ms | API: \${Math.round(client.ws.ping)}ms\`);
  }
  
  // Comando /info
  else if (commandName === 'info') {
    const user = interaction.user;
    const member = interaction.member;
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Suas Informacoes')
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Usuario', value: user.tag, inline: true },
        { name: 'ID', value: user.id, inline: true },
        { name: 'Entrou em', value: member?.joinedAt?.toLocaleDateString('pt-BR') || 'N/A', inline: true },
        { name: 'Conta criada', value: user.createdAt.toLocaleDateString('pt-BR'), inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
  
  // Comando /servidor
  else if (commandName === 'servidor') {
    const guild = interaction.guild;
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: 'Membros', value: \`\${guild.memberCount}\`, inline: true },
        { name: 'Canais', value: \`\${guild.channels.cache.size}\`, inline: true },
        { name: 'Criado em', value: guild.createdAt.toLocaleDateString('pt-BR'), inline: true },
        { name: 'Dono', value: \`<@\${guild.ownerId}>\`, inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
  
  // Comando /ajuda
  else if (commandName === 'ajuda') {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Comandos Disponiveis')
      .setDescription('Lista de todos os comandos do bot')
      .addFields(
        { name: '/ping', value: 'Verifica a latencia do bot' },
        { name: '/info', value: 'Mostra suas informacoes' },
        { name: '/servidor', value: 'Mostra informacoes do servidor' },
        { name: '/avatar', value: 'Mostra o avatar de um usuario' },
        { name: '/ajuda', value: 'Mostra esta mensagem' }
      )
      .setFooter({ text: 'Use os comandos com /' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
  
  // Comando /avatar
  else if (commandName === 'avatar') {
    const targetUser = interaction.options.getUser('usuario') || interaction.user;
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(\`Avatar de \${targetUser.username}\`)
      .setImage(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  }
});

// Evento: Mensagem (comandos de texto opcionais)
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  // Responder quando mencionado
  if (message.mentions.has(client.user)) {
    await message.reply('Ola! Use /ajuda para ver meus comandos.');
  }
});

// Tratamento de erros
client.on(Events.Error, (error) => {
  console.error('Erro:', error);
});

// Conectar
client.login(TOKEN);`,
    ".env.example": `# Obtenha em discord.com/developers/applications
DISCORD_TOKEN=seu-token-aqui
DISCORD_CLIENT_ID=seu-client-id`,
    "README.md": `# Discord Bot

Bot para Discord usando Discord.js v14 com comandos slash.

## Configuracao

1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique "New Application"
3. Va em "Bot" e clique "Add Bot"
4. Copie o token
5. Em "OAuth2" > "URL Generator":
   - Selecione: \`bot\`, \`applications.commands\`
   - Permissoes: \`Send Messages\`, \`Read Messages\`, \`Use Slash Commands\`
6. Use a URL gerada para adicionar o bot ao servidor

## Instalacao

\`\`\`bash
npm install
npm start
\`\`\`

## Comandos

| Comando | Descricao |
|---------|-----------|
| /ping | Testar latencia |
| /info | Suas informacoes |
| /servidor | Info do servidor |
| /avatar | Ver avatar |
| /ajuda | Ver comandos |

## Adicionar Comandos

1. Adicione na lista \`commands\`:
\`\`\`javascript
new SlashCommandBuilder()
  .setName('meucomando')
  .setDescription('Descricao do comando')
\`\`\`

2. Adicione o handler no evento \`InteractionCreate\`:
\`\`\`javascript
else if (commandName === 'meucomando') {
  await interaction.reply('Resposta');
}
\`\`\`
`
  }
};

export default discordBotTemplate;
