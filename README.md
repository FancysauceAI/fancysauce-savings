# fancysauce-savings

Cost and usage observability for Claude Code

**Version:** 0.9.0

## About this Plugin

fancysauce-savings captures session, tool-call, and API-request telemetry for Claude Code and forwards it to your Fancysauce dashboard.

## Install

In Claude Code:

```
/plugin marketplace add FancysauceAI/fancysauce-savings
/plugin install fancysauce-savings@fancysauce
/reload-plugins
/fancysauce-savings:login
```

The first two commands install the plugin from this repo. `/reload-plugins` activates it for the current session. The fourth opens your browser to the Fancysauce sign-in page; complete sign-in and a long-lived bearer credential lands at `~/.config/fancysauce/credentials.json`.

If you'd been running the plugin locally before signing in, run `/fancysauce-savings:upload-history` to backfill the queued events. The runner is bounded and exits when the queue drains.

## Slash commands

- **`/fancysauce-savings:login`** — Browser-based sign-in. Writes the bearer credential.
- **`/fancysauce-savings:upload-history`** — Spawn a bounded background runner to upload locally-queued history.
- **`/fancysauce-savings:upload-history --status`** — Report runner progress.
- **`/fancysauce-savings:reset`** — Interactive wipe of local plugin data (queue, cursors, session index, `install_id`). Asks for `wipe` to confirm. Preserves the credential file.
- **`/fancysauce-savings:reset --all`** — Same plus deletes `~/.config/fancysauce/credentials.json`.
- **`/fancysauce-savings:bill-check`** — Walk local Claude Code transcripts and estimate the impact of Anthropic's 2026-06-15 Agent SDK billing change against your usage pattern. Flags: `--since YYYY-MM-DD`, `--plan <tier>`, `--json`, `--projects-dir <path>`.
