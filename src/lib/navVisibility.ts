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

  // ALWAYS accessible sections - these are needed to select/create ventures
  // Users must NEVER be blocked from these pages
  const alwaysAccessible: NavSection[] = [
    "idea-lab",
    "fusion-lab", 
    "radar",
  ];

  // When executing: focused on execution but flexible
  // Allow contextual tools (blueprint, workspace, venture-review)
  // Ideation surfaces are accessible but softly discouraged
  if (ventureState === "executing") {
    return {
      allowed: [
        ...commonSections,
        ...alwaysAccessible, // Always allow ideation access
        "tasks",
        "workspace",
        "blueprint",
        "venture-review",
      ],
      hidden: [], // Nothing is hidden, just not emphasized
      redirectTo: "/tasks",
    };
  }

  // When reviewed: soft guidance toward review
  // Allow reference tools (blueprint, workspace read-only)
  // Ideation surfaces are accessible for planning next moves
  if (ventureState === "reviewed") {
    return {
      allowed: [
        ...commonSections,
        ...alwaysAccessible, // Always allow ideation access
        "venture-review",
        "blueprint",
        "workspace",
        "tasks", // Allow viewing past tasks
      ],
      hidden: [], // Nothing is hidden
      redirectTo: "/venture-review",
    };
  }

  // When inactive, committed, killed, or null: full access to ideation/planning surfaces
  // This is the default state for users without an active venture
  // They need access to Idea Lab, North Star, etc. to SELECT/CREATE ventures
  // "inactive" | "committed" | "killed" | null
  return {
    allowed: [
      ...commonSections,
      ...alwaysAccessible, // Always allow ideation access - CRITICAL
      "blueprint",
      "workspace",
      "tasks", // Allow viewing tasks in discovery mode
    ],
    hidden: [
      "venture-review", // Only show venture review when executing/reviewed
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
  "/tasks": "tasks",
  "/venture-review": "venture-review",
  
  // Create section (ideation)
  "/ideas": "idea-lab",
  "/fusion-lab": "fusion-lab",
  "/radar": "radar",
  
  // Build section
  "/blueprint": "blueprint",
  "/workspace": "workspace",
  
   // System section (always allowed)
  "/context-inspector": "context-inspector",
  "/profile": "profile",
  "/billing": "billing",
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
 * SOFT GUIDANCE MODE:
 * - Public routes always allowed
 * - Known routes checked against allowed list
 * - For executing/reviewed: only block ideation surfaces, allow contextual tools
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
  // For executing state: allow unknown routes (soft guidance, not strict blocking)
  // This prevents "locked room" feelings
  if (ventureState === "executing") {
    return true;
  }
  
  // When reviewed, be slightly stricter but still allow navigation
  if (ventureState === "reviewed") {
    console.warn(`[navVisibility] Unknown route "${path}" in reviewed state - allowing with soft guidance`);
    return true;
  }
  
  // For other states (inactive, killed, null), allow unknown routes
  return true;
}

/**
 * Check if a route is an ideation surface that should be blocked during execution
 */
export function isIdeationRoute(path: string): boolean {
  const section = findSectionForPath(path);
  const ideationSections: NavSection[] = ["idea-lab", "fusion-lab", "radar"];
  return section !== null && ideationSections.includes(section);
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
    return "You're currently executing a venture. Finish or review it before exploring new ideas.";
  }
  if (ventureState === "reviewed") {
    return "Complete your venture review before exploring new ideas.";
  }
  return "This section is not available in your current state.";
}
