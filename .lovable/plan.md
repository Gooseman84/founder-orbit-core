

## What Happened

When you navigated away during Implementation Kit generation, the spec validation step likely completed partially or returned malformed data. The `spec_validation` JSON stored in the database exists (so it passes the `null` check), but its `flags` array is `undefined`. When the component tries to read `flags.length`, it crashes with "Cannot read properties of undefined (reading 'length')" — and since there's no recovery path, the error boundary traps you on the error screen.

## Fix

Add defensive defaults in the `SpecValidationSection` component so it gracefully handles incomplete or malformed validation data instead of crashing.

### File: `src/components/implementationKit/SpecValidationSection.tsx`

**Change the destructuring on line 50 from:**
```typescript
const { approvedForExecution, flags } = validation;
```

**To:**
```typescript
const approvedForExecution = validation?.approvedForExecution ?? false;
const flags = validation?.flags ?? [];
```

This ensures:
- If `validation` is somehow `undefined`/`null` (defensive), it won't crash
- If `flags` is missing from the stored JSON, it defaults to an empty array
- If `approvedForExecution` is missing, it defaults to `false` (shows "Review Ambiguities" badge, which is the safe default)

No other files need to change. Once this is deployed, the page will render without crashing and you'll be able to navigate normally again.
