import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const templateFormSchema = z.object({
  name: z.string().min(3, { message: "Il nome deve essere di almeno 3 caratteri" }),
  type: z.enum(["even", "odd", "custom"], {
    required_error: "Seleziona il tipo di modello",
  }),
  description: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: number | null;
}

export function SaveTemplateDialog({ open, onOpenChange, scheduleId }: SaveTemplateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      type: "custom",
      description: "",
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: TemplateFormValues) => {
      if (!scheduleId) throw new Error("Schedule ID non valido");
      
      return apiRequest(`/api/schedules/${scheduleId}/save-as-template`, {
        method: "POST",
        data: {
          ...data,
          scheduleId
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Modello salvato",
        description: "Il modello di orario è stato salvato con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Impossibile salvare il modello. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: TemplateFormValues) {
    createTemplateMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salva come modello</DialogTitle>
          <DialogDescription>
            Salva l'orario corrente come modello per riutilizzarlo in futuro
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome modello</FormLabel>
                  <FormControl>
                    <Input placeholder="Inserisci un nome per il modello" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo di modello</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="even">Settimana pari</SelectItem>
                      <SelectItem value="odd">Settimana dispari</SelectItem>
                      <SelectItem value="custom">Personalizzato</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione (opzionale)</FormLabel>
                  <FormControl>
                    <Input placeholder="Descrizione del modello" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annulla
              </Button>
              <Button 
                type="submit"
                disabled={createTemplateMutation.isPending}
              >
                {createTemplateMutation.isPending ? "Salvataggio..." : "Salva modello"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}