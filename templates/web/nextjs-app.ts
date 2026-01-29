// Template: Next.js 14 App
// Categoria: web
// Palavras-chave: nextjs, next, react, ssr, fullstack

export const nextjsAppTemplate = {
  id: "nextjs-app",
  name: "Next.js 14 App",
  category: "web",
  description: "Aplicacao Next.js 14 com App Router, TypeScript e Tailwind CSS",
  keywords: [
    "nextjs", "next", "react", "ssr", "fullstack", "typescript", "app router",
    "next.js", "server components", "react server"
  ],
  files: {
    "package.json": `{
  "name": "minha-app-nextjs",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 5000",
    "build": "next build",
    "start": "next start -p 5000"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.2.2"
  }
}`,
    "next.config.js": `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

module.exports = nextConfig`,
    "app/layout.tsx": `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from './components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Minha App Next.js',
  description: 'Criada com Next.js 14',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}`,
    "app/page.tsx": `export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Bem-vindo ao Next.js 14
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Aplicacao fullstack com React Server Components.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <a
          href="/sobre"
          className="block p-6 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Sobre</h2>
          <p className="text-gray-600">
            Saiba mais sobre o projeto e tecnologias.
          </p>
        </a>
        
        <a
          href="/api/hello"
          className="block p-6 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">API Route</h2>
          <p className="text-gray-600">
            Exemplo de API route integrada.
          </p>
        </a>
      </div>
    </div>
  )
}`,
    "app/sobre/page.tsx": `export default function Sobre() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Sobre o Projeto
      </h1>
      <p className="text-gray-600 mb-4">
        Este projeto usa Next.js 14 com App Router.
      </p>
      
      <h2 className="text-xl font-semibold mb-2">Tecnologias</h2>
      <ul className="list-disc list-inside space-y-2 text-gray-600">
        <li>Next.js 14 com App Router</li>
        <li>React Server Components</li>
        <li>TypeScript</li>
        <li>Tailwind CSS</li>
      </ul>
    </div>
  )
}`,
    "app/api/hello/route.ts": `import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    mensagem: 'Ola da API do Next.js!',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  return NextResponse.json({
    recebido: body,
    processado: true
  })
}`,
    "app/components/Navbar.tsx": `import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-gray-900">
            NextApp
          </Link>
          <div className="flex gap-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              Inicio
            </Link>
            <Link href="/sobre" className="text-gray-600 hover:text-gray-900">
              Sobre
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}`,
    "app/globals.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  min-height: 100vh;
  background-color: #f9fafb;
}`,
    "tailwind.config.ts": `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config`,
    "postcss.config.js": `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
    "tsconfig.json": `{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "paths": {"@/*": ["./*"]}
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}`,
    "README.md": `# Next.js 14 App

## Como rodar

\`\`\`bash
npm install
npm run dev
\`\`\`

## Estrutura

- \`app/\` - Paginas e layouts (App Router)
- \`app/api/\` - API Routes
- \`app/components/\` - Componentes

## Scripts

- \`npm run dev\` - Desenvolvimento
- \`npm run build\` - Build producao`
  }
};
