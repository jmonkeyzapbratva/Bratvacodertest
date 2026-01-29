import { codeTemplates } from "@shared/schema";
import { detectTemplate as detectNewTemplate, getTemplateById, templates, Template } from "../templates";

interface GenerationResult {
  explanation: string;
  code: string;
}

interface PoeResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const POE_API_URL = "https://api.poe.com/v1/chat/completions";

const POE_TIMEOUT_MS = 30000; // 30 segundos de timeout

async function callPoeAPI(prompt: string): Promise<string | null> {
  const apiKey = process.env.POE_API_KEY;
  
  if (!apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), POE_TIMEOUT_MS);

  try {
    const systemPrompt = `Você é um assistente de programação especializado em gerar código de alta qualidade. 
Você SEMPRE responde em português brasileiro.
Gere código limpo, bem comentado e funcional.
Inclua instruções de instalação e uso quando apropriado.
O código deve ser pronto para produção.

Formato da resposta:
1. Primeiro, uma breve explicação do que o código faz (2-3 frases)
2. Depois, o código completo
3. Se necessário, inclua package.json ou requirements.txt como comentário no final`;

    const response = await fetch(POE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "Claude-Sonnet-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("[POE] Erro na API:", response.status);
      return null;
    }

    const data = await response.json() as PoeResponse;
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      console.error("[POE] Timeout na requisição");
    } else {
      console.error("[POE] Erro ao chamar API:", error instanceof Error ? error.message : "Erro desconhecido");
    }
    return null;
  }
}

function parseAIResponse(response: string): { explanation: string; code: string } {
  const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
  
  if (codeBlockMatch) {
    const code = codeBlockMatch[1].trim();
    const explanation = response.split("```")[0].trim();
    return { explanation, code };
  }
  
  const lines = response.split("\n");
  let explanationLines: string[] = [];
  let codeLines: string[] = [];
  let inCode = false;
  
  for (const line of lines) {
    if (line.startsWith("//") || line.startsWith("#") || line.startsWith("/*") || 
        line.includes("const ") || line.includes("function ") || line.includes("import ") ||
        line.includes("class ") || line.includes("def ") || line.includes("<?php")) {
      inCode = true;
    }
    
    if (inCode) {
      codeLines.push(line);
    } else {
      explanationLines.push(line);
    }
  }
  
  return {
    explanation: explanationLines.join("\n").trim() || "Código gerado com sucesso!",
    code: codeLines.join("\n").trim() || response,
  };
}

const templateCode: Record<string, string> = {
  "whatsapp-bot": `// Bot WhatsApp usando Baileys
// Instalação: npm install @whiskeysockets/baileys qrcode-terminal

const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('Escaneie o QR Code abaixo:');
      qrcode.generate(qr, { small: true });
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('Bot conectado com sucesso!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.key.fromMe && msg.message) {
      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const de = msg.key.remoteJid;
      
      console.log(\`Mensagem de \${de}: \${texto}\`);
      
      // Comandos do bot
      if (texto.toLowerCase() === '!ola' || texto.toLowerCase() === 'oi') {
        await sock.sendMessage(de, { text: 'Olá! Eu sou um bot criado com BRATVACODER!' });
      }
      
      if (texto.toLowerCase() === '!ajuda') {
        await sock.sendMessage(de, { 
          text: '*Comandos disponíveis:*\\n\\n!ola - Saudação\\n!ajuda - Esta mensagem\\n!hora - Hora atual'
        });
      }
      
      if (texto.toLowerCase() === '!hora') {
        const hora = new Date().toLocaleString('pt-BR');
        await sock.sendMessage(de, { text: \`Agora são: \${hora}\` });
      }
    }
  });
}

startBot().catch(console.error);

// package.json
/*
{
  "name": "whatsapp-bot",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@whiskeysockets/baileys": "^6.6.0",
    "qrcode-terminal": "^0.12.0"
  }
}
*/`,

  "rest-api": `// API REST com Express.js
// Instalação: npm install express cors helmet

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Banco de dados em memória (substitua por MongoDB/PostgreSQL em produção)
let items = [
  { id: 1, nome: 'Item 1', descricao: 'Descrição do item 1', preco: 29.90 },
  { id: 2, nome: 'Item 2', descricao: 'Descrição do item 2', preco: 49.90 },
];

let nextId = 3;

// Rotas

// GET - Listar todos
app.get('/api/items', (req, res) => {
  res.json({
    success: true,
    data: items,
    total: items.length
  });
});

// GET - Buscar por ID
app.get('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === parseInt(req.params.id));
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item não encontrado' });
  }
  res.json({ success: true, data: item });
});

// POST - Criar novo
app.post('/api/items', (req, res) => {
  const { nome, descricao, preco } = req.body;
  
  if (!nome) {
    return res.status(400).json({ success: false, message: 'Nome é obrigatório' });
  }
  
  const newItem = {
    id: nextId++,
    nome,
    descricao: descricao || '',
    preco: preco || 0
  };
  
  items.push(newItem);
  res.status(201).json({ success: true, data: newItem });
});

// PUT - Atualizar
app.put('/api/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Item não encontrado' });
  }
  
  items[index] = { ...items[index], ...req.body, id: items[index].id };
  res.json({ success: true, data: items[index] });
});

// DELETE - Remover
app.delete('/api/items/:id', (req, res) => {
  const index = items.findIndex(i => i.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Item não encontrado' });
  }
  
  items.splice(index, 1);
  res.json({ success: true, message: 'Item removido com sucesso' });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(\`API rodando em http://localhost:\${PORT}\`);
});

// package.json
/*
{
  "name": "api-rest",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "helmet": "^7.1.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
*/`,

  "landing-page": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Minha Landing Page</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
    }
    
    /* Header */
    header {
      background: #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      position: fixed;
      width: 100%;
      top: 0;
      z-index: 100;
    }
    
    nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 0;
    }
    
    .logo {
      font-size: 1.5rem;
      font-weight: bold;
      color: #7c3aed;
    }
    
    .nav-links a {
      margin-left: 30px;
      text-decoration: none;
      color: #555;
      transition: color 0.3s;
    }
    
    .nav-links a:hover {
      color: #7c3aed;
    }
    
    /* Hero */
    .hero {
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      color: white;
      padding: 150px 0 100px;
      text-align: center;
    }
    
    .hero h1 {
      font-size: 3rem;
      margin-bottom: 20px;
    }
    
    .hero p {
      font-size: 1.2rem;
      opacity: 0.9;
      max-width: 600px;
      margin: 0 auto 30px;
    }
    
    .btn {
      display: inline-block;
      padding: 15px 40px;
      background: white;
      color: #7c3aed;
      text-decoration: none;
      border-radius: 30px;
      font-weight: bold;
      transition: transform 0.3s;
    }
    
    .btn:hover {
      transform: translateY(-3px);
    }
    
    /* Features */
    .features {
      padding: 80px 0;
      background: #f8f9fa;
    }
    
    .features h2 {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 50px;
    }
    
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
    }
    
    .feature-card {
      background: white;
      padding: 40px;
      border-radius: 15px;
      text-align: center;
      box-shadow: 0 5px 20px rgba(0,0,0,0.05);
    }
    
    .feature-card h3 {
      margin: 20px 0 15px;
      color: #7c3aed;
    }
    
    /* CTA */
    .cta {
      background: #7c3aed;
      color: white;
      text-align: center;
      padding: 80px 0;
    }
    
    .cta h2 {
      font-size: 2rem;
      margin-bottom: 20px;
    }
    
    /* Footer */
    footer {
      background: #1a1a2e;
      color: white;
      text-align: center;
      padding: 40px 0;
    }
    
    @media (max-width: 768px) {
      .hero h1 {
        font-size: 2rem;
      }
      
      .nav-links {
        display: none;
      }
    }
  </style>
