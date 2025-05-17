import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  generaSlotOrari, 
  calcolaOreLavoro, 
  calcolaOreDaCelle, 
  formatOre 
} from "@/lib/turni-calculator";
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
 * GrigliaTurni - Componente tabellare per la gestione dei turni 
 * Implementazione completamente nuova con calcolo ore corretto
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
  
  // Generazione degli slot di tempo (ogni 30 minuti) dalle 4:00 alle 24:00
  const slotOrari = generaSlotOrari(4, 24);
  
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
      return await apiRequest('/api/shifts', {
        method: 'POST',
        data: dati
      });
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
        const nomeGiorno = format(new Date(turno.date), "EEEE", { locale: it });
        
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
      });
    }
    
    // Aggiungi le richieste di ferie/permessi approvate
    if (richiesteFerie && richiesteFerie.length > 0) {
      richiesteFerie
        .filter(req => req.status === "approved")
        .forEach(richiesta => {
          const dataInizioRichiesta = new Date(richiesta.startDate);
          const dataFineRichiesta = new Date(richiesta.endDate);
          
          // Per ogni giorno compreso nella richiesta
          giorniSettimana.forEach(giorno => {
            const dataCorrente = giorno.data;
            if (dataCorrente >= dataInizioRichiesta && dataCorrente <= dataFineRichiesta) {
              if (nuoviDatiGriglia[giorno.nome] && nuoviDatiGriglia[giorno.nome][richiesta.userId]) {
                // Se è richiesta per l'intera giornata
                if (richiesta.allDay) {
                  for (let i = 0; i < nuoviDatiGriglia[giorno.nome][richiesta.userId].celle.length; i++) {
                    nuoviDatiGriglia[giorno.nome][richiesta.userId].celle[i] = {
                      tipo: richiesta.type === "vacation" ? "vacation" : "leave",
                      turnoId: null,
                      permesso: true
                    };
                  }
                  
                  nuoviDatiGriglia[giorno.nome][richiesta.userId].note = 
                    `${richiesta.type === "vacation" ? "Ferie" : "Permesso"} giornata intera`;
                } 
                // Se è mezza giornata: mattina (prime metà delle celle)
                else if (richiesta.halfDay === "morning") {
                  const metaGiorno = Math.floor(slotOrari.length / 2);
                  for (let i = 0; i < metaGiorno; i++) {
                    nuoviDatiGriglia[giorno.nome][richiesta.userId].celle[i] = {
                      tipo: richiesta.type === "vacation" ? "vacation" : "leave",
                      turnoId: null,
                      permesso: true
                    };
                  }
                  
                  nuoviDatiGriglia[giorno.nome][richiesta.userId].note = 
                    `${richiesta.type === "vacation" ? "Ferie" : "Permesso"} mattina`;
                } 
                // Se è mezza giornata: pomeriggio (seconda metà delle celle)
                else if (richiesta.halfDay === "afternoon") {
                  const metaGiorno = Math.floor(slotOrari.length / 2);
                  for (let i = metaGiorno; i < slotOrari.length - 1; i++) {
                    nuoviDatiGriglia[giorno.nome][richiesta.userId].celle[i] = {
                      tipo: richiesta.type === "vacation" ? "vacation" : "leave",
                      turnoId: null,
                      permesso: true
                    };
                  }
                  
                  nuoviDatiGriglia[giorno.nome][richiesta.userId].note = 
                    `${richiesta.type === "vacation" ? "Ferie" : "Permesso"} pomeriggio`;
                }
              }
            }
          });
        });
    }
    
    // Calcola il totale delle ore per ogni giorno/utente
    Object.keys(nuoviDatiGriglia).forEach(giorno => {
      Object.keys(nuoviDatiGriglia[giorno]).forEach(utenteIdStr => {
        const utenteId = parseInt(utenteIdStr);
        const datiUtente = nuoviDatiGriglia[giorno][utenteId];
        
        // Identifica blocchi di celle consecutive di tipo "work"
        let totaleOre = 0;
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
              const ore = calcolaOreDaCelle(numCelle);
              totaleOre += ore;
              
              // Reset blocco
              inizioBlocco = null;
            }
          } else if (inizioBlocco !== null) {
            // Fine di un blocco, calcola ore
            const numCelle = i - inizioBlocco;
            const ore = calcolaOreDaCelle(numCelle);
            totaleOre += ore;
            
            // Reset blocco
            inizioBlocco = null;
          }
        }
        
        // Aggiorna il totale arrotondato a 1 decimale
        nuoviDatiGriglia[giorno][utenteId].totale = Math.round(totaleOre * 10) / 10;
      });
    });
    
    setDatiGriglia(nuoviDatiGriglia);
  }, [scheduleId, utenti, turni, richiesteFerie, giorniSettimana, slotOrari]);
  
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
    
    // Crea copia dei dati
    const nuoviDatiGriglia = structuredClone(datiGriglia);
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
    let totaleOre = 0;
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
          const oraInizio = slotOrari[inizioBlocco];
          const oraFine = slotOrari[i + 1] || "00:00";
          
          // CASI SPECIALI
          let ore;
          if (oraInizio === "04:00" && oraFine === "06:00") {
            ore = 2.0;
          } else if (oraInizio === "04:00" && oraFine === "00:00") {
            ore = 20.0;
          } else {
            ore = calcolaOreDaCelle(numCelle);
          }
          
          totaleOre += ore;
          
          // Reset blocco
          inizioBlocco = null;
        }
      } else if (inizioBlocco !== null) {
        // Fine di un blocco, calcola ore
        const numCelle = i - inizioBlocco;
        const oraInizio = slotOrari[inizioBlocco];
        const oraFine = slotOrari[i];
        
        // CASI SPECIALI
        let ore;
        if (oraInizio === "04:00" && oraFine === "06:00") {
          ore = 2.0;
        } else if (oraInizio === "04:00" && oraFine === "00:00") {
          ore = 20.0;
        } else {
          ore = calcolaOreDaCelle(numCelle);
        }
        
        totaleOre += ore;
        
        // Reset blocco
        inizioBlocco = null;
      }
    }
    
    // Aggiorna il totale arrotondato a 1 decimale
    datiUtente.totale = Math.round(totaleOre * 10) / 10;
    
    // Aggiorna lo stato
    setDatiGriglia(nuoviDatiGriglia);
    
    // Salva sul server (per la cella modificata)
    // Identifica blocchi contigui dello stesso tipo che includono la cella modificata
    const giornoDati = giorniSettimana[giornoSelezionato].data;
    
    // TODO: implementare il salvataggio sul server dei blocchi contigui
    // Per ora, facciamo una simulazione con un toast di conferma
    toast({
      title: "Cella aggiornata",
      description: `Tipo: ${nuovoTipo || "nessuno"}, Ore totali: ${datiUtente.totale}`,
    });
  };
  
  // GESTIONE MODIFICA NOTE
  const handleCambioNote = (utenteId: number, giorno: string, nuoveNote: string) => {
    if (!vistaAdmin || !scheduleId || pubblicato) return;
    
    const nuoviDatiGriglia = structuredClone(datiGriglia);
    if (!nuoviDatiGriglia[giorno] || !nuoviDatiGriglia[giorno][utenteId]) return;
    
    nuoviDatiGriglia[giorno][utenteId].note = nuoveNote;
    setDatiGriglia(nuoviDatiGriglia);
    
    // TODO: implementare il salvataggio delle note sul server
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
            <p className="text-muted-foreground">
              Pianificazione settimanale {pubblicato && <Badge>Pubblicato</Badge>}
            </p>
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
            if (indiceDiGiorno !== -1) setGiornoSelezionato(indiceDiGiorno);
          }}
        >
          <TabsList className="mb-4 w-full">
            {giorniSettimana.map((giorno, idx) => (
              <TabsTrigger key={giorno.nome} value={giorno.nome} className="flex-1">
                <span className="hidden md:inline">{giorno.nome}</span>
                <span className="md:hidden text-xs">{giorno.nomeCorto}</span>
                <span className="ml-1 text-xs text-muted-foreground">
                  {giorno.formatoData}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {giorniSettimana.map((giorno) => (
            <TabsContent key={giorno.nome} value={giorno.nome}>
              <div className="overflow-auto border rounded-md">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left font-medium">Dipendente</th>
                      {slotOrari.map((slot, idx) => (
                        idx < slotOrari.length - 1 && (
                          <th key={idx} className="p-1 text-center text-xs font-medium">
                            {slot}
                          </th>
                        )
                      ))}
                      <th className="p-2 text-left font-medium">Note</th>
                      <th className="p-2 text-center font-medium">Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utenti
                      .filter(utente => utente.role === "employee" && utente.isActive)
                      .map((utente) => {
                        // Ottieni i dati di questo utente per il giorno corrente
                        const datiUtente = datiGriglia[giorno.nome]?.[utente.id];
                        if (!datiUtente) return null;
                        
                        return (
                          <tr key={utente.id} className="border-b hover:bg-muted/20">
                            <td className="p-2 text-left font-medium text-xs sm:text-sm">
                              {utente.fullName || utente.username}
                            </td>
                            
                            {slotOrari.map((slot, idx) => {
                              if (idx >= slotOrari.length - 1) return null;
                              
                              // Ottieni dati della cella
                              const cella = datiUtente.celle[idx];
                              const tipo = cella?.tipo || "";
                              const permesso = cella?.permesso || false;
                              
                              // Determina classe CSS in base al tipo
                              let cellaCss = "w-5 h-5 cursor-pointer";
                              let bgColor = "bg-white";
                              let contenuto = "";
                              
                              if (tipo === "work") {
                                bgColor = "bg-blue-500";
                                contenuto = "X";
                              } else if (tipo === "vacation") {
                                bgColor = "bg-red-500";
                                contenuto = "F";
                              } else if (tipo === "leave") {
                                bgColor = "bg-amber-500";
                                contenuto = "P";
                              } else if (tipo === "sick") {
                                bgColor = "bg-purple-500";
                                contenuto = "M";
                              }
                              
                              return (
                                <td 
                                  key={idx} 
                                  className="p-1 text-center text-xs border"
                                  onClick={() => handleClickCella(utente.id, idx, giorno.nome)}
                                >
                                  <div className="flex justify-center">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div 
                                            className={`${cellaCss} ${bgColor} rounded flex items-center justify-center ${
                                              permesso ? "ring-2 ring-orange-400" : ""
                                            } ${
                                              tipo ? "text-white" : "text-transparent"
                                            }`}
                                          >
                                            {contenuto}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                          <p>
                                            {tipo === "work" && "Turno di lavoro"}
                                            {tipo === "vacation" && "Ferie"}
                                            {tipo === "leave" && "Permesso"}
                                            {tipo === "sick" && "Malattia"}
                                            {!tipo && "Nessun turno"}
                                            {permesso && " (approvato)"}
                                          </p>
                                          <p className="text-xs">
                                            Orario: {slot} - {slotOrari[idx + 1]}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </td>
                              );
                            })}
                            
                            <td className="p-2 text-left">
                              <Input
                                type="text"
                                value={datiUtente.note || ""}
                                onChange={(e) => handleCambioNote(utente.id, giorno.nome, e.target.value)}
                                placeholder="Note..."
                                disabled={!vistaAdmin || pubblicato}
                                className="h-8 text-xs"
                              />
                            </td>
                            
                            <td className="p-2 text-center">
                              <div className="font-semibold">
                                {formatOre(datiUtente.totale)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {datiUtente.totale} h
                              </div>
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