import React, { useState, useEffect, createContext, useContext } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationProvider } from "@/lib/notification-context";
import Home from "@/pages/home";
import Todos from "@/pages/todos";
import Notes from "@/pages/notes";
import Stats from "@/pages/stats";
import Settings from "@/pages/settings";
import NotificationTest from "@/pages/notification-test";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import OfflineIndicator from "@/components/offline-indicator";
import { VoiceStatusBar } from "@/components/voice-status-bar";
import { VoiceMicButton } from "@/components/voice-mic-button";

// User Context
const UserContext = createContext<{
  logout: () => void;
}>({
  logout: () => null,
});

export const useLogout = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useLogout must be used within a UserProvider");
  }
  return context;
};

// Theme Provider Context
const ThemeContext = createContext<{
  theme: string;
  setTheme: (theme: string) => void;
}>({
  theme: "light",
  setTheme: () => null,
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function Router() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in and validate session
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        // Validate session with backend
        fetch('/api/user', { credentials: 'include' })
          .then(res => {
            if (res.ok) {
              // Session is valid, keep user logged in
              setUser(userData);
            } else {
              // Session expired or invalid, clear localStorage
              localStorage.removeItem('user');
              setUser(null);
            }
            setIsLoading(false);
          })
          .catch(() => {
            // Network error or backend issue, clear localStorage
            localStorage.removeItem('user');
            setUser(null);
            setIsLoading(false);
          });
      } catch (error) {
        localStorage.removeItem('user');
        setIsLoading(false);
      }
    } else {
      // No saved user, just finish loading without auto-login
      setIsLoading(false);
    }
  }, []);

  const handleAuthComplete = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint to destroy session
      await fetch('/api/auth/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
    } catch (error) {
      console.log('Logout API call failed, but continuing with local cleanup');
    }
    
    setUser(null);
    localStorage.removeItem('user');
    queryClient.clear(); // Clear all cached data
    // Force a page refresh to ensure clean logout
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthComplete={handleAuthComplete} />;
  }

  return (
    <UserContext.Provider value={{ logout: handleLogout }}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/todos" component={Todos} />
        <Route path="/notes" component={Notes} />
        <Route path="/stats" component={Stats} />
        <Route path="/settings" component={Settings} />
        <Route path="/notification-test" component={NotificationTest} />
        <Route component={NotFound} />
      </Switch>
    </UserContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
              <Router />
              <OfflineIndicator />
              <VoiceStatusBar />
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </NotificationProvider>
    </QueryClientProvider>
  );
}

export default App;
