import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Target, CheckCircle, FileText, Zap, TrendingUp, X } from "lucide-react";
import { useLocation } from "wouter";

interface SearchResult {
  type: 'goal' | 'activity' | 'todo' | 'note' | 'progress';
  id: string;
  title: string;
  content: string;
  tab?: string;
  isCompleted?: boolean;
  relevance: 'high' | 'medium';
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: searchData = { results: [] }, isLoading } = useQuery<{ results: SearchResult[] }>({
    queryKey: ["/api/search", { q: query }],
    enabled: query.length >= 2,
    staleTime: 1000 * 30, // Cache for 30 seconds
  });

  // Clear search when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'goal': return <Target className="w-4 h-4 text-primary" />;
      case 'activity': return <Zap className="w-4 h-4 text-purple-500" />;
      case 'todo': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'note': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'progress': return <TrendingUp className="w-4 h-4 text-orange-500" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'goal': return 'Goal';
      case 'activity': return 'Activity';
      case 'todo': return 'Todo';
      case 'note': return 'Note';
      case 'progress': return 'Progress';
      default: return type;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onOpenChange(false);
    
    // Navigate to the appropriate section
    switch (result.type) {
      case 'goal':
        setLocation('/');
        // Could expand goals section here
        break;
      case 'activity':
        setLocation('/');
        // Could expand activities section here
        break;
      case 'todo':
        setLocation('/');
        // Could expand todos section here
        break;
      case 'note':
        setLocation('/');
        // Could expand notes section here
        break;
      case 'progress':
        setLocation('/');
        break;
      default:
        setLocation('/');
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query || query.length < 2) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-1">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search MyLife
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search goals, todos, notes, activities..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              autoFocus
              data-testid="input-global-search"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 h-6 w-6 p-0"
                onClick={() => setQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {query.length < 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Type at least 2 characters to search</p>
                <p className="text-sm mt-2">Search across goals, todos, notes, activities, and progress entries</p>
              </div>
            ) : isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Searching...</p>
              </div>
            ) : searchData.results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No results found for "{query}"</p>
                <p className="text-sm mt-2">Try different keywords or check your spelling</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchData.results.map((result: SearchResult, index: number) => (
                  <div
                    key={`${result.type}-${result.id}-${index}`}
                    className="p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleResultClick(result)}
                    data-testid={`search-result-${result.type}-${result.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(result.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                            {getTypeLabel(result.type)}
                          </span>
                          {result.tab && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              {result.tab}
                            </span>
                          )}
                          {result.isCompleted && (
                            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                        
                        <h4 className="font-medium text-sm mb-1 truncate">
                          {highlightText(result.title, query)}
                        </h4>
                        
                        {result.content && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {highlightText(result.content, query)}
                          </p>
                        )}
                      </div>
                      
                      {result.relevance === 'high' && (
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}