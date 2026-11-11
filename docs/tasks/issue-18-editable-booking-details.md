# Task: issue #18 — Editable name and contact details in settings

Parent issue: [#18](https://github.com/berkes/boekjehokje/issues/18). Related
ADRs: [ADR-0003](../adr/0003-pure-frontend-tech-stack.md) (localStorage holds
only user preferences — name, contact information, settings — never business
data).

## Status

Implemented on branch `vibe/issue-18-booking-details-0459b8`, on top of `main`.

## What was built

- **Preferences service** (`src/services/preferences/`): the port and service
  gained `getBookerName()` / `saveBookerName(name)`, persisted under the
  `boekjehokje_booker_name` key through the same `KeyValueStorePort` seam as the
  existing booker contact (`boekjehokje_booker_contact`). The string get/save
  logic is now shared privately between the name and the contact; invalid or
  missing data yields `""`, and storage failures stay non-essential (logged and
  swallowed).
- **Settings page** (`src/components/pages/Settings.tsx`): still shows the
  read-only Google profile ("Google-profiel": naam, e-mail, avatar, "Ingelogd
  als …" + "Uitloggen"), and adds an editable "Boekingsgegevens" form (issue
  #18): MUI text fields "Boeker" and "Contact" (helper text "E-mailadres of
  telefoonnummer"), pre-filled from the preferences, falling back to the Google
  profile name/e-mail, and an "Opslaan" button that stores both as preferences
  and confirms with "Boekingsgegevens opgeslagen".
- **Booking form** (`src/components/calendar/BookingForm.tsx`): the "Boeker"
  field is editable (not greyed out) and pre-filled from
  `preferences.getBookerName()`, initially the signed-in user's Google profile
  name until the user changes it; confirming stores the edited name back as the
  preference (next to the last-used contact). When editing an existing booking,
  the field pre-fills from that booking's booker. The "Samenvatting" preview is
  disabled (greyed out). Both booker and contact flow into the standardized
  event format as before: the booker name in the summary ("[short name] |
  [booker]"), the contact in the description. Changes take effect for the next
  booking without re-login, because the form reads the preferences when it
  opens.

The issue text mentions `src/utils/storage.ts` / `src/pages/Settings.tsx` and a
`STORAGE_KEYS.USER_PREFERENCES` seam; those paths predate the service split
(ADR-0007/0008). The current seam is the `KeyValueStorePort` repository of the
preferences service (`LocalStorageAdapter` in production, the central
`InMemoryKeyValueStore` in tests), with the storage keys owned by
`PreferencesService`.

## Tests

- Unit (`deno test`,
  `tests/unit/services/preferences/PreferencesService.test.ts`): booker name
  empty default, save/read round-trip, invalid JSON and non-string stored data
  yield `""`, and the failing-store test now covers the name too.
- E2E (`tests/e2e/tests/settings.spec.ts`, page objects `SettingsPage` /
  `OverviewPage`): "User can set the name and contact used for their bookings" —
  the settings fields pre-fill from the Google profile, saving stores the new
  details, the next booking form is pre-filled with them (booker "Bèr de
  Tester", contact "bèr@voorbeeld.nl", summary preview "03 KH | Bèr de Tester"),
  and confirming writes the POST with that summary and the contact in the
  description. "User can change the booker name in the booking form, which is
  stored as a preference" — the editable "Boeker" field is changed to "Sanne",
  the written POST carries "03 KH | Sanne", and the settings page then shows
  "Sanne" as the saved booker name. The shared form assertion now expects the
  "Boeker" field editable and the "Samenvatting" preview disabled.

## Deliberately out of scope

- Validating the booker name (e.g. requiring a non-empty name) or the contact
  (e-mail vs phone): the form's helper texts already say what is expected; the
  app guides, it does not enforce (ADR-0002).
