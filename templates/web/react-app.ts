// Template: React App com Vite
// Categoria: web
// Palavras-chave: react, vite, typescript, tailwind, spa, frontend

export const reactAppTemplate = {
  id: "react-app",
  name: "React App Vite",
  category: "web",
  description: "Aplicacao React moderna com Vite, TypeScript e Tailwind CSS",
  keywords: [
    "react", "vite", "typescript", "tailwind", "spa", "frontend", 
    "aplicativo web", "app react", "react typescript", "tsx"
  ],
  files: {
    "package.json": `{
  "name": "minha-app-react",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.2.2",
    "vite": "^5.0.0"
  }
}`,
    "index.html": `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Minha App React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    "src/main.tsx": `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)`,
    "src/App.tsx": `import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import Navbar from './components/Navbar'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sobre" element={<About />} />
        </Routes>
      </main>
    </div>
  )
}`,
    "src/components/Navbar.tsx": `import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-gray-900">
            MinhaApp
          </Link>
          <div className="flex gap-4">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              Inicio
            </Link>
            <Link to="/sobre" className="text-gray-600 hover:text-gray-900">
              Sobre
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}`,
    "src/pages/Home.tsx": `export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Bem-vindo ao React App
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Esta e uma aplicacao React moderna com Vite, TypeScript e Tailwind CSS.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-2">Rapido</h3>
          <p className="text-gray-600">
            Vite oferece hot reload instantaneo para desenvolvimento rapido.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-2">Tipado</h3>
          <p className="text-gray-600">
            TypeScript garante codigo mais seguro e manutenivel.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-2">Estilizado</h3>
          <p className="text-gray-600">
            Tailwind CSS para estilizacao rapida e consistente.
          </p>
        </div>
      </div>
    </div>
  )
}`,
    "src/pages/About.tsx": `export default function About() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Sobre o Projeto
      </h1>
      <p className="text-gray-600 mb-4">
        Este projeto foi criado com React e as melhores praticas modernas.
      </p>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>React 18 com hooks</li>
        <li>React Router para navegacao</li>
        <li>TypeScript para tipagem</li>
        <li>Tailwind CSS para estilos</li>
        <li>Vite para build rapido</li>
      </ul>
    </div>
  )
}`,
    "src/index.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: system-ui, -apple-system, sans-serif;
}`,
    "tailwind.config.js": `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
    "postcss.config.js": `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
    "tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}`,
    "vite.config.ts": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000
  }
})`,
    "README.md": `# React App com Vite

## Como rodar

\`\`\`bash
npm install
npm run dev
\`\`\`

## Estrutura

- \`src/pages/\` - Paginas da aplicacao
- \`src/components/\` - Componentes reutilizaveis
- \`src/index.css\` - Estilos globais

## Scripts

- \`npm run dev\` - Inicia servidor de desenvolvimento
- \`npm run build\` - Gera build de producao`
  }
};
