#!/usr/bin/env node
import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// dist/mcp/proxy.mjs
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

// dist/shared/config.mjs
import { join } from "node:path";
import { homedir as homedir2 } from "node:os";

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

// dist/mcp/proxy.mjs
var PROTOCOL_VERSION = "2025-06-18";
var REQUEST_TIMEOUT_MS = 15e3;
var MAX_RESPONSE_BYTES = 1e6;
var LOGIN_POLL_INTERVAL_MS = 3e3;
var LOGGED_OUT_MESSAGE = "Not logged in \u2014 run /fancysauce-savings:login";
var SERVER_INFO = { name: "fancysauce", version: "0.0.0" };
async function resolveProxyCredential(paths = credentialPaths()) {
  const read = await readCredential(paths);
  if (read.credential === null)
    return { kind: "logged-out" };
  if (KEY_RE.test(read.credential.credential))
    return { kind: "logged-out" };
  return {
    kind: "ok",
    credential: read.credential.credential,
    endpoint: read.credential.api_endpoint ?? null
  };
}
async function handleFrame(line, opts = {}) {
  const frame = parseFrame(line);
  if (frame === null)
    return serialize(errorResponse(null, -32700, "parse error"));
  const id = frameId(frame);
  const wantsReply = id !== null && typeof frame.method === "string";
  const cred = await resolveProxyCredential(opts.paths ?? credentialPaths());
  opts.onCredential?.(cred);
  if (cred.kind === "logged-out")
    return loggedOutReply(frame, id, wantsReply);
  return await forward(
    line,
    id,
    wantsReply,
    cred.credential,
    // Endpoint precedence, copied from loadConfig: credential file →
    // programmatic option → compiled constant.
    cred.endpoint ?? opts.endpointOverride ?? API_ENDPOINT,
    opts.timeoutMs ?? REQUEST_TIMEOUT_MS
  );
}
async function runProxy(opts = {}) {
  const input = opts.input ?? process.stdin;
  const output = opts.output ?? process.stdout;
  const announcer = createLoginAnnouncer(output, opts.paths, opts.pollIntervalMs ?? LOGIN_POLL_INTERVAL_MS);
  input.setEncoding("utf8");
  let buffer = "";
  try {
    for await (const chunk of input) {
      buffer += chunk;
      for (; ; ) {
        const nl = buffer.indexOf("\n");
        if (nl === -1)
          break;
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line)
          continue;
        let out;
        try {
          out = await handleFrame(line, {
            paths: opts.paths,
            endpointOverride: opts.endpointOverride,
            timeoutMs: opts.timeoutMs,
            onCredential: announcer.observe
          });
        } catch (err) {
          out = internalErrorReply(line, err);
        }
        if (out !== null)
          output.write(`${out}
`);
      }
    }
  } finally {
    announcer.stop();
  }
}
function createLoginAnnouncer(output, paths, pollIntervalMs) {
  let servedLoggedOut = false;
  let announced = false;
  let timer = null;
  function stop() {
    if (timer === null)
      return;
    clearInterval(timer);
    timer = null;
  }
  function announce() {
    if (announced)
      return;
    announced = true;
    stop();
    output.write(`${serialize({ jsonrpc: "2.0", method: "notifications/tools/list_changed" })}
`);
  }
  function poll() {
    void resolveProxyCredential(paths ?? credentialPaths()).then((state) => {
      if (state.kind === "ok")
        announce();
    }, () => {
    });
  }
  return {
    observe: (state) => {
      if (state.kind === "ok") {
        if (servedLoggedOut)
          announce();
        return;
      }
      servedLoggedOut = true;
      if (announced || timer !== null)
        return;
      timer = setInterval(poll, pollIntervalMs);
      timer.unref?.();
    },
    stop
  };
}
async function forward(line, id, wantsReply, credential, endpoint, timeoutMs) {
  let url;
  try {
    url = endpointUrl(endpoint, "mcp");
  } catch (err) {
    return failure(wantsReply, id, "invalid MCP endpoint", err.message);
  }
  if (!allowsBearer(url)) {
    return failure(wantsReply, id, "refusing non-https MCP endpoint", url.origin);
  }
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Streamable HTTP validates both tokens up front regardless of which
        // content type the server actually replies with.
        Accept: "application/json, text/event-stream",
        "Mcp-Protocol-Version": PROTOCOL_VERSION,
        Authorization: `Bearer ${credential}`
      },
      // Forwarded verbatim — the proxy never rewrites a frame.
      body: line,
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    return failure(wantsReply, id, "MCP request failed", err.message);
  }
  let body;
  try {
    body = await readBoundedText(res);
  } catch (err) {
    return failure(wantsReply, id, "MCP response read failed", err.message);
  }
  if (!wantsReply)
    return null;
  if (body.kind === "too-large") {
    return reply(true, id, -32e3, `MCP response exceeded ${MAX_RESPONSE_BYTES} bytes`);
  }
  const text = body.text.trim();
  const isSse = res.headers.get("content-type")?.includes("text/event-stream") ?? false;
  const frames = [];
  for (const candidate of isSse ? sseDataFrames(text) : [text]) {
    const parsed = parseJsonObject(candidate);
    if (parsed !== null)
      frames.push(serialize(withRequestId(parsed, id)));
  }
  if (frames.length === 0) {
    return reply(true, id, -32e3, `MCP request failed (http ${res.status})`);
  }
  return frames.join("\n");
}
function withRequestId(frame, id) {
  if (id === null)
    return frame;
  if (typeof frame.method === "string")
    return frame;
  if (frame.id !== void 0 && frame.id !== null)
    return frame;
  return { ...frame, id };
}
function loggedOutReply(frame, id, wantsReply) {
  if (!wantsReply)
    return null;
  switch (frame.method) {
    case "initialize":
      return serialize({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: requestedProtocolVersion(frame.params),
          // listChanged is what lets a mid-session login work: the client only
          // asks for the tool list again after
          // notifications/tools/list_changed, which createLoginAnnouncer sends
          // when a credential appears.
          capabilities: { tools: { listChanged: true } },
          serverInfo: SERVER_INFO
        }
      });
    case "tools/list":
      return serialize({ jsonrpc: "2.0", id, result: { tools: [] } });
    case "ping":
      return serialize({ jsonrpc: "2.0", id, result: {} });
    case "tools/call":
      return serialize(errorResponse(id, -32e3, LOGGED_OUT_MESSAGE));
    default:
      return serialize(errorResponse(id, -32601, `method not found: ${String(frame.method)}`));
  }
}
function requestedProtocolVersion(params) {
  if (typeof params !== "object" || params === null)
    return PROTOCOL_VERSION;
  const v = params.protocolVersion;
  return typeof v === "string" && v ? v : PROTOCOL_VERSION;
}
function parseFrame(line) {
  try {
    const parsed = JSON.parse(line);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}
function frameId(frame) {
  return frame.id === void 0 || frame.id === null ? null : frame.id;
}
function internalErrorReply(line, err) {
  const frame = parseFrame(line);
  const id = frame === null ? null : frameId(frame);
  process.stderr.write(`fancysauce (error): mcp proxy error: ${err.message}
`);
  return id === null ? null : serialize(errorResponse(id, -32603, "mcp proxy error"));
}
function sseDataFrames(text) {
  const frames = [];
  for (const event of text.split(/\r?\n\r?\n/)) {
    const data = event.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice("data:".length).trim()).join("\n");
    if (data)
      frames.push(data);
  }
  return frames;
}
function parseJsonObject(text) {
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
async function readBoundedText(res) {
  const declared = res.headers.get("content-length");
  if (declared && Number(declared) > MAX_RESPONSE_BYTES)
    return { kind: "too-large" };
  const reader = res.body?.getReader();
  if (!reader)
    return { kind: "ok", text: await res.text() };
  const chunks = [];
  let total = 0;
  for (; ; ) {
    const { done, value } = await reader.read();
    if (done)
      break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {
      });
      return { kind: "too-large" };
    }
    chunks.push(value);
  }
  return { kind: "ok", text: Buffer.concat(chunks).toString("utf8") };
}
function reply(wantsReply, id, code, message) {
  return wantsReply ? serialize(errorResponse(id, code, message)) : null;
}
function failure(wantsReply, id, summary, detail) {
  process.stderr.write(`fancysauce (error): ${summary}: ${detail}
`);
  return reply(wantsReply, id, -32e3, summary);
}
function errorResponse(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
function serialize(payload) {
  return JSON.stringify(payload);
}
function isDirectInvocation(metaUrl, argv1) {
  if (!argv1)
    return false;
  try {
    return realpathSync(fileURLToPath(metaUrl)) === realpathSync(argv1);
  } catch {
    return false;
  }
}
if (isDirectInvocation(import.meta.url, process.argv[1])) {
  void runProxy().then(() => process.exit(0), (err) => {
    process.stderr.write(`fancysauce (error): mcp proxy failed: ${err.message}
`);
    process.exit(1);
  });
}
export {
  handleFrame,
  isDirectInvocation,
  resolveProxyCredential,
  runProxy
};
