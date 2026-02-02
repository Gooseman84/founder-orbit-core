import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { TASK_CATEGORIES } from "@/config/taskCategories";

export type TaskCategory = (typeof TASK_CATEGORIES)[number]["id"];

export interface QuickTaskFormValues {
  title: string;
  category_id: TaskCategory;
  xp_reward: number;
}

interface QuickTaskFormProps {
  onSubmit: (values: QuickTaskFormValues) => Promise<void> | void;
  isSubmitting: boolean;
  onCancel?: () => void;
}

export function QuickTaskForm({
  onSubmit,
  isSubmitting,
  onCancel,
}: QuickTaskFormProps) {
  const form = useForm<QuickTaskFormValues>({
    defaultValues: {
      title: "",
      category_id: "other",
      xp_reward: 10,
    },
  });

  const selectedCategory = form.watch("category_id");
  const currentXp = form.watch("xp_reward");

  // Auto-calculate XP when category changes (only if XP hasn't been manually modified)
  useEffect(() => {
    const categoryConfig = TASK_CATEGORIES.find((c) => c.id === selectedCategory);
    if (categoryConfig) {
      const previousCategory = TASK_CATEGORIES.find(
        (c) => c.defaultXp === currentXp
      );
      // Only auto-update if current XP matches a default value
      if (previousCategory || currentXp === 10) {
        form.setValue("xp_reward", categoryConfig.defaultXp);
      }
    }
  }, [selectedCategory]);

  const handleSubmit = async (values: QuickTaskFormValues) => {
    await onSubmit(values);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category Selection */}
        <FormField
          control={form.control}
          name="category_id"
          rules={{
            required: "Category is required",
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TASK_CATEGORIES.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
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
          name="xp_reward"
          rules={{
            required: "XP reward is required",
            min: {
              value: 5,
              message: "XP must be at least 5",
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
                  min={5}
                  max={100}
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value, 10) || 5)
                  }
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
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
        </div>
      </form>
    </Form>
  );
}
