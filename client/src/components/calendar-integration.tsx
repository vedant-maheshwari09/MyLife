import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CalendarStatus {
  connected: boolean;
  enabled: boolean;
  provider: string | null;
}

export function CalendarIntegration() {
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCalendarStatus();

    // Check for calendar connection result in URL
    const params = new URLSearchParams(window.location.search);
    const calendarResult = params.get('calendar');
    
    if (calendarResult === 'connected') {
      toast({
        title: "Calendar Connected!",
        description: "Your Google Calendar has been successfully connected.",
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      fetchCalendarStatus();
    } else if (calendarResult === 'error') {
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Calendar. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

  const fetchCalendarStatus = async () => {
    try {
      const response = await fetch('/api/calendar/status', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch calendar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      const response = await fetch('/api/calendar/connect', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to get authorization URL. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to Google Calendar.",
        variant: "destructive",
      });
    }
  };

  const syncAllTodos = async () => {
    if (!status?.connected) return;
    
    setSyncing(true);
    try {
      const response = await fetch('/api/calendar/sync-all', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${data.syncedCount} todos to your calendar.`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Sync Failed",
          description: error.error || "Failed to sync todos to calendar.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to sync todos:', error);
      toast({
        title: "Sync Error",
        description: "An error occurred while syncing todos.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="calendar-integration">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Integration
        </CardTitle>
        <CardDescription>
          Sync your todos and deadlines with your calendar for better time management.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Google Calendar</span>
            {status?.connected ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
          
          {!status?.connected ? (
            <Button 
              onClick={connectGoogleCalendar}
              size="sm"
              data-testid="connect-calendar-button"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect
            </Button>
          ) : (
            <Button 
              onClick={syncAllTodos}
              disabled={syncing}
              size="sm"
              variant="outline"
              data-testid="sync-todos-button"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync All Todos'}
            </Button>
          )}
        </div>

        {status?.connected && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold">Integration Active</h4>
            <p className="text-sm text-muted-foreground">
              Your todos with due dates will automatically appear in your Google Calendar. 
              You can sync all existing todos or they will be added as you create new ones.
            </p>
          </div>
        )}

        {!status?.connected && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              Connect Your Calendar
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Connect your Google Calendar to automatically sync todos with due dates. 
              This helps you see all your tasks and deadlines in one place.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}