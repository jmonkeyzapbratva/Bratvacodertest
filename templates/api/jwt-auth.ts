// Template: Autenticação JWT
// Categoria: api
// Palavras-chave: jwt, auth, login, autenticação, token, usuário

export const jwtAuthTemplate = {
  id: "jwt-auth",
  name: "Login JWT",
  category: "api",
  description: "Sistema de autenticação completo com JWT, registro, login e refresh token",
  keywords: [
    "jwt", "auth", "login", "autenticação", "token", "usuário", "registro",
    "cadastro", "senha", "segurança", "bearer", "refresh", "session"
  ],
  files: {
    "package.json": `{
  "name": "jwt-auth-api",
  "version": "1.0.0",
  "description": "API de Autenticação com JWT",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`,
    "src/index.js": `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui';
const JWT_EXPIRES_IN = '1h';
const REFRESH_EXPIRES_IN = '7d';

// Middlewares
app.use(cors());
app.use(express.json());

// "Banco de dados" em memória (substitua por DB real)
const users = [];
const refreshTokens = new Set();

// ===== FUNÇÕES AUXILIARES =====
function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
  
  refreshTokens.add(refreshToken);
  
  return { accessToken, refreshToken };
}

// Middleware de autenticação
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
    req.user = user;
    next();
  });
}

// ===== ROTAS =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Registro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validação
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    }
    
    // Verificar se email já existe
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar usuário
    const user = {
      id: users.length + 1,
      name,
      email,
      password: hashedPassword,
      createdAt: new Date()
    };
    
    users.push(user);
    
    // Gerar tokens
    const tokens = generateTokens(user);
    
    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: { id: user.id, name: user.name, email: user.email },
      ...tokens
    });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validação
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    
    // Buscar usuário
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    // Gerar tokens
    const tokens = generateTokens(user);
    
    res.json({
      message: 'Login realizado com sucesso',
      user: { id: user.id, name: user.name, email: user.email },
      ...tokens
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Refresh token
app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token é obrigatório' });
  }
  
  if (!refreshTokens.has(refreshToken)) {
    return res.status(403).json({ error: 'Refresh token inválido' });
  }
  
  jwt.verify(refreshToken, JWT_SECRET, (err, decoded) => {
    if (err) {
      refreshTokens.delete(refreshToken);
      return res.status(403).json({ error: 'Refresh token expirado' });
    }
    
    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(403).json({ error: 'Usuário não encontrado' });
    }
    
    // Revogar token antigo e gerar novo
    refreshTokens.delete(refreshToken);
    const tokens = generateTokens(user);
    
    res.json(tokens);
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  const { refreshToken } = req.body;
  
  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }
  
  res.json({ message: 'Logout realizado com sucesso' });
});

// Rota protegida - Perfil do usuário
app.get('/api/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
  });
});

// Atualizar perfil
app.put('/api/me', authenticateToken, async (req, res) => {
  const { name, password } = req.body;
  
  const userIndex = users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  
  if (name) {
    users[userIndex].name = name;
  }
  
  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
    }
    users[userIndex].password = await bcrypt.hash(password, 10);
  }
  
  const user = users[userIndex];
  res.json({
    id: user.id,
    name: user.name,
    email: user.email
  });
});

// Erro 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(\`🔐 API de Autenticação rodando em http://localhost:\${PORT}\`);
  console.log(\`\\nEndpoints disponíveis:\`);
  console.log(\`  POST /api/auth/register - Criar conta\`);
  console.log(\`  POST /api/auth/login - Fazer login\`);
  console.log(\`  POST /api/auth/refresh - Renovar token\`);
  console.log(\`  POST /api/auth/logout - Fazer logout\`);
  console.log(\`  GET  /api/me - Perfil (protegido)\`);
  console.log(\`  PUT  /api/me - Atualizar perfil (protegido)\`);
});`,
    ".env.example": `PORT=3000
JWT_SECRET=sua-chave-super-secreta-aqui`,
    "README.md": `# API de Autenticação JWT

Sistema completo de autenticação com JWT.

## Funcionalidades

- Registro de usuários
- Login com email/senha
- Token JWT com expiração
- Refresh token
- Rotas protegidas
- Atualização de perfil

## Instalação

\`\`\`bash
npm install
cp .env.example .env
npm run dev
\`\`\`

## Endpoints

### Públicos

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/auth/register | Criar conta |
| POST | /api/auth/login | Fazer login |
| POST | /api/auth/refresh | Renovar token |
| POST | /api/auth/logout | Fazer logout |

### Protegidos (requer Bearer token)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/me | Ver perfil |
| PUT | /api/me | Atualizar perfil |

## Exemplo de Uso

\`\`\`bash
# Registrar
curl -X POST http://localhost:3000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"name": "João", "email": "joao@email.com", "password": "123456"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "joao@email.com", "password": "123456"}'

# Acessar rota protegida
curl http://localhost:3000/api/me \\
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
\`\`\`

## Segurança

- Senhas hasheadas com bcrypt
- Tokens JWT com expiração
- Refresh tokens para renovação
- Validação de dados
`
  }
};

export default jwtAuthTemplate;
