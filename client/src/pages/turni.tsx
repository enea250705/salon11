import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Layout } from "@/components/layout/layout";
import { GrigliaTurni } from "@/components/schedule/griglia-turni";
import { VistaTurniDipendente } from "@/components/schedule/vista-turni-dipendente";
import { useAuth } from "@/hooks/use-auth";

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
          <DialogTitle>Seleziona settimana</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {schedules.map((schedule) => (
            <Button
              key={schedule.id}
              variant="outline"
              className="justify-start text-left font-normal"
              onClick={() => {
                onSelectSchedule(schedule.id);
                onOpenChange(false);
              }}
            >
              <span className="flex items-center">
                <span className="material-icons mr-2 text-primary">
                  {schedule.isPublished ? "calendar_month" : "pending_actions"}
                </span>
                {format(new Date(schedule.startDate), "d MMMM", { locale: it })} - {" "}
                {format(new Date(schedule.endDate), "d MMMM yyyy", { locale: it })}
                {schedule.isPublished && (
                  <span className="ml-2 text-xs text-green-600 rounded-full bg-green-100 px-2 py-0.5">
                    Pubblicato
                  </span>
                )}
              </span>
            </Button>
          ))}
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
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  
  // Data corrente per default
  const oggi = new Date();
  const inizioSettimana = startOfWeek(oggi, { weekStartsOn: 1 });
  const fineSettimana = endOfWeek(oggi, { weekStartsOn: 1 });
  
  // Query per ottenere tutti gli schedules
  const { data: schedules, isLoading: loadingSchedules } = useQuery<any[]>({
    queryKey: ['/api/schedules/all'],
    enabled: !!user,
  });

  // Query per ottenere uno schedule specifico in base alla data corrente o all'ID selezionato
  const { data: currentSchedule, isLoading: loadingCurrentSchedule } = useQuery<any>({
    queryKey: ['/api/schedules', selectedScheduleId ? { id: selectedScheduleId } : { startDate: format(inizioSettimana, 'yyyy-MM-dd') }],
    enabled: !!user,
  });

  // Query per ottenere gli utenti
  const { data: users, isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: !!user,
  });
  
  // Query per ottenere le richieste di ferie
  const { data: timeOffRequests, isLoading: loadingTimeOff } = useQuery<any[]>({
    queryKey: ['/api/time-off-requests'],
    enabled: !!user,
  });
  
  // Query per ottenere i turni dello schedule corrente
  const { data: shifts, isLoading: loadingShifts } = useQuery<any[]>({
    queryKey: ['/api/schedules/' + (currentSchedule?.id || 0) + '/shifts'],
    enabled: !!currentSchedule?.id,
  });
  
  // Query per ottenere solo i turni dell'utente corrente
  const { data: userShifts, isLoading: loadingUserShifts } = useQuery<any[]>({
    queryKey: ['/api/users/' + (user?.id || 0) + '/schedules/' + (currentSchedule?.id || 0) + '/shifts'],
    enabled: !!user?.id && !!currentSchedule?.id && user?.role === 'employee',
  });
  
  // Funzione per pubblicare uno schedule
  const handlePubblicaSchedule = async () => {
    if (!currentSchedule?.id) return;
    
    try {
      const response = await fetch(`/api/schedules/${currentSchedule.id}/publish`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Refresh dei dati
        window.location.reload();
      } else {
        console.error('Errore durante la pubblicazione dello schedule');
      }
    } catch (error) {
      console.error('Errore durante la pubblicazione dello schedule', error);
    }
  };
  
  // Gestione del caricamento
  const isLoading = loadingSchedules || loadingCurrentSchedule || loadingUsers || loadingTimeOff || loadingShifts || (user?.role === 'employee' && loadingUserShifts);
  
  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Gestione Turni</h1>
              <p className="text-muted-foreground">Sistema di gestione turni avanzato con calcolo ore corretto</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setScheduleDialogOpen(true)}
                className="flex items-center"
              >
                <span className="material-icons mr-2">date_range</span>
                <span>Cambia settimana</span>
              </Button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {user?.role === 'admin' ? (
                // Vista amministratore
                <GrigliaTurni
                  scheduleId={currentSchedule?.id || null}
                  utenti={Array.isArray(users) ? users : []}
                  dataInizio={currentSchedule ? new Date(currentSchedule.startDate) : inizioSettimana}
                  dataFine={currentSchedule ? new Date(currentSchedule.endDate) : fineSettimana}
                  turni={Array.isArray(shifts) ? shifts : []}
                  richiesteFerie={Array.isArray(timeOffRequests) ? timeOffRequests : []}
                  pubblicato={currentSchedule?.isPublished || false}
                  onPubblica={handlePubblicaSchedule}
                  vistaAdmin={true}
                />
              ) : (
                // Vista dipendente
                <VistaTurniDipendente 
                  schedule={currentSchedule || null}
                  turni={Array.isArray(shifts) ? shifts : []}
                  turniUtente={Array.isArray(userShifts) ? userShifts : []}
                />
              )}
            </>
          )}
          
          {/* Dialog per selezionare la settimana */}
          <ScheduleSelectDialog
            open={scheduleDialogOpen}
            onOpenChange={setScheduleDialogOpen}
            schedules={Array.isArray(schedules) ? schedules : []}
            onSelectSchedule={setSelectedScheduleId}
          />
        </div>
      </div>
    </Layout>
  );
}