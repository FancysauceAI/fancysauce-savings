#!/usr/bin/env node
import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// dist/shared/bin/upload-history.mjs
import { writeFile, mkdir as mkdir4 } from "node:fs/promises";
import { join as join6 } from "node:path";

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
import { join } from "node:path";
import { homedir as homedir2 } from "node:os";

// dist/shared/policy.mjs
function defaultPolicy() {
  const keepLists = {
    "session.start": Object.freeze(["cwd_hash", "model", "permission_mode", "fancysauce.repo_url_hash"]),
    "session.end": Object.freeze(["reason", "duration_wall_s"]),
    "prompt.submit": Object.freeze(["prompt_length", "slash_command"]),
    "tool_call.start": Object.freeze([
      "tool_name",
      "tool_input_hash",
      "input_size_bytes",
      "correlation_id",
      "subsession_id",
      "agent_type",
      "skill_name"
    ]),
    "tool_call.complete": Object.freeze([
      "tool_name",
      "tool_input_hash",
      "input_size_bytes",
      "response_size_bytes",
      "success",
      "correlation_id",
      "subsession_id",
      "agent_type",
      "skill_name"
    ]),
    "tool_call.failed": Object.freeze([
      "tool_name",
      "tool_input_hash",
      "correlation_id",
      "subsession_id",
      "agent_type",
      "skill_name"
    ]),
    "subagent.start": Object.freeze(["agent_id", "agent_type"]),
    "subagent.complete": Object.freeze([
      "agent_id",
      "agent_type",
      "duration_wall_s",
      "last_assistant_message_size_bytes",
      "last_assistant_message_hash"
    ]),
    "stop": Object.freeze([]),
    "permission.request": Object.freeze([]),
    "notification": Object.freeze(["notification_type"]),
    "task.completed": Object.freeze(["task_id"]),
    "compaction.before": Object.freeze([]),
    "compaction.after": Object.freeze([]),
    "config.changed": Object.freeze([]),
    "usage_config.changed": Object.freeze([
      "plan_type",
      "rate_limit_tier",
      "billing_type",
      "extra_usage_enabled",
      "extra_usage_disabled_reason",
      "overage_credit_available",
      "overage_credit_eligible"
    ]),
    "usage_limit.exceeded": Object.freeze([
      "limit_message",
      "limit_kind_guess",
      "reset_at_guess",
      "api_error_status",
      "request_id",
      "transcript_message_uuid",
      "plan_type",
      "rate_limit_tier",
      "billing_type",
      "extra_usage_enabled",
      "extra_usage_disabled_reason"
    ]),
    "api.request": Object.freeze([
      "cost_usd",
      "tokens_input",
      "tokens_output",
      "tokens_cache_read",
      "tokens_cache_create",
      "tokens_cache_create_5m",
      "tokens_cache_create_1h",
      "tokens_reasoning",
      "model",
      "request_id",
      "transcript_message_uuid",
      "subsession_id",
      "agent_type",
      "stop_reason"
    ])
  };
  return Object.freeze({
    maxSerializedBytes: 4096,
    keepLists: Object.freeze(keepLists)
  });
}

