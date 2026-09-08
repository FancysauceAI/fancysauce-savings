import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// dist/statusline/statusline.mjs
import { readFileSync as readFileSync5, writeFileSync as writeFileSync2, mkdirSync as mkdirSync2, readdirSync as readdirSync2, openSync as openSync2, readSync, closeSync as closeSync2, statSync as statSync3 } from "node:fs";
import { join as join4 } from "node:path";
import { homedir as homedir3 } from "node:os";

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
  mascot: true,
  model: true,
  context_bar: true,
  cache_expiry: true,
  usage: true,
  io_tokens: true,
  login: true
};
var DEFAULT_STATUS_LINE_CONFIG = {
  refresh_interval: 5,
  // Fallback only; defaultMaxWidth() prefers COLUMNS when the shell exports it.
  max_width: 120,
  thresholds: { ...DEFAULT_THRESHOLDS },
  segments: { ...DEFAULT_SEGMENTS }
};

// dist/statusline/config.mjs
function defaults() {
  return {
    ...DEFAULT_STATUS_LINE_CONFIG,
    max_width: defaultMaxWidth(),
    thresholds: { ...DEFAULT_THRESHOLDS },
    segments: { ...DEFAULT_SEGMENTS }
  };
}
function defaultMaxWidth(env = process.env) {
  const columns = Number(env.COLUMNS);
  if (Number.isFinite(columns) && columns >= MIN_SANE_WIDTH)
    return Math.floor(columns);
  return DEFAULT_STATUS_LINE_CONFIG.max_width;
}
var MIN_SANE_WIDTH = 40;
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
      max_width: typeof partial.max_width === "number" ? partial.max_width : defaultMaxWidth(),
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

// dist/shared/plugin-commands.mjs
var LOGIN_COMMAND = "/fancysauce-savings:login";

