---
description: Upload locally captured history to your fancysauce account
---

Run `${CLAUDE_PLUGIN_ROOT}/dist/shared/bin/upload-history.mjs` via the Bash tool, passing through any args the user provided. Surface its stderr/stdout verbatim.

Args the binary supports:
- (no args) — spawn the background runner; return immediately with a brief acknowledgment.
- `--status` — print the current backfill status (running / completed / failed / interrupted / absent).
- `--skip` — write a marker that suppresses future backfill nudges. Does not stop a running backfill.

If the user has not signed in (no credential file), the binary will print an error pointing at `/fancysauce:login`.
