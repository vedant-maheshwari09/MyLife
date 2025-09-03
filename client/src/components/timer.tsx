import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Pause, Square } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TimeSession } from "@shared/schema";

interface TimerProps {
  activityId: string;
  activityTitle: string;
}

export default function Timer({ activityId, activityTitle }: TimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [description, setDescription] = useState("");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for active session on mount
  const { data: activeSession } = useQuery<TimeSession | null>({
    queryKey: ["/api/time-sessions/active"],
    refetchInterval: 1000, // Check for active session every second
  });

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/time-sessions/start", { activityId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-sessions/active"] });
      toast({
        title: "Timer started",
        description: `Started tracking time for ${activityTitle}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start timer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const stopSessionMutation = useMutation({
    mutationFn: async (sessionDescription?: string) => {
      return apiRequest("POST", "/api/time-sessions/stop", { description: sessionDescription });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-sessions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-sessions"] });
      setStopDialogOpen(false);
      setDescription("");
      toast({
        title: "Timer stopped",
        description: `Stopped tracking time for ${activityTitle}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to stop timer. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update timer display based on active session
  useEffect(() => {
    if (activeSession && activeSession.activityId === activityId) {
      setIsRunning(true);
      setStartTime(new Date(activeSession.startTime));
    } else {
      setIsRunning(false);
      setStartTime(null);
      setElapsedTime(0);
    }
  }, [activeSession, activityId]);

  // Update elapsed time every second
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    startSessionMutation.mutate();
  };

  const handleStop = () => {
    setStopDialogOpen(true);
  };

  const confirmStop = () => {
    stopSessionMutation.mutate(description);
  };

  const isActiveForThisActivity = activeSession && activeSession.activityId === activityId;
  const isActiveForOtherActivity = activeSession && activeSession.activityId !== activityId;

  return (
    <>
      <div className="flex items-center gap-3 mt-2">
        {isActiveForThisActivity ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              {formatTime(elapsedTime)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              disabled={stopSessionMutation.isPending}
              data-testid={`button-stop-timer-${activityId}`}
            >
              <Square className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStart}
            disabled={startSessionMutation.isPending || !!isActiveForOtherActivity}
            data-testid={`button-start-timer-${activityId}`}
          >
            <Play className="w-3 h-3" />
            {isActiveForOtherActivity ? "Stop other first" : "Start Timer"}
          </Button>
        )}
      </div>

      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Timer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              You tracked {formatTime(elapsedTime)} for "{activityTitle}"
            </div>
            <div>
              <label htmlFor="description" className="text-sm font-medium">
                What did you accomplish? (optional)
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you worked on..."
                className="mt-1"
                data-testid="textarea-session-description"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStopDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmStop}
                disabled={stopSessionMutation.isPending}
                className="flex-1"
                data-testid="button-confirm-stop-timer"
              >
                Stop Timer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}