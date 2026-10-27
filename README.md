# FancySauce Savings

Usage analytics for Claude Code and OpenAI Codex CLI.

**Version:** 0.22.0

This repo is the canonical distribution for both the Claude Code plugin and the
OpenAI Codex plugin. Each tool installs only its own plugin.

## Requirements

**Node.js 22 or later, on `PATH`.** The collector runs as a Node script on every
hook event. Claude Code's own installers don't require Node, so a machine can
have a working Claude Code and no Node runtime — on that machine the plugin
installs, loads, and captures nothing. Check with `node --version` before
reporting missing usage analytics.

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


## Claude Code started by Codex in a sandbox

Codex can run `claude` as a tool command. Its `workspace-write` sandbox denies
writes under `~/.claude`, so the plugin does not capture that Claude Code
session:

- Claude Code cannot create `~/.claude/session-env/<session>`, so it runs no
  `SessionStart` hook.
- Claude Code cannot write its transcript in `~/.claude/projects`, so the
  plugin cannot read the API requests of the session.
- The plugin cannot write its data directory in `~/.claude/plugins/data`.

When the plugin cannot write its data directory, Claude Code shows this line
at the end of the session:
`SessionEnd hook [...] failed: fancysauce: cannot write <data directory>, so this session is not captured.`

Do not make `~/.claude` paths writable for the sandbox. Claude Code runs
files from these paths outside the sandbox. It sources the files in
`~/.claude/session-env` before each Bash command. It runs the plugin binaries
in `~/.claude/plugins/data`. A sandboxed command that writes there can run code
outside the sandbox.

To capture a Claude Code session that Codex starts, run that `claude` command
outside the sandbox. For example, approve it to run unsandboxed.


## Enterprise / MDM deployment

Deploying to a managed fleet? [`mdm/`](mdm/) has the full IT-admin guides:
[Jamf Pro](mdm/jamf/README.md), [Kandji](mdm/kandji/README.md), and
[Microsoft Intune](mdm/intune/README.md), plus an
[MDM-agnostic contract](mdm/README.md) you can adapt to any tool. They cover
system-wide managed settings for Claude Code, the auto-trusted managed-hook
path for Codex, and the per-user credential file both tools read.


## Privacy

The plugin forwards usage metadata (session, tool-call, and request analytics)
to your Fancysauce dashboard. It does not transmit the contents of your prompts,
files, or model responses. Every field that can leave a machine is listed in
[docs/data-contract.md](docs/data-contract.md), generated from the plugin's own
content filter; [docs/ingest-token.md](docs/ingest-token.md) describes the
write-only token the plugin authenticates with.

To attribute that usage to a person, the plugin resolves one identifier for the
developer. It prefers an identifier you supplied — the account you signed in
with, or one your administrator set through an MDM profile. If none is present,
it falls back to an email the machine already holds: your Claude or Codex
account email, the email in your macOS directory record (`dscl`), your Windows
user principal name (`whoami /upn`), or your git `user.email`. That value is
encrypted to the Fancysauce public key before it leaves your machine, is
readable only by the identity-anchoring job on the server, and is never sent
in plain text.
