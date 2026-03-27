# Architecture Decisions

Decisions made after reviewing stakeholder requirements in BRIEF.md, analyzing conflicts, and evaluating the existing codebase patterns.

---

## Conflict 1: Where Editing Happens

**Stakeholders in conflict:** Sarah (PM) vs. David (Tech Lead)
- Sarah wants the detail page to be the full editing surface — one place for all edits.
- David wants the detail page read-only, with edits happening inline on the list view to keep the component tree simple.

**Decision: Dual editing surfaces**

Users should be able to edit fields wherever they see them. If a field is visible on the list view, it should be editable there. If a field is visible on the detail page, it should be editable there. The user shouldn't have to navigate somewhere else to change something they're already looking at.

This means the state management layer needs to be flexible enough to accept edits from either surface and propagate changes consistently. Both views need to be driven by the same underlying state so edits on one surface are immediately reflected if the user navigates to the other.

**Reasoning:** Forcing users to context-switch to a specific page to make edits creates friction. The principle is simple — if you can see it, you can edit it. This satisfies Sarah's ask for a full editing experience on the detail page while preserving David's inline editing on the list view. The key architectural requirement is a shared state layer that both surfaces read from and write to.

---

## Conflict 2: Optimistic Updates vs. Server-Confirmed Updates

**Stakeholders in conflict:** Sarah (PM) vs. Marcus (Engineering Lead)
- Sarah wants interactions to feel instant — no spinners, no waiting.
- Marcus wants all mutations server-confirmed before updating the UI, citing a past incident where rejected updates went unnoticed.

**Decision: Optimistic updates with server validation and retry**

We will use optimistic updates to keep the UI feeling responsive, but add a validation step after each mutation. When the server confirms the update, the UI stays as-is. When the server rejects or fails, the UI reverts the change and surfaces feedback to the user. A retry mechanism will also be available on failure to reduce user frustration from transient errors.

**Reasoning:** The core problem Marcus raised wasn't optimistic updates themselves — it was that failures were silent. Users made changes, the server rejected them, and nobody knew. The fix isn't to make the UI feel slow; it's to make failures visible and recoverable. Optimistic updates with proper revert-on-failure and retry gives us the instant feel Sarah wants while addressing the actual root cause of Marcus's concern (silent failures sitting in limbo).

---

## Conflict 3: Error Presentation

**Stakeholders in conflict:** Marcus (Engineering Lead) vs. Aisha (Designer)
- Marcus demands clear, unmissable error feedback for every failed operation.
- Aisha wants no alert boxes, red banners, or modal dialogs — the UI should feel calm.

**Decision: Minimal, actionable error messages with behind-the-scenes logging**

When an operation fails, the user sees a simple, non-alarming message along the lines of "Action not available — please retry." The message can note that the error has been logged with a reference ID, but the detailed error information stays out of the user's view. Real error logging (stack traces, status codes, request context) happens behind the scenes where engineers can access it.

**Reasoning:** Users don't need to see technical error details — that information is for engineers. Showing a wall of red text doesn't help the user; it just creates anxiety. A calm, actionable message ("something went wrong, here's what you can do") respects Aisha's design sensibility while still satisfying Marcus's requirement that no failure goes unnoticed. The user knows it failed, they can retry, and the engineering team gets the full error context through logging. Everyone's need is met without compromise on either side.

---

## Non-Conflicting Requirements (Agreed)

These items had broad agreement across stakeholders and align with the existing codebase:

| Requirement | Source | Notes |
|---|---|---|
| URL-persisted filters (shareable deep links) | Sarah, Aisha | Filters should live in the URL so views are shareable and survive navigation |
| Filter persistence on back-navigation | Aisha, Sarah | URL-based filters solve this automatically |
| Fast search with debounced input | Marcus, Aisha | Debounced input, target <200ms perceived latency |
| List performance (pagination/virtualization) | Marcus | Don't load thousands of tickets into the DOM |
| Lightweight state management | David | React hooks/context, no heavy libraries |
| Thin API abstraction with TypeScript interfaces | David | Already in place in the existing codebase |
| Minimal chrome, progressive disclosure | Aisha | Tight list view, details on hover or detail page |
| Mobile-aware layout (future cycle) | Sarah | Don't make layout decisions that block mobile later |
