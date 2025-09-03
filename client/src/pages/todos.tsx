import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import BottomNavigation from "@/components/layout/bottom-navigation";
import AddTodoModal from "@/components/modals/add-todo-modal";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Circle, Plus, ChevronLeft, ChevronRight, CalendarPlus, RotateCcw, Hash, X, Brain, Clock, ChevronDown, ChevronUp, Trash2, Edit } from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Todo, Tab } from "@shared/schema";

// Helper functions for ASAP todos
const isAsapTodo = (todo: Todo): boolean => {
  return !!(todo.dueDate && new Date(todo.dueDate).getTime() === 0);
};

const formatDueDate = (todo: Todo): string => {
  if (isAsapTodo(todo)) {
    return "As Soon As Possible";
  }
  if (!todo.dueDate) {
    return "";
  }
  return format(new Date(todo.dueDate), "PPP");
};

export default function Todos() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null); // null = "All Tasks"
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [useSmartPrioritization, setUseSmartPrioritization] = useState(true);
  const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set());
  const [longPressedTab, setLongPressedTab] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleExpanded = (todoId: string) => {
    const newExpanded = new Set(expandedTodos);
    if (newExpanded.has(todoId)) {
      newExpanded.delete(todoId);
    } else {
      newExpanded.add(todoId);
    }
    setExpandedTodos(newExpanded);
  };

  const { data: todos = [] } = useQuery<Todo[]>({
    queryKey: ["/api/todos"],
  });

  const { data: allTabs = [] } = useQuery<Tab[]>({
    queryKey: ["/api/tabs"],
  });

  // Filter tabs to only show todo tabs
  const tabs = allTabs.filter(tab => tab.type === 'todos');

  // Simple client-side prioritization instead of server-side AI
  const prioritizedTodos = todos.slice().sort((a, b) => {
    // Sort by priority: high > medium > low, then by due date
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
    
    if (aPriority !== bPriority) return bPriority - aPriority;
    
    // Then sort by due date (ASAP first, then soonest)
    if (isAsapTodo(a)) return -1;
    if (isAsapTodo(b)) return 1;
    
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    
    return 0;
  });

  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Todo> }) => {
      return apiRequest("PATCH", `/api/todos/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Todo updated",
        description: "Your todo has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update todo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/todos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Todo deleted",
        description: "Your todo has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete todo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clearCompletedTodos = useMutation({
    mutationFn: async () => {
      const completedTodos = todos.filter(todo => todo.isCompleted);
      await Promise.all(completedTodos.map(todo => 
        apiRequest("DELETE", `/api/todos/${todo.id}`)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Completed todos cleared",
        description: "All completed todos have been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to clear completed todos. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createTabMutation = useMutation({
    mutationFn: async (name: string) => {
      // Generate a random color for the new tab
      const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      return apiRequest("POST", "/api/tabs", { name, color, type: 'todos' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tabs"] });
      setIsAddingTab(false);
      setNewTabName("");
      toast({
        title: "Tab created",
        description: "Your new tab has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create tab. Please try again.",
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
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      // Switch to "All Tasks" tab if the deleted tab was active
      if (activeTabId && tabs.find(tab => tab.id === activeTabId)) {
        setActiveTabId(null);
      }
      toast({
        title: "Tab deleted",
        description: "Your tab has been deleted successfully.",
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

  // Filter todos by active tab first, then by selected date
  const filteredTodos = activeTabId === null 
    ? todos // Show all todos for "All Tasks" tab
    : todos.filter(todo => todo.tabId === activeTabId);

  const getFilteredAndSortedTodos = () => {
    // For "All Tasks" tab (activeTabId === null), show all todos regardless of date
    if (activeTabId === null) {
      // Include todos without due dates too for "All Tasks"
      const allTodos = filteredTodos.filter(todo => true); // Show all todos
      
      if (useSmartPrioritization) {
        return prioritizedTodos; // Show all prioritized todos
      }

      // Default sorting: ASAP first, then by priority, then by due date
      return allTodos.sort((a, b) => {
        if (isAsapTodo(a) && !isAsapTodo(b)) return -1;
        if (!isAsapTodo(a) && isAsapTodo(b)) return 1;
        
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
        
        if (priorityDiff !== 0) return priorityDiff;
        
        // Sort by due date if priorities are equal
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return 0;
      });
    }

    // For specific tabs, filter by selected date as before
    const filtered = filteredTodos.filter(todo => {
      if (!todo.dueDate) return false;
      
      // Include ASAP todos in all date views
      if (isAsapTodo(todo)) return true;
      
      return isSameDay(new Date(todo.dueDate), selectedDate);
    });

    if (useSmartPrioritization) {
      // Use prioritized order but filter for selected date
      return prioritizedTodos.filter(todo => {
        if (!todo.dueDate) return false;
        if (isAsapTodo(todo)) return true;
        return isSameDay(new Date(todo.dueDate), selectedDate);
      });
    }

    // Default sorting: ASAP first, then by priority
    return filtered.sort((a, b) => {
      if (isAsapTodo(a) && !isAsapTodo(b)) return -1;
      if (!isAsapTodo(a) && isAsapTodo(b)) return 1;
      
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
    });
  };

  const selectedDateTodos = getFilteredAndSortedTodos();

  const handleCreateTab = () => {
    if (newTabName.trim()) {
      createTabMutation.mutate(newTabName.trim());
    }
  };

  const handleTabClick = (tabId: string | null) => {
    setActiveTabId(tabId);
  };

  const toggleTodoComplete = (todo: Todo) => {
    updateTodoMutation.mutate({
      id: todo.id,
      updates: { isCompleted: !todo.isCompleted }
    });
  };

  const deleteTodo = (id: string) => {
    deleteTodoMutation.mutate(id);
  };

  const deleteTab = (id: string) => {
    deleteTabMutation.mutate(id);
  };

  const exportToCalendar = (todo: Todo) => {
    if (!todo.dueDate || isAsapTodo(todo)) {
      toast({
        title: "Cannot export",
        description: isAsapTodo(todo) 
          ? "ASAP todos cannot be exported to calendar as they don't have a specific date."
          : "This todo doesn't have a due date to export.",
        variant: "destructive",
      });
      return;
    }

    const startDate = new Date(todo.dueDate);
    
    // If todo has a time, use it; otherwise default to 9 AM
    if (todo.dueTime) {
      const [hours, minutes] = todo.dueTime.split(':').map(Number);
      startDate.setHours(hours, minutes, 0, 0);
    } else {
      startDate.setHours(9, 0, 0, 0);
    }
    
    // End time is 1 hour after start time
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MyLife App//EN',
      'BEGIN:VEVENT',
      `UID:todo-${todo.id}@mylife.app`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${todo.title}`,
      todo.description ? `DESCRIPTION:${todo.description.replace(/\n/g, '\\n')}` : '',
      `PRIORITY:${todo.priority === 'high' ? '1' : todo.priority === 'medium' ? '5' : '9'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(line => line !== '').join('\r\n');
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${todo.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Calendar event exported",
      description: "The .ics file has been downloaded. Open it to add to your calendar.",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200';
      case 'medium': return 'border-yellow-200';
      case 'low': return 'border-green-200';
      default: return 'border-border';
    }
  };

  const getRepetitionDescription = (todo: Todo) => {
    if (!todo.isRepeating || !todo.repeatPattern) {
      return "";
    }
    
    const interval = todo.repeatInterval || 1;
    const pattern = todo.repeatPattern;
    
    switch (pattern) {
      case "daily":
        return interval === 1 ? "Daily" : `Every ${interval} days`;
        
      case "weekly":
        if (todo.repeatDays && todo.repeatDays.length > 0) {
          const dayStr = todo.repeatDays.join(", ");
          return interval === 1 ? `Weekly on ${dayStr}` : `Every ${interval} weeks on ${dayStr}`;
        }
        return interval === 1 ? "Weekly" : `Every ${interval} weeks`;
        
      case "monthly":
        return interval === 1 ? "Monthly" : `Every ${interval} months`;
        
      case "yearly":
        return interval === 1 ? "Yearly" : `Every ${interval} years`;
        
      default:
        return `Repeats ${pattern}`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-md mx-auto px-4 pb-20">
        
        <div className="flex items-center justify-between py-6">
          <h1 className="text-2xl font-semibold text-foreground">To-Dos</h1>
          {todos.some(todo => todo.isCompleted) && (
            <button
              onClick={() => clearCompletedTodos.mutate()}
              disabled={clearCompletedTodos.isPending}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              data-testid="button-clear-completed"
            >
              <Trash2 className="w-4 h-4" />
              {clearCompletedTodos.isPending ? "Clearing..." : "Clear All"}
            </button>
          )}
        </div>

        {/* Tabs Navigation */}
        <div className="mb-6" data-testid="tabs-navigation">
          <div className="tab-container">
            {/* All Tasks Tab */}
            <button
              onClick={() => handleTabClick(null)}
              className={`tab-button ${activeTabId === null ? 'active' : ''}`}
              data-testid="tab-all-tasks"
            >
              <Hash className="w-4 h-4" />
              All Tasks ({todos.length})
            </button>

            {/* User Created Tabs - sorted by number of tasks */}
            {tabs
              .filter(tab => !tab.isDefault)
              .sort((a, b) => {
                const aCount = todos.filter(todo => todo.tabId === a.id).length;
                const bCount = todos.filter(todo => todo.tabId === b.id).length;
                return bCount - aCount; // Descending order by task count
              })
              .map(tab => (
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
                          setRenameValue(tab.name);
                        }
                      }}
                      className="tab-rename-input"
                      autoFocus
                      data-testid={`input-rename-tab-${tab.id}`}
                    />
                    <button
                      onClick={() => {
                        updateTabMutation.mutate({ id: tab.id, updates: { name: renameValue } });
                        setIsRenaming(null);
                      }}
                      disabled={!renameValue.trim() || updateTabMutation.isPending}
                      className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                      data-testid={`button-save-tab-${tab.id}`}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        setIsRenaming(null);
                        setRenameValue(tab.name);
                      }}
                      className="px-2 py-1 text-xs border rounded hover:bg-muted"
                      data-testid={`button-cancel-rename-tab-${tab.id}`}
                    >
                      ✕
                    </button>
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
                      className={`tab-button ${activeTabId === tab.id ? 'active' : ''}`}
                      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                      data-testid={`tab-${tab.id}`}
                    >
                      <div 
                        className="tab-color-indicator" 
                        style={{ backgroundColor: tab.color }}
                      />
                      {tab.name} ({todos.filter(todo => todo.tabId === tab.id).length})
                    </button>
                    
                  </div>
                )}
              </div>
            ))}

            {/* Add Tab Button */}
            {isAddingTab ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  placeholder="Tab name"
                  className="w-32 h-8 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateTab();
                    } else if (e.key === 'Escape') {
                      setIsAddingTab(false);
                      setNewTabName("");
                    }
                  }}
                  data-testid="input-new-tab-name"
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={handleCreateTab}
                  disabled={!newTabName.trim() || createTabMutation.isPending}
                  data-testid="button-confirm-tab"
                >
                  ✓
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsAddingTab(false);
                    setNewTabName("");
                  }}
                  data-testid="button-cancel-tab"
                >
                  ✕
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingTab(true)}
                className="tab-add-button"
                data-testid="button-add-tab"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Tab
              </button>
            )}
          </div>
        </div>

        {/* Selected Date Tasks */}
        <div className="mb-6" data-testid="selected-date-tasks">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-foreground">
              {isSameDay(selectedDate, new Date()) 
                ? "Today" 
                : format(selectedDate, 'EEEE, MMMM d')
              }
            </h4>
            <span className="text-xs text-muted-foreground">
              {selectedDateTodos.length} {selectedDateTodos.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          
          {selectedDateTodos.length === 0 ? (
            <div className="bg-card rounded-xl p-6 border border-border shadow-sm text-center">
              <p className="text-muted-foreground">No tasks for this date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateTodos.map((todo) => {
                const isExpanded = expandedTodos.has(todo.id);
                return (
                  <div key={todo.id} className={`bg-card rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow ${getPriorityBorderColor(todo.priority)}`} data-testid={`todo-item-${todo.id}`}>
                    {/* Compact view - always visible */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleTodoComplete(todo)}
                        className="flex-shrink-0"
                        data-testid={`button-toggle-${todo.id}`}
                      >
                        {todo.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`font-medium truncate ${todo.isCompleted ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}>
                            {todo.title}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {todo.dueDate && !isAsapTodo(todo) && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(todo.dueDate), 'MMM d')}
                              </span>
                            )}
                            {isAsapTodo(todo) && (
                              <span className="text-xs text-red-600 font-medium">ASAP</span>
                            )}
                            <span className={`w-3 h-3 rounded-full ${getPriorityDotColor(todo.priority)}`} title={getPriorityLabel(todo.priority)}></span>
                            <button
                              onClick={() => toggleExpanded(todo.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              data-testid={`button-expand-${todo.id}`}
                              title={isExpanded ? "Show less" : "Show more"}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded details - only when expanded */}
                    {isExpanded && (
                      <div className="mt-3 ml-8 space-y-3">
                        {todo.description && (
                          <p className="text-sm text-muted-foreground">
                            {todo.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {useSmartPrioritization && (
                            <span className="flex items-center gap-1">
                              <Brain className="w-3 h-3" />
                              AI Priority
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full border ${getPriorityColor(todo.priority)}`}>
                            {getPriorityLabel(todo.priority)}
                          </span>
                          {todo.dueTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {todo.dueTime}
                            </span>
                          )}
                          {todo.hasReminder && (
                            <span>🔔 Reminder set</span>
                          )}
                          {todo.isRepeating && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <RotateCcw className="w-3 h-3" />
                              {getRepetitionDescription(todo)}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => exportToCalendar(todo)}
                            className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 text-xs"
                            data-testid={`button-export-${todo.id}`}
                            title="Export to calendar"
                          >
                            <CalendarPlus className="w-3 h-3" />
                            Export
                          </button>
                          <button
                            onClick={() => setEditingTodo(todo)}
                            className="text-blue-600 hover:text-blue-800 transition-colors text-xs"
                            data-testid={`button-edit-${todo.id}`}
                            title="Edit todo"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTodoMutation.mutate(todo.id)}
                            className="text-destructive hover:text-destructive/80 transition-colors text-xs"
                            data-testid={`button-delete-${todo.id}`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      <BottomNavigation />

      {/* Premium Floating Add Button */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-20 right-4 w-16 h-16 text-primary-foreground rounded-2xl flex items-center justify-center z-50 transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: 'var(--gradient-primary)',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(8px)'
        }}
        data-testid="button-add-todo-floating"
        title="Add new todo"
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
          e.currentTarget.style.transform = 'translateY(-3px) scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
        }}
      >
        <Plus className="w-7 h-7" />
      </button>

      <AddTodoModal
        isOpen={isAddModalOpen || !!editingTodo}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTodo(null);
        }}
        defaultDate={selectedDate}
        activeTabId={activeTabId}
        editingTodo={editingTodo}
      />

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
                {todos.filter(todo => todo.tabId === longPressedTab).length} todos
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
                  if (tab && window.confirm(`Delete "${tab.name}" tab and all its todos?`)) {
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
