import { Request, Response } from "express";
import { db } from "../db";
import { eq, lt } from "drizzle-orm";
import { notifications } from "@shared/schema";
import { storage } from "../storage";

/**
 * Route per la manutenzione del sistema
 * - Pulizia notifiche più vecchie di 30 giorni
 * - Eventuali altre operazioni di manutenzione periodica
 */
export const maintenanceRoute = async (req: Request, res: Response) => {
  try {
    // Verifica se la richiesta proviene da Vercel Cron o ha l'header di autorizzazione
    const isVercelCron = req.headers['x-vercel-cron'] === 'true';
    const authHeader = req.headers.authorization;
    const isAuthorized = isVercelCron || (authHeader && authHeader.startsWith('Bearer ') && 
                        authHeader.substring(7) === process.env.MAINTENANCE_SECRET);
    
    // Se non è autorizzata, restituisci 401
    if (!isAuthorized) {
      return res.status(401).json({ 
        success: false, 
        message: "Non autorizzato ad eseguire operazioni di manutenzione" 
      });
    }
    
    // Calcola la data di 30 giorni fa
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Elimina le notifiche più vecchie di 30 giorni
    const result = await db
      .delete(notifications)
      .where(lt(notifications.createdAt, thirtyDaysAgo))
      .returning({ id: notifications.id });
    
    // Attività di manutenzione aggiuntive possono essere aggiunte qui
    
    // Restituisci risultato
    return res.status(200).json({
      success: true,
      message: "Manutenzione completata con successo",
      details: {
        notificationsDeleted: result.length
      }
    });
  } catch (error) {
    console.error("Errore durante la manutenzione:", error);
    return res.status(500).json({
      success: false,
      message: "Errore durante la manutenzione",
      error: error instanceof Error ? error.message : "Errore sconosciuto"
    });
  }
};