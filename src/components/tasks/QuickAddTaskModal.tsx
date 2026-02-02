import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Task categories with default XP rewards
const TASK_CATEGORIES = [
  { value: "validation", label: "Validation", defaultXp: 25 },
  { value: "development", label: "Development", defaultXp: 30 },
  { value: "marketing", label: "Marketing", defaultXp: 20 },
  { value: "research", label: "Research", defaultXp: 15 },
  { value: "operations", label: "Operations", defaultXp: 20 },
  { value: "other", label: "Other", defaultXp: 10 },
] as const;

interface QuickAddTaskFormValues {
  title: string;
  category: string;
  xpReward: number;
}

interface QuickAddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: QuickAddTaskFormValues) => Promise<void> | void;
}

export function QuickAddTaskModal({
  isOpen,
  onClose,
  onTaskCreated,
}: QuickAddTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<QuickAddTaskFormValues>({
    defaultValues: {
      title: "",
      category: "other",
      xpReward: 10,
    },
  });

  const handleCategoryChange = (category: string) => {
    form.setValue("category", category);
    const categoryConfig = TASK_CATEGORIES.find((c) => c.value === category);
    if (categoryConfig) {
      form.setValue("xpReward", categoryConfig.defaultXp);
    }
  };

  const handleSubmit = async (values: QuickAddTaskFormValues) => {
    setIsSubmitting(true);
    try {
      await onTaskCreated(values);
      form.reset();
      onClose();
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Quick Add Task
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Task Title */}
            <FormField
              control={form.control}
              name="title"
              rules={{
                required: "Task title is required",
                minLength: {
                  value: 3,
                  message: "Title must be at least 3 characters",
                },
                maxLength: {
                  value: 100,
                  message: "Title must be less than 100 characters",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="What needs to be done?"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Selection */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={handleCategoryChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TASK_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* XP Reward */}
            <FormField
              control={form.control}
              name="xpReward"
              rules={{
                required: "XP reward is required",
                min: {
                  value: 1,
                  message: "XP must be at least 1",
                },
                max: {
                  value: 100,
                  message: "XP cannot exceed 100",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>XP Reward</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Task"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
