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
    var constants = __require("constants");
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
      if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
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
          function rename4(from, to, cb) {
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
          if (Object.setPrototypeOf) Object.setPrototypeOf(rename4, fs$rename);
          return rename4;
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
            constants.O_WRONLY | constants.O_SYMLINK,
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
          var fd = fs2.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode);
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
        if (constants.hasOwnProperty("O_SYMLINK") && fs2.futimes) {
          fs2.lutimes = function(path, at, mt, cb) {
            fs2.open(path, constants.O_SYMLINK, function(er, fd) {
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
            var fd = fs2.openSync(path, constants.O_SYMLINK);
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
        function closeSync3(fd) {
          fs$closeSync.apply(fs, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync3, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync3;
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
      fs2.readFile = readFile4;
      function readFile4(path, options, cb) {
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
      fs2.readdir = readdir4;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir4(path, options, cb) {
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
        open5(that.path, that.flags, that.mode, function(err, fd) {
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
        open5(that.path, that.flags, that.mode, function(err, fd) {
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
      fs2.open = open5;
      function open5(path, flags, mode, cb) {
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
      return (...args) => new Promise((resolve2, reject) => {
        args.push((err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve2(result);
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

// dist/shared/bin/session-metadata-worker.mjs
import { appendFile, mkdir as mkdir5, open as open4, readdir as readdir3 } from "node:fs/promises";

// dist/shared/lease.mjs
import { closeSync, ftruncateSync, openSync, readFileSync, rmSync, statSync, futimesSync, writeSync } from "node:fs";
function touchLeaseIfHolder(path, pid) {
  let fd;
  try {
    fd = openSync(path, "r+");
    if (readFileSync(fd, "utf8").trim() !== String(pid))
      return false;
    const now = /* @__PURE__ */ new Date();
    futimesSync(fd, now, now);
    return true;
  } catch {
    return false;
  } finally {
    if (fd !== void 0)
      closeSync(fd);
  }
}
function releaseLeaseIfHolder(path, pid) {
  try {
    if (readFileSync(path, "utf8").trim() !== String(pid))
      return false;
    rmSync(path, { force: true });
    return true;
  } catch {
    return false;
  }
}

// dist/shared/bin/session-metadata-worker.mjs
var import_proper_lockfile3 = __toESM(require_proper_lockfile(), 1);
import { homedir as homedir3 } from "node:os";
import { join as join9 } from "node:path";

// dist/shared/config.mjs
import { join } from "node:path";
import { homedir as homedir2 } from "node:os";

// dist/shared/credential-file.mjs
import { dirname, win32 } from "node:path";
var SYSTEM32 = win32.join(process.env.SystemRoot ?? "C:\\Windows", "System32");
var ICACLS_EXE = win32.join(SYSTEM32, "icacls.exe");
var WHOAMI_EXE = win32.join(SYSTEM32, "whoami.exe");
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
function ingestTokenFromEnv(env) {
  return env.FANCYSAUCE_INGEST_TOKEN || env.FANCYSAUCE_TENANT_KEY || "";
}

// dist/shared/credential-paths.mjs
import { homedir } from "node:os";
import { posix, win32 as win322 } from "node:path";
function credentialPaths() {
  if (process.platform === "win32") {
    const programData = process.env.PROGRAMDATA ?? "C:\\ProgramData";
    const appData = process.env.APPDATA ?? win322.join(homedir(), "AppData", "Roaming");
    return {
      system: win322.join(programData, "fancysauce", "credentials.json"),
      user: win322.join(appData, "fancysauce", "credentials.json")
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

// dist/shared/backoff-state.mjs
import { mkdir as mkdir2, readFile, rename, writeFile } from "node:fs/promises";
import { join as join2 } from "node:path";

// dist/shared/locking.mjs
var import_proper_lockfile = __toESM(require_proper_lockfile(), 1);
import { mkdir } from "node:fs/promises";
var LOCK_OPTIONS = {
  realpath: false,
  retries: { retries: 100, minTimeout: 5, maxTimeout: 100, factor: 1.5 },
  stale: 1e4
};
async function withDirLock(dir, fn, retries = LOCK_OPTIONS.retries) {
  await mkdir(dir, { recursive: true });
  const release = await import_proper_lockfile.default.lock(dir, { ...LOCK_OPTIONS, retries });
  try {
    return await fn();
  } finally {
    await release();
  }
}

// dist/shared/backoff-state.mjs
var DEFAULT = {
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
    this.path = join2(dir, "backoff.json");
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
      const buf = await readFile(this.path, "utf8");
      return { ...DEFAULT, ...JSON.parse(buf) };
    } catch (err) {
      if (err.code === "ENOENT") {
        return { ...DEFAULT };
      }
      throw err;
    }
  }
  async save(f) {
    await mkdir2(this.dir, { recursive: true });
    await writeFile(this.tmpPath, JSON.stringify(f), "utf8");
    await rename(this.tmpPath, this.path);
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
  return await new Promise((resolve2) => {
    let settled = false;
    const settle = (r) => {
      if (settled)
        return;
      settled = true;
      resolve2(r);
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

// dist/shared/whoami/credential.mjs
import { readFileSync as readFileSync2, statSync as statSync2 } from "node:fs";
import { posix as posix3, win32 as win324 } from "node:path";

// dist/shared/hash.mjs
import { createHash, createHmac } from "node:crypto";
function sha256Hex(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// dist/shared/whoami/credential.mjs
var FINGERPRINT_HEX_CHARS = 12;
function whoamiCredentialPaths() {
  const parsed = parseCredentialPathsEnv();
  return parsed ? { system: parsed.system, user: parsed.user } : credentialPaths();
}
function pathFlavor() {
  return process.platform === "win32" ? win324 : posix3;
}
function resolveCredentialSync(opts = {}) {
  const paths = opts.paths ?? whoamiCredentialPaths();
  const env = opts.env ?? process.env;
  const sys = readOneSync(paths.system);
  if (sys.kind === "ok")
    return withFingerprint("system", sys.token, sys.apiEndpoint, sys.ingestEndpoint);
  if (sys.kind === "malformed")
    return null;
  const usr = readOneSync(paths.user);
  if (usr.kind === "ok")
    return withFingerprint("user", usr.token, usr.apiEndpoint, usr.ingestEndpoint);
  if (usr.kind === "malformed")
    return null;
  const tenantKey = ingestTokenFromEnv(env);
  if (KEY_RE.test(tenantKey))
    return withFingerprint("env_tenant_key", tenantKey, null);
  const apiKey = env.FANCYSAUCE_API_KEY;
  if (apiKey)
    return withFingerprint("env_api_key", apiKey, null);
  return null;
}
function withFingerprint(tier, token, apiEndpoint, ingestEndpoint) {
  return {
    tier,
    token,
    apiEndpoint,
    fingerprint: sha256Hex(token).slice(0, FINGERPRINT_HEX_CHARS),
    ...ingestEndpoint !== void 0 ? { ingestEndpoint } : {}
  };
}
function readOneSync(path) {
  let raw;
  try {
    raw = readFileSync2(path, "utf8");
  } catch (err) {
    if (err.code === "ENOENT")
      return { kind: "absent" };
    return { kind: "malformed" };
  }
  if (process.platform !== "win32") {
    try {
      if (permissiveModeReason(statSync2(path).mode) !== null)
        return { kind: "malformed" };
    } catch {
      return { kind: "malformed" };
    }
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "malformed" };
  }
  const v = validateCredentialFile(parsed);
  if (v.kind !== "ok")
    return { kind: "malformed" };
  return {
    kind: "ok",
    token: v.cred.credential,
    apiEndpoint: v.cred.api_endpoint ?? null,
    ...v.cred.endpoint !== void 0 ? { ingestEndpoint: v.cred.endpoint } : {}
  };
}

// dist/shared/whoami/cache.mjs
import { closeSync as closeSync2, mkdirSync, openSync as openSync2, readFileSync as readFileSync3, readdirSync, renameSync, rmSync as rmSync2, statSync as statSync3, writeSync as writeSync2 } from "node:fs";
var WHOAMI_SCHEMA_VERSION = 1;
var SUCCESS_TTL_MS = 6 * 60 * 60 * 1e3;
var ERROR_TTL_MS = 15 * 60 * 1e3;
var CACHE_PREFIX = "whoami-cache-";
var CACHE_SUFFIX = ".json";
var TMP_ORPHAN_MAX_AGE_MS = 60 * 60 * 1e3;
function whoamiCachePath(fingerprint, opts = {}) {
  const p = pathFlavor();
  return p.join(credentialDir(opts), `${CACHE_PREFIX}${fingerprint}${CACHE_SUFFIX}`);
}
function credentialDir(opts = {}) {
  if (opts.dir !== void 0)
    return opts.dir;
  return pathFlavor().dirname(whoamiCredentialPaths().user);
}
function readWhoamiCacheAnyAge(fingerprint, opts = {}) {
  let entry;
  try {
    const parsed = JSON.parse(readFileSync3(whoamiCachePath(fingerprint, opts), "utf8"));
    const validated = validateEntry(parsed);
    if (validated === null)
      return null;
    entry = validated;
  } catch {
    return null;
  }
  if (entry.credential_fingerprint !== fingerprint)
    return null;
  return entry;
}
function validateEntry(v) {
  if (typeof v !== "object" || v === null)
    return null;
  const o = v;
  if (o.schema_version !== WHOAMI_SCHEMA_VERSION)
    return null;
  if (typeof o.fetched_at !== "number")
    return null;
  if (typeof o.credential_fingerprint !== "string")
    return null;
  const result = o.result === void 0 ? void 0 : parseWhoamiResult(o.result);
  const error = parseErrorKind(o.error);
  if (result === void 0 && error === void 0)
    return null;
  const hasPluginFlagsTimestamp = o.plugin_flags_fetched_at !== void 0;
  const pluginFlagsFetchedAt = typeof o.plugin_flags_fetched_at === "number" ? o.plugin_flags_fetched_at : void 0;
  const pluginFlags = hasPluginFlagsTimestamp && pluginFlagsFetchedAt === void 0 ? void 0 : parsePluginFlags(o.plugin_flags);
  const grantBinding = parseGrantBinding(o.grant_binding);
  if (o.grant_binding !== void 0 && grantBinding === void 0)
    return null;
  return {
    schema_version: WHOAMI_SCHEMA_VERSION,
    fetched_at: o.fetched_at,
    credential_fingerprint: o.credential_fingerprint,
    ...result !== void 0 ? { result } : {},
    ...error !== void 0 ? { error } : {},
    ...pluginFlags !== void 0 ? {
      plugin_flags: pluginFlags,
      ...pluginFlagsFetchedAt !== void 0 ? { plugin_flags_fetched_at: pluginFlagsFetchedAt } : {}
    } : {},
    ...grantBinding !== void 0 ? { grant_binding: grantBinding } : {}
  };
}
function parseGrantBinding(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return void 0;
  const o = value;
  if (typeof o.api_endpoint !== "string" || typeof o.ingest_endpoint !== "string" || typeof o.tenant_assertion !== "string") {
    return void 0;
  }
  return {
    api_endpoint: o.api_endpoint,
    ingest_endpoint: o.ingest_endpoint,
    tenant_assertion: o.tenant_assertion
  };
}
function parsePluginFlags(v) {
  if (typeof v !== "object" || v === null || Array.isArray(v))
    return void 0;
  const out = {};
  for (const [key, value] of Object.entries(v)) {
    if (typeof value === "boolean")
      out[key] = value;
  }
  return out;
}
function parseErrorKind(v) {
  return v === "rejected" || v === "rate_limited" || v === "server" || v === "transport" ? v : void 0;
}
function parseWhoamiResult(v) {
  if (typeof v !== "object" || v === null)
    return void 0;
  const o = v;
  if (typeof o.logged_in !== "boolean")
    return void 0;
  if (typeof o.tenant_id !== "string")
    return void 0;
  const user = parseUser(o.user);
  if (user === void 0)
    return void 0;
  const key = parseKey(o.key);
  if (key === void 0)
    return void 0;
  const pluginFlags = parsePluginFlags(o.plugin_flags);
  return {
    logged_in: o.logged_in,
    user,
    tenant_id: o.tenant_id,
    key,
    ...pluginFlags !== void 0 ? { plugin_flags: pluginFlags } : {}
  };
}
function parseUser(v) {
  if (v === null)
    return null;
  if (typeof v !== "object")
    return void 0;
  const o = v;
  if (typeof o.id !== "string")
    return void 0;
  const name = o.name === null || typeof o.name === "string" ? o.name : void 0;
  if (name === void 0)
    return void 0;
  const email = o.email_masked === null || typeof o.email_masked === "string" ? o.email_masked : void 0;
  if (email === void 0)
    return void 0;
  return { id: o.id, name, email_masked: email };
}
function parseKey(v) {
  if (typeof v !== "object" || v === null)
    return void 0;
  const o = v;
  if (typeof o.id !== "string")
    return void 0;
  if (typeof o.env !== "string")
    return void 0;
  if (o.scope !== null && typeof o.scope !== "string")
    return void 0;
  if (typeof o.user_resolution_mode !== "string")
    return void 0;
  if (typeof o.vended_via !== "string")
    return void 0;
  if (typeof o.source_type !== "string")
    return void 0;
  if (typeof o.superseded !== "boolean")
    return void 0;
  return {
    id: o.id,
    env: o.env,
    scope: o.scope,
    user_resolution_mode: o.user_resolution_mode,
    vended_via: o.vended_via,
    source_type: o.source_type,
    superseded: o.superseded
  };
}

// dist/shared/whoami/flags.mjs
var PLUGIN_FLAG_SESSION_NAMING = "fancytab-session-naming";
var PLUGIN_FLAGS_MAX_AGE_MS = 24 * 60 * 60 * 1e3;
var NO_PLUGIN_FLAGS = Object.freeze({});
function readPluginFlags(opts = {}) {
  const resolved = resolveCredentialSync({
    ...opts.paths !== void 0 ? { paths: opts.paths } : {},
    ...opts.env !== void 0 ? { env: opts.env } : {}
  });
  if (resolved === null)
    return NO_PLUGIN_FLAGS;
  const cacheOpts = opts.dir !== void 0 ? { dir: opts.dir } : {};
  const entry = readWhoamiCacheAnyAge(resolved.fingerprint, cacheOpts);
  if (!matchesGrantBinding(entry, opts))
    return NO_PLUGIN_FLAGS;
  const fetchedAt = entry?.plugin_flags_fetched_at;
  if (entry?.plugin_flags === void 0 || fetchedAt === void 0)
    return NO_PLUGIN_FLAGS;
  const now = opts.now ?? Date.now();
  if (!Number.isFinite(fetchedAt) || fetchedAt > now || now - fetchedAt > PLUGIN_FLAGS_MAX_AGE_MS) {
    return NO_PLUGIN_FLAGS;
  }
  return entry.plugin_flags;
}
function matchesGrantBinding(entry, opts) {
  const bound = opts.apiEndpoint !== void 0 || opts.ingestEndpoint !== void 0 || opts.expectedTenantId !== void 0;
  if (!bound)
    return true;
  if (entry?.grant_binding === void 0)
    return false;
  if (opts.apiEndpoint !== void 0 && entry.grant_binding.api_endpoint !== opts.apiEndpoint)
    return false;
  if (opts.ingestEndpoint !== void 0 && entry.grant_binding.ingest_endpoint !== opts.ingestEndpoint)
    return false;
  if (entry.result !== void 0 && entry.grant_binding.tenant_assertion !== entry.result.tenant_id)
    return false;
  if (opts.expectedTenantId !== void 0 && entry.grant_binding.tenant_assertion !== opts.expectedTenantId)
    return false;
  return true;
}

// dist/agents/codex/auth-claim.mjs
import { join as join3 } from "node:path";
function resolveCodexHome(env, homeDir) {
  return env.CODEX_HOME && env.CODEX_HOME.length > 0 ? env.CODEX_HOME : join3(homeDir, ".codex");
}

// dist/agents/codex/thread-name-reader.mjs
import { execFile } from "node:child_process";
import { promisify as promisify2 } from "node:util";
import { existsSync } from "node:fs";
import { dirname as dirname2, join as join5, resolve } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// dist/shared/types.mjs
var WORK_REF_FIELDS = ["system", "kind", "id", "scope", "source"];
var MAX_REFS_PER_EVENT = 10;
function workRefField(item, field) {
  if (typeof item !== "object" || item === null)
    return void 0;
  return item[field];
}
function validateWorkRefList(value) {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_REFS_PER_EVENT)
    return void 0;
  const refs = [];
  for (const item of value) {
    const ref = {};
    for (const field of WORK_REF_FIELDS) {
      const fieldValue = workRefField(item, field);
      if (typeof fieldValue !== "string" || fieldValue === "")
        return void 0;
      ref[field] = fieldValue;
    }
    refs.push(ref);
  }
  return refs;
}

// dist/shared/session-metadata/delivery.mjs
import { isDeepStrictEqual } from "node:util";
var MAX_ENCODED_LOG_RECORD_BYTES = 4096;
var MAX_RECAP_BYTES = 4 * 1024 * 1024;
var MAX_RECAP_CHUNKS = 4096;
var MAX_NAME_CODE_POINTS = 120;
async function captureMetadata(input) {
  const current = await input.state.read();
  if (current === null)
    return { kind: "captured", staged: 0 };
  const result = await input.reader.read(current, input.diagnostic);
  if (result.payloads.length > 0) {
    const appended = await input.outbox.append(result.payloads);
    if (appended.written < result.payloads.length) {
      if (input.diagnostic !== void 0) {
        try {
          await input.diagnostic("outbox-full");
        } catch {
        }
      }
      return { kind: "outbox-full", staged: 0 };
    }
  }
  const stateChanged = !isDeepStrictEqual(current, result.nextState);
  if ((result.payloads.length > 0 || stateChanged) && input.isBindingValid !== void 0 && !await input.isBindingValid()) {
    return { kind: "grant-invalid", staged: 0 };
  }
  if (stateChanged)
    await input.state.write(result.nextState);
  return { kind: "captured", staged: result.payloads.length };
}
async function deliverMetadata(input) {
  if (input.flags[PLUGIN_FLAG_SESSION_NAMING] !== true)
    return { published: 0 };
  let published = 0;
  const deliveredIds = [];
  const rejectedIds = [];
  let retryable = false;
  let retryAfterMs;
  for (const payload of await input.outbox.readPending()) {
    if (input.isGrantValid !== void 0 && !await input.isGrantValid())
      break;
    let outcome;
    try {
      outcome = await input.publish(payload);
    } catch {
      outcome = "retryable";
    }
    if (outcome === "ok") {
      deliveredIds.push(payload.payload_id);
      published++;
      continue;
    }
    if (outcome === "rejected") {
      rejectedIds.push(payload.payload_id);
    } else {
      retryable = true;
      if (typeof outcome === "object")
        retryAfterMs = outcome.retryAfterMs;
    }
    break;
  }
  if (deliveredIds.length > 0)
    await input.outbox.markDelivered(deliveredIds);
  if (rejectedIds.length > 0 && input.outbox.markRejected)
    await input.outbox.markRejected(rejectedIds);
  return {
    published,
    ...retryable ? { retryable: true } : {},
    ...retryAfterMs !== void 0 ? { retryAfterMs } : {}
  };
}

// dist/shared/otlp-encoder.mjs
var OtlpLogRecordSizeError = class extends Error {
  eventUuid;
  constructor(eventUuid) {
    super(`Encoded log record exceeds 4096 bytes (event_uuid=${eventUuid})`);
    this.eventUuid = eventUuid;
    this.name = "OtlpLogRecordSizeError";
  }
};
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
  "fancysauce.replay": "string",
  "fancysauce.sequence": "int",
  // session.start
  model: "string",
  permission_mode: "string",
  "fancysauce.repo_url_hash": "string",
  // session.end
  reason: "string",
  duration_wall_s: "int",
  // session.recap
  recap_schema_version: "int",
  recap_id: "string",
  recap_source: "string",
  recap_source_uuid: "string",
  recap_created_at: "string",
  recap_content_sha256: "string",
  recap_total_bytes: "int",
  recap_chunk_index: "int",
  recap_chunk_count: "int",
  recap_text: "string",
  expected_tenant_id: "string",
  // session.name
  naming_schema_version: "int",
  name: "string",
  name_origin: "string",
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
  ref_system: "string",
  ref_kind: "string",
  ref_id: "string",
  ref_scope: "string",
  ref_source: "string",
  refs: "ref_list",
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
  speed: "string",
  api_error: "bool",
  api_error_kind: "string",
  api_error_status: "int",
  // notification
  notification_type: "string",
  quota_type: "string",
  reset_time: "string",
  original_reset_time: "string",
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
  seat_tier: "string",
  rate_limit_tier: "string",
  user_rate_limit_tier: "string",
  billing_type: "string",
  extra_usage_enabled: "bool",
  extra_usage_disabled_reason: "string",
  overage_credit_available: "bool",
  overage_credit_eligible: "bool",
  // usage_limit.exceeded
  limit_message: "string",
  limit_kind_guess: "string",
  reset_at_guess: "int",
  error_type: "string",
  retry_after_seconds: "int",
  // request_id, transcript_message_uuid + api_error_status already typed above (api.request).
  // usage_limit.snapshot + Codex rate-limit lens
  window: "string",
  used_percent: "double",
  resets_at: "int",
  window_minutes: "int",
  reached_type: "string",
  limit_source: "string",
  limit_id: "string",
  credits_has: "bool",
  credits_unlimited: "bool",
  credits_balance: "string",
  auth_plan_claim: "string",
  last_reached_type: "string",
  spend_control_limit: "string",
  spend_control_resets_at: "int",
  // Gauge, like used_percent — see rate-limit-lens.mts's postureHash comment.
  spend_control_remaining_percent: "double",
  // Codex per-window gauge riding api.request. Prefixed per window because a
  // payload can report primary and secondary at once.
  primary_used_percent: "double",
  primary_resets_at: "int",
  primary_window_minutes: "int",
  secondary_used_percent: "double",
  secondary_resets_at: "int",
  secondary_window_minutes: "int",
  // Codex requested-tier resolution (rollout-parser.mts's attachLimitState
  // sibling) + speed posture facts (rate-limit-lens.mts's CodexPosture).
  service_tier_requested: "string",
  // Verbatim vendor record of the observed thread-settings tier — distinct
  // provenance from service_tier_requested above; see rollout-parser.mts.
  // Named service_tier_observed (not service_tier) to avoid colliding with
  // #539's existing backend service_tier cost-dimension vocabulary.
  service_tier_observed: "string",
  fast_available: "bool",
  fast_default: "bool",
  config_service_tier: "string",
  cli_version: "string",
  // usage_spend.snapshot (the /usage cache's spend + extra-usage payload).
  // Every string is an open enum forwarded raw. monthly_limit and
  // used_credits are stringified because their upstream type is unconfirmed.
  // extra_usage_enabled, extra_usage_disabled_reason, plan_type and seat_tier
  // are already registered by the usage_config.changed block above.
  spend_used_minor: "int",
  spend_currency: "string",
  spend_limit_minor: "int",
  spend_percent: "double",
  spend_enabled: "bool",
  spend_disabled_reason: "string",
  spend_limit_reached: "bool",
  extra_usage_monthly_limit: "string",
  extra_usage_used_credits: "string",
  extra_usage_utilization: "double",
  credits_ever_enabled: "bool"
};
var RESOURCE_ATTRIBUTE_KEYS = [
  "service.name",
  "service.version",
  "fancysauce.schema_version",
  "fancysauce.install_id",
  "fancysauce.agent",
  "fancysauce.runtime",
  "fancysauce.plugin",
  "os.type",
  "host.arch",
  "fancysauce.harness_entrypoint",
  "fancysauce.user.identity_source",
  "fancysauce.secure_envelope"
];
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
  for (const key of RESOURCE_ATTRIBUTE_KEYS) {
    const v = r[key];
    if (v === void 0)
      continue;
    out.push({ key, value: { stringValue: String(v) } });
  }
  return out;
}
function encodeLogRecord(event, observedTimeUnixNano) {
  validateSessionMetadataLimits(event);
  const attrs = [
    { key: "fancysauce.event_uuid", value: encodeAnyValue("fancysauce.event_uuid", event.event_uuid) },
    { key: "fancysauce.event_type", value: encodeAnyValue("fancysauce.event_type", event.event_type) },
    { key: "fancysauce.session_id", value: encodeAnyValue("fancysauce.session_id", event.session_id) },
    { key: "fancysauce.source", value: encodeAnyValue("fancysauce.source", event.source) }
  ];
  if (event.replay !== void 0) {
    attrs.push({ key: "fancysauce.replay", value: encodeAnyValue("fancysauce.replay", event.replay) });
  }
  attrs.push({ key: "fancysauce.sequence", value: encodeAnyValue("fancysauce.sequence", event.sequence) });
  for (const [key, val] of Object.entries(event.attributes)) {
    attrs.push({ key, value: encodeAnyValue(key, val) });
  }
  const record = {
    timeUnixNano: event.timestamp_ns.toString(),
    observedTimeUnixNano: observedTimeUnixNano.toString(),
    severityNumber: 9,
    attributes: attrs
  };
  if ((event.event_type === "session.recap" || event.event_type === "session.name") && Buffer.byteLength(JSON.stringify(record), "utf8") > MAX_ENCODED_LOG_RECORD_BYTES) {
    throw new OtlpLogRecordSizeError(event.event_uuid);
  }
  return record;
}
function validateSessionMetadataLimits(event) {
  if (event.event_type === "session.name") {
    const name = event.attributes.name;
    if (typeof name !== "string" || Array.from(name).length < 1 || Array.from(name).length > MAX_NAME_CODE_POINTS) {
      throw new Error(`session.name name must contain 1 to ${MAX_NAME_CODE_POINTS} Unicode code points`);
    }
    return;
  }
  if (event.event_type !== "session.recap")
    return;
  const text = event.attributes.recap_text;
  if (typeof text === "string" && Buffer.byteLength(text, "utf8") > MAX_RECAP_BYTES) {
    throw new Error(`session.recap content exceeds ${MAX_RECAP_BYTES} decoded bytes`);
  }
  const totalBytes = event.attributes.recap_total_bytes;
  if (typeof totalBytes === "number" && totalBytes > MAX_RECAP_BYTES || typeof totalBytes === "bigint" && totalBytes > BigInt(MAX_RECAP_BYTES)) {
    throw new Error(`session.recap content exceeds ${MAX_RECAP_BYTES} decoded bytes`);
  }
  const chunkCount = event.attributes.recap_chunk_count;
  if (typeof chunkCount === "number" && chunkCount > MAX_RECAP_CHUNKS || typeof chunkCount === "bigint" && chunkCount > BigInt(MAX_RECAP_CHUNKS)) {
    throw new Error(`session.recap contains more than ${MAX_RECAP_CHUNKS} chunks`);
  }
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
      if (typeof v === "object" && v !== null) {
        throw new Error(`Attribute ${key} typed string requires a scalar, got a list`);
      }
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
    case "ref_list": {
      const refs = validateWorkRefList(v);
      if (!refs) {
        throw new Error(`Attribute ${key} typed ref_list requires an array of 2..${MAX_REFS_PER_EVENT} items with five non-empty string fields (system, kind, id, scope, source)`);
      }
      const values = refs.map((ref) => {
        const fields = WORK_REF_FIELDS.map((field) => {
          const value = ref[field];
          return { key: field, value: { stringValue: value } };
        });
        return { kvlistValue: { values: fields } };
      });
      return { arrayValue: { values } };
    }
  }
}

// dist/shared/session-metadata/claude-reader.mjs
import { createHash as createHash3 } from "node:crypto";
import { open, stat } from "node:fs/promises";

// dist/shared/session-metadata/identity.mjs
import { createHash as createHash2 } from "node:crypto";

// dist/shared/schema-version.mjs
var SCHEMA_VERSION = "1.2.1";

// dist/shared/plugin-version.mjs
import { readFileSync as readFileSync4 } from "node:fs";
import { join as join4 } from "node:path";
function pluginVersion() {
  for (const path of [
    join4(import.meta.dirname, "../../package.json"),
    join4(import.meta.dirname, "../../../package.json")
  ]) {
    try {
      const value = JSON.parse(readFileSync4(path, "utf8"));
      if (typeof value.version === "string" && value.version !== "")
        return value.version;
    } catch {
    }
  }
  return "0.0.0";
}

// dist/shared/session-metadata/identity.mjs
var URL_NAMESPACE = Buffer.from("6ba7b8119dad11d180b400c04fd430c8", "hex");
function resourceAttributes(state) {
  return {
    "service.name": "fancysauce",
    "service.version": pluginVersion(),
    "fancysauce.schema_version": SCHEMA_VERSION,
    "fancysauce.install_id": state.install_id,
    "fancysauce.agent": state.agent,
    "fancysauce.runtime": "node"
  };
}
function uuidV5Url(tuple) {
  const bytes = createHash2("sha1").update(URL_NAMESPACE).update(JSON.stringify(tuple)).digest().subarray(0, 16);
  bytes[6] = bytes[6] & 15 | 80;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = bytes.toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

// dist/shared/session-metadata/claude-reader.mjs
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var RFC3339_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/;
var CONTINUITY_CHECKPOINT_BYTES = 4096;
var CLAUDE_READ_CHUNK_BYTES = 64 * 1024;
var MAX_ENCODED_RECAP_LINE_BYTES = MAX_RECAP_BYTES * 6 + 64 * 1024;
var CLAUDE_READ_WINDOW_BYTES = MAX_ENCODED_RECAP_LINE_BYTES + 64 * 1024;
function createClaudeMetadataReader() {
  return { read: readClaudeTranscript };
}
async function readClaudeTranscript(state, diagnostic) {
  if (state.agent !== "claude-code")
    return { payloads: [], nextState: state };
  const liveBoundary = parseTimestamp(state.capture_started_at);
  if (liveBoundary === null)
    return { payloads: [], nextState: state };
  const source = await inspectSource(state.source_file_identity, state.byte_offset);
  if (source === null)
    return { payloads: [], nextState: state };
  const continuityInvalid = source.size < state.byte_offset || state.source_file_id !== void 0 && state.source_file_id !== source.fileId || state.source_continuity_checkpoint !== void 0 && (state.source_continuity_checkpoint.offset !== state.byte_offset || source.checkpoint === void 0 || state.source_continuity_checkpoint.sha256 !== source.checkpoint.sha256);
  const readState = continuityInvalid ? {
    ...state,
    byte_offset: 0,
    source_file_id: void 0,
    source_continuity_checkpoint: void 0
  } : state;
  const observedTime = BigInt(Date.now()) * 1000000n;
  const payloads = [];
  const resource = resourceAttributes(state);
  const diagnosticCounts = /* @__PURE__ */ new Map();
  const result = await readClaudeLines({
    path: readState.source_file_identity,
    startOffset: readState.byte_offset,
    onLine: (line) => {
      const parsed = parseAwaySummary(line);
      if (parsed === null)
        return;
      if ("invalidKind" in parsed) {
        incrementDiagnostic(diagnosticCounts, parsed.invalidKind);
        return;
      }
      const recap = parsed.recap;
      if (recap.sessionId !== readState.session_id) {
        incrementDiagnostic(diagnosticCounts, "foreign-session");
        return;
      }
      const timestamp = parseTimestamp(recap.timestamp);
      if (timestamp === null) {
        incrementDiagnostic(diagnosticCounts, "invalid-timestamp");
        return;
      }
      if (!isInEnabledInterval(readState, timestamp.nanoseconds, liveBoundary.nanoseconds))
        return;
      if (Buffer.byteLength(recap.content, "utf8") > MAX_RECAP_BYTES) {
        incrementDiagnostic(diagnosticCounts, "blocked-capture");
        return;
      }
      payloads.push(buildPayload(readState, recap, timestamp.nanoseconds, observedTime, resource));
    },
    onBlockedLine: (boundedPrefix) => incrementDiagnostic(diagnosticCounts, identifiesEligibleAwaySummary(boundedPrefix) ? "blocked-capture" : "oversized-line")
  });
  if (diagnostic !== void 0) {
    for (const [kind, count] of diagnosticCounts) {
      try {
        await diagnostic(kind, count);
      } catch {
      }
    }
  }
  const pendingPayloadIds = payloads.map((payload) => payload.payload_id);
  const after = await inspectSource(readState.source_file_identity);
  if (result.fileId !== void 0 && (after?.fileId !== result.fileId || result.checkpoint === null)) {
    return { payloads, nextState: readState };
  }
  return {
    payloads,
    nextState: {
      ...readState,
      byte_offset: result.endOffset,
      ...after !== null ? {
        source_file_id: after.fileId,
        source_continuity_checkpoint: result.checkpoint ?? void 0
      } : {},
      pending_payload_ids: [...readState.pending_payload_ids, ...pendingPayloadIds]
    }
  };
}
async function inspectSource(path, offset) {
  try {
    const metadata = await stat(path);
    if (offset === void 0 || metadata.size < offset) {
      return { fileId: `${metadata.dev}:${metadata.ino}`, size: metadata.size };
    }
    const checkpoint = await readCheckpointFromPath(path, offset, metadata.size);
    if (checkpoint === null)
      return null;
    return { fileId: `${metadata.dev}:${metadata.ino}`, size: metadata.size, checkpoint };
  } catch (error) {
    if (error.code === "ENOENT")
      return null;
    throw error;
  }
}
async function readClaudeLines(input) {
  let fh = null;
  try {
    try {
      fh = await open(input.path, "r");
    } catch (error) {
      if (error.code === "ENOENT") {
        return { endOffset: input.startOffset };
      }
      throw error;
    }
    const metadata = await fh.stat();
    const fileId = `${metadata.dev}:${metadata.ino}`;
    const effectiveStart = metadata.size < input.startOffset ? 0 : input.startOffset;
    if (metadata.size <= effectiveStart) {
      return { endOffset: effectiveStart, fileId, checkpoint: await readCheckpoint(fh, effectiveStart, metadata.size) };
    }
    const chunk = Buffer.alloc(CLAUDE_READ_CHUNK_BYTES);
    let position = effectiveStart;
    let endOffset = effectiveStart;
    let lineParts = [];
    let lineBytes = 0;
    let lineTooLong = false;
    let bytesReadTotal = 0;
    let readLineAfterBlocked = false;
    let stopAfterLine = false;
    while (position < metadata.size && !stopAfterLine) {
      const beyondWindow = lineTooLong || readLineAfterBlocked;
      const remainingWindow = CLAUDE_READ_WINDOW_BYTES - bytesReadTotal;
      if (!beyondWindow && remainingWindow <= 0)
        break;
      const result = await fh.read(chunk, 0, Math.min(chunk.length, metadata.size - position, beyondWindow ? metadata.size - position : remainingWindow), position);
      if (result.bytesRead === 0)
        break;
      bytesReadTotal += result.bytesRead;
      const bytes = chunk.subarray(0, result.bytesRead);
      let partStart = 0;
      for (; ; ) {
        const newline = bytes.indexOf(10, partStart);
        const partEnd = newline < 0 ? bytes.length : newline;
        const part = bytes.subarray(partStart, partEnd);
        if (!lineTooLong) {
          if (lineBytes + part.length > MAX_ENCODED_RECAP_LINE_BYTES) {
            lineParts.push(Buffer.from(part.subarray(0, MAX_ENCODED_RECAP_LINE_BYTES - lineBytes)));
            lineTooLong = true;
          } else {
            lineParts.push(Buffer.from(part));
            lineBytes += part.length;
          }
        }
        if (newline < 0)
          break;
        if (lineTooLong) {
          input.onBlockedLine(Buffer.concat(lineParts).toString("utf8"));
          stopAfterLine = readLineAfterBlocked;
          readLineAfterBlocked = !stopAfterLine;
        } else {
          input.onLine(Buffer.concat(lineParts).toString("utf8"));
          stopAfterLine = readLineAfterBlocked;
          readLineAfterBlocked = false;
        }
        endOffset = position + newline + 1;
        lineParts = [];
        lineBytes = 0;
        lineTooLong = false;
        partStart = newline + 1;
        if (partStart >= bytes.length)
          break;
      }
      position += result.bytesRead;
    }
    return { endOffset, fileId, checkpoint: await readCheckpoint(fh, endOffset, metadata.size) };
  } finally {
    if (fh !== null)
      await fh.close();
  }
}
function identifiesEligibleAwaySummary(boundedPrefix) {
  if (!/(?:^\{|,)\s*"subtype"\s*:\s*"away_summary"/.test(boundedPrefix))
    return false;
  return true;
}
function incrementDiagnostic(counts, kind) {
  counts.set(kind, (counts.get(kind) ?? 0) + 1);
}
async function readCheckpoint(fh, offset, size) {
  if (size < offset)
    return null;
  const length = Math.min(CONTINUITY_CHECKPOINT_BYTES, offset);
  const start = offset - length;
  const bytes = Buffer.alloc(length);
  if (length > 0) {
    const result = await fh.read(bytes, 0, length, start);
    if (result.bytesRead !== length)
      return null;
  }
  return {
    offset,
    sha256: createHash3("sha256").update(bytes).digest("hex")
  };
}
async function readCheckpointFromPath(path, offset, size) {
  const fh = await open(path, "r");
  try {
    return await readCheckpoint(fh, offset, size);
  } finally {
    await fh.close();
  }
}
function isInEnabledInterval(state, timestamp, legacyBoundaryNanoseconds) {
  if (legacyBoundaryNanoseconds !== void 0 && timestamp < legacyBoundaryNanoseconds)
    return false;
  const intervals = state.enabled_capture_intervals;
  if (intervals === void 0) {
    const boundary = legacyBoundaryNanoseconds === void 0 ? parseTimestamp(state.capture_started_at)?.nanoseconds : legacyBoundaryNanoseconds;
    return boundary !== void 0 && timestamp >= boundary;
  }
  return intervals.some((interval) => {
    const started = parseTimestamp(interval.started_at);
    if (started === null || timestamp < started.nanoseconds)
      return false;
    if (interval.ended_at === void 0)
      return true;
    const ended = parseTimestamp(interval.ended_at);
    return ended !== null && timestamp < ended.nanoseconds;
  });
}
function parseAwaySummary(line) {
  let value;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isRecord(value) || value.type !== "system" || value.subtype !== "away_summary" || value.isSidechain === true) {
    return null;
  }
  if (typeof value.uuid !== "string" || !UUID_RE.test(value.uuid)) {
    return { invalidKind: "invalid-uuid" };
  }
  if (typeof value.sessionId !== "string") {
    return { invalidKind: "foreign-session" };
  }
  if (typeof value.timestamp !== "string" || parseTimestamp(value.timestamp) === null) {
    return { invalidKind: "invalid-timestamp" };
  }
  if (typeof value.content !== "string") {
    return { invalidKind: "invalid-record" };
  }
  return { recap: {
    type: "system",
    subtype: "away_summary",
    uuid: value.uuid,
    sessionId: value.sessionId,
    timestamp: value.timestamp,
    content: value.content
  } };
}
function buildPayload(state, recap, timestampNanoseconds, observedTime, resource) {
  const contentBytes = Buffer.byteLength(recap.content, "utf8");
  if (contentBytes > MAX_RECAP_BYTES) {
    throw new Error(`Claude recap exceeds ${MAX_RECAP_BYTES} decoded bytes`);
  }
  const contentHash = createHash3("sha256").update(recap.content, "utf8").digest("hex");
  const chunks = splitContent({
    state,
    recap,
    timestampNanoseconds,
    observedTime,
    contentHash,
    contentBytes,
    resource
  });
  if (chunks.length > MAX_RECAP_CHUNKS) {
    throw new Error(`Claude recap exceeds ${MAX_RECAP_CHUNKS} chunks`);
  }
  const envelope = encodeOtlp(chunks, resource, observedTime);
  const eventUuid = chunks[0].event_uuid;
  return {
    payload_id: eventUuid,
    event_uuid: eventUuid,
    observed_time_unix_nano: observedTime.toString(),
    envelope
  };
}
function splitContent(input) {
  const codePoints = Array.from(input.recap.content);
  let chunkCount = 1;
  const seenCounts = /* @__PURE__ */ new Set();
  for (; ; ) {
    if (seenCounts.has(chunkCount))
      throw new Error("unable to determine Claude recap chunk count");
    seenCounts.add(chunkCount);
    const chunks = splitForCount(input, codePoints, chunkCount);
    if (chunks.length === chunkCount)
      return chunks;
    if (chunks.length > MAX_RECAP_CHUNKS)
      throw new Error(`Claude recap exceeds ${MAX_RECAP_CHUNKS} chunks`);
    chunkCount = chunks.length;
  }
}
function splitForCount(input, codePoints, chunkCount) {
  const chunks = [];
  let start = 0;
  let chunkIndex = 0;
  do {
    let low = start + (start === codePoints.length ? 0 : 1);
    const emptyEvent = makeEvent(input, "", chunkIndex, chunkCount);
    const emptyRecordBytes = encodedRecordBytes(emptyEvent, input.resource, input.observedTime);
    const maxTextBytes = Math.max(1, MAX_ENCODED_LOG_RECORD_BYTES - emptyRecordBytes + 2);
    let high = Math.min(codePoints.length, start + maxTextBytes);
    let best = start;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const text = codePoints.slice(start, middle).join("");
      if (emptyRecordBytes - 2 + Buffer.byteLength(JSON.stringify(text), "utf8") <= MAX_ENCODED_LOG_RECORD_BYTES) {
        best = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    if (best === start && start < codePoints.length) {
      throw new Error("Claude recap chunk cannot fit the encoded log record limit");
    }
    chunks.push(makeEvent(input, codePoints.slice(start, best).join(""), chunkIndex, chunkCount));
    start = best;
    chunkIndex++;
  } while (start < codePoints.length || codePoints.length === 0 && chunks.length === 0);
  return chunks;
}
function makeEvent(input, text, chunkIndex, chunkCount) {
  const tuple = [
    "fancysauce/session-recap/v1",
    "claude-code",
    input.state.session_id,
    input.recap.uuid,
    input.recap.timestamp,
    input.contentHash,
    chunkIndex,
    chunkCount
  ];
  const attributes = {
    recap_schema_version: 1,
    recap_id: input.recap.uuid,
    recap_source: "claude_away_summary",
    recap_source_uuid: input.recap.uuid,
    recap_created_at: input.recap.timestamp,
    recap_content_sha256: input.contentHash,
    recap_total_bytes: input.contentBytes,
    recap_chunk_index: chunkIndex,
    recap_chunk_count: chunkCount,
    recap_text: text,
    expected_tenant_id: input.state.tenant_id
  };
  return {
    event_uuid: uuidV5Url(tuple),
    event_type: "session.recap",
    session_id: input.state.session_id,
    source: "transcript.tail",
    sequence: chunkIndex,
    timestamp_ns: input.timestampNanoseconds,
    attributes
  };
}
function encodedRecordBytes(event, resource, observedTime) {
  try {
    const envelope = encodeOtlp([event], resource, observedTime);
    const record = envelope.resourceLogs[0].scopeLogs[0].logRecords[0];
    return Buffer.byteLength(JSON.stringify(record), "utf8");
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}
function parseTimestamp(value) {
  const match = RFC3339_RE.exec(value);
  if (match === null)
    return null;
  const milliseconds = Date.parse(`${match[1]}${match[3]}`);
  if (!Number.isFinite(milliseconds))
    return null;
  const fraction = (match[2] ?? "").padEnd(9, "0");
  return {
    nanoseconds: BigInt(milliseconds) * 1000000n + BigInt(fraction || "0")
  };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// dist/agents/codex/thread-name-reader.mjs
var execFileAsync = promisify2(execFile);
var HELPER_DEADLINE_MS = 1e3;
var HELPER_BATCH_SIZE = 1e4;
var MAX_CONCURRENT_HELPERS = 4;
var UNAVAILABLE_DIAGNOSTIC = "codex-name-capture-unavailable";
var FAILED_DIAGNOSTIC = "codex-name-capture-failed";
function codexSqliteNodeSupport(nodeVersion = process.versions.node) {
  const match = /^(\d+)\.(\d+)/.exec(nodeVersion);
  if (match === null)
    return "unavailable";
  const major = Number(match[1]);
  const minor = Number(match[2]);
  if (major < 22 || major === 22 && minor < 12)
    return "unavailable";
  if (major === 22 && minor === 12 || major === 23 && minor < 4)
    return "experimental-flag";
  return "available";
}
function codexThreadNameHelperNodeArgs(nodeVersion = process.versions.node) {
  return codexSqliteNodeSupport(nodeVersion) === "experimental-flag" ? ["--experimental-sqlite"] : [];
}
function createCodexThreadNameReader(options) {
  const helperPath = options.helperPath ?? resolveHelperPath();
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  const unavailableDiagnostics = /* @__PURE__ */ new Set();
  const batchResults = /* @__PURE__ */ new Map();
  return {
    readBatch: async (states, diagnostic) => {
      const pending = states.filter((state) => state.agent === "codex-cli" && state.first_name_observation === void 0).map((state) => ({
        id: state.session_id,
        rolloutPath: state.source_file_identity,
        key: lookupKey(state.session_id, state.source_file_identity)
      }));
      if (pending.length === 0 || codexSqliteNodeSupport(nodeVersion) === "unavailable")
        return;
      const names = await readNamesWithHelper({
        helperPath,
        databasePath: join5(options.codexHome, "state_5.sqlite"),
        threads: pending.map(({ id, rolloutPath }) => ({ id, rolloutPath })),
        nodeVersion
      }, diagnostic);
      for (const { key } of pending)
        batchResults.set(key, names.get(key) ?? null);
    },
    read: (state, diagnostic) => readCodexThreadName(state, options.codexHome, helperPath, nodeVersion, diagnostic, unavailableDiagnostics, batchResults)
  };
}
async function readCodexThreadName(state, codexHome, helperPath, nodeVersion, diagnostic, unavailableDiagnostics, batchResults) {
  if (state.agent !== "codex-cli" || state.first_name_observation !== void 0) {
    return { payloads: [], nextState: state };
  }
  const observedTime = BigInt(Date.now()) * 1000000n;
  if (!isInEnabledInterval(state, observedTime)) {
    return { payloads: [], nextState: state };
  }
  if (codexSqliteNodeSupport(nodeVersion) === "unavailable") {
    if (diagnostic !== void 0 && unavailableDiagnostics !== void 0 && !unavailableDiagnostics.has(state.install_id)) {
      unavailableDiagnostics.add(state.install_id);
      try {
        await diagnostic(UNAVAILABLE_DIAGNOSTIC);
      } catch {
      }
    }
    return { payloads: [], nextState: state };
  }
  const key = lookupKey(state.session_id, state.source_file_identity);
  const name = batchResults?.has(key) ? batchResults.get(key) ?? null : await readNamesWithHelper({
    helperPath,
    databasePath: join5(codexHome, "state_5.sqlite"),
    threads: [{ id: state.session_id, rolloutPath: state.source_file_identity }],
    nodeVersion
  }, diagnostic).then((names) => names.get(key) ?? null);
  batchResults?.delete(key);
  if (!isValidName(name))
    return { payloads: [], nextState: state };
  const payload = buildNamePayload(state, name, observedTime);
  return {
    payloads: [payload],
    nextState: {
      ...state,
      first_name_observation: {
        name,
        observed_at: new Date(Number(observedTime / 1000000n)).toISOString()
      },
      pending_payload_ids: [...state.pending_payload_ids, payload.payload_id]
    }
  };
}
async function readNamesWithHelper(input, diagnostic) {
  const deadline = Date.now() + HELPER_DEADLINE_MS;
  const chunks = [];
  for (let start = 0; start < input.threads.length; start += HELPER_BATCH_SIZE) {
    chunks.push(input.threads.slice(start, start + HELPER_BATCH_SIZE));
  }
  const names = /* @__PURE__ */ new Map();
  let nextChunk = 0;
  const readNext = async () => {
    while (nextChunk < chunks.length) {
      const threads = chunks[nextChunk++];
      const timeout = deadline - Date.now();
      if (threads === void 0 || timeout <= 0)
        return;
      const chunkNames = await readNamesChunk({ ...input, threads, timeout }, diagnostic);
      for (const [key, name] of chunkNames)
        names.set(key, name);
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_HELPERS, chunks.length) }, readNext));
  return names;
}
async function readNamesChunk(input, diagnostic) {
  try {
    const resultPromise = execFileAsync(process.execPath, [
      ...codexThreadNameHelperNodeArgs(input.nodeVersion),
      input.helperPath,
      "--database-path",
      input.databasePath
    ], {
      encoding: "utf8",
      timeout: input.timeout,
      killSignal: "SIGKILL",
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true
    });
    const stdin = resultPromise.child.stdin;
    stdin?.on("error", () => {
    });
    stdin?.end(JSON.stringify(input.threads));
    const result = await resultPromise;
    const parsed = JSON.parse(String(result.stdout));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("invalid Codex thread-name helper output");
    }
    const threads = parsed.threads;
    if (!Array.isArray(threads))
      throw new Error("invalid Codex thread-name helper output");
    const names = /* @__PURE__ */ new Map();
    for (const thread of threads) {
      if (typeof thread !== "object" || thread === null || Array.isArray(thread))
        continue;
      const id = thread.id;
      const rolloutPath = thread.rollout_path;
      const name = thread.name;
      if (typeof id !== "string" || typeof rolloutPath !== "string")
        continue;
      names.set(lookupKey(id, rolloutPath), typeof name === "string" ? name : null);
    }
    return names;
  } catch {
    if (diagnostic !== void 0) {
      try {
        await diagnostic(FAILED_DIAGNOSTIC);
      } catch {
      }
    }
    return /* @__PURE__ */ new Map();
  }
}
function lookupKey(threadId, rolloutPath) {
  return `${threadId}\0${rolloutPath}`;
}
function isValidName(name) {
  return name !== null && name.length > 0 && Array.from(name).length <= MAX_NAME_CODE_POINTS;
}
function buildNamePayload(state, name, observedTime) {
  const event = {
    event_uuid: uuidV5Url([
      "fancysauce/session-name/v1",
      "codex-cli",
      state.session_id,
      name
    ]),
    event_type: "session.name",
    session_id: state.session_id,
    source: "import",
    sequence: 0,
    timestamp_ns: observedTime,
    attributes: {
      naming_schema_version: 1,
      name,
      name_origin: "codex_thread_name",
      expected_tenant_id: state.tenant_id
    }
  };
  const envelope = encodeOtlp([event], resourceAttributes(state), observedTime);
  return {
    payload_id: event.event_uuid,
    event_uuid: event.event_uuid,
    observed_time_unix_nano: observedTime.toString(),
    envelope
  };
}
function resolveHelperPath() {
  const moduleDir = dirname2(fileURLToPath2(import.meta.url));
  const candidates = [
    join5(moduleDir, "codex-thread-name-reader.mjs"),
    resolve(moduleDir, "../../../dist/shared/bin/codex-thread-name-reader.mjs")
  ];
  return candidates.find((path) => existsSync(path)) ?? candidates[0];
}

// dist/shared/session-metadata/outbox.mjs
import { mkdir as mkdir3, open as open2, readFile as readFile2, readdir, rename as rename2, rmdir, unlink } from "node:fs/promises";
import { dirname as dirname3, join as join6 } from "node:path";
import { randomBytes } from "node:crypto";
var METADATA_OUTBOX_MAX_BYTES = 100 * 1024 * 1024;
var METADATA_REJECTED_MAX_BYTES = 10 * 1024 * 1024;
var PENDING_FILE = "pending.ndjson";
var REJECTED_FILE = "rejected.ndjson";
var MetadataOutboxCapacity = class {
  dir;
  onScanForTest;
  retries;
  snapshot = null;
  lockHeld = false;
  scanCount = 0;
  constructor(dir, onScanForTest, retries) {
    this.dir = dir;
    this.onScanForTest = onScanForTest;
    this.retries = retries;
  }
  async run(work) {
    if (this.lockHeld)
      return work();
    return withDirLock(this.dir, async () => {
      this.snapshot = await scanCapacity(this.dir);
      this.scanCount++;
      this.onScanForTest?.(this.scanCount);
      this.lockHeld = true;
      try {
        return await work();
      } finally {
        this.lockHeld = false;
        this.snapshot = null;
      }
    }, this.retries);
  }
  async account(work) {
    if (this.lockHeld && this.snapshot !== null)
      return work(this.snapshot);
    return this.run(() => work(this.requireSnapshot()));
  }
  /** Test-only count of installation tree scans. */
  scanCountForTest() {
    return this.scanCount;
  }
  requireSnapshot() {
    if (this.snapshot === null)
      throw new Error("metadata capacity lock is not held");
    return this.snapshot;
  }
};
async function mergeMetadataOutbox(incomingDir, heldDir, afterEntryMergedForTest) {
  try {
    await rename2(incomingDir, heldDir);
    await syncDirectory(dirname3(incomingDir));
    return;
  } catch (error) {
    if (isNodeError(error, "ENOENT") && !await directoryExists(incomingDir))
      return;
    if (!await directoryExists(heldDir))
      throw error;
  }
  while (true) {
    const entries = await readdir(incomingDir, { withFileTypes: true });
    if (entries.length === 0)
      break;
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const incomingPath = join6(incomingDir, entry.name);
      const heldPath = join6(heldDir, entry.name);
      if (!await pathExists(heldPath)) {
        await rename2(incomingPath, heldPath);
        await syncDirectory(incomingDir);
        await syncDirectory(heldDir);
        continue;
      }
      if (entry.isDirectory()) {
        await mergeMetadataOutbox(incomingPath, heldPath, afterEntryMergedForTest);
        continue;
      }
      if (entry.name === PENDING_FILE || entry.name === REJECTED_FILE) {
        await mergePayloadFiles(incomingPath, heldPath);
      }
      await afterEntryMergedForTest?.(entry.name);
      await unlink(incomingPath);
      await syncDirectory(incomingDir);
    }
  }
  await rmdir(incomingDir);
  await syncDirectory(dirname3(incomingDir));
}
var MetadataOutbox = class {
  dir;
  capacityDir;
  rejectedCapBytes;
  capacity;
  pendingPath;
  rejectedPath;
  capBytes;
  constructor(dir, capBytes = METADATA_OUTBOX_MAX_BYTES, capacityDir = dir, rejectedCapBytes = METADATA_REJECTED_MAX_BYTES, capacity = new MetadataOutboxCapacity(capacityDir)) {
    this.dir = dir;
    this.capacityDir = capacityDir;
    this.rejectedCapBytes = rejectedCapBytes;
    this.capacity = capacity;
    this.pendingPath = join6(dir, PENDING_FILE);
    this.rejectedPath = join6(dir, REJECTED_FILE);
    this.capBytes = capBytes;
  }
  async append(payloads) {
    if (payloads.length === 0)
      return { written: 0, dropped: 0, sizeAfter: await this.size() };
    return this.capacity.account(async (capacity) => {
      await mkdir3(this.capacityDir, { recursive: true, mode: 448 });
      await mkdir3(this.dir, { recursive: true, mode: 448 });
      await syncDirectory(this.capacityDir);
      await syncDirectory(this.dir);
      const sizeBeforeRepair = await fileSize(this.pendingPath);
      await repairTrailingLine(this.pendingPath);
      capacity.pendingBytes += await fileSize(this.pendingPath) - sizeBeforeRepair;
      const pending = await readPayloadFile(this.pendingPath);
      const rejected = await readPayloadFile(this.rejectedPath);
      const known = new Set([...pending, ...rejected].map((item) => item.payload_id));
      const additions = payloads.filter((item) => !known.has(item.payload_id));
      const currentSize = capacity.pendingBytes;
      const additionBytes = additions.reduce((sum, item) => sum + encodedBytes(item), 0);
      if (currentSize + additionBytes > this.capBytes) {
        return { written: 0, dropped: additions.length, sizeAfter: currentSize };
      }
      if (additions.length > 0) {
        const fh = await open2(this.pendingPath, "a", 384);
        try {
          for (const item of additions)
            await fh.writeFile(JSON.stringify(item) + "\n", "utf8");
          await fh.sync();
        } finally {
          await fh.close();
        }
        await syncDirectory(this.dir);
        await syncDirectory(this.capacityDir);
        capacity.pendingBytes += additionBytes;
      }
      return {
        written: payloads.length,
        dropped: 0,
        sizeAfter: currentSize + additionBytes
      };
    });
  }
  async readPending() {
    return readPayloadFile(this.pendingPath);
  }
  async markDelivered(payloadIds) {
    if (payloadIds.length === 0)
      return;
    await repairTrailingLine(this.pendingPath);
    const pending = await readPayloadFile(this.pendingPath);
    const remove = new Set(payloadIds);
    await replacePayloadFile(this.pendingPath, pending.filter((item) => !remove.has(item.payload_id)));
  }
  async markRejected(payloadIds) {
    if (payloadIds.length === 0)
      return;
    try {
      await this.capacity.account(async (capacity) => {
        const pendingSizeBefore = await fileSize(this.pendingPath);
        await repairTrailingLine(this.pendingPath);
        const pending = await readPayloadFile(this.pendingPath);
        const remove = new Set(payloadIds);
        const rejected = pending.filter((item) => remove.has(item.payload_id));
        if (rejected.length > 0) {
          await retainRejectedAcrossCapacity(capacity, this.rejectedPath, rejected, this.rejectedCapBytes);
        }
        await replacePayloadFile(this.pendingPath, pending.filter((item) => !remove.has(item.payload_id)));
        capacity.pendingBytes += await fileSize(this.pendingPath) - pendingSizeBefore;
      });
    } catch (error) {
      if (!isNodeError(error, "ELOCKED"))
        throw error;
    }
  }
  async size() {
    return this.capacity.account((capacity) => Promise.resolve(capacity.pendingBytes));
  }
};
async function readPayloadFile(path) {
  let raw;
  try {
    raw = await readFile2(path, "utf8");
  } catch {
    return [];
  }
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line)
      continue;
    try {
      const parsed = JSON.parse(line);
      if (isPayload(parsed))
        out.push(parsed);
    } catch {
    }
  }
  return out;
}
async function mergePayloadFiles(incomingPath, heldPath) {
  await repairTrailingLine(heldPath);
  await repairTrailingLine(incomingPath);
  const held = await readPayloadFile(heldPath);
  const known = new Set(held.map((payload) => payload.payload_id));
  const additions = [];
  for (const payload of await readPayloadFile(incomingPath)) {
    if (known.has(payload.payload_id))
      continue;
    known.add(payload.payload_id);
    additions.push(payload);
  }
  await replacePayloadFile(heldPath, [...held, ...additions]);
}
async function repairTrailingLine(path) {
  let raw;
  try {
    raw = await readFile2(path);
  } catch {
    return;
  }
  if (raw.length === 0 || raw[raw.length - 1] === 10)
    return;
  const lastNewline = raw.lastIndexOf(10);
  const trailing = raw.subarray(lastNewline + 1);
  try {
    const parsed = JSON.parse(trailing.toString("utf8"));
    if (isPayload(parsed)) {
      const fh2 = await open2(path, "a");
      try {
        await fh2.write("\n", null, "utf8");
        await fh2.sync();
      } finally {
        await fh2.close();
      }
      return;
    }
  } catch {
  }
  const quarantine = `${path}.corrupt.${process.pid}.${randomBytes(4).toString("hex")}`;
  const quarantineFh = await open2(quarantine, "wx", 384);
  try {
    await quarantineFh.writeFile(trailing);
    await quarantineFh.sync();
  } finally {
    await quarantineFh.close();
  }
  const fh = await open2(path, "r+");
  try {
    await fh.truncate(lastNewline + 1);
    await fh.sync();
  } finally {
    await fh.close();
  }
  await syncDirectory(dirname3(path));
}
function isPayload(value) {
  if (typeof value !== "object" || value === null)
    return false;
  const o = value;
  return typeof o.payload_id === "string" && typeof o.event_uuid === "string" && typeof o.observed_time_unix_nano === "string" && "envelope" in o;
}
function encodedBytes(payload) {
  return Buffer.byteLength(JSON.stringify(payload), "utf8") + 1;
}
async function retainRejectedAcrossCapacity(capacity, currentPath, additions, maxBytes) {
  if (capacity.rejectedEntries.length === 0 && additions.length === 0)
    return;
  const entries = capacity.rejectedEntries.map((entry, order) => ({ ...entry, order }));
  const existingByPath = groupRejectedByPath(entries);
  for (const payload of additions) {
    entries.push({ path: currentPath, payload, order: entries.length, addition: true });
  }
  let sequence = entries.reduce((highest, entry) => Math.max(highest, rejectionSequence(entry.payload)), 0);
  for (const entry of entries) {
    if (entry.addition || rejectionSequence(entry.payload) === 0) {
      const rejectedPayload = {
        ...entry.payload,
        rejected_sequence: ++sequence
      };
      entry.payload = rejectedPayload;
    }
  }
  const kept = retainNewestRejected(entries, maxBytes);
  const byPath = new Map(Array.from(existingByPath.keys(), (path) => [path, []]));
  if (additions.length > 0 || byPath.size === 0)
    byPath.set(currentPath, []);
  for (const entry of kept)
    byPath.get(entry.path)?.push(entry.payload);
  for (const [path, payloads] of byPath) {
    const existing = existingByPath.get(path) ?? [];
    const unchanged = existing.length === payloads.length && existing.every((payload, index) => payload === payloads[index]);
    if (!unchanged)
      await replacePayloadFile(path, payloads);
  }
  capacity.rejectedEntries = kept.map((entry, order) => ({ ...entry, order, addition: false }));
  capacity.rejectedBytes = kept.reduce((total, entry) => total + encodedBytes(entry.payload), 0);
}
function groupRejectedByPath(entries) {
  const byPath = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const payloads = byPath.get(entry.path) ?? [];
    payloads.push(entry.payload);
    byPath.set(entry.path, payloads);
  }
  return byPath;
}
function retainNewestRejected(entries, maxBytes) {
  const newestFirst = [...entries].sort((left, right) => rejectionSequence(right.payload) - rejectionSequence(left.payload) || right.order - left.order);
  const kept = [];
  let size = 0;
  for (const entry of newestFirst) {
    const bytes = encodedBytes(entry.payload);
    if (size + bytes > maxBytes)
      continue;
    kept.push(entry);
    size += bytes;
  }
  return kept.sort((left, right) => rejectionSequence(left.payload) - rejectionSequence(right.payload) || left.order - right.order);
}
function rejectionSequence(payload) {
  const value = payload.rejected_sequence;
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : 0;
}
function isNodeError(error, code) {
  return error instanceof Error && error.code === code;
}
async function fileSize(path) {
  try {
    const fh = await open2(path, "r");
    try {
      return (await fh.stat()).size;
    } finally {
      await fh.close();
    }
  } catch {
    return 0;
  }
}
async function pathExists(path) {
  try {
    const fh = await open2(path, "r");
    await fh.close();
    return true;
  } catch {
    return directoryExists(path);
  }
}
async function directoryExists(path) {
  try {
    await readdir(path);
    return true;
  } catch {
    return false;
  }
}
async function scanCapacity(root) {
  const snapshot = {
    pendingBytes: 0,
    rejectedBytes: 0,
    rejectedEntries: []
  };
  await scanCapacityDirectory(root, snapshot);
  return snapshot;
}
async function scanCapacityDirectory(root, snapshot) {
  const entries = await readdir(root, { withFileTypes: true, encoding: "utf8" }).catch(() => null);
  if (entries === null)
    return;
  entries.sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const path = join6(root, entry.name);
    if (entry.isDirectory()) {
      await scanCapacityDirectory(path, snapshot);
    } else if (entry.name === PENDING_FILE) {
      snapshot.pendingBytes += await fileSize(path);
    } else if (entry.name === REJECTED_FILE) {
      await repairTrailingLine(path);
      for (const payload of await readPayloadFile(path)) {
        snapshot.rejectedEntries.push({
          path,
          payload,
          order: snapshot.rejectedEntries.length,
          addition: false
        });
        snapshot.rejectedBytes += encodedBytes(payload);
      }
    }
  }
}
async function replacePayloadFile(path, payloads) {
  await mkdir3(dirname3(path), { recursive: true, mode: 448 });
  const tmp = `${path}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  let renamed = false;
  try {
    const fh = await open2(tmp, "wx", 384);
    try {
      await fh.writeFile(payloads.length === 0 ? "" : `${payloads.map((item) => JSON.stringify(item)).join("\n")}
`, "utf8");
      await fh.sync();
    } finally {
      await fh.close();
    }
    await rename2(tmp, path);
    renamed = true;
    await syncDirectory(dirname3(path));
  } finally {
    if (!renamed)
      await unlink(tmp).catch(() => {
      });
  }
}
async function syncDirectory(path) {
  try {
    const fh = await open2(path, "r");
    try {
      await fh.sync();
    } finally {
      await fh.close();
    }
  } catch (error) {
    if (process.platform !== "win32")
      throw error;
  }
}

// dist/shared/session-metadata/schedule.mjs
import { createHash as createHash4 } from "node:crypto";
import { dirname as dirname5, join as join8 } from "node:path";

// dist/shared/session-metadata/state.mjs
var import_proper_lockfile2 = __toESM(require_proper_lockfile(), 1);
import { mkdir as mkdir4, open as open3, readFile as readFile3, readdir as readdir2, rename as rename3, unlink as unlink2 } from "node:fs/promises";
import { basename, dirname as dirname4, join as join7 } from "node:path";
import { randomBytes as randomBytes2 } from "node:crypto";
var SESSION_METADATA_SCHEMA_VERSION = 1;
var PENDING_GRANT_TRANSITION_FILE = "grant-transition.pending.ndjson";
var PENDING_SESSION_REGISTRATION_FILE = "session-registration.pending.ndjson";
var STATE_FILE = "state.json";
function transitionGrant(state, enabled, at) {
  const transitions = state.grant_transitions ?? [
    { at: state.capture_started_at, enabled: true }
  ];
  const intervals = state.enabled_capture_intervals ?? [
    { started_at: state.capture_started_at }
  ];
  const lastTransition = transitions[transitions.length - 1];
  if (lastTransition?.enabled === enabled && state.grant_transitions !== void 0 && state.enabled_capture_intervals !== void 0) {
    return state;
  }
  const nextIntervals = intervals.map((interval) => ({ ...interval }));
  if (enabled) {
    nextIntervals.push({ started_at: at });
  } else {
    const open5 = nextIntervals[nextIntervals.length - 1];
    if (open5 !== void 0 && open5.ended_at === void 0)
      open5.ended_at = at;
  }
  return {
    ...state,
    grant_transitions: [...transitions, { at, enabled }],
    enabled_capture_intervals: nextIntervals
  };
}
function grantTransitionChanges(state, enabled) {
  if (state.grant_transitions === void 0 || state.grant_transitions.length === 0 || state.enabled_capture_intervals === void 0 || state.enabled_capture_intervals.length === 0) {
    return true;
  }
  return state.grant_transitions[state.grant_transitions.length - 1]?.enabled !== enabled;
}
async function foldPendingGrantTransitions(dir) {
  const paths = await pendingGrantTransitionPaths(dir);
  if (paths.length === 0)
    return;
  const claimed = paths.filter((path) => basename(path) !== PENDING_GRANT_TRANSITION_FILE);
  const pendingPath = join7(dir, PENDING_GRANT_TRANSITION_FILE);
  const processingPath = `${pendingPath}.processing.${unixNanosecondClaim()}.${process.pid}.${randomBytes2(4).toString("hex")}`;
  try {
    await rename3(pendingPath, processingPath);
    const firstMarker = claimed.findIndex((path) => basename(path).startsWith(`${PENDING_GRANT_TRANSITION_FILE}.marker.`));
    claimed.splice(firstMarker < 0 ? claimed.length : firstMarker, 0, processingPath);
    await syncDirectory2(dir);
  } catch (error) {
    if (!isNodeError2(error, "ENOENT"))
      throw error;
  }
  if (claimed.length === 0)
    return;
  const markers = await readPendingGrantTransitions(claimed, true);
  const store = new SessionMetadataStateStore(dir);
  const current = await store.read();
  if (current === null)
    throw new Error("cannot fold grant transition without session state");
  let next = current;
  for (const marker of markers) {
    const alreadyApplied = next.grant_transitions?.some((transition) => transition.at === marker.at && transition.enabled === marker.enabled) ?? false;
    if (!alreadyApplied && grantTransitionChanges(next, marker.enabled)) {
      next = transitionGrant(next, marker.enabled, marker.at);
    }
  }
  if (next !== current)
    await store.write(next);
  for (const path of claimed) {
    await unlink2(path).catch((error) => {
      if (!isNodeError2(error, "ENOENT"))
        throw error;
    });
  }
  await syncDirectory2(dir);
}
async function foldPendingSessionRegistrations(dir) {
  const paths = await pendingSessionRegistrationPaths(dir);
  if (paths.length === 0)
    return;
  const claimed = paths.filter((path) => basename(path) !== PENDING_SESSION_REGISTRATION_FILE);
  const pendingPath = join7(dir, PENDING_SESSION_REGISTRATION_FILE);
  const processingPath = `${pendingPath}.processing.${unixNanosecondClaim()}.${process.pid}.${randomBytes2(4).toString("hex")}`;
  try {
    await rename3(pendingPath, processingPath);
    claimed.push(processingPath);
    await syncDirectory2(dir);
  } catch (error) {
    if (!isNodeError2(error, "ENOENT"))
      throw error;
  }
  if (claimed.length === 0)
    return;
  const markers = await readPendingSessionRegistrations(claimed, true);
  const store = new SessionMetadataStateStore(dir);
  const current = await store.read();
  let next = current;
  for (const marker of markers) {
    if (next !== null)
      continue;
    next = {
      schema_version: SESSION_METADATA_SCHEMA_VERSION,
      tenant_id: marker.tenant_id,
      credential_fingerprint: marker.credential_fingerprint,
      endpoint_identity: marker.endpoint_identity,
      install_id: marker.install_id,
      agent: marker.agent,
      session_id: marker.session_id,
      ...marker.codex_home !== void 0 ? { codex_home: marker.codex_home } : {},
      capture_started_at: marker.capture_started_at,
      source_file_identity: marker.source_file_identity,
      byte_offset: 0,
      grant_transitions: [{ at: marker.capture_started_at, enabled: true }],
      enabled_capture_intervals: [{ started_at: marker.capture_started_at }],
      pending_payload_ids: []
    };
  }
  if (next !== current && next !== null)
    await store.write(next);
  for (const path of claimed) {
    await unlink2(path).catch((error) => {
      if (!isNodeError2(error, "ENOENT"))
        throw error;
    });
  }
  await syncDirectory2(dir);
}
async function withSessionWorkerLock(dir, work, retries = 0) {
  const workerLockDir = join7(dir, "worker-lock");
  await mkdir4(workerLockDir, { recursive: true, mode: 448 });
  let release;
  try {
    release = await import_proper_lockfile2.default.lock(workerLockDir, { realpath: false, retries, stale: 1e4 });
  } catch (error) {
    if (isNodeError2(error, "ELOCKED"))
      return null;
    throw error;
  }
  try {
    await foldPendingGrantTransitions(dir);
    await foldPendingSessionRegistrations(dir);
    return await work();
  } finally {
    await release();
  }
}
async function pendingSessionRegistrationPaths(dir) {
  let entries;
  try {
    entries = await readdir2(dir, { withFileTypes: true });
  } catch (error) {
    if (isNodeError2(error, "ENOENT"))
      return [];
    throw error;
  }
  const processingPrefix = `${PENDING_SESSION_REGISTRATION_FILE}.processing.`;
  const processing = entries.filter((entry) => entry.isFile() && entry.name.startsWith(processingPrefix) && !entry.name.includes(".corrupt.")).map((entry) => join7(dir, entry.name)).sort();
  if (entries.some((entry) => entry.isFile() && entry.name === PENDING_SESSION_REGISTRATION_FILE)) {
    processing.push(join7(dir, PENDING_SESSION_REGISTRATION_FILE));
  }
  return processing;
}
async function pendingGrantTransitionPaths(dir) {
  let entries;
  try {
    entries = await readdir2(dir, { withFileTypes: true });
  } catch (error) {
    if (isNodeError2(error, "ENOENT"))
      return [];
    throw error;
  }
  const processingPrefix = `${PENDING_GRANT_TRANSITION_FILE}.processing.`;
  const markerPrefix = `${PENDING_GRANT_TRANSITION_FILE}.marker.`;
  const processing = entries.filter((entry) => entry.isFile() && entry.name.startsWith(processingPrefix) && !entry.name.includes(".corrupt.")).map((entry) => join7(dir, entry.name)).sort();
  const markers = entries.filter((entry) => entry.isFile() && entry.name.startsWith(markerPrefix) && !entry.name.includes(".corrupt.")).map((entry) => join7(dir, entry.name)).sort();
  if (entries.some((entry) => entry.isFile() && entry.name === PENDING_GRANT_TRANSITION_FILE)) {
    processing.push(join7(dir, PENDING_GRANT_TRANSITION_FILE));
  }
  return [...processing, ...markers];
}
async function readPendingGrantTransitions(paths, quarantineInvalid = false) {
  const markers = [];
  for (const path of paths) {
    let raw;
    try {
      raw = await readFile3(path);
    } catch (error) {
      if (isNodeError2(error, "ENOENT"))
        continue;
      throw error;
    }
    const corrupt = [];
    let offset = 0;
    while (offset < raw.length) {
      const newline = raw.indexOf(10, offset);
      if (newline === -1) {
        corrupt.push(raw.subarray(offset));
        break;
      }
      const line = raw.subarray(offset, newline);
      const marker = parsePendingGrantTransition(line);
      if (marker === null)
        corrupt.push(raw.subarray(offset, newline + 1));
      else
        markers.push(marker);
      offset = newline + 1;
    }
    if (quarantineInvalid && corrupt.length > 0) {
      await appendCorruptGrantTransitions(path, Buffer.concat(corrupt));
    }
  }
  return markers;
}
async function readPendingSessionRegistrations(paths, quarantineInvalid = false) {
  const markers = [];
  for (const path of paths) {
    let raw;
    try {
      raw = await readFile3(path);
    } catch (error) {
      if (isNodeError2(error, "ENOENT"))
        continue;
      throw error;
    }
    const corrupt = [];
    let offset = 0;
    while (offset < raw.length) {
      const newline = raw.indexOf(10, offset);
      if (newline === -1) {
        corrupt.push(raw.subarray(offset));
        break;
      }
      const line = raw.subarray(offset, newline);
      const marker = parsePendingSessionRegistration(line);
      if (marker === null)
        corrupt.push(raw.subarray(offset, newline + 1));
      else
        markers.push(marker);
      offset = newline + 1;
    }
    if (quarantineInvalid && corrupt.length > 0) {
      await appendCorruptSessionRegistrations(path, Buffer.concat(corrupt));
    }
  }
  return markers;
}
async function appendCorruptGrantTransitions(path, raw) {
  const processingPrefix = `${PENDING_GRANT_TRANSITION_FILE}.processing.`;
  const markerPrefix = `${PENDING_GRANT_TRANSITION_FILE}.marker.`;
  const name = basename(path);
  const prefix = name.startsWith(processingPrefix) ? processingPrefix : markerPrefix;
  const suffix = name.slice(prefix.length);
  const claim = suffix.slice(0, suffix.indexOf("."));
  const quarantine = `${path}.corrupt.${claim}`;
  const fh = await open3(quarantine, "a", 384);
  try {
    await fh.writeFile(raw);
    await fh.sync();
  } finally {
    await fh.close();
  }
  await syncDirectory2(dirname4(path));
}
async function appendCorruptSessionRegistrations(path, raw) {
  const processingPrefix = `${PENDING_SESSION_REGISTRATION_FILE}.processing.`;
  const suffix = basename(path).slice(processingPrefix.length);
  const claim = suffix.slice(0, suffix.indexOf("."));
  const quarantine = `${path}.corrupt.${claim}`;
  const fh = await open3(quarantine, "a", 384);
  try {
    await fh.writeFile(raw);
    await fh.sync();
  } finally {
    await fh.close();
  }
  await syncDirectory2(dirname4(path));
}
function parsePendingGrantTransition(lineBytes) {
  let parsed;
  try {
    parsed = JSON.parse(lineBytes.toString("utf8"));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return null;
  const marker = parsed;
  const keys = Object.keys(marker);
  if (keys.length !== 2 || !keys.includes("at") || !keys.includes("enabled"))
    return null;
  if (typeof marker.at !== "string" || marker.at === "" || typeof marker.enabled !== "boolean")
    return null;
  const normalized = { at: marker.at, enabled: marker.enabled };
  if (!Buffer.from(JSON.stringify(normalized)).equals(lineBytes))
    return null;
  return normalized;
}
function parsePendingSessionRegistration(lineBytes) {
  let parsed;
  try {
    parsed = JSON.parse(lineBytes.toString("utf8"));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return null;
  const marker = parsed;
  const normalized = {
    tenant_id: marker.tenant_id,
    credential_fingerprint: marker.credential_fingerprint,
    endpoint_identity: marker.endpoint_identity,
    install_id: marker.install_id,
    agent: marker.agent,
    session_id: marker.session_id,
    source_file_identity: marker.source_file_identity,
    capture_started_at: marker.capture_started_at,
    ...marker.codex_home !== void 0 ? { codex_home: marker.codex_home } : {}
  };
  const keys = Object.keys(marker);
  const normalizedKeys = Object.keys(normalized);
  if (keys.length !== normalizedKeys.length || keys.some((key, index) => key !== normalizedKeys[index]))
    return null;
  if (typeof normalized.tenant_id !== "string" || normalized.tenant_id === "")
    return null;
  if (typeof normalized.credential_fingerprint !== "string" || normalized.credential_fingerprint === "")
    return null;
  if (typeof normalized.endpoint_identity !== "string" || normalized.endpoint_identity === "")
    return null;
  if (typeof normalized.install_id !== "string" || normalized.install_id === "")
    return null;
  if (normalized.agent !== "claude-code" && normalized.agent !== "codex-cli")
    return null;
  if (typeof normalized.session_id !== "string" || normalized.session_id === "")
    return null;
  if (typeof normalized.source_file_identity !== "string" || normalized.source_file_identity === "")
    return null;
  if (typeof normalized.capture_started_at !== "string" || normalized.capture_started_at === "")
    return null;
  if (normalized.agent === "claude-code" && normalized.codex_home !== void 0)
    return null;
  if (normalized.agent === "codex-cli" && (typeof normalized.codex_home !== "string" || normalized.codex_home === ""))
    return null;
  if (!Buffer.from(JSON.stringify(normalized)).equals(lineBytes))
    return null;
  return normalized;
}
function unixNanosecondClaim() {
  return (BigInt(Date.now()) * 1000000n).toString().padStart(20, "0");
}
function isNodeError2(error, code) {
  return error instanceof Error && "code" in error && error.code === code;
}
var SessionMetadataStateStore = class {
  dir;
  path;
  constructor(dir) {
    this.dir = dir;
    this.path = join7(dir, STATE_FILE);
  }
  async read() {
    let raw;
    try {
      raw = await readFile3(this.path, "utf8");
    } catch {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      return parseState(parsed);
    } catch {
      return null;
    }
  }
  async write(state) {
    assertState(state);
    await withDirLock(this.dir, async () => {
      await mkdir4(this.dir, { recursive: true, mode: 448 });
      const tmp = `${this.path}.${process.pid}.${randomBytes2(4).toString("hex")}.tmp`;
      let renamed = false;
      try {
        const fh = await open3(tmp, "wx", 384);
        try {
          await fh.writeFile(JSON.stringify(state));
          await fh.sync();
        } finally {
          await fh.close();
        }
        await rename3(tmp, this.path);
        renamed = true;
        await syncDirectory2(this.dir);
      } finally {
        if (!renamed)
          await unlink2(tmp).catch(() => {
          });
      }
    });
  }
};
async function syncDirectory2(path) {
  try {
    const fh = await open3(path, "r");
    try {
      await fh.sync();
    } finally {
      await fh.close();
    }
  } catch (error) {
    if (process.platform !== "win32")
      throw error;
  }
}
function parseState(value) {
  if (typeof value !== "object" || value === null)
    return null;
  const o = value;
  if (o.schema_version !== SESSION_METADATA_SCHEMA_VERSION)
    return null;
  if (typeof o.tenant_id !== "string")
    return null;
  if (typeof o.credential_fingerprint !== "string")
    return null;
  if (typeof o.endpoint_identity !== "string")
    return null;
  if (typeof o.install_id !== "string")
    return null;
  if (o.agent !== "claude-code" && o.agent !== "codex-cli")
    return null;
  if (typeof o.session_id !== "string")
    return null;
  const codexHome = parseOptionalString(o.codex_home);
  if (o.codex_home !== void 0 && codexHome === null)
    return null;
  if (typeof o.capture_started_at !== "string")
    return null;
  if (typeof o.source_file_identity !== "string")
    return null;
  if (typeof o.byte_offset !== "number" || !Number.isSafeInteger(o.byte_offset) || o.byte_offset < 0)
    return null;
  const sourceFileId = parseOptionalString(o.source_file_id);
  if (o.source_file_id !== void 0 && sourceFileId === null)
    return null;
  const checkpoint = parseCheckpoint(o.source_continuity_checkpoint);
  if (o.source_continuity_checkpoint !== void 0 && checkpoint === null)
    return null;
  const transitions = parseGrantTransitions(o.grant_transitions);
  if (o.grant_transitions !== void 0 && transitions === null)
    return null;
  const intervals = parseCaptureIntervals(o.enabled_capture_intervals);
  if (o.enabled_capture_intervals !== void 0 && intervals === null)
    return null;
  if (!Array.isArray(o.pending_payload_ids) || !o.pending_payload_ids.every((id) => typeof id === "string"))
    return null;
  const first = parseFirstName(o.first_name_observation);
  if (o.first_name_observation !== void 0 && first === null)
    return null;
  return {
    schema_version: 1,
    tenant_id: o.tenant_id,
    credential_fingerprint: o.credential_fingerprint,
    endpoint_identity: o.endpoint_identity,
    install_id: o.install_id,
    agent: o.agent,
    session_id: o.session_id,
    ...codexHome !== null ? { codex_home: codexHome } : {},
    capture_started_at: o.capture_started_at,
    source_file_identity: o.source_file_identity,
    byte_offset: o.byte_offset,
    ...sourceFileId !== null ? { source_file_id: sourceFileId } : {},
    ...checkpoint !== null ? { source_continuity_checkpoint: checkpoint } : {},
    ...transitions !== null ? { grant_transitions: transitions } : {},
    ...intervals !== null ? { enabled_capture_intervals: intervals } : {},
    ...first !== null ? { first_name_observation: first } : {},
    pending_payload_ids: [...o.pending_payload_ids]
  };
}
function parseOptionalString(value) {
  return value === void 0 ? null : typeof value === "string" ? value : null;
}
function parseCheckpoint(value) {
  if (value === void 0)
    return null;
  if (typeof value !== "object" || value === null)
    return null;
  const o = value;
  if (typeof o.offset !== "number" || !Number.isSafeInteger(o.offset) || o.offset < 0)
    return null;
  if (typeof o.sha256 !== "string")
    return null;
  return { offset: o.offset, sha256: o.sha256 };
}
function parseGrantTransitions(value) {
  if (value === void 0)
    return null;
  if (!Array.isArray(value))
    return null;
  const transitions = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null)
      return null;
    const o = item;
    if (typeof o.at !== "string" || typeof o.enabled !== "boolean")
      return null;
    transitions.push({ at: o.at, enabled: o.enabled });
  }
  return transitions;
}
function parseCaptureIntervals(value) {
  if (value === void 0)
    return null;
  if (!Array.isArray(value))
    return null;
  const intervals = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null)
      return null;
    const o = item;
    if (typeof o.started_at !== "string")
      return null;
    if (o.ended_at !== void 0 && typeof o.ended_at !== "string")
      return null;
    intervals.push({
      started_at: o.started_at,
      ...o.ended_at !== void 0 ? { ended_at: o.ended_at } : {}
    });
  }
  return intervals;
}
function parseFirstName(value) {
  if (value === void 0)
    return null;
  if (typeof value !== "object" || value === null)
    return null;
  const o = value;
  if (typeof o.name !== "string" || typeof o.observed_at !== "string")
    return null;
  return { name: o.name, observed_at: o.observed_at };
}
function assertState(state) {
  if (state.schema_version !== SESSION_METADATA_SCHEMA_VERSION)
    throw new Error("unsupported session metadata state version");
  if (!Number.isSafeInteger(state.byte_offset) || state.byte_offset < 0)
    throw new Error("invalid session metadata byte offset");
  if (!Array.isArray(state.pending_payload_ids))
    throw new Error("invalid session metadata pending payload ids");
}

// dist/shared/session-metadata/schedule.mjs
function metadataBindingKey(input) {
  return createHash4("sha256").update(JSON.stringify([
    input.installId,
    input.credentialFingerprint ?? "unknown-credential",
    input.expectedTenantId ?? "unknown-tenant",
    input.endpoint
  ])).digest("hex");
}
function metadataWorkerLeasePath(input) {
  return join8(input.dataDir, "session-metadata", ".workers", `${metadataBindingKey(input)}.lock`);
}
var METADATA_WORKER_MAX_LEASE_AGE_MS = 6e4;

// dist/shared/bin/session-metadata-worker.mjs
async function runSessionMetadataWorker(opts) {
  const scheduledLeasePath = metadataWorkerLeasePath(opts);
  const resolved = resolveCredentialSync();
  if (resolved === null) {
    releaseLeaseIfHolder(scheduledLeasePath, process.pid);
    return { captured: 0, published: 0, held: false };
  }
  if (opts.credentialFingerprint !== void 0 && opts.credentialFingerprint !== resolved.fingerprint) {
    releaseLeaseIfHolder(scheduledLeasePath, process.pid);
    return { captured: 0, published: 0, held: true };
  }
  const fingerprint = resolved.fingerprint;
  const apiEndpoint = resolved.apiEndpoint ?? API_ENDPOINT;
  const cache = readWhoamiCacheAnyAge(fingerprint);
  const tenantId = opts.expectedTenantId ?? cache?.result?.tenant_id ?? cache?.grant_binding?.tenant_assertion;
  if (!tenantId) {
    releaseLeaseIfHolder(scheduledLeasePath, process.pid);
    return { captured: 0, published: 0, held: false };
  }
  const grant = () => {
    const current = resolveCredentialSync();
    if (current === null || current.fingerprint !== fingerprint)
      return null;
    if ((current.apiEndpoint ?? API_ENDPOINT) !== apiEndpoint)
      return null;
    if (current.ingestEndpoint !== void 0 && current.ingestEndpoint !== opts.endpoint)
      return null;
    const currentCache = readWhoamiCacheAnyAge(fingerprint);
    const currentTenant = currentCache?.result?.tenant_id ?? currentCache?.grant_binding?.tenant_assertion;
    if (currentTenant !== tenantId)
      return null;
    const currentFlags = readPluginFlags({
      apiEndpoint,
      ingestEndpoint: opts.endpoint,
      expectedTenantId: tenantId
    });
    if (currentFlags[PLUGIN_FLAG_SESSION_NAMING] !== true)
      return null;
    return { resolved: current };
  };
  const initialGrant = grant();
  if (initialGrant === null) {
    releaseLeaseIfHolder(scheduledLeasePath, process.pid);
    return { captured: 0, published: 0, held: cache?.grant_binding !== void 0 };
  }
  const bindingDir = join9(opts.dataDir, "session-metadata", opts.agent, opts.sessionId);
  const effectiveCodexHome = resolveCodexHome(process.env, opts.runtimeHome ?? homedir3());
  await mkdir5(bindingDir, { recursive: true, mode: 448 });
  const bindingIdentity = {
    dataDir: opts.dataDir,
    installId: opts.installId,
    credentialFingerprint: fingerprint,
    expectedTenantId: tenantId,
    endpoint: opts.endpoint
  };
  const workerLeasePath = metadataWorkerLeasePath(bindingIdentity);
  const workerLockDir = join9(bindingDir, "worker-lock");
  const metadataDir = join9(opts.dataDir, "session-metadata");
  const capacity = new MetadataOutboxCapacity(metadataDir, opts.testHooks?.onCapacityScan, opts.testHooks?.capacityLockRetries);
  let leaseHeartbeat;
  let releaseWorkerLock;
  try {
    await mkdir5(workerLockDir, { recursive: true, mode: 448 });
    try {
      releaseWorkerLock = await import_proper_lockfile3.default.lock(workerLockDir, { realpath: false, retries: 0, stale: 1e4 });
    } catch {
      return { captured: 0, published: 0, held: false };
    }
    await foldPendingGrantTransitions(bindingDir);
    await foldPendingSessionRegistrations(bindingDir);
    const state = new SessionMetadataStateStore(bindingDir);
    const existing = await state.read();
    if (existing !== null && existing.source_file_identity !== opts.sourcePath) {
      return { captured: 0, published: 0, held: true };
    }
    const observedAt = opts.grantObservedAt ?? (/* @__PURE__ */ new Date()).toISOString();
    const currentGrant = grant();
    if (currentGrant === null) {
      if (existing === null) {
        return { captured: 0, published: 0, held: cache?.grant_binding !== void 0 };
      }
      if (bindingChanged(existing, bindingIdentity)) {
        return { captured: 0, published: 0, held: true };
      }
      const disabled = transitionGrant(existing, false, observedAt);
      if (disabled !== existing)
        await state.write(disabled);
      return { captured: 0, published: 0, held: false };
    }
    let rebound = existing;
    if (existing !== null && bindingChanged(existing, bindingIdentity)) {
      try {
        rebound = await capacity.run(() => rebindSession({
          state,
          existing,
          bindingDir,
          binding: bindingIdentity,
          observedAt,
          afterHeldOutboxEntryMergedForTest: opts.testHooks?.afterHeldOutboxEntryMerged
        }));
      } catch (error) {
        if (isNodeError3(error, "ELOCKED"))
          return { captured: 0, published: 0, held: true };
        throw error;
      }
    }
    if (rebound !== existing)
      await emitDiagnostic(opts.dataDir, "binding-rotated");
    const initial = rebound ?? initialState(opts, fingerprint, tenantId, observedAt, effectiveCodexHome);
    const withOriginHome = initial.agent === "codex-cli" && initial.codex_home === void 0 ? { ...initial, codex_home: effectiveCodexHome } : initial;
    const enabled = transitionGrant(withOriginHome, true, observedAt);
    if (enabled !== initial || existing === null)
      await state.write(enabled);
    const outbox = new MetadataOutbox(join9(bindingDir, "outbox"), void 0, metadataDir, void 0, capacity);
    const claudeReader = createClaudeMetadataReader();
    const codexReaders = /* @__PURE__ */ new Map();
    const codexReaderForHome = (codexHome) => {
      const existingReader = codexReaders.get(codexHome);
      if (existingReader !== void 0)
        return existingReader;
      const reader = createCodexThreadNameReader({ codexHome });
      codexReaders.set(codexHome, reader);
      return reader;
    };
    const readerForState = (sourceState) => {
      if (sourceState.agent === "claude-code")
        return claudeReader;
      if (sourceState.codex_home === void 0)
        return void 0;
      return codexReaderForHome(sourceState.codex_home);
    };
    const sources = [
      { sessionDir: bindingDir, state, outbox },
      ...(await registeredSources(metadataDir, bindingIdentity, capacity)).filter((source) => source.sessionDir !== bindingDir)
    ];
    leaseHeartbeat = startLeaseHeartbeat(scheduledLeasePath);
    try {
      let capturedCount = 0;
      const isCaptureGrantValid = () => grant() !== null;
      const sourceStates = [];
      for (const source of sources) {
        const sourceState = await source.state.read();
        if (sourceState === null)
          continue;
        sourceStates.push({ source, state: sourceState });
      }
      if (opts.reader === void 0) {
        const batches = /* @__PURE__ */ new Map();
        for (const { state: state2 } of sourceStates) {
          if (state2.agent !== "codex-cli" || state2.codex_home === void 0)
            continue;
          const reader = codexReaderForHome(state2.codex_home);
          const batch = batches.get(reader) ?? [];
          batch.push(state2);
          batches.set(reader, batch);
        }
        for (const [reader, states] of batches) {
          await reader.readBatch(states, (kind, count) => emitDiagnostic(opts.dataDir, kind, count));
        }
      }
      let grantInvalid = false;
      try {
        await capacity.run(async () => {
          for (const { source, state: sourceState } of sourceStates) {
            if (sourceState.agent === "codex-cli" && sourceState.codex_home === void 0)
              continue;
            const reader = opts.reader ?? readerForState(sourceState);
            if (reader === void 0)
              continue;
            const capture = async () => {
              await foldPendingGrantTransitions(source.sessionDir);
              return captureMetadata({
                state: source.state,
                outbox: source.outbox,
                reader,
                isBindingValid: isCaptureGrantValid,
                diagnostic: (kind, count) => emitDiagnostic(opts.dataDir, kind, count)
              });
            };
            const captured = source.sessionDir === bindingDir ? await capture() : await withWorkerLock(source.sessionDir, capture);
            if (captured === null)
              continue;
            if (captured.kind === "grant-invalid") {
              grantInvalid = true;
              return;
            }
            capturedCount += captured.staged;
          }
        });
      } catch (error) {
        if (isNodeError3(error, "ELOCKED"))
          return { captured: 0, published: 0, held: true };
        throw error;
      }
      if (grantInvalid || !isCaptureGrantValid())
        return { captured: capturedCount, published: 0, held: true };
      const publish = opts.publish ?? ((payload) => {
        const currentGrant2 = grant();
        if (currentGrant2 === null)
          return Promise.resolve("retryable");
        return publishPayload(payload, opts.endpoint, currentGrant2.resolved.token);
      });
      const backoff = new BackoffState(bindingBackoffDir(bindingIdentity));
      const backoffSnapshot = await backoff.read();
      if (backoffSnapshot.nextRetryAt !== void 0 && backoffSnapshot.nextRetryAt > Date.now()) {
        return { captured: capturedCount, published: 0, held: false };
      }
      const published = await deliverBoundOutboxes({
        sources,
        currentSessionDir: bindingDir,
        publish,
        isGrantValid: () => grant() !== null,
        backoff
      });
      return { captured: capturedCount, published, held: false };
    } finally {
      if (leaseHeartbeat !== void 0)
        clearInterval(leaseHeartbeat);
    }
  } finally {
    if (releaseWorkerLock !== void 0)
      await releaseWorkerLock();
    releaseLeaseIfHolder(workerLeasePath, process.pid);
    if (workerLeasePath !== scheduledLeasePath)
      releaseLeaseIfHolder(scheduledLeasePath, process.pid);
  }
}
function isNodeError3(error, code) {
  return error instanceof Error && error.code === code;
}
function bindingChanged(state, binding) {
  return state.credential_fingerprint !== binding.credentialFingerprint || state.endpoint_identity !== binding.endpoint || state.tenant_id !== binding.expectedTenantId || state.install_id !== binding.installId;
}
async function rebindSession(input) {
  const oldBindingKey = metadataBindingKey({
    dataDir: input.binding.dataDir,
    installId: input.existing.install_id,
    credentialFingerprint: input.existing.credential_fingerprint,
    expectedTenantId: input.existing.tenant_id,
    endpoint: input.existing.endpoint_identity
  });
  await mergeMetadataOutbox(join9(input.bindingDir, "outbox"), join9(input.bindingDir, `outbox.held.${oldBindingKey}`), input.afterHeldOutboxEntryMergedForTest);
  const closed = transitionGrant(input.existing, false, input.observedAt);
  const rebound = transitionGrant({
    ...closed,
    tenant_id: input.binding.expectedTenantId,
    credential_fingerprint: input.binding.credentialFingerprint,
    endpoint_identity: input.binding.endpoint,
    install_id: input.binding.installId,
    capture_started_at: input.observedAt,
    pending_payload_ids: []
  }, true, input.observedAt);
  await input.state.write(rebound);
  return rebound;
}
async function withWorkerLock(sessionDir, work) {
  return withSessionWorkerLock(sessionDir, work);
}
async function deliverBoundOutboxes(input) {
  let published = 0;
  for (const source of input.sources) {
    const deliver = async () => {
      const result2 = await deliverMetadata({
        outbox: source.outbox,
        flags: { [PLUGIN_FLAG_SESSION_NAMING]: true },
        publish: input.publish,
        isGrantValid: input.isGrantValid
      });
      await pruneSettledPayloadIds(source);
      return result2;
    };
    const result = source.sessionDir === input.currentSessionDir ? await deliver() : await withWorkerLock(source.sessionDir, deliver);
    if (result === null)
      continue;
    published += result.published;
    if (result.retryable) {
      if (result.retryAfterMs !== void 0)
        await input.backoff.setRetryAfter(result.retryAfterMs);
      else
        await input.backoff.recordTransient();
      break;
    }
    if (result.published > 0)
      await input.backoff.clear();
  }
  return published;
}
async function pruneSettledPayloadIds(source) {
  const state = await source.state.read();
  if (state === null || state.pending_payload_ids.length === 0)
    return;
  const pending = new Set((await source.outbox.readPending()).map((payload) => payload.payload_id));
  const pendingPayloadIds = state.pending_payload_ids.filter((id) => pending.has(id));
  if (pendingPayloadIds.length === state.pending_payload_ids.length)
    return;
  await source.state.write({ ...state, pending_payload_ids: pendingPayloadIds });
}
async function registeredSources(metadataDir, binding, capacity) {
  const root = join9(metadataDir);
  const sources = [];
  const agentEntries = await readdir3(root, { withFileTypes: true }).catch(() => []);
  for (const agentEntry of agentEntries) {
    if (!agentEntry.isDirectory() || agentEntry.name !== "claude-code" && agentEntry.name !== "codex-cli")
      continue;
    const agentDir = join9(root, agentEntry.name);
    const sessionEntries = await readdir3(agentDir, { withFileTypes: true }).catch(() => []);
    for (const sessionEntry of sessionEntries) {
      if (!sessionEntry.isDirectory())
        continue;
      const sessionDir = join9(agentDir, sessionEntry.name);
      const stateStore = new SessionMetadataStateStore(sessionDir);
      const state = await stateStore.read();
      if (state === null)
        continue;
      if (state.credential_fingerprint !== binding.credentialFingerprint || state.tenant_id !== binding.expectedTenantId || state.endpoint_identity !== binding.endpoint || state.install_id !== binding.installId)
        continue;
      sources.push({
        sessionDir,
        state: stateStore,
        outbox: new MetadataOutbox(join9(sessionDir, "outbox"), void 0, metadataDir, void 0, capacity)
      });
    }
  }
  return sources;
}
function startLeaseHeartbeat(path) {
  const touch = () => {
    touchLeaseIfHolder(path, process.pid);
  };
  touch();
  const timer = setInterval(touch, Math.max(1e3, Math.floor(METADATA_WORKER_MAX_LEASE_AGE_MS / 2)));
  timer.unref();
  return timer;
}
function bindingBackoffDir(binding) {
  return join9(binding.dataDir, "session-metadata", ".bindings", metadataBindingKey(binding));
}
async function emitDiagnostic(dataDir, kind, count = 1) {
  if (kind === "codex-name-capture-unavailable") {
    const markerDir = join9(dataDir, "session-metadata", ".diagnostics");
    const markerPath = join9(markerDir, "codex-name-capture-unavailable");
    await mkdir5(markerDir, { recursive: true, mode: 448 });
    try {
      const marker = await open4(markerPath, "wx", 384);
      await marker.close();
    } catch (error) {
      if (error.code === "EEXIST")
        return;
    }
  }
  const label = kind === "codex-name-capture-unavailable" ? "codex name capture unavailable on this Node version" : kind;
  await appendFile(join9(dataDir, "collect-error.log"), `${(/* @__PURE__ */ new Date()).toISOString()} fancysauce: session metadata ${label} count=${count}
`);
}
function initialState(opts, fingerprint, tenantId, captureStartedAt, effectiveCodexHome) {
  return {
    schema_version: 1,
    tenant_id: tenantId,
    credential_fingerprint: fingerprint,
    endpoint_identity: opts.endpoint,
    install_id: opts.installId,
    agent: opts.agent,
    session_id: opts.sessionId,
    ...opts.agent === "codex-cli" ? { codex_home: effectiveCodexHome } : {},
    capture_started_at: captureStartedAt,
    source_file_identity: opts.sourcePath,
    byte_offset: 0,
    grant_transitions: [{ at: captureStartedAt, enabled: true }],
    enabled_capture_intervals: [{ started_at: captureStartedAt }],
    pending_payload_ids: []
  };
}
async function publishPayload(payload, endpoint, credential) {
  const bodyBytes = Buffer.from(JSON.stringify(payload.envelope), "utf8");
  const result = await postBatch({
    endpoint,
    credential,
    bodyBytes,
    gzip: bodyBytes.length > 8192
  });
  if (result.kind === "ok")
    return "ok";
  if (result.kind === "drop")
    return "rejected";
  if (result.kind === "rate-limited") {
    return { kind: "retryable", retryAfterMs: result.retryAfterMs };
  }
  return "retryable";
}
function argsFromProcess(argv) {
  const get = (name) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : void 0;
  };
  const dataDir = get("--data-dir");
  const installId = get("--install-id");
  const agent = get("--agent");
  const sessionId = get("--session-id");
  const sourcePath = get("--source-path");
  const endpoint = get("--endpoint");
  if (!dataDir || !installId || agent !== "claude-code" && agent !== "codex-cli" || !sessionId || !sourcePath || !endpoint)
    return null;
  return {
    dataDir,
    installId,
    agent,
    sessionId,
    sourcePath,
    runtimeHome: get("--runtime-home") ?? homedir3(),
    endpoint,
    ...get("--credential-fingerprint") ? { credentialFingerprint: get("--credential-fingerprint") } : {},
    ...get("--expected-tenant-id") ? { expectedTenantId: get("--expected-tenant-id") } : {},
    ...get("--grant-observed-at") ? { grantObservedAt: get("--grant-observed-at") } : {}
  };
}
var isMain = isMainModule(import.meta.url, process.argv[1]);
if (isMain) {
  const options = argsFromProcess(process.argv.slice(2));
  if (!options) {
    process.stderr.write("session-metadata-worker requires binding arguments\n");
    process.exit(2);
  }
  void runSessionMetadataWorker(options).then(() => process.exit(0)).catch(async (error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    try {
      await appendFile(join9(options.dataDir, "collect-error.log"), `${(/* @__PURE__ */ new Date()).toISOString()} session metadata: ${message}
`);
    } catch {
    }
    process.exit(1);
  });
}
export {
  runSessionMetadataWorker
};
