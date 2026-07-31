#!/usr/bin/env node
import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

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
var init_credential_paths = __esm({
  "dist/shared/credential-paths.mjs"() {
    "use strict";
  }
});

// dist/shared/backfill/pid-guard.mjs
import { readFile as readFile2, rm, mkdir as mkdir2, open as open2 } from "node:fs/promises";
import { join as join2 } from "node:path";
async function isBackfillActive(stateDir) {
  try {
    const raw = await readFile2(join2(stateDir, "backfill.pid"), "utf8");
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
var init_pid_guard = __esm({
  "dist/shared/backfill/pid-guard.mjs"() {
    "use strict";
  }
});

// dist/shared/backfill/runner-env.mjs
function buildRunnerEnv(env) {
  const out = {};
  for (const [k, v] of Object.entries(env)) {
    if (ALLOWED.has(k))
      out[k] = v;
  }
  return out;
}
var ALLOWED;
var init_runner_env = __esm({
  "dist/shared/backfill/runner-env.mjs"() {
    "use strict";
    ALLOWED = /* @__PURE__ */ new Set([
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
  }
});

// dist/shared/backfill/runner-spawn.mjs
import { spawn } from "node:child_process";
import { join as join3, dirname as dirname2 } from "node:path";
import { fileURLToPath } from "node:url";
function resolveDistBinPath(containerDir, binName) {
  return join3(containerDir, "..", "..", "shared", "bin", binName);
}
async function spawnBackfillRunner(input) {
  const here = dirname2(fileURLToPath(import.meta.url));
  const binPath = resolveDistBinPath(here, "backfill-runner.mjs");
  const args = ["--data-dir", input.dataDir, "--credential-path", input.credentialPath];
  return spawnDetachedBin(binPath, args, input.spawner);
}
async function spawnDetachedBin(binPath, args, spawner) {
  const spawnFn = spawner ?? defaultSpawner;
  try {
    const { pid } = await spawnFn(binPath, args);
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
var init_runner_spawn = __esm({
  "dist/shared/backfill/runner-spawn.mjs"() {
    "use strict";
    init_runner_env();
  }
});

// node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "node_modules/graceful-fs/polyfills.js"(exports, module) {
    var constants3 = __require("constants");
    var origCwd = process.cwd;
    var cwd = null;
    var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
    process.cwd = function() {
      if (!cwd)
        cwd = origCwd.call(process);
      return cwd;
    };
    try {
      process.cwd();
    } catch (er) {
    }
    if (typeof process.chdir === "function") {
      chdir = process.chdir;
      process.chdir = function(d) {
        cwd = null;
        chdir.call(process, d);
      };
      if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
    }
    var chdir;
    module.exports = patch;
    function patch(fs) {
      if (constants3.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs);
      }
      if (!fs.lutimes) {
        patchLutimes(fs);
      }
      fs.chown = chownFix(fs.chown);
      fs.fchown = chownFix(fs.fchown);
      fs.lchown = chownFix(fs.lchown);
      fs.chmod = chmodFix(fs.chmod);
      fs.fchmod = chmodFix(fs.fchmod);
      fs.lchmod = chmodFix(fs.lchmod);
      fs.chownSync = chownFixSync(fs.chownSync);
      fs.fchownSync = chownFixSync(fs.fchownSync);
      fs.lchownSync = chownFixSync(fs.lchownSync);
      fs.chmodSync = chmodFixSync(fs.chmodSync);
      fs.fchmodSync = chmodFixSync(fs.fchmodSync);
      fs.lchmodSync = chmodFixSync(fs.lchmodSync);
      fs.stat = statFix(fs.stat);
      fs.fstat = statFix(fs.fstat);
      fs.lstat = statFix(fs.lstat);
      fs.statSync = statFixSync(fs.statSync);
      fs.fstatSync = statFixSync(fs.fstatSync);
      fs.lstatSync = statFixSync(fs.lstatSync);
      if (fs.chmod && !fs.lchmod) {
        fs.lchmod = function(path, mode, cb) {
          if (cb) process.nextTick(cb);
        };
        fs.lchmodSync = function() {
        };
      }
      if (fs.chown && !fs.lchown) {
        fs.lchown = function(path, uid, gid, cb) {
          if (cb) process.nextTick(cb);
        };
        fs.lchownSync = function() {
        };
      }
      if (platform === "win32") {
        fs.rename = typeof fs.rename !== "function" ? fs.rename : (function(fs$rename) {
          function rename5(from, to, cb) {
            var start = Date.now();
            var backoff = 0;
            fs$rename(from, to, function CB(er) {
              if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
                setTimeout(function() {
                  fs.stat(to, function(stater, st) {
                    if (stater && stater.code === "ENOENT")
                      fs$rename(from, to, CB);
                    else
                      cb(er);
                  });
                }, backoff);
                if (backoff < 100)
                  backoff += 10;
                return;
              }
              if (cb) cb(er);
            });
          }
          if (Object.setPrototypeOf) Object.setPrototypeOf(rename5, fs$rename);
          return rename5;
        })(fs.rename);
      }
      fs.read = typeof fs.read !== "function" ? fs.read : (function(fs$read) {
        function read(fd, buffer, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ === "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                return fs$read.call(fs, fd, buffer, offset, length, position, callback);
              }
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs, fd, buffer, offset, length, position, callback);
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
        return read;
      })(fs.read);
      fs.readSync = typeof fs.readSync !== "function" ? fs.readSync : /* @__PURE__ */ (function(fs$readSync) {
        return function(fd, buffer, offset, length, position) {
          var eagCounter = 0;
          while (true) {
            try {
              return fs$readSync.call(fs, fd, buffer, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
          }
        };
      })(fs.readSync);
      function patchLchmod(fs2) {
        fs2.lchmod = function(path, mode, callback) {
          fs2.open(
            path,
            constants3.O_WRONLY | constants3.O_SYMLINK,
            mode,
            function(err, fd) {
              if (err) {
                if (callback) callback(err);
                return;
              }
              fs2.fchmod(fd, mode, function(err2) {
                fs2.close(fd, function(err22) {
                  if (callback) callback(err2 || err22);
                });
              });
            }
          );
        };
        fs2.lchmodSync = function(path, mode) {
          var fd = fs2.openSync(path, constants3.O_WRONLY | constants3.O_SYMLINK, mode);
          var threw = true;
          var ret;
          try {
            ret = fs2.fchmodSync(fd, mode);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs2.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs2.closeSync(fd);
            }
          }
          return ret;
        };
      }
      function patchLutimes(fs2) {
        if (constants3.hasOwnProperty("O_SYMLINK") && fs2.futimes) {
          fs2.lutimes = function(path, at, mt, cb) {
            fs2.open(path, constants3.O_SYMLINK, function(er, fd) {
              if (er) {
                if (cb) cb(er);
                return;
              }
              fs2.futimes(fd, at, mt, function(er2) {
                fs2.close(fd, function(er22) {
                  if (cb) cb(er2 || er22);
                });
              });
            });
          };
          fs2.lutimesSync = function(path, at, mt) {
            var fd = fs2.openSync(path, constants3.O_SYMLINK);
            var ret;
            var threw = true;
            try {
              ret = fs2.futimesSync(fd, at, mt);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs2.closeSync(fd);
                } catch (er) {
                }
              } else {
                fs2.closeSync(fd);
              }
            }
            return ret;
          };
        } else if (fs2.futimes) {
          fs2.lutimes = function(_a, _b, _c, cb) {
            if (cb) process.nextTick(cb);
          };
          fs2.lutimesSync = function() {
          };
        }
      }
      function chmodFix(orig) {
        if (!orig) return orig;
        return function(target, mode, cb) {
          return orig.call(fs, target, mode, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        if (!orig) return orig;
        return function(target, mode) {
          try {
            return orig.call(fs, target, mode);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function chownFix(orig) {
        if (!orig) return orig;
        return function(target, uid, gid, cb) {
          return orig.call(fs, target, uid, gid, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        if (!orig) return orig;
        return function(target, uid, gid) {
          try {
            return orig.call(fs, target, uid, gid);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function statFix(orig) {
        if (!orig) return orig;
        return function(target, options, cb) {
          if (typeof options === "function") {
            cb = options;
            options = null;
          }
          function callback(er, stats) {
            if (stats) {
              if (stats.uid < 0) stats.uid += 4294967296;
              if (stats.gid < 0) stats.gid += 4294967296;
            }
            if (cb) cb.apply(this, arguments);
          }
          return options ? orig.call(fs, target, options, callback) : orig.call(fs, target, callback);
        };
      }
      function statFixSync(orig) {
        if (!orig) return orig;
        return function(target, options) {
          var stats = options ? orig.call(fs, target, options) : orig.call(fs, target);
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          return stats;
        };
      }
      function chownErOk(er) {
        if (!er)
          return true;
        if (er.code === "ENOSYS")
          return true;
        var nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
          if (er.code === "EINVAL" || er.code === "EPERM")
            return true;
        }
        return false;
      }
    }
  }
});

// node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS({
  "node_modules/graceful-fs/legacy-streams.js"(exports, module) {
    var Stream = __require("stream").Stream;
    module.exports = legacy;
    function legacy(fs) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path, options) {
        if (!(this instanceof ReadStream)) return new ReadStream(path, options);
        Stream.call(this);
        var self = this;
        this.path = path;
        this.fd = null;
        this.readable = true;
        this.paused = false;
        this.flags = "r";
        this.mode = 438;
        this.bufferSize = 64 * 1024;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.encoding) this.setEncoding(this.encoding);
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.end === void 0) {
            this.end = Infinity;
          } else if ("number" !== typeof this.end) {
            throw TypeError("end must be a Number");
          }
          if (this.start > this.end) {
            throw new Error("start must be <= end");
          }
          this.pos = this.start;
        }
        if (this.fd !== null) {
          process.nextTick(function() {
            self._read();
          });
          return;
        }
        fs.open(this.path, this.flags, this.mode, function(err, fd) {
          if (err) {
            self.emit("error", err);
            self.readable = false;
            return;
          }
          self.fd = fd;
          self.emit("open", fd);
          self._read();
        });
      }
      function WriteStream(path, options) {
        if (!(this instanceof WriteStream)) return new WriteStream(path, options);
        Stream.call(this);
        this.path = path;
        this.fd = null;
        this.writable = true;
        this.flags = "w";
        this.encoding = "binary";
        this.mode = 438;
        this.bytesWritten = 0;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.start < 0) {
            throw new Error("start must be >= zero");
          }
          this.pos = this.start;
        }
        this.busy = false;
        this._queue = [];
        if (this.fd === null) {
          this._open = fs.open;
          this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
          this.flush();
        }
      }
    }
  }
});

