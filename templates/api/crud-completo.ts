// Template: CRUD Completo
// Categoria: api
// Palavras-chave: crud, banco, dados, sql, postgres, mysql

export const crudCompletoTemplate = {
  id: "crud-completo",
  name: "CRUD Completo",
  category: "api",
  description: "API CRUD completa com Express, PostgreSQL/SQLite e validação",
  keywords: [
    "crud", "banco", "dados", "sql", "postgres", "mysql", "sqlite",
    "database", "tabela", "inserir", "atualizar", "deletar", "listar"
  ],
  files: {
    "package.json": `{
  "name": "crud-api",
  "version": "1.0.0",
  "description": "API CRUD com banco de dados",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.2.2",
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
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// ===== ROTAS CRUD =====

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'connected', timestamp: new Date() });
});

// Listar todos os produtos
app.get('/api/produtos', (req, res) => {
  try {
    const { search, categoria, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM produtos WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ' AND (nome LIKE ? OR descricao LIKE ?)';
      params.push(\`%\${search}%\`, \`%\${search}%\`);
    }
    
    if (categoria) {
      query += ' AND categoria = ?';
      params.push(categoria);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));
    
    const produtos = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM produtos').get().count;
    
    res.json({
      data: produtos,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    console.error('Erro ao listar:', error);
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

// Buscar produto por ID
app.get('/api/produtos/:id', (req, res) => {
  try {
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
    
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    res.json(produto);
  } catch (error) {
    console.error('Erro ao buscar:', error);
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// Criar produto
app.post('/api/produtos', (req, res) => {
  try {
    const { nome, descricao, preco, quantidade, categoria } = req.body;
    
    // Validação
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    if (preco !== undefined && (isNaN(preco) || preco < 0)) {
      return res.status(400).json({ error: 'Preço deve ser um número positivo' });
    }
    
    const result = db.prepare(\`
      INSERT INTO produtos (nome, descricao, preco, quantidade, categoria)
      VALUES (?, ?, ?, ?, ?)
    \`).run(
      nome.trim(),
      descricao || '',
      preco || 0,
      quantidade || 0,
      categoria || 'geral'
    );
    
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(result.lastInsertRowid);
    
    res.status(201).json({
      message: 'Produto criado com sucesso',
      data: produto
    });
  } catch (error) {
    console.error('Erro ao criar:', error);
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// Atualizar produto
app.put('/api/produtos/:id', (req, res) => {
  try {
    const { nome, descricao, preco, quantidade, categoria } = req.body;
    
    // Verificar se existe
    const existing = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    // Validação
    if (nome !== undefined && nome.trim() === '') {
      return res.status(400).json({ error: 'Nome não pode ser vazio' });
    }
    
    if (preco !== undefined && (isNaN(preco) || preco < 0)) {
      return res.status(400).json({ error: 'Preço deve ser um número positivo' });
    }
    
    db.prepare(\`
      UPDATE produtos SET
        nome = COALESCE(?, nome),
        descricao = COALESCE(?, descricao),
        preco = COALESCE(?, preco),
        quantidade = COALESCE(?, quantidade),
        categoria = COALESCE(?, categoria),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    \`).run(
      nome?.trim(),
      descricao,
      preco,
      quantidade,
      categoria,
      req.params.id
    );
    
    const produto = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
    
    res.json({
      message: 'Produto atualizado com sucesso',
      data: produto
    });
  } catch (error) {
    console.error('Erro ao atualizar:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// Deletar produto
app.delete('/api/produtos/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM produtos WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
    
    res.json({
      message: 'Produto deletado com sucesso',
      data: existing
    });
  } catch (error) {
    console.error('Erro ao deletar:', error);
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

// Estatísticas
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.prepare(\`
      SELECT 
        COUNT(*) as total,
        SUM(quantidade) as total_estoque,
        AVG(preco) as preco_medio,
        MAX(preco) as preco_max,
        MIN(preco) as preco_min
      FROM produtos
    \`).get();
    
    const categorias = db.prepare(\`
      SELECT categoria, COUNT(*) as count
      FROM produtos
      GROUP BY categoria
    \`).all();
    
    res.json({
      produtos: stats,
      categorias
    });
  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Erro 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(\`📦 API CRUD rodando em http://localhost:\${PORT}\`);
  console.log(\`\\nEndpoints:\`);
  console.log(\`  GET    /api/produtos       - Listar todos\`);
  console.log(\`  GET    /api/produtos/:id   - Buscar por ID\`);
  console.log(\`  POST   /api/produtos       - Criar\`);
  console.log(\`  PUT    /api/produtos/:id   - Atualizar\`);
  console.log(\`  DELETE /api/produtos/:id   - Deletar\`);
  console.log(\`  GET    /api/stats          - Estatísticas\`);
});`,
    "src/database.js": `const Database = require('better-sqlite3');
const path = require('path');

// Criar banco de dados
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

// Criar tabela de produtos
db.exec(\`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    preco REAL DEFAULT 0,
    quantidade INTEGER DEFAULT 0,
    categoria TEXT DEFAULT 'geral',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
\`);

// Inserir dados de exemplo se tabela estiver vazia
const count = db.prepare('SELECT COUNT(*) as count FROM produtos').get().count;
if (count === 0) {
  const insert = db.prepare(\`
    INSERT INTO produtos (nome, descricao, preco, quantidade, categoria)
    VALUES (?, ?, ?, ?, ?)
  \`);
  
  const produtos = [
    ['Notebook Dell', 'Notebook Dell Inspiron 15', 3500, 10, 'eletronicos'],
    ['Mouse Logitech', 'Mouse sem fio Logitech MX', 250, 50, 'eletronicos'],
    ['Teclado Mecânico', 'Teclado mecânico RGB', 450, 30, 'eletronicos'],
    ['Cadeira Gamer', 'Cadeira ergonômica gamer', 1200, 15, 'moveis'],
    ['Monitor 27"', 'Monitor Full HD 27 polegadas', 1500, 20, 'eletronicos']
  ];
  
  for (const p of produtos) {
    insert.run(...p);
  }
  
  console.log('✅ Dados de exemplo inseridos');
}

module.exports = db;`,
    ".env.example": `PORT=3000
DATABASE_PATH=./data.db`,
    "README.md": `# API CRUD Completa

API RESTful com CRUD completo e SQLite.

## Funcionalidades

- CRUD completo de produtos
- Paginação e busca
- Filtro por categoria
- Estatísticas
- Banco SQLite (zero config)

## Instalação

\`\`\`bash
npm install
npm run dev
\`\`\`

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/produtos | Listar todos |
| GET | /api/produtos/:id | Buscar por ID |
| POST | /api/produtos | Criar |
| PUT | /api/produtos/:id | Atualizar |
| DELETE | /api/produtos/:id | Deletar |
| GET | /api/stats | Estatísticas |

## Query Parameters

- \`search\`: Buscar por nome/descrição
- \`categoria\`: Filtrar por categoria
- \`limit\`: Limite de resultados
- \`offset\`: Paginação

## Exemplo

\`\`\`bash
# Listar
curl http://localhost:3000/api/produtos

# Criar
curl -X POST http://localhost:3000/api/produtos \\
  -H "Content-Type: application/json" \\
  -d '{"nome": "Produto", "preco": 99.90, "quantidade": 10}'

# Atualizar
curl -X PUT http://localhost:3000/api/produtos/1 \\
  -H "Content-Type: application/json" \\
  -d '{"preco": 89.90}'

# Deletar
curl -X DELETE http://localhost:3000/api/produtos/1
\`\`\`

## Trocar para PostgreSQL

Substitua better-sqlite3 por pg e ajuste as queries.
`
  }
};

export default crudCompletoTemplate;
