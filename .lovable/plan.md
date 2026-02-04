

# Fix Stripe Webhook Runtime Error

## Problem Identified

Your screenshots show a critical error that's crashing the webhook:

```
event loop error: Error: Deno.core.runMicrotasks() is not supported in this environment
    at Object.core.runMicrotasks (https://deno.land/std@0.177.1/node/_core.ts:23:11)
```

This error occurs because the edge function uses **outdated library versions** that rely on Node.js polyfills no longer supported in the current Supabase/Deno runtime.

## Root Cause

The current imports in `stripe-webhook/index.ts`:

```text
std@0.168.0      ← Outdated Deno standard library
stripe@14.21.0   ← Old Stripe SDK pulling incompatible polyfills
```

These old versions use internal Deno APIs (`Deno.core.runMicrotasks`) that have been removed in newer Deno versions, causing the function to crash after processing.

---

## The Fix

Update all imports to current, stable versions:

| Library | Current Version | Required Version |
|---------|----------------|------------------|
| Deno std | 0.168.0 | **0.190.0** |
| Stripe SDK | 14.21.0 | **18.5.0** |
| Supabase JS | 2.49.1 | **2.57.2** |
| Stripe API | 2023-10-16 | **2025-08-27.basil** |

---

## Implementation

### Single File Change: `supabase/functions/stripe-webhook/index.ts`

**Lines 1-8** - Update imports and API version:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-08-27.basil",
});
```

The rest of the file remains unchanged - only the import versions and API version need updating.

---

## Why This Will Fix It

1. **Deno std@0.190.0** - Uses modern Deno APIs without deprecated Node polyfills
2. **Stripe@18.5.0** - Built for current Deno runtime, no legacy dependencies
3. **Supabase@2.57.2** - Latest stable client compatible with Edge Functions
4. **API version 2025-08-27.basil** - Current stable Stripe API (the `.basil` suffix is the stable version name)

---

## After Implementation

Once deployed, you'll need to test by:
1. Triggering a checkout in your app (click "Subscribe to Pro" on Billing page)
2. Use test card `4242 4242 4242 4242`
3. Check the webhook logs - you should see successful event processing without the runtime error

