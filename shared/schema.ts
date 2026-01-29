import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  serial,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Projects table - stores generated code projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  templateType: varchar("template_type", { length: 50 }).notNull(),
  generatedCode: text("generated_code"),
  language: varchar("language", { length: 50 }).default("javascript"),
  githubRepo: varchar("github_repo", { length: 255 }),
  // New fields for full project management
  status: varchar("status", { length: 30 }).default("draft"), // draft, ready, running, stopped, error
  runtimeStatus: varchar("runtime_status", { length: 30 }).default("idle"), // idle, starting, running, stopping, crashed
  entryPoint: varchar("entry_point", { length: 255 }).default("index.js"),
  startCommand: varchar("start_command", { length: 500 }).default("npm start"),
  port: integer("port").default(3000),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRunAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Project Files - stores all files in a project
export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  path: varchar("path", { length: 500 }).notNull(), // e.g., "src/index.js", "package.json"
  content: text("content").notNull(),
  isDirectory: boolean("is_directory").default(false),
  mimeType: varchar("mime_type", { length: 100 }),
  version: integer("version").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
export type ProjectFile = typeof projectFiles.$inferSelect;

// Project Secrets - encrypted API keys and tokens
export const projectSecrets = pgTable("project_secrets", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // e.g., "OPENAI_API_KEY", "WHATSAPP_TOKEN"
  encryptedValue: text("encrypted_value").notNull(),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSecretSchema = createInsertSchema(projectSecrets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectSecret = z.infer<typeof insertProjectSecretSchema>;
export type ProjectSecret = typeof projectSecrets.$inferSelect;

// Project Runs - execution history and logs
export const projectRuns = pgTable("project_runs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).notNull().default("pending"), // pending, running, success, failed, stopped
  command: varchar("command", { length: 500 }).notNull(),
  logs: text("logs"),
  exitCode: integer("exit_code"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  metadata: jsonb("metadata"), // Extra data like memory usage, etc.
});

export const insertProjectRunSchema = createInsertSchema(projectRuns).omit({
  id: true,
  startedAt: true,
  endedAt: true,
});

export type InsertProjectRun = z.infer<typeof insertProjectRunSchema>;
export type ProjectRun = typeof projectRuns.$inferSelect;

// Conversations table - stores chat conversations
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).default("Nova Conversa"),
  status: varchar("status", { length: 30 }).default("collecting_requirements"), // collecting_requirements, generating_code, completed
  projectType: varchar("project_type", { length: 100 }), // Detected project type
  metadata: jsonb("metadata"), // Extra context data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages table - stores individual chat messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' or 'assistant'
  messageType: varchar("message_type", { length: 20 }).default("text"), // text, question, code, system
  content: text("content").notNull(),
  codeGenerated: text("code_generated"),
  metadata: jsonb("metadata"), // Extra data like detected intent, language, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Relations - defined AFTER all tables are declared
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  conversations: many(conversations),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  files: many(projectFiles),
  secrets: many(projectSecrets),
  runs: many(projectRuns),
}));

export const projectFilesRelations = relations(projectFiles, ({ one }) => ({
  project: one(projects, {
    fields: [projectFiles.projectId],
    references: [projects.id],
  }),
}));

export const projectSecretsRelations = relations(projectSecrets, ({ one }) => ({
  project: one(projects, {
    fields: [projectSecrets.projectId],
    references: [projects.id],
  }),
}));

export const projectRunsRelations = relations(projectRuns, ({ one }) => ({
  project: one(projects, {
    fields: [projectRuns.projectId],
    references: [projects.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// Webhooks - persistent webhook configurations for projects
export const webhooks = pgTable("webhooks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  path: varchar("path", { length: 255 }).notNull(), // e.g., "/webhook", "/api/notify"
  secret: varchar("secret", { length: 64 }), // Optional secret for validation
  isActive: boolean("is_active").default(true),
  lastCalledAt: timestamp("last_called_at"),
  callCount: integer("call_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastCalledAt: true,
  callCount: true,
});

export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

// WhatsApp Sessions - persistent WhatsApp connection state
export const whatsappSessions = pgTable("whatsapp_sessions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }).unique(),
  status: varchar("status", { length: 30 }).notNull().default("disconnected"), // disconnected, qr_pending, connecting, connected
  qrCode: text("qr_code"), // Base64 QR code for scanning
  phoneNumber: varchar("phone_number", { length: 20 }),
  sessionData: text("session_data"), // Encrypted session data for reconnection
  lastConnectedAt: timestamp("last_connected_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWhatsappSessionSchema = createInsertSchema(whatsappSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastConnectedAt: true,
});

export type InsertWhatsappSession = z.infer<typeof insertWhatsappSessionSchema>;
export type WhatsappSession = typeof whatsappSessions.$inferSelect;

// Webhook Events - log of incoming webhook calls
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  webhookId: varchar("webhook_id", { length: 36 }).notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  method: varchar("method", { length: 10 }).notNull(), // GET, POST, PUT, DELETE
  headers: jsonb("headers"),
  body: text("body"),
  statusCode: integer("status_code").default(200),
  responseTime: integer("response_time"), // ms
  createdAt: timestamp("created_at").defaultNow(),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;

// Relations for webhooks and WhatsApp
export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  project: one(projects, {
    fields: [webhooks.projectId],
    references: [projects.id],
  }),
  events: many(webhookEvents),
}));

export const webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookEvents.webhookId],
    references: [webhooks.id],
  }),
}));

