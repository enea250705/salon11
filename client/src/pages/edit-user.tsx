import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Loader2, Save, UserCheck } from "lucide-react";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { User } from "@shared/schema";

export default function EditUserPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Ottiene l'ID utente dall'URL
  const params = new URLSearchParams(window.location.search);
  const userId = parseInt(params.get("userId") || "0");
  
  // Stato per i dati form
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    role: "employee" as "admin" | "employee",
    isActive: true
  });
  
  // Caricamento dati utente
  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include"
      });
      if (!res.ok) {
        throw new Error("Errore nel caricamento dei dati utente");
      }
      return await res.json();
    },
    enabled: !!userId && userId > 0,
  });
  
  // Quando i dati utente sono caricati, imposta i dati del form
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role as "admin" | "employee",
        isActive: user.isActive
      });
    }
  }, [user]);
  
  // Mutation per l'aggiornamento utente
  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}`, userData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Errore nell'aggiornamento dell'utente");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Utente aggiornato",
        description: "I dati dell'utente sono stati aggiornati con successo",
      });
      // Tornare alla lista utenti
      setLocation("/users");
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  useEffect(() => {
    if (!userId || userId <= 0) {
      toast({
        title: "Errore",
        description: "Utente non specificato o ID non valido",
        variant: "destructive",
      });
      setLocation("/users");
    }
  }, [userId, toast, setLocation]);
  
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-sm text-gray-500">Caricamento...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">Utente non trovato</h2>
          <p className="mt-2 text-gray-600">Impossibile trovare l'utente specificato.</p>
          <Button 
            className="mt-4" 
            onClick={() => setLocation("/users")}
          >
            Torna alla gestione utenti
          </Button>
        </div>
      </div>
    );
  }
  
  // Handler per l'aggiornamento
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateUserMutation.mutate(formData);
  };
  
  return (
    <AnimatedContainer className="container max-w-2xl mx-auto py-6" type="slide-up">
      <div className="mb-6 flex items-center">
        <Button 
          variant="ghost" 
          className="mr-4 p-0 hover:bg-transparent"
          onClick={() => setLocation("/users")}
        >
          <ArrowLeft className="h-5 w-5 text-primary mr-1" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Modifica Utente</h1>
          <p className="text-sm text-muted-foreground">Aggiorna le informazioni dell'utente</p>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Modifica Dati Utente
          </CardTitle>
          <CardDescription>
            Modifica le informazioni per l'utente selezionato
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 rounded-md menu-card flex items-center gap-3 mb-4 animate-fadeIn">
              <div className="rounded-full flex-shrink-0 shadow-md">
                <img 
                  src={formData.role === "admin" ? "/avatars/admin.svg" : "/avatars/employee.svg"} 
                  alt={formData.role === "admin" ? "Avatar amministratore" : "Avatar dipendente"}
                  className="w-12 h-12 rounded-full transition-all duration-300"
                />
              </div>
              <div>
                <h4 className="font-medium text-primary">{user.name}</h4>
                <p className="text-sm opacity-80">
                  ID: {user.id} • Username: {user.username}
                </p>
              </div>
            </div>
          
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  placeholder="Nome e cognome"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@esempio.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nome utente</Label>
                <Input
                  id="username"
                  placeholder="Nome utente"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Ruolo</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "admin" | "employee") => 
                    setFormData({...formData, role: value})
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="admin">Amministratore</SelectItem>
                    <SelectItem value="employee">Dipendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Stato</Label>
              <Select
                value={formData.isActive ? "active" : "inactive"}
                onValueChange={(value) => 
                  setFormData({...formData, isActive: value === "active"})
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Seleziona stato" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="active">
                    <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                      Attivo
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                      Disattivato
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          
            <CardFooter className="flex justify-end pt-4 px-0">
              <Button
                type="button"
                variant="outline"
                className="mr-2"
                onClick={() => setLocation("/users")}
              >
                Annulla
              </Button>
              <Button 
                type="submit"
                disabled={updateUserMutation.isPending}
                className="gap-1"
              >
                {updateUserMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salva Modifiche
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </AnimatedContainer>
  );
}