import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { X, Plus, BarChart3, Calendar, Mic, MicOff, Globe, Edit, Trash2, Clock, Bed, Heart, Lightbulb, RefreshCw, Search } from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { VoiceLanguageDetector } from "@/lib/speech-recognition";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { MOOD_OPTIONS, PRODUCTIVITY_OPTIONS, HEALTH_OPTIONS, getMoodEmoji, getProductivityEmoji, getHealthEmoji, type MoodValue, type ProductivityValue, type HealthValue } from "@/lib/mood-utils";
import type { ProgressEntry, InsertProgressEntry, UserSettings } from "@shared/schema";

interface ActivityEntry {
  activity: string;
  hours: number;
  minutes: number;
}

interface ProgressExpandedProps {
  onClose: () => void;
}

export default function ProgressExpanded({ onClose }: ProgressExpandedProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProgressEntry | null>(null);
  
  // Form state
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [journalEntry, setJournalEntry] = useState("");
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [selectedHealth, setSelectedHealth] = useState<HealthValue | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [selectedProductivity, setSelectedProductivity] = useState<ProductivityValue | null>(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceDetector, setVoiceDetector] = useState<VoiceLanguageDetector | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  
  // Journaling prompts state
  const [journalingPrompts, setJournalingPrompts] = useState<string[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: progressEntries = [] } = useQuery<ProgressEntry[]>({
    queryKey: ["/api/progress"],
  });

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  // Initialize voice detector
  useEffect(() => {
    const detector = new VoiceLanguageDetector();
    setVoiceDetector(detector);
  }, []);

  const resetForm = () => {
    setActivities([]);
    setJournalEntry("");
    setSleepHours(null);
    setSelectedHealth(null);
    setSelectedMood(null);
    setSelectedProductivity(null);
    setDetectedLanguage(null);
    setJournalingPrompts([]);
    setSelectedPrompt(null);
  };

  const createProgressMutation = useMutation({
    mutationFn: async (entry: InsertProgressEntry) => {
      return apiRequest("POST", "/api/progress", entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      setIsAddModalOpen(false);
      resetForm();
      toast({
        title: "Progress logged",
        description: "Your daily progress has been recorded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ id, entry }: { id: string; entry: Partial<InsertProgressEntry> }) => {
      return apiRequest("PATCH", `/api/progress/${id}`, entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      setEditingEntry(null);
      resetForm();
      toast({
        title: "Progress updated",
        description: "Your progress entry has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteProgressMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/progress/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      toast({
        title: "Progress deleted",
        description: "Your progress entry has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete progress entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addActivity = () => {
    setActivities([...activities, { activity: "", hours: 0, minutes: 0 }]);
  };

  const updateActivity = (index: number, field: keyof ActivityEntry, value: string | number) => {
    const updated = activities.map((activity, i) => 
      i === index ? { ...activity, [field]: value } : activity
    );
    setActivities(updated);
  };

  const removeActivity = (index: number) => {
    setActivities(activities.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    if (!voiceDetector || !voiceDetector.isSupported()) {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice input.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRecording(true);
      const result = await voiceDetector.detectLanguageAndTranscribe(
        settings?.language || "en",
        settings?.autoDetectLanguage ?? true
      );
      setJournalEntry(prev => prev + (prev ? " " : "") + result.transcript);
      setDetectedLanguage(result.detectedLanguage);
    } catch (error) {
      toast({
        title: "Voice input failed",
        description: "Please try again or type your entry manually.",
        variant: "destructive",
      });
    } finally {
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (voiceDetector) {
      voiceDetector.stopListening();
    }
    setIsRecording(false);
  };

  const fetchJournalingPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const response = await fetch('/api/journaling-prompts');
      if (response.ok) {
        const data = await response.json();
        setJournalingPrompts(data.prompts || []);
      }
    } catch (error) {
      console.error('Failed to fetch journaling prompts:', error);
      toast({
        title: "Couldn't load prompts",
        description: "Try again or write freely.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  const usePrompt = (prompt: string) => {
    setJournalEntry(prompt + "\n\n");
    setSelectedPrompt(prompt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validActivities = activities.filter(a => a.activity.trim());
    
    // Validation
    if (validActivities.length === 0) {
      toast({
        title: "Missing activities",
        description: "Please add at least one activity you did today.",
        variant: "destructive",
      });
      return;
    }

    if (journalEntry.trim()) {
      const wordCount = journalEntry.trim().split(/\s+/).length;
      if (wordCount < 10 || wordCount > 300) {
        toast({
          title: "Invalid journal length",
          description: "Journal entry must be between 10-300 words.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!selectedMood || !selectedProductivity || !selectedHealth || sleepHours === null) {
      toast({
        title: "Missing information",
        description: "Please fill in all mood, health, productivity, and sleep fields.",
        variant: "destructive",
      });
      return;
    }

    const entryData: InsertProgressEntry = {
      userId: "73d398be-34cf-422c-8abf-6be66a8a3e1f", // Mock user ID
      activities: validActivities,
      journalEntry: journalEntry.trim() || null,
      sleepHours,
      healthFeeling: selectedHealth,
      mood: selectedMood,
      productivitySatisfaction: selectedProductivity,
    };

    if (editingEntry) {
      updateProgressMutation.mutate({ id: editingEntry.id, entry: entryData });
    } else {
      createProgressMutation.mutate(entryData);
    }
  };

  const startEditing = (entry: ProgressEntry) => {
    setEditingEntry(entry);
    setActivities(Array.isArray(entry.activities) ? entry.activities : []);
    setJournalEntry(entry.journalEntry || "");
    setSleepHours(entry.sleepHours);
    setSelectedHealth(entry.healthFeeling as HealthValue | null);
    setSelectedMood(entry.mood as MoodValue | null);
    setSelectedProductivity(entry.productivitySatisfaction as ProductivityValue | null);
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingEntry(null);
    resetForm();
  };

  // Filter entries based on search query
  const filteredEntries = progressEntries.filter(entry => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const journalMatch = entry.journalEntry?.toLowerCase().includes(query);
    const activityMatch = Array.isArray(entry.activities) && entry.activities.some((activity: any) => 
      activity.activity?.toLowerCase().includes(query)
    );
    const moodMatch = entry.mood?.toLowerCase().includes(query);
    const healthMatch = entry.healthFeeling?.toLowerCase().includes(query);
    const productivityMatch = entry.productivitySatisfaction?.toLowerCase().includes(query);
    
    return journalMatch || activityMatch || moodMatch || healthMatch || productivityMatch;
  });
  
  // Group filtered entries by date
  const entriesByDate = filteredEntries.reduce((acc, entry) => {
    const date = format(new Date(entry.entryDate), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, ProgressEntry[]>);

  const sortedDates = Object.keys(entriesByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Check if user has logged today
  const today = format(new Date(), 'yyyy-MM-dd');
  const hasLoggedToday = entriesByDate[today]?.length > 0;

  // Calculate weekly stats
  const thisWeekStart = startOfWeek(new Date());
  const thisWeekEnd = endOfWeek(new Date());
  const lastWeekStart = startOfWeek(subWeeks(new Date(), 1));
  const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1));

  const thisWeekEntries = progressEntries.filter(entry => {
    const entryDate = new Date(entry.entryDate);
    return entryDate >= thisWeekStart && entryDate <= thisWeekEnd;
  });

  const lastWeekEntries = progressEntries.filter(entry => {
    const entryDate = new Date(entry.entryDate);
    return entryDate >= lastWeekStart && entryDate <= lastWeekEnd;
  });

  const weeklyGrowth = lastWeekEntries.length > 0 
    ? Math.round(((thisWeekEntries.length - lastWeekEntries.length) / lastWeekEntries.length) * 100)
    : thisWeekEntries.length > 0 ? 100 : 0;

  return (
    <div className="box-expanded">
      <header className="bg-card/80 backdrop-blur-sm border-b border-border px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-progress">
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Progress Tracker</h1>
          <div className="ml-auto">
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={hasLoggedToday} data-testid="button-add-progress">
                  <Plus className="w-4 h-4 mr-2" />
                  {hasLoggedToday ? "Logged Today" : "Log Progress"}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingEntry ? "Edit Progress Entry" : "Daily Progress Entry"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Activities Section */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">What did you do today?</Label>
                    <div className="space-y-3">
                      {activities.map((activity, index) => (
                        <div key={index} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Input
                              placeholder="Activity or event"
                              value={activity.activity}
                              onChange={(e) => updateActivity(index, "activity", e.target.value)}
                              data-testid={`input-activity-${index}`}
                            />
                          </div>
                          <div className="flex gap-1">
                            <div className="w-16">
                              <Input
                                type="number"
                                placeholder="Hrs"
                                min="0"
                                max="24"
                                value={activity.hours || ""}
                                onChange={(e) => updateActivity(index, "hours", parseInt(e.target.value) || 0)}
                                data-testid={`input-hours-${index}`}
                              />
                            </div>
                            <div className="w-16">
                              <Input
                                type="number"
                                placeholder="Min"
                                min="0"
                                max="59"
                                value={activity.minutes || ""}
                                onChange={(e) => updateActivity(index, "minutes", parseInt(e.target.value) || 0)}
                                data-testid={`input-minutes-${index}`}
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeActivity(index)}
                            data-testid={`button-remove-activity-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addActivity}
                        className="w-full"
                        data-testid="button-add-activity"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Activity
                      </Button>
                    </div>
                  </div>

                  {/* Anything Else - Journaling Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="journal">Anything else (optional)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fetchJournalingPrompts}
                        disabled={isLoadingPrompts}
                        data-testid="button-get-prompts"
                      >
                        {isLoadingPrompts ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Lightbulb className="w-4 h-4 mr-2" />
                        )}
                        Get Prompts
                      </Button>
                    </div>
                    
                    {journalingPrompts.length > 0 && (
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg border">
                        <p className="text-sm font-medium text-muted-foreground">💡 Journaling prompts for you:</p>
                        <div className="space-y-1">
                          {journalingPrompts.map((prompt, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => usePrompt(prompt)}
                              className="text-left text-sm p-2 rounded hover:bg-background/80 transition-colors border border-transparent hover:border-border w-full"
                              data-testid={`button-prompt-${index}`}
                            >
                              "{prompt}"
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Textarea
                      id="journal"
                      value={journalEntry}
                      onChange={(e) => setJournalEntry(e.target.value)}
                      placeholder="Journal about your day, thoughts, feelings, challenges..."
                      rows={4}
                      data-testid="input-journal-entry"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={isRecording ? stopRecording : startRecording}
                        data-testid="button-voice-input"
                      >
                        {isRecording ? (
                          <>
                            <MicOff className="w-4 h-4 mr-2" />
                            Stop Recording
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 mr-2" />
                            Use Voice
                          </>
                        )}
                      </Button>
                      {isRecording && (
                        <span className="text-sm text-destructive animate-pulse">Recording...</span>
                      )}
                    </div>
                    {journalEntry.trim() && (
                      <div className="text-sm text-muted-foreground">
                        <span className={`${
                          journalEntry.trim().split(/\s+/).length < 10 
                            ? 'text-red-500' 
                            : journalEntry.trim().split(/\s+/).length > 300 
                              ? 'text-red-500' 
                              : 'text-green-600'
                        }`}>
                          {journalEntry.trim().split(/\s+/).length} words
                        </span>
                        {journalEntry.trim() && (
                          <span className="ml-2">
                            (10-300 words recommended)
                          </span>
                        )}
                      </div>
                    )}
                    {detectedLanguage && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        <Globe className="w-3 h-3" />
                        Language detected: {SUPPORTED_LANGUAGES[detectedLanguage as keyof typeof SUPPORTED_LANGUAGES]?.nativeName || detectedLanguage}
                      </div>
                    )}
                  </div>

                  {/* Sleep Hours */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Bed className="w-4 h-4" />
                      Hours of sleep last night
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      placeholder="8.5"
                      value={sleepHours || ""}
                      onChange={(e) => setSleepHours(parseFloat(e.target.value) || null)}
                      data-testid="input-sleep-hours"
                    />
                  </div>

                  {/* Health Feeling Selector */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      How are you feeling health-wise?
                    </Label>
                    <div className="flex gap-3 justify-center py-2">
                      {HEALTH_OPTIONS.map((health) => (
                        <button
                          key={health.value}
                          type="button"
                          onClick={() => setSelectedHealth(health.value)}
                          className={`text-3xl p-2 rounded-lg transition-all duration-200 hover:scale-110 ${
                            selectedHealth === health.value
                              ? 'bg-primary/10 ring-2 ring-primary scale-110'
                              : 'hover:bg-muted'
                          }`}
                          title={health.label}
                          data-testid={`health-${health.value}`}
                        >
                          {health.emoji}
                        </button>
                      ))}
                    </div>
                    {selectedHealth && (
                      <p className="text-center text-sm text-muted-foreground">
                        {HEALTH_OPTIONS.find(h => h.value === selectedHealth)?.label}
                      </p>
                    )}
                  </div>
                  
                  {/* Productivity Satisfaction Selector */}
                  <div className="space-y-3">
                    <Label>Are you satisfied with your productivity today?</Label>
                    <div className="flex gap-3 justify-center py-2">
                      {PRODUCTIVITY_OPTIONS.map((productivity) => (
                        <button
                          key={productivity.value}
                          type="button"
                          onClick={() => setSelectedProductivity(productivity.value)}
                          className={`text-3xl p-2 rounded-lg transition-all duration-200 hover:scale-110 ${
                            selectedProductivity === productivity.value
                              ? 'bg-primary/10 ring-2 ring-primary scale-110'
                              : 'hover:bg-muted'
                          }`}
                          title={productivity.label}
                          data-testid={`productivity-${productivity.value}`}
                        >
                          {productivity.emoji}
                        </button>
                      ))}
                    </div>
                    {selectedProductivity && (
                      <p className="text-center text-sm text-muted-foreground">
                        {PRODUCTIVITY_OPTIONS.find(p => p.value === selectedProductivity)?.label}
                      </p>
                    )}
                  </div>

                  {/* Mood Selector */}
                  <div className="space-y-3">
                    <Label>Overall mood today</Label>
                    <div className="flex gap-3 justify-center py-2">
                      {MOOD_OPTIONS.map((mood) => (
                        <button
                          key={mood.value}
                          type="button"
                          onClick={() => setSelectedMood(mood.value)}
                          className={`text-3xl p-2 rounded-lg transition-all duration-200 hover:scale-110 ${
                            selectedMood === mood.value
                              ? 'bg-primary/10 ring-2 ring-primary scale-110'
                              : 'hover:bg-muted'
                          }`}
                          title={mood.label}
                          data-testid={`mood-${mood.value}`}
                        >
                          {mood.emoji}
                        </button>
                      ))}
                    </div>
                    {selectedMood && (
                      <p className="text-center text-sm text-muted-foreground">
                        {MOOD_OPTIONS.find(m => m.value === selectedMood)?.label}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" data-testid="button-save-progress">
                      Save Progress
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Progress Entries Timeline */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Progress History</h2>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Search progress entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-progress"
            />
          </div>
          
          {searchQuery && sortedDates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p>No progress entries found</p>
              <p className="text-sm mt-1">No entries match your search for "{searchQuery}"</p>
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="mt-4"
                data-testid="button-clear-search-progress"
              >
                Clear search
              </Button>
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No progress entries yet.</p>
              <p className="text-sm mt-1">Start logging your daily progress to track your journey!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {searchQuery && (
                <div className="text-sm text-muted-foreground">
                  Found {filteredEntries.length} progress entr{filteredEntries.length !== 1 ? 'ies' : 'y'} matching "{searchQuery}"
                </div>
              )}
              
              {sortedDates.map(date => (
                <div key={date} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground sticky top-16 bg-background/90 backdrop-blur-sm py-1">
                    {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  {entriesByDate[date].map(entry => (
                    <div key={entry.id} className="bg-card/50 rounded-lg p-4 border border-border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {entry.mood && <span className="text-lg">{getMoodEmoji(entry.mood)}</span>}
                          {entry.healthFeeling && <span className="text-lg">{getHealthEmoji(entry.healthFeeling)}</span>}
                          {entry.productivitySatisfaction && <span className="text-lg">{getProductivityEmoji(entry.productivitySatisfaction)}</span>}
                          {entry.sleepHours && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Bed className="w-3 h-3" />
                              {entry.sleepHours}h
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(entry)}
                            data-testid={`button-edit-progress-${entry.id}`}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteProgressMutation.mutate(entry.id)}
                            data-testid={`button-delete-progress-${entry.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Activities */}
                      {Array.isArray(entry.activities) && entry.activities.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {entry.activities.map((activity: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="flex-1">{activity.activity}</span>
                              <span className="text-muted-foreground">
                                {activity.hours > 0 && `${activity.hours}h`}
                                {activity.minutes > 0 && `${activity.minutes}m`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Journal Entry */}
                      {entry.journalEntry && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {entry.journalEntry}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}