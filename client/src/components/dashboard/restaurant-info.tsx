import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Clock, Utensils } from "lucide-react";

export function RestaurantInfo() {
  // Orari di apertura del ristorante
  const orariApertura = [
    { giorno: "Lunedì", orario: "11:30 - 15:00, 19:00 - 23:00" },
    { giorno: "Martedì", orario: "11:30 - 15:00, 19:00 - 23:00" },
    { giorno: "Mercoledì", orario: "11:30 - 15:00, 19:00 - 23:00" },
    { giorno: "Giovedì", orario: "11:30 - 15:00, 19:00 - 23:00" },
    { giorno: "Venerdì", orario: "11:30 - 15:00, 19:00 - 23:30" },
    { giorno: "Sabato", orario: "11:30 - 15:30, 19:00 - 00:00" },
    { giorno: "Domenica", orario: "11:30 - 15:30, 19:00 - 23:00" },
  ];

  // Informazioni sul ristorante
  const infoRistorante = {
    nome: "Da Vittorino",
    indirizzo: "Via Roma 123, Milano",
    telefono: "+39 02 1234567",
    email: "info@davittorino.it",
    capacita: 80,
    personale: 12,
  };

  // Prossimi eventi
  const prossimiEventi = [
    {
      nome: "Serata Degustazione Vini",
      data: "28 Maggio 2025",
      descrizione: "Degustazione di vini della Toscana",
    },
    {
      nome: "Cena Speciale Chef Ospite",
      data: "5 Giugno 2025",
      descrizione: "Menu speciale preparato dallo chef Mario Rossi",
    },
  ];

  return (
    <Card className="bg-white h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Informazioni Ristorante</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {/* Informazioni di base */}
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <Utensils className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{infoRistorante.nome}</p>
              <p className="text-xs text-gray-600 mt-0.5">{infoRistorante.indirizzo}</p>
              <p className="text-xs text-gray-600 mt-0.5">Tel: {infoRistorante.telefono}</p>
              <p className="text-xs text-gray-600 mt-0.5">Email: {infoRistorante.email}</p>
            </div>
          </div>

          {/* Capacità e personale */}
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Capacità e Personale</p>
              <p className="text-xs text-gray-600 mt-0.5">Posti a sedere: {infoRistorante.capacita}</p>
              <p className="text-xs text-gray-600 mt-0.5">Staff attivo: {infoRistorante.personale} dipendenti</p>
            </div>
          </div>

          {/* Orari di apertura - mostriamo solo alcuni giorni per risparmiare spazio */}
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Orari di Apertura</p>
              {orariApertura.slice(0, 3).map((giorno) => (
                <p key={giorno.giorno} className="text-xs text-gray-600 mt-0.5">
                  <span className="font-medium">{giorno.giorno}:</span> {giorno.orario}
                </p>
              ))}
              <p className="text-xs text-gray-500 mt-1 italic">
                *Consultare il calendario completo per tutti gli orari
              </p>
            </div>
          </div>

          {/* Prossimi eventi */}
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Prossimi Eventi</p>
              {prossimiEventi.map((evento) => (
                <div key={evento.nome} className="mt-2">
                  <p className="text-xs font-medium text-gray-800">{evento.nome}</p>
                  <p className="text-xs text-gray-600">{evento.data}</p>
                  <p className="text-xs text-gray-500">{evento.descrizione}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}