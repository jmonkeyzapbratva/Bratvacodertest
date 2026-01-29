// Serviço de Logging - BRATVACODER
// Suporta Loggly (se configurado) ou fallback para console

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class ConsoleLogger {
  private minLevel: number;

  constructor() {
    const level = (process.env.LOG_LEVEL || "info") as LogLevel;
    this.minLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
  }

  private formatMessage(entry: LogEntry): string {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    return `${prefix} ${entry.message}${context}`;
  }

  log(entry: LogEntry): void {
    if (LOG_LEVELS[entry.level] < this.minLevel) return;

    const message = this.formatMessage(entry);
    switch (entry.level) {
      case "debug":
        console.debug(message);
        break;
      case "info":
        console.info(message);
        break;
      case "warn":
        console.warn(message);
        break;
      case "error":
        console.error(message);
        break;
    }
  }
}

class LogglyLogger {
  private token: string | null;
  private tag: string = "bratvacoder";
  private enabled: boolean = false;

  constructor() {
    this.token = process.env.LOGGLY_TOKEN || null;
    this.enabled = !!this.token;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async log(entry: LogEntry): Promise<void> {
    if (!this.enabled || !this.token) return;

    try {
      const url = `https://logs-01.loggly.com/inputs/${this.token}/tag/${this.tag}/`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...entry,
          environment: process.env.NODE_ENV || "development",
        }),
      });
    } catch {
      // Silently fail - don't log errors about logging
    }
  }
}

export class LoggingService {
  private consoleLogger: ConsoleLogger;
  private logglyLogger: LogglyLogger;

  constructor() {
    this.consoleLogger = new ConsoleLogger();
    this.logglyLogger = new LogglyLogger();
  }

  private createEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  debug(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry("debug", message, context);
    this.consoleLogger.log(entry);
    this.logglyLogger.log(entry);
  }

  info(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry("info", message, context);
    this.consoleLogger.log(entry);
    this.logglyLogger.log(entry);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry("warn", message, context);
    this.consoleLogger.log(entry);
    this.logglyLogger.log(entry);
  }

  error(message: string, context?: Record<string, unknown>): void {
    const entry = this.createEntry("error", message, context);
    this.consoleLogger.log(entry);
    this.logglyLogger.log(entry);
  }

  getStatus(): { console: boolean; loggly: boolean } {
    return {
      console: true,
      loggly: this.logglyLogger.isEnabled(),
    };
  }
}

export const logger = new LoggingService();
