---
description: Estimate whether moving a team from a flat seat-based Claude plan (Pro/Max/Team) to Enterprise usage-based ($20/seat + API-rate usage) would cost more or less, projected from the invoking developer's real Claude Code usage.
---

The user is asking **"would my team be better off on Enterprise
usage-based pricing than on our current seats?"** Don't just run the
script — gather three inputs, then run it, then lead with the verdict.

## Step 1: gather the three inputs (one question each)

**Q1 — Current plan** (AskUserQuestion; these map to seat-price ids):

- **Team Premium** → `--plan team-prem` (includes Claude Code, USD 100/seat)
- **Team Standard** → `--plan team-std` (USD 20/seat)
- **Max** → ask a follow-up: Max 5x → `--plan max-5x`, Max 20x → `--plan max-20x`
- **Pro** → `--plan pro`

**Q2 — How do you use Claude Code relative to your team?** (AskUserQuestion):

- **Representative** — about average for the team → `--self-id representative`
- **Heavy** — one of the power users → `--self-id heavy`
- **Light** — below-average usage → `--self-id light`

This positions YOUR measured burn within the team distribution (heavy =
~90th percentile, representative = median, light = ~10th), which is how
the tool back-solves the rest of the team. Be honest — it materially
changes the estimate.

**Q3 — Team size:** ask how many people would hold a seat, and make
clear they should give their **exact** headcount, not a rounded guess —
the headline dollars scale linearly with it. Prefer a plain free-text
question so they can type the precise integer. If you use AskUserQuestion
with example sizes, tell them explicitly to pick "Other" and enter their
exact team size. Pass as `--seats <N>`.

## Step 2: run the analyzer

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/personal/bin/enterprise-cost.mjs --plan <id> --self-id <id> --seats <N>
```

The script reads the user's local Claude Code transcripts (subagents
rolled up), computes their real monthly burn at API rates, runs a
seeded Monte-Carlo across the team, and emits a markdown report.

## Step 3: lead with the verdict, then show the report

1. **Open with the bottom line** in your own voice: name the verdict
   (cheaper / pricier / toss-up) and the monthly AND yearly dollar delta
   between their current plan and the Enterprise expected case.
2. **Frame the why.** Enterprise is `USD 20/seat + metered usage`, while
   flat seats (esp. Team Premium, which bundles Claude Code) include
   usage. So Enterprise tends to win for **light** teams and lose for
   **heavy** ones — say which side they're on and why.
3. **Then show the script's markdown verbatim** so they can audit the
   per-developer model and the p10/p50/p90 band.
4. **Respect the uncertainty.** The team range is a model projection
   from one data point (theirs). If the band straddles their current
   cost, say it's genuinely a toss-up rather than forcing a call.
5. **Offer follow-ups:** `--since YYYY-MM-DD` to use only recent usage,
   `--json` for raw numbers, or re-running with a different `--self-id`
   to see how sensitive the verdict is to that assumption.

## Context for the narrative

Enterprise pricing (as of 2026-06-04, claude.com/pricing): **USD 20/seat +
usage at standard API rates**, ~50-seat minimum, annual contract.
Anthropic de-bundled tokens from Enterprise seats in early 2026, so the
seat is effectively a platform fee and every token bills on top. This
is why heavy Claude Code users are often cheaper on a flat Premium seat
(USD 100/seat, Claude Code included) than on metered Enterprise.

Enterprise also buys non-cost value (SSO, centralized admin, security,
data-retention controls) that this estimate does not price — mention it
if the verdict is close or if the user is weighing more than cost.

## If the history is thin

If the report flags a short history (<7 days) or the measured burn
looks far from Anthropic's USD 150–250/dev/mo reference, tell the user the
estimate is low-confidence and suggest re-running after more usage
accumulates, or without `--since`. A measured burn many times the
reference usually means the invoking developer is an unusually heavy
user — suggest they re-run with `--self-id heavy` so the team isn't
extrapolated from a power-user's numbers.
