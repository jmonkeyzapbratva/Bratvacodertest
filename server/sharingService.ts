import { storage } from "./storage";
import crypto from "crypto";

export interface ProjectShare {
  id: string;
  projectId: number;
  ownerId: string;
  shareType: "view" | "edit" | "admin";
  shareLink?: string;
  sharedWith?: string[];
  password?: string;
  expiresAt?: Date;
  createdAt: Date;
  accessCount: number;
}

export interface SharePermission {
  userId: string;
  permission: "view" | "edit" | "admin";
  addedAt: Date;
  addedBy: string;
}

const shareLinks = new Map<string, ProjectShare>();
const projectPermissions = new Map<number, SharePermission[]>();

function generateShareId(): string {
  return crypto.randomBytes(12).toString("base64url");
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function createShareLink(
  projectId: number,
  ownerId: string,
  options: {
    shareType?: "view" | "edit";
    password?: string;
    expiresIn?: number;
  } = {}
): Promise<ProjectShare> {
  const shareId = generateShareId();
  
  const share: ProjectShare = {
    id: shareId,
    projectId,
    ownerId,
    shareType: options.shareType || "view",
    shareLink: `/share/${shareId}`,
    password: options.password ? hashPassword(options.password) : undefined,
    expiresAt: options.expiresIn 
      ? new Date(Date.now() + options.expiresIn * 1000) 
      : undefined,
    createdAt: new Date(),
    accessCount: 0,
  };
  
  shareLinks.set(shareId, share);
  
  return {
    ...share,
    password: options.password ? "[protected]" : undefined,
  };
}

export async function getShareByLink(shareId: string, password?: string): Promise<{
  valid: boolean;
  share?: ProjectShare;
  error?: string;
}> {
  const share = shareLinks.get(shareId);
  
  if (!share) {
    return { valid: false, error: "Link de compartilhamento invalido" };
  }
  
  if (share.expiresAt && new Date() > share.expiresAt) {
    shareLinks.delete(shareId);
    return { valid: false, error: "Link expirado" };
  }
  
  if (share.password) {
    if (!password) {
      return { valid: false, error: "Senha necessaria" };
    }
    if (hashPassword(password) !== share.password) {
      return { valid: false, error: "Senha incorreta" };
    }
  }
  
  share.accessCount++;
  
  return { 
    valid: true, 
    share: {
      ...share,
      password: share.password ? "[protected]" : undefined,
    },
  };
}

export async function revokeShareLink(shareId: string, userId: string): Promise<boolean> {
  const share = shareLinks.get(shareId);
  
  if (!share) {
    return false;
  }
  
  if (share.ownerId !== userId) {
    return false;
  }
  
  shareLinks.delete(shareId);
  return true;
}

export async function getProjectShareLinks(projectId: number, userId: string): Promise<ProjectShare[]> {
  const shares: ProjectShare[] = [];
  
  shareLinks.forEach((share, id) => {
    if (share.projectId === projectId && share.ownerId === userId) {
      shares.push({
        ...share,
        password: share.password ? "[protected]" : undefined,
      });
    }
  });
  
  return shares;
}

export async function addCollaborator(
  projectId: number,
  ownerId: string,
  collaboratorId: string,
  permission: "view" | "edit" | "admin"
): Promise<SharePermission> {
  let permissions = projectPermissions.get(projectId);
  if (!permissions) {
    permissions = [];
    projectPermissions.set(projectId, permissions);
  }
  
  const existing = permissions.find(p => p.userId === collaboratorId);
  if (existing) {
    existing.permission = permission;
    return existing;
  }
  
  const newPermission: SharePermission = {
    userId: collaboratorId,
    permission,
    addedAt: new Date(),
    addedBy: ownerId,
  };
  
  permissions.push(newPermission);
  return newPermission;
}

export async function removeCollaborator(
  projectId: number,
  userId: string
): Promise<boolean> {
  const permissions = projectPermissions.get(projectId);
  if (!permissions) {
    return false;
  }
  
  const index = permissions.findIndex(p => p.userId === userId);
  if (index === -1) {
    return false;
  }
  
  permissions.splice(index, 1);
  return true;
}

export async function getProjectCollaborators(projectId: number): Promise<SharePermission[]> {
  return projectPermissions.get(projectId) || [];
}

export async function checkAccess(
  projectId: number,
  userId: string
): Promise<{ hasAccess: boolean; permission?: "view" | "edit" | "admin" | "owner" }> {
  try {
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return { hasAccess: false };
    }
    
    if (project.userId === userId) {
      return { hasAccess: true, permission: "owner" };
    }
    
    const permissions = projectPermissions.get(projectId);
    if (permissions) {
      const userPermission = permissions.find(p => p.userId === userId);
      if (userPermission) {
        return { hasAccess: true, permission: userPermission.permission };
      }
    }
    
    return { hasAccess: false };
  } catch (error) {
    return { hasAccess: false };
  }
}

export async function forkProject(
  projectId: number,
  userId: string
): Promise<{ success: boolean; newProjectId?: number; error?: string }> {
  try {
    const original = await storage.getProject(projectId);
    
    if (!original) {
      return { success: false, error: "Projeto nao encontrado" };
    }
    
    const newProject = await storage.createProject({
      name: `${original.name} (Fork)`,
      description: original.description ? `Fork de: ${original.description}` : "Projeto forkado",
      userId,
      templateType: original.templateType || "custom",
    });
    
    return { success: true, newProjectId: newProject.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSharedWithMe(userId: string): Promise<{
  projectId: number;
  permission: "view" | "edit" | "admin";
}[]> {
  const shared: { projectId: number; permission: "view" | "edit" | "admin" }[] = [];
  
  projectPermissions.forEach((permissions, projectId) => {
    const userPermission = permissions.find(p => p.userId === userId);
    if (userPermission) {
      shared.push({
        projectId,
        permission: userPermission.permission,
      });
    }
  });
  
  return shared;
}
