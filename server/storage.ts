import {
  users,
  projects,
  conversations,
  messages,
  agentTasks,
  agentSettings,
  projectFiles,
  checkpoints,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type AgentTask,
  type InsertAgentTask,
  type AgentSettings,
  type InsertAgentSettings,
  type ProjectFile,
  type Checkpoint,
  type InsertCheckpoint,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Project operations
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;

  // Conversation operations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<void>;

  // Message operations
  getMessages(conversationId: number): Promise<Message[]>;
  getConversationMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Agent Task operations
  getConversationTasks(conversationId: number): Promise<AgentTask[]>;
  createAgentTask(task: InsertAgentTask): Promise<AgentTask>;
  updateAgentTask(id: number, updates: Partial<InsertAgentTask> & { completedAt?: Date }): Promise<AgentTask | undefined>;

  // Agent Settings operations
  getAgentSettings(userId: string): Promise<AgentSettings | undefined>;
  upsertAgentSettings(settings: InsertAgentSettings): Promise<AgentSettings>;

  // Project Files operations
  getProjectFiles(projectId: number): Promise<ProjectFile[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First try to find existing user by id
    if (userData.id) {
      const existingById = await this.getUser(userData.id);
      if (existingById) {
        const [user] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userData.id))
          .returning();
        return user;
      }
    }
    
    // Check if email already exists (for test users that might have same email)
    if (userData.email) {
      const [existingByEmail] = await db.select().from(users).where(eq(users.email, userData.email));
      if (existingByEmail) {
        // Update existing user
        const [user] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email))
          .returning();
        return user;
      }
    }
    
    // Insert new user
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Project operations
  async getProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Conversation operations
  async getConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async updateConversation(id: number, updates: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  // Message operations
  async getMessages(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return this.getMessages(conversationId);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    
    // Update conversation timestamp
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, message.conversationId));
    
    return newMessage;
  }

  // Agent Task operations
  async getConversationTasks(conversationId: number): Promise<AgentTask[]> {
    return await db
      .select()
      .from(agentTasks)
      .where(eq(agentTasks.conversationId, conversationId))
      .orderBy(desc(agentTasks.startedAt));
  }

  async createAgentTask(task: InsertAgentTask): Promise<AgentTask> {
    const [newTask] = await db.insert(agentTasks).values(task).returning();
    return newTask;
  }

  async updateAgentTask(id: number, updates: Partial<InsertAgentTask> & { completedAt?: Date }): Promise<AgentTask | undefined> {
    const [updated] = await db
      .update(agentTasks)
      .set(updates)
      .where(eq(agentTasks.id, id))
      .returning();
    return updated;
  }

  // Agent Settings operations
  async getAgentSettings(userId: string): Promise<AgentSettings | undefined> {
    const [settings] = await db
      .select()
      .from(agentSettings)
      .where(eq(agentSettings.userId, userId));
    return settings;
  }

  async upsertAgentSettings(settings: InsertAgentSettings): Promise<AgentSettings> {
    const existing = await this.getAgentSettings(settings.userId);
    
    if (existing) {
      const [updated] = await db
        .update(agentSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(agentSettings.userId, settings.userId))
        .returning();
      return updated;
    }
    
    const [newSettings] = await db
      .insert(agentSettings)
      .values(settings)
      .returning();
    return newSettings;
  }

  // Project Files operations
  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(projectFiles.path);
  }

  // Checkpoint operations
  async getCheckpoints(projectId: number): Promise<Checkpoint[]> {
    return await db
      .select()
      .from(checkpoints)
      .where(eq(checkpoints.projectId, projectId))
      .orderBy(desc(checkpoints.createdAt));
  }

  async getCheckpoint(id: number): Promise<Checkpoint | undefined> {
    const [checkpoint] = await db.select().from(checkpoints).where(eq(checkpoints.id, id));
    return checkpoint;
  }

  async createCheckpoint(checkpoint: InsertCheckpoint): Promise<Checkpoint> {
    const [newCheckpoint] = await db.insert(checkpoints).values(checkpoint).returning();
    return newCheckpoint;
  }

  async deleteCheckpoint(id: number): Promise<void> {
    await db.delete(checkpoints).where(eq(checkpoints.id, id));
  }
}

export const storage = new DatabaseStorage();
