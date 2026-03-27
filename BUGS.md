# Bugs Found and Fixed

---

## Bug 1: AbortController created outside useEffect

**File:** `src/hooks/useTicket.ts`

### Root Cause

The `AbortController` was instantiated on every render **outside** the `useEffect` callback (line 10). Each render created a new controller instance, but the `useEffect` closure captured only the controller from that specific render. On cleanup, `controller.abort()` aborted the controller from the render that created the effect — not the one passed to the current in-flight API request. This meant:

- Requests were **never actually cancelled** when the component unmounted or `ticketId` changed
- A new `AbortController` was allocated on every render, even when no fetch was happening
- If `ticketId` changed rapidly, stale responses could resolve and update state for the wrong ticket

### Reproduction Steps

1. Navigate to `/tickets/1` (ticket detail page)
2. Quickly navigate to `/tickets/2` before the first request completes
3. Observe that the request for ticket 1 is **not** aborted (visible in Network tab — no cancelled requests)
4. If ticket 1's response arrives after ticket 2's, the UI briefly shows ticket 1 data on the ticket 2 page

### Fix

Moved the `new AbortController()` call inside the `useEffect` callback so the same controller instance is used for both the fetch and the cleanup.

**Before:**
```typescript
const controller = new AbortController();

useEffect(() => {
  setLoading(true);
  setError(null);
  setTicket(null);

  demoApi.getTicket(ticketId, { signal: controller.signal })
    .then((data) => { /* ... */ })
    .catch((err) => { /* ... */ });

  return () => controller.abort();
}, [ticketId]);
```

**After:**
```typescript
useEffect(() => {
  const controller = new AbortController();

  setLoading(true);
  setError(null);
  setTicket(null);

  demoApi.getTicket(ticketId, { signal: controller.signal })
    .then((data) => { /* ... */ })
    .catch((err) => { /* ... */ });

  return () => controller.abort();
}, [ticketId]);
```

### Test Cases

**Before:** All 3 existing tests in `useTicket.test.ts` passed (the bug is a race condition not easily caught by synchronous unit tests).

**After:** All 3 tests continue to pass. The fix is structurally correct — the controller created inside `useEffect` is the same one passed to the API and aborted on cleanup.

---

## Bug 2: Polling interval never cleaned up (memory leak)

**File:** `src/pages/TicketsListPage.tsx`

### Root Cause

The `useEffect` on line 24 set up a `window.setInterval` to poll for fresh ticket data every 5 seconds, but had **no cleanup function** returning `clearInterval`. When the component unmounted (e.g., navigating to a ticket detail page), the interval continued running in the background, calling `refetch()` on unmounted component state.

This caused:
- Memory leak — interval callback retained references to stale hook state
- Potential "setState on unmounted component" warnings
- Wasted API calls continuing after the user left the page

### Reproduction Steps

1. Open the ticket list page at `/`
2. Wait for polling to start (visible as periodic network requests every 5 seconds)
3. Navigate to `/tickets/1` (detail page)
4. Observe in the Network tab that API calls to `listTickets` continue every 5 seconds even though the list page is no longer mounted

### Fix

Added a cleanup return to the `useEffect` that clears the interval on unmount.

**Before:**
```typescript
useEffect(() => {
  pollRef.current = window.setInterval(() => {
    refetch();
  }, 5000);
}, [refetch]);
```

**After:**
```typescript
useEffect(() => {
  pollRef.current = window.setInterval(() => {
    refetch();
  }, 5000);
  return () => window.clearInterval(pollRef.current);
}, [refetch]);
```

### Test Cases

