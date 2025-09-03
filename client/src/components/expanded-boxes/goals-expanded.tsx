import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { X, Plus, Target, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Goal, InsertGoal, Tab } from "@shared/schema";

const TARGET_TYPE_OPTIONS = [
  { value: "number", label: "Number (e.g., 10, 50, 100)" },
  { value: "complete", label: "Complete" },
  { value: "obtain", label: "Obtain" },
  { value: "not_sure", label: "Not Sure Yet" }
] as const;

type TargetType = typeof TARGET_TYPE_OPTIONS[number]["value"];

// Helper functions to encode/decode target types using maxProgress
const SPECIAL_TARGET_VALUES = {
  complete: -1,
  obtain: -2,
  not_sure: -3
} as const;

const getTargetType = (maxProgress: number): TargetType => {
  if (maxProgress === SPECIAL_TARGET_VALUES.complete) return "complete";
  if (maxProgress === SPECIAL_TARGET_VALUES.obtain) return "obtain";
  if (maxProgress === SPECIAL_TARGET_VALUES.not_sure) return "not_sure";
  return "number";
};

const getTargetDisplay = (maxProgress: number): string => {
  const type = getTargetType(maxProgress);
  if (type === "complete") return "Complete";
  if (type === "obtain") return "Obtain";
  if (type === "not_sure") return "Not Sure Yet";
  return maxProgress.toString();
};

interface GoalsExpandedProps {
  onClose: () => void;
}

