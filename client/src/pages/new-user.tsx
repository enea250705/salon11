import { useLocation } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, ArrowLeft, UserPlus, Save, CheckCircle } from "lucide-react";
import { AnimatedContainer } from "@/components/ui/animated-container";

// Form schema - validazione dei dati
const newUserSchema = z.object({
  name: z.string().min(2, { message: "Il nome deve contenere almeno 2 caratteri" }),
  email: z.string().email({ message: "Email non valida" }),
  username: z.string().min(3, { message: "L'username deve contenere almeno 3 caratteri" }),
  password: z.string()
    .min(8, { message: "La password deve contenere almeno 8 caratteri" })
    .regex(/[0-9]/, { message: "La password deve contenere almeno un numero" }),
  role: z.enum(["admin", "employee"], {
    required_error: "Seleziona un ruolo",
  }),
  position: z.string().min(1, { message: "La posizione è obbligatoria" }),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

type NewUserFormValues = z.infer<typeof newUserSchema>;

export default function NewUserPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Setup del form
  const form = useForm<NewUserFormValues>({
    resolver: zodResolver(newUserSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      role: "employee",
      position: "",
      phone: "",
      isActive: true,
    },
  });
  
  // Mutation per creare un nuovo utente
  const createUserMutation = useMutation({
    mutationFn: async (userData: NewUserFormValues) => {
      const res = await apiRequest("POST", "/api/users", userData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Errore nella creazione dell'utente");
      }
      return await res.json();
    },
    onSuccess: () => {
      // Invalidare la query per ricaricare gli utenti
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      // Mostrare toast di successo
      toast({
        title: "Utente creato",
        description: "Il nuovo utente è stato creato con successo",
      });
      
      // Ritornare alla pagina utenti
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
  
  // Handler per il submit
  const onSubmit = (data: NewUserFormValues) => {
    createUserMutation.mutate(data);
  };
  
  return (
    <AnimatedContainer className="container max-w-4xl mx-auto py-6" type="slide-up">
      <div className="mb-6 flex items-center">
        <Button 
          variant="ghost" 
          className="mr-4 p-0 hover:bg-transparent"
          onClick={() => setLocation("/users")}
        >
          <ArrowLeft className="h-5 w-5 text-primary mr-1" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Crea Nuovo Utente</h1>
          <p className="text-sm text-muted-foreground">Aggiungi un nuovo utente al sistema</p>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Informazioni Utente
          </CardTitle>
          <CardDescription>
            Inserisci i dati del nuovo utente. Tutti i campi contrassegnati con * sono obbligatori.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Nome Completo *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nome Cognome" 
                          {...field} 
                          className="border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        />
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
                      <FormLabel className="text-sm font-medium">Email *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="email@azienda.it" 
                          {...field}
                          className="border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Nome Utente *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="nome.cognome" 
                          {...field}
                          className="border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        />
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
                      <FormLabel className="text-sm font-medium">Password *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            {...field}
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
                      <FormLabel className="text-sm font-medium">Ruolo *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary">
                            <SelectValue placeholder="Seleziona un ruolo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Amministratore</SelectItem>
                          <SelectItem value="employee">Dipendente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Posizione/Ruolo Lavorativo *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="es. Venditore, Amministrativo, etc." 
                          {...field}
                          className="border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        />
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
                      <FormLabel className="text-sm font-medium">Telefono</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Numero di telefono (opzionale)" 
                          {...field}
                          className="border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="p-4 bg-gray-50 rounded-md mb-4 mt-2 border border-gray-200">
                <h4 className="text-sm font-medium mb-2">Requisiti password:</h4>
                <div className="space-y-2">
                  <p className={`text-xs flex items-center gap-1 ${form.watch("password").length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                    {form.watch("password").length >= 8 ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    Almeno 8 caratteri
                  </p>
                  <p className={`text-xs flex items-center gap-1 ${/[0-9]/.test(form.watch("password")) ? 'text-green-600' : 'text-gray-500'}`}>
                    {/[0-9]/.test(form.watch("password")) ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    Almeno un numero
                  </p>
                </div>
              </div>
              
              <CardFooter className="flex justify-between pt-4 border-t px-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/users")}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={createUserMutation.isPending || !form.formState.isValid}
                  className="gap-2"
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creazione in corso...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Crea Utente
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </AnimatedContainer>
  );
}