**Before:** All 3 tests in `TicketsListPage.test.tsx` passed (tests use mocked zero-delay API and don't wait long enough to observe interval behavior).

**After:** All 3 tests continue to pass. The cleanup prevents intervals from leaking across test cases and in production.

---

## Bug 3: Fire-and-forget status toggle with no error handling or rollback

**File:** `src/pages/TicketsListPage.tsx`

### Root Cause

The `handleToggleStatus` function optimistically updated the UI (setting the ticket's `completed` field immediately in local state), then called the API with `.catch(() => {})` — silently swallowing any errors. With the fake API's 8% failure rate, roughly 1 in 12 toggle actions would fail silently, leaving the UI showing a status that did not match the server. The user had no indication anything went wrong.

### Reproduction Steps

1. Open the ticket list page
2. Click "Complete" on a ticket — UI updates immediately (optimistic)
3. If the API call fails (8% chance, or simulate by temporarily setting `failureRate` to 1.0 in `fakeApi.ts`):
   - The UI still shows "Completed" even though the server never recorded the change
   - No error message is displayed
   - Refreshing the page reveals the ticket is still "Open"

### Fix

Added error handling that rolls back the optimistic update on failure and displays an error message to the user.

**Before:**
```typescript
const handleToggleStatus = (ticketId: number, completed: boolean) => {
  setTickets((prev) =>
    prev.map((t) => (t.id === ticketId ? { ...t, completed } : t)),
  );
  // Fire and forget — no rollback on failure, no error display
  demoApi.updateTicketStatus(ticketId, completed).catch(() => {});
};
```

**After:**
```typescript
const [toggleError, setToggleError] = useState<string | null>(null);

const handleToggleStatus = (ticketId: number, completed: boolean) => {
  setTickets((prev) =>
    prev.map((t) => (t.id === ticketId ? { ...t, completed } : t)),
  );
  setToggleError(null);
  demoApi.updateTicketStatus(ticketId, completed).catch(() => {
    // Rollback on failure
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, completed: !completed } : t)),
    );
    setToggleError(`Failed to update ticket #${ticketId}. Please try again.`);
  });
};
```

An error message element was also added to the JSX:
```tsx
{toggleError && <p role="alert">Error: {toggleError}</p>}
```

### Test Cases

**Before:** All 3 tests in `TicketsListPage.test.tsx` passed (tests use zero-failure-rate API so the error path was never exercised).

**After:** All 3 tests continue to pass. The rollback and error display are triggered only on API failure, which does not occur in the test environment.

---

## Bug 4: "User null" shown instead of "Unassigned"

**File:** `src/components/TicketRow.tsx`

### Root Cause

The assignee display logic on line 19 used a single fallback for all cases where the assignee user was not found in the users array:

```tsx
assignee ? assignee.name : `User ${ticket.assigneeId}`
```

When `ticket.assigneeId` is `null` (ticket is unassigned), this renders the string `"User null"` — a confusing and broken-looking display. The code did not distinguish between "no assignee" (`null`) and "assignee not found in user list" (valid ID but missing user).

### Reproduction Steps

1. Open the ticket list page
2. Observe ticket #3 ("Replace keyboard") which has `assigneeId: null`
3. The assignee column shows **"User null"** instead of "Unassigned"

### Fix

Added a null check on `ticket.assigneeId` to show "Unassigned" when there is no assignee, and only fall back to `"User {id}"` when there is an ID but the user is not found.

**Before:**
```tsx
<p>Assignee: {assignee ? assignee.name : `User ${ticket.assigneeId}`}</p>
```

**After:**
```tsx
<p>Assignee: {assignee ? assignee.name : ticket.assigneeId != null ? `User ${ticket.assigneeId}` : 'Unassigned'}</p>
```

### Test Cases

**Before:** The test `shows "User null" when assigneeId is null` asserted the buggy behavior:
```typescript
expect(screen.getByText(/User null/)).toBeInTheDocument();
```

**After:** The test was updated to verify the correct behavior:
```typescript
// Test renamed: 'shows "Unassigned" when assigneeId is null'
expect(screen.getByText(/Unassigned/)).toBeInTheDocument();
```

All 3 tests in `TicketRow.test.tsx` pass after the fix.
