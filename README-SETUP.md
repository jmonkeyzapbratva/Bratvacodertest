# BRATVACODER - Guia de Configuração

## Requisitos

- Node.js 18+
- PostgreSQL (fornecido pelo Replit)

## Configuração Rápida

### 1. Variáveis de Ambiente

Copie `.env.example` para `.env` e configure:

```bash
DATABASE_URL=postgresql://...  # Fornecido pelo Replit
SESSION_SECRET=chave-secreta   # Gere uma string aleatória
POE_API_KEY=sua-chave-poe     # Obter em poe.com/api_key
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Sincronizar Banco de Dados

```bash
npm run db:push
```

### 4. Iniciar em Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em http://localhost:5000

## Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Compila para produção |
| `npm run start` | Inicia servidor de produção |
| `npm run db:push` | Sincroniza schema do banco |
| `npm run check` | Verifica tipos TypeScript |

## Estrutura de Pastas

```
├── client/              # Frontend React
│   └── src/
│       ├── components/  # Componentes reutilizáveis
│       ├── pages/       # Páginas da aplicação
│       ├── hooks/       # Custom hooks
│       └── lib/         # Utilitários
├── server/              # Backend Express
│   ├── routes.ts        # Rotas da API
│   ├── storage.ts       # Camada de dados
│   ├── codeGenerator.ts # Geração de código
│   ├── github.ts        # Integração GitHub
│   ├── zipService.ts    # Criação de ZIPs
│   └── services/        # Serviços externos
│       ├── cache.ts     # Cache Redis/Memória
│       ├── logger.ts    # Logging Loggly/Console
│       └── index.ts     # Exportações
├── shared/              # Código compartilhado
│   └── schema.ts        # Schema do banco (Drizzle)
└── scripts/             # Scripts de build
```

## Integrações Obrigatórias

### PostgreSQL (Banco de Dados)
- Fornecido automaticamente pelo Replit
- Variável `DATABASE_URL` já configurada

### Poe.com API (Geração de Código)
1. Acesse https://poe.com/api_key
2. Faça login e gere uma API key
3. Configure `POE_API_KEY` no ambiente

## Integrações Opcionais

### GitHub
Configure via Replit Connectors para:
- Criar repositórios automaticamente
- Fazer commits do código gerado
- Não precisa de variáveis manuais

### Cache Redis
Para melhor performance em produção:
1. Crie um Redis no Railway: https://railway.app
2. Ou use Upstash: https://upstash.com
3. Configure `REDIS_URL` no ambiente
4. Se não configurado, usa cache em memória (padrão)

### Logging com Loggly
Para monitoramento centralizado:
1. Acesse https://loggly.com
2. Crie uma conta gratuita
3. Gere um Customer Token
4. Configure `LOGGLY_TOKEN` no ambiente
5. Configure `LOG_LEVEL` (debug, info, warn, error)

### Object Storage (Arquivos)
Para armazenar arquivos gerados:
1. Abra o painel "Object Storage" no Replit
2. Crie um bucket
3. Configure as variáveis:
   - `PUBLIC_OBJECT_SEARCH_PATHS`: Caminhos públicos
   - `PRIVATE_OBJECT_DIR`: Diretório privado

### Stripe (Pagamentos)
Para ativar planos pagos:
1. Crie conta em https://stripe.com
2. Configure no ambiente:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `VITE_STRIPE_PUBLIC_KEY`

## Verificar Status dos Serviços

Após iniciar, acesse:
```
GET /api/services/status
```

Retorna:
```json
{
  "cache": { "type": "memory", "connected": true },
  "logging": { "console": true, "loggly": false },
  "database": { "connected": true },
  "poe": { "configured": true },
  "github": { "configured": true }
}
```

## Suporte

Dúvidas? Abra uma issue no repositório.
