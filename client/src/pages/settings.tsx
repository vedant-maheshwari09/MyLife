import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Save, Calendar, ExternalLink, Download, Upload, FileText, Shield, Key, Bell } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ChangePasswordForm from "@/components/auth/change-password-form";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import type { UserSettings } from "@shared/schema";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n";
import { useTheme } from "@/App";
import Header from "@/components/layout/header";
import { CalendarIntegration } from "@/components/calendar-integration";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: user } = useQuery<any>({
    queryKey: ["/api/user"],
  });

  const [formData, setFormData] = useState({
    darkMode: false,
    emailNotifications: true,
    notificationType: "local" as "local" | "email" | "off",
    progressNotificationEnabled: true,
    progressNotificationTime: "18:00",
    todoReminderEnabled: true,
    missedTodoNotificationEnabled: true,
    language: "en" as SupportedLanguage,
    autoDetectLanguage: true,
  });

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState({
    includeGoals: true,
    includeActivities: true,
    includeTodos: true,
    includeNotes: true
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);

  // Update form data when settings load
  useState(() => {
    if (settings) {
      setFormData({
        darkMode: theme === "dark", // Get from theme provider
        emailNotifications: settings.emailNotifications,
        notificationType: (settings.notificationType || "local") as "local" | "email" | "off",
        progressNotificationEnabled: settings.progressNotificationEnabled ?? true,
        progressNotificationTime: settings.progressNotificationTime,
        todoReminderEnabled: settings.todoReminderEnabled ?? true,
        missedTodoNotificationEnabled: settings.missedTodoNotificationEnabled ?? true,
        language: (settings.language || "en") as SupportedLanguage,
        autoDetectLanguage: settings.autoDetectLanguage ?? true,
      });
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      return apiRequest("PATCH", "/api/settings", updates);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save settings",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export');
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `mylife-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Data exported",
        description: "Your backup file has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    try {
      const fileContent = await importFile.text();
      const data = JSON.parse(fileContent);
      
      const response = await apiRequest('POST', '/api/import', {
        data,
        options: importOptions
      });
      
      toast({
        title: "Import completed",
        description: response.message,
      });
      
      setShowImportDialog(false);
      setImportFile(null);
      
      // Refresh all data
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/todos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Failed to import data. Please check your file format.",
        variant: "destructive",
      });
    }
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
        <Header />
        <div className="flex items-center justify-center pt-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
      <Header />
      
      <div className="max-w-md mx-auto p-4 pt-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="mobile-tabs bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="profile" className="mobile-tab data-[state=active]:bg-background data-[state=active]:text-foreground" data-testid="tab-profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences" className="mobile-tab data-[state=active]:bg-background data-[state=active]:text-foreground" data-testid="tab-preferences">Preferences</TabsTrigger>
            <TabsTrigger value="integrations" className="mobile-tab data-[state=active]:bg-background data-[state=active]:text-foreground" data-testid="tab-integrations">Integrations</TabsTrigger>
            <TabsTrigger value="data" className="mobile-tab data-[state=active]:bg-background data-[state=active]:text-foreground" data-testid="tab-data">Data</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={user?.name || ""} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled className="mt-1" />
                </div>
                <div>
                  <Label>Username</Label>
                  <Input value={user?.username || ""} disabled className="mt-1" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Profile information is read-only. Contact support to make changes.
                </p>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security
                </CardTitle>
                <CardDescription>Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Password</Label>
                  <p className="text-xs text-muted-foreground">
                    Last updated: Recently
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowChangePasswordDialog(true)}
                    className="w-full"
                    data-testid="button-change-password"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your app experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dark Mode */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Switch between light and dark themes
                    </p>
                  </div>
                  <Switch
                    checked={formData.darkMode}
                    onCheckedChange={(checked) => {
                      setFormData({ ...formData, darkMode: checked });
                      setTheme(checked ? "dark" : "light");
                    }}
                    data-testid="switch-dark-mode"
                  />
                </div>

                <Separator />

                {/* Notification Type */}
                <div className="space-y-2">
                  <Label>Notification Delivery</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    How you'd like to receive notifications
                  </p>
                  <Select
                    value={formData.notificationType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, notificationType: value as "local" | "email" | "off" })
                    }
                  >
                    <SelectTrigger data-testid="select-notification-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Browser Notifications</SelectItem>
                      <SelectItem value="email">Email Notifications</SelectItem>
                      <SelectItem value="off">No Notifications</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Test Notifications Button */}
                  {formData.notificationType !== "off" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation("/notification-test")}
                      className="w-full mt-2"
                      data-testid="button-test-notifications"
                    >
                      <Bell className="w-4 h-4 mr-2" />
                      Test Notifications
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Progress Reminder Settings */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Daily Progress Reminders</Label>
                      <p className="text-xs text-muted-foreground">
                        Get reminded to log your daily progress
                      </p>
                    </div>
                    <Switch
                      checked={formData.progressNotificationEnabled}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, progressNotificationEnabled: checked })
                      }
                      data-testid="switch-progress-notifications"
                    />
                  </div>
                  {formData.progressNotificationEnabled && (
                    <div className="mt-2">
                      <Label className="text-xs text-muted-foreground">Reminder Time</Label>
                      <Input
                        type="time"
                        value={formData.progressNotificationTime}
                        onChange={(e) =>
                          setFormData({ ...formData, progressNotificationTime: e.target.value })
                        }
                        data-testid="input-progress-time"
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Todo Reminder Settings */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Todo Deadline Reminders</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when your todos are due soon
                    </p>
                  </div>
                  <Switch
                    checked={formData.todoReminderEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, todoReminderEnabled: checked })
                    }
                    data-testid="switch-todo-reminders"
                  />
                </div>

                <Separator />

                {/* Missed Todo Notifications */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Missed Todo Alerts</Label>
                    <p className="text-xs text-muted-foreground">
                      Get alerted about overdue todos
                    </p>
                  </div>
                  <Switch
                    checked={formData.missedTodoNotificationEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, missedTodoNotificationEnabled: checked })
                    }
                    data-testid="switch-missed-todo-notifications"
                  />
                </div>

                <Separator />

                {/* Language Selection */}
                <div className="space-y-2">
                  <Label>Language</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Choose your preferred language for the app
                  </p>
                  <Select
                    value={formData.language}
                    onValueChange={(value) =>
                      setFormData({ ...formData, language: value as SupportedLanguage })
                    }
                  >
                    <SelectTrigger data-testid="select-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
                        <SelectItem key={code} value={code}>
                          {lang.nativeName} ({lang.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Auto-detect Language */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-detect Voice Language</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically detect language when speaking in Progress tracker
                    </p>
                  </div>
                  <Switch
                    checked={formData.autoDetectLanguage}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, autoDetectLanguage: checked })
                    }
                    data-testid="switch-auto-detect-language"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <CalendarIntegration />
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  Backup your data or import from other apps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleExport}
                    className="flex items-center gap-2"
                    data-testid="button-export-data"
                  >
                    <Download className="w-4 h-4" />
                    Export Data
                  </Button>
                  
                  <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Import Data
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Import Data</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="import-file">Select backup file</Label>
                          <Input
                            id="import-file"
                            type="file"
                            accept=".json"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>What to import:</Label>
                          {[
                            { key: 'includeGoals', label: 'Goals' },
                            { key: 'includeActivities', label: 'Activities' },
                            { key: 'includeTodos', label: 'Todos' },
                            { key: 'includeNotes', label: 'Notes' }
                          ].map(({ key, label }) => (
                            <div key={key} className="flex items-center space-x-2">
                              <Checkbox
                                id={key}
                                checked={importOptions[key as keyof typeof importOptions]}
                                onCheckedChange={(checked) => 
                                  setImportOptions(prev => ({ ...prev, [key]: !!checked }))
                                }
                              />
                              <Label htmlFor={key}>{label}</Label>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowImportDialog(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleImport}
                            disabled={!importFile}
                            className="flex-1"
                          >
                            Import
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950 p-3 rounded-lg">
                  <strong>Backup tip:</strong> Export your data regularly to keep a backup of your goals, todos, notes, and activities.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Save Button - appears on all tabs */}
          <Button
            onClick={handleSave}
            disabled={updateSettingsMutation.isPending}
            className="w-full"
            data-testid="button-save-settings"
          >
            {updateSettingsMutation.isPending ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </Tabs>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent className="max-w-md">
          <ChangePasswordForm
            onSuccess={() => setShowChangePasswordDialog(false)}
            onCancel={() => setShowChangePasswordDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}