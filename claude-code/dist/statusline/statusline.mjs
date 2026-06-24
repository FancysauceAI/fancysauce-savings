import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// dist/statusline/statusline.mjs
import { readFileSync as readFileSync3, writeFileSync as writeFileSync2, mkdirSync, readdirSync, openSync, readSync, closeSync, statSync } from "node:fs";
import { join as join3 } from "node:path";
import { homedir } from "node:os";

// dist/statusline/config.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";

// dist/statusline/statusline-types.mjs
var DEFAULT_THRESHOLDS = {
  context_warn: 50,
  context_crit: 80,
  usage_warn: 50,
  usage_crit: 80,
  cache_expiry_warn: 120,
  cache_expiry_crit: 30,
  io_jump_warn: 5e4
};
var DEFAULT_SEGMENTS = {
  model: true,
  context_bar: true,
  cache_expiry: true,
  usage: true,
  io_tokens: true
};
var DEFAULT_STATUS_LINE_CONFIG = {
  refresh_interval: 5,
  max_width: 100,
  thresholds: { ...DEFAULT_THRESHOLDS },
  segments: { ...DEFAULT_SEGMENTS }
};

// dist/statusline/config.mjs
function defaults() {
  return {
    ...DEFAULT_STATUS_LINE_CONFIG,
    thresholds: { ...DEFAULT_THRESHOLDS },
    segments: { ...DEFAULT_SEGMENTS }
  };
}
function loadStatusLineConfig(dataDir) {
  try {
    const raw = readFileSync(join(dataDir, "config.json"), "utf-8");
    const config = JSON.parse(raw);
    if (typeof config !== "object" || config === null)
      return defaults();
    const obj = config;
    const sl = obj["status_line"];
    if (typeof sl !== "object" || sl === null)
      return defaults();
    const partial = sl;
    return {
      refresh_interval: typeof partial.refresh_interval === "number" ? partial.refresh_interval : DEFAULT_STATUS_LINE_CONFIG.refresh_interval,
      max_width: typeof partial.max_width === "number" ? partial.max_width : DEFAULT_STATUS_LINE_CONFIG.max_width,
      thresholds: {
        ...DEFAULT_THRESHOLDS,
        ...typeof partial.thresholds === "object" && partial.thresholds !== null ? partial.thresholds : {}
      },
      segments: {
        ...DEFAULT_SEGMENTS,
        ...typeof partial.segments === "object" && partial.segments !== null ? partial.segments : {}
      }
    };
  } catch {
    return defaults();
  }
}

