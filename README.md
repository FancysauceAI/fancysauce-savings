# FancySauce Savings

Cost and usage observability for Claude Code and OpenAI Codex CLI.

**Version:** 0.13.1

This repo is the canonical distribution for both the Claude Code plugin and the
OpenAI Codex plugin. Each tool installs only its own plugin.

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
