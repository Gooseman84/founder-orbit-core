import { supabase } from "@/integrations/supabase/client";

export class AuthSessionMissingError extends Error {
  constructor(message = "Please sign in again") {
    super(message);
    this.name = "AuthSessionMissingError";
  }
}

export interface InvokeOptions<T = any> {
  body?: T;
}

/**
 * Invokes a Supabase edge function with guaranteed JWT Authorization header.
 * Throws AuthSessionMissingError if no session exists.
 */
export async function invokeAuthedFunction<T = any>(
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
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: options?.body,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return { data, error };
}
