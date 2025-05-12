import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff, Loader2, ArrowLeft, Key, CheckCircle, XCircle, Save } from "lucide-react";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { User } from "@shared/schema";

export default function ChangePasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Ottiene l'ID utente dall'URL
  const params = new URLSearchParams(window.location.search);
  const userId = parseInt(params.get("userId") || "0");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
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
  
  // Mutation per il cambio password
  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number, password: string }) => {
      const res = await apiRequest("POST", `/api/users/${userId}/change-password`, { password });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Errore nel cambio password");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password modificata",
        description: "La password è stata cambiata con successo",
      });
      // Tornare alla pagina utenti
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
  
  // Verifica che la password rispetti i requisiti
  const isPasswordValid = newPassword.length >= 8 && /[0-9]/.test(newPassword);
  
  // Handler per il cambio password
  const handleChangePassword = () => {
    if (!user || !isPasswordValid) return;
    
    changePasswordMutation.mutate({
      userId: user.id,
      password: newPassword
    });
  };
  
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
          <h1 className="text-2xl font-bold">Cambio Password</h1>
          <p className="text-sm text-muted-foreground">Modifica la password dell'utente</p>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Modifica Password Utente
          </CardTitle>
          <CardDescription>
            Imposta una nuova password per l'utente selezionato
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          <div className="p-4 rounded-md bg-blue-50 border border-blue-100 flex items-center gap-3 mb-4">
            <div className="bg-blue-100 rounded-full p-3 flex-shrink-0">
              <span className="text-primary font-medium">
                {user.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h4 className="font-medium">{user.name}</h4>
              <p className="text-sm text-gray-500">{user.username} • {user.role === 'admin' ? 'Amministratore' : 'Dipendente'}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium">
              Nuova Password
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Inserisci la nuova password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10 border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <h4 className="text-sm font-medium mb-2">Requisiti password:</h4>
            <div className="space-y-2">
              <p className={`text-xs flex items-center gap-1 ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                {newPassword.length >= 8 ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                Almeno 8 caratteri
              </p>
              <p className={`text-xs flex items-center gap-1 ${/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                {/[0-9]/.test(newPassword) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                Almeno un numero
              </p>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => setLocation("/users")}
          >
            Annulla
          </Button>
          <Button 
            onClick={handleChangePassword}
            disabled={!isPasswordValid || changePasswordMutation.isPending}
            className="gap-2"
          >
            {changePasswordMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salva Password
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </AnimatedContainer>
  );
}