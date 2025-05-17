import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type SidebarItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
  role: "all" | "admin" | "employee";
};

const adminItems: SidebarItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", role: "all" },
  { href: "/users", label: "Gestione Utenti", icon: "people", role: "admin" },
  { href: "/schedule", label: "Pianificazione Turni", icon: "event_note", role: "admin" },
  { href: "/requests", label: "Approvazioni", icon: "approval", badge: 0, role: "admin" },
  { href: "/documents", label: "Documenti", icon: "description", role: "admin" },
];

const employeeItems: SidebarItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", role: "all" },
  { href: "/my-schedule", label: "I Miei Turni", icon: "calendar_today", role: "employee" },
  { href: "/time-off", label: "Ferie e Permessi", icon: "beach_access", role: "employee" },
  { href: "/my-documents", label: "Documenti", icon: "description", role: "employee" },
];

export function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}) {
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
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // Ascolta l'evento custom per aggiornare lo stato del menu da altri componenti
  useEffect(() => {
    const handleToggleMobileMenu = () => {
      setMobileMenuOpen(!mobileMenuOpen);
    };
    
    window.addEventListener('toggle-mobile-menu', handleToggleMobileMenu);
    return () => {
      window.removeEventListener('toggle-mobile-menu', handleToggleMobileMenu);
    };
  }, [mobileMenuOpen]);
  
  if (!isAuthenticated) {
    return null; // Don't show sidebar if not logged in
  }

  return (
    <>
      {/* Overlay scuro su mobile quando il menu è aperto */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div 
        id="sidebar" 
        className={cn(
          "bg-sidebar-background text-sidebar-foreground shadow-md w-full md:w-72 md:min-h-screen flex flex-col overflow-hidden",
          mobileMenuOpen 
            ? "fixed h-screen z-50 inset-0" 
            : "h-auto md:flex hidden",
          "safari-fix", // Add Safari-specific class
        )}
      >
        <div className="p-4 sm:p-5 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="material-icons text-primary text-xl sm:text-2xl animate-float">restaurant</span>
            <h1 className="font-condensed text-xl sm:text-2xl font-bold gradient-text">Da Vittorino</h1>
          </div>
          <button 
            id="mobile-menu-toggle" 
            onClick={toggleMobileMenu}
            className="md:hidden p-1.5 rounded-full hover:bg-gray-100"
            aria-label={mobileMenuOpen ? "Chiudi menu" : "Apri menu"}
          >
            <span className="material-icons">{mobileMenuOpen ? "close" : "menu"}</span>
          </button>
        </div>
        
        <div id="user-profile" className="p-4 sm:p-5 border-b border-sidebar-border flex items-center space-x-3 sm:space-x-4">
          <div className="relative">
            <img 
              src={user?.role === "admin" ? "/avatars/admin.svg" : "/avatars/employee.svg"} 
              alt={user?.role === "admin" ? "Avatar amministratore" : "Avatar dipendente"}
              className="w-12 sm:w-14 h-12 sm:h-14 rounded-full shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105"
            />
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-sidebar-background p-0.5 rounded-full">
              <div className={`w-3.5 h-3.5 rounded-full ${user ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            </div>
          </div>
          <div className="animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <p className="font-medium text-sm sm:text-base text-sidebar-foreground">{user?.name || "Utente"}</p>
            <p className="text-xs sm:text-sm text-sidebar-foreground/70">
              {user?.role === "admin" ? "Amministratore" : "Dipendente"}
            </p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 sm:py-5 px-2">
          {user?.role === "admin" && (
            <div id="admin-menu" data-role="admin">
              <p className="px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">
                Amministrazione
              </p>
              {adminItems.map((item, index) => (
                <div
                  key={item.href}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  className={cn(
                    "sidebar-item rounded-md mb-1 animate-fadeIn menu-item-animate",
                    location === item.href && "bg-blue-50"
                  )}
                >
                  <Link 
                    href={item.href} 
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 transition-all duration-200",
                      location === item.href && "text-primary font-medium"
                    )}
                  >
                    <span className={cn(
                      "material-icons text-base sm:text-lg transition-transform duration-200",
                      location === item.href ? "text-primary" : "text-gray-500 hover:scale-110"
                    )}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto bg-primary text-white text-[10px] sm:text-xs rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          )}
          
          {user?.role === "employee" && (
            <div id="employee-menu" data-role="employee">
              <p className="px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 sm:mb-3">
                Il Mio Account
              </p>
              {employeeItems.map((item, index) => (
                <div
                  key={item.href}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  className={cn(
                    "sidebar-item rounded-md mb-1 animate-fadeIn menu-item-animate",
                    location === item.href && "bg-blue-50"
                  )}
                >
                  <Link 
                    href={item.href} 
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 transition-all duration-200",
                      location === item.href && "text-primary font-medium"
                    )}
                  >
                    <span className={cn(
                      "material-icons text-base sm:text-lg transition-transform duration-200",
                      location === item.href ? "text-primary" : "text-gray-500 hover:scale-110"
                    )}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto bg-primary text-white text-[10px] sm:text-xs rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </nav>
        
        <div className="p-4 sm:p-5 border-t pb-safe">
          <button 
            onClick={logout}
            className="btn-animated flex items-center space-x-2 text-sm sm:text-base text-gray-700 hover:text-primary transition-all duration-300 w-full rounded-md py-2 px-3 hover:bg-gray-100 hover:shadow-sm"
          >
            <span className="material-icons text-base sm:text-lg transition-transform duration-300 group-hover:rotate-6">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}