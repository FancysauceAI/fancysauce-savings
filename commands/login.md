---
description: Sign in to fancysauce and write a credential to disk
---

Run `${CLAUDE_PLUGIN_ROOT}/dist/shared/bin/login.mjs` via the Bash tool. The binary takes no arguments.

If the `FANCYSAUCE_TENANT_KEY` environment variable is set to a tenant-scoped
key (`fs_live_t_…`), the binary skips the browser entirely and writes the
credential directly from that key — the headless / CI path. No loopback, no
browser. This is also what happens automatically on the first hook fire when
the variable is exported before launching Claude Code, so running the command
is only needed when you want an explicit, verifiable step.

The binary binds a loopback listener, opens the user's browser to the dashboard's sign-in / approve page, waits for the dashboard to redirect back to the loopback with the minted credential, and writes the credential file. Surface all stderr from the binary to the user verbatim.

The loopback wait times out after 60 seconds. If the binary exits non-zero, the stderr will explain why (timeout, state mismatch, browser-open failure, etc.). The user re-runs `/fancysauce:login` to retry.

After successful sign-in:
- A credential file is written at the user's standard config path (mode 0600).
- The plugin will start sending live telemetry on the next hook fire.
- If the user accepted backfill during sign-in, a background runner will begin uploading their local history.

Tell the user briefly what happened (signed in, backfill accepted/not) and point them at `/fancysauce:upload-history --status` if they want to monitor backfill, or `/fancysauce:upload-history` to start one later.
