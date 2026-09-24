# Agent Guide for boekjehokje

## Tech Stack Overview

- **Runtime**: Deno with Vite
- **Frontend**: React 19+ with TypeScript
- **UI**: Material-UI (MUI) v9 with TypeScript
- **Calendar**: FullCalendar with TypeScript
- **State**: React Context API with typed hooks
- **Auth**: Google OAuth 2.0
- **API**: Google Calendar API
- **Storage**: Google Calendar for events, localStorage for user preferences
- **Testing**: Jest + React Testing Library
- **Hosting**: statichost.eu via GitLab CI

## Project Structure

```
.
├── docs/              # Project documentation
│   ├── tech_stack.md   # Stack rationale
│   ├── project_plan.md # Features, scope, timeline
│   └── workflow.md     # Booking workflow details
├── src/               # Source code
│   ├── App.tsx         # Main application
│   ├── main.tsx        # Entry point
│   └── assets/         # Static assets
├── public/            # Static files
├── package.json       # Dependencies & scripts
├── vite.config.ts     # Vite configuration
└── tsconfig.json      # TypeScript configuration
```

## TypeScript Best Practices

### Do

- Use `deno install` etc to manage packages. This will change package.json, but
  we never edit package.json manually.
- Use `deno run` to run commands
- Define interfaces for all props, API responses, and context values
- Prefer `type` for simple unions, `interface` for object shapes
- Use `as const` for static value arrays/objects
- Export types alongside components (`export type { Props }`)
- Use generics for reusable hooks/components

### Don't

- Use npm, npx or other runners. Only use deno.
- Use `any` - prefer `unknown` if type is truly dynamic
- Use type assertions (`as Type`) without validation
- Ignore ESLint `@typescript-eslint` rules
- Mix `interface` and `type` for the same concept

## MUI Best Practices

### Do

- Use MUI components directly (not custom wrappers)
- Rely on MUI's default styling; set up MUI by default for all UI
- Leverage `sx` prop for simple styling overrides
- Define theme in a central file with TypeScript support
- Use `useMediaQuery` for responsive layouts
- Customize default props via theme for consistency

### Don't

- Deeply nest MUI components unnecessarily
- Write custom CSS unless an explicit exception is made
- Override MUI base styles without design system rationale
- Create custom components when MUI provides equivalent
- Inline complex styles - extract to theme or styled()

## Dos and Don'ts

### Do

- Follow the pure frontend architecture (Google Calendar = source of truth)
- Keep UI in Dutch as specified in project plan
- Guide users visually, don't enforce rules strictly
- Use localStorage only for user preferences, not business data
- Write type-safe API interactions with Google Calendar

### Don't

- Implement admin dashboards (out of scope for MVP)
- Add email or in-app notifications (per project plan)
- Store event data anywhere but Google Calendar
- Block direct Google Calendar usage by users
- Add features without updating corresponding docs

### Code Quality

- Components: Small, single-responsibility, typed props
- Hooks: Reusable, typed, prefixed with `use`
- Tests: Type-safe, alongside implementation files
- Commits: Follow conventional commits (feat, fix, docs, etc.)

## Getting Started

```bash
deno task dev
deno task build
deno task lint
```

## Releasing

Releases are cut from `main` as tags. A tag triggers the `build.yml` workflow,
which builds and deploys to GitHub Pages.

To cut a release:

1. Make sure `main` is up to date and the working tree is clean:
   ```bash
   git -C <repo> checkout main
   git -C <repo> pull --ff-only origin main
   ```
2. Bump `"version"` in `package.json` to the new `x.y.z` (semver). Only the
   version field changes; do not hand-edit other `package.json` entries.
3. Commit and tag, then push both to `origin`:
   ```bash
   git -C <repo> add package.json
   git -C <repo> commit -m "chore: release vX.Y.Z"
   git -C <repo> tag vX.Y.Z
   git -C <repo> push origin main
   git -C <repo> push origin vX.Y.Z
   ```

The pushed tag is what deploys: once `refs/tags/vX.Y.Z` is on `origin`, the CI
build/deploy jobs run automatically. Confirm a release lands on `main` before
tagging, and verify the GitHub Pages deploy succeeds after pushing the tag.
