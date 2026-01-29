# Deploy Externo - BRATVACODER

Guia completo para rodar o BRATVACODER em servidores externos (VPS, servidor local, cloud providers).

## Requisitos do Sistema

### Hardware Minimo
- **CPU**: 2 cores
- **RAM**: 2GB (4GB recomendado)
- **Disco**: 10GB de espaco livre

### Software Necessario
- **Node.js**: v18.x ou superior
- **PostgreSQL**: v14.x ou superior
- **npm** ou **yarn**
- **Git**

## Instalacao Passo a Passo

### 1. Clonar o Repositorio

```bash
git clone https://github.com/seu-usuario/bratvacoder.git
cd bratvacoder
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Banco de Dados PostgreSQL

#### Opcao A: PostgreSQL Local

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Criar usuario e banco de dados
sudo -u postgres psql
CREATE USER bratvacoder WITH PASSWORD 'sua_senha_segura';
CREATE DATABASE bratvacoder_db OWNER bratvacoder;
GRANT ALL PRIVILEGES ON DATABASE bratvacoder_db TO bratvacoder;
\q
```

#### Opcao B: Docker

```bash
docker run --name bratvacoder-postgres \
  -e POSTGRES_USER=bratvacoder \
  -e POSTGRES_PASSWORD=sua_senha_segura \
  -e POSTGRES_DB=bratvacoder_db \
  -p 5432:5432 \
  -d postgres:14
```

### 4. Configurar Variaveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Banco de Dados (OBRIGATORIO)
DATABASE_URL=postgresql://bratvacoder:sua_senha_segura@localhost:5432/bratvacoder_db

# Sessao (OBRIGATORIO)
SESSION_SECRET=gere_uma_string_aleatoria_de_32_caracteres

# OpenAI API (OBRIGATORIO para geracao de codigo)
OPENAI_API_KEY=sk-sua-chave-openai-aqui

# Porta do servidor (opcional, padrao 5000)
PORT=5000

# Ambiente (opcional)
NODE_ENV=production

# Cache Redis (opcional, melhora performance)
# REDIS_URL=redis://localhost:6379

# Logs centralizados (opcional)
# LOGGLY_TOKEN=seu-token-loggly
# LOG_LEVEL=info
```

### 5. Executar Migracoes do Banco de Dados

```bash
npm run db:push
```

### 6. Build da Aplicacao

```bash
npm run build
```

### 7. Iniciar o Servidor

#### Modo Producao
```bash
npm start
```

#### Modo Desenvolvimento
```bash
npm run dev
```

## Configuracao com PM2 (Recomendado para Producao)

PM2 mantem sua aplicacao rodando 24/7, reinicia automaticamente em caso de falha.

### Instalar PM2

```bash
npm install -g pm2
```

### Criar arquivo ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'bratvacoder',
    script: 'npm',
    args: 'start',
    cwd: '/caminho/para/bratvacoder',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Preparar Diretorios de Logs

Antes de iniciar com PM2, crie o diretorio de logs:

```bash
mkdir -p logs
```

### Comandos PM2

```bash
# Iniciar
pm2 start ecosystem.config.js

# Ver status
pm2 status

# Ver logs
pm2 logs bratvacoder

# Reiniciar
pm2 restart bratvacoder

# Parar
pm2 stop bratvacoder

# Iniciar automaticamente no boot
pm2 startup
pm2 save
```

## Configuracao com Nginx (Proxy Reverso)

### Instalar Nginx

```bash
sudo apt install nginx
```

### Configurar Virtual Host

Crie `/etc/nginx/sites-available/bratvacoder`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout para SSE (streaming)
        proxy_read_timeout 86400;
        proxy_buffering off;
    }
}
```

### Ativar e Reiniciar Nginx

```bash
sudo ln -s /etc/nginx/sites-available/bratvacoder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Configuracao HTTPS com Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com.br
```

O Certbot configura automaticamente a renovacao do certificado.

## Deploy com Docker

### Dockerfile

Crie um arquivo `Dockerfile` na raiz do projeto:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependencias
COPY package*.json ./

