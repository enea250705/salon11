import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, parseISO, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { formatOre, calcolaOreLavoro } from "@/lib/turni-calculator";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Corregge l'orario di fine turno per la visualizzazione
function correggiOraFine(oraFine: string): string {
  try {
    const [ore, minuti] = oraFine.split(':').map(Number);
    
    // Se il formato non è corretto, restituisci l'orario originale
    if (isNaN(ore) || isNaN(minuti)) {
      return oraFine;
    }
    
    // Nessuna correzione necessaria
    return oraFine;
  } catch (e) {
    // In caso di errore, restituisci l'orario originale
    console.error('Errore nella correzione orario:', e);
    return oraFine;
  }
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
  const [vista, setVista] = useState<"settimana" | "lista">("settimana");
  const [inEsportazione, setInEsportazione] = useState(false);
  
  // Funzione per esportare il programma in PDF
  const handleEsportaPDF = async () => {
    if (!schedule) return;
    
    try {
      setInEsportazione(true);
      
      // Seleziona l'elemento HTML da convertire in PDF
      const elemento = document.getElementById('contenutoTurni');
      if (!elemento) {
        console.error('Elemento contenutoTurni non trovato');
        setInEsportazione(false);
        return;
      }
      
      // Crea una copia dello stile per l'esportazione
      const trasformazioneOriginale = elemento.style.transform;
      const zIndexOriginale = elemento.style.zIndex;
      const posizioneOriginale = elemento.style.position;
      
      // Modifica temporaneamente lo stile per l'esportazione
      elemento.style.transform = 'none';
      elemento.style.zIndex = '9999';
      elemento.style.position = 'relative';
      
      // Usa html2canvas per catturare lo schermo
      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      // Ripristina lo stile originale
      elemento.style.transform = trasformazioneOriginale;
      elemento.style.zIndex = zIndexOriginale;
      elemento.style.position = posizioneOriginale;
      
      // Crea un nuovo documento PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Aggiungi l'immagine al PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Genera il nome del file con il periodo
      const dataInizio = format(new Date(schedule.startDate), 'dd-MM-yyyy', { locale: it });
      const dataFine = format(new Date(schedule.endDate), 'dd-MM-yyyy', { locale: it });
      const nomeFile = `turni-${dataInizio}-${dataFine}.pdf`;
      
      // Scarica il PDF
      pdf.save(nomeFile);
    } catch (error) {
      console.error('Errore durante l\'esportazione PDF:', error);
    } finally {
      setInEsportazione(false);
    }
  };
  
  if (!schedule) {
    return (
      <Card className="bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <span className="material-icons text-gray-400 text-5xl mb-4">event_busy</span>
            <h3 className="text-lg font-medium mb-2">Nessun turno disponibile</h3>
            <p className="text-gray-500">
              Non ci sono turni pubblicati al momento. Controlla più tardi.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Data inizio e fine settimana
  const dataInizio = new Date(schedule.startDate);
  const dataFine = new Date(schedule.endDate);
  
  // Genera i giorni della settimana
  const giorniSettimana = [];
  let dataCorrente = new Date(dataInizio);
  
  while (dataCorrente <= dataFine) {
    giorniSettimana.push({
      data: new Date(dataCorrente),
      nome: format(dataCorrente, "EEEE", { locale: it }),
      nomeCorto: format(dataCorrente, "EEE", { locale: it }),
      dataFormattata: format(dataCorrente, "d/M", { locale: it }),
    });
    dataCorrente = addDays(dataCorrente, 1);
  }
  
  // Organizza gli orari per giorno
  const turniPerGiorno: Record<string, any[]> = {};
  
  turniUtente.forEach(turno => {
    const dataFormattata = format(new Date(turno.date), "EEEE", { locale: it });
    if (!turniPerGiorno[dataFormattata]) {
      turniPerGiorno[dataFormattata] = [];
    }
    turniPerGiorno[dataFormattata].push(turno);
  });
  
  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-2 pt-4 sm:pt-6">
        <CardTitle className="text-base sm:text-lg font-medium">I Miei Turni</CardTitle>
        <div className="flex flex-col xs:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEsportaPDF}
            disabled={inEsportazione || !schedule}
            className="text-xs"
          >
            <span className="material-icons text-xs sm:text-sm mr-1">download</span>
            {inEsportazione ? "Esportazione..." : "Scarica PDF"}
          </Button>
          <div className="flex bg-gray-100 rounded-md p-0.5">
            <Button
              variant={vista === "settimana" ? "default" : "ghost"}
              size="sm"
              onClick={() => setVista("settimana")}
              className="text-xs"
            >
              <span className="material-icons text-xs sm:text-sm mr-1">view_week</span>
              <span className="hidden xs:inline">Settimana</span>
              <span className="xs:hidden">Sett.</span>
            </Button>
            <Button
              variant={vista === "lista" ? "default" : "ghost"}
              size="sm"
              onClick={() => setVista("lista")}
              className="text-xs"
            >
              <span className="material-icons text-xs sm:text-sm mr-1">list</span>
              Lista
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {/* Dettagli pianificazione */}
      <div className="px-4 sm:px-6 pb-2 pt-0">
        <p className="text-xs sm:text-sm text-gray-500 mb-4 text-center sm:text-left">
          <span className="material-icons text-xs align-middle mr-1">calendar_today</span>
          {format(dataInizio, "d MMM", { locale: it })} - {format(dataFine, "d MMM yyyy", { locale: it })}
        </p>
      </div>
      
      <CardContent className="pb-6 pt-0" id="contenutoTurni">
        {/* Visualizzazione a settimana */}
        {vista === "settimana" && (
          <>
            {/* Visualizzazione Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {giorniSettimana.map(giorno => (
                      <th 
                        key={giorno.dataFormattata}
                        className="border px-3 py-2 text-center font-medium"
                      >
                        <div className="whitespace-nowrap text-sm">{giorno.nomeCorto}</div>
                        <div className="text-xs font-normal text-gray-500">{giorno.dataFormattata}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {giorniSettimana.map(giorno => {
                      const turniGiorno = turniPerGiorno[giorno.nome] || [];
                      
                      // Ordina i turni per orario di inizio
                      turniGiorno.sort((a, b) => a.startTime.localeCompare(b.startTime));
                      
                      return (
                        <td key={giorno.dataFormattata} className="border p-3 align-top h-28">
                          {turniGiorno.length === 0 ? (
                            <div className="text-center py-2 text-gray-400 text-sm">
                              Non in servizio
                            </div>
                          ) : (
                            <div>
                              {/* Prima raggruppiamo i turni per tipo */}
                              {(() => {
                                // Dobbiamo rimuovere i duplicati e dare priorità ai tipi di assenza
                                // Prima organizziamo i turni per slot orario
                                const mapSlotOrari = new Map();
                                
                                // Ordine di priorità: sick > leave > vacation > work
                                // Aggiungiamo ogni turno, rimpiazzando quelli a priorità inferiore
                                turniGiorno.forEach(turno => {
                                  const chiaveOrario = `${turno.startTime}-${turno.endTime}`;
                                  
                                  if (!mapSlotOrari.has(chiaveOrario)) {
                                    // Se non esiste ancora questo slot, aggiungiamo
                                    mapSlotOrari.set(chiaveOrario, turno);
                                  } else {
                                    // Se esiste già, controlliamo la priorità
                                    const turnoEsistente = mapSlotOrari.get(chiaveOrario);
                                    const prioritaEsistente = getValorePriorita(turnoEsistente.type);
                                    const nuovaPriorita = getValorePriorita(turno.type);
                                    
                                    // Sostituisci solo se la nuova priorità è maggiore
                                    if (nuovaPriorita > prioritaEsistente) {
                                      mapSlotOrari.set(chiaveOrario, turno);
                                    }
                                  }
                                });
                                
                                // Prendi i turni senza duplicati dal Map
                                const turniUnici = Array.from(mapSlotOrari.values());
                                
                                // Ora filtra per tipo
                                const turniLavoro = turniUnici.filter(s => s.type === "work");
                                const turniFerie = turniUnici.filter(s => s.type === "vacation");
                                const turniPermessi = turniUnici.filter(s => s.type === "leave");
                                const turniMalattia = turniUnici.filter(s => s.type === "sick");
                                
                                // Consolida gli intervalli di lavoro consecutivi
                                const turniLavoroConsolidati: any[] = [];
                                let turnoCorrente: any = null;
                                
                                // Ordina per orario di inizio
                                turniLavoro.sort((a, b) => a.startTime.localeCompare(b.startTime));
                                
                                turniLavoro.forEach((turno) => {
                                  if (!turnoCorrente) {
                                    // Primo turno da considerare
                                    turnoCorrente = { ...turno };
                                  } else {
                                    // Controlla se questo turno è consecutivo all'ultimo
                                    if (turno.startTime === turnoCorrente.endTime) {
                                      // Estendi il turno corrente
                                      turnoCorrente.endTime = turno.endTime;
                                    } else {
                                      // Questo turno non è consecutivo, salva quello corrente e inizia uno nuovo
                                      turniLavoroConsolidati.push(turnoCorrente);
                                      turnoCorrente = { ...turno };
                                    }
                                  }
                                });
                                
                                // Aggiungi l'ultimo turno se esiste
                                if (turnoCorrente) {
                                  turniLavoroConsolidati.push(turnoCorrente);
                                }
                                
                                // Funzione helper per determinare la priorità del tipo di turno
                                function getValorePriorita(tipo: string): number {
                                  switch (tipo) {
                                    case "sick": return 4;
                                    case "leave": return 3;
                                    case "vacation": return 2;
                                    case "work": return 1;
                                    default: return 0;
                                  }
                                }
                                
                                return (
                                  <div className="space-y-1">
                                    {/* Mostra gli slot di lavoro in modo destacato */}
                                    {turniLavoroConsolidati.map((turno, idx) => (
                                      <div 
                                        key={idx}
                                        className="bg-blue-50 border border-blue-100 p-1 rounded text-xs"
                                      >
                                        <div className="font-medium">
                                          {turno.startTime} - {correggiOraFine(turno.endTime)}
                                        </div>
                                        {turno.area && (
                                          <div className="text-gray-500">Area: {turno.area}</div>
                                        )}
                                        {turno.notes && (
                                          <div className="text-gray-500 italic text-2xs mt-1 line-clamp-2">
                                            {turno.notes}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    
                                    {/* Ferie */}
                                    {turniFerie.map((turno, idx) => (
                                      <div 
                                        key={idx}
                                        className="bg-red-50 border border-red-100 p-1 rounded text-xs"
                                      >
                                        <div className="font-medium">Ferie</div>
                                        {turno.area && (
                                          <div className="text-gray-500">Area: {turno.area}</div>
                                        )}
                                      </div>
                                    ))}
                                    
                                    {/* Permessi */}
                                    {turniPermessi.map((turno, idx) => (
                                      <div 
                                        key={idx}
                                        className="bg-amber-50 border border-amber-100 p-1 rounded text-xs"
                                      >
                                        <div className="font-medium">Permesso</div>
                                        {turno.area && (
                                          <div className="text-gray-500">Area: {turno.area}</div>
                                        )}
                                      </div>
                                    ))}
                                    
                                    {/* Malattia */}
                                    {turniMalattia.map((turno, idx) => (
                                      <div 
                                        key={idx}
                                        className="bg-purple-50 border border-purple-100 p-1 rounded text-xs"
                                      >
                                        <div className="font-medium">Malattia</div>
                                        {turno.area && (
                                          <div className="text-gray-500">Area: {turno.area}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            
            {/* Visualizzazione Mobile (una card per ogni giorno) */}
            <div className="md:hidden space-y-4">
              {giorniSettimana.map(giorno => {
                const turniGiorno = turniPerGiorno[giorno.nome] || [];
                
                // Ordina i turni per orario di inizio
                turniGiorno.sort((a, b) => a.startTime.localeCompare(b.startTime));
                
                return (
                  <Card key={giorno.dataFormattata} className="overflow-hidden">
                    <CardHeader className="py-2 px-3 bg-gray-50 border-b">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium">{giorno.nome}</h3>
                        <span className="text-xs text-gray-500">{giorno.dataFormattata}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      {turniGiorno.length === 0 ? (
                        <div className="text-center py-2 text-gray-400 text-sm">
                          Non in servizio
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {turniGiorno.map((turno, idx) => {
                            let icona = "work";
                            let etichetta = "Lavoro";
                            let coloreClasse = "bg-blue-50 border-blue-100";
                            let coloreIcona = "text-blue-500";
                            
                            if (turno.type === "vacation") {
                              icona = "beach_access";
                              etichetta = "Ferie";
                              coloreClasse = "bg-red-50 border-red-100";
                              coloreIcona = "text-red-500";
                            } else if (turno.type === "leave") {
                              icona = "time_to_leave";
                              etichetta = "Permesso";
                              coloreClasse = "bg-amber-50 border-amber-100";
                              coloreIcona = "text-amber-500";
                            } else if (turno.type === "sick") {
                              icona = "medical_services";
                              etichetta = "Malattia";
                              coloreClasse = "bg-purple-50 border-purple-100";
                              coloreIcona = "text-purple-500";
                            }
                            
                            return (
                              <div 
                                key={idx}
                                className={`border rounded-md p-2 ${coloreClasse}`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium flex items-center mb-1 text-xs sm:text-sm">
                                      <span className={`material-icons text-xs sm:text-sm mr-1 ${coloreIcona}`}>{icona}</span>
                                      {etichetta}
                                    </div>
                                    
                                    {turno.type === "work" && (
                                      <>
                                        <div className="text-sm sm:text-base font-medium">{turno.startTime} - {correggiOraFine(turno.endTime)}</div>
                                        {turno.notes && (
                                          <div className="text-xs sm:text-sm mt-1 text-gray-600 italic">{turno.notes}</div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  
                                  {/* Rimuoviamo la visualizzazione ore come richiesto */}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
        
        {/* Visualizzazione a lista */}
        {vista === "lista" && (
          <div className="space-y-4">
            {turniUtente.length > 0 ? (
              turniUtente
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((turno, idx) => {
                  const data = new Date(turno.date);
                  const giorno = format(data, "EEEE", { locale: it });
                  const dataFormattata = format(data, "d MMMM", { locale: it });
                  
                  // Determinazione di icona e colori per tipo di turno
                  let icona = "work";
                  let etichetta = "Lavoro";
                  let coloreClasse = "bg-blue-50 border-blue-100";
                  let coloreIcona = "text-blue-500";
                  
                  if (turno.type === "vacation") {
                    icona = "beach_access";
                    etichetta = "Ferie";
                    coloreClasse = "bg-red-50 border-red-100";
                    coloreIcona = "text-red-500";
                  } else if (turno.type === "leave") {
                    icona = "time_to_leave";
                    etichetta = "Permesso";
                    coloreClasse = "bg-amber-50 border-amber-100";
                    coloreIcona = "text-amber-500";
                  } else if (turno.type === "sick") {
                    icona = "medical_services";
                    etichetta = "Malattia";
                    coloreClasse = "bg-purple-50 border-purple-100";
                    coloreIcona = "text-purple-500";
                  }
                  
                  return (
                    <div 
                      key={idx}
                      className={`border rounded-md p-3 ${coloreClasse}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">
                          {giorno}, {dataFormattata}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium flex items-center mb-1">
                            <span className={`material-icons text-sm mr-1 ${coloreIcona}`}>{icona}</span>
                            {etichetta}
                          </div>
                          
                          {turno.type === "work" && (
                            <>
                              <div className="text-sm">{turno.startTime} - {correggiOraFine(turno.endTime)}</div>
                              {turno.area && (
                                <div className="text-xs text-gray-600 mt-1">Area: {turno.area}</div>
                              )}
                              {turno.notes && (
                                <div className="text-xs mt-2 text-gray-600 italic">{turno.notes}</div>
                              )}
                            </>
                          )}
                        </div>
                        
                        {/* Rimuoviamo la visualizzazione ore come richiesto */}
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-6 text-gray-500">
                Nessun turno programmato per questa settimana.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}