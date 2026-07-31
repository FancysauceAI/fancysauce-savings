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
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
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
var credential_paths_exports = {};
__export(credential_paths_exports, {
  credentialPaths: () => credentialPaths
});
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

// node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "node_modules/graceful-fs/polyfills.js"(exports, module) {
    var constants4 = __require("constants");
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
      if (constants4.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
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
          function rename13(from, to, cb) {
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
          if (Object.setPrototypeOf) Object.setPrototypeOf(rename13, fs$rename);
          return rename13;
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
            constants4.O_WRONLY | constants4.O_SYMLINK,
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
          var fd = fs2.openSync(path, constants4.O_WRONLY | constants4.O_SYMLINK, mode);
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
        if (constants4.hasOwnProperty("O_SYMLINK") && fs2.futimes) {
          fs2.lutimes = function(path, at, mt, cb) {
            fs2.open(path, constants4.O_SYMLINK, function(er, fd) {
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
            var fd = fs2.openSync(path, constants4.O_SYMLINK);
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
      fs2.readFile = readFile16;
      function readFile16(path, options, cb) {
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
      fs2.writeFile = writeFile12;
      function writeFile12(path, data, options, cb) {
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
        fs2.appendFile = appendFile5;
      function appendFile5(path, data, options, cb) {
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
      fs2.readdir = readdir2;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir2(path, options, cb) {
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
        open9(that.path, that.flags, that.mode, function(err, fd) {
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
        open9(that.path, that.flags, that.mode, function(err, fd) {
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
      fs2.open = open9;
      function open9(path, flags, mode, cb) {
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
        return fs.stat(file, (err, stat5) => {
          if (err) {
            return callback(err);
          }
          callback(null, stat5.mtime, cachedPrecision);
        });
      }
      const mtime = new Date(Math.ceil(Date.now() / 1e3) * 1e3 + 5);
      fs.utimes(file, mtime, mtime, (err) => {
        if (err) {
          return callback(err);
        }
        fs.stat(file, (err2, stat5) => {
          if (err2) {
            return callback(err2);
          }
          const precision = stat5.mtime.getTime() % 1e3 === 0 ? "s" : "ms";
          Object.defineProperty(fs, cacheSymbol, { value: precision });
          callback(null, stat5.mtime, precision);
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
        options.fs.stat(lockfilePath, (err2, stat5) => {
          if (err2) {
            if (err2.code === "ENOENT") {
              return acquireLock(file, { ...options, stale: 0 }, callback);
            }
            return callback(err2);
          }
          if (!isLockStale(stat5, options)) {
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
    function isLockStale(stat5, options) {
      return stat5.mtime.getTime() < Date.now() - options.stale;
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
        options.fs.stat(lock2.lockfilePath, (err, stat5) => {
          const isOverThreshold = lock2.lastUpdate + options.stale < Date.now();
          if (err) {
            if (err.code === "ENOENT" || isOverThreshold) {
              return setLockAsCompromised(file, lock2, Object.assign(err, { code: "ECOMPROMISED" }));
            }
            lock2.updateDelay = 1e3;
            return updateLock(file, options);
          }
          const isMtimeOurs = lock2.mtime.getTime() === stat5.mtime.getTime();
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
        options.fs.stat(getLockFile(file2, options), (err2, stat5) => {
          if (err2) {
            return err2.code === "ENOENT" ? callback(null, false) : callback(err2);
          }
          return callback(null, !isLockStale(stat5, options));
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

// dist/shared/backfill/pid-guard.mjs
var pid_guard_exports = {};
__export(pid_guard_exports, {
  acquirePidGuard: () => acquirePidGuard,
  isBackfillActive: () => isBackfillActive,
  releasePidGuard: () => releasePidGuard
});
import { readFile as readFile9, rm as rm2, mkdir as mkdir7, open as open5 } from "node:fs/promises";
import { join as join15 } from "node:path";
async function isBackfillActive(stateDir) {
  try {
    const raw = await readFile9(join15(stateDir, "backfill.pid"), "utf8");
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
async function acquirePidGuard(stateDir) {
  await mkdir7(stateDir, { recursive: true });
  const path = join15(stateDir, "backfill.pid");
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fh = await open5(path, "wx", 384);
      try {
        await fh.writeFile(String(process.pid));
        await fh.sync();
      } finally {
        await fh.close();
      }
      return { kind: "acquired" };
    } catch (err) {
      if (err.code !== "EEXIST")
        throw err;
      const live2 = await isBackfillActive(stateDir);
      if (live2 !== null)
        return { kind: "already-running", pid: live2 };
      await rm2(path, { force: true });
    }
  }
  const live = await isBackfillActive(stateDir);
  return live !== null ? { kind: "already-running", pid: live } : { kind: "already-running", pid: -1 };
}
async function releasePidGuard(stateDir) {
  await rm2(join15(stateDir, "backfill.pid"), { force: true });
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
var runner_spawn_exports = {};
__export(runner_spawn_exports, {
  resolveDistBinPath: () => resolveDistBinPath,
  spawnAutoScan: () => spawnAutoScan,
  spawnBackfillRunner: () => spawnBackfillRunner
});
import { spawn } from "node:child_process";
import { join as join16, dirname as dirname5 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
function resolveDistBinPath(containerDir, binName) {
  return join16(containerDir, "..", "..", "shared", "bin", binName);
}
async function spawnBackfillRunner(input) {
  const here = dirname5(fileURLToPath2(import.meta.url));
  const binPath = resolveDistBinPath(here, "backfill-runner.mjs");
  const args = ["--data-dir", input.dataDir, "--credential-path", input.credentialPath];
  return spawnDetachedBin(binPath, args, input.spawner);
}
async function spawnAutoScan(input) {
  const here = dirname5(fileURLToPath2(import.meta.url));
  const binPath = resolveDistBinPath(here, "auto-scan.mjs");
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

// dist/shared/backfill/scan-once.mjs
var scan_once_exports = {};
__export(scan_once_exports, {
  claimScanOnce: () => claimScanOnce,
  hasScanOnceMarker: () => hasScanOnceMarker
});
import { readFile as readFile10, writeFile as writeFile7, mkdir as mkdir8 } from "node:fs/promises";
import { join as join17 } from "node:path";
async function hasScanOnceMarker(stateDir) {
  try {
    await readFile10(join17(stateDir, MARKER_NAME));
    return true;
  } catch {
    return false;
  }
}
async function claimScanOnce(stateDir, pluginVersion2) {
  await mkdir8(stateDir, { recursive: true, mode: 448 });
  const marker = { spawned_at: (/* @__PURE__ */ new Date()).toISOString(), plugin_version: pluginVersion2 };
  try {
    await writeFile7(join17(stateDir, MARKER_NAME), JSON.stringify(marker), { encoding: "utf8", flag: "wx" });
    return true;
  } catch (err) {
    if (err?.code === "EEXIST")
      return false;
    throw err;
  }
}
var MARKER_NAME;
var init_scan_once = __esm({
  "dist/shared/backfill/scan-once.mjs"() {
    "use strict";
    MARKER_NAME = "scan-once.json";
  }
});

// dist/shared/backfill/status.mjs
var status_exports = {};
__export(status_exports, {
  readStatus: () => readStatus,
  writeStatus: () => writeStatus
});
import { readFile as readFile11, open as open6, rename as rename9, mkdir as mkdir9, unlink as unlink3 } from "node:fs/promises";
import { join as join18, dirname as dirname6 } from "node:path";
import { randomBytes as randomBytes4 } from "node:crypto";
async function readStatus(stateDir) {
  try {
    const raw = await readFile11(join18(stateDir, "backfill.status"), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
async function writeStatus(stateDir, s) {
  const path = join18(stateDir, "backfill.status");
  await mkdir9(dirname6(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${randomBytes4(4).toString("hex")}.tmp`;
  let renamed = false;
  try {
    const fh = await open6(tmp, "wx", 384);
    try {
      await fh.writeFile(JSON.stringify(s));
      await fh.sync();
    } finally {
      await fh.close();
    }
    await rename9(tmp, path);
    renamed = true;
  } finally {
    if (!renamed) {
      try {
        await unlink3(tmp);
      } catch {
      }
    }
  }
}
var init_status = __esm({
  "dist/shared/backfill/status.mjs"() {
    "use strict";
  }
});

// dist/agents/claude-code/collect.mjs
import { readFileSync as readFileSync6 } from "node:fs";

// dist/shared/run-collect.mjs
import { readFileSync as readFileSync5 } from "node:fs";
import { randomUUID as randomUUID2 } from "node:crypto";
import { mkdir as mkdir10, writeFile as writeFile8, appendFile as appendFile3, stat as stat3, rm as rm3 } from "node:fs/promises";
import { join as join19 } from "node:path";

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
function resolveLoginStateDir() {
  const parsed = parseCredentialPathsEnv();
  if (parsed?.login_state_dir)
    return parsed.login_state_dir;
  return DEFAULT_LOGIN_STATE_DIR;
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

// dist/shared/data-dir.mjs
import { readFileSync } from "node:fs";
import { basename, join as join2, dirname as dirname2 } from "node:path";
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
  const here = dirname2(fileURLToPath(import.meta.url));
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

// dist/shared/identity-resolver.mjs
import { createHash as createHash2, randomUUID } from "node:crypto";
import { execFile as execFile2 } from "node:child_process";
import { open as open2, readFile as readFile2, rename as rename2, unlink as unlink2 } from "node:fs/promises";
import { join as join6 } from "node:path";
import { randomBytes as randomBytes3 } from "node:crypto";

// dist/shared/locking.mjs
var import_proper_lockfile = __toESM(require_proper_lockfile(), 1);
import { mkdir as mkdir2 } from "node:fs/promises";
var LOCK_OPTIONS = {
  realpath: false,
  retries: { retries: 100, minTimeout: 5, maxTimeout: 100, factor: 1.5 },
  stale: 1e4
};
async function withDirLock(dir, fn) {
  await mkdir2(dir, { recursive: true });
  const release = await import_proper_lockfile.default.lock(dir, LOCK_OPTIONS);
  try {
    return await fn();
  } finally {
    await release();
  }
}

// dist/shared/identity-sources.mjs
import { execFile } from "node:child_process";
var TIMEOUT_MS = 200;
function defaultRunner(cmd, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs }, (err, stdout) => {
      if (err)
        return reject(err);
      resolve(stdout.toString());
    });
  });
}
async function readGitConfigEmail(deps = {}) {
  const runner = deps.runner ?? defaultRunner;
  try {
    const out = await runner("git", ["config", "--global", "user.email"], TIMEOUT_MS);
    const trimmed = out.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}
async function readMacOsDsclEmail(deps = {}) {
  const platform = deps.platform ?? process.platform;
  if (platform !== "darwin")
    return null;
  const runner = deps.runner ?? defaultRunner;
  const user = deps.username ?? process.env.USER ?? process.env.LOGNAME;
  if (!user)
    return null;
  try {
    const out = await runner("dscl", [".", "-read", `/Users/${user}`, "EMailAddress"], TIMEOUT_MS);
    const match = out.match(/^EMailAddress:\s*(\S+)/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}
async function readWindowsUpn(deps = {}) {
  const platform = deps.platform ?? process.platform;
  if (platform !== "win32")
    return null;
  const runner = deps.runner ?? defaultRunner;
  try {
    const out = await runner("whoami", ["/upn"], TIMEOUT_MS);
    const trimmed = out.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

// dist/shared/secure-envelope.mjs
import { randomBytes as randomBytes2, createCipheriv, publicEncrypt, constants, createPublicKey } from "node:crypto";
function seal(plaintext, key) {
  const aesKey = randomBytes2(32);
  const iv = randomBytes2(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const ct = Buffer.concat([body, tag]);
  const ek = publicEncrypt({ key: createPublicKey(key.publicKeyPem), padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, aesKey);
  return {
    v: 1,
    keyid: key.keyid,
    alg: "RSA-OAEP-256+A256GCM",
    ek: ek.toString("base64"),
    iv: iv.toString("base64"),
    ct: ct.toString("base64")
  };
}

// dist/shared/server-key.mjs
import { readFileSync as readFileSync2 } from "node:fs";
import { join as join3 } from "node:path";
var BAKED_SERVER_KEY = {
  keyid: "env-production-1",
  alg: "RSA-OAEP-256+A256GCM",
  publicKeyPem: "-----BEGIN PUBLIC KEY-----\nMIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEA4Dh42p0kvReuiL194qp3\n8j0BSjOmwW9WU9NUUSlBSA1Kn0WPdfMKywsD+DPrlt/KyOKdNLoUXsXrriM212Si\nMgabz4e4pK8ItqgqCg1wPFArY8SEoy8MioMj8iZVz/UPeR3/7Rng8LT50HiaB/kc\nwkBjjLnSU2xYQkKROKMGuTlKDZ4BCpP/uVCFTrZ5BUFEn3r2WyAl3Z6NBjO9hTPB\njKx1AH+CitIZeWVmn39EUwrzUW+LiXbEe1Y+0SXkpTgdqvVMzMjytlEp5Ojisvs1\n/GqoHRoN/NcESILK2s4Rabe3PTquCmZItYbw2sBpFe/6xhHPn/LA2TVjEjx5d+GJ\ndxQnhUWlNPInWul8TCePBAhz6MGThrcVWj6b+V3K4CrjetFIlvF7R2dk/SlWLCUZ\nozfDPZnQfvSZInVSrSRiCqA3OXArmptmFzeZii1RDQsJnNA+Vc2lTvuf2ScepvgG\nWJPZewNj7dknrCLAyj79ZZrQH31cIjgPt3XpT7SHnkaLAgMBAAE=\n-----END PUBLIC KEY-----\n"
};
var CACHE_FILE = "server-key.json";
var DEFAULT_TTL_MS = 24 * 60 * 60 * 1e3;
function isServerKeyShape(v) {
  if (typeof v !== "object" || v === null)
    return false;
  const o = v;
  return typeof o.keyid === "string" && !!o.keyid && typeof o.alg === "string" && !!o.alg && typeof o.publicKeyPem === "string" && o.publicKeyPem.includes("BEGIN PUBLIC KEY");
}
function loadServerKey(deps) {
  const ttl = deps.ttlMs ?? DEFAULT_TTL_MS;
  const read = deps.readFileImpl ?? ((p) => readFileSync2(p, "utf8"));
  try {
    const parsed = JSON.parse(read(join3(deps.cacheDir, CACHE_FILE)));
    if (!isServerKeyShape(parsed) || typeof parsed.fetched_at !== "number")
      return BAKED_SERVER_KEY;
    if (deps.now - parsed.fetched_at > ttl)
      return BAKED_SERVER_KEY;
    return { keyid: parsed.keyid, alg: parsed.alg, publicKeyPem: parsed.publicKeyPem };
  } catch {
    return BAKED_SERVER_KEY;
  }
}

// dist/shared/native-identity.mjs
import { readFileSync as readFileSync3 } from "node:fs";
import { execFileSync } from "node:child_process";
import { join as join4 } from "node:path";
import { homedir as homedir4 } from "node:os";
var CLI_TIMEOUT_MS = 500;
function defaultClaudeStatus() {
  try {
    return execFileSync("claude", ["auth", "status", "--json"], {
      timeout: CLI_TIMEOUT_MS,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
  } catch {
    return null;
  }
}
function pick(o, k) {
  const v = o[k];
  return typeof v === "string" && v.length > 0 ? v : void 0;
}
function readNativeIdentity(agent, deps = {}) {
  const home = deps.home ?? homedir4();
  const read = deps.readFileImpl ?? ((p) => readFileSync3(p, "utf8"));
  return agent === "claude-code" ? readClaude(home, read, deps.claudeStatus ?? defaultClaudeStatus) : readCodex(home, read);
}
function readClaude(home, read, status) {
  try {
    const parsed = JSON.parse(read(join4(home, ".claude.json")));
    const oa = parsed.oauthAccount;
    if (oa && typeof oa === "object") {
      const email = pick(oa, "emailAddress");
      const account_id = pick(oa, "accountUuid");
      if (email || account_id) {
        return {
          source: "native_claude",
          ...email ? { email } : {},
          ...account_id ? { account_id } : {},
          ...pick(oa, "organizationUuid") ? { org_id: pick(oa, "organizationUuid") } : {},
          ...pick(oa, "organizationName") ? { org_name: pick(oa, "organizationName") } : {},
          ...pick(oa, "organizationType") ? { plan: pick(oa, "organizationType") } : {}
        };
      }
    }
  } catch {
  }
  const raw = status();
  if (!raw)
    return null;
  try {
    const s = JSON.parse(raw);
    if (s.apiProvider !== "firstParty")
      return null;
    const email = pick(s, "email");
    const org_id = pick(s, "orgId");
    if (!email && !org_id)
      return null;
    return {
      source: "native_claude",
      ...email ? { email } : {},
      ...org_id ? { org_id } : {},
      ...pick(s, "orgName") ? { org_name: pick(s, "orgName") } : {},
      ...pick(s, "subscriptionType") ? { plan: pick(s, "subscriptionType") } : {}
    };
  } catch {
    return null;
  }
}
function readCodex(home, read) {
  let auth;
  try {
    auth = JSON.parse(read(join4(home, ".codex", "auth.json")));
  } catch {
    return null;
  }
  const tokens = typeof auth === "object" && auth !== null ? auth.tokens : void 0;
  const idToken = tokens?.id_token;
  if (typeof idToken !== "string")
    return null;
  const payload = decodeJwtPayload(idToken);
  if (!payload)
    return null;
  const claims = payload["https://api.openai.com/auth"];
  const au = typeof claims === "object" && claims !== null ? claims : {};
  const orgs = Array.isArray(au["organizations"]) ? au["organizations"] : [];
  const org0 = orgs[0] ?? {};
  const email = pick(payload, "email");
  const user_id = pick(au, "chatgpt_user_id");
  const account_id = pick(au, "chatgpt_account_id");
  const plan = pick(au, "chatgpt_plan_type");
  const org_id = pick(org0, "id");
  const org_name = pick(org0, "title");
  if (!email && !account_id && !pick(payload, "sub"))
    return null;
  return {
    source: "native_codex",
    ...email ? { email } : {},
    ...account_id ? { account_id } : {},
    ...user_id ? { user_id } : {},
    ...org_id ? { org_id } : {},
    ...org_name ? { org_name } : {},
    ...plan ? { plan } : {}
  };
}
function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3)
    return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const obj = JSON.parse(json);
    return typeof obj === "object" && obj !== null ? obj : null;
  } catch {
    return null;
  }
}

// dist/shared/identity-cache.mjs
import { readFileSync as readFileSync4, writeFileSync } from "node:fs";
import { join as join5 } from "node:path";
var CACHE_FILE2 = "identity-cache.json";
var DEFAULT_TTL_MS2 = 12 * 60 * 60 * 1e3;
function readIdentityCache(deps) {
  const ttl = deps.ttlMs ?? DEFAULT_TTL_MS2;
  const read = deps.readFileImpl ?? ((p) => readFileSync4(p, "utf8"));
  try {
    const parsed = JSON.parse(read(join5(deps.dir, CACHE_FILE2)));
    if (typeof parsed !== "object" || parsed === null)
      return { fresh: false };
    const entry = parsed;
    if (typeof entry.fetched_at !== "number")
      return { fresh: false };
    if (deps.now - entry.fetched_at > ttl)
      return { fresh: false };
    const identity = entry.identity;
    if (identity === null || identity === void 0)
      return { fresh: true, identity: null };
    if (typeof identity !== "object")
      return { fresh: false };
    const source = identity.source;
    if (source !== "native_claude" && source !== "native_codex")
      return { fresh: false };
    return { fresh: true, identity };
  } catch {
    return { fresh: false };
  }
}
function writeIdentityCache(deps) {
  const write = deps.writeFileImpl ?? ((p, data) => writeFileSync(p, data, { mode: 384 }));
  try {
    const entry = { identity: deps.identity, fetched_at: deps.now };
    write(join5(deps.dir, CACHE_FILE2), JSON.stringify(entry));
  } catch {
  }
}

// dist/shared/identity-resolver.mjs
var TENANT_KEY_PREFIXES = ["fs_live_t_", "fs_test_t_"];
function isTenantKey(credential) {
  return TENANT_KEY_PREFIXES.some((p) => credential.startsWith(p));
}
var GIT_TIMEOUT_MS = 200;
var IdentityResolver = class {
  dir;
  installPath;
  git;
  constructor(dir, git = defaultGitAccess()) {
    this.dir = dir;
    this.installPath = join6(dir, "install.json");
    this.git = git;
  }
  async resolve(cwd, opts) {
    const install_id = await this.loadOrCreateInstallId();
    const repo = await this.resolveRepoHash(cwd);
    const base = { install_id, ...repo };
    if (!opts)
      return base;
    if (!isTenantKey(opts.credential))
      return base;
    const record = await resolveIdentityRecord(this.dir, opts);
    const result = { ...base };
    if (record) {
      result.identity_source = record.source;
    }
    if (record) {
      const key = (opts.serverKeyLoader ?? (() => loadServerKey({ cacheDir: this.dir, now: opts.now ?? Date.now() })))();
      if (key.publicKeyPem.includes("BEGIN PUBLIC KEY")) {
        try {
          const sealer = opts.sealer ?? seal;
          const plaintext = Buffer.from(JSON.stringify({ v: 1, agent: opts.agent, ...record }), "utf8");
          result.secure_envelope = JSON.stringify(sealer(plaintext, { keyid: key.keyid, publicKeyPem: key.publicKeyPem }));
        } catch {
        }
      }
    }
    return result;
  }
  async resolveRepoHash(cwd) {
    const url = await this.git.gitRemoteUrl(cwd);
    if (!url)
      return {};
    return { repo_url_hash: createHash2("sha256").update(url, "utf8").digest("hex") };
  }
  async loadOrCreateInstallId() {
    return withDirLock(this.dir, async () => {
      const existing = await readInstallId(this.installPath);
      if (existing !== null)
        return existing;
      const install_id = randomUUID();
      const body = { install_id, created_at: (/* @__PURE__ */ new Date()).toISOString() };
      await writeInstallFile(this.installPath, body);
      return install_id;
    });
  }
};
async function readInstallId(path) {
  let buf;
  try {
    buf = await readFile2(path, "utf8");
  } catch {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(buf);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null)
    return null;
  const id = parsed.install_id;
  return typeof id === "string" && id.length > 0 ? id : null;
}
async function writeInstallFile(path, body) {
  const tmp = `${path}.${process.pid}.${randomBytes3(4).toString("hex")}.tmp`;
  let renamed = false;
  try {
    const fh = await open2(tmp, "wx", 384);
    try {
      await fh.writeFile(JSON.stringify(body));
      await fh.sync();
    } finally {
      await fh.close();
    }
    await rename2(tmp, path);
    renamed = true;
  } finally {
    if (!renamed) {
      try {
        await unlink2(tmp);
      } catch {
      }
    }
  }
}
function toResourceAttributes(id, opts) {
  const attrs = {
    "service.name": "fancysauce",
    "service.version": opts.pluginVersion,
    "fancysauce.schema_version": opts.schemaVersion,
    "fancysauce.install_id": id.install_id,
    "fancysauce.agent": opts.agent
  };
  if (id.identity_source)
    attrs["fancysauce.user.identity_source"] = id.identity_source;
  if (id.secure_envelope)
    attrs["fancysauce.secure_envelope"] = id.secure_envelope;
  return attrs;
}
async function resolveIdentityRecord(dir, opts) {
  const hint = opts.identity_hint;
  if (hint?.source === "mdm_file" && (hint.user_email || hint.user_upn)) {
    return {
      source: "mdm_file",
      ...hint.user_email ? { email: hint.user_email } : {},
      ...hint.user_upn ? { upn: hint.user_upn } : {}
    };
  }
  if (hint?.source === "plugin_login" && (hint.email || hint.account_id || hint.user_id || hint.org_id || hint.org_name || hint.plan)) {
    return {
      source: "plugin_login",
      ...hint.email ? { email: hint.email } : {},
      ...hint.account_id ? { account_id: hint.account_id } : {},
      ...hint.user_id ? { user_id: hint.user_id } : {},
      ...hint.org_id ? { org_id: hint.org_id } : {},
      ...hint.org_name ? { org_name: hint.org_name } : {},
      ...hint.plan ? { plan: hint.plan } : {}
    };
  }
  const now = opts.now ?? Date.now();
  const hit = readIdentityCache({ dir, now });
  let native;
  if (hit.fresh) {
    native = hit.identity;
  } else {
    native = (opts.nativeReader ?? readNativeIdentity)(opts.agent);
    writeIdentityCache({ dir, now, identity: native });
  }
  if (native) {
    const { source, ...rest } = native;
    return { source, ...rest };
  }
  const sources = opts.identitySources ?? {
    dsclEmail: () => readMacOsDsclEmail(),
    winUpn: () => readWindowsUpn(),
    gitEmail: () => readGitConfigEmail()
  };
  const dscl = await sources.dsclEmail?.();
  if (dscl)
    return { source: "dscl", email: dscl };
  const upn = await sources.winUpn?.();
  if (upn)
    return { source: "whoami_upn", upn, email: upn };
  const git = await sources.gitEmail?.();
  if (git)
    return { source: "git_config", email: git };
  return null;
}
function defaultGitAccess() {
  return {
    gitRemoteUrl: (cwd) => gitRead(["-C", cwd, "remote", "get-url", "origin"])
  };
}
function gitRead(args) {
  return new Promise((resolve) => {
    execFile2("git", args, { timeout: GIT_TIMEOUT_MS }, (err, stdout) => {
      if (err)
        return resolve(null);
      const trimmed = stdout.toString().trim();
      resolve(trimmed.length ? trimmed : null);
    });
  });
}

// dist/shared/queue.mjs
import { open as open3, stat as stat2 } from "node:fs/promises";
import { join as join7 } from "node:path";
var Queue = class {
  dir;
  path;
  capBytes;
  constructor(dir, capBytes) {
    this.dir = dir;
    this.path = join7(dir, "queue.ndjson");
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
      const fh = await open3(this.path, "a", 384);
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

// dist/shared/health.mjs
var import_proper_lockfile2 = __toESM(require_proper_lockfile(), 1);
import { mkdir as mkdir3, readFile as readFile3, rename as rename3, writeFile } from "node:fs/promises";
import { join as join8 } from "node:path";
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
    this.path = join8(dir, "health.json");
    this.tmp = `${this.path}.tmp`;
  }
  async read() {
    try {
      return { ...DEFAULT, ...JSON.parse(await readFile3(this.path, "utf8")) };
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
    await mkdir3(this.dir, { recursive: true });
    try {
      await readFile3(this.path);
    } catch {
      await writeFile(this.path, "{}", "utf8");
    }
    const release = await import_proper_lockfile2.default.lock(this.path, {
      retries: LOCK_RETRIES,
      realpath: false
    });
    try {
      const h = await this.read();
      mutate(h);
      await writeFile(this.tmp, JSON.stringify(h), "utf8");
      await rename3(this.tmp, this.path);
    } finally {
      await release();
    }
  }
};

// dist/shared/flusher.mjs
var import_proper_lockfile3 = __toESM(require_proper_lockfile(), 1);
import { appendFile, open as open4, readFile as readFile6, rename as rename6, writeFile as writeFile4 } from "node:fs/promises";
import { join as join11 } from "node:path";

// dist/shared/flush-cursor.mjs
import { readFile as readFile4, rename as rename4, writeFile as writeFile2 } from "node:fs/promises";
import { join as join9 } from "node:path";
var FlushCursor = class {
  dir;
  path;
  tmpPath;
  constructor(dir) {
    this.dir = dir;
    this.path = join9(dir, "flush_cursor.json");
    this.tmpPath = `${this.path}.tmp`;
  }
  async read() {
    try {
      const buf = await readFile4(this.path, "utf8");
      const parsed = JSON.parse(buf);
      return parsed.last_flushed_offset_bytes ?? 0;
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
        throw new Error(`FlushCursor.advance monotonic violation: ${offset} < ${current}`);
      }
      await this.write(offset);
    });
  }
  // Used by queue compaction: rewrites queue.ndjson to drop already-flushed
  // bytes, after which the cursor must restart at 0. Caller is expected to
  // hold the dir-lock for the rewrite + reset sequence.
  async resetUnlocked() {
    await this.write(0);
  }
  async write(offset) {
    const body = { last_flushed_offset_bytes: offset };
    await writeFile2(this.tmpPath, JSON.stringify(body), "utf8");
    await rename4(this.tmpPath, this.path);
  }
};

// dist/shared/backoff-state.mjs
import { mkdir as mkdir4, readFile as readFile5, rename as rename5, writeFile as writeFile3 } from "node:fs/promises";
import { join as join10 } from "node:path";
var DEFAULT2 = {
  consecutiveAuthFailures: 0,
  transientAttempts: 0
};
var MAX_BACKOFF_MS = 5 * 60 * 1e3;
var BASE_BACKOFF_MS = 1e3;
var BackoffState = class {
  dir;
  path;
  tmpPath;
  constructor(dir) {
    this.dir = dir;
    this.path = join10(dir, "backoff.json");
    this.tmpPath = `${this.path}.tmp`;
  }
  async read() {
    const f = await this.loadFile();
    return {
      nextRetryAt: f.nextRetryAt,
      consecutiveAuthFailures: f.consecutiveAuthFailures
    };
  }
  async setRetryAfter(retryAfterMs) {
    const bounded = Math.min(Math.max(0, retryAfterMs), MAX_BACKOFF_MS);
    await withDirLock(this.dir, async () => {
      const f = await this.loadFile();
      f.nextRetryAt = Date.now() + bounded;
      await this.save(f);
    });
  }
  async recordTransient() {
    return withDirLock(this.dir, async () => {
      const f = await this.loadFile();
      f.transientAttempts++;
      const base = BASE_BACKOFF_MS * 2 ** Math.min(f.transientAttempts, 10);
      const jitter = Math.random() * base * 0.3;
      const delayMs = Math.min(base + jitter, MAX_BACKOFF_MS);
      f.nextRetryAt = Date.now() + delayMs;
      await this.save(f);
      return f.nextRetryAt;
    });
  }
  async recordAuthFailure() {
    return withDirLock(this.dir, async () => {
      const f = await this.loadFile();
      f.consecutiveAuthFailures++;
      const base = BASE_BACKOFF_MS * 2 ** Math.min(f.consecutiveAuthFailures, 10);
      const jitter = Math.random() * base * 0.3;
      const delayMs = Math.min(base + jitter, MAX_BACKOFF_MS);
      f.nextRetryAt = Date.now() + delayMs;
      await this.save(f);
      return f.nextRetryAt;
    });
  }
  async resetAuthFailures() {
    await withDirLock(this.dir, async () => {
      const f = await this.loadFile();
      f.consecutiveAuthFailures = 0;
      await this.save(f);
    });
  }
  async clear() {
    await withDirLock(this.dir, async () => {
      const f = await this.loadFile();
      f.nextRetryAt = void 0;
      f.transientAttempts = 0;
      await this.save(f);
    });
  }
  async readConfigFingerprint() {
    const f = await this.loadFile();
    return { apiKeyHash: f.apiKeyHash, endpointHash: f.endpointHash };
  }
  // One-shot reset used when (api_key, endpoint) has changed under the
  // forwarder's feet. Clears the retry deadline, the transient counter, and
  // the auth-failure counter, then stamps the new fingerprint. Caller is
  // responsible for any queue-side action (drop vs. retain).
  async resetForConfigChange(fp) {
    await withDirLock(this.dir, async () => {
      const f = await this.loadFile();
      f.nextRetryAt = void 0;
      f.transientAttempts = 0;
      f.consecutiveAuthFailures = 0;
      f.apiKeyHash = fp.apiKeyHash;
      f.endpointHash = fp.endpointHash;
      await this.save(f);
    });
  }
  // Initialize the fingerprint without touching counters. Used on the first
  // flush after this code lands (no prior fingerprint stored), where the
  // counters may already reflect legitimate transient failures we don't want
  // to clear just because we're stamping the file for the first time.
  async initConfigFingerprint(fp) {
    await withDirLock(this.dir, async () => {
      const f = await this.loadFile();
      f.apiKeyHash = fp.apiKeyHash;
      f.endpointHash = fp.endpointHash;
      await this.save(f);
    });
  }
  async loadFile() {
    try {
      const buf = await readFile5(this.path, "utf8");
      return { ...DEFAULT2, ...JSON.parse(buf) };
    } catch (err) {
      if (err.code === "ENOENT") {
        return { ...DEFAULT2 };
      }
      throw err;
    }
  }
  async save(f) {
    await mkdir4(this.dir, { recursive: true });
    await writeFile3(this.tmpPath, JSON.stringify(f), "utf8");
    await rename5(this.tmpPath, this.path);
  }
};

// dist/shared/forwarder.mjs
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { gzip } from "node:zlib";
import { promisify } from "node:util";
var gzipAsync = promisify(gzip);
var DEFAULT_TIMEOUT_MS = 1e3;
var MAX_RESPONSE_BYTES = 64 * 1024;
async function postBatch(input) {
  let body = input.bodyBytes;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${input.credential}`
  };
  if (input.gzip) {
    body = await gzipAsync(body);
    headers["Content-Encoding"] = "gzip";
  }
  headers["Content-Length"] = String(body.length);
  const base = input.endpoint.endsWith("/") ? input.endpoint : `${input.endpoint}/`;
  const url = new URL("v1/logs", base);
  const fn = url.protocol === "https:" ? httpsRequest : httpRequest;
  return await new Promise((resolve) => {
    let settled = false;
    const settle = (r) => {
      if (settled)
        return;
      settled = true;
      resolve(r);
    };
    const req = fn(url, { method: "POST", headers, timeout: input.timeoutMs ?? DEFAULT_TIMEOUT_MS }, (res) => {
      const chunks = [];
      let received = 0;
      let truncated = false;
      const finalize = () => {
        const status = res.statusCode ?? 0;
        settle(classify(status, res.headers["retry-after"], Buffer.concat(chunks).toString("utf8")));
      };
      res.on("data", (c) => {
        if (truncated)
          return;
        const remaining = MAX_RESPONSE_BYTES - received;
        if (c.length <= remaining) {
          chunks.push(c);
          received += c.length;
          return;
        }
        if (remaining > 0) {
          chunks.push(c.subarray(0, remaining));
          received += remaining;
        }
        truncated = true;
        req.destroy();
        finalize();
      });
      res.on("end", finalize);
    });
    req.on("timeout", () => {
      req.destroy(new Error("request timeout"));
    });
    req.on("error", (err) => settle({ kind: "transient", status: 0, error: err.message }));
    req.write(body);
    req.end();
  });
}
function extractRebind(body) {
  if (!body)
    return void 0;
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    return void 0;
  }
  if (typeof parsed !== "object" || parsed === null)
    return void 0;
  const o = parsed;
  if (!o.rebind || typeof o.rebind !== "object")
    return void 0;
  return o.rebind;
}
function classify(status, retryAfter, bodyRaw) {
  if (status === 200 || status === 202) {
    const rebind = extractRebind(bodyRaw);
    return rebind ? { kind: "ok", status, rebind } : { kind: "ok", status };
  }
  if (status === 400) {
    let reason = "";
    try {
      reason = String(JSON.parse(bodyRaw).error ?? "");
    } catch {
    }
    return { kind: "drop", status: 400, reason };
  }
  if (status === 401 || status === 403)
    return { kind: "auth-failed", status };
  if (status === 413) {
    let maxBytes;
    try {
      maxBytes = JSON.parse(bodyRaw).max_bytes;
    } catch {
    }
    return { kind: "too-large", status: 413, maxBytes };
  }
  if (status === 429) {
    const retryAfterMs = parseRetryAfter(retryAfter) ?? 6e4;
    return { kind: "rate-limited", status: 429, retryAfterMs };
  }
  return { kind: "transient", status, error: `HTTP ${status}` };
}
function parseRetryAfter(h) {
  if (!h)
    return null;
  const value = Array.isArray(h) ? h[0] : h;
  const secs = Number(value);
  if (Number.isFinite(secs))
    return Math.max(0, secs) * 1e3;
  const ms = Date.parse(value);
  if (Number.isFinite(ms))
    return Math.max(0, ms - Date.now());
  return null;
}

// dist/shared/otlp-encoder.mjs
var ATTR_DENY = /* @__PURE__ */ new Set([
  "cwd",
  "agent_transcript_path",
  "last_assistant_message",
  "tool_input_raw",
  "tool_response_raw",
  "prompt",
  "description"
]);
var ATTR_TYPE = {
  // core attrs (every event)
  "fancysauce.event_uuid": "string",
  "fancysauce.event_type": "string",
  "fancysauce.session_id": "string",
  "fancysauce.source": "string",
  "fancysauce.sequence": "int",
  // session.start
  model: "string",
  permission_mode: "string",
  "fancysauce.repo_url_hash": "string",
  // session.end
  reason: "string",
  duration_wall_s: "int",
  // prompt.submit
  prompt_length: "int",
  slash_command: "string",
  // tool_call.{start,complete,failed}
  tool_name: "string",
  skill_name: "string",
  tool_input_hash: "string",
  input_size_bytes: "int",
  response_size_bytes: "int",
  success: "bool",
  correlation_id: "string",
  // subagent.{start,complete}
  agent_id: "string",
  agent_type: "string",
  // api.request
  cost_usd: "double",
  tokens_input: "int",
  tokens_output: "int",
  tokens_cache_read: "int",
  tokens_cache_create: "int",
  tokens_cache_create_5m: "int",
  tokens_cache_create_1h: "int",
  tokens_reasoning: "int",
  request_id: "string",
  transcript_message_uuid: "string",
  stop_reason: "string",
  // notification
  notification_type: "string",
  // task.completed
  task_id: "string",
  // subagent capture: subsession_id stamped on tool_call/api.request when
  // a hook fires inside a Task subagent; cwd_hash replaces raw cwd on
  // session.start; last_assistant_message_{size_bytes,hash} ride on
  // subagent.complete (size+hash, never the body — wire-content principle).
  subsession_id: "string",
  cwd_hash: "string",
  last_assistant_message_size_bytes: "int",
  last_assistant_message_hash: "string",
  // usage_config.changed
  plan_type: "string",
  rate_limit_tier: "string",
  billing_type: "string",
  extra_usage_enabled: "bool",
  extra_usage_disabled_reason: "string",
  overage_credit_available: "bool",
  overage_credit_eligible: "bool",
  // usage_limit.exceeded
  limit_message: "string",
  limit_kind_guess: "string",
  reset_at_guess: "int",
  api_error_status: "int",
  // request_id + transcript_message_uuid already typed above (api.request).
  // usage_limit.snapshot + Codex rate-limit lens
  window: "string",
  used_percent: "double",
  resets_at: "int",
  window_minutes: "int",
  reached_type: "string",
  limit_source: "string",
  credits_has: "bool",
  credits_unlimited: "bool",
  credits_balance: "string",
  auth_plan_claim: "string",
  // Codex per-window gauge riding api.request. Prefixed per window because a
  // payload can report primary and secondary at once.
  primary_used_percent: "double",
  primary_resets_at: "int",
  primary_window_minutes: "int",
  secondary_used_percent: "double",
  secondary_resets_at: "int",
  secondary_window_minutes: "int"
};
function encodeOtlp(events, resource, observedTimeUnixNano) {
  const observed = observedTimeUnixNano ?? BigInt(Date.now()) * 1000000n;
  return {
    resourceLogs: [
      {
        resource: { attributes: encodeResourceAttributes(resource) },
        scopeLogs: [
          {
            scope: { name: "fancysauce.plugin", version: resource["service.version"] },
            logRecords: events.map((e) => encodeLogRecord(e, observed))
          }
        ]
      }
    ]
  };
}
function encodeResourceAttributes(r) {
  const out = [];
  const order = [
    "service.name",
    "service.version",
    "fancysauce.schema_version",
    "fancysauce.install_id",
    "fancysauce.agent",
    "fancysauce.user.identity_source",
    "fancysauce.secure_envelope"
  ];
  for (const key of order) {
    const v = r[key];
    if (v === void 0)
      continue;
    out.push({ key, value: { stringValue: String(v) } });
  }
  return out;
}
function encodeLogRecord(event, observedTimeUnixNano) {
  const attrs = [
    { key: "fancysauce.event_uuid", value: encodeAnyValue("fancysauce.event_uuid", event.event_uuid) },
    { key: "fancysauce.event_type", value: encodeAnyValue("fancysauce.event_type", event.event_type) },
    { key: "fancysauce.session_id", value: encodeAnyValue("fancysauce.session_id", event.session_id) },
    { key: "fancysauce.source", value: encodeAnyValue("fancysauce.source", event.source) },
    { key: "fancysauce.sequence", value: encodeAnyValue("fancysauce.sequence", event.sequence) }
  ];
  for (const [key, val] of Object.entries(event.attributes)) {
    attrs.push({ key, value: encodeAnyValue(key, val) });
  }
  return {
    timeUnixNano: event.timestamp_ns.toString(),
    observedTimeUnixNano: observedTimeUnixNano.toString(),
    severityNumber: 9,
    attributes: attrs
  };
}
function encodeAnyValue(key, v) {
  if (ATTR_DENY.has(key)) {
    throw new Error(`Attribute ${key} is denied for privacy and must not appear on the wire`);
  }
  const type = ATTR_TYPE[key];
  if (!type) {
    throw new Error(`Unknown attribute key: ${key} (add to ATTR_TYPE)`);
  }
  switch (type) {
    case "string":
      return { stringValue: String(v) };
    case "bool":
      return { boolValue: Boolean(v) };
    case "int":
      if (typeof v === "bigint")
        return { intValue: v.toString() };
      if (typeof v === "number" && Number.isFinite(v))
        return { intValue: String(Math.trunc(v)) };
      throw new Error(`Attribute ${key} typed int requires number|bigint, got ${typeof v}`);
    case "double":
      if (typeof v === "number" && Number.isFinite(v))
        return { doubleValue: v };
      if (typeof v === "bigint")
        return { doubleValue: Number(v) };
      throw new Error(`Attribute ${key} typed double requires number|bigint, got ${typeof v}`);
  }
}

// dist/shared/config-fingerprint.mjs
import { createHash as createHash3 } from "node:crypto";
function fingerprint(value) {
  return createHash3("sha256").update(value).digest("hex").slice(0, 16);
}

// dist/shared/flusher.mjs
var DEFAULT_MAX_EVENTS = 100;
var DEFAULT_MAX_BYTES = 1e6;
var MIN_POST_TIMEOUT_MS = 100;
var COMPACT_THRESHOLD_BYTES = 1e6;
async function tryFlush(input) {
  const start = Date.now();
  const deadline = start + input.budgetMs;
  const queuePath = join11(input.dataDir, "queue.ndjson");
  const flushLockPath = join11(input.dataDir, ".flush.lock");
  const backoff = new BackoffState(input.dataDir);
  const cursor = new FlushCursor(input.dataDir);
  const health = new HealthState(input.stateDir);
  if (!input.credential) {
    return { skipped: true, reason: "no credential present" };
  }
  await reconcileConfigFingerprint(input, backoff, cursor, queuePath);
  const b = await backoff.read();
  if (b.nextRetryAt && b.nextRetryAt > Date.now()) {
    return { skipped: true, reason: "backoff deadline in future" };
  }
  try {
    await readFile6(flushLockPath);
  } catch {
    const fh = await open4(flushLockPath, "a");
    await fh.close();
  }
  let release;
  try {
    release = await import_proper_lockfile3.default.lock(flushLockPath, { retries: 0, realpath: false });
  } catch {
    return { skipped: true, reason: "flush lock held by another hook" };
  }
  try {
    let startOffset = await cursor.read();
    let batch = await readBatch(queuePath, startOffset, input.batchMaxEvents ?? DEFAULT_MAX_EVENTS, input.batchMaxBytes ?? DEFAULT_MAX_BYTES);
    if (batch.events.length === 0 && batch.cursorPastEof) {
      await appendFile(join11(input.dataDir, "collect-error.log"), `${(/* @__PURE__ */ new Date()).toISOString()} fancysauce: flush cursor (${startOffset}) past queue EOF (${batch.queueSize}); resetting (at-least-once dedup applies)
`).catch(() => {
      });
      await cursor.resetUnlocked();
      startOffset = 0;
      batch = await readBatch(queuePath, 0, input.batchMaxEvents ?? DEFAULT_MAX_EVENTS, input.batchMaxBytes ?? DEFAULT_MAX_BYTES);
    }
    const { events, endOffset } = batch;
    if (events.length === 0) {
      return { skipped: false, eventsFlushed: 0, bytesAdvanced: 0 };
    }
    if (Date.now() + 500 > deadline) {
      return { skipped: true, reason: "budget exhausted before post" };
    }
    let envelope;
    try {
      envelope = encodeOtlp(events, input.resource);
    } catch (err) {
      await appendFile(join11(input.dataDir, "collect-error.log"), `${(/* @__PURE__ */ new Date()).toISOString()} fancysauce: encoder rejected batch of ${events.length} events (cursor ${startOffset}\u2192${endOffset}); dropping: ${err.message}
`).catch(() => {
      });
      await cursor.advance(endOffset);
      await maybeCompact(input.dataDir, cursor, queuePath);
      return { skipped: false, outcome: "drop", eventsFlushed: events.length, bytesAdvanced: endOffset - startOffset };
    }
    const bodyBytes = Buffer.from(JSON.stringify(envelope), "utf8");
    const remainingMs = deadline - Date.now();
    if (remainingMs < MIN_POST_TIMEOUT_MS) {
      return { skipped: true, reason: "budget exhausted after encode" };
    }
    const result = await postBatch({
      endpoint: input.endpoint,
      credential: input.credential,
      bodyBytes,
      gzip: bodyBytes.length > 8192,
      timeoutMs: Math.min(1e3, remainingMs)
    });
    await health.recordFlush(result.kind);
    switch (result.kind) {
      case "ok":
        await cursor.advance(endOffset);
        await backoff.clear();
        await backoff.resetAuthFailures();
        if (result.rebind)
          await logRebind(input.dataDir, result.rebind);
        await maybeCompact(input.dataDir, cursor, queuePath);
        return { skipped: false, outcome: "ok", eventsFlushed: events.length, bytesAdvanced: endOffset - startOffset };
      case "drop":
        await cursor.advance(endOffset);
        await maybeCompact(input.dataDir, cursor, queuePath);
        return { skipped: false, outcome: "drop", eventsFlushed: events.length, bytesAdvanced: endOffset - startOffset };
      case "auth-failed":
        await backoff.recordAuthFailure();
        return { skipped: false, outcome: "auth-failed" };
      case "too-large":
        return { skipped: false, outcome: "too-large" };
      case "rate-limited":
        await backoff.setRetryAfter(result.retryAfterMs);
        return { skipped: false, outcome: "rate-limited" };
      case "transient":
        await backoff.recordTransient();
        return { skipped: false, outcome: "transient" };
      default: {
        const _exhaustive = result;
        throw new Error(`unhandled PostResult kind: ${JSON.stringify(_exhaustive)}`);
      }
    }
  } finally {
    await release();
  }
}
async function readBatch(queuePath, startOffset, maxEvents, maxBytes) {
  let fh = null;
  try {
    try {
      fh = await open4(queuePath, "r");
    } catch {
      return { events: [], endOffset: startOffset };
    }
    const stat5 = await fh.stat();
    if (stat5.size < startOffset)
      return { events: [], endOffset: startOffset, cursorPastEof: true, queueSize: stat5.size };
    if (stat5.size <= startOffset)
      return { events: [], endOffset: startOffset };
    const toRead = Math.min(stat5.size - startOffset, maxBytes);
    const buf = Buffer.alloc(toRead);
    await fh.read(buf, 0, toRead, startOffset);
    const lastNl = buf.lastIndexOf("\n".charCodeAt(0));
    if (lastNl < 0)
      return { events: [], endOffset: startOffset };
    const usable = buf.slice(0, lastNl + 1).toString("utf8");
    const events = [];
    let consumedBytes = 0;
    let cursorBytes = 0;
    for (const line of usable.split("\n")) {
      if (line.length === 0) {
        continue;
      }
      const lineBytes = Buffer.byteLength(line, "utf8") + 1;
      consumedBytes += lineBytes;
      if (events.length >= maxEvents)
        break;
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        cursorBytes = consumedBytes;
        continue;
      }
      const ev = revive(parsed);
      if (ev)
        events.push(ev);
      cursorBytes = consumedBytes;
    }
    return { events, endOffset: startOffset + cursorBytes };
  } finally {
    if (fh)
      await fh.close();
  }
}
async function maybeCompact(dataDir2, cursor, queuePath) {
  const flushedOffset = await cursor.read();
  if (flushedOffset < COMPACT_THRESHOLD_BYTES)
    return;
  await withDirLock(dataDir2, async () => {
    let fh = null;
    try {
      try {
        fh = await open4(queuePath, "r");
      } catch {
        return;
      }
      const stat5 = await fh.stat();
      if (flushedOffset >= stat5.size) {
        await fh.close();
        fh = null;
        await cursor.resetUnlocked();
        await writeFile4(queuePath, "");
        return;
      }
      const tailLen = stat5.size - flushedOffset;
      const buf = Buffer.alloc(tailLen);
      await fh.read(buf, 0, tailLen, flushedOffset);
      await fh.close();
      fh = null;
      const tmpPath = `${queuePath}.compact.tmp`;
      await writeFile4(tmpPath, buf);
      await cursor.resetUnlocked();
      await rename6(tmpPath, queuePath);
    } finally {
      if (fh)
        await fh.close();
    }
  });
}
async function reconcileConfigFingerprint(input, backoff, cursor, queuePath) {
  const current = {
    apiKeyHash: fingerprint(input.credential),
    endpointHash: fingerprint(input.endpoint)
  };
  const stored = await backoff.readConfigFingerprint();
  if (!stored.apiKeyHash || !stored.endpointHash) {
    await backoff.initConfigFingerprint(current);
    return;
  }
  if (stored.apiKeyHash === current.apiKeyHash && stored.endpointHash === current.endpointHash) {
    return;
  }
  if (stored.apiKeyHash !== current.apiKeyHash) {
    await dropQueue(input.dataDir, queuePath, cursor);
  }
  await backoff.resetForConfigChange(current);
}
var REBIND_LOG_BODY_BUDGET = 256;
async function logRebind(dataDir2, rebind) {
  const body = JSON.stringify(rebind);
  const truncated = body.length > REBIND_LOG_BODY_BUDGET ? `${body.slice(0, REBIND_LOG_BODY_BUDGET)}...[truncated ${body.length - REBIND_LOG_BODY_BUDGET}B]` : body;
  const line = `${(/* @__PURE__ */ new Date()).toISOString()} fancysauce: rebind directive received and ignored (v0.5.0 closed-schema): ${truncated}
`;
  await appendFile(join11(dataDir2, "collect-error.log"), line).catch(() => {
  });
}
async function dropQueue(dataDir2, queuePath, cursor) {
  await withDirLock(dataDir2, async () => {
    await cursor.resetUnlocked();
    await writeFile4(queuePath, "");
  });
}
function revive(v) {
  if (typeof v !== "object" || v === null)
    return null;
  const o = v;
  if (typeof o.event_uuid !== "string")
    return null;
  if (typeof o.event_type !== "string")
    return null;
  if (typeof o.session_id !== "string")
    return null;
  if (typeof o.source !== "string")
    return null;
  if (typeof o.sequence !== "number")
    return null;
  if (typeof o.timestamp_ns !== "string" && typeof o.timestamp_ns !== "bigint")
    return null;
  if (typeof o.attributes !== "object" || o.attributes === null)
    return null;
  return {
    event_uuid: o.event_uuid,
    event_type: o.event_type,
    session_id: o.session_id,
    source: o.source,
    sequence: o.sequence,
    timestamp_ns: typeof o.timestamp_ns === "bigint" ? o.timestamp_ns : BigInt(o.timestamp_ns),
    attributes: o.attributes
  };
}

// dist/shared/hook-budget.mjs
function remainingFlushBudgetMs(hookBudgetMs, elapsedMs, marginMs) {
  const remaining = hookBudgetMs - elapsedMs - marginMs;
  return remaining > 0 ? remaining : 0;
}

// dist/shared/sinks/index.mjs
async function runSinks(sinks, events, ctx, onError = defaultOnError) {
  if (events.length === 0)
    return;
  for (const sink of sinks) {
    try {
      await sink.onEvents(events, ctx);
    } catch (err) {
      await onError(sink.name, err);
    }
  }
}
function defaultOnError(_name, _err) {
}

// dist/shared/sinks/event-log.mjs
import { appendFile as appendFile2 } from "node:fs/promises";
import { join as join12 } from "node:path";
function eventLogSink() {
  return {
    name: "event-log",
    async onEvents(events, ctx) {
      const path = join12(ctx.sessionDir, "events.v1.jsonl");
      const body = events.map(serialize).join("\n") + "\n";
      await appendFile2(path, body, { encoding: "utf8", mode: 384 });
    }
  };
}
function serialize(e) {
  return JSON.stringify({
    event_uuid: e.event_uuid,
    event_type: e.event_type,
    session_id: e.session_id,
    source: e.source,
    sequence: e.sequence,
    timestamp_ns: e.timestamp_ns.toString(),
    attributes: e.attributes
  });
}

// dist/shared/sinks/summary-updater.mjs
import { readFile as readFile7, writeFile as writeFile5, rename as rename7, mkdir as mkdir5 } from "node:fs/promises";
import { join as join13, dirname as dirname3 } from "node:path";

// dist/shared/sinks/coalescers.mjs
function initialSummary(sessionId, startTs, version) {
  return {
    schema_version: 1,
    session_id: sessionId,
    start_ts: startTs,
    last_updated_ts: startTs,
    duration_wall_s: 0,
    active: true,
    end_reason: null,
    fancysauce_version: version,
    install_id: "",
    cwd_hash: "",
    repo_url_hash: "",
    event_count: 0,
    event_counts_by_type: {},
    model: { primary: "", observations: {} },
    cost: {
      total_cost_usd: 0,
      tokens: { input: 0, output: 0, cache_read: 0, cache_create_5m: 0, cache_create_1h: 0 },
      avg_cache_hit_rate: 0,
      api_requests: 0
    },
    tools: { call_counts: {}, failed_calls: 0 },
    subagents: { count: 0, by_type: {} },
    skills: { slash_commands: {}, skill_invocations: {} }
  };
}
function applyEvent(s, e) {
  const next = applyUniversalUpdates(s, e);
  const a = e.attributes;
  switch (e.event_type) {
    case "session.start":
      return applySessionStart(next, a);
    case "session.end":
      return applySessionEnd(next, a);
    case "prompt.submit":
      return applyPromptSubmit(next, a);
    case "tool_call.start":
      return applyToolCallStart(next, a);
    case "tool_call.failed":
      return applyToolCallFailed(next);
    case "api.request":
      return applyApiRequest(next, a);
    case "subagent.start":
      return applySubagentStart(next, a);
    default:
      return next;
  }
}
function applyUniversalUpdates(s, e) {
  const eventCount = s.event_count + 1;
  const counts = { ...s.event_counts_by_type };
  counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;
  const lastUpdatedTs = new Date(Number(e.timestamp_ns / 1000000n)).toISOString();
  const startMs = Date.parse(s.start_ts);
  const lastMs = Date.parse(lastUpdatedTs);
  const durationS = Math.max(0, Math.floor((lastMs - startMs) / 1e3));
  return {
    ...s,
    event_count: eventCount,
    event_counts_by_type: counts,
    last_updated_ts: lastUpdatedTs,
    duration_wall_s: durationS
  };
}
function applySessionStart(s, a) {
  const model = typeof a.model === "string" ? a.model : "";
  return {
    ...s,
    cwd_hash: typeof a.cwd_hash === "string" ? a.cwd_hash : s.cwd_hash,
    repo_url_hash: typeof a["fancysauce.repo_url_hash"] === "string" ? a["fancysauce.repo_url_hash"] : s.repo_url_hash,
    model: model ? bumpModel(s.model, model, true) : s.model
  };
}
function applySessionEnd(s, a) {
  return {
    ...s,
    active: false,
    end_reason: typeof a.reason === "string" ? a.reason : null
  };
}
function applyPromptSubmit(s, a) {
  if (typeof a.slash_command === "string" && a.slash_command) {
    return {
      ...s,
      skills: {
        ...s.skills,
        slash_commands: bumpCount(s.skills.slash_commands, a.slash_command)
      }
    };
  }
  return s;
}
function applyToolCallStart(s, a) {
  const toolName = typeof a.tool_name === "string" ? a.tool_name : "";
  const skillName = typeof a.skill_name === "string" ? a.skill_name : "";
  return {
    ...s,
    tools: { ...s.tools, call_counts: toolName ? bumpCount(s.tools.call_counts, toolName) : s.tools.call_counts },
    skills: {
      ...s.skills,
      skill_invocations: skillName ? bumpCount(s.skills.skill_invocations, skillName) : s.skills.skill_invocations
    }
  };
}
function applyToolCallFailed(s) {
  return { ...s, tools: { ...s.tools, failed_calls: s.tools.failed_calls + 1 } };
}
function applyApiRequest(s, a) {
  const cost = typeof a.cost_usd === "number" ? a.cost_usd : 0;
  const tokIn = typeof a.tokens_input === "number" ? a.tokens_input : 0;
  const tokOut = typeof a.tokens_output === "number" ? a.tokens_output : 0;
  const cacheRead = typeof a.tokens_cache_read === "number" ? a.tokens_cache_read : 0;
  const cache5m = typeof a.tokens_cache_create_5m === "number" ? a.tokens_cache_create_5m : 0;
  const cache1h = typeof a.tokens_cache_create_1h === "number" ? a.tokens_cache_create_1h : 0;
  const model = typeof a.model === "string" ? a.model : "";
  const newTokens = {
    input: s.cost.tokens.input + tokIn,
    output: s.cost.tokens.output + tokOut,
    cache_read: s.cost.tokens.cache_read + cacheRead,
    cache_create_5m: s.cost.tokens.cache_create_5m + cache5m,
    cache_create_1h: s.cost.tokens.cache_create_1h + cache1h
  };
  const denom = newTokens.input + newTokens.cache_read + newTokens.cache_create_5m + newTokens.cache_create_1h;
  const avgHit = denom > 0 ? newTokens.cache_read / denom : 0;
  return {
    ...s,
    model: model ? bumpModel(s.model, model, !s.model.primary) : s.model,
    cost: {
      total_cost_usd: s.cost.total_cost_usd + cost,
      tokens: newTokens,
      avg_cache_hit_rate: avgHit,
      api_requests: s.cost.api_requests + 1
    }
  };
}
function applySubagentStart(s, a) {
  const at = typeof a.agent_type === "string" ? a.agent_type : "";
  return {
    ...s,
    subagents: {
      count: s.subagents.count + 1,
      by_type: at ? bumpCount(s.subagents.by_type, at) : s.subagents.by_type
    }
  };
}
function bumpCount(m, key) {
  return { ...m, [key]: (m[key] ?? 0) + 1 };
}
function bumpModel(model, name, setPrimary) {
  return {
    primary: setPrimary && !model.primary ? name : model.primary || name,
    observations: bumpCount(model.observations, name)
  };
}

// dist/shared/sinks/summary-updater.mjs
function summaryUpdaterSink(opts) {
  return {
    name: "summary-updater",
    async onEvents(events, ctx) {
      const path = join13(ctx.sessionDir, "summary.json");
      await withDirLock(ctx.sessionDir, async () => {
        let summary;
        try {
          const raw = await readFile7(path, "utf8");
          summary = JSON.parse(raw);
        } catch (err) {
          if (err.code !== "ENOENT")
            throw err;
          const startTs = new Date(Number(events[0].timestamp_ns / 1000000n)).toISOString();
          summary = initialSummary(ctx.sessionId, startTs, opts.pluginVersion);
        }
        for (const e of events)
          summary = applyEvent(summary, e);
        await mkdir5(dirname3(path), { recursive: true, mode: 448 });
        const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2, 10)}.tmp`;
        await writeFile5(tmp, JSON.stringify(summary), { encoding: "utf8", mode: 384 });
        await rename7(tmp, path);
      });
    }
  };
}

// dist/shared/sinks/session-index.mjs
import { readFile as readFile8, writeFile as writeFile6, rename as rename8, mkdir as mkdir6, rm } from "node:fs/promises";
import { join as join14, dirname as dirname4 } from "node:path";

// dist/shared/session-id.mjs
var SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
function isValidSessionId(s) {
  return typeof s === "string" && SESSION_ID_RE.test(s);
}

// dist/shared/sinks/session-index.mjs
var DEFAULT_MAX_ENTRIES = 100;
var DEFAULT_RETENTION_DAYS = 90;
function sessionIndexSink(opts = {}) {
  const maxEntries = opts.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const retentionDays = opts.retentionDays ?? DEFAULT_RETENTION_DAYS;
  return {
    name: "session-index",
    async onEvents(events, ctx) {
      const relevant = events.filter((e) => e.event_type === "session.start" || e.event_type === "session.end" || e.event_type === "stop");
      if (relevant.length === 0)
        return;
      await withDirLock(ctx.dataDir, async () => {
        const indexPath = join14(ctx.dataDir, "session-index.json");
        let idx;
        try {
          idx = JSON.parse(await readFile8(indexPath, "utf8"));
        } catch (err) {
          if (err.code !== "ENOENT")
            throw err;
          idx = { schema_version: 1, updated_ts: (/* @__PURE__ */ new Date()).toISOString(), sessions: [] };
        }
        const summaryPath = join14(ctx.sessionDir, "summary.json");
        let summary = null;
        try {
          summary = JSON.parse(await readFile8(summaryPath, "utf8"));
        } catch (err) {
          if (err.code !== "ENOENT")
            throw err;
        }
        if (!summary)
          return;
        if (!isValidSessionId(summary.session_id))
          return;
        const entry = {
          session_id: summary.session_id,
          start_ts: summary.start_ts,
          end_ts: summary.active ? null : summary.last_updated_ts,
          duration_wall_s: summary.duration_wall_s,
          active: summary.active,
          end_reason: summary.end_reason,
          total_cost_usd: summary.cost.total_cost_usd,
          event_count: summary.event_count,
          summary_path: `sessions/${summary.session_id}/summary.json`
        };
        const existing = idx.sessions.findIndex((s) => s.session_id === summary.session_id);
        if (existing >= 0)
          idx.sessions[existing] = entry;
        else
          idx.sessions.unshift(entry);
        idx.sessions.sort((a, b) => b.start_ts.localeCompare(a.start_ts));
        const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1e3;
        const expired = [];
        const kept = [];
        for (const s of idx.sessions) {
          if (s.active) {
            kept.push(s);
            continue;
          }
          const sMs = Date.parse(s.start_ts);
          if (Number.isFinite(sMs) && sMs < cutoff)
            expired.push(s);
          else
            kept.push(s);
        }
        idx.sessions = kept.slice(0, maxEntries);
        if (kept.length > maxEntries) {
          for (const s of kept.slice(maxEntries)) {
            if (!s.active)
              expired.push(s);
          }
        }
        for (const s of expired) {
          if (!isValidSessionId(s.session_id))
            continue;
          await rm(join14(ctx.dataDir, "sessions", s.session_id), { recursive: true, force: true });
        }
        idx.updated_ts = (/* @__PURE__ */ new Date()).toISOString();
        await mkdir6(dirname4(indexPath), { recursive: true, mode: 448 });
        const tmp = `${indexPath}.${process.pid}.${Math.random().toString(36).slice(2, 10)}.tmp`;
        await writeFile6(tmp, JSON.stringify(idx), { encoding: "utf8", mode: 384 });
        await rename8(tmp, indexPath);
      });
    }
  };
}

// dist/shared/schema-version.mjs
var SCHEMA_VERSION = "1.1.0";

// dist/shared/run-collect.mjs
var HOOK_BUDGET_MS = 1800;
var FLUSH_MARGIN_MS = 200;
var QUEUE_CAP_BYTES = 100 * 1024 * 1024;
function pluginVersion() {
  try {
    const candidatePaths = [
      join19(import.meta.dirname, "../../../package.json"),
      join19(process.cwd(), "package.json")
    ];
    for (const p of candidatePaths) {
      try {
        const pkg = JSON.parse(readFileSync5(p, "utf8"));
        if (pkg.version)
          return pkg.version;
      } catch {
      }
    }
  } catch {
  }
  return "0.0.0";
}
function dataDir() {
  return resolveDataDir();
}
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
async function runCollect(adapter, opts) {
  const start = Date.now();
  let stderrBuf = "";
  const writeStderr = (s) => {
    stderrBuf += s;
  };
  try {
    const config = await loadConfig({ endpointOverride: opts.endpointOverride }) ?? {
      credential: "",
      endpoint: INGEST_ENDPOINT,
      loginStateDir: resolveLoginStateDir(),
      policy: defaultPolicy()
    };
    if (config.credentialError) {
      const msg = config.credentialError.source === "system" ? `fancysauce: managed credential at ${credentialPaths().system} is malformed (${config.credentialError.reason}); contact administrator.
` : `fancysauce: user credential is malformed (${config.credentialError.reason}). Run /fancysauce:login.
`;
      writeStderr(msg);
    }
    const hookPayload = opts.hookPayload;
    const root = dataDir();
    await mkdir10(root, { recursive: true, mode: 448 });
    const identity = await new IdentityResolver(root).resolve(hookPayload.cwd ?? process.cwd(), {
      credential: config.credential,
      identity_hint: config.identity_hint ?? null,
      agent: adapter.agent
    });
    const resource = toResourceAttributes(identity, {
      pluginVersion: pluginVersion(),
      schemaVersion: SCHEMA_VERSION,
      agent: adapter.agent
    });
    const enrichedRaw = await adapter.mapHookEvent(hookPayload);
    const stamped = enrichedRaw && enrichedRaw.event_type === "session.start" && identity.repo_url_hash ? { ...enrichedRaw, attributes: { ...enrichedRaw.attributes, "fancysauce.repo_url_hash": identity.repo_url_hash } } : enrichedRaw;
    const withId = stamped === null ? null : { ...stamped, event_uuid: randomUUID2() };
    const primary = withId === null ? null : filterEvent(withId, config.policy);
    let primaryPending = primary;
    const outboundDir = join19(root, "outbound");
    await mkdir10(outboundDir, { recursive: true, mode: 448 });
    const queue = new Queue(outboundDir, QUEUE_CAP_BYTES);
    let queueDropped = 0;
    let tailFilterDropped = 0;
    const ctx = {
      stateDir: join19(root, "state"),
      errorLogPath: join19(root, "collect-error.log"),
      transcriptRoot: opts.transcriptRoot
    };
    const sinkEvents = [];
    await adapter.tailTranscript(hookPayload, ctx, async (tailEvents) => {
      const { filtered: filteredTail, dropped: tailDropped } = filterEvents(tailEvents, config.policy);
      tailFilterDropped += tailDropped;
      const p = primaryPending;
      primaryPending = null;
      const all = p ? [p, ...filteredTail] : filteredTail;
      if (all.length === 0)
        return;
      const result = await enqueueEvents(queue, all);
      queueDropped += result.dropped;
      sinkEvents.push(...all);
    });
    if (sinkEvents.length > 0) {
      const sessionDir = join19(root, "sessions", hookPayload.session_id);
      const onSinkError = async (name, err) => {
        const msg = err instanceof Error ? err.stack ?? err.message : String(err);
        try {
          await appendFile3(join19(root, "collect-error.log"), `${(/* @__PURE__ */ new Date()).toISOString()} sink ${name}: ${msg}
`);
        } catch {
        }
      };
      try {
        await mkdir10(sessionDir, { recursive: true, mode: 448 });
        const sinks = [
          eventLogSink(),
          summaryUpdaterSink({ pluginVersion: pluginVersion() }),
          sessionIndexSink()
        ];
        await runSinks(sinks, sinkEvents, {
          dataDir: root,
          sessionDir,
          sessionId: hookPayload.session_id
        }, onSinkError);
      } catch (err) {
        await onSinkError("session-dir", err);
      }
    }
    const primaryFilterDropped = stamped !== null && primary === null ? 1 : 0;
    const health = new HealthState(join19(root, "state"));
    await health.touch();
    const dropped = queueDropped + tailFilterDropped + primaryFilterDropped;
    if (dropped > 0)
      await health.recordDrop(dropped);
    const remaining = remainingFlushBudgetMs(HOOK_BUDGET_MS, Date.now() - start, FLUSH_MARGIN_MS);
    if (remaining > 300) {
      await tryFlush({
        dataDir: outboundDir,
        stateDir: join19(root, "state"),
        credential: config.credential,
        endpoint: config.endpoint,
        resource,
        budgetMs: remaining
      });
    }
    try {
      const stateDir = join19(root, "state");
      const pendingPath = join19(config.loginStateDir, "backfill-pending");
      const pendingExists = await stat3(pendingPath).then(() => true).catch(() => false);
      if (pendingExists) {
        const { isBackfillActive: isBackfillActive2 } = await Promise.resolve().then(() => (init_pid_guard(), pid_guard_exports));
        const { spawnBackfillRunner: spawnBackfillRunner2 } = await Promise.resolve().then(() => (init_runner_spawn(), runner_spawn_exports));
        const { credentialPaths: credentialPaths2 } = await Promise.resolve().then(() => (init_credential_paths(), credential_paths_exports));
        const active = await isBackfillActive2(stateDir);
        if (active === null) {
          const paths = credentialPaths2();
          await spawnBackfillRunner2({ dataDir: root, credentialPath: paths.user });
          await rm3(pendingPath, { force: true });
        }
      }
    } catch {
    }
    try {
      if (adapter.agent === "claude-code") {
        const stateDir = join19(root, "state");
        const { hasScanOnceMarker: hasScanOnceMarker2, claimScanOnce: claimScanOnce2 } = await Promise.resolve().then(() => (init_scan_once(), scan_once_exports));
        const alreadyAttempted = await hasScanOnceMarker2(stateDir);
        if (!alreadyAttempted && await claimScanOnce2(stateDir, pluginVersion())) {
          const skipMarkerExists = await stat3(join19(stateDir, "backfill-skip")).then(() => true).catch(() => false);
          if (!skipMarkerExists) {
            const { spawnAutoScan: spawnAutoScan2 } = await Promise.resolve().then(() => (init_runner_spawn(), runner_spawn_exports));
            const { credentialPaths: credentialPaths2 } = await Promise.resolve().then(() => (init_credential_paths(), credential_paths_exports));
            const paths = credentialPaths2();
            void spawnAutoScan2({ dataDir: root, credentialPath: paths.user, spawner: opts.autoScanSpawner }).catch(() => {
            });
          }
        }
      }
    } catch {
    }
    try {
      const stateDir = join19(root, "state");
      const { readStatus: readStatus2, writeStatus: writeStatus2 } = await Promise.resolve().then(() => (init_status(), status_exports));
      const status = await readStatus2(stateDir);
      if (status && status.phase === "completed" && !status.notified) {
        writeStderr(`fancysauce: backfill complete \u2014 ${status.events_uploaded} events uploaded.
`);
        await writeStatus2(stateDir, { ...status, notified: true });
      }
    } catch {
    }
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}
${err.stack ?? ""}` : String(err);
    try {
      const logPath = join19(dataDir(), "collect-error.log");
      await writeFile8(logPath, `${(/* @__PURE__ */ new Date()).toISOString()} ${msg}
`, { flag: "a" });
    } catch {
    }
    throw err;
  }
  return { stderr: stderrBuf };
}

// dist/agents/claude-code/adapter.mjs
import { homedir as homedir6 } from "node:os";
import { join as join24 } from "node:path";

// dist/shared/stable-stringify.mjs
function stableStringify(value) {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const obj = value;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

// dist/agents/claude-code/event-mapper.mjs
var HOOK_TO_EVENT_TYPE = {
  SessionStart: "session.start",
  SessionEnd: "session.end",
  UserPromptSubmit: "prompt.submit",
  PreToolUse: "tool_call.start",
  PostToolUse: "tool_call.complete",
  PostToolUseFailure: "tool_call.failed",
  SubagentStart: "subagent.start",
  SubagentStop: "subagent.complete",
  Stop: "stop",
  PreCompact: "compaction.before",
  PostCompact: "compaction.after",
  ConfigChange: "config.changed",
  Notification: "notification",
  TaskCompleted: "task.completed",
  PermissionRequest: "permission.request"
};
var TOOL_HOOKS = /* @__PURE__ */ new Set([
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure"
]);
function mapHookToEvent(input, sequence) {
  const eventType = HOOK_TO_EVENT_TYPE[input.hook_event_name];
  if (!eventType) {
    throw new Error(`Unknown hook_event_name: ${String(input.hook_event_name)}`);
  }
  if (input.hook_event_name === "SubagentStop" && input.agent_type === "") {
    return null;
  }
  const attributes = {};
  if (TOOL_HOOKS.has(input.hook_event_name)) {
    if (input.tool_name)
      attributes.tool_name = input.tool_name;
    if (input.tool_input !== void 0) {
      attributes.tool_input_raw = stableStringify(input.tool_input);
    }
    if (input.tool_name === "Skill" && input.tool_input !== void 0) {
      const inp = input.tool_input;
      if (typeof inp.skill === "string")
        attributes.skill_name = inp.skill;
    }
    if (input.tool_response !== void 0) {
      attributes.tool_response_raw = stableStringify(input.tool_response);
    }
    if (input.tool_use_id)
      attributes.correlation_id = input.tool_use_id;
    if (input.agent_id)
      attributes.subsession_id = input.agent_id;
    if (input.agent_type)
      attributes.agent_type = input.agent_type;
    if (input.hook_event_name === "PostToolUse") {
      attributes.success = true;
    }
  } else {
    if (input.cwd)
      attributes.cwd_hash = sha256Hex(input.cwd);
    if (input.permission_mode)
      attributes.permission_mode = input.permission_mode;
    if (input.model)
      attributes.model = input.model;
    if (input.agent_id)
      attributes.agent_id = input.agent_id;
    if (input.agent_type)
      attributes.agent_type = input.agent_type;
    if (input.last_assistant_message) {
      attributes.last_assistant_message_size_bytes = Buffer.byteLength(input.last_assistant_message, "utf8");
      attributes.last_assistant_message_hash = sha256Hex(input.last_assistant_message);
    }
    if (input.notification_type)
      attributes.notification_type = input.notification_type;
    if (input.task_id)
      attributes.task_id = input.task_id;
    if (input.reason)
      attributes.reason = input.reason;
    if (input.hook_event_name === "UserPromptSubmit") {
      const prompt = typeof input.prompt === "string" ? input.prompt : "";
      attributes.prompt_length = Buffer.byteLength(prompt, "utf8");
      const trimmed = prompt.trimStart();
      if (trimmed.startsWith("/")) {
        const firstToken = trimmed.slice(1).split(/\s/, 1)[0] ?? "";
        if (/^[A-Za-z0-9_:-]{1,64}$/.test(firstToken)) {
          attributes.slash_command = firstToken;
        }
      }
    }
  }
  return {
    // Caller stamps event_uuid before enqueue; the queue boundary
    // (serializeForQueue in collect.mts) asserts non-empty. We leave it
    // empty here because tail-emitted events (transcript-tail.mts) and
    // hook-emitted events (collect.mts) each generate their own UUID
    // at the point they own the event's identity.
    event_uuid: "",
    event_type: eventType,
    session_id: input.session_id,
    source: `hook.${input.hook_event_name}`,
    sequence,
    timestamp_ns: BigInt(Date.now()) * 1000000n,
    attributes
  };
}

// dist/agents/claude-code/subagent-meta.mjs
import { open as open7, lstat, constants as constants2 } from "node:fs/promises";
function metaPathFromTranscript(transcriptPath) {
  return transcriptPath.endsWith(".jsonl") ? `${transcriptPath.slice(0, -".jsonl".length)}.meta.json` : `${transcriptPath}.meta.json`;
}
async function enrichSubagentComplete(event, transcriptPath) {
  if (event.event_type !== "subagent.complete")
    return event;
  if (typeof transcriptPath !== "string" || transcriptPath.length === 0)
    return event;
  const dur = await computeSubagentDuration(transcriptPath);
  if (dur === null)
    return event;
  return {
    ...event,
    attributes: { ...event.attributes, duration_wall_s: dur }
  };
}
async function computeSubagentDuration(transcriptPath) {
  let fh = null;
  try {
    fh = await open7(transcriptPath, "r");
    const stat5 = await fh.stat();
    if (stat5.size === 0)
      return null;
    const headSize = Math.min(stat5.size, READ_WINDOW_BYTES);
    const headBuf = Buffer.alloc(headSize);
    await fh.read(headBuf, 0, headSize, 0);
    const firstNewline = headBuf.indexOf("\n".charCodeAt(0));
    if (firstNewline < 0)
      return null;
    const firstLine = headBuf.slice(0, firstNewline).toString("utf8");
    const tailSize = Math.min(stat5.size, READ_WINDOW_BYTES);
    const tailStart = stat5.size - tailSize;
    const tailBuf = Buffer.alloc(tailSize);
    await fh.read(tailBuf, 0, tailSize, tailStart);
    let usableEnd = tailBuf.length;
    if (usableEnd > 0 && tailBuf[usableEnd - 1] === "\n".charCodeAt(0))
      usableEnd--;
    if (usableEnd <= 0)
      return null;
    const lastNewline = tailBuf.lastIndexOf("\n".charCodeAt(0), usableEnd - 1);
    if (lastNewline < 0)
      return null;
    const lastLine = tailBuf.slice(lastNewline + 1, usableEnd).toString("utf8");
    const firstTs = parseTimestamp(firstLine);
    const lastTs = parseTimestamp(lastLine);
    if (firstTs === null || lastTs === null)
      return null;
    return Math.max(0, Math.round((lastTs - firstTs) / 1e3));
  } catch (err) {
    if (err?.code === "ENOENT")
      return null;
    throw err;
  } finally {
    if (fh)
      await fh.close();
  }
}
var READ_WINDOW_BYTES = 256 * 1024;
function parseTimestamp(line) {
  let rec;
  try {
    rec = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof rec !== "object" || rec === null)
    return null;
  const ts = rec.timestamp;
  if (typeof ts !== "string")
    return null;
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : null;
}
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
      const flags = typeof constants2.O_NOFOLLOW === "number" ? constants2.O_RDONLY | constants2.O_NOFOLLOW : "r";
      fh = await open7(path, flags);
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

// dist/agents/claude-code/transcript-tail.mjs
var import_proper_lockfile4 = __toESM(require_proper_lockfile(), 1);
import { mkdir as mkdir11, readFile as readFile13, readdir, writeFile as writeFile10, appendFile as appendFile4, rename as rename11, lstat as lstat2 } from "node:fs/promises";
import { basename as basename2, dirname as dirname7, isAbsolute, join as join21, relative, sep } from "node:path";
import { homedir as homedir5 } from "node:os";
import { randomUUID as randomUUID4 } from "node:crypto";

// dist/agents/claude-code/subagent-cursor.mjs
import { readFile as readFile12, rename as rename10, writeFile as writeFile9 } from "node:fs/promises";
import { join as join20 } from "node:path";
var SubagentCursor = class {
  dir;
  path;
  tmpPath;
  constructor(dir) {
    this.dir = dir;
    this.path = join20(dir, "transcript_cursor.json");
    this.tmpPath = `${this.path}.tmp`;
  }
  async read() {
    try {
      const buf = await readFile12(this.path, "utf8");
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
    await writeFile9(this.tmpPath, JSON.stringify(body), "utf8");
    await rename10(this.tmpPath, this.path);
  }
};

// dist/shared/tail-engine.mjs
import { open as open8, constants as constants3 } from "node:fs/promises";
var DEFAULT_MAX_READ_BYTES = 4 * 1024 * 1024;
async function readWindow(opts) {
  const { path, startOffset, sequenceBase, maxReadBytes, parseWindow, state } = opts;
  let fh = null;
  try {
    try {
      const flags = opts.nofollow && typeof constants3.O_NOFOLLOW === "number" ? constants3.O_RDONLY | constants3.O_NOFOLLOW : "r";
      fh = await open8(path, flags);
    } catch (err) {
      if (err.code === "ENOENT") {
        return { events: [], endOffset: startOffset, truncated: false };
      }
      throw err;
    }
    const stat5 = await fh.stat();
    const truncated = stat5.size < startOffset;
    const effectiveStart = truncated ? 0 : startOffset;
    if (stat5.size <= effectiveStart) {
      return { events: [], endOffset: effectiveStart, truncated };
    }
    const toRead = Math.min(stat5.size - effectiveStart, maxReadBytes);
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
import { randomUUID as randomUUID3 } from "node:crypto";
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
    event_uuid: randomUUID3(),
    event_type: "usage_limit.exceeded",
    session_id: sessionId,
    source: "transcript.tail",
    sequence,
    timestamp_ns: BigInt(Date.parse(r.timestamp)) * 1000000n,
    attributes
  };
}

// dist/agents/claude-code/transcript-tail.mjs
var SESSION_ID_RE2 = /^[A-Za-z0-9_-]{16,128}$/;
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
    const root = options.transcriptRoot ?? join21(homedir5(), ".claude", "projects");
    this.transcriptRoot = root.endsWith(sep) ? root : root + sep;
  }
  // `persist` runs after all events are read but BEFORE any cursor is
  // advanced. If it throws, every cursor stays at its previous offset and
  // the next tail() re-reads the same window — at-least-once delivery.
  // The parent cursor lock is held across read + persist + cursor writes,
  // so concurrent hooks cannot double-emit the same window.
  async tail(sessionId, transcriptPath, sequenceBase, persist) {
    if (!isValidSessionId2(sessionId) || !this.isValidTranscriptPath(transcriptPath)) {
      await persist([]);
      return { events: [], skipped: true, newCursor: 0 };
    }
    const cursorDir = this.cursorDir(sessionId);
    await mkdir11(cursorDir, { recursive: true });
    const cursorPath = join21(cursorDir, "transcript_cursor.json");
    let release;
    try {
      release = await import_proper_lockfile4.default.lock(cursorPath, {
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
      const sessionDir = join21(dirname7(transcriptPath), basename2(transcriptPath, ".jsonl"));
      const subagentsRoot = join21(sessionDir, "subagents");
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
    if (!isValidSessionId2(sessionId)) {
      throw new Error(`acquireCursorLock: invalid sessionId`);
    }
    const cursorDir = this.cursorDir(sessionId);
    await mkdir11(cursorDir, { recursive: true });
    const cursorPath = join21(cursorDir, "transcript_cursor.json");
    try {
      await readFile13(cursorPath);
    } catch {
      await writeFile10(cursorPath, "{}", "utf8");
    }
    const release = await import_proper_lockfile4.default.lock(cursorPath, { retries: 0, realpath: false });
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
      await appendFile4(this.errorLogPath, line);
    } catch {
    }
  }
  async readCursor(cursorPath) {
    try {
      const buf = await readFile13(cursorPath, "utf8");
      const parsed = JSON.parse(buf);
      return parsed.byte_offset ?? 0;
    } catch {
      return 0;
    }
  }
  async writeCursor(cursorPath, offset) {
    const body = { byte_offset: offset };
    const tmp = `${cursorPath}.tmp`;
    await writeFile10(tmp, JSON.stringify(body), "utf8");
    await rename11(tmp, cursorPath);
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
  await mkdir11(cursorDir, { recursive: true });
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
  const root = join21(sessionDir, "subagents");
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
    const full = join21(dir, entry.name);
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
function isValidSessionId2(s) {
  return typeof s === "string" && SESSION_ID_RE2.test(s);
}
function sessionCursorDir(stateDir, sessionId) {
  return join21(stateDir, "sessions", sessionId);
}
function deriveSubagentCursorDir(sessCursorDir, subagentsRoot, subagentPath) {
  const agentId = basename2(subagentPath, ".jsonl").slice("agent-".length);
  if (!AGENT_ID_RE.test(agentId)) {
    return { ok: false, agentId, reason: `unsafe agent id in transcript name: ${subagentPath}` };
  }
  const nestedDir = relative(subagentsRoot, dirname7(subagentPath));
  if (nestedDir === ".." || nestedDir.startsWith(".." + sep)) {
    return { ok: false, agentId, reason: `transcript outside subagents root: ${subagentPath}` };
  }
  const cursorDir = nestedDir === "" ? join21(sessCursorDir, "subagents", agentId) : join21(sessCursorDir, "subagents", nestedDir, agentId);
  const errorLabel = nestedDir === "" ? agentId : join21(nestedDir, agentId);
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
    event_uuid: randomUUID4(),
    event_type: "api.request",
    session_id: sessionId,
    source: "transcript.tail",
    sequence,
    timestamp_ns: BigInt(Date.parse(r.timestamp)) * 1000000n,
    attributes: attrs
  };
}

// dist/shared/account-posture.mjs
import { readFile as readFile14 } from "node:fs/promises";
import { join as join22 } from "node:path";
function resolveClaudeConfigPath(env, homeDir) {
  const base = env.CLAUDE_CONFIG_DIR && env.CLAUDE_CONFIG_DIR.length > 0 ? env.CLAUDE_CONFIG_DIR : homeDir;
  return join22(base, ".claude.json");
}
function str(v) {
  return typeof v === "string" && v.length > 0 ? v : void 0;
}
function bool(v) {
  return typeof v === "boolean" ? v : void 0;
}
async function readPosture(path) {
  let raw;
  try {
    raw = await readFile14(path, "utf8");
  } catch {
    return null;
  }
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof doc !== "object" || doc === null)
    return null;
  const d = doc;
  const oauth = typeof d.oauthAccount === "object" && d.oauthAccount !== null ? d.oauthAccount : {};
  const posture = {};
  const planType = str(oauth.organizationType);
  if (planType)
    posture.plan_type = planType;
  const tier = str(oauth.organizationRateLimitTier);
  if (tier)
    posture.rate_limit_tier = tier;
  const billing = str(oauth.billingType);
  if (billing)
    posture.billing_type = billing;
  const extra = bool(oauth.hasExtraUsageEnabled);
  if (extra !== void 0)
    posture.extra_usage_enabled = extra;
  const reason = str(d.cachedExtraUsageDisabledReason);
  if (reason)
    posture.extra_usage_disabled_reason = reason;
  const grants = typeof d.overageCreditGrantCache === "object" && d.overageCreditGrantCache !== null ? Object.values(d.overageCreditGrantCache) : [];
  const firstGrant = grants[0];
  if (typeof firstGrant === "object" && firstGrant !== null) {
    const info = firstGrant.info;
    if (typeof info === "object" && info !== null) {
      const avail = bool(info.available);
      if (avail !== void 0)
        posture.overage_credit_available = avail;
      const elig = bool(info.eligible);
      if (elig !== void 0)
        posture.overage_credit_eligible = elig;
    }
  }
  return posture;
}
function postureHasFields(p) {
  return Object.keys(p).length > 0;
}
function postureHash(p) {
  const entries = Object.entries(p).filter(([, v]) => v !== void 0).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  return sha256Hex(JSON.stringify(entries));
}
function postureAttributes(p) {
  const out = {};
  for (const [k, v] of Object.entries(p)) {
    if (v !== void 0)
      out[k] = v;
  }
  return out;
}

// dist/shared/usage-config.mjs
import { randomUUID as randomUUID5 } from "node:crypto";
import { stat as stat4, readFile as readFile15, writeFile as writeFile11, rename as rename12, mkdir as mkdir12 } from "node:fs/promises";
import { join as join23 } from "node:path";
var noopCommit = async () => {
};
async function prepareUsageConfigEvent(opts) {
  const statePath = join23(opts.stateDir, "usage-config.json");
  const prev = await readState(statePath);
  let mtimeMs;
  try {
    mtimeMs = (await stat4(opts.configPath)).mtimeMs;
  } catch {
    return { event: null, commit: noopCommit, wouldAdvance: false };
  }
  if (prev && mtimeMs === prev.last_mtime_ms) {
    return { event: null, commit: noopCommit, wouldAdvance: false };
  }
  const posture = await opts.getPosture();
  if (posture === null) {
    return { event: null, commit: noopCommit, wouldAdvance: false };
  }
  const commitState = async (hash2) => {
    await writeStateAtomic(opts.stateDir, statePath, {
      last_mtime_ms: mtimeMs,
      last_hash: hash2,
      last_emitted_at: new Date(opts.now()).toISOString()
    });
  };
  if (!postureHasFields(posture)) {
    return { event: null, commit: () => commitState(""), wouldAdvance: true };
  }
  const hash = postureHash(posture);
  if (prev && hash === prev.last_hash) {
    return { event: null, commit: () => commitState(hash), wouldAdvance: true };
  }
  const event = {
    event_uuid: randomUUID5(),
    event_type: "usage_config.changed",
    session_id: opts.sessionId,
    source: "transcript.tail",
    sequence: 0,
    timestamp_ns: BigInt(opts.now()) * 1000000n,
    attributes: postureAttributes(posture)
  };
  return { event, commit: () => commitState(hash), wouldAdvance: true };
}
async function readState(path) {
  try {
    const parsed = JSON.parse(await readFile15(path, "utf8"));
    if (typeof parsed.last_mtime_ms !== "number" || typeof parsed.last_hash !== "string") {
      return null;
    }
    return {
      last_mtime_ms: parsed.last_mtime_ms,
      last_hash: parsed.last_hash,
      last_emitted_at: typeof parsed.last_emitted_at === "string" ? parsed.last_emitted_at : ""
    };
  } catch {
    return null;
  }
}
async function writeStateAtomic(stateDir, path, body) {
  await mkdir12(stateDir, { recursive: true, mode: 448 });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile11(tmp, JSON.stringify(body), "utf8");
  await rename12(tmp, path);
}

// dist/agents/claude-code/adapter.mjs
var ClaudeCodeAdapter = class {
  agent = "claude-code";
  async mapHookEvent(input) {
    const raw = mapHookToEvent(input, 0);
    if (raw === null)
      return null;
    return enrichSubagentComplete(raw, input.agent_transcript_path);
  }
  async tailTranscript(input, ctx, sink) {
    const tail = new TranscriptTail(ctx.stateDir, {
      errorLogPath: ctx.errorLogPath,
      transcriptRoot: ctx.transcriptRoot
    });
    const configPath = resolveClaudeConfigPath(process.env, homedir6());
    let postureCache;
    const getPosture = async () => {
      if (postureCache === void 0) {
        postureCache = await readPosture(configPath);
      }
      return postureCache;
    };
    await tail.tail(input.session_id, input.transcript_path, 1, async (tailEvents) => {
      const enriched = [];
      for (const ev of tailEvents) {
        if (ev.event_type === "usage_limit.exceeded") {
          const posture = await getPosture();
          const snapshot = posture ? postureAttributes(posture) : {};
          enriched.push({ ...ev, attributes: { ...snapshot, ...ev.attributes } });
        } else {
          enriched.push(ev);
        }
      }
      await sink(enriched);
      try {
        const probe = await prepareUsageConfigEvent({
          stateDir: ctx.stateDir,
          configPath,
          sessionId: input.session_id,
          getPosture,
          now: () => Date.now()
        });
        if (!probe.wouldAdvance)
          return;
        await withDirLock(join24(ctx.stateDir, "usage-config"), async () => {
          const uc = await prepareUsageConfigEvent({
            stateDir: ctx.stateDir,
            configPath,
            sessionId: input.session_id,
            getPosture: () => readPosture(configPath),
            now: () => Date.now()
          });
          if (uc.event)
            await sink([uc.event]);
          await uc.commit();
        });
      } catch {
      }
    });
  }
};

// dist/agents/claude-code/collect.mjs
var HOOK_BUDGET_MS2 = 1800;
async function runCollectOnce(opts) {
  return runCollect(new ClaudeCodeAdapter(), opts);
}
function readStdin() {
  try {
    const buf = readFileSync6(0, "utf8");
    return JSON.parse(buf);
  } catch {
    return null;
  }
}
async function main() {
  const killer = setTimeout(() => process.exit(0), HOOK_BUDGET_MS2);
  killer.unref?.();
  try {
    const hookPayload = readStdin();
    if (!hookPayload)
      return;
    try {
      const result = await runCollectOnce({ hookPayload });
      if (result.stderr)
        process.stderr.write(result.stderr);
    } catch {
    }
  } finally {
    clearTimeout(killer);
  }
}
var isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  void main();
}
export {
  runCollectOnce,
  serializeForQueue
};