# Instalar TODAS as dependencias (incluindo devDependencies para build)
RUN npm ci

# Copiar codigo fonte
COPY . .

# Build da aplicacao
RUN npm run build

# Remover devDependencies apos o build
RUN npm prune --production

# Imagem de producao
FROM node:18-alpine

WORKDIR /app

# Copiar arquivos buildados e dependencias de producao
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Criar diretorio de logs
RUN mkdir -p logs

# Expor porta
EXPOSE 5000

# Iniciar
CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://bratvacoder:senha@db:5432/bratvacoder_db
      - SESSION_SECRET=sua_secret_aqui
      - OPENAI_API_KEY=sua_chave_openai
      - NODE_ENV=production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14
    environment:
      - POSTGRES_USER=bratvacoder
      - POSTGRES_PASSWORD=senha
      - POSTGRES_DB=bratvacoder_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Comandos Docker

```bash
# Build e iniciar
docker-compose up -d --build

# Executar migracoes do banco de dados (IMPORTANTE: fazer apos o primeiro deploy)
docker-compose exec app npm run db:push

# Ver logs
docker-compose logs -f app

# Parar
docker-compose down

# Reiniciar apos atualizacao
docker-compose down
docker-compose up -d --build
docker-compose exec app npm run db:push
```

## Deploy em Cloud Providers

### Railway

1. Conecte seu repositorio GitHub ao Railway
2. Configure as variaveis de ambiente no dashboard
3. Railway detecta automaticamente e faz deploy

### Render

1. Crie um novo Web Service no Render
2. Conecte seu repositorio
3. Configure:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Adicione as variaveis de ambiente

### DigitalOcean App Platform

1. Crie um novo App no DigitalOcean
2. Conecte seu repositorio GitHub
3. Configure o build e variaveis de ambiente
4. Deploy automatico a cada push

## Monitoramento e Logs

### Verificar Status da Aplicacao

```bash
# Com PM2
pm2 status
pm2 monit

# Ver logs em tempo real
pm2 logs bratvacoder --lines 100
```

### Endpoint de Health Check

A aplicacao expoe um endpoint de verificacao:

```bash
curl http://localhost:5000/api/services/status
```

Resposta esperada:
```json
{
  "status": "healthy",
  "cache": "memory",
  "uptime": "2h 30m"
}
```

## Resolucao de Problemas

### Erro de Conexao com Banco de Dados

```bash
# Verificar se PostgreSQL esta rodando
sudo systemctl status postgresql

# Testar conexao
psql -U bratvacoder -h localhost -d bratvacoder_db
```

### Porta 5000 em Uso

```bash
# Encontrar processo
lsof -i :5000

# Matar processo
kill -9 <PID>
```

### Erro de Permissao

```bash
# Dar permissao ao diretorio
chmod -R 755 /caminho/para/bratvacoder
chown -R $USER:$USER /caminho/para/bratvacoder
```

### Memoria Insuficiente

```bash
# Criar swap (para VPS com pouca RAM)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Backup do Banco de Dados

### Backup Manual

```bash
pg_dump -U bratvacoder -h localhost bratvacoder_db > backup_$(date +%Y%m%d).sql
```

### Backup Automatico com Cron

```bash
# Editar crontab
crontab -e

# Adicionar linha (backup diario as 3h)
0 3 * * * pg_dump -U bratvacoder bratvacoder_db > /backups/bratvacoder_$(date +\%Y\%m\%d).sql
```

### Restaurar Backup

```bash
psql -U bratvacoder -h localhost bratvacoder_db < backup_20241215.sql
```

## Atualizacoes

### Atualizar Aplicacao

```bash
cd /caminho/para/bratvacoder

# Puxar atualizacoes
git pull origin main

# Instalar novas dependencias
npm install

# Build
npm run build

# Executar migracoes
npm run db:push

# Reiniciar
pm2 restart bratvacoder
```

## Suporte

Para duvidas ou problemas, abra uma issue no repositorio do projeto ou entre em contato com a equipe de desenvolvimento.
