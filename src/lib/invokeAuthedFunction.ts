import { supabase } from "@/integrations/supabase/client";

export class AuthSessionMissingError extends Error {
  constructor(message = "Please sign in again") {
    super(message);
    this.name = "AuthSessionMissingError";
  }
}

export class SubscriptionRequiredError extends Error {
  status: number;
  constructor(message = "This feature requires a Pro subscription", status = 403) {
    super(message);
    this.name = "SubscriptionRequiredError";
    this.status = status;
  }
}

export interface InvokeOptions<T = any> {
  body?: T;
}

/**
 * Sanitize error messages to never show raw technical errors to users.
 * Returns a user-friendly message.
 */
function sanitizeErrorMessage(error: any): string {
  const raw = error?.message || error?.toString() || "";
  
  // Never show these raw messages
  if (raw.includes("Edge Function returned a non-2xx status code") ||
      raw.includes("FunctionsHttpError") ||
      raw.includes("FunctionsRelayError")) {
    return "Something went wrong. Please try again.";
  }
  
  return raw;
}

/**
 * Invokes a Supabase edge function with guaranteed JWT Authorization header.
 * Throws AuthSessionMissingError if no session exists.
 * Throws SubscriptionRequiredError if the function returns 402 or 403 with subscription-related errors.
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

  if (error) {
    // Check if error is subscription-related (402/403)
    const errorMessage = error.message || "";
    const isSubscriptionError = 
      errorMessage.includes("402") || 
      errorMessage.includes("403") ||
      errorMessage.includes("REQUIRES_PRO") ||
      errorMessage.includes("LIMIT_REACHED") ||
      errorMessage.includes("Payment required") ||
      errorMessage.includes("upgrade");
    
    if (isSubscriptionError) {
      const subError = new SubscriptionRequiredError(
        sanitizeErrorMessage(error),
        errorMessage.includes("402") ? 402 : 403
      );
      return { data: null, error: subError };
    }

    // Sanitize the error message for all other errors
    const sanitized = new Error(sanitizeErrorMessage(error));
    sanitized.name = error.name || "Error";
    return { data: null, error: sanitized };
  }

  return { data, error: null };
}
