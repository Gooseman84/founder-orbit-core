import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface QuickAddTaskFabProps {
  onClick: () => void;
  className?: string;
}

export function QuickAddTaskFab({ onClick, className }: QuickAddTaskFabProps) {
  const { user } = useAuth();

  // Only show when authenticated
  if (!user) return null;

  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "h-12 w-12 md:h-14 md:w-14 rounded-full",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        "shadow-lg hover:shadow-xl shadow-primary/30",
        "transition-all duration-200 ease-out",
        "hover:scale-110 active:scale-95",
        className
      )}
      aria-label="Add new task"
    >
      <Plus className="h-5 w-5 md:h-6 md:w-6" />
    </Button>
  );
}
