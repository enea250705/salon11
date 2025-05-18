import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(1, {
    message: "Username è obbligatorio",
  }),
  password: z.string().min(1, {
    message: "Password è obbligatoria",
  }),
  remember: z.boolean().default(false),
});

export default function Login() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Se l'utente è già autenticato, reindirizza alla dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      remember: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    try {
      // Migliore gestione degli errori con visualizzazione dei messaggi specifici
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
        credentials: 'include'
      });
      
      // Se la risposta non è OK, prova a ottenere il messaggio di errore
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Credenziali non valide';
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (data.user) {
        toast({
          title: "Accesso effettuato",
          description: "Benvenuto nel sistema!",
          variant: "default",
        });
        // Ricarica la pagina per aggiornare lo stato di autenticazione
        window.location.href = '/';
        return;
      }
      
      throw new Error('Errore durante l\'accesso');
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Errore di accesso",
        description: error.message || "Credenziali non valide. Riprova.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <span className="material-icons text-4xl text-primary">restaurant</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-condensed">Da Vittorino</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sistema di Gestione Personale
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="nome.cognome@davittorino.it" {...field} />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder="********" 
                            {...field} 
                          />
                          <button 
                            type="button"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center justify-between">
                  <FormField
                    control={form.control}
                    name="remember"
                    render={({ field }) => (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <label
                          htmlFor="remember"
                          className="text-sm font-medium text-gray-700"
                        >
                          Ricordami
                        </label>
                      </div>
                    )}
                  />
                  
                  {/* Link per reset password rimosso su richiesta */}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading || authLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Accesso in corso...
                    </>
                  ) : (
                    "Accedi"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-gray-500">
          <p>
            © 2025 Da Vittorino - Tutti i diritti riservati
          </p>
        </div>
      </div>
    </div>
  );
}
