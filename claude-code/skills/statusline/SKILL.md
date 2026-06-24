---
description: Install, refresh, or compose the fancysauce statusline at the scope the user wants (user, project, or local). Copies the plugin's binary to a stable per-plugin data path so user settings keep working across plugin updates.
---

The user wants the fancysauce statusline rendering. Your job is to:

1. Figure out what's currently winning at CC's `statusLine` slot.
2. Help the user decide where to install (user, project, or local-project).
3. Copy the plugin's bundled binary to a stable per-plugin data path.
4. Write `statusLine` into the chosen settings file pointing at that
   stable path.
5. On re-runs, detect when the plugin's bundled binary is newer than the
   stable copy and offer to refresh.

The **subagent** statusline ships as a plugin default — the user never
needs to configure it. You don't write `subagentStatusLine`; you just
mention it exists when explaining segments at the end.

## Narration rule (read first, applies to every step)

**Every step of this skill must begin with a sentence of user-facing
text BEFORE any tool call.** State what you're about to do and why.
The user sees almost none of your tool calls — silent tool use feels
like the skill froze. Specifically:

- Do not let a tool call be the first thing in your response when
  starting a step. Emit at least one full sentence of plain text first.
- Do not hide the announcement inside the `description` field of a tool
  call — that text isn't shown prominently. Put it in the response body.
- After tool results return, summarize what you found in a short user-
  facing block before moving to the next step. Don't just silently
  proceed.

The step instructions below give you exact opening sentences. Use them
(or close paraphrases). Do not skip them.

## How CC resolves statusLine (the facts you need)

CC reads `statusLine` from these files, in precedence order (highest
wins):

1. **Managed** — system policy (enterprise; rare).
2. **Local project** — `<repo>/.claude/settings.local.json` (gitignored).
3. **Project** — `<repo>/.claude/settings.json` (committed).
4. **User** — `~/.claude/settings.json`.
5. ~~Plugin default~~ — **not supported for `statusLine`.** CC's plugin
   loader only honors `agent` and `subagentStatusLine` keys in a
   plugin's `settings.json`. `statusLine` declared by a plugin is
   silently ignored. This is documented behavior, confirmed empirically.

So the fancysauce parent statusline can only render if it's wired at
layers 1–4. The user has to opt in, and that's what this skill exists
to handle.

CC's plugin-root template variable (the one written as a dollar-sign,
brace, the literal text CLAUDE_PLUGIN_ROOT, close-brace) also doesn't
expand in user/project settings — only in plugin-scoped configs. So
we can't use it — we must write absolute paths. To keep those paths
from breaking on every plugin version bump, we copy the binary to a
version-agnostic location under the plugin's data dir and write that
absolute path. (The variable is described in prose here rather than
written literally because CC substitutes it inside skill content as
this skill is loaded, which would garble the explanation.)

## Step 1: inspect — find out what's winning and locate the plugin

**REQUIRED FIRST OUTPUT:** Begin with a short text message. No tool
calls in this message. Use something like:

> I'll figure out which statusline is currently winning, then we can
> decide where you want the fancysauce one installed. I'm going to
> look at a few places — your user-scope settings, the project
> settings if we're in a repo, the plugin's bundled binary, and any
> previous fancysauce install — then report back.

Send that message. **Then** run the inspection commands.

Use Bash to gather state in parallel:

```bash
# Layer 4: user
test -f ~/.claude/settings.json && jq '.statusLine // empty' ~/.claude/settings.json 2>/dev/null

# Layers 3 + 2: project + local-project (only meaningful inside a repo)
test -f .claude/settings.json       && jq '.statusLine // empty' .claude/settings.json       2>/dev/null
test -f .claude/settings.local.json && jq '.statusLine // empty' .claude/settings.local.json 2>/dev/null

# Plugin install path — needed to know where to copy the binary FROM
jq '.plugins | to_entries[] | select(.key | startswith("fancysauce-savings@")) | {key, scope: .value[0].scope, installPath: .value[0].installPath, version: .value[0].version}' ~/.claude/plugins/installed_plugins.json 2>/dev/null

# Check the stable copy path (existence + mtime) for both candidate marketplaces
for MP in fancysauce fancysauce-staging; do
  STABLE=~/.claude/plugins/data/fancysauce-savings-$MP/bin/statusline.mjs
  echo "stable $MP: $(test -f "$STABLE" && stat -f '%Sm %z' "$STABLE" 2>/dev/null || echo 'absent')"
done
```

If `jq` is missing, fall back to the Read tool.

After tool results return, classify what you found into one of these:

- **Winning layer:** highest precedence layer 1-4 with a `statusLine`
  field — or "none of layers 1-4 has one."
- **Winning command:** the string in that layer's `statusLine.command`,
  or "(none)".
- **Is winning command the fancysauce stable path?** True if the
  command contains `/.claude/plugins/data/fancysauce-savings-*/bin/statusline.mjs`.
- **Plugin install path:** the `installPath` from `installed_plugins.json`
  for any enabled `fancysauce-savings@*` entry. If multiple, prefer the
  one matching the marketplace alias suffix the user is on (you can
  usually just take the first; ask if ambiguous).
