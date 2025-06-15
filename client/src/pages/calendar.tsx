import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Calendar as CalendarIcon, Clock, User, Scissors, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameMonth, isSameDay, isToday, endOfWeek } from "date-fns";
import { it } from "date-fns/locale";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

const appointmentSchema = z.object({
  clientName: z.string().min(1, "Nome cliente è richiesto"),
  clientPhone: z.string().min(1, "Numero di telefono è richiesto"),
  stylistId: z.number({ required_error: "Stilista è richiesto" }),
  serviceId: z.number({ required_error: "Servizio è richiesto" }),
  date: z.string().min(1, "Data è richiesta"),
  startHour: z.number({ required_error: "Ora è richiesta" }),
  startMinute: z.number({ required_error: "Minuti sono richiesti" }),
});

type AppointmentForm = z.infer<typeof appointmentSchema>;

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Drag and drop sensors optimized for touch devices
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const form = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientName: "",
      clientPhone: "",
      date: format(selectedDate, "yyyy-MM-dd"),
      startHour: 9,
      startMinute: 0,
    },
  });

  // Fetch appointments based on view mode
  const { data: appointments, isLoading } = useQuery<any[]>({
    queryKey: viewMode === 'month' 
      ? ["/api/appointments", "month", format(selectedDate, "yyyy-MM")]
      : viewMode === 'week'
      ? ["/api/appointments", "week", format(selectedDate, "yyyy-MM-dd")]
      : ["/api/appointments", "day", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (viewMode === 'month') {
        params.set('startDate', format(startOfMonth(selectedDate), "yyyy-MM-dd"));
        params.set('endDate', format(endOfMonth(selectedDate), "yyyy-MM-dd"));
      } else if (viewMode === 'week') {
        params.set('startDate', format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"));
        params.set('endDate', format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd"));
      } else {
        params.set('date', format(selectedDate, "yyyy-MM-dd"));
      }
      
      const response = await fetch(`/api/appointments?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
  });

  const { data: stylists } = useQuery<any[]>({
    queryKey: ["/api/stylists"],
  });

  const { data: services } = useQuery<any[]>({
    queryKey: ["/api/services"],
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentForm) => {
      // Create client with just the name (split into first and last name)
      const nameParts = data.clientName.split(' ');
      const firstName = nameParts[0] || data.clientName;
      const lastName = nameParts.slice(1).join(' ') || "";
      
      const clientResponse = await apiRequest("POST", "/api/clients", {
        firstName,
        lastName,
        phone: data.clientPhone,
        email: "",
        notes: "",
      });
      const newClient = await clientResponse.json();

      // Calculate start and end times
      const startTime = `${data.startHour.toString().padStart(2, '0')}:${data.startMinute.toString().padStart(2, '0')}`;
      const startTimeMinutes = data.startHour * 60 + data.startMinute;
      
      // Get service duration
      const service = services?.find(s => s.id === data.serviceId);
      const duration = service?.duration || 30; // default to 30 minutes if not found
      
      const endTimeMinutes = startTimeMinutes + duration;
      const endHours = Math.floor(endTimeMinutes / 60);
      const endMins = endTimeMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

      // Create the appointment with the new client
      return apiRequest("POST", "/api/appointments", {
        clientId: newClient.id,
        stylistId: data.stylistId,
        serviceId: data.serviceId,
        date: data.date,
        startTime: startTime,
        endTime: endTime,
        notes: "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Appuntamento creato con successo" });
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile creare l'appuntamento",
        variant: "destructive" 
      });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Appuntamento aggiornato con successo" });
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile aggiornare l'appuntamento",
        variant: "destructive" 
      });
    },
  });

  const triggerRemindersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reminders");
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Test Promemoria",
        description: "Controllo promemoria WhatsApp avviato - controlla i log del server",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Errore durante il test dei promemoria",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AppointmentForm) => {
    createAppointmentMutation.mutate(data);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const appointment = appointments?.find(apt => apt.id.toString() === event.active.id);
    setActiveAppointment(appointment);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveAppointment(null);

    if (!over || !active) return;

    const appointmentId = parseInt(active.id.toString());
    const appointment = appointments?.find(apt => apt.id === appointmentId);
    
    if (!appointment) return;

    // Parse the drop target (format: "date-YYYY-MM-DD" or "time-YYYY-MM-DD-HH:MM")
    const dropTarget = over.id.toString();
    
    if (dropTarget.startsWith('date-')) {
      // Dropped on a day - keep same time, change date
      const newDate = dropTarget.replace('date-', '');
      if (newDate !== appointment.date) {
        updateAppointmentMutation.mutate({
          id: appointmentId,
          data: { date: newDate }
        });
      }
    } else if (dropTarget.startsWith('time-')) {
      // Dropped on a specific time slot
      const parts = dropTarget.replace('time-', '').split('-');
      const newDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
      const newTime = `${parts[3]}:${parts[4]}`;
      
      if (newDate !== appointment.date || newTime !== appointment.startTime) {
        // Calculate new end time based on service duration
        const service = services?.find(s => s.id === appointment.serviceId);
        const duration = service?.duration || 30;
        const [hours, minutes] = newTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

        updateAppointmentMutation.mutate({
          id: appointmentId,
          data: { 
            date: newDate,
            startTime: newTime,
            endTime: endTime
          }
        });
      }
    }
  };

  // Navigation functions
  const navigateToday = () => setSelectedDate(new Date());
  const navigatePrevious = () => {
    if (viewMode === "day") {
      setSelectedDate(subDays(selectedDate, 1));
    } else if (viewMode === "week") {
      setSelectedDate(subWeeks(selectedDate, 1));
    } else if (viewMode === "month") {
      setSelectedDate(subMonths(selectedDate, 1));
    }
  };
  const navigateNext = () => {
    if (viewMode === "day") {
      setSelectedDate(addDays(selectedDate, 1));
    } else if (viewMode === "week") {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else if (viewMode === "month") {
      setSelectedDate(addMonths(selectedDate, 1));
    }
  };

  // Helper function to get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    if (!appointments) return [];
    const dateString = format(date, "yyyy-MM-dd");
    return appointments.filter(apt => apt.date === dateString);
  };

  // Generate calendar days for monthly view
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const calendarEnd = addDays(calendarStart, 41); // 6 weeks
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Generate week days for weekly view
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  // Generate time slots for the day/week view
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = 9 + i; // Start from 9 AM
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Filter appointments for the selected date
  const dayAppointments = appointments?.filter(app => app.date === format(selectedDate, "yyyy-MM-dd")) || [];

  // Draggable appointment component
  const DraggableAppointment = ({ appointment, className = "" }: { appointment: any; className?: string }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({
      id: appointment.id.toString(),
    });

    const style = {
      transform: CSS.Translate.toString(transform),
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`
          dnd-appointment flex items-center justify-between p-2 bg-gradient-to-r from-pink-50 to-purple-50 
          rounded-lg border cursor-move touch-manipulation select-none
          hover:from-pink-100 hover:to-purple-100 transition-colors
          ${isDragging ? 'dnd-dragging shadow-lg z-50' : ''}
          ${className}
        `}
      >
        <div className="flex items-center space-x-2">
          <GripVertical className="h-4 w-4 text-gray-400" />
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-sm">
              {appointment.client.firstName} {appointment.client.lastName}
            </div>
            <div className="text-xs text-gray-600">
              {appointment.service.name} • {appointment.stylist.name}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-pink-600 text-sm">
            {appointment.startTime.slice(0, 5)}
          </div>
          <div className="text-xs text-gray-500">
            {appointment.service.duration}min
          </div>
        </div>
      </div>
    );
  };

  // Droppable time slot component
  const DroppableTimeSlot = ({ date, time, children }: { date: string; time: string; children: React.ReactNode }) => {
    const dropId = `time-${date}-${time.replace(':', '-')}`;
    const { isOver, setNodeRef } = useDroppable({
      id: dropId,
    });

    return (
      <div
        ref={setNodeRef}
        className={`
          time-slot min-h-[60px] p-1 border-b border-gray-100 transition-colors
          ${isOver ? 'dnd-droppable-over bg-pink-50 border-pink-200' : 'hover:bg-gray-50'}
        `}
      >
        {children}
      </div>
    );
  };

  // Droppable day component
  const DroppableDay = ({ date, children, className = "" }: { date: string; children: React.ReactNode; className?: string }) => {
    const dropId = `date-${date}`;
    const { isOver, setNodeRef } = useDroppable({
      id: dropId,
    });

    return (
      <div
        ref={setNodeRef}
        className={`
          calendar-grid min-h-[80px] p-2 border rounded-lg transition-colors
          ${isOver ? 'dnd-droppable-over ring-2 ring-pink-300 bg-pink-50' : ''}
          ${className}
        `}
      >
        {children}
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Layout>
        <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Appuntamenti</h1>
            <p className="text-gray-600">Gestisci tutti gli appuntamenti del salone</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Appuntamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nuovo Appuntamento</DialogTitle>
                <DialogDescription>
                  Inserisci i dettagli per creare un nuovo appuntamento.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="startHour"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ora</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Ora" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Array.from({ length: 11 }, (_, i) => i + 8).map((hour) => (
                                  <SelectItem key={hour} value={hour.toString()}>
                                    {hour.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="startMinute"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minuti</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Min" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[0, 15, 30, 45].map((minute) => (
                                  <SelectItem key={minute} value={minute.toString()}>
                                    {minute.toString().padStart(2, '0')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Cliente</FormLabel>
                        <FormControl>
                          <Input placeholder="Inserisci nome cliente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numero di Telefono</FormLabel>
                        <FormControl>
                          <Input placeholder="+39 123 456 7890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stylistId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stilista</FormLabel>
                        <Select onValueChange={(value) => field.onChange(Number(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona stilista" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stylists?.map((stylist: any) => (
                              <SelectItem key={stylist.id} value={stylist.id.toString()}>
                                {stylist.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="serviceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Servizio</FormLabel>
                        <Select onValueChange={(value) => field.onChange(Number(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona servizio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {services?.map((service: any) => (
                              <SelectItem key={service.id} value={service.id.toString()}>
                                {service.name} ({service.duration}min - €{(service.price / 100).toFixed(2)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annulla
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createAppointmentMutation.isPending}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    >
                      {createAppointmentMutation.isPending ? "Creazione..." : "Crea Appuntamento"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendar Navigation */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={navigatePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-xl font-semibold">
                  {viewMode === 'month' 
                    ? format(selectedDate, "MMMM yyyy", { locale: it })
                    : viewMode === 'week'
                    ? `${format(weekStart, "d MMM", { locale: it })} - ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: it })}`
                    : format(selectedDate, "EEEE, d MMMM yyyy", { locale: it })
                  }
                </h2>
                <Button variant="outline" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'month' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('month')}
                    className="h-8"
                  >
                    Mese
                  </Button>
                  <Button
                    variant={viewMode === 'week' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('week')}
                    className="h-8"
                  >
                    Settimana
                  </Button>
                  <Button
                    variant={viewMode === 'day' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('day')}
                    className="h-8"
                  >
                    Giorno
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={navigateToday}>
                  Oggi
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => triggerRemindersMutation.mutate()}
                  disabled={triggerRemindersMutation.isPending}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  {triggerRemindersMutation.isPending ? "Invio..." : "Test WhatsApp"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              </div>
            ) : viewMode === 'month' ? (
              <div className="space-y-4">
                {/* Month Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const dayAppointments = getAppointmentsForDate(day);
                    const isCurrentMonth = isSameMonth(day, selectedDate);
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentDay = isToday(day);
                    const dateString = format(day, "yyyy-MM-dd");
                    
                    return (
                      <DroppableDay
                        key={index}
                        date={dateString}
                        className={`
                          cursor-pointer transition-colors
                          ${isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400'}
                          ${isSelected ? 'ring-2 ring-pink-500' : ''}
                          ${isCurrentDay ? 'bg-pink-50 border-pink-200' : 'border-gray-200'}
                        `}
                      >
                        <div
                          onClick={() => {
                            setSelectedDate(day);
                            setViewMode('day');
                          }}
                          className="h-full"
                        >
                          <div className={`text-sm font-medium mb-1 ${
                            isCurrentDay ? 'text-pink-600' : 
                            isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                            {format(day, 'd')}
                          </div>
                          
                          {/* Draggable appointments */}
                          <div className="space-y-1">
                            {dayAppointments.slice(0, 3).map((apt: any, i: number) => (
                              <DraggableAppointment
                                key={apt.id}
                                appointment={apt}
                                className="text-xs px-1 py-0.5"
                              />
                            ))}
                            {dayAppointments.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{dayAppointments.length - 3} altri
                              </div>
                            )}
                          </div>
                        </div>
                      </DroppableDay>
                    );
                  })}
                </div>
              </div>
            ) : viewMode === 'week' ? (
              // Week view with drag and drop
              <div className="space-y-4">
                {/* Week Header */}
                <div className="grid grid-cols-8 gap-1 mb-2">
                  <div className="p-2 text-center text-sm font-medium text-gray-600">Ora</div>
                  {weekDays.map((day) => (
                    <div key={day.toString()} className="p-2 text-center text-sm font-medium text-gray-600">
                      <div>{format(day, "EEE", { locale: it })}</div>
                      <div className={`text-lg ${isToday(day) ? 'text-pink-600 font-bold' : ''}`}>
                        {format(day, "d")}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Week Grid */}
                <div className="border rounded-lg overflow-hidden">
                  {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-8 border-b last:border-b-0">
                      <div className="p-3 bg-gray-50 border-r text-sm font-medium text-gray-600 flex items-center">
                        {time}
                      </div>
                      {weekDays.map((day) => {
                        const dateString = format(day, "yyyy-MM-dd");
                        const dayAppointments = getAppointmentsForDate(day);
                        const timeAppointments = dayAppointments.filter(apt => 
                          apt.startTime.slice(0, 5) === time
                        );
                        
                        return (
                          <DroppableTimeSlot
                            key={`${dateString}-${time}`}
                            date={dateString}
                            time={time}
                          >
                                                         {timeAppointments.map((appointment: any) => (
                               <div key={appointment.id} className="mb-1">
                                 <DraggableAppointment appointment={appointment} />
                               </div>
                             ))}
                          </DroppableTimeSlot>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
                          ) : (
              // Day view with time slots and drag-and-drop
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  {timeSlots.map((time) => {
                    const dateString = format(selectedDate, "yyyy-MM-dd");
                    const timeAppointments = dayAppointments.filter(apt => 
                      apt.startTime.slice(0, 5) === time
                    );
                    
                    return (
                      <DroppableTimeSlot
                        key={time}
                        date={dateString}
                        time={time}
                      >
                        <div className="flex items-center p-3 border-b last:border-b-0">
                          <div className="w-16 text-sm font-medium text-gray-600 mr-4">
                            {time}
                          </div>
                          <div className="flex-1 space-y-2">
                            {timeAppointments.length === 0 ? (
                              <div className="text-gray-400 text-sm italic">
                                Nessun appuntamento
                              </div>
                            ) : (
                                                             timeAppointments.map((appointment: any) => (
                                 <div key={appointment.id}>
                                   <DraggableAppointment appointment={appointment} />
                                 </div>
                               ))
                            )}
                          </div>
                        </div>
                      </DroppableTimeSlot>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
    <DragOverlay>
      {activeAppointment ? (
        <DraggableAppointment appointment={activeAppointment} className="opacity-90 shadow-lg" />
      ) : null}
    </DragOverlay>
  </DndContext>
  );
}