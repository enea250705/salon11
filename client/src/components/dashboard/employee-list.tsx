import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle } from "lucide-react";

// Tipo di dati per un dipendente
interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  position?: string;
}

export function EmployeeList() {
  // Recupera la lista dei dipendenti dall'API
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/users"],
  });

  return (
    <Card className="bg-white h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Elenco Dipendenti</CardTitle>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <UserCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>Nessun dipendente trovato</p>
          </div>
        ) : (
          <div className="space-y-4">
            {employees.map((employee) => (
              <div key={employee.id} className="flex items-start border-b pb-3 last:border-0">
                <div className="flex-shrink-0 mt-1">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <UserCircle className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{employee.name}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{employee.email}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {employee.role === "admin" ? "Amministratore" : "Dipendente"}
                    {employee.position && ` - ${employee.position}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}