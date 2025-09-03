import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { X, Plus, Zap, Trash2, Edit, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Activity, InsertActivity } from "@shared/schema";

interface IdoExpandedProps {
  onClose: () => void;
}

export default function IdoExpanded({ onClose }: IdoExpandedProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [newActivity, setNewActivity] = useState<Partial<InsertActivity>>({
    title: "",
    description: "",
    hoursPerWeek: undefined,
    minHours: undefined,
    maxHours: undefined
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ["/api/activities"],
  });

  const createActivityMutation = useMutation({
    mutationFn: async (activity: InsertActivity) => {
      return apiRequest("POST", "/api/activities", activity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setIsAddModalOpen(false);
      setNewActivity({ title: "", description: "" });
      toast({
        title: "Activity created",
        description: "Your new activity has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Activity> }) => {
      return apiRequest("PATCH", `/api/activities/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Activity updated",
        description: "Your activity has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Activity deleted",
        description: "Your activity has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.title) return;

    if (editingActivity) {
      updateActivityMutation.mutate({
        id: editingActivity.id,
        updates: newActivity
      });
      setEditingActivity(null);
    } else {
      createActivityMutation.mutate(newActivity as InsertActivity);
    }
  };

  const startEditing = (activity: Activity) => {
    setEditingActivity(activity);
    setNewActivity({
      title: activity.title,
      description: activity.description || "",
      hoursPerWeek: activity.hoursPerWeek || undefined,
      minHours: activity.minHours || undefined,
      maxHours: activity.maxHours || undefined
    });
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingActivity(null);
    setNewActivity({ title: "", description: "" });
  };

  const getTimeCommitmentText = (activity: Activity) => {
    if (activity.hoursPerWeek) {
      return `${activity.hoursPerWeek} hrs/week`;
    } else if (activity.minHours && activity.maxHours) {
      return `${activity.minHours}-${activity.maxHours} hrs/week`;
    } else if (activity.minHours) {
      return `${activity.minHours}+ hrs/week`;
    } else if (activity.maxHours) {
      return `up to ${activity.maxHours} hrs/week`;
    }
    return null;
  };

  return (
    <div className="box-expanded">
      <header className="bg-card/80 backdrop-blur-sm border-b border-border px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-ido">
            <X className="w-5 h-5 text-muted-foreground" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">I Do</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No activities yet</h3>
            <p className="text-muted-foreground">Track your regular activities and manage your time effectively.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-shadow" data-testid={`activity-item-${activity.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-card-foreground">{activity.title}</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(activity)}
                      data-testid={`button-edit-activity-${activity.id}`}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteActivityMutation.mutate(activity.id)}
                      data-testid={`button-delete-activity-${activity.id}`}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                
                {activity.description && (
                  <p className="text-sm text-muted-foreground mb-3">{activity.description}</p>
                )}
                
                {getTimeCommitmentText(activity) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock className="w-3 h-3" />
                    <span>{getTimeCommitmentText(activity)}</span>
                  </div>
                )}
                
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 hover:scale-105"
        data-testid="button-add-activity-floating"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