- **Marketplace alias** (from the `@<alias>` suffix in the
  installed_plugins key) — needed to build the stable data path.
- **Stable copy state:** present or absent; if present, the mtime.
- **Cache binary state:** check `<installPath>/dist/statusline/statusline.mjs`
  — exists / mtime.
- **Refresh needed?** True if the cache binary is newer than the
  stable copy.

Report back to the user in a short, scannable block:

> Here's what I found:
>
> - **Winning at layer 4 (user):** `node /old/path/statusline.mjs`
> - **Is it fancysauce?** No — that's a different statusline.
> - **Plugin installed:** `fancysauce-savings@fancysauce-staging` v0.7.2 at `~/.claude/plugins/cache/.../0.7.2`
> - **Stable copy:** absent (this would be a first install)
> - **Action needed:** decide scope, then I'll copy the binary into place and wire your settings.

Adjust the lines to reflect what you actually found.

## Step 2: branch on what you found

### Case A — fancysauce stable path is already winning

Tell the user it's already installed and check whether a refresh is needed:

- If `refresh_needed = true` (cache binary newer than stable copy),
  offer: "Want me to refresh the stable copy with the latest bundled
  binary?" If they say yes, proceed to **Step 3 (refresh path)**.
- If `refresh_needed = false`, you're done. Skip to Step 5 (explain
  segments / segment toggles).

### Case B — something non-fancysauce is winning at layers 1-4

There's a competing statusline tool (ccusage, ccstatusline, custom
script, etc.) overriding the slot. Narrate briefly what you found and
that the user has a choice between replacing it, scoping fancysauce
to this project only, or composing with their existing one. Mention
the winning layer + the path you found, so the user knows what
they'd be replacing:

> Your existing statusline (set at <layer>: `<command>`) is overriding
> the slot. I can install fancysauce in a few different ways
> depending on whether you want it everywhere, just in this project,
> or alongside your existing one.

Then call AskUserQuestion with the **four-option** version (all four
options apply here because there IS an existing statusline to keep or
compose with):

Question text: **"Where would you like the fancysauce statusline
installed?"**

Header: **"Install scope"**