export default function GoalsExpanded({ onClose }: GoalsExpandedProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [longPressedTab, setLongPressedTab] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newGoal, setNewGoal] = useState<Partial<InsertGoal>>({
    title: "",
    description: "",
    targetDate: undefined,
    progress: 0,
    maxProgress: 100,
    tabId: null
  });
  const [targetType, setTargetType] = useState<TargetType>("number");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const { data: allTabs = [] } = useQuery<Tab[]>({
    queryKey: ["/api/tabs"],
  });

  // Filter tabs to only show goal tabs
  const tabs = allTabs.filter(tab => tab.type === 'goals');

  // Filter goals based on active tab
  const filteredGoals = goals.filter(goal => {
    if (activeTabId === null) {
      // "All Tasks" tab - show all goals
      return true;
    }
    return goal.tabId === activeTabId;
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goal: InsertGoal) => {
      return apiRequest("POST", "/api/goals", goal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setIsAddModalOpen(false);
      setNewGoal({ title: "", description: "", progress: 0, maxProgress: 100 });
      toast({
        title: "Goal created",
        description: "Your new goal has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Goal> }) => {
      return apiRequest("PATCH", `/api/goals/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Goal updated",
        description: "Your goal has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      toast({
        title: "Goal deleted",
        description: "Your goal has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTabMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tab> }) => {
      return apiRequest("PATCH", `/api/tabs/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tabs"] });
      toast({
        title: "Tab updated",
        description: "Your tab has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update tab. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTabMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tabs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tabs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      if (activeTabId === id) {
        setActiveTabId(null);
      }
      toast({
        title: "Tab deleted",
        description: "Tab and its goals have been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete tab. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.title?.trim()) return;

    // Get user from localStorage or use mock user
    const savedUser = localStorage.getItem('user');
    const userId = savedUser ? JSON.parse(savedUser).id : "1";

    const goalData: InsertGoal = {
      userId: userId,
      title: newGoal.title.trim(),
      description: newGoal.description || "",
      targetDate: newGoal.targetDate,
      progress: newGoal.progress || 0,
      maxProgress: newGoal.maxProgress || 100,
      isCompleted: false,
      tags: newGoal.tags || [],
      tabId: activeTabId
    };

    if (editingGoal) {
      updateGoalMutation.mutate({
        id: editingGoal.id,
        updates: goalData
      });
      setEditingGoal(null);
    } else {
      createGoalMutation.mutate(goalData);
    }
  };

  const handleTabClick = (tabId: string | null) => {
    setActiveTabId(tabId);
  };

  const startEditing = (goal: Goal) => {
    setEditingGoal(goal);
    const targetType = getTargetType(goal.maxProgress);
    setTargetType(targetType);
    setNewGoal({
      title: goal.title,
      description: goal.description || "",
      targetDate: goal.targetDate || undefined,
      progress: goal.progress,
      maxProgress: goal.maxProgress
    });
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingGoal(null);
    setNewGoal({ 
      title: "", 
      description: "", 
      progress: 0, 
      maxProgress: 100,
      tabId: activeTabId
    });
    setTargetType("number");
  };

  const updateProgress = (goal: Goal, newProgress: number) => {
    const isCompleted = newProgress >= goal.maxProgress;
    updateGoalMutation.mutate({
      id: goal.id,
      updates: { 
        progress: newProgress,
        isCompleted 
      }
    });
  };

  return (
    <div className="box-expanded">
      <header className="bg-card/80 backdrop-blur-sm border-b border-border px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-goals">
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Goals</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="mb-6" data-testid="tabs-navigation">
          <div className="tab-container">
            {/* All Goals Tab */}
            <button
              onClick={() => handleTabClick(null)}
              className={`tab-button ${activeTabId === null ? 'active' : ''}`}
              data-testid="tab-all-goals"
            >
              <Target className="w-4 h-4" />
              All Goals ({goals.length})
            </button>
            
            {/* Custom tabs */}
            {tabs.filter(tab => !tab.isDefault).map((tab) => {
              const tabGoalCount = goals.filter(goal => goal.tabId === tab.id).length;
              return (
                <div key={tab.id} className="relative">
                  {isRenaming === tab.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateTabMutation.mutate({ id: tab.id, updates: { name: renameValue } });
                            setIsRenaming(null);
                          } else if (e.key === 'Escape') {
                            setIsRenaming(null);
                          }
                        }}
                        className="tab-rename-input"
                        autoFocus
                        data-testid={`input-rename-tab-${tab.id}`}
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (longPressedTab === tab.id) {
                            setLongPressedTab(null);
                          } else {
                            handleTabClick(tab.id);
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent text selection
                          const timer = setTimeout(() => {
                            setLongPressedTab(tab.id);
                          }, 500);
                          const cleanup = () => {
                            clearTimeout(timer);
                            document.removeEventListener('mouseup', cleanup);
                          };
                          document.addEventListener('mouseup', cleanup);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault(); // Prevent text selection
                          const timer = setTimeout(() => {
                            setLongPressedTab(tab.id);
                          }, 500);
                          const cleanup = () => {
                            clearTimeout(timer);
                            document.removeEventListener('touchend', cleanup);
                          };
                          document.addEventListener('touchend', cleanup);
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-colors select-none ${
                          activeTabId === tab.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                        data-testid={`tab-${tab.id}`}
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: tab.color }}
                        />
                        {tab.name} ({tabGoalCount})
                      </button>
                      
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {filteredGoals.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No goals yet</h3>
            <p className="text-muted-foreground">Set meaningful goals and track your journey to success.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredGoals.map((goal) => {
              const targetType = getTargetType(goal.maxProgress);
              const progressPercentage = targetType === "number" 
                ? (goal.progress / goal.maxProgress) * 100
                : goal.progress === 1 ? 100 : 0;
              
              return (
                <div key={goal.id} className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-shadow" data-testid={`goal-item-${goal.id}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-card-foreground">{goal.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        goal.isCompleted 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {Math.round(progressPercentage)}%
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(goal)}
                        data-testid={`button-edit-goal-${goal.id}`}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteGoalMutation.mutate(goal.id)}
                        data-testid={`button-delete-goal-${goal.id}`}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  
                  {goal.description && (
                    <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                  )}
                  
                  <div className="mb-3">
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {targetType === "number" 
                        ? `${goal.progress} of ${goal.maxProgress} completed`
                        : `Target: ${getTargetDisplay(goal.maxProgress)} • ${goal.progress === 1 ? "Completed" : "Not Started"}`
                      }
                    </span>
                    {goal.targetDate && (
                      <span>Due: {format(new Date(goal.targetDate), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                  
                  {targetType === "number" ? (
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateProgress(goal, Math.max(0, goal.progress - 1))}
                        disabled={goal.progress <= 0}
                        data-testid={`button-decrease-progress-${goal.id}`}
                      >
                        -1
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateProgress(goal, Math.min(goal.maxProgress, goal.progress + 1))}
                        disabled={goal.progress >= goal.maxProgress}
                        data-testid={`button-increase-progress-${goal.id}`}
                      >
                        +1
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant={goal.progress === 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateProgress(goal, goal.progress === 1 ? 0 : 1)}
                        data-testid={`button-toggle-complete-${goal.id}`}
                      >
                        {goal.progress === 1 ? "Mark as Not Started" : "Mark as Complete"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 hover:scale-105"
        data-testid="button-add-goal-floating"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Full Screen Tab Options Overlay */}
      {longPressedTab && (
        <div className="tab-overlay">
          <div className="tab-overlay-content">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div 
                  className="tab-color-indicator" 
                  style={{ backgroundColor: tabs.find(t => t.id === longPressedTab)?.color }}
                />
                <h3 className="text-lg font-semibold text-foreground">
                  {tabs.find(t => t.id === longPressedTab)?.name}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {goals.filter(goal => goal.tabId === longPressedTab).length} goals
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  const tab = tabs.find(t => t.id === longPressedTab);
                  if (tab) {
                    setRenameValue(tab.name);
                    setIsRenaming(tab.id);
                  }
                  setLongPressedTab(null);
                }}
                className="tab-overlay-button rename"
                data-testid={`button-rename-tab-${longPressedTab}`}
              >
                <Edit className="w-5 h-5" />
                <span className="font-medium">Rename Tab</span>
              </button>
              
              <button
                onClick={() => {
                  const tab = tabs.find(t => t.id === longPressedTab);
                  if (tab && window.confirm(`Delete "${tab.name}" tab and all its goals?`)) {
                    deleteTabMutation.mutate(tab.id);
                  }
                  setLongPressedTab(null);
                }}
                className="tab-overlay-button delete"
                data-testid={`button-delete-tab-${longPressedTab}`}
              >
                <Trash2 className="w-5 h-5" />
                <span className="font-medium">Delete Tab</span>
              </button>
              
              <button
                onClick={() => setLongPressedTab(null)}
                className="tab-overlay-button cancel"
                data-testid="button-cancel-tab-options"
              >
                <X className="w-5 h-5" />
                <span className="font-medium">Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
