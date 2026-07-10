#!/usr/bin/env node
import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// dist/shared/login/orchestrator.mjs
import { stat as stat2, writeFile } from "node:fs/promises";
import { join } from "node:path";

// dist/shared/login/state.mjs
import { randomBytes, timingSafeEqual } from "node:crypto";
var STATE_BYTES = 32;
function generateState() {
  return randomBytes(STATE_BYTES).toString("base64url");
}
function verifyState(expected, actual) {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(actual, "utf8");
  if (a.length !== b.length)
    return false;
  return timingSafeEqual(a, b);
}

// dist/shared/login/loopback.mjs
import { createServer } from "node:http";
import { URL } from "node:url";
var SECURITY_HEADERS = {
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store"
};
var SUCCESS_HTML = `<!doctype html>
<html><head>
  <meta charset="utf-8">
  <title>Authenticated</title>
  <meta http-equiv="Cache-Control" content="no-store">
  <script>history.replaceState({}, '', '/done');</script>
</head><body style="font-family: -apple-system, system-ui, sans-serif; padding: 2em;">
  <h1>Authenticated</h1>
  <p>You can close this window.</p>
</body></html>`;
var ERROR_HTML_400 = `<!doctype html><html><body><h1>Authentication failed</h1>
  <p>State token did not match. Please re-run /fancysauce:login.</p></body></html>`;
async function startLoopback(opts) {
  let resolve;
  const completion = new Promise((res) => {
    resolve = res;
  });
  const server = createServer((req, res) => {
    const host = (req.headers.host ?? "").toLowerCase();
    const addr = server.address();
    const port2 = typeof addr === "object" && addr !== null ? addr.port : 0;
    if (host !== `127.0.0.1:${port2}` && host !== `localhost:${port2}`) {
      res.writeHead(400, { ...SECURITY_HEADERS }).end();
      return;
    }
    const reqUrl = req.url ?? "/";
    if (!reqUrl.startsWith("/callback") || req.method !== "GET") {
      res.writeHead(404, { ...SECURITY_HEADERS }).end();
      return;
    }
    const url = new URL(reqUrl, `http://127.0.0.1`);
    const state = url.searchParams.get("state") ?? "";
    const credential = url.searchParams.get("credential") ?? "";
    const intent = url.searchParams.get("backfill_intent") ?? "unspecified";
    const idParam = (k) => {
      const v = url.searchParams.get(k);
      return v && v.length > 0 ? v : void 0;
    };
    const identity = {
      ...idParam("email") ? { email: idParam("email") } : {},
      ...idParam("account_id") ? { account_id: idParam("account_id") } : {},
      ...idParam("user_id") ? { user_id: idParam("user_id") } : {},
      ...idParam("org_id") ? { org_id: idParam("org_id") } : {},
      ...idParam("org_name") ? { org_name: idParam("org_name") } : {},
      ...idParam("plan") ? { plan: idParam("plan") } : {}
    };
    if (!verifyState(opts.state, state)) {
      res.writeHead(400, {
        "Content-Type": "text/html; charset=utf-8",
        ...SECURITY_HEADERS
      }).end(ERROR_HTML_400);
      return;
    }
    if (!credential) {
      res.writeHead(400, {
        "Content-Type": "text/plain; charset=utf-8",
        ...SECURITY_HEADERS
      }).end("missing credential");
      return;
    }
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      ...SECURITY_HEADERS
    }).end(SUCCESS_HTML);
    resolve({
      kind: "ok",
      credential,
      backfill_intent: ["accepted", "unspecified", "declined"].includes(intent) ? intent : "unspecified",
      ...Object.keys(identity).length ? { identity } : {}
    });
  });
  await new Promise((res) => server.listen(0, "127.0.0.1", () => res()));
  const port = server.address().port;
  const timer = setTimeout(() => {
    resolve({ kind: "error", reason: `timeout after ${opts.timeoutMs}ms` });
    server.close();
  }, opts.timeoutMs);
  const close = () => new Promise((res) => {
    clearTimeout(timer);
    server.close(() => res());
  });
  void completion.then(() => {
    clearTimeout(timer);
    server.close();
  });
  return { port, completion, close };
}

