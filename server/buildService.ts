import { storage } from "./storage";
import type { Project } from "@shared/schema";
import { generateProjectWithAI } from "./aiCodeGeneratorService";

export interface BuildResult {
  success: boolean;
  project: GeneratedProject;
  files: GeneratedFile[];
  previewUrl: string;
  generatedBy: "ai" | "template";
}

export interface GeneratedProject {
  id: number;
  name: string;
  description: string;
  type: string;
  stack: string[];
  features: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

const PROJECT_TEMPLATES: Record<string, (name: string, description: string) => GeneratedFile[]> = {
  "landing-page": generateLandingPage,
  "ecommerce": generateEcommerce,
  "blog": generateBlog,
  "dashboard": generateDashboard,
  "booking": generateBooking,
  "default": generateDefaultApp,
};

export async function buildProject(
  userId: string,
  description: string,
  projectType: string
): Promise<BuildResult> {
  const projectName = generateSlug(description);
  const templateKey = mapTypeToTemplate(projectType);
  
  let files: GeneratedFile[];
  let generatedBy: "ai" | "template" = "template";
  
  const hasAIKey = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
  
  if (hasAIKey) {
    console.log("[Build] Gerando projeto com IA...");
    const aiResult = await generateProjectWithAI(description, projectType);
    
    if (aiResult.success && aiResult.files.length > 0) {
      files = aiResult.files;
      generatedBy = "ai";
      console.log(`[Build] IA gerou ${files.length} arquivos`);
    } else {
      console.log("[Build] IA falhou, usando template:", aiResult.error);
      const generator = PROJECT_TEMPLATES[templateKey] || PROJECT_TEMPLATES["default"];
      files = generator(projectName, description);
    }
  } else {
    console.log("[Build] Sem chave OpenAI, usando template");
    const generator = PROJECT_TEMPLATES[templateKey] || PROJECT_TEMPLATES["default"];
    files = generator(projectName, description);
  }
  
  const savedProject = await storage.createProject({
    userId,
    name: projectName,
    description: description.slice(0, 500),
    templateType: templateKey,
    generatedCode: files.map(f => `// ${f.path}\n${f.content}`).join("\n\n"),
    language: "javascript",
  });

  return {
    success: true,
    project: {
      id: savedProject.id,
      name: projectName,
      description,
      type: projectType,
      stack: ["React", "Node.js", "PostgreSQL"],
      features: detectFeaturesFromDescription(description),
    },
    files,
    previewUrl: `/preview/${savedProject.id}`,
    generatedBy,
  };
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50)
    || "meu-projeto";
}

function mapTypeToTemplate(type: string): string {
  const mapping: Record<string, string> = {
    "E-commerce": "ecommerce",
    "Landing Page": "landing-page",
    "Blog/CMS": "blog",
    "Dashboard": "dashboard",
    "Booking System": "booking",
  };
  return mapping[type] || "default";
}

function detectFeaturesFromDescription(description: string): string[] {
  const features: string[] = [];
  const lower = description.toLowerCase();
  
  if (lower.includes("pagamento") || lower.includes("pix") || lower.includes("compra")) {
    features.push("Pagamentos");
  }
  if (lower.includes("login") || lower.includes("usuario") || lower.includes("cadastro")) {
    features.push("Autenticacao");
  }
  if (lower.includes("upload") || lower.includes("foto") || lower.includes("imagem")) {
    features.push("Upload de Arquivos");
  }
  if (lower.includes("admin") || lower.includes("painel") || lower.includes("gerenciar")) {
    features.push("Painel Admin");
  }
  if (lower.includes("whatsapp") || lower.includes("notificacao")) {
    features.push("Notificacoes");
  }
  
  return features;
}

function generateLandingPage(name: string, description: string): GeneratedFile[] {
  return [
    {
      path: "package.json",
      language: "json",
      content: JSON.stringify({
        name,
        version: "1.0.0",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview"
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0"
        },
        devDependencies: {
          vite: "^5.0.0",
          "@vitejs/plugin-react": "^4.0.0"
        }
      }, null, 2)
    },
    {
      path: "index.html",
      language: "html",
      content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`
    },
    {
      path: "src/main.jsx",
      language: "javascript",
      content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`
    },
    {
      path: "src/App.jsx",
      language: "javascript",
      content: `export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">${name}</h1>
          <div className="space-x-4">
            <a href="#sobre" className="text-white hover:text-purple-200">Sobre</a>
            <a href="#contato" className="text-white hover:text-purple-200">Contato</a>
          </div>
        </nav>
      </header>
      
      <main className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold text-white mb-6">
          ${description.slice(0, 60)}
        </h2>
        <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
          Seu projeto incrivel comeca aqui. Personalize como quiser!
        </p>
        <button className="bg-white text-purple-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-purple-100 transition">
          Comecar Agora
        </button>
      </main>
      
      <section id="sobre" className="bg-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-gray-800 mb-8">Sobre Nos</h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Conte a historia do seu projeto aqui. O que torna ele especial?
          </p>
        </div>
      </section>
      
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>© 2024 ${name}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}`
    },
    {
      path: "README.md",
      language: "markdown",
      content: `# ${name}

${description}

## Como executar

\`\`\`bash
npm install
npm run dev
\`\`\`

## Tecnologias
- React
- Tailwind CSS
- Vite

Criado automaticamente pelo BratvaCoder.`
    }
  ];
}

