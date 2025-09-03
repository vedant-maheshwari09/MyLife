import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CheckCircle2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CalendarPermissionProps {
  onComplete: () => void;
  userName: string;
}

export default function CalendarPermission({ onComplete, userName }: CalendarPermissionProps) {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const { toast } = useToast();

  const requestCalendarPermission = async () => {
    try {
      // Start Google Calendar OAuth flow
      const response = await apiRequest("POST", "/api/auth/google-calendar-oauth");
      
      if (response.authUrl) {
        // Redirect to Google OAuth
        window.location.href = response.authUrl;
      } else {
        // OAuth already completed
        setPermissionGranted(true);
        
        toast({
          title: "Calendar access enabled!",
          description: "Your todos will now sync with Google Calendar.",
        });
        
        // Mark calendar setup as completed and proceed
        await apiRequest("POST", "/api/user/complete-calendar-setup");
        
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } catch (error) {
      console.error("Calendar permission error:", error);
      toast({
        title: "Permission not granted",
        description: "Calendar access is optional. You can still use the app normally.",
        variant: "destructive",
      });
    }
  };

  const skipPermission = async () => {
    try {
      // Mark calendar setup as completed even when skipped
      await apiRequest("POST", "/api/user/complete-calendar-setup");
      
      toast({
        title: "Calendar access skipped",
        description: "You can enable calendar export later in settings.",
      });
      onComplete();
    } catch (error) {
      console.error("Error marking calendar setup complete:", error);
      onComplete(); // Continue even if marking fails
    }
  };

  if (permissionGranted) {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="calendar-permission-success">
        <CardContent className="pt-6 text-center">
          <div className="mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Calendar Access Enabled!</h3>
          <p className="text-muted-foreground mb-4">
            You can now export your todos directly to your calendar apps.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting to your dashboard...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="calendar-permission">
      <CardHeader className="text-center">
        <div className="mb-4">
          <CalendarDays className="w-16 h-16 text-primary mx-auto" />
        </div>
        <CardTitle className="text-xl font-bold">Calendar Access</CardTitle>
        <CardDescription>
          Hi {userName}! Would you like to connect your calendar?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>With calendar access, you can:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Export todos as calendar events</li>
            <li>Set reminders for important tasks</li>
            <li>Sync with Google Calendar</li>
          </ul>
        </div>
        
        <div className="space-y-3 pt-4">
          <Button
            onClick={requestCalendarPermission}
            className="w-full"
            data-testid="button-grant-calendar"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Enable Calendar Access
          </Button>
          
          <Button
            variant="outline"
            onClick={skipPermission}
            className="w-full"
            data-testid="button-skip-calendar"
          >
            <X className="w-4 h-4 mr-2" />
            Skip for Now
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          You can change this setting later in your account preferences.
        </p>
      </CardContent>
    </Card>
  );
}