// dist/statusline/ansi.mjs
var RESET = "\x1B[0m";
var YELLOW = "\x1B[33m";
var RED = "\x1B[31m";
var GREEN = "\x1B[32m";
var CYAN = "\x1B[36m";
var DIM = "\x1B[2m";
var Severity;
(function(Severity2) {
  Severity2["none"] = "none";
  Severity2["warn"] = "warn";
  Severity2["crit"] = "crit";
})(Severity || (Severity = {}));
function colorize(text, severity) {
  switch (severity) {
    case Severity.warn:
      return `${YELLOW}${text}${RESET}`;
    case Severity.crit:
      return `${RED}${text}${RESET}`;
    default:
      return `${GREEN}${text}${RESET}`;
  }
}
function dim(text) {
  return `${DIM}${text}${RESET}`;
}
function visibleLength(text) {
  return [...text.replace(/\x1b\[[0-9;]*m/g, "")].length;
}
function cyan(text) {
  return `${CYAN}${text}${RESET}`;
}
function severityFromThresholds(value, warn, crit) {
  if (value >= crit)
    return Severity.crit;
  if (value >= warn)
    return Severity.warn;
  return Severity.none;
}
function severityFromDescending(value, warn, crit) {
  if (value <= crit)
    return Severity.crit;
  if (value <= warn)
    return Severity.warn;
  return Severity.none;
}
function colorBar(filled, empty, severity) {
  const filledStr = "\u2593".repeat(filled);
  const emptyStr = "\u2591".repeat(empty);
  return colorize(filledStr, severity) + dim(emptyStr);
}

// dist/statusline/segments.mjs
var MODEL_MAX = 18;
function trimModelName(name) {
  const stripped = name.replace(/^claude-/i, "");
  if (stripped.length <= MODEL_MAX)
    return stripped;
  return stripped.slice(0, MODEL_MAX - 1) + "\u2026";
}
function formatK(n) {
  if (n >= 1e6)
    return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3)
    return `${Math.floor(n / 1e3)}k`;
  return String(n);
}
function modelSegment(data, config) {
  if (!config.segments.model)
    return null;
  return cyan(`[${trimModelName(data.model.display_name)}]`);
}
function contextSegment(data, config) {
  if (!config.segments.context_bar)
    return null;
  const pct = data.context_window.used_percentage;
  const barWidth = 10;
  if (pct === null || pct === void 0) {
    return `${dim("ctx")} ${dim(" N/A")} ${dim("\u2591".repeat(barWidth))}`;
  }
  const rounded = Math.floor(pct);
  const filled = Math.round(rounded * barWidth / 100);
  const empty = barWidth - filled;
  const severity = severityFromThresholds(rounded, config.thresholds.context_warn, config.thresholds.context_crit);
  const padded = `${String(rounded).padStart(3, " ")}%`;
  return `${dim("ctx")} ${colorize(padded, severity)} ${colorBar(filled, empty, severity)}`;
}
function cacheExpirySegment(config, expiryEpoch) {
  if (!config.segments.cache_expiry)
    return null;
  if (expiryEpoch === null)
    return `${dim("cache")} ${dim("N/A")}`;
  const now = Math.floor(Date.now() / 1e3);
  const remaining = expiryEpoch - now;
  if (remaining <= 0) {
    return `${dim("cache")} ${colorize("expired", Severity.crit)}`;
  }
  const severity = severityFromDescending(remaining, config.thresholds.cache_expiry_warn, config.thresholds.cache_expiry_crit);
  let value;
  if (remaining < 3600) {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    value = `${m}:${String(s).padStart(2, "0")}`;
  } else {
    const h = Math.floor(remaining / 3600);
    const m = Math.floor(remaining % 3600 / 60);
    value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return `${dim("cache")} ${colorize(value, severity)}`;
}
function usageSegment(data, config) {
  if (!config.segments.usage)
    return null;
  const pct = data.rate_limits?.five_hour?.used_percentage;
  if (pct === void 0 || pct === null)
    return `${dim("usage")} ${dim("N/A")}`;
  const rounded = Math.round(pct);
  const severity = severityFromThresholds(rounded, config.thresholds.usage_warn, config.thresholds.usage_crit);
  return `${dim("usage")} ${colorize(`${rounded}%`, severity)}`;
}
function ioTokensSegment(config, cumulative, ioJump) {
  if (!config.segments.io_tokens)
    return null;
  if (cumulative.cum_in === 0 && cumulative.cum_out === 0) {
    return dim("\u2191N/A \u2193N/A");
  }
  const text = `\u2191${formatK(cumulative.cum_in)} \u2193${formatK(cumulative.cum_out)}`;
  if (ioJump >= config.thresholds.io_jump_warn) {
    return colorize(text, Severity.warn);
  }
  return dim(text);
}

// dist/statusline/layout.mjs
function assembleLine(segments, separator = "  ") {
  return segments.filter((s) => s !== null).join(separator);
}
function fitLineToWidth(segments, maxWidth, dropPriority) {
  const working = [...segments];
  if (visibleLength(assembleLine(working)) <= maxWidth)
    return working;
  for (const idx of dropPriority) {
    working[idx] = null;
    if (visibleLength(assembleLine(working)) <= maxWidth)
      return working;
  }
  return working;
}

// dist/statusline/cumulative.mjs
import { readFileSync as readFileSync2, writeFileSync } from "node:fs";
import { join as join2 } from "node:path";
var FILENAME = "cumulative-tokens.json";
function readState(sessionDir) {
  try {
    const raw = readFileSync2(join2(sessionDir, FILENAME), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object")
      return null;
    const s = parsed;
    if (typeof s.cum_in !== "number" || typeof s.cum_out !== "number" || !s.last_usage || typeof s.last_usage !== "object") {
      return null;
    }
    const u = s.last_usage;
    if (typeof u.input_tokens !== "number" || typeof u.output_tokens !== "number" || typeof u.cache_creation_input_tokens !== "number" || typeof u.cache_read_input_tokens !== "number") {
      return null;
    }
    return s;
  } catch {
    return null;
  }
}
function writeState(sessionDir, state) {
  writeFileSync(join2(sessionDir, FILENAME), JSON.stringify(state));
}
function usageEqual(a, b) {
  return a.input_tokens === b.input_tokens && a.output_tokens === b.output_tokens && a.cache_creation_input_tokens === b.cache_creation_input_tokens && a.cache_read_input_tokens === b.cache_read_input_tokens;
}
function updateCumulative(sessionDir, current) {
  if (current === null) {
    const state2 = readState(sessionDir);
    return state2 ? { cum_in: state2.cum_in, cum_out: state2.cum_out } : { cum_in: 0, cum_out: 0 };
  }
  const state = readState(sessionDir);
  if (state === null) {
    const cum_in2 = current.input_tokens + current.cache_creation_input_tokens + current.cache_read_input_tokens;
    const cum_out2 = current.output_tokens;
    writeState(sessionDir, { cum_in: cum_in2, cum_out: cum_out2, last_usage: current });
    return { cum_in: cum_in2, cum_out: cum_out2 };
  }
  if (usageEqual(current, state.last_usage)) {
    return { cum_in: state.cum_in, cum_out: state.cum_out };
  }
  const delta_in = current.input_tokens + current.cache_creation_input_tokens + current.cache_read_input_tokens;
  const cum_in = state.cum_in + delta_in;
  const cum_out = state.cum_out + current.output_tokens;
  writeState(sessionDir, { cum_in, cum_out, last_usage: current });
  return { cum_in, cum_out };
}

// dist/statusline/statusline.mjs
var DROP_PRIORITY = [3, 2, 4, 1];
var DEFAULT_CACHE_TTL_SEC = 3600;
var TRANSCRIPT_TAIL_BYTES = 65536;
function readCacheExpiry(sessionDir, ttlSec) {
  try {
    const raw = readFileSync3(join3(sessionDir, "cache-last-hit"), "utf-8").trim();
    const epoch = Number(raw);
    if (Number.isNaN(epoch))
      return null;
    return epoch + ttlSec;
  } catch {
    return null;
  }
}
function readCacheTtlFromTranscript(transcriptPath) {
  let fd = null;
  try {
    const stats = statSync(transcriptPath);
    const readLen = Math.min(stats.size, TRANSCRIPT_TAIL_BYTES);
    const offset = stats.size - readLen;
    fd = openSync(transcriptPath, "r");
    const buf = Buffer.allocUnsafe(readLen);
    readSync(fd, buf, 0, readLen, offset);
    const text = buf.toString("utf-8");
    const lines = text.split("\n");
    if (offset > 0 && lines.length > 0)
      lines.shift();
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line || !line.trim())
        continue;
      let rec;
      try {
        rec = JSON.parse(line);
      } catch {
        continue;
      }
      if (!rec || typeof rec !== "object")
        continue;
      const r = rec;
      if (r.type !== "assistant")
        continue;
      const cc = r.message?.usage?.cache_creation;
      if (!cc)
        continue;
      const h1 = cc.ephemeral_1h_input_tokens ?? 0;
      const m5 = cc.ephemeral_5m_input_tokens ?? 0;
      if (h1 > 0)
        return 3600;
      if (m5 > 0)
        return 300;
    }
    return null;
  } catch {
    return null;
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
      }
    }
  }
}
function updateCacheTracking(sessionDir, currentCacheTokens) {
  if (currentCacheTokens === 0)
    return;
  try {
    const raw = readFileSync3(join3(sessionDir, "cache-last-tokens"), "utf-8").trim();
    const lastTokens = Number(raw);
    if (currentCacheTokens !== lastTokens) {
      const now = Math.floor(Date.now() / 1e3);
      writeFileSync2(join3(sessionDir, "cache-last-hit"), String(now));
      writeFileSync2(join3(sessionDir, "cache-last-tokens"), String(currentCacheTokens));
    }
  } catch {
    const now = Math.floor(Date.now() / 1e3);
    writeFileSync2(join3(sessionDir, "cache-last-hit"), String(now));
    writeFileSync2(join3(sessionDir, "cache-last-tokens"), String(currentCacheTokens));
  }
}
function readPrevInputTokens(sessionDir) {
  try {
    const raw = readFileSync3(join3(sessionDir, "prev-input-tokens"), "utf-8").trim();
    const n = Number(raw);
    return Number.isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}
function writePrevInputTokens(sessionDir, n) {
  writeFileSync2(join3(sessionDir, "prev-input-tokens"), String(n));
}
function renderStatusLine(input, dataDir) {
  const config = loadStatusLineConfig(dataDir);
  const native = input;
  const sessionDir = join3(dataDir, "status", native.session_id);
  try {
    mkdirSync(sessionDir, { recursive: true });
  } catch {
  }
  const cumulative = updateCumulative(sessionDir, native.context_window.current_usage);
  const prev = readPrevInputTokens(sessionDir);
  const cur = native.context_window.total_input_tokens;
  const ioJump = cur > prev ? cur - prev : 0;
  writePrevInputTokens(sessionDir, cur);
  updateCacheTracking(sessionDir, native.context_window.current_usage?.cache_read_input_tokens ?? 0);
  const ttlSec = readCacheTtlFromTranscript(native.transcript_path) ?? DEFAULT_CACHE_TTL_SEC;
  const cacheExpiryEpoch = readCacheExpiry(sessionDir, ttlSec);
  const segments = [
    modelSegment(native, config),
    contextSegment(native, config),
    cacheExpirySegment(config, cacheExpiryEpoch),
    usageSegment(native, config),
    ioTokensSegment(config, cumulative, ioJump)
  ];
  const fitted = fitLineToWidth(segments, config.max_width, DROP_PRIORITY);
  return assembleLine(fitted);
}
function discoverDataDir() {
  const fromEnv = process.env.CLAUDE_PLUGIN_DATA;
  if (fromEnv)
    return fromEnv;
  try {
    const pluginsData = join3(homedir(), ".claude", "plugins", "data");
    const entries = readdirSync(pluginsData, { withFileTypes: true });
    const match = entries.find((e) => e.isDirectory() && e.name.startsWith("fancysauce"));
    return match ? join3(pluginsData, match.name) : null;
  } catch {
    return null;
  }
}
var isDirectRun = typeof process !== "undefined" && process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isDirectRun) {
  let input = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk) => {
    input += chunk;
  });
  process.stdin.on("end", () => {
    try {
      const native = JSON.parse(input);
      const dataDir = discoverDataDir();
      if (!dataDir) {
        process.exit(0);
      }
      const line = renderStatusLine(native, dataDir);
      process.stdout.write(line + "\n");
    } catch {
    }
  });
}
export {
  renderStatusLine
};
