# Refactor Smoke Checklist

> Note (2026-10): the in-page sidebar (`extension/content/`) was removed; it had not been
> loaded since `content_scripts` was dropped from the manifest. Sidebar items in the
> refactor phases below are kept as history only.

## Purpose

This checklist exists because the repo currently has no visible automated test suite.
Before and after each refactor phase, use this list to confirm that behavior did not change.

Use this document together with `docs/ai-friendly-code-audit.md`.

## Baseline rule

Before touching behavior-heavy files:

1. run the current flow once
2. note the visible output
3. refactor one surface at a time
4. rerun only the affected checklist first
5. stop immediately if popup and edge-function outputs diverge

## Environment pre-check

- extension is loaded in Chrome
- `EDGE_URL` points to the intended Supabase function
- Supabase function is reachable
- a real news article page is available for manual checks
- browser storage can be cleared if state becomes confusing

## Shared regression watchpoints

- remaining quota text updates after every AI action
- `limit` responses switch to the limit view instead of failing silently
- last result and history still persist across reopen
- language toggle updates labels without breaking current state
- clickbait vote counts still reflect user vote and total counts
- no action leaves buttons stuck in disabled/loading state

## Popup smoke tests

Target files:

- `extension/popup/popup.js`
- `extension/popup/popup.html`
- `extension/popup/popup-base.css`
- `extension/popup/popup-layout.css`
- `extension/popup/popup-controls.css`
- `extension/popup/popup-analysis.css`

Checklist:

1. Open popup on a news article page
2. Confirm usage text is visible
3. Click summarize
4. Confirm loading view appears, then result view renders summary text
5. Confirm sources list appears when sources exist
6. Click bias analysis
7. Confirm bias card renders labels, markers, and note
8. Ask a question in the QA field
9. Confirm answer appears and button returns from loading state
10. Click copy and confirm label changes temporarily
11. Click X share button and confirm a new tab opens
12. Vote yes, then vote no
13. Confirm active vote styling and stats update
14. Click back
15. Confirm history is visible on main view
16. Toggle language
17. Confirm labels change and app remains usable

## Edge function smoke tests

Target file:

- `supabase/functions/summarize/index.ts`

Actions to validate:

- `usage`
- `summarize`
- `ask`
- `analyze`
- `vote`
- `getvotes`

Manual verification goals:

- invalid input returns a controlled error instead of a crash
- quota exhaustion returns `error: limit`
- AI actions return `remaining`
- vote actions preserve the expected aggregate totals
- analyze output still parses into `political`, `emotional`, and `note`

## Safe refactor phases

### Phase 0: no-behavior prep

- add docs
- add refs maps
- rename handlers
- move anonymous listeners into named functions

Verification:

- popup smoke tests if popup files changed

### Phase 1: popup-only structural refactor

- extract `collectPopupRefs()`
- add `bindPopupEvents(refs)`
- move top-level listeners into named handlers

Verification:

- run full popup smoke checklist
- rerun shared regression watchpoints

### Phase 2: sidebar-only structural refactor

- split `initSidebar`
- separate bootstrap, bindings, and action handlers

Verification:

- run full sidebar smoke checklist
- rerun shared regression watchpoints

### Phase 3: shared UI extraction

- move duplicated popup/sidebar render logic into shared helpers

Verification:

- run popup checklist
- run sidebar checklist
- compare visible labels and result-state behavior across both surfaces

### Phase 4: edge-function decomposition

- split request parsing, limits, votes, prompt, OpenAI, and response helpers

Verification:

- run all edge-function action checks
- rerun popup summarize / ask / analyze
- rerun sidebar summarize / ask / analyze

### Phase 5: CSS cleanup

- only after JS boundaries are stable
- prefer no visual redesign during structure-only passes

Verification:

- popup smoke checklist
- sidebar smoke checklist
- quick visual scan for layout regressions

## Stop conditions

Stop the refactor and fix immediately if any of these happen:

- remaining quota stops updating
- history stops persisting
- analyze returns malformed output
- vote totals stop matching the latest action
- any handler leaves the UI stuck in loading or disabled mode

## Best next automation targets

If we decide to add tests later, the safest first targets are:

1. pure helper tests for `getBiasDisplay` and `getClickbaitDisplay`
2. request parsing tests for the edge function
3. prompt-builder tests for summarize / ask / analyze modes
4. a lightweight browser smoke script for popup summarize + bias + QA