</head>
<body>
  <header>
    <nav class="container">
      <div class="logo">MinhaMarca</div>
      <div class="nav-links">
        <a href="#features">Recursos</a>
        <a href="#sobre">Sobre</a>
        <a href="#contato">Contato</a>
      </div>
    </nav>
  </header>

  <section class="hero">
    <div class="container">
      <h1>Transforme suas ideias em realidade</h1>
      <p>Uma solução completa para impulsionar seu negócio e alcançar novos patamares de sucesso.</p>
      <a href="#contato" class="btn">Começar Agora</a>
    </div>
  </section>

  <section class="features" id="features">
    <div class="container">
      <h2>Nossos Recursos</h2>
      <div class="features-grid">
        <div class="feature-card">
          <h3>Fácil de Usar</h3>
          <p>Interface intuitiva que qualquer pessoa pode dominar em minutos.</p>
        </div>
        <div class="feature-card">
          <h3>Rápido e Seguro</h3>
          <p>Performance otimizada com segurança de nível empresarial.</p>
        </div>
        <div class="feature-card">
          <h3>Suporte 24/7</h3>
          <p>Equipe dedicada pronta para ajudar a qualquer momento.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="cta">
    <div class="container">
      <h2>Pronto para começar?</h2>
      <p>Junte-se a milhares de clientes satisfeitos.</p>
      <a href="#contato" class="btn">Fale Conosco</a>
    </div>
  </section>

  <footer>
    <div class="container">
      <p>Criado com BRATVACODER</p>
    </div>
  </footer>
</body>
</html>`,

  "python-automation": `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Automação Python
Criado com BRATVACODER

Exemplos de automação:
- Envio de emails
- Web scraping
- Manipulação de arquivos
- Agendamento de tarefas
"""

import os
import sys
import time
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from pathlib import Path

# ============================================
# CONFIGURAÇÕES
# ============================================

EMAIL_CONFIG = {
    'smtp_server': 'smtp.gmail.com',
    'smtp_port': 587,
    'email': 'seu_email@gmail.com',
    'password': 'sua_senha_app'  # Use senha de app do Gmail
}

# ============================================
# FUNÇÕES DE AUTOMAÇÃO
# ============================================

def enviar_email(destinatario: str, assunto: str, mensagem: str) -> bool:
    """Envia um email usando SMTP."""
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_CONFIG['email']
        msg['To'] = destinatario
        msg['Subject'] = assunto
        msg.attach(MIMEText(mensagem, 'plain', 'utf-8'))
        
        with smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port']) as server:
            server.starttls()
            server.login(EMAIL_CONFIG['email'], EMAIL_CONFIG['password'])
            server.send_message(msg)
        
        print(f"Email enviado para {destinatario}")
        return True
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        return False


def fazer_web_scraping(url: str) -> dict:
    """Faz web scraping básico de uma página."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        return {
            'status': response.status_code,
            'tamanho': len(response.text),
            'titulo': extrair_titulo(response.text)
        }
    except Exception as e:
        print(f"Erro no scraping: {e}")
        return {}


