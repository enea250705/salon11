import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, MessageSquare, Edit, Trash2, Settings as SettingsIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const templateSchema = z.object({
  name: z.string().min(1, "Nome è richiesto"),
  template: z.string().min(1, "Template è richiesto"),
});

type MessageTemplate = {
  id: number;
  name: string;
  template: string;
  isActive: boolean;
  createdAt: string;
};

export default function Settings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      template: "",
    },
  });

  const { data: templates, isLoading } = useQuery<MessageTemplate[]>({
    queryKey: ["/api/message-templates"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: z.infer<typeof templateSchema>) => 
      apiRequest("POST", "/api/message-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Template creato con successo" });
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile creare il template",
        variant: "destructive" 
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: z.infer<typeof templateSchema> }) =>
      apiRequest("PUT", `/api/message-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
      toast({ title: "Template aggiornato con successo" });
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile aggiornare il template",
        variant: "destructive" 
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/message-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({ title: "Template eliminato con successo" });
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile eliminare il template",
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (values: z.infer<typeof templateSchema>) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: values });
    } else {
      createTemplateMutation.mutate(values);
    }
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      template: template.template,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Sei sicuro di voler eliminare questo template?")) {
      deleteTemplateMutation.mutate(id);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Impostazioni</h1>
          <p className="text-gray-600">Configura le impostazioni del salone</p>
        </div>

        {/* WhatsApp Templates Section */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Template WhatsApp</CardTitle>
                <CardDescription>
                  Gestisci i template per i messaggi automatici di promemoria
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    onClick={() => {
                      setEditingTemplate(null);
                      form.reset();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuovo Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTemplate ? "Modifica Template" : "Nuovo Template"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingTemplate 
                        ? "Modifica il template per i messaggi WhatsApp"
                        : "Crea un nuovo template per i messaggi WhatsApp"
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
                            <FormLabel>Nome Template</FormLabel>
                            <FormControl>
                              <Input placeholder="Es. Promemoria Appuntamento" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="template"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Messaggio</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Ciao [NOME], ti ricordiamo il tuo appuntamento di domani alle [ORA] per [SERVIZIO]. A presto! 💇‍♀️"
                                className="resize-none h-24"
                                {...field} 
                              />
                            </FormControl>
                            <div className="text-xs text-gray-500 mt-1">
                              Variabili disponibili: [NOME], [ORA], [SERVIZIO], [STILISTA]
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                        disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                      >
                        {editingTemplate ? "Aggiorna" : "Crea"} Template
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
              </div>
            ) : !templates || templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nessun template configurato</p>
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 p-2 rounded-lg">
                          <MessageSquare className="h-4 w-4 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                        {template.template}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template.id)}
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

        {/* Additional Settings Sections */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5" />
                <span>Informazioni Salone</span>
              </CardTitle>
              <CardDescription>
                Configura le informazioni di base del salone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nome Salone</label>
                  <Input defaultValue="Salone di Bellezza" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Indirizzo</label>
                  <Input placeholder="Via Roma 123, Milano" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Telefono</label>
                  <Input placeholder="+39 02 1234567" className="mt-1" />
                </div>
                <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                  Salva Impostazioni
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>Orari di Apertura</CardTitle>
              <CardDescription>
                Configura gli orari di lavoro del salone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Apertura</label>
                    <Input type="time" defaultValue="09:00" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Chiusura</label>
                    <Input type="time" defaultValue="19:00" className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Giorni di Chiusura</label>
                  <Input placeholder="Domenica, Lunedì" className="mt-1" />
                </div>
                <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
                  Salva Orari
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}