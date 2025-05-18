import { Request, Response, NextFunction } from "express";

// Middleware per verificare che l'utente sia autenticato
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ message: "Unauthorized" });
}

// Middleware per verificare che l'utente sia un amministratore
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user as any)?.role === "admin") {
    return next();
  }
  
  res.status(403).json({ message: "Forbidden: Admin access required" });
}