def extrair_titulo(html: str) -> str:
    """Extrai o título de uma página HTML."""
    import re
    match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE)
    return match.group(1) if match else 'Sem título'


def organizar_arquivos(diretorio: str, extensoes: dict) -> int:
    """Organiza arquivos em pastas por tipo."""
    diretorio = Path(diretorio)
    if not diretorio.exists():
        print(f"Diretório não encontrado: {diretorio}")
        return 0
    
    arquivos_movidos = 0
    
    for arquivo in diretorio.iterdir():
        if arquivo.is_file():
            extensao = arquivo.suffix.lower()
            
            for pasta, exts in extensoes.items():
                if extensao in exts:
                    pasta_destino = diretorio / pasta
                    pasta_destino.mkdir(exist_ok=True)
                    arquivo.rename(pasta_destino / arquivo.name)
                    arquivos_movidos += 1
                    print(f"Movido: {arquivo.name} -> {pasta}")
                    break
    
    return arquivos_movidos


def backup_arquivos(origem: str, destino: str) -> bool:
    """Cria backup de arquivos."""
    import shutil
    
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        nome_backup = f"backup_{timestamp}"
        caminho_destino = Path(destino) / nome_backup
        
        shutil.copytree(origem, caminho_destino)
        print(f"Backup criado em: {caminho_destino}")
        return True
    except Exception as e:
        print(f"Erro ao criar backup: {e}")
        return False


