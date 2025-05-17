import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { navigateTo } from "@/lib/navigation";
import { format, isToday, parseISO, isBefore, startOfToday, endOfDay, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarClock, ChevronRight } from "lucide-react";
import { formatHours } from "@/lib/hours-calculator";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";

/**
 * Componente che mostra i prossimi turni per l'utente autenticato
 */
export function ProssimiTurni() {
  const [, setLocation] = useLocation();
  
  // Recupera l'utente autenticato
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include"
      });
      if (!res.ok) return null;
      return res.json();
    }
  });
  
  // Recupera tutti gli schedules
  const { data: schedules = [] } = useQuery({
    queryKey: ["/api/schedules"],
    queryFn: async ({ queryKey }) => {
      if (!user) return [];
      const res = await fetch(queryKey[0] as string, {
        credentials: "include"
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user
  });
  
  // Recupera i turni dell'utente
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["/api/shifts/user"],
    queryFn: async ({ queryKey }) => {
      if (!user) return [];
      const res = await fetch(queryKey[0] as string, {
        credentials: "include"
      });
      if (!res.ok) return [];
      
      const shifts = await res.json();
      
      // Organizziamo i turni per data
      return shifts.filter((shift: any) => {
        // Filtriamo solo i turni di tipo "work"
        if (shift.type !== "work") return false;
        
        // Filtriamo solo i turni di oggi o futuri
        const shiftDate = parseISO(shift.date);
        return !isBefore(shiftDate, startOfToday()) || isToday(shiftDate);
      }).sort((a: any, b: any) => {
        // Ordiniamo per data e poi per ora di inizio
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        return a.startTime.localeCompare(b.startTime);
      }).slice(0, 5); // Prendiamo solo i prossimi 5 turni
    },
    enabled: !!user
  });
  
  const handleViewAllShifts = () => {
    navigateTo("/my-schedule", setLocation);
  };
  
  const getScheduleForShift = (shift: any) => {
    if (!schedules.length) return null;
    
    const shiftDate = parseISO(shift.date);
    
    return schedules.find((schedule: any) => {
      const scheduleStart = parseISO(schedule.startDate);
      const scheduleEnd = parseISO(schedule.endDate);
      
      // Verifica se la data del turno è compresa nello schedule
      return !isBefore(shiftDate, scheduleStart) && 
             !isBefore(endOfDay(scheduleEnd), shiftDate);
    });
  };
  
  const getShiftDisplayInfo = (shift: any) => {
    const shiftDate = parseISO(shift.date);
    const isCurrentDay = isToday(shiftDate);
    
    const dateLabel = isCurrentDay 
      ? "Oggi" 
      : isToday(addDays(shiftDate, -1))
      ? "Domani"
      : format(shiftDate, "EEEE", { locale: it });
    
    const hours = calculateShiftHours(shift);
    
    return {
      dateLabel,
      formattedDate: format(shiftDate, "d MMMM", { locale: it }),
      timeRange: `${shift.startTime} - ${shift.endTime}`,
      hours
    };
  };
  
  // Calcola le ore di un turno considerando casi speciali
  const calculateShiftHours = (shift: any) => {
    // Casi speciali
    if (shift.startTime === "04:00" && shift.endTime === "06:00") {
      return 2.0;
    }
    if (shift.startTime === "04:00" && shift.endTime === "00:00") {
      return 20.0;
    }
    
    // Calcolo standard
    const startParts = shift.startTime.split(':').map(Number);
    const endParts = shift.endTime.split(':').map(Number);
    
    let startMinutes = startParts[0] * 60 + startParts[1];
    let endMinutes = endParts[0] * 60 + endParts[1];
    
    // Gestione passaggio di mezzanotte
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60;
    }
    
    // Differenza in minuti
    let diffMinutes = endMinutes - startMinutes;
    
    // REGOLA: Primo blocco di 30 minuti = 0 ore
    if (diffMinutes <= 30) {
      return 0;
    }
    
    // Sottrai 30 minuti (primo blocco)
    diffMinutes -= 30;
    
    // Converti in ore
    return Math.round((diffMinutes / 60) * 100) / 100;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <CalendarClock className="h-5 w-5" />
            Prossimi Turni
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <Spinner size="md" />
          <p className="text-sm text-muted-foreground mt-2">Caricamento turni...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!shifts.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <CalendarClock className="h-5 w-5" />
            Prossimi Turni
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Non hai turni programmati prossimamente
          </p>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleViewAllShifts}
          >
            Vedi tutti i turni
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <CalendarClock className="h-5 w-5" />
          Prossimi Turni
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 py-0">
        <div className="space-y-1">
          {shifts.map((shift: any, index: number) => {
            const { dateLabel, formattedDate, timeRange, hours } = getShiftDisplayInfo(shift);
            
            return (
              <div key={shift.id} className="px-2">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium">
                      {dateLabel}
                      <span className="text-muted-foreground text-xs ml-1">
                        {formattedDate}
                      </span>
                    </div>
                    <div className="text-sm flex items-center gap-2">
                      <span className="text-primary">{timeRange}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {formatHours(hours)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-medium">
                    work
                  </div>
                </div>
                {index < shifts.length - 1 && <Separator />}
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleViewAllShifts}
        >
          Vedi tutti i turni
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}