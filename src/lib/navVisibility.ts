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
  | "venture-review"
  | "public"; // For public routes that don't require venture state checks

interface NavVisibility {
  allowed: NavSection[];
  hidden: NavSection[];
  redirectTo: string;
}

// Public routes that should NEVER be blocked by venture state
const PUBLIC_ROUTES = [
  "/",
  "/auth",
  "/reset-password",
  "/terms",
  "/privacy",
  "/onboarding",
  "/onboarding/extended",
  "/onboarding/interview",
];

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

  // When reviewed: FORCE review completion before anything else
  // Only review page + essential system pages allowed
  if (ventureState === "reviewed") {
    return {
      allowed: [
        "home",
        "daily-pulse",
        "venture-review",
        "profile",
        "billing",
        "context-inspector",
      ],
      hidden: [
        "tasks",
        "workspace",
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
 * Complete mapping of all application paths to their nav sections.
 * Every protected route MUST be listed here.
 */
const pathToSection: Record<string, NavSection> = {
  // Now section
  "/dashboard": "home",
  "/daily-reflection": "daily-pulse",
  "/tasks": "tasks",
  "/venture-review": "venture-review",
  
  // Create section (ideation)
  "/ideas": "idea-lab",
  "/fusion-lab": "fusion-lab",
  "/radar": "radar",
  
  // Build section
  "/blueprint": "blueprint",
  "/workspace": "workspace",
  
  // Align section
  "/north-star": "north-star",
  
  // System section (always allowed)
  "/context-inspector": "context-inspector",
  "/profile": "profile",
  "/billing": "billing",
  
  // Other protected routes that should map to existing sections
  "/feed": "home",
  "/pulse": "daily-pulse",
  "/pulse/history": "daily-pulse",
  "/reflection/history": "daily-pulse",
  "/weekly-review": "daily-pulse",
  "/streak": "home",
};

/**
 * Check if a path is a public route that bypasses venture state checks
 */
function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(publicPath => 
    path === publicPath || path.startsWith(publicPath + "/")
  );
}

/**
 * Find the matching section for a given path.
 * Handles both exact matches and dynamic routes (e.g., /ideas/:id)
 */
function findSectionForPath(path: string): NavSection | null {
  // Check for exact match first
  if (pathToSection[path]) {
    return pathToSection[path];
  }
  
  // Check for base path match (handles dynamic routes like /ideas/:id, /workspace/:id)
  const basePaths = Object.keys(pathToSection);
  for (const basePath of basePaths) {
    if (path.startsWith(basePath + "/")) {
      return pathToSection[basePath];
    }
  }
  
  return null;
}

/**
 * Check if a specific route is allowed for a given venture state.
 * 
 * STRICT MODE for executing state:
 * - Public routes always allowed
 * - Known routes checked against allowed list
 * - UNKNOWN routes are BLOCKED (redirected to /tasks)
 */
export function isRouteAllowed(path: string, ventureState: VentureState | null): boolean {
  // Public routes are always allowed
  if (isPublicRoute(path)) {
    return true;
  }
  
  const visibility = getNavVisibility(ventureState);
  const section = findSectionForPath(path);
  
  // If we found a matching section, check if it's allowed
  if (section) {
    return visibility.allowed.includes(section);
  }
  
  // UNKNOWN ROUTE HANDLING:
  // When executing, be STRICT - unknown routes are blocked
  // This prevents bypass via obscure or new routes
  if (ventureState === "executing") {
    console.warn(`[navVisibility] Unknown route "${path}" blocked in executing state`);
    return false;
  }
  
  // When reviewed, also be strict
  if (ventureState === "reviewed") {
    console.warn(`[navVisibility] Unknown route "${path}" blocked in reviewed state`);
    return false;
  }
  
  // For other states (inactive, committed, killed, null), allow unknown routes
  // These are typically exploration states where flexibility is okay
  return true;
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
