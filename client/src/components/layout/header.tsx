import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { Bell, Settings, User, Moon, Sun, LogOut, X, BarChart3, Mic, MicOff } from "lucide-react";
import { useTheme, useLogout } from "@/App";
import { useNotifications } from "@/lib/notification-context";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import VoiceCommandOverlay from "@/components/voice-command-overlay";
import type { User as UserType } from "@shared/schema";

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { logout } = useLogout();
  const { notifications, unreadCount, clearAll, removeNotification, markAsRead, addNotification } = useNotifications();
  const { 
    isListening, 
    isDirectListening, 
    isSupported, 
    isProcessing, 
    showOverlay,
    startListening, 
    stopListening, 
    startDirectListening, 
    stopDirectListening,
    closeOverlay,
    toggleOverlayListening
  } = useVoiceCommands();


  const { data: user } = useQuery<UserType>({
    queryKey: ["/api/user"],
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleSettingsClick = () => {
    setLocation("/settings");
  };

  const handleLogoutClick = () => {
    logout();
  };

  const handleHomeClick = () => {
    setLocation("/");
  };

  const handleStatsClick = () => {
    setLocation("/stats");
  };

  return (
    <header className="bg-card/85 backdrop-blur-md border-b border-border/50 px-4 py-4 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <h1 
          className="text-xl font-bold text-primary cursor-pointer hover:text-primary/80 transition-colors" 
          onClick={handleHomeClick}
          data-testid="button-home"
        >
          MyLife
        </h1>
        
        <div className="flex items-center gap-2">
          {/* Voice Commands */}
          {isSupported && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={isDirectListening ? stopDirectListening : startDirectListening}
              data-testid="button-voice-commands"
              className={`relative ${isDirectListening ? 'text-blue-500' : isProcessing ? 'text-green-500' : 'text-muted-foreground hover:text-foreground'}`}
              title={isProcessing ? "Processing command..." : "Voice Commands"}
            >
              {isDirectListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              {(isDirectListening || isProcessing) && (
                <div className={`absolute -inset-1 rounded-full animate-pulse ${isProcessing ? 'bg-green-500/20' : 'bg-blue-500/20'}`}></div>
              )}
              {isProcessing && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
              )}
            </Button>
          )}
          
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowNotifications(!showNotifications)}
            data-testid="button-notifications"
            className="relative"
          >
            <Bell className={`w-5 h-5 transition-colors ${showNotifications ? 'text-primary' : 'text-muted-foreground'}`} />
            {/* Notification badge */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </span>
            )}
          </Button>

          {/* Stats */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleStatsClick}
            data-testid="button-stats"
          >
            <BarChart3 className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
          </Button>

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1" data-testid="button-profile">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-foreground">
                    {user ? getInitials(user.name) : "U"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 p-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-foreground">
                    {user ? getInitials(user.name) : "U"}
                  </span>
                </div>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {user ? user.name : "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user ? user.email : "user@example.com"}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSettingsClick}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
                {theme === "light" ? "Dark Mode" : "Light Mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogoutClick} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Notification Dropdown */}
      {showNotifications && (
        <div className="absolute top-full right-4 mt-2 w-80 max-w-sm bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Notifications</h3>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearAll}
                    className="text-xs text-muted-foreground hover:text-destructive"
                    data-testid="button-clear-all-notifications"
                  >
                    Clear All
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">No new notifications</p>
                <p className="text-xs text-muted-foreground">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div key={notification.id} className={`p-3 rounded-lg border ${notification.isRead ? 'bg-muted/50' : 'bg-accent'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">{new Date(notification.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-6 w-6 p-0"
                          >
                            <span className="sr-only">Mark as read</span>
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNotification(notification.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4 pt-3 border-t">
              <button 
                onClick={() => {
                  const sampleNotifications = [
                    {
                      type: 'progress' as const,
                      title: 'Daily Progress Reminder',
                      message: "Time to log your daily progress! How did today go?",
                    },
                    {
                      type: 'todo' as const,
                      title: 'Todo Deadline Approaching',
                      message: "Your task 'Review project proposal' is due tomorrow",
                    },
                    {
                      type: 'reminder' as const,
                      title: 'Missed Todo Alert',
                      message: "You have 2 overdue tasks that need attention",
                    }
                  ];
                  
                  sampleNotifications.forEach(notif => addNotification(notif));
                }}
                className="flex-1 text-sm text-muted-foreground hover:text-primary transition-colors font-medium border border-border rounded px-2 py-1"
                data-testid="button-add-sample-notifications"
              >
                Add Test Notifications
              </button>
              <button className="flex-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium">
                View all notifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Command Overlay */}
      <VoiceCommandOverlay
        isVisible={showOverlay}
        isListening={isListening}
        isProcessing={isProcessing}
        isDirectListening={isDirectListening}
        onClose={closeOverlay}
        onToggleListening={toggleOverlayListening}
      />
    </header>
  );
}