// dist/statusline/ansi.mjs
var RESET = "\x1B[0m";
var YELLOW = "\x1B[33m";
var RED = "\x1B[31m";
var GREEN = "\x1B[32m";
var CYAN = "\x1B[36m";
var DIM = "\x1B[2m";
var BRAND_ORANGE_TRUECOLOR = "\x1B[38;2;252;113;45m";
var BRAND_ORANGE_256 = "\x1B[38;5;202m";
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
function brandOrange(text) {
  const colorterm = process.env.COLORTERM ?? "";
  const code = /truecolor|24bit/i.test(colorterm) ? BRAND_ORANGE_TRUECOLOR : BRAND_ORANGE_256;
  return `${code}${text}${RESET}`;
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
var LOGIN_NAME_MAX = 12;
function trimModelName(name) {
  const withoutPrefix = name.replace(/^claude-/i, "");
  const withoutSuffix = withoutPrefix.replace(/\s*\([^()]*\)\s*$/, "");
  const stripped = withoutSuffix === "" ? withoutPrefix : withoutSuffix;
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
var NOT_LOGGED_IN_FULL = `Not logged in \u2014 run ${LOGIN_COMMAND}`;
var NOT_LOGGED_IN_SHORT = "Not logged in";
function loginViewFromEntry(entry) {
  if (entry === null)
    return { state: "unknown" };
  if (entry.error !== void 0) {
    return entry.error === "rejected" ? { state: "rejected" } : { state: "unknown" };
  }
  const result = entry.result;
  if (result === void 0)
    return { state: "unknown" };
  const name = firstNameToken(result.user?.name ?? null);
  const superseded = result.key.superseded;
  return result.logged_in ? { state: "logged_in", name, superseded } : { state: "logged_out", name, superseded };
}
function loginSegment(config, view) {
  if (!config.segments.login)
    return null;
  switch (view.state) {
    case "logged_in": {
      const text = view.name === null ? "Hi!" : `Hi ${view.name}!`;
      return { full: brandOrange(text), short: brandOrange(text), severity: Severity.none };
    }
    case "logged_out": {
      if (view.name === null) {
        return {
          full: colorize(NOT_LOGGED_IN_FULL, Severity.crit),
          short: colorize(NOT_LOGGED_IN_SHORT, Severity.crit),
          severity: Severity.crit
        };
      }
      return {
        full: colorize(`Hi ${view.name}! \u2014 log in to confirm identity`, Severity.warn),
        short: colorize(`Hi ${view.name}! \u2014 log in`, Severity.warn),
        severity: Severity.warn
      };
    }
    case "rejected": {
      return {
        full: colorize(NOT_LOGGED_IN_FULL, Severity.crit),
        short: colorize(NOT_LOGGED_IN_SHORT, Severity.crit),
        severity: Severity.crit
      };
    }
    case "unknown":
      return null;
  }
}
function firstNameToken(name) {
  if (name === null)
    return null;
  const first = name.trim().split(/\s+/)[0];
  if (!first)
    return null;
  return first.slice(0, LOGIN_NAME_MAX);
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

// dist/shared/whoami/credential.mjs
import { readFileSync as readFileSync3, statSync } from "node:fs";
import { posix as posix2, win32 as win322 } from "node:path";

// dist/shared/credential-paths.mjs
import { homedir } from "node:os";
import { posix, win32 } from "node:path";
function credentialPaths() {
  if (process.platform === "win32") {
    const programData = process.env.PROGRAMDATA ?? "C:\\ProgramData";
    const appData = process.env.APPDATA ?? win32.join(homedir(), "AppData", "Roaming");
    return {
      system: win32.join(programData, "fancysauce", "credentials.json"),
      user: win32.join(appData, "fancysauce", "credentials.json")
    };
  }
  return {
    system: "/etc/fancysauce/credentials.json",
    user: posix.join(process.env.HOME ?? homedir(), ".config", "fancysauce", "credentials.json")
  };
}

// dist/shared/config.mjs
import { join as join3 } from "node:path";
import { homedir as homedir2 } from "node:os";

// dist/shared/credential-file.mjs
function permissiveModeReason(mode) {
  if ((mode & 63) === 0)
    return null;
  return `file mode ${(mode & 511).toString(8)} too permissive; must be 0600`;
}
function validateCredentialFile(v) {
  if (typeof v !== "object" || v === null)
    return { kind: "bad", reason: "not an object" };
  const o = v;
  if (o.schema_version !== 1)
    return { kind: "bad", reason: `unknown schema_version: ${String(o.schema_version)}` };
  if (typeof o.credential !== "string" || !o.credential)
    return { kind: "bad", reason: "credential missing or empty" };
  if (typeof o.issued_at !== "string")
    return { kind: "bad", reason: "issued_at missing" };
  const hint = validateIdentityHint(o.identity_hint);
  if (hint.kind === "bad")
    return hint;
  const endpoint = typeof o.endpoint === "string" && o.endpoint ? o.endpoint : void 0;
  const api_endpoint = typeof o.api_endpoint === "string" && o.api_endpoint ? o.api_endpoint : void 0;
  const identity_type = o.identity_type === "full" || o.identity_type === "hash" ? o.identity_type : void 0;
  const provenance = o.provenance === "marketplace_url" || o.provenance === "login" || o.provenance === "env_tenant_key" ? o.provenance : void 0;
  return {
    kind: "ok",
    cred: {
      schema_version: 1,
      issued_at: o.issued_at,
      credential: o.credential,
      identity_hint: hint.value,
      ...endpoint !== void 0 ? { endpoint } : {},
      ...api_endpoint !== void 0 ? { api_endpoint } : {},
      ...identity_type !== void 0 ? { identity_type } : {},
      ...provenance !== void 0 ? { provenance } : {}
    }
  };
}
function validateIdentityHint(v) {
  if (v === null)
    return { kind: "ok", value: null };
  if (typeof v !== "object")
    return { kind: "bad", reason: "identity_hint must be null or object" };
  const o = v;
  if (o.source === "os_user")
    return { kind: "ok", value: { source: "os_user" } };
  if (o.source === "directory") {
    if (typeof o.value !== "string" || !o.value)
      return { kind: "bad", reason: "identity_hint.value required for source=directory" };
    return { kind: "ok", value: { source: "directory", value: o.value } };
  }
  if (o.source === "mdm_file") {
    const user_email = typeof o.user_email === "string" ? o.user_email : void 0;
    const user_upn = typeof o.user_upn === "string" ? o.user_upn : void 0;
    return {
      kind: "ok",
      value: {
        source: "mdm_file",
        ...user_email !== void 0 ? { user_email } : {},
        ...user_upn !== void 0 ? { user_upn } : {}
      }
    };
  }
  if (o.source === "plugin_login") {
    const s = (k) => typeof o[k] === "string" && o[k] ? o[k] : void 0;
    return {
      kind: "ok",
      value: {
        source: "plugin_login",
        ...s("email") ? { email: s("email") } : {},
        ...s("account_id") ? { account_id: s("account_id") } : {},
        ...s("user_id") ? { user_id: s("user_id") } : {},
        ...s("org_id") ? { org_id: s("org_id") } : {},
        ...s("org_name") ? { org_name: s("org_name") } : {},
        ...s("plan") ? { plan: s("plan") } : {}
      }
    };
  }
  return { kind: "bad", reason: `identity_hint.source unknown: ${String(o.source)}` };
}

// dist/shared/tenant-key-bootstrap.mjs
var KEY_RE = /^fs_(live|test)_t_[A-Za-z0-9_-]{43}$/;

// dist/shared/config.mjs
var DEFAULT_LOGIN_STATE_DIR = join3(homedir2(), ".config", "fancysauce");
function parseCredentialPathsEnv() {
  if (process.env.VITEST !== "true")
    return null;
  const raw = process.env.FANCYSAUCE_CREDENTIAL_PATHS;
  if (!raw)
    return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return null;
  const o = parsed;
  if (typeof o.system !== "string" || typeof o.user !== "string")
    return null;
  if (o.login_state_dir !== void 0 && typeof o.login_state_dir !== "string")
    return null;
  return {
    system: o.system,
    user: o.user,
    ...typeof o.login_state_dir === "string" ? { login_state_dir: o.login_state_dir } : {}
  };
}

// dist/shared/hash.mjs
import { createHash, createHmac } from "node:crypto";
function sha256Hex(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// dist/shared/whoami/credential.mjs
var FINGERPRINT_HEX_CHARS = 12;
function whoamiCredentialPaths() {
  const parsed = parseCredentialPathsEnv();
  return parsed ? { system: parsed.system, user: parsed.user } : credentialPaths();
}
function pathFlavor() {
  return process.platform === "win32" ? win322 : posix2;
}
function resolveCredentialSync(opts = {}) {
  const paths = opts.paths ?? whoamiCredentialPaths();
  const env = opts.env ?? process.env;
  const sys = readOneSync(paths.system);
  if (sys.kind === "ok")
    return withFingerprint("system", sys.token, sys.apiEndpoint);
  if (sys.kind === "malformed")
    return null;
  const usr = readOneSync(paths.user);
  if (usr.kind === "ok")
    return withFingerprint("user", usr.token, usr.apiEndpoint);
  if (usr.kind === "malformed")
    return null;
  const tenantKey = env.FANCYSAUCE_TENANT_KEY ?? "";
  if (KEY_RE.test(tenantKey))
    return withFingerprint("env_tenant_key", tenantKey, null);
  const apiKey = env.FANCYSAUCE_API_KEY;
  if (apiKey)
    return withFingerprint("env_api_key", apiKey, null);
  return null;
}
function credentialFingerprint(opts = {}) {
  return resolveCredentialSync(opts)?.fingerprint ?? null;
}
function withFingerprint(tier, token, apiEndpoint) {
  return { tier, token, apiEndpoint, fingerprint: sha256Hex(token).slice(0, FINGERPRINT_HEX_CHARS) };
}
function readOneSync(path) {
  let raw;
  try {
    raw = readFileSync3(path, "utf8");
  } catch (err) {
    if (err.code === "ENOENT")
      return { kind: "absent" };
    return { kind: "malformed" };
  }
  if (process.platform !== "win32") {
    try {
      if (permissiveModeReason(statSync(path).mode) !== null)
        return { kind: "malformed" };
    } catch {
      return { kind: "malformed" };
    }
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "malformed" };
  }
  const v = validateCredentialFile(parsed);
  if (v.kind !== "ok")
    return { kind: "malformed" };
  return { kind: "ok", token: v.cred.credential, apiEndpoint: v.cred.api_endpoint ?? null };
}

// dist/shared/whoami/cache.mjs
import { closeSync, ftruncateSync, mkdirSync, openSync, readFileSync as readFileSync4, readdirSync, renameSync, rmSync, statSync as statSync2, writeSync } from "node:fs";
var WHOAMI_SCHEMA_VERSION = 1;
var SUCCESS_TTL_MS = 6 * 60 * 60 * 1e3;
var ERROR_TTL_MS = 15 * 60 * 1e3;
var CACHE_PREFIX = "whoami-cache-";
var CACHE_SUFFIX = ".json";
var TMP_ORPHAN_MAX_AGE_MS = 60 * 60 * 1e3;
function whoamiCachePath(fingerprint, opts = {}) {
  const p = pathFlavor();
  return p.join(credentialDir(opts), `${CACHE_PREFIX}${fingerprint}${CACHE_SUFFIX}`);
}
function credentialDir(opts = {}) {
  if (opts.dir !== void 0)
    return opts.dir;
  return pathFlavor().dirname(whoamiCredentialPaths().user);
}
function readWhoamiCache(fingerprint, now, opts = {}) {
  const entry = readWhoamiCacheAnyAge(fingerprint, opts);
  if (entry === null)
    return null;
  const ttl = entry.result !== void 0 ? SUCCESS_TTL_MS : ERROR_TTL_MS;
  if (now - entry.fetched_at >= ttl)
    return null;
  return entry;
}
function readWhoamiCacheAnyAge(fingerprint, opts = {}) {
  let entry;
  try {
    const parsed = JSON.parse(readFileSync4(whoamiCachePath(fingerprint, opts), "utf8"));
    const validated = validateEntry(parsed);
    if (validated === null)
      return null;
    entry = validated;
  } catch {
    return null;
  }
  if (entry.credential_fingerprint !== fingerprint)
    return null;
  return entry;
}
function validateEntry(v) {
  if (typeof v !== "object" || v === null)
    return null;
  const o = v;
  if (o.schema_version !== WHOAMI_SCHEMA_VERSION)
    return null;
  if (typeof o.fetched_at !== "number")
    return null;
  if (typeof o.credential_fingerprint !== "string")
    return null;
  const result = o.result === void 0 ? void 0 : parseWhoamiResult(o.result);
  const error = parseErrorKind(o.error);
  if (result === void 0 && error === void 0)
    return null;
  const hasPluginFlagsTimestamp = o.plugin_flags_fetched_at !== void 0;
  const pluginFlagsFetchedAt = typeof o.plugin_flags_fetched_at === "number" ? o.plugin_flags_fetched_at : void 0;
  const pluginFlags = hasPluginFlagsTimestamp && pluginFlagsFetchedAt === void 0 ? void 0 : parsePluginFlags(o.plugin_flags);
  return {
    schema_version: WHOAMI_SCHEMA_VERSION,
    fetched_at: o.fetched_at,
    credential_fingerprint: o.credential_fingerprint,
    ...result !== void 0 ? { result } : {},
    ...error !== void 0 ? { error } : {},
    ...pluginFlags !== void 0 ? {
      plugin_flags: pluginFlags,
      ...pluginFlagsFetchedAt !== void 0 ? { plugin_flags_fetched_at: pluginFlagsFetchedAt } : {}
    } : {}
  };
}
function parsePluginFlags(v) {
  if (typeof v !== "object" || v === null || Array.isArray(v))
    return void 0;
  const out = {};
  for (const [key, value] of Object.entries(v)) {
    if (typeof value === "boolean")
      out[key] = value;
  }
  return out;
}
function parseErrorKind(v) {
  return v === "rejected" || v === "rate_limited" || v === "server" || v === "transport" ? v : void 0;
}
function parseWhoamiResult(v) {
  if (typeof v !== "object" || v === null)
    return void 0;
  const o = v;
  if (typeof o.logged_in !== "boolean")
    return void 0;
  if (typeof o.tenant_id !== "string")
    return void 0;
  const user = parseUser(o.user);
  if (user === void 0)
    return void 0;
  const key = parseKey(o.key);
  if (key === void 0)
    return void 0;
  const pluginFlags = parsePluginFlags(o.plugin_flags);
  return {
    logged_in: o.logged_in,
    user,
    tenant_id: o.tenant_id,
    key,
    ...pluginFlags !== void 0 ? { plugin_flags: pluginFlags } : {}
  };
}
function parseUser(v) {
  if (v === null)
    return null;
  if (typeof v !== "object")
    return void 0;
  const o = v;
  if (typeof o.id !== "string")
    return void 0;
  const name = o.name === null || typeof o.name === "string" ? o.name : void 0;
  if (name === void 0)
    return void 0;
  const email = o.email_masked === null || typeof o.email_masked === "string" ? o.email_masked : void 0;
  if (email === void 0)
    return void 0;
  return { id: o.id, name, email_masked: email };
}
function parseKey(v) {
  if (typeof v !== "object" || v === null)
    return void 0;
  const o = v;
  if (typeof o.id !== "string")
    return void 0;
  if (typeof o.env !== "string")
    return void 0;
  if (o.scope !== null && typeof o.scope !== "string")
    return void 0;
  if (typeof o.user_resolution_mode !== "string")
    return void 0;
  if (typeof o.vended_via !== "string")
    return void 0;
  if (typeof o.source_type !== "string")
    return void 0;
  if (typeof o.superseded !== "boolean")
    return void 0;
  return {
    id: o.id,
    env: o.env,
    scope: o.scope,
    user_resolution_mode: o.user_resolution_mode,
    vended_via: o.vended_via,
    source_type: o.source_type,
    superseded: o.superseded
  };
}

// dist/statusline/mascot.mjs
var FRAMES = {
  smile: { top: "[| (\u2022) (\u2022) |]", bottom: " |  \\___/  |" },
  worried: { top: "[| (o) (o) |]", bottom: " |   ___   |" },
  angry: { top: "[|  >   <  |]", bottom: " |  /\u203E\u203E\u203E\\  |" }
};
var MASCOT_WIDTH = visibleLength(FRAMES.smile.top);
var WORRIED_AT = 80;
var ANGRY_AT = 100;
function mascotExpression(usagePct) {
  if (usagePct !== null && usagePct !== void 0) {
    const rounded = Math.round(usagePct);
    if (rounded >= ANGRY_AT)
      return "angry";
    if (rounded >= WORRIED_AT)
      return "worried";
  }
  return "smile";
}
function renderMascot(usagePct) {
  const frame = FRAMES[mascotExpression(usagePct)];
  return { top: brandOrange(frame.top), bottom: brandOrange(frame.bottom) };
}
var ALL_FRAMES = Object.entries(FRAMES);

// dist/statusline/statusline.mjs
var DROP_PRIORITY = [3, 2, 4, 1];
var DROP_PRIORITY_LOGIN_FIRST = [5, 3, 2, 4, 1];
var DEFAULT_CACHE_TTL_SEC = 3600;
var TRANSCRIPT_TAIL_BYTES = 65536;
var SEPARATOR = "  ";
function readCacheExpiry(sessionDir, ttlSec) {
  try {
    const raw = readFileSync5(join4(sessionDir, "cache-last-hit"), "utf-8").trim();
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
    const stats = statSync3(transcriptPath);
    const readLen = Math.min(stats.size, TRANSCRIPT_TAIL_BYTES);
    const offset = stats.size - readLen;
    fd = openSync2(transcriptPath, "r");
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
        closeSync2(fd);
      } catch {
      }
    }
  }
}
function updateCacheTracking(sessionDir, currentCacheTokens) {
  if (currentCacheTokens === 0)
    return;
  try {
    const raw = readFileSync5(join4(sessionDir, "cache-last-tokens"), "utf-8").trim();
    const lastTokens = Number(raw);
    if (currentCacheTokens !== lastTokens) {
      const now = Math.floor(Date.now() / 1e3);
      writeFileSync2(join4(sessionDir, "cache-last-hit"), String(now));
      writeFileSync2(join4(sessionDir, "cache-last-tokens"), String(currentCacheTokens));
    }
  } catch {
    const now = Math.floor(Date.now() / 1e3);
    writeFileSync2(join4(sessionDir, "cache-last-hit"), String(now));
    writeFileSync2(join4(sessionDir, "cache-last-tokens"), String(currentCacheTokens));
  }
}
function readPrevInputTokens(sessionDir) {
  try {
    const raw = readFileSync5(join4(sessionDir, "prev-input-tokens"), "utf-8").trim();
    const n = Number(raw);
    return Number.isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}
function writePrevInputTokens(sessionDir, n) {
  writeFileSync2(join4(sessionDir, "prev-input-tokens"), String(n));
}
function renderStatusLine(input, dataDir) {
  const config = loadStatusLineConfig(dataDir);
  const native = input;
  const sessionDir = join4(dataDir, "status", native.session_id);
  try {
    mkdirSync2(sessionDir, { recursive: true });
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
  const login = loginSegment(config, readLoginView());
  const mascotOn = config.segments.mascot;
  const segments = [
    modelSegment(native, config),
    contextSegment(native, config),
    cacheExpirySegment(config, cacheExpiryEpoch),
    usageSegment(native, config),
    ioTokensSegment(config, cumulative, ioJump),
    // With the mascot on, the login row rides row 2 beside the jaw and never
    // competes for row 1. With it off there is no row 2, so it stays here and
    // takes its chances with the drop priority.
    mascotOn || login === null ? null : login.full
  ];
  const priority = login !== null && login.severity !== Severity.none ? DROP_PRIORITY : DROP_PRIORITY_LOGIN_FIRST;
  const budget = mascotOn ? config.max_width - MASCOT_WIDTH - SEPARATOR.length : config.max_width;
  if (!mascotOn && login !== null && visibleLength(assembleLine(segments)) > budget) {
    segments[5] = login.short;
  }
  const fitted = fitLineToWidth(segments, budget, priority);
  if (!mascotOn)
    return assembleLine(fitted);
  const face = renderMascot(native.rate_limits?.five_hour?.used_percentage);
  return `${face.top}${SEPARATOR}${assembleLine(fitted)}
${secondRow(face.bottom, login, config)}`;
}
function secondRow(jaw, login, config) {
  if (login === null)
    return jaw;
  const head = jaw + " ".repeat(Math.max(0, MASCOT_WIDTH - visibleLength(jaw)));
  const room = config.max_width - MASCOT_WIDTH - SEPARATOR.length;
  for (const form of [login.full, login.short]) {
    if (visibleLength(form) <= room)
      return `${head}${SEPARATOR}${form}`;
  }
  return jaw;
}
function readLoginView() {
  try {
    const fingerprint = credentialFingerprint();
    if (fingerprint === null)
      return { state: "unknown" };
    return loginViewFromEntry(readWhoamiCache(fingerprint, Date.now()));
  } catch {
    return { state: "unknown" };
  }
}
function discoverDataDir() {
  const fromEnv = process.env.CLAUDE_PLUGIN_DATA;
  if (fromEnv)
    return fromEnv;
  try {
    const pluginsData = join4(homedir3(), ".claude", "plugins", "data");
    const entries = readdirSync2(pluginsData, { withFileTypes: true });
    const match = entries.find((e) => e.isDirectory() && e.name.startsWith("fancysauce"));
    return match ? join4(pluginsData, match.name) : null;
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
