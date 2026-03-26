# Code Review: `src/REVIEW_ME.tsx`

---

## 1. XSS Vulnerability via `dangerouslySetInnerHTML`

**Severity: CRITICAL**

**Line 71:**
```tsx
<div dangerouslySetInnerHTML={{ __html: ticket.description }} />
```

Rendering user-supplied `ticket.description` as raw HTML opens a direct Cross-Site Scripting (XSS) attack vector. Any unsanitized input (e.g. `<script>` tags, event handlers like `onerror`) will execute arbitrary JavaScript in the user's browser.

**Fix:** Remove `dangerouslySetInnerHTML` and render as plain text, or sanitize with a library like DOMPurify before injection.

---

## 2. `reduce` Missing Initial Accumulator — Runtime Crash

**Severity: CRITICAL**

**Line 127:**
```tsx
(tickets as any[]).reduce((sum: number, t: any) => sum + (t.completed ? 1 : 0)) / tickets.length;
```

Two problems:
- **No initial value for `reduce`.** When `tickets` is empty, this throws a `TypeError: Reduce of empty array with no initial value`, crashing the component on every render when there are no tickets.
- **When `tickets` has one element**, `sum` is the ticket object itself (not `0`), producing `"[object Object]0"` or `NaN`.

Additionally, `tickets.length` can be `0`, causing a division by zero (`NaN`).

**Fix:** Provide an initial value of `0` and guard against empty arrays:
```tsx
const completionRate = tickets.length
  ? tickets.reduce((sum, t) => sum + (t.completed ? 1 : 0), 0) / tickets.length
  : 0;
```

---

## 3. Infinite Re-fetch Loop from Unstable `useEffect` Dependency

**Severity: HIGH**

**Lines 93–111:**
```tsx
const filterConfig = { status: statusFilter, assignee: assigneeFilter };

useEffect(() => {
  // ...fetch logic...
}, [filterConfig]);
```

`filterConfig` is a new object on every render, so `Object.is` referential equality always fails. This causes the `useEffect` to fire on **every single render**, creating an infinite loop of API calls: fetch -> setState -> re-render -> new filterConfig -> fetch again.

The `eslint-disable` comment on line 111 hides this bug from the linter.

**Fix:** Depend on the primitive values directly:
```tsx
useEffect(() => { ... }, [statusFilter, assigneeFilter]);
```

---

## 4. Duplicate / Conflicting Filter State (Tabs vs. Dropdown)

**Severity: MEDIUM**

The hook `useTicketData` exposes `activeTab` (line 37) and the dashboard has a separate `statusFilter` (line 88). Both represent status filtering but are independent states. Changing the tab buttons does not update `statusFilter` (which actually drives the fetch), and changing the dropdown does not update `activeTab` (which controls visual highlighting). The tabs are purely cosmetic and misleading.

**Fix:** Unify into a single source of truth for status filtering.

---

## 5. Event Bus is an Anti-Pattern in React

**Severity: MEDIUM**

**Lines 9–28:**

The `TicketEventBus` bypasses React's data flow model. Child-to-parent communication should use callback props or shared state (context, state management library). The event bus:
- Makes data flow hard to trace and debug.
- Uses `unknown` types, losing type safety (note the `id as number, completed as boolean` casts on line 116).
- Creates implicit coupling between components with no compile-time guarantees.

**Fix:** Pass an `onToggle` callback prop to `TicketCard` instead.

---

## 6. Unsafe Type Casting and `any` Usage

**Severity: MEDIUM**

**Lines 125–127:**
```tsx
(tickets as any[]).reduce((sum: number, t: any) => sum + (t.completed ? 1 : 0))
```

Casting to `any[]` discards type safety. `tickets` is already `Ticket[]` — there is no reason to cast. This also silences TypeScript errors that would have caught the missing `reduce` initial value.

**Line 115–116:** The event bus handler receives `unknown` types and casts them unsafely with `as number` / `as boolean` with no runtime validation.

**Fix:** Remove the `any` casts and use properly typed interfaces.

---

## 7. Keyboard Shortcut Conflicts

**Severity: LOW**

**Lines 41–44:**
```tsx
if (e.key === 'n' && e.metaKey) setModalOpen(true);
```

`Cmd+N` is a standard browser shortcut (new window). Intercepting it without `e.preventDefault()` causes both the modal to open *and* a new browser window to appear. Hijacking standard browser shortcuts is poor UX and may not work at all in some browsers.

**Fix:** Choose a non-conflicting shortcut, or at minimum call `e.preventDefault()` and ensure it only fires when not typing in an input field.

---

## 8. No Error State Exposed to the User

**Severity: LOW**

**Lines 107–109:**
```tsx
.catch((err) => {
  console.error('Failed to load tickets:', err);
  setLoading(false);
});
```

API errors are silently swallowed. The user sees loading finish but gets an empty list with no indication anything went wrong.

**Fix:** Add an `error` state and render an error message when the fetch fails.

---

## 9. No Cleanup / Abort for In-Flight Requests

**Severity: LOW**

**Lines 96–111:**

If filters change rapidly, multiple concurrent fetch calls race with no cancellation. Stale responses can overwrite fresher data.

**Fix:** Use an `AbortController` or a stale-request flag in the effect cleanup.

---

## 10. Inline Styles Throughout

**Severity: LOW**

Every component uses inline `style` objects, which are re-created on each render, cannot be cached by the browser, and make theming/consistency harder to maintain.

**Fix:** Extract to CSS modules, a stylesheet, or a CSS-in-JS solution.

---

## Summary

| #  | Issue                                    | Severity |
|----|------------------------------------------|----------|
| 1  | XSS via `dangerouslySetInnerHTML`        | CRITICAL |
| 2  | `reduce` crash on empty/single-item array| CRITICAL |
| 3  | Infinite fetch loop (unstable dependency)| HIGH     |
| 4  | Duplicate conflicting filter state       | MEDIUM   |
| 5  | Event bus anti-pattern                   | MEDIUM   |
| 6  | Unsafe `any` casts                       | MEDIUM   |
| 7  | Browser shortcut conflict                | LOW      |
| 8  | Silent API error handling                | LOW      |
| 9  | No fetch cancellation on re-render       | LOW      |
| 10 | Inline styles everywhere                 | LOW      |
