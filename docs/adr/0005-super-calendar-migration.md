# Replace DayPilot Lite with super-calendar for the resource calendar view

|           |                          |
| --------- | ------------------------ |
| Status    | approved                 |
| Date      | 2026-10-26               |
| Deciders  | berkes                   |
| Consulted | Vibe Code agent          |
| Informed  | boekjehokje contributors |

## Context and Problem Statement

[ADR-0003](0003-pure-frontend-tech-stack.md) chose DayPilot Lite
(`@daypilot/daypilot-lite-react`) as the calendar component: a free, open-source
resource calendar with rooms as columns and time as rows. In practice the free
Lite edition is too limiting: styling requires a custom CSS override bridge in
`src/App.scss` (the `calendar_default_*` classes ignore the MUI theme),
per-event customization is gated behind `onBeforeEventRender` hooks, and some of
the edit affordances we render (the edit/delete buttons calling
`e.data.delete()` / `e.data.edit()`) only exist as full APIs in the commercial
Pro edition, so they are effectively non-functional in our build. The upcoming
editing features ([ADR-0004](0004-editability-ownership.md), persistence in
[issue #14](https://github.com/berkes/boekjehokje/issues/14)) need per-event
drag-and-drop, cross-room moves, and styling control that Lite makes hard or
impossible.

[Issue #24](https://github.com/berkes/boekjehokje/issues/24) reopens the
calendar-component choice with hands-on experience and asks for a researched
comparison against the app's actual requirements, instead of a feature-matrix
driven one. This ADR is that comparison.

Which library replaces DayPilot Lite for the room-booking calendar, and how do
we keep every existing feature?

## Decision Drivers

Requirements taken from what the wrapper actually uses today
(`src/components/calendar/Calendar.tsx` + `utils.tsx`), plus what
[issue #13](https://github.com/berkes/boekjehokje/issues/13) and
[issue #14](https://github.com/berkes/boekjehokje/issues/14) will need:

- Rooms-as-columns resource view: one column per room, time as rows, one
  selected day ([ADR-0002](0002-hybrid-booking-workflow.md)).
- Pressing an event opens the booking sidebar.
- Drag-and-drop moving of own events, within a room and across rooms.
- Per-event styling: grey out non-editable bookings
  ([ADR-0004](0004-editability-ownership.md)).
- Custom header rendering for room columns (name plus description).
- Dutch locale and date formats ([ADR-0002](0002-hybrid-booking-workflow.md)).
- Themable to match MUI, so the calendar does not look outdated.
- TypeScript support; works with React 19, Vite and the Deno toolchain.
- Free / open-source (or a license the project can accept).
- Keep the E2E suite of
  [ADR-0001](0001-playwright-e2e-and-agent-browser-testing.md) working: it
  targets the accessibility tree, not DayPilot internals.

## Considered Options

- Stay on DayPilot Lite and work around its limits with more CSS and hooks (the
  baseline).
- DayPilot Pro (commercial).
- super-calendar (`@super-calendar/dom`, `ResourceTimeline` view).
- react-big-calendar.
- react-big-schedule.
- FullCalendar (open-source core).
- Headless/calendar-core libraries (schedule-x).
- MUI X Scheduler (the recently released MUI calendar components).
- Custom-built calendar component.

## Decision Outcome

Chosen option: **super-calendar (`@super-calendar/dom`)**, because its
`ResourceTimeline` is an MIT-licensed one-day scheduling board (a lane per room,
drag-to-move across lanes, edge resize) that covers the resource view, the
per-event editability, and the cross-room drag we need, and it themes through a
token object so the custom CSS bridge can be removed.

This ADR amends the calendar-component choice of
[ADR-0003](0003-pure-frontend-tech-stack.md); the rest of that stack (React 19,
MUI, Google Calendar as source of truth, Deno toolchain) is unchanged.

### How super-calendar scores against the requirements

| Requirement                              | super-calendar                                                                                                                                                                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rooms-as-columns board, one day          | `ResourceTimeline` with `orientation="vertical"`: hour axis down, one column per room                                                                                                                                                       |
| Event press opens the sidebar            | `onPressEvent`; events are real `<button>`s                                                                                                                                                                                                 |
| Drag own events, within and across rooms | `onDragEvent` reports the drop lane (room), edge-resize included; per-event `draggable: false` locks others' bookings                                                                                                                       |
| Per-event styling                        | Generic `CalendarEvent<T>` carries the booking; `renderEvent` styles editable vs. read-only                                                                                                                                                 |
| Custom room headers                      | `renderResourceHeader` (name plus description, full text as tooltip)                                                                                                                                                                        |
| Dutch locale                             | The board's own labels are locale-neutral hour numbers; all Dutch text stays in our components (`CalendarToolbar` already renders Dutch labels via `Intl`/`nl-NL`); views that render dates take a date-fns `locale` if we adopt them later |
| Themable to match MUI                    | `theme` prop (`Partial<DomCalendarTheme>`) mapped from the MUI palette; no custom CSS                                                                                                                                                       |
| TypeScript, React 19, Vite, Deno         | Typed API, pure react-dom package, React 18+ peers, installs fine with `deno add`                                                                                                                                                           |
| Free / open-source                       | MIT                                                                                                                                                                                                                                         |
| E2E (ADR-0001)                           | Events are `<button>`s with `aria-label`s, so the accessibility tree keeps working; see below                                                                                                                                               |

### Migration and E2E impact

- DayPilot is confined to `src/components/calendar/Calendar.tsx` and
  `src/components/calendar/utils.tsx` (the anti-corruption layer). The switch
  touches exactly those two files (plus `App.scss`, which loses the CSS bridge,
  and the unit tests for the mapping helpers).
- `BookingSidebar`, `CalendarToolbar` and `RoomVisibiltyControls` are
  calendar-agnostic and are reused as-is.
- The working port lives on this branch; it doubles as the hands-on prototype
  issue #24 asks for (its "no production changes in this ticket" constraint was
  explicitly relaxed by the decider for this round).
- The [ADR-0001](0001-playwright-e2e-and-agent-browser-testing.md) Playwright
  suite targets the accessibility tree, not DayPilot internals: super-calendar
  renders each event as a focusable `<button>` with an `aria-label`, so
  role/name-based selectors survive. Any selector still targeting
  `calendar_default_*` classes or DayPilot's DOM structure must be updated; that
  needs a pass over the E2E suite before release.

### Consequences

- Good, because the calendar is themed via `DomCalendarTheme` tokens derived
  from the MUI palette; `src/App.scss` loses its DayPilot override block.
- Good, because `CalendarEvent<T>` is generic and `renderEvent` lets us render
  MUI components (buttons, tooltips) inside an event bar without fighting
  third-party DOM hooks.
- Good, because overlapping events in the same room stack into side-by-side
  sub-lanes instead of hiding behind each other.
- Good, because `onDragEvent` reports the drop lane, enabling cross-room moves
  for the editing feature, and can reject a drop (`return false`) for read-only
  bookings.
- Bad, because the react-dom renderer is young (v2.x) and adds two peer
  dependencies (`date-fns`, `@legendapp/list`).
- Bad, because `ResourceTimeline` renders exactly one day; a multi-day room
  board would need a different view or composition.
- Bad, because known rough edges remain: the icon buttons inside event bars are
  pointer-only (nested real buttons are invalid HTML inside the library's event
  `<button>`), drag-and-drop of own bookings stays visual-only until issue #14,
  and the bundle grows.

## Features That Must Be Re-implemented

The existing DayPilot build provides the following features; each maps to
super-calendar as listed. None are dropped.

1. **Resource board view**: DayPilot `viewType: "Resources"` (rooms as columns,
   time as rows, one selected day). Replaced by `ResourceTimeline` with
   `orientation="vertical"` (hour axis down the left, one column per room,
   columns flex to share width), controlled via the `date` prop.
2. **Date navigation**: the previous/today/next and week-quick-buttons toolbar
   (`CalendarToolbar`) is our own MUI component operating on plain `Date`s; it
   stays as-is and drives `ResourceTimeline`'s controlled `date`.
3. **Room visibility controls**: the chip row that hides/shows room columns,
   persisted in `localStorage` (`RoomVisibiltyControls`, `useRoomVisibility`,
   `roomVisibility.ts`), stays unchanged; it now filters the `resources` array.
   Hiding every room remains allowed (empty board).
4. **Room headers with description**: DayPilot's `onBeforeHeaderRender` HTML
   (name plus truncated description as subtitle/tooltip). Replaced by
   `renderResourceHeader`, rendering MUI `Typography` with a `title` attribute
   for the full description; the Unknown room keeps its short label and long
   description.
5. **Event mapping**: bookings become `CalendarEvent<BookingEventMeta>`: `title`
   = booker or summary, `start`/`end` = plain `Date`s (the `toDayPilotString`
   timezone-less string conversion is no longer needed), `resourceId` = room
   canonical name; the booking itself and its editability travel along in the
   generic meta so callbacks can find the domain object.
6. **Editability distinction** ([ADR-0004](0004-editability-ownership.md)): the
   same `isEditable(booking, profile)` predicate from the services layer tags
   each event; read-only events get a muted grey look, the user's own events a
   green highlight, applied via `renderEvent` instead of the `editable` CSS
   class.
7. **Event buttons (info, edit, delete)**: DayPilot's `onBeforeEventDomAdd`
   injected MUI `IconButton`s calling `e.data.edit()` / `e.data.delete()`.
   Replaced by a custom `renderEvent` that renders the event content and the
   buttons with our own handlers. Note: the DayPilot calls were non-functional
   in Lite (no such API); our handlers are UI-level now and become real once
   persistence ([issue #14](https://github.com/berkes/boekjehokje/issues/14))
   lands. The info button keeps opening the booking sidebar.
8. **Drag-to-move/resize for own bookings (UI-only)**: DayPilot globally
   disabled editing and re-enabled `moveDisabled`/`resizeDisabled` per owned
   event. Replaced by `onDragEvent` (with `dragStepMinutes` snapping), which
   returns `false` for non-owned bookings and applies local, non-persisted
   changes for owned ones — same "UI only, no Google Calendar API writes"
   behavior as today. Cross-lane drops re-target the room (`resourceId`), the
   groundwork for issue #14.
9. **Event tooltip**: the booking summary as tooltip. Replaced by a `title`
   attribute in the custom event renderer.
10. **Booking sidebar**: clicking an event opens `BookingSidebar` — inline panel
    on desktop, `Drawer` on mobile. Unchanged; wired through `onPressEvent` and
    `findBooking`.
11. **Loading, error, empty states**: `CalendarView` fetches rooms via
    `useCalendar` and renders MUI states around the board. Unchanged.
12. **24-hour clock axis**: DayPilot `timeFormat: "Clock24Hours"`; the default
    axis labels of `ResourceTimeline` are 24-hour (`ampm` stays off).
13. **Bounded hour window**: the DayPilot grid spanned the full day from 00:00,
    which pushed the working day below the fold on short screens. The board now
    sets `startHour` to 08:00 (super-calendar's built-in window, no manual
    scrolling), keeping the default `endHour` (24) so late bookings stay
    reachable by scrolling; bookings before 08:00 fall outside the visible
    window.
14. **Unknown room special-casing**: the Unknown room is always ordered last,
    labelled by short name, with its long description (`utils.tsx`). These
    helpers stay unchanged.

Features we gain for free (accepted replacements for hand-built equivalents):

- Side-by-side sub-lanes for overlapping bookings in one room.
- Screen-reader labels and keyboard focus on events (each event is a button;
  Enter/Space opens it), documented by super-calendar's accessibility guide.
- `businessHours` shading and now-indicator support if we want them later.

## Validation

- `deno test` covers the new mapping helpers (rooms to resources, bookings to
  events, editable flag, drag overrides, theme mapping) — the same pure-function
  surface as before.
- `deno lint` and `deno task build` (tsc + vite build) pass; the type check
  covers the `@super-calendar/dom` integration.
- Manual check on `deno task dev` (http://localhost:5173/): board layout, room
  chips, sidebar, drag of own bookings, read-only look of others'.
- A pass over the [ADR-0001](0001-playwright-e2e-and-agent-browser-testing.md)
  E2E suite to update any DayPilot-specific selectors is still open.

## Pros and Cons of the Options

### Stay on DayPilot Lite and work around its limits (baseline)

- Good, because no migration work.
- Good, because the current UX already works.
- Bad, because the CSS override bridge in `App.scss` fights the component and
  breaks on DayPilot class-name changes.
- Bad, because per-event styling and DOM injection go through
  `onBeforeEventRender`/`onBeforeEventDomAdd` hooks that Lite keeps limiting.
- Bad, because the edit/delete affordances we already render are non-functional
  (Lite lacks the `delete()`/`edit()` event APIs those buttons call).

### DayPilot Pro (commercial)

- Good, because all Lite gaps (theming, event editing, customization) close.
- Bad, because a commercial license contradicts the low-cost, open-source driver
  of [ADR-0003](0003-pure-frontend-tech-stack.md).

### super-calendar (`@super-calendar/dom`)

- Good, because `ResourceTimeline` is exactly our board (rooms as lanes, one
  day, vertical orientation), MIT-licensed.
- Good, because theming is a token object (`DomCalendarTheme`, `mergeDomTheme`),
  so MUI palette colors apply without custom CSS.
- Good, because `renderEvent` and the generic `CalendarEvent<T>` make per-event
  UI and editability first-class.
- Good, because drag-to-move and edge-resize work on the web renderer, drops
  report the target lane, and can be rejected per event.
- Good, because it is a pure react-dom package (no React Native runtime) with
  React 19-compatible peers.
- Bad, because a young library (v2.x, single maintainer) carries bus-factor and
  API-churn risk; the anti-corruption layer in `components/calendar/` keeps that
  risk contained.
- Bad, because two extra peer dependencies (`date-fns`, `@legendapp/list`).

### react-big-calendar

- Good, because mature, widely used, and resource columns via `resources` /
  `resourceIdAccessor` / `resourceTitleAccessor`.
- Good, because drag-and-drop exists via the `withDragAndDrop` addon and styling
  is fully open (SASS), so it can be rethemed to match MUI.
- Good, because the date-fns localizer gives Dutch dates.
- Bad, because its resource support is thinner than DayPilot's (the long-running
  resource-view discussion in the project's own tracker), so the
  rooms-as-columns core requirement is the riskiest of all options.
- Bad, because matching MUI means overriding a lot of SASS — the same custom CSS
  treadmill we want to leave behind.

### react-big-schedule

- Good, because a free MIT resource scheduler with a timeline, drag-and-drop,
  and a "material" look.
- Bad, because it styles through its own CSS and themes, not the MUI theme, so
  it repeats the DayPilot problem of fighting a foreign look.
- Bad, because single-maintainer, and TypeScript/React-19 support is less proven
  than the alternatives.

### FullCalendar (open-source core)

- Good, because very mature and well-documented.
- Bad, because the resource-timeline views sit behind paid premium plugins
  ("Vertical Resource View" and "Timeline View" start at $480) — the exact
  paywall problem issue #24 tries to escape.
- Bad, because the free core's resource views are limited, so it fails the
  cross-room drag requirement.

### Headless/calendar-core libraries (schedule-x)

- Good, because modern, responsive and internationalized; the open-source core
  is MIT.
- Bad, because its resource scheduler is a paid premium component, so the
  rooms-as-columns requirement is again paywalled.
- Bad, because everything else (theming to MUI, event affordances) would be
  assembled by hand on top of the core.

### MUI X Scheduler

- Good, because it is MUI's own calendar: theming matches the app by default,
  and the MIT-licensed Event Calendar core claims views, resources,
  drag-and-drop, resizing and theming.
- Bad, because it is brand new; its resource story and single-day
  rooms-as-columns board are unproven for our case, and advanced scheduling
  features sit in the premium tier.
- Neutral, because worth re-evaluating in a year if super-calendar disappoints —
  not a candidate to bet the MVP on today.

### Custom-built calendar component

- Good, because exactly what we need, no dependency.
- Bad, because the calendar is the core of the app; building and maintaining it
  is the largest possible risk (also rejected in
  [ADR-0003](0003-pure-frontend-tech-stack.md)).

## More Information

- Research ticket:
  [issue #24: Research DayPilot Lite alternatives for the calendar
  view](https://github.com/berkes/boekjehokje/issues/24) — close it once this
  ADR is accepted and the final choice is made.
- super-calendar docs: <https://super-calendar.afonsojramos.me/>
- Resource timeline guide:
  <https://super-calendar.afonsojramos.me/guides/resource-timeline>
- Theming guide: <https://super-calendar.afonsojramos.me/guides/theming>
- react-dom renderer guide: <https://super-calendar.afonsojramos.me/guides/dom>
- Repository: <https://github.com/afonsojramos/super-calendar>
- Installation uses the Deno toolchain
  (`deno add npm:@super-calendar/dom
  date-fns @legendapp/list`), per AGENTS.md
  — never npm.
- Editability rules: [ADR-0004](0004-editability-ownership.md); persistence of
  edits: [issue #14](https://github.com/berkes/boekjehokje/issues/14).
