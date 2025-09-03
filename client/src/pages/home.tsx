import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import BottomNavigation from "@/components/layout/bottom-navigation";
import GoalsExpanded from "@/components/expanded-boxes/goals-expanded";
import IdoExpanded from "@/components/expanded-boxes/ido-expanded";
import ChatbotExpanded from "@/components/expanded-boxes/chatbot-expanded";
import ProgressExpanded from "@/components/expanded-boxes/progress-expanded";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Target, Zap, MessageCircle, BarChart3, Settings, X } from "lucide-react";
import type { Todo, Goal, Activity, User, UserSettings } from "@shared/schema";

type ExpandedBox = "goals" | "ido" | "chatbot" | "progress" | null;

export default function Home() {
  const [expandedBox, setExpandedBox] = useState<ExpandedBox>(null);
  const [showSettingsNotification, setShowSettingsNotification] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mutation for updating todos (including completion status)
  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { isCompleted: boolean } }) => {
      return apiRequest("PATCH", `/api/todos/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      toast({
        title: "Todo updated",
        description: "Task completed successfully!",
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

  const toggleTodoComplete = (todo: Todo) => {
    updateTodoMutation.mutate({
      id: todo.id,
      updates: { isCompleted: !todo.isCompleted }
    });
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-300 bg-red-50';
      case 'medium': return 'border-orange-300 bg-orange-50';
      case 'low': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-border bg-card';
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-700';
      case 'medium': return 'text-orange-700';
      case 'low': return 'text-yellow-700';
      default: return 'text-card-foreground';
    }
  };

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  // Show notification for new users who haven't customized settings yet
  useState(() => {
    if (settings && user && !showSettingsNotification) {
      // Check if user is still using most default settings
      const hasCustomizedSettings = (
        settings.darkMode || // Changed from default false
        settings.notificationType !== "local" || // Changed from default
        !settings.progressNotificationEnabled || // Changed from default true
        !settings.todoReminderEnabled || // Changed from default true
        settings.language !== "en" // Changed from default
      );
      
      if (!hasCustomizedSettings) {
        setShowSettingsNotification(true);
      }
    }
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const { data: allTodos = [] } = useQuery<Todo[]>({
    queryKey: ["/api/todos"],
  });

  // Get current time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Get first name from full name
  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0];
  };

  const getFormattedDate = () => {
    const now = new Date();
    return now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  // Filter upcoming todos
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isAsapTodo = (todo: Todo) => {
    return todo.dueDate && new Date(todo.dueDate).getTime() === 0;
  };

  const todayTodos = allTodos.filter(todo => {
    if (!todo.dueDate || todo.isCompleted) return false;
    // Include ASAP todos in today's view
    if (isAsapTodo(todo)) return true;
    const dueDate = new Date(todo.dueDate);
    return dueDate.toDateString() === today.toDateString();
  }).sort((a, b) => {
    // ASAP todos always come first
    if (isAsapTodo(a) && !isAsapTodo(b)) return -1;
    if (!isAsapTodo(a) && isAsapTodo(b)) return 1;
    
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
  });

  const tomorrowTodos = allTodos.filter(todo => {
    if (!todo.dueDate || todo.isCompleted) return false;
    const dueDate = new Date(todo.dueDate);
    return dueDate.toDateString() === tomorrow.toDateString();
  }).sort((a, b) => {
    // ASAP todos always come first
    if (isAsapTodo(a) && !isAsapTodo(b)) return -1;
    if (!isAsapTodo(a) && isAsapTodo(b)) return 1;
    
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
  });

  // Calculate goals progress
  const completedGoals = goals.filter(g => g.isCompleted).length;
  const totalGoals = goals.length;
  const goalsProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const expandBox = (boxType: ExpandedBox) => {
    setExpandedBox(boxType);
  };

  const closeExpandedBox = () => {
    setExpandedBox(null);
  };

  if (expandedBox) {
    const expandedComponents = {
      goals: <GoalsExpanded onClose={closeExpandedBox} />,
      ido: <IdoExpanded onClose={closeExpandedBox} />,
      chatbot: <ChatbotExpanded onClose={closeExpandedBox} />,
      progress: <ProgressExpanded onClose={closeExpandedBox} />,
    };

    return expandedComponents[expandedBox];
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-md mx-auto px-4 pb-20">
        {/* Personalized Greeting */}
        <section className="py-6" data-testid="greeting-section">
          <h2 className="text-2xl font-medium text-foreground mb-1">
            {getGreeting()}, <span className="text-primary">{user?.name ? getFirstName(user.name) : "there"}</span>
          </h2>
          <p className="text-muted-foreground" data-testid="current-date">
            {getFormattedDate()}
          </p>
        </section>

        {/* Settings Notification */}
        {showSettingsNotification && (
          <section className="mb-6">
            <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                    Customize Your Experience
                  </h3>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mb-3">
                    Set up your preferences, notifications, and integrations to make the app work best for you.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setLocation("/settings");
                        setShowSettingsNotification(false);
                      }}
                      className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded transition-colors"
                      data-testid="button-go-to-settings"
                    >
                      Open Settings
                    </button>
                    <button
                      onClick={() => setShowSettingsNotification(false)}
                      className="text-xs text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200 transition-colors"
                      data-testid="button-dismiss-settings-notification"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettingsNotification(false)}
                  className="text-orange-400 hover:text-orange-600 transition-colors flex-shrink-0"
                  data-testid="button-close-settings-notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Quick Actions Grid */}
        <section className="mb-8" data-testid="quick-actions-grid">
          <div className="grid grid-cols-2 gap-4">
            
            {/* Goals Box */}
            <div 
              className="mobile-card p-4 cursor-pointer h-24" 
              onClick={() => expandBox('goals')}
              data-testid="box-goals"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Target className="w-3 h-3 text-primary" />
                </div>
                <h3 className="text-sm font-medium text-card-foreground">Goals</h3>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {completedGoals}/{totalGoals}
                </div>
                <div className="text-xs text-primary font-medium">
                  {goalsProgress}%
                </div>
              </div>
            </div>

            {/* I Do Box */}
            <div 
              className="mobile-card p-4 cursor-pointer h-24" 
              onClick={() => expandBox('ido')}
              data-testid="box-ido"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-accent/10 rounded-lg flex items-center justify-center">
                  <Zap className="w-3 h-3 text-accent" />
                </div>
                <h3 className="text-sm font-medium text-card-foreground">I Do</h3>
              </div>
              <div className="text-xs text-muted-foreground">
                {activities.length} activities
              </div>
            </div>

            {/* ChatBot Box */}
            <div 
              className="mobile-card p-4 cursor-pointer h-24" 
              onClick={() => expandBox('chatbot')}
              data-testid="box-chatbot"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-secondary/20 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-3 h-3 text-secondary-foreground" />
                </div>
                <h3 className="text-sm font-medium text-card-foreground">ChatBot</h3>
              </div>
              <div className="text-xs text-primary">Ask me anything</div>
            </div>

            {/* Progress Tracker Box */}
            <div 
              className="mobile-card p-4 cursor-pointer h-24" 
              onClick={() => expandBox('progress')}
              data-testid="box-progress"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-3 h-3 text-primary" />
                </div>
                <h3 className="text-sm font-medium text-card-foreground">Progress</h3>
              </div>
              <div className="text-xs text-primary">Daily tracking</div>
            </div>

          </div>
        </section>

        {/* Upcoming Todos */}
        <section className="mb-8" data-testid="upcoming-todos">
          <h3 className="text-lg font-medium text-foreground mb-4">Upcoming</h3>
          
          {/* Today's Tasks */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Today</h4>
            {todayTodos.length === 0 ? (
              <div className="bg-card rounded-lg p-3 border border-border">
                <p className="text-sm text-muted-foreground text-center">No tasks for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayTodos.slice(0, 3).map((todo) => (
                  <div key={todo.id} className={`rounded-lg p-3 border-2 ${getPriorityColor(todo.priority)} flex items-center gap-3 transition-all duration-200`} data-testid={`todo-today-${todo.id}`}>
                    <button
                      onClick={() => toggleTodoComplete(todo)}
                      className="flex-shrink-0 transition-colors duration-200"
                      data-testid={`checkbox-today-${todo.id}`}
                    >
                      <CheckCircle2 className={`w-5 h-5 ${todo.isCompleted ? 'text-green-600 fill-green-100' : 'text-gray-400 hover:text-green-500'}`} />
                    </button>
                    <span className={`text-sm flex-1 ${getPriorityTextColor(todo.priority)} ${todo.isCompleted ? 'line-through opacity-60' : ''}`}>{todo.title}</span>
                    {todo.dueTime && (
                      <span className="text-xs text-muted-foreground">{todo.dueTime}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tomorrow's Tasks */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Tomorrow</h4>
            {tomorrowTodos.length === 0 ? (
              <div className="bg-card rounded-lg p-3 border border-border">
                <p className="text-sm text-muted-foreground text-center">No tasks for tomorrow</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tomorrowTodos.slice(0, 3).map((todo) => (
                  <div key={todo.id} className={`rounded-lg p-3 border-2 ${getPriorityColor(todo.priority)} flex items-center gap-3 transition-all duration-200`} data-testid={`todo-tomorrow-${todo.id}`}>
                    <button
                      onClick={() => toggleTodoComplete(todo)}
                      className="flex-shrink-0 transition-colors duration-200"
                      data-testid={`checkbox-tomorrow-${todo.id}`}
                    >
                      <CheckCircle2 className={`w-5 h-5 ${todo.isCompleted ? 'text-green-600 fill-green-100' : 'text-gray-400 hover:text-green-500'}`} />
                    </button>
                    <span className={`text-sm flex-1 ${getPriorityTextColor(todo.priority)} ${todo.isCompleted ? 'line-through opacity-60' : ''}`}>{todo.title}</span>
                    {todo.dueTime && (
                      <span className="text-xs text-muted-foreground">{todo.dueTime}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      <BottomNavigation />
    </div>
  );
}
