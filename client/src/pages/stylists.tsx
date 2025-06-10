import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, UserCog, Phone, Mail, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const stylistSchema = z.object({
  name: z.string().min(1, "Nome è richiesto"),
  phone: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
});

type Stylist = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
};

export default function Stylists() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStylist, setEditingStylist] = useState<Stylist | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof stylistSchema>>({
    resolver: zodResolver(stylistSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
    },
  });

  const { data: stylists, isLoading } = useQuery<Stylist[]>({
    queryKey: ["/api/stylists"],
  });

  const createStylistMutation = useMutation({
    mutationFn: (data: z.infer<typeof stylistSchema>) => 
      apiRequest("POST", "/api/stylists", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stylists"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Stilista aggiunto con successo" });
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile aggiungere lo stilista",
        variant: "destructive" 
      });
    },
  });

  const updateStylistMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof stylistSchema> }) =>
      apiRequest("PUT", `/api/stylists/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stylists"] });
      setIsDialogOpen(false);
      setEditingStylist(null);
      form.reset();
      toast({ title: "Stilista aggiornato con successo" });
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile aggiornare lo stilista",
        variant: "destructive" 
      });
    },
  });

  const deleteStylistMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/stylists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stylists"] });
      toast({ title: "Stilista rimosso con successo" });
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile rimuovere lo stilista",
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (values: z.infer<typeof stylistSchema>) => {
    if (editingStylist) {
      updateStylistMutation.mutate({ id: editingStylist.id, data: values });
    } else {
      createStylistMutation.mutate(values);
    }
  };

  const handleEdit = (stylist: Stylist) => {
    setEditingStylist(stylist);
    form.reset({
      name: stylist.name,
      phone: stylist.phone || "",
      email: stylist.email || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Sei sicuro di voler rimuovere questo stilista?")) {
      deleteStylistMutation.mutate(id);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff</h1>
            <p className="text-gray-600">Gestisci il personale del salone</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                onClick={() => {
                  setEditingStylist(null);
                  form.reset();
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingStylist ? "Modifica Membro Staff" : "Nuovo Membro Staff"}
                </DialogTitle>
                <DialogDescription>
                  {editingStylist 
                    ? "Modifica le informazioni del membro dello staff"
                    : "Aggiungi un nuovo membro al team"
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Es. Marco Rossi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono (opzionale)</FormLabel>
                        <FormControl>
                          <Input placeholder="+39 123 456 7890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email (opzionale)</FormLabel>
                        <FormControl>
                          <Input placeholder="email@esempio.it" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    disabled={createStylistMutation.isPending || updateStylistMutation.isPending}
                  >
                    {editingStylist ? "Aggiorna" : "Aggiungi"} Membro
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stylists List */}
        <div className="grid gap-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
            </div>
          ) : !stylists || stylists.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <UserCog className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-gray-500">Nessun membro dello staff</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {stylists.map((stylist) => (
                <Card key={stylist.id} className="shadow-lg border-0 hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-3 rounded-full">
                          <span className="text-white font-semibold text-lg">
                            {stylist.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-xl">{stylist.name}</CardTitle>
                          <CardDescription>Stilista</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(stylist)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(stylist.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stylist.phone && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span className="text-sm">{stylist.phone}</span>
                        </div>
                      )}
                      {stylist.email && (
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span className="text-sm">{stylist.email}</span>
                        </div>
                      )}
                      {!stylist.phone && !stylist.email && (
                        <p className="text-sm text-gray-500 italic">
                          Nessun contatto disponibile
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}