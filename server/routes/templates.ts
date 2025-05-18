import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";

const router = Router();

// Middleware per controllare l'autenticazione
function requireAuth(req: any, res: any, next: any) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Schema di validazione per la creazione di un template
const createTemplateSchema = z.object({
  name: z.string().min(3),
  type: z.enum(["even", "odd", "custom"]),
  description: z.string().optional(),
  scheduleId: z.number(),
});

// GET /api/templates - Ottieni tutti i modelli
router.get("/", requireAuth, async (req, res) => {
  try {
    const templates = await storage.getAllScheduleTemplates();
    res.json(templates);
  } catch (error) {
    console.error("Errore nel recupero dei modelli:", error);
    res.status(500).json({ message: "Errore nel recupero dei modelli" });
  }
});

// GET /api/templates/:id - Ottieni un modello specifico
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const template = await storage.getScheduleTemplate(id);
    
    if (!template) {
      return res.status(404).json({ message: "Modello non trovato" });
    }
    
    res.json(template);
  } catch (error) {
    console.error("Errore nel recupero del modello:", error);
    res.status(500).json({ message: "Errore nel recupero del modello" });
  }
});

// POST /api/templates - Crea un nuovo modello
router.post("/", requireAuth, async (req, res) => {
  try {
    const validatedData = createTemplateSchema.parse(req.body);
    
    const template = await storage.createScheduleTemplate({
      name: validatedData.name,
      type: validatedData.type,
      description: validatedData.description || "",
      createdBy: req.session.user.id,
      createdAt: new Date(),
      lastUsed: null,
      timesUsed: 0,
    });
    
    // Copia i turni dallo schedule al template
    if (validatedData.scheduleId) {
      const shifts = await storage.getShifts(validatedData.scheduleId);
      
      // Crea i turni nel template
      for (const shift of shifts) {
        await storage.createTemplateShift({
          templateId: template.id,
          userId: shift.userId,
          day: shift.day,
          startTime: shift.startTime,
          endTime: shift.endTime,
          type: shift.type,
          notes: shift.notes,
          area: shift.area,
        });
      }
    }
    
    res.status(201).json(template);
  } catch (error) {
    console.error("Errore nella creazione del modello:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    
    res.status(500).json({ message: "Errore nella creazione del modello" });
  }
});

// DELETE /api/templates/:id - Elimina un modello
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Prima elimina tutti i turni associati
    await storage.deleteAllTemplateShifts(id);
    
    // Poi elimina il template
    const success = await storage.deleteScheduleTemplate(id);
    
    if (!success) {
      return res.status(404).json({ message: "Modello non trovato" });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("Errore nell'eliminazione del modello:", error);
    res.status(500).json({ message: "Errore nell'eliminazione del modello" });
  }
});

// GET /api/templates/:id/shifts - Ottieni i turni di un modello
router.get("/:id/shifts", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const shifts = await storage.getTemplateShifts(id);
    
    res.json(shifts);
  } catch (error) {
    console.error("Errore nel recupero dei turni del modello:", error);
    res.status(500).json({ message: "Errore nel recupero dei turni del modello" });
  }
});

export default router;