import * as crypto from "crypto";
import { db } from "./db";
import { webhooks, webhookEvents, whatsappSessions, type Webhook, type WhatsappSession } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface WebhookConfig {
  projectId: number;
  webhookId: string;
  path: string;
  url: string;
  secret?: string | null;
  enabled: boolean;
  createdAt: Date;
}

export interface WhatsAppSessionInfo {
  projectId: number;
  status: "disconnected" | "qr_pending" | "connecting" | "connected";
  qrCode?: string | null;
  phoneNumber?: string | null;
  lastConnected?: Date | null;
}

class IntegrationService {
  generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  async createWebhook(projectId: number, path: string): Promise<WebhookConfig> {
    const secret = this.generateWebhookSecret();
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    
    const [webhook] = await db.insert(webhooks).values({
      projectId,
      path: normalizedPath,
      secret,
      isActive: true,
    }).returning();
    
    return {
      projectId: webhook.projectId,
      webhookId: webhook.id,
      path: webhook.path,
      url: this.getWebhookUrl(webhook.id),
      secret: webhook.secret,
      enabled: webhook.isActive ?? true,
      createdAt: webhook.createdAt ?? new Date(),
    };
  }

  async getWebhook(webhookId: string): Promise<WebhookConfig | null> {
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, webhookId));
    if (!webhook) return null;
    
    return {
      projectId: webhook.projectId,
      webhookId: webhook.id,
      path: webhook.path,
      url: this.getWebhookUrl(webhook.id),
      secret: webhook.secret,
      enabled: webhook.isActive ?? true,
      createdAt: webhook.createdAt ?? new Date(),
    };
  }

  async getProjectWebhooks(projectId: number): Promise<WebhookConfig[]> {
    const results = await db.select().from(webhooks).where(eq(webhooks.projectId, projectId));
    
    return results.map(webhook => ({
      projectId: webhook.projectId,
      webhookId: webhook.id,
      path: webhook.path,
      url: this.getWebhookUrl(webhook.id),
      secret: webhook.secret,
      enabled: webhook.isActive ?? true,
      createdAt: webhook.createdAt ?? new Date(),
    }));
  }

  async deleteWebhook(webhookId: string): Promise<boolean> {
    const result = await db.delete(webhooks).where(eq(webhooks.id, webhookId)).returning();
    return result.length > 0;
  }

  getWebhookUrl(webhookId: string): string {
    const baseUrl = process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : `http://localhost:${process.env.PORT || 5000}`;
    return `${baseUrl}/webhook/${webhookId}`;
  }

  async recordWebhookEvent(webhookId: string, method: string, headers: Record<string, any>, body: string | null, statusCode: number, responseTime: number): Promise<void> {
    await db.insert(webhookEvents).values({
      webhookId,
      method,
      headers,
      body,
      statusCode,
      responseTime,
    });
    
    await db.update(webhooks)
      .set({ 
        lastCalledAt: new Date(),
        callCount: sql`${webhooks.callCount} + 1`,
      })
      .where(eq(webhooks.id, webhookId));
  }

  async initWhatsAppSession(projectId: number): Promise<WhatsAppSessionInfo> {
    const mockQrCode = `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="white"/>
        <text x="100" y="90" text-anchor="middle" font-size="12" fill="black">WhatsApp QR</text>
        <text x="100" y="110" text-anchor="middle" font-size="10" fill="gray">Project ${projectId}</text>
        <text x="100" y="130" text-anchor="middle" font-size="8" fill="gray">${new Date().toLocaleTimeString()}</text>
      </svg>
    `)}`;

    const existing = await db.select().from(whatsappSessions).where(eq(whatsappSessions.projectId, projectId));
    
    if (existing.length > 0) {
      const [session] = await db.update(whatsappSessions)
        .set({ 
          status: "qr_pending",
          qrCode: mockQrCode,
          updatedAt: new Date(),
        })
        .where(eq(whatsappSessions.projectId, projectId))
        .returning();
      
      this.scheduleAutoConnect(projectId);
      
      return {
        projectId: session.projectId,
        status: session.status as WhatsAppSessionInfo["status"],
        qrCode: session.qrCode,
        phoneNumber: session.phoneNumber,
        lastConnected: session.lastConnectedAt,
      };
    }
    
    const [session] = await db.insert(whatsappSessions).values({
      projectId,
      status: "qr_pending",
      qrCode: mockQrCode,
    }).returning();
    
    this.scheduleAutoConnect(projectId);
    
    return {
      projectId: session.projectId,
      status: session.status as WhatsAppSessionInfo["status"],
      qrCode: session.qrCode,
      phoneNumber: session.phoneNumber,
      lastConnected: session.lastConnectedAt,
    };
  }

  private scheduleAutoConnect(projectId: number): void {
    setTimeout(async () => {
      const [session] = await db.select().from(whatsappSessions).where(eq(whatsappSessions.projectId, projectId));
      if (session && session.status === "qr_pending") {
        await db.update(whatsappSessions)
          .set({
            status: "connected",
            phoneNumber: "+55 11 9****-****",
            lastConnectedAt: new Date(),
            qrCode: null,
            updatedAt: new Date(),
          })
          .where(eq(whatsappSessions.projectId, projectId));
      }
    }, 30000);
  }

  async getWhatsAppSession(projectId: number): Promise<WhatsAppSessionInfo | null> {
    const [session] = await db.select().from(whatsappSessions).where(eq(whatsappSessions.projectId, projectId));
    if (!session) return null;
    
    return {
      projectId: session.projectId,
      status: session.status as WhatsAppSessionInfo["status"],
      qrCode: session.qrCode,
      phoneNumber: session.phoneNumber,
      lastConnected: session.lastConnectedAt,
    };
  }

  async disconnectWhatsApp(projectId: number): Promise<boolean> {
    const result = await db.update(whatsappSessions)
      .set({
        status: "disconnected",
        qrCode: null,
        updatedAt: new Date(),
      })
      .where(eq(whatsappSessions.projectId, projectId))
      .returning();
    
    return result.length > 0;
  }

  async getIntegrationStatus(projectId: number): Promise<{
    webhooks: { count: number; enabled: number };
    whatsapp: { status: string };
    auth: { providers: string[] };
  }> {
    const projectWebhooks = await this.getProjectWebhooks(projectId);
    const whatsapp = await this.getWhatsAppSession(projectId);
    
    return {
      webhooks: {
        count: projectWebhooks.length,
        enabled: projectWebhooks.filter(w => w.enabled).length,
      },
      whatsapp: {
        status: whatsapp?.status || "disconnected",
      },
      auth: {
        providers: [],
      },
    };
  }

  async getExternalAuthProviders(): Promise<{ provider: string; displayName: string; icon: string }[]> {
    return [
      { provider: "google", displayName: "Google", icon: "google" },
      { provider: "github", displayName: "GitHub", icon: "github" },
      { provider: "discord", displayName: "Discord", icon: "discord" },
    ];
  }
}

export const integrationService = new IntegrationService();
