#!/usr/bin/env node
import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// dist/shared/config.mjs
import { join } from "node:path";
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
var API_ENDPOINT = "https://api.preview.fancysauce.ai";
var DEFAULT_LOGIN_STATE_DIR = join(homedir2(), ".config", "fancysauce");
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

// dist/shared/endpoint.mjs
function isLoopbackHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";
}
function allowsBearer(url) {
  return url.protocol === "https:" || isLoopbackHost(url.hostname);
}
function endpointUrl(endpoint, route) {
  const base = endpoint.endsWith("/") ? endpoint : `${endpoint}/`;
  return new URL(route, base);
}

// dist/shared/whoami/credential.mjs
import { readFileSync, statSync } from "node:fs";
import { posix as posix2, win32 as win322 } from "node:path";

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
function withFingerprint(tier, token, apiEndpoint) {
  return { tier, token, apiEndpoint, fingerprint: sha256Hex(token).slice(0, FINGERPRINT_HEX_CHARS) };
}
function readOneSync(path) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
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
import { closeSync, ftruncateSync, mkdirSync, openSync, readFileSync as readFileSync2, readdirSync, renameSync, rmSync, statSync as statSync2, writeSync } from "node:fs";
import { randomBytes } from "node:crypto";
var WHOAMI_SCHEMA_VERSION = 1;
var SUCCESS_TTL_MS = 6 * 60 * 60 * 1e3;
var ERROR_TTL_MS = 15 * 60 * 1e3;
var KEEP_CACHE_FILES = 5;
var CACHE_PREFIX = "whoami-cache-";
var CACHE_SUFFIX = ".json";
var TMP_SUFFIX = ".tmp";
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
function ensureCredentialDir(opts = {}) {
  mkdirSync(credentialDir(opts), { recursive: true, mode: 448 });
}
function readWhoamiCacheAnyAge(fingerprint, opts = {}) {
  let entry;
  try {
    const parsed = JSON.parse(readFileSync2(whoamiCachePath(fingerprint, opts), "utf8"));
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
function writeWhoamiCache(entry, opts = {}) {
  ensureCredentialDir(opts);
  const target = whoamiCachePath(entry.credential_fingerprint, opts);
  const tmp = `${target}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  let renamed = false;
  try {
    const fd = openSync(tmp, "wx", 384);
    try {
      writeSync(fd, JSON.stringify(entry));
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, target);
    renamed = true;
  } finally {
    if (!renamed) {
      try {
        rmSync(tmp, { force: true });
      } catch {
      }
    }
  }
  pruneWhoamiCaches(opts);
}
function pruneWhoamiCaches(opts = {}) {
  const p = pathFlavor();
  const dir = credentialDir(opts);
  try {
    const names = readdirSync(dir).filter((n) => n.startsWith(CACHE_PREFIX));
    const stat = (n) => {
      const full = p.join(dir, n);
      try {
        return { full, mtime: statSync2(full).mtimeMs };
      } catch {
        return null;
      }
    };
    const live = (e) => e !== null;
    const files = names.filter((n) => n.endsWith(CACHE_SUFFIX)).map(stat).filter(live).sort((a, b) => b.mtime - a.mtime);
    for (const stale of files.slice(KEEP_CACHE_FILES)) {
      rmSync(stale.full, { force: true });
    }
    const cutoff = Date.now() - TMP_ORPHAN_MAX_AGE_MS;
    for (const orphan of names.filter((n) => n.endsWith(TMP_SUFFIX)).map(stat).filter(live)) {
      if (orphan.mtime < cutoff)
        rmSync(orphan.full, { force: true });
    }
  } catch {
  }
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

// dist/shared/whoami/lease.mjs
import { openSync as openSync2, closeSync as closeSync2, readFileSync as readFileSync3, rmSync as rmSync2, statSync as statSync3, writeSync as writeSync2 } from "node:fs";
function whoamiLeasePath(fingerprint, opts = {}) {
  return pathFlavor().join(credentialDir(opts), `whoami-refresh-${fingerprint}.lock`);
}
function releaseWhoamiLease(fingerprint, opts = {}) {
  try {
    rmSync2(whoamiLeasePath(fingerprint, opts), { force: true });
  } catch {
  }
}

// dist/shared/whoami/refresh.mjs
var WHOAMI_TIMEOUT_MS = 1e4;
async function runWhoamiRefresh(opts = {}) {
  const resolved = resolveCredentialSync({
    ...opts.paths !== void 0 ? { paths: opts.paths } : {},
    ...opts.env !== void 0 ? { env: opts.env } : {}
  });
  if (resolved === null)
    return { kind: "no-credential" };
  const cacheOpts = opts.dir !== void 0 ? { dir: opts.dir } : {};
  try {
    const entry = await fetchEntry(resolved, opts, cacheOpts);
    try {
      writeWhoamiCache(entry, cacheOpts);
    } catch {
    }
    return { kind: "written", entry };
  } finally {
    releaseWhoamiLease(resolved.fingerprint, cacheOpts);
  }
}
async function fetchEntry(resolved, opts, cacheOpts) {
  const now = opts.now ?? Date.now();
  const carried = readWhoamiCacheAnyAge(resolved.fingerprint, cacheOpts);
  const failed = (error) => ({
    ...head,
    error,
    ...error !== "rejected" && carried?.plugin_flags !== void 0 ? {
      plugin_flags: carried.plugin_flags,
      ...carried.plugin_flags_fetched_at !== void 0 ? { plugin_flags_fetched_at: carried.plugin_flags_fetched_at } : {}
    } : {}
  });
  const base = resolved.apiEndpoint ?? opts.apiBase ?? API_ENDPOINT;
  const doFetch = opts.fetchImpl ?? fetch;
  const head = {
    schema_version: WHOAMI_SCHEMA_VERSION,
    fetched_at: now,
    credential_fingerprint: resolved.fingerprint
  };
  let url;
  try {
    url = endpointUrl(base, "v1/whoami");
  } catch {
    return failed("transport");
  }
  if (!allowsBearer(url))
    return failed("transport");
  let res;
  try {
    res = await doFetch(url.href, {
      method: "GET",
      headers: { Authorization: `Bearer ${resolved.token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(WHOAMI_TIMEOUT_MS)
    });
  } catch {
    return failed("transport");
  }
  const failure = errorForStatus(res.status);
  if (failure !== null)
    return failed(failure);
  let body;
  try {
    body = await res.json();
  } catch {
    return failed("transport");
  }
  const result = parseWhoamiResult(body);
  if (result === void 0)
    return failed("transport");
  return {
    ...head,
    result,
    plugin_flags: result.plugin_flags ?? {},
    plugin_flags_fetched_at: now
  };
}
function errorForStatus(status) {
  if (status === 200)
    return null;
  if (status === 401)
    return "rejected";
  if (status === 429)
    return "rate_limited";
  return "server";
}

// dist/shared/is-main-module.mjs
import { fileURLToPath } from "node:url";
import { posix as posix3, win32 as win323 } from "node:path";
import { realpathSync } from "node:fs";
function isMainModule(importMetaUrl, argv1, platform = process.platform) {
  if (typeof argv1 !== "string" || argv1.length === 0)
    return false;
  const windows = platform === "win32";
  try {
    const modulePath = real(fileURLToPath(importMetaUrl, { windows }));
    const scriptPath = real((windows ? win323 : posix3).resolve(argv1));
    return windows ? modulePath.toLowerCase() === scriptPath.toLowerCase() : modulePath === scriptPath;
  } catch {
    return false;
  }
}
function real(p) {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

// dist/shared/bin/whoami-refresh.mjs
var isMain = isMainModule(import.meta.url, process.argv[1]);
if (isMain) {
  void runWhoamiRefresh().then(() => process.exit(0)).catch(() => process.exit(1));
}
