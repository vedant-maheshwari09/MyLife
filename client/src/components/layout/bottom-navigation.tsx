import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, CheckSquare, FileText } from "lucide-react";

const navigationItems = [
  {
    path: "/",
    label: "Home",
    icon: Home,
    testId: "nav-home"
  },
  {
    path: "/todos",
    label: "To-Dos",
    icon: CheckSquare,
    testId: "nav-todos"
  },
  {
    path: "/notes",
    label: "Notes",
    icon: FileText,
    testId: "nav-notes"
  }
];

export default function BottomNavigation() {
  const [location, navigate] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border">
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map(({ path, label, icon: Icon, testId }) => {
            const isActive = location === path;
            
            return (
              <Button
                key={path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(path)}
                className={`flex flex-col items-center gap-1 py-2 px-4 h-auto ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                data-testid={testId}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
