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

// Schema di validazione per la creazione di un template da uno schedule esistente
const saveAsTemplateSchema = z.object({
  name: z.string().min(3),
  type: z.enum(["even", "odd", "custom"]),
  scheduleId: z.number(),
});

// POST /api/schedules/:scheduleId/save-as-template
// Salva uno schedule esistente come modello
router.post("/:scheduleId/save-as-template", requireAuth, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.scheduleId);
    const validatedData = saveAsTemplateSchema.parse({
      ...req.body,
      scheduleId,
    });
    
    // Verifica che lo schedule esista
    const schedule = await storage.getSchedule(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Orario non trovato" });
    }
    
    // Crea il template - adattato alla struttura attuale del database
    const template = await storage.createScheduleTemplate({
      name: validatedData.name,
      type: validatedData.type,
      createdBy: req.session.user.id
    });
    
    // Ottieni i turni dallo schedule
    const shifts = await storage.getShifts(scheduleId);
    
    // Copia i turni nel template
    for (const shift of shifts) {
      await storage.createTemplateShift({
        templateId: template.id,
        userId: shift.userId,
        day: shift.day,
        startTime: shift.startTime,
        endTime: shift.endTime,
        type: shift.type || "normal",
        notes: shift.notes,
        area: shift.area,
      });
    }
    
    res.status(201).json(template);
  } catch (error) {
    console.error("Errore nel salvataggio del modello:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    
    res.status(500).json({ message: "Errore nel salvataggio del modello" });
  }
});

// POST /api/schedules/:scheduleId/apply-template/:templateId
// Applica un modello esistente a uno schedule
router.post("/:scheduleId/apply-template/:templateId", requireAuth, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.scheduleId);
    const templateId = parseInt(req.params.templateId);
    
    // Verifica che lo schedule e il template esistano
    const [schedule, template] = await Promise.all([
      storage.getSchedule(scheduleId),
      storage.getScheduleTemplate(templateId)
    ]);
    
    if (!schedule) {
      return res.status(404).json({ message: "Orario non trovato" });
    }
    
    if (!template) {
      return res.status(404).json({ message: "Modello non trovato" });
    }
    
    // Applica il template allo schedule
    const success = await storage.applyTemplateToSchedule(templateId, scheduleId);
    
    if (!success) {
      return res.status(500).json({ message: "Errore nell'applicazione del modello" });
    }
    
    // Aggiorna le statistiche del template
    await storage.updateScheduleTemplateUsage(templateId);
    
    res.json({ message: "Modello applicato con successo" });
  } catch (error) {
    console.error("Errore nell'applicazione del modello:", error);
    res.status(500).json({ message: "Errore nell'applicazione del modello" });
  }
});

export default router;