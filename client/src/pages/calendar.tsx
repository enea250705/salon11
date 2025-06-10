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
import { Plus, Calendar as CalendarIcon, Clock, User, Scissors, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { it } from "date-fns/locale";

const appointmentSchema = z.object({
  clientName: z.string().min(1, "Nome cliente è richiesto"),
  stylistId: z.number({ required_error: "Stilista è richiesto" }),
  serviceId: z.number({ required_error: "Servizio è richiesto" }),
  date: z.string().min(1, "Data è richiesta"),
  startTime: z.string().min(1, "Ora inizio è richiesta"),
});

type AppointmentForm = z.infer<typeof appointmentSchema>;

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientName: "",
      date: format(selectedDate, "yyyy-MM-dd"),
      startTime: "",
    },
  });

  const { data: appointments, isLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments", { date: format(selectedDate, "yyyy-MM-dd") }],
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
        phone: "",
        email: "",
        notes: "",
      });
      const newClient = await clientResponse.json();

      // Calculate end time based on service duration
      const [hours, minutes] = data.startTime.split(':').map(Number);
      const startTimeMinutes = hours * 60 + minutes;
      
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
        startTime: data.startTime,
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

  const onSubmit = (data: AppointmentForm) => {
    createAppointmentMutation.mutate(data);
  };

  // Navigation functions
  const navigateToday = () => setSelectedDate(new Date());
  const navigatePrevious = () => {
    if (viewMode === "day") {
      setSelectedDate(subDays(selectedDate, 1));
    } else {
      setSelectedDate(subWeeks(selectedDate, 1));
    }
  };
  const navigateNext = () => {
    if (viewMode === "day") {
      setSelectedDate(addDays(selectedDate, 1));
    } else {
      setSelectedDate(addWeeks(selectedDate, 1));
    }
  };

  // Generate time slots for the day view
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = 9 + i; // Start from 9 AM
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Filter appointments for the selected date
  const dayAppointments = appointments?.filter(app => app.date === format(selectedDate, "yyyy-MM-dd")) || [];

  return (
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
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ora Inizio</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                  {format(selectedDate, "EEEE, d MMMM yyyy", { locale: it })}
                </h2>
                <Button variant="outline" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant={viewMode === "day" ? "default" : "outline"} 
                  onClick={() => setViewMode("day")}
                  size="sm"
                >
                  Giorno
                </Button>
                <Button 
                  variant={viewMode === "week" ? "default" : "outline"} 
                  onClick={() => setViewMode("week")}
                  size="sm"
                >
                  Settimana
                </Button>
                <Button variant="outline" onClick={navigateToday} size="sm">
                  Oggi
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              </div>
            ) : viewMode === "day" ? (
              <div className="space-y-2">
                {timeSlots.map((time) => {
                  const appointmentsAtTime = dayAppointments.filter(app => 
                    app.startTime.slice(0, 5) === time
                  );
                  
                  return (
                    <div key={time} className="flex items-center border-b border-gray-100 py-2">
                      <div className="w-20 text-sm text-gray-600 font-medium">
                        {time}
                      </div>
                      <div className="flex-1 ml-4">
                        {appointmentsAtTime.length > 0 ? (
                          <div className="space-y-1">
                            {appointmentsAtTime.map((appointment: any) => (
                              <div
                                key={appointment.id}
                                className="bg-gradient-to-r from-pink-100 to-purple-100 border-l-4 border-pink-500 p-3 rounded-r-lg"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-semibold text-gray-900">
                                      {appointment.client.firstName} {appointment.client.lastName}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {appointment.service.name} • {appointment.stylist.name}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-medium text-pink-600">
                                      {appointment.startTime.slice(0, 5)} - {appointment.endTime.slice(0, 5)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {appointment.service.duration}min
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm">Nessun appuntamento</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Vista settimanale in sviluppo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}