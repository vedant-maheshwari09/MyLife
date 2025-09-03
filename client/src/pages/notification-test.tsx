import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Bell, Mail, Send, CheckCircle, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import type { UserSettings } from "@shared/schema";

export default function NotificationTest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [testMessage, setTestMessage] = useState("This is a test notification from MyLife!");
  const [emailTest, setEmailTest] = useState("");

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const testLocalNotificationMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest("POST", "/api/notifications/test-local", { message });
    },
    onSuccess: (data: any) => {
      // Show the actual browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(data.notification.title, {
          body: data.notification.body,
          icon: data.notification.icon,
        });
      }
      
      toast({
        title: "Local notification sent",
        description: "Check your browser notifications!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send local notification",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const testEmailNotificationMutation = useMutation({
    mutationFn: async ({ message, email }: { message: string; email: string }) => {
      return apiRequest("POST", "/api/notifications/test-email", { message, email });
    },
    onSuccess: () => {
      toast({
        title: "Email notification sent",
        description: "Check your email inbox!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email notification",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        toast({
          title: "Notifications enabled",
          description: "You'll now receive browser notifications.",
        });
      } else {
        toast({
          title: "Notifications blocked",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
    }
  };

  const getNotificationStatus = () => {
    if (!("Notification" in window)) {
      return { status: "unsupported", message: "Not supported by browser" };
    }
    
    switch (Notification.permission) {
      case "granted":
        return { status: "granted", message: "Enabled" };
      case "denied":
        return { status: "denied", message: "Blocked" };
      default:
        return { status: "default", message: "Permission needed" };
    }
  };

  const notificationStatus = getNotificationStatus();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-md mx-auto p-4 pt-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/settings")}
          className="mb-6 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Button>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Notification Testing</h1>
            <p className="text-muted-foreground mt-1">
              Test your notification settings to make sure they work properly.
            </p>
          </div>

          {/* Current Settings Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Current Settings
              </CardTitle>
              <CardDescription>Your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Notification Type:</span>
                <span className="text-sm font-medium capitalize">
                  {settings?.notificationType || "local"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Browser Permission:</span>
                <div className="flex items-center gap-2">
                  {notificationStatus.status === "granted" ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                  <span className="text-sm font-medium">
                    {notificationStatus.message}
                  </span>
                </div>
              </div>
              {notificationStatus.status !== "granted" && notificationStatus.status !== "unsupported" && (
                <Button 
                  onClick={requestNotificationPermission}
                  size="sm"
                  className="w-full"
                  data-testid="button-enable-notifications"
                >
                  Enable Browser Notifications
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Test Local Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Test Local Notifications
              </CardTitle>
              <CardDescription>
                Send a test notification to your browser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="test-message">Test Message</Label>
                <Input
                  id="test-message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter your test message"
                  className="mt-1"
                  data-testid="input-test-message"
                />
              </div>
              <Button
                onClick={() => testLocalNotificationMutation.mutate(testMessage)}
                disabled={testLocalNotificationMutation.isPending || !testMessage.trim()}
                className="w-full"
                data-testid="button-test-local"
              >
                <Send className="w-4 h-4 mr-2" />
                {testLocalNotificationMutation.isPending ? "Sending..." : "Send Test Notification"}
              </Button>
              <p className="text-xs text-muted-foreground">
                The notification should appear in the top-right corner of your screen.
              </p>
            </CardContent>
          </Card>

          {/* Test Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Test Email Notifications
              </CardTitle>
              <CardDescription>
                Send a test notification to your email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email-test">Email Address</Label>
                <Input
                  id="email-test"
                  type="email"
                  value={emailTest}
                  onChange={(e) => setEmailTest(e.target.value)}
                  placeholder="Enter email to test"
                  className="mt-1"
                  data-testid="input-email-test"
                />
              </div>
              <Button
                onClick={() => testEmailNotificationMutation.mutate({ message: testMessage, email: emailTest })}
                disabled={testEmailNotificationMutation.isPending || !emailTest.trim() || !testMessage.trim()}
                className="w-full"
                data-testid="button-test-email"
              >
                <Send className="w-4 h-4 mr-2" />
                {testEmailNotificationMutation.isPending ? "Sending..." : "Send Test Email"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Check your email inbox and spam folder for the test message.
              </p>
            </CardContent>
          </Card>

          {/* Troubleshooting Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <p className="font-medium">If notifications don't work:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>Check browser notification permissions</li>
                  <li>Ensure "Do Not Disturb" is disabled</li>
                  <li>Try refreshing the page and testing again</li>
                  <li>For email: check spam/junk folder</li>
                  <li>Verify your notification type in Settings</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}