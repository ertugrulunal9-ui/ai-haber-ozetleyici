# AI-Friendly Code Standard and Audit

## Why this exists

This repo does not need a blind "200 lines max" rule. The useful unit for AI-assisted work is change locality:

- a feature change should usually fit into 1-2 files
- the main behavior should usually live in one named function
- DOM updates, network calls, state updates, and translations should not all be mixed in the same block

For this project, `200 lines` is best treated as a review threshold, not a hard stop.

## Project-specific standard

### 1. Size heuristics

- Function target: `15-60` lines
- Review threshold for functions: `80+` lines
- Refactor threshold for functions: `120+` lines unless the block is mostly declarative markup or config
- JS/TS module target: `<= 200` lines when the file owns one concern
- JS/TS module review threshold: `300+` lines
- CSS section target: `<= 80` lines per visual area
- CSS file review threshold: `250+` lines
- Config, migrations, and generated assets are exempt when format drives the size

### 2. Responsibility rules

- `extension/popup/` should contain popup-only DOM wiring and view switching
- `extension/content/` should contain sidebar mount logic and page-surface behavior only
- shared rendering, formatting, and reusable UI helpers should live in `extension/utils/`
- `supabase/functions/summarize/index.ts` should stay as the request entrypoint, not the home for every helper
- anonymous event handlers longer than `15-20` lines should be named and extracted
- repeated `document.getElementById(...)` calls should be replaced by a single refs map, similar to `collectRefs(...)`

### 3. AI-friendly editing rules

- one feature should be editable by changing one named function whenever possible
- do not mix request parsing, business rules, DB access, and response formatting in the same module
- do not mix rendering, state mutation, and async API calls in the same event handler unless the flow is trivial
- when popup and sidebar implement the same behavior, extract the shared logic before adding more branches
- prompts, translations, and output parsers should live in stable helper locations so AI can edit them directly

### 4. Suggested module boundaries

#### Extension UI

- `extension/popup/popup.js`: mount, refs, popup event binding
- `extension/content/content.js`: sidebar mount, sidebar event binding
- `extension/utils/ui-common.js`: translations, display formatting, shared render helpers
- `extension/utils/app-core.js`: background/API bridge only

#### Supabase function

- `index.ts`: request entry and top-level error handling
- `request.ts`: JSON parsing and request validation
- `handlers.ts`: action dispatch
- `limits.ts`: usage reads, quota checks, increments
- `votes.ts`: vote read/write helpers
- `prompt.ts`: prompt building
- `openai.ts`: model call and output extraction
- `response.ts`: JSON/cors/http helpers

## Audit snapshot

### Summary

- Files over 200 lines:
  - `extension/content/sidebar.css` (`480`)
  - `supabase/config.toml` (`339`, excluded from refactor priority)
  - `extension/content/content.js` (`282`)
  - `extension/popup/popup.js` (`228`)
  - `create-icons.py` (`205`)
- Files deliberately split during this refactor:
  - `extension/popup/popup.css` -> `popup-base.css`, `popup-layout.css`, `popup-controls.css`, `popup-analysis.css`
  - `supabase/functions/summarize/index.ts` -> `index.ts` + `request.ts` + `limits.ts` + `votes.ts` + `prompt.ts` + `openai.ts` + `response.ts` + `handlers.ts`
  - `extension/content/content.js` -> `content.js` + `sidebar-ui.js` + shared `summary-surface.js`
- Named code blocks over 120 lines:
  - none after the refactor
- Main practical result:
  - no single popup/sidebar/edge-function flow requires scanning one monolithic block
  - shared summary-surface behavior now lives in one helper layer

### Status after refactor

- `extension/utils/summary-surface.js`: shared history, sources, bias, clickbait, share-url, and result-reset helpers
- `extension/popup/popup-ui.js`: popup refs, view switching, translation application
- `extension/content/sidebar-ui.js`: sidebar shell creation, refs, view switching, translation application
- `supabase/functions/summarize/index.ts`: HTTP entrypoint and top-level error handling only
- Remaining intentional long files:
  - `supabase/config.toml` (`339`, excluded from refactor priority)
  - `extension/content/sidebar.css` (`480`, already sectioned and left stable)
  - `create-icons.py` (`205`, low-priority sequential drawing script)

### Priority 1: split `initSidebar`

File:

- `extension/content/content.js` and `extension/content/sidebar-ui.js`

Why it is a refactor target:

- one function owns bootstrap, state, translation refresh, history loading, render flow, async API calls, and all event listeners
- AI edits to one sidebar feature require reading the whole function
- most future changes will collide in the same block

Implemented split:

