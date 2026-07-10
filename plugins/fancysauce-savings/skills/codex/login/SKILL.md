---
name: fancysauce-login
description: Sign in to Fancysauce so the Codex telemetry plugin can forward usage to your dashboard. Trigger this when the user asks to log in, sign in, authenticate, connect, or set up Fancysauce, or reports that telemetry isn't being uploaded because no credential exists. Do NOT trigger for managed/MDM deployments or CI, where the credential comes from a system file, the FANCYSAUCE_API_KEY env var, or the FANCYSAUCE_TENANT_KEY env var instead.
---

The user wants to sign in to Fancysauce. Sign-in writes a long-lived bearer
credential to `~/.config/fancysauce/credentials.json` (mode 0600); the plugin
reads it and starts forwarding telemetry on the next session.

## Action

Resolve this path relative to this `SKILL.md` file:

```
../../../dist/shared/bin/login.mjs
```

Then run `node <resolved-path>`. The binary takes no arguments. It binds a
loopback listener, opens the user's browser to the Fancysauce sign-in / approve
page, waits for the dashboard to redirect back to the loopback with the minted
credential, and writes the credential file.

If you (Codex) can run shell commands, run the resolved command and surface all
of its stderr to the user verbatim. If you cannot run commands, tell the user to
run `node <installed-plugin-root>/dist/shared/bin/login.mjs` in their own
terminal — it is interactive (it opens a browser and waits on a loopback), so
running it directly in a terminal is a perfectly good path.

If the `FANCYSAUCE_TENANT_KEY` environment variable is set to a tenant-scoped
key (`fs_live_t_…`), running the binary skips the browser/loopback entirely and
writes the credential directly from that key — the headless/CI path. This also
happens automatically on the first hook fire when the variable is exported
before launching Codex, so running the command by hand is only needed when you
want an explicit, verifiable step.

## Notes

- The loopback wait times out after 60 seconds. If the binary exits non-zero,
  the stderr explains why (timeout, state mismatch, browser-open failure). The
  user simply re-runs the command to retry.
- After a successful sign-in, the plugin starts sending live telemetry on the
  next hook fire.
- Managed/MDM and CI environments do not use this skill: there the credential
  comes from a system-path `credentials.json`, the `FANCYSAUCE_API_KEY`
  environment variable, or the `FANCYSAUCE_TENANT_KEY` environment variable.

Tell the user briefly what happened (signed in, or why it failed).
