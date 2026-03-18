# Product Brief: Ticketing App Improvements

*Collected notes from our last planning session. These capture what each stakeholder wants for the next iteration of the ticketing tool.*

---

## Sarah (Product Manager)

Users have been telling us the current tool feels sluggish. When someone clicks "Complete" on a ticket, they expect it to just happen — no spinners, no waiting around. It should feel like a native app. We lost two mid-market accounts last quarter partly because people said our tool felt "broken" compared to Linear and Shortcut.

The detail page needs to be the full editing experience. Right now people have to bounce between views to change the description, reassign, update status — it's all scattered. I want someone to open a ticket and be able to do *everything* from that one page. Change the description, reassign it, update the status, add tags. One place, all edits.

Oh — one more thing. Deep-linking to filtered views would be amazing. Like, can the filters live in the URL? I want to be able to Slack someone a link that says "here are all the open P0s assigned to backend team" and have it just work when they click it. Sharable filtered views.

We should also think about mobile at some point. Not this cycle, but let's not paint ourselves into a corner with the layout.

## Marcus (Engineering Lead)

After the incident in November I want to be really clear about this: all mutations need to be server-confirmed before we update the UI. No optimistic updates. We had a case where someone marked three tickets as resolved, the server rejected two of them because of a state machine violation, and the user never knew. Those tickets sat in limbo for a week before anyone noticed. We can't have that again.

Every failed operation has to surface clear feedback to the user. I don't care how we do it — toast, inline message, whatever — but the user must know when something didn't work. We had 40+ support tickets last quarter from people saying "I clicked the button and nothing happened." Silent failures are not acceptable.

On the performance side, the list view needs to load fast. Pagination or virtualization, I don't care which, but we can't be loading 2,000 tickets into the DOM. Search should be snappy too — debounced input with server-side filtering, ideally under 200ms perceived latency.

## Aisha (Designer)

The biggest thing for me is keeping the interface clean. No alert boxes, no red banners, no modal dialogs popping up for errors. That stuff looks dated and panicky. If something goes wrong, handle it gracefully — maybe a subtle inline indicator or a gentle undo pattern. The UI should feel calm.

Filters need to persist when you navigate. If I filter the list to show only my tickets, click into one to read the details, and hit back — my filter should still be there. Losing your place is one of the most frustrating patterns in tools like this. It makes people feel like the app is fighting them.

I'd love to keep the chrome minimal. The list view should be tight — just the essential columns. We can progressive-disclose more info on hover or on the detail page. White space is our friend here.

Also +1 to what Marcus said about search being fast. That's table stakes.

## David (Tech Lead)

From an architecture standpoint, I want to keep the detail page read-heavy. It's where you go to get context — see the full description, the history, who touched it last. But actual edits should happen from the list view. Inline editing on the list keeps things fast and keeps our component tree simple. The detail page is for reading, the list is for doing.

If we try to make the detail page a full editing surface, we're going to end up with a complex form state management problem and a bunch of conditional rendering that makes the page hard to maintain. I've seen this pattern go sideways on three different projects.

For state management, I'd suggest we keep it simple — React context or a lightweight store, nothing heavy. We're not building Jira. The data model is small enough that we don't need Redux or anything like that.

API layer should be a thin abstraction over fetch. TypeScript interfaces for the request/response shapes. Nothing fancy, just clean.
