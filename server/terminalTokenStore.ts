import { randomBytes } from "crypto";

interface TokenData {
  userId: string;
  projectId?: number;
  expiresAt: number;
}

const TOKEN_TTL_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60000;

class TerminalTokenStore {
  private tokens = new Map<string, TokenData>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  generate(userId: string, projectId?: number): { token: string; expiresAt: Date } {
    const tokenBytes = randomBytes(32).toString("hex");
    const token = `term_${tokenBytes}`;
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    
    this.tokens.set(token, { userId, projectId, expiresAt });
    this.cleanup();
    
    return { token, expiresAt: new Date(expiresAt) };
  }

  validate(token: string): { valid: boolean; userId?: string; projectId?: number } {
    const data = this.tokens.get(token);
    
    if (!data) {
      return { valid: false };
    }
    
    if (data.expiresAt < Date.now()) {
      this.tokens.delete(token);
      return { valid: false };
    }
    
    this.tokens.delete(token);
    
    return {
      valid: true,
      userId: data.userId,
      projectId: data.projectId,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    this.tokens.forEach((val, key) => {
      if (val.expiresAt < now) {
        this.tokens.delete(key);
      }
    });
  }
}

export const terminalTokenStore = new TerminalTokenStore();
