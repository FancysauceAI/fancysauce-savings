#!/usr/bin/env node
import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

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

// dist/shared/credential-file.mjs
import { mkdir, rename, open, chmod, unlink, readFile, stat } from "node:fs/promises";
import { dirname, win32 as win322 } from "node:path";
import { randomBytes } from "node:crypto";
import { userInfo } from "node:os";

// dist/shared/run-command.mjs
import { execFile } from "node:child_process";
function runCommand(cmd, args, timeoutMs, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, ...opts }, (err, stdout) => {
      if (err)
        return reject(err);
      resolve(stdout.toString());
    });
  });
}

// dist/shared/credential-file.mjs
async function writeCredential(path, cred, deps = {}) {
  const platform = deps.platform ?? process.platform;
  const parent = dirname(path);
  await mkdir(parent, { recursive: true, mode: 448 });
  if (platform !== "win32") {
    await chmod(parent, 448).catch(() => {
    });
  }
  const protect = platform === "win32" ? windowsAclProtector(deps) : void 0;
  if (protect)
    await protect(parent, "dir");
  const tmp = `${path}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  let renamed = false;
  try {
    const fh = await open(tmp, "wx", 384);
    try {
      if (protect)
        await protect(tmp, "file");
      await fh.writeFile(JSON.stringify(cred));
      await fh.sync();
    } finally {
      await fh.close();
    }
    await rename(tmp, path);
    renamed = true;
  } finally {
    if (!renamed) {
      try {
        await unlink(tmp);
      } catch {
      }
    }
  }
}
var SYSTEM32 = win322.join(process.env.SystemRoot ?? "C:\\Windows", "System32");
var ICACLS_EXE = win322.join(SYSTEM32, "icacls.exe");
var WHOAMI_EXE = win322.join(SYSTEM32, "whoami.exe");
var SYSTEM_SID = "*S-1-5-18";
var ADMINISTRATORS_SID = "*S-1-5-32-544";
var PROTECT_BUDGET_MS = 2e3;
var WHOAMI_MAX_MS = 1e3;
var SPAWN_FLOOR_MS = 250;
var CredentialProtectionError = class extends Error {
  reason;
  remedy;
  constructor(reason, remedy) {
    super(`could not protect it (${reason}). Protect the folder by hand, then try again: ${remedy}`);
    this.reason = reason;
    this.remedy = remedy;
    this.name = "CredentialProtectionError";
  }
};
function icaclsArgs(target, trustee, kind) {
  const rights = kind === "dir" ? "(OI)(CI)(F)" : "(F)";
  return [
    target,
    "/inheritance:r",
    "/grant:r",
    `${trustee}:${rights}`,
    "/grant:r",
    `${SYSTEM_SID}:${rights}`,
    "/grant:r",
    `${ADMINISTRATORS_SID}:${rights}`
  ];
}
function windowsAclProtector(deps) {
  const runner = deps.runner ?? ((cmd, args, timeoutMs) => runCommand(cmd, args, timeoutMs, { windowsHide: true }));
  const env = deps.env ?? process.env;
  const now = deps.now ?? Date.now;
  const deadline = now() + (deps.budgetMs ?? PROTECT_BUDGET_MS);
  const left = () => {
    const ms = deadline - now();
    if (ms < SPAWN_FLOOR_MS)
      throw new Error(`timed out with ${ms} ms of the budget left`);
    return ms;
  };
  let trustee;
  return async (target, kind) => {
    try {
      trustee ??= await windowsTrustee(runner, env, Math.min(WHOAMI_MAX_MS, left()));
      await runner(ICACLS_EXE, icaclsArgs(target, trustee, kind), left());
    } catch (err) {
      const dir = kind === "dir" ? target : dirname(target);
      const args = icaclsArgs(dir, trustee ?? "%USERDOMAIN%\\%USERNAME%", "dir");
      const remedy = `icacls ${args.map((a) => `"${a}"`).join(" ")}`;
      throw new CredentialProtectionError(err.message, remedy);
    }
  };
}
async function windowsTrustee(runner, env, timeoutMs) {
  try {
    const out = await runner(WHOAMI_EXE, ["/user", "/fo", "csv", "/nh"], timeoutMs);
    const sid = /\bS-1-[0-9-]+\b/.exec(out);
    if (sid)
      return `*${sid[0]}`;
  } catch {
  }
  const { username } = userInfo();
  return env.USERDOMAIN ? `${env.USERDOMAIN}\\${username}` : username;
}
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
      const modeReason = permissiveModeReason(st.mode);
      if (modeReason !== null)
        return { kind: "malformed", reason: modeReason };
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
  const v = validateCredentialFile(parsed);
  if (v.kind === "ok")
    return { kind: "ok", cred: v.cred };
  return { kind: "malformed", reason: v.reason };
}
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
var KEY_RE = /^fs_(?:ingest(?:_test)?|(?:live|test)_t)_[A-Za-z0-9_-]{43}$/;
function parseIdentity(argv) {
  const i = argv.indexOf("--identity");
  const v = i >= 0 && i + 1 < argv.length ? argv[i + 1] : void 0;
  return v === "full" ? "full" : v === "hash" ? "hash" : void 0;
}
var TOKEN_FLAGS = ["--ingest-token", "--tenant-key"];
function parseIngestTokenArg(argv) {
  for (const flag of TOKEN_FLAGS) {
    const i = argv.indexOf(flag);
    if (i < 0)
      continue;
    return i + 1 < argv.length ? { kind: "token", value: argv[i + 1] } : { kind: "missing-value", flag };
  }
  return { kind: "absent" };
}
function ingestTokenFromEnv(env) {
  return env.FANCYSAUCE_INGEST_TOKEN || env.FANCYSAUCE_TENANT_KEY || "";
}
function decide(existing, args) {
  switch (existing.source) {
    case "absent":
      return { write: true };
    case "system":
      return { write: false, reason: "system (MDM) credential is authoritative" };
    case "malformed-system":
      return { write: false, reason: "system credential unreadable; not overwriting" };
    case "malformed-user":
      return { write: false, reason: "user credential unreadable; not overwriting" };
    case "user": {
      const c = existing.credential;
      if (c.provenance !== args.ownProvenance) {
        return { write: false, reason: "user credential not owned by this writer" };
      }
      const unchanged = c.credential === args.tenantKey && (c.identity_type ?? void 0) === args.identity;
      return unchanged ? { write: false, reason: "unchanged" } : { write: true };
    }
  }
}

// dist/shared/config.mjs
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

// dist/shared/is-main-module.mjs
import { fileURLToPath } from "node:url";
import { posix as posix2, win32 as win323 } from "node:path";
import { realpathSync } from "node:fs";
function isMainModule(importMetaUrl, argv1, platform = process.platform) {
  if (typeof argv1 !== "string" || argv1.length === 0)
    return false;
  const windows = platform === "win32";
  try {
    const modulePath = real(fileURLToPath(importMetaUrl, { windows }));
    const scriptPath = real((windows ? win323 : posix2).resolve(argv1));
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

// dist/shared/bin/bootstrap-credential.mjs
async function main(argv = process.argv.slice(2), now = () => (/* @__PURE__ */ new Date()).toISOString()) {
  const arg = parseIngestTokenArg(argv);
  const tenantKey = arg.kind === "token" ? arg.value : arg.kind === "absent" ? ingestTokenFromEnv(process.env) : "";
  if (!KEY_RE.test(tenantKey)) {
    process.stderr.write("bootstrap-credential: missing or malformed ingest token (--ingest-token/--tenant-key argv, or FANCYSAUCE_INGEST_TOKEN/FANCYSAUCE_TENANT_KEY env var)\n");
    return 2;
  }
  const args = { tenantKey, identity: parseIdentity(argv), ownProvenance: "marketplace_url" };
  const envPaths = parseCredentialPathsEnv();
  const paths = envPaths ? { system: envPaths.system, user: envPaths.user } : credentialPaths();
  const existing = await readCredential(paths);
  const d = decide(existing, args);
  if (!d.write)
    return 0;
  const cred = {
    schema_version: 1,
    issued_at: now(),
    credential: tenantKey,
    identity_hint: null,
    provenance: "marketplace_url",
    ...args.identity ? { identity_type: args.identity } : {}
  };
  try {
    await writeCredential(paths.user, cred);
  } catch (err) {
    process.stderr.write(`bootstrap-credential: write failed: ${err.message}
`);
    return 1;
  }
  return 0;
}
var isMain = isMainModule(import.meta.url, process.argv[1]);
if (isMain) {
  void main().then((code) => process.exit(code));
}
export {
  decide,
  main,
  parseIdentity
};
