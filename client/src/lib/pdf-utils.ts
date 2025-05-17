/**
 * Utility functions for handling PDF files
 */

import { format } from "date-fns";
import { it } from "date-fns/locale";

/**
 * Utility per gestire i PDF, con due modalità:
 * 1. Download: Scarica il PDF sul dispositivo dell'utente
 * 2. Open: Apre il PDF in una nuova scheda del browser
 * 
 * @param filename Il nome del file
 * @param base64Data I dati PDF in formato base64
 * @param mode La modalità: 'download' (scarica) o 'open' (apri in nuova scheda)
 */
export function downloadPdf(filename: string, base64Data: string, mode: 'download' | 'open' = 'download'): void {
  // Verifica che i dati siano presenti
  if (!base64Data || base64Data.trim() === '') {
    console.error('Errore: dati PDF mancanti o vuoti');
    throw new Error('Dati PDF mancanti o vuoti');
  }
  
  try {
    // Costruisci l'URL dei dati PDF
    const dataUrl = base64Data.startsWith('data:') 
      ? base64Data 
      : `data:application/pdf;base64,${base64Data}`;
    
    // Crea un elemento link
    const link = document.createElement("a");
    link.href = dataUrl;
    
    if (mode === 'download') {
      // Modalità download: scarica il file sul dispositivo
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log(`Download avviato: ${filename}`);
    } else {
      // Modalità open: apri in una nuova scheda usando window.open()
      // Questo approccio evita problemi di intercettazione da parte dei router
      window.open(dataUrl, '_blank', 'noopener,noreferrer');
      console.log(`PDF aperto in nuova scheda: ${filename}`);
    }
  } catch (error) {
    console.error(`Errore durante ${mode === 'download' ? 'il download' : "l'apertura"} del PDF:`, error);
    throw error;
  }
}

/**
 * Generates a filename for a schedule PDF export
 * @param startDate The start date of the schedule
 * @param endDate The end date of the schedule
 * @returns A formatted filename for the PDF
 */
export function generateScheduleFilename(startDate: Date, endDate: Date): string {
  const formattedStart = format(startDate, "dd-MM-yyyy", { locale: it });
  const formattedEnd = format(endDate, "dd-MM-yyyy", { locale: it });
  
  return `Turni_${formattedStart}_${formattedEnd}.pdf`;
}

/**
 * Generates a filename for a payslip PDF
 * @param period The period (month and year) of the payslip
 * @param employeeName The name of the employee
 * @returns A formatted filename for the PDF
 */
export function generatePayslipFilename(period: string, employeeName: string): string {
  // Replace spaces with underscores and remove special characters
  const sanitizedName = employeeName.replace(/\s+/g, "_").replace(/[^\w-]/g, "");
  const sanitizedPeriod = period.replace(/\s+/g, "_");
  
  return `BustaPaga_${sanitizedPeriod}_${sanitizedName}.pdf`;
}

/**
 * Generates a filename for a tax document PDF
 * @param year The year of the tax document
 * @param employeeName The name of the employee
 * @returns A formatted filename for the PDF
 */
export function generateTaxDocFilename(year: string, employeeName: string): string {
  // Replace spaces with underscores and remove special characters
  const sanitizedName = employeeName.replace(/\s+/g, "_").replace(/[^\w-]/g, "");
  
  return `CUD_${year}_${sanitizedName}.pdf`;
}
