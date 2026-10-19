# Project Plan for "boekjehokje"

> **Note**: This plan has been brought up to date with the current state of
> the project. Items are marked as **Implemented** or refer to the GitHub
> issue that tracks the remaining work. Architecture decisions now live in
> `docs/adr/`; this document is scheduled for removal once the issues below
> are confirmed.

## Overview

The goal of this project is to create a web app called "boekjehokje" that
simplifies the process of booking meeting rooms in the NYMA Makersplaats. The
app will integrate with Google Calendar to provide a structured and
user-friendly interface for managing room bookings while allowing users to
continue using Google Calendar directly if they prefer.

## Key Adjustments Based on Feedback

**Status**: Implemented — these adjustments are settled scope, recorded in
AGENTS.md and the ADRs.

1. **No Strict Rule Enforcement**:
   - The tool should guide users but not enforce rules strictly.
   - Users can still write to the underlying Google Calendar directly.

2. **No Email or In-App Notifications**:
   - Focus on simplicity and ease of use.

3. **No Admin Dashboard (Yet)**:
   - Keep the initial scope minimal and focused on the core booking
     functionality.

4. **Pure Frontend Approach**:
   - Store event data in Google Calendar.
   - Use localStorage for user-related data.

5. **Focus on Ease of Use**:
   - The tool should be easier to use than Google Calendar.
   - Guide users to do the right thing without strict enforcement.

## Proposed Solution

The "boekjehokje" web app will:

1. **Integrate with Google Calendar** — **Implemented** (read path):
   - Use OAuth for authentication.
   - Fetch and display events from the shared Google Calendar.

2. **Provide a Structured UI** — **Implemented**:
   - Offer a clean and intuitive interface for booking rooms.
   - Use Dutch language for the UI.

3. **Guide Users** — **Open**:
   - Suggest available time slots — #17.
   - Provide visual cues for conflicts or double bookings — #16.

4. **Optional Usage** — **Implemented**: direct Google Calendar usage is
   unaffected by the design (Google Calendar remains the source of truth).

## Key Features

1. **User Authentication**:
   - Google OAuth for secure login — **Implemented**.
   - Allow users to set or change their name and contact information —
     **Open**, #18.

2. **Room Management** — **Implemented**:
   - List available rooms and their schedules.
   - Fetch room data from Google Calendar.

3. **Booking System**:
   - View available time slots for each room — **Implemented**.
   - Book a room by selecting a time slot — **Open**: needs the write API
     (#14) and the booking form (#15).
   - Visual cues for conflicts or double bookings — **Open**, #16.

4. **Local Storage** — **Implemented**:
   - Store user preferences and settings in localStorage.

## Technical Stack

**Status**: Implemented — decided in
[ADR-0003](adr/0003-pure-frontend-tech-stack.md): React 19 with TypeScript,
MUI, DayPilot Lite, Google OAuth, Google Calendar API, localStorage; Deno +
Vite as the toolchain.

## Testing Strategy

1. **Unit Testing** — **Implemented** (services, parser, calendar utils;
   Deno test runner):
   - Test individual frontend components.
   - ~~Use tools like Jest or React Testing Library~~ — Deno's built-in test
     runner is used instead.

2. **Integration Testing** — **Superseded**: covered by the E2E suite with
   mocked Google APIs (ADR-0001), no separate integration layer.

3. **End-to-End Testing** — **Open**, #19: decided in
   [ADR-0001](adr/0001-playwright-e2e-and-agent-browser-testing.md)
   (Playwright); implementation pending.

4. **Automated Testing Pipeline** — **Partially implemented**: GitHub
   Actions runs fmt, lint and build on every push/PR; running the unit
   tests in CI is missing — #20.

## Hosting and Deployment Strategy

**Status**: Implemented — GitHub Pages, deployed by GitHub Actions on tags
(releases are cut as `vX.Y.Z` tags; see AGENTS.md "Releasing").

## Additional Questions for Discussion

**Status**: Resolved or superseded by the ADRs; no separate tracking needed.

1. **Rooms and Resources** — resolved: rooms are configured in
   `src/services/rooms.ts` (specific rooms plus interchangeable
   "Kletshokken").
2. **Design Guidelines** — resolved: MUI defaults (AGENTS.md).
3. **Language Support** — resolved: Dutch for now (ADR-0002).
4. **User Roles and Permissions** — resolved: none for the MVP; any
   authenticated user may book.
5. **Booking Workflow** — decided in
   [ADR-0002](adr/0002-hybrid-booking-workflow.md): hybrid room-first and
   time-first booking.
6. **Analytics and Reporting** — out of scope for the MVP (see "Key
   Adjustments").
7. **Accessibility Requirements** — no specific requirements recorded;
   MUI defaults apply.
8. **Timeline** — superseded: continuous releases from `main` via tags.

## Tasks

1. **Setup and Authentication** — **Implemented**:
   - Initialize the project with React.js and TypeScript.
   - Set up Google OAuth for user authentication.
   - Implement localStorage for storing user preferences.

2. **Integrate Google Calendar API** — **Implemented** (read-only):
   - Fetch events from the shared Google Calendar.
   - Display events in the app's UI.

3. **Design and Implement UI** — **Partially implemented**:
   - Create a Dutch-language interface — done.
   - Implement a calendar view for booking rooms — done.
   - Add forms for booking and managing rooms — **Open**: booking form
     #15, edit/delete UI for own events #13.

4. **Add Booking Logic** — **Open**:
   - Validate bookings to prevent conflicts — #16 (guide, do not enforce).
   - Enforce booking rules (e.g., no overlapping events) — superseded:
     per the feedback above, conflicts are signalled, never blocked.

5. **Testing** — **Partially implemented**:
   - Write unit tests for frontend components — done (domain-level).
   - Write integration tests for Google Calendar API interactions —
     superseded by the mocked E2E suite (#19).
   - Write end-to-end tests for user flows — **Open**, #19.
   - Run tests on every push to main — **Open**, #20.

6. **Deployment** — **Implemented**:
   - Deploy the frontend to GitHub Pages.
   - Set up continuous deployment using GitHub Actions (on tags).

## Next Steps

Superseded: the plan is agreed and being executed. Remaining work is tracked
in the GitHub issues referenced above; see also open issues #12
(AuthenticationService refactor) and #13 (editable "my" events).