- `createSidebarState(baseArticle, deviceId, lang)`
- `handleSidebar*` named action handlers
- `bindSidebarChromeControls(refs, state)`
- `bindSidebarSummaryActions(refs, state)`
- `bindSidebarVoteActions(refs, state)`
- `bootstrapSidebar(refs, state)`

Expected result:

- the top-level sidebar file becomes an orchestrator
- each user action becomes a short named handler
- AI can change summarize, QA, bias, or vote behavior without reopening the whole file

### Priority 2: stop growing popup handlers inline

File:

- `extension/popup/popup.js` and `extension/popup/popup-ui.js`

Why it is a refactor target:

- the file keeps most popup behavior in top-level anonymous listeners
- popup and sidebar repeat the same concepts: history, result rendering, bias render, sources render, clickbait voting
- the popup has no `collectRefs(...)` equivalent, so DOM lookup noise is repeated everywhere

Implemented split:

- add `collectPopupRefs()`
- move each listener into a named handler:
  - `handleSummarizeClick`
  - `handleBiasClick`
  - `handleCopyClick`
  - `handleShareClick`
  - `handleQaSubmit`
  - `handleVote`
  - `handleLangToggle`
- group all bindings under `bindPopupEvents(refs)`

Expected result:

- smaller edit targets
- less repeated DOM lookup
- easier future extraction of shared popup/sidebar behavior

### Priority 3: decompose the edge function by concern

File:

- `supabase/functions/summarize/index.ts` and helper modules in the same folder

Why it is a refactor target:

- the file mixes HTTP entry, action dispatch, request parsing, validation, quota policy, DB operations, prompt building, OpenAI call, parsing, and response helpers
- no single function is dangerously huge, but the module forces AI to scan too many unrelated concerns before editing one rule
- this is the main server-side hotspot for future features

Implemented split:

- keep `Deno.serve(...)` and top-level error mapping in `index.ts`
- move parsing helpers to `request.ts`
- move usage/quota logic to `limits.ts`
- move vote queries to `votes.ts`
- move prompt strings to `prompt.ts`
- move model call + extraction to `openai.ts`
- move `json(...)` and `corsHeaders()` to `response.ts`

Expected result:

- prompt changes stop colliding with DB/quota edits
- quota rules become testable in isolation
- AI can navigate server-side behavior by concern instead of by scroll depth

### Priority 4: clean up popup CSS structure

File:

- `extension/popup/popup-base.css`
- `extension/popup/popup-layout.css`
- `extension/popup/popup-controls.css`
- `extension/popup/popup-analysis.css`

Why it is a refactor target:

- the file is large enough to slow targeted edits
- sectioning is inconsistent compared with `sidebar.css`
- selectors are readable, but locating a visual area still requires scanning a long file

Implemented change:

- split by concern into base, layout, controls, and analysis styles

Priority note:

- this is a maintainability improvement, not an urgent functional risk

### Priority 5: keep sidebar CSS stable unless edits become frequent

File:

- `extension/content/sidebar.css` lines `1-554`

Why it is lower priority:

- large file, but it is already sectioned by visual area
- most blocks are reasonably bounded
- the main pain point in sidebar work is JS orchestration, not CSS structure

Recommended change:

- leave as-is for now
- if sidebar UI keeps evolving, split by area using multiple manifest CSS entries

### Low priority: icon generator

File:

- `create-icons.py` lines `90-217`

Why it is low priority:

- file is just over the threshold
- helpers are already small
- the main drawing routine is long, but it is mostly sequential drawing steps

Recommended change:

- only refactor if the icon script starts supporting themes, variants, or new assets
- if that happens, split drawing into:
  - background
  - card
  - text lines
  - accent
  - PNG writer

## Cross-cutting refactor opportunities

- popup and sidebar now share render helpers, but still keep separate async action flows; if one more major feature is added, revisit a shared controller layer
- `extension/popup/popup.js` and `extension/content/content.js` still sit slightly above the preferred `200` line target, but both are below the `300` line review threshold and no longer contain oversized blocks
- `supabase/config.toml` is long, but it should not be treated as a code smell by line count alone

## Suggested implementation order

1. Extract popup refs and named event handlers
2. Split `initSidebar` into bootstrap + bindings + handlers
3. Extract shared popup/sidebar rendering helpers where duplication remains
4. Split the Supabase function by concern
5. Revisit CSS only after JS boundaries are stable

## Definition of done for future PRs

- no new function over `120` lines without a written reason
- no new anonymous event handler over `20` lines
- no feature that requires touching both popup and sidebar without evaluating shared extraction
- no server-side change that mixes prompt text, DB logic, and HTTP transport in one edit
