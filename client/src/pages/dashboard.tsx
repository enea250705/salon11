import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { Users, Calendar, Scissors, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

const quickAppointmentSchema = z.object({
  clientName: z.string().min(1, "Nome cliente è richiesto"),
  stylistId: z.number({ required_error: "Stilista è richiesto" }),
  serviceId: z.number({ required_error: "Servizio è richiesto" }),
  date: z.string().min(1, "Data è richiesta"),
  startHour: z.number({ required_error: "Ora è richiesta" }),
  startMinute: z.number({ required_error: "Minuti sono richiesti" }),
});

type QuickAppointmentForm = z.infer<typeof quickAppointmentSchema>;

type DashboardStats = {
  totalClients: number;
  todayAppointments: number;
  tomorrowAppointments: number;
  totalServices: number;
  totalStylists: number;
};

export default function Dashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<QuickAppointmentForm>({
    resolver: zodResolver(quickAppointmentSchema),
    defaultValues: {
      clientName: "",
      date: new Date().toISOString().split('T')[0],
      startHour: 9,
      startMinute: 0,
    },
  });

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: todayAppointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments", { date: new Date().toISOString().split('T')[0] }],
  });

  const { data: stylists } = useQuery<any[]>({
    queryKey: ["/api/stylists"],
  });

  const { data: services } = useQuery<any[]>({
    queryKey: ["/api/services"],
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: QuickAppointmentForm) => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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

  const onSubmit = (data: QuickAppointmentForm) => {
    createAppointmentMutation.mutate(data);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Panoramica generale del salone</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-500 to-pink-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Clienti Totali</CardTitle>
              <Users className="h-4 w-4 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : stats?.totalClients || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Appuntamenti Oggi</CardTitle>
              <Calendar className="h-4 w-4 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : stats?.todayAppointments || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Servizi</CardTitle>
              <Scissors className="h-4 w-4 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : stats?.totalServices || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Domani</CardTitle>
              <Clock className="h-4 w-4 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : stats?.tomorrowAppointments || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Appointment Creation */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Nuovo Appuntamento</CardTitle>
                <CardDescription>
                  Crea rapidamente un nuovo appuntamento
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Appuntamento
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
          </CardHeader>
        </Card>

        {/* Today's Appointments */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-xl">Appuntamenti di Oggi</CardTitle>
            <CardDescription>
              Tutti gli appuntamenti programmati per oggi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              </div>
            ) : !todayAppointments || (Array.isArray(todayAppointments) && todayAppointments.length === 0) ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nessun appuntamento per oggi</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(todayAppointments) && todayAppointments.map((appointment: any) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {appointment.client.firstName} {appointment.client.lastName}
                      </div>
                      <div className="text-sm text-gray-600">
                        {appointment.service.name} • {appointment.stylist.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-pink-600">
                        {appointment.startTime.slice(0, 5)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {appointment.service.duration}min
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}