export const whatsappSessionsRelations = relations(whatsappSessions, ({ one }) => ({
  project: one(projects, {
    fields: [whatsappSessions.projectId],
    references: [projects.id],
  }),
}));

// Agent Tasks - tracks agent actions and progress
export const agentTasks = pgTable("agent_tasks", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }).notNull(), // thinking, writing_code, running_command, creating_file, etc.
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 30 }).notNull().default("pending"), // pending, running, completed, failed
  output: text("output"),
  metadata: jsonb("metadata"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertAgentTaskSchema = createInsertSchema(agentTasks).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export type InsertAgentTask = z.infer<typeof insertAgentTaskSchema>;
export type AgentTask = typeof agentTasks.$inferSelect;

export const agentTasksRelations = relations(agentTasks, ({ one }) => ({
  conversation: one(conversations, {
    fields: [agentTasks.conversationId],
    references: [conversations.id],
  }),
  project: one(projects, {
    fields: [agentTasks.projectId],
    references: [projects.id],
  }),
}));

// Agent Settings - user preferences for Agent behavior
export const agentSettings = pgTable("agent_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  mode: varchar("mode", { length: 20 }).default("autonomous"), // fast, autonomous
  operatingMode: varchar("operating_mode", { length: 20 }).default("build"), // build, plan, edit
  autonomyLevel: varchar("autonomy_level", { length: 20 }).default("high"), // low, medium, high, max
  buildApproach: varchar("build_approach", { length: 20 }).default("full-app"), // design-first, full-app
  extendedThinking: boolean("extended_thinking").default(false),
  appTesting: boolean("app_testing").default(true),
  webSearch: boolean("web_search").default(true),
  mediaGeneration: boolean("media_generation").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAgentSettingsSchema = createInsertSchema(agentSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgentSettings = z.infer<typeof insertAgentSettingsSchema>;
export type AgentSettings = typeof agentSettings.$inferSelect;

export const agentSettingsRelations = relations(agentSettings, ({ one }) => ({
  user: one(users, {
    fields: [agentSettings.userId],
    references: [users.id],
  }),
}));

// Checkpoints - project snapshots for rollback functionality
export const checkpoints = pgTable("checkpoints", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  filesSnapshot: jsonb("files_snapshot").notNull(), // JSON array of file paths and contents
  conversationSnapshot: jsonb("conversation_snapshot"), // Optional conversation state
  createdBy: varchar("created_by", { length: 50 }).default("auto"), // auto, manual
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({
  id: true,
  createdAt: true,
});

export type InsertCheckpoint = z.infer<typeof insertCheckpointSchema>;
export type Checkpoint = typeof checkpoints.$inferSelect;

export const checkpointsRelations = relations(checkpoints, ({ one }) => ({
  project: one(projects, {
    fields: [checkpoints.projectId],
    references: [projects.id],
  }),
}));

// Templates - predefined code templates
export const codeTemplates = [
  {
    id: "whatsapp-bot",
    name: "Bot WhatsApp",
    description: "Bot básico para WhatsApp usando a biblioteca Baileys",
    language: "javascript",
    icon: "MessageCircle",
  },
  {
    id: "rest-api",
    name: "API REST",
    description: "API REST completa com Express.js e validação",
    language: "javascript",
    icon: "Server",
  },
  {
    id: "landing-page",
    name: "Landing Page",
    description: "Página de apresentação responsiva com HTML/CSS/JS",
    language: "html",
    icon: "Layout",
  },
  {
    id: "python-automation",
    name: "Script Python",
    description: "Script de automação em Python com exemplos práticos",
    language: "python",
    icon: "Cog",
  },
  {
    id: "static-site",
    name: "Site Estático",
    description: "Site estático moderno com Tailwind CSS",
    language: "html",
    icon: "Globe",
  },
  {
    id: "php-crud",
    name: "CRUD PHP",
    description: "Sistema CRUD completo em PHP com MySQL",
    language: "php",
    icon: "Database",
  },
  {
    id: "html-css-portfolio",
    name: "Portfólio HTML/CSS",
    description: "Portfólio profissional com HTML e CSS puros",
    language: "html",
    icon: "User",
  },
  {
    id: "typescript-api",
    name: "API TypeScript",
    description: "API REST moderna com TypeScript e Express",
    language: "typescript",
    icon: "Code",
  },
] as const;

export type CodeTemplate = typeof codeTemplates[number];
