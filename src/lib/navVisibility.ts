import type { VentureState } from "@/types/venture";

export type NavSection = 
  | "home"
  | "tasks"
  | "idea-lab"
  | "blueprint"
  | "workspace"
  | "profile"
  | "billing"
  | "venture-review"
  | "public";

interface NavVisibility {
  allowed: NavSection[];
  hidden: NavSection[];
  redirectTo: string;
}

const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/reset-password",
  "/terms",
  "/privacy",
];

export function getNavVisibility(ventureState: VentureState | null): NavVisibility {
  const commonSections: NavSection[] = ["home", "profile", "billing"];
  const alwaysAccessible: NavSection[] = ["idea-lab"];

  if (ventureState === "executing") {
    return {
      allowed: [...commonSections, ...alwaysAccessible, "tasks", "workspace", "blueprint", "venture-review"],
      hidden: [],
      redirectTo: "/tasks",
    };
  }

  if (ventureState === "reviewed") {
    return {
      allowed: [...commonSections, ...alwaysAccessible, "venture-review", "blueprint", "workspace", "tasks"],
      hidden: [],
      redirectTo: "/venture-review",
    };
  }

  return {
    allowed: [...commonSections, ...alwaysAccessible, "blueprint", "workspace", "tasks"],
    hidden: ["venture-review"],
    redirectTo: "/dashboard",
  };
}

const pathToSection: Record<string, NavSection> = {
  "/dashboard": "home",
  "/tasks": "tasks",
  "/venture-review": "venture-review",
  "/ideas": "idea-lab",
  "/blueprint": "blueprint",
  "/workspace": "workspace",
  "/profile": "profile",
  "/billing": "billing",
};

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(publicPath => 
    path === publicPath || path.startsWith(publicPath + "/")
  );
}

function findSectionForPath(path: string): NavSection | null {
  if (pathToSection[path]) return pathToSection[path];
  const basePaths = Object.keys(pathToSection);
  for (const basePath of basePaths) {
    if (path.startsWith(basePath + "/")) return pathToSection[basePath];
  }
  return null;
}

export function isRouteAllowed(path: string, ventureState: VentureState | null): boolean {
  if (isPublicRoute(path)) return true;
  const visibility = getNavVisibility(ventureState);
  const section = findSectionForPath(path);
  if (section) return visibility.allowed.includes(section);
  return true;
}

export function isIdeationRoute(path: string): boolean {
  const section = findSectionForPath(path);
  return section === "idea-lab";
}

export function getRedirectPath(ventureState: VentureState | null): string {
  return getNavVisibility(ventureState).redirectTo;
}

export function getLockedMessage(ventureState: VentureState | null): string {
  if (ventureState === "executing") return "You're currently executing a venture. Finish or review it before exploring new ideas.";
  if (ventureState === "reviewed") return "Complete your venture review before exploring new ideas.";
  return "This section is not available in your current state.";
}
