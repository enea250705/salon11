import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Plus, Users, Edit, Trash2, Eye, EyeOff } from "lucide-react";

const createStaffSchema = z.object({
  username: z.string().min(3, "Username deve essere almeno 3 caratteri"),
  password: z.string().min(6, "Password deve essere almeno 6 caratteri"),
  firstName: z.string().min(1, "Nome è richiesto"),
  lastName: z.string().min(1, "Cognome è richiesto"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  role: z.enum(["admin", "staff"], { required_error: "Ruolo è richiesto" }),
});

type CreateStaffForm = z.infer<typeof createStaffSchema>;

export default function Staff() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateStaffForm>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "staff",
    },
  });

  const { data: staffMembers, isLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: CreateStaffForm) => {
      if (editingStaff) {
        return apiRequest("PUT", `/api/users/${editingStaff.id}`, data);
      } else {
        return apiRequest("POST", "/api/users", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      setEditingStaff(null);
      form.reset();
      toast({ 
        title: editingStaff ? "Staff aggiornato" : "Staff creato", 
        description: editingStaff ? "Membro staff aggiornato con successo" : "Nuovo membro staff creato con successo" 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare/aggiornare staff",
        variant: "destructive",
      });
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Staff eliminato", description: "Membro staff eliminato con successo" });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare staff",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (staff: any) => {
    setEditingStaff(staff);
    form.reset({
      username: staff.username,
      password: "", // Don't show existing password
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email || "",
      role: staff.role,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingStaff(null);
    form.reset({
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "staff",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: CreateStaffForm) => {
    createStaffMutation.mutate(data);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "staff":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Amministratore";
      case "staff":
        return "Staff";
      default:
        return "Utente";
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestione Staff</h1>
            <p className="text-gray-600">Gestisci i membri del team e i loro permessi</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={handleCreate}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingStaff ? "Modifica Staff" : "Nuovo Membro Staff"}
                </DialogTitle>
                <DialogDescription>
                  {editingStaff 
                    ? "Modifica i dettagli del membro staff" 
                    : "Crea un nuovo account staff con username e password"
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cognome</FormLabel>
                          <FormControl>
                            <Input placeholder="Cognome" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Username per accesso" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {editingStaff ? "Nuova Password (lascia vuoto per non modificare)" : "Password"}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              placeholder={editingStaff ? "Nuova password..." : "Password di accesso"}
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
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
                          <Input type="email" placeholder="email@esempio.it" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruolo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona ruolo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="admin">Amministratore</SelectItem>
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
                      disabled={createStaffMutation.isPending}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    >
                      {createStaffMutation.isPending 
                        ? (editingStaff ? "Aggiornamento..." : "Creazione...") 
                        : (editingStaff ? "Aggiorna" : "Crea Staff")
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membri Staff
            </CardTitle>
            <CardDescription>
              Lista di tutti i membri staff con i loro ruoli e permessi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              </div>
            ) : !staffMembers || staffMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nessun membro staff trovato</p>
              </div>
            ) : (
              <div className="space-y-4">
                {staffMembers.map((staff: any) => (
                  <div
                    key={staff.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {staff.firstName} {staff.lastName}
                          </div>
                          <div className="text-sm text-gray-600">
                            @{staff.username}
                            {staff.email && ` • ${staff.email}`}
                          </div>
                        </div>
                        <Badge className={getRoleBadgeColor(staff.role)}>
                          {getRoleLabel(staff.role)}
                        </Badge>
                        {!staff.isActive && (
                          <Badge variant="secondary">Disattivato</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(staff)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteStaffMutation.mutate(staff.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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