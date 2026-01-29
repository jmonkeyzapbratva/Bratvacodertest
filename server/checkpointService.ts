/**
 * Checkpoint Service - Sistema de snapshots e rollback com persistência no banco
 */

import { db } from "./db";
import { projects, checkpoints } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { workspaceService } from "./workspaceService";

interface CheckpointData {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  filesSnapshot: Record<string, string>;
  conversationSnapshot: any;
  createdBy: string;
  createdAt: Date;
}

interface CheckpointDiff {
  file: string;
  status: "added" | "modified" | "deleted";
  linesAdded: number;
  linesRemoved: number;
}

class CheckpointService {
  /**
   * Cria um novo checkpoint persistente no banco de dados
   */
  async createCheckpoint(
    projectId: number,
    name: string,
    description: string,
    trigger: "manual" | "auto" | "before_major_change" = "auto"
  ): Promise<CheckpointData> {
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    
    if (!project.length) {
      throw new Error("Projeto não encontrado");
    }

    const filesSnapshot: Record<string, string> = {};
    const projectData = project[0];
    
    if (projectData.generatedCode) {
      try {
        const files = typeof projectData.generatedCode === 'string' 
          ? JSON.parse(projectData.generatedCode)
          : projectData.generatedCode;
        
        if (Array.isArray(files)) {
          for (const file of files) {
            if (file.filename && file.content) {
              filesSnapshot[file.filename] = file.content;
            }
          }
        }
      } catch (e) {
        console.error("Erro ao parsear código do projeto:", e);
      }
    }

    const [checkpoint] = await db.insert(checkpoints).values({
      projectId,
      name,
      description,
      filesSnapshot,
      conversationSnapshot: null,
      createdBy: trigger,
    }).returning();

    return {
      id: checkpoint.id,
      projectId: checkpoint.projectId,
      name: checkpoint.name,
      description: checkpoint.description,
      filesSnapshot: checkpoint.filesSnapshot as Record<string, string>,
      conversationSnapshot: checkpoint.conversationSnapshot,
      createdBy: checkpoint.createdBy || "auto",
      createdAt: checkpoint.createdAt!,
    };
  }

  /**
   * Lista todos os checkpoints de um projeto (mais recentes primeiro)
   */
  async listCheckpoints(projectId: number): Promise<CheckpointData[]> {
    const rows = await db.select()
      .from(checkpoints)
      .where(eq(checkpoints.projectId, projectId))
      .orderBy(desc(checkpoints.createdAt));

    return rows.map(row => ({
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      description: row.description,
      filesSnapshot: row.filesSnapshot as Record<string, string>,
      conversationSnapshot: row.conversationSnapshot,
      createdBy: row.createdBy || "auto",
      createdAt: row.createdAt!,
    }));
  }

  /**
   * Restaura um checkpoint específico
   */
  async restoreCheckpoint(projectId: number, checkpointId: number): Promise<{
    success: boolean;
    message: string;
    restoredFiles: string[];
  }> {
    const [checkpoint] = await db.select()
      .from(checkpoints)
      .where(eq(checkpoints.id, checkpointId))
      .limit(1);

    if (!checkpoint) {
      return { success: false, message: "Checkpoint não encontrado", restoredFiles: [] };
    }

    if (checkpoint.projectId !== projectId) {
      return { success: false, message: "Checkpoint não pertence a este projeto", restoredFiles: [] };
    }

    const filesSnapshot = checkpoint.filesSnapshot as Record<string, string>;
    const files = Object.entries(filesSnapshot).map(([filename, content]) => ({
      filename,
      content
    }));

    try {
      await workspaceService.clearAndRestoreWorkspace(projectId, filesSnapshot);

      await db.update(projects)
        .set({ generatedCode: JSON.stringify(files) })
        .where(eq(projects.id, projectId));

      return {
        success: true,
        message: `Checkpoint "${checkpoint.name}" restaurado com sucesso`,
        restoredFiles: Object.keys(filesSnapshot)
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Erro ao restaurar: ${e.message}`,
        restoredFiles: []
      };
    }
  }

  /**
   * Compara dois checkpoints
   */
  async compareCheckpoints(
    projectId: number,
    checkpointId1: number,
    checkpointId2: number
  ): Promise<CheckpointDiff[]> {
    const [cp1] = await db.select().from(checkpoints).where(eq(checkpoints.id, checkpointId1)).limit(1);
    const [cp2] = await db.select().from(checkpoints).where(eq(checkpoints.id, checkpointId2)).limit(1);

    if (!cp1 || !cp2) {
      return [];
    }

    const files1 = cp1.filesSnapshot as Record<string, string>;
    const files2 = cp2.filesSnapshot as Record<string, string>;
    const diffs: CheckpointDiff[] = [];
    const allFiles = Array.from(new Set([...Object.keys(files1), ...Object.keys(files2)]));

    for (const file of allFiles) {
      const content1 = files1[file];
      const content2 = files2[file];

      if (!content1) {
        diffs.push({ file, status: "added", linesAdded: content2.split("\n").length, linesRemoved: 0 });
      } else if (!content2) {
        diffs.push({ file, status: "deleted", linesAdded: 0, linesRemoved: content1.split("\n").length });
      } else if (content1 !== content2) {
        const lines1 = content1.split("\n").length;
        const lines2 = content2.split("\n").length;
        diffs.push({ 
          file, 
          status: "modified", 
          linesAdded: Math.max(0, lines2 - lines1), 
          linesRemoved: Math.max(0, lines1 - lines2) 
        });
      }
    }

    return diffs;
  }

  /**
   * Deleta um checkpoint
   */
  async deleteCheckpoint(projectId: number, checkpointId: number): Promise<boolean> {
    const [checkpoint] = await db.select()
      .from(checkpoints)
      .where(eq(checkpoints.id, checkpointId))
      .limit(1);

    if (!checkpoint || checkpoint.projectId !== projectId) {
      return false;
    }

    await db.delete(checkpoints).where(eq(checkpoints.id, checkpointId));
    return true;
  }

  /**
   * Cria checkpoint automático antes de grandes mudanças
   */
  async createAutoCheckpoint(projectId: number, reason: string): Promise<CheckpointData | null> {
    try {
      return await this.createCheckpoint(
        projectId,
        `Auto: ${reason}`,
        `Checkpoint automático criado antes de: ${reason}`,
        "before_major_change"
      );
    } catch (e) {
      console.error("Erro ao criar checkpoint automático:", e);
      return null;
    }
  }

  /**
   * Obtém o último checkpoint de um projeto
   */
  async getLatestCheckpoint(projectId: number): Promise<CheckpointData | null> {
    const [checkpoint] = await db.select()
      .from(checkpoints)
      .where(eq(checkpoints.projectId, projectId))
      .orderBy(desc(checkpoints.createdAt))
      .limit(1);

    if (!checkpoint) return null;

    return {
      id: checkpoint.id,
      projectId: checkpoint.projectId,
      name: checkpoint.name,
      description: checkpoint.description,
      filesSnapshot: checkpoint.filesSnapshot as Record<string, string>,
      conversationSnapshot: checkpoint.conversationSnapshot,
      createdBy: checkpoint.createdBy || "auto",
      createdAt: checkpoint.createdAt!,
    };
  }
}

export const checkpointService = new CheckpointService();
