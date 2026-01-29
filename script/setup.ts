import { execSync } from "child_process";
import { existsSync, copyFileSync, readFileSync, writeFileSync } from "fs";

console.log("=".repeat(50));
console.log("  BRATVACODER - Script de Inicialização");
console.log("=".repeat(50));
console.log("");

function run(cmd: string, description: string) {
  console.log(`[SETUP] ${description}...`);
  try {
    execSync(cmd, { stdio: "inherit" });
    console.log(`[OK] ${description} concluído!\n`);
  } catch (error) {
    console.error(`[ERRO] Falha em: ${description}`);
    throw error;
  }
}

async function setup() {
  console.log("[1/4] Verificando ambiente...\n");

  if (!process.env.DATABASE_URL) {
    console.log("[AVISO] DATABASE_URL não configurado.");
    console.log("        Configure no painel de Secrets do Replit.\n");
  } else {
    console.log("[OK] DATABASE_URL encontrado.\n");
  }

  if (!process.env.SESSION_SECRET) {
    console.log("[AVISO] SESSION_SECRET não configurado.");
    console.log("        Configure no painel de Secrets do Replit.\n");
  } else {
    console.log("[OK] SESSION_SECRET encontrado.\n");
  }

  console.log("[2/4] Instalando dependências...\n");
  run("npm install", "Instalação de pacotes npm");

  console.log("[3/4] Sincronizando banco de dados...\n");
  if (process.env.DATABASE_URL) {
    run("npm run db:push", "Sincronização do schema PostgreSQL");
  } else {
    console.log("[PULADO] Banco de dados não configurado.\n");
  }

  console.log("[4/4] Verificando estrutura do projeto...\n");

  const requiredDirs = ["client/src", "server", "shared", "script"];
  const missingDirs = requiredDirs.filter((dir) => !existsSync(dir));

  if (missingDirs.length > 0) {
    console.log("[ERRO] Diretórios ausentes:", missingDirs.join(", "));
  } else {
    console.log("[OK] Estrutura de pastas verificada.\n");
  }

  console.log("=".repeat(50));
  console.log("  SETUP CONCLUÍDO!");
  console.log("=".repeat(50));
  console.log("");
  console.log("Próximos passos:");
  console.log("  1. Configure as variáveis de ambiente (ver .env.example)");
  console.log("  2. Execute: npm run dev");
  console.log("  3. Acesse: http://localhost:5000");
  console.log("");
}

setup().catch((err) => {
  console.error("Erro no setup:", err.message);
  process.exit(1);
});
