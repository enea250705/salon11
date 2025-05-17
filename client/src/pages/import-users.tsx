import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Upload, Download, Info, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { AnimatedContainer } from "@/components/ui/animated-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ImportUsersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [csvData, setCsvData] = useState("");
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [hasPreview, setHasPreview] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  // Mutation per importare utenti
  const importUsersMutation = useMutation({
    mutationFn: async (data: string) => {
      const res = await apiRequest("POST", "/api/users/import", { csvData: data });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Errore nell'importazione degli utenti");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Importazione completata",
        description: `${data.imported} utenti importati con successo`,
      });
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
  
  // Parsing CSV
  const parseCSV = (csv: string): any[] => {
    try {
      setErrors([]);
      
      // Dividi le righe e rimuovi eventuali righe vuote
      const rows = csv.split(/\\r?\\n/).filter(row => row.trim() !== "");
      
      if (rows.length === 0) {
        setErrors(["Il file CSV non contiene dati"]);
        setPreviewData([]);
        setHasPreview(false);
        return [];
      }
      
      // Analizza l'header
      const headers = rows[0].split(',').map(h => h.trim());
      const requiredHeaders = ["name", "email", "username", "role"];
      
      // Controlla se tutti gli header richiesti sono presenti
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        setErrors([`Intestazioni mancanti: ${missingHeaders.join(", ")}`]);
        setPreviewData([]);
        setHasPreview(false);
        return [];
      }
      
      const parsedData = [];
      const rowErrors = [];
      
      // Analizza le righe di dati
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].split(',').map(cell => cell.trim());
        
        // Salta righe con numero errato di colonne
        if (row.length !== headers.length) {
          rowErrors.push(`Riga ${i + 1}: numero errato di colonne`);
          continue;
        }
        
        const rowData: Record<string, string> = {};
        
        // Costruisci oggetto dati dalla riga
        headers.forEach((header, index) => {
          rowData[header] = row[index];
        });
        
        // Convalida ruolo
        if (rowData.role !== "admin" && rowData.role !== "employee") {
          rowErrors.push(`Riga ${i + 1}: ruolo non valido "${rowData.role}" (deve essere "admin" o "employee")`);
          continue;
        }
        
        // Convalida email
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        if (!emailRegex.test(rowData.email)) {
          rowErrors.push(`Riga ${i + 1}: formato email non valido`);
          continue;
        }
        
        parsedData.push(rowData);
      }
      
      if (rowErrors.length > 0) {
        setErrors(rowErrors);
      }
      
      // Imposta i dati di anteprima (max 5 righe)
      setPreviewData(parsedData.slice(0, 5));
      setHasPreview(parsedData.length > 0);
      
      return parsedData;
    } catch (error) {
      setErrors(["Errore nel parsing del CSV"]);
      setPreviewData([]);
      setHasPreview(false);
      return [];
    }
  };
  
  // Gestisce il preview
  const handlePreview = () => {
    parseCSV(csvData);
  };
  
  // Gestisce l'importazione
  const handleImport = () => {
    const parsedData = parseCSV(csvData);
    
    if (!parsedData || parsedData.length === 0) {
      toast({
        title: "Errore",
        description: "Nessun dato valido da importare",
        variant: "destructive",
      });
      return;
    }
    
    // Se ci sono errori, chiedi conferma
    if (errors.length > 0) {
      if (!confirm("Ci sono errori nel file CSV. Vuoi continuare con l'importazione delle righe valide?")) {
        return;
      }
    }
    
    importUsersMutation.mutate(csvData);
  };
  
  const downloadTemplate = () => {
    const template = "name,email,username,role,password\nMario Rossi,mario@esempio.com,mario,employee,password123\nGiulia Bianchi,giulia@esempio.com,giulia,admin,password456";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_utenti.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <AnimatedContainer className="container max-w-3xl mx-auto py-6" type="slide-up">
      <div className="mb-6 flex items-center">
        <Button 
          variant="ghost" 
          className="mr-4 p-0 hover:bg-transparent"
          onClick={() => setLocation("/users")}
        >
          <ArrowLeft className="h-5 w-5 text-primary mr-1" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Importa Utenti</h1>
          <p className="text-sm text-muted-foreground">Importa più utenti da un file CSV</p>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importazione da CSV
          </CardTitle>
          <CardDescription>
            Importa utenti in blocco utilizzando un file CSV
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Formato CSV richiesto</AlertTitle>
            <AlertDescription>
              Il file CSV deve contenere le colonne: name, email, username, role, password (opzionale)
              <Button
                variant="link"
                size="sm"
                className="px-0 text-primary"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-1" />
                Scarica template
              </Button>
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Incolla qui i dati CSV..."
              className="min-h-[200px] font-mono text-sm"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
            />
            
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={!csvData.trim()}
              >
                Anteprima
              </Button>
              
              <Button
                type="button"
                onClick={handleImport}
                disabled={importUsersMutation.isPending || !csvData.trim()}
              >
                {importUsersMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importazione...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importa Utenti
                  </>
                )}
              </Button>
            </div>
            
            {errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md">
                <p className="text-sm font-medium text-red-800 flex items-center mb-2">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Errori nel file CSV
                </p>
                <ul className="space-y-1 text-xs text-red-700 list-disc pl-5">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {hasPreview && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Anteprima dati (prime {previewData.length} righe):</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted">
                        {previewData.length > 0 && Object.keys(previewData[0]).map((key) => (
                          <th key={key} className="p-2 text-left border">{key}</th>
                        ))}
                        <th className="p-2 text-left border">Stato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i} className="border-b">
                          {Object.values(row).map((value, j) => (
                            <td key={j} className="p-2 border">{value as string}</td>
                          ))}
                          <td className="p-2 border">
                            <span className="flex items-center">
                              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                              Valido
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.length < (parseCSV(csvData) || []).length && (
                  <p className="text-xs text-muted-foreground mt-2">
                    + altre {(parseCSV(csvData) || []).length - previewData.length} righe...
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end pt-2">
          <Button
            type="button"
            variant="outline"
            className="mr-2"
            onClick={() => setLocation("/users")}
          >
            Annulla
          </Button>
        </CardFooter>
      </Card>
    </AnimatedContainer>
  );
}