// dist/shared/login/browser.mjs
import { spawn } from "node:child_process";
function BROWSER_COMMAND_FOR_PLATFORM(platform) {
  switch (platform) {
    case "darwin":
      return { cmd: "open", args: [] };
    case "win32":
      return { cmd: "cmd", args: ["/c", "start", ""] };
    default:
      return { cmd: "xdg-open", args: [] };
  }
}
async function openBrowser(url, opts = {}) {
  const platform = opts.platform ?? process.platform;
  const spec = BROWSER_COMMAND_FOR_PLATFORM(platform);
  const args = [...spec.args, url];
  const spawner = opts.spawner ?? defaultSpawner;
  try {
    await spawner(spec.cmd, args);
  } catch (err) {
    opts.onError?.(err);
  }
}
function defaultSpawner(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

// dist/shared/credential-file.mjs
import { mkdir, rename, open, chmod, unlink, readFile, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { randomBytes as randomBytes2 } from "node:crypto";
async function writeCredential(path, cred) {
  const parent = dirname(path);
  await mkdir(parent, { recursive: true, mode: 448 });
  if (process.platform !== "win32") {
    await chmod(parent, 448).catch(() => {
    });
  }
  const tmp = `${path}.${process.pid}.${randomBytes2(4).toString("hex")}.tmp`;
  let renamed = false;
  try {
    const fh = await open(tmp, "wx", 384);
    try {
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
  const provenance = o.provenance === "marketplace_url" || o.provenance === "login" || o.provenance === "env_tenant_key" ? o.provenance : void 0;
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

// dist/shared/tenant-key-bootstrap.mjs
var KEY_RE = /^fs_(live|test)_t_[A-Za-z0-9_-]{43}$/;
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
async function ensureAmbientTenantCredential(existing, paths, opts = {}) {
  const env = opts.env ?? process.env;
  const tenantKey = env.FANCYSAUCE_TENANT_KEY ?? "";
  if (!KEY_RE.test(tenantKey))
    return { result: existing, wrote: false };
  const identity = env.FANCYSAUCE_IDENTITY_TYPE === "full" ? "full" : "hash";
  const d = decide(existing, { tenantKey, identity, ownProvenance: "env_tenant_key" });
  if (!d.write)
    return { result: existing, wrote: false };
  const cred = {
    schema_version: 1,
    issued_at: (opts.now ?? (() => (/* @__PURE__ */ new Date()).toISOString()))(),
    credential: tenantKey,
    identity_hint: null,
    provenance: "env_tenant_key",
    identity_type: identity
  };
  try {
    await writeCredential(paths.user, cred);
    return { result: { source: "user", credential: cred }, wrote: true };
  } catch (err) {
    (opts.logger ?? ((m) => process.stderr.write(m + "\n")))(`fancysauce: ambient tenant-key write failed: ${err.message}`);
    return { result: existing, wrote: false, inMemory: cred };
  }
}

// dist/shared/login/orchestrator.mjs
async function runLogin(opts) {
  const envKey = process.env.FANCYSAUCE_TENANT_KEY ?? "";
  if (KEY_RE.test(envKey)) {
    const sysPath = opts.systemCredentialPath ?? credentialPaths().system;
    const paths = { system: sysPath, user: opts.credentialUserPath };
    const existing = await readCredential(paths);
    if (existing.source === "system" || existing.source === "malformed-system") {
      opts.logger.warn(`a managed credential is already in effect at ${sysPath}`);
      return { kind: "refused-system-credential-present", systemPath: sysPath };
    }
    const ambient = await ensureAmbientTenantCredential(existing, paths, {
      logger: (m) => opts.logger.warn(m)
    });
    if (ambient.wrote) {
      opts.logger.info("signed in (tenant key from environment).");
    } else if (ambient.inMemory) {
      opts.logger.warn("tenant key present but the credential file could not be written; it will be used in-memory only this session.");
    } else {
      opts.logger.info("tenant key already in effect; nothing to do.");
    }
    return { kind: "ok", credential: envKey, backfill_intent: "unspecified" };
  }
  const systemPath = opts.systemCredentialPath ?? credentialPaths().system;
  const systemExists = await stat2(systemPath).then(() => true).catch(() => false);
  if (systemExists) {
    opts.logger.warn(`a managed credential is already in effect at ${systemPath}`);
    opts.logger.warn("it takes precedence over user-local logins; any credential created here would be ignored");
    opts.logger.warn("contact your administrator to change tenant");
    return { kind: "refused-system-credential-present", systemPath };
  }
  const state = generateState();
  const lb = await startLoopback({ state, timeoutMs: opts.loopbackTimeoutMs ?? 6e4 });
  const dashboardBase = opts.dashboardUrl ?? "https://preview.fancysauce.ai";
  const url = `${dashboardBase}/cli/install?state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(`http://127.0.0.1:${lb.port}/callback`)}`;
  opts.onBrowserUrl?.(url);
  opts.logger.info("opening browser to sign in...");
  if (opts.simulateLoopbackCallback) {
    void opts.simulateLoopbackCallback(lb.port, state);
  } else if (!opts.skipBrowserOpen) {
    await openBrowser(url, { onError: (err) => opts.logger.warn(`browser open failed: ${String(err)}; visit manually: ${url}`) });
  }
  const transferResult = await lb.completion;
  if (transferResult.kind === "error") {
    opts.logger.error(`login failed: ${transferResult.reason}`);
    return { kind: "error", reason: transferResult.reason };
  }
  const loginIdentity = transferResult.identity;
  const hasIdentity = loginIdentity && Object.keys(loginIdentity).length > 0;
  const cred = {
    schema_version: 1,
    issued_at: (/* @__PURE__ */ new Date()).toISOString(),
    credential: transferResult.credential,
    identity_hint: hasIdentity ? { source: "plugin_login", ...loginIdentity } : null,
    ...hasIdentity ? { provenance: "login" } : {}
  };
  await writeCredential(opts.credentialUserPath, cred);
  await writeIntentMarker(opts.stateDir, transferResult.backfill_intent);
  opts.logger.info("signed in.");
  return {
    kind: "ok",
    credential: transferResult.credential,
    backfill_intent: transferResult.backfill_intent
  };
}
async function writeIntentMarker(stateDir, intent) {
  if (intent === "accepted") {
    await writeFile(join(stateDir, "backfill-pending"), JSON.stringify({ created_at: (/* @__PURE__ */ new Date()).toISOString() }), "utf8");
  } else if (intent === "declined") {
    await writeFile(join(stateDir, "backfill-declined"), JSON.stringify({ created_at: (/* @__PURE__ */ new Date()).toISOString() }), "utf8");
  }
}

// dist/shared/bin/login.mjs
import { dirname as dirname2 } from "node:path";
import { mkdir as mkdir2 } from "node:fs/promises";
async function main(opts = {}) {
  const _runLogin = opts.runLogin ?? runLogin;
  const paths = credentialPaths();
  const stateDir = dirname2(paths.user);
  await mkdir2(stateDir, { recursive: true });
  const logger = {
    info: (msg) => process.stderr.write(`fancysauce: ${msg}
`),
    warn: (msg) => process.stderr.write(`fancysauce (warn): ${msg}
`),
    error: (msg) => process.stderr.write(`fancysauce (error): ${msg}
`)
  };
  const result = await _runLogin({
    credentialUserPath: paths.user,
    stateDir,
    logger
  });
  if (result.kind === "ok")
    return 0;
  if (result.kind === "refused-system-credential-present")
    return 2;
  return 1;
}
var isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  void main().then((code) => process.exit(code));
}
export {
  main
};
