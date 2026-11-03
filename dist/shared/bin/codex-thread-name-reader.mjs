#!/usr/bin/env node
import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);

// dist/shared/bin/codex-thread-name-reader.mjs
import { existsSync, readFileSync } from "node:fs";

// dist/shared/is-main-module.mjs
import { fileURLToPath } from "node:url";
import { posix, win32 } from "node:path";
import { realpathSync } from "node:fs";
function isMainModule(importMetaUrl, argv1, platform = process.platform) {
  if (typeof argv1 !== "string" || argv1.length === 0)
    return false;
  const windows = platform === "win32";
  try {
    const modulePath = real(fileURLToPath(importMetaUrl, { windows }));
    const scriptPath = real((windows ? win32 : posix).resolve(argv1));
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

// dist/shared/bin/codex-thread-name-reader.mjs
async function runCodexThreadNameReaders(input) {
  if (input.threads.length === 0 || !existsSync(input.databasePath))
    return /* @__PURE__ */ new Map();
  const sqlite = await import("node:sqlite");
  const DatabaseSync = sqlite.DatabaseSync;
  if (DatabaseSync === void 0)
    throw new Error("node:sqlite DatabaseSync is unavailable");
  const database = new DatabaseSync(input.databasePath, { readOnly: true, timeout: 0 });
  try {
    const statement = database.prepare(`
      WITH requested AS (
        SELECT value ->> 'id' AS id, value ->> 'rolloutPath' AS rollout_path
        FROM json_each(?)
      )
      SELECT id, rollout_path, name
      FROM threads
      INNER JOIN requested USING (id, rollout_path)
      WHERE threads.name IS NOT NULL
    `);
    const rows = statement.all(JSON.stringify(input.threads));
    const names = /* @__PURE__ */ new Map();
    for (const row of rows) {
      if (typeof row.id !== "string" || typeof row.rollout_path !== "string" || typeof row.name !== "string")
        continue;
      names.set(lookupKey(row.id, row.rollout_path), row.name);
    }
    return names;
  } finally {
    database.close();
  }
}
function lookupKey(threadId, rolloutPath) {
  return `${threadId}\0${rolloutPath}`;
}
if (isMainModule(import.meta.url, process.argv[1])) {
  const get = (name) => {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : void 0;
  };
  const databasePath = get("--database-path");
  if (!databasePath) {
    process.stderr.write("codex-thread-name-reader requires a database argument\n");
    process.exitCode = 2;
  } else {
    try {
      const threads = parseThreads(readFileSync(0, "utf8"));
      void runCodexThreadNameReaders({ databasePath, threads }).then((names) => {
        process.stdout.write(JSON.stringify({
          threads: threads.flatMap(({ id, rolloutPath: path }) => {
            const name = names.get(lookupKey(id, path));
            return name === null || name === void 0 ? [] : [{ id, rollout_path: path, name }];
          })
        }) + "\n");
      }).catch(() => {
        process.exitCode = 1;
      });
    } catch {
      process.exitCode = 1;
    }
  }
}
function parseThreads(value) {
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed))
    throw new Error("invalid thread list");
  return parsed.map((thread) => {
    if (typeof thread !== "object" || thread === null || Array.isArray(thread)) {
      throw new Error("invalid thread list");
    }
    const id = thread.id;
    const rolloutPath = thread.rolloutPath;
    if (typeof id !== "string" || typeof rolloutPath !== "string")
      throw new Error("invalid thread list");
    return { id, rolloutPath };
  });
}
export {
  runCodexThreadNameReaders
};