def log(mensagem: str, nivel: str = 'INFO'):
    """Registra log com timestamp."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] [{nivel}] {mensagem}")


# ============================================
# EXEMPLO DE USO
# ============================================

if __name__ == '__main__':
    log("Iniciando script de automação...")
    
    # Exemplo 1: Web Scraping
    log("Fazendo web scraping...")
    resultado = fazer_web_scraping('https://example.com')
    print(f"Resultado: {resultado}")
    
    # Exemplo 2: Organizar arquivos
    extensoes_config = {
        'Imagens': ['.jpg', '.jpeg', '.png', '.gif'],
        'Documentos': ['.pdf', '.doc', '.docx', '.txt'],
        'Videos': ['.mp4', '.avi', '.mkv']
    }
    # organizar_arquivos('./downloads', extensoes_config)
    
    log("Script finalizado com sucesso!")

# requirements.txt
"""
requests>=2.28.0
"""`,

  "php-crud": `<?php
/**
 * Sistema CRUD em PHP com MySQL
 * Criado com BRATVACODER
 * 
 * Estrutura de arquivos:
 * - index.php (este arquivo)
 * - config.php (configuração do banco)
 * - database.sql (estrutura do banco)
 */

// ==========================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// ==========================================

$host = 'localhost';
$dbname = 'meu_sistema';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Erro de conexão: " . $e->getMessage());
}

// ==========================================
// FUNÇÕES CRUD
// ==========================================

function listarItens($pdo) {
    $stmt = $pdo->query("SELECT * FROM itens ORDER BY id DESC");
    return $stmt->fetchAll();
}

function buscarItem($pdo, $id) {
    $stmt = $pdo->prepare("SELECT * FROM itens WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch();
}

function criarItem($pdo, $nome, $descricao, $preco) {
    $stmt = $pdo->prepare("INSERT INTO itens (nome, descricao, preco, criado_em) VALUES (?, ?, ?, NOW())");
    return $stmt->execute([$nome, $descricao, $preco]);
}

function atualizarItem($pdo, $id, $nome, $descricao, $preco) {
    $stmt = $pdo->prepare("UPDATE itens SET nome = ?, descricao = ?, preco = ? WHERE id = ?");
    return $stmt->execute([$nome, $descricao, $preco, $id]);
}

function deletarItem($pdo, $id) {
    $stmt = $pdo->prepare("DELETE FROM itens WHERE id = ?");
    return $stmt->execute([$id]);
}

// ==========================================
// PROCESSAMENTO DO FORMULÁRIO
// ==========================================

$mensagem = '';
$acao = $_GET['acao'] ?? 'listar';
$id = $_GET['id'] ?? null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nome = trim($_POST['nome'] ?? '');
    $descricao = trim($_POST['descricao'] ?? '');
    $preco = floatval($_POST['preco'] ?? 0);
    
    if (empty($nome)) {
        $mensagem = '<div class="alerta erro">Nome é obrigatório!</div>';
    } else {
        if (isset($_POST['id']) && $_POST['id']) {
            atualizarItem($pdo, $_POST['id'], $nome, $descricao, $preco);
            $mensagem = '<div class="alerta sucesso">Item atualizado com sucesso!</div>';
        } else {
            criarItem($pdo, $nome, $descricao, $preco);
            $mensagem = '<div class="alerta sucesso">Item criado com sucesso!</div>';
        }
        $acao = 'listar';
    }
}

if ($acao === 'deletar' && $id) {
    deletarItem($pdo, $id);
    header('Location: ?');
    exit;
}

$itemEditar = null;
if ($acao === 'editar' && $id) {
    $itemEditar = buscarItem($pdo, $id);
}

$itens = listarItens($pdo);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema CRUD PHP</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; }
        h1 { color: #333; margin-bottom: 20px; }
        .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 500; }
        input, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .btn { padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; }
        .btn-primary { background: #7c3aed; color: white; }
        .btn-danger { background: #dc2626; color: white; }
        .btn-sm { padding: 5px 10px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f9f9f9; font-weight: 600; }
        .alerta { padding: 10px 15px; border-radius: 4px; margin-bottom: 15px; }
        .sucesso { background: #d1fae5; color: #065f46; }
        .erro { background: #fee2e2; color: #991b1b; }
        .acoes { display: flex; gap: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Sistema CRUD PHP</h1>
        
        <?php echo $mensagem; ?>
        
        <div class="card">
            <h2><?php echo $itemEditar ? 'Editar Item' : 'Novo Item'; ?></h2>
            <form method="POST">
                <?php if ($itemEditar): ?>
                    <input type="hidden" name="id" value="<?php echo $itemEditar['id']; ?>">
                <?php endif; ?>
                
                <div class="form-group">
                    <label>Nome</label>
                    <input type="text" name="nome" value="<?php echo htmlspecialchars($itemEditar['nome'] ?? ''); ?>" required>
                </div>
                
                <div class="form-group">
                    <label>Descrição</label>
                    <textarea name="descricao" rows="3"><?php echo htmlspecialchars($itemEditar['descricao'] ?? ''); ?></textarea>
                </div>
                
                <div class="form-group">
                    <label>Preço (R$)</label>
                    <input type="number" name="preco" step="0.01" value="<?php echo $itemEditar['preco'] ?? '0'; ?>">
                </div>
                
                <button type="submit" class="btn btn-primary">
                    <?php echo $itemEditar ? 'Atualizar' : 'Cadastrar'; ?>
                </button>
                <?php if ($itemEditar): ?>
                    <a href="?" class="btn">Cancelar</a>
                <?php endif; ?>
            </form>
        </div>
        
        <div class="card">
            <h2>Itens Cadastrados</h2>
            <?php if (empty($itens)): ?>
                <p>Nenhum item cadastrado.</p>
            <?php else: ?>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Descrição</th>
                            <th>Preço</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($itens as $item): ?>
                        <tr>
                            <td><?php echo $item['id']; ?></td>
                            <td><?php echo htmlspecialchars($item['nome']); ?></td>
                            <td><?php echo htmlspecialchars($item['descricao']); ?></td>
                            <td>R$ <?php echo number_format($item['preco'], 2, ',', '.'); ?></td>
                            <td class="acoes">
                                <a href="?acao=editar&id=<?php echo $item['id']; ?>" class="btn btn-primary btn-sm">Editar</a>
                                <a href="?acao=deletar&id=<?php echo $item['id']; ?>" class="btn btn-danger btn-sm" onclick="return confirm('Tem certeza?')">Excluir</a>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
        
        <p style="text-align: center; color: #666; margin-top: 20px;">
            Criado com BRATVACODER
        </p>
    </div>
</body>
</html>

<?php
/*
-- database.sql - Execute no MySQL para criar a tabela

CREATE DATABASE IF NOT EXISTS meu_sistema;
USE meu_sistema;

CREATE TABLE itens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) DEFAULT 0,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dados de exemplo
INSERT INTO itens (nome, descricao, preco) VALUES
('Produto 1', 'Descrição do produto 1', 29.90),
('Produto 2', 'Descrição do produto 2', 49.90);
*/
?>`,

  "html-css-portfolio": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meu Portfólio</title>
    <style>
        :root {
            --primary: #7c3aed;
            --primary-dark: #5b21b6;
            --dark: #1a1a2e;
            --gray: #64748b;
            --light: #f8fafc;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        
        /* Navegação */
        nav {
            position: fixed;
            top: 0;
            width: 100%;
            background: white;
            padding: 15px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 100;
        }
        
        nav .container {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        nav .logo {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--primary);
            text-decoration: none;
        }
        
        nav ul {
            display: flex;
            list-style: none;
            gap: 30px;
        }
        
        nav a {
            text-decoration: none;
            color: var(--gray);
            font-weight: 500;
            transition: color 0.3s;
        }
        
        nav a:hover {
            color: var(--primary);
        }
        
        /* Container */
        .container {
            max-width: 1100px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        /* Seções */
        section {
            padding: 100px 0;
        }
        
        .section-title {
            font-size: 2.5rem;
            text-align: center;
            margin-bottom: 50px;
            color: var(--dark);
        }
        
        /* Hero */
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            text-align: center;
        }
        
        .hero-content {
            width: 100%;
        }
        
        .hero h1 {
            font-size: 3.5rem;
            margin-bottom: 20px;
        }
        
        .hero .subtitle {
            font-size: 1.3rem;
            opacity: 0.9;
            margin-bottom: 30px;
        }
        
        .hero .avatar {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            background: white;
            margin: 0 auto 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            color: var(--primary);
        }
        
        /* Botões */
        .btn {
            display: inline-block;
            padding: 12px 30px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s;
        }
        
        .btn-primary {
            background: white;
            color: var(--primary);
        }
        
        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        
        .btn-outline {
            border: 2px solid white;
            color: white;
            margin-left: 10px;
        }
        
        .btn-outline:hover {
            background: white;
            color: var(--primary);
        }
        
        /* Sobre */
        .sobre-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 50px;
            align-items: center;
        }
        
        .sobre-texto p {
            color: var(--gray);
            margin-bottom: 20px;
        }
        
        .skills {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
        }
        
        .skill-tag {
            background: var(--primary);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
        }
        
        /* Projetos */
        .projetos {
            background: var(--light);
        }
        
        .projetos-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }
        
        .projeto-card {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 5px 20px rgba(0,0,0,0.08);
            transition: transform 0.3s;
        }
        
        .projeto-card:hover {
            transform: translateY(-5px);
        }
        
        .projeto-imagem {
            height: 200px;
            background: linear-gradient(45deg, var(--primary), var(--primary-dark));
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 3rem;
        }
        
        .projeto-info {
            padding: 25px;
        }
        
        .projeto-info h3 {
            margin-bottom: 10px;
            color: var(--dark);
        }
        
        .projeto-info p {
            color: var(--gray);
            font-size: 14px;
        }
        
        /* Contato */
        .contato-form {
            max-width: 600px;
            margin: 0 auto;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        
        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 15px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--primary);
        }
        
        .contato-form .btn {
            width: 100%;
            background: var(--primary);
            color: white;
            border: none;
            cursor: pointer;
            font-size: 16px;
        }
        
        .contato-form .btn:hover {
            background: var(--primary-dark);
        }
        
        /* Footer */
        footer {
            background: var(--dark);
            color: white;
            text-align: center;
            padding: 40px 0;
        }
        
        footer a {
            color: var(--primary);
            text-decoration: none;
        }
        
        /* Responsivo */
        @media (max-width: 768px) {
            nav ul {
                display: none;
            }
            
            .hero h1 {
                font-size: 2rem;
            }
            
            .sobre-grid {
                grid-template-columns: 1fr;
            }
            
            .btn-outline {
                margin-left: 0;
                margin-top: 10px;
            }
        }
    </style>
</head>
<body>
    <nav>
        <div class="container">
            <a href="#" class="logo">MeuPortfólio</a>
            <ul>
                <li><a href="#sobre">Sobre</a></li>
                <li><a href="#projetos">Projetos</a></li>
                <li><a href="#contato">Contato</a></li>
            </ul>
        </div>
    </nav>

    <section class="hero">
        <div class="hero-content container">
            <div class="avatar">JD</div>
            <h1>João Developer</h1>
            <p class="subtitle">Desenvolvedor Full Stack apaixonado por criar soluções incríveis</p>
            <a href="#projetos" class="btn btn-primary">Ver Projetos</a>
            <a href="#contato" class="btn btn-outline">Fale Comigo</a>
        </div>
    </section>

    <section id="sobre">
        <div class="container">
            <h2 class="section-title">Sobre Mim</h2>
            <div class="sobre-grid">
                <div class="sobre-texto">
                    <p>
                        Olá! Sou um desenvolvedor full stack com mais de 5 anos de experiência criando aplicações web modernas e escaláveis.
                    </p>
                    <p>
                        Minha paixão é transformar ideias em produtos digitais que fazem a diferença. Trabalho com as tecnologias mais modernas do mercado para entregar soluções de alta qualidade.
                    </p>
                    <div class="skills">
                        <span class="skill-tag">JavaScript</span>
                        <span class="skill-tag">React</span>
                        <span class="skill-tag">Node.js</span>
                        <span class="skill-tag">TypeScript</span>
                        <span class="skill-tag">Python</span>
                        <span class="skill-tag">PostgreSQL</span>
                    </div>
                </div>
                <div class="sobre-stats">
                    <div style="background: var(--light); padding: 30px; border-radius: 15px; text-align: center;">
                        <div style="font-size: 3rem; color: var(--primary); font-weight: bold;">50+</div>
                        <div style="color: var(--gray);">Projetos Entregues</div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="projetos" class="projetos">
        <div class="container">
            <h2 class="section-title">Meus Projetos</h2>
            <div class="projetos-grid">
                <div class="projeto-card">
                    <div class="projeto-imagem">P1</div>
                    <div class="projeto-info">
                        <h3>E-commerce Moderno</h3>
                        <p>Loja virtual completa com React, Node.js e integração de pagamentos.</p>
                    </div>
                </div>
                <div class="projeto-card">
                    <div class="projeto-imagem">P2</div>
                    <div class="projeto-info">
                        <h3>App de Gestão</h3>
                        <p>Sistema de gestão empresarial com dashboard e relatórios em tempo real.</p>
                    </div>
                </div>
                <div class="projeto-card">
                    <div class="projeto-imagem">P3</div>
                    <div class="projeto-info">
                        <h3>Plataforma EAD</h3>
                        <p>Plataforma de cursos online com streaming de vídeo e certificados.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="contato">
        <div class="container">
            <h2 class="section-title">Entre em Contato</h2>
            <form class="contato-form">
                <div class="form-group">
                    <label>Nome</label>
                    <input type="text" placeholder="Seu nome completo">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" placeholder="seu@email.com">
                </div>
                <div class="form-group">
                    <label>Mensagem</label>
                    <textarea rows="5" placeholder="Como posso ajudar?"></textarea>
                </div>
                <button type="submit" class="btn">Enviar Mensagem</button>
            </form>
        </div>
    </section>

    <footer>
        <div class="container">
            <p>Criado com <a href="#">BRATVACODER</a></p>
        </div>
    </footer>
</body>
</html>`,

  "typescript-api": `// API REST com TypeScript e Express
// Instalação: npm install express cors helmet
// Dev: npm install -D typescript @types/express @types/cors @types/node tsx

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

// ==========================================
// TIPOS E INTERFACES
// ==========================================

interface Item {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  criadoEm: Date;
}

interface CriarItemDTO {
  nome: string;
  descricao?: string;
  preco?: number;
}

interface AtualizarItemDTO {
  nome?: string;
  descricao?: string;
  preco?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  total?: number;
}

// ==========================================
// BANCO DE DADOS (Em memória - para produção use PostgreSQL/MongoDB)
// ==========================================

class Database {
  private items: Item[] = [
    { id: 1, nome: 'Item 1', descricao: 'Descrição do item 1', preco: 29.90, criadoEm: new Date() },
    { id: 2, nome: 'Item 2', descricao: 'Descrição do item 2', preco: 49.90, criadoEm: new Date() },
  ];
  private nextId = 3;

  listar(): Item[] {
    return [...this.items];
  }

  buscar(id: number): Item | undefined {
    return this.items.find(item => item.id === id);
  }

  criar(dados: CriarItemDTO): Item {
    const novoItem: Item = {
      id: this.nextId++,
      nome: dados.nome,
      descricao: dados.descricao || '',
      preco: dados.preco || 0,
      criadoEm: new Date(),
    };
    this.items.push(novoItem);
    return novoItem;
  }

  atualizar(id: number, dados: AtualizarItemDTO): Item | null {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    this.items[index] = { ...this.items[index], ...dados };
    return this.items[index];
  }

  deletar(id: number): boolean {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;
    
    this.items.splice(index, 1);
    return true;
  }
}

// ==========================================
// CONFIGURAÇÃO DO EXPRESS
// ==========================================

const app = express();
const db = new Database();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logger middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.path}\`);
  next();
});

// ==========================================
// ROTAS DA API
// ==========================================

// GET /api/items - Listar todos
app.get('/api/items', (_req: Request, res: Response<ApiResponse<Item[]>>) => {
  const items = db.listar();
  res.json({
    success: true,
    data: items,
    total: items.length,
  });
});

// GET /api/items/:id - Buscar por ID
app.get('/api/items/:id', (req: Request<{ id: string }>, res: Response<ApiResponse<Item>>) => {
  const id = parseInt(req.params.id);
  const item = db.buscar(id);
  
  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item não encontrado',
    });
  }
  
  res.json({ success: true, data: item });
});

// POST /api/items - Criar novo
app.post('/api/items', (req: Request<{}, {}, CriarItemDTO>, res: Response<ApiResponse<Item>>) => {
  const { nome, descricao, preco } = req.body;
  
  if (!nome || nome.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Nome é obrigatório',
    });
  }
  
  const novoItem = db.criar({ nome, descricao, preco });
  res.status(201).json({ success: true, data: novoItem });
});

// PUT /api/items/:id - Atualizar
app.put('/api/items/:id', (req: Request<{ id: string }, {}, AtualizarItemDTO>, res: Response<ApiResponse<Item>>) => {
  const id = parseInt(req.params.id);
  const itemAtualizado = db.atualizar(id, req.body);
  
  if (!itemAtualizado) {
    return res.status(404).json({
      success: false,
      message: 'Item não encontrado',
    });
  }
  
  res.json({ success: true, data: itemAtualizado });
});

// DELETE /api/items/:id - Remover
app.delete('/api/items/:id', (req: Request<{ id: string }>, res: Response<ApiResponse<null>>) => {
  const id = parseInt(req.params.id);
  const deletado = db.deletar(id);
  
  if (!deletado) {
    return res.status(404).json({
      success: false,
      message: 'Item não encontrado',
    });
  }
  
  res.json({ success: true, message: 'Item removido com sucesso' });
});

// ==========================================
// TRATAMENTO DE ERROS
// ==========================================

app.use((err: Error, _req: Request, res: Response<ApiResponse<null>>, _next: NextFunction) => {
  console.error('Erro:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
  });
});

// Rota 404
app.use((_req: Request, res: Response<ApiResponse<null>>) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
  });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {
  console.log('API TypeScript rodando em http://localhost:' + PORT);
  console.log('Rotas disponíveis:');
  console.log('  GET    /api/items');
  console.log('  GET    /api/items/:id');
  console.log('  POST   /api/items');
  console.log('  PUT    /api/items/:id');
  console.log('  DELETE /api/items/:id');
});

/*
// package.json
{
  "name": "typescript-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts",
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start:prod": "node dist/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "helmet": "^7.1.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}

// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
*/`,

  "static-site": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site Moderno</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '#7c3aed',
          }
        }
      }
    }
  </script>
</head>
<body class="bg-gray-50">
  <!-- Navegação -->
  <nav class="bg-white shadow-sm fixed w-full z-50">
    <div class="max-w-6xl mx-auto px-4">
      <div class="flex justify-between items-center h-16">
        <a href="#" class="text-xl font-bold text-primary">MeuSite</a>
        <div class="hidden md:flex space-x-8">
          <a href="#home" class="text-gray-600 hover:text-primary">Início</a>
          <a href="#servicos" class="text-gray-600 hover:text-primary">Serviços</a>
          <a href="#sobre" class="text-gray-600 hover:text-primary">Sobre</a>
          <a href="#contato" class="text-gray-600 hover:text-primary">Contato</a>
        </div>
      </div>
    </div>
  </nav>

  <!-- Hero -->
  <section id="home" class="pt-24 pb-20 bg-gradient-to-br from-primary to-purple-600">
    <div class="max-w-6xl mx-auto px-4 text-center">
      <h1 class="text-4xl md:text-6xl font-bold text-white mb-6">
        Bem-vindo ao Futuro
      </h1>
      <p class="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
        Soluções inovadoras para transformar seu negócio e alcançar resultados extraordinários.
      </p>
      <a href="#contato" class="inline-block bg-white text-primary px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition">
        Começar Agora
      </a>
    </div>
  </section>

  <!-- Serviços -->
  <section id="servicos" class="py-20">
    <div class="max-w-6xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-center mb-12">Nossos Serviços</h2>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
          <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Performance</h3>
          <p class="text-gray-600">Sites ultra-rápidos que proporcionam a melhor experiência.</p>
        </div>
        <div class="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
          <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Segurança</h3>
          <p class="text-gray-600">Proteção de dados com as melhores práticas do mercado.</p>
        </div>
        <div class="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
          <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold mb-2">Responsivo</h3>
          <p class="text-gray-600">Design adaptável para todos os dispositivos.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Sobre -->
  <section id="sobre" class="py-20 bg-gray-100">
    <div class="max-w-6xl mx-auto px-4">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 class="text-3xl font-bold mb-6">Sobre Nós</h2>
          <p class="text-gray-600 mb-4">
            Somos uma equipe apaixonada por tecnologia e inovação. Há mais de 5 anos ajudamos empresas a crescer no mundo digital.
          </p>
          <p class="text-gray-600">
            Nossa missão é entregar soluções que realmente fazem a diferença no seu negócio.
          </p>
        </div>
        <div class="bg-primary/10 rounded-2xl p-12 text-center">
          <div class="text-5xl font-bold text-primary mb-2">500+</div>
          <div class="text-gray-600">Projetos Entregues</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Contato -->
  <section id="contato" class="py-20">
    <div class="max-w-xl mx-auto px-4">
      <h2 class="text-3xl font-bold text-center mb-12">Entre em Contato</h2>
      <form class="space-y-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input type="text" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Seu nome">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="seu@email.com">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
          <textarea rows="4" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent" placeholder="Sua mensagem..."></textarea>
        </div>
        <button type="submit" class="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90 transition">
          Enviar Mensagem
        </button>
      </form>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-gray-900 text-white py-12">
    <div class="max-w-6xl mx-auto px-4 text-center">
      <div class="text-2xl font-bold mb-4">MeuSite</div>
      <p class="text-gray-400">Criado com BRATVACODER</p>
    </div>
  </footer>
</body>
</html>`,
};

// Detecção inteligente de templates usando o novo sistema
function detectTemplate(prompt: string): string | null {
  // Usar o novo sistema de detecção inteligente
  const detected = detectNewTemplate(prompt);
  if (detected) {
    return detected.id;
  }
  
  // Fallback para detecção legada
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes("whatsapp") || lowerPrompt.includes("zap") || lowerPrompt.includes("wpp")) {
    return "whatsapp-bot";
  } else if (lowerPrompt.includes("typescript") && (lowerPrompt.includes("api") || lowerPrompt.includes("rest"))) {
    return "typescript-api";
  } else if (lowerPrompt.includes("api") || lowerPrompt.includes("rest") || lowerPrompt.includes("backend")) {
    return "rest-api";
  } else if (lowerPrompt.includes("landing") || lowerPrompt.includes("página") || lowerPrompt.includes("pagina")) {
    return "landing-page";
  } else if (lowerPrompt.includes("python") || lowerPrompt.includes("automação") || lowerPrompt.includes("script")) {
    return "python-automation";
  } else if (lowerPrompt.includes("php") || lowerPrompt.includes("crud") || lowerPrompt.includes("mysql")) {
    return "php-crud";
  } else if (lowerPrompt.includes("portfólio") || lowerPrompt.includes("portfolio") || lowerPrompt.includes("curriculo")) {
    return "html-css-portfolio";
  } else if (lowerPrompt.includes("site") || lowerPrompt.includes("html") || lowerPrompt.includes("tailwind")) {
    return "static-site";
  } else if (lowerPrompt.includes("telegram")) {
    return "telegram-bot";
  } else if (lowerPrompt.includes("jwt") || lowerPrompt.includes("login") || lowerPrompt.includes("autenticação") || lowerPrompt.includes("auth")) {
    return "jwt-auth";
  } else if (lowerPrompt.includes("dashboard") || lowerPrompt.includes("admin") || lowerPrompt.includes("painel")) {
    return "admin-dashboard";
  } else if (lowerPrompt.includes("chat") || lowerPrompt.includes("realtime") || lowerPrompt.includes("tempo real") || lowerPrompt.includes("websocket")) {
    return "realtime-chat";
  }
  return null;
}

export async function generateCode(prompt: string): Promise<GenerationResult> {
  const lowerPrompt = prompt.toLowerCase();
  const apiKey = process.env.POE_API_KEY;
  
  // Fast path: Se não tem API key, usar templates diretamente (sem latência)
  if (!apiKey) {
    console.log("[POE] API key não configurada, usando templates");
    const detectedTemplate = detectTemplate(lowerPrompt);
    
    if (detectedTemplate) {
      console.log("[TEMPLATE] Usando template:", detectedTemplate);
      return generateCodeFromTemplate(detectedTemplate, prompt);
    }
    
    console.log("[FALLBACK] Gerando código genérico");
    return {
      explanation: `Entendi seu pedido! Criei um código JavaScript baseado na sua descrição. Configure a chave POE_API_KEY para geração de código personalizado via IA.`,
      code: generateGenericCode(prompt),
    };
  }
  
  // Com API key: tentar usar IA para geração personalizada
  const aiResponse = await callPoeAPI(prompt);
  
  if (aiResponse) {
    console.log("[POE] Código gerado via IA com sucesso");
    return parseAIResponse(aiResponse);
  }
  
  // Fallback para templates se API falhar
  const detectedTemplate = detectTemplate(lowerPrompt);
  
  if (detectedTemplate) {
    console.log("[TEMPLATE] Fallback para template:", detectedTemplate);
    return generateCodeFromTemplate(detectedTemplate, prompt);
  }

  console.log("[FALLBACK] Gerando código genérico");
  return {
    explanation: `Entendi seu pedido! Criei um código JavaScript baseado na sua descrição. A API de IA não está disponível no momento, mas o código está pronto para uso.`,
    code: generateGenericCode(prompt),
  };
}

export async function generateCodeFromTemplate(templateId: string, prompt: string): Promise<GenerationResult> {
  // Primeiro, tentar usar o novo sistema de templates
  const newTemplate = getTemplateById(templateId);
  
  if (newTemplate && newTemplate.files) {
    // Combinar todos os arquivos do template com separadores claros
    const fileEntries = Object.entries(newTemplate.files);
    const filesContent = fileEntries
      .map(([filename, content], index) => {
        const separator = "=".repeat(60);
        const header = `\n${separator}\n// ARQUIVO: ${filename}\n${separator}\n`;
        return `${header}\n${content}`;
      })
      .join("\n\n");
    
    const fileList = fileEntries.map(([f]) => f).join(", ");
    
    return {
      explanation: `${newTemplate.description}\n\nO projeto inclui ${fileEntries.length} arquivos: ${fileList}.\n\nFaça o download do ZIP para obter todos os arquivos separados e prontos para uso.`,
      code: filesContent,
    };
  }
  
  // Fallback para templates legados
  const template = codeTemplates.find(t => t.id === templateId);
  const code = templateCode[templateId] || generateGenericCode(prompt);
  
  const explanations: Record<string, string> = {
    "whatsapp-bot": "Criei um bot completo para WhatsApp usando a biblioteca Baileys! O código inclui conexão via QR Code, sistema de comandos com prefixo, verificação de admin/dono, e comando ping com tempo de resposta. Para usar, instale as dependências com 'npm install' e execute com 'node src/index.js'.",
    "rest-api": "Sua API REST está pronta! Inclui rotas completas para CRUD (Criar, Ler, Atualizar, Deletar), validação de dados, tratamento de erros e middleware de segurança com Helmet. Execute 'npm install' e depois 'npm start' para iniciar.",
    "rest-express": "API REST completa com Express! Inclui CRUD, validação, paginação, busca e middlewares de segurança. Execute 'npm install' e 'npm run dev' para iniciar.",
    "landing-page": "Criei uma landing page profissional e responsiva! Inclui seções de hero, recursos, preços, call-to-action e footer. O design é moderno com gradientes e animações suaves. Basta abrir o arquivo HTML no navegador.",
    "python-automation": "Seu script Python de automação está pronto! Inclui web scraping, consumo de APIs, processamento com Pandas, e exportação para Excel/CSV/JSON. Instale as dependências com 'pip install -r requirements.txt'.",
    "python-script": "Script Python completo para automação! Inclui scraping, APIs, Pandas e exportação de dados. Execute 'pip install -r requirements.txt' e 'python main.py'.",
    "static-site": "Seu site estático multi-página está pronto! Inclui páginas de Home, Sobre, Projetos e Contato com design responsivo. Basta abrir index.html no navegador.",
    "php-crud": "Sistema CRUD completo em PHP com MySQL! Inclui conexão PDO, operações de criação, leitura, atualização e exclusão, interface visual pronta, e script SQL para criar o banco de dados.",
    "html-css-portfolio": "Portfólio profissional com HTML e CSS puros! Design moderno com seções de apresentação, sobre, projetos e contato. Totalmente responsivo.",
    "typescript-api": "API REST moderna com TypeScript e Express! Inclui tipagem completa, interfaces bem definidas, classe Database para operações CRUD.",
    "telegram-bot": "Bot Telegram completo com Telegraf! Inclui comandos, inline keyboard, tratamento de mensagens e configuração fácil. Configure o token do BotFather no .env.",
    "jwt-auth": "Sistema de autenticação JWT completo! Inclui registro, login, refresh token, rotas protegidas e atualização de perfil. Senhas hasheadas com bcrypt.",
    "crud-completo": "API CRUD completa com SQLite! Inclui listagem, busca, criação, atualização, exclusão e estatísticas. Banco de dados SQLite zero-config.",
    "admin-dashboard": "Dashboard administrativo moderno! Inclui cards de estatísticas, gráficos Chart.js, tabela de dados e sidebar de navegação. Design responsivo.",
    "realtime-chat": "Chat em tempo real com Socket.IO! Inclui salas, lista de usuários online, indicador de digitando e mensagens instantâneas.",
  };

  return {
    explanation: explanations[templateId] || `Código gerado com base no template "${template?.name || templateId}"!`,
    code,
  };
}

function generateGenericCode(prompt: string): string {
  return `// Código gerado pelo BRATVACODER
// Baseado no pedido: ${prompt.slice(0, 100)}...

const app = {
  nome: "Minha Aplicação",
  versao: "1.0.0",
  
  iniciar() {
    console.log(\`Iniciando \${this.nome} v\${this.versao}\`);
    this.executar();
  },
  
  executar() {
    // Sua lógica aqui
    console.log("Aplicação em execução!");
    
    // Exemplo de funcionalidade
    const dados = this.processarDados();
    console.log("Dados processados:", dados);
  },
  
  processarDados() {
    return {
      timestamp: new Date().toISOString(),
      status: "sucesso",
      mensagem: "Operação realizada com êxito"
    };
  }
};

// Iniciar aplicação
app.iniciar();

// Para executar: node index.js`;
}
