import { db, pool } from "./db";
import { sql } from "drizzle-orm";

export interface TableInfo {
  name: string;
  rowCount: number;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary: boolean;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: string[];
  executionTime: number;
}

class DatabaseViewerService {
  async getTables(): Promise<TableInfo[]> {
    try {
      const result = await pool.query(`
        SELECT 
          t.table_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name
      `);

      const tables: TableInfo[] = [];
      
      for (const row of result.rows) {
        const tableName = row.table_name as string;
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
        const columns = await this.getTableColumns(tableName);
        
        tables.push({
          name: tableName,
          rowCount: parseInt(countResult.rows[0]?.count || '0'),
          columns,
        });
      }

      return tables;
    } catch (error) {
      console.error("[DatabaseViewer] Error getting tables:", error);
      return [];
    }
  }

  async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    try {
      const result = await pool.query(`
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = $1 
          AND tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.column_name = pk.column_name
        WHERE c.table_name = $1 AND c.table_schema = 'public'
        ORDER BY c.ordinal_position
      `, [tableName]);

      return result.rows.map(row => ({
        name: row.column_name as string,
        type: row.data_type as string,
        nullable: row.is_nullable === 'YES',
        isPrimary: row.is_primary as boolean,
      }));
    } catch (error) {
      console.error(`[DatabaseViewer] Error getting columns for ${tableName}:`, error);
      return [];
    }
  }

  async getTableData(tableName: string, limit = 100, offset = 0): Promise<QueryResult> {
    const start = Date.now();
    try {
      const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
      const result = await pool.query(
        `SELECT * FROM "${safeTableName}" LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const countResult = await pool.query(`SELECT COUNT(*) as total FROM "${safeTableName}"`);

      return {
        rows: result.rows,
        rowCount: parseInt(countResult.rows[0]?.total || '0'),
        fields: result.fields.map(f => f.name),
        executionTime: Date.now() - start,
      };
    } catch (error) {
      console.error(`[DatabaseViewer] Error getting data from ${tableName}:`, error);
      throw error;
    }
  }

  async executeQuery(query: string): Promise<QueryResult> {
    const start = Date.now();
    
    const normalizedQuery = query.trim().toUpperCase();
    const isReadOnly = normalizedQuery.startsWith('SELECT') || 
                       normalizedQuery.startsWith('EXPLAIN') ||
                       normalizedQuery.startsWith('SHOW');

    if (!isReadOnly) {
      throw new Error("Apenas consultas SELECT são permitidas por segurança");
    }

    try {
      const result = await pool.query(query);

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        fields: result.fields?.map(f => f.name) || [],
        executionTime: Date.now() - start,
      };
    } catch (error: any) {
      console.error("[DatabaseViewer] Query error:", error);
      throw new Error(error.message || "Erro ao executar consulta");
    }
  }
}

export const databaseViewerService = new DatabaseViewerService();
