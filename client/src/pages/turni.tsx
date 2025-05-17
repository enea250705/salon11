import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout/layout";
import { GrigliaTurni } from "@/components/schedule/griglia-turni";
import { VistaTurniDipendente } from "@/components/schedule/vista-turni-dipendente";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { it } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ScheduleSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedules: any[];
  onSelectSchedule: (scheduleId: number) => void;
}

/**
 * Dialogo per selezionare una settimana specifica di turni
 */
function ScheduleSelectDialog({ open, onOpenChange, schedules, onSelectSchedule }: ScheduleSelectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Seleziona periodo turni</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            {schedules.length > 0 ? (
              schedules.map(schedule => (
                <div 
                  key={schedule.id}
                  className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-muted/20"
                  onClick={() => {
                    onSelectSchedule(schedule.id);
                    onOpenChange(false);
                  }}
                >
                  <div>
                    <p className="font-medium">
                      {format(new Date(schedule.startDate), "d MMMM", { locale: it })} - {format(new Date(schedule.endDate), "d MMMM yyyy", { locale: it })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {schedule.isPublished 
                        ? `Pubblicato il ${format(new Date(schedule.publishedAt), "d MMMM, HH:mm", { locale: it })}`
                        : "Non ancora pubblicato"}
                    </p>
                  </div>
                  <span className="material-icons text-gray-400">chevron_right</span>
                </div>
              ))
            ) : (
              <p className="text-center py-2 text-muted-foreground">
                Nessun turno disponibile
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Pagina principale per la gestione e visualizzazione dei turni
 * Mostra diverse interfacce in base al ruolo dell'utente
 */
export default function PaginaTurni() {
  const { user } = useAuth();
  const [data, setData] = useState<Date>(new Date());
  const [showScheduleSelector, setShowScheduleSelector] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  
  // Flag per sapere se siamo in modalità admin
  const isAdmin = user?.role === "admin";
  
  // Calcola date della settimana
  const weekStart = startOfWeek(data, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(data, { weekStartsOn: 1 });
  
  // Carica tutti i programmi dei turni
  const { data: schedules = [] } = useQuery<any[]>({
    queryKey: ["/api/schedules/all"],
  });
  
  // Se siamo admin, mostriamo tutti i turni. Altrimenti, solo quelli pubblicati
  const filteredSchedules = isAdmin 
    ? schedules
    : schedules.filter(schedule => schedule.isPublished);
  
  // Ordina per data (più recente prima)
  const sortedSchedules = [...filteredSchedules]
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  
  // Trova il programma che contiene la settimana corrente o se non esiste, quello più recente
  // Se l'utente ha selezionato manualmente un programma, usa quello
  const currentSchedule = selectedScheduleId 
    ? sortedSchedules.find(schedule => schedule.id === selectedScheduleId)
    : sortedSchedules.find(
        schedule => 
          new Date(schedule.startDate) <= data && 
          new Date(schedule.endDate) >= data
      ) || sortedSchedules[0];
  
  // Carica gli utenti (solo per admin)
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin
  });
  
  // Carica i turni per il programma corrente
  const { data: shifts = [] } = useQuery<any[]>({
    queryKey: [`/api/schedules/${currentSchedule?.id}/shifts`],
    enabled: !!currentSchedule?.id,
  });
  
  // Per dipendenti: carica solo i propri turni
  const { data: userShifts = [] } = useQuery<any[]>({
    queryKey: [`/api/schedules/${currentSchedule?.id}/shifts/user/${user?.id}`],
    enabled: !isAdmin && !!currentSchedule?.id && !!user?.id,
  });
  
  // Carica richieste ferie/permessi
  const { data: timeOffRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/time-off-requests"],
  });
  
  // Gestisce la selezione di un programma specifico
  const handleSelectSchedule = (scheduleId: number) => {
    setSelectedScheduleId(scheduleId);
    setShowScheduleSelector(false);
    
    const selectedSchedule = sortedSchedules.find(s => s.id === scheduleId);
    if (selectedSchedule) {
      // Aggiorna la data corrente per visualizzare la settimana giusta
      setData(new Date(selectedSchedule.startDate));
    }
  };
  
  // Gestisce la pubblicazione di un turno (solo per admin)
  const handlePublishSchedule = async () => {
    if (!currentSchedule?.id || !isAdmin) return;
    
    try {
      const response = await fetch(`/api/schedules/${currentSchedule.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Errore durante la pubblicazione del turno');
      }
      
      // Aggiorna la cache dei turni
      window.location.reload();
    } catch (error) {
      console.error('Errore durante la pubblicazione:', error);
      alert('Si è verificato un errore durante la pubblicazione del turno. Riprova più tardi.');
    }
  };
  
  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">{isAdmin ? "Gestione Turni" : "I Miei Turni"}</h1>
        
        {/* Dialog per selezionare una settimana specifica */}
        <ScheduleSelectDialog
          open={showScheduleSelector}
          onOpenChange={setShowScheduleSelector}
          schedules={sortedSchedules}
          onSelectSchedule={handleSelectSchedule}
        />
        
        {/* Layout Desktop e Tablet */}
        <div className="hidden sm:grid sm:grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Colonna sinistra con calendario e dettagli */}
          <div className="space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Calendario</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={date => date && setData(date)}
                  className="rounded-md"
                  locale={it}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Dettagli Periodo</CardTitle>
              </CardHeader>
              <CardContent>
                {currentSchedule ? (
                  <div className="space-y-4">
                    <div className="text-sm">
                      <div className="font-medium">Periodo:</div>
                      <div>
                        {format(new Date(currentSchedule.startDate), "d MMMM", { locale: it })} - {format(new Date(currentSchedule.endDate), "d MMMM yyyy", { locale: it })}
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <div className="font-medium">Stato:</div>
                      <div>
                        {currentSchedule.isPublished ? 
                          `Pubblicato il ${format(new Date(currentSchedule.publishedAt), "d MMMM, HH:mm", { locale: it })}` :
                          "Bozza"
                        }
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-4"
                      onClick={() => setShowScheduleSelector(true)}
                    >
                      <span className="material-icons text-sm mr-1">calendar_month</span>
                      Seleziona altro periodo
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Nessun turno disponibile.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Colonna destra con griglia turni o vista dipendente */}
          <div className="md:col-span-2">
            {isAdmin ? (
              <GrigliaTurni
                scheduleId={currentSchedule?.id || null}
                utenti={users}
                dataInizio={currentSchedule ? new Date(currentSchedule.startDate) : new Date()}
                dataFine={currentSchedule ? new Date(currentSchedule.endDate) : new Date()}
                turni={shifts}
                richiesteFerie={timeOffRequests}
                pubblicato={currentSchedule?.isPublished || false}
                onPubblica={handlePublishSchedule}
                vistaAdmin={true}
              />
            ) : (
              <VistaTurniDipendente
                schedule={currentSchedule}
                turni={shifts} 
                turniUtente={userShifts}
              />
            )}
          </div>
        </div>
        
        {/* Layout Mobile */}
        <div className="sm:hidden space-y-4">
          <Card>
            <CardHeader className="p-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Riepilogo</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowScheduleSelector(true)}
              >
                <span className="material-icons text-sm mr-1">calendar_month</span>
                Altro periodo
              </Button>
            </CardHeader>
            <CardContent className="pb-3 pt-0">
              {currentSchedule ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <div className="font-medium">Periodo:</div>
                    <div>{format(new Date(currentSchedule.startDate), "d MMM", { locale: it })} - {format(new Date(currentSchedule.endDate), "d MMM", { locale: it })}</div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="font-medium">Stato:</div>
                    <div className="font-semibold text-blue-700">
                      {currentSchedule.isPublished ? "Pubblicato" : "Bozza"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Nessun turno disponibile.
                </div>
              )}
            </CardContent>
          </Card>
          
          {isAdmin ? (
            <GrigliaTurni
              scheduleId={currentSchedule?.id || null}
              utenti={users}
              dataInizio={currentSchedule ? new Date(currentSchedule.startDate) : new Date()}
              dataFine={currentSchedule ? new Date(currentSchedule.endDate) : new Date()}
              turni={shifts}
              richiesteFerie={timeOffRequests}
              pubblicato={currentSchedule?.isPublished || false}
              onPubblica={handlePublishSchedule}
              vistaAdmin={true}
            />
          ) : (
            <VistaTurniDipendente
              schedule={currentSchedule}
              turni={shifts} 
              turniUtente={userShifts}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}