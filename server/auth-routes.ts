import type { Express, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { generateToken, hashPassword, comparePasswords, authMiddleware } from "./auth";

const prisma = new PrismaClient();

export function registerAuthRoutes(app: Express) {
  // Signup
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, username, password } = req.body;

      if (!email || !username || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const hashedPassword = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
        },
      });

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.status(201).json({ user: { id: user.id, email, username }, token });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({ error: "Email or username already exists" });
      }
      res.status(500).json({ error: "Signup failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await comparePasswords(password, user.password);

      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      res.json({ user: { id: user.id, email: user.email, username: user.username }, token });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Get profile
  app.get("/api/auth/profile", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const profile = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { id: true, email: true, username: true, role: true, createdAt: true },
      });

      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Update profile
  app.put("/api/auth/profile", authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { username } = req.body;

      const updated = await prisma.user.update({
        where: { id: user.userId },
        data: { ...(username && { username }) },
        select: { id: true, email: true, username: true, role: true },
      });

      res.json(updated);
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({ error: "Username already exists" });
      }
      res.status(500).json({ error: "Update failed" });
    }
  });
}
