// Template: Chat Real-time
// Categoria: web
// Palavras-chave: chat, realtime, websocket, tempo real, mensagem

export const realtimeChatTemplate = {
  id: "realtime-chat",
  name: "Chat Real-time",
  category: "web",
  description: "Chat em tempo real com WebSocket, salas e usuários",
  keywords: [
    "chat", "realtime", "websocket", "tempo real", "mensagem", "socket",
    "sala", "conversa", "live", "instantâneo", "bate-papo"
  ],
  files: {
    "package.json": `{
  "name": "realtime-chat",
  "version": "1.0.0",
  "description": "Chat em tempo real com WebSocket",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`,
    "server.js": `const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Estado do chat
const rooms = new Map();
const users = new Map();

// Socket.IO
io.on('connection', (socket) => {
  console.log('Usuário conectado:', socket.id);

  // Entrar em sala
  socket.on('join', ({ username, room }) => {
    socket.join(room);
    
    // Salvar usuário
    users.set(socket.id, { username, room });
    
    // Adicionar à sala
    if (!rooms.has(room)) {
      rooms.set(room, new Set());
    }
    rooms.get(room).add(username);
    
    // Notificar sala
    socket.to(room).emit('message', {
      type: 'system',
      text: \`\${username} entrou na sala\`,
      timestamp: Date.now()
    });
    
    // Enviar lista de usuários
    io.to(room).emit('users', Array.from(rooms.get(room)));
    
    console.log(\`\${username} entrou na sala \${room}\`);
  });

  // Receber mensagem
  socket.on('message', (text) => {
    const user = users.get(socket.id);
    if (!user) return;
    
    const message = {
      type: 'user',
      username: user.username,
      text,
      timestamp: Date.now()
    };
    
    io.to(user.room).emit('message', message);
  });

  // Digitando
  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (!user) return;
    
    socket.to(user.room).emit('typing', {
      username: user.username,
      isTyping
    });
  });

  // Desconexão
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      const room = rooms.get(user.room);
      if (room) {
        room.delete(user.username);
        
        // Notificar sala
        socket.to(user.room).emit('message', {
          type: 'system',
          text: \`\${user.username} saiu da sala\`,
          timestamp: Date.now()
        });
        
        // Atualizar lista
        io.to(user.room).emit('users', Array.from(room));
      }
      users.delete(socket.id);
    }
    console.log('Usuário desconectado:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(\`🚀 Chat rodando em http://localhost:\${PORT}\`);
});`,
    "public/index.html": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat em Tempo Real</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1a1a2e;
      color: #eee;
      height: 100vh;
    }
    
    /* Login */
    #login-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 20px;
    }
    
    #login-screen h1 {
      color: #6366f1;
    }
    
    #login-screen input {
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      width: 250px;
      background: #16213e;
      color: #eee;
    }
    
    #login-screen button {
      padding: 12px 40px;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      cursor: pointer;
    }
    
    /* Chat */
    #chat-screen {
      display: none;
      height: 100vh;
    }
    
    .chat-container {
      display: flex;
      height: 100%;
    }
    
    /* Sidebar */
    .sidebar {
      width: 200px;
      background: #16213e;
      padding: 20px;
      border-right: 1px solid #333;
    }
    
    .sidebar h3 {
      margin-bottom: 15px;
      color: #6366f1;
    }
    
    .user-list {
      list-style: none;
    }
    
    .user-list li {
      padding: 8px 0;
      border-bottom: 1px solid #333;
    }
    
    /* Main chat */
    .chat-main {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .chat-header {
      padding: 15px 20px;
      background: #16213e;
      border-bottom: 1px solid #333;
    }
    
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    
    .message {
      margin-bottom: 15px;
      max-width: 70%;
    }
    
    .message.user {
      background: #16213e;
      padding: 10px 15px;
      border-radius: 15px;
    }
    
    .message.user.self {
      background: #6366f1;
      margin-left: auto;
    }
    
    .message.system {
      text-align: center;
      color: #666;
      font-size: 0.9rem;
    }
    
    .message-username {
      font-size: 0.8rem;
      color: #888;
      margin-bottom: 4px;
    }
    
    .typing-indicator {
      padding: 0 20px;
      font-size: 0.9rem;
      color: #666;
      height: 20px;
    }
    
    /* Input */
    .chat-input {
      display: flex;
      padding: 15px;
      background: #16213e;
      border-top: 1px solid #333;
    }
    
    .chat-input input {
      flex: 1;
      padding: 12px 15px;
      border: none;
      border-radius: 25px;
      background: #0f0f1a;
      color: #eee;
      font-size: 1rem;
    }
    
    .chat-input button {
      margin-left: 10px;
      padding: 12px 25px;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 25px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <!-- Login Screen -->
  <div id="login-screen">
    <h1>Chat em Tempo Real</h1>
    <input type="text" id="username" placeholder="Seu nome" required>
    <input type="text" id="room" placeholder="Nome da sala" value="geral">
    <button onclick="joinChat()">Entrar</button>
  </div>

  <!-- Chat Screen -->
  <div id="chat-screen">
    <div class="chat-container">
      <aside class="sidebar">
        <h3>Usuários Online</h3>
        <ul class="user-list" id="user-list"></ul>
      </aside>
      
      <main class="chat-main">
        <header class="chat-header">
          <h2 id="room-name">Sala: geral</h2>
        </header>
        
        <div class="messages" id="messages"></div>
        
        <div class="typing-indicator" id="typing"></div>
        
        <form class="chat-input" onsubmit="sendMessage(event)">
          <input type="text" id="message-input" placeholder="Digite sua mensagem..." autocomplete="off">
          <button type="submit">Enviar</button>
        </form>
      </main>
    </div>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();
    let username = '';
    let room = '';
    let typingTimeout;

    function joinChat() {
      username = document.getElementById('username').value.trim();
      room = document.getElementById('room').value.trim() || 'geral';
      
      if (!username) return alert('Digite seu nome!');
      
      socket.emit('join', { username, room });
      
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('chat-screen').style.display = 'block';
      document.getElementById('room-name').textContent = 'Sala: ' + room;
      document.getElementById('message-input').focus();
    }

    function sendMessage(e) {
      e.preventDefault();
      const input = document.getElementById('message-input');
      const text = input.value.trim();
      
      if (!text) return;
      
      socket.emit('message', text);
      input.value = '';
    }

    // Typing indicator
    document.getElementById('message-input').addEventListener('input', () => {
      socket.emit('typing', true);
      
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit('typing', false);
      }, 1000);
    });

    // Receber mensagens
    socket.on('message', (msg) => {
      const messages = document.getElementById('messages');
      const div = document.createElement('div');
      
      if (msg.type === 'system') {
        div.className = 'message system';
        div.textContent = msg.text;
      } else {
        const isSelf = msg.username === username;
        div.className = 'message user' + (isSelf ? ' self' : '');
        div.innerHTML = \`
          \${!isSelf ? '<div class="message-username">' + msg.username + '</div>' : ''}
          <div>\${msg.text}</div>
        \`;
      }
      
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    });

    // Lista de usuários
    socket.on('users', (users) => {
      const list = document.getElementById('user-list');
      list.innerHTML = users.map(u => \`<li>\${u}</li>\`).join('');
    });

    // Typing
    socket.on('typing', ({ username: typingUser, isTyping }) => {
      const el = document.getElementById('typing');
      el.textContent = isTyping ? \`\${typingUser} está digitando...\` : '';
    });
  </script>
</body>
</html>`,
    "README.md": `# Chat em Tempo Real

Chat com WebSocket usando Socket.IO.

## Funcionalidades

- Salas de chat
- Lista de usuários online
- Indicador de "digitando"
- Mensagens em tempo real
- Design responsivo

## Instalação

\`\`\`bash
npm install
npm start
\`\`\`

Acesse http://localhost:3000

## Como funciona

1. Entre com seu nome
2. Escolha uma sala (ou use "geral")
3. Converse em tempo real!

## Eventos Socket.IO

| Evento | Descrição |
|--------|-----------|
| join | Entrar em sala |
| message | Enviar mensagem |
| typing | Indicador digitando |
| users | Lista de usuários |
`
  }
};

export default realtimeChatTemplate;
