import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import BottomNavigation from "@/components/layout/bottom-navigation";
import AddNoteModal from "@/components/modals/add-note-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit3, Trash2, X, FileText, Edit, Search, Star, CalendarIcon, SortAsc } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Note, Tab } from "@shared/schema";

export default function Notes() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [longPressedTab, setLongPressedTab] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortFilter, setSortFilter] = useState<"latest" | "important-latest">("latest");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const { data: allTabs = [] } = useQuery<Tab[]>({
    queryKey: ["/api/tabs"],
  });

  // Filter tabs to only show notes tabs
  const tabs = allTabs.filter(tab => tab.type === 'notes');

  // Filter and sort notes based on active tab, search query, and sort filter
  const filteredNotes = notes
    .filter(note => {
      // First filter by tab
      const matchesTab = activeTabId === null || note.tabId === activeTabId;
      
      // Then filter by search query
      if (!searchQuery.trim()) {
        return matchesTab;
      }
      
      const query = searchQuery.toLowerCase();
      const matchesSearch = note.title.toLowerCase().includes(query) || 
                           note.content.toLowerCase().includes(query);
      
      return matchesTab && matchesSearch;
    })
    .sort((a, b) => {
      if (sortFilter === "important-latest") {
        // First sort by importance, then by latest
        if (a.isImportant !== b.isImportant) {
          return a.isImportant ? -1 : 1; // Important notes first
        }
      }
      // Sort by latest (most recent first)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({
        title: "Note deleted",
        description: "Your note has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTabMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tabs/${id}`);
    },
    onSuccess: (_, deletedTabId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tabs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      if (activeTabId === deletedTabId) {
        setActiveTabId(null);
      }
      toast({
        title: "Tab deleted",
        description: "Tab and its notes have been deleted successfully.",
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

  const createTabMutation = useMutation({
    mutationFn: async (name: string) => {
      // Generate a random color for the new tab
      const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      return apiRequest("POST", "/api/tabs", { name, color, type: 'notes' });
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

  const handleCreateTab = () => {
    if (!newTabName.trim()) return;
    createTabMutation.mutate(newTabName.trim());
  };

  const deleteNote = (id: string) => {
    deleteNoteMutation.mutate(id);
  };

  const editNote = (note: Note) => {
    setEditingNote(note);
    setIsAddModalOpen(true);
  };

  const handleTabClick = (tabId: string | null) => {
    setActiveTabId(tabId);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingNote(null);
  };

  // Notes are already sorted in filteredNotes

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-md mx-auto px-4 pb-20">
        
        <div className="flex items-center justify-between py-6">
          <h1 className="text-2xl font-semibold text-foreground">Notes</h1>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6" data-testid="tabs-navigation">
          {/* Search Bar and Filter */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-notes"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <SortAsc className="w-4 h-4 text-muted-foreground" />
              <Select value={sortFilter} onValueChange={(value: "latest" | "important-latest") => setSortFilter(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="important-latest">Important, then Latest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="tab-container">
            {/* All Notes Tab */}
            <button
              onClick={() => handleTabClick(null)}
              className={`tab-button ${activeTabId === null ? 'active' : ''}`}
              data-testid="tab-all-notes"
            >
              <FileText className="w-4 h-4" />
              All Notes ({notes.length})
            </button>
            
            {/* Custom tabs */}
            {tabs.filter(tab => !tab.isDefault).map((tab) => {
              const tabNoteCount = notes.filter(note => note.tabId === tab.id).length;
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
                        {tab.name} ({tabNoteCount})
                      </button>
                      
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Tab Button */}
            {isAddingTab ? (
              <div className="flex items-center gap-2">
                <input
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  placeholder="Tab name"
                  className="w-32 h-8 text-sm px-3 border rounded-full bg-background"
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
                <button
                  onClick={handleCreateTab}
                  disabled={!newTabName.trim() || createTabMutation.isPending}
                  className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 transition-all"
                  data-testid="button-confirm-tab"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setIsAddingTab(false);
                    setNewTabName("");
                  }}
                  className="px-3 py-1 text-sm border rounded-full hover:bg-muted"
                  data-testid="button-cancel-tab"
                >
                  ✕
                </button>
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

        {/* Notes List */}
        <div className="space-y-4" data-testid="notes-list">
          {notes.length === 0 ? (
            <div className="bg-card rounded-xl p-8 border border-border text-center">
              <p className="text-muted-foreground">Start capturing your thoughts and ideas</p>
            </div>
          ) : (
            filteredNotes.map((note: Note) => (
              <div key={note.id} className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-shadow" data-testid={`note-item-${note.id}`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-card-foreground line-clamp-1 flex-1">
                    {note.title}
                  </h3>
                  {note.isImportant && (
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 ml-2 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                  {note.content}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarIcon className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                    </span>
                    {note.createdAt !== note.updatedAt && (
                      <span className="text-muted-foreground/70">(edited)</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editNote(note)}
                      className="text-xs text-primary hover:text-primary/80 transition-colors p-1"
                      data-testid={`button-edit-${note.id}`}
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-xs text-destructive hover:text-destructive/80 transition-colors p-1"
                      data-testid={`button-delete-${note.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </main>

      {/* Floating Add Button */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-40 hover:scale-105"
        data-testid="button-add-note-floating"
      >
        <Plus className="w-6 h-6" />
      </button>

      <BottomNavigation />

      <AddNoteModal
        isOpen={isAddModalOpen}
        onClose={closeModal}
        editingNote={editingNote}
        activeTabId={activeTabId}
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
                {notes.filter(note => note.tabId === longPressedTab).length} notes
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
                  if (tab && window.confirm(`Delete "${tab.name}" tab and all its notes?`)) {
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