// dist/shared/credential-file.mjs
import { mkdir, rename, open, chmod, unlink, readFile, stat } from "node:fs/promises";
async function readCredential(paths) {
  const sys = await tryReadOne(paths.system);
  if (sys.kind === "ok")
    return { source: "system", credential: sys.cred };
  if (sys.kind === "malformed")
    return { source: "malformed-system", credential: null, reason: sys.reason };
  const usr = await tryReadOne(paths.user);
  if (usr.kind === "ok")
    return { source: "user", credential: usr.cred };
  if (usr.kind === "malformed")
    return { source: "malformed-user", credential: null, reason: usr.reason };
  return { source: "absent", credential: null };
}
async function tryReadOne(path) {
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    if (err.code === "ENOENT")
      return { kind: "absent" };
    return { kind: "malformed", reason: `read failed: ${err.message}` };
  }
  if (process.platform !== "win32") {
    try {
      const st = await stat(path);
      if ((st.mode & 63) !== 0) {
        return {
          kind: "malformed",
          reason: `file mode ${(st.mode & 511).toString(8)} too permissive; must be 0600`
        };
      }
    } catch (err) {
      return { kind: "malformed", reason: `stat failed: ${err.message}` };
    }
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { kind: "malformed", reason: `JSON parse failed: ${err.message}` };
  }
  const v = validate(parsed);
  if (v.kind === "ok")
    return { kind: "ok", cred: v.cred };
  return { kind: "malformed", reason: v.reason };
}
function validate(v) {
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
  const identity_type = o.identity_type === "full" || o.identity_type === "hash" ? o.identity_type : void 0;
  const provenance = o.provenance === "marketplace_url" ? "marketplace_url" : void 0;
  return {
    kind: "ok",
    cred: {
      schema_version: 1,
      issued_at: o.issued_at,
      credential: o.credential,
      identity_hint: hint.value,
      ...endpoint !== void 0 ? { endpoint } : {},
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
  return { kind: "bad", reason: `identity_hint.source unknown: ${String(o.source)}` };
}

// dist/shared/config.mjs
var INGEST_ENDPOINT = "https://ingest.preview.fancysauce.ai";
var DEFAULT_LOGIN_STATE_DIR = join(homedir2(), ".config", "fancysauce");
var KNOWN_FANCYSAUCE_VARS = /* @__PURE__ */ new Set([
  "FANCYSAUCE_CREDENTIAL_PATHS",
  "FANCYSAUCE_API_KEY",
  "FANCYSAUCE_IDENTITY_TYPE"
]);
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
async function loadConfig(opts = {}) {
  const onUnknown = opts.onUnknownEnvVar ?? defaultUnknownEnvVarHandler;
  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith("FANCYSAUCE_") && !KNOWN_FANCYSAUCE_VARS.has(name)) {
      onUnknown(name, value ?? "");
    }
  }
  const parsed = parseCredentialPathsEnv();
  const endpoint = opts.endpointOverride ?? INGEST_ENDPOINT;
  const loginStateDir = parsed?.login_state_dir ?? DEFAULT_LOGIN_STATE_DIR;
  const paths = opts.paths ?? (parsed ? { system: parsed.system, user: parsed.user } : credentialPaths());
  const result = await readCredential(paths);
  switch (result.source) {
    case "absent": {
      const apiKey = process.env.FANCYSAUCE_API_KEY;
      if (!apiKey)
        return null;
      const envIdentityType = process.env.FANCYSAUCE_IDENTITY_TYPE === "full" ? "full" : "hash";
      return {
        credential: apiKey,
        endpoint: opts.endpointOverride ?? INGEST_ENDPOINT,
        loginStateDir,
        policy: defaultPolicy(),
        identity_type: envIdentityType,
        identity_hint: null
      };
    }
    case "malformed-system":
    case "malformed-user":
      return {
        credential: "",
        endpoint,
        loginStateDir,
        policy: defaultPolicy(),
        credentialError: {
          source: result.source === "malformed-system" ? "system" : "user",
          reason: result.reason
        }
      };
    case "system":
    case "user": {
      const fileEndpoint = result.credential.endpoint ?? endpoint;
      const fileIdentityType = result.credential.identity_type ?? void 0;
      return {
        credential: result.credential.credential,
        endpoint: fileEndpoint,
        loginStateDir,
        policy: defaultPolicy(),
        ...fileIdentityType !== void 0 ? { identity_type: fileIdentityType } : {},
        identity_hint: result.credential.identity_hint
      };
    }
  }
}
function defaultUnknownEnvVarHandler(_name, _value) {
}

