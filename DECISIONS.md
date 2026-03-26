# Architecture Decision Record: BRIEF.md Contradiction Resolution

*Resolves conflicting requirements identified in BRIEF.md.*

---

## Decision 1: Editing Location

**Conflict:** Sarah (PM) wants the detail page to be the full editing experience. David (Tech Lead) wants the detail page read-only with edits happening inline on the list view.

**Decision: List view inline editing (David's position)**

- The detail page is **read-only** — used for viewing full context, description, history, and metadata.
- All edits (status changes, reassignment, tags, description) happen **inline on the list view**.
- This keeps the component tree simple, avoids complex form state on the detail page, and aligns with David's architectural preference.

**Trade-off accepted:** Users who need to edit descriptions will do so from the list view rather than a dedicated editing page. The inline editing surface must be well-designed to handle this without feeling cramped.

---

## Decision 2: Mutation Strategy

**Conflict:** Sarah (PM) wants instant-feeling interactions with no spinners. Marcus (Eng Lead) wants all mutations server-confirmed before UI updates due to a prior incident where rejected mutations went unnoticed.

**Decision: Optimistic updates with rollback**

- UI updates **immediately** on user action (satisfies Sarah's native-app feel requirement).
- On server rejection, the UI **rolls back** to the previous state and surfaces an error (addresses Marcus's concern about silent failures).
- This requires robust error handling — every mutation must have a defined rollback path and failure notification.

**Trade-off accepted:** There is a brief window where the UI may show a state the server hasn't confirmed. The rollback mechanism must be reliable to avoid the "limbo" scenario Marcus described. Thorough testing of failure paths is critical.

---

## Decision 3: Error Feedback Pattern

**Conflict:** Marcus (Eng Lead) requires clear, unmissable error feedback for every failed operation. Aisha (Designer) wants no alert boxes, red banners, or modal dialogs — the UI should feel calm and graceful.

**Decision: Toast notifications + inline state rollback (combo approach)**

- **Toast:** A non-intrusive toast notification appears on failure, providing clear awareness that something went wrong. Includes a retry/undo action. Auto-dismisses after a few seconds.
- **Inline:** The affected row/item visually rolls back to its previous state, reinforcing that the action didn't persist.
- No modal dialogs, no red alert banners, no aggressive styling.

**Trade-off accepted:** Two feedback channels (toast + inline) add implementation complexity, but ensure errors are both noticeable (Marcus) and non-disruptive (Aisha).

---

## Non-Contradicted Requirements (Agreed by all)

These items from the brief had no conflicts and are carried forward as-is:

| Requirement | Owner | Notes |
|---|---|---|
| Filter state persists across navigation | Aisha | Filters survive detail-page navigation and back-button |
| Deep-linkable filtered views (filters in URL) | Sarah | URL encodes active filters for shareable links |
| Pagination or virtualization on list view | Marcus | Cannot load 2,000+ tickets into DOM |
| Debounced server-side search (<200ms perceived) | Marcus, Aisha | Table stakes per both |
| Minimal chrome, progressive disclosure | Aisha | Essential columns only; more info on hover/detail |
| Lightweight state management (Context or small store) | David | No Redux; data model is small |
| Thin API abstraction over fetch with TS interfaces | David | Clean, typed API layer |
| Mobile-friendly considerations (not this cycle) | Sarah | Don't paint into a corner with layout |