function generateEcommerce(name: string, description: string): GeneratedFile[] {
  return [
    {
      path: "package.json",
      language: "json",
      content: JSON.stringify({
        name,
        version: "1.0.0",
        scripts: {
          dev: "concurrently \"npm run dev:client\" \"npm run dev:server\"",
          "dev:client": "vite",
          "dev:server": "tsx watch server/index.ts",
          build: "vite build"
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          express: "^4.18.2",
          pg: "^8.11.0"
        }
      }, null, 2)
    },
    {
      path: "src/App.jsx",
      language: "javascript",
      content: `import { useState, useEffect } from 'react'

export default function App() {
  const [produtos, setProdutos] = useState([])
  const [carrinho, setCarrinho] = useState([])
  
  useEffect(() => {
    setProdutos([
      { id: 1, nome: 'Produto 1', preco: 29.90, imagem: 'https://via.placeholder.com/200' },
      { id: 2, nome: 'Produto 2', preco: 49.90, imagem: 'https://via.placeholder.com/200' },
      { id: 3, nome: 'Produto 3', preco: 99.90, imagem: 'https://via.placeholder.com/200' },
    ])
  }, [])
  
  const adicionarCarrinho = (produto) => {
    setCarrinho([...carrinho, produto])
  }
  
  const total = carrinho.reduce((acc, item) => acc + item.preco, 0)
  
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-purple-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">${name}</h1>
          <div className="bg-purple-500 px-4 py-2 rounded">
            Carrinho: {carrinho.length} itens - R$ {total.toFixed(2)}
          </div>
        </div>
      </header>
      
      <main className="container mx-auto p-8">
        <h2 className="text-2xl font-bold mb-6">Nossos Produtos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {produtos.map(produto => (
            <div key={produto.id} className="bg-white rounded-lg shadow p-4">
              <img src={produto.imagem} alt={produto.nome} className="w-full h-48 object-cover rounded" />
              <h3 className="text-lg font-bold mt-4">{produto.nome}</h3>
              <p className="text-purple-600 text-xl font-bold">R$ {produto.preco.toFixed(2)}</p>
              <button 
                onClick={() => adicionarCarrinho(produto)}
                className="w-full mt-4 bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
              >
                Adicionar ao Carrinho
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}`
    },
    {
      path: "server/index.ts",
      language: "typescript",
      content: `import express from 'express'

const app = express()
app.use(express.json())

const produtos = [
  { id: 1, nome: 'Produto 1', preco: 29.90 },
  { id: 2, nome: 'Produto 2', preco: 49.90 },
]

app.get('/api/produtos', (req, res) => {
  res.json(produtos)
})

app.post('/api/pedidos', (req, res) => {
  const { itens, cliente } = req.body
  console.log('Novo pedido:', { itens, cliente })
  res.json({ success: true, message: 'Pedido recebido!' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(\`Servidor rodando na porta \${PORT}\`)
})`
    },
    {
      path: "README.md",
      language: "markdown",
      content: `# ${name}

${description}

## Funcionalidades
- Listagem de produtos
- Carrinho de compras
- Checkout com PIX

## Como executar
\`\`\`bash
npm install
npm run dev
\`\`\`

Criado automaticamente pelo BratvaCoder.`
    }
  ];
}

function generateBlog(name: string, description: string): GeneratedFile[] {
  return generateDefaultApp(name, description);
}

function generateDashboard(name: string, description: string): GeneratedFile[] {
  return generateDefaultApp(name, description);
}

function generateBooking(name: string, description: string): GeneratedFile[] {
  return generateDefaultApp(name, description);
}

function generateDefaultApp(name: string, description: string): GeneratedFile[] {
  return [
    {
      path: "package.json",
      language: "json",
      content: JSON.stringify({
        name,
        version: "1.0.0",
        scripts: {
          dev: "vite",
          build: "vite build"
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0"
        }
      }, null, 2)
    },
    {
      path: "index.html",
      language: "html",
      content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name}</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`
    },
    {
      path: "src/main.jsx",
      language: "javascript",
      content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`
    },
    {
      path: "src/App.jsx",
      language: "javascript",
      content: `export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">${name}</h1>
        <p className="text-gray-600">${description.slice(0, 100)}</p>
        <p className="mt-8 text-sm text-gray-400">Personalize este projeto como quiser!</p>
      </div>
    </div>
  )
}`
    }
  ];
}
