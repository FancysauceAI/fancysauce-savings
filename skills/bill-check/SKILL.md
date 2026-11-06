---
description: Estimate the impact of Anthropic's 2026-06-15 Agent SDK billing change on the user's actual Claude Code usage history
---

The user is asking **"how does the June 15 Agent SDK billing change
affect me?"** Don't just run the script and dump output — walk the
user through it in three steps:

## Step 1: ask which plan they're on (two-step funnel)

AskUserQuestion caps options at 4 per question, so use a two-question
funnel to cover all seven plan tiers cleanly.

**Question 1 — Plan family** (exactly these 4 options):

- **Pro** — Individual Pro plan
- **Max** — Individual Max 5x or 20x (you'll ask which next)
- **Team** — Team plan (Standard or Premium seat)
- **Enterprise** — Enterprise plan (usage-based or Premium seat)

**Question 2 — only if the user picked Max, Team, or Enterprise:**

If they picked **Max**, ask "Which Max tier?" (2 options):
- **Max 5x** → `--plan max-5x`
- **Max 20x** → `--plan max-20x`

If they picked **Team**, ask "Which Team seat?" (2 options):
- **Team Standard** → `--plan team-std`
- **Team Premium** → `--plan team-prem`

If they picked **Enterprise**, ask "Which Enterprise tier?" (2 options):
- **Usage-based** → `--plan ent-usage`  *(credit is a public estimate)*
- **Premium seat** → `--plan ent-seat`  *(credit is a public estimate)*

If they picked **Pro** in Q1: skip Q2, use `--plan pro`.

When the user picks an Enterprise tier, briefly note in the narrative
that the credit ($20/mo usage-based, $200/mo Premium seat) is a public
estimate — actual contract credits may differ.

(There's no in-funnel option for the all-tiers view — that's by design.
If the user wants the multi-tier comparison, they can invoke the slash
command or bin without any `--plan` flag.)

## Step 2: run the analyzer

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/personal/bin/bill-check.mjs --plan <id>
```

(omit `--plan` for the show-all case.)

The script reads the user's local CC transcripts, breaks usage down by
invocation entrypoint (Interactive, Headless `-p`, Agent SDK, etc.),
and emits a "Programmatic usage impact" section with their selected
tier's headroom math + a coarse bottom-line verdict.

## Step 3: lead with the verdict, then show the data

After the script returns:

1. **Open with the verdict line.** The script's `bottomLine` is the
   centerpiece — restate it in your own voice, with the user's specific
   monthly and yearly dollar figures.
2. **Frame as problem or opportunity.** The change cuts two ways:
   - **Problem signal**: programmatic burn close to or over their
     tier's credit — call out the dollar shortfall in both monthly and
     yearly terms.
   - **Opportunity signal**: heavy interactive usage but low
     programmatic burn means the new credit is effectively unused
     headroom — there's room to shift automation work to scripts or the
     SDK without it counting against plan-normal limits.
3. **Then show the script's markdown output verbatim** so the user can
   audit the table and numbers.
4. **Offer next steps.** Sensible follow-ups: `--since YYYY-MM-DD` to
   narrow to a more recent window, `--json` for structured output,
   re-running with a different `--plan` to compare tiers.

## Context for the narrative

Anthropic announced on 2026-05-13 that starting **2026-06-15**,
programmatic usage (Agent SDK + `claude -p`) will no longer count
against Pro/Max/Team/Enterprise plan-normal limits. Each user gets a
separate monthly Agent SDK credit (Pro USD 20/mo, Max 5x USD 100/mo,
Max 20x USD 200/mo, Team Standard USD 20/mo, Team Premium USD 100/mo,
Enterprise estimated USD 20/USD 200 per month). The credit is billed
at full API rates, doesn't roll over, and can't be pooled across team
members.

**Interactive Claude Code (the terminal CLI) is unaffected** — that
usage continues to run on plan-normal limits. The script bucket-sorts
entrypoints accordingly: `cli` and other non-SDK entrypoints stay in
the "interactive" bucket; `sdk-cli`, `sdk-py`, `sdk-ts` are the
"programmatic" bucket the new credit applies to.

## If pricing.json looks stale

The script will flag any models without pricing entries in a footer.
If the user sees that footer, mention it and suggest filing an issue
to refresh `pricing.json` — old retired models in their history will
otherwise show zero cost.
