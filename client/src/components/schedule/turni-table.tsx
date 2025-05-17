import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  generateTimeSlots, 
  calculateHoursFromCells, 
  calculateHoursBetweenTimes,
  formatHours 
} from "@/lib/hours-calculator";

type TurniTableProps = {
  scheduleId: number | null;
  users: any[];
  startDate: Date;
  endDate: Date;
  shifts: any[];
  timeOffRequests: any[];
  isPublished: boolean;
  onPublish?: () => void;
  isAdminView?: boolean;
};

/**
 * TurniTable - Componente tabellare per visualizzazione e gestione dei turni
 * Implementazione da zero con calcolo ore corretto
 */
export function TurniTable({
  scheduleId,
  users,
  startDate,
  endDate,
  shifts,
  timeOffRequests,
  isPublished,
  onPublish,
  isAdminView = true
}: TurniTableProps) {
  const { toast } = useToast();
  
  // Generazione degli slot di tempo (30 minuti) dalle 4:00 alle 24:00
  const timeSlots = generateTimeSlots(4, 24);
  
  // Preparazione giorni della settimana
  const weekDays = (() => {
    try {
      // Verifica che le date siano valide
      if (!(startDate instanceof Date) || isNaN(startDate.getTime()) || 
          !(endDate instanceof Date) || isNaN(endDate.getTime())) {
        console.error("Date non valide", { startDate, endDate });
        return [];
      }
      
      // Calcola il numero di giorni tra inizio e fine
      const days = Math.min(7, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      
      // Crea l'array di giorni
      return Array.from({ length: days }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return {
          date,
          name: format(date, "EEEE", { locale: it }),
          shortName: format(date, "EEE", { locale: it }),
          formattedDate: format(date, "dd/MM")
        };
      });
    } catch (error) {
      console.error("Errore nella generazione dei giorni", error);
      return [];
    }
  })();
  
  // State per il giorno selezionato
  const [selectedDay, setSelectedDay] = useState(0);
  
  // State per i dati della griglia
  const [gridData, setGridData] = useState<Record<string, Record<number, {
    cells: Array<{ type: string; shiftId: number | null; isTimeOff?: boolean }>;
    notes: string;
    total: number;
  }>>>({});
  
  // INIZIALIZZAZIONE GRIGLIA
  useEffect(() => {
    if (!scheduleId || !users.length) return;
    
    console.log("🔄 Inizializzazione griglia turni...");
    
    // Crea struttura dati vuota
    const newGridData: Record<string, Record<number, any>> = {};
    
    // Inizializza ogni giorno con una struttura vuota per ogni utente
    weekDays.forEach(day => {
      newGridData[day.name] = {};
      
      users
        .filter(user => user.role === "employee")
        .forEach(user => {
          newGridData[day.name][user.id] = {
            cells: Array(timeSlots.length - 1).fill(null).map(() => ({ 
              type: "", 
              shiftId: null 
            })),
            notes: "",
            total: 0
          };
        });
    });
    
    // Popola la griglia con i turni esistenti
    if (shifts && shifts.length > 0) {
      shifts.forEach(shift => {
        const dayName = format(new Date(shift.date), "EEEE", { locale: it });
        
        if (newGridData[dayName] && newGridData[dayName][shift.userId]) {
          // Trova gli indici di inizio e fine del turno
          const startIndex = timeSlots.findIndex(t => t === shift.startTime);
          const endIndex = timeSlots.findIndex(t => t === shift.endTime);
          
          if (startIndex !== -1 && endIndex !== -1) {
            // Imposta le celle come "work"
            for (let i = startIndex; i < endIndex; i++) {
              if (i < newGridData[dayName][shift.userId].cells.length) {
                newGridData[dayName][shift.userId].cells[i] = {
                  type: shift.type || "work",
                  shiftId: shift.id
                };
              }
            }
            
            // Imposta le note
            if (shift.notes) {
              newGridData[dayName][shift.userId].notes = shift.notes;
            }
          }
        }
      });
    }
    
    // Aggiungi le richieste di ferie/permessi approvate
    if (timeOffRequests && timeOffRequests.length > 0) {
      timeOffRequests
        .filter(req => req.status === "approved")
        .forEach(request => {
          const reqStartDate = new Date(request.startDate);
          const reqEndDate = new Date(request.endDate);
          
          // Per ogni giorno compreso nella richiesta
          weekDays.forEach(day => {
            const currentDate = day.date;
            if (currentDate >= reqStartDate && currentDate <= reqEndDate) {
              if (newGridData[day.name] && newGridData[day.name][request.userId]) {
                // Se è richiesta per l'intera giornata
                if (request.allDay) {
                  for (let i = 0; i < newGridData[day.name][request.userId].cells.length; i++) {
                    newGridData[day.name][request.userId].cells[i] = {
                      type: request.type === "vacation" ? "vacation" : "leave",
                      isTimeOff: true
                    };
                  }
                  
                  newGridData[day.name][request.userId].notes = 
                    `${request.type === "vacation" ? "Ferie" : "Permesso"} giornata intera`;
                } 
                // Se è mezza giornata: mattina (prime metà delle celle)
                else if (request.halfDay === "morning") {
                  const halfDay = Math.floor(timeSlots.length / 2);
                  for (let i = 0; i < halfDay; i++) {
                    newGridData[day.name][request.userId].cells[i] = {
                      type: request.type === "vacation" ? "vacation" : "leave",
                      isTimeOff: true
                    };
                  }
                  
                  newGridData[day.name][request.userId].notes = 
                    `${request.type === "vacation" ? "Ferie" : "Permesso"} mattina`;
                } 
                // Se è mezza giornata: pomeriggio (seconda metà delle celle)
                else if (request.halfDay === "afternoon") {
                  const halfDay = Math.floor(timeSlots.length / 2);
                  for (let i = halfDay; i < timeSlots.length - 1; i++) {
                    newGridData[day.name][request.userId].cells[i] = {
                      type: request.type === "vacation" ? "vacation" : "leave",
                      isTimeOff: true
                    };
                  }
                  
                  newGridData[day.name][request.userId].notes = 
                    `${request.type === "vacation" ? "Ferie" : "Permesso"} pomeriggio`;
                }
              }
            }
          });
        });
    }
    
    // Calcola il totale delle ore per ogni giorno/utente
    Object.keys(newGridData).forEach(day => {
      Object.keys(newGridData[day]).forEach(userIdStr => {
        const userId = parseInt(userIdStr);
        const userData = newGridData[day][userId];
        
        // Identifica blocchi di celle consecutive di tipo "work"
        let totalHours = 0;
        let blockStart: number | null = null;
        
        // Scan per blocchi di "work"
        for (let i = 0; i < userData.cells.length; i++) {
          if (userData.cells[i].type === "work") {
            if (blockStart === null) {
              blockStart = i;
            }
            
            // Se siamo all'ultima cella e c'è un blocco aperto
            if (i === userData.cells.length - 1 && blockStart !== null) {
              // Calcola ore per questo blocco
              const numCells = i - blockStart + 1;
              const hours = calculateHoursFromCells(numCells);
              totalHours += hours;
              
              // Reset blocco
              blockStart = null;
            }
          } else if (blockStart !== null) {
            // Fine di un blocco, calcola ore
            const numCells = i - blockStart;
            const hours = calculateHoursFromCells(numCells);
            totalHours += hours;
            
            // Reset blocco
            blockStart = null;
          }
        }
        
        // Aggiorna il totale
        newGridData[day][userId].total = Math.round(totalHours * 100) / 100;
      });
    });
    
    setGridData(newGridData);
    console.log("✅ Inizializzazione griglia completata");
  }, [scheduleId, users, shifts, timeOffRequests, weekDays, timeSlots]);
  
  // GESTIONE CLICK SU CELLA (solo per admin)
  const handleCellClick = (userId: number, timeIndex: number, day: string) => {
    if (!isAdminView || !scheduleId || isPublished) {
      if (isAdminView && isPublished) {
        toast({
          title: "Turno pubblicato",
          description: "Non puoi modificare un turno già pubblicato.",
          variant: "destructive"
        });
      }
      return;
    }
    
    // Crea copia dei dati
    const newGridData = structuredClone(gridData);
    if (!newGridData[day] || !newGridData[day][userId]) return;
    
    const userDayData = newGridData[day][userId];
    const currentCell = userDayData.cells[timeIndex];
    
    // Non permettere modifica delle celle di ferie/permessi approvati
    if (currentCell.isTimeOff) {
      toast({
        title: "Azione non permessa",
        description: "Non puoi modificare una cella che rappresenta ferie o permessi già approvati.",
        variant: "destructive"
      });
      return;
    }
    
    // Cicla tra i tipi: "" -> "work" -> "vacation" -> "leave" -> ""
    let newType = "work";
    
    if (currentCell.type) {
      if (currentCell.type === "work") newType = "vacation";
      else if (currentCell.type === "vacation") newType = "leave";
      else if (currentCell.type === "leave") newType = "";
    }
    
    // Aggiorna la cella
    userDayData.cells[timeIndex].type = newType;
    
    // Ricalcola il totale
    let totalHours = 0;
    let blockStart: number | null = null;
    
    // Scan per blocchi di "work"
    for (let i = 0; i < userDayData.cells.length; i++) {
      if (userDayData.cells[i].type === "work") {
        if (blockStart === null) {
          blockStart = i;
        }
        
        // Se siamo all'ultima cella e c'è un blocco aperto
        if (i === userDayData.cells.length - 1 && blockStart !== null) {
          // Calcola ore per questo blocco
          const numCells = i - blockStart + 1;
          const blockStartTime = timeSlots[blockStart];
          const blockEndTime = timeSlots[i + 1] || "00:00";
          
          // CASI SPECIALI
          let hours;
          if (blockStartTime === "04:00" && blockEndTime === "06:00") {
            hours = 2.0;
          } else if (blockStartTime === "04:00" && blockEndTime === "00:00") {
            hours = 20.0;
          } else {
            hours = calculateHoursFromCells(numCells);
          }
          
          totalHours += hours;
          
          // Reset blocco
          blockStart = null;
        }
      } else if (blockStart !== null) {
        // Fine di un blocco, calcola ore
        const numCells = i - blockStart;
        const blockStartTime = timeSlots[blockStart];
        const blockEndTime = timeSlots[i];
        
        // CASI SPECIALI
        let hours;
        if (blockStartTime === "04:00" && blockEndTime === "06:00") {
          hours = 2.0;
        } else if (blockStartTime === "04:00" && blockEndTime === "00:00") {
          hours = 20.0;
        } else {
          hours = calculateHoursFromCells(numCells);
        }
        
        totalHours += hours;
        
        // Reset blocco
        blockStart = null;
      }
    }
    
    // Aggiorna il totale
    userDayData.total = Math.round(totalHours * 100) / 100;
    
    // Aggiorna lo stato
    setGridData(newGridData);
  };
  
  // GESTIONE MODIFICA NOTE
  const handleNotesChange = (userId: number, day: string, notes: string) => {
    if (!isAdminView || !scheduleId || isPublished) return;
    
    const newGridData = structuredClone(gridData);
    if (!newGridData[day] || !newGridData[day][userId]) return;
    
    newGridData[day][userId].notes = notes;
    setGridData(newGridData);
  };
  
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
  if (Object.keys(gridData).length === 0) {
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
              Turni {format(startDate, "d MMMM", { locale: it })} - {format(endDate, "d MMMM yyyy", { locale: it })}
            </h2>
            <p className="text-muted-foreground">
              Pianificazione settimanale {isPublished && <Badge>Pubblicato</Badge>}
            </p>
          </div>
          
          {isAdminView && !isPublished && (
            <Button 
              onClick={onPublish} 
              disabled={!scheduleId || isPublished}
              className="bg-primary hover:bg-primary/90"
            >
              Pubblica turni
            </Button>
          )}
        </div>
        
        <Tabs 
          defaultValue={weekDays[selectedDay].name} 
          onValueChange={(value) => {
            const dayIndex = weekDays.findIndex(d => d.name === value);
            if (dayIndex !== -1) setSelectedDay(dayIndex);
          }}
        >
          <TabsList className="mb-4 w-full">
            {weekDays.map((day, idx) => (
              <TabsTrigger key={day.name} value={day.name} className="flex-1">
                <span className="hidden md:inline">{day.name}</span>
                <span className="md:hidden text-xs">{day.shortName}</span>
                <span className="ml-1 text-xs text-muted-foreground">
                  {day.formattedDate}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          {weekDays.map((day) => (
            <TabsContent key={day.name} value={day.name}>
              <div className="overflow-auto border rounded-md">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left font-medium">Dipendente</th>
                      {timeSlots.map((slot, idx) => (
                        idx < timeSlots.length - 1 && (
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
                    {users
                      .filter(user => user.role === "employee" && user.isActive)
                      .map((user) => (
                        <tr key={user.id} className="border-b hover:bg-muted/20">
                          <td className="p-2 text-left font-medium text-xs sm:text-sm">
                            {user.fullName || user.username}
                          </td>
                          
                          {timeSlots.map((slot, idx) => {
                            if (idx >= timeSlots.length - 1) return null;
                            
                            // Get cell data
                            const cellData = gridData[day.name]?.[user.id]?.cells[idx] || { type: "", shiftId: null };
                            const cellType = cellData.type;
                            
                            // Style based on cell type
                            let cellStyle = "cursor-pointer hover:bg-gray-50 transition-colors";
                            let cellContent = "";
                            
                            if (cellType === "work") {
                              cellStyle += " bg-blue-50 text-blue-700";
                              cellContent = "X";
                            } else if (cellType === "vacation") {
                              cellStyle += " bg-red-50 text-red-700";
                              cellContent = "F";
                            } else if (cellType === "leave") {
                              cellStyle += " bg-yellow-50 text-yellow-700";
                              cellContent = "P";
                            }
                            
                            return (
                              <td 
                                key={idx}
                                className={`p-0 text-center ${cellStyle}`}
                                onClick={() => handleCellClick(user.id, idx, day.name)}
                              >
                                <div className="w-full h-full p-0 sm:p-1 text-xs sm:text-sm">
                                  {cellContent}
                                </div>
                              </td>
                            );
                          })}
                          
                          <td className="p-1">
                            <Input
                              size={20}
                              placeholder="Note..."
                              value={gridData[day.name]?.[user.id]?.notes || ""}
                              onChange={(e) => handleNotesChange(user.id, day.name, e.target.value)}
                              disabled={isPublished || !isAdminView}
                              className="text-xs sm:text-sm w-full"
                            />
                          </td>
                          
                          <td className="p-1 sm:p-2 text-center font-semibold text-xs sm:text-sm">
                            {formatHours(gridData[day.name]?.[user.id]?.total || 0)}
                            {/* Debug info */}
                            {process.env.NODE_ENV === 'development' && (
                              <div className="text-xs text-gray-400">
                                {gridData[day.name]?.[user.id]?.total} h
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-xs text-muted-foreground">
                <div className="flex flex-wrap gap-2 sm:gap-4">
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-100 border border-blue-300 mr-1"></span>
                    <span>X = In servizio</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-100 border border-red-300 mr-1"></span>
                    <span>F = Ferie</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300 mr-1"></span>
                    <span>P = Permesso</span>
                  </div>
                  <div className="flex items-center">
                    <span>Primo blocco di 30 min = 0h</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}