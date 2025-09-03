import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Brain, Save, Trash2, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Memory {
  id: string;
  content: string;
  createdAt: string;
}

export default function MemoryModal({ isOpen, onClose }: MemoryModalProps) {
  const [editingMemory, setEditingMemory] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: memories = [] } = useQuery<Memory[]>({
    queryKey: ["/api/chat/memory"],
    enabled: isOpen,
  });

  const saveMemoryMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/chat/memory", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/memory"] });
      setEditingMemory("");
      setIsEditing(false);
      toast({
        title: "Memory saved",
        description: "Your memory has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save memory. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMemoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/chat/memory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/memory"] });
      toast({
        title: "Memory deleted",
        description: "Memory has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete memory. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveMemory = () => {
    if (!editingMemory.trim()) return;
    saveMemoryMutation.mutate(editingMemory.trim());
  };

  const handleDeleteMemory = (id: string) => {
    deleteMemoryMutation.mutate(id);
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditingMemory("");
  };

  const addMemoryShortcut = (shortcut: string) => {
    setEditingMemory(prev => prev + (prev ? " " : "") + shortcut);
  };

  const memoryShortcuts = [
    "I like",
    "I don't like",
    "I want to",
    "I need to remember",
    "Important:",
    "My goal is",
    "I prefer",
    "I usually"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[80vh] overflow-hidden" data-testid="memory-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <DialogTitle>Memory Management</DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-memory">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Add New Memory Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Add New Memory</CardTitle>
              <CardDescription className="text-xs">
                Add information you want the AI to remember about you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isEditing ? (
                <Button 
                  onClick={startEditing} 
                  variant="outline" 
                  className="w-full"
                  data-testid="button-add-memory"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Memory
                </Button>
              ) : (
                <>
                  <Textarea
                    value={editingMemory}
                    onChange={(e) => setEditingMemory(e.target.value)}
                    placeholder="Enter something you want me to remember..."
                    rows={3}
                    data-testid="textarea-memory"
                  />
                  
                  {/* Memory Shortcuts */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Quick shortcuts:</p>
                    <div className="flex flex-wrap gap-1">
                      {memoryShortcuts.map((shortcut) => (
                        <Badge 
                          key={shortcut}
                          variant="secondary" 
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                          onClick={() => addMemoryShortcut(shortcut)}
                          data-testid={`shortcut-${shortcut.replace(/[^a-zA-Z0-9]/g, '-')}`}
                        >
                          {shortcut}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveMemory}
                      disabled={!editingMemory.trim() || saveMemoryMutation.isPending}
                      className="flex-1"
                      data-testid="button-save-memory"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveMemoryMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    <Button 
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                      data-testid="button-cancel-memory"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Existing Memories */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Saved Memories</CardTitle>
              <CardDescription className="text-xs">
                {memories.length} {memories.length === 1 ? 'memory' : 'memories'} saved
              </CardDescription>
            </CardHeader>
            <CardContent>
              {memories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No memories saved yet</p>
                  <p className="text-xs">Add memories to help the AI learn about you</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {memories.map((memory) => (
                    <div 
                      key={memory.id} 
                      className="p-3 bg-muted rounded-lg space-y-2"
                      data-testid={`memory-${memory.id}`}
                    >
                      <p className="text-sm text-foreground">{memory.content}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(memory.createdAt), 'MMM d, yyyy at h:mm a')}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteMemory(memory.id)}
                          disabled={deleteMemoryMutation.isPending}
                          className="text-destructive hover:text-destructive"
                          data-testid={`button-delete-memory-${memory.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Memory Commands Help */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Memory Commands</CardTitle>
              <CardDescription className="text-xs">
                Use these commands in chat to manage memories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <code className="bg-muted px-2 py-1 rounded">./mem &lt;text&gt;</code>
                  <span className="text-muted-foreground">Save text to memory</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-muted px-2 py-1 rounded">./mem chat</code>
                  <span className="text-muted-foreground">Save entire conversation</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-muted px-2 py-1 rounded">./mem last message</code>
                  <span className="text-muted-foreground">Save last message</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}