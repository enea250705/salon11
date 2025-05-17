import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { downloadPdf, generatePayslipFilename, generateTaxDocFilename } from "@/lib/pdf-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

// Definiamo interfaccia per i documenti
interface DocumentData {
  id: number;
  type: string;
  userId: number;
  period: string;
  filename: string;
  fileData: string;
  uploadedBy: number;
  uploadedAt: string;
}

// Definiamo interfaccia per gli utenti
interface UserData {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: string;
}

// Estendiamo l'interfaccia User dell'autenticazione
declare module "@/hooks/use-auth" {
  interface User {
    id: number;
    username: string;
    name: string;
    email?: string;
    role: string;
  }
}

export function DocumentList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const [selectedDocument, setSelectedDocument] = useState<DocumentData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Carica documenti
  const { data: documents = [], isLoading } = useQuery<DocumentData[]>({
    queryKey: ["/api/documents"],
  });
  
  // Carica informazioni utenti per mostrare i nomi (solo per admin)
  const { data: users = [] } = useQuery<UserData[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });
  
  // Filtra documenti in base al ruolo
  const filteredDocuments = isAdmin
    ? documents
    : documents.filter((doc) => doc.userId === user?.id);
    
  // Ordina per data di caricamento (più recenti prima)
  const sortedDocuments = [...filteredDocuments].sort((a, b) => 
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
  
  // Mutazione per eliminare un documento (solo per admin)
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Documento eliminato",
        description: "Il documento è stato eliminato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione del documento",
        variant: "destructive",
      });
    },
  });
  
  // Funzione per gestire l'apertura o il download di un documento
  const handleViewDocument = (document: DocumentData, mode: 'download' | 'open' = 'open') => {
    const { type, period, fileData, fileUrl, userId } = document;
    
    // Se è disponibile un URL per il documento, lo utilizziamo direttamente
    if (fileUrl) {
      if (mode === 'open') {
        // Apri il link in una nuova scheda
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
        
        toast({
          title: "Documento aperto",
          description: "Il documento è stato aperto in una nuova scheda",
          duration: 3000,
        });
      } else {
        // Per scaricare, utilizziamo una tecnica che funziona con URL esterni
        const downloadWindow = window.open(fileUrl, '_blank');
        if (downloadWindow) {
          toast({
            title: "Download avviato",
            description: "Il documento è stato aperto per il download",
            duration: 3000,
          });
        } else {
          toast({
            title: "Popup bloccato",
            description: "Il browser ha bloccato l'apertura del documento. Verifica le impostazioni del browser.",
            variant: "destructive",
          });
        }
      }
      return;
    }
    
    // Fallback all'approccio base64 se non c'è un URL
    if (!fileData) {
      console.error("Errore: documento non disponibile - né fileUrl né fileData presenti:", document);
      toast({
        title: "Errore nella visualizzazione",
        description: "Impossibile visualizzare il documento. Dati mancanti.",
        variant: "destructive",
      });
      return;
    }
    
    // Ottieni il nome dipendente corretto
    const employeeName = isAdmin 
      ? users.find((u) => u.id === userId)?.name || `Utente ${userId}`
      : user?.name || user?.username || "";
    
    // Prepara il nome del file in base al tipo di documento
    let filename = "";
    if (type === "payslip") {
      filename = generatePayslipFilename(period, employeeName);
    } else if (type === "tax_document") {
      filename = generateTaxDocFilename(period, employeeName);
    } else {
      filename = `documento_${period}.pdf`;
    }
    
    try {
      // Costruisci l'URL dei dati PDF
      const dataUrl = fileData.startsWith('data:') 
        ? fileData 
        : `data:application/pdf;base64,${fileData}`;
      
      if (mode === 'download') {
        // Scarica il file
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Download avviato",
          description: "Il documento è stato scaricato con successo",
          duration: 3000,
        });
      } else {
        // Apri in una nuova scheda senza usare il router
        const win = window.open('', '_blank');
        if (win) {
          // Forza il caricamento diretto del PDF nella nuova finestra
          win.document.write(`
            <html>
              <head>
                <title>${filename}</title>
              </head>
              <body style="margin:0;padding:0;">
                <embed width="100%" height="100%" src="${dataUrl}" type="application/pdf">
              </body>
            </html>
          `);
          win.document.close();
        } else {
          // Se il popup è bloccato, mostra un messaggio
          toast({
            title: "Popup bloccato",
            description: "Il browser ha bloccato l'apertura del documento. Verifica le impostazioni del browser.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error(`Errore durante ${mode === 'download' ? 'il download' : "l'apertura"} del documento:`, error);
      toast({
        title: "Errore",
        description: `Si è verificato un problema durante ${mode === 'download' ? 'il download' : "l'apertura"} del documento`,
        variant: "destructive",
      });
    }
  };
  
  // Alias per mantenere la compatibilità con il codice esistente
  const handleDownload = (document: DocumentData) => handleViewDocument(document, 'download');
  
  // Funzione di supporto per convertire base64 in blob (non più utilizzata)
  function base64ToBlob(base64: string, mimeType: string): Blob {
    try {
      // Log per debug
      console.log("Tentativo di conversione base64 in blob");
      console.log("Tipo di dato ricevuto:", typeof base64);
      console.log("Lunghezza dati:", base64.length);
      
      // Rimuovi qualsiasi prefisso data:xxx;base64, se presente
      let base64Data = base64;
      if (base64.includes(',')) {
        base64Data = base64.split(',')[1];
      }
      
      // Converti il base64 in blob manualmente
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      return new Blob(byteArrays, { type: mimeType });
    } catch (error) {
      console.error('Errore durante la conversione da base64 a blob:', error);
      throw new Error('Impossibile convertire i dati del documento');
    }
  }
  
  // Funzione per eliminare un documento (solo admin)
  const handleDelete = (id: number) => {
    if (confirm("Sei sicuro di voler eliminare questo documento?")) {
      deleteMutation.mutate(id);
    }
  };
  
  // Funzione per ottenere il nome dell'utente (solo per admin)
  const getUserName = (userId: number) => {
    if (!isAdmin) return "";
    const user = users.find((u: any) => u.id === userId);
    return user ? user.name : `Utente ${userId}`;
  };
  
  // Funzione per preview documento
  const handlePreview = (document: any) => {
    setSelectedDocument(document);
    setPreviewOpen(true);
  };
  
  // Formatta il tipo di documento
  const formatDocumentType = (type: string) => {
    switch (type) {
      case "payslip":
        return "Busta paga";
      case "tax_document":
        return "CUD";
      default:
        return type;
    }
  };
  
  if (isLoading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>I tuoi documenti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <span className="material-icons animate-spin text-primary">sync</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (sortedDocuments.length === 0) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>{isAdmin ? "Documenti" : "I tuoi documenti"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="material-icons text-4xl text-gray-400 mb-2">description</span>
            <p className="text-gray-500">
              {isAdmin 
                ? "Non ci sono documenti caricati nel sistema"
                : "Non ci sono documenti disponibili per te al momento"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>{isAdmin ? "Documenti" : "I tuoi documenti"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedDocuments.map((doc) => (
              <div 
                key={doc.id} 
                className="p-4 border rounded-md hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                  <div>
                    <div className="flex items-center">
                      <span className="material-icons text-primary mr-2">
                        {doc.type === "payslip" ? "receipt" : "description"}
                      </span>
                      <span className="font-medium">
                        {formatDocumentType(doc.type)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="text-gray-500">Periodo:</span> {doc.period}
                    </div>
                    {isAdmin && (
                      <div className="mt-1 text-sm">
                        <span className="text-gray-500">Dipendente:</span> {getUserName(doc.userId)}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-gray-500">
                      Caricato il {format(parseISO(doc.uploadedAt), "d MMMM yyyy", { locale: it })}
                    </div>
                    {/* Debug info per vedere se fileData esiste */}
                    <div className="mt-1 text-xs text-gray-400">
                      {doc.fileData ? `PDF: ${doc.fileData.substring(0, 20)}...` : "Dati PDF mancanti"}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 self-start sm:self-auto mt-2 sm:mt-0">
                    PDF
                  </Badge>
                </div>
                
                {/* Desktop actions */}
                <div className="hidden sm:flex sm:flex-wrap gap-2 mt-3 sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs"
                    onClick={() => handleViewDocument(doc, 'open')}
                    disabled={!doc.fileData}
                  >
                    <span className="material-icons text-sm mr-1">open_in_new</span>
                    Apri PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-300 hover:bg-green-50 text-xs"
                    onClick={() => handleViewDocument(doc, 'download')}
                    disabled={!doc.fileData}
                  >
                    <span className="material-icons text-sm mr-1">download</span>
                    Scarica
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <span className="material-icons text-sm mr-1">delete</span>
                      Elimina
                    </Button>
                  )}
                </div>

                {/* Mobile actions */}
                <div className="sm:hidden flex items-center justify-center mt-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        Azioni <MoreVertical className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-[180px]">
                      <DropdownMenuItem 
                        onClick={() => handleViewDocument(doc, 'open')}
                        disabled={!doc.fileData}
                      >
                        <span className="material-icons text-sm mr-2 text-blue-600">open_in_new</span>
                        Apri PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleViewDocument(doc, 'download')}
                        disabled={!doc.fileData}
                      >
                        <span className="material-icons text-sm mr-2 text-green-600">download</span>
                        Scarica
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem 
                          onClick={() => handleDelete(doc.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <span className="material-icons text-sm mr-2 text-red-600">delete</span>
                          Elimina
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh] w-[92%] md:w-full" aria-describedby="pdf-preview">
          <DialogHeader>
            <DialogTitle>
              {selectedDocument && (
                <>
                  {formatDocumentType(selectedDocument.type)} - {selectedDocument.period}
                </>
              )}
            </DialogTitle>
            <DialogDescription id="pdf-preview" className="sr-only">
              Anteprima del documento PDF
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="h-full max-h-[calc(80vh-80px)] overflow-auto">
              <iframe
                src={`data:application/pdf;base64,${selectedDocument.fileData}`}
                className="w-full h-full min-h-[500px]"
                title="Anteprima PDF"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}