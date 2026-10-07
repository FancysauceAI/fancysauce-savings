import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// dist/personal/bin/enterprise-cost.mjs
import { readFileSync as readFileSync2, realpathSync } from "node:fs";
import { parseArgs } from "node:util";
import { dirname, join as join2 } from "node:path";
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
function monthlyBurnUsd(sessions, pricing) {
  const agg = aggregate(sessions);
  let totalUsd = 0;
  const unknownModels = [];
  for (const [, a] of agg) {
    for (const [model, usage] of a.perModel) {
      const price = pricing.models[normalizeModelKey(model)];
      if (price) {
        totalUsd += costFor(usage, price);
      } else {
        const tokens = usage.input_tokens + usage.output_tokens + usage.cache_creation_5m + usage.cache_creation_1h + usage.cache_read;
        if (tokens === 0)
          continue;
        const existing = unknownModels.find((u) => u.model === model);
        if (existing) {
          existing.input_tokens += usage.input_tokens;
          existing.output_tokens += usage.output_tokens;
        } else {
          unknownModels.push({ model, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens });
        }
      }
    }
  }
  const dateRange = computeDateRange(sessions);
  const usdPerMonth = dateRange ? totalUsd * (DAYS_PER_MONTH / dateRange.days) : null;
  return { totalUsd, usdPerMonth, dateRange, unknownModels };
}

