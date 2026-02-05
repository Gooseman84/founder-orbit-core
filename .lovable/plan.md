
# Fix Auto-Scroll in Mavrik Interview Chat

## Problem

When Mavrik asks new questions and the user responds, the chat dialogue stays static at its current scroll position. Users must manually scroll down to see new messages, which creates a poor conversational experience.

## Solution

Add auto-scroll behavior that smoothly scrolls to the bottom of the chat whenever new messages appear.

---

## Implementation

### File: `src/pages/OnboardingInterview.tsx`

**Change 1: Add a scroll anchor ref**

Create a ref that points to an invisible element at the bottom of the message list:

```text
const scrollAnchorRef = useRef<HTMLDivElement>(null);
```

**Change 2: Add useEffect to trigger scroll**

Watch for changes to `transcript` and `asking` state, then scroll to the anchor:

```text
useEffect(() => {
  // Scroll to bottom when transcript changes or when AI is thinking
  scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
}, [transcript, asking]);
```

**Change 3: Add scroll anchor element**

Place an invisible div at the end of the message list, inside the ScrollArea:

```text
{/* Messages render here... */}

{asking && (
  <div>Thinking about the next question...</div>
)}

{/* Scroll anchor - always at the bottom */}
<div ref={scrollAnchorRef} />
```

---

## Why This Works

1. **scrollIntoView**: Native browser API that smoothly scrolls an element into the visible area
2. **behavior: "smooth"**: Creates a nice animated scroll instead of jarring jumps
3. **Trigger on transcript change**: Fires when user sends answer or AI responds
4. **Trigger on asking change**: Fires when "Thinking..." message appears

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Line ~19 | Add `scrollAnchorRef` ref |
| After line ~68 | Add `useEffect` for auto-scroll |
| Line ~276 (after asking indicator) | Add invisible scroll anchor div |

---

## User Experience After Fix

1. User types answer and clicks "Send"
2. Their message bubble appears and chat auto-scrolls to show it
3. "Thinking about the next question..." appears, chat scrolls to show it
4. Mavrik's next question appears, chat smoothly scrolls to reveal it

The conversation will always stay at the bottom, just like any modern chat interface.
