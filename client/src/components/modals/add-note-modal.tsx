import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertNote, Note, Tab } from "@shared/schema";

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingNote?: Note | null;
  activeTabId?: string | null;
}

export default function AddNoteModal({ isOpen, onClose, editingNote, activeTabId }: AddNoteModalProps) {
  const [formData, setFormData] = useState<Partial<InsertNote>>({
    title: "",
    content: "",
    tabId: activeTabId,
    isImportant: false
  });

  const { data: tabs = [] } = useQuery<Tab[]>({
    queryKey: ["/api/tabs"],
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Update form data when editing note changes
  useEffect(() => {
    if (editingNote) {
      setFormData({
        title: editingNote.title,
        content: editingNote.content,
        tabId: editingNote.tabId,
        isImportant: editingNote.isImportant
      });
    } else {
      setFormData({
        title: "",
        content: "",
        tabId: activeTabId,
        isImportant: false
      });
    }
  }, [editingNote, activeTabId]);

  const createNoteMutation = useMutation({
    mutationFn: async (note: InsertNote) => {
      return apiRequest("POST", "/api/notes", note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      onClose();
      resetForm();
      toast({
        title: "Note created",
        description: "Your new note has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Note> }) => {
      return apiRequest("PATCH", `/api/notes/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      onClose();
      resetForm();
      toast({
        title: "Note updated",
        description: "Your note has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      tabId: activeTabId
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.content?.trim()) return;

    if (editingNote) {
      updateNoteMutation.mutate({
        id: editingNote.id,
        updates: formData
      });
    } else {
      createNoteMutation.mutate(formData as InsertNote);
    }
  };

  const handleClose = () => {
    onClose();
    if (!editingNote) {
      resetForm();
    }
  };

  const updateFormData = (updates: Partial<InsertNote>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const isLoading = createNoteMutation.isPending || updateNoteMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md mx-auto animate-fade-in" data-testid="add-note-modal">
        <DialogHeader>
          <DialogTitle>
            {editingNote ? "Edit Note" : "Add New Note"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title || ""}
              onChange={(e) => updateFormData({ title: e.target.value })}
              placeholder="Enter note title..."
              data-testid="input-note-title"
            />
          </div>

          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={formData.content || ""}
              onChange={(e) => updateFormData({ content: e.target.value })}
              placeholder="Write your note here..."
              rows={8}
              data-testid="input-note-content"
            />
          </div>


          <div className="flex items-center space-x-2">
            <Checkbox
              id="isImportant"
              checked={formData.isImportant || false}
              onCheckedChange={(checked) => updateFormData({ isImportant: !!checked })}
              data-testid="checkbox-note-important"
            />
            <Label htmlFor="isImportant" className="flex items-center gap-2 cursor-pointer">
              <Star className="w-4 h-4 text-yellow-500" />
              Mark as important
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              className="flex-1"
              data-testid="button-cancel-note"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!formData.title?.trim() || !formData.content?.trim() || isLoading}
              data-testid="button-save-note"
            >
              {isLoading ? "Saving..." : editingNote ? "Update Note" : "Save Note"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
