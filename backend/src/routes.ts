import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerAuthRoutes } from "./auth-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register authentication routes
  registerAuthRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
