import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, MessageSquare, Clock, Target, FileText } from "lucide-react";

interface VoiceHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function VoiceHelpDialog({ open, onOpenChange }: VoiceHelpDialogProps) {
  const voiceCommands = [
    {
      category: "Todos",
      icon: <MessageSquare className="w-4 h-4" />,
      commands: [
        {
          phrase: "Hey MyLife, add grocery shopping to my weekend tab todo",
          description: "Adds a todo item to a specific tab"
        },
        {
          phrase: "Hey MyLife, add call dentist to my personal todo",
          description: "Adds a todo to the personal tab"
        }
      ]
    },
    {
      category: "Time Tracking", 
      icon: <Clock className="w-4 h-4" />,
      commands: [
        {
          phrase: "Hey MyLife, start timer for exercise",
          description: "Starts tracking time for an activity"
        },
        {
          phrase: "Hey MyLife, stop timer",
          description: "Stops the currently running timer"
        }
      ]
    },
    {
      category: "Goals",
      icon: <Target className="w-4 h-4" />,
      commands: [
        {
          phrase: "Hey MyLife, add learn Spanish to my goals",
          description: "Creates a new goal"
        }
      ]
    },
    {
      category: "Notes",
      icon: <FileText className="w-4 h-4" />,
      commands: [
        {
          phrase: "Hey MyLife, add remember to buy milk to my notes",
          description: "Creates a new note"
        }
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Voice Commands
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Say "Hey MyLife" followed by any of these commands:
          </div>
          
          {voiceCommands.map((category) => (
            <div key={category.category} className="space-y-3">
              <div className="flex items-center gap-2 font-medium text-sm">
                {category.icon}
                {category.category}
              </div>
              
              <div className="space-y-2 ml-6">
                {category.commands.map((cmd, index) => (
                  <div key={index} className="space-y-1">
                    <div className="text-xs font-mono bg-muted p-2 rounded text-muted-foreground">
                      "{cmd.phrase}"
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {cmd.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <div className="border-t pt-4">
            <div className="text-xs text-muted-foreground space-y-2">
              <p><strong>Tips:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Speak clearly and at normal pace</li>
                <li>Use tab names like "personal", "work", "weekend"</li>
                <li>Activity names should match your existing activities</li>
                <li>Click the microphone button to start/stop listening</li>
              </ul>
            </div>
          </div>
          
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full"
            data-testid="button-close-voice-help"
          >
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}