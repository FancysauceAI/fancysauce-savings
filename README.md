# FancySauce Savings

Cost and usage observability for Claude Code and OpenAI Codex CLI.

**Version:** 0.16.2

This repo is the canonical distribution for both the Claude Code plugin and the
OpenAI Codex plugin. Each tool installs only its own plugin.

## Requirements

**Node.js 22 or later, on `PATH`.** The collector runs as a Node script on every
hook event. Claude Code's own installers don't require Node, so a machine can
have a working Claude Code and no Node runtime — on that machine the plugin
installs, loads, and captures nothing. Check with `node --version` before
reporting missing telemetry.

## Claude Code
To install and setup the plugin in Claude Code:
```
/plugin marketplace add FancysauceAI/fancysauce-savings
/plugin install fancysauce-savings@fancysauce
/reload-plugins
/fancysauce-savings:login
```


### Claude Code slash commands

- **`/fancysauce-savings:login`** — Browser-based sign-in. Writes the bearer credential.
- **`/fancysauce-savings:upload-history`** — Send usage data collected before you signed in to Fancysauce.
- **`/fancysauce-savings:bill-check`** — Estimate the impact of Anthropic's 2026-06-15 Agent SDK billing change against your usage.

## OpenAI Codex
To install and setup the plugin in Codex:
```
codex plugin marketplace add FancysauceAI/fancysauce-savings
@fancysauce-login
```


## Enterprise / MDM deployment

Deploying to a managed fleet? [`mdm/`](mdm/) has the full IT-admin guides:
[Jamf Pro](mdm/jamf/README.md), [Kandji](mdm/kandji/README.md), and
[Microsoft Intune](mdm/intune/README.md), plus an
[MDM-agnostic contract](mdm/README.md) you can adapt to any tool. They cover
system-wide managed settings for Claude Code, the auto-trusted managed-hook
path for Codex, and the per-user credential file both tools read.


## Privacy

The plugin forwards usage metadata (session, tool-call, and request telemetry)
to your Fancysauce dashboard. It does not transmit the contents of your prompts,
files, or model responses.

To attribute that usage to a person, the plugin resolves one identifier for the
developer. It prefers an identifier you supplied — the account you signed in
with, or one your administrator set through an MDM profile. If none is present,
it falls back to an email the machine already holds: your Claude or Codex
account email, the email in your macOS directory record (`dscl`), your Windows
user principal name (`whoami /upn`), or your git `user.email`. That value is
encrypted to the Fancysauce public key before it leaves your machine, is
readable only by the identity-anchoring job on the server, and is never sent
in plain text.
