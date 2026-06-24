import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// dist/personal/bin/bill-check.mjs
import { realpathSync } from "node:fs";
import { parseArgs } from "node:util";
import { join as join2, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

// dist/personal/lib/usage.mjs
import { createReadStream, readFileSync, readdirSync, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
function normalizeModelKey(modelId) {
  return modelId.replace(/-\d{8}$/, "");
}
function costFor(usage, price) {
  const perMtok = 1e6;
  return usage.input_tokens / perMtok * price.input_per_mtok + usage.output_tokens / perMtok * price.output_per_mtok + usage.cache_creation_5m / perMtok * price.cache_write_5m_per_mtok + usage.cache_creation_1h / perMtok * price.cache_write_1h_per_mtok + usage.cache_read / perMtok * price.cache_read_per_mtok;
}
function loadPricing(path) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(`pricing.json not found at ${path}: ${err.message}`, { cause: err });
  }
  return JSON.parse(raw);
}
function emptyUsage() {
  return {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_5m: 0,
    cache_creation_1h: 0,
    cache_read: 0
  };
}
async function extractSession(path) {
  const rec = {
    entrypoint: "unknown",
    start_ts: null,
    perModel: /* @__PURE__ */ new Map(),
    malformedLines: 0
  };
  let entrypointLocked = false;
  const seenMessageIds = /* @__PURE__ */ new Set();
  const rl = createInterface({
    input: createReadStream(path, { encoding: "utf8" }),
    crlfDelay: Infinity
  });
  for await (const line of rl) {
    if (line.trim() === "")
      continue;
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      rec.malformedLines++;
      continue;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      rec.malformedLines++;
      continue;
    }
    if (!entrypointLocked && typeof parsed.entrypoint === "string" && parsed.entrypoint) {
      rec.entrypoint = parsed.entrypoint;
      entrypointLocked = true;
    }
    if (rec.start_ts === null && typeof parsed.timestamp === "string") {
      rec.start_ts = parsed.timestamp;
    }
    if (parsed.type === "assistant") {
      const a = parsed;
      const id = a.message?.id;
      if (typeof id === "string" && id) {
        if (seenMessageIds.has(id))
          continue;
        seenMessageIds.add(id);
      }
      const model = a.message?.model;
      const usage = a.message?.usage;
      if (model && usage) {
        let bucket = rec.perModel.get(model);
        if (!bucket) {
          bucket = emptyUsage();
          rec.perModel.set(model, bucket);
        }
        bucket.input_tokens += usage.input_tokens ?? 0;
        bucket.output_tokens += usage.output_tokens ?? 0;
        bucket.cache_creation_5m += usage.cache_creation?.ephemeral_5m_input_tokens ?? 0;
        bucket.cache_creation_1h += usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
        bucket.cache_read += usage.cache_read_input_tokens ?? 0;
      }
    }
  }
  return rec;
}
function aggregate(sessions) {
  const out = /* @__PURE__ */ new Map();
  for (const s of sessions) {
    let bucket = out.get(s.entrypoint);
    if (!bucket) {
      bucket = { sessions: 0, perModel: /* @__PURE__ */ new Map() };
      out.set(s.entrypoint, bucket);
    }
    bucket.sessions++;
    for (const [model, usage] of s.perModel) {
      let mb = bucket.perModel.get(model);
      if (!mb) {
        mb = emptyUsage();
        bucket.perModel.set(model, mb);
      }
      mb.input_tokens += usage.input_tokens;
      mb.output_tokens += usage.output_tokens;
      mb.cache_creation_5m += usage.cache_creation_5m;
      mb.cache_creation_1h += usage.cache_creation_1h;
      mb.cache_read += usage.cache_read;
    }
  }
  return out;
}
var DAYS_PER_MONTH = 30.4375;
async function collectSessions(projectsDir, since) {
  let projects = [];
  try {
    projects = readdirSync(projectsDir).map((name) => join(projectsDir, name)).filter((p) => {
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
  }
  const transcripts = [];
  for (const proj of projects) {
    try {
      for (const f of readdirSync(proj)) {
        if (!f.endsWith(".jsonl"))
          continue;
        const full = join(proj, f);
        try {
          if (statSync(full).isFile())
            transcripts.push(full);
        } catch {
        }
      }
    } catch {
    }
  }
  const sessions = [];
  let totalMalformed = 0;
  let sessionsDroppedNoTimestamp = 0;
  for (const t of transcripts) {
    try {
      const s = await extractSession(t);
      const sidDir = t.replace(/\.jsonl$/, "");
      try {
        const subDir = join(sidDir, "subagents");
        if (statSync(subDir).isDirectory()) {
          for (const sf of readdirSync(subDir)) {
            if (!sf.endsWith(".jsonl"))
              continue;
            try {
              const sub = await extractSession(join(subDir, sf));
              for (const [model, usage] of sub.perModel) {
                let bucket = s.perModel.get(model);
                if (!bucket) {
                  bucket = { ...usage };
                  s.perModel.set(model, bucket);
                } else {
                  bucket.input_tokens += usage.input_tokens;
                  bucket.output_tokens += usage.output_tokens;
                  bucket.cache_creation_5m += usage.cache_creation_5m;
                  bucket.cache_creation_1h += usage.cache_creation_1h;
                  bucket.cache_read += usage.cache_read;
                }
              }
              s.malformedLines += sub.malformedLines;
            } catch {
            }
          }
        }
      } catch {
      }
      if (since) {
        if (s.start_ts === null) {
          sessionsDroppedNoTimestamp++;
          continue;
        }
        if (s.start_ts < since)
          continue;
      }
      sessions.push(s);
      totalMalformed += s.malformedLines;
    } catch {
    }
  }
  return { sessions, totalMalformed, sessionsDroppedNoTimestamp, transcriptCount: transcripts.length };
}
function computeDateRange(sessions) {
  const timestamps = sessions.map((s) => s.start_ts).filter((ts) => ts !== null).sort();
  if (timestamps.length === 0)
    return null;
  return {
    earliest: timestamps[0],
    latest: timestamps[timestamps.length - 1],
    days: Math.max(1, (Date.parse(timestamps[timestamps.length - 1]) - Date.parse(timestamps[0])) / 864e5)
  };
}

// dist/personal/bin/bill-check.mjs
var AGENTIC_ENTRYPOINTS = /* @__PURE__ */ new Set(["sdk-cli", "sdk-py", "sdk-ts"]);
var PLAN_TIERS = Object.freeze([
  { id: "pro", label: "Pro", credit: 20 },
  { id: "max-5x", label: "Max 5x", credit: 100 },
  { id: "max-20x", label: "Max 20x", credit: 200 },
  { id: "team-std", label: "Team (Standard)", credit: 20 },
  { id: "team-prem", label: "Team (Premium)", credit: 100 },
  { id: "ent-usage", label: "Enterprise (usage-based)", credit: 20, estimated: true },
  { id: "ent-seat", label: "Enterprise (Premium seat)", credit: 200, estimated: true }
]);
function classifyVerdict(burn, credit) {
  if (burn > credit)
    return "over";
  if (burn > credit * 0.5)
    return "tight";
  return "well-under";
}
function abbr(n) {
  if (n >= 1e12)
    return (n / 1e12).toFixed(1).replace(/\.0$/, "") + "T";
  if (n >= 1e9)
    return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1e6)
    return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3)
    return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString("en-US");
}
function money(n) {
  return "$" + n.toFixed(2);
}
function buildPlanImpact(agenticBurn, interactiveBurn, planFilter) {
  const tiers = (planFilter ? PLAN_TIERS.filter((t) => t.id === planFilter) : PLAN_TIERS).map((tier) => ({
    tier,
    headroom: tier.credit - agenticBurn,
    verdict: classifyVerdict(agenticBurn, tier.credit)
  }));
  const m = (n) => `$${n.toFixed(2)}`;
  const my = (monthlyAmt) => `${m(monthlyAmt)}/mo (~${m(monthlyAmt * 12)}/yr)`;
  const ratio = agenticBurn > 0 ? interactiveBurn / agenticBurn : Infinity;
  let bottomLine;
  if (agenticBurn === 0) {
    bottomLine = `**Non-event.** No programmatic usage (Agent SDK / \`claude -p\`) in your history. The June 15 change does nothing to your workflow.`;
  } else if (tiers.length === 1) {
    const t = tiers[0];
    const interactiveSuffix = ratio >= 5 ? ` Interactive usage is ~${ratio.toFixed(0)}\xD7 larger (${my(interactiveBurn)}) and stays on plan-normal limits.` : "";
    if (t.verdict === "over") {
      bottomLine = `**Plan for overage.** Your ${my(agenticBurn)} programmatic burn exceeds ${t.tier.label}'s ${m(t.tier.credit)}/mo Agent SDK credit by ${my(-t.headroom)}. After June 15, expect overage charges unless usage drops.`;
    } else if (t.verdict === "tight") {
      bottomLine = `**Watch the cap.** Your ${my(agenticBurn)} programmatic burn is more than half ${t.tier.label}'s ${m(t.tier.credit)}/mo Agent SDK credit (${my(t.headroom)} headroom). A modest growth in automation would push you into overage after June 15.`;
    } else {
      bottomLine = `**Free runway.** Your ${my(agenticBurn)} programmatic burn fits ${t.tier.label}'s ${m(t.tier.credit)}/mo Agent SDK credit with ${my(t.headroom)} of unused headroom.` + interactiveSuffix + ` The new credit is effectively bonus capacity: any interactive work you shift to scripts or the SDK after June 15 lands on this separate budget.`;
    }
  } else {
    const overs = tiers.filter((t) => t.verdict === "over");
    const lowCreditTiers = tiers.filter((t) => t.tier.credit <= 20);
    const midCreditTiers = tiers.filter((t) => t.tier.credit > 20 && t.tier.credit <= 100);
    if (overs.length === tiers.length) {
      const topTier = overs.reduce((a, b) => a.tier.credit >= b.tier.credit ? a : b);
      bottomLine = `**Plan for overage.** Your ${my(agenticBurn)} programmatic burn exceeds every Agent SDK credit tier \u2014 even ${topTier.tier.label} falls short by ${my(-topTier.headroom)}. After June 15, expect overage charges unless usage drops.`;
    } else if (overs.length > 0 && lowCreditTiers.every((t) => t.verdict === "over") && midCreditTiers.every((t) => t.verdict === "over")) {
      bottomLine = `**Get on the top tier or pay overage.** Your ${my(agenticBurn)} programmatic burn fits inside Max 20x's $200/mo (~$2,400/yr) credit but blows past every cheaper tier. After June 15, lower tiers will hit overage.`;
    } else if (lowCreditTiers.every((t) => t.verdict === "over")) {
      bottomLine = `**Pro / Team-Standard won't cut it.** Your ${my(agenticBurn)} programmatic burn exceeds the $20/mo (~$240/yr) Agent SDK credit on those tiers. You'll need Max 5x ($100/mo, ~$1,200/yr) or higher to absorb the change.`;
    } else if (tiers.every((t) => t.verdict === "well-under") && ratio >= 5) {
      const lowestHeadroom = Math.min(...tiers.map((t) => t.headroom));
      bottomLine = `**Free runway.** Your ${my(agenticBurn)} programmatic burn fits inside every tier with at least ${my(lowestHeadroom)} of unused headroom \u2014 and your interactive usage is ~${ratio.toFixed(0)}\xD7 larger (${my(interactiveBurn)}, stays on plan-normal limits). The new credit is effectively bonus capacity: any interactive work you shift to scripts or the SDK after June 15 lands on this separate budget.`;
    } else if (tiers.every((t) => t.verdict === "well-under")) {
      bottomLine = `**Plenty of headroom.** Your ${my(agenticBurn)} programmatic burn fits comfortably inside every Agent SDK credit tier. Interactive usage (${my(interactiveBurn)}) is unaffected.`;
    } else {
      const tightLabels = tiers.filter((t) => t.verdict === "tight").map((t) => t.tier.label).join(", ");
      bottomLine = `**Watch the cheaper tiers.** Your ${my(agenticBurn)} programmatic burn is more than half the Agent SDK credit on: ${tightLabels}. A modest growth in automation would push those tiers into overage.`;
    }
  }
  return {
    agenticBurnUsdPerMonth: agenticBurn,
    interactiveUsdPerMonth: interactiveBurn,
    effectiveDate: "2026-06-15",
    tiers,
    bottomLine
  };
}
function verdictLabel(v) {
  switch (v) {
    case "well-under":
      return "fits with room";
    case "tight":
      return "tight";
    case "over":
      return "**OVER**";
  }
}
function displayEntrypoint(ep) {
  switch (ep) {
    case "cli":
      return "Interactive";
    case "sdk-cli":
      return "Headless (-p)";
    case "sdk-py":
      return "Agent SDK (Python)";
    case "sdk-ts":
      return "Agent SDK (Node)";
    case "claude-vscode":
      return "Claude in VSCode";
    case "unknown":
      return "Unknown";
    default:
      return ep;
  }
}
function sumAggregateUsage(a) {
  const total = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_5m: 0,
    cache_creation_1h: 0,
    cache_read: 0
  };
  for (const u of a.perModel.values()) {
    total.input_tokens += u.input_tokens;
    total.output_tokens += u.output_tokens;
    total.cache_creation_5m += u.cache_creation_5m;
    total.cache_creation_1h += u.cache_creation_1h;
    total.cache_read += u.cache_read;
  }
  return total;
}
function costForAggregate(a, pricing) {
  let total = 0;
  for (const [model, usage] of a.perModel) {
    const price = pricing.models[normalizeModelKey(model)];
    if (price)
      total += costFor(usage, price);
  }
  return total;
}
function renderMarkdown(agg, pricing, meta) {
  const rows = [];
  for (const [ep, a] of agg) {
    const sum = sumAggregateUsage(a);
    rows.push({
      entrypoint: ep,
      sessions: a.sessions,
      input: sum.input_tokens,
      output: sum.output_tokens,
      cacheRead: sum.cache_read,
      cost: costForAggregate(a, pricing)
    });
  }
  rows.sort((x, y) => {
    if (x.entrypoint === "unknown" && y.entrypoint !== "unknown")
      return 1;
    if (y.entrypoint === "unknown" && x.entrypoint !== "unknown")
      return -1;
    return y.cost - x.cost;
  });
  const total = rows.reduce((acc, r) => ({
    sessions: acc.sessions + r.sessions,
    input: acc.input + r.input,
    output: acc.output + r.output,
    cacheRead: acc.cacheRead + r.cacheRead,
    cost: acc.cost + r.cost
  }), { sessions: 0, input: 0, output: 0, cacheRead: 0, cost: 0 });
  const monthlyMultiplier = meta.dateRange ? DAYS_PER_MONTH / meta.dateRange.days : null;
  const yearlyMultiplier = monthlyMultiplier === null ? null : monthlyMultiplier * 12;
  const monthly = (cost) => monthlyMultiplier === null ? "\u2014" : money(cost * monthlyMultiplier);
  const yearly = (cost) => yearlyMultiplier === null ? "\u2014" : money(cost * yearlyMultiplier);
  const lines = [];
  lines.push("# Usage by entrypoint");
  lines.push("");
  lines.push("| Entrypoint | Sessions | Input | Output | Cache read | Est. cost | Est./mo | Est./yr |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const r of rows) {
    lines.push(`| ${displayEntrypoint(r.entrypoint)} | ${r.sessions.toLocaleString("en-US")} | ${abbr(r.input)} | ${abbr(r.output)} | ${abbr(r.cacheRead)} | ${money(r.cost)} | ${monthly(r.cost)} | ${yearly(r.cost)} |`);
  }
  lines.push(`| **Total** | ${total.sessions.toLocaleString("en-US")} | ${abbr(total.input)} | ${abbr(total.output)} | ${abbr(total.cacheRead)} | ${money(total.cost)} | ${monthly(total.cost)} | ${yearly(total.cost)} |`);
  lines.push("");
  lines.push(`Pricing as of ${pricing.last_updated} (${pricing.source_url}).`);
  if (meta.dateRange) {
    const { earliest, latest, days } = meta.dateRange;
    lines.push(`Monthly estimate amortized across ${days.toFixed(1)} days of history (${earliest.slice(0, 10)} \u2192 ${latest.slice(0, 10)}).`);
  }
  if (meta.malformedLines > 0) {
    lines.push(`${meta.malformedLines} malformed lines skipped.`);
  }
  if (meta.sessionsDroppedNoTimestamp && meta.sessionsDroppedNoTimestamp > 0) {
    lines.push(`${meta.sessionsDroppedNoTimestamp} sessions skipped (no parseable timestamp; --since filter applied).`);
  }
  if (meta.unknownModels.length > 0) {
    lines.push("Models with no pricing entry (excluded from cost):");
    for (const u of meta.unknownModels) {
      lines.push(`- ${u.model}: ${abbr(u.input_tokens)} input, ${abbr(u.output_tokens)} output`);
    }
  }
  if (meta.planImpact) {
    const pi = meta.planImpact;
    const yr = (mo) => mo * 12;
    lines.push("");
    lines.push(`## Programmatic usage impact (effective ${pi.effectiveDate})`);
    lines.push("");
    lines.push(`Starting ${pi.effectiveDate}, programmatic usage (Agent SDK + \`claude -p\`) moves off plan-normal limits onto a separate monthly credit. Your programmatic burn at full API rates: **${money(pi.agenticBurnUsdPerMonth)}/mo** (~${money(yr(pi.agenticBurnUsdPerMonth))}/yr). Interactive remains on plan limits (${money(pi.interactiveUsdPerMonth)}/mo, ~${money(yr(pi.interactiveUsdPerMonth))}/yr, unaffected).`);
    lines.push("");
    if (pi.tiers.length === 1) {
      const t = pi.tiers[0];
      const creditLabel = t.tier.estimated ? `${money(t.tier.credit)} (est.)` : money(t.tier.credit);
      const headroomMo = t.headroom;
      const headroomYr = yr(headroomMo);
      const headroomLabel = headroomMo >= 0 ? `${money(headroomMo)}/mo (~${money(headroomYr)}/yr) unused` : `\u2212${money(-headroomMo).slice(1)}/mo (~\u2212${money(-headroomYr).slice(1)}/yr) shortfall`;
      lines.push(`- **Plan:** ${t.tier.label}`);
      lines.push(`- **Agent SDK credit:** ${creditLabel}/mo (~${money(yr(t.tier.credit))}/yr)`);
      lines.push(`- **Your burn:** ${money(pi.agenticBurnUsdPerMonth)}/mo (~${money(yr(pi.agenticBurnUsdPerMonth))}/yr)`);
      lines.push(`- **Headroom:** ${headroomLabel}`);
    } else {
      lines.push("| Plan tier | Credit (mo) | Credit (yr) | Your burn (mo) | Headroom (mo) | Headroom (yr) | Verdict |");
      lines.push("|---|---:|---:|---:|---:|---:|---|");
      for (const t of pi.tiers) {
        const creditMo = t.tier.estimated ? `${money(t.tier.credit)} (est.)` : money(t.tier.credit);
        const creditYr = money(yr(t.tier.credit));
        const headMo = t.headroom >= 0 ? money(t.headroom) : `\u2212${money(-t.headroom).slice(1)}`;
        const headYr = t.headroom >= 0 ? money(yr(t.headroom)) : `\u2212${money(-yr(t.headroom)).slice(1)}`;
        lines.push(`| ${t.tier.label} | ${creditMo} | ${creditYr} | ${money(pi.agenticBurnUsdPerMonth)} | ${headMo} | ${headYr} | ${verdictLabel(t.verdict)} |`);
      }
    }
    lines.push("");
    lines.push("---");
    lines.push(`### Bottom line`);
    lines.push("");
    lines.push(pi.bottomLine);
  }
  return lines.join("\n") + "\n";
}
function parseFlags(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      since: { type: "string" },
      json: { type: "boolean", default: false },
      plan: { type: "string" },
      "projects-dir": { type: "string" }
    },
    allowPositionals: false
  });
  const since = values.since ?? null;
  if (since !== null && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    throw new Error(`--since must be YYYY-MM-DD; got '${since}'`);
  }
  const plan = values.plan ?? null;
  if (plan !== null && !PLAN_TIERS.some((t) => t.id === plan)) {
    const valid = PLAN_TIERS.map((t) => t.id).join(", ");
    throw new Error(`--plan must be one of: ${valid}; got '${plan}'`);
  }
  return {
    since,
    json: values.json ?? false,
    plan,
    projectsDir: values["projects-dir"] ?? null
  };
}
function renderJson(agg, pricing, meta) {
  const byEntrypoint = [...agg.entries()].map(([ep, a]) => {
    const sum = sumAggregateUsage(a);
    const byModel = [...a.perModel.entries()].map(([model, usage]) => {
      const price = pricing.models[normalizeModelKey(model)];
      return {
        model,
        input: usage.input_tokens,
        output: usage.output_tokens,
        cache_creation_5m: usage.cache_creation_5m,
        cache_creation_1h: usage.cache_creation_1h,
        cache_read: usage.cache_read,
        cost_usd: price ? costFor(usage, price) : 0,
        priced: !!price
      };
    });
    const cost_usd = byModel.reduce((s, m) => s + m.cost_usd, 0);
    return {
      entrypoint: ep,
      sessions: a.sessions,
      input: sum.input_tokens,
      output: sum.output_tokens,
      cache_creation_5m: sum.cache_creation_5m,
      cache_creation_1h: sum.cache_creation_1h,
      cache_read: sum.cache_read,
      cost_usd,
      cost_usd_per_month: meta.dateRange ? cost_usd * (DAYS_PER_MONTH / meta.dateRange.days) : null,
      by_model: byModel
    };
  });
  const totals = byEntrypoint.reduce((acc, r) => ({
    sessions: acc.sessions + r.sessions,
    input: acc.input + r.input,
    output: acc.output + r.output,
    cache_read: acc.cache_read + r.cache_read,
    cost_usd: acc.cost_usd + r.cost_usd
  }), { sessions: 0, input: 0, output: 0, cache_read: 0, cost_usd: 0 });
  const totalsWithMonthly = {
    ...totals,
    cost_usd_per_month: meta.dateRange ? totals.cost_usd * (DAYS_PER_MONTH / meta.dateRange.days) : null
  };
  return JSON.stringify({
    pricing: { last_updated: pricing.last_updated, source_url: pricing.source_url },
    date_range: meta.dateRange ?? null,
    totals: totalsWithMonthly,
    by_entrypoint: byEntrypoint,
    plan_impact: meta.planImpact ?? null,
    warnings: {
      malformed_lines: meta.malformedLines,
      unknown_models: meta.unknownModels,
      sessions_dropped_no_timestamp: meta.sessionsDroppedNoTimestamp ?? 0
    }
  }, null, 2);
}
async function main(opts) {
  const flags = parseFlags(opts.argv);
  const pricing = loadPricing(opts.pricingPath);
  const { sessions, totalMalformed, sessionsDroppedNoTimestamp, transcriptCount } = await collectSessions(opts.projectsDir, flags.since);
  if (transcriptCount === 0) {
    const msg = "No Claude Code transcripts found at " + opts.projectsDir + ".\n";
    opts.stdout.write(msg);
    return msg;
  }
  const agg = aggregate(sessions);
  const unknownModels = [];
  for (const [, a] of agg) {
    for (const [model, usage] of a.perModel) {
      if (!pricing.models[normalizeModelKey(model)]) {
        const tokens = usage.input_tokens + usage.output_tokens + usage.cache_creation_5m + usage.cache_creation_1h + usage.cache_read;
        if (tokens === 0)
          continue;
        const existing = unknownModels.find((u) => u.model === model);
        if (existing) {
          existing.input_tokens += usage.input_tokens;
          existing.output_tokens += usage.output_tokens;
        } else {
          unknownModels.push({
            model,
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens
          });
        }
      }
    }
  }
  const dateRange = computeDateRange(sessions);
  let planImpact = null;
  if (dateRange) {
    const monthlyMult = DAYS_PER_MONTH / dateRange.days;
    let agenticBurn = 0;
    let interactiveBurn = 0;
    for (const [ep, a] of agg) {
      const cost = costForAggregate(a, pricing) * monthlyMult;
      if (AGENTIC_ENTRYPOINTS.has(ep))
        agenticBurn += cost;
      else
        interactiveBurn += cost;
    }
    planImpact = buildPlanImpact(agenticBurn, interactiveBurn, flags.plan);
  }
  const meta = {
    malformedLines: totalMalformed,
    unknownModels,
    dateRange,
    planImpact,
    ...flags.since ? { sessionsDroppedNoTimestamp } : {}
  };
  const out = flags.json ? renderJson(agg, pricing, meta) : renderMarkdown(agg, pricing, meta);
  opts.stdout.write(out);
  return out;
}
var isDirectInvocation = (() => {
  try {
    if (!process.argv[1])
      return false;
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return false;
  }
})();
if (isDirectInvocation) {
  const here = dirname(fileURLToPath(import.meta.url));
  const pricingPath = join2(here, "..", "data", "pricing.json");
  let cliProjectsDir = join2(homedir(), ".claude", "projects");
  try {
    const f = parseFlags(process.argv.slice(2));
    if (f.projectsDir)
      cliProjectsDir = f.projectsDir;
  } catch {
  }
  main({ projectsDir: cliProjectsDir, pricingPath, argv: process.argv.slice(2), stdout: process.stdout }).catch((err) => {
    process.stderr.write(`bill-check: ${err.message}
`);
    process.exit(1);
  });
}
export {
  PLAN_TIERS,
  aggregate,
  buildPlanImpact,
  classifyVerdict,
  costFor,
  extractSession,
  loadPricing,
  main,
  normalizeModelKey,
  parseFlags,
  renderJson,
  renderMarkdown
};
