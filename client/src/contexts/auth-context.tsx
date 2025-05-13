import { createContext, ReactNode, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

type LoginData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);

  const {
    data: userData,
    error,
    isLoading,
    refetch,
  } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
    onError: () => {
      setUser(null);
    },
    onSuccess: (data) => {
      setUser(data);
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      if (res.ok) {
        const data = await res.json();
        return data.user;
      } else {
        const error = await res.json();
        throw new Error(error.message || "Errore durante il login");
      }
    },
    onSuccess: (userData: User) => {
      setUser(userData);
      queryClient.setQueryData(["/api/auth/me"], userData);
      
      toast({
        title: "Login effettuato",
        description: `Benvenuto, ${userData.name}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore di login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      setUser(null);
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      
      toast({
        title: "Logout effettuato",
        description: "Hai effettuato il logout con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore durante il logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Effetto per la persistenza dello stato utente
  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData]);

  // Implementazione delle funzioni login e logout che vengono utilizzate nei componenti
  const login = async (username: string, password: string): Promise<User> => {
    const result = await loginMutation.mutateAsync({ username, password });
    return result;
  };

  const logout = async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        loginMutation,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}