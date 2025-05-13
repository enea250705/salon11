import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/auth-context";
import { PWAInstallBanner } from "@/components/pwa-install-banner";
import { OfflineProvider } from "@/hooks/use-offline";
import OfflineIndicator from "@/components/offline-indicator";
import NotificationPermissionBanner from "@/components/notification-permission-banner";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Schedule from "@/pages/schedule";
import Users from "@/pages/users";
import Documents from "@/pages/documents";
import Requests from "@/pages/requests";
import TimeOff from "@/pages/time-off";
import MySchedule from "@/pages/my-schedule";
import MyDocuments from "@/pages/my-documents";
import Messages from "@/pages/messages";
import NewUser from "@/pages/new-user";
import ChangePassword from "@/pages/change-password";

import { ProtectedRoute } from "@/components/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Rotte protette */}
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/schedule">
        <ProtectedRoute>
          <Schedule />
        </ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      </Route>
      <Route path="/users/new">
        <ProtectedRoute>
          <NewUser />
        </ProtectedRoute>
      </Route>
      <Route path="/users/change-password">
        <ProtectedRoute>
          <ChangePassword />
        </ProtectedRoute>
      </Route>
      <Route path="/documents">
        <ProtectedRoute>
          <Documents />
        </ProtectedRoute>
      </Route>
      <Route path="/requests">
        <ProtectedRoute>
          <Requests />
        </ProtectedRoute>
      </Route>
      <Route path="/time-off">
        <ProtectedRoute>
          <TimeOff />
        </ProtectedRoute>
      </Route>
      <Route path="/my-schedule">
        <ProtectedRoute>
          <MySchedule />
        </ProtectedRoute>
      </Route>
      <Route path="/my-documents">
        <ProtectedRoute>
          <MyDocuments />
        </ProtectedRoute>
      </Route>
      <Route path="/messages">
        <ProtectedRoute>
          <Messages />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflineProvider showNotifications={true}>
          <ThemeProvider attribute="class" defaultTheme="light">
            <Toaster />
            <Router />
            <PWAInstallBanner />
            <OfflineIndicator />
            <NotificationPermissionBanner />
          </ThemeProvider>
        </OfflineProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
