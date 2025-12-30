import type { VentureState } from "@/types/venture";

export type NavSection = 
  | "home"
  | "daily-pulse" 
  | "tasks"
  | "idea-lab"
  | "fusion-lab"
  | "radar"
  | "blueprint"
  | "workspace"
  | "north-star"
  | "context-inspector"
  | "profile"
  | "billing"
  | "venture-review";

interface NavVisibility {
  allowed: NavSection[];
  hidden: NavSection[];
  redirectTo: string;
}

/**
 * Single source of truth for navigation visibility based on venture state.
 * This controls which nav items are shown and which routes are accessible.
 */
export function getNavVisibility(ventureState: VentureState | null): NavVisibility {
  // Default sections available to all states
  const commonSections: NavSection[] = [
    "home",
    "daily-pulse",
    "profile",
    "billing",
    "context-inspector",
  ];

  // When executing: ONLY execution surfaces
  if (ventureState === "executing") {
    return {
      allowed: [
        ...commonSections,
        "tasks",
        "workspace",
      ],
      hidden: [
        "idea-lab",
        "fusion-lab",
        "radar",
        "blueprint",
        "north-star",
        "venture-review",
      ],
      redirectTo: "/tasks",
    };
  }

  // When reviewed: route to review page
  if (ventureState === "reviewed") {
    return {
      allowed: [
        ...commonSections,
        "venture-review",
        "workspace",
      ],
      hidden: [
        "tasks",
        "idea-lab",
        "fusion-lab",
        "radar",
        "blueprint",
        "north-star",
      ],
      redirectTo: "/venture-review",
    };
  }

  // When inactive or committed: ideation/planning surfaces, NO tasks
  // "inactive" | "committed" | "killed" | null
  return {
    allowed: [
      ...commonSections,
      "idea-lab",
      "fusion-lab",
      "radar",
      "blueprint",
      "workspace",
      "north-star",
    ],
    hidden: [
      "tasks",
      "venture-review",
    ],
    redirectTo: "/dashboard",
  };
}

/**
 * Check if a specific route is allowed for a given venture state
 */
export function isRouteAllowed(path: string, ventureState: VentureState | null): boolean {
  const visibility = getNavVisibility(ventureState);
  
  // Map paths to nav sections
  const pathToSection: Record<string, NavSection> = {
    "/tasks": "tasks",
    "/ideas": "idea-lab",
    "/fusion-lab": "fusion-lab",
    "/radar": "radar",
    "/blueprint": "blueprint",
    "/workspace": "workspace",
    "/north-star": "north-star",
    "/venture-review": "venture-review",
    "/dashboard": "home",
    "/daily-reflection": "daily-pulse",
    "/profile": "profile",
    "/billing": "billing",
    "/context-inspector": "context-inspector",
  };

  // Find matching section for the path
  const matchingPath = Object.keys(pathToSection).find(p => 
    path === p || path.startsWith(p + "/")
  );

  if (!matchingPath) {
    // Unknown path - allow by default (might be dynamic route)
    return true;
  }

  const section = pathToSection[matchingPath];
  return visibility.allowed.includes(section);
}

/**
 * Get the redirect path when accessing a forbidden route
 */
export function getRedirectPath(ventureState: VentureState | null): string {
  return getNavVisibility(ventureState).redirectTo;
}

/**
 * Get a user-friendly message explaining why a route is locked
 */
export function getLockedMessage(ventureState: VentureState | null): string {
  if (ventureState === "executing") {
    return "This section is locked while you're in execution mode. Focus on your current tasks.";
  }
  if (ventureState === "reviewed") {
    return "Complete your venture review before accessing this section.";
  }
  return "This section is not available in your current state.";
}
