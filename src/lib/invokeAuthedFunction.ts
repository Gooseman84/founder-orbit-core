// src/lib/invokeAuthedFunction.ts
// Helper to invoke edge functions with guaranteed user JWT auth header

import { supabase } from "@/integrations/supabase/client";

export class AuthSessionMissingError extends Error {
  code = "AUTH_SESSION_MISSING";
  constructor(message = "No active session. Please sign in again.") {
    super(message);
    this.name = "AuthSessionMissingError";
  }
}

interface InvokeOptions {
  body?: Record<string, unknown>;
}

/**
 * Invokes a Supabase edge function with guaranteed JWT Authorization header.
 * Throws AuthSessionMissingError if no session exists.
 */
export async function invokeAuthedFunction<T = unknown>(
  functionName: string,
  options?: InvokeOptions
): Promise<{ data: T | null; error: Error | null }> {
  // Get current session
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData?.session?.access_token) {
    throw new AuthSessionMissingError();
  }

  const accessToken = sessionData.session.access_token;

  // Invoke with explicit Authorization header
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body: options?.body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return { data, error };
}