// dist/personal/bin/enterprise-cost.mjs
function loadEntPricing(path) {
  let raw;
  try {
    raw = readFileSync2(path, "utf8");
  } catch (err) {
    throw new Error(`enterprise-pricing.json not found at ${path}: ${err.message}`, { cause: err });
  }
  return JSON.parse(raw);
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function standardNormal(rng) {
  let u1 = 0;
  while (u1 === 0)
    u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function triangular(rng, min, mode, max) {
  const u = rng();
  const fc = (mode - min) / (max - min);
  if (u < fc)
    return min + Math.sqrt(u * (max - min) * (mode - min));
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}
var Z_BY_SELF_ID = {
  light: -1.2816,
  representative: 0,
  heavy: 1.2816
};
function medianPerDev(measuredUsd, selfId, sigma) {
  return measuredUsd * Math.exp(-Z_BY_SELF_ID[selfId] * sigma);
}
function percentile(sortedAsc, q) {
  if (sortedAsc.length === 0)
    return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor(q * sortedAsc.length));
  return sortedAsc[idx];
}
function simulateTeamUsage(opts) {
  const { measuredUsd, selfId, seats, ent, trials, seed } = opts;
  const rng = mulberry32(seed);
  const z = Z_BY_SELF_ID[selfId];
  const totals = new Array(trials);
  for (let t = 0; t < trials; t++) {
    const sigma = triangular(rng, ent.sigma.low, ent.sigma.mode, ent.sigma.high);
    const util = triangular(rng, ent.utilization.low, ent.utilization.mode, ent.utilization.high);
    const active = Math.round(seats * util);
    let sum = 0;
    for (let i = 0; i < active; i++) {
      sum += measuredUsd * Math.exp(sigma * (standardNormal(rng) - z));
    }
    totals[t] = sum;
  }
  totals.sort((a, b) => a - b);
  return { p10: percentile(totals, 0.1), p50: percentile(totals, 0.5), p90: percentile(totals, 0.9) };
}
function classifyDeal(entP10, entP90, currentTotal) {
  if (entP90 < currentTotal)
    return "cheaper";
  if (entP10 > currentTotal)
    return "pricier";
  return "break-even";
}
function buildCostBreakdown(opts) {
  const { usage, plan, seats, ent } = opts;
  const seat = ent.seats[plan];
  if (!seat) {
    const valid = Object.keys(ent.seats).join(", ");
    throw new Error(`unknown plan '${plan}'; expected one of: ${valid}`);
  }
  const currentTotal = seat.usd_per_month * seats;
  const fee = ent.enterprise_seat_usd_per_month * seats;
  const enterprise = { p10: fee + usage.p10, p50: fee + usage.p50, p90: fee + usage.p90 };
  const verdict = classifyDeal(enterprise.p10, enterprise.p90, currentTotal);
  return { currentTotal, usage, enterprise, verdict };
}
var DEFAULT_SEED = 1234567;
var DEFAULT_TRIALS = 1e4;
function parseFlags(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      plan: { type: "string" },
      "self-id": { type: "string" },
      seats: { type: "string" },
      since: { type: "string" },
      json: { type: "boolean", default: false },
      trials: { type: "string" },
      seed: { type: "string" },
      "projects-dir": { type: "string" }
    },
    allowPositionals: false
  });
  const plan = values.plan ?? null;
  if (!plan)
    throw new Error("--plan is required");
  const selfIdRaw = values["self-id"] ?? null;
  if (selfIdRaw !== "light" && selfIdRaw !== "representative" && selfIdRaw !== "heavy") {
    throw new Error("--self-id must be one of: light, representative, heavy");
  }
  const seats = Number(values.seats);
  if (!Number.isInteger(seats) || seats <= 0) {
    throw new Error("--seats must be a positive integer");
  }
  const since = values.since ?? null;
  if (since !== null && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    throw new Error(`--since must be YYYY-MM-DD; got '${since}'`);
  }
  const trials = values.trials ? Number(values.trials) : DEFAULT_TRIALS;
  if (!Number.isInteger(trials) || trials <= 0)
    throw new Error("--trials must be a positive integer");
  const seed = values.seed ? Number(values.seed) : DEFAULT_SEED;
  if (!Number.isFinite(seed))
    throw new Error("--seed must be a number");
  return {
    plan,
    selfId: selfIdRaw,
    seats,
    since,
    json: values.json ?? false,
    trials,
    seed,
    projectsDir: values["projects-dir"] ?? null
  };
}
function money(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
var yr = (mo) => mo * 12;
var VERDICT_HEADLINE = {
  cheaper: "**Enterprise is cheaper.**",
  pricier: "**Stay on seats \u2014 Enterprise costs more.**",
  "break-even": "**Toss-up \u2014 it depends on the month.**"
};
function renderMarkdown(r) {
  const { flags, burn, ent, breakdown, median } = r;
  const seat = ent.seats[flags.plan];
  const L = [];
  L.push("# Enterprise cost estimate");
  L.push("");
  L.push("## Your measured usage");
  L.push("");
  L.push(`Your Claude Code burn at API rates: **${money(burn.usdPerMonth ?? 0)}/mo** (~${money(yr(burn.usdPerMonth ?? 0))}/yr).`);
  if (burn.dateRange) {
    const { earliest, latest, days } = burn.dateRange;
    L.push(`Amortized across ${days.toFixed(1)} days of history (${earliest.slice(0, 10)} \u2192 ${latest.slice(0, 10)}).`);
    if (days < 7)
      L.push(`> \u26A0\uFE0F Short history (<7 days) \u2014 treat this as low-confidence.`);
  }
  L.push("");
  L.push("## Per-developer model");
  L.push("");
  L.push(`You self-identified as a **${flags.selfId}** user (anchored at the ${(ent.self_id_percentile[flags.selfId] * 100).toFixed(0)}th percentile).`);
  L.push(`Inferred median developer: **${money(median)}/mo**. Spread modeled log-normal (\u03C3 ${ent.sigma.low}\u2013${ent.sigma.high}, central ${ent.sigma.mode}); active-seat fraction ${ent.utilization.low}\u2013${ent.utilization.high} (central ${ent.utilization.mode}).`);
  L.push(`Anthropic's own published reference is ${money(ent.anthropic_reference.per_dev_month_low)}\u2013${money(ent.anthropic_reference.per_dev_month_high)}/dev/mo for enterprise Claude Code.`);
  L.push("");
  L.push(`## Team projection (${flags.seats} seats)`);
  L.push("");
  L.push("| Scenario | Monthly | Yearly |");
  L.push("|---|---:|---:|");
  L.push(`| Current: ${seat.label} flat (${money(seat.usd_per_month)}/seat) | ${money(breakdown.currentTotal)} | ${money(yr(breakdown.currentTotal))} |`);
  L.push(`| Enterprise \u2014 low (p10) | ${money(breakdown.enterprise.p10)} | ${money(yr(breakdown.enterprise.p10))} |`);
  L.push(`| Enterprise \u2014 expected (p50) | ${money(breakdown.enterprise.p50)} | ${money(yr(breakdown.enterprise.p50))} |`);
  L.push(`| Enterprise \u2014 high (p90) | ${money(breakdown.enterprise.p90)} | ${money(yr(breakdown.enterprise.p90))} |`);
  L.push("");
  L.push(`Enterprise = ${money(ent.enterprise_seat_usd_per_month)}/seat \xD7 ${flags.seats} + metered usage at API rates.`);
  L.push("");
  const delta = breakdown.currentTotal - breakdown.enterprise.p50;
  const deltaWord = delta >= 0 ? "save" : "cost an extra";
  L.push("## Bottom line");
  L.push("");
  L.push(`${VERDICT_HEADLINE[breakdown.verdict]} At the expected case, switching to Enterprise would ${deltaWord} **${money(Math.abs(delta))}/mo** (~${money(Math.abs(yr(delta)))}/yr) vs your current ${seat.label} plan.`);
  L.push("");
  L.push("---");
  L.push("");
  L.push(`**Caveats.** The team range is a model imputation: no vendor publishes a true per-seat usage Gini, and the real tail may be heavier than log-normal. Enterprise also buys non-cost value (SSO, admin, security, data controls) not priced here. Seat prices as of ${ent.last_updated} (${ent.source_url}).`);
  if (burn.unknownModels.length > 0) {
    L.push("");
    L.push("Models with no pricing entry (excluded from cost):");
    for (const u of burn.unknownModels) {
      L.push(`- ${u.model}: ${u.input_tokens.toLocaleString("en-US")} input, ${u.output_tokens.toLocaleString("en-US")} output`);
    }
  }
  return L.join("\n") + "\n";
}
function renderJson(r) {
  const { flags, burn, breakdown, median, ent } = r;
  return JSON.stringify({
    measured_usd_per_month: burn.usdPerMonth,
    date_range: burn.dateRange,
    self_id: flags.selfId,
    inferred_median_usd_per_month: median,
    seats: flags.seats,
    current_plan: flags.plan,
    current_total_usd: breakdown.currentTotal,
    enterprise_seat_usd: ent.enterprise_seat_usd_per_month,
    enterprise_total_usd: breakdown.enterprise,
    usage_usd: breakdown.usage,
    verdict: breakdown.verdict,
    unknown_models: burn.unknownModels,
    pricing: { last_updated: ent.last_updated, source_url: ent.source_url }
  }, null, 2);
}
async function main(opts) {
  const flags = parseFlags(opts.argv);
  const pricing = loadPricing(opts.pricingPath);
  const ent = loadEntPricing(opts.entPath);
  const { sessions } = await collectSessions(opts.projectsDir, flags.since);
  if (sessions.length === 0) {
    const msg = "No Claude Code transcripts found at " + opts.projectsDir + ".\n";
    opts.stdout.write(msg);
    return msg;
  }
  const burn = monthlyBurnUsd(sessions, pricing);
  if (burn.usdPerMonth === null) {
    const msg = "Transcripts found, but none carry timestamps \u2014 cannot amortize a monthly burn.\n";
    opts.stdout.write(msg);
    return msg;
  }
  const usage = simulateTeamUsage({
    measuredUsd: burn.usdPerMonth,
    selfId: flags.selfId,
    seats: flags.seats,
    ent,
    trials: flags.trials,
    seed: flags.seed
  });
  const breakdown = buildCostBreakdown({ usage, plan: flags.plan, seats: flags.seats, ent });
  const median = medianPerDev(burn.usdPerMonth, flags.selfId, ent.sigma.mode);
  const input = { flags, burn, ent, breakdown, median };
  const out = flags.json ? renderJson(input) : renderMarkdown(input);
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
  const entPath = join2(here, "..", "data", "enterprise-pricing.json");
  let cliProjectsDir = join2(homedir(), ".claude", "projects");
  try {
    const f = parseFlags(process.argv.slice(2));
    if (f.projectsDir)
      cliProjectsDir = f.projectsDir;
  } catch {
  }
  main({ projectsDir: cliProjectsDir, pricingPath, entPath, argv: process.argv.slice(2), stdout: process.stdout }).catch((err) => {
    process.stderr.write(`enterprise-cost: ${err.message}
`);
    process.exit(1);
  });
}
export {
  Z_BY_SELF_ID,
  buildCostBreakdown,
  classifyDeal,
  loadEntPricing,
  main,
  medianPerDev,
  mulberry32,
  parseFlags,
  renderJson,
  renderMarkdown,
  simulateTeamUsage,
  standardNormal,
  triangular
};
