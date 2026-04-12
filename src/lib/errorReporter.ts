import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight error reporter that logs frontend errors to the database.
 * Fire-and-forget — never blocks UI or throws.
 */
export async function reportError({
  error,
  componentName,
}: {
  error: Error;
  componentName?: string;
}) {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id ?? null;

    await supabase.from("error_logs").insert({
      user_id: userId,
      error_message: error.message?.slice(0, 2000) || "Unknown error",
      error_stack: error.stack?.slice(0, 4000) || null,
      component_name: componentName || null,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
    });
  } catch {
    // Silently fail — error reporting should never cause errors
  }
}
