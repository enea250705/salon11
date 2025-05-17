import React from "react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

function correggiOraFine(oraFine: string): string {
  return oraFine === "00:00" ? "24:00" : oraFine;
}

type VistaTurniDipendenteProps = {
  schedule: any;
  turni: any[];
  turniUtente: any[];
};

/**
 * Visualizzatore dei turni per i dipendenti
 * Mostra i propri turni pubblicati in formato tabella
 */
export function VistaTurniDipendente({ schedule, turni, turniUtente }: VistaTurniDipendenteProps) {
  if (!schedule) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nessun turno selezionato</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!turniUtente || turniUtente.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <h2 className="text-xl font-bold mb-2">Non hai turni pianificati in questa settimana</h2>
          <p className="text-muted-foreground">
            Se pensi che questo sia un errore, contatta il tuo responsabile.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Raggruppa i turni per giorno
  const turniPerGiorno: { [key: string]: any[] } = {};
  
  turniUtente.forEach(turno => {
    try {
      const data = new Date(turno.date);
      const dataFormattata = format(data, "EEEE", { locale: it });
      
      if (!turniPerGiorno[dataFormattata]) {
        turniPerGiorno[dataFormattata] = [];
      }
      
      turniPerGiorno[dataFormattata].push(turno);
    } catch (error) {
      console.error("Errore nel processare il turno:", turno, error);
    }
  });
  
  // Ordina i giorni della settimana
  const giorniSettimana = [
    "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"
  ];
  
  const giorniConTurni = Object.keys(turniPerGiorno).sort(
    (a, b) => giorniSettimana.indexOf(a.toLowerCase()) - giorniSettimana.indexOf(b.toLowerCase())
  );
  
  // Funzione per ottenere il valore di priorità per ordinare i tipi di turno
  function getValorePriorita(tipo: string): number {
    switch(tipo.toLowerCase()) {
      case "work": return 1;
      case "vacation": return 2;
      case "leave": return 3;
      default: return 999;
    }
  }
  
  // Per ogni giorno, ordina i turni per orario di inizio
  Object.keys(turniPerGiorno).forEach(giorno => {
    turniPerGiorno[giorno].sort((a, b) => {
      // Prima ordina per tipo di turno (work, vacation, leave)
      const prioritaA = getValorePriorita(a.type || "");
      const prioritaB = getValorePriorita(b.type || "");
      
      if (prioritaA !== prioritaB) {
        return prioritaA - prioritaB;
      }
      
      // Poi ordina per orario di inizio
      return a.startTime.localeCompare(b.startTime);
    });
  });
  
  const dataInizio = new Date(schedule.startDate);
  const dataFine = new Date(schedule.endDate);
  
  return (
    <Card className="w-full">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              I Miei Turni {format(dataInizio, "d MMMM", { locale: it })} - {format(dataFine, "d MMMM yyyy", { locale: it })}
            </h2>
            <div className="text-muted-foreground flex items-center">
              Turni pianificati {schedule.isPublished && <Badge className="ml-2">Pubblicato</Badge>}
            </div>
          </div>
        </div>
        
        <Tabs defaultValue={giorniConTurni[0] || "lunedì"} className="w-full">
          <TabsList className="mb-4 flex w-full flex-wrap">
            {giorniConTurni.map((giorno) => (
              <TabsTrigger key={giorno} value={giorno} className="text-xs sm:text-sm flex-grow">
                {giorno}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {giorniConTurni.map((giorno) => (
            <TabsContent key={giorno} value={giorno} className="space-y-4">
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Orario</th>
                      <th className="px-4 py-3 text-left text-sm font-medium hidden sm:table-cell">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {turniPerGiorno[giorno].map((turno, index) => (
                      <tr key={index} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm">
                          <Badge
                            variant={
                              turno.type === "work"
                                ? "default"
                                : turno.type === "vacation"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {turno.type === "work"
                              ? "Lavoro"
                              : turno.type === "vacation"
                              ? "Ferie"
                              : "Permesso"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {turno.type === "work" ? (
                            <>
                              {turno.startTime} - {correggiOraFine(turno.endTime)}
                            </>
                          ) : (
                            <>Giornata intera</>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                          {turno.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
          
          {giorniConTurni.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Nessun turno pianificato per questa settimana.</p>
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}