Options (single-select, verbatim — don't paraphrase). Drop the
project-local option if you're not inside a git repo.

- **Label:** `Install at user scope`
  **Description:** `Edit ~/.claude/settings.json. Back up the current file first, then replace the statusLine entry with fancysauce. Takes effect everywhere CC runs on this machine.`

- **Label:** `Install at project scope (committed)`
  **Description:** `Edit <repo>/.claude/settings.json. Adds statusLine pointing at fancysauce. Wins only inside this repo; your user-scope statusline still wins in other projects. File is meant to be committed, so teammates would inherit it.`

- **Label:** `Install at project scope (local only)`
  **Description:** `Edit <repo>/.claude/settings.local.json (gitignored). Same effect as the committed option but only on this checkout — teammates do not inherit it.`

- **Label:** `Keep mine, show me how to call yours from it`
  **Description:** `Don't edit any settings file. Print the path to the fancysauce statusline binary so you can invoke it from inside your existing statusline script. For users who want to compose both.`

If the user selects "Keep mine", jump to **Step 4**. Otherwise jump to
**Step 3 (install path)**.

### Case C — nothing is winning at layers 1-4 (clean first install)

No existing override; the user simply has no statusline configured.
Don't offer the "Keep mine, compose" option — there's nothing to keep,
and printing a composition recipe with no host script would be
confusing. Narrate the clean state:

> You don't have a statusline configured yet. I can install fancysauce
> at user scope (active everywhere) or limit it to just this project.

Then call AskUserQuestion with the **three-option** install set (drop
the project-local option if not in a git repo, leaving two):

Question text: **"Where would you like the fancysauce statusline
installed?"**

Header: **"Install scope"**

- **Label:** `Install at user scope`
  **Description:** `Edit ~/.claude/settings.json. Adds the statusLine entry pointing at fancysauce. Takes effect everywhere CC runs on this machine. Most common choice.`

- **Label:** `Install at project scope (committed)`
  **Description:** `Edit <repo>/.claude/settings.json. Adds statusLine pointing at fancysauce. Wins only inside this repo. File is meant to be committed, so teammates would inherit it.`

- **Label:** `Install at project scope (local only)`
  **Description:** `Edit <repo>/.claude/settings.local.json (gitignored). Only on this checkout — teammates do not inherit it.`

Then jump to **Step 3 (install path)**.

(There's no "do nothing" option in either case — bailing is always
possible by stopping the conversation. Don't pad the menu.)

## Step 3: install or refresh

This step copies the plugin's bundled statusline binary into a stable
per-plugin data path, then writes (or updates) the user's chosen
settings file with an absolute path to that stable copy.

**Before doing anything, narrate the plan.** Example for a user-scope
fresh install:

> Got it. I'm going to:
>
> 1. Copy the plugin's `statusline.mjs` from its versioned cache path
>    to `~/.claude/plugins/data/fancysauce-savings-<marketplace>/bin/statusline.mjs`.
>    That stable path doesn't change when the plugin updates, so your
>    settings stay valid.
> 2. Back up `~/.claude/settings.json` → `~/.claude/settings.json.bak.<timestamp>`.
> 3. Write `statusLine` into `~/.claude/settings.json` pointing at the
>    stable path.
> 4. Confirm the result — CC re-reads `statusLine` config on every
>    render, so it'll appear on the next prompt with no reload needed.

Adjust to whichever scope the user picked. Then execute:

1. **Compute paths.** Marketplace alias comes from the `@<alias>`
   suffix in installed_plugins.json. Set:
   - `STABLE_DIR=~/.claude/plugins/data/fancysauce-savings-<alias>/bin`
   - `STABLE_BIN=$STABLE_DIR/statusline.mjs`
   - `CACHE_BIN=<installPath>/dist/statusline/statusline.mjs`

2. **Copy binary.** Create `STABLE_DIR` if absent, then `cp CACHE_BIN
   STABLE_BIN`. Verify `STABLE_BIN` exists with the expected size after.

3. **Pick the target settings file** based on scope:
   - User scope: `~/.claude/settings.json`
   - Project (committed): `<repo>/.claude/settings.json` (must be in
     a git repo; use `git rev-parse --show-toplevel` to resolve)
   - Project (local): `<repo>/.claude/settings.local.json`

4. **Back up** the target file: `cp <target> <target>.bak.<timestamp>`.
   Skip if the target doesn't exist yet (and say so to the user).

5. **Read-modify-write.** Read the target file (or `{}` if absent).
   Merge in:

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "node <absolute STABLE_BIN path>",
       "refreshInterval": 1,
       "refreshIntervalSeconds": 1
     }
   }
   ```

   Use the literal absolute path. Do **not** write the plugin-root
   template variable (dollar-sign, brace, the text CLAUDE_PLUGIN_ROOT,
   close-brace) — it doesn't expand in user/project settings, and
   even if it did, CC substitutes it inside skill content when loading
   this file, so writing it here would bake a stale plugin path into
   the user's config. Preserve every other field in the target file.
   Write back with 2-space indentation.

6. **Confirm to the user** which file you wrote, where the backup is
   (if any), and that the new statusline renders on the next prompt
   (CC re-reads statusLine config on every render — no reload required).
   Move on to Step 5.

**Refresh path** (Case A above): just do step 1 (copy CACHE_BIN over
STABLE_BIN) and confirm. Don't touch any settings file — the user's
existing config already points at STABLE_BIN.

## Step 4: handle the "keep mine, call yours" case

If the user picked this option, don't edit any settings file. Make
sure the stable copy exists (do the copy from Step 3 part 1-2), then
print the path and a one-line composition example:

```
The fancysauce statusline binary is at:
  ~/.claude/plugins/data/fancysauce-savings-<alias>/bin/statusline.mjs

CC passes session JSON on stdin; the binary writes the rendered
statusline (with ANSI colors) to stdout. From inside your existing
statusline script, you can invoke it like:

  cat | node ~/.claude/plugins/data/fancysauce-savings-<alias>/bin/statusline.mjs

…then concatenate or interleave its output with your own segments.
```

Substitute the real alias. Skip to Step 5.

## Step 5: explain segments + the subagent statusline

Once the user has the statusline rendering (or has chosen the keep-mine
path), close the loop with what they're seeing.

**Lead with a one-line offer rather than dumping the whole legend** —
some users want it, some don't. Example:

> While we're here, want me to walk through what each segment shows
> and how to tweak it, or are you good?

If yes, give them the legend below. If no, stop.

The parent statusline (from left to right):

- **Model** — the running model's `display_name`, with `claude-` prefix stripped, truncated to 18 chars.
- **ctx** — current context-window usage as a percentage + 10-cell bar. Colors at 50% / 80% thresholds.
- **cache** — prompt-cache TTL remaining (or `expired`). Green/yellow/red by remaining seconds.
- **usage** — 5-hour rate-limit usage as a percentage. Same thresholds as ctx.
- **↑in ↓out** — cumulative input + output tokens this session, in `k`/`M` units. Dim by default; yellow on IO jump.

The subagent statusline ships as a plugin default — the user didn't
have to configure it. Note that explicitly so they know it exists:

> The subagent statusline ships with the plugin automatically — you'll
> see a sparkline + percentage + tokenCount row per running subagent
> at the bottom of the terminal whenever you dispatch a Task. No
> configuration needed.

If they want to tweak segment toggles or color thresholds for the
parent statusline, point them at the config file:

```bash
cat ~/.claude/plugins/data/fancysauce-savings-<alias>/config.json 2>/dev/null
```

To edit, write the relevant `status_line` block:

```json
{
  "status_line": {
    "segments": {
      "model": true, "ctx": true, "cache": true,
      "usage": true, "tokens": true
    },
    "thresholds": {
      "tokens": { "warn": 50, "danger": 80 }
    }
  }
}
```

Next prompt picks up the new config automatically.