// dist/shared/data-dir.mjs
import { readFileSync } from "node:fs";
import { basename, join as join2, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir as homedir3 } from "node:os";
function resolveDataDir(opts = {}) {
  if (opts.override)
    return opts.override;
  if (process.env.CLAUDE_PLUGIN_DATA)
    return process.env.CLAUDE_PLUGIN_DATA;
  const home = opts.homeDir ?? homedir3();
  const root = trimTrailingSlash(opts.pluginRoot ?? defaultPluginRoot());
  const fromRegistry = deriveFromRegistry(root, home);
  if (fromRegistry !== null)
    return fromRegistry;
  const fromMarketplaces = deriveFromMarketplaces(root, home);
  if (fromMarketplaces !== null)
    return fromMarketplaces;
  const fromCodexCache = deriveFromCodexCache(root, home);
  if (fromCodexCache !== null)
    return fromCodexCache;
  const fromCodexMarketplaces = deriveFromCodexMarketplaces(root, home);
  if (fromCodexMarketplaces !== null)
    return fromCodexMarketplaces;
  return join2(home, ".claude-plugin-data");
}
function defaultPluginRoot() {
  const here = dirname(fileURLToPath(import.meta.url));
  return join2(here, "..", "..", "..");
}
function trimTrailingSlash(p) {
  return p.endsWith("/") ? p.slice(0, -1) : p;
}
function deriveFromRegistry(root, home) {
  try {
    const regPath = join2(home, ".claude", "plugins", "installed_plugins.json");
    const reg = JSON.parse(readFileSync(regPath, "utf8"));
    const plugins = reg?.plugins;
    if (typeof plugins !== "object" || plugins === null)
      return null;
    for (const [key, entries] of Object.entries(plugins)) {
      if (!Array.isArray(entries))
        continue;
      for (const entry of entries) {
        const installPath = entry.installPath;
        if (typeof installPath !== "string")
          continue;
        if (trimTrailingSlash(installPath) !== root)
          continue;
        const at = key.lastIndexOf("@");
        if (at <= 0 || at >= key.length - 1)
          continue;
        const plugin = key.slice(0, at);
        const alias = key.slice(at + 1);
        return join2(home, ".claude", "plugins", "data", `${plugin}-${alias}`);
      }
    }
  } catch {
  }
  return null;
}
function deriveFromMarketplaces(root, home) {
  try {
    const kmPath = join2(home, ".claude", "plugins", "known_marketplaces.json");
    const km = JSON.parse(readFileSync(kmPath, "utf8"));
    let alias = null;
    for (const [k, v] of Object.entries(km)) {
      const installLocation = v.installLocation;
      if (typeof installLocation === "string" && trimTrailingSlash(installLocation) === root) {
        alias = k;
        break;
      }
    }
    if (alias === null)
      return null;
    const manifest = JSON.parse(readFileSync(join2(root, ".claude-plugin", "marketplace.json"), "utf8"));
    const plugin = manifest.plugins?.[0]?.name;
    if (typeof plugin !== "string" || plugin.length === 0)
      return null;
    return join2(home, ".claude", "plugins", "data", `${plugin}-${alias}`);
  } catch {
    return null;
  }
}
function deriveFromCodexCache(root, home) {
  const prefix = trimTrailingSlash(join2(home, ".codex", "plugins", "cache"));
  if (!root.startsWith(prefix + "/"))
    return null;
  const parts = root.slice(prefix.length + 1).split("/");
  const alias = parts[0];
  const plugin = parts[1];
  if (!alias || !plugin)
    return null;
  return join2(home, ".codex", "plugins", "data", `${plugin}-${alias}`);
}
function deriveFromCodexMarketplaces(root, home) {
  try {
    const plugin = readCodexPluginName(root) ?? basename(root);
    if (plugin.length === 0)
      return null;
    const configPath = join2(home, ".codex", "config.toml");
    const marketplaces = parseCodexMarketplaces(readFileSync(configPath, "utf8"));
    for (const marketplace of marketplaces) {
      const expectedRoot = trimTrailingSlash(join2(marketplace.source, "plugins", plugin));
      if (expectedRoot === root) {
        return join2(home, ".codex", "plugins", "data", `${plugin}-${marketplace.alias}`);
      }
    }
  } catch {
    return null;
  }
  return null;
}
function readCodexPluginName(root) {
  try {
    const manifest = JSON.parse(readFileSync(join2(root, ".codex-plugin", "plugin.json"), "utf8"));
    return typeof manifest.name === "string" && manifest.name.length > 0 ? manifest.name : null;
  } catch {
    return null;
  }
}
function parseCodexMarketplaces(config) {
  const marketplaces = [];
  let currentAlias = null;
  for (const line of config.split(/\r?\n/)) {
    const header = line.match(/^\s*\[marketplaces\.([^\]]+)\]\s*$/);
    if (header) {
      currentAlias = parseTomlKey(header[1]);
      continue;
    }
    if (/^\s*\[/.test(line)) {
      currentAlias = null;
      continue;
    }
    if (currentAlias === null)
      continue;
    const source = line.match(/^\s*source\s*=\s*"([^"]*)"\s*$/);
    if (source) {
      marketplaces.push({ alias: currentAlias, source: source[1] });
    }
  }
  return marketplaces;
}
function parseTomlKey(key) {
  const trimmed = key.trim();
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"'))
    return trimmed;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed.slice(1, -1);
  }
}

