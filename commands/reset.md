---
description: Wipe local fancysauce data
---

Run `${CLAUDE_PLUGIN_ROOT}/dist/shared/bin/reset.mjs` with any args the user passed (e.g., `--all`, `--queue-only`, `--no-confirm`) via the Bash tool.

The reset binary handles confirmation, scope, and safety checks. Surface the binary's stderr/stdout to the user verbatim.

If the user invoked without args, the binary defaults to "interactive" mode: prints a confirmation prompt, waits for the user to type 'wipe', and then deletes.

Args the binary supports:
- (no args) — interactive, confirms before deleting `sessions/`, `outbound/queue.ndjson` + cursors, `state/*` (preserving `install.json`).
- `--all` — also deletes `install.json` and the credential file at the user path.
- `--queue-only` — deletes only `outbound/queue.ndjson` and its sidecars.
- `--no-confirm` — skips the prompt; useful for automation.

The binary refuses if the backfill runner is currently active (`state/backfill.pid` alive). In that case it prints: "backfill in progress; stop it with kill <pid> first."
