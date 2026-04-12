

# Plan: Temporarily Enable Auto-Confirm for E2E Testing

## What

Enable auto-confirm on email signups so we can create a test account and run through the full Discover → Ideas → Commit → Dashboard flow without needing email verification. Disable it afterward.

## Steps

1. **Enable auto-confirm** using the auth configuration tool (`cloud--configure_auth` with `double_confirm_enabled: false` / auto-confirm enabled)
2. **Navigate to the published app** (`trueblazer.ai/auth`) and create a new test account
3. **Run through the full onboarding flow:**
   - Sign up with a test email
   - Complete the Mavrik Discover interview (all 5 steps)
   - Review generated ideas with market validation
   - Commit to a venture (North Star selection)
   - Verify the Execution Dashboard loads correctly
4. **Disable auto-confirm** to restore the security-hardened email verification requirement
5. **Report findings** — any bugs, broken flows, or UX issues discovered

## Technical Details

- Uses `cloud--configure_auth` to toggle the auto-confirm setting
- Browser tools will be used to interact with the published app
- No code changes required — this is a configuration-only toggle

