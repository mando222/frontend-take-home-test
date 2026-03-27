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

---

## Bug 5: Polling + filter change race condition causes UI flicker

**File:** `src/hooks/useTickets.ts`, `src/pages/TicketsListPage.tsx`
**PR:** [#23](https://github.com/mando222/frontend-take-home-test/pull/23) (Closes #17)

### Root Cause

The polling interval called `refetch()` which set `loading: true`, causing the UI to flash "Loading tickets..." every 5 seconds even when data was already displayed. When a user changed filters, the useEffect also set `loading: true`, and if a poll fired simultaneously, both competed to update state — causing rapid loading/data/loading thrashing.

### Reproduction Steps

1. Open the ticket list page at `/`
2. Wait for tickets to load
3. Observe the UI flickers to "Loading..." every 5 seconds when the polling refetch fires
4. Type in the search box — the flickering becomes more pronounced as filter changes and polls overlap

### Fix

Added an optional `showLoadingState` parameter to `refetch()` (defaults to `true`). The polling interval now calls `refetch(false)` so it updates data silently in the background without triggering the loading state.

**Before:**
```typescript
const refetch = () => {
  setLoading(true);
  // ... fetch logic
};

// In TicketsListPage polling:
refetch();
```

**After:**
```typescript
const refetch = (showLoadingState: boolean = true) => {
  if (showLoadingState) {
    setLoading(true);
  }
  // ... fetch logic, conditionally set loading false
};

// In TicketsListPage polling:
refetch(false);
```

### Test Cases

**Before:** No test for silent refetch behavior.

**After:** New test `does not set loading state when refetch is called with showLoadingState=false` verifies that `refetch(false)` keeps `loading` as `false` throughout.

---

## Bug 6: Hardcoded user IDs in REVIEW_ME.tsx assignee dropdown

**File:** `src/REVIEW_ME.tsx`
**PR:** [#24](https://github.com/mando222/frontend-take-home-test/pull/24) (Closes #16)

### Root Cause

The assignee filter dropdown in `TicketDashboard` had hardcoded `<option>` elements for "Victor" (111) and "Priya" (222) instead of fetching users from the API. Also fixed the `reduce()` crash on empty arrays (missing initial accumulator) in the same PR.

### Reproduction Steps

1. Open REVIEW_ME.tsx in the browser (if wired in)
2. Observe the assignee dropdown only shows Victor and Priya regardless of actual user data
3. If users are added/removed from the API, the dropdown becomes stale

### Fix

- Replaced hardcoded options with dynamic rendering from `useUsers()` hook
- Added `disabled` state while users are loading
- Fixed `completionRate` calculation: added initial value `0` to `reduce()` and guarded against division by zero

**Before:**
```tsx
<option value="111">Victor</option>
<option value="222">Priya</option>
```
```typescript
const completionRate = (tickets as any[]).reduce((sum: number, t: any) => sum + (t.completed ? 1 : 0)) / tickets.length;
```

**After:**
```tsx
{users.map((user) => (
  <option key={user.id} value={user.id}>{user.name}</option>
))}
```
```typescript
const completedCount = tickets.filter((t) => t.completed).length;
const completionRate = tickets.length > 0 ? completedCount / tickets.length : 0;
```

### Test Cases

**Before:** No tests for REVIEW_ME.tsx dropdown or completion rate.

**After:** Tests added verifying the dashboard renders without crashing (including empty ticket list) and descriptions render as plain text (XSS fix).

---

## Bug 7: useTicket sets ticket to null on navigation causing brief not-found flash

**File:** `src/hooks/useTicket.ts`, `src/pages/TicketDetailPage.tsx`
**PR:** [#25](https://github.com/mando222/frontend-take-home-test/pull/25) (Closes #21)

### Root Cause

When `ticketId` changed (navigating between ticket detail pages), the `useEffect` in `useTicket.ts` immediately called `setTicket(null)` before making the API request. This caused the detail page to briefly render a "Ticket not found" state while the new ticket was loading, creating an unpleasant flash.

### Reproduction Steps

1. Navigate to `/tickets/1`
2. Wait for ticket 1 to load
3. Click a link to `/tickets/2`
4. Observe a brief flash of "Ticket not found" or empty content before ticket 2 loads

### Fix

Removed `setTicket(null)` from the start of the useEffect. The previous ticket remains visible while the new one loads. `setTicket(null)` is now only called in the error handler (when the requested ticket genuinely does not exist).

**Before:**
```typescript
useEffect(() => {
  const controller = new AbortController();
  setLoading(true);
  setError(null);
  setTicket(null);  // <-- causes flash

  demoApi.getTicket(ticketId, { signal: controller.signal })
    .then((data) => { setTicket(data); setLoading(false); })
    .catch((err) => { setError(err.message); setLoading(false); });
  // ...
```

**After:**
```typescript
useEffect(() => {
  const controller = new AbortController();
  setLoading(true);
  setError(null);
  // setTicket(null) removed — keep previous ticket visible

  demoApi.getTicket(ticketId, { signal: controller.signal })
    .then((data) => { setTicket(data); setLoading(false); })
    .catch((err) => { setError(err.message); setTicket(null); setLoading(false); });
  // ...
```

### Test Cases

**Before:** Test `re-fetches when ticketId changes` did not check intermediate state.

**After:** New tests added:
- `retains previous ticket while new ticket is loading` — verifies ticket is not null during loading
- `does not show "Ticket not found" while loading=true with a stale previous ticket` — component-level test
- `clears stale ticket and shows error when new ticket request fails` — verifies null on real 404

---

## Bug 8: Stale closure in useTickets refetch captures outdated filters

**File:** `src/hooks/useTickets.ts`
**PR:** [#26](https://github.com/mando222/frontend-take-home-test/pull/26) (Closes #15)

### Root Cause

The `refetch` function in `useTickets.ts` was a plain function created on every render. It captured `search` and `assigneeFilter` values from the enclosing closure. When called by the polling `setInterval`, it used the filter values from the render cycle when the interval callback was created — not the current values.

### Reproduction Steps

1. Open the ticket list page
2. Type "monitor" in the search box — list filters to 1 ticket
3. Wait for a poll cycle (5 seconds)
4. Observe the list briefly shows all tickets again before re-filtering (stale filter applied by refetch)

### Fix

Wrapped `refetch` in `useCallback` with `[search, assigneeFilter]` dependencies so it always uses current filter values. The polling effect uses a `refetchRef` to avoid restarting the interval when `refetch` identity changes.

**Before:**
```typescript
const refetch = () => {
  // captures stale search/assigneeFilter from closure
  // ...
};
```

**After:**
```typescript
const refetch = useCallback((showLoadingState: boolean = true) => {
  // always uses current search/assigneeFilter
  // ...
}, [search, assigneeFilter]);
```

### Test Cases

**Before:** No tests for refetch stability or filter correctness after async calls.

**After:** New tests added:
- `refetch uses current filter values when called asynchronously`
- `refetch reference is stable across renders with no filter changes`
- `refetch reference updates when search changes`
- `refetch reference updates when assigneeFilter changes`

---

## Bug 9: Optimistic updates overwritten by stale polling responses

**File:** `src/hooks/useTickets.ts`, `src/pages/TicketsListPage.tsx`
**PR:** [#27](https://github.com/mando222/frontend-take-home-test/pull/27) (Closes #19)

### Root Cause

After clicking "Complete" on a ticket, the UI optimistically updated the ticket's status. However, the 5-second polling interval would then call `refetch()`, which fetched all tickets from the server. The server still had the pre-mutation data (the API call hadn't completed yet), so the poll response overwrote the optimistic update — causing the status to flicker back to the old value.

### Reproduction Steps

1. Open the ticket list page
2. Click "Complete" on a ticket — status updates immediately (optimistic)
3. Wait up to 5 seconds for the next poll cycle
4. Observe the ticket status flickers back to "Open" briefly before the API mutation completes

### Fix

Added a `pendingMutationIdsRef` (Set) to track ticket IDs with in-flight mutations. The `refetch` function now preserves the optimistic state for any ticket whose ID is in the pending set, using a functional `setTickets` updater. `beginMutation(ticketId)` is called before the API call, and `endMutation(ticketId)` is called on success or failure.

**Before:**
```typescript
// In refetch:
setTickets(filtered);  // overwrites everything including optimistic state
```

**After:**
```typescript
// In refetch:
setTickets((prevTickets) => {
  return filtered.map((serverTicket) => {
    if (pendingMutationIdsRef.current.has(serverTicket.id)) {
      const optimistic = prevTickets.find((t) => t.id === serverTicket.id);
      return optimistic ?? serverTicket;
    }
    return serverTicket;
  });
});
```

### Test Cases

**Before:** No tests for optimistic update preservation during polling.

**After:** New tests added:
- `preserves optimistic state for pending mutations during refetch` — verifies optimistic state survives a poll cycle, then server state takes over after `endMutation`
- `continues updating non-mutating tickets during refetch with pending mutation` — verifies other tickets still get fresh server data
- `does not revert optimistic status update when a polling refetch fires during a pending mutation` — full integration test with fake timers

---

## Bug 10: Loading state flicker when ticket list is empty

**File:** `src/hooks/useTickets.ts`, `src/pages/TicketsListPage.tsx`
**PR:** [#28](https://github.com/mando222/frontend-take-home-test/pull/28) (Closes #22)

### Root Cause

When filter changes triggered a new fetch in `useTickets`, `setLoading(true)` was called unconditionally — even when the component already had data displayed. This caused a brief "Loading tickets..." flash before the new filtered results appeared. When filters matched no tickets, users saw "Loading..." then "No tickets match your filters." in rapid succession.

### Reproduction Steps

1. Open the ticket list page — tickets load
2. Type a search term that matches nothing (e.g., "xyzzy")
3. Observe a brief flash of "Loading tickets..." before "No tickets match your filters." appears

### Fix

Added an `isInitialMount` ref that tracks whether this is the first fetch. `setLoading(true)` is only called on the initial mount — subsequent filter changes fetch data in the background without showing the loading state.

**Before:**
```typescript
useEffect(() => {
  setLoading(true);  // always shows loading spinner
  demoApi.listTickets(...)
  // ...
}, [search, assigneeFilter]);
```

**After:**
```typescript
useEffect(() => {
  if (isInitialMount.current) {
    setLoading(true);  // only on first load
  }
  demoApi.listTickets(...)
    .then(() => { isInitialMount.current = false; })
  // ...
}, [search, assigneeFilter]);
```

### Test Cases

**Before:** No test for loading state during filter changes.

**After:** New test `does not set loading=true when filtering already-loaded tickets` verifies that `loading` stays `false` when changing search terms after initial load, and `does not show loading state when filtering to no results` verifies at the component level.

---

## Bug 11: refetch recreated every render causes polling instability

**File:** `src/hooks/useTickets.ts`, `src/pages/TicketsListPage.tsx`
**PR:** [#29](https://github.com/mando222/frontend-take-home-test/pull/29) (Closes #18)

### Root Cause

The `refetch` function was a plain function created on every render (no `useCallback`). The polling `useEffect` in `TicketsListPage` had `[refetch]` in its dependency array. Since `refetch` had a new identity every render, the effect re-ran every render — clearing and recreating the `setInterval` continuously. The polling interval never ran its full 5 seconds.

### Reproduction Steps

1. Open the ticket list page
2. Open the Network tab
3. Observe that `listTickets` requests fire much more frequently than every 5 seconds — essentially on every render

### Fix

Wrapped `refetch` in `useCallback` with `[search, assigneeFilter]` dependencies for stable identity. In `TicketsListPage`, added a `refetchRef` updated via `useLayoutEffect` and changed the polling effect to use the ref with an empty `[]` dependency array, so the interval is set up once and never restarted.

**Before:**
```typescript
// useTickets.ts
const refetch = () => { /* ... */ };

// TicketsListPage.tsx
useEffect(() => {
  pollRef.current = window.setInterval(() => { refetch(); }, 5000);
  return () => window.clearInterval(pollRef.current);
}, [refetch]);  // restarts every render
```

**After:**
```typescript
// useTickets.ts
const refetch = useCallback((showLoadingState = true) => { /* ... */ }, [search, assigneeFilter]);

// TicketsListPage.tsx
const refetchRef = useRef(refetch);
useLayoutEffect(() => { refetchRef.current = refetch; });

useEffect(() => {
  pollRef.current = window.setInterval(() => { refetchRef.current(false); }, 5000);
  return () => window.clearInterval(pollRef.current);
}, []);  // set up once
```

### Test Cases

**Before:** No test for refetch identity stability.

**After:** New test `refetch has stable identity across re-renders when search and assigneeFilter do not change` verifies that the function reference is the same across re-renders.

---

## Bug 12: 8% API failure rate causes erratic error/data flickering with polling

**File:** `src/hooks/useTickets.ts`, `src/pages/TicketsListPage.tsx`
**PR:** [#30](https://github.com/mando222/frontend-take-home-test/pull/30) (Closes #20)

### Root Cause

The fake API has an 8% failure rate. When a polling request failed, the hook immediately set error state and cleared it on the next successful poll — causing error messages to flash on and off every few seconds. Additionally, `setError(null)` was called at the start of every refetch, causing the error to disappear instantly even before the retry completed. There was no backoff, so failures just retried at the same 5-second rate.

### Reproduction Steps

1. Open the ticket list page
2. Wait — roughly 1 in 12 poll cycles will fail
3. Observe an error message appearing briefly then disappearing on the next successful poll
4. The cycle repeats: [data] → [error flash] → [data] → [error flash]

### Fix

Multiple improvements:
- **Exponential backoff**: Added `retryCount` state. After failures, polling skips ticks inside a backoff window (5s, 10s, 20s, 40s cap). Resets to 0 on success.
- **Error persistence**: Error is no longer cleared at the start of a refetch — it persists until a request actually succeeds.
- **Non-intrusive error display**: When tickets are already loaded, polling errors show as a Toast notification instead of replacing the ticket list with a blocking error.
- **`isInitialLoad` flag**: Distinguishes first load (blocking) from subsequent polls (non-blocking).

**Before:**
```typescript
const refetch = () => {
  setLoading(true);
  setError(null);  // clears error immediately
  demoApi.listTickets(...)
    .catch((err) => { setError(err.message); });
};
```

**After:**
```typescript
const refetch = useCallback((showLoadingState = true) => {
  // Error NOT cleared here — only on success
  demoApi.listTickets(...)
    .then(() => { setError(null); setRetryCount(0); })
    .catch((err) => { setError(err.message); setRetryCount((prev) => prev + 1); });
}, [search, assigneeFilter]);

// In TicketsListPage — backoff logic:
useEffect(() => {
  if (retryCount > 0) {
    const backoffMs = Math.min(5000 * Math.pow(2, retryCount - 1), 40000);
    nextPollTimeRef.current = Date.now() + backoffMs;
  }
}, [retryCount]);
```

### Test Cases

**Before:** No tests for error persistence, retry counting, or backoff.

**After:** New tests added:
- `calling refetch does not immediately clear existing error`
- `does not clear error until next request succeeds`
- `increments retryCount on failure and resets to 0 on success`
- `exposes isInitialLoad as false after first fetch completes`
- `ticket list remains visible when error occurs during polling` — integration test verifying the list stays visible and no blocking alert appears
