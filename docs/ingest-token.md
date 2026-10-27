# The fancysauce ingest token

This document describes the credential the fancysauce-savings plugin uses, what
it can and cannot do, where it appears, and how to verify those claims yourself.

## What it is

An ingest token identifies your workspace to fancysauce's usage-analytics
ingest endpoint. It is the equivalent of a PostHog project API key or a Segment
write key: it lets a client append events to one workspace and does nothing
else.

Tokens look like this:

```
fs_ingest_<43 characters>          production
fs_ingest_test_<43 characters>     staging
```

Older tokens spelled `fs_live_t_<43 characters>` and `fs_test_t_<43 characters>`
are the same class and remain valid.

## What it can do

Append usage events to the workspace it was minted for.

## What it cannot do

- Read any data.
- List sessions, users, or costs.
- Reach any other workspace.
- Sign in to the fancysauce dashboard.
- Call the fancysauce API used by the plugin's optional MCP server. The plugin's
  own MCP proxy refuses an ingest token and reports "logged out".

## Where it appears

- In the `marketplace.json` served at your workspace's private install URL. The
  install URL is the sensitive value, because it serves the token; the token
  itself is not.
- On the command line of the `SessionStart` hook on each developer machine, for
  the lifetime of that hook process (under a second). The flag is spelled
  `--tenant-key` in manifests served today and `--ingest-token` in newer ones;
  both name the same value.
- In the credential file the hook writes on first run:
  - macOS and Linux: `~/.config/fancysauce/credentials.json`, mode `0600`
  - Windows: `%APPDATA%\fancysauce\credentials.json`
- In an MDM-deployed system file, if your organization deploys one:
  `/etc/fancysauce/credentials.json` or `%PROGRAMDATA%\fancysauce\credentials.json`.

## Verify it yourself

Substitute your token. The read API refuses it. The `/mcp` endpoint is the
plugin's own read surface, and a JSON-RPC `initialize` is the smallest request
it accepts:

```
curl -sS -o /dev/null -w '%{http_code}\n' -X POST \
  -H 'Authorization: Bearer fs_ingest_...' \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  https://api.preview.fancysauce.ai/mcp
# 403
```

The identity probe answers, because it exists to tell a client what kind of
key it holds, and it says this one is not a user:

```
curl -sS -H 'Authorization: Bearer fs_ingest_...' \
  https://api.preview.fancysauce.ai/v1/whoami
# 200 {"key":{"scope":"tenant", ...},"logged_in":false, ...}
```

The ingest endpoint accepts an empty batch from it:

```
curl -sS -o /dev/null -w '%{http_code}\n' -X POST \
  -H 'Authorization: Bearer fs_ingest_...' \
  -H 'Content-Type: application/json' \
  --data '{"resourceLogs":[]}' \
  https://ingest.preview.fancysauce.ai/v1/logs
# 202
```

## Rotate it

Dashboard → Workspace → Ingest token → Rotate. Each developer machine picks up
the new token at its next session start and rewrites its local credential
file. MDM-deployed system files are yours to redeploy; they take precedence
over the per-user file.

## What is sent with it

See [data-contract.md](data-contract.md) for every field that can leave a
machine.
