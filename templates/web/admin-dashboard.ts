// Template: Dashboard Admin
// Categoria: web
// Palavras-chave: dashboard, admin, painel, administrativo, gestão

export const adminDashboardTemplate = {
  id: "admin-dashboard",
  name: "Dashboard Admin",
  category: "web",
  description: "Painel administrativo com gráficos, tabelas e gestão de dados",
  keywords: [
    "dashboard", "admin", "painel", "administrativo", "gestão", "controle",
    "gráficos", "relatórios", "analytics", "métricas", "tabela", "gerenciamento"
  ],
  files: {
    "package.json": `{
  "name": "admin-dashboard",
  "version": "1.0.0",
  "description": "Dashboard Administrativo",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`,
    "server.js": `const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API mock para o dashboard
const mockData = {
  users: 1234,
  revenue: 45678.90,
  orders: 567,
  products: 89
};

app.get('/api/stats', (req, res) => {
  res.json(mockData);
});

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'João Silva', email: 'joao@email.com', role: 'Admin', status: 'Ativo' },
    { id: 2, name: 'Maria Santos', email: 'maria@email.com', role: 'Editor', status: 'Ativo' },
    { id: 3, name: 'Pedro Costa', email: 'pedro@email.com', role: 'Usuário', status: 'Inativo' },
    { id: 4, name: 'Ana Lima', email: 'ana@email.com', role: 'Editor', status: 'Ativo' },
  ]);
});

app.get('/api/chart-data', (req, res) => {
  res.json({
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    revenue: [4500, 5200, 4800, 6100, 5800, 7200],
    users: [120, 150, 180, 220, 280, 350]
  });
});

app.listen(PORT, () => {
  console.log(\`Dashboard rodando em http://localhost:\${PORT}\`);
});`,
    "public/index.html": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Admin</title>
  <link rel="stylesheet" href="styles.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <div class="layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo">
        <h2>Admin</h2>
      </div>
      <nav class="nav-menu">
        <a href="#" class="nav-item active">
          <span class="icon">📊</span>
          Dashboard
        </a>
        <a href="#" class="nav-item">
          <span class="icon">👥</span>
          Usuários
        </a>
        <a href="#" class="nav-item">
          <span class="icon">📦</span>
          Produtos
        </a>
        <a href="#" class="nav-item">
          <span class="icon">🛒</span>
          Pedidos
        </a>
        <a href="#" class="nav-item">
          <span class="icon">📈</span>
          Relatórios
        </a>
        <a href="#" class="nav-item">
          <span class="icon">⚙️</span>
          Configurações
        </a>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="main">
      <!-- Header -->
      <header class="header">
        <div class="search">
          <input type="text" placeholder="Buscar...">
        </div>
        <div class="user-info">
          <span>Admin</span>
          <div class="avatar">A</div>
        </div>
      </header>

      <!-- Content -->
      <div class="content">
        <h1>Dashboard</h1>

        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon blue">👥</div>
            <div class="stat-info">
              <span class="stat-value" id="stat-users">-</span>
              <span class="stat-label">Usuários</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green">💰</div>
            <div class="stat-info">
              <span class="stat-value" id="stat-revenue">-</span>
              <span class="stat-label">Receita</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange">🛒</div>
            <div class="stat-info">
              <span class="stat-value" id="stat-orders">-</span>
              <span class="stat-label">Pedidos</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon purple">📦</div>
            <div class="stat-info">
              <span class="stat-value" id="stat-products">-</span>
              <span class="stat-label">Produtos</span>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div class="charts-grid">
          <div class="chart-card">
            <h3>Receita Mensal</h3>
            <canvas id="revenueChart"></canvas>
          </div>
          <div class="chart-card">
            <h3>Novos Usuários</h3>
            <canvas id="usersChart"></canvas>
          </div>
        </div>

        <!-- Users Table -->
        <div class="table-card">
          <div class="table-header">
            <h3>Usuários Recentes</h3>
            <button class="btn btn-primary">Adicionar</button>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Função</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="users-table">
              <tr>
                <td colspan="5">Carregando...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>

  <script src="app.js"></script>
</body>
</html>`,
    "public/styles.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary: #6366f1;
  --bg: #f8fafc;
  --sidebar-bg: #1e293b;
  --card-bg: #ffffff;
  --text: #1e293b;
  --text-light: #64748b;
  --border: #e2e8f0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
}

.layout {
  display: flex;
  min-height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 250px;
  background: var(--sidebar-bg);
  color: white;
  padding: 20px;
}

.logo h2 {
  padding: 10px 0 30px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 20px;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.3s;
}

.nav-item:hover,
.nav-item.active {
  background: rgba(255,255,255,0.1);
  color: white;
}

.nav-item .icon {
  font-size: 1.2rem;
}

/* Main */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
}

.search input {
  padding: 10px 15px;
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 300px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 40px;
  height: 40px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.content {
  padding: 30px;
  overflow-y: auto;
}

.content h1 {
  margin-bottom: 25px;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: var(--card-bg);
  padding: 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.stat-icon.blue { background: #dbeafe; }
.stat-icon.green { background: #dcfce7; }
.stat-icon.orange { background: #fed7aa; }
.stat-icon.purple { background: #e9d5ff; }

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  display: block;
}

.stat-label {
  color: var(--text-light);
  font-size: 0.9rem;
}

/* Charts */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart-card {
  background: var(--card-bg);
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.chart-card h3 {
  margin-bottom: 15px;
}

/* Table */
.table-card {
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 15px 20px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.data-table th {
  background: var(--bg);
  font-weight: 600;
  color: var(--text-light);
}

.data-table tbody tr:hover {
  background: var(--bg);
}

.status {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.85rem;
}

.status.active {
  background: #dcfce7;
  color: #166534;
}

.status.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.action-btn {
  padding: 5px 10px;
  border: 1px solid var(--border);
  background: white;
  border-radius: 5px;
  cursor: pointer;
  margin-right: 5px;
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
}`,
    "public/app.js": `// Carregar dados
async function loadData() {
  // Estatísticas
  const stats = await fetch('/api/stats').then(r => r.json());
  document.getElementById('stat-users').textContent = stats.users.toLocaleString();
  document.getElementById('stat-revenue').textContent = 'R$ ' + stats.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  document.getElementById('stat-orders').textContent = stats.orders.toLocaleString();
  document.getElementById('stat-products').textContent = stats.products.toLocaleString();

  // Usuários
  const users = await fetch('/api/users').then(r => r.json());
  const tbody = document.getElementById('users-table');
  tbody.innerHTML = users.map(user => \`
    <tr>
      <td>\${user.name}</td>
      <td>\${user.email}</td>
      <td>\${user.role}</td>
      <td><span class="status \${user.status === 'Ativo' ? 'active' : 'inactive'}">\${user.status}</span></td>
      <td>
        <button class="action-btn">Editar</button>
        <button class="action-btn">Excluir</button>
      </td>
    </tr>
  \`).join('');

  // Gráficos
  const chartData = await fetch('/api/chart-data').then(r => r.json());
  
  new Chart(document.getElementById('revenueChart'), {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Receita (R$)',
        data: chartData.revenue,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });

  new Chart(document.getElementById('usersChart'), {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Novos Usuários',
        data: chartData.users,
        backgroundColor: '#22c55e'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

loadData();`,
    "README.md": `# Dashboard Administrativo

Painel admin moderno com gráficos e tabelas.

## Funcionalidades

- Cards de estatísticas
- Gráficos de linha e barra (Chart.js)
- Tabela de dados
- Sidebar de navegação
- Design responsivo

## Instalação

\`\`\`bash
npm install
npm start
\`\`\`

Acesse http://localhost:3000

## Tecnologias

- Express.js (servidor)
- Chart.js (gráficos)
- HTML/CSS/JS vanilla

## Personalização

1. Edite \`public/index.html\` para layout
2. Modifique \`public/styles.css\` para estilos
3. Ajuste \`server.js\` para dados reais
`
  }
};

export default adminDashboardTemplate;