// node_modules/graceful-fs/clone.js
var require_clone = __commonJS({
  "node_modules/graceful-fs/clone.js"(exports, module) {
    "use strict";
    module.exports = clone;
    var getPrototypeOf = Object.getPrototypeOf || function(obj) {
      return obj.__proto__;
    };
    function clone(obj) {
      if (obj === null || typeof obj !== "object")
        return obj;
      if (obj instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      Object.getOwnPropertyNames(obj).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
      });
      return copy;
    }
  }
});

// node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS({
  "node_modules/graceful-fs/graceful-fs.js"(exports, module) {
    var fs = __require("fs");
    var polyfills = require_polyfills();
    var legacy = require_legacy_streams();
    var clone = require_clone();
    var util = __require("util");
    var gracefulQueue;
    var previousSymbol;
    if (typeof Symbol === "function" && typeof Symbol.for === "function") {
      gracefulQueue = /* @__PURE__ */ Symbol.for("graceful-fs.queue");
      previousSymbol = /* @__PURE__ */ Symbol.for("graceful-fs.previous");
    } else {
      gracefulQueue = "___graceful-fs.queue";
      previousSymbol = "___graceful-fs.previous";
    }
    function noop() {
    }
    function publishQueue(context, queue2) {
      Object.defineProperty(context, gracefulQueue, {
        get: function() {
          return queue2;
        }
      });
    }
    var debug = noop;
    if (util.debuglog)
      debug = util.debuglog("gfs4");
    else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
      debug = function() {
        var m = util.format.apply(util, arguments);
        m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
        console.error(m);
      };
    if (!fs[gracefulQueue]) {
      queue = global[gracefulQueue] || [];
      publishQueue(fs, queue);
      fs.close = (function(fs$close) {
        function close(fd, cb) {
          return fs$close.call(fs, fd, function(err) {
            if (!err) {
              resetQueue();
            }
            if (typeof cb === "function")
              cb.apply(this, arguments);
          });
        }
        Object.defineProperty(close, previousSymbol, {
          value: fs$close
        });
        return close;
      })(fs.close);
      fs.closeSync = (function(fs$closeSync) {
        function closeSync(fd) {
          fs$closeSync.apply(fs, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync;
      })(fs.closeSync);
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
        process.on("exit", function() {
          debug(fs[gracefulQueue]);
          __require("assert").equal(fs[gracefulQueue].length, 0);
        });
      }
    }
    var queue;
    if (!global[gracefulQueue]) {
      publishQueue(global, fs[gracefulQueue]);
    }
    module.exports = patch(clone(fs));
    if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
      module.exports = patch(fs);
      fs.__patched = true;
    }
    function patch(fs2) {
      polyfills(fs2);
      fs2.gracefulify = patch;
      fs2.createReadStream = createReadStream;
      fs2.createWriteStream = createWriteStream;
      var fs$readFile = fs2.readFile;
      fs2.readFile = readFile6;
      function readFile6(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$readFile(path, options, cb);
        function go$readFile(path2, options2, cb2, startTime) {
          return fs$readFile(path2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$readFile, [path2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$writeFile = fs2.writeFile;
      fs2.writeFile = writeFile4;
      function writeFile4(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$writeFile(path, data, options, cb);
        function go$writeFile(path2, data2, options2, cb2, startTime) {
          return fs$writeFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$writeFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$appendFile = fs2.appendFile;
      if (fs$appendFile)
        fs2.appendFile = appendFile4;
      function appendFile4(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$appendFile(path, data, options, cb);
        function go$appendFile(path2, data2, options2, cb2, startTime) {
          return fs$appendFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$appendFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$copyFile = fs2.copyFile;
      if (fs$copyFile)
        fs2.copyFile = copyFile;
      function copyFile(src, dest, flags, cb) {
        if (typeof flags === "function") {
          cb = flags;
          flags = 0;
        }
        return go$copyFile(src, dest, flags, cb);
        function go$copyFile(src2, dest2, flags2, cb2, startTime) {
          return fs$copyFile(src2, dest2, flags2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$readdir = fs2.readdir;
      fs2.readdir = readdir3;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir3(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        } : function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, options2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        };
        return go$readdir(path, options, cb);
        function fs$readdirCallback(path2, options2, cb2, startTime) {
          return function(err, files) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([
                go$readdir,
                [path2, options2, cb2],
                err,
                startTime || Date.now(),
                Date.now()
              ]);
            else {
              if (files && files.sort)
                files.sort();
              if (typeof cb2 === "function")
                cb2.call(this, err, files);
            }
          };
        }
      }
      if (process.version.substr(0, 4) === "v0.8") {
        var legStreams = legacy(fs2);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs2.ReadStream;
      if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
      }
      var fs$WriteStream = fs2.WriteStream;
      if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
      }
      Object.defineProperty(fs2, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(fs2, "WriteStream", {
        get: function() {
          return WriteStream;
        },
        set: function(val) {
          WriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileReadStream = ReadStream;
      Object.defineProperty(fs2, "FileReadStream", {
        get: function() {
          return FileReadStream;
        },
        set: function(val) {
          FileReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileWriteStream = WriteStream;
      Object.defineProperty(fs2, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      function ReadStream(path, options) {
        if (this instanceof ReadStream)
          return fs$ReadStream.apply(this, arguments), this;
        else
          return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
      }
      function ReadStream$open() {
        var that = this;
        open6(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            if (that.autoClose)
              that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
            that.read();
          }
        });
      }
      function WriteStream(path, options) {
        if (this instanceof WriteStream)
          return fs$WriteStream.apply(this, arguments), this;
        else
          return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
      }
      function WriteStream$open() {
        var that = this;
        open6(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
          }
        });
      }
      function createReadStream(path, options) {
        return new fs2.ReadStream(path, options);
      }
      function createWriteStream(path, options) {
        return new fs2.WriteStream(path, options);
      }
      var fs$open = fs2.open;
      fs2.open = open6;
      function open6(path, flags, mode, cb) {
        if (typeof mode === "function")
          cb = mode, mode = null;
        return go$open(path, flags, mode, cb);
        function go$open(path2, flags2, mode2, cb2, startTime) {
          return fs$open(path2, flags2, mode2, function(err, fd) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$open, [path2, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      return fs2;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]);
      fs[gracefulQueue].push(elem);
      retry();
    }
    var retryTimer;
    function resetQueue() {
      var now = Date.now();
      for (var i = 0; i < fs[gracefulQueue].length; ++i) {
        if (fs[gracefulQueue][i].length > 2) {
          fs[gracefulQueue][i][3] = now;
          fs[gracefulQueue][i][4] = now;
        }
      }
      retry();
    }
    function retry() {
      clearTimeout(retryTimer);
      retryTimer = void 0;
      if (fs[gracefulQueue].length === 0)
        return;
      var elem = fs[gracefulQueue].shift();
      var fn = elem[0];
      var args = elem[1];
      var err = elem[2];
      var startTime = elem[3];
      var lastTime = elem[4];
      if (startTime === void 0) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args);
      } else if (Date.now() - startTime >= 6e4) {
        debug("TIMEOUT", fn.name, args);
        var cb = args.pop();
        if (typeof cb === "function")
          cb.call(null, err);
      } else {
        var sinceAttempt = Date.now() - lastTime;
        var sinceStart = Math.max(lastTime - startTime, 1);
        var desiredDelay = Math.min(sinceStart * 1.2, 100);
        if (sinceAttempt >= desiredDelay) {
          debug("RETRY", fn.name, args);
          fn.apply(null, args.concat([startTime]));
        } else {
          fs[gracefulQueue].push(elem);
        }
      }
      if (retryTimer === void 0) {
        retryTimer = setTimeout(retry, 0);
      }
    }
  }
});

// node_modules/retry/lib/retry_operation.js
var require_retry_operation = __commonJS({
  "node_modules/retry/lib/retry_operation.js"(exports, module) {
    function RetryOperation(timeouts, options) {
      if (typeof options === "boolean") {
        options = { forever: options };
      }
      this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
      this._timeouts = timeouts;
      this._options = options || {};
      this._maxRetryTime = options && options.maxRetryTime || Infinity;
      this._fn = null;
      this._errors = [];
      this._attempts = 1;
      this._operationTimeout = null;
      this._operationTimeoutCb = null;
      this._timeout = null;
      this._operationStart = null;
      if (this._options.forever) {
        this._cachedTimeouts = this._timeouts.slice(0);
      }
    }
    module.exports = RetryOperation;
    RetryOperation.prototype.reset = function() {
      this._attempts = 1;
      this._timeouts = this._originalTimeouts;
    };
    RetryOperation.prototype.stop = function() {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
      this._timeouts = [];
      this._cachedTimeouts = null;
    };
    RetryOperation.prototype.retry = function(err) {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
      if (!err) {
        return false;
      }
      var currentTime = (/* @__PURE__ */ new Date()).getTime();
      if (err && currentTime - this._operationStart >= this._maxRetryTime) {
        this._errors.unshift(new Error("RetryOperation timeout occurred"));
        return false;
      }
      this._errors.push(err);
      var timeout = this._timeouts.shift();
      if (timeout === void 0) {
        if (this._cachedTimeouts) {
          this._errors.splice(this._errors.length - 1, this._errors.length);
          this._timeouts = this._cachedTimeouts.slice(0);
          timeout = this._timeouts.shift();
        } else {
          return false;
        }
      }
      var self = this;
      var timer = setTimeout(function() {
        self._attempts++;
        if (self._operationTimeoutCb) {
          self._timeout = setTimeout(function() {
            self._operationTimeoutCb(self._attempts);
          }, self._operationTimeout);
          if (self._options.unref) {
            self._timeout.unref();
          }
        }
        self._fn(self._attempts);
      }, timeout);
      if (this._options.unref) {
        timer.unref();
      }
      return true;
    };
    RetryOperation.prototype.attempt = function(fn, timeoutOps) {
      this._fn = fn;
      if (timeoutOps) {
        if (timeoutOps.timeout) {
          this._operationTimeout = timeoutOps.timeout;
        }
        if (timeoutOps.cb) {
          this._operationTimeoutCb = timeoutOps.cb;
        }
      }
      var self = this;
      if (this._operationTimeoutCb) {
        this._timeout = setTimeout(function() {
          self._operationTimeoutCb();
        }, self._operationTimeout);
      }
      this._operationStart = (/* @__PURE__ */ new Date()).getTime();
      this._fn(this._attempts);
    };
    RetryOperation.prototype.try = function(fn) {
      console.log("Using RetryOperation.try() is deprecated");
      this.attempt(fn);
    };
    RetryOperation.prototype.start = function(fn) {
      console.log("Using RetryOperation.start() is deprecated");
      this.attempt(fn);
    };
    RetryOperation.prototype.start = RetryOperation.prototype.try;
    RetryOperation.prototype.errors = function() {
      return this._errors;
    };
    RetryOperation.prototype.attempts = function() {
      return this._attempts;
    };
    RetryOperation.prototype.mainError = function() {
      if (this._errors.length === 0) {
        return null;
      }
      var counts = {};
      var mainError = null;
      var mainErrorCount = 0;
      for (var i = 0; i < this._errors.length; i++) {
        var error = this._errors[i];
        var message = error.message;
        var count = (counts[message] || 0) + 1;
        counts[message] = count;
        if (count >= mainErrorCount) {
          mainError = error;
          mainErrorCount = count;
        }
      }
      return mainError;
    };
  }
});

// node_modules/retry/lib/retry.js
var require_retry = __commonJS({
  "node_modules/retry/lib/retry.js"(exports) {
    var RetryOperation = require_retry_operation();
    exports.operation = function(options) {
      var timeouts = exports.timeouts(options);
      return new RetryOperation(timeouts, {
        forever: options && options.forever,
        unref: options && options.unref,
        maxRetryTime: options && options.maxRetryTime
      });
    };
    exports.timeouts = function(options) {
      if (options instanceof Array) {
        return [].concat(options);
      }
      var opts = {
        retries: 10,
        factor: 2,
        minTimeout: 1 * 1e3,
        maxTimeout: Infinity,
        randomize: false
      };
      for (var key in options) {
        opts[key] = options[key];
      }
      if (opts.minTimeout > opts.maxTimeout) {
        throw new Error("minTimeout is greater than maxTimeout");
      }
      var timeouts = [];
      for (var i = 0; i < opts.retries; i++) {
        timeouts.push(this.createTimeout(i, opts));
      }
      if (options && options.forever && !timeouts.length) {
        timeouts.push(this.createTimeout(i, opts));
      }
      timeouts.sort(function(a, b) {
        return a - b;
      });
      return timeouts;
    };
    exports.createTimeout = function(attempt, opts) {
      var random = opts.randomize ? Math.random() + 1 : 1;
      var timeout = Math.round(random * opts.minTimeout * Math.pow(opts.factor, attempt));
      timeout = Math.min(timeout, opts.maxTimeout);
      return timeout;
    };
    exports.wrap = function(obj, options, methods) {
      if (options instanceof Array) {
        methods = options;
        options = null;
      }
      if (!methods) {
        methods = [];
        for (var key in obj) {
          if (typeof obj[key] === "function") {
            methods.push(key);
          }
        }
      }
      for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        var original = obj[method];
        obj[method] = function retryWrapper(original2) {
          var op = exports.operation(options);
          var args = Array.prototype.slice.call(arguments, 1);
          var callback = args.pop();
          args.push(function(err) {
            if (op.retry(err)) {
              return;
            }
            if (err) {
              arguments[0] = op.mainError();
            }
            callback.apply(this, arguments);
          });
          op.attempt(function() {
            original2.apply(obj, args);
          });
        }.bind(obj, original);
        obj[method].options = options;
      }
    };
  }
});

// node_modules/retry/index.js
var require_retry2 = __commonJS({
  "node_modules/retry/index.js"(exports, module) {
    module.exports = require_retry();
  }
});

// node_modules/proper-lockfile/node_modules/signal-exit/signals.js
var require_signals = __commonJS({
  "node_modules/proper-lockfile/node_modules/signal-exit/signals.js"(exports, module) {
    module.exports = [
      "SIGABRT",
      "SIGALRM",
      "SIGHUP",
      "SIGINT",
      "SIGTERM"
    ];
    if (process.platform !== "win32") {
      module.exports.push(
        "SIGVTALRM",
        "SIGXCPU",
        "SIGXFSZ",
        "SIGUSR2",
        "SIGTRAP",
        "SIGSYS",
        "SIGQUIT",
        "SIGIOT"
        // should detect profiler and enable/disable accordingly.
        // see #21
        // 'SIGPROF'
      );
    }
    if (process.platform === "linux") {
      module.exports.push(
        "SIGIO",
        "SIGPOLL",
        "SIGPWR",
        "SIGSTKFLT",
        "SIGUNUSED"
      );
    }
  }
});

// node_modules/proper-lockfile/node_modules/signal-exit/index.js
var require_signal_exit = __commonJS({
  "node_modules/proper-lockfile/node_modules/signal-exit/index.js"(exports, module) {
    var process2 = global.process;
    var processOk = function(process3) {
      return process3 && typeof process3 === "object" && typeof process3.removeListener === "function" && typeof process3.emit === "function" && typeof process3.reallyExit === "function" && typeof process3.listeners === "function" && typeof process3.kill === "function" && typeof process3.pid === "number" && typeof process3.on === "function";
    };
    if (!processOk(process2)) {
      module.exports = function() {
        return function() {
        };
      };
    } else {
      assert = __require("assert");
      signals = require_signals();
      isWin = /^win/i.test(process2.platform);
      EE = __require("events");
      if (typeof EE !== "function") {
        EE = EE.EventEmitter;
      }
      if (process2.__signal_exit_emitter__) {
        emitter = process2.__signal_exit_emitter__;
      } else {
        emitter = process2.__signal_exit_emitter__ = new EE();
        emitter.count = 0;
        emitter.emitted = {};
      }
      if (!emitter.infinite) {
        emitter.setMaxListeners(Infinity);
        emitter.infinite = true;
      }
      module.exports = function(cb, opts) {
        if (!processOk(global.process)) {
          return function() {
          };
        }
        assert.equal(typeof cb, "function", "a callback must be provided for exit handler");
        if (loaded === false) {
          load();
        }
        var ev = "exit";
        if (opts && opts.alwaysLast) {
          ev = "afterexit";
        }
        var remove = function() {
          emitter.removeListener(ev, cb);
          if (emitter.listeners("exit").length === 0 && emitter.listeners("afterexit").length === 0) {
            unload();
          }
        };
        emitter.on(ev, cb);
        return remove;
      };
      unload = function unload2() {
        if (!loaded || !processOk(global.process)) {
          return;
        }
        loaded = false;
        signals.forEach(function(sig) {
          try {
            process2.removeListener(sig, sigListeners[sig]);
          } catch (er) {
          }
        });
        process2.emit = originalProcessEmit;
        process2.reallyExit = originalProcessReallyExit;
        emitter.count -= 1;
      };
      module.exports.unload = unload;
      emit = function emit2(event, code, signal) {
        if (emitter.emitted[event]) {
          return;
        }
        emitter.emitted[event] = true;
        emitter.emit(event, code, signal);
      };
      sigListeners = {};
      signals.forEach(function(sig) {
        sigListeners[sig] = function listener() {
          if (!processOk(global.process)) {
            return;
          }
          var listeners = process2.listeners(sig);
          if (listeners.length === emitter.count) {
            unload();
            emit("exit", null, sig);
            emit("afterexit", null, sig);
            if (isWin && sig === "SIGHUP") {
              sig = "SIGINT";
            }
            process2.kill(process2.pid, sig);
          }
        };
      });
      module.exports.signals = function() {
        return signals;
      };
      loaded = false;
      load = function load2() {
        if (loaded || !processOk(global.process)) {
          return;
        }
        loaded = true;
        emitter.count += 1;
        signals = signals.filter(function(sig) {
          try {
            process2.on(sig, sigListeners[sig]);
            return true;
          } catch (er) {
            return false;
          }
        });
        process2.emit = processEmit;
        process2.reallyExit = processReallyExit;
      };
      module.exports.load = load;
      originalProcessReallyExit = process2.reallyExit;
      processReallyExit = function processReallyExit2(code) {
        if (!processOk(global.process)) {
          return;
        }
        process2.exitCode = code || /* istanbul ignore next */
        0;
        emit("exit", process2.exitCode, null);
        emit("afterexit", process2.exitCode, null);
        originalProcessReallyExit.call(process2, process2.exitCode);
      };
      originalProcessEmit = process2.emit;
      processEmit = function processEmit2(ev, arg) {
        if (ev === "exit" && processOk(global.process)) {
          if (arg !== void 0) {
            process2.exitCode = arg;
          }
          var ret = originalProcessEmit.apply(this, arguments);
          emit("exit", process2.exitCode, null);
          emit("afterexit", process2.exitCode, null);
          return ret;
        } else {
          return originalProcessEmit.apply(this, arguments);
        }
      };
    }
    var assert;
    var signals;
    var isWin;
    var EE;
    var emitter;
    var unload;
    var emit;
    var sigListeners;
    var loaded;
    var load;
    var originalProcessReallyExit;
    var processReallyExit;
    var originalProcessEmit;
    var processEmit;
  }
});

// node_modules/proper-lockfile/lib/mtime-precision.js
var require_mtime_precision = __commonJS({
  "node_modules/proper-lockfile/lib/mtime-precision.js"(exports, module) {
    "use strict";
    var cacheSymbol = /* @__PURE__ */ Symbol();
    function probe(file, fs, callback) {
      const cachedPrecision = fs[cacheSymbol];
      if (cachedPrecision) {
        return fs.stat(file, (err, stat3) => {
          if (err) {
            return callback(err);
          }
          callback(null, stat3.mtime, cachedPrecision);
        });
      }
      const mtime = new Date(Math.ceil(Date.now() / 1e3) * 1e3 + 5);
      fs.utimes(file, mtime, mtime, (err) => {
        if (err) {
          return callback(err);
        }
        fs.stat(file, (err2, stat3) => {
          if (err2) {
            return callback(err2);
          }
          const precision = stat3.mtime.getTime() % 1e3 === 0 ? "s" : "ms";
          Object.defineProperty(fs, cacheSymbol, { value: precision });
          callback(null, stat3.mtime, precision);
        });
      });
    }
    function getMtime(precision) {
      let now = Date.now();
      if (precision === "s") {
        now = Math.ceil(now / 1e3) * 1e3;
      }
      return new Date(now);
    }
    module.exports.probe = probe;
    module.exports.getMtime = getMtime;
  }
});

// node_modules/proper-lockfile/lib/lockfile.js
var require_lockfile = __commonJS({
  "node_modules/proper-lockfile/lib/lockfile.js"(exports, module) {
    "use strict";
    var path = __require("path");
    var fs = require_graceful_fs();
    var retry = require_retry2();
    var onExit = require_signal_exit();
    var mtimePrecision = require_mtime_precision();
    var locks = {};
    function getLockFile(file, options) {
      return options.lockfilePath || `${file}.lock`;
    }
    function resolveCanonicalPath(file, options, callback) {
      if (!options.realpath) {
        return callback(null, path.resolve(file));
      }
      options.fs.realpath(file, callback);
    }
    function acquireLock(file, options, callback) {
      const lockfilePath = getLockFile(file, options);
      options.fs.mkdir(lockfilePath, (err) => {
        if (!err) {
          return mtimePrecision.probe(lockfilePath, options.fs, (err2, mtime, mtimePrecision2) => {
            if (err2) {
              options.fs.rmdir(lockfilePath, () => {
              });
              return callback(err2);
            }
            callback(null, mtime, mtimePrecision2);
          });
        }
        if (err.code !== "EEXIST") {
          return callback(err);
        }
        if (options.stale <= 0) {
          return callback(Object.assign(new Error("Lock file is already being held"), { code: "ELOCKED", file }));
        }
        options.fs.stat(lockfilePath, (err2, stat3) => {
          if (err2) {
            if (err2.code === "ENOENT") {
              return acquireLock(file, { ...options, stale: 0 }, callback);
            }
            return callback(err2);
          }
          if (!isLockStale(stat3, options)) {
            return callback(Object.assign(new Error("Lock file is already being held"), { code: "ELOCKED", file }));
          }
          removeLock(file, options, (err3) => {
            if (err3) {
              return callback(err3);
            }
            acquireLock(file, { ...options, stale: 0 }, callback);
          });
        });
      });
    }
    function isLockStale(stat3, options) {
      return stat3.mtime.getTime() < Date.now() - options.stale;
    }
    function removeLock(file, options, callback) {
      options.fs.rmdir(getLockFile(file, options), (err) => {
        if (err && err.code !== "ENOENT") {
          return callback(err);
        }
        callback();
      });
    }
    function updateLock(file, options) {
      const lock2 = locks[file];
      if (lock2.updateTimeout) {
        return;
      }
      lock2.updateDelay = lock2.updateDelay || options.update;
      lock2.updateTimeout = setTimeout(() => {
        lock2.updateTimeout = null;
        options.fs.stat(lock2.lockfilePath, (err, stat3) => {
          const isOverThreshold = lock2.lastUpdate + options.stale < Date.now();
          if (err) {
            if (err.code === "ENOENT" || isOverThreshold) {
              return setLockAsCompromised(file, lock2, Object.assign(err, { code: "ECOMPROMISED" }));
            }
            lock2.updateDelay = 1e3;
            return updateLock(file, options);
          }
          const isMtimeOurs = lock2.mtime.getTime() === stat3.mtime.getTime();
          if (!isMtimeOurs) {
            return setLockAsCompromised(
              file,
              lock2,
              Object.assign(
                new Error("Unable to update lock within the stale threshold"),
                { code: "ECOMPROMISED" }
              )
            );
          }
          const mtime = mtimePrecision.getMtime(lock2.mtimePrecision);
          options.fs.utimes(lock2.lockfilePath, mtime, mtime, (err2) => {
            const isOverThreshold2 = lock2.lastUpdate + options.stale < Date.now();
            if (lock2.released) {
              return;
            }
            if (err2) {
              if (err2.code === "ENOENT" || isOverThreshold2) {
                return setLockAsCompromised(file, lock2, Object.assign(err2, { code: "ECOMPROMISED" }));
              }
              lock2.updateDelay = 1e3;
              return updateLock(file, options);
            }
            lock2.mtime = mtime;
            lock2.lastUpdate = Date.now();
            lock2.updateDelay = null;
            updateLock(file, options);
          });
        });
      }, lock2.updateDelay);
      if (lock2.updateTimeout.unref) {
        lock2.updateTimeout.unref();
      }
    }
    function setLockAsCompromised(file, lock2, err) {
      lock2.released = true;
      if (lock2.updateTimeout) {
        clearTimeout(lock2.updateTimeout);
      }
      if (locks[file] === lock2) {
        delete locks[file];
      }
      lock2.options.onCompromised(err);
    }
    function lock(file, options, callback) {
      options = {
        stale: 1e4,
        update: null,
        realpath: true,
        retries: 0,
        fs,
        onCompromised: (err) => {
          throw err;
        },
        ...options
      };
      options.retries = options.retries || 0;
      options.retries = typeof options.retries === "number" ? { retries: options.retries } : options.retries;
      options.stale = Math.max(options.stale || 0, 2e3);
      options.update = options.update == null ? options.stale / 2 : options.update || 0;
      options.update = Math.max(Math.min(options.update, options.stale / 2), 1e3);
      resolveCanonicalPath(file, options, (err, file2) => {
        if (err) {
          return callback(err);
        }
        const operation = retry.operation(options.retries);
        operation.attempt(() => {
          acquireLock(file2, options, (err2, mtime, mtimePrecision2) => {
            if (operation.retry(err2)) {
              return;
            }
            if (err2) {
              return callback(operation.mainError());
            }
            const lock2 = locks[file2] = {
              lockfilePath: getLockFile(file2, options),
              mtime,
              mtimePrecision: mtimePrecision2,
              options,
              lastUpdate: Date.now()
            };
            updateLock(file2, options);
            callback(null, (releasedCallback) => {
              if (lock2.released) {
                return releasedCallback && releasedCallback(Object.assign(new Error("Lock is already released"), { code: "ERELEASED" }));
              }
              unlock(file2, { ...options, realpath: false }, releasedCallback);
            });
          });
        });
      });
    }
    function unlock(file, options, callback) {
      options = {
        fs,
        realpath: true,
        ...options
      };
      resolveCanonicalPath(file, options, (err, file2) => {
        if (err) {
          return callback(err);
        }
        const lock2 = locks[file2];
        if (!lock2) {
          return callback(Object.assign(new Error("Lock is not acquired/owned by you"), { code: "ENOTACQUIRED" }));
        }
        lock2.updateTimeout && clearTimeout(lock2.updateTimeout);
        lock2.released = true;
        delete locks[file2];
        removeLock(file2, options, callback);
      });
    }
    function check(file, options, callback) {
      options = {
        stale: 1e4,
        realpath: true,
        fs,
        ...options
      };
      options.stale = Math.max(options.stale || 0, 2e3);
      resolveCanonicalPath(file, options, (err, file2) => {
        if (err) {
          return callback(err);
        }
        options.fs.stat(getLockFile(file2, options), (err2, stat3) => {
          if (err2) {
            return err2.code === "ENOENT" ? callback(null, false) : callback(err2);
          }
          return callback(null, !isLockStale(stat3, options));
        });
      });
    }
    function getLocks() {
      return locks;
    }
    onExit(() => {
      for (const file in locks) {
        const options = locks[file].options;
        try {
          options.fs.rmdirSync(getLockFile(file, options));
        } catch (e) {
        }
      }
    });
    module.exports.lock = lock;
    module.exports.unlock = unlock;
    module.exports.check = check;
    module.exports.getLocks = getLocks;
  }
});

// node_modules/proper-lockfile/lib/adapter.js
var require_adapter = __commonJS({
  "node_modules/proper-lockfile/lib/adapter.js"(exports, module) {
    "use strict";
    var fs = require_graceful_fs();
    function createSyncFs(fs2) {
      const methods = ["mkdir", "realpath", "stat", "rmdir", "utimes"];
      const newFs = { ...fs2 };
      methods.forEach((method) => {
        newFs[method] = (...args) => {
          const callback = args.pop();
          let ret;
          try {
            ret = fs2[`${method}Sync`](...args);
          } catch (err) {
            return callback(err);
          }
          callback(null, ret);
        };
      });
      return newFs;
    }
    function toPromise(method) {
      return (...args) => new Promise((resolve, reject) => {
        args.push((err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
        method(...args);
      });
    }
    function toSync(method) {
      return (...args) => {
        let err;
        let result;
        args.push((_err, _result) => {
          err = _err;
          result = _result;
        });
        method(...args);
        if (err) {
          throw err;
        }
        return result;
      };
    }
    function toSyncOptions(options) {
      options = { ...options };
      options.fs = createSyncFs(options.fs || fs);
      if (typeof options.retries === "number" && options.retries > 0 || options.retries && typeof options.retries.retries === "number" && options.retries.retries > 0) {
        throw Object.assign(new Error("Cannot use retries with the sync api"), { code: "ESYNC" });
      }
      return options;
    }
    module.exports = {
      toPromise,
      toSync,
      toSyncOptions
    };
  }
});

// node_modules/proper-lockfile/index.js
var require_proper_lockfile = __commonJS({
  "node_modules/proper-lockfile/index.js"(exports, module) {
    "use strict";
    var lockfile5 = require_lockfile();
    var { toPromise, toSync, toSyncOptions } = require_adapter();
    async function lock(file, options) {
      const release = await toPromise(lockfile5.lock)(file, options);
      return toPromise(release);
    }
    function lockSync(file, options) {
      const release = toSync(lockfile5.lock)(file, toSyncOptions(options));
      return toSync(release);
    }
    function unlock(file, options) {
      return toPromise(lockfile5.unlock)(file, options);
    }
    function unlockSync(file, options) {
      return toSync(lockfile5.unlock)(file, toSyncOptions(options));
    }
    function check(file, options) {
      return toPromise(lockfile5.check)(file, options);
    }
    function checkSync(file, options) {
      return toSync(lockfile5.check)(file, toSyncOptions(options));
    }
    module.exports = lock;
    module.exports.lock = lock;
    module.exports.unlock = unlock;
    module.exports.lockSync = lockSync;
    module.exports.unlockSync = unlockSync;
    module.exports.check = check;
    module.exports.checkSync = checkSync;
  }
});

// dist/shared/bin/auto-scan.mjs
import { appendFileSync } from "node:fs";
import { appendFile as appendFile3 } from "node:fs/promises";
import { join as join10 } from "node:path";

// dist/shared/backfill/scan-then-drain.mjs
import { join as join9 } from "node:path";

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
      "overage_credit_eligible",
      "credits_has",
      "credits_unlimited",
      "credits_balance",
      "auth_plan_claim"
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
      "extra_usage_disabled_reason",
      "window",
      "used_percent",
      "resets_at",
      "window_minutes",
      "reached_type",
      "limit_source",
      "credits_has",
      "credits_unlimited",
      "credits_balance"
    ]),
    "usage_limit.snapshot": Object.freeze([
      "window",
      "used_percent",
      "resets_at",
      "window_minutes",
      "plan_type",
      "model"
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
      "stop_reason",
      "primary_used_percent",
      "primary_resets_at",
      "primary_window_minutes",
      "secondary_used_percent",
      "secondary_resets_at",
      "secondary_window_minutes"
    ])
  };
  return Object.freeze({
    maxSerializedBytes: 4096,
    keepLists: Object.freeze(keepLists)
  });
}

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
  const identity = env.FANCYSAUCE_IDENTITY_TYPE === "hash" ? "hash" : "full";
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

// dist/shared/config.mjs
init_credential_paths();
var INGEST_ENDPOINT = "https://ingest.preview.fancysauce.ai";
var DEFAULT_LOGIN_STATE_DIR = join(homedir2(), ".config", "fancysauce");
var KNOWN_FANCYSAUCE_VARS = /* @__PURE__ */ new Set([
  "FANCYSAUCE_CREDENTIAL_PATHS",
  "FANCYSAUCE_API_KEY",
  "FANCYSAUCE_IDENTITY_TYPE",
  "FANCYSAUCE_TENANT_KEY"
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
  const read = await readCredential(paths);
  const ambient = await ensureAmbientTenantCredential(read, paths);
  if (ambient.inMemory) {
    return {
      credential: ambient.inMemory.credential,
      endpoint,
      loginStateDir,
      policy: defaultPolicy(),
      identity_type: ambient.inMemory.identity_type ?? "full",
      // Degraded fail-open for this single fire: skip the richer identity
      // resolution the file-backed path performs; the durable write will retry
      // and enrich on a later fire.
      identity_hint: null
    };
  }
  const result = ambient.result;
  switch (result.source) {
    case "absent": {
      const apiKey = process.env.FANCYSAUCE_API_KEY;
      if (!apiKey)
        return null;
      const envIdentityType = process.env.FANCYSAUCE_IDENTITY_TYPE === "hash" ? "hash" : "full";
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

// dist/shared/backfill/scan-then-drain.mjs
init_credential_paths();
init_pid_guard();
init_runner_spawn();

// dist/shared/backfill/scan.mjs
import { appendFile as appendFile2, mkdir as mkdir6, readdir as readdir2 } from "node:fs/promises";
import { homedir as homedir4 } from "node:os";
import { join as join8, relative as relative2 } from "node:path";

// dist/agents/claude-code/transcript-tail.mjs
var import_proper_lockfile2 = __toESM(require_proper_lockfile(), 1);
import { mkdir as mkdir4, readFile as readFile4, readdir, writeFile as writeFile2, appendFile, rename as rename3, lstat as lstat2 } from "node:fs/promises";
import { basename, dirname as dirname3, isAbsolute, join as join5, relative, sep } from "node:path";
import { homedir as homedir3 } from "node:os";
import { randomUUID as randomUUID2 } from "node:crypto";

// dist/agents/claude-code/subagent-cursor.mjs
import { readFile as readFile3, rename as rename2, writeFile } from "node:fs/promises";
import { join as join4 } from "node:path";

// dist/shared/locking.mjs
var import_proper_lockfile = __toESM(require_proper_lockfile(), 1);
import { mkdir as mkdir3 } from "node:fs/promises";
var LOCK_OPTIONS = {
  realpath: false,
  retries: { retries: 100, minTimeout: 5, maxTimeout: 100, factor: 1.5 },
  stale: 1e4
};
async function withDirLock(dir, fn) {
  await mkdir3(dir, { recursive: true });
  const release = await import_proper_lockfile.default.lock(dir, LOCK_OPTIONS);
  try {
    return await fn();
  } finally {
    await release();
  }
}

// dist/agents/claude-code/subagent-cursor.mjs
var SubagentCursor = class {
  dir;
  path;
  tmpPath;
  constructor(dir) {
    this.dir = dir;
    this.path = join4(dir, "transcript_cursor.json");
    this.tmpPath = `${this.path}.tmp`;
  }
  async read() {
    try {
      const buf = await readFile3(this.path, "utf8");
      const parsed = JSON.parse(buf);
      return parsed.byte_offset ?? 0;
    } catch (err) {
      if (err.code === "ENOENT")
        return 0;
      throw err;
    }
  }
  async advance(offset) {
    await withDirLock(this.dir, async () => {
      const current = await this.read();
      if (offset < current) {
        throw new Error(`SubagentCursor.advance monotonic violation: ${offset} < ${current}`);
      }
      await this.write(offset);
    });
  }
  // Force-write cursor to 0. Bypasses the monotonic guard. Used when the
  // transcript file shrank below the recorded offset (CC compaction,
  // manual prune, agent_id collision across sessions): without a reset,
  // every subsequent tail would see `stat.size <= cursor` and emit
  // nothing, permanently locking the agent's events out.
  async reset() {
    await withDirLock(this.dir, async () => {
      await this.write(0);
    });
  }
  async write(offset) {
    const body = { byte_offset: offset };
    await writeFile(this.tmpPath, JSON.stringify(body), "utf8");
    await rename2(this.tmpPath, this.path);
  }
};

// dist/agents/claude-code/subagent-meta.mjs
import { open as open3, lstat, constants } from "node:fs/promises";
function metaPathFromTranscript(transcriptPath) {
  return transcriptPath.endsWith(".jsonl") ? `${transcriptPath.slice(0, -".jsonl".length)}.meta.json` : `${transcriptPath}.meta.json`;
}
var READ_WINDOW_BYTES = 256 * 1024;
var SubagentMetaCache = class {
  cache = /* @__PURE__ */ new Map();
  async get(path) {
    if (this.cache.has(path))
      return this.cache.get(path) ?? null;
    let meta = null;
    let fh = null;
    try {
      if (!(await lstat(path)).isFile())
        throw new Error("not a regular file");
      const flags = typeof constants.O_NOFOLLOW === "number" ? constants.O_RDONLY | constants.O_NOFOLLOW : "r";
      fh = await open3(path, flags);
      if (!(await fh.stat()).isFile())
        throw new Error("not a regular file");
      const raw = await fh.readFile({ encoding: "utf8" });
      const parsed = JSON.parse(raw);
      if (typeof parsed.agentType === "string") {
        meta = { agentType: parsed.agentType };
      }
    } catch {
      meta = null;
    } finally {
      if (fh)
        await fh.close();
    }
    this.cache.set(path, meta);
    return meta;
  }
};

// dist/shared/tail-engine.mjs
import { open as open4, constants as constants2 } from "node:fs/promises";
var DEFAULT_MAX_READ_BYTES = 4 * 1024 * 1024;
async function readWindow(opts) {
  const { path, startOffset, sequenceBase, maxReadBytes, parseWindow, state } = opts;
  let fh = null;
  try {
    try {
      const flags = opts.nofollow && typeof constants2.O_NOFOLLOW === "number" ? constants2.O_RDONLY | constants2.O_NOFOLLOW : "r";
      fh = await open4(path, flags);
    } catch (err) {
      if (err.code === "ENOENT") {
        return { events: [], endOffset: startOffset, truncated: false };
      }
      throw err;
    }
    const stat3 = await fh.stat();
    const truncated = stat3.size < startOffset;
    const effectiveStart = truncated ? 0 : startOffset;
    if (stat3.size <= effectiveStart) {
      return { events: [], endOffset: effectiveStart, truncated };
    }
    const toRead = Math.min(stat3.size - effectiveStart, maxReadBytes);
    const buf = Buffer.alloc(toRead);
    await fh.read(buf, 0, toRead, effectiveStart);
    const lastNewline = buf.lastIndexOf("\n".charCodeAt(0));
    if (lastNewline < 0)
      return { events: [], endOffset: effectiveStart, truncated };
    const usable = buf.slice(0, lastNewline + 1).toString("utf8");
    const endOffset = effectiveStart + lastNewline + 1;
    const lines = usable.split("\n").filter(Boolean);
    const events = parseWindow(lines, sequenceBase, state);
    return { events, endOffset, truncated };
  } finally {
    if (fh)
      await fh.close();
  }
}

// dist/shared/usage-limit.mjs
import { randomUUID } from "node:crypto";
function classifyLimitKind(text) {
  if (/not your usage limit/i.test(text) || /temporarily limiting/i.test(text)) {
    return "server_throttle";
  }
  if (/monthly spend limit/i.test(text))
    return "org_spend_cap";
  if (/weekly limit/i.test(text))
    return "weekly";
  if (/hit your session limit/i.test(text) || /session limit/i.test(text))
    return "session";
  return "unknown";
}
function guessResetEpochSeconds(text, nowMs) {
  const m = /resets\s+(\d{1,2}):(\d{2})\s*([ap]m)\b(?:\s*\(([^)]+)\))?/i.exec(text);
  if (!m)
    return void 0;
  let hour = parseInt(m[1], 10) % 12;
  if (/pm/i.test(m[3]))
    hour += 12;
  const minute = parseInt(m[2], 10);
  const tz = m[4];
  if (tz) {
    const off = tzOffsetMs(tz, nowMs);
    if (off === void 0)
      return void 0;
    const ymd = tzDateParts(tz, nowMs);
    if (!ymd)
      return void 0;
    const candUtc = Date.UTC(ymd.y, ymd.mo - 1, ymd.d, hour, minute, 0);
    let epoch2 = candUtc - off;
    if (epoch2 <= nowMs)
      epoch2 += 864e5;
    return Math.floor(epoch2 / 1e3);
  }
  const now = new Date(nowMs);
  const cand = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  let epoch = cand.getTime();
  if (epoch <= nowMs)
    epoch += 864e5;
  return Math.floor(epoch / 1e3);
}
function tzParts(tz, atMs) {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const map = {};
    for (const p of dtf.formatToParts(new Date(atMs)))
      map[p.type] = p.value;
    return map;
  } catch {
    return void 0;
  }
}
function tzDateParts(tz, atMs) {
  const m = tzParts(tz, atMs);
  if (!m)
    return void 0;
  return { y: Number(m.year), mo: Number(m.month), d: Number(m.day) };
}
function tzOffsetMs(tz, atMs) {
  const m = tzParts(tz, atMs);
  if (!m)
    return void 0;
  const hour = m.hour === "24" ? 0 : Number(m.hour);
  const asUtc = Date.UTC(Number(m.year), Number(m.month) - 1, Number(m.day), hour, Number(m.minute), Number(m.second));
  return asUtc - atMs;
}
function firstText(content) {
  if (!Array.isArray(content))
    return "";
  const first = content[0];
  if (typeof first === "object" && first !== null) {
    const t = first.text;
    if (typeof t === "string")
      return t;
  }
  return "";
}
function detectUsageLimit(rec, sessionId, sequence, nowMs) {
  if (typeof rec !== "object" || rec === null)
    return null;
  const r = rec;
  if (r.type !== "assistant")
    return null;
  if (r.isApiErrorMessage !== true)
    return null;
  if (r.apiErrorStatus !== 429)
    return null;
  if (typeof r.uuid !== "string")
    return null;
  if (typeof r.timestamp !== "string" || !Number.isFinite(Date.parse(r.timestamp)))
    return null;
  const msg = r.message;
  if (typeof msg !== "object" || msg === null)
    return null;
  if (msg.model !== "<synthetic>")
    return null;
  const text = firstText(msg.content);
  const requestId = typeof r.requestId === "string" ? r.requestId : typeof msg.id === "string" ? msg.id : "";
  const attributes = {
    limit_message: text,
    limit_kind_guess: classifyLimitKind(text),
    api_error_status: 429,
    request_id: requestId,
    transcript_message_uuid: r.uuid
  };
  const reset = guessResetEpochSeconds(text, nowMs);
  if (reset !== void 0)
    attributes.reset_at_guess = reset;
  return {
    event_uuid: randomUUID(),
    event_type: "usage_limit.exceeded",
    session_id: sessionId,
    source: "transcript.tail",
    sequence,
    timestamp_ns: BigInt(Date.parse(r.timestamp)) * 1000000n,
    attributes
  };
}

// dist/agents/claude-code/transcript-tail.mjs
var SESSION_ID_RE = /^[A-Za-z0-9_-]{16,128}$/;
var AGENT_ID_RE = /^[A-Za-z0-9_-]{16,128}$/;
var TranscriptTail = class {
  stateDir;
  maxReadBytes;
  errorLogPath;
  transcriptRoot;
  constructor(stateDir, options = {}) {
    this.stateDir = stateDir;
    this.maxReadBytes = options.maxReadBytes ?? DEFAULT_MAX_READ_BYTES;
    this.errorLogPath = options.errorLogPath;
    const root = options.transcriptRoot ?? join5(homedir3(), ".claude", "projects");
    this.transcriptRoot = root.endsWith(sep) ? root : root + sep;
  }
  // `persist` runs after all events are read but BEFORE any cursor is
  // advanced. If it throws, every cursor stays at its previous offset and
  // the next tail() re-reads the same window — at-least-once delivery.
  // The parent cursor lock is held across read + persist + cursor writes,
  // so concurrent hooks cannot double-emit the same window.
  async tail(sessionId, transcriptPath, sequenceBase, persist) {
    if (!isValidSessionId(sessionId) || !this.isValidTranscriptPath(transcriptPath)) {
      await persist([]);
      return { events: [], skipped: true, newCursor: 0 };
    }
    const cursorDir = this.cursorDir(sessionId);
    await mkdir4(cursorDir, { recursive: true });
    const cursorPath = join5(cursorDir, "transcript_cursor.json");
    let release;
    try {
      release = await import_proper_lockfile2.default.lock(cursorPath, {
        retries: 0,
        realpath: false
      });
    } catch {
      await persist([]);
      return { events: [], skipped: true, newCursor: 0 };
    }
    try {
      const startOffset = await this.readCursor(cursorPath);
      const { events, endOffset, truncated } = await this.readSince(sessionId, transcriptPath, startOffset, sequenceBase, this.maxReadBytes);
      const sessionDir = join5(dirname3(transcriptPath), basename(transcriptPath, ".jsonl"));
      const subagentsRoot = join5(sessionDir, "subagents");
      const subagentPaths = await discoverSubagentTranscripts(sessionDir, (dir, err) => this.logSubagentError(sessionId, relative(sessionDir, dir) || "subagents", err));
      const metaCache = new SubagentMetaCache();
      let seq = sequenceBase + events.length;
      const subagentCommits = [];
      for (const subagentPath of subagentPaths) {
        const derived = deriveSubagentCursorDir(this.cursorDir(sessionId), subagentsRoot, subagentPath);
        if (!derived.ok) {
          await this.logSubagentError(sessionId, derived.agentId, new Error(derived.reason));
          continue;
        }
        const { agentId, cursorDir: subCursorDir, errorLabel } = derived;
        const metaPath = metaPathFromTranscript(subagentPath);
        let read;
        try {
          read = await readSubagent({
            sessionId,
            agentId,
            transcriptPath: subagentPath,
            metaPath,
            cursorDir: subCursorDir,
            metaCache,
            sequenceBase: seq,
            maxReadBytes: this.maxReadBytes
          });
        } catch (err) {
          await this.logSubagentError(sessionId, errorLabel, err);
          continue;
        }
        events.push(...read.events);
        seq += read.events.length;
        subagentCommits.push(read.commit);
      }
      await persist(events);
      if (truncated || endOffset > startOffset) {
        await this.writeCursor(cursorPath, endOffset);
      }
      for (const commit of subagentCommits) {
        await commit();
      }
      return { events, skipped: false, newCursor: endOffset };
    } finally {
      await release();
    }
  }
  async acquireCursorLock(sessionId) {
    if (!isValidSessionId(sessionId)) {
      throw new Error(`acquireCursorLock: invalid sessionId`);
    }
    const cursorDir = this.cursorDir(sessionId);
    await mkdir4(cursorDir, { recursive: true });
    const cursorPath = join5(cursorDir, "transcript_cursor.json");
    try {
      await readFile4(cursorPath);
    } catch {
      await writeFile2(cursorPath, "{}", "utf8");
    }
    const release = await import_proper_lockfile2.default.lock(cursorPath, { retries: 0, realpath: false });
    return { release: async () => {
      await release();
    } };
  }
  cursorDir(sessionId) {
    return sessionCursorDir(this.stateDir, sessionId);
  }
  isValidTranscriptPath(p) {
    if (typeof p !== "string" || p.length === 0)
      return false;
    if (!isAbsolute(p))
      return false;
    if (!p.endsWith(".jsonl"))
      return false;
    if (!p.startsWith(this.transcriptRoot))
      return false;
    return true;
  }
  async logSubagentError(sessionId, agentLabel, err) {
    if (!this.errorLogPath)
      return;
    const msg = err instanceof Error ? `${err.message}` : String(err);
    const line = `${(/* @__PURE__ */ new Date()).toISOString()} subagent-tail ${sessionId}/${agentLabel}: ${msg}`.replace(/[\p{Cc}\p{Cf}]+/gu, " ").slice(0, 2e3) + "\n";
    try {
      await appendFile(this.errorLogPath, line);
    } catch {
    }
  }
  async readCursor(cursorPath) {
    try {
      const buf = await readFile4(cursorPath, "utf8");
      const parsed = JSON.parse(buf);
      return parsed.byte_offset ?? 0;
    } catch {
      return 0;
    }
  }
  async writeCursor(cursorPath, offset) {
    const body = { byte_offset: offset };
    const tmp = `${cursorPath}.tmp`;
    await writeFile2(tmp, JSON.stringify(body), "utf8");
    await rename3(tmp, cursorPath);
  }
  async readSince(sessionId, path, startOffset, sequenceBase, maxReadBytes) {
    return readWindow({
      path,
      startOffset,
      sequenceBase,
      maxReadBytes,
      state: {},
      parseWindow: ccParseWindow((r, seq) => toApiRequestEvent(r, sessionId, seq), (rec, seq) => detectUsageLimit(rec, sessionId, seq, Date.now()))
    });
  }
};
function ccParseWindow(stamp, detectLimit) {
  return (lines, sequenceBase) => {
    const events = [];
    let seq = sequenceBase;
    for (const line of lines) {
      if (!line)
        continue;
      let rec;
      try {
        rec = JSON.parse(line);
      } catch {
        continue;
      }
      if (detectLimit) {
        const limitEv = detectLimit(rec, seq);
        if (limitEv) {
          events.push(limitEv);
          seq++;
        }
      }
      if (!isAssistantRecord(rec))
        continue;
      events.push(stamp(rec, seq));
      seq++;
    }
    return events;
  };
}
async function readSubagent(opts) {
  const { sessionId, agentId, transcriptPath, metaPath, cursorDir, metaCache = new SubagentMetaCache(), sequenceBase = 0, maxReadBytes = DEFAULT_MAX_READ_BYTES } = opts;
  await mkdir4(cursorDir, { recursive: true });
  const cursor = new SubagentCursor(cursorDir);
  const startOffset = await cursor.read();
  const meta = await metaCache.get(metaPath);
  let events;
  let endOffset;
  let truncated;
  try {
    ({ events, endOffset, truncated } = await readWindow({
      path: transcriptPath,
      startOffset,
      sequenceBase,
      maxReadBytes,
      state: {},
      nofollow: true,
      parseWindow: ccParseWindow((record, seq) => {
        const base = toApiRequestEvent(record, sessionId, seq);
        const attributes = {
          ...base.attributes,
          // Bare agentId is safe even nested: flat and workflow ids share
          // one session-scoped random namespace, so basenames don't collide.
          subsession_id: agentId
        };
        if (meta)
          attributes.agent_type = meta.agentType;
        return { ...base, attributes };
      })
    }));
  } catch (err) {
    if (err?.code === "ENOENT") {
      return { events: [], commit: async () => {
      }, advanced: false };
    }
    throw err;
  }
  return {
    events,
    // Whether committing would actually move this agent's cursor forward.
    // Mirrors tail()'s own "truncated || endOffset > startOffset" check on
    // the parent cursor. Crucially this is NOT the same as `events.length >
    // 0` — a window can consume real bytes (advance) while containing zero
    // assistant records (all user/tool_result lines), and a caller that
    // loops until `events.length === 0` would stop before ever committing
    // that window, permanently stranding every record after it.
    advanced: truncated || endOffset > startOffset,
    commit: async () => {
      if (truncated)
        await cursor.reset();
      const current = await cursor.read();
      if (endOffset > current)
        await cursor.advance(endOffset);
    }
  };
}
var MAX_SUBAGENT_DISCOVERY_DEPTH = 4;
async function discoverSubagentTranscripts(sessionDir, onError) {
  const root = join5(sessionDir, "subagents");
  try {
    if (!(await lstat2(root)).isDirectory())
      return [];
  } catch (err) {
    const code = err?.code;
    if (code !== "ENOENT" && code !== "ENOTDIR")
      await onError?.(root, err);
    return [];
  }
  return walkSubagentDir(root, MAX_SUBAGENT_DISCOVERY_DEPTH, onError);
}
async function walkSubagentDir(dir, depthRemaining, onError) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    const code = err?.code;
    if (code !== "ENOENT" && code !== "ENOTDIR")
      await onError?.(dir, err);
    return [];
  }
  const found = await Promise.all(entries.map(async (entry) => {
    const full = join5(dir, entry.name);
    const kind = await classifyDirent(full, entry);
    if (kind === "file" && entry.name.startsWith("agent-") && entry.name.endsWith(".jsonl")) {
      return [full];
    }
    if (kind === "dir" && depthRemaining > 0) {
      return walkSubagentDir(full, depthRemaining - 1, onError);
    }
    return [];
  }));
  return found.flat();
}
async function classifyDirent(fullPath, entry) {
  if (entry.isFile())
    return "file";
  if (entry.isDirectory())
    return "dir";
  if (entry.isSymbolicLink() || entry.isBlockDevice() || entry.isCharacterDevice() || entry.isFIFO() || entry.isSocket())
    return "other";
  try {
    const st = await lstat2(fullPath);
    if (st.isFile())
      return "file";
    if (st.isDirectory())
      return "dir";
  } catch {
  }
  return "other";
}
function isValidSessionId(s) {
  return typeof s === "string" && SESSION_ID_RE.test(s);
}
function sessionCursorDir(stateDir, sessionId) {
  return join5(stateDir, "sessions", sessionId);
}
function deriveSubagentCursorDir(sessCursorDir, subagentsRoot, subagentPath) {
  const agentId = basename(subagentPath, ".jsonl").slice("agent-".length);
  if (!AGENT_ID_RE.test(agentId)) {
    return { ok: false, agentId, reason: `unsafe agent id in transcript name: ${subagentPath}` };
  }
  const nestedDir = relative(subagentsRoot, dirname3(subagentPath));
  if (nestedDir === ".." || nestedDir.startsWith(".." + sep)) {
    return { ok: false, agentId, reason: `transcript outside subagents root: ${subagentPath}` };
  }
  const cursorDir = nestedDir === "" ? join5(sessCursorDir, "subagents", agentId) : join5(sessCursorDir, "subagents", nestedDir, agentId);
  const errorLabel = nestedDir === "" ? agentId : join5(nestedDir, agentId);
  return { ok: true, agentId, cursorDir, errorLabel };
}
function isAssistantRecord(r) {
  if (typeof r !== "object" || r === null)
    return false;
  const rec = r;
  if (rec.type !== "assistant")
    return false;
  if (typeof rec.uuid !== "string")
    return false;
  if (typeof rec.timestamp !== "string")
    return false;
  if (!Number.isFinite(Date.parse(rec.timestamp)))
    return false;
  if (typeof rec.message !== "object" || rec.message === null)
    return false;
  const msg = rec.message;
  if (msg.role !== "assistant")
    return false;
  if (typeof msg.id !== "string")
    return false;
  if (typeof msg.model !== "string")
    return false;
  return true;
}
function toApiRequestEvent(r, sessionId, sequence) {
  const usage = r.message.usage ?? {};
  const cacheCreation = usage.cache_creation;
  const attrs = {
    cost_usd: r.costUSD ?? 0,
    tokens_input: usage.input_tokens ?? 0,
    tokens_output: usage.output_tokens ?? 0,
    tokens_cache_read: usage.cache_read_input_tokens ?? 0,
    tokens_cache_create: usage.cache_creation_input_tokens ?? 0,
    tokens_cache_create_5m: cacheCreation?.ephemeral_5m_input_tokens ?? 0,
    tokens_cache_create_1h: cacheCreation?.ephemeral_1h_input_tokens ?? 0,
    model: r.message.model,
    // Anthropic API request ID. Falls back to message.id for older
    // transcripts (and existing test fixtures) that lack requestId.
    request_id: r.requestId ?? r.message.id,
    transcript_message_uuid: r.uuid
  };
  if (typeof r.message.stop_reason === "string" && r.message.stop_reason) {
    attrs.stop_reason = r.message.stop_reason;
  }
  return {
    event_uuid: randomUUID2(),
    event_type: "api.request",
    session_id: sessionId,
    source: "transcript.tail",
    sequence,
    timestamp_ns: BigInt(Date.parse(r.timestamp)) * 1000000n,
    attributes: attrs
  };
}

// dist/shared/queue.mjs
import { open as open5, stat as stat2 } from "node:fs/promises";
import { join as join6 } from "node:path";
var Queue = class {
  dir;
  path;
  capBytes;
  constructor(dir, capBytes) {
    this.dir = dir;
    this.path = join6(dir, "queue.ndjson");
    this.capBytes = capBytes;
  }
  async size() {
    try {
      const s = await stat2(this.path);
      return s.size;
    } catch (err) {
      if (err.code === "ENOENT")
        return 0;
      throw err;
    }
  }
  async append(lines) {
    if (lines.length === 0) {
      return { written: 0, dropped: 0, sizeAfter: await this.size() };
    }
    return withDirLock(this.dir, async () => {
      const fh = await open5(this.path, "a", 384);
      let written = 0;
      let dropped = 0;
      let currentSize = (await fh.stat()).size;
      try {
        for (const line of lines) {
          const bytes = Buffer.byteLength(line, "utf8") + 1;
          if (currentSize + bytes > this.capBytes) {
            dropped++;
            continue;
          }
          await fh.write(line + "\n", null, "utf8");
          written++;
          currentSize += bytes;
        }
      } finally {
        await fh.close();
      }
      return { written, dropped, sizeAfter: currentSize };
    });
  }
};

// dist/shared/run-collect.mjs
init_credential_paths();

// dist/shared/hash.mjs
import { createHash, createHmac } from "node:crypto";
function sha256Hex(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// dist/shared/content-filter.mjs
function buildRules(policy) {
  const k = (eventType) => keep(policy.keepLists[eventType]);
  return {
    "session.start": k("session.start"),
    "session.end": k("session.end"),
    "prompt.submit": promptSubmit,
    "tool_call.start": toolCallStart,
    "tool_call.complete": toolCallComplete,
    "tool_call.failed": toolCallFailed,
    "subagent.start": k("subagent.start"),
    "subagent.complete": k("subagent.complete"),
    "stop": k("stop"),
    "permission.request": k("permission.request"),
    "notification": k("notification"),
    "task.completed": k("task.completed"),
    "compaction.before": k("compaction.before"),
    "compaction.after": k("compaction.after"),
    "config.changed": k("config.changed"),
    "usage_config.changed": k("usage_config.changed"),
    "usage_limit.exceeded": k("usage_limit.exceeded"),
    "usage_limit.snapshot": k("usage_limit.snapshot"),
    "api.request": k("api.request")
  };
}
function promptSubmit(a) {
  const out = {
    prompt_length: numericOr(a.prompt_length, 0)
  };
  if (typeof a.slash_command === "string" && a.slash_command) {
    out.slash_command = a.slash_command;
  }
  return out;
}
function keep(names) {
  const set = new Set(names);
  return (attrs) => {
    const out = {};
    for (const [k, v] of Object.entries(attrs)) {
      if (set.has(k))
        out[k] = v;
    }
    return out;
  };
}
function toolCallStart(a) {
  const rawInput = typeof a.tool_input_raw === "string" ? a.tool_input_raw : "";
  const out = stripUndefined({
    tool_name: asString(a.tool_name),
    tool_input_hash: sha256Hex(rawInput),
    input_size_bytes: Buffer.byteLength(rawInput, "utf8"),
    correlation_id: asString(a.correlation_id),
    subsession_id: a.subsession_id,
    agent_type: a.agent_type
  });
  if (typeof a.skill_name === "string" && a.skill_name)
    out.skill_name = a.skill_name;
  return out;
}
function toolCallComplete(a) {
  const rawInput = typeof a.tool_input_raw === "string" ? a.tool_input_raw : "";
  const rawResponse = typeof a.tool_response_raw === "string" ? a.tool_response_raw : "";
  const out = stripUndefined({
    tool_name: asString(a.tool_name),
    tool_input_hash: sha256Hex(rawInput),
    input_size_bytes: Buffer.byteLength(rawInput, "utf8"),
    response_size_bytes: Buffer.byteLength(rawResponse, "utf8"),
    success: a.success === true,
    correlation_id: asString(a.correlation_id),
    subsession_id: a.subsession_id,
    agent_type: a.agent_type
  });
  if (typeof a.skill_name === "string" && a.skill_name)
    out.skill_name = a.skill_name;
  return out;
}
function toolCallFailed(a) {
  const rawInput = typeof a.tool_input_raw === "string" ? a.tool_input_raw : "";
  const out = stripUndefined({
    tool_name: asString(a.tool_name),
    tool_input_hash: sha256Hex(rawInput),
    correlation_id: asString(a.correlation_id),
    subsession_id: a.subsession_id,
    agent_type: a.agent_type
  });
  if (typeof a.skill_name === "string" && a.skill_name)
    out.skill_name = a.skill_name;
  return out;
}
function asString(v) {
  return typeof v === "string" ? v : "";
}
function numericOr(v, fallback) {
  return typeof v === "number" ? v : fallback;
}
function stripUndefined(o) {
  const out = {};
  for (const [k, v] of Object.entries(o))
    if (v !== void 0)
      out[k] = v;
  return out;
}
var rulesCache = /* @__PURE__ */ new WeakMap();
function getRules(policy) {
  let rules = rulesCache.get(policy);
  if (!rules) {
    rules = buildRules(policy);
    rulesCache.set(policy, rules);
  }
  return rules;
}
function filterEvent(raw, policy) {
  const rules = getRules(policy);
  const rule = rules[raw.event_type];
  if (!rule) {
    throw new Error(`No content-filter rule for event_type: ${raw.event_type}`);
  }
  const filteredAttrs = rule(raw.attributes);
  const out = {
    ...raw,
    attributes: filteredAttrs
  };
  const serialized = JSON.stringify({
    uuid: out.event_uuid,
    type: out.event_type,
    sid: out.session_id,
    ts: out.timestamp_ns.toString(),
    attrs: out.attributes
  });
  if (Buffer.byteLength(serialized, "utf8") > policy.maxSerializedBytes) {
    return null;
  }
  return out;
}

// dist/shared/server-key.mjs
var DEFAULT_TTL_MS = 24 * 60 * 60 * 1e3;

// dist/shared/identity-cache.mjs
var DEFAULT_TTL_MS2 = 12 * 60 * 60 * 1e3;

// dist/shared/health.mjs
var import_proper_lockfile3 = __toESM(require_proper_lockfile(), 1);
import { mkdir as mkdir5, readFile as readFile5, rename as rename4, writeFile as writeFile3 } from "node:fs/promises";
import { join as join7 } from "node:path";
var DEFAULT = { dropped_event_count: 0 };
var LOCK_RETRIES = {
  retries: 100,
  factor: 1.5,
  minTimeout: 5,
  maxTimeout: 50
};
var HealthState = class {
  dir;
  path;
  tmp;
  constructor(dir) {
    this.dir = dir;
    this.path = join7(dir, "health.json");
    this.tmp = `${this.path}.tmp`;
  }
  async read() {
    try {
      return { ...DEFAULT, ...JSON.parse(await readFile5(this.path, "utf8")) };
    } catch {
      return { ...DEFAULT };
    }
  }
  async recordDrop(n) {
    await this.update((h) => {
      h.dropped_event_count += n;
    });
  }
  async touch() {
    await this.update((h) => {
      h.last_hook_at = Date.now();
    });
  }
  async recordFlush(result) {
    await this.update((h) => {
      h.last_flush_at = Date.now();
      h.last_flush_result = result;
    });
  }
  async update(mutate) {
    await mkdir5(this.dir, { recursive: true });
    try {
      await readFile5(this.path);
    } catch {
      await writeFile3(this.path, "{}", "utf8");
    }
    const release = await import_proper_lockfile3.default.lock(this.path, {
      retries: LOCK_RETRIES,
      realpath: false
    });
    try {
      const h = await this.read();
      mutate(h);
      await writeFile3(this.tmp, JSON.stringify(h), "utf8");
      await rename4(this.tmp, this.path);
    } finally {
      await release();
    }
  }
};

// dist/shared/flusher.mjs
var import_proper_lockfile4 = __toESM(require_proper_lockfile(), 1);

// dist/shared/backoff-state.mjs
var MAX_BACKOFF_MS = 5 * 60 * 1e3;

// dist/shared/forwarder.mjs
import { gzip } from "node:zlib";
import { promisify } from "node:util";
var gzipAsync = promisify(gzip);
var MAX_RESPONSE_BYTES = 64 * 1024;

// dist/shared/run-collect.mjs
var QUEUE_CAP_BYTES = 100 * 1024 * 1024;
function serializeForQueue(event) {
  if (typeof event.event_uuid !== "string" || event.event_uuid.length === 0) {
    throw new Error(`event_uuid must be non-empty before enqueue (event_type=${event.event_type}, source=${event.source})`);
  }
  return JSON.stringify({
    event_uuid: event.event_uuid,
    event_type: event.event_type,
    session_id: event.session_id,
    source: event.source,
    sequence: event.sequence,
    timestamp_ns: event.timestamp_ns.toString(),
    attributes: event.attributes
  });
}
function filterEvents(events, policy) {
  const filtered = [];
  let dropped = 0;
  for (const ev of events) {
    const f = filterEvent(ev, policy);
    if (f === null)
      dropped++;
    else
      filtered.push(f);
  }
  return { filtered, dropped };
}
async function enqueueEvents(queue, events) {
  if (events.length === 0)
    return { written: 0, dropped: 0, sizeAfter: await queue.size() };
  return queue.append(events.map(serializeForQueue));
}

// dist/shared/backfill/scan.mjs
var MAX_ITERATIONS_PER_TRANSCRIPT = 1e4;
async function runBackfillScan(opts) {
  const transcriptRoot = opts.transcriptRoot ?? join8(homedir4(), ".claude", "projects");
  const stateDir = join8(opts.dataDir, "state");
  const outboundDir = join8(opts.dataDir, "outbound");
  await mkdir6(outboundDir, { recursive: true, mode: 448 });
  const queue = new Queue(outboundDir, opts.queueCapBytes ?? QUEUE_CAP_BYTES);
  const maxReadBytes = opts.maxReadBytes ?? DEFAULT_MAX_READ_BYTES;
  const policy = defaultPolicy();
  const summary = {
    sessionsScanned: 0,
    transcriptsTailed: 0,
    transcriptsFailed: 0,
    eventsEnqueued: 0,
    skippedLocked: 0,
    skippedFull: 0,
    skippedFiltered: 0
  };
  const sessions = await discoverSessionDirs(transcriptRoot, opts.errorLogPath);
  for (const { sessionId, sessionDir } of sessions) {
    const tail = new TranscriptTail(stateDir, { transcriptRoot, errorLogPath: opts.errorLogPath });
    let lock;
    try {
      lock = await tail.acquireCursorLock(sessionId);
    } catch (err) {
      if (err?.code !== "ELOCKED") {
        await logScanError(opts.errorLogPath, sessionId, "cursor-lock", err);
      }
      summary.skippedLocked++;
      continue;
    }
    summary.sessionsScanned++;
    try {
      const subagentsRoot = join8(sessionDir, "subagents");
      const subagentPaths = await discoverSubagentTranscripts(sessionDir, (dir, err) => logScanError(opts.errorLogPath, sessionId, relative2(sessionDir, dir) || "subagents", err));
      const metaCache = new SubagentMetaCache();
      const sessCursorDir = sessionCursorDir(stateDir, sessionId);
      for (const subagentPath of subagentPaths) {
        const derived = deriveSubagentCursorDir(sessCursorDir, subagentsRoot, subagentPath);
        if (!derived.ok) {
          await logScanError(opts.errorLogPath, sessionId, derived.agentId, new Error(derived.reason));
          summary.transcriptsFailed++;
          continue;
        }
        const { agentId, cursorDir, errorLabel } = derived;
        const drain = await drainSubagentTranscript({
          sessionId,
          agentId,
          subagentPath,
          metaPath: metaPathFromTranscript(subagentPath),
          cursorDir,
          metaCache,
          maxReadBytes,
          queue,
          policy,
          errorLogPath: opts.errorLogPath,
          errorLabel
        });
        if (drain.failed)
          summary.transcriptsFailed++;
        else
          summary.transcriptsTailed++;
        summary.eventsEnqueued += drain.enqueued;
        summary.skippedFull += drain.queueCapDropped;
        summary.skippedFiltered += drain.filterDropped;
      }
    } finally {
      await lock.release();
    }
  }
  const totalDropped = summary.skippedFull + summary.skippedFiltered;
  if (totalDropped > 0) {
    const health = new HealthState(stateDir);
    await health.touch();
    await health.recordDrop(totalDropped);
  }
  return summary;
}
async function drainSubagentTranscript(params) {
  const { sessionId, agentId, subagentPath, metaPath, cursorDir, metaCache, maxReadBytes, queue, policy, errorLogPath, errorLabel } = params;
  let seq = 0;
  let enqueued = 0;
  let queueCapDropped = 0;
  let filterDropped = 0;
  for (let i = 0; i < MAX_ITERATIONS_PER_TRANSCRIPT; i++) {
    let read;
    try {
      read = await readSubagent({
        sessionId,
        agentId,
        transcriptPath: subagentPath,
        metaPath,
        cursorDir,
        metaCache,
        sequenceBase: seq,
        maxReadBytes
      });
    } catch (err) {
      await logScanError(errorLogPath, sessionId, errorLabel, err);
      return { enqueued, queueCapDropped, filterDropped, failed: true };
    }
    try {
      if (read.events.length > 0) {
        const { filtered, dropped } = filterEvents(read.events, policy);
        filterDropped += dropped;
        if (filtered.length > 0) {
          const result = await enqueueEvents(queue, filtered);
          enqueued += result.written;
          queueCapDropped += result.dropped;
        }
      }
      await read.commit();
    } catch (err) {
      await logScanError(errorLogPath, sessionId, errorLabel, err);
      return { enqueued, queueCapDropped, filterDropped, failed: true };
    }
    seq += read.events.length;
    if (!read.advanced)
      break;
  }
  return { enqueued, queueCapDropped, filterDropped, failed: false };
}
async function logScanError(errorLogPath, sessionId, errorLabel, err) {
  if (!errorLogPath)
    return;
  const msg = err instanceof Error ? err.message : String(err);
  const line = `${(/* @__PURE__ */ new Date()).toISOString()} backfill-scan ${sessionId}/${errorLabel}: ${msg}`.replace(/[\p{Cc}\p{Cf}]+/gu, " ").slice(0, 2e3) + "\n";
  try {
    await appendFile2(errorLogPath, line);
  } catch {
  }
}
async function discoverSessionDirs(transcriptRoot, errorLogPath) {
  const logDirError = async (label, err) => {
    const code = err?.code;
    if (code !== "ENOENT" && code !== "ENOTDIR") {
      await logScanError(errorLogPath, "-", label, err);
    }
  };
  let projectEntries;
  try {
    projectEntries = await readdir2(transcriptRoot, { withFileTypes: true });
  } catch (err) {
    await logDirError("transcript-root", err);
    return [];
  }
  const found = [];
  for (const proj of projectEntries) {
    const projDir = join8(transcriptRoot, proj.name);
    if (await classifyDirent(projDir, proj) !== "dir")
      continue;
    let sessionEntries;
    try {
      sessionEntries = await readdir2(projDir, { withFileTypes: true });
    } catch (err) {
      await logDirError(proj.name, err);
      continue;
    }
    for (const entry of sessionEntries) {
      if (!isValidSessionId(entry.name))
        continue;
      const sessionDir = join8(projDir, entry.name);
      if (await classifyDirent(sessionDir, entry) !== "dir")
        continue;
      found.push({ sessionId: entry.name, sessionDir });
    }
  }
  return found;
}

// dist/shared/backfill/scan-then-drain.mjs
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
async function scanThenDrain(args) {
  const summary = await runBackfillScan({
    dataDir: args.dataDir,
    transcriptRoot: args.transcriptRoot,
    // Same crash/error log the live tail path writes to (run-collect.mts),
    // so a broken subagent transcript during a scan is recorded somewhere
    // rather than silently contained into nothing. Without this, scan.mts's
    // per-transcript containment had nowhere to write in production — only
    // tests (which pass errorLogPath directly) ever exercised it.
    errorLogPath: join9(args.dataDir, "collect-error.log")
  });
  args.out(`Scan complete: ${summary.sessionsScanned} sessions scanned, ${summary.transcriptsTailed} transcripts tailed, ${summary.transcriptsFailed} failed (see collect-error.log), ${summary.eventsEnqueued} events enqueued, ${summary.skippedLocked} skipped (locked), ${summary.skippedFull + summary.skippedFiltered} dropped (queue full / filtered).
`);
  const queue = new Queue(join9(args.dataDir, "outbound"), QUEUE_CAP_BYTES);
  if (await queue.size() === 0) {
    args.out("Queue is empty; nothing to upload.\n");
    return 0;
  }
  return spawnRunner(args);
}

// dist/shared/bin/auto-scan.mjs
var AUTO_SCAN_JITTER_MAX_MS = 12e4;
async function runAutoScan(opts) {
  const sleep = opts.sleep ?? defaultSleep;
  const jitterMs = opts.jitterMs ?? Math.floor(Math.random() * AUTO_SCAN_JITTER_MAX_MS);
  await sleep(jitterMs);
  const stateDir = join10(opts.dataDir, "state");
  const auditLogPath = join10(opts.dataDir, "auto-scan.log");
  const audit = (s) => {
    const line = `${(/* @__PURE__ */ new Date()).toISOString()} ${s.replace(/[\p{Cc}\p{Cf}]+/gu, " ").trim()}`.slice(0, 2e3) + "\n";
    try {
      appendFileSync(auditLogPath, line, { mode: 384 });
    } catch {
    }
  };
  const out = opts.stdout ?? audit;
  const err = opts.stderr ?? audit;
  return scanThenDrain({
    dataDir: opts.dataDir,
    credPath: opts.credentialUserPath,
    stateDir,
    out,
    err,
    spawner: opts.spawner,
    transcriptRoot: opts.transcriptRoot
  });
}
function defaultSleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
var isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : void 0;
  };
  const dataDir = getArg("--data-dir");
  const credPath = getArg("--credential-path");
  if (!dataDir || !credPath) {
    process.stderr.write("auto-scan requires --data-dir and --credential-path\n");
    process.exit(2);
  }
  void runAutoScan({ dataDir, credentialUserPath: credPath }).then((code) => process.exit(code)).catch(async (err) => {
    const msg = err instanceof Error ? err.stack ?? err.message : String(err);
    try {
      await appendFile3(join10(dataDir, "collect-error.log"), `${(/* @__PURE__ */ new Date()).toISOString()} auto-scan: ${msg}
`);
    } catch {
    }
    process.exit(1);
  });
}
export {
  AUTO_SCAN_JITTER_MAX_MS,
  runAutoScan
};
