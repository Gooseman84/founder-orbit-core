export const TASK_CATEGORIES = [
  { id: "creation", label: "Creation", defaultXp: 15 },
  { id: "execution", label: "Execution", defaultXp: 10 },
  { id: "learning", label: "Learning", defaultXp: 12 },
  { id: "planning", label: "Planning", defaultXp: 8 },
  { id: "other", label: "Other", defaultXp: 10 },
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number]["id"];