// dist/shared/backfill/status.mjs
import { readFile as readFile2, open as open2, rename as rename2, mkdir as mkdir2, unlink as unlink2 } from "node:fs/promises";
import { join as join3, dirname as dirname2 } from "node:path";
async function readStatus(stateDir) {
  try {
    const raw = await readFile2(join3(stateDir, "backfill.status"), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// dist/shared/backfill/runner-spawn.mjs
import { spawn } from "node:child_process";
import { join as join4, dirname as dirname3 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// dist/shared/backfill/runner-env.mjs
var ALLOWED = /* @__PURE__ */ new Set([
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "SHELL",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TERM",
  "VITEST",
  "CLAUDE_PLUGIN_DATA",
  "FANCYSAUCE_CREDENTIAL_PATHS"
]);
function buildRunnerEnv(env) {
  const out = {};
  for (const [k, v] of Object.entries(env)) {
    if (ALLOWED.has(k))
      out[k] = v;
  }
  return out;
}

// dist/shared/backfill/runner-spawn.mjs
async function spawnBackfillRunner(input) {
  const here = dirname3(fileURLToPath2(import.meta.url));
  const binPath = join4(here, "..", "..", "bin", "backfill-runner.mjs");
  const args = ["--data-dir", input.dataDir, "--credential-path", input.credentialPath];
  const spawner = input.spawner ?? defaultSpawner;
  try {
    const { pid } = await spawner(binPath, args);
    return { kind: "spawned", pid };
  } catch (err) {
    return { kind: "error", reason: err.message };
  }
}
function defaultSpawner(binPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [binPath, ...args], {
      detached: true,
      stdio: "ignore",
      env: buildRunnerEnv(process.env)
    });
    child.once("error", reject);
    child.once("spawn", () => {
      const pid = child.pid ?? 0;
      child.unref();
      resolve({ pid });
    });
  });
}

// dist/shared/backfill/pid-guard.mjs
import { readFile as readFile3, rm, mkdir as mkdir3, open as open3 } from "node:fs/promises";
import { join as join5 } from "node:path";
async function isBackfillActive(stateDir) {
  try {
    const raw = await readFile3(join5(stateDir, "backfill.pid"), "utf8");
    const pid = Number(raw.trim());
    if (!Number.isFinite(pid) || pid <= 0)
      return null;
    try {
      process.kill(pid, 0);
      return pid;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

// dist/shared/bin/upload-history.mjs
async function main(opts) {
  const argv = opts.argv;
  const dataDir = resolveDataDir({ override: opts.dataDir });
  const credPath = opts.credentialUserPath ?? credentialPaths().user;
  const out = opts.stdout ?? ((s) => {
    process.stdout.write(s);
  });
  const err = opts.stderr ?? ((s) => {
    process.stderr.write(s);
  });
  const stateDir = join6(dataDir, "state");
  if (argv.includes("--status")) {
    return renderStatus(stateDir, out);
  }
  if (argv.includes("--skip")) {
    return writeSkipMarker(stateDir, out);
  }
  return spawnRunner({ dataDir, credPath, stateDir, out, err, spawner: opts.spawner });
}
async function renderStatus(stateDir, out) {
  const s = await readStatus(stateDir);
  if (!s) {
    out("No backfill has been run.\n");
    return 0;
  }
  switch (s.phase) {
    case "running":
      out(`Uploading: ${s.events_uploaded} events done.
`);
      return 0;
    case "completed":
      out(`Backfill complete. ${s.events_uploaded} events uploaded.
`);
      return 0;
    case "failed":
      out(`Backfill failed: ${s.last_error ?? "unknown"}.
Re-run /fancysauce:upload-history to retry.
`);
      return 0;
    case "interrupted":
      out(`Backfill was interrupted.
Re-run /fancysauce:upload-history to resume from cursor.
`);
      return 0;
    case "skipped":
      out("Backfill was skipped (already running or queue empty).\n");
      return 0;
  }
}
async function writeSkipMarker(stateDir, out) {
  await mkdir4(stateDir, { recursive: true });
  await writeFile(join6(stateDir, "backfill-skip"), JSON.stringify({ created_at: (/* @__PURE__ */ new Date()).toISOString() }), "utf8");
  out("Backfill nudges suppressed. Run /fancysauce:upload-history (without --skip) to start one any time.\n");
  return 0;
}
async function spawnRunner(args) {
  const cfg = await loadConfig();
  if (!cfg || !cfg.credential) {
    const systemPath = credentialPaths().system;
    if (cfg?.credentialError) {
      args.err(cfg.credentialError.source === "system" ? `fancysauce: managed credential at ${systemPath} is malformed (${cfg.credentialError.reason}); contact administrator.
` : `fancysauce: user credential is malformed (${cfg.credentialError.reason}). Run /fancysauce:login to recreate it.
`);
    } else {
      args.err(`fancysauce: no credential file. Run /fancysauce:login first, or have your administrator install a managed credential at ${systemPath}.
`);
    }
    return 1;
  }
  const active = await isBackfillActive(args.stateDir);
  if (active !== null) {
    args.out(`Backfill already running (pid ${active}). Check /fancysauce:upload-history --status.
`);
    return 0;
  }
  const result = await spawnBackfillRunner({
    dataDir: args.dataDir,
    credentialPath: args.credPath,
    spawner: args.spawner
  });
  if (result.kind === "spawned") {
    args.out(`Backfill started in background (pid ${result.pid}). Run /fancysauce:upload-history --status for progress.
`);
    return 0;
  }
  args.err(`failed to spawn backfill runner: ${result.reason}
`);
  return 1;
}
var isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  void main({ argv: process.argv.slice(2) }).then((code) => process.exit(code));
}
export {
  main
};
