import express from "express";
import { z } from "zod";
import { storage } from "../storage";
// Funzioni di autenticazione
function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export const templatesRouter = express.Router();

// Schema validazione per salvare uno schedule come template
const saveAsTemplateSchema = z.object({
  scheduleId: z.number(),
  name: z.string().min(3, "Il nome deve avere almeno 3 caratteri"),
  type: z.string().default("custom"),
  description: z.string().optional()
});

// Schema validazione per applicare un template
const applyTemplateSchema = z.object({
  templateId: z.number(),
  scheduleId: z.number()
});

// GET /api/templates
// Ottiene tutti i template disponibili
templatesRouter.get("/", requireAuth, async (req, res) => {
  try {
    console.log("📋 Richiesta di tutti i template");
    const templates = await storage.getAllScheduleTemplates();
    res.json(templates);
  } catch (error) {
    console.error("❌ Errore nel recupero dei template:", error);
    res.status(500).json({ message: "Errore nel recupero dei template" });
  }
});

// GET /api/templates/:id
// Ottiene un template specifico
templatesRouter.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`🔍 Richiesta template con ID: ${id}`);
    
    const template = await storage.getScheduleTemplate(id);
    if (!template) {
      return res.status(404).json({ message: "Template non trovato" });
    }
    
    // Ottieni anche i turni associati al template
    const shifts = await storage.getTemplateShifts(id);
    
    res.json({
      template,
      shifts
    });
  } catch (error) {
    console.error("❌ Errore nel recupero del template:", error);
    res.status(500).json({ message: "Errore nel recupero del template" });
  }
});

// POST /api/templates/save-from-schedule
// Salva uno schedule esistente come template
templatesRouter.post("/save-from-schedule", requireAuth, async (req, res) => {
  try {
    console.log("📝 Richiesta salvataggio schedule come template", req.body);
    const validatedData = saveAsTemplateSchema.parse(req.body);
    
    // Verifica che lo schedule esista
    const schedule = await storage.getSchedule(validatedData.scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Orario non trovato" });
    }
    
    // Crea il template
    const template = await storage.createScheduleTemplate({
      name: validatedData.name,
      type: validatedData.type,
      description: validatedData.description || "",
      createdBy: (req.user as any).id
    });
    
    // Ottieni i turni dallo schedule
    const shifts = await storage.getShifts(validatedData.scheduleId);
    console.log(`✅ Recuperati ${shifts.length} turni dallo schedule`);
    
    // Copia i turni nel template
    for (const shift of shifts) {
      await storage.createTemplateShift({
        templateId: template.id,
        userId: shift.userId,
        day: shift.day,
        startTime: shift.startTime,
        endTime: shift.endTime,
        type: shift.type,
        notes: shift.notes,
        area: shift.area
      });
    }
    
    res.status(201).json(template);
  } catch (error) {
    console.error("❌ Errore nel salvataggio del template:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    
    res.status(500).json({ message: "Errore nel salvataggio del template" });
  }
});

// POST /api/templates/apply
// Applica un template esistente a uno schedule
templatesRouter.post("/apply", requireAuth, async (req, res) => {
  try {
    console.log("🔄 Richiesta applicazione template", req.body);
    const validatedData = applyTemplateSchema.parse(req.body);
    
    // Verifica che il template esista
    const template = await storage.getScheduleTemplate(validatedData.templateId);
    if (!template) {
      return res.status(404).json({ message: "Template non trovato" });
    }
    
    // Verifica che lo schedule esista
    const schedule = await storage.getSchedule(validatedData.scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Orario non trovato" });
    }
    
    // Applica il template
    const success = await storage.applyTemplateToSchedule(
      validatedData.templateId,
      validatedData.scheduleId
    );
    
    if (!success) {
      return res.status(500).json({ message: "Errore nell'applicazione del template" });
    }
    
    res.json({ message: "Template applicato con successo" });
  } catch (error) {
    console.error("❌ Errore nell'applicazione del template:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dati non validi", errors: error.errors });
    }
    
    res.status(500).json({ message: "Errore nell'applicazione del template" });
  }
});

// DELETE /api/templates/:id
// Elimina un template
templatesRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`🗑️ Richiesta eliminazione template con ID: ${id}`);
    
    // Verifica che il template esista
    const template = await storage.getScheduleTemplate(id);
    if (!template) {
      return res.status(404).json({ message: "Template non trovato" });
    }
    
    // Verifica che l'utente sia autorizzato (solo admin o creatore)
    if ((req.user as any).role !== "admin" && (req.user as any).id !== template.createdBy) {
      return res.status(403).json({ message: "Non autorizzato a eliminare questo template" });
    }
    
    const success = await storage.deleteScheduleTemplate(id);
    if (!success) {
      return res.status(500).json({ message: "Errore nell'eliminazione del template" });
    }
    
    res.json({ message: "Template eliminato con successo" });
  } catch (error) {
    console.error("❌ Errore nell'eliminazione del template:", error);
    res.status(500).json({ message: "Errore nell'eliminazione del template" });
  }
});

// GET /api/templates/:id/shifts
// Ottiene tutti i turni associati a un template
templatesRouter.get("/:id/shifts", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`🔍 Richiesta turni per template ID: ${id}`);
    
    // Verifica che il template esista
    const template = await storage.getScheduleTemplate(id);
    if (!template) {
      return res.status(404).json({ message: "Template non trovato" });
    }
    
    const shifts = await storage.getTemplateShifts(id);
    res.json(shifts);
  } catch (error) {
    console.error("❌ Errore nel recupero dei turni del template:", error);
    res.status(500).json({ message: "Errore nel recupero dei turni del template" });
  }
});