import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WeekSelectorDialog } from "@/components/schedule/week-selector-dialog";
import { ScheduleAutoGenerator } from "@/components/schedule/auto-generator/auto-generator";
import { ExcelGrid } from "@/components/schedule/excel-grid";
import { TemplateManager } from "@/components/schedule/templates/template-manager";

// PDF Export utilities
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Save, FileDown, Upload, Download } from "lucide-react";

// Date utilities
import { format, startOfWeek, addDays, isBefore, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { calculateWorkHours, formatHours } from "@/lib/utils";

export default function Schedule() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const now = new Date();
    return startOfWeek(now, { weekStartsOn: 1 }); // Start week on Monday
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
    
    if (!isLoading && isAuthenticated && user?.role !== "admin") {
      navigate("/my-schedule");
    }

    // NUOVA GESTIONE PARAMETRI URL:
    // Controlla tutti i parametri URL possibili per determinare quale schedule caricare
    const urlParams = new URLSearchParams(window.location.search);
    
    // Lista completa di tutti i possibili parametri di schedule ID
    const newScheduleId = urlParams.get('newSchedule');
    const currentScheduleParam = urlParams.get('currentScheduleId');
    const scheduleIdParam = urlParams.get('scheduleId');
    const idParam = urlParams.get('id');
    const refreshed = urlParams.get('refreshed');
    
    // Trova il primo ID definito in ordine di priorità
    const explicitScheduleId = idParam || currentScheduleParam || scheduleIdParam || newScheduleId;
    
    console.log("🔍 PARAMETRI URL SCHEDULE:", { 
      newScheduleId, 
      currentScheduleParam, 
      scheduleIdParam,
      idParam,
      explicitScheduleId
    });
    
    // CARICAMENTO DIRETTO E PROATTIVO DELLO SCHEDULE DALL'URL
    if (explicitScheduleId && Number(explicitScheduleId) > 0) {
      console.log(`⚡ IMPOSTAZIONE PROATTIVA DELLO SCHEDULE ID ${explicitScheduleId} dai parametri URL`);
      
      // Imposta l'ID come numero
      setCurrentScheduleId(Number(explicitScheduleId));
      
      // Forza il reset della griglia per il nuovo schedule
      setForceResetGrid(true);
    }
    
    // Se c'è un newScheduleId, forza l'app a caricare esplicitamente questo schedule
    if (newScheduleId) {
      console.log("⚡ CARICAMENTO NUOVO SCHEDULE SPECIFICO ID:", newScheduleId);
      
      // Segnala che stiamo caricando un nuovo schedule
      setIsLoadingNewSchedule(true);
      setForceResetGrid(true);
      
      // STEP 1: Imposta l'ID dello schedule corrente esplicitamente
      setCurrentScheduleId(parseInt(newScheduleId));
      
      // STEP 2: Svuota completamente la cache di React Query
      queryClient.clear();
      
      // STEP 3: Forza il caricamento solo dello schedule specificato tramite fetch diretto
      fetch(`/api/schedules/${newScheduleId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Impossibile caricare il nuovo schedule');
          }
          return response.json();
        })
        .then(scheduleData => {
          console.log("✅ Schedule caricato con successo:", scheduleData);
          
          // STEP 4: Imposta i dati nella cache
          // Importante: usa la stessa struttura della query key che verrà usata altrove
          queryClient.setQueryData(["/api/schedules", { id: parseInt(newScheduleId) }], scheduleData);
          
          // STEP 5: Aggiorna la data selezionata in base allo schedule caricato
          try {
            const startDate = parseISO(scheduleData.startDate);
            setSelectedWeek(startDate);
          } catch (e) {
            console.error("Errore nell'impostare la data di inizio:", e);
          }

          // STEP 6: Carica i turni vuoti per il nuovo schedule (inizialmente non ci sono turni)
          queryClient.setQueryData([`/api/schedules/${newScheduleId}/shifts`], []);
          
          // STEP 7: Aggiorniamo anche la lista completa degli schedule
          queryClient.invalidateQueries({ queryKey: ["/api/schedules/all"] });
          
          // STEP 8: Completa il caricamento
          setIsLoadingNewSchedule(false);
          
          // STEP 9: Notifica all'utente
          if (refreshed === 'true') {
            toast({
              title: "Nuova pianificazione pronta",
              description: `Turno ${format(parseISO(scheduleData.startDate), "dd/MM")} - ${format(parseISO(scheduleData.endDate), "dd/MM")} pronto per la compilazione`,
            });
          }
        })
        .catch(error => {
          console.error("❌ Errore caricando lo schedule:", error);
          setIsLoadingNewSchedule(false);
          // Rimuoviamo la notifica di errore che appare quando si crea un nuovo turno
          // per una gestione più pulita dell'interfaccia
        });
      
      // Rimuovi i parametri dall'URL per evitare ricaricamenti continui
      if (window.history.replaceState) {
        const dateParam = urlParams.get('date');
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + 
                     (dateParam ? '?date=' + dateParam : '');
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
    }
  }, [isLoading, isAuthenticated, navigate, user, queryClient, toast]);

  // State for custom date selection
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // QUERY MIGLIORATA: Fetch existing schedule data for the selected week
  // Manteniamo una scheduleId corrente per garantire il caricamento corretto
  const [currentScheduleId, setCurrentScheduleId] = useState<number | null>(null);
  
  // Calculate end of week (Sunday) - use custom dates if selected
  const startDateToUse = customStartDate || selectedWeek;
  const endOfWeek = customEndDate || addDays(selectedWeek, 6);
  
  // Format date range for display
  const dateRangeText = `${format(startDateToUse, "d MMMM", { locale: it })} - ${format(
    endOfWeek,
    "d MMMM yyyy",
    { locale: it }
  )}`;
  
  // QUERY COMPLETAMENTE RISCRITTA: Fetch existing schedule data
  const { data: existingSchedule = {}, isLoading: isScheduleLoading } = useQuery<any>({
    queryKey: ["/api/schedules", { id: currentScheduleId }],
    queryFn: async ({ queryKey }) => {
      // Estrai l'ID dallo query key
      const params = queryKey[1] as { id?: number };
      
      // Costruisci l'URL con i parametri corretti
      let url = "/api/schedules";
      
      // Aggiungi i parametri alla querystring
      const queryParams = new URLSearchParams();
      
      if (params.id) {
        // Se c'è un ID specifico, usalo
        console.log(`🔄 Caricamento schedule specifico con ID: ${params.id}`);
        queryParams.append("id", params.id.toString());
      } else {
        // Altrimenti usa la data
        console.log(`🔄 Caricamento schedule per data: ${format(selectedWeek, "yyyy-MM-dd")}`);
        queryParams.append("startDate", format(selectedWeek, "yyyy-MM-dd"));
      }
      
      // Aggiungi i parametri all'URL
      url = `${url}?${queryParams.toString()}`;
      
      // Esegui la richiesta
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Errore nel caricamento dello schedule");
      }
      
      const data = await response.json();
      console.log("🗓️ Schedule caricato:", data);
      return data;
    },
  });

  // Fetch users for populating the schedule
  const { data: users = [], isLoading: isUsersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Fetch shifts for the schedule if it exists
  const { data: shifts = [], isLoading: isShiftsLoading } = useQuery<any[]>({
    queryKey: [`/api/schedules/${existingSchedule?.id}/shifts`],
    enabled: !!existingSchedule?.id,
  });
  
  // Fetch time-off requests for displaying on the schedule
  const { data: timeOffRequests = [], isLoading: isTimeOffLoading } = useQuery<any[]>({
    queryKey: ["/api/time-off-requests"],
  });

  // Create schedule mutation - Versione completamente nuova e migliorata
  // Usa il nuovo endpoint che garantisce la pulizia completa e l'unicità
  const createScheduleMutation = useMutation({
    mutationFn: (scheduleData: any) => apiRequest("POST", "/api/schedules/new-empty", scheduleData),
    onSuccess: (data) => {
      // Non invalidare qui la cache, lo faremo in modo più controllato
      console.log("✅ Nuovo schedule creato correttamente con ID:", data);
      
      toast({
        title: "Nuovo pianificazione creata",
        description: "È stata creata una nuova pianificazione completamente vuota.",
      });
    },
    onError: (error) => {
      console.error("❌ Errore nella creazione dello schedule:", error);
      toast({
        title: "Errore",
        description: "Impossibile creare la nuova pianificazione. Controlla le date selezionate.",
        variant: "destructive",
      });
    },
  });

  // Publish schedule mutation
  const publishScheduleMutation = useMutation({
    mutationFn: (scheduleId: number) =>
      apiRequest("POST", `/api/schedules/${scheduleId}/publish`, { 
        scheduleId 
      }),
    onSuccess: () => {
      toast({
        title: "Turni pubblicati",
        description: "La pianificazione è stata pubblicata con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${existingSchedule?.id}/shifts`] });
    },
    onError: (err) => {
      console.error("Errore pubblicazione:", err);
      toast({
        title: "Errore di pubblicazione",
        description: "Si è verificato un errore durante la pubblicazione della pianificazione.",
        variant: "destructive",
      });
    },
  });
  
  // Unpublish schedule mutation (ritira dalla pubblicazione)
  const unpublishScheduleMutation = useMutation({
    mutationFn: (scheduleId: number) =>
      apiRequest("POST", `/api/schedules/${scheduleId}/unpublish`, { 
        scheduleId 
      }),
    onSuccess: () => {
      toast({
        title: "Turni ritirati dalla pubblicazione",
        description: "La pianificazione è stata ritirata dalla pubblicazione e può essere modificata.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/all"] });
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${existingSchedule?.id}/shifts`] });
    },
    onError: (err) => {
      console.error("Errore ritiro dalla pubblicazione:", err);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il ritiro della pianificazione dalla pubblicazione.",
        variant: "destructive",
      });
    },
  });

  // State for showing auto-generate modal
  const [showAutoGenerator, setShowAutoGenerator] = useState(false);
  
  // State for showing schedule builder
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);
  // Flag per il reset completo della griglia (per mostrare una tabella vuota dopo la creazione)
  const [forceResetGrid, setForceResetGrid] = useState(false);
  // Flag per stabilire se stiamo caricando uno schedule nuovo o esistente
  const [isLoadingNewSchedule, setIsLoadingNewSchedule] = useState(false);
  
  // State for creating a new schedule
  const [creatingNewSchedule, setCreatingNewSchedule] = useState(false);
  
  // State for week selector dialog
  const [showWeekSelector, setShowWeekSelector] = useState(false);
  
  // State for available schedules
  const { data: allSchedules = [] } = useQuery<any[]>({
    queryKey: ["/api/schedules/all"],
    enabled: user?.role === "admin",
  });
  
  // Handler per aprire il selettore settimane
  const handleChangeWeek = () => {
    setShowWeekSelector(true);
  };
  
  // VERSIONE RADICALMENTE MIGLIORATA: Handler per selezionare una settimana specifica
  const handleSelectSchedule = (scheduleId: number) => {
    setShowWeekSelector(false);
    
    // Ottieni i dettagli della programmazione selezionata
    const selectedSchedule = allSchedules.find((s: any) => s.id === scheduleId);
    if (selectedSchedule) {
      console.log(`🗓️ SELEZIONE ESPLICITA SCHEDULE ID ${scheduleId} con date: ${selectedSchedule.startDate} - ${selectedSchedule.endDate}`);
      
      // *********** SOLUZIONE DRASTICA ***********
      // Invece di manipolare la cache, forziamo un reload completo
      // con i parametri necessari attraverso l'URL
      
      // Crea un URL con i parametri per forzare il caricamento del nuovo schedule
      const timestamp = Date.now(); // Evita la cache
      const newUrl = `/schedule?reset=true&id=${scheduleId}&currentScheduleId=${scheduleId}&scheduleId=${scheduleId}&date=${selectedSchedule.startDate}&ts=${timestamp}`;
      
      // Notifica all'utente prima del reload
      toast({
        title: "Caricamento turno in corso...",
        description: `Caricamento del turno dal ${format(new Date(selectedSchedule.startDate), "dd/MM")} al ${format(new Date(selectedSchedule.endDate), "dd/MM")}`,
        duration: 1500
      });
      
      // Piccola pausa prima del reload per dare il tempo al toast di apparire
      setTimeout(() => {
        // Redirect alla stessa pagina con nuovi parametri
        window.location.href = newUrl;
      }, 500);
    }
  };
  
  // Handle publish schedule
  const handlePublish = () => {
    if (existingSchedule?.id) {
      // Pubblica immediatamente lo schedule
      publishScheduleMutation.mutate(existingSchedule.id);
      
      // Mostra un toast di successo solo all'amministratore
      toast({
        title: "Turni pubblicati con successo!",
        description: "La pianificazione è stata registrata nel sistema.",
        variant: "default",
      });
    }
  };
  
  // Handle unpublish schedule (ritira dalla pubblicazione)
  const handleUnpublish = () => {
    if (existingSchedule?.id) {
      // Chiedi conferma prima di ritirare dalla pubblicazione
      if (window.confirm("Sei sicuro di voler ritirare questo orario dalla pubblicazione? I dipendenti non potranno più vederlo finché non verrà ripubblicato.")) {
        // Ritira lo schedule dalla pubblicazione
        unpublishScheduleMutation.mutate(existingSchedule.id);
      }
    }
  };
  
  // Funzione per esportare gli orari settimanali in PDF
  const handleExportPDF = () => {
    if (!existingSchedule || !shifts || !users || users.length === 0) {
      toast({
        title: "Impossibile esportare",
        description: "Non ci sono dati da esportare o l'orario settimanale non è stato ancora creato.",
        variant: "destructive"
      });
      return;
    }
    
    // Creazione del documento PDF in formato landscape per avere più spazio
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Estrai i giorni della settimana dalla data di inizio
    const startDate = new Date(existingSchedule.startDate);
    const days = [];
    const dayNames = [];
    
    for (let i = 0; i < 7; i++) {
      const currentDate = addDays(startDate, i);
      days.push(format(currentDate, "EEEE dd/MM", { locale: it }));
      dayNames.push(format(currentDate, "EEEE", { locale: it }));
    }
    
    // Titolo del documento
    const title = `Pianificazione Turni: ${format(new Date(existingSchedule.startDate), "dd/MM/yyyy", { locale: it })} - ${format(new Date(existingSchedule.endDate), "dd/MM/yyyy", { locale: it })}`;
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    
    // Sottotitolo
    doc.setFontSize(10);
    doc.setTextColor(100);
    const status = existingSchedule.isPublished ? "Pubblicato" : "Bozza";
    doc.text(`Stato: ${status}`, 14, 20);
    
    // TABELLA PRINCIPALE DEGLI ORARI - ESATTAMENTE COME NELLA INTERFACCIA
    const scheduleTableData = [];
    
    // Per ogni dipendente, creiamo una riga con i turni per ogni giorno
    users.forEach(user => {
      const row = [user.name]; // Prima colonna: nome dipendente
      let totalWeeklyHours = 0;
      
      // Per ogni giorno della settimana, aggiungiamo i turni
      dayNames.forEach(dayName => {
        const userDayShifts = shifts.filter(
          (shift: any) => shift.userId === user.id && shift.day.toLowerCase() === dayName.toLowerCase()
        );
        
        // Se l'utente ha turni per questo giorno
        if (userDayShifts.length > 0) {
          // Prendiamo il primo turno come riferimento (in caso di più turni nello stesso giorno)
          const shift = userDayShifts[0];
          const shiftHours = calculateWorkHours(shift.startTime, shift.endTime);
          totalWeeklyHours += shiftHours;
          
          // Formato: orario inizio - orario fine
          row.push(`${shift.startTime} - ${shift.endTime}`);
        } else {
          // Se non ci sono turni, mettiamo un trattino
          row.push('-');
        }
      });
      
      // Aggiungiamo il totale ore alla fine della riga
      row.push(formatHours(totalWeeklyHours));
      
      scheduleTableData.push(row);
    });
    
    // Ottieni i giorni della settimana in italiano
    const weekDays = dayNames.map(day => {
      // Capitalizza la prima lettera di ogni giorno
      return day.charAt(0).toUpperCase() + day.slice(1);
    });
    
    // Genera la tabella principale come appare nell'applicazione
    autoTable(doc, {
      head: [['Dipendente', ...weekDays, 'Ore Totali']],
      body: scheduleTableData,
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { top: 25 }
    });
    
    // Aggiungiamo una seconda pagina con i dettagli per turno
    doc.addPage();
    
    // Titolo della seconda pagina
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Dettaglio Turni Individuali", 14, 15);
    
    // Tabella dettagliata con tutti i turni
    const detailedShiftsData = [];
    
    users.forEach(user => {
      const userShifts = shifts.filter((shift: any) => shift.userId === user.id);
      
      if (userShifts.length > 0) {
        userShifts.forEach((shift: any) => {
          const hours = calculateWorkHours(shift.startTime, shift.endTime);
          
          detailedShiftsData.push([
            user.name,
            shift.day.charAt(0).toUpperCase() + shift.day.slice(1),
            shift.startTime,
            shift.endTime,
            formatHours(hours),
            shift.type || "",
            shift.notes || "",
            shift.area || ""
          ]);
        });
      }
    });
    
    // Genera la tabella dettagliata
    autoTable(doc, {
      head: [['Dipendente', 'Giorno', 'Inizio', 'Fine', 'Ore', 'Tipo', 'Note', 'Area']],
      body: detailedShiftsData,
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { top: 25 }
    });
    
    // Aggiungiamo una terza pagina con il conteggio del personale per fascia oraria
    doc.addPage();
    
    // Titolo della terza pagina
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Conteggio Personale per Fascia Oraria", 14, 15);
    
    // Definizione delle fasce orarie (timeslots)
    const timeSlots = [
      "6:00", "6:30", "7:00", "7:30", "8:00", "8:30", "9:00", "9:30",
      "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
      "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
      "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30",
      "22:00", "22:30", "23:00", "23:30"
    ];
    
    // Inizializziamo il conteggio del personale
    const staffCount = {};
    weekDays.forEach((day, dayIndex) => {
      staffCount[dayIndex] = {};
      timeSlots.forEach((timeSlot) => {
        staffCount[dayIndex][timeSlot] = 0;
      });
    });
    
    // Contiamo il personale per ogni fascia oraria
    shifts.forEach((shift: any) => {
      const dayIndex = dayNames.findIndex(day => day.toLowerCase() === shift.day.toLowerCase());
      if (dayIndex !== -1) {
        const startTimeIndex = timeSlots.indexOf(shift.startTime);
        const endTimeIndex = timeSlots.indexOf(shift.endTime);
        
        if (startTimeIndex !== -1 && endTimeIndex !== -1) {
          for (let i = startTimeIndex; i < endTimeIndex; i++) {
            staffCount[dayIndex][timeSlots[i]]++;
          }
        }
      }
    });
    
    // Prepariamo i dati per la tabella
    const staffCountData = [];
    timeSlots.forEach((timeSlot) => {
      const row = [timeSlot];
      weekDays.forEach((day, dayIndex) => {
        row.push(staffCount[dayIndex][timeSlot].toString());
      });
      staffCountData.push(row);
    });
    
    // Genera la tabella del conteggio
    autoTable(doc, {
      head: [['Orario', ...weekDays]],
      body: staffCountData,
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 15 }
      },
      alternateRowStyles: { fillColor: [240, 240, 240] },
      margin: { top: 25 }
    });
    
    // Data di generazione su tutte le pagine
    const today = format(new Date(), "dd/MM/yyyy HH:mm", { locale: it });
    const pageCount = doc.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Generato il: ${today}`, 14, doc.internal.pageSize.height - 10);
      doc.text(`Pagina ${i} di ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }
    
    // Salva il PDF
    doc.save(`turni_${format(new Date(existingSchedule.startDate), "yyyyMMdd")}-${format(new Date(existingSchedule.endDate), "yyyyMMdd")}.pdf`);
    
    toast({
      title: "Esportazione completata",
      description: "Gli orari settimanali sono stati esportati in PDF con successo.",
      variant: "default",
    });
  };
  
  // Handle new weekly schedule
  const handleNewWeeklySchedule = () => {
    console.log("Creazione nuovo turno settimanale");
    
    // Resetta completamente lo stato
    setCreatingNewSchedule(true);
    setForceResetGrid(true);
    
    // Imposta date predefinite per il nuovo calendario (a partire dalla prossima settimana)
    const nextWeekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7);
    setCustomStartDate(nextWeekStart);
    setCustomEndDate(addDays(nextWeekStart, 6));
    setSelectedWeek(nextWeekStart);
    
    // Mostra il selettore di date per consentire all'utente di modificarle
    setShowDatePicker(true);
    
    // Forza il reset dell'esistente schedule (evita conflitti)
    queryClient.removeQueries({ queryKey: ["/api/schedules"] });
    
    toast({
      title: "Seleziona settimana",
      description: "Seleziona le date di inizio e fine per il nuovo turno settimanale",
    });
  };

  // Handle auto-generate schedule
  const handleAutoGenerate = () => {
    // Se non ci sono date personalizzate, chiediamo di selezionarle
    if (!customStartDate || !customEndDate) {
      setShowDatePicker(true);
      return;
    }
    
    setShowAutoGenerator(true);
  };
  
  // Handle date change
  const handleDateChange = (type: 'start' | 'end', date: Date | null) => {
    if (type === 'start') {
      // Usa una versione tipizzata di date
      const typedDate = date as Date | null;
      setCustomStartDate(typedDate);
      
      // Se la data di fine non è impostata o è prima della nuova data di inizio,
      // impostiamo la data di fine a 6 giorni dopo la data di inizio
      if (!customEndDate || (typedDate && isBefore(customEndDate, typedDate))) {
        setCustomEndDate(typedDate ? addDays(typedDate, 6) : null);
      }
    } else {
      setCustomEndDate(date as Date | null);
    }
  };
  
  // IMPLEMENTAZIONE COMPLETAMENTE NUOVA:
  // Crea un nuovo schedule completamente pulito con garanzia di integrità
  const handleCreateSchedule = () => {
    // Controllo preliminare sulle date
    if (!customStartDate || !customEndDate) {
      toast({
        title: "Date mancanti",
        description: "Seleziona le date di inizio e fine per la pianificazione",
        variant: "destructive",
      });
      return;
    }
    
    // Se la data di inizio è dopo la data di fine, mostriamo un errore
    if (isBefore(customEndDate, customStartDate)) {
      toast({
        title: "Date non valide",
        description: "La data di fine deve essere successiva alla data di inizio",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Prepara i dati per la creazione
      const formattedStartDate = format(customStartDate, "yyyy-MM-dd");
      const formattedEndDate = format(customEndDate, "yyyy-MM-dd");
      
      // Dati dello schedule
      const newScheduleData = {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        isPublished: false,
      };
      
      console.log(`🆕 Creazione nuovo schedule: ${formattedStartDate} - ${formattedEndDate}`);
      
      // FASE 1: CREAZIONE NUOVA PIANIFICAZIONE SUL SERVER
      // Usiamo apiRequest direttamente per maggiore controllo
      apiRequest("POST", "/api/schedules/new-empty", newScheduleData)
        .then((data: any) => {
          console.log("✅ Nuovo schedule vuoto creato con ID:", data.id);
          
          // FASE 2: AGGIORNAMENTO DELLO STATO E PREPARAZIONE UI
          // Passare all'interfaccia di pianificazione con la griglia vuota
          setCreatingNewSchedule(false);
          setShowDatePicker(false);
          setForceResetGrid(true);
          
          // Aggiorna l'ID corrente
          setCurrentScheduleId(data.id);
          
          // Ri-carica lo schedule nella cache di React Query
          queryClient.setQueryData(["/api/schedules", { id: data.id }], data);
          
          // Notifica all'utente
          toast({
            title: "Turno creato con successo",
            description: "Caricamento della tabella completamente vuota...",
          });
          
          // FASE 3: AGGIORNAMENTO INTERFACCIA
          // Usa un timeout per garantire che la UI sia aggiornata correttamente
          setTimeout(() => {
            // Invalida le query per caricare dati freschi
            queryClient.invalidateQueries({ queryKey: ["/api/schedules/all"] });
            queryClient.invalidateQueries({ queryKey: ["/api/schedules", { id: data.id }] });
            
            console.log("🧹 Pulizia e ricaricamento tabella vuota per ID:", data.id);
            
            // Aggiungi un timestamp per evitare cache del browser
            const timestamp = Date.now();
            
            // FASE 4: REDIRECT CON PARAMETRI MIGLIORATI
            // Usa parametri URL più espliciti e aggiungi currentScheduleId in modo esplicito
            window.location.href = `/schedule?reset=true&id=${data.id}&scheduleId=${data.id}&currentScheduleId=${data.id}&newSchedule=${data.id}&date=${format(customStartDate!, "yyyy-MM-dd")}&forceEmpty=true&refreshed=true&ts=${timestamp}`;
          }, 1000);
        })
        .catch(err => {
          console.error("❌ Errore nella gestione dello schedule:", err);
          toast({
            title: "Errore",
            description: "Si è verificato un errore durante la creazione della pianificazione.",
            variant: "destructive",
          });
        });
    } catch (err) {
      console.error("❌ Errore nella gestione dello schedule:", err);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione della pianificazione.",
        variant: "destructive",
      });
    }
  };

  // Funzione per recuperare i turni di uno schedule specifico
  const fetchShiftsForSchedule = async (scheduleId: number): Promise<any[]> => {
    try {
      const response = await fetch(`/api/schedules/${scheduleId}/shifts`);
      if (!response.ok) {
        throw new Error(`Errore nel recuperare i turni per lo schedule ${scheduleId}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Errore nel recuperare i turni per lo schedule ${scheduleId}:`, error);
      return [];
    }
  };

  return (
    <Layout>
      <div className="py-6 px-4 md:px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Pianificazione Turni</h1>
            <p className="text-gray-500">
              {existingSchedule?.startDate ? (
                <>
                  {format(new Date(existingSchedule.startDate), "d MMMM", { locale: it })} - {format(new Date(existingSchedule.endDate), "d MMMM yyyy", { locale: it })}
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {existingSchedule.isPublished ? "Pubblicato" : "Bozza"}
                  </span>
                </>
              ) : (
                "Seleziona o crea una settimana"
              )}
            </p>
          </div>
          {existingSchedule?.id && (
            <>
              {!existingSchedule.isPublished ? (
                <Button
                  onClick={handlePublish}
                  disabled={publishScheduleMutation.isPending}
                  className="mt-4 md:mt-0 w-full md:w-auto"
                >
                  {publishScheduleMutation.isPending ? "Pubblicazione..." : "Pubblica Turni"}
                </Button>
              ) : (
                <Button
                  onClick={handleUnpublish}
                  variant="outline"
                  className="mt-4 md:mt-0 w-full md:w-auto"
                >
                  <span className="material-icons text-sm mr-1">unpublished</span>
                  Ritira dalla pubblicazione
                </Button>
              )}
            </>
          )}
        </div>

        {isScheduleLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : showAutoGenerator ? (
          <div>
            <ScheduleAutoGenerator
              onClose={() => setShowAutoGenerator(false)}
              startDate={customStartDate!}
              endDate={customEndDate!}
              isPublished={false}
              onPublish={() => {}}
            />
          </div>
        ) : existingSchedule && !showDatePicker && !creatingNewSchedule ? (
          <div>
            <ExcelGrid
              scheduleId={existingSchedule?.id || null}
              users={users || []}
              startDate={existingSchedule?.startDate ? new Date(existingSchedule.startDate) : selectedWeek}
              endDate={existingSchedule?.endDate ? new Date(existingSchedule.endDate) : endOfWeek}
              shifts={shifts || []}
              timeOffRequests={timeOffRequests || []}
              isPublished={existingSchedule?.isPublished || false}
              onPublish={handlePublish}
              forceResetGrid={forceResetGrid || isLoadingNewSchedule}
            />
            
            {/* Pulsanti di azione posizionati sotto la tabella */}
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mt-6 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={handleChangeWeek}
                className="text-xs sm:text-sm"
              >
                <span className="material-icons text-xs sm:text-sm mr-1">history</span>
                Cronologia turni
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewWeeklySchedule}
                className="text-xs sm:text-sm"
              >
                <span className="material-icons text-xs sm:text-sm mr-1">add</span>
                Nuovo turno settimanale
              </Button>
              
              {/* Pulsante per esportare in PDF */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="text-xs sm:text-sm"
                disabled={!existingSchedule?.id || shifts?.length === 0}
              >
                <Download className="h-4 w-4 mr-1" />
                Esporta PDF
              </Button>
              
              {/* Pulsante per ritirare dalla pubblicazione (visibile solo se lo schedule è pubblicato) */}
              {existingSchedule?.isPublished && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnpublish}
                  className="text-xs sm:text-sm text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300 hover:bg-amber-50"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Ritira pubblicazione
                </Button>
              )}
            </div>
            
            {/* Componente per gestire i template di orario */}
            <div className="mt-4 mb-2 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium mb-3 flex items-center text-gray-700">
                <span className="material-icons text-base mr-2">save_alt</span>
                Modelli di orario
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Salva e riutilizza modelli di orario per settimane pari o dispari, o crea modelli personalizzati.
              </p>
              
              {/* Importiamo il componente TemplateManager */}
              <div className="bg-slate-50 p-4 rounded-md border border-gray-200">
                <TemplateManager 
                  scheduleId={existingSchedule?.id || null}
                  disabled={existingSchedule?.isPublished || false}
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            {showDatePicker ? (
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle>Seleziona il periodo della pianificazione</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <Label className="mb-2 block">Data di inizio</Label>
                      <Calendar
                        mode="single"
                        selected={customStartDate ?? undefined}
                        onSelect={(date: Date | undefined) => handleDateChange('start', date || null)}
                        disabled={(date) => 
                          date < new Date()
                        }
                        className="border border-gray-200 rounded-md"
                      />
                      <div className="text-sm text-gray-500 mt-1">
                        {customStartDate ? format(customStartDate, "EEEE d MMMM yyyy", { locale: it }) : "Seleziona una data"}
                      </div>
                    </div>
                    <div>
                      <Label className="mb-2 block">Data di fine</Label>
                      <Calendar
                        mode="single"
                        selected={customEndDate ?? undefined}
                        onSelect={(date: Date | undefined) => handleDateChange('end', date || null)}
                        disabled={(date) => 
                          !customStartDate || date < customStartDate
                        }
                        className="border border-gray-200 rounded-md"
                      />
                      <div className="text-sm text-gray-500 mt-1">
                        {customEndDate ? format(customEndDate, "EEEE d MMMM yyyy", { locale: it }) : "Seleziona una data"}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-between border-t px-6 py-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowDatePicker(false)}
                  >
                    Annulla
                  </Button>
                  <Button 
                    onClick={handleCreateSchedule}
                    disabled={!customStartDate || !customEndDate}
                  >
                    Crea Pianificazione
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle>Pianificazione Turni</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <div className="mb-6">
                    <span className="material-icons text-primary text-6xl mb-4">calendar_month</span>
                    <h3 className="text-lg font-medium mb-2">Nessuna pianificazione attiva</h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-8">
                      Non esiste ancora una pianificazione per la settimana corrente. Crea una nuova pianificazione per gestire i turni del personale.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      onClick={() => setShowDatePicker(true)}
                      className="flex items-center gap-2"
                    >
                      <span className="material-icons">add</span>
                      Crea Nuova Pianificazione
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleAutoGenerate}
                      className="flex items-center gap-2"
                    >
                      <span className="material-icons">auto_fix_high</span>
                      Genera Automaticamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
      
      {/* Automatic Schedule Generator Dialog */}
      {/* Dialog per generazione automatica */}
      <Dialog open={showAutoGenerator} onOpenChange={setShowAutoGenerator}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Generazione Automatica Turni</DialogTitle>
          </DialogHeader>
          <ScheduleAutoGenerator
            onScheduleGenerated={(scheduleData) => {
              setShowAutoGenerator(false);
              queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Dialog per selezionare una settimana dallo storico */}
      <WeekSelectorDialog
        open={showWeekSelector}
        onOpenChange={setShowWeekSelector}
        schedules={allSchedules}
        onSelectSchedule={handleSelectSchedule}
      />
    </Layout>
  );
}