import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

// The same sidebar item type
type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  role: "all" | "admin" | "employee";
};

// The same items as sidebar
const adminItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", role: "all" },
  { href: "/users", label: "Gestione Utenti", icon: "people", role: "admin" },
  { href: "/schedule", label: "Pianificazione Turni", icon: "event_note", role: "admin" },
  { href: "/requests", label: "Approvazioni", icon: "approval", badge: 0, role: "admin" },
  { href: "/documents", label: "Documenti", icon: "description", role: "admin" },
];

const employeeItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", role: "all" },
  { href: "/my-schedule", label: "I Miei Turni", icon: "calendar_today", role: "employee" },
  { href: "/time-off", label: "Ferie e Permessi", icon: "beach_access", role: "employee" },
  { href: "/my-documents", label: "Documenti", icon: "description", role: "employee" },
];

export function FooterNav() {
  const [location] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [pendingRequests, setPendingRequests] = useState(0);
  
  // Update pending requests count
  useEffect(() => {
    if (user?.role === "admin" && isAuthenticated) {
      // Fetch pending requests
      fetch("/api/time-off-requests", {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setPendingRequests(data.length);
            
            // Update badge for requests menu item
            adminItems.forEach(item => {
              if (item.href === "/requests") {
                item.badge = data.length;
              }
            });
          }
        })
        .catch((err) => console.error("Error fetching pending requests:", err));
    }
  }, [user, isAuthenticated]);

  const items = user?.role === "admin" ? adminItems : employeeItems;

  if (!isAuthenticated) return null;

  return (
    <div className="mt-16 border-t border-primary/10 pt-8 pb-4">
      <div className="max-w-4xl mx-auto">
        <h3 className="text-lg font-medium text-primary mb-4 px-4 animate-fadeIn">
          <span className="relative inline-block">
            <span className="absolute -bottom-1 left-0 w-1/3 h-0.5 bg-primary/50 rounded"></span>
            Navigazione Rapida
          </span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 px-4 mb-6">
          {items.map((item, index) => (
            <Link 
              key={item.href}
              href={item.href}
              style={{
                animationDelay: `${index * 0.05}s`,
              }}
              className={cn(
                "animate-slideUp card-hover flex items-center p-3 rounded-lg border transition-all",
                location === item.href 
                  ? "border-primary/30 bg-primary/5 text-primary" 
                  : "border-gray-200 hover:border-primary/20 hover:bg-gray-50 hover:text-primary"
              )}
            >
              <span className={cn(
                "material-icons mr-2 transition-transform",
                location === item.href ? "text-current" : "text-gray-500", 
                "group-hover:scale-110"
              )}>
                {item.icon}
              </span>
              <span className="text-sm">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto bg-primary text-white text-xs rounded-full px-2 py-0.5 animate-pulse">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
          
          <button
            onClick={logout}
            style={{
              animationDelay: `${items.length * 0.05}s`,
            }}
            className="animate-slideUp card-hover flex items-center p-3 rounded-lg border border-gray-200 hover:border-primary/20 hover:bg-gray-50 hover:text-primary text-left"
          >
            <span className="material-icons mr-2 text-gray-500">logout</span>
            <span className="text-sm">Logout</span>
          </button>
        </div>
        
        <div className="text-center text-xs mt-6 animate-fadeIn" style={{ animationDelay: '0.5s' }}>
          <p className="animate-float relative inline-block px-4 py-2 menu-card">
            <span className="text-accent font-semibold">&copy; {new Date().getFullYear()} Ristorante Da Vittorino</span>
            <span className="block text-xs opacity-70 mt-1">Gestione Personale</span>
          </p>
        </div>
      </div>
    </div>
  );
}