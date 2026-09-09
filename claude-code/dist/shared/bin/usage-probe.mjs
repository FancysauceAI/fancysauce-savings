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

// node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "node_modules/graceful-fs/polyfills.js"(exports, module) {
    var constants2 = __require("constants");
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
      if (constants2.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
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
          function rename3(from, to, cb) {
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
          if (Object.setPrototypeOf) Object.setPrototypeOf(rename3, fs$rename);
          return rename3;
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
            constants2.O_WRONLY | constants2.O_SYMLINK,
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
          var fd = fs2.openSync(path, constants2.O_WRONLY | constants2.O_SYMLINK, mode);
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
        if (constants2.hasOwnProperty("O_SYMLINK") && fs2.futimes) {
          fs2.lutimes = function(path, at, mt, cb) {
            fs2.open(path, constants2.O_SYMLINK, function(er, fd) {
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
            var fd = fs2.openSync(path, constants2.O_SYMLINK);
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
    var getPrototypeOf = Object.getPrototypeOf || function(obj2) {
      return obj2.__proto__;
    };
    function clone(obj2) {
      if (obj2 === null || typeof obj2 !== "object")
        return obj2;
      if (obj2 instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj2) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      Object.getOwnPropertyNames(obj2).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj2, key));
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
        function closeSync2(fd) {
          fs$closeSync.apply(fs, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync2, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync2;
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
      fs2.readFile = readFile5;
      function readFile5(path, options, cb) {
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
      fs2.writeFile = writeFile2;
      function writeFile2(path, data, options, cb) {
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
        fs2.appendFile = appendFile2;
      function appendFile2(path, data, options, cb) {
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
      fs2.readdir = readdir;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir(path, options, cb) {
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
        open3(that.path, that.flags, that.mode, function(err, fd) {
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
        open3(that.path, that.flags, that.mode, function(err, fd) {
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
      fs2.open = open3;
      function open3(path, flags, mode, cb) {
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
    exports.wrap = function(obj2, options, methods) {
      if (options instanceof Array) {
        methods = options;
        options = null;
      }
      if (!methods) {
        methods = [];
        for (var key in obj2) {
          if (typeof obj2[key] === "function") {
            methods.push(key);
          }
        }
      }
      for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        var original = obj2[method];
        obj2[method] = function retryWrapper(original2) {
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
            original2.apply(obj2, args);
          });
        }.bind(obj2, original);
        obj2[method].options = options;
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
        return fs.stat(file, (err, stat2) => {
          if (err) {
            return callback(err);
          }
          callback(null, stat2.mtime, cachedPrecision);
        });
      }
      const mtime = new Date(Math.ceil(Date.now() / 1e3) * 1e3 + 5);
      fs.utimes(file, mtime, mtime, (err) => {
        if (err) {
          return callback(err);
        }
        fs.stat(file, (err2, stat2) => {
          if (err2) {
            return callback(err2);
          }
          const precision = stat2.mtime.getTime() % 1e3 === 0 ? "s" : "ms";
          Object.defineProperty(fs, cacheSymbol, { value: precision });
          callback(null, stat2.mtime, precision);
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
        options.fs.stat(lockfilePath, (err2, stat2) => {
          if (err2) {
            if (err2.code === "ENOENT") {
              return acquireLock(file, { ...options, stale: 0 }, callback);
            }
            return callback(err2);
          }
          if (!isLockStale(stat2, options)) {
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
    function isLockStale(stat2, options) {
      return stat2.mtime.getTime() < Date.now() - options.stale;
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
        options.fs.stat(lock2.lockfilePath, (err, stat2) => {
          const isOverThreshold = lock2.lastUpdate + options.stale < Date.now();
          if (err) {
            if (err.code === "ENOENT" || isOverThreshold) {
              return setLockAsCompromised(file, lock2, Object.assign(err, { code: "ECOMPROMISED" }));
            }
            lock2.updateDelay = 1e3;
            return updateLock(file, options);
          }
          const isMtimeOurs = lock2.mtime.getTime() === stat2.mtime.getTime();
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
        options.fs.stat(getLockFile(file2, options), (err2, stat2) => {
          if (err2) {
            return err2.code === "ENOENT" ? callback(null, false) : callback(err2);
          }
          return callback(null, !isLockStale(stat2, options));
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
    var lockfile4 = require_lockfile();
    var { toPromise, toSync, toSyncOptions } = require_adapter();
    async function lock(file, options) {
      const release = await toPromise(lockfile4.lock)(file, options);
      return toPromise(release);
    }
    function lockSync(file, options) {
      const release = toSync(lockfile4.lock)(file, toSyncOptions(options));
      return toSync(release);
    }
    function unlock(file, options) {
      return toPromise(lockfile4.unlock)(file, options);
    }
    function unlockSync(file, options) {
      return toSync(lockfile4.unlock)(file, toSyncOptions(options));
    }
    function check(file, options) {
      return toPromise(lockfile4.check)(file, options);
    }
    function checkSync(file, options) {
      return toSync(lockfile4.check)(file, toSyncOptions(options));
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

// dist/shared/credential-paths.mjs
var init_credential_paths = __esm({
  "dist/shared/credential-paths.mjs"() {
    "use strict";
  }
});

// dist/shared/bin/usage-probe.mjs
import { appendFile } from "node:fs/promises";
import { isAbsolute as isAbsolute2, join as join10 } from "node:path";

// dist/shared/usage-probe/run.mjs
import { spawn } from "node:child_process";
import { isAbsolute, join as join9 } from "node:path";

// dist/shared/account-posture.mjs
import { readFile } from "node:fs/promises";

// dist/shared/hash.mjs
import { createHash, createHmac } from "node:crypto";
function sha256Hex(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
function deterministicUuid(parts) {
  const h = sha256Hex(parts.join("|"));
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// dist/shared/account-posture.mjs
function str(v) {
  return typeof v === "string" && v.length > 0 ? v : void 0;
}
function bool(v) {
  return typeof v === "boolean" ? v : void 0;
}
async function readPosture(path) {
  let raw;
  try {
    raw = await readFile(path, "utf8");
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
  const seatTier = str(oauth.seatTier);
  if (seatTier)
    posture.seat_tier = seatTier;
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
      "skill_name",
      "ref_system",
      "ref_kind",
      "ref_id",
      "ref_scope",
      "ref_source"
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
    // No `reason`: the mapper fills it from input.reason on every non-tool
    // hook, so it is the one attribute here that can carry unbounded prose.
    "notification": Object.freeze([
      "notification_type",
      "quota_type",
      "reset_time",
      "original_reset_time"
    ]),
    "task.completed": Object.freeze(["task_id"]),
    "compaction.before": Object.freeze([]),
    "compaction.after": Object.freeze([]),
    "config.changed": Object.freeze([]),
    "usage_config.changed": Object.freeze([
      "plan_type",
      "seat_tier",
      "rate_limit_tier",
      "billing_type",
      "extra_usage_enabled",
      "extra_usage_disabled_reason",
      "overage_credit_available",
      "overage_credit_eligible",
      "credits_has",
      "credits_unlimited",
      "credits_balance",
      "auth_plan_claim",
      "last_reached_type",
      "spend_control_limit",
      "spend_control_resets_at",
      "spend_control_remaining_percent",
      "fast_available",
      "fast_default",
      "config_service_tier",
      "cli_version"
    ]),
    "usage_limit.exceeded": Object.freeze([
      "limit_message",
      "limit_kind_guess",
      "reset_at_guess",
      "error_type",
      "retry_after_seconds",
      "api_error_status",
      "request_id",
      "transcript_message_uuid",
      "plan_type",
      "seat_tier",
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
      "last_reached_type",
      "limit_id",
      "credits_has",
      "credits_unlimited",
      "credits_balance",
      "spend_control_limit",
      "spend_control_remaining_percent",
      "spend_control_resets_at",
      "fast_available",
      "fast_default",
      "config_service_tier",
      "cli_version"
    ]),
    // Two flavours share this type. Codex emits one record per window
    // (window/used_percent/resets_at/window_minutes); the Claude usage probe
    // emits one record carrying both windows under the primary_*/secondary_*
    // names, because the backend carry keeps one reading per group and a
    // per-window row would let a fresh five-hour reading erase a still-
    // saturated weekly one.
    "usage_limit.snapshot": Object.freeze([
      "window",
      "used_percent",
      "resets_at",
      "window_minutes",
      "primary_used_percent",
      "primary_resets_at",
      "primary_window_minutes",
      "secondary_used_percent",
      "secondary_resets_at",
      "secondary_window_minutes",
      "plan_type",
      "seat_tier",
      "model",
      "limit_id"
    ]),
    "usage_spend.snapshot": Object.freeze([
      "spend_used_minor",
      "spend_currency",
      "spend_limit_minor",
      "spend_percent",
      "spend_enabled",
      "spend_disabled_reason",
      "spend_limit_reached",
      "extra_usage_enabled",
      "extra_usage_disabled_reason",
      "extra_usage_monthly_limit",
      "extra_usage_used_credits",
      "extra_usage_utilization",
      "credits_ever_enabled",
      "plan_type",
      "seat_tier"
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
      "secondary_window_minutes",
      "speed",
      "api_error",
      "api_error_kind",
      "api_error_status",
      "reached_type",
      "plan_type",
      "credits_has",
      "credits_unlimited",
      "spend_control_limit",
      "spend_control_remaining_percent",
      "spend_control_resets_at",
      "service_tier_requested",
      "service_tier_observed",
      "limit_id"
    ])
  };
  return Object.freeze({
    maxSerializedBytes: 4096,
    keepLists: Object.freeze(keepLists)
  });
}

// dist/shared/identity-resolver.mjs
import { createHash as createHash2, randomUUID } from "node:crypto";
import { execFile as execFile2 } from "node:child_process";
import { open, readFile as readFile2, rename, unlink } from "node:fs/promises";
import { join as join4 } from "node:path";
import { randomBytes as randomBytes2 } from "node:crypto";

// dist/shared/locking.mjs
var import_proper_lockfile = __toESM(require_proper_lockfile(), 1);
import { mkdir } from "node:fs/promises";
var LOCK_OPTIONS = {
  realpath: false,
  retries: { retries: 100, minTimeout: 5, maxTimeout: 100, factor: 1.5 },
  stale: 1e4
};
async function withDirLock(dir, fn) {
  await mkdir(dir, { recursive: true });
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
var MAX_EMAIL_LENGTH = 320;
function plausibleEmail(value) {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH)
    return null;
  if (/[\s\u0000-\u001f\u007f]/.test(trimmed))
    return null;
  const parts = trimmed.split("@");
  if (parts.length !== 2)
    return null;
  if (parts[0].length === 0 || parts[1].length === 0)
    return null;
  return trimmed;
}
function defaultRunner(cmd, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs }, (err, stdout) => {
      if (err)
        return reject(err);
      resolve(stdout.toString());
    });
  });
}
var GIT_SCOPES = /* @__PURE__ */ new Set(["local", "worktree", "global", "system", "command"]);
async function readGitConfigEmail(cwd, deps = {}) {
  const runner = deps.runner ?? defaultRunner;
  try {
    const out = await runner("git", ["-C", cwd, "config", "--show-scope", "--get", "user.email"], TIMEOUT_MS);
    const tab = out.indexOf("	");
    const rawScope = tab === -1 ? "" : out.slice(0, tab).trim();
    const email = plausibleEmail(tab === -1 ? out : out.slice(tab + 1));
    if (email === null)
      return null;
    return { email, scope: GIT_SCOPES.has(rawScope) ? rawScope : "unknown" };
  } catch (err) {
    const code = err.code;
    if (typeof code !== "number" || code === 1)
      return null;
    try {
      const email = plausibleEmail(await runner("git", ["-C", cwd, "config", "--get", "user.email"], TIMEOUT_MS));
      return email === null ? null : { email, scope: "unknown" };
    } catch {
      return null;
    }
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
    return match ? plausibleEmail(match[1]) : null;
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
    return plausibleEmail(out);
  } catch {
    return null;
  }
}

// dist/shared/secure-envelope.mjs
import { randomBytes, createCipheriv, publicEncrypt, constants, createPublicKey } from "node:crypto";
function seal(plaintext, key) {
  const aesKey = randomBytes(32);
  const iv = randomBytes(12);
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
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
  const read = deps.readFileImpl ?? ((p) => readFileSync(p, "utf8"));
  try {
    const parsed = JSON.parse(read(join(deps.cacheDir, CACHE_FILE)));
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
import { readFileSync as readFileSync2 } from "node:fs";
import { execFileSync } from "node:child_process";
import { join as join2 } from "node:path";
import { homedir } from "node:os";
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
  const home = deps.home ?? homedir();
  const read = deps.readFileImpl ?? ((p) => readFileSync2(p, "utf8"));
  return agent === "claude-code" ? readClaude(home, read, deps.claudeStatus ?? defaultClaudeStatus) : readCodex(home, read);
}
function readClaude(home, read, status) {
  try {
    const parsed = JSON.parse(read(join2(home, ".claude.json")));
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
    auth = JSON.parse(read(join2(home, ".codex", "auth.json")));
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
    const obj2 = JSON.parse(json);
    return typeof obj2 === "object" && obj2 !== null ? obj2 : null;
  } catch {
    return null;
  }
}

// dist/shared/identity-cache.mjs
import { readFileSync as readFileSync3, writeFileSync } from "node:fs";
import { join as join3 } from "node:path";
var CACHE_FILE2 = "identity-cache.json";
var DEFAULT_TTL_MS2 = 12 * 60 * 60 * 1e3;
var CACHED_IDENTITY_SOURCES = [
  "native_claude",
  "native_codex",
  "dscl",
  "whoami_upn"
];
var CACHED_SOURCE_SET = new Set(CACHED_IDENTITY_SOURCES);
function readIdentityCache(deps) {
  const ttl = deps.ttlMs ?? DEFAULT_TTL_MS2;
  const read = deps.readFileImpl ?? ((p) => readFileSync3(p, "utf8"));
  try {
    const parsed = JSON.parse(read(join3(deps.dir, CACHE_FILE2)));
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
    if (typeof source !== "string" || !CACHED_SOURCE_SET.has(source))
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
    write(join3(deps.dir, CACHE_FILE2), JSON.stringify(entry));
  } catch {
  }
}

// dist/shared/identity-resolver.mjs
var GIT_TIMEOUT_MS = 200;
var IdentityResolver = class {
  dir;
  installPath;
  git;
  constructor(dir, git = defaultGitAccess()) {
    this.dir = dir;
    this.installPath = join4(dir, "install.json");
    this.git = git;
  }
  async resolve(cwd, opts) {
    const install_id = await this.loadOrCreateInstallId();
    const repo = await this.resolveRepoHash(cwd);
    const base = { install_id, ...repo };
    if (!opts)
      return base;
    const record = await resolveIdentityRecord({ dataDir: this.dir, cwd, opts });
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
  const tmp = `${path}.${process.pid}.${randomBytes2(4).toString("hex")}.tmp`;
  let renamed = false;
  try {
    const fh = await open(tmp, "wx", 384);
    try {
      await fh.writeFile(JSON.stringify(body));
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
async function resolveIdentityRecord({ dataDir, cwd, opts }) {
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
  const hit = readIdentityCache({ dir: dataDir, now });
  let cached;
  if (hit.fresh) {
    cached = hit.identity;
  } else {
    cached = await probeMachineScopedIdentity(opts);
    writeIdentityCache({ dir: dataDir, now, identity: cached });
  }
  if (cached)
    return cached;
  const git = await (opts.identitySources?.gitEmail ?? readGitConfigEmail)(cwd);
  return git ? { source: "git_config", email: git.email, scope: git.scope } : null;
}
async function probeMachineScopedIdentity(opts) {
  const native = (opts.nativeReader ?? readNativeIdentity)(opts.agent);
  if (native)
    return native;
  const dscl = await (opts.identitySources?.dsclEmail ?? readMacOsDsclEmail)();
  if (dscl)
    return { source: "dscl", email: dscl };
  const upn = await (opts.identitySources?.winUpn ?? readWindowsUpn)();
  if (upn)
    return { source: "whoami_upn", upn, email: upn };
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
import { open as open2, stat } from "node:fs/promises";
import { join as join5 } from "node:path";
var Queue = class {
  dir;
  path;
  capBytes;
  constructor(dir, capBytes) {
    this.dir = dir;
    this.path = join5(dir, "queue.ndjson");
    this.capBytes = capBytes;
  }
  async size() {
    try {
      const s = await stat(this.path);
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
      const fh = await open2(this.path, "a", 384);
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

// dist/shared/config.mjs
import { join as join6 } from "node:path";
import { homedir as homedir2 } from "node:os";
init_credential_paths();
var DEFAULT_LOGIN_STATE_DIR = join6(homedir2(), ".config", "fancysauce");

// dist/shared/run-collect.mjs
init_credential_paths();

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
    "usage_spend.snapshot": k("usage_spend.snapshot"),
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
  const refKeys = ["ref_system", "ref_kind", "ref_id", "ref_scope", "ref_source"];
  if (refKeys.every((key) => typeof a[key] === "string" && a[key] !== "")) {
    for (const key of refKeys)
      out[key] = a[key];
  }
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

// dist/shared/health.mjs
var import_proper_lockfile2 = __toESM(require_proper_lockfile(), 1);

// dist/shared/flusher.mjs
var import_proper_lockfile3 = __toESM(require_proper_lockfile(), 1);

// dist/shared/backoff-state.mjs
var MAX_BACKOFF_MS = 5 * 60 * 1e3;

// dist/shared/forwarder.mjs
import { gzip } from "node:zlib";
import { promisify } from "node:util";
var gzipAsync = promisify(gzip);
var MAX_RESPONSE_BYTES = 64 * 1024;

// dist/shared/session-id.mjs
var SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
function isValidSessionId(s) {
  return typeof s === "string" && SESSION_ID_RE.test(s);
}

// dist/shared/whoami/credential.mjs
init_credential_paths();

// dist/shared/whoami/cache.mjs
var SUCCESS_TTL_MS = 6 * 60 * 60 * 1e3;
var ERROR_TTL_MS = 15 * 60 * 1e3;
var TMP_ORPHAN_MAX_AGE_MS = 60 * 60 * 1e3;

// dist/shared/whoami/flags.mjs
var PLUGIN_FLAGS_MAX_AGE_MS = 24 * 60 * 60 * 1e3;
var NO_PLUGIN_FLAGS = Object.freeze({});

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

// dist/shared/usage-probe/probe.mjs
import { readFile as readFile3 } from "node:fs/promises";
var CACHE_TTL_MS = 3e5;
var WINDOW_ORDER = ["five_hour", "seven_day"];
var WINDOW_MINUTES = Object.freeze({
  five_hour: 300,
  seven_day: 10080
});
function obj(v) {
  return typeof v === "object" && v !== null ? v : void 0;
}
function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : void 0;
}
function str2(v) {
  return typeof v === "string" && v.length > 0 ? v : void 0;
}
function bool2(v) {
  return typeof v === "boolean" ? v : void 0;
}
function windowReading(v) {
  const o = obj(v);
  if (!o)
    return void 0;
  const out = {};
  const util = num(o.utilization);
  if (util !== void 0)
    out.utilization = util;
  const resets = str2(o.resets_at);
  if (resets !== void 0)
    out.resets_at = resets;
  return out.utilization === void 0 && out.resets_at === void 0 ? void 0 : out;
}
async function readUsageCache(path) {
  let doc;
  try {
    doc = JSON.parse(await readFile3(path, "utf8"));
  } catch {
    return null;
  }
  const root = obj(doc);
  const cached = obj(root?.cachedUsageUtilization);
  if (!cached)
    return null;
  const rawFetchedAtMs = num(cached.fetchedAtMs);
  if (rawFetchedAtMs === void 0)
    return null;
  const fetchedAtMs = Math.trunc(rawFetchedAtMs);
  const u = obj(cached.utilization) ?? {};
  const utilization = {};
  const fiveHour = windowReading(u.five_hour);
  if (fiveHour)
    utilization.five_hour = fiveHour;
  const sevenDay = windowReading(u.seven_day);
  if (sevenDay)
    utilization.seven_day = sevenDay;
  const extra = obj(u.extra_usage);
  if (extra) {
    const e = {};
    const isEnabled = bool2(extra.is_enabled);
    if (isEnabled !== void 0)
      e.is_enabled = isEnabled;
    const monthlyLimit = num(extra.monthly_limit) ?? str2(extra.monthly_limit);
    if (monthlyLimit !== void 0)
      e.monthly_limit = monthlyLimit;
    const usedCredits = num(extra.used_credits) ?? str2(extra.used_credits);
    if (usedCredits !== void 0)
      e.used_credits = usedCredits;
    const util = num(extra.utilization);
    if (util !== void 0)
      e.utilization = util;
    const reason = str2(extra.disabled_reason);
    if (reason !== void 0)
      e.disabled_reason = reason;
    const reached = bool2(extra.spend_limit_reached);
    if (reached !== void 0)
      e.spend_limit_reached = reached;
    const everEnabled = bool2(extra.credits_ever_enabled);
    if (everEnabled !== void 0)
      e.credits_ever_enabled = everEnabled;
    utilization.extra_usage = e;
  }
  const spend = obj(u.spend);
  if (spend) {
    const s = {};
    const used = obj(spend.used);
    if (used) {
      s.used = {};
      const minor = num(used.amount_minor);
      if (minor !== void 0)
        s.used.amount_minor = minor;
      const currency = str2(used.currency);
      if (currency !== void 0)
        s.used.currency = currency;
    }
    const limit = num(spend.limit);
    if (limit !== void 0)
      s.limit = limit;
    const percent = num(spend.percent);
    if (percent !== void 0)
      s.percent = percent;
    const enabled = bool2(spend.enabled);
    if (enabled !== void 0)
      s.enabled = enabled;
    const reason = str2(spend.disabled_reason);
    if (reason !== void 0)
      s.disabled_reason = reason;
    utilization.spend = s;
  }
  return { fetchedAtMs, utilization };
}
var SNAPSHOT_MIN_DELTA_PCT = 1;
var WINDOW_PREFIX = Object.freeze({
  five_hour: "primary",
  seven_day: "secondary"
});
function fetchedAtNs(fetchedAtMs) {
  return BigInt(Math.trunc(fetchedAtMs)) * 1000000n;
}
function probeEventUuid(installId, fetchedAtMs, scope) {
  return deterministicUuid([installId, String(Math.trunc(fetchedAtMs)), scope]);
}
function resetsAtEpochSeconds(iso) {
  if (iso === void 0)
    return void 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1e3) : void 0;
}
function postureSnapshot(posture) {
  const out = {};
  if (posture?.plan_type !== void 0)
    out.plan_type = posture.plan_type;
  if (posture?.seat_tier !== void 0)
    out.seat_tier = posture.seat_tier;
  return out;
}
function windowSnapshotEvent(input) {
  const { cache, posture, sessionId, installId, sequence } = input;
  const attributes = {};
  const nextWindows = { ...input.windows };
  let anyPresent = false;
  let anyMoved = false;
  for (const name of WINDOW_ORDER) {
    const reading = cache.utilization[name];
    if (!reading)
      continue;
    const usedPercent = reading.utilization;
    if (typeof usedPercent !== "number" || !Number.isFinite(usedPercent))
      continue;
    anyPresent = true;
    const resetsAt = resetsAtEpochSeconds(reading.resets_at);
    const prefix = WINDOW_PREFIX[name];
    attributes[`${prefix}_used_percent`] = usedPercent;
    if (resetsAt !== void 0)
      attributes[`${prefix}_resets_at`] = resetsAt;
    attributes[`${prefix}_window_minutes`] = WINDOW_MINUTES[name];
    const watermark = input.windows[name];
    const resetsChanged = resetsAt !== void 0 && resetsAt !== watermark?.resets_at;
    if (!watermark || resetsChanged || Math.abs(usedPercent - watermark.used_percent) >= SNAPSHOT_MIN_DELTA_PCT) {
      anyMoved = true;
    }
    nextWindows[name] = resetsAt !== void 0 ? { used_percent: usedPercent, resets_at: resetsAt } : { used_percent: usedPercent };
  }
  if (!anyPresent || !anyMoved)
    return { event: null, windows: input.windows };
  Object.assign(attributes, postureSnapshot(posture));
  return {
    event: {
      event_uuid: probeEventUuid(installId, cache.fetchedAtMs, "windows"),
      event_type: "usage_limit.snapshot",
      session_id: sessionId,
      source: "usage.probe",
      sequence,
      timestamp_ns: fetchedAtNs(cache.fetchedAtMs),
      attributes
    },
    windows: nextWindows
  };
}
var SPEND_HEARTBEAT_MS = 36e5;
function rawString(v) {
  if (typeof v === "string")
    return v.length > 0 ? v : void 0;
  if (typeof v === "number" && Number.isFinite(v))
    return String(v);
  return void 0;
}
function intAttr(v) {
  return typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : void 0;
}
function doubleAttr(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : void 0;
}
function spendAttributes(cache, posture) {
  const attrs = {};
  const spend = cache.utilization.spend;
  const extra = cache.utilization.extra_usage;
  const usedMinor = intAttr(spend?.used?.amount_minor);
  if (usedMinor !== void 0)
    attrs.spend_used_minor = usedMinor;
  if (spend?.used?.currency !== void 0)
    attrs.spend_currency = spend.used.currency;
  const limitMinor = intAttr(spend?.limit);
  if (limitMinor !== void 0)
    attrs.spend_limit_minor = limitMinor;
  const percent = doubleAttr(spend?.percent);
  if (percent !== void 0)
    attrs.spend_percent = percent;
  if (spend?.enabled !== void 0)
    attrs.spend_enabled = spend.enabled;
  if (spend?.disabled_reason !== void 0)
    attrs.spend_disabled_reason = spend.disabled_reason;
  if (extra?.spend_limit_reached !== void 0)
    attrs.spend_limit_reached = extra.spend_limit_reached;
  if (extra?.is_enabled !== void 0)
    attrs.extra_usage_enabled = extra.is_enabled;
  if (extra?.disabled_reason !== void 0)
    attrs.extra_usage_disabled_reason = extra.disabled_reason;
  const monthlyLimit = rawString(extra?.monthly_limit);
  if (monthlyLimit !== void 0)
    attrs.extra_usage_monthly_limit = monthlyLimit;
  const usedCredits = rawString(extra?.used_credits);
  if (usedCredits !== void 0)
    attrs.extra_usage_used_credits = usedCredits;
  const extraUtilization = doubleAttr(extra?.utilization);
  if (extraUtilization !== void 0)
    attrs.extra_usage_utilization = extraUtilization;
  if (extra?.credits_ever_enabled !== void 0)
    attrs.credits_ever_enabled = extra.credits_ever_enabled;
  if (Object.keys(attrs).length === 0)
    return attrs;
  Object.assign(attrs, postureSnapshot(posture));
  return attrs;
}
function spendHash(attrs) {
  const entries = Object.entries(attrs).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${k}=${String(v)}`);
  return sha256Hex(entries.join("|"));
}
function usageProbeEvents(input) {
  const { cache, posture, sessionId, installId, nowMs, state } = input;
  const windowResult = windowSnapshotEvent({
    cache,
    posture,
    sessionId,
    installId,
    sequence: 0,
    windows: state?.windows ?? {}
  });
  const events = windowResult.event ? [windowResult.event] : [];
  const attrs = spendAttributes(cache, posture);
  const hasSpend = attrs.spend_used_minor !== void 0;
  const hash = hasSpend ? spendHash(attrs) : "";
  const heartbeatDue = state !== null && nowMs - state.spend_emitted_at_ms >= SPEND_HEARTBEAT_MS;
  const spendChanged = state === null || hash !== state.spend_hash;
  const emitSpend = hasSpend && (spendChanged || heartbeatDue);
  if (emitSpend) {
    events.push({
      event_uuid: probeEventUuid(installId, cache.fetchedAtMs, "spend"),
      event_type: "usage_spend.snapshot",
      session_id: sessionId,
      source: "usage.probe",
      sequence: events.length,
      timestamp_ns: fetchedAtNs(cache.fetchedAtMs),
      attributes: attrs
    });
  }
  return {
    events,
    state: {
      last_fetched_at_ms: cache.fetchedAtMs,
      last_attempt_ms: nowMs,
      windows: windowResult.windows,
      spend_hash: hasSpend ? hash : state?.spend_hash ?? "",
      // Stamped from nowMs, the same clock the heartbeat gate compares it to.
      spend_emitted_at_ms: emitSpend ? nowMs : state?.spend_emitted_at_ms ?? 0
    }
  };
}

// dist/shared/usage-probe/state.mjs
import { mkdir as mkdir2, readFile as readFile4, rename as rename2, unlink as unlink2, writeFile } from "node:fs/promises";
import { join as join7 } from "node:path";
function usageProbeStatePath(stateDir) {
  return join7(stateDir, "usage-probe.json");
}
async function readUsageProbeState(stateDir) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile4(usageProbeStatePath(stateDir), "utf8"));
  } catch {
    return null;
  }
  if (typeof parsed.last_fetched_at_ms !== "number" || typeof parsed.last_attempt_ms !== "number") {
    return null;
  }
  const windows = {};
  if (typeof parsed.windows === "object" && parsed.windows !== null) {
    for (const [name, raw] of Object.entries(parsed.windows)) {
      if (typeof raw !== "object" || raw === null)
        continue;
      const w = raw;
      if (typeof w.used_percent !== "number" || !Number.isFinite(w.used_percent))
        continue;
      windows[name] = typeof w.resets_at === "number" && Number.isFinite(w.resets_at) ? { used_percent: w.used_percent, resets_at: w.resets_at } : { used_percent: w.used_percent };
    }
  }
  return {
    last_fetched_at_ms: parsed.last_fetched_at_ms,
    last_attempt_ms: parsed.last_attempt_ms,
    windows,
    spend_hash: typeof parsed.spend_hash === "string" ? parsed.spend_hash : "",
    spend_emitted_at_ms: typeof parsed.spend_emitted_at_ms === "number" ? parsed.spend_emitted_at_ms : 0
  };
}
async function writeUsageProbeState(stateDir, state) {
  const path = usageProbeStatePath(stateDir);
  const tmp = `${path}.${process.pid}.tmp`;
  try {
    await mkdir2(stateDir, { recursive: true, mode: 448 });
    await writeFile(tmp, JSON.stringify(state), { encoding: "utf8", mode: 384 });
    await rename2(tmp, path);
  } catch {
    await unlink2(tmp).catch(() => {
    });
  }
}

// dist/shared/usage-probe/lease.mjs
import { join as join8 } from "node:path";

// dist/shared/lease.mjs
import { closeSync, ftruncateSync, openSync, readFileSync as readFileSync4, rmSync, statSync, writeSync } from "node:fs";
function releaseLease(path) {
  try {
    rmSync(path, { force: true });
  } catch {
  }
}

// dist/shared/usage-probe/lease.mjs
function usageProbeLeasePath(stateDir) {
  return join8(stateDir, "usage-probe.lock");
}
function releaseProbeLease(stateDir) {
  releaseLease(usageProbeLeasePath(stateDir));
}

// dist/shared/usage-probe/run.mjs
var CLAUDE_USAGE_ARGS = [
  "-p",
  "/usage",
  "--no-session-persistence",
  "--strict-mcp-config",
  "--settings",
  '{"disableAllHooks":true}',
  "--output-format",
  "json"
];
var PROBE_RUN_TIMEOUT_MS = 3e4;
function resolveClaudeBinary(env) {
  const exec = env.CLAUDE_CODE_EXECPATH;
  return exec && exec.length > 0 ? exec : "claude";
}
async function runUsageProbe(opts) {
  const stateDir = join9(opts.dataDir, "state");
  const nowMs = (opts.now ?? Date.now)();
  const run = opts.claudeRunner ?? defaultClaudeRunner;
  const prior = await readUsageProbeState(stateDir);
  try {
    if (!isAbsolute(opts.configPath)) {
      await recordAttempt(stateDir, prior, nowMs);
      return { kind: "bad-config" };
    }
    const refresh = await refreshUsageCache(opts, run, nowMs);
    if (refresh.kind !== "refreshed") {
      await recordAttempt(stateDir, prior, nowMs);
      return refresh.kind === "run-failed" ? { kind: "run-failed" } : { kind: "no-cache" };
    }
    const after = refresh.after;
    if (classifyReadingAdvancement(prior, refresh.ranPast, after) !== "advanced") {
      await recordAttempt(stateDir, prior, nowMs);
      return { kind: "no-change" };
    }
    const posture = await readPosture(opts.configPath);
    const identity = await new IdentityResolver(opts.dataDir).resolve(opts.dataDir);
    const { events, state } = usageProbeEvents({
      cache: after,
      posture,
      sessionId: opts.sessionId,
      installId: identity.install_id,
      nowMs,
      state: prior
    });
    const { filtered, dropped: filteredOut } = filterEvents(events, defaultPolicy());
    const survived = new Set(filtered.map((ev) => ev.event_type));
    const persisted = {
      ...state,
      ...survived.has("usage_limit.snapshot") ? {} : { windows: prior?.windows ?? {} },
      ...survived.has("usage_spend.snapshot") ? {} : {
        spend_hash: prior?.spend_hash ?? "",
        spend_emitted_at_ms: prior?.spend_emitted_at_ms ?? 0
      }
    };
    if (filtered.length === 0) {
      await writeUsageProbeState(stateDir, persisted);
      return { kind: "no-change", filteredOut };
    }
    const outboundDir = join9(opts.dataDir, "outbound");
    const queue = new Queue(outboundDir, opts.queueCapBytes ?? QUEUE_CAP_BYTES);
    const append = await enqueueEvents(queue, filtered);
    if (append.dropped > 0) {
      await recordAttempt(stateDir, prior, nowMs);
      return { kind: "queue-full" };
    }
    await writeUsageProbeState(stateDir, persisted);
    return { kind: "emitted", enqueued: append.written, filteredOut };
  } catch (err) {
    await recordAttempt(stateDir, prior, nowMs);
    return { kind: "run-failed", error: err };
  } finally {
    releaseProbeLease(stateDir);
  }
}
async function refreshUsageCache(opts, run, nowMs) {
  const before = await readUsageCache(opts.configPath);
  const ran = before === null || nowMs - before.fetchedAtMs >= CACHE_TTL_MS;
  if (ran) {
    const result = await run({
      binary: resolveClaudeBinary(opts.env),
      args: CLAUDE_USAGE_ARGS,
      cwd: opts.dataDir,
      timeoutMs: PROBE_RUN_TIMEOUT_MS,
      env: opts.env
    });
    if (!result.ok)
      return { kind: "run-failed" };
  }
  const after = await readUsageCache(opts.configPath);
  if (after === null)
    return { kind: "no-cache" };
  return { kind: "refreshed", ranPast: ran ? before : null, after };
}
function classifyReadingAdvancement(prior, ranPast, after) {
  if (ranPast !== null && after.fetchedAtMs <= ranPast.fetchedAtMs) {
    return "unchanged-after-refresh";
  }
  if (prior !== null && after.fetchedAtMs <= prior.last_fetched_at_ms) {
    return "already-processed";
  }
  return "advanced";
}
async function recordAttempt(stateDir, prior, nowMs) {
  await writeUsageProbeState(stateDir, {
    last_fetched_at_ms: prior?.last_fetched_at_ms ?? 0,
    last_attempt_ms: nowMs,
    windows: prior?.windows ?? {},
    spend_hash: prior?.spend_hash ?? "",
    spend_emitted_at_ms: prior?.spend_emitted_at_ms ?? 0
  });
}
function defaultClaudeRunner(opts) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok) => {
      if (settled)
        return;
      settled = true;
      resolve({ ok });
    };
    try {
      const child = spawn(opts.binary, [...opts.args], {
        cwd: opts.cwd,
        stdio: "ignore",
        env: opts.env,
        timeout: opts.timeoutMs
      });
      child.once("error", () => done(false));
      child.once("close", (code) => done(code === 0));
    } catch {
      done(false);
    }
  });
}

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

// dist/shared/bin/usage-probe.mjs
var isMain = isMainModule(import.meta.url, process.argv[1]);
if (isMain) {
  const sessionId = process.argv[2];
  const configPath = process.argv[3];
  const dataDir = process.argv[4];
  const validSessionId = (
    // spawnUsageProbe only ever sends the CC session-id shape; a value
    // outside it means this process was invoked by something other than
    // the hook, and there is no session to safely attribute events to.
    typeof sessionId === "string" && isValidSessionId(sessionId)
  );
  const validConfigPath = (
    // The child's cwd is dataDir, not the hook's — a relative configPath
    // would resolve against the wrong directory (run.mts checks this again
    // before spending a run on it, but failing here skips the spawn's
    // whole cost instead).
    typeof configPath === "string" && isAbsolute2(configPath)
  );
  const validDataDir = (
    // state/, outbound/ and collect-error.log below are all joined onto
    // dataDir; a relative value would resolve against whatever cwd this
    // detached process happens to inherit rather than the plugin's data dir.
    typeof dataDir === "string" && isAbsolute2(dataDir)
  );
  if (!validSessionId || !validConfigPath || !validDataDir) {
    if (validDataDir)
      releaseProbeLease(join10(dataDir, "state"));
    process.exit(0);
  } else {
    void runUsageProbe({ sessionId, configPath, dataDir, env: process.env }).then((outcome) => logProbeOutcome(dataDir, outcome)).then(() => process.exit(0)).catch(() => process.exit(1));
  }
}
async function logProbeOutcome(dataDir, outcome) {
  const lines = [];
  const filteredOut = "filteredOut" in outcome ? outcome.filteredOut ?? 0 : 0;
  if (filteredOut > 0) {
    lines.push(`usage-probe: ${filteredOut} event(s) over the ${defaultPolicy().maxSerializedBytes}-byte cap`);
  }
  if (outcome.kind === "run-failed" && outcome.error !== void 0) {
    const err = outcome.error;
    const msg = err instanceof Error ? err.stack ?? err.message : String(err);
    lines.push(`usage-probe: run failed: ${msg}`);
  }
  if (lines.length === 0)
    return;
  const at = (/* @__PURE__ */ new Date()).toISOString();
  try {
    await appendFile(join10(dataDir, "collect-error.log"), lines.map((line) => `${at} ${line}
`).join(""));
  } catch {
  }
}
export {
  logProbeOutcome
};
