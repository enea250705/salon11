import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

/**
 * Interfaccia per la cella del turno
 */
interface CellaTurno {
  tipo: string;
  turnoId: number | null;
  permesso?: boolean;
}

/**
 * Interfaccia per i dati di un utente nella griglia
 */
interface DatiUtente {
  celle: CellaTurno[];
  note: string;
  totale: number;
}

/**
 * Interfaccia per i dati della griglia
 */
interface DatiGriglia {
  [giorno: string]: {
    [userId: number]: DatiUtente;
  };
}

/**
 * Props per il componente GrigliaTurni
 */
interface GrigliaTurniProps {
  scheduleId: number | null;
  utenti: any[];
  dataInizio: Date;
  dataFine: Date;
  turni: any[];
  richiesteFerie: any[];
  pubblicato: boolean;
  onPubblica?: () => void;
  vistaAdmin?: boolean;
}

/**
 * Calcola le ore di lavoro in base al numero di celle (slot da 30 minuti)
 */
function calcolaOreLavoro(numCelle: number): number {
  // Ogni cella è 30 minuti
  return numCelle * 0.5;
}

/**
 * GrigliaTurni - Componente tabellare per la gestione dei turni 
 * Implementazione semplificata con gestione errori migliorata
 */
export function GrigliaTurni({
  scheduleId,
  utenti,
  dataInizio,
  dataFine,
  turni,
  richiesteFerie,
  pubblicato,
  onPubblica,
  vistaAdmin = true
}: GrigliaTurniProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Generazione slot orari
  const slotOrari = Array.from({ length: 41 }, (_, i) => {
    const ora = Math.floor(i / 2) + 4; // Parte dalle 4:00
    const minuti = i % 2 === 0 ? "00" : "30";
    return `${ora.toString().padStart(2, "0")}:${minuti}`;
  });
  
  // Preparazione giorni della settimana
  const giorniSettimana = Array.from({ length: 7 }, (_, i) => {
    const data = new Date(dataInizio);
    data.setDate(data.getDate() + i);
    return {
      data,
      nome: format(data, "EEEE", { locale: it }),
      nomeCorto: format(data, "EEE", { locale: it }),
      formatoData: format(data, "dd/MM")
    };
  });
  
  // State per il giorno selezionato
  const [giornoSelezionato, setGiornoSelezionato] = useState(0);
  
  // State per i dati della griglia
  const [datiGriglia, setDatiGriglia] = useState<DatiGriglia>({});
  
  // Mutation per salvare un turno
  const salvaTurnoMutation = useMutation({
    mutationFn: async (dati: any) => {
      return await apiRequest(`/api/shifts`, 'POST', dati);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${scheduleId}/shifts`] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Impossibile salvare il turno. Riprova più tardi.",
        variant: "destructive"
      });
    }
  });
  
  // INIZIALIZZAZIONE GRIGLIA
  useEffect(() => {
    if (!scheduleId || !utenti.length) return;
    
    // Crea struttura dati vuota
    const nuoviDatiGriglia: DatiGriglia = {};
    
    try {
      // Inizializza ogni giorno con una struttura vuota per ogni utente
      giorniSettimana.forEach(giorno => {
        nuoviDatiGriglia[giorno.nome] = {};
        
        utenti
          .filter(utente => utente.role === "employee")
          .forEach(utente => {
            nuoviDatiGriglia[giorno.nome][utente.id] = {
              celle: Array(slotOrari.length - 1).fill(null).map(() => ({ 
                tipo: "", 
                turnoId: null 
              })),
              note: "",
              totale: 0
            };
          });
      });
      
      // Popola la griglia con i turni esistenti
      if (turni && turni.length > 0) {
        turni.forEach(turno => {
          try {
            if (!turno.date) {
              console.log("Turno senza data:", turno);
              return;
            }
            
            const dataDelTurno = new Date(turno.date);
            const nomeGiorno = format(dataDelTurno, "EEEE", { locale: it });
            
            if (nuoviDatiGriglia[nomeGiorno] && nuoviDatiGriglia[nomeGiorno][turno.userId]) {
              // Trova gli indici di inizio e fine del turno
              const indiceInizio = slotOrari.findIndex(t => t === turno.startTime);
              const indiceFine = slotOrari.findIndex(t => t === turno.endTime);
              
              if (indiceInizio !== -1 && indiceFine !== -1) {
                // Imposta le celle come "work" o altro tipo
                for (let i = indiceInizio; i < indiceFine; i++) {
                  if (i < nuoviDatiGriglia[nomeGiorno][turno.userId].celle.length) {
                    nuoviDatiGriglia[nomeGiorno][turno.userId].celle[i] = {
                      tipo: turno.type || "work",
                      turnoId: turno.id
                    };
                  }
                }
                
                // Imposta le note
                if (turno.notes) {
                  nuoviDatiGriglia[nomeGiorno][turno.userId].note = turno.notes;
                }
              }
            }
          } catch (error) {
            console.error("Errore nel processare il turno:", turno, error);
          }
        });
      }
      
      // Calcola il totale delle ore per ogni giorno/utente
      Object.keys(nuoviDatiGriglia).forEach(giorno => {
        Object.keys(nuoviDatiGriglia[giorno]).forEach(utenteIdStr => {
          try {
            const utenteId = parseInt(utenteIdStr);
            const utenteDati = nuoviDatiGriglia[giorno][utenteId];
            
            // Identifica blocchi di celle consecutive di tipo "work"
            let oreTotali = 0;
            let inizioBlocco: number | null = null;
            
            // Scan per blocchi di "work"
            for (let i = 0; i < utenteDati.celle.length; i++) {
              if (utenteDati.celle[i].tipo === "work") {
                if (inizioBlocco === null) {
                  inizioBlocco = i;
                }
                
                // Se siamo all'ultima cella e c'è un blocco aperto
                if (i === utenteDati.celle.length - 1 && inizioBlocco !== null) {
                  // Calcola ore per questo blocco
                  const numCelle = i - inizioBlocco + 1;
                  oreTotali += calcolaOreLavoro(numCelle);
                  inizioBlocco = null;
                }
              } else if (inizioBlocco !== null) {
                // Fine di un blocco, calcola ore
                const numCelle = i - inizioBlocco;
                oreTotali += calcolaOreLavoro(numCelle);
                inizioBlocco = null;
              }
            }
            
            // Aggiorna il totale arrotondato a 1 decimale
            nuoviDatiGriglia[giorno][utenteId].totale = Math.round(oreTotali * 10) / 10;
          } catch (error) {
            console.error("Errore nel calcolo ore per utente:", utenteIdStr, error);
          }
        });
      });
      
      setDatiGriglia(nuoviDatiGriglia);
    } catch (error) {
      console.error("Errore generale nell'inizializzazione griglia:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'inizializzazione della griglia turni.",
        variant: "destructive"
      });
    }
  }, [scheduleId, utenti, turni, richiesteFerie, slotOrari, giorniSettimana, toast]);
  
  // GESTIONE CLICK SU CELLA (solo per admin)
  const handleClickCella = (utenteId: number, indiceOrario: number, giorno: string) => {
    if (!vistaAdmin || !scheduleId || pubblicato) {
      if (vistaAdmin && pubblicato) {
        toast({
          title: "Turno pubblicato",
          description: "Non puoi modificare un turno già pubblicato.",
          variant: "destructive"
        });
      }
      return;
    }
    
    try {
      // Crea copia dei dati
      const nuoviDatiGriglia = JSON.parse(JSON.stringify(datiGriglia));
      if (!nuoviDatiGriglia[giorno] || !nuoviDatiGriglia[giorno][utenteId]) return;
      
      const datiUtente = nuoviDatiGriglia[giorno][utenteId];
      const cellaCorrente = datiUtente.celle[indiceOrario];
      
      // Non permettere modifica delle celle di ferie/permessi approvati
      if (cellaCorrente.permesso) {
        toast({
          title: "Azione non permessa",
          description: "Non puoi modificare una cella che rappresenta ferie o permessi già approvati.",
          variant: "destructive"
        });
        return;
      }
      
      // Cicla tra i tipi: "" -> "work" -> "vacation" -> "leave" -> ""
      let nuovoTipo = "work";
      
      if (cellaCorrente.tipo) {
        if (cellaCorrente.tipo === "work") nuovoTipo = "vacation";
        else if (cellaCorrente.tipo === "vacation") nuovoTipo = "leave";
        else if (cellaCorrente.tipo === "leave") nuovoTipo = "";
      }
      
      // Aggiorna la cella
      datiUtente.celle[indiceOrario].tipo = nuovoTipo;
      
      // Ricalcola il totale
      let oreTotali = 0;
      let inizioBlocco: number | null = null;
      
      // Scan per blocchi di "work"
      for (let i = 0; i < datiUtente.celle.length; i++) {
        if (datiUtente.celle[i].tipo === "work") {
          if (inizioBlocco === null) {
            inizioBlocco = i;
          }
          
          // Se siamo all'ultima cella e c'è un blocco aperto
          if (i === datiUtente.celle.length - 1 && inizioBlocco !== null) {
            // Calcola ore per questo blocco
            const numCelle = i - inizioBlocco + 1;
            oreTotali += calcolaOreLavoro(numCelle);
            inizioBlocco = null;
          }
        } else if (inizioBlocco !== null) {
          // Fine di un blocco, calcola ore
          const numCelle = i - inizioBlocco;
          oreTotali += calcolaOreLavoro(numCelle);
          inizioBlocco = null;
        }
      }
      
      // Aggiorna il totale arrotondato a 1 decimale
      datiUtente.totale = Math.round(oreTotali * 10) / 10;
      
      // Aggiorna lo stato
      setDatiGriglia(nuoviDatiGriglia);
      
      // Conferma con un toast
      toast({
        title: "Cella aggiornata",
        description: `Tipo: ${nuovoTipo || "nessuno"}, Ore totali: ${datiUtente.totale}`,
      });
    } catch (error) {
      console.error("Errore nell'aggiornamento cella:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della cella.",
        variant: "destructive"
      });
    }
  };
  
  // GESTIONE MODIFICA NOTE
  const handleCambioNote = (utenteId: number, giorno: string, nuoveNote: string) => {
    if (!vistaAdmin || !scheduleId || pubblicato) return;
    
    try {
      const nuoviDatiGriglia = JSON.parse(JSON.stringify(datiGriglia));
      if (!nuoviDatiGriglia[giorno] || !nuoviDatiGriglia[giorno][utenteId]) return;
      
      nuoviDatiGriglia[giorno][utenteId].note = nuoveNote;
      setDatiGriglia(nuoviDatiGriglia);
    } catch (error) {
      console.error("Errore nell'aggiornamento note:", error);
    }
  };
  
  // Se non c'è un turno selezionato, mostra messaggio informativo
  if (!scheduleId) {
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
  
  // Se non ci sono dati, mostra spinner
  if (Object.keys(datiGriglia).length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Spinner size="lg" />
            <p className="mt-2 text-muted-foreground">Caricamento turni...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full shadow-lg border-opacity-50">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              Turni {format(dataInizio, "d MMMM", { locale: it })} - {format(dataFine, "d MMMM yyyy", { locale: it })}
            </h2>
            <div className="text-muted-foreground">
              Pianificazione settimanale {pubblicato && <Badge>Pubblicato</Badge>}
            </div>
          </div>
          
          {vistaAdmin && !pubblicato && (
            <Button 
              onClick={onPubblica} 
              disabled={!scheduleId || pubblicato}
              className="bg-primary hover:bg-primary/90"
            >
              Pubblica turni
            </Button>
          )}
        </div>
        
        <Tabs 
          defaultValue={giorniSettimana[giornoSelezionato].nome} 
          onValueChange={(value) => {
            const indiceDiGiorno = giorniSettimana.findIndex(d => d.nome === value);
            if (indiceDiGiorno !== -1) {
              setGiornoSelezionato(indiceDiGiorno);
            }
          }}
          className="space-y-4"
        >
          <TabsList className="flex flex-wrap w-full">
            {giorniSettimana.map((giorno, index) => (
              <TabsTrigger
                key={giorno.nome}
                value={giorno.nome}
                className="flex-1 min-w-[3rem] text-xs sm:text-sm"
              >
                <span className="hidden sm:inline">{giorno.nome}</span>
                <span className="sm:hidden">{giorno.nomeCorto}</span>
                <span className="text-xs ml-1 opacity-70">{giorno.formatoData}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {giorniSettimana.map((giorno) => (
            <TabsContent key={giorno.nome} value={giorno.nome} className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="py-2 px-4 text-left text-sm font-medium sticky left-0 bg-muted/50 min-w-[150px]">Dipendente</th>
                      {slotOrari.slice(0, -1).map((ora, i) => (
                        <th key={i} className="py-2 px-1 text-center text-xs font-normal">
                          {i % 2 === 0 && (
                            <span>{ora.split(':')[0]}</span>
                          )}
                        </th>
                      ))}
                      <th className="py-2 px-4 text-center text-sm font-medium whitespace-nowrap">Ore</th>
                      <th className="py-2 px-4 text-center text-sm font-medium whitespace-nowrap">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datiGriglia[giorno.nome] && Object.entries(datiGriglia[giorno.nome])
                      .map(([utenteIdStr, datiUtente]) => {
                        const utenteId = parseInt(utenteIdStr);
                        const utente = utenti.find(u => u.id === utenteId);
                        if (!utente) return null;
                        
                        return (
                          <tr key={utenteId} className="border-b hover:bg-muted/20">
                            <td className="py-2 px-4 text-sm sticky left-0 bg-white dark:bg-background z-10">
                              {utente.name}
                            </td>
                            
                            {datiUtente.celle.map((cella, indiceOrario) => (
                              <td 
                                key={indiceOrario} 
                                className={`py-1 px-1 text-center text-xs cursor-pointer border-r border-gray-100 dark:border-gray-800 ${
                                  cella.tipo === 'work' 
                                    ? 'bg-primary/20' 
                                    : cella.tipo === 'vacation' 
                                    ? 'bg-green-100 dark:bg-green-900/20' 
                                    : cella.tipo === 'leave' 
                                    ? 'bg-yellow-100 dark:bg-yellow-900/20' 
                                    : ''
                                }`}
                                onClick={() => handleClickCella(utenteId, indiceOrario, giorno.nome)}
                              >
                                {cella.tipo && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="w-full h-6"></div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{cella.tipo === 'work' ? 'Lavoro' : cella.tipo === 'vacation' ? 'Ferie' : 'Permesso'}</p>
                                        <p>{slotOrari[indiceOrario]} - {slotOrari[indiceOrario + 1]}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </td>
                            ))}
                            
                            <td className="py-2 px-4 text-center text-sm font-medium">
                              {datiUtente.totale}
                            </td>
                            
                            <td className="py-2 px-2">
                              <Input
                                value={datiUtente.note}
                                onChange={(e) => handleCambioNote(utenteId, giorno.nome, e.target.value)}
                                placeholder="Note..."
                                disabled={!vistaAdmin || pubblicato}
                                className="text-sm h-8"
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}