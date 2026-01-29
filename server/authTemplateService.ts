export interface AuthTemplate {
  name: string;
  description: string;
  files: Array<{ path: string; content: string }>;
  dependencies: string[];
}

export function generateAuthTemplate(type: "replit" | "jwt" | "session"): AuthTemplate {
  switch (type) {
    case "replit":
      return generateReplitAuthTemplate();
    case "jwt":
      return generateJwtAuthTemplate();
    case "session":
      return generateSessionAuthTemplate();
    default:
      return generateSessionAuthTemplate();
  }
}

function generateReplitAuthTemplate(): AuthTemplate {
  return {
    name: "Replit Auth",
    description: "Autenticacao integrada com Replit usando OpenID Connect",
    dependencies: ["openid-client", "express-session", "passport"],
    files: [
      {
        path: "server/auth.ts",
        content: `import passport from "passport";
import { Strategy as OIDCStrategy } from "openid-client";
import { storage } from "./storage";

export function setupAuth(app: any) {
  const issuerUrl = process.env.ISSUER_URL || "https://replit.com";
  const replId = process.env.REPL_ID;
  
  if (!replId) {
    console.warn("REPL_ID nao configurado - autenticacao desabilitada");
    return;
  }
  
  passport.use("replit", new OIDCStrategy({
    issuer: issuerUrl,
    client_id: replId,
    redirect_uri: \`https://\${replId}.id.repl.co/callback\`,
    scope: "openid profile email",
  }, async (tokenSet: any, userinfo: any, done: any) => {
    try {
      let user = await storage.getUserByEmail(userinfo.email);
      
      if (!user) {
        user = await storage.createUser({
          email: userinfo.email,
          name: userinfo.name || userinfo.preferred_username,
          replitId: userinfo.sub,
        });
      }
      
      done(null, user);
    } catch (error) {
      done(error);
    }
  }));
  
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  app.get("/api/auth/login", passport.authenticate("replit"));
  
  app.get("/callback", passport.authenticate("replit", {
    successRedirect: "/",
    failureRedirect: "/login?error=auth_failed",
  }));
  
  app.get("/api/auth/logout", (req: any, res: any) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
  
  app.get("/api/auth/user", (req: any, res: any) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Nao autenticado" });
    }
  });
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Autenticacao necessaria" });
}
`,
      },
      {
        path: "client/src/hooks/useAuth.ts",
        content: `import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface User {
  id: number;
  email: string;
  name: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });
  
  const login = () => {
    window.location.href = "/api/auth/login";
  };
  
  const logout = () => {
    window.location.href = "/api/auth/logout";
  };
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
`,
      },
      {
        path: "client/src/components/AuthButton.tsx",
        content: `import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut, User } from "lucide-react";

export function AuthButton() {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  
  if (isLoading) {
    return <Button variant="ghost" disabled>Carregando...</Button>;
  }
  
  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          <User className="h-4 w-4 inline mr-1" />
          {user.name}
        </span>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4 mr-1" />
          Sair
        </Button>
      </div>
    );
  }
  
  return (
    <Button onClick={login}>
      <LogIn className="h-4 w-4 mr-1" />
      Entrar com Replit
    </Button>
  );
}
`,
      },
    ],
  };
}

function generateJwtAuthTemplate(): AuthTemplate {
  return {
    name: "JWT Auth",
    description: "Autenticacao com JSON Web Tokens",
    dependencies: ["jsonwebtoken", "bcryptjs"],
    files: [
      {
        path: "server/auth.ts",
        content: `import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "seu-secret-seguro-aqui";
const JWT_EXPIRES = "7d";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token nao fornecido" });
  }
  
  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ message: "Token invalido" });
  }
  
  req.userId = decoded.userId;
  next();
}

export function setupAuthRoutes(app: any) {
  app.post("/api/auth/register", async (req: any, res: any) => {
    try {
      const { email, password, name } = req.body;
      
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email ja cadastrado" });
      }
      
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({ email, password: hashedPassword, name });
      
      const token = generateToken(user.id);
      res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/auth/login", async (req: any, res: any) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Credenciais invalidas" });
      }
      
      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Credenciais invalidas" });
      }
      
      const token = generateToken(user.id);
      res.json({ user: { id: user.id, email: user.email, name: user.name }, token });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/auth/me", authMiddleware, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario nao encontrado" });
      }
      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}
`,
      },
      {
        path: "client/src/hooks/useAuth.ts",
        content: `import { useState, useEffect } from "react";

interface User {
  id: number;
  email: string;
  name: string;
}

const TOKEN_KEY = "auth_token";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  const checkAuth = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: \`Bearer \${token}\` },
      });
      
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    }
    
    setIsLoading(false);
  };
  
  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    
    if (!res.ok) {
      throw new Error("Credenciais invalidas");
    }
    
    const { user, token } = await res.json();
    localStorage.setItem(TOKEN_KEY, token);
    setUser(user);
    return user;
  };
  
  const register = async (email: string, password: string, name: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    
    if (!res.ok) {
      throw new Error("Erro ao cadastrar");
    }
    
    const { user, token } = await res.json();
    localStorage.setItem(TOKEN_KEY, token);
    setUser(user);
    return user;
  };
  
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };
  
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };
}
`,
      },
    ],
  };
}

function generateSessionAuthTemplate(): AuthTemplate {
  return {
    name: "Session Auth",
    description: "Autenticacao com sessoes e cookies",
    dependencies: ["express-session", "bcryptjs"],
    files: [
      {
        path: "server/auth.ts",
        content: `import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";

const SESSION_SECRET = process.env.SESSION_SECRET || "seu-secret-seguro-aqui";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setupAuth(app: any) {
  app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    },
  }));
  
  app.post("/api/auth/register", async (req: any, res: any) => {
    try {
      const { email, password, name } = req.body;
      
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email ja cadastrado" });
      }
      
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({ email, password: hashedPassword, name });
      
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/auth/login", async (req: any, res: any) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Credenciais invalidas" });
      }
      
      const valid = await verifyPassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Credenciais invalidas" });
      }
      
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post("/api/auth/logout", (req: any, res: any) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao sair" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
  
  app.get("/api/auth/me", async (req: any, res: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Nao autenticado" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario nao encontrado" });
      }
      res.json({ id: user.id, email: user.email, name: user.name });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.session?.userId) {
    return next();
  }
  res.status(401).json({ message: "Autenticacao necessaria" });
}
`,
      },
    ],
  };
}

export function getAuthTemplatesList(): Array<{ type: string; name: string; description: string }> {
  return [
    { type: "replit", name: "Replit Auth", description: "Autenticacao integrada com Replit" },
    { type: "jwt", name: "JWT Auth", description: "Autenticacao com JSON Web Tokens" },
    { type: "session", name: "Session Auth", description: "Autenticacao com sessoes e cookies" },
  ];
}
