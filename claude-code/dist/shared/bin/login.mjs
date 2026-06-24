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
      backfill_intent: ["accepted", "unspecified", "declined"].includes(intent) ? intent : "unspecified"
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

// dist/shared/login/orchestrator.mjs
async function runLogin(opts) {
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
  const cred = {
    schema_version: 1,
    issued_at: (/* @__PURE__ */ new Date()).toISOString(),
    credential: transferResult.credential,
    identity_hint: null
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
