# Skill: Attach a screenshot of GUI changes to a PR

## When to use this skill

Use this skill whenever a change alters the GUI: styling, layout, new or
modified components, themes, copy shown in the UI, or any other graphical
change. The pull request for such a change must include a screenshot of the new
or changed part, so reviewers can see the result without running the app.

Skip this skill for changes that cannot affect the rendered UI, such as
documentation, CI config, or refactors that leave the DOM and styles untouched.

## Overview

1. Install Deno if it is not available.
2. Install the Playwright Chromium browser.
3. Run the dev server with Deno.
4. Take a headless screenshot of the changed part with Playwright.
5. Attach the screenshot to the PR with `gh pr create --attach` or
   `gh pr comment --attach`.

## 1. Install Deno

The app runs on Deno (see AGENTS.md). Check for it first:

```bash
deno --version
```

If Deno is missing, install it with npm:

```bash
npm install -g deno
```

If npm refuses to install globally because of permissions (`EACCES`), install
into a user-writable prefix instead:

```bash
npm config set prefix ~/.local
npm install -g deno
export PATH="$HOME/.local/bin:$PATH"
```

Do not use npm, npx, or any other runner for anything except installing Deno
itself. All project commands run through Deno.

## 2. Install the Playwright browser

Playwright needs a one-time download of the headless Chromium binary. Run this
from a scratch directory outside the repository, so the repo's `package.json`
and `deno.lock` are not modified:

```bash
mkdir -p /tmp/screenshot && cd /tmp/screenshot
deno run -A npm:playwright@1.63.0 install chromium --with-deps
```

This downloads Chrome Headless Shell to `~/.cache/ms-playwright/` and only needs
to be repeated when the Playwright version changes.

## 3. Run the app

From the repository root, install dependencies and start the dev server:

```bash
cd <repository-root>
deno install
deno task dev
```

The command is defined in `package.json` as `vite`. It prints the local URL when
ready, by default `http://127.0.0.1:5173/`. Read the exact port from the
`Local:` line in the output. Keep the server running in the background while
taking the screenshot; stop it afterwards.

## 4. Take the screenshot

Write a small Playwright script in a scratch directory outside the repository
(so no Playwright dependency enters `package.json` or `deno.lock`):

```bash
mkdir -p /tmp/screenshot && cd /tmp/screenshot
cat > screenshot.ts <<'EOF'
import { chromium } from "npm:playwright@1.63.0";

const url = Deno.args[0] ?? "http://127.0.0.1:5173/";
const out = Deno.args[1] ?? "screenshot.png";
const selector = Deno.args[2]; // optional: element to capture

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
});
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(500); // let animations and fonts settle

if (selector) {
  const element = await page.$(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  await element.screenshot({ path: out });
} else {
  await page.screenshot({ path: out, fullPage: true });
}

await browser.close();
console.log(`Saved ${out}`);
EOF
deno run -A screenshot.ts http://127.0.0.1:5173/ screenshot.png
```

Tips:

- Capture only the changed or new part by passing a CSS selector as the third
  argument, e.g.
  `deno run -A screenshot.ts http://127.0.0.1:5173/ form.png
  ".booking-dialog"`.
- If the change is only visible after interaction (a dialog, an expanded menu),
  drive the page first with `page.click(...)`, `page.fill(...)`, etc., or take
  the screenshot after those interactions. Adapt the script as needed.
- The app's landing page is the login screen when not signed in. Parts that
  require Google sign-in cannot be reached without credentials; capture the
  deepest state reachable without sign-in, or mock/stub the auth context if the
  changed part is behind login.
- Give the file a descriptive name, e.g. `booking-dialog.png`, not
  `screenshot.png`.
- Keep screenshots out of the repository: save them in the scratch directory (or
  another location covered by `.gitignore`) and never commit them; they are
  attached to the PR, not stored in git.

## 5. Attach the screenshot to the PR

When creating the PR, attach the screenshot with `--attach` and reference it
from the body so it renders inline. Alt text goes after `#` in the flag:

```bash
cat > /tmp/pr-body.md <<'__PR_BODY__'
## Summary
- Concise bullets describing the change

## Screenshot
![The new booking dialog](./booking-dialog.png)

## Verification
- Commands or checks run
__PR_BODY__
gh pr create --repo owner/repo --draft --head <branch> \
  --body-file /tmp/pr-body.md \
  --attach "/tmp/screenshot/booking-dialog.png#The new booking dialog"
```

If the PR already exists, attach the screenshot in a comment instead:

```bash
gh pr comment <PR-number> --repo owner/repo \
  --body "Screenshot of the new booking dialog:" \
  --attach "/tmp/screenshot/booking-dialog.png#The new booking dialog"
```

Up to 50 files can be attached per command; repeat `--attach` for multiple
screenshots (e.g. before/after or several states).

## Checklist

- [ ] Deno installed (`deno --version` works)
- [ ] Chromium installed for Playwright (step 2)
- [ ] Dev server started with `deno task dev`; port read from its output
- [ ] Screenshot taken of the new or changed part, with a descriptive filename
- [ ] Screenshot attached to the PR (via `gh pr create --attach` or
      `gh pr comment --attach`) and referenced in the PR body
- [ ] Screenshot not committed to the repository
- [ ] Dev server stopped afterwards
