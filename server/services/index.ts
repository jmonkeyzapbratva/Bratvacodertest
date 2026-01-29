// Serviços Externos - BRATVACODER
// Exporta todos os serviços para uso na aplicação

export { CacheService, cacheService } from "./cache";
export { LoggingService, logger } from "./logger";

// Status de todos os serviços
export interface ServicesStatus {
  cache: {
    type: "redis" | "memory";
    connected: boolean;
  };
  logging: {
    console: boolean;
    loggly: boolean;
  };
  database: {
    connected: boolean;
    error?: string;
  };
  poe: {
    configured: boolean;
  };
  github: {
    configured: boolean;
  };
}

export async function getServicesStatus(): Promise<ServicesStatus> {
  const { cacheService } = await import("./cache");
  const { logger } = await import("./logger");
  
  // Verificar conexão real do banco
  let dbConnected = false;
  let dbError: string | undefined;
  try {
    if (process.env.DATABASE_URL) {
      const { db } = await import("../db");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`SELECT 1`);
      dbConnected = true;
    }
  } catch (error: any) {
    dbError = error.message || "Falha na conexão";
  }
  
  // Verificar GitHub connector
  let githubConfigured = false;
  try {
    const { isGitHubConnected } = await import("../github");
    githubConfigured = await isGitHubConnected();
  } catch {
    githubConfigured = false;
  }
  
  return {
    cache: cacheService.getStatus(),
    logging: logger.getStatus(),
    database: {
      connected: dbConnected,
      ...(dbError && { error: dbError }),
    },
    poe: {
      configured: !!process.env.POE_API_KEY,
    },
    github: {
      configured: githubConfigured,
    },
  };
}
