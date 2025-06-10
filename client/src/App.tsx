import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Calendar from "@/pages/calendar";
import Services from "@/pages/services";
import Stylists from "@/pages/stylists";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/schedule" component={Schedule} />
      <Route path="/users" component={Users} />
      <Route path="/users/new" component={NewUser} />
      <Route path="/users/change-password" component={ChangePassword} />
      <Route path="/users/edit" component={EditUser} />
      <Route path="/users/import" component={ImportUsers} />
      <Route path="/documents" component={Documents} />
      <Route path="/requests" component={Requests} />
      <Route path="/time-off" component={TimeOff} />
      <Route path="/my-schedule" component={MySchedule} />
      <Route path="/my-documents" component={MyDocuments} />
      <Route path="/messages" component={Messages} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="light">
          <Toaster />
          <Router />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
