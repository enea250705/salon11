import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveTemplateDialog } from "./save-template-dialog";
import { LoadTemplateDialog } from "./load-template-dialog";

interface TemplateManagerProps {
  scheduleId: number | null;
  disabled?: boolean;
}

export function TemplateManager({ scheduleId, disabled = false }: TemplateManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  
  // Verifica se ci sono dati da salvare
  const { data: shifts = [] } = useQuery({
    queryKey: [`/api/schedules/${scheduleId}/shifts`],
    enabled: !!scheduleId,
  });
  
  const hasDataToSave = shifts && shifts.length > 0;
  
  return (
    <div className="flex flex-col lg:flex-row gap-2 items-center">
      <Button
        variant="outline"
        size="sm"
        className="text-xs w-full lg:w-auto"
        onClick={() => setShowSaveDialog(true)}
        disabled={!scheduleId || !hasDataToSave || disabled}
      >
        <span className="material-icons text-base mr-1">save</span>
        Salva come modello
      </Button>
      
      <Button
        variant="outline" 
        size="sm"
        className="text-xs w-full lg:w-auto"
        onClick={() => setShowLoadDialog(true)}
        disabled={!scheduleId || disabled}
      >
        <span className="material-icons text-base mr-1">template</span>
        Carica modello
      </Button>
      
      {/* Dialog per salvare un modello */}
      <SaveTemplateDialog 
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        scheduleId={scheduleId}
      />
      
      {/* Dialog per caricare un modello */}
      <LoadTemplateDialog
        open={showLoadDialog}
        onOpenChange={setShowLoadDialog}
        scheduleId={scheduleId}
      />
    </div>
  );
}