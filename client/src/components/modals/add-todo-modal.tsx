import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarIcon, X, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertTodo, Tab, Todo } from "@shared/schema";

interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: Date;
  activeTabId?: string | null;
  editingTodo?: Todo | null;
}

export default function AddTodoModal({ isOpen, onClose, defaultDate, activeTabId, editingTodo }: AddTodoModalProps) {
  const [formData, setFormData] = useState<Partial<InsertTodo>>({
    title: "",
    description: "",
    tabId: activeTabId, // Use the active tab context
    dueDate: defaultDate || undefined,
    dueTime: "",
    priority: "medium",
    hasReminder: false,
    reminderDate: undefined,
    reminderTime: "",
    isRepeating: false,
    repeatPattern: "daily",
    repeatInterval: 1,
    repeatDays: [],
    tags: []
  });
  const [tagInput, setTagInput] = useState("");
  const [isAsap, setIsAsap] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isReminderDatePickerOpen, setIsReminderDatePickerOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch tabs for selection
  const { data: tabs = [] } = useQuery<Tab[]>({
    queryKey: ["/api/tabs"],
  });

  const createTodoMutation = useMutation({
    mutationFn: async (todo: InsertTodo) => {
      return apiRequest("POST", "/api/todos", todo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      onClose();
      resetForm();
      toast({
        title: "Todo created",
        description: "Your new todo has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create todo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTodoMutation = useMutation({
    mutationFn: async ({ id, ...todo }: { id: string } & Partial<InsertTodo>) => {
      return apiRequest("PATCH", `/api/todos/${id}`, todo);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      onClose();
      resetForm();
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

  // Initialize form data based on whether we're editing or creating
  const initializeForm = () => {
    if (editingTodo) {
      const isAsapTodo = editingTodo.dueDate && new Date(editingTodo.dueDate).getTime() === 0;
      setFormData({
        title: editingTodo.title,
        description: editingTodo.description || "",
        tabId: editingTodo.tabId,
        dueDate: isAsapTodo ? undefined : editingTodo.dueDate ? new Date(editingTodo.dueDate) : undefined,
        dueTime: editingTodo.dueTime || "",
        priority: editingTodo.priority,
        hasReminder: editingTodo.hasReminder,
        reminderDate: editingTodo.reminderDate ? new Date(editingTodo.reminderDate) : undefined,
        reminderTime: editingTodo.reminderTime || "",
        isRepeating: editingTodo.isRepeating,
        repeatPattern: editingTodo.repeatPattern || "daily",
        repeatInterval: editingTodo.repeatInterval || 1,
        repeatDays: editingTodo.repeatDays || [],
        tags: editingTodo.tags || []
      });
      setIsAsap(isAsapTodo);
    } else {
      setFormData({
        title: "",
        description: "",
        tabId: activeTabId,
        dueDate: defaultDate || undefined,
        dueTime: "",
        priority: "medium",
        hasReminder: false,
        reminderDate: undefined,
        reminderTime: "",
        isRepeating: false,
        repeatPattern: "daily",
        repeatInterval: 1,
        repeatDays: [],
        tags: []
      });
      setIsAsap(false);
    }
    setTagInput("");
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      tabId: activeTabId,
      dueDate: defaultDate || undefined,
      dueTime: "",
      priority: "medium",
      hasReminder: false,
      reminderDate: undefined,
      reminderTime: "",
      isRepeating: false,
      repeatPattern: "daily",
      repeatInterval: 1,
      repeatDays: [],
      tags: []
    });
    setTagInput("");
    setIsAsap(false);
  };

  // Initialize form when modal opens or editingTodo changes
  useEffect(() => {
    if (isOpen) {
      initializeForm();
    }
  }, [isOpen, editingTodo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) return;

    // Get user from localStorage or use mock user
    const savedUser = localStorage.getItem('user');
    const userId = savedUser ? JSON.parse(savedUser).id : "1";

    // Create a clean payload with proper defaults
    const todoData: InsertTodo = {
      userId: userId,
      title: formData.title.trim(),
      description: formData.description || "",
      dueDate: isAsap ? new Date(0) : formData.dueDate, // Use epoch time for ASAP
      dueTime: formData.dueTime || "",
      priority: formData.priority || "medium",
      isCompleted: false,
      hasReminder: formData.hasReminder || false,
      reminderDate: formData.hasReminder ? formData.reminderDate : undefined,
      reminderTime: formData.hasReminder ? formData.reminderTime || "" : "",
      isRepeating: formData.isRepeating || false,
      repeatPattern: formData.isRepeating ? formData.repeatPattern : undefined,
      repeatInterval: formData.isRepeating ? formData.repeatInterval || 1 : undefined,
      repeatDays: formData.isRepeating && formData.repeatPattern === "weekly" ? formData.repeatDays : undefined,
      tags: formData.tags || [],
      tabId: formData.tabId
    };

    if (editingTodo) {
      updateTodoMutation.mutate({ id: editingTodo.id, ...todoData });
    } else {
      createTodoMutation.mutate(todoData);
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const updateFormData = (updates: Partial<InsertTodo>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      updateFormData({ tags: [...(formData.tags || []), tagInput.trim().toLowerCase()] });
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateFormData({ tags: formData.tags?.filter(tag => tag !== tagToRemove) || [] });
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const getTagColor = (tag: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    ];
    const index = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md mx-auto max-h-[85vh] overflow-y-auto animate-fade-in" data-testid="add-todo-modal">
        <DialogHeader>
          <DialogTitle>{editingTodo ? 'Edit Todo' : 'Add New Todo'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Task</Label>
            <Input
              id="title"
              value={formData.title || ""}
              onChange={(e) => updateFormData({ title: e.target.value })}
              placeholder="Enter your task..."
              data-testid="input-todo-title"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => updateFormData({ description: e.target.value })}
              placeholder="Add more details..."
              rows={3}
              data-testid="input-todo-description"
            />
          </div>

          <div>
            <Label>Due Date</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="asap"
                  checked={isAsap}
                  onCheckedChange={(checked) => {
                    setIsAsap(!!checked);
                    if (checked) {
                      // Use a special timestamp to indicate ASAP (1970-01-01)
                      updateFormData({ dueDate: new Date(0) });
                    } else {
                      updateFormData({ dueDate: undefined });
                    }
                  }}
                  data-testid="checkbox-asap"
                />
                <Label htmlFor="asap" className="text-sm font-medium">
                  As Soon As Possible
                </Label>
              </div>
              
              {!isAsap && (
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-select-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dueDate ? (
                        format(formData.dueDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dueDate || undefined}
                      onSelect={(date) => {
                        updateFormData({ dueDate: date });
                        setIsDatePickerOpen(false);
                      }}
                      initialFocus
                      data-testid="calendar-due-date"
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {!isAsap && (
            <div>
              <Label htmlFor="dueTime">Time (Optional)</Label>
              <Input
                id="dueTime"
                type="time"
                value={formData.dueTime || ""}
                onChange={(e) => updateFormData({ dueTime: e.target.value })}
                data-testid="input-todo-time"
              />
            </div>
          )}


          <div>
            <Label>Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => updateFormData({ priority: value })}>
              <SelectTrigger data-testid="select-todo-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="hasReminder"
              checked={formData.hasReminder || false}
              onCheckedChange={(checked) => updateFormData({ hasReminder: checked })}
              data-testid="switch-reminder"
            />
            <Label htmlFor="hasReminder">Set reminder</Label>
          </div>

          {formData.hasReminder && (
            <div className="space-y-3 pl-6 border-l-2 border-muted">
              <div>
                <Label>Reminder Date</Label>
                <Popover open={isReminderDatePickerOpen} onOpenChange={setIsReminderDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-select-reminder-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.reminderDate ? (
                        format(formData.reminderDate, "PPP")
                      ) : (
                        <span>Pick reminder date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.reminderDate || undefined}
                      onSelect={(date) => {
                        updateFormData({ reminderDate: date });
                        setIsReminderDatePickerOpen(false);
                      }}
                      initialFocus
                      data-testid="calendar-reminder-date"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="reminderTime">Reminder Time</Label>
                <Input
                  id="reminderTime"
                  type="time"
                  value={formData.reminderTime || ""}
                  onChange={(e) => updateFormData({ reminderTime: e.target.value })}
                  data-testid="input-reminder-time"
                />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id="isRepeating"
              checked={formData.isRepeating || false}
              onCheckedChange={(checked) => updateFormData({ isRepeating: checked })}
              data-testid="switch-repeating"
            />
            <Label htmlFor="isRepeating" className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Repeat task
            </Label>
          </div>

          {formData.isRepeating && (
            <div className="space-y-3 pl-6 border-l-2 border-muted">
              <div>
                <Label>Repeat Pattern</Label>
                <Select 
                  value={formData.repeatPattern || "daily"} 
                  onValueChange={(value) => updateFormData({ repeatPattern: value })}
                >
                  <SelectTrigger data-testid="select-repeat-pattern">
                    <SelectValue placeholder="Select repeat pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="repeatInterval">Repeat Every</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="repeatInterval"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.repeatInterval || 1}
                    onChange={(e) => updateFormData({ repeatInterval: parseInt(e.target.value) || 1 })}
                    className="w-20"
                    data-testid="input-repeat-interval"
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.repeatPattern === "daily" && "day(s)"}
                    {formData.repeatPattern === "weekly" && "week(s)"}
                    {formData.repeatPattern === "monthly" && "month(s)"}
                    {formData.repeatPattern === "yearly" && "year(s)"}
                  </span>
                </div>
              </div>

              {formData.repeatPattern === "weekly" && (
                <div>
                  <Label>Repeat On</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => (
                      <Button
                        key={day}
                        type="button"
                        variant={formData.repeatDays?.includes(day) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const currentDays = formData.repeatDays || [];
                          const newDays = currentDays.includes(day)
                            ? currentDays.filter(d => d !== day)
                            : [...currentDays, day];
                          updateFormData({ repeatDays: newDays });
                        }}
                        className="text-xs px-2 py-1"
                        data-testid={`button-repeat-day-${day}`}
                      >
                        {day.substring(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
                {formData.repeatPattern === "daily" && `Repeats every ${formData.repeatInterval || 1} day(s)`}
                {formData.repeatPattern === "weekly" && `Repeats every ${formData.repeatInterval || 1} week(s)${
                  formData.repeatDays?.length ? ` on ${formData.repeatDays.join(', ')}` : ''
                }`}
                {formData.repeatPattern === "monthly" && `Repeats every ${formData.repeatInterval || 1} month(s)`}
                {formData.repeatPattern === "yearly" && `Repeats every ${formData.repeatInterval || 1} year(s)`}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              className="flex-1"
              data-testid="button-cancel-todo"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!formData.title?.trim() || createTodoMutation.isPending}
              data-testid="button-save-todo"
            >
              {createTodoMutation.isPending ? "Saving..." : "Add Todo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
