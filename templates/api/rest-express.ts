// Template: API REST com Express
// Categoria: api
// Palavras-chave: api, rest, express, backend, servidor, rotas

export const restExpressTemplate = {
  id: "rest-express",
  name: "API REST Express",
  category: "api",
  description: "API REST completa com Express, validação, middlewares e documentação",
  keywords: [
    "api", "rest", "express", "backend", "servidor", "rotas", "http",
    "get", "post", "put", "delete", "crud", "json", "endpoint"
  ],
  files: {
    "package.json": `{
  "name": "api-rest-express",
  "version": "1.0.0",
  "description": "API REST com Express",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "express-validator": "^7.0.1",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`,
    "src/index.js": `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Banco de dados em memória (substitua por DB real)
let items = [
  { id: 1, name: 'Item 1', description: 'Primeiro item', createdAt: new Date() },
  { id: 2, name: 'Item 2', description: 'Segundo item', createdAt: new Date() }
];
let nextId = 3;

// ===== ROTAS =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Listar todos
app.get('/api/items', (req, res) => {
  const { search, limit = 10, page = 1 } = req.query;
  
  let result = items;
  
  // Filtro de busca
  if (search) {
    result = result.filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  // Paginação
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedItems = result.slice(startIndex, endIndex);
  
  res.json({
    data: paginatedItems,
    pagination: {
      total: result.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(result.length / limit)
    }
  });
});

// Buscar por ID
app.get('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === Number(req.params.id));
  
  if (!item) {
    return res.status(404).json({ error: 'Item não encontrado' });
  }
  
  res.json(item);
});

// Criar novo
app.post('/api/items', (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }
  
  const newItem = {
    id: nextId++,
    name,
    description: description || '',
    createdAt: new Date()
  };
  
  items.push(newItem);
  res.status(201).json(newItem);
});

// Atualizar
app.put('/api/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === Number(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Item não encontrado' });
  }
  
  const { name, description } = req.body;
  
  items[index] = {
    ...items[index],
    name: name || items[index].name,
    description: description !== undefined ? description : items[index].description,
    updatedAt: new Date()
  };
  
  res.json(items[index]);
});

// Deletar
app.delete('/api/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === Number(req.params.id));
  
  if (index === -1) {
    return res.status(404).json({ error: 'Item não encontrado' });
  }
  
  const deleted = items.splice(index, 1)[0];
  res.json({ message: 'Item deletado', item: deleted });
});

// Erro 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Erro global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(\`🚀 API rodando em http://localhost:\${PORT}\`);
  console.log(\`📚 Endpoints disponíveis:\`);
  console.log(\`   GET    /api/health\`);
  console.log(\`   GET    /api/items\`);
  console.log(\`   GET    /api/items/:id\`);
  console.log(\`   POST   /api/items\`);
  console.log(\`   PUT    /api/items/:id\`);
  console.log(\`   DELETE /api/items/:id\`);
});`,
    ".env.example": `PORT=3000`,
    "README.md": `# API REST com Express

API RESTful completa com Express.js.

## Funcionalidades

- ✅ CRUD completo
- ✅ Validação de dados
- ✅ Paginação
- ✅ Busca por nome
- ✅ Middlewares de segurança
- ✅ Tratamento de erros

## Instalação

\`\`\`bash
npm install
npm run dev
\`\`\`

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/health | Health check |
| GET | /api/items | Listar todos |
| GET | /api/items/:id | Buscar por ID |
| POST | /api/items | Criar novo |
| PUT | /api/items/:id | Atualizar |
| DELETE | /api/items/:id | Deletar |

## Query Parameters

- \`search\`: Filtrar por nome
- \`limit\`: Itens por página (padrão: 10)
- \`page\`: Número da página (padrão: 1)

## Exemplo de Uso

\`\`\`bash
# Listar todos
curl http://localhost:3000/api/items

# Criar item
curl -X POST http://localhost:3000/api/items \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Novo Item", "description": "Descrição"}'

# Buscar por ID
curl http://localhost:3000/api/items/1

# Atualizar
curl -X PUT http://localhost:3000/api/items/1 \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Item Atualizado"}'

# Deletar
curl -X DELETE http://localhost:3000/api/items/1
\`\`\`
`
  }
};

export default restExpressTemplate;
