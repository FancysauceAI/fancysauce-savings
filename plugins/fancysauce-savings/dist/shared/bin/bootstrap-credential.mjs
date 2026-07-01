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
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";
async function writeCredential(path, cred) {
  const parent = dirname(path);
  await mkdir(parent, { recursive: true, mode: 448 });
  if (process.platform !== "win32") {
    await chmod(parent, 448).catch(() => {
    });
  }
  const tmp = `${path}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
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

// dist/shared/bin/bootstrap-credential.mjs
var KEY_RE = /^fs_(live|test)_t_[A-Za-z0-9_-]{43}$/;
function parseIdentity(argv) {
  const i = argv.indexOf("--identity");
  const v = i >= 0 && i + 1 < argv.length ? argv[i + 1] : void 0;
  return v === "full" ? "full" : v === "hash" ? "hash" : void 0;
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
      if (c.provenance !== "marketplace_url") {
        return { write: false, reason: "user credential not marketplace-planted" };
      }
      const unchanged = c.credential === args.tenantKey && (c.identity_type ?? void 0) === args.identity;
      return unchanged ? { write: false, reason: "unchanged" } : { write: true };
    }
  }
}
async function main(argv = process.argv.slice(2), now = () => (/* @__PURE__ */ new Date()).toISOString()) {
  const tenantKey = process.env.FANCYSAUCE_TENANT_KEY ?? "";
  if (!KEY_RE.test(tenantKey)) {
    process.stderr.write("bootstrap-credential: missing or malformed FANCYSAUCE_TENANT_KEY\n");
    return 2;
  }
  const args = { tenantKey, identity: parseIdentity(argv) };
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
var isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  void main().then((code) => process.exit(code));
}
export {
  decide,
  main,
  parseIdentity
};
