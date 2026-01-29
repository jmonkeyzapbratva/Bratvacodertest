import * as fs from "fs";
import * as path from "path";
import { workspaceService } from "./workspaceService";

export interface DatabaseConfig {
  type: "postgresql" | "sqlite" | "mysql" | "mongodb";
  name: string;
  tables: TableSchema[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  default?: string;
  references?: {
    table: string;
    column: string;
  };
}

const projectDatabases = new Map<number, DatabaseConfig>();

export async function initializeDatabase(projectId: number, config: Partial<DatabaseConfig>): Promise<DatabaseConfig> {
  const dbConfig: DatabaseConfig = {
    type: config.type || "postgresql",
    name: config.name || `project_${projectId}_db`,
    tables: config.tables || [],
  };
  
  projectDatabases.set(projectId, dbConfig);
  
  await generateSchemaFile(projectId, dbConfig);
  await generateDbConnectionFile(projectId, dbConfig);
  
  return dbConfig;
}

export async function getDatabaseConfig(projectId: number): Promise<DatabaseConfig | null> {
  return projectDatabases.get(projectId) || null;
}

export async function addTable(projectId: number, table: TableSchema): Promise<DatabaseConfig> {
  let config = projectDatabases.get(projectId);
  
  if (!config) {
    config = await initializeDatabase(projectId, {});
  }
  
  const existingIndex = config.tables.findIndex(t => t.name === table.name);
  if (existingIndex >= 0) {
    config.tables[existingIndex] = table;
  } else {
    config.tables.push(table);
  }
  
  await generateSchemaFile(projectId, config);
  
  return config;
}

export async function removeTable(projectId: number, tableName: string): Promise<void> {
  const config = projectDatabases.get(projectId);
  if (!config) return;
  
  config.tables = config.tables.filter(t => t.name !== tableName);
  await generateSchemaFile(projectId, config);
}

async function generateSchemaFile(projectId: number, config: DatabaseConfig): Promise<void> {
  const workspacePath = workspaceService.getWorkspacePath(projectId);
  const schemaDir = path.join(workspacePath, "db");
  
  if (!fs.existsSync(schemaDir)) {
    fs.mkdirSync(schemaDir, { recursive: true });
  }
  
  let schemaContent = "";
  
  if (config.type === "postgresql") {
    schemaContent = generateDrizzleSchema(config);
  } else if (config.type === "sqlite") {
    schemaContent = generateSqliteSchema(config);
  }
  
  const schemaPath = path.join(schemaDir, "schema.ts");
  fs.writeFileSync(schemaPath, schemaContent, "utf-8");
}

function generateDrizzleSchema(config: DatabaseConfig): string {
  let imports = new Set<string>();
  imports.add("pgTable");
  
  let content = "";
  
  for (const table of config.tables) {
    for (const col of table.columns) {
      const importType = mapTypeToDrizzleImport(col.type);
      imports.add(importType);
    }
  }
  
  content += `import { ${Array.from(imports).join(", ")} } from "drizzle-orm/pg-core";\n`;
  content += `import { createInsertSchema } from "drizzle-zod";\n`;
  content += `import { z } from "zod";\n\n`;
  
  for (const table of config.tables) {
    content += `export const ${table.name} = pgTable("${table.name}", {\n`;
    
    for (const col of table.columns) {
      content += `  ${col.name}: ${mapTypeToDrizzle(col)}`;
      
      if (col.primaryKey) {
        content += `.primaryKey()`;
      }
      if (!col.nullable && !col.primaryKey) {
        content += `.notNull()`;
      }
      if (col.unique) {
        content += `.unique()`;
      }
      if (col.default) {
        content += `.default(${col.default})`;
      }
      
      content += `,\n`;
    }
    
    content += `});\n\n`;
    
    const insertSchemaName = `insert${capitalize(table.name)}Schema`;
    content += `export const ${insertSchemaName} = createInsertSchema(${table.name})`;
    
    const autoFields = table.columns.filter(c => c.primaryKey || c.name === "createdAt" || c.name === "updatedAt");
    if (autoFields.length > 0) {
      content += `.omit({ ${autoFields.map(f => `${f.name}: true`).join(", ")} })`;
    }
    content += `;\n`;
    
    content += `export type Insert${capitalize(table.name)} = z.infer<typeof ${insertSchemaName}>;\n`;
    content += `export type ${capitalize(table.name)} = typeof ${table.name}.$inferSelect;\n\n`;
  }
  
  return content;
}

function generateSqliteSchema(config: DatabaseConfig): string {
  let content = `import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";\n`;
  content += `import { createInsertSchema } from "drizzle-zod";\n`;
  content += `import { z } from "zod";\n\n`;
  
  for (const table of config.tables) {
    content += `export const ${table.name} = sqliteTable("${table.name}", {\n`;
    
    for (const col of table.columns) {
      content += `  ${col.name}: ${mapTypeToSqlite(col)}`;
      
      if (col.primaryKey) {
        content += `.primaryKey()`;
      }
      if (!col.nullable && !col.primaryKey) {
        content += `.notNull()`;
      }
      if (col.default) {
        content += `.default(${col.default})`;
      }
      
      content += `,\n`;
    }
    
    content += `});\n\n`;
  }
  
  return content;
}

async function generateDbConnectionFile(projectId: number, config: DatabaseConfig): Promise<void> {
  const workspacePath = workspaceService.getWorkspacePath(projectId);
  const dbDir = path.join(workspacePath, "db");
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  let connectionContent = "";
  
  if (config.type === "postgresql") {
    connectionContent = `import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL nao configurada");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
`;
  } else if (config.type === "sqlite") {
    connectionContent = `import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database("data.db");
export const db = drizzle(sqlite, { schema });
`;
  }
  
  const indexPath = path.join(dbDir, "index.ts");
  fs.writeFileSync(indexPath, connectionContent, "utf-8");
}

function mapTypeToDrizzleImport(type: string): string {
  const typeMap: Record<string, string> = {
    serial: "serial",
    integer: "integer",
    bigint: "bigint",
    text: "text",
    varchar: "varchar",
    boolean: "boolean",
    timestamp: "timestamp",
    date: "date",
    json: "json",
    jsonb: "jsonb",
    real: "real",
    doublePrecision: "doublePrecision",
    uuid: "uuid",
  };
  return typeMap[type.toLowerCase()] || "text";
}

function mapTypeToDrizzle(col: ColumnSchema): string {
  const type = col.type.toLowerCase();
  
  if (type === "serial" || type === "id") {
    return `serial("${col.name}")`;
  }
  if (type === "integer" || type === "int") {
    return `integer("${col.name}")`;
  }
  if (type === "text" || type === "string") {
    return `text("${col.name}")`;
  }
  if (type === "varchar") {
    return `varchar("${col.name}", { length: 255 })`;
  }
  if (type === "boolean" || type === "bool") {
    return `boolean("${col.name}")`;
  }
  if (type === "timestamp" || type === "datetime") {
    return `timestamp("${col.name}")`;
  }
  if (type === "date") {
    return `date("${col.name}")`;
  }
  if (type === "json" || type === "jsonb") {
    return `jsonb("${col.name}")`;
  }
  if (type === "uuid") {
    return `uuid("${col.name}")`;
  }
  
  return `text("${col.name}")`;
}

function mapTypeToSqlite(col: ColumnSchema): string {
  const type = col.type.toLowerCase();
  
  if (type === "integer" || type === "int" || type === "serial" || type === "id") {
    return `integer("${col.name}")`;
  }
  if (type === "real" || type === "float" || type === "double") {
    return `real("${col.name}")`;
  }
  if (type === "blob") {
    return `blob("${col.name}")`;
  }
  
  return `text("${col.name}")`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function detectTablesFromDescription(description: string): TableSchema[] {
  const tables: TableSchema[] = [];
  
  const patterns: Array<{ pattern: RegExp; table: TableSchema }> = [
    {
      pattern: /usuarios?|users?|contas?|accounts?|login|cadastro/i,
      table: {
        name: "users",
        columns: [
          { name: "id", type: "serial", primaryKey: true },
          { name: "email", type: "varchar", unique: true },
          { name: "password", type: "text" },
          { name: "name", type: "varchar" },
          { name: "createdAt", type: "timestamp", default: "now()" },
        ],
      },
    },
    {
      pattern: /produtos?|products?|itens?|items?/i,
      table: {
        name: "products",
        columns: [
          { name: "id", type: "serial", primaryKey: true },
          { name: "name", type: "varchar" },
          { name: "description", type: "text", nullable: true },
          { name: "price", type: "real" },
          { name: "stock", type: "integer", default: "0" },
          { name: "createdAt", type: "timestamp", default: "now()" },
        ],
      },
    },
    {
      pattern: /pedidos?|orders?|compras?|vendas?/i,
      table: {
        name: "orders",
        columns: [
          { name: "id", type: "serial", primaryKey: true },
          { name: "userId", type: "integer", references: { table: "users", column: "id" } },
          { name: "total", type: "real" },
          { name: "status", type: "varchar", default: "'pending'" },
          { name: "createdAt", type: "timestamp", default: "now()" },
        ],
      },
    },
    {
      pattern: /posts?|artigos?|articles?|publicacoes?/i,
      table: {
        name: "posts",
        columns: [
          { name: "id", type: "serial", primaryKey: true },
          { name: "title", type: "varchar" },
          { name: "content", type: "text" },
          { name: "authorId", type: "integer", references: { table: "users", column: "id" }, nullable: true },
          { name: "published", type: "boolean", default: "false" },
          { name: "createdAt", type: "timestamp", default: "now()" },
        ],
      },
    },
    {
      pattern: /comentarios?|comments?/i,
      table: {
        name: "comments",
        columns: [
          { name: "id", type: "serial", primaryKey: true },
          { name: "content", type: "text" },
          { name: "postId", type: "integer", references: { table: "posts", column: "id" } },
          { name: "authorId", type: "integer", references: { table: "users", column: "id" }, nullable: true },
          { name: "createdAt", type: "timestamp", default: "now()" },
        ],
      },
    },
    {
      pattern: /categorias?|categories?/i,
      table: {
        name: "categories",
        columns: [
          { name: "id", type: "serial", primaryKey: true },
          { name: "name", type: "varchar" },
          { name: "slug", type: "varchar", unique: true },
          { name: "parentId", type: "integer", nullable: true },
        ],
      },
    },
    {
      pattern: /tarefas?|tasks?|todos?/i,
      table: {
        name: "tasks",
        columns: [
          { name: "id", type: "serial", primaryKey: true },
          { name: "title", type: "varchar" },
          { name: "description", type: "text", nullable: true },
          { name: "completed", type: "boolean", default: "false" },
          { name: "userId", type: "integer", references: { table: "users", column: "id" }, nullable: true },
          { name: "createdAt", type: "timestamp", default: "now()" },
        ],
      },
    },
  ];
  
  const seenTables = new Set<string>();
  
  for (const { pattern, table } of patterns) {
    if (pattern.test(description) && !seenTables.has(table.name)) {
      tables.push(table);
      seenTables.add(table.name);
    }
  }
  
  return tables;
}

export async function setupDatabaseFromDescription(projectId: number, description: string): Promise<DatabaseConfig> {
  const tables = detectTablesFromDescription(description);
  
  const config = await initializeDatabase(projectId, {
    type: "postgresql",
    tables,
  });
  
  return config;
}
