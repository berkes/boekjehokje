# Task: issue #23 — handle authentication errors (expired access token)

Issue: [#23](https://github.com/berkes/boekjehokje/issues/23) (bug: Handle
authentication errors). Related ADRs:
[ADR-0003](../adr/0003-pure-frontend-tech-stack.md) (pure frontend — no backend
for a token exchange),
[ADR-0007](../adr/0007-components-services-ports-adapters.md) (services with
injected dependencies).

## Status

Reproduced on `main` before the fix: with a session older than the ~1 hour
access-token lifetime (or a revoked token), the next calendar fetch failed with
`CalendarApiError` status 401, `useCalendar` put it on the error state, and the
board rendered the raw message ("Fout: ... 401 - Request had invalid
authentication credentials. ..."). The session state still said "logged in", so
the user was stuck half-authenticated: no logout, no Dutch message, no return to
the anonymous homepage, and no silent re-authentication existed.

## What was built

- **Silent re-auth path**: `AuthenticationProviderPort.refreshAccessToken()`
  (GIS token model: `requestAccessToken()` with an empty prompt, bridged in
  `useGoogleLoginFlow.ts` as `requestAccessToken`) implemented by
  `GoogleAuthenticationAdapter`; `AuthenticationServicePort.refreshSession()` in
  `AuthenticationService` persists the fresh tokens (keeping the stored user, or
  fetching the profile when there is none) and returns `false` — discarding the
  stored session — when no token can be issued without interaction.
- **401 recovery in the calendar service**: `CalendarService` now depends on the
  authentication service and wraps every repository operation (`getDay`,
  `createBooking`, `updateBooking`, `deleteBooking`) in `withFreshSession`: on a
  `CalendarApiError` with `statusCode === 401` it calls `refreshSession()` and
  retries the operation exactly once; when the refresh fails or the retry is
  rejected again, it throws `SessionExpiredError` (new, exported from
  `CalendarServicePort`) instead of the raw API error.
- **Proactive expiry check**: already in place and kept —
  `AuthenticationService.loadValidSession()` discards expired sessions on every
  read, and `GoogleCalendarRepositoryAdapter` refuses to send a request without
  a valid token (it throws the 401 before fetching), so data is never fetched
  with a token known to be expired; the new 401 handling then recovers or ends
  the session gracefully.
- **UI path**: `useCalendar` maps `SessionExpiredError` (and, defensively, any
  raw 401) to `useSession().expireSession()`, which signs the user out and sets
  the Dutch message "Je sessie is verlopen. Log opnieuw in."; `AppContent` then
  shows the anonymous homepage, where `Landing` renders the message as an Alert
  next to the login button.

## Refresh tokens? (the issue's research question)

No. The app uses the Google Identity Services **token model** (implicit flow),
which issues only short-lived access tokens and **no refresh tokens** — refresh
tokens belong to the authorization-code flow, which needs a backend to hold the
client secret (contradicting ADR-0003). The available refresh path in a
pure-frontend app is therefore the silent re-request of an access token
(`requestAccessToken()` with `prompt: ""`), which succeeds while the user's
Google session is active and fails otherwise — exactly what `refreshSession()`
implements. Recorded on issue #23 as well.

## Tests

- Unit (`deno test`, all green): `AuthenticationService.refreshSession` (fresh
  tokens stored with the kept user / profile fetched without a stored session /
  failure discards the session and returns false),
  `GoogleAuthenticationAdapter.refreshAccessToken` (normalizes the silent
  response, rejects when no token can be issued), `CalendarService` 401 cases
  (silent refresh + single retry on fetch and on writes, `SessionExpiredError`
  when the refresh fails or the retry 401s, non-401 errors propagate untouched
  with no refresh).
- Integration (`tests/integration/calendar-authentication.test.ts`): real
  `CalendarService` + real `AuthenticationService` over the central fakes — a
  401 with an active provider session stores the fresh token and retries; a 401
  without one discards the session and reports `SessionExpiredError`.
- `deno fmt --check`, `deno lint`, `deno task build` and the CI e2e type-check
  (`deno check tests/e2e/...`) are green. The Playwright suite itself runs in CI
  (no Docker daemon in the agent sandbox); it was not extended with a 401
  scenario because the GIS silent re-request cannot be pointed at the WireMock
  mock.

## Deliberately out of scope

- Moving to the authorization-code flow with a backend-held refresh token:
  rejected in the issue (contradicts ADR-0003).
- Looping retries: a single retry after a successful refresh is enough; further
  401s end the session.
