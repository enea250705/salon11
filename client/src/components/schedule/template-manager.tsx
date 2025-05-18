import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ScheduleTemplate = {
  id: string;
  name: string;
  type: 'even' | 'odd' | 'custom';
  data: any;
};

type TemplateManagerProps = {
  isOpen: boolean;
  onClose: () => void;
  currentScheduleData: any;
  onApplyTemplate: (templateData: any) => void;
};

export function TemplateManager({ 
  isOpen, 
  onClose, 
  currentScheduleData,
  onApplyTemplate
}: TemplateManagerProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ScheduleTemplate[]>(() => {
    // Carica i template salvati dal localStorage
    const savedTemplates = localStorage.getItem('scheduleTemplates');
    return savedTemplates ? JSON.parse(savedTemplates) : [];
  });
  
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<'even' | 'odd' | 'custom'>('custom');
  const [mode, setMode] = useState<'save' | 'load'>('load');
  
  // Salva un nuovo template
  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({
        title: "Nome richiesto",
        description: "Inserisci un nome per il template",
        variant: "destructive"
      });
      return;
    }
    
    // Crea un nuovo template con i dati correnti del turno
    const newTemplate: ScheduleTemplate = {
      id: Date.now().toString(),
      name: newTemplateName,
      type: newTemplateType,
      data: currentScheduleData
    };
    
    const updatedTemplates = [...templates, newTemplate];
    setTemplates(updatedTemplates);
    
    // Salva nel localStorage
    localStorage.setItem('scheduleTemplates', JSON.stringify(updatedTemplates));
    
    toast({
      title: "Template salvato",
      description: `Il template "${newTemplateName}" è stato salvato con successo`
    });
    
    // Reset form
    setNewTemplateName('');
    setMode('load');
  };
  
  // Carica un template selezionato
  const handleLoadTemplate = () => {
    if (!selectedTemplate) {
      toast({
        title: "Seleziona template",
        description: "Seleziona un template da applicare",
        variant: "destructive"
      });
      return;
    }
    
    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      // Richiedi conferma prima di applicare
      if (window.confirm(`Sei sicuro di voler applicare il template "${template.name}"? Questo sovrascriverà gli orari correnti.`)) {
        // Applica il template
        onApplyTemplate(template.data);
        toast({
          title: "Template applicato",
          description: `Il template "${template.name}" è stato applicato con successo`
        });
        onClose();
      }
    }
  };
  
  // Elimina un template
  const handleDeleteTemplate = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    
    const template = templates.find(t => t.id === templateId);
    if (template && window.confirm(`Sei sicuro di voler eliminare il template "${template.name}"?`)) {
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      setTemplates(updatedTemplates);
      
      // Aggiorna localStorage
      localStorage.setItem('scheduleTemplates', JSON.stringify(updatedTemplates));
      
      if (selectedTemplate === templateId) {
        setSelectedTemplate('');
      }
      
      toast({
        title: "Template eliminato",
        description: `Il template "${template.name}" è stato eliminato`
      });
    }
  };
  
  // Formatta il tipo di template
  const formatTemplateType = (type: string) => {
    switch (type) {
      case 'even': return 'Settimana pari';
      case 'odd': return 'Settimana dispari';
      case 'custom': return 'Personalizzato';
      default: return type;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gestione Template Orari</DialogTitle>
          <DialogDescription>
            Salva e carica template degli orari per facilitare la pianificazione
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex space-x-2 mt-2">
          <Button 
            variant={mode === 'save' ? "default" : "outline"} 
            onClick={() => setMode('save')}
            className="flex-1"
          >
            Salva Nuovo
          </Button>
          <Button 
            variant={mode === 'load' ? "default" : "outline"} 
            onClick={() => setMode('load')}
            className="flex-1"
          >
            Carica Esistente
          </Button>
        </div>
        
        {mode === 'save' ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome template</Label>
              <Input
                id="template-name"
                placeholder="es. Orario Estivo"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template-type">Tipo template</Label>
              <Select 
                value={newTemplateType} 
                onValueChange={(value: any) => setNewTemplateType(value)}
              >
                <SelectTrigger id="template-type">
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="even">Settimana pari</SelectItem>
                  <SelectItem value="odd">Settimana dispari</SelectItem>
                  <SelectItem value="custom">Personalizzato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleSaveTemplate} 
              className="w-full"
            >
              Salva template corrente
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {templates.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nessun template salvato. Crea un nuovo template salvando un orario.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="select-template">Seleziona template</Label>
                  <Select 
                    value={selectedTemplate} 
                    onValueChange={setSelectedTemplate}
                  >
                    <SelectTrigger id="select-template">
                      <SelectValue placeholder="Seleziona un template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{template.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({formatTemplateType(template.type)})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {templates.map(template => (
                    <div 
                      key={template.id}
                      className={`border rounded-md p-2 cursor-pointer flex items-center justify-between ${
                        selectedTemplate === template.id ? 'border-primary bg-primary/10' : ''
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTemplateType(template.type)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 ml-2"
                        onClick={(e) => handleDeleteTemplate(e, template.id)}
                      >
                        <span className="material-icons text-red-500" style={{ fontSize: '16px' }}>
                          delete
                        </span>
                      </Button>
                    </div>
                  ))}
                </div>
                
                <Button 
                  onClick={handleLoadTemplate} 
                  className="w-full"
                  disabled={!selectedTemplate}
                >
                  Applica template selezionato
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}