import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface LoadTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: number | null;
}

export function LoadTemplateDialog({ open, onOpenChange, scheduleId }: LoadTemplateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  // Carica tutti i template disponibili
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/templates"],
    enabled: open,
  });
  
  const applyTemplateMutation = useMutation({
    mutationFn: () => {
      if (!scheduleId) throw new Error("Schedule ID non valido");
      if (!selectedTemplate) throw new Error("Nessun template selezionato");
      
      return apiRequest(`/api/schedules/${scheduleId}/apply-template/${selectedTemplate}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Modello applicato",
        description: "Il modello è stato applicato con successo all'orario.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/schedules/${scheduleId}/shifts`] });
      setSelectedTemplate("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: "Impossibile applicare il modello. Riprova più tardi.",
        variant: "destructive",
      });
    },
  });

  function handleApplyTemplate() {
    // Conferma prima di sovrascrivere
    if (window.confirm("Questo sovrascriverà eventuali turni esistenti. Continuare?")) {
      applyTemplateMutation.mutate();
    }
  }

  const hasTemplates = templates && templates.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Carica modello</DialogTitle>
          <DialogDescription>
            Applica un modello di orario esistente alla settimana corrente
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <span>Caricamento modelli...</span>
          </div>
        ) : !hasTemplates ? (
          <Alert variant="default" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Nessun modello disponibile</AlertTitle>
            <AlertDescription>
              Non ci sono modelli di orario salvati. Salva prima un modello.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-select">Seleziona un modello</Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger id="template-select">
                  <SelectValue placeholder="Seleziona un modello" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: any) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name} {template.type === 'even' ? '(Pari)' : template.type === 'odd' ? '(Dispari)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedTemplate && (
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Attenzione</AlertTitle>
                <AlertDescription>
                  Applicando questo modello verranno sovrascritti eventuali turni esistenti.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annulla
          </Button>
          <Button 
            type="button"
            disabled={!selectedTemplate || applyTemplateMutation.isPending || !hasTemplates}
            onClick={handleApplyTemplate}
          >
            {applyTemplateMutation.isPending ? "Applicazione..." : "Applica modello"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}