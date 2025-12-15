/*!--------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*//******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

export function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

export var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    }
    return __assign.apply(this, arguments);
}

export function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

export function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

export function __param(paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
}

export function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};

export function __runInitializers(thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};

export function __propKey(x) {
    return typeof x === "symbol" ? x : "".concat(x);
};

export function __setFunctionName(f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};

export function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

export function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

export function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

export var __createBinding = Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
});

export function __exportStar(m, o) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}

export function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

export function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

/** @deprecated */
export function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

/** @deprecated */
export function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

export function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
}

export function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

export function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

export function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
}

export function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

export function __makeTemplateObject(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};

var __setModuleDefault = Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
};

export function __importStar(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
}

export function __importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { default: mod };
}

export function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

export function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

export function __classPrivateFieldIn(state, receiver) {
    if (receiver === null || (typeof receiver !== "object" && typeof receiver !== "function")) throw new TypeError("Cannot use 'in' operator on non-object");
    return typeof state === "function" ? receiver === state : state.has(receiver);
}

export function __addDisposableResource(env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;

}

var _SuppressedError = typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

export function __disposeResources(env) {
    function fail(e) {
        env.error = env.hasError ? new _SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
        env.hasError = true;
    }
    function next() {
        while (env.stack.length) {
            var rec = env.stack.pop();
            try {
                var result = rec.dispose && rec.dispose.call(rec.value);
                if (rec.async) return Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
            }
            catch (e) {
                fail(e);
            }
        }
        if (env.hasError) throw env.error;
    }
    return next();
}

export default {
    __extends: __extends,
    __assign: __assign,
    __rest: __rest,
    __decorate: __decorate,
    __param: __param,
    __metadata: __metadata,
    __awaiter: __awaiter,
    __generator: __generator,
    __createBinding: __createBinding,
    __exportStar: __exportStar,
    __values: __values,
    __read: __read,
    __spread: __spread,
    __spreadArrays: __spreadArrays,
    __spreadArray: __spreadArray,
    __await: __await,
    __asyncGenerator: __asyncGenerator,
    __asyncDelegator: __asyncDelegator,
    __asyncValues: __asyncValues,
    __makeTemplateObject: __makeTemplateObject,
    __importStar: __importStar,
    __importDefault: __importDefault,
    __classPrivateFieldGet: __classPrivateFieldGet,
    __classPrivateFieldSet: __classPrivateFieldSet,
    __classPrivateFieldIn: __classPrivateFieldIn,
    __addDisposableResource: __addDisposableResource,
    __disposeResources: __disposeResources,
};


// out-build/vs/nls.messages.js
function $g() {
  return globalThis._VSCODE_NLS_MESSAGES;
}
function $h() {
  return globalThis._VSCODE_NLS_LANGUAGE;
}

// out-build/vs/nls.js
var isPseudo = $h() === "pseudo" || typeof document !== "undefined" && document.location && typeof document.location.hash === "string" && document.location.hash.indexOf("pseudo=true") >= 0;
function _format(message, args) {
  let result;
  if (args.length === 0) {
    result = message;
  } else {
    result = message.replace(/\{(\d+)\}/g, (match, rest) => {
      const index = rest[0];
      const arg = args[index];
      let result2 = match;
      if (typeof arg === "string") {
        result2 = arg;
      } else if (typeof arg === "number" || typeof arg === "boolean" || arg === void 0 || arg === null) {
        result2 = String(arg);
      }
      return result2;
    });
  }
  if (isPseudo) {
    result = "\uFF3B" + result.replace(/[aouei]/g, "$&$&") + "\uFF3D";
  }
  return result;
}
function localize(data, message, ...args) {
  if (typeof data === "number") {
    return _format(lookupMessage(data, message), args);
  }
  return _format(message, args);
}
function lookupMessage(index, fallback) {
  const message = $g()?.[index];
  if (typeof message !== "string") {
    if (typeof fallback === "string") {
      return fallback;
    }
    throw new Error(`!!! NLS MISSING: ${index} !!!`);
  }
  return message;
}

// out-build/vs/base/common/platform.js
var $k = "en";
var _isWindows = false;
var _isMacintosh = false;
var _isLinux = false;
var _isLinuxSnap = false;
var _isNative = false;
var _isWeb = false;
var _isElectron = false;
var _isIOS = false;
var _isCI = false;
var _isMobile = false;
var _locale = void 0;
var _language = $k;
var _platformLocale = $k;
var _translationsConfigFile = void 0;
var _userAgent = void 0;
var $globalThis = globalThis;
var nodeProcess = void 0;
if (typeof $globalThis.vscode !== "undefined" && typeof $globalThis.vscode.process !== "undefined") {
  nodeProcess = $globalThis.vscode.process;
} else if (typeof process !== "undefined" && typeof process?.versions?.node === "string") {
  nodeProcess = process;
}
var isElectronProcess = typeof nodeProcess?.versions?.electron === "string";
var isElectronRenderer = isElectronProcess && nodeProcess?.type === "renderer";
if (typeof nodeProcess === "object") {
  _isWindows = nodeProcess.platform === "win32";
  _isMacintosh = nodeProcess.platform === "darwin";
  _isLinux = nodeProcess.platform === "linux";
  _isLinuxSnap = _isLinux && !!nodeProcess.env["SNAP"] && !!nodeProcess.env["SNAP_REVISION"];
  _isElectron = isElectronProcess;
  _isCI = !!nodeProcess.env["CI"] || !!nodeProcess.env["BUILD_ARTIFACTSTAGINGDIRECTORY"] || !!nodeProcess.env["GITHUB_WORKSPACE"];
  _locale = $k;
  _language = $k;
  const rawNlsConfig = nodeProcess.env["VSCODE_NLS_CONFIG"];
  if (rawNlsConfig) {
    try {
      const nlsConfig = JSON.parse(rawNlsConfig);
      _locale = nlsConfig.userLocale;
      _platformLocale = nlsConfig.osLocale;
      _language = nlsConfig.resolvedLanguage || $k;
      _translationsConfigFile = nlsConfig.languagePack?.translationsConfigFile;
    } catch (e) {
    }
  }
  _isNative = true;
} else if (typeof navigator === "object" && !isElectronRenderer) {
  _userAgent = navigator.userAgent;
  _isWindows = _userAgent.indexOf("Windows") >= 0;
  _isMacintosh = _userAgent.indexOf("Macintosh") >= 0;
  _isIOS = (_userAgent.indexOf("Macintosh") >= 0 || _userAgent.indexOf("iPad") >= 0 || _userAgent.indexOf("iPhone") >= 0) && !!navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
  _isLinux = _userAgent.indexOf("Linux") >= 0;
  _isMobile = _userAgent?.indexOf("Mobi") >= 0;
  _isWeb = true;
  _language = $h() || $k;
  _locale = navigator.language.toLowerCase();
  _platformLocale = _locale;
} else {
  console.error("Unable to resolve platform.");
}
var Platform;
(function(Platform2) {
  Platform2[Platform2["Web"] = 0] = "Web";
  Platform2[Platform2["Mac"] = 1] = "Mac";
  Platform2[Platform2["Linux"] = 2] = "Linux";
  Platform2[Platform2["Windows"] = 3] = "Windows";
})(Platform || (Platform = {}));
var _platform = 0;
if (_isMacintosh) {
  _platform = 1;
} else if (_isWindows) {
  _platform = 3;
} else if (_isLinux) {
  _platform = 2;
}
var $m = _isWindows;
var $n = _isMacintosh;
var $o = _isLinux;
var $q = _isNative;
var $s = _isWeb;
var $t = _isWeb && typeof $globalThis.importScripts === "function";
var $u = $t ? $globalThis.origin : void 0;
var $z = _userAgent;
var $A = _language;
var Language;
(function(Language2) {
  function value() {
    return $A;
  }
  Language2.value = value;
  function isDefaultVariant() {
    if ($A.length === 2) {
      return $A === "en";
    } else if ($A.length >= 3) {
      return $A[0] === "e" && $A[1] === "n" && $A[2] === "-";
    } else {
      return false;
    }
  }
  Language2.isDefaultVariant = isDefaultVariant;
  function isDefault() {
    return $A === "en";
  }
  Language2.isDefault = isDefault;
})(Language || (Language = {}));
var $E = typeof $globalThis.postMessage === "function" && !$globalThis.importScripts;
var $F = (() => {
  if ($E) {
    const pending = [];
    $globalThis.addEventListener("message", (e) => {
      if (e.data && e.data.vscodeScheduleAsyncWork) {
        for (let i = 0, len = pending.length; i < len; i++) {
          const candidate = pending[i];
          if (candidate.id === e.data.vscodeScheduleAsyncWork) {
            pending.splice(i, 1);
            candidate.callback();
            return;
          }
        }
      }
    });
    let lastId = 0;
    return (callback) => {
      const myId = ++lastId;
      pending.push({
        id: myId,
        callback
      });
      $globalThis.postMessage({ vscodeScheduleAsyncWork: myId }, "*");
    };
  }
  return (callback) => setTimeout(callback);
})();
var OperatingSystem;
(function(OperatingSystem2) {
  OperatingSystem2[OperatingSystem2["Windows"] = 1] = "Windows";
  OperatingSystem2[OperatingSystem2["Macintosh"] = 2] = "Macintosh";
  OperatingSystem2[OperatingSystem2["Linux"] = 3] = "Linux";
})(OperatingSystem || (OperatingSystem = {}));
var $I = !!($z && $z.indexOf("Chrome") >= 0);
var $J = !!($z && $z.indexOf("Firefox") >= 0);
var $K = !!(!$I && ($z && $z.indexOf("Safari") >= 0));
var $L = !!($z && $z.indexOf("Edg/") >= 0);
var $M = !!($z && $z.indexOf("Android") >= 0);

// out-build/vs/base/common/process.js
var safeProcess;
var vscodeGlobal = globalThis.vscode;
if (typeof vscodeGlobal !== "undefined" && typeof vscodeGlobal.process !== "undefined") {
  const sandboxProcess = vscodeGlobal.process;
  safeProcess = {
    get platform() {
      return sandboxProcess.platform;
    },
    get arch() {
      return sandboxProcess.arch;
    },
    get env() {
      return sandboxProcess.env;
    },
    cwd() {
      return sandboxProcess.cwd();
    }
  };
} else if (typeof process !== "undefined" && typeof process?.versions?.node === "string") {
  safeProcess = {
    get platform() {
      return process.platform;
    },
    get arch() {
      return process.arch;
    },
    get env() {
      return process.env;
    },
    cwd() {
      return process.env["VSCODE_CWD"] || process.cwd();
    }
  };
} else {
  safeProcess = {
    // Supported
    get platform() {
      return $m ? "win32" : $n ? "darwin" : "linux";
    },
    get arch() {
      return void 0;
    },
    // Unsupported
    get env() {
      return {};
    },
    cwd() {
      return "/";
    }
  };
}
var $2 = safeProcess.cwd;
var $3 = safeProcess.env;
var $4 = safeProcess.platform;
var $5 = safeProcess.arch;

// out-build/vs/base/common/path.js
var CHAR_UPPERCASE_A = 65;
var CHAR_LOWERCASE_A = 97;
var CHAR_UPPERCASE_Z = 90;
var CHAR_LOWERCASE_Z = 122;
var CHAR_DOT = 46;
var CHAR_FORWARD_SLASH = 47;
var CHAR_BACKWARD_SLASH = 92;
var CHAR_COLON = 58;
var CHAR_QUESTION_MARK = 63;
var ErrorInvalidArgType = class extends Error {
  constructor(name, expected, actual) {
    let determiner;
    if (typeof expected === "string" && expected.indexOf("not ") === 0) {
      determiner = "must not be";
      expected = expected.replace(/^not /, "");
    } else {
      determiner = "must be";
    }
    const type = name.indexOf(".") !== -1 ? "property" : "argument";
    let msg = `The "${name}" ${type} ${determiner} of type ${expected}`;
    msg += `. Received type ${typeof actual}`;
    super(msg);
    this.code = "ERR_INVALID_ARG_TYPE";
  }
};
function validateObject(pathObject, name) {
  if (pathObject === null || typeof pathObject !== "object") {
    throw new ErrorInvalidArgType(name, "Object", pathObject);
  }
}
function validateString(value, name) {
  if (typeof value !== "string") {
    throw new ErrorInvalidArgType(name, "string", value);
  }
}
var platformIsWin32 = $4 === "win32";
function isPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
}
function isPosixPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH;
}
function isWindowsDeviceRoot(code) {
  return code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z || code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z;
}
function normalizeString(path, allowAboveRoot, separator, isPathSeparator2) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code = 0;
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) {
      code = path.charCodeAt(i);
    } else if (isPathSeparator2(code)) {
      break;
    } else {
      code = CHAR_FORWARD_SLASH;
    }
    if (isPathSeparator2(code)) {
      if (lastSlash === i - 1 || dots === 1) {
      } else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== CHAR_DOT || res.charCodeAt(res.length - 2) !== CHAR_DOT) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf(separator);
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (res.length !== 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? `${separator}..` : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `${separator}${path.slice(lastSlash + 1, i)}`;
        } else {
          res = path.slice(lastSlash + 1, i);
        }
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === CHAR_DOT && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
function formatExt(ext) {
  return ext ? `${ext[0] === "." ? "" : "."}${ext}` : "";
}
function _format2(sep2, pathObject) {
  validateObject(pathObject, "pathObject");
  const dir = pathObject.dir || pathObject.root;
  const base = pathObject.base || `${pathObject.name || ""}${formatExt(pathObject.ext)}`;
  if (!dir) {
    return base;
  }
  return dir === pathObject.root ? `${dir}${base}` : `${dir}${sep2}${base}`;
}
var $6 = {
  // path.resolve([from ...], to)
  resolve(...pathSegments) {
    let resolvedDevice = "";
    let resolvedTail = "";
    let resolvedAbsolute = false;
    for (let i = pathSegments.length - 1; i >= -1; i--) {
      let path;
      if (i >= 0) {
        path = pathSegments[i];
        validateString(path, `paths[${i}]`);
        if (path.length === 0) {
          continue;
        }
      } else if (resolvedDevice.length === 0) {
        path = $2();
      } else {
        path = $3[`=${resolvedDevice}`] || $2();
        if (path === void 0 || path.slice(0, 2).toLowerCase() !== resolvedDevice.toLowerCase() && path.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
          path = `${resolvedDevice}\\`;
        }
      }
      const len = path.length;
      let rootEnd = 0;
      let device = "";
      let isAbsolute = false;
      const code = path.charCodeAt(0);
      if (len === 1) {
        if (isPathSeparator(code)) {
          rootEnd = 1;
          isAbsolute = true;
        }
      } else if (isPathSeparator(code)) {
        isAbsolute = true;
        if (isPathSeparator(path.charCodeAt(1))) {
          let j = 2;
          let last = j;
          while (j < len && !isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            const firstPart = path.slice(last, j);
            last = j;
            while (j < len && isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j < len && j !== last) {
              last = j;
              while (j < len && !isPathSeparator(path.charCodeAt(j))) {
                j++;
              }
              if (j === len || j !== last) {
                device = `\\\\${firstPart}\\${path.slice(last, j)}`;
                rootEnd = j;
              }
            }
          }
        } else {
          rootEnd = 1;
        }
      } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
        device = path.slice(0, 2);
        rootEnd = 2;
        if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
          isAbsolute = true;
          rootEnd = 3;
        }
      }
      if (device.length > 0) {
        if (resolvedDevice.length > 0) {
          if (device.toLowerCase() !== resolvedDevice.toLowerCase()) {
            continue;
          }
        } else {
          resolvedDevice = device;
        }
      }
      if (resolvedAbsolute) {
        if (resolvedDevice.length > 0) {
          break;
        }
      } else {
        resolvedTail = `${path.slice(rootEnd)}\\${resolvedTail}`;
        resolvedAbsolute = isAbsolute;
        if (isAbsolute && resolvedDevice.length > 0) {
          break;
        }
      }
    }
    resolvedTail = normalizeString(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator);
    return resolvedAbsolute ? `${resolvedDevice}\\${resolvedTail}` : `${resolvedDevice}${resolvedTail}` || ".";
  },
  normalize(path) {
    validateString(path, "path");
    const len = path.length;
    if (len === 0) {
      return ".";
    }
    let rootEnd = 0;
    let device;
    let isAbsolute = false;
    const code = path.charCodeAt(0);
    if (len === 1) {
      return isPosixPathSeparator(code) ? "\\" : path;
    }
    if (isPathSeparator(code)) {
      isAbsolute = true;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          const firstPart = path.slice(last, j);
          last = j;
          while (j < len && isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              return `\\\\${firstPart}\\${path.slice(last)}\\`;
            }
            if (j !== last) {
              device = `\\\\${firstPart}\\${path.slice(last, j)}`;
              rootEnd = j;
            }
          }
        }
      } else {
        rootEnd = 1;
      }
    } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
      device = path.slice(0, 2);
      rootEnd = 2;
      if (len > 2 && isPathSeparator(path.charCodeAt(2))) {
        isAbsolute = true;
        rootEnd = 3;
      }
    }
    let tail = rootEnd < len ? normalizeString(path.slice(rootEnd), !isAbsolute, "\\", isPathSeparator) : "";
    if (tail.length === 0 && !isAbsolute) {
      tail = ".";
    }
    if (tail.length > 0 && isPathSeparator(path.charCodeAt(len - 1))) {
      tail += "\\";
    }
    if (!isAbsolute && device === void 0 && path.includes(":")) {
      if (tail.length >= 2 && isWindowsDeviceRoot(tail.charCodeAt(0)) && tail.charCodeAt(1) === CHAR_COLON) {
        return `.\\${tail}`;
      }
      let index = path.indexOf(":");
      do {
        if (index === len - 1 || isPathSeparator(path.charCodeAt(index + 1))) {
          return `.\\${tail}`;
        }
      } while ((index = path.indexOf(":", index + 1)) !== -1);
    }
    if (device === void 0) {
      return isAbsolute ? `\\${tail}` : tail;
    }
    return isAbsolute ? `${device}\\${tail}` : `${device}${tail}`;
  },
  isAbsolute(path) {
    validateString(path, "path");
    const len = path.length;
    if (len === 0) {
      return false;
    }
    const code = path.charCodeAt(0);
    return isPathSeparator(code) || // Possible device root
    len > 2 && isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON && isPathSeparator(path.charCodeAt(2));
  },
  join(...paths) {
    if (paths.length === 0) {
      return ".";
    }
    let joined;
    let firstPart;
    for (let i = 0; i < paths.length; ++i) {
      const arg = paths[i];
      validateString(arg, "path");
      if (arg.length > 0) {
        if (joined === void 0) {
          joined = firstPart = arg;
        } else {
          joined += `\\${arg}`;
        }
      }
    }
    if (joined === void 0) {
      return ".";
    }
    let needsReplace = true;
    let slashCount = 0;
    if (typeof firstPart === "string" && isPathSeparator(firstPart.charCodeAt(0))) {
      ++slashCount;
      const firstLen = firstPart.length;
      if (firstLen > 1 && isPathSeparator(firstPart.charCodeAt(1))) {
        ++slashCount;
        if (firstLen > 2) {
          if (isPathSeparator(firstPart.charCodeAt(2))) {
            ++slashCount;
          } else {
            needsReplace = false;
          }
        }
      }
    }
    if (needsReplace) {
      while (slashCount < joined.length && isPathSeparator(joined.charCodeAt(slashCount))) {
        slashCount++;
      }
      if (slashCount >= 2) {
        joined = `\\${joined.slice(slashCount)}`;
      }
    }
    return $6.normalize(joined);
  },
  // It will solve the relative path from `from` to `to`, for instance:
  //  from = 'C:\\orandea\\test\\aaa'
  //  to = 'C:\\orandea\\impl\\bbb'
  // The output of the function should be: '..\\..\\impl\\bbb'
  relative(from, to) {
    validateString(from, "from");
    validateString(to, "to");
    if (from === to) {
      return "";
    }
    const fromOrig = $6.resolve(from);
    const toOrig = $6.resolve(to);
    if (fromOrig === toOrig) {
      return "";
    }
    from = fromOrig.toLowerCase();
    to = toOrig.toLowerCase();
    if (from === to) {
      return "";
    }
    if (fromOrig.length !== from.length || toOrig.length !== to.length) {
      const fromSplit = fromOrig.split("\\");
      const toSplit = toOrig.split("\\");
      if (fromSplit[fromSplit.length - 1] === "") {
        fromSplit.pop();
      }
      if (toSplit[toSplit.length - 1] === "") {
        toSplit.pop();
      }
      const fromLen2 = fromSplit.length;
      const toLen2 = toSplit.length;
      const length2 = fromLen2 < toLen2 ? fromLen2 : toLen2;
      let i2;
      for (i2 = 0; i2 < length2; i2++) {
        if (fromSplit[i2].toLowerCase() !== toSplit[i2].toLowerCase()) {
          break;
        }
      }
      if (i2 === 0) {
        return toOrig;
      } else if (i2 === length2) {
        if (toLen2 > length2) {
          return toSplit.slice(i2).join("\\");
        }
        if (fromLen2 > length2) {
          return "..\\".repeat(fromLen2 - 1 - i2) + "..";
        }
        return "";
      }
      return "..\\".repeat(fromLen2 - i2) + toSplit.slice(i2).join("\\");
    }
    let fromStart = 0;
    while (fromStart < from.length && from.charCodeAt(fromStart) === CHAR_BACKWARD_SLASH) {
      fromStart++;
    }
    let fromEnd = from.length;
    while (fromEnd - 1 > fromStart && from.charCodeAt(fromEnd - 1) === CHAR_BACKWARD_SLASH) {
      fromEnd--;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 0;
    while (toStart < to.length && to.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
      toStart++;
    }
    let toEnd = to.length;
    while (toEnd - 1 > toStart && to.charCodeAt(toEnd - 1) === CHAR_BACKWARD_SLASH) {
      toEnd--;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for (; i < length; i++) {
      const fromCode = from.charCodeAt(fromStart + i);
      if (fromCode !== to.charCodeAt(toStart + i)) {
        break;
      } else if (fromCode === CHAR_BACKWARD_SLASH) {
        lastCommonSep = i;
      }
    }
    if (i !== length) {
      if (lastCommonSep === -1) {
        return toOrig;
      }
    } else {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === CHAR_BACKWARD_SLASH) {
          return toOrig.slice(toStart + i + 1);
        }
        if (i === 2) {
          return toOrig.slice(toStart + i);
        }
      }
      if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === CHAR_BACKWARD_SLASH) {
          lastCommonSep = i;
        } else if (i === 2) {
          lastCommonSep = 3;
        }
      }
      if (lastCommonSep === -1) {
        lastCommonSep = 0;
      }
    }
    let out = "";
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === CHAR_BACKWARD_SLASH) {
        out += out.length === 0 ? ".." : "\\..";
      }
    }
    toStart += lastCommonSep;
    if (out.length > 0) {
      return `${out}${toOrig.slice(toStart, toEnd)}`;
    }
    if (toOrig.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
      ++toStart;
    }
    return toOrig.slice(toStart, toEnd);
  },
  toNamespacedPath(path) {
    if (typeof path !== "string" || path.length === 0) {
      return path;
    }
    const resolvedPath = $6.resolve(path);
    if (resolvedPath.length <= 2) {
      return path;
    }
    if (resolvedPath.charCodeAt(0) === CHAR_BACKWARD_SLASH) {
      if (resolvedPath.charCodeAt(1) === CHAR_BACKWARD_SLASH) {
        const code = resolvedPath.charCodeAt(2);
        if (code !== CHAR_QUESTION_MARK && code !== CHAR_DOT) {
          return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
        }
      }
    } else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0)) && resolvedPath.charCodeAt(1) === CHAR_COLON && resolvedPath.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
      return `\\\\?\\${resolvedPath}`;
    }
    return resolvedPath;
  },
  dirname(path) {
    validateString(path, "path");
    const len = path.length;
    if (len === 0) {
      return ".";
    }
    let rootEnd = -1;
    let offset = 0;
    const code = path.charCodeAt(0);
    if (len === 1) {
      return isPathSeparator(code) ? path : ".";
    }
    if (isPathSeparator(code)) {
      rootEnd = offset = 1;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          last = j;
          while (j < len && isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              return path;
            }
            if (j !== last) {
              rootEnd = offset = j + 1;
            }
          }
        }
      }
    } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
      rootEnd = len > 2 && isPathSeparator(path.charCodeAt(2)) ? 3 : 2;
      offset = rootEnd;
    }
    let end = -1;
    let matchedSlash = true;
    for (let i = len - 1; i >= offset; --i) {
      if (isPathSeparator(path.charCodeAt(i))) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        matchedSlash = false;
      }
    }
    if (end === -1) {
      if (rootEnd === -1) {
        return ".";
      }
      end = rootEnd;
    }
    return path.slice(0, end);
  },
  basename(path, suffix) {
    if (suffix !== void 0) {
      validateString(suffix, "suffix");
    }
    validateString(path, "path");
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (path.length >= 2 && isWindowsDeviceRoot(path.charCodeAt(0)) && path.charCodeAt(1) === CHAR_COLON) {
      start = 2;
    }
    if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path.length) {
      if (suffix === path) {
        return "";
      }
      let extIdx = suffix.length - 1;
      let firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= start; --i) {
        const code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            if (code === suffix.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                end = i;
              }
            } else {
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }
      if (start === end) {
        end = firstNonSlashEnd;
      } else if (end === -1) {
        end = path.length;
      }
      return path.slice(start, end);
    }
    for (i = path.length - 1; i >= start; --i) {
      if (isPathSeparator(path.charCodeAt(i))) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
    }
    if (end === -1) {
      return "";
    }
    return path.slice(start, end);
  },
  extname(path) {
    validateString(path, "path");
    let start = 0;
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    if (path.length >= 2 && path.charCodeAt(1) === CHAR_COLON && isWindowsDeviceRoot(path.charCodeAt(0))) {
      start = startPart = 2;
    }
    for (let i = path.length - 1; i >= start; --i) {
      const code = path.charCodeAt(i);
      if (isPathSeparator(code)) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
    preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return "";
    }
    return path.slice(startDot, end);
  },
  format: _format2.bind(null, "\\"),
  parse(path) {
    validateString(path, "path");
    const ret = { root: "", dir: "", base: "", ext: "", name: "" };
    if (path.length === 0) {
      return ret;
    }
    const len = path.length;
    let rootEnd = 0;
    let code = path.charCodeAt(0);
    if (len === 1) {
      if (isPathSeparator(code)) {
        ret.root = ret.dir = path;
        return ret;
      }
      ret.base = ret.name = path;
      return ret;
    }
    if (isPathSeparator(code)) {
      rootEnd = 1;
      if (isPathSeparator(path.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          last = j;
          while (j < len && isPathSeparator(path.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              rootEnd = j;
            } else if (j !== last) {
              rootEnd = j + 1;
            }
          }
        }
      }
    } else if (isWindowsDeviceRoot(code) && path.charCodeAt(1) === CHAR_COLON) {
      if (len <= 2) {
        ret.root = ret.dir = path;
        return ret;
      }
      rootEnd = 2;
      if (isPathSeparator(path.charCodeAt(2))) {
        if (len === 3) {
          ret.root = ret.dir = path;
          return ret;
        }
        rootEnd = 3;
      }
    }
    if (rootEnd > 0) {
      ret.root = path.slice(0, rootEnd);
    }
    let startDot = -1;
    let startPart = rootEnd;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for (; i >= rootEnd; --i) {
      code = path.charCodeAt(i);
      if (isPathSeparator(code)) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (end !== -1) {
      if (startDot === -1 || // We saw a non-dot character immediately before the dot
      preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        ret.base = ret.name = path.slice(startPart, end);
      } else {
        ret.name = path.slice(startPart, startDot);
        ret.base = path.slice(startPart, end);
        ret.ext = path.slice(startDot, end);
      }
    }
    if (startPart > 0 && startPart !== rootEnd) {
      ret.dir = path.slice(0, startPart - 1);
    } else {
      ret.dir = ret.root;
    }
    return ret;
  },
  sep: "\\",
  delimiter: ";",
  win32: null,
  posix: null
};
var posixCwd = (() => {
  if (platformIsWin32) {
    const regexp = /\\/g;
    return () => {
      const cwd = $2().replace(regexp, "/");
      return cwd.slice(cwd.indexOf("/"));
    };
  }
  return () => $2();
})();
var $7 = {
  // path.resolve([from ...], to)
  resolve(...pathSegments) {
    let resolvedPath = "";
    let resolvedAbsolute = false;
    for (let i = pathSegments.length - 1; i >= 0 && !resolvedAbsolute; i--) {
      const path = pathSegments[i];
      validateString(path, `paths[${i}]`);
      if (path.length === 0) {
        continue;
      }
      resolvedPath = `${path}/${resolvedPath}`;
      resolvedAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    if (!resolvedAbsolute) {
      const cwd = posixCwd();
      resolvedPath = `${cwd}/${resolvedPath}`;
      resolvedAbsolute = cwd.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute, "/", isPosixPathSeparator);
    if (resolvedAbsolute) {
      return `/${resolvedPath}`;
    }
    return resolvedPath.length > 0 ? resolvedPath : ".";
  },
  normalize(path) {
    validateString(path, "path");
    if (path.length === 0) {
      return ".";
    }
    const isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    const trailingSeparator = path.charCodeAt(path.length - 1) === CHAR_FORWARD_SLASH;
    path = normalizeString(path, !isAbsolute, "/", isPosixPathSeparator);
    if (path.length === 0) {
      if (isAbsolute) {
        return "/";
      }
      return trailingSeparator ? "./" : ".";
    }
    if (trailingSeparator) {
      path += "/";
    }
    return isAbsolute ? `/${path}` : path;
  },
  isAbsolute(path) {
    validateString(path, "path");
    return path.length > 0 && path.charCodeAt(0) === CHAR_FORWARD_SLASH;
  },
  join(...paths) {
    if (paths.length === 0) {
      return ".";
    }
    const path = [];
    for (let i = 0; i < paths.length; ++i) {
      const arg = paths[i];
      validateString(arg, "path");
      if (arg.length > 0) {
        path.push(arg);
      }
    }
    if (path.length === 0) {
      return ".";
    }
    return $7.normalize(path.join("/"));
  },
  relative(from, to) {
    validateString(from, "from");
    validateString(to, "to");
    if (from === to) {
      return "";
    }
    from = $7.resolve(from);
    to = $7.resolve(to);
    if (from === to) {
      return "";
    }
    const fromStart = 1;
    const fromEnd = from.length;
    const fromLen = fromEnd - fromStart;
    const toStart = 1;
    const toLen = to.length - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for (; i < length; i++) {
      const fromCode = from.charCodeAt(fromStart + i);
      if (fromCode !== to.charCodeAt(toStart + i)) {
        break;
      } else if (fromCode === CHAR_FORWARD_SLASH) {
        lastCommonSep = i;
      }
    }
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === CHAR_FORWARD_SLASH) {
          return to.slice(toStart + i + 1);
        }
        if (i === 0) {
          return to.slice(toStart + i);
        }
      } else if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === CHAR_FORWARD_SLASH) {
          lastCommonSep = i;
        } else if (i === 0) {
          lastCommonSep = 0;
        }
      }
    }
    let out = "";
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        out += out.length === 0 ? ".." : "/..";
      }
    }
    return `${out}${to.slice(toStart + lastCommonSep)}`;
  },
  toNamespacedPath(path) {
    return path;
  },
  dirname(path) {
    validateString(path, "path");
    if (path.length === 0) {
      return ".";
    }
    const hasRoot = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    let end = -1;
    let matchedSlash = true;
    for (let i = path.length - 1; i >= 1; --i) {
      if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        matchedSlash = false;
      }
    }
    if (end === -1) {
      return hasRoot ? "/" : ".";
    }
    if (hasRoot && end === 1) {
      return "//";
    }
    return path.slice(0, end);
  },
  basename(path, suffix) {
    if (suffix !== void 0) {
      validateString(suffix, "suffix");
    }
    validateString(path, "path");
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path.length) {
      if (suffix === path) {
        return "";
      }
      let extIdx = suffix.length - 1;
      let firstNonSlashEnd = -1;
      for (i = path.length - 1; i >= 0; --i) {
        const code = path.charCodeAt(i);
        if (code === CHAR_FORWARD_SLASH) {
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            if (code === suffix.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                end = i;
              }
            } else {
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }
      if (start === end) {
        end = firstNonSlashEnd;
      } else if (end === -1) {
        end = path.length;
      }
      return path.slice(start, end);
    }
    for (i = path.length - 1; i >= 0; --i) {
      if (path.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
    }
    if (end === -1) {
      return "";
    }
    return path.slice(start, end);
  },
  extname(path) {
    validateString(path, "path");
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    for (let i = path.length - 1; i >= 0; --i) {
      const char = path[i];
      if (char === "/") {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (char === ".") {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
    preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return "";
    }
    return path.slice(startDot, end);
  },
  format: _format2.bind(null, "/"),
  parse(path) {
    validateString(path, "path");
    const ret = { root: "", dir: "", base: "", ext: "", name: "" };
    if (path.length === 0) {
      return ret;
    }
    const isAbsolute = path.charCodeAt(0) === CHAR_FORWARD_SLASH;
    let start;
    if (isAbsolute) {
      ret.root = "/";
      start = 1;
    } else {
      start = 0;
    }
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let i = path.length - 1;
    let preDotState = 0;
    for (; i >= start; --i) {
      const code = path.charCodeAt(i);
      if (code === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (end !== -1) {
      const start2 = startPart === 0 && isAbsolute ? 1 : startPart;
      if (startDot === -1 || // We saw a non-dot character immediately before the dot
      preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        ret.base = ret.name = path.slice(start2, end);
      } else {
        ret.name = path.slice(start2, startDot);
        ret.base = path.slice(start2, end);
        ret.ext = path.slice(startDot, end);
      }
    }
    if (startPart > 0) {
      ret.dir = path.slice(0, startPart - 1);
    } else if (isAbsolute) {
      ret.dir = "/";
    }
    return ret;
  },
  sep: "/",
  delimiter: ":",
  win32: null,
  posix: null
};
$7.win32 = $6.win32 = $6;
$7.posix = $6.posix = $7;
var $8 = platformIsWin32 ? $6.normalize : $7.normalize;
var $9 = platformIsWin32 ? $6.isAbsolute : $7.isAbsolute;
var $0 = platformIsWin32 ? $6.join : $7.join;
var $$ = platformIsWin32 ? $6.resolve : $7.resolve;
var $_ = platformIsWin32 ? $6.relative : $7.relative;
var $ab = platformIsWin32 ? $6.dirname : $7.dirname;
var $bb = platformIsWin32 ? $6.basename : $7.basename;
var $cb = platformIsWin32 ? $6.extname : $7.extname;
var $db = platformIsWin32 ? $6.format : $7.format;
var $eb = platformIsWin32 ? $6.parse : $7.parse;
var $fb = platformIsWin32 ? $6.toNamespacedPath : $7.toNamespacedPath;
var sep = platformIsWin32 ? $6.sep : $7.sep;
var $hb = platformIsWin32 ? $6.delimiter : $7.delimiter;

// out-build/vs/base/common/uri.js
var _schemePattern = /^\w[\w\d+.-]*$/;
var _singleSlashStart = /^\//;
var _doubleSlashStart = /^\/\//;
function _validateUri(ret, _strict) {
  if (!ret.scheme && _strict) {
    throw new Error(`[UriError]: Scheme is missing: {scheme: "", authority: "${ret.authority}", path: "${ret.path}", query: "${ret.query}", fragment: "${ret.fragment}"}`);
  }
  if (ret.scheme && !_schemePattern.test(ret.scheme)) {
    throw new Error("[UriError]: Scheme contains illegal characters.");
  }
  if (ret.path) {
    if (ret.authority) {
      if (!_singleSlashStart.test(ret.path)) {
        throw new Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
      }
    } else {
      if (_doubleSlashStart.test(ret.path)) {
        throw new Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
      }
    }
  }
}
function _schemeFix(scheme, _strict) {
  if (!scheme && !_strict) {
    return "file";
  }
  return scheme;
}
function _referenceResolution(scheme, path) {
  switch (scheme) {
    case "https":
    case "http":
    case "file":
      if (!path) {
        path = _slash;
      } else if (path[0] !== _slash) {
        path = _slash + path;
      }
      break;
  }
  return path;
}
var _empty = "";
var _slash = "/";
var _regexp = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
var URI = class _URI {
  static isUri(thing) {
    if (thing instanceof _URI) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return typeof thing.authority === "string" && typeof thing.fragment === "string" && typeof thing.path === "string" && typeof thing.query === "string" && typeof thing.scheme === "string" && typeof thing.fsPath === "string" && typeof thing.with === "function" && typeof thing.toString === "function";
  }
  /**
   * @internal
   */
  constructor(schemeOrData, authority, path, query, fragment, _strict = false) {
    if (typeof schemeOrData === "object") {
      this.scheme = schemeOrData.scheme || _empty;
      this.authority = schemeOrData.authority || _empty;
      this.path = schemeOrData.path || _empty;
      this.query = schemeOrData.query || _empty;
      this.fragment = schemeOrData.fragment || _empty;
    } else {
      this.scheme = _schemeFix(schemeOrData, _strict);
      this.authority = authority || _empty;
      this.path = _referenceResolution(this.scheme, path || _empty);
      this.query = query || _empty;
      this.fragment = fragment || _empty;
      _validateUri(this, _strict);
    }
  }
  // ---- filesystem path -----------------------
  /**
   * Returns a string representing the corresponding file system path of this URI.
   * Will handle UNC paths, normalizes windows drive letters to lower-case, and uses the
   * platform specific path separator.
   *
   * * Will *not* validate the path for invalid characters and semantics.
   * * Will *not* look at the scheme of this URI.
   * * The result shall *not* be used for display purposes but for accessing a file on disk.
   *
   *
   * The *difference* to `URI#path` is the use of the platform specific separator and the handling
   * of UNC paths. See the below sample of a file-uri with an authority (UNC path).
   *
   * ```ts
      const u = URI.parse('file://server/c$/folder/file.txt')
      u.authority === 'server'
      u.path === '/shares/c$/file.txt'
      u.fsPath === '\\server\c$\folder\file.txt'
  ```
   *
   * Using `URI#path` to read a file (using fs-apis) would not be enough because parts of the path,
   * namely the server name, would be missing. Therefore `URI#fsPath` exists - it's sugar to ease working
   * with URIs that represent files on disk (`file` scheme).
   */
  get fsPath() {
    return $Lc(this, false);
  }
  // ---- modify to new -------------------------
  with(change) {
    if (!change) {
      return this;
    }
    let { scheme, authority, path, query, fragment } = change;
    if (scheme === void 0) {
      scheme = this.scheme;
    } else if (scheme === null) {
      scheme = _empty;
    }
    if (authority === void 0) {
      authority = this.authority;
    } else if (authority === null) {
      authority = _empty;
    }
    if (path === void 0) {
      path = this.path;
    } else if (path === null) {
      path = _empty;
    }
    if (query === void 0) {
      query = this.query;
    } else if (query === null) {
      query = _empty;
    }
    if (fragment === void 0) {
      fragment = this.fragment;
    } else if (fragment === null) {
      fragment = _empty;
    }
    if (scheme === this.scheme && authority === this.authority && path === this.path && query === this.query && fragment === this.fragment) {
      return this;
    }
    return new Uri(scheme, authority, path, query, fragment);
  }
  // ---- parse & validate ------------------------
  /**
   * Creates a new URI from a string, e.g. `http://www.example.com/some/path`,
   * `file:///usr/home`, or `scheme:with/path`.
   *
   * @param value A string which represents an URI (see `URI#toString`).
   */
  static parse(value, _strict = false) {
    const match = _regexp.exec(value);
    if (!match) {
      return new Uri(_empty, _empty, _empty, _empty, _empty);
    }
    return new Uri(match[2] || _empty, percentDecode(match[4] || _empty), percentDecode(match[5] || _empty), percentDecode(match[7] || _empty), percentDecode(match[9] || _empty), _strict);
  }
  /**
   * Creates a new URI from a file system path, e.g. `c:\my\files`,
   * `/usr/home`, or `\\server\share\some\path`.
   *
   * The *difference* between `URI#parse` and `URI#file` is that the latter treats the argument
   * as path, not as stringified-uri. E.g. `URI.file(path)` is **not the same as**
   * `URI.parse('file://' + path)` because the path might contain characters that are
   * interpreted (# and ?). See the following sample:
   * ```ts
  const good = URI.file('/coding/c#/project1');
  good.scheme === 'file';
  good.path === '/coding/c#/project1';
  good.fragment === '';
  const bad = URI.parse('file://' + '/coding/c#/project1');
  bad.scheme === 'file';
  bad.path === '/coding/c'; // path is now broken
  bad.fragment === '/project1';
  ```
   *
   * @param path A file system path (see `URI#fsPath`)
   */
  static file(path) {
    let authority = _empty;
    if ($m) {
      path = path.replace(/\\/g, _slash);
    }
    if (path[0] === _slash && path[1] === _slash) {
      const idx = path.indexOf(_slash, 2);
      if (idx === -1) {
        authority = path.substring(2);
        path = _slash;
      } else {
        authority = path.substring(2, idx);
        path = path.substring(idx) || _slash;
      }
    }
    return new Uri("file", authority, path, _empty, _empty);
  }
  /**
   * Creates new URI from uri components.
   *
   * Unless `strict` is `true` the scheme is defaults to be `file`. This function performs
   * validation and should be used for untrusted uri components retrieved from storage,
   * user input, command arguments etc
   */
  static from(components, strict) {
    const result = new Uri(components.scheme, components.authority, components.path, components.query, components.fragment, strict);
    return result;
  }
  /**
   * Join a URI path with path fragments and normalizes the resulting path.
   *
   * @param uri The input URI.
   * @param pathFragment The path fragment to add to the URI path.
   * @returns The resulting URI.
   */
  static joinPath(uri, ...pathFragment) {
    if (!uri.path) {
      throw new Error(`[UriError]: cannot call joinPath on URI without path`);
    }
    let newPath;
    if ($m && uri.scheme === "file") {
      newPath = _URI.file($6.join($Lc(uri, true), ...pathFragment)).path;
    } else {
      newPath = $7.join(uri.path, ...pathFragment);
    }
    return uri.with({ path: newPath });
  }
  // ---- printing/externalize ---------------------------
  /**
   * Creates a string representation for this URI. It's guaranteed that calling
   * `URI.parse` with the result of this function creates an URI which is equal
   * to this URI.
   *
   * * The result shall *not* be used for display purposes but for externalization or transport.
   * * The result will be encoded using the percentage encoding and encoding happens mostly
   * ignore the scheme-specific encoding rules.
   *
   * @param skipEncoding Do not encode the result, default is `false`
   */
  toString(skipEncoding = false) {
    return _asFormatted(this, skipEncoding);
  }
  toJSON() {
    return this;
  }
  static revive(data) {
    if (!data) {
      return data;
    } else if (data instanceof _URI) {
      return data;
    } else {
      const result = new Uri(data);
      result._formatted = data.external ?? null;
      result._fsPath = data._sep === _pathSepMarker ? data.fsPath ?? null : null;
      return result;
    }
  }
  [Symbol.for("debug.description")]() {
    return `URI(${this.toString()})`;
  }
};
var _pathSepMarker = $m ? 1 : void 0;
var Uri = class extends URI {
  constructor() {
    super(...arguments);
    this._formatted = null;
    this._fsPath = null;
  }
  get fsPath() {
    if (!this._fsPath) {
      this._fsPath = $Lc(this, false);
    }
    return this._fsPath;
  }
  toString(skipEncoding = false) {
    if (!skipEncoding) {
      if (!this._formatted) {
        this._formatted = _asFormatted(this, false);
      }
      return this._formatted;
    } else {
      return _asFormatted(this, true);
    }
  }
  toJSON() {
    const res = {
      $mid: 1
      /* MarshalledId.Uri */
    };
    if (this._fsPath) {
      res.fsPath = this._fsPath;
      res._sep = _pathSepMarker;
    }
    if (this._formatted) {
      res.external = this._formatted;
    }
    if (this.path) {
      res.path = this.path;
    }
    if (this.scheme) {
      res.scheme = this.scheme;
    }
    if (this.authority) {
      res.authority = this.authority;
    }
    if (this.query) {
      res.query = this.query;
    }
    if (this.fragment) {
      res.fragment = this.fragment;
    }
    return res;
  }
};
var encodeTable = {
  [
    58
    /* CharCode.Colon */
  ]: "%3A",
  // gen-delims
  [
    47
    /* CharCode.Slash */
  ]: "%2F",
  [
    63
    /* CharCode.QuestionMark */
  ]: "%3F",
  [
    35
    /* CharCode.Hash */
  ]: "%23",
  [
    91
    /* CharCode.OpenSquareBracket */
  ]: "%5B",
  [
    93
    /* CharCode.CloseSquareBracket */
  ]: "%5D",
  [
    64
    /* CharCode.AtSign */
  ]: "%40",
  [
    33
    /* CharCode.ExclamationMark */
  ]: "%21",
  // sub-delims
  [
    36
    /* CharCode.DollarSign */
  ]: "%24",
  [
    38
    /* CharCode.Ampersand */
  ]: "%26",
  [
    39
    /* CharCode.SingleQuote */
  ]: "%27",
  [
    40
    /* CharCode.OpenParen */
  ]: "%28",
  [
    41
    /* CharCode.CloseParen */
  ]: "%29",
  [
    42
    /* CharCode.Asterisk */
  ]: "%2A",
  [
    43
    /* CharCode.Plus */
  ]: "%2B",
  [
    44
    /* CharCode.Comma */
  ]: "%2C",
  [
    59
    /* CharCode.Semicolon */
  ]: "%3B",
  [
    61
    /* CharCode.Equals */
  ]: "%3D",
  [
    32
    /* CharCode.Space */
  ]: "%20"
};
function encodeURIComponentFast(uriComponent, isPath, isAuthority) {
  let res = void 0;
  let nativeEncodePos = -1;
  for (let pos = 0; pos < uriComponent.length; pos++) {
    const code = uriComponent.charCodeAt(pos);
    if (code >= 97 && code <= 122 || code >= 65 && code <= 90 || code >= 48 && code <= 57 || code === 45 || code === 46 || code === 95 || code === 126 || isPath && code === 47 || isAuthority && code === 91 || isAuthority && code === 93 || isAuthority && code === 58) {
      if (nativeEncodePos !== -1) {
        res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
        nativeEncodePos = -1;
      }
      if (res !== void 0) {
        res += uriComponent.charAt(pos);
      }
    } else {
      if (res === void 0) {
        res = uriComponent.substr(0, pos);
      }
      const escaped = encodeTable[code];
      if (escaped !== void 0) {
        if (nativeEncodePos !== -1) {
          res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
          nativeEncodePos = -1;
        }
        res += escaped;
      } else if (nativeEncodePos === -1) {
        nativeEncodePos = pos;
      }
    }
  }
  if (nativeEncodePos !== -1) {
    res += encodeURIComponent(uriComponent.substring(nativeEncodePos));
  }
  return res !== void 0 ? res : uriComponent;
}
function encodeURIComponentMinimal(path) {
  let res = void 0;
  for (let pos = 0; pos < path.length; pos++) {
    const code = path.charCodeAt(pos);
    if (code === 35 || code === 63) {
      if (res === void 0) {
        res = path.substr(0, pos);
      }
      res += encodeTable[code];
    } else {
      if (res !== void 0) {
        res += path[pos];
      }
    }
  }
  return res !== void 0 ? res : path;
}
function $Lc(uri, keepDriveLetterCasing) {
  let value;
  if (uri.authority && uri.path.length > 1 && uri.scheme === "file") {
    value = `//${uri.authority}${uri.path}`;
  } else if (uri.path.charCodeAt(0) === 47 && (uri.path.charCodeAt(1) >= 65 && uri.path.charCodeAt(1) <= 90 || uri.path.charCodeAt(1) >= 97 && uri.path.charCodeAt(1) <= 122) && uri.path.charCodeAt(2) === 58) {
    if (!keepDriveLetterCasing) {
      value = uri.path[1].toLowerCase() + uri.path.substr(2);
    } else {
      value = uri.path.substr(1);
    }
  } else {
    value = uri.path;
  }
  if ($m) {
    value = value.replace(/\//g, "\\");
  }
  return value;
}
function _asFormatted(uri, skipEncoding) {
  const encoder = !skipEncoding ? encodeURIComponentFast : encodeURIComponentMinimal;
  let res = "";
  let { scheme, authority, path, query, fragment } = uri;
  if (scheme) {
    res += scheme;
    res += ":";
  }
  if (authority || scheme === "file") {
    res += _slash;
    res += _slash;
  }
  if (authority) {
    let idx = authority.indexOf("@");
    if (idx !== -1) {
      const userinfo = authority.substr(0, idx);
      authority = authority.substr(idx + 1);
      idx = userinfo.lastIndexOf(":");
      if (idx === -1) {
        res += encoder(userinfo, false, false);
      } else {
        res += encoder(userinfo.substr(0, idx), false, false);
        res += ":";
        res += encoder(userinfo.substr(idx + 1), false, true);
      }
      res += "@";
    }
    authority = authority.toLowerCase();
    idx = authority.lastIndexOf(":");
    if (idx === -1) {
      res += encoder(authority, false, true);
    } else {
      res += encoder(authority.substr(0, idx), false, true);
      res += authority.substr(idx);
    }
  }
  if (path) {
    if (path.length >= 3 && path.charCodeAt(0) === 47 && path.charCodeAt(2) === 58) {
      const code = path.charCodeAt(1);
      if (code >= 65 && code <= 90) {
        path = `/${String.fromCharCode(code + 32)}:${path.substr(3)}`;
      }
    } else if (path.length >= 2 && path.charCodeAt(1) === 58) {
      const code = path.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        path = `${String.fromCharCode(code + 32)}:${path.substr(2)}`;
      }
    }
    res += encoder(path, true, false);
  }
  if (query) {
    res += "?";
    res += encoder(query, false, false);
  }
  if (fragment) {
    res += "#";
    res += !skipEncoding ? encodeURIComponentFast(fragment, false, false) : fragment;
  }
  return res;
}
function decodeURIComponentGraceful(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    if (str.length > 3) {
      return str.substr(0, 3) + decodeURIComponentGraceful(str.substr(3));
    } else {
      return str;
    }
  }
}
var _rEncodedAsHex = /(%[0-9A-Za-z][0-9A-Za-z])+/g;
function percentDecode(str) {
  if (!str.match(_rEncodedAsHex)) {
    return str;
  }
  return str.replace(_rEncodedAsHex, (match) => decodeURIComponentGraceful(match));
}

// out-build/vs/base/common/arraysFind.js
function $Kb(array, predicate) {
  const idx = $Lb(array, predicate);
  return idx === -1 ? void 0 : array[idx];
}
function $Lb(array, predicate, startIdx = 0, endIdxEx = array.length) {
  let i = startIdx;
  let j = endIdxEx;
  while (i < j) {
    const k = Math.floor((i + j) / 2);
    if (predicate(array[k])) {
      i = k + 1;
    } else {
      j = k;
    }
  }
  return i - 1;
}
function $Nb(array, predicate, startIdx = 0, endIdxEx = array.length) {
  let i = startIdx;
  let j = endIdxEx;
  while (i < j) {
    const k = Math.floor((i + j) / 2);
    if (predicate(array[k])) {
      j = k;
    } else {
      i = k + 1;
    }
  }
  return i;
}
var $Pb = class _$Pb {
  static {
    this.assertInvariants = false;
  }
  constructor(e) {
    this.e = e;
    this.c = 0;
  }
  /**
   * The predicate must be monotonous, i.e. `arr.map(predicate)` must be like `[true, ..., true, false, ..., false]`!
   * For subsequent calls, current predicate must be weaker than (or equal to) the previous predicate, i.e. more entries must be `true`.
   */
  findLastMonotonous(predicate) {
    if (_$Pb.assertInvariants) {
      if (this.d) {
        for (const item of this.e) {
          if (this.d(item) && !predicate(item)) {
            throw new Error("MonotonousArray: current predicate must be weaker than (or equal to) the previous predicate.");
          }
        }
      }
      this.d = predicate;
    }
    const idx = $Lb(this.e, predicate, this.c);
    this.c = idx + 1;
    return idx === -1 ? void 0 : this.e[idx];
  }
};

// out-build/vs/base/common/errors.js
var $ib = class {
  constructor() {
    this.b = [];
    this.a = function(e) {
      setTimeout(() => {
        if (e.stack) {
          if ($Db.isErrorNoTelemetry(e)) {
            throw new $Db(e.message + "\n\n" + e.stack);
          }
          throw new Error(e.message + "\n\n" + e.stack);
        }
        throw e;
      }, 0);
    };
  }
  addListener(listener) {
    this.b.push(listener);
    return () => {
      this.d(listener);
    };
  }
  c(e) {
    this.b.forEach((listener) => {
      listener(e);
    });
  }
  d(listener) {
    this.b.splice(this.b.indexOf(listener), 1);
  }
  setUnexpectedErrorHandler(newUnexpectedErrorHandler) {
    this.a = newUnexpectedErrorHandler;
  }
  getUnexpectedErrorHandler() {
    return this.a;
  }
  onUnexpectedError(e) {
    this.a(e);
    this.c(e);
  }
  // For external errors, we don't want the listeners to be called
  onUnexpectedExternalError(e) {
    this.a(e);
  }
};
var $jb = new $ib();
function $mb(e) {
  $jb.onUnexpectedError(e);
  return void 0;
}
function $nb(e) {
  if (!$sb(e)) {
    $jb.onUnexpectedError(e);
  }
  return void 0;
}
function $pb(error) {
  if (error instanceof Error) {
    const { name, message, cause } = error;
    const stack = error.stacktrace || error.stack;
    return {
      $isError: true,
      name,
      message,
      stack,
      noTelemetry: $Db.isErrorNoTelemetry(error),
      cause: cause ? $pb(cause) : void 0,
      code: error.code
    };
  }
  return error;
}
var $rb = "Canceled";
function $sb(error) {
  if (error instanceof $tb) {
    return true;
  }
  return error instanceof Error && error.name === $rb && error.message === $rb;
}
var $tb = class extends Error {
  constructor() {
    super($rb);
    this.name = this.message;
  }
};
var $ub = class _$ub extends Error {
  static {
    this.a = "PendingMigrationError";
  }
  static is(error) {
    return error instanceof _$ub || error instanceof Error && error.name === _$ub.a;
  }
  constructor(message) {
    super(message);
    this.name = _$ub.a;
  }
};
var $Db = class _$Db extends Error {
  constructor(msg) {
    super(msg);
    this.name = "CodeExpectedError";
  }
  static fromError(err) {
    if (err instanceof _$Db) {
      return err;
    }
    const result = new _$Db();
    result.message = err.message;
    result.stack = err.stack;
    return result;
  }
  static isErrorNoTelemetry(err) {
    return err.name === "CodeExpectedError";
  }
};
var $Eb = class _$Eb extends Error {
  constructor(message) {
    super(message || "An unexpected bug occurred.");
    Object.setPrototypeOf(this, _$Eb.prototype);
  }
};

// out-build/vs/base/common/arrays.js
function $lc(target, insertIndex, insertArr) {
  const before = target.slice(0, insertIndex);
  const after = target.slice(insertIndex);
  return before.concat(insertArr, after);
}
var CompareResult;
(function(CompareResult2) {
  function isLessThan(result) {
    return result < 0;
  }
  CompareResult2.isLessThan = isLessThan;
  function isLessThanOrEqual(result) {
    return result <= 0;
  }
  CompareResult2.isLessThanOrEqual = isLessThanOrEqual;
  function isGreaterThan(result) {
    return result > 0;
  }
  CompareResult2.isGreaterThan = isGreaterThan;
  function isNeitherLessOrGreaterThan(result) {
    return result === 0;
  }
  CompareResult2.isNeitherLessOrGreaterThan = isNeitherLessOrGreaterThan;
  CompareResult2.greaterThan = 1;
  CompareResult2.lessThan = -1;
  CompareResult2.neitherLessOrGreaterThan = 0;
})(CompareResult || (CompareResult = {}));
function $xc(selector, comparator) {
  return (a, b) => comparator(selector(a), selector(b));
}
var $zc = (a, b) => a - b;
var $Ec = class _$Ec {
  static {
    this.empty = new _$Ec((_callback) => {
    });
  }
  constructor(iterate) {
    this.iterate = iterate;
  }
  forEach(handler) {
    this.iterate((item) => {
      handler(item);
      return true;
    });
  }
  toArray() {
    const result = [];
    this.iterate((item) => {
      result.push(item);
      return true;
    });
    return result;
  }
  filter(predicate) {
    return new _$Ec((cb) => this.iterate((item) => predicate(item) ? cb(item) : true));
  }
  map(mapFn) {
    return new _$Ec((cb) => this.iterate((item) => cb(mapFn(item))));
  }
  some(predicate) {
    let result = false;
    this.iterate((item) => {
      result = predicate(item);
      return !result;
    });
    return result;
  }
  findFirst(predicate) {
    let result;
    this.iterate((item) => {
      if (predicate(item)) {
        result = item;
        return false;
      }
      return true;
    });
    return result;
  }
  findLast(predicate) {
    let result;
    this.iterate((item) => {
      if (predicate(item)) {
        result = item;
      }
      return true;
    });
    return result;
  }
  findLastMaxBy(comparator) {
    let result;
    let first = true;
    this.iterate((item) => {
      if (first || CompareResult.isGreaterThan(comparator(item, result))) {
        first = false;
        result = item;
      }
      return true;
    });
    return result;
  }
};

// out-build/vs/base/common/collections.js
var _a;
function $a(data, groupFn) {
  const result = /* @__PURE__ */ Object.create(null);
  for (const element of data) {
    const key = groupFn(element);
    let target = result[key];
    if (!target) {
      target = result[key] = [];
    }
    target.push(element);
  }
  return result;
}
var $f = class {
  static {
    _a = Symbol.toStringTag;
  }
  constructor(values, b) {
    this.b = b;
    this.a = /* @__PURE__ */ new Map();
    this[_a] = "SetWithKey";
    for (const value of values) {
      this.add(value);
    }
  }
  get size() {
    return this.a.size;
  }
  add(value) {
    const key = this.b(value);
    this.a.set(key, value);
    return this;
  }
  delete(value) {
    return this.a.delete(this.b(value));
  }
  has(value) {
    return this.a.has(this.b(value));
  }
  *entries() {
    for (const entry of this.a.values()) {
      yield [entry, entry];
    }
  }
  keys() {
    return this.values();
  }
  *values() {
    for (const entry of this.a.values()) {
      yield entry;
    }
  }
  clear() {
    this.a.clear();
  }
  forEach(callbackfn, thisArg) {
    this.a.forEach((entry) => callbackfn.call(thisArg, entry, entry, this));
  }
  [Symbol.iterator]() {
    return this.values();
  }
};

// out-build/vs/base/common/map.js
var _a2;
var _b;
var _c;
var ResourceMapEntry = class {
  constructor(uri, value) {
    this.uri = uri;
    this.value = value;
  }
};
function isEntries(arg) {
  return Array.isArray(arg);
}
var $Pc = class _$Pc {
  static {
    this.c = (resource) => resource.toString();
  }
  constructor(arg, toKey) {
    this[_a2] = "ResourceMap";
    if (arg instanceof _$Pc) {
      this.d = new Map(arg.d);
      this.e = toKey ?? _$Pc.c;
    } else if (isEntries(arg)) {
      this.d = /* @__PURE__ */ new Map();
      this.e = toKey ?? _$Pc.c;
      for (const [resource, value] of arg) {
        this.set(resource, value);
      }
    } else {
      this.d = /* @__PURE__ */ new Map();
      this.e = arg ?? _$Pc.c;
    }
  }
  set(resource, value) {
    this.d.set(this.e(resource), new ResourceMapEntry(resource, value));
    return this;
  }
  get(resource) {
    return this.d.get(this.e(resource))?.value;
  }
  has(resource) {
    return this.d.has(this.e(resource));
  }
  get size() {
    return this.d.size;
  }
  clear() {
    this.d.clear();
  }
  delete(resource) {
    return this.d.delete(this.e(resource));
  }
  forEach(clb, thisArg) {
    if (typeof thisArg !== "undefined") {
      clb = clb.bind(thisArg);
    }
    for (const [_, entry] of this.d) {
      clb(entry.value, entry.uri, this);
    }
  }
  *values() {
    for (const entry of this.d.values()) {
      yield entry.value;
    }
  }
  *keys() {
    for (const entry of this.d.values()) {
      yield entry.uri;
    }
  }
  *entries() {
    for (const entry of this.d.values()) {
      yield [entry.uri, entry.value];
    }
  }
  *[(_a2 = Symbol.toStringTag, Symbol.iterator)]() {
    for (const [, entry] of this.d) {
      yield [entry.uri, entry.value];
    }
  }
};
var $Qc = class {
  constructor(entriesOrKey, toKey) {
    this[_b] = "ResourceSet";
    if (!entriesOrKey || typeof entriesOrKey === "function") {
      this.c = new $Pc(entriesOrKey);
    } else {
      this.c = new $Pc(toKey);
      entriesOrKey.forEach(this.add, this);
    }
  }
  get size() {
    return this.c.size;
  }
  add(value) {
    this.c.set(value, value);
    return this;
  }
  clear() {
    this.c.clear();
  }
  delete(value) {
    return this.c.delete(value);
  }
  forEach(callbackfn, thisArg) {
    this.c.forEach((_value, key) => callbackfn.call(thisArg, key, key, this));
  }
  has(value) {
    return this.c.has(value);
  }
  entries() {
    return this.c.entries();
  }
  keys() {
    return this.c.keys();
  }
  values() {
    return this.c.keys();
  }
  [(_b = Symbol.toStringTag, Symbol.iterator)]() {
    return this.keys();
  }
};
var Touch;
(function(Touch2) {
  Touch2[Touch2["None"] = 0] = "None";
  Touch2[Touch2["AsOld"] = 1] = "AsOld";
  Touch2[Touch2["AsNew"] = 2] = "AsNew";
})(Touch || (Touch = {}));
var $Rc = class {
  constructor() {
    this[_c] = "LinkedMap";
    this.c = /* @__PURE__ */ new Map();
    this.d = void 0;
    this.e = void 0;
    this.f = 0;
    this.g = 0;
  }
  clear() {
    this.c.clear();
    this.d = void 0;
    this.e = void 0;
    this.f = 0;
    this.g++;
  }
  isEmpty() {
    return !this.d && !this.e;
  }
  get size() {
    return this.f;
  }
  get first() {
    return this.d?.value;
  }
  get last() {
    return this.e?.value;
  }
  has(key) {
    return this.c.has(key);
  }
  get(key, touch = 0) {
    const item = this.c.get(key);
    if (!item) {
      return void 0;
    }
    if (touch !== 0) {
      this.n(item, touch);
    }
    return item.value;
  }
  set(key, value, touch = 0) {
    let item = this.c.get(key);
    if (item) {
      item.value = value;
      if (touch !== 0) {
        this.n(item, touch);
      }
    } else {
      item = { key, value, next: void 0, previous: void 0 };
      switch (touch) {
        case 0:
          this.l(item);
          break;
        case 1:
          this.k(item);
          break;
        case 2:
          this.l(item);
          break;
        default:
          this.l(item);
          break;
      }
      this.c.set(key, item);
      this.f++;
    }
    return this;
  }
  delete(key) {
    return !!this.remove(key);
  }
  remove(key) {
    const item = this.c.get(key);
    if (!item) {
      return void 0;
    }
    this.c.delete(key);
    this.m(item);
    this.f--;
    return item.value;
  }
  shift() {
    if (!this.d && !this.e) {
      return void 0;
    }
    if (!this.d || !this.e) {
      throw new Error("Invalid list");
    }
    const item = this.d;
    this.c.delete(item.key);
    this.m(item);
    this.f--;
    return item.value;
  }
  forEach(callbackfn, thisArg) {
    const state = this.g;
    let current = this.d;
    while (current) {
      if (thisArg) {
        callbackfn.bind(thisArg)(current.value, current.key, this);
      } else {
        callbackfn(current.value, current.key, this);
      }
      if (this.g !== state) {
        throw new Error(`LinkedMap got modified during iteration.`);
      }
      current = current.next;
    }
  }
  keys() {
    const map = this;
    const state = this.g;
    let current = this.d;
    const iterator = {
      [Symbol.iterator]() {
        return iterator;
      },
      next() {
        if (map.g !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = { value: current.key, done: false };
          current = current.next;
          return result;
        } else {
          return { value: void 0, done: true };
        }
      }
    };
    return iterator;
  }
  values() {
    const map = this;
    const state = this.g;
    let current = this.d;
    const iterator = {
      [Symbol.iterator]() {
        return iterator;
      },
      next() {
        if (map.g !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = { value: current.value, done: false };
          current = current.next;
          return result;
        } else {
          return { value: void 0, done: true };
        }
      }
    };
    return iterator;
  }
  entries() {
    const map = this;
    const state = this.g;
    let current = this.d;
    const iterator = {
      [Symbol.iterator]() {
        return iterator;
      },
      next() {
        if (map.g !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = { value: [current.key, current.value], done: false };
          current = current.next;
          return result;
        } else {
          return { value: void 0, done: true };
        }
      }
    };
    return iterator;
  }
  [(_c = Symbol.toStringTag, Symbol.iterator)]() {
    return this.entries();
  }
  h(newSize) {
    if (newSize >= this.size) {
      return;
    }
    if (newSize === 0) {
      this.clear();
      return;
    }
    let current = this.d;
    let currentSize = this.size;
    while (current && currentSize > newSize) {
      this.c.delete(current.key);
      current = current.next;
      currentSize--;
    }
    this.d = current;
    this.f = currentSize;
    if (current) {
      current.previous = void 0;
    }
    this.g++;
  }
  j(newSize) {
    if (newSize >= this.size) {
      return;
    }
    if (newSize === 0) {
      this.clear();
      return;
    }
    let current = this.e;
    let currentSize = this.size;
    while (current && currentSize > newSize) {
      this.c.delete(current.key);
      current = current.previous;
      currentSize--;
    }
    this.e = current;
    this.f = currentSize;
    if (current) {
      current.next = void 0;
    }
    this.g++;
  }
  k(item) {
    if (!this.d && !this.e) {
      this.e = item;
    } else if (!this.d) {
      throw new Error("Invalid list");
    } else {
      item.next = this.d;
      this.d.previous = item;
    }
    this.d = item;
    this.g++;
  }
  l(item) {
    if (!this.d && !this.e) {
      this.d = item;
    } else if (!this.e) {
      throw new Error("Invalid list");
    } else {
      item.previous = this.e;
      this.e.next = item;
    }
    this.e = item;
    this.g++;
  }
  m(item) {
    if (item === this.d && item === this.e) {
      this.d = void 0;
      this.e = void 0;
    } else if (item === this.d) {
      if (!item.next) {
        throw new Error("Invalid list");
      }
      item.next.previous = void 0;
      this.d = item.next;
    } else if (item === this.e) {
      if (!item.previous) {
        throw new Error("Invalid list");
      }
      item.previous.next = void 0;
      this.e = item.previous;
    } else {
      const next = item.next;
      const previous = item.previous;
      if (!next || !previous) {
        throw new Error("Invalid list");
      }
      next.previous = previous;
      previous.next = next;
    }
    item.next = void 0;
    item.previous = void 0;
    this.g++;
  }
  n(item, touch) {
    if (!this.d || !this.e) {
      throw new Error("Invalid list");
    }
    if (touch !== 1 && touch !== 2) {
      return;
    }
    if (touch === 1) {
      if (item === this.d) {
        return;
      }
      const next = item.next;
      const previous = item.previous;
      if (item === this.e) {
        previous.next = void 0;
        this.e = previous;
      } else {
        next.previous = previous;
        previous.next = next;
      }
      item.previous = void 0;
      item.next = this.d;
      this.d.previous = item;
      this.d = item;
      this.g++;
    } else if (touch === 2) {
      if (item === this.e) {
        return;
      }
      const next = item.next;
      const previous = item.previous;
      if (item === this.d) {
        next.previous = void 0;
        this.d = next;
      } else {
        next.previous = previous;
        previous.next = next;
      }
      item.next = void 0;
      item.previous = this.e;
      this.e.next = item;
      this.e = item;
      this.g++;
    }
  }
  toJSON() {
    const data = [];
    this.forEach((value, key) => {
      data.push([key, value]);
    });
    return data;
  }
  fromJSON(data) {
    this.clear();
    for (const [key, value] of data) {
      this.set(key, value);
    }
  }
};
var $Wc = class {
  constructor() {
    this.c = /* @__PURE__ */ new Map();
  }
  add(key, value) {
    let values = this.c.get(key);
    if (!values) {
      values = /* @__PURE__ */ new Set();
      this.c.set(key, values);
    }
    values.add(value);
  }
  delete(key, value) {
    const values = this.c.get(key);
    if (!values) {
      return;
    }
    values.delete(value);
    if (values.size === 0) {
      this.c.delete(key);
    }
  }
  forEach(key, fn) {
    const values = this.c.get(key);
    if (!values) {
      return;
    }
    values.forEach(fn);
  }
  get(key) {
    const values = this.c.get(key);
    if (!values) {
      return /* @__PURE__ */ new Set();
    }
    return values;
  }
};

// out-build/vs/base/common/assert.js
function $5c(condition) {
  if (!condition()) {
    debugger;
    condition();
    $nb(new $Eb("Assertion Failed"));
  }
}

// out-build/vs/base/common/types.js
function $7c(str) {
  return typeof str === "string";
}
function $ad(obj) {
  return !!obj && typeof obj[Symbol.iterator] === "function";
}
function $dd(obj) {
  return typeof obj === "undefined";
}
function $ed(arg) {
  return !$fd(arg);
}
function $fd(obj) {
  return $dd(obj) || obj === null;
}

// out-build/vs/base/common/iterator.js
var Iterable;
(function(Iterable2) {
  function is(thing) {
    return !!thing && typeof thing === "object" && typeof thing[Symbol.iterator] === "function";
  }
  Iterable2.is = is;
  const _empty2 = Object.freeze([]);
  function empty() {
    return _empty2;
  }
  Iterable2.empty = empty;
  function* single(element) {
    yield element;
  }
  Iterable2.single = single;
  function wrap(iterableOrElement) {
    if (is(iterableOrElement)) {
      return iterableOrElement;
    } else {
      return single(iterableOrElement);
    }
  }
  Iterable2.wrap = wrap;
  function from(iterable) {
    return iterable ?? _empty2;
  }
  Iterable2.from = from;
  function* reverse(array) {
    for (let i = array.length - 1; i >= 0; i--) {
      yield array[i];
    }
  }
  Iterable2.reverse = reverse;
  function isEmpty(iterable) {
    return !iterable || iterable[Symbol.iterator]().next().done === true;
  }
  Iterable2.isEmpty = isEmpty;
  function first(iterable) {
    return iterable[Symbol.iterator]().next().value;
  }
  Iterable2.first = first;
  function some(iterable, predicate) {
    let i = 0;
    for (const element of iterable) {
      if (predicate(element, i++)) {
        return true;
      }
    }
    return false;
  }
  Iterable2.some = some;
  function every(iterable, predicate) {
    let i = 0;
    for (const element of iterable) {
      if (!predicate(element, i++)) {
        return false;
      }
    }
    return true;
  }
  Iterable2.every = every;
  function find(iterable, predicate) {
    for (const element of iterable) {
      if (predicate(element)) {
        return element;
      }
    }
    return void 0;
  }
  Iterable2.find = find;
  function* filter(iterable, predicate) {
    for (const element of iterable) {
      if (predicate(element)) {
        yield element;
      }
    }
  }
  Iterable2.filter = filter;
  function* map(iterable, fn) {
    let index = 0;
    for (const element of iterable) {
      yield fn(element, index++);
    }
  }
  Iterable2.map = map;
  function* flatMap(iterable, fn) {
    let index = 0;
    for (const element of iterable) {
      yield* fn(element, index++);
    }
  }
  Iterable2.flatMap = flatMap;
  function* concat(...iterables) {
    for (const item of iterables) {
      if ($ad(item)) {
        yield* item;
      } else {
        yield item;
      }
    }
  }
  Iterable2.concat = concat;
  function reduce(iterable, reducer, initialValue) {
    let value = initialValue;
    for (const element of iterable) {
      value = reducer(value, element);
    }
    return value;
  }
  Iterable2.reduce = reduce;
  function length(iterable) {
    let count = 0;
    for (const _ of iterable) {
      count++;
    }
    return count;
  }
  Iterable2.length = length;
  function* slice(arr, from2, to = arr.length) {
    if (from2 < -arr.length) {
      from2 = 0;
    }
    if (from2 < 0) {
      from2 += arr.length;
    }
    if (to < 0) {
      to += arr.length;
    } else if (to > arr.length) {
      to = arr.length;
    }
    for (; from2 < to; from2++) {
      yield arr[from2];
    }
  }
  Iterable2.slice = slice;
  function consume(iterable, atMost = Number.POSITIVE_INFINITY) {
    const consumed = [];
    if (atMost === 0) {
      return [consumed, iterable];
    }
    const iterator = iterable[Symbol.iterator]();
    for (let i = 0; i < atMost; i++) {
      const next = iterator.next();
      if (next.done) {
        return [consumed, Iterable2.empty()];
      }
      consumed.push(next.value);
    }
    return [consumed, { [Symbol.iterator]() {
      return iterator;
    } }];
  }
  Iterable2.consume = consume;
  async function asyncToArray(iterable) {
    const result = [];
    for await (const item of iterable) {
      result.push(item);
    }
    return result;
  }
  Iterable2.asyncToArray = asyncToArray;
  async function asyncToArrayFlat(iterable) {
    let result = [];
    for await (const item of iterable) {
      result = result.concat(item);
    }
    return result;
  }
  Iterable2.asyncToArrayFlat = asyncToArrayFlat;
})(Iterable || (Iterable = {}));

// out-build/vs/base/common/lifecycle.js
var TRACK_DISPOSABLES = false;
var disposableTracker = null;
var $ud = class _$ud {
  constructor() {
    this.b = /* @__PURE__ */ new Map();
  }
  static {
    this.a = 0;
  }
  c(d) {
    let val = this.b.get(d);
    if (!val) {
      val = { parent: null, source: null, isSingleton: false, value: d, idx: _$ud.a++ };
      this.b.set(d, val);
    }
    return val;
  }
  trackDisposable(d) {
    const data = this.c(d);
    if (!data.source) {
      data.source = new Error().stack;
    }
  }
  setParent(child, parent) {
    const data = this.c(child);
    data.parent = parent;
  }
  markAsDisposed(x) {
    this.b.delete(x);
  }
  markAsSingleton(disposable) {
    this.c(disposable).isSingleton = true;
  }
  f(data, cache2) {
    const cacheValue = cache2.get(data);
    if (cacheValue) {
      return cacheValue;
    }
    const result = data.parent ? this.f(this.c(data.parent), cache2) : data;
    cache2.set(data, result);
    return result;
  }
  getTrackedDisposables() {
    const rootParentCache = /* @__PURE__ */ new Map();
    const leaking = [...this.b.entries()].filter(([, v]) => v.source !== null && !this.f(v, rootParentCache).isSingleton).flatMap(([k]) => k);
    return leaking;
  }
  computeLeakingDisposables(maxReported = 10, preComputedLeaks) {
    let uncoveredLeakingObjs;
    if (preComputedLeaks) {
      uncoveredLeakingObjs = preComputedLeaks;
    } else {
      const rootParentCache = /* @__PURE__ */ new Map();
      const leakingObjects = [...this.b.values()].filter((info) => info.source !== null && !this.f(info, rootParentCache).isSingleton);
      if (leakingObjects.length === 0) {
        return;
      }
      const leakingObjsSet = new Set(leakingObjects.map((o) => o.value));
      uncoveredLeakingObjs = leakingObjects.filter((l) => {
        return !(l.parent && leakingObjsSet.has(l.parent));
      });
      if (uncoveredLeakingObjs.length === 0) {
        throw new Error("There are cyclic diposable chains!");
      }
    }
    if (!uncoveredLeakingObjs) {
      return void 0;
    }
    function getStackTracePath(leaking) {
      function removePrefix(array, linesToRemove) {
        while (array.length > 0 && linesToRemove.some((regexp) => typeof regexp === "string" ? regexp === array[0] : array[0].match(regexp))) {
          array.shift();
        }
      }
      const lines = leaking.source.split("\n").map((p) => p.trim().replace("at ", "")).filter((l) => l !== "");
      removePrefix(lines, ["Error", /^trackDisposable \(.*\)$/, /^DisposableTracker.trackDisposable \(.*\)$/]);
      return lines.reverse();
    }
    const stackTraceStarts = new $Wc();
    for (const leaking of uncoveredLeakingObjs) {
      const stackTracePath = getStackTracePath(leaking);
      for (let i2 = 0; i2 <= stackTracePath.length; i2++) {
        stackTraceStarts.add(stackTracePath.slice(0, i2).join("\n"), leaking);
      }
    }
    uncoveredLeakingObjs.sort($xc((l) => l.idx, $zc));
    let message = "";
    let i = 0;
    for (const leaking of uncoveredLeakingObjs.slice(0, maxReported)) {
      i++;
      const stackTracePath = getStackTracePath(leaking);
      const stackTraceFormattedLines = [];
      for (let i2 = 0; i2 < stackTracePath.length; i2++) {
        let line = stackTracePath[i2];
        const starts = stackTraceStarts.get(stackTracePath.slice(0, i2 + 1).join("\n"));
        line = `(shared with ${starts.size}/${uncoveredLeakingObjs.length} leaks) at ${line}`;
        const prevStarts = stackTraceStarts.get(stackTracePath.slice(0, i2).join("\n"));
        const continuations = $a([...prevStarts].map((d) => getStackTracePath(d)[i2]), (v) => v);
        delete continuations[stackTracePath[i2]];
        for (const [cont, set] of Object.entries(continuations)) {
          if (set) {
            stackTraceFormattedLines.unshift(`    - stacktraces of ${set.length} other leaks continue with ${cont}`);
          }
        }
        stackTraceFormattedLines.unshift(line);
      }
      message += `


==================== Leaking disposable ${i}/${uncoveredLeakingObjs.length}: ${leaking.value.constructor.name} ====================
${stackTraceFormattedLines.join("\n")}
============================================================

`;
    }
    if (uncoveredLeakingObjs.length > maxReported) {
      message += `


... and ${uncoveredLeakingObjs.length - maxReported} more leaking disposables

`;
    }
    return { leaks: uncoveredLeakingObjs, details: message };
  }
};
function $vd(tracker) {
  disposableTracker = tracker;
}
if (TRACK_DISPOSABLES) {
  const __is_disposable_tracked__ = "__is_disposable_tracked__";
  $vd(new class {
    trackDisposable(x) {
      const stack = new Error("Potentially leaked disposable").stack;
      setTimeout(() => {
        if (!x[__is_disposable_tracked__]) {
          console.log(stack);
        }
      }, 3e3);
    }
    setParent(child, parent) {
      if (child && child !== $Fd.None) {
        try {
          child[__is_disposable_tracked__] = true;
        } catch {
        }
      }
    }
    markAsDisposed(disposable) {
      if (disposable && disposable !== $Fd.None) {
        try {
          disposable[__is_disposable_tracked__] = true;
        } catch {
        }
      }
    }
    markAsSingleton(disposable) {
    }
  }());
}
function $wd(x) {
  disposableTracker?.trackDisposable(x);
  return x;
}
function $xd(disposable) {
  disposableTracker?.markAsDisposed(disposable);
}
function setParentOfDisposable(child, parent) {
  disposableTracker?.setParent(child, parent);
}
function setParentOfDisposables(children, parent) {
  if (!disposableTracker) {
    return;
  }
  for (const child of children) {
    disposableTracker.setParent(child, parent);
  }
}
function $Ad(arg) {
  if (Iterable.is(arg)) {
    const errors = [];
    for (const d of arg) {
      if (d) {
        try {
          d.dispose();
        } catch (e) {
          errors.push(e);
        }
      }
    }
    if (errors.length === 1) {
      throw errors[0];
    } else if (errors.length > 1) {
      throw new AggregateError(errors, "Encountered errors while disposing of store");
    }
    return Array.isArray(arg) ? [] : arg;
  } else if (arg) {
    arg.dispose();
    return arg;
  }
}
function $Cd(...disposables) {
  const parent = $Dd(() => $Ad(disposables));
  setParentOfDisposables(disposables, parent);
  return parent;
}
var FunctionDisposable = class {
  constructor(fn) {
    this.a = false;
    this.b = fn;
    $wd(this);
  }
  dispose() {
    if (this.a) {
      return;
    }
    if (!this.b) {
      throw new Error(`Unbound disposable context: Need to use an arrow function to preserve the value of this`);
    }
    this.a = true;
    $xd(this);
    this.b();
  }
};
function $Dd(fn) {
  return new FunctionDisposable(fn);
}
var $Ed = class _$Ed {
  static {
    this.DISABLE_DISPOSED_WARNING = false;
  }
  constructor() {
    this.f = /* @__PURE__ */ new Set();
    this.g = false;
    $wd(this);
  }
  /**
   * Dispose of all registered disposables and mark this object as disposed.
   *
   * Any future disposables added to this object will be disposed of on `add`.
   */
  dispose() {
    if (this.g) {
      return;
    }
    $xd(this);
    this.g = true;
    this.clear();
  }
  /**
   * @return `true` if this object has been disposed of.
   */
  get isDisposed() {
    return this.g;
  }
  /**
   * Dispose of all registered disposables but do not mark this object as disposed.
   */
  clear() {
    if (this.f.size === 0) {
      return;
    }
    try {
      $Ad(this.f);
    } finally {
      this.f.clear();
    }
  }
  /**
   * Add a new {@link IDisposable disposable} to the collection.
   */
  add(o) {
    if (!o || o === $Fd.None) {
      return o;
    }
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    setParentOfDisposable(o, this);
    if (this.g) {
      if (!_$Ed.DISABLE_DISPOSED_WARNING) {
        console.warn(new Error("Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!").stack);
      }
    } else {
      this.f.add(o);
    }
    return o;
  }
  /**
   * Deletes a disposable from store and disposes of it. This will not throw or warn and proceed to dispose the
   * disposable even when the disposable is not part in the store.
   */
  delete(o) {
    if (!o) {
      return;
    }
    if (o === this) {
      throw new Error("Cannot dispose a disposable on itself!");
    }
    this.f.delete(o);
    o.dispose();
  }
  /**
   * Deletes the value from the store, but does not dispose it.
   */
  deleteAndLeak(o) {
    if (!o) {
      return;
    }
    if (this.f.has(o)) {
      this.f.delete(o);
      setParentOfDisposable(o, null);
    }
  }
  assertNotDisposed() {
    if (this.g) {
      $nb(new $Eb("Object disposed"));
    }
  }
};
var $Fd = class {
  static {
    this.None = Object.freeze({ dispose() {
    } });
  }
  constructor() {
    this.B = new $Ed();
    $wd(this);
    setParentOfDisposable(this.B, this);
  }
  dispose() {
    $xd(this);
    this.B.dispose();
  }
  /**
   * Adds `o` to the collection of disposables managed by this object.
   */
  D(o) {
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    return this.B.add(o);
  }
};

// out-build/vs/base/common/linkedList.js
var Node = class _Node {
  static {
    this.Undefined = new _Node(void 0);
  }
  constructor(element) {
    this.element = element;
    this.next = _Node.Undefined;
    this.prev = _Node.Undefined;
  }
};

// out-build/vs/base/common/stopwatch.js
var performanceNow = globalThis.performance.now.bind(globalThis.performance);
var $kf = class _$kf {
  static create(highResolution) {
    return new _$kf(highResolution);
  }
  constructor(highResolution) {
    this.c = highResolution === false ? Date.now : performanceNow;
    this.a = this.c();
    this.b = -1;
  }
  stop() {
    this.b = this.c();
  }
  reset() {
    this.a = this.c();
    this.b = -1;
  }
  elapsed() {
    if (this.b !== -1) {
      return this.b - this.a;
    }
    return this.c() - this.a;
  }
};

// out-build/vs/base/common/event.js
var _enableDisposeWithListenerWarning = false;
var _enableSnapshotPotentialLeakWarning = false;
var Event;
(function(Event2) {
  Event2.None = () => $Fd.None;
  function _addLeakageTraceLogic(options) {
    if (_enableSnapshotPotentialLeakWarning) {
      const { onDidAddListener: origListenerDidAdd } = options;
      const stack = Stacktrace.create();
      let count = 0;
      options.onDidAddListener = () => {
        if (++count === 2) {
          console.warn("snapshotted emitter LIKELY used public and SHOULD HAVE BEEN created with DisposableStore. snapshotted here");
          stack.print();
        }
        origListenerDidAdd?.();
      };
    }
  }
  function defer(event, disposable) {
    return debounce(event, () => void 0, 0, void 0, true, void 0, disposable);
  }
  Event2.defer = defer;
  function once(event) {
    return (listener, thisArgs = null, disposables) => {
      let didFire = false;
      let result = void 0;
      result = event((e) => {
        if (didFire) {
          return;
        } else if (result) {
          result.dispose();
        } else {
          didFire = true;
        }
        return listener.call(thisArgs, e);
      }, null, disposables);
      if (didFire) {
        result.dispose();
      }
      return result;
    };
  }
  Event2.once = once;
  function onceIf(event, condition) {
    return Event2.once(Event2.filter(event, condition));
  }
  Event2.onceIf = onceIf;
  function map(event, map2, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((i) => listener.call(thisArgs, map2(i)), null, disposables), disposable);
  }
  Event2.map = map;
  function forEach(event, each, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((i) => {
      each(i);
      listener.call(thisArgs, i);
    }, null, disposables), disposable);
  }
  Event2.forEach = forEach;
  function filter(event, filter2, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((e) => filter2(e) && listener.call(thisArgs, e), null, disposables), disposable);
  }
  Event2.filter = filter;
  function signal(event) {
    return event;
  }
  Event2.signal = signal;
  function any(...events) {
    return (listener, thisArgs = null, disposables) => {
      const disposable = $Cd(...events.map((event) => event((e) => listener.call(thisArgs, e))));
      return addAndReturnDisposable(disposable, disposables);
    };
  }
  Event2.any = any;
  function reduce(event, merge, initial, disposable) {
    let output = initial;
    return map(event, (e) => {
      output = merge(output, e);
      return output;
    }, disposable);
  }
  Event2.reduce = reduce;
  function snapshot(event, disposable) {
    let listener;
    const options = {
      onWillAddFirstListener() {
        listener = event(emitter.fire, emitter);
      },
      onDidRemoveLastListener() {
        listener?.dispose();
      }
    };
    if (!disposable) {
      _addLeakageTraceLogic(options);
    }
    const emitter = new $qf(options);
    disposable?.add(emitter);
    return emitter.event;
  }
  function addAndReturnDisposable(d, store) {
    if (store instanceof Array) {
      store.push(d);
    } else if (store) {
      store.add(d);
    }
    return d;
  }
  function debounce(event, merge, delay = 100, leading = false, flushOnListenerRemove = false, leakWarningThreshold, disposable) {
    let subscription;
    let output = void 0;
    let handle = void 0;
    let numDebouncedCalls = 0;
    let doFire;
    const options = {
      leakWarningThreshold,
      onWillAddFirstListener() {
        subscription = event((cur) => {
          numDebouncedCalls++;
          output = merge(output, cur);
          if (leading && !handle) {
            emitter.fire(output);
            output = void 0;
          }
          doFire = () => {
            const _output = output;
            output = void 0;
            handle = void 0;
            if (!leading || numDebouncedCalls > 1) {
              emitter.fire(_output);
            }
            numDebouncedCalls = 0;
          };
          if (typeof delay === "number") {
            if (handle) {
              clearTimeout(handle);
            }
            handle = setTimeout(doFire, delay);
          } else {
            if (handle === void 0) {
              handle = null;
              queueMicrotask(doFire);
            }
          }
        });
      },
      onWillRemoveListener() {
        if (flushOnListenerRemove && numDebouncedCalls > 0) {
          doFire?.();
        }
      },
      onDidRemoveLastListener() {
        doFire = void 0;
        subscription.dispose();
      }
    };
    if (!disposable) {
      _addLeakageTraceLogic(options);
    }
    const emitter = new $qf(options);
    disposable?.add(emitter);
    return emitter.event;
  }
  Event2.debounce = debounce;
  function accumulate(event, delay = 0, disposable) {
    return Event2.debounce(event, (last, e) => {
      if (!last) {
        return [e];
      }
      last.push(e);
      return last;
    }, delay, void 0, true, void 0, disposable);
  }
  Event2.accumulate = accumulate;
  function latch(event, equals = (a, b) => a === b, disposable) {
    let firstCall = true;
    let cache2;
    return filter(event, (value) => {
      const shouldEmit = firstCall || !equals(value, cache2);
      firstCall = false;
      cache2 = value;
      return shouldEmit;
    }, disposable);
  }
  Event2.latch = latch;
  function split(event, isT, disposable) {
    return [
      Event2.filter(event, isT, disposable),
      Event2.filter(event, (e) => !isT(e), disposable)
    ];
  }
  Event2.split = split;
  function buffer(event, flushAfterTimeout = false, _buffer = [], disposable) {
    let buffer2 = _buffer.slice();
    let listener = event((e) => {
      if (buffer2) {
        buffer2.push(e);
      } else {
        emitter.fire(e);
      }
    });
    if (disposable) {
      disposable.add(listener);
    }
    const flush = () => {
      buffer2?.forEach((e) => emitter.fire(e));
      buffer2 = null;
    };
    const emitter = new $qf({
      onWillAddFirstListener() {
        if (!listener) {
          listener = event((e) => emitter.fire(e));
          if (disposable) {
            disposable.add(listener);
          }
        }
      },
      onDidAddFirstListener() {
        if (buffer2) {
          if (flushAfterTimeout) {
            setTimeout(flush);
          } else {
            flush();
          }
        }
      },
      onDidRemoveLastListener() {
        if (listener) {
          listener.dispose();
        }
        listener = null;
      }
    });
    if (disposable) {
      disposable.add(emitter);
    }
    return emitter.event;
  }
  Event2.buffer = buffer;
  function chain(event, sythensize) {
    const fn = (listener, thisArgs, disposables) => {
      const cs = sythensize(new ChainableSynthesis());
      return event(function(value) {
        const result = cs.evaluate(value);
        if (result !== HaltChainable) {
          listener.call(thisArgs, result);
        }
      }, void 0, disposables);
    };
    return fn;
  }
  Event2.chain = chain;
  const HaltChainable = Symbol("HaltChainable");
  class ChainableSynthesis {
    constructor() {
      this.f = [];
    }
    map(fn) {
      this.f.push(fn);
      return this;
    }
    forEach(fn) {
      this.f.push((v) => {
        fn(v);
        return v;
      });
      return this;
    }
    filter(fn) {
      this.f.push((v) => fn(v) ? v : HaltChainable);
      return this;
    }
    reduce(merge, initial) {
      let last = initial;
      this.f.push((v) => {
        last = merge(last, v);
        return last;
      });
      return this;
    }
    latch(equals = (a, b) => a === b) {
      let firstCall = true;
      let cache2;
      this.f.push((value) => {
        const shouldEmit = firstCall || !equals(value, cache2);
        firstCall = false;
        cache2 = value;
        return shouldEmit ? value : HaltChainable;
      });
      return this;
    }
    evaluate(value) {
      for (const step of this.f) {
        value = step(value);
        if (value === HaltChainable) {
          break;
        }
      }
      return value;
    }
  }
  function fromNodeEventEmitter(emitter, eventName, map2 = (id2) => id2) {
    const fn = (...args) => result.fire(map2(...args));
    const onFirstListenerAdd = () => emitter.on(eventName, fn);
    const onLastListenerRemove = () => emitter.removeListener(eventName, fn);
    const result = new $qf({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove });
    return result.event;
  }
  Event2.fromNodeEventEmitter = fromNodeEventEmitter;
  function fromDOMEventEmitter(emitter, eventName, map2 = (id2) => id2) {
    const fn = (...args) => result.fire(map2(...args));
    const onFirstListenerAdd = () => emitter.addEventListener(eventName, fn);
    const onLastListenerRemove = () => emitter.removeEventListener(eventName, fn);
    const result = new $qf({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove });
    return result.event;
  }
  Event2.fromDOMEventEmitter = fromDOMEventEmitter;
  function toPromise(event, disposables) {
    let cancelRef;
    let listener;
    const promise = new Promise((resolve) => {
      listener = once(event)(resolve);
      addToDisposables(listener, disposables);
      cancelRef = () => {
        disposeAndRemove(listener, disposables);
      };
    });
    promise.cancel = cancelRef;
    if (disposables) {
      promise.finally(() => disposeAndRemove(listener, disposables));
    }
    return promise;
  }
  Event2.toPromise = toPromise;
  function forward(from, to) {
    return from((e) => to.fire(e));
  }
  Event2.forward = forward;
  function runAndSubscribe(event, handler, initial) {
    handler(initial);
    return event((e) => handler(e));
  }
  Event2.runAndSubscribe = runAndSubscribe;
  class EmitterObserver {
    constructor(_observable, store) {
      this._observable = _observable;
      this.f = 0;
      this.g = false;
      const options = {
        onWillAddFirstListener: () => {
          _observable.addObserver(this);
          this._observable.reportChanges();
        },
        onDidRemoveLastListener: () => {
          _observable.removeObserver(this);
        }
      };
      if (!store) {
        _addLeakageTraceLogic(options);
      }
      this.emitter = new $qf(options);
      if (store) {
        store.add(this.emitter);
      }
    }
    beginUpdate(_observable) {
      this.f++;
    }
    handlePossibleChange(_observable) {
    }
    handleChange(_observable, _change) {
      this.g = true;
    }
    endUpdate(_observable) {
      this.f--;
      if (this.f === 0) {
        this._observable.reportChanges();
        if (this.g) {
          this.g = false;
          this.emitter.fire(this._observable.get());
        }
      }
    }
  }
  function fromObservable(obs, store) {
    const observer = new EmitterObserver(obs, store);
    return observer.emitter.event;
  }
  Event2.fromObservable = fromObservable;
  function fromObservableLight(observable) {
    return (listener, thisArgs, disposables) => {
      let count = 0;
      let didChange = false;
      const observer = {
        beginUpdate() {
          count++;
        },
        endUpdate() {
          count--;
          if (count === 0) {
            observable.reportChanges();
            if (didChange) {
              didChange = false;
              listener.call(thisArgs);
            }
          }
        },
        handlePossibleChange() {
        },
        handleChange() {
          didChange = true;
        }
      };
      observable.addObserver(observer);
      observable.reportChanges();
      const disposable = {
        dispose() {
          observable.removeObserver(observer);
        }
      };
      addToDisposables(disposable, disposables);
      return disposable;
    };
  }
  Event2.fromObservableLight = fromObservableLight;
})(Event || (Event = {}));
var $mf = class _$mf {
  static {
    this.all = /* @__PURE__ */ new Set();
  }
  static {
    this.f = 0;
  }
  constructor(name) {
    this.listenerCount = 0;
    this.invocationCount = 0;
    this.elapsedOverall = 0;
    this.durations = [];
    this.name = `${name}_${_$mf.f++}`;
    _$mf.all.add(this);
  }
  start(listenerCount) {
    this.g = new $kf();
    this.listenerCount = listenerCount;
  }
  stop() {
    if (this.g) {
      const elapsed = this.g.elapsed();
      this.durations.push(elapsed);
      this.elapsedOverall += elapsed;
      this.invocationCount += 1;
      this.g = void 0;
    }
  }
};
var _globalLeakWarningThreshold = -1;
var LeakageMonitor = class _LeakageMonitor {
  static {
    this.f = 1;
  }
  constructor(j, threshold, name = (_LeakageMonitor.f++).toString(16).padStart(3, "0")) {
    this.j = j;
    this.threshold = threshold;
    this.name = name;
    this.h = 0;
  }
  dispose() {
    this.g?.clear();
  }
  check(stack, listenerCount) {
    const threshold = this.threshold;
    if (threshold <= 0 || listenerCount < threshold) {
      return void 0;
    }
    if (!this.g) {
      this.g = /* @__PURE__ */ new Map();
    }
    const count = this.g.get(stack.value) || 0;
    this.g.set(stack.value, count + 1);
    this.h -= 1;
    if (this.h <= 0) {
      this.h = threshold * 0.5;
      const [topStack, topCount] = this.getMostFrequentStack();
      const message = `[${this.name}] potential listener LEAK detected, having ${listenerCount} listeners already. MOST frequent listener (${topCount}):`;
      console.warn(message);
      console.warn(topStack);
      const error = new $of(message, topStack);
      this.j(error);
    }
    return () => {
      const count2 = this.g.get(stack.value) || 0;
      this.g.set(stack.value, count2 - 1);
    };
  }
  getMostFrequentStack() {
    if (!this.g) {
      return void 0;
    }
    let topStack;
    let topCount = 0;
    for (const [stack, count] of this.g) {
      if (!topStack || topCount < count) {
        topStack = [stack, count];
        topCount = count;
      }
    }
    return topStack;
  }
};
var Stacktrace = class _Stacktrace {
  static create() {
    const err = new Error();
    return new _Stacktrace(err.stack ?? "");
  }
  constructor(value) {
    this.value = value;
  }
  print() {
    console.warn(this.value.split("\n").slice(2).join("\n"));
  }
};
var $of = class extends Error {
  constructor(message, stack) {
    super(message);
    this.name = "ListenerLeakError";
    this.stack = stack;
  }
};
var $pf = class extends Error {
  constructor(message, stack) {
    super(message);
    this.name = "ListenerRefusalError";
    this.stack = stack;
  }
};
var id = 0;
var UniqueContainer = class {
  constructor(value) {
    this.value = value;
    this.id = id++;
  }
};
var compactionThreshold = 2;
var forEachListener = (listeners, fn) => {
  if (listeners instanceof UniqueContainer) {
    fn(listeners);
  } else {
    for (let i = 0; i < listeners.length; i++) {
      const l = listeners[i];
      if (l) {
        fn(l);
      }
    }
  }
};
var $qf = class {
  constructor(options) {
    this.A = 0;
    this.g = options;
    this.j = _globalLeakWarningThreshold > 0 || this.g?.leakWarningThreshold ? new LeakageMonitor(options?.onListenerError ?? $nb, this.g?.leakWarningThreshold ?? _globalLeakWarningThreshold) : void 0;
    this.m = this.g?._profName ? new $mf(this.g._profName) : void 0;
    this.z = this.g?.deliveryQueue;
  }
  dispose() {
    if (!this.q) {
      this.q = true;
      if (this.z?.current === this) {
        this.z.reset();
      }
      if (this.w) {
        if (_enableDisposeWithListenerWarning) {
          const listeners = this.w;
          queueMicrotask(() => {
            forEachListener(listeners, (l) => l.stack?.print());
          });
        }
        this.w = void 0;
        this.A = 0;
      }
      this.g?.onDidRemoveLastListener?.();
      this.j?.dispose();
    }
  }
  /**
   * For the public to allow to subscribe
   * to events from this Emitter
   */
  get event() {
    this.u ??= (callback, thisArgs, disposables) => {
      if (this.j && this.A > this.j.threshold ** 2) {
        const message = `[${this.j.name}] REFUSES to accept new listeners because it exceeded its threshold by far (${this.A} vs ${this.j.threshold})`;
        console.warn(message);
        const tuple = this.j.getMostFrequentStack() ?? ["UNKNOWN stack", -1];
        const error = new $pf(`${message}. HINT: Stack shows most frequent listener (${tuple[1]}-times)`, tuple[0]);
        const errorHandler = this.g?.onListenerError || $nb;
        errorHandler(error);
        return $Fd.None;
      }
      if (this.q) {
        return $Fd.None;
      }
      if (thisArgs) {
        callback = callback.bind(thisArgs);
      }
      const contained = new UniqueContainer(callback);
      let removeMonitor;
      let stack;
      if (this.j && this.A >= Math.ceil(this.j.threshold * 0.2)) {
        contained.stack = Stacktrace.create();
        removeMonitor = this.j.check(contained.stack, this.A + 1);
      }
      if (_enableDisposeWithListenerWarning) {
        contained.stack = stack ?? Stacktrace.create();
      }
      if (!this.w) {
        this.g?.onWillAddFirstListener?.(this);
        this.w = contained;
        this.g?.onDidAddFirstListener?.(this);
      } else if (this.w instanceof UniqueContainer) {
        this.z ??= new EventDeliveryQueuePrivate();
        this.w = [this.w, contained];
      } else {
        this.w.push(contained);
      }
      this.g?.onDidAddListener?.(this);
      this.A++;
      const result = $Dd(() => {
        removeMonitor?.();
        this.B(contained);
      });
      addToDisposables(result, disposables);
      return result;
    };
    return this.u;
  }
  B(listener) {
    this.g?.onWillRemoveListener?.(this);
    if (!this.w) {
      return;
    }
    if (this.A === 1) {
      this.w = void 0;
      this.g?.onDidRemoveLastListener?.(this);
      this.A = 0;
      return;
    }
    const listeners = this.w;
    const index = listeners.indexOf(listener);
    if (index === -1) {
      console.log("disposed?", this.q);
      console.log("size?", this.A);
      console.log("arr?", JSON.stringify(this.w));
      throw new Error("Attempted to dispose unknown listener");
    }
    this.A--;
    listeners[index] = void 0;
    const adjustDeliveryQueue = this.z.current === this;
    if (this.A * compactionThreshold <= listeners.length) {
      let n = 0;
      for (let i = 0; i < listeners.length; i++) {
        if (listeners[i]) {
          listeners[n++] = listeners[i];
        } else if (adjustDeliveryQueue && n < this.z.end) {
          this.z.end--;
          if (n < this.z.i) {
            this.z.i--;
          }
        }
      }
      listeners.length = n;
    }
  }
  C(listener, value) {
    if (!listener) {
      return;
    }
    const errorHandler = this.g?.onListenerError || $nb;
    if (!errorHandler) {
      listener.value(value);
      return;
    }
    try {
      listener.value(value);
    } catch (e) {
      errorHandler(e);
    }
  }
  /** Delivers items in the queue. Assumes the queue is ready to go. */
  D(dq) {
    const listeners = dq.current.w;
    while (dq.i < dq.end) {
      this.C(listeners[dq.i++], dq.value);
    }
    dq.reset();
  }
  /**
   * To be kept private to fire an event to
   * subscribers
   */
  fire(event) {
    if (this.z?.current) {
      this.D(this.z);
      this.m?.stop();
    }
    this.m?.start(this.A);
    if (!this.w) {
    } else if (this.w instanceof UniqueContainer) {
      this.C(this.w, event);
    } else {
      const dq = this.z;
      dq.enqueue(this, event, this.w.length);
      this.D(dq);
    }
    this.m?.stop();
  }
  hasListeners() {
    return this.A > 0;
  }
};
var EventDeliveryQueuePrivate = class {
  constructor() {
    this.i = -1;
    this.end = 0;
  }
  enqueue(emitter, value, end) {
    this.i = 0;
    this.end = end;
    this.current = emitter;
    this.value = value;
  }
  reset() {
    this.i = this.end;
    this.current = void 0;
    this.value = void 0;
  }
};
function addToDisposables(result, disposables) {
  if (disposables instanceof $Ed) {
    disposables.add(result);
  } else if (Array.isArray(disposables)) {
    disposables.push(result);
  }
}
function disposeAndRemove(result, disposables) {
  if (disposables instanceof $Ed) {
    disposables.delete(result);
  } else if (Array.isArray(disposables)) {
    const index = disposables.indexOf(result);
    if (index !== -1) {
      disposables.splice(index, 1);
    }
  }
  result.dispose();
}

// out-build/vs/base/common/cancellation.js
var shortcutEvent = Object.freeze(function(callback, context) {
  const handle = setTimeout(callback.bind(context), 0);
  return { dispose() {
    clearTimeout(handle);
  } };
});
var CancellationToken;
(function(CancellationToken2) {
  function isCancellationToken(thing) {
    if (thing === CancellationToken2.None || thing === CancellationToken2.Cancelled) {
      return true;
    }
    if (thing instanceof MutableToken) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return typeof thing.isCancellationRequested === "boolean" && typeof thing.onCancellationRequested === "function";
  }
  CancellationToken2.isCancellationToken = isCancellationToken;
  CancellationToken2.None = Object.freeze({
    isCancellationRequested: false,
    onCancellationRequested: Event.None
  });
  CancellationToken2.Cancelled = Object.freeze({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent
  });
})(CancellationToken || (CancellationToken = {}));
var MutableToken = class {
  constructor() {
    this.a = false;
    this.b = null;
  }
  cancel() {
    if (!this.a) {
      this.a = true;
      if (this.b) {
        this.b.fire(void 0);
        this.dispose();
      }
    }
  }
  get isCancellationRequested() {
    return this.a;
  }
  get onCancellationRequested() {
    if (this.a) {
      return shortcutEvent;
    }
    if (!this.b) {
      this.b = new $qf();
    }
    return this.b.event;
  }
  dispose() {
    if (this.b) {
      this.b.dispose();
      this.b = null;
    }
  }
};

// out-build/vs/base/common/cache.js
function $Gf(t) {
  return t;
}
var $Hf = class {
  constructor(arg1, arg2) {
    this.a = void 0;
    this.b = void 0;
    if (typeof arg1 === "function") {
      this.c = arg1;
      this.d = $Gf;
    } else {
      this.c = arg2;
      this.d = arg1.getCacheKey;
    }
  }
  get(arg) {
    const key = this.d(arg);
    if (this.b !== key) {
      this.b = key;
      this.a = this.c(arg);
    }
    return this.a;
  }
};

// out-build/vs/base/common/lazy.js
var LazyValueState;
(function(LazyValueState2) {
  LazyValueState2[LazyValueState2["Uninitialized"] = 0] = "Uninitialized";
  LazyValueState2[LazyValueState2["Running"] = 1] = "Running";
  LazyValueState2[LazyValueState2["Completed"] = 2] = "Completed";
})(LazyValueState || (LazyValueState = {}));
var $Kf = class {
  constructor(d) {
    this.d = d;
    this.a = LazyValueState.Uninitialized;
  }
  /**
   * True if the lazy value has been resolved.
   */
  get hasValue() {
    return this.a === LazyValueState.Completed;
  }
  /**
   * Get the wrapped value.
   *
   * This will force evaluation of the lazy value if it has not been resolved yet. Lazy values are only
   * resolved once. `getValue` will re-throw exceptions that are hit while resolving the value
   */
  get value() {
    if (this.a === LazyValueState.Uninitialized) {
      this.a = LazyValueState.Running;
      try {
        this.b = this.d();
      } catch (err) {
        this.c = err;
      } finally {
        this.a = LazyValueState.Completed;
      }
    } else if (this.a === LazyValueState.Running) {
      throw new Error("Cannot read the value of a lazy that is being initialized");
    }
    if (this.c) {
      throw this.c;
    }
    return this.b;
  }
  /**
   * Get the wrapped value without forcing evaluation.
   */
  get rawValue() {
    return this.b;
  }
};

// out-build/vs/base/common/strings.js
function $4f(str) {
  return str.split(/\r\n|\r|\n/);
}
function $_f(a, b) {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return 0;
  }
}
function $ag(a, b, aStart = 0, aEnd = a.length, bStart = 0, bEnd = b.length) {
  for (; aStart < aEnd && bStart < bEnd; aStart++, bStart++) {
    const codeA = a.charCodeAt(aStart);
    const codeB = b.charCodeAt(bStart);
    if (codeA < codeB) {
      return -1;
    } else if (codeA > codeB) {
      return 1;
    }
  }
  const aLen = aEnd - aStart;
  const bLen = bEnd - bStart;
  if (aLen < bLen) {
    return -1;
  } else if (aLen > bLen) {
    return 1;
  }
  return 0;
}
function $cg(a, b, aStart = 0, aEnd = a.length, bStart = 0, bEnd = b.length) {
  for (; aStart < aEnd && bStart < bEnd; aStart++, bStart++) {
    let codeA = a.charCodeAt(aStart);
    let codeB = b.charCodeAt(bStart);
    if (codeA === codeB) {
      continue;
    }
    if (codeA >= 128 || codeB >= 128) {
      return $ag(a.toLowerCase(), b.toLowerCase(), aStart, aEnd, bStart, bEnd);
    }
    if ($eg(codeA)) {
      codeA -= 32;
    }
    if ($eg(codeB)) {
      codeB -= 32;
    }
    const diff = codeA - codeB;
    if (diff === 0) {
      continue;
    }
    return diff;
  }
  const aLen = aEnd - aStart;
  const bLen = bEnd - bStart;
  if (aLen < bLen) {
    return -1;
  } else if (aLen > bLen) {
    return 1;
  }
  return 0;
}
function $eg(code) {
  return code >= 97 && code <= 122;
}
function $fg(code) {
  return code >= 65 && code <= 90;
}
function $gg(a, b) {
  return a.length === b.length && $cg(a, b) === 0;
}
function $ig(str, candidate) {
  const len = candidate.length;
  return len <= str.length && $cg(str, candidate, 0, len) === 0;
}
var CSI_SEQUENCE = /(?:\x1b\[|\x9b)[=?>!]?[\d;:]*["$#'* ]?[a-zA-Z@^`{}|~]/;
var OSC_SEQUENCE = /(?:\x1b\]|\x9d).*?(?:\x1b\\|\x07|\x9c)/;
var ESC_SEQUENCE = /\x1b(?:[ #%\(\)\*\+\-\.\/]?[a-zA-Z0-9\|}~@])/;
var CONTROL_SEQUENCES = new RegExp("(?:" + [
  CSI_SEQUENCE.source,
  OSC_SEQUENCE.source,
  ESC_SEQUENCE.source
].join("|") + ")", "g");
var $Gg = String.fromCharCode(
  65279
  /* CharCode.UTF8_BOM */
);
var GraphemeBreakType;
(function(GraphemeBreakType2) {
  GraphemeBreakType2[GraphemeBreakType2["Other"] = 0] = "Other";
  GraphemeBreakType2[GraphemeBreakType2["Prepend"] = 1] = "Prepend";
  GraphemeBreakType2[GraphemeBreakType2["CR"] = 2] = "CR";
  GraphemeBreakType2[GraphemeBreakType2["LF"] = 3] = "LF";
  GraphemeBreakType2[GraphemeBreakType2["Control"] = 4] = "Control";
  GraphemeBreakType2[GraphemeBreakType2["Extend"] = 5] = "Extend";
  GraphemeBreakType2[GraphemeBreakType2["Regional_Indicator"] = 6] = "Regional_Indicator";
  GraphemeBreakType2[GraphemeBreakType2["SpacingMark"] = 7] = "SpacingMark";
  GraphemeBreakType2[GraphemeBreakType2["L"] = 8] = "L";
  GraphemeBreakType2[GraphemeBreakType2["V"] = 9] = "V";
  GraphemeBreakType2[GraphemeBreakType2["T"] = 10] = "T";
  GraphemeBreakType2[GraphemeBreakType2["LV"] = 11] = "LV";
  GraphemeBreakType2[GraphemeBreakType2["LVT"] = 12] = "LVT";
  GraphemeBreakType2[GraphemeBreakType2["ZWJ"] = 13] = "ZWJ";
  GraphemeBreakType2[GraphemeBreakType2["Extended_Pictographic"] = 14] = "Extended_Pictographic";
})(GraphemeBreakType || (GraphemeBreakType = {}));
var GraphemeBreakTree = class _GraphemeBreakTree {
  static {
    this.c = null;
  }
  static getInstance() {
    if (!_GraphemeBreakTree.c) {
      _GraphemeBreakTree.c = new _GraphemeBreakTree();
    }
    return _GraphemeBreakTree.c;
  }
  constructor() {
    this.d = getGraphemeBreakRawData();
  }
  getGraphemeBreakType(codePoint) {
    if (codePoint < 32) {
      if (codePoint === 10) {
        return 3;
      }
      if (codePoint === 13) {
        return 2;
      }
      return 4;
    }
    if (codePoint < 127) {
      return 0;
    }
    const data = this.d;
    const nodeCount = data.length / 3;
    let nodeIndex = 1;
    while (nodeIndex <= nodeCount) {
      if (codePoint < data[3 * nodeIndex]) {
        nodeIndex = 2 * nodeIndex;
      } else if (codePoint > data[3 * nodeIndex + 1]) {
        nodeIndex = 2 * nodeIndex + 1;
      } else {
        return data[3 * nodeIndex + 2];
      }
    }
    return 0;
  }
};
function getGraphemeBreakRawData() {
  return JSON.parse("[0,0,0,51229,51255,12,44061,44087,12,127462,127487,6,7083,7085,5,47645,47671,12,54813,54839,12,128678,128678,14,3270,3270,5,9919,9923,14,45853,45879,12,49437,49463,12,53021,53047,12,71216,71218,7,128398,128399,14,129360,129374,14,2519,2519,5,4448,4519,9,9742,9742,14,12336,12336,14,44957,44983,12,46749,46775,12,48541,48567,12,50333,50359,12,52125,52151,12,53917,53943,12,69888,69890,5,73018,73018,5,127990,127990,14,128558,128559,14,128759,128760,14,129653,129655,14,2027,2035,5,2891,2892,7,3761,3761,5,6683,6683,5,8293,8293,4,9825,9826,14,9999,9999,14,43452,43453,5,44509,44535,12,45405,45431,12,46301,46327,12,47197,47223,12,48093,48119,12,48989,49015,12,49885,49911,12,50781,50807,12,51677,51703,12,52573,52599,12,53469,53495,12,54365,54391,12,65279,65279,4,70471,70472,7,72145,72147,7,119173,119179,5,127799,127818,14,128240,128244,14,128512,128512,14,128652,128652,14,128721,128722,14,129292,129292,14,129445,129450,14,129734,129743,14,1476,1477,5,2366,2368,7,2750,2752,7,3076,3076,5,3415,3415,5,4141,4144,5,6109,6109,5,6964,6964,5,7394,7400,5,9197,9198,14,9770,9770,14,9877,9877,14,9968,9969,14,10084,10084,14,43052,43052,5,43713,43713,5,44285,44311,12,44733,44759,12,45181,45207,12,45629,45655,12,46077,46103,12,46525,46551,12,46973,46999,12,47421,47447,12,47869,47895,12,48317,48343,12,48765,48791,12,49213,49239,12,49661,49687,12,50109,50135,12,50557,50583,12,51005,51031,12,51453,51479,12,51901,51927,12,52349,52375,12,52797,52823,12,53245,53271,12,53693,53719,12,54141,54167,12,54589,54615,12,55037,55063,12,69506,69509,5,70191,70193,5,70841,70841,7,71463,71467,5,72330,72342,5,94031,94031,5,123628,123631,5,127763,127765,14,127941,127941,14,128043,128062,14,128302,128317,14,128465,128467,14,128539,128539,14,128640,128640,14,128662,128662,14,128703,128703,14,128745,128745,14,129004,129007,14,129329,129330,14,129402,129402,14,129483,129483,14,129686,129704,14,130048,131069,14,173,173,4,1757,1757,1,2200,2207,5,2434,2435,7,2631,2632,5,2817,2817,5,3008,3008,5,3201,3201,5,3387,3388,5,3542,3542,5,3902,3903,7,4190,4192,5,6002,6003,5,6439,6440,5,6765,6770,7,7019,7027,5,7154,7155,7,8205,8205,13,8505,8505,14,9654,9654,14,9757,9757,14,9792,9792,14,9852,9853,14,9890,9894,14,9937,9937,14,9981,9981,14,10035,10036,14,11035,11036,14,42654,42655,5,43346,43347,7,43587,43587,5,44006,44007,7,44173,44199,12,44397,44423,12,44621,44647,12,44845,44871,12,45069,45095,12,45293,45319,12,45517,45543,12,45741,45767,12,45965,45991,12,46189,46215,12,46413,46439,12,46637,46663,12,46861,46887,12,47085,47111,12,47309,47335,12,47533,47559,12,47757,47783,12,47981,48007,12,48205,48231,12,48429,48455,12,48653,48679,12,48877,48903,12,49101,49127,12,49325,49351,12,49549,49575,12,49773,49799,12,49997,50023,12,50221,50247,12,50445,50471,12,50669,50695,12,50893,50919,12,51117,51143,12,51341,51367,12,51565,51591,12,51789,51815,12,52013,52039,12,52237,52263,12,52461,52487,12,52685,52711,12,52909,52935,12,53133,53159,12,53357,53383,12,53581,53607,12,53805,53831,12,54029,54055,12,54253,54279,12,54477,54503,12,54701,54727,12,54925,54951,12,55149,55175,12,68101,68102,5,69762,69762,7,70067,70069,7,70371,70378,5,70720,70721,7,71087,71087,5,71341,71341,5,71995,71996,5,72249,72249,7,72850,72871,5,73109,73109,5,118576,118598,5,121505,121519,5,127245,127247,14,127568,127569,14,127777,127777,14,127872,127891,14,127956,127967,14,128015,128016,14,128110,128172,14,128259,128259,14,128367,128368,14,128424,128424,14,128488,128488,14,128530,128532,14,128550,128551,14,128566,128566,14,128647,128647,14,128656,128656,14,128667,128673,14,128691,128693,14,128715,128715,14,128728,128732,14,128752,128752,14,128765,128767,14,129096,129103,14,129311,129311,14,129344,129349,14,129394,129394,14,129413,129425,14,129466,129471,14,129511,129535,14,129664,129666,14,129719,129722,14,129760,129767,14,917536,917631,5,13,13,2,1160,1161,5,1564,1564,4,1807,1807,1,2085,2087,5,2307,2307,7,2382,2383,7,2497,2500,5,2563,2563,7,2677,2677,5,2763,2764,7,2879,2879,5,2914,2915,5,3021,3021,5,3142,3144,5,3263,3263,5,3285,3286,5,3398,3400,7,3530,3530,5,3633,3633,5,3864,3865,5,3974,3975,5,4155,4156,7,4229,4230,5,5909,5909,7,6078,6085,7,6277,6278,5,6451,6456,7,6744,6750,5,6846,6846,5,6972,6972,5,7074,7077,5,7146,7148,7,7222,7223,5,7416,7417,5,8234,8238,4,8417,8417,5,9000,9000,14,9203,9203,14,9730,9731,14,9748,9749,14,9762,9763,14,9776,9783,14,9800,9811,14,9831,9831,14,9872,9873,14,9882,9882,14,9900,9903,14,9929,9933,14,9941,9960,14,9974,9974,14,9989,9989,14,10006,10006,14,10062,10062,14,10160,10160,14,11647,11647,5,12953,12953,14,43019,43019,5,43232,43249,5,43443,43443,5,43567,43568,7,43696,43696,5,43765,43765,7,44013,44013,5,44117,44143,12,44229,44255,12,44341,44367,12,44453,44479,12,44565,44591,12,44677,44703,12,44789,44815,12,44901,44927,12,45013,45039,12,45125,45151,12,45237,45263,12,45349,45375,12,45461,45487,12,45573,45599,12,45685,45711,12,45797,45823,12,45909,45935,12,46021,46047,12,46133,46159,12,46245,46271,12,46357,46383,12,46469,46495,12,46581,46607,12,46693,46719,12,46805,46831,12,46917,46943,12,47029,47055,12,47141,47167,12,47253,47279,12,47365,47391,12,47477,47503,12,47589,47615,12,47701,47727,12,47813,47839,12,47925,47951,12,48037,48063,12,48149,48175,12,48261,48287,12,48373,48399,12,48485,48511,12,48597,48623,12,48709,48735,12,48821,48847,12,48933,48959,12,49045,49071,12,49157,49183,12,49269,49295,12,49381,49407,12,49493,49519,12,49605,49631,12,49717,49743,12,49829,49855,12,49941,49967,12,50053,50079,12,50165,50191,12,50277,50303,12,50389,50415,12,50501,50527,12,50613,50639,12,50725,50751,12,50837,50863,12,50949,50975,12,51061,51087,12,51173,51199,12,51285,51311,12,51397,51423,12,51509,51535,12,51621,51647,12,51733,51759,12,51845,51871,12,51957,51983,12,52069,52095,12,52181,52207,12,52293,52319,12,52405,52431,12,52517,52543,12,52629,52655,12,52741,52767,12,52853,52879,12,52965,52991,12,53077,53103,12,53189,53215,12,53301,53327,12,53413,53439,12,53525,53551,12,53637,53663,12,53749,53775,12,53861,53887,12,53973,53999,12,54085,54111,12,54197,54223,12,54309,54335,12,54421,54447,12,54533,54559,12,54645,54671,12,54757,54783,12,54869,54895,12,54981,55007,12,55093,55119,12,55243,55291,10,66045,66045,5,68325,68326,5,69688,69702,5,69817,69818,5,69957,69958,7,70089,70092,5,70198,70199,5,70462,70462,5,70502,70508,5,70750,70750,5,70846,70846,7,71100,71101,5,71230,71230,7,71351,71351,5,71737,71738,5,72000,72000,7,72160,72160,5,72273,72278,5,72752,72758,5,72882,72883,5,73031,73031,5,73461,73462,7,94192,94193,7,119149,119149,7,121403,121452,5,122915,122916,5,126980,126980,14,127358,127359,14,127535,127535,14,127759,127759,14,127771,127771,14,127792,127793,14,127825,127867,14,127897,127899,14,127945,127945,14,127985,127986,14,128000,128007,14,128021,128021,14,128066,128100,14,128184,128235,14,128249,128252,14,128266,128276,14,128335,128335,14,128379,128390,14,128407,128419,14,128444,128444,14,128481,128481,14,128499,128499,14,128526,128526,14,128536,128536,14,128543,128543,14,128556,128556,14,128564,128564,14,128577,128580,14,128643,128645,14,128649,128649,14,128654,128654,14,128660,128660,14,128664,128664,14,128675,128675,14,128686,128689,14,128695,128696,14,128705,128709,14,128717,128719,14,128725,128725,14,128736,128741,14,128747,128748,14,128755,128755,14,128762,128762,14,128981,128991,14,129009,129023,14,129160,129167,14,129296,129304,14,129320,129327,14,129340,129342,14,129356,129356,14,129388,129392,14,129399,129400,14,129404,129407,14,129432,129442,14,129454,129455,14,129473,129474,14,129485,129487,14,129648,129651,14,129659,129660,14,129671,129679,14,129709,129711,14,129728,129730,14,129751,129753,14,129776,129782,14,917505,917505,4,917760,917999,5,10,10,3,127,159,4,768,879,5,1471,1471,5,1536,1541,1,1648,1648,5,1767,1768,5,1840,1866,5,2070,2073,5,2137,2139,5,2274,2274,1,2363,2363,7,2377,2380,7,2402,2403,5,2494,2494,5,2507,2508,7,2558,2558,5,2622,2624,7,2641,2641,5,2691,2691,7,2759,2760,5,2786,2787,5,2876,2876,5,2881,2884,5,2901,2902,5,3006,3006,5,3014,3016,7,3072,3072,5,3134,3136,5,3157,3158,5,3260,3260,5,3266,3266,5,3274,3275,7,3328,3329,5,3391,3392,7,3405,3405,5,3457,3457,5,3536,3537,7,3551,3551,5,3636,3642,5,3764,3772,5,3895,3895,5,3967,3967,7,3993,4028,5,4146,4151,5,4182,4183,7,4226,4226,5,4253,4253,5,4957,4959,5,5940,5940,7,6070,6070,7,6087,6088,7,6158,6158,4,6432,6434,5,6448,6449,7,6679,6680,5,6742,6742,5,6754,6754,5,6783,6783,5,6912,6915,5,6966,6970,5,6978,6978,5,7042,7042,7,7080,7081,5,7143,7143,7,7150,7150,7,7212,7219,5,7380,7392,5,7412,7412,5,8203,8203,4,8232,8232,4,8265,8265,14,8400,8412,5,8421,8432,5,8617,8618,14,9167,9167,14,9200,9200,14,9410,9410,14,9723,9726,14,9733,9733,14,9745,9745,14,9752,9752,14,9760,9760,14,9766,9766,14,9774,9774,14,9786,9786,14,9794,9794,14,9823,9823,14,9828,9828,14,9833,9850,14,9855,9855,14,9875,9875,14,9880,9880,14,9885,9887,14,9896,9897,14,9906,9916,14,9926,9927,14,9935,9935,14,9939,9939,14,9962,9962,14,9972,9972,14,9978,9978,14,9986,9986,14,9997,9997,14,10002,10002,14,10017,10017,14,10055,10055,14,10071,10071,14,10133,10135,14,10548,10549,14,11093,11093,14,12330,12333,5,12441,12442,5,42608,42610,5,43010,43010,5,43045,43046,5,43188,43203,7,43302,43309,5,43392,43394,5,43446,43449,5,43493,43493,5,43571,43572,7,43597,43597,7,43703,43704,5,43756,43757,5,44003,44004,7,44009,44010,7,44033,44059,12,44089,44115,12,44145,44171,12,44201,44227,12,44257,44283,12,44313,44339,12,44369,44395,12,44425,44451,12,44481,44507,12,44537,44563,12,44593,44619,12,44649,44675,12,44705,44731,12,44761,44787,12,44817,44843,12,44873,44899,12,44929,44955,12,44985,45011,12,45041,45067,12,45097,45123,12,45153,45179,12,45209,45235,12,45265,45291,12,45321,45347,12,45377,45403,12,45433,45459,12,45489,45515,12,45545,45571,12,45601,45627,12,45657,45683,12,45713,45739,12,45769,45795,12,45825,45851,12,45881,45907,12,45937,45963,12,45993,46019,12,46049,46075,12,46105,46131,12,46161,46187,12,46217,46243,12,46273,46299,12,46329,46355,12,46385,46411,12,46441,46467,12,46497,46523,12,46553,46579,12,46609,46635,12,46665,46691,12,46721,46747,12,46777,46803,12,46833,46859,12,46889,46915,12,46945,46971,12,47001,47027,12,47057,47083,12,47113,47139,12,47169,47195,12,47225,47251,12,47281,47307,12,47337,47363,12,47393,47419,12,47449,47475,12,47505,47531,12,47561,47587,12,47617,47643,12,47673,47699,12,47729,47755,12,47785,47811,12,47841,47867,12,47897,47923,12,47953,47979,12,48009,48035,12,48065,48091,12,48121,48147,12,48177,48203,12,48233,48259,12,48289,48315,12,48345,48371,12,48401,48427,12,48457,48483,12,48513,48539,12,48569,48595,12,48625,48651,12,48681,48707,12,48737,48763,12,48793,48819,12,48849,48875,12,48905,48931,12,48961,48987,12,49017,49043,12,49073,49099,12,49129,49155,12,49185,49211,12,49241,49267,12,49297,49323,12,49353,49379,12,49409,49435,12,49465,49491,12,49521,49547,12,49577,49603,12,49633,49659,12,49689,49715,12,49745,49771,12,49801,49827,12,49857,49883,12,49913,49939,12,49969,49995,12,50025,50051,12,50081,50107,12,50137,50163,12,50193,50219,12,50249,50275,12,50305,50331,12,50361,50387,12,50417,50443,12,50473,50499,12,50529,50555,12,50585,50611,12,50641,50667,12,50697,50723,12,50753,50779,12,50809,50835,12,50865,50891,12,50921,50947,12,50977,51003,12,51033,51059,12,51089,51115,12,51145,51171,12,51201,51227,12,51257,51283,12,51313,51339,12,51369,51395,12,51425,51451,12,51481,51507,12,51537,51563,12,51593,51619,12,51649,51675,12,51705,51731,12,51761,51787,12,51817,51843,12,51873,51899,12,51929,51955,12,51985,52011,12,52041,52067,12,52097,52123,12,52153,52179,12,52209,52235,12,52265,52291,12,52321,52347,12,52377,52403,12,52433,52459,12,52489,52515,12,52545,52571,12,52601,52627,12,52657,52683,12,52713,52739,12,52769,52795,12,52825,52851,12,52881,52907,12,52937,52963,12,52993,53019,12,53049,53075,12,53105,53131,12,53161,53187,12,53217,53243,12,53273,53299,12,53329,53355,12,53385,53411,12,53441,53467,12,53497,53523,12,53553,53579,12,53609,53635,12,53665,53691,12,53721,53747,12,53777,53803,12,53833,53859,12,53889,53915,12,53945,53971,12,54001,54027,12,54057,54083,12,54113,54139,12,54169,54195,12,54225,54251,12,54281,54307,12,54337,54363,12,54393,54419,12,54449,54475,12,54505,54531,12,54561,54587,12,54617,54643,12,54673,54699,12,54729,54755,12,54785,54811,12,54841,54867,12,54897,54923,12,54953,54979,12,55009,55035,12,55065,55091,12,55121,55147,12,55177,55203,12,65024,65039,5,65520,65528,4,66422,66426,5,68152,68154,5,69291,69292,5,69633,69633,5,69747,69748,5,69811,69814,5,69826,69826,5,69932,69932,7,70016,70017,5,70079,70080,7,70095,70095,5,70196,70196,5,70367,70367,5,70402,70403,7,70464,70464,5,70487,70487,5,70709,70711,7,70725,70725,7,70833,70834,7,70843,70844,7,70849,70849,7,71090,71093,5,71103,71104,5,71227,71228,7,71339,71339,5,71344,71349,5,71458,71461,5,71727,71735,5,71985,71989,7,71998,71998,5,72002,72002,7,72154,72155,5,72193,72202,5,72251,72254,5,72281,72283,5,72344,72345,5,72766,72766,7,72874,72880,5,72885,72886,5,73023,73029,5,73104,73105,5,73111,73111,5,92912,92916,5,94095,94098,5,113824,113827,4,119142,119142,7,119155,119162,4,119362,119364,5,121476,121476,5,122888,122904,5,123184,123190,5,125252,125258,5,127183,127183,14,127340,127343,14,127377,127386,14,127491,127503,14,127548,127551,14,127744,127756,14,127761,127761,14,127769,127769,14,127773,127774,14,127780,127788,14,127796,127797,14,127820,127823,14,127869,127869,14,127894,127895,14,127902,127903,14,127943,127943,14,127947,127950,14,127972,127972,14,127988,127988,14,127992,127994,14,128009,128011,14,128019,128019,14,128023,128041,14,128064,128064,14,128102,128107,14,128174,128181,14,128238,128238,14,128246,128247,14,128254,128254,14,128264,128264,14,128278,128299,14,128329,128330,14,128348,128359,14,128371,128377,14,128392,128393,14,128401,128404,14,128421,128421,14,128433,128434,14,128450,128452,14,128476,128478,14,128483,128483,14,128495,128495,14,128506,128506,14,128519,128520,14,128528,128528,14,128534,128534,14,128538,128538,14,128540,128542,14,128544,128549,14,128552,128555,14,128557,128557,14,128560,128563,14,128565,128565,14,128567,128576,14,128581,128591,14,128641,128642,14,128646,128646,14,128648,128648,14,128650,128651,14,128653,128653,14,128655,128655,14,128657,128659,14,128661,128661,14,128663,128663,14,128665,128666,14,128674,128674,14,128676,128677,14,128679,128685,14,128690,128690,14,128694,128694,14,128697,128702,14,128704,128704,14,128710,128714,14,128716,128716,14,128720,128720,14,128723,128724,14,128726,128727,14,128733,128735,14,128742,128744,14,128746,128746,14,128749,128751,14,128753,128754,14,128756,128758,14,128761,128761,14,128763,128764,14,128884,128895,14,128992,129003,14,129008,129008,14,129036,129039,14,129114,129119,14,129198,129279,14,129293,129295,14,129305,129310,14,129312,129319,14,129328,129328,14,129331,129338,14,129343,129343,14,129351,129355,14,129357,129359,14,129375,129387,14,129393,129393,14,129395,129398,14,129401,129401,14,129403,129403,14,129408,129412,14,129426,129431,14,129443,129444,14,129451,129453,14,129456,129465,14,129472,129472,14,129475,129482,14,129484,129484,14,129488,129510,14,129536,129647,14,129652,129652,14,129656,129658,14,129661,129663,14,129667,129670,14,129680,129685,14,129705,129708,14,129712,129718,14,129723,129727,14,129731,129733,14,129744,129750,14,129754,129759,14,129768,129775,14,129783,129791,14,917504,917504,4,917506,917535,4,917632,917759,4,918000,921599,4,0,9,4,11,12,4,14,31,4,169,169,14,174,174,14,1155,1159,5,1425,1469,5,1473,1474,5,1479,1479,5,1552,1562,5,1611,1631,5,1750,1756,5,1759,1764,5,1770,1773,5,1809,1809,5,1958,1968,5,2045,2045,5,2075,2083,5,2089,2093,5,2192,2193,1,2250,2273,5,2275,2306,5,2362,2362,5,2364,2364,5,2369,2376,5,2381,2381,5,2385,2391,5,2433,2433,5,2492,2492,5,2495,2496,7,2503,2504,7,2509,2509,5,2530,2531,5,2561,2562,5,2620,2620,5,2625,2626,5,2635,2637,5,2672,2673,5,2689,2690,5,2748,2748,5,2753,2757,5,2761,2761,7,2765,2765,5,2810,2815,5,2818,2819,7,2878,2878,5,2880,2880,7,2887,2888,7,2893,2893,5,2903,2903,5,2946,2946,5,3007,3007,7,3009,3010,7,3018,3020,7,3031,3031,5,3073,3075,7,3132,3132,5,3137,3140,7,3146,3149,5,3170,3171,5,3202,3203,7,3262,3262,7,3264,3265,7,3267,3268,7,3271,3272,7,3276,3277,5,3298,3299,5,3330,3331,7,3390,3390,5,3393,3396,5,3402,3404,7,3406,3406,1,3426,3427,5,3458,3459,7,3535,3535,5,3538,3540,5,3544,3550,7,3570,3571,7,3635,3635,7,3655,3662,5,3763,3763,7,3784,3789,5,3893,3893,5,3897,3897,5,3953,3966,5,3968,3972,5,3981,3991,5,4038,4038,5,4145,4145,7,4153,4154,5,4157,4158,5,4184,4185,5,4209,4212,5,4228,4228,7,4237,4237,5,4352,4447,8,4520,4607,10,5906,5908,5,5938,5939,5,5970,5971,5,6068,6069,5,6071,6077,5,6086,6086,5,6089,6099,5,6155,6157,5,6159,6159,5,6313,6313,5,6435,6438,7,6441,6443,7,6450,6450,5,6457,6459,5,6681,6682,7,6741,6741,7,6743,6743,7,6752,6752,5,6757,6764,5,6771,6780,5,6832,6845,5,6847,6862,5,6916,6916,7,6965,6965,5,6971,6971,7,6973,6977,7,6979,6980,7,7040,7041,5,7073,7073,7,7078,7079,7,7082,7082,7,7142,7142,5,7144,7145,5,7149,7149,5,7151,7153,5,7204,7211,7,7220,7221,7,7376,7378,5,7393,7393,7,7405,7405,5,7415,7415,7,7616,7679,5,8204,8204,5,8206,8207,4,8233,8233,4,8252,8252,14,8288,8292,4,8294,8303,4,8413,8416,5,8418,8420,5,8482,8482,14,8596,8601,14,8986,8987,14,9096,9096,14,9193,9196,14,9199,9199,14,9201,9202,14,9208,9210,14,9642,9643,14,9664,9664,14,9728,9729,14,9732,9732,14,9735,9741,14,9743,9744,14,9746,9746,14,9750,9751,14,9753,9756,14,9758,9759,14,9761,9761,14,9764,9765,14,9767,9769,14,9771,9773,14,9775,9775,14,9784,9785,14,9787,9791,14,9793,9793,14,9795,9799,14,9812,9822,14,9824,9824,14,9827,9827,14,9829,9830,14,9832,9832,14,9851,9851,14,9854,9854,14,9856,9861,14,9874,9874,14,9876,9876,14,9878,9879,14,9881,9881,14,9883,9884,14,9888,9889,14,9895,9895,14,9898,9899,14,9904,9905,14,9917,9918,14,9924,9925,14,9928,9928,14,9934,9934,14,9936,9936,14,9938,9938,14,9940,9940,14,9961,9961,14,9963,9967,14,9970,9971,14,9973,9973,14,9975,9977,14,9979,9980,14,9982,9985,14,9987,9988,14,9992,9996,14,9998,9998,14,10000,10001,14,10004,10004,14,10013,10013,14,10024,10024,14,10052,10052,14,10060,10060,14,10067,10069,14,10083,10083,14,10085,10087,14,10145,10145,14,10175,10175,14,11013,11015,14,11088,11088,14,11503,11505,5,11744,11775,5,12334,12335,5,12349,12349,14,12951,12951,14,42607,42607,5,42612,42621,5,42736,42737,5,43014,43014,5,43043,43044,7,43047,43047,7,43136,43137,7,43204,43205,5,43263,43263,5,43335,43345,5,43360,43388,8,43395,43395,7,43444,43445,7,43450,43451,7,43454,43456,7,43561,43566,5,43569,43570,5,43573,43574,5,43596,43596,5,43644,43644,5,43698,43700,5,43710,43711,5,43755,43755,7,43758,43759,7,43766,43766,5,44005,44005,5,44008,44008,5,44012,44012,7,44032,44032,11,44060,44060,11,44088,44088,11,44116,44116,11,44144,44144,11,44172,44172,11,44200,44200,11,44228,44228,11,44256,44256,11,44284,44284,11,44312,44312,11,44340,44340,11,44368,44368,11,44396,44396,11,44424,44424,11,44452,44452,11,44480,44480,11,44508,44508,11,44536,44536,11,44564,44564,11,44592,44592,11,44620,44620,11,44648,44648,11,44676,44676,11,44704,44704,11,44732,44732,11,44760,44760,11,44788,44788,11,44816,44816,11,44844,44844,11,44872,44872,11,44900,44900,11,44928,44928,11,44956,44956,11,44984,44984,11,45012,45012,11,45040,45040,11,45068,45068,11,45096,45096,11,45124,45124,11,45152,45152,11,45180,45180,11,45208,45208,11,45236,45236,11,45264,45264,11,45292,45292,11,45320,45320,11,45348,45348,11,45376,45376,11,45404,45404,11,45432,45432,11,45460,45460,11,45488,45488,11,45516,45516,11,45544,45544,11,45572,45572,11,45600,45600,11,45628,45628,11,45656,45656,11,45684,45684,11,45712,45712,11,45740,45740,11,45768,45768,11,45796,45796,11,45824,45824,11,45852,45852,11,45880,45880,11,45908,45908,11,45936,45936,11,45964,45964,11,45992,45992,11,46020,46020,11,46048,46048,11,46076,46076,11,46104,46104,11,46132,46132,11,46160,46160,11,46188,46188,11,46216,46216,11,46244,46244,11,46272,46272,11,46300,46300,11,46328,46328,11,46356,46356,11,46384,46384,11,46412,46412,11,46440,46440,11,46468,46468,11,46496,46496,11,46524,46524,11,46552,46552,11,46580,46580,11,46608,46608,11,46636,46636,11,46664,46664,11,46692,46692,11,46720,46720,11,46748,46748,11,46776,46776,11,46804,46804,11,46832,46832,11,46860,46860,11,46888,46888,11,46916,46916,11,46944,46944,11,46972,46972,11,47000,47000,11,47028,47028,11,47056,47056,11,47084,47084,11,47112,47112,11,47140,47140,11,47168,47168,11,47196,47196,11,47224,47224,11,47252,47252,11,47280,47280,11,47308,47308,11,47336,47336,11,47364,47364,11,47392,47392,11,47420,47420,11,47448,47448,11,47476,47476,11,47504,47504,11,47532,47532,11,47560,47560,11,47588,47588,11,47616,47616,11,47644,47644,11,47672,47672,11,47700,47700,11,47728,47728,11,47756,47756,11,47784,47784,11,47812,47812,11,47840,47840,11,47868,47868,11,47896,47896,11,47924,47924,11,47952,47952,11,47980,47980,11,48008,48008,11,48036,48036,11,48064,48064,11,48092,48092,11,48120,48120,11,48148,48148,11,48176,48176,11,48204,48204,11,48232,48232,11,48260,48260,11,48288,48288,11,48316,48316,11,48344,48344,11,48372,48372,11,48400,48400,11,48428,48428,11,48456,48456,11,48484,48484,11,48512,48512,11,48540,48540,11,48568,48568,11,48596,48596,11,48624,48624,11,48652,48652,11,48680,48680,11,48708,48708,11,48736,48736,11,48764,48764,11,48792,48792,11,48820,48820,11,48848,48848,11,48876,48876,11,48904,48904,11,48932,48932,11,48960,48960,11,48988,48988,11,49016,49016,11,49044,49044,11,49072,49072,11,49100,49100,11,49128,49128,11,49156,49156,11,49184,49184,11,49212,49212,11,49240,49240,11,49268,49268,11,49296,49296,11,49324,49324,11,49352,49352,11,49380,49380,11,49408,49408,11,49436,49436,11,49464,49464,11,49492,49492,11,49520,49520,11,49548,49548,11,49576,49576,11,49604,49604,11,49632,49632,11,49660,49660,11,49688,49688,11,49716,49716,11,49744,49744,11,49772,49772,11,49800,49800,11,49828,49828,11,49856,49856,11,49884,49884,11,49912,49912,11,49940,49940,11,49968,49968,11,49996,49996,11,50024,50024,11,50052,50052,11,50080,50080,11,50108,50108,11,50136,50136,11,50164,50164,11,50192,50192,11,50220,50220,11,50248,50248,11,50276,50276,11,50304,50304,11,50332,50332,11,50360,50360,11,50388,50388,11,50416,50416,11,50444,50444,11,50472,50472,11,50500,50500,11,50528,50528,11,50556,50556,11,50584,50584,11,50612,50612,11,50640,50640,11,50668,50668,11,50696,50696,11,50724,50724,11,50752,50752,11,50780,50780,11,50808,50808,11,50836,50836,11,50864,50864,11,50892,50892,11,50920,50920,11,50948,50948,11,50976,50976,11,51004,51004,11,51032,51032,11,51060,51060,11,51088,51088,11,51116,51116,11,51144,51144,11,51172,51172,11,51200,51200,11,51228,51228,11,51256,51256,11,51284,51284,11,51312,51312,11,51340,51340,11,51368,51368,11,51396,51396,11,51424,51424,11,51452,51452,11,51480,51480,11,51508,51508,11,51536,51536,11,51564,51564,11,51592,51592,11,51620,51620,11,51648,51648,11,51676,51676,11,51704,51704,11,51732,51732,11,51760,51760,11,51788,51788,11,51816,51816,11,51844,51844,11,51872,51872,11,51900,51900,11,51928,51928,11,51956,51956,11,51984,51984,11,52012,52012,11,52040,52040,11,52068,52068,11,52096,52096,11,52124,52124,11,52152,52152,11,52180,52180,11,52208,52208,11,52236,52236,11,52264,52264,11,52292,52292,11,52320,52320,11,52348,52348,11,52376,52376,11,52404,52404,11,52432,52432,11,52460,52460,11,52488,52488,11,52516,52516,11,52544,52544,11,52572,52572,11,52600,52600,11,52628,52628,11,52656,52656,11,52684,52684,11,52712,52712,11,52740,52740,11,52768,52768,11,52796,52796,11,52824,52824,11,52852,52852,11,52880,52880,11,52908,52908,11,52936,52936,11,52964,52964,11,52992,52992,11,53020,53020,11,53048,53048,11,53076,53076,11,53104,53104,11,53132,53132,11,53160,53160,11,53188,53188,11,53216,53216,11,53244,53244,11,53272,53272,11,53300,53300,11,53328,53328,11,53356,53356,11,53384,53384,11,53412,53412,11,53440,53440,11,53468,53468,11,53496,53496,11,53524,53524,11,53552,53552,11,53580,53580,11,53608,53608,11,53636,53636,11,53664,53664,11,53692,53692,11,53720,53720,11,53748,53748,11,53776,53776,11,53804,53804,11,53832,53832,11,53860,53860,11,53888,53888,11,53916,53916,11,53944,53944,11,53972,53972,11,54000,54000,11,54028,54028,11,54056,54056,11,54084,54084,11,54112,54112,11,54140,54140,11,54168,54168,11,54196,54196,11,54224,54224,11,54252,54252,11,54280,54280,11,54308,54308,11,54336,54336,11,54364,54364,11,54392,54392,11,54420,54420,11,54448,54448,11,54476,54476,11,54504,54504,11,54532,54532,11,54560,54560,11,54588,54588,11,54616,54616,11,54644,54644,11,54672,54672,11,54700,54700,11,54728,54728,11,54756,54756,11,54784,54784,11,54812,54812,11,54840,54840,11,54868,54868,11,54896,54896,11,54924,54924,11,54952,54952,11,54980,54980,11,55008,55008,11,55036,55036,11,55064,55064,11,55092,55092,11,55120,55120,11,55148,55148,11,55176,55176,11,55216,55238,9,64286,64286,5,65056,65071,5,65438,65439,5,65529,65531,4,66272,66272,5,68097,68099,5,68108,68111,5,68159,68159,5,68900,68903,5,69446,69456,5,69632,69632,7,69634,69634,7,69744,69744,5,69759,69761,5,69808,69810,7,69815,69816,7,69821,69821,1,69837,69837,1,69927,69931,5,69933,69940,5,70003,70003,5,70018,70018,7,70070,70078,5,70082,70083,1,70094,70094,7,70188,70190,7,70194,70195,7,70197,70197,7,70206,70206,5,70368,70370,7,70400,70401,5,70459,70460,5,70463,70463,7,70465,70468,7,70475,70477,7,70498,70499,7,70512,70516,5,70712,70719,5,70722,70724,5,70726,70726,5,70832,70832,5,70835,70840,5,70842,70842,5,70845,70845,5,70847,70848,5,70850,70851,5,71088,71089,7,71096,71099,7,71102,71102,7,71132,71133,5,71219,71226,5,71229,71229,5,71231,71232,5,71340,71340,7,71342,71343,7,71350,71350,7,71453,71455,5,71462,71462,7,71724,71726,7,71736,71736,7,71984,71984,5,71991,71992,7,71997,71997,7,71999,71999,1,72001,72001,1,72003,72003,5,72148,72151,5,72156,72159,7,72164,72164,7,72243,72248,5,72250,72250,1,72263,72263,5,72279,72280,7,72324,72329,1,72343,72343,7,72751,72751,7,72760,72765,5,72767,72767,5,72873,72873,7,72881,72881,7,72884,72884,7,73009,73014,5,73020,73021,5,73030,73030,1,73098,73102,7,73107,73108,7,73110,73110,7,73459,73460,5,78896,78904,4,92976,92982,5,94033,94087,7,94180,94180,5,113821,113822,5,118528,118573,5,119141,119141,5,119143,119145,5,119150,119154,5,119163,119170,5,119210,119213,5,121344,121398,5,121461,121461,5,121499,121503,5,122880,122886,5,122907,122913,5,122918,122922,5,123566,123566,5,125136,125142,5,126976,126979,14,126981,127182,14,127184,127231,14,127279,127279,14,127344,127345,14,127374,127374,14,127405,127461,14,127489,127490,14,127514,127514,14,127538,127546,14,127561,127567,14,127570,127743,14,127757,127758,14,127760,127760,14,127762,127762,14,127766,127768,14,127770,127770,14,127772,127772,14,127775,127776,14,127778,127779,14,127789,127791,14,127794,127795,14,127798,127798,14,127819,127819,14,127824,127824,14,127868,127868,14,127870,127871,14,127892,127893,14,127896,127896,14,127900,127901,14,127904,127940,14,127942,127942,14,127944,127944,14,127946,127946,14,127951,127955,14,127968,127971,14,127973,127984,14,127987,127987,14,127989,127989,14,127991,127991,14,127995,127999,5,128008,128008,14,128012,128014,14,128017,128018,14,128020,128020,14,128022,128022,14,128042,128042,14,128063,128063,14,128065,128065,14,128101,128101,14,128108,128109,14,128173,128173,14,128182,128183,14,128236,128237,14,128239,128239,14,128245,128245,14,128248,128248,14,128253,128253,14,128255,128258,14,128260,128263,14,128265,128265,14,128277,128277,14,128300,128301,14,128326,128328,14,128331,128334,14,128336,128347,14,128360,128366,14,128369,128370,14,128378,128378,14,128391,128391,14,128394,128397,14,128400,128400,14,128405,128406,14,128420,128420,14,128422,128423,14,128425,128432,14,128435,128443,14,128445,128449,14,128453,128464,14,128468,128475,14,128479,128480,14,128482,128482,14,128484,128487,14,128489,128494,14,128496,128498,14,128500,128505,14,128507,128511,14,128513,128518,14,128521,128525,14,128527,128527,14,128529,128529,14,128533,128533,14,128535,128535,14,128537,128537,14]");
}
var CodePoint;
(function(CodePoint2) {
  CodePoint2[CodePoint2["zwj"] = 8205] = "zwj";
  CodePoint2[CodePoint2["emojiVariantSelector"] = 65039] = "emojiVariantSelector";
  CodePoint2[CodePoint2["enclosingKeyCap"] = 8419] = "enclosingKeyCap";
  CodePoint2[CodePoint2["space"] = 32] = "space";
})(CodePoint || (CodePoint = {}));
var $Rg = class _$Rg {
  static {
    this.c = new $Kf(() => {
      return JSON.parse('{"_common":[8232,32,8233,32,5760,32,8192,32,8193,32,8194,32,8195,32,8196,32,8197,32,8198,32,8200,32,8201,32,8202,32,8287,32,8199,32,8239,32,2042,95,65101,95,65102,95,65103,95,8208,45,8209,45,8210,45,65112,45,1748,45,8259,45,727,45,8722,45,10134,45,11450,45,1549,44,1643,44,184,44,42233,44,894,59,2307,58,2691,58,1417,58,1795,58,1796,58,5868,58,65072,58,6147,58,6153,58,8282,58,1475,58,760,58,42889,58,8758,58,720,58,42237,58,451,33,11601,33,660,63,577,63,2429,63,5038,63,42731,63,119149,46,8228,46,1793,46,1794,46,42510,46,68176,46,1632,46,1776,46,42232,46,1373,96,65287,96,8219,96,1523,96,8242,96,1370,96,8175,96,65344,96,900,96,8189,96,8125,96,8127,96,8190,96,697,96,884,96,712,96,714,96,715,96,756,96,699,96,701,96,700,96,702,96,42892,96,1497,96,2036,96,2037,96,5194,96,5836,96,94033,96,94034,96,65339,91,10088,40,10098,40,12308,40,64830,40,65341,93,10089,41,10099,41,12309,41,64831,41,10100,123,119060,123,10101,125,65342,94,8270,42,1645,42,8727,42,66335,42,5941,47,8257,47,8725,47,8260,47,9585,47,10187,47,10744,47,119354,47,12755,47,12339,47,11462,47,20031,47,12035,47,65340,92,65128,92,8726,92,10189,92,10741,92,10745,92,119311,92,119355,92,12756,92,20022,92,12034,92,42872,38,708,94,710,94,5869,43,10133,43,66203,43,8249,60,10094,60,706,60,119350,60,5176,60,5810,60,5120,61,11840,61,12448,61,42239,61,8250,62,10095,62,707,62,119351,62,5171,62,94015,62,8275,126,732,126,8128,126,8764,126,65372,124,65293,45,118002,50,120784,50,120794,50,120804,50,120814,50,120824,50,130034,50,42842,50,423,50,1000,50,42564,50,5311,50,42735,50,119302,51,118003,51,120785,51,120795,51,120805,51,120815,51,120825,51,130035,51,42923,51,540,51,439,51,42858,51,11468,51,1248,51,94011,51,71882,51,118004,52,120786,52,120796,52,120806,52,120816,52,120826,52,130036,52,5070,52,71855,52,118005,53,120787,53,120797,53,120807,53,120817,53,120827,53,130037,53,444,53,71867,53,118006,54,120788,54,120798,54,120808,54,120818,54,120828,54,130038,54,11474,54,5102,54,71893,54,119314,55,118007,55,120789,55,120799,55,120809,55,120819,55,120829,55,130039,55,66770,55,71878,55,2819,56,2538,56,2666,56,125131,56,118008,56,120790,56,120800,56,120810,56,120820,56,120830,56,130040,56,547,56,546,56,66330,56,2663,57,2920,57,2541,57,3437,57,118009,57,120791,57,120801,57,120811,57,120821,57,120831,57,130041,57,42862,57,11466,57,71884,57,71852,57,71894,57,9082,97,65345,97,119834,97,119886,97,119938,97,119990,97,120042,97,120094,97,120146,97,120198,97,120250,97,120302,97,120354,97,120406,97,120458,97,593,97,945,97,120514,97,120572,97,120630,97,120688,97,120746,97,65313,65,117974,65,119808,65,119860,65,119912,65,119964,65,120016,65,120068,65,120120,65,120172,65,120224,65,120276,65,120328,65,120380,65,120432,65,913,65,120488,65,120546,65,120604,65,120662,65,120720,65,5034,65,5573,65,42222,65,94016,65,66208,65,119835,98,119887,98,119939,98,119991,98,120043,98,120095,98,120147,98,120199,98,120251,98,120303,98,120355,98,120407,98,120459,98,388,98,5071,98,5234,98,5551,98,65314,66,8492,66,117975,66,119809,66,119861,66,119913,66,120017,66,120069,66,120121,66,120173,66,120225,66,120277,66,120329,66,120381,66,120433,66,42932,66,914,66,120489,66,120547,66,120605,66,120663,66,120721,66,5108,66,5623,66,42192,66,66178,66,66209,66,66305,66,65347,99,8573,99,119836,99,119888,99,119940,99,119992,99,120044,99,120096,99,120148,99,120200,99,120252,99,120304,99,120356,99,120408,99,120460,99,7428,99,1010,99,11429,99,43951,99,66621,99,128844,67,71913,67,71922,67,65315,67,8557,67,8450,67,8493,67,117976,67,119810,67,119862,67,119914,67,119966,67,120018,67,120174,67,120226,67,120278,67,120330,67,120382,67,120434,67,1017,67,11428,67,5087,67,42202,67,66210,67,66306,67,66581,67,66844,67,8574,100,8518,100,119837,100,119889,100,119941,100,119993,100,120045,100,120097,100,120149,100,120201,100,120253,100,120305,100,120357,100,120409,100,120461,100,1281,100,5095,100,5231,100,42194,100,8558,68,8517,68,117977,68,119811,68,119863,68,119915,68,119967,68,120019,68,120071,68,120123,68,120175,68,120227,68,120279,68,120331,68,120383,68,120435,68,5024,68,5598,68,5610,68,42195,68,8494,101,65349,101,8495,101,8519,101,119838,101,119890,101,119942,101,120046,101,120098,101,120150,101,120202,101,120254,101,120306,101,120358,101,120410,101,120462,101,43826,101,1213,101,8959,69,65317,69,8496,69,117978,69,119812,69,119864,69,119916,69,120020,69,120072,69,120124,69,120176,69,120228,69,120280,69,120332,69,120384,69,120436,69,917,69,120492,69,120550,69,120608,69,120666,69,120724,69,11577,69,5036,69,42224,69,71846,69,71854,69,66182,69,119839,102,119891,102,119943,102,119995,102,120047,102,120099,102,120151,102,120203,102,120255,102,120307,102,120359,102,120411,102,120463,102,43829,102,42905,102,383,102,7837,102,1412,102,119315,70,8497,70,117979,70,119813,70,119865,70,119917,70,120021,70,120073,70,120125,70,120177,70,120229,70,120281,70,120333,70,120385,70,120437,70,42904,70,988,70,120778,70,5556,70,42205,70,71874,70,71842,70,66183,70,66213,70,66853,70,65351,103,8458,103,119840,103,119892,103,119944,103,120048,103,120100,103,120152,103,120204,103,120256,103,120308,103,120360,103,120412,103,120464,103,609,103,7555,103,397,103,1409,103,117980,71,119814,71,119866,71,119918,71,119970,71,120022,71,120074,71,120126,71,120178,71,120230,71,120282,71,120334,71,120386,71,120438,71,1292,71,5056,71,5107,71,42198,71,65352,104,8462,104,119841,104,119945,104,119997,104,120049,104,120101,104,120153,104,120205,104,120257,104,120309,104,120361,104,120413,104,120465,104,1211,104,1392,104,5058,104,65320,72,8459,72,8460,72,8461,72,117981,72,119815,72,119867,72,119919,72,120023,72,120179,72,120231,72,120283,72,120335,72,120387,72,120439,72,919,72,120494,72,120552,72,120610,72,120668,72,120726,72,11406,72,5051,72,5500,72,42215,72,66255,72,731,105,9075,105,65353,105,8560,105,8505,105,8520,105,119842,105,119894,105,119946,105,119998,105,120050,105,120102,105,120154,105,120206,105,120258,105,120310,105,120362,105,120414,105,120466,105,120484,105,618,105,617,105,953,105,8126,105,890,105,120522,105,120580,105,120638,105,120696,105,120754,105,1110,105,42567,105,1231,105,43893,105,5029,105,71875,105,65354,106,8521,106,119843,106,119895,106,119947,106,119999,106,120051,106,120103,106,120155,106,120207,106,120259,106,120311,106,120363,106,120415,106,120467,106,1011,106,1112,106,65322,74,117983,74,119817,74,119869,74,119921,74,119973,74,120025,74,120077,74,120129,74,120181,74,120233,74,120285,74,120337,74,120389,74,120441,74,42930,74,895,74,1032,74,5035,74,5261,74,42201,74,119844,107,119896,107,119948,107,120000,107,120052,107,120104,107,120156,107,120208,107,120260,107,120312,107,120364,107,120416,107,120468,107,8490,75,65323,75,117984,75,119818,75,119870,75,119922,75,119974,75,120026,75,120078,75,120130,75,120182,75,120234,75,120286,75,120338,75,120390,75,120442,75,922,75,120497,75,120555,75,120613,75,120671,75,120729,75,11412,75,5094,75,5845,75,42199,75,66840,75,1472,108,8739,73,9213,73,65512,73,1633,108,1777,73,66336,108,125127,108,118001,108,120783,73,120793,73,120803,73,120813,73,120823,73,130033,73,65321,73,8544,73,8464,73,8465,73,117982,108,119816,73,119868,73,119920,73,120024,73,120128,73,120180,73,120232,73,120284,73,120336,73,120388,73,120440,73,65356,108,8572,73,8467,108,119845,108,119897,108,119949,108,120001,108,120053,108,120105,73,120157,73,120209,73,120261,73,120313,73,120365,73,120417,73,120469,73,448,73,120496,73,120554,73,120612,73,120670,73,120728,73,11410,73,1030,73,1216,73,1493,108,1503,108,1575,108,126464,108,126592,108,65166,108,65165,108,1994,108,11599,73,5825,73,42226,73,93992,73,66186,124,66313,124,119338,76,8556,76,8466,76,117985,76,119819,76,119871,76,119923,76,120027,76,120079,76,120131,76,120183,76,120235,76,120287,76,120339,76,120391,76,120443,76,11472,76,5086,76,5290,76,42209,76,93974,76,71843,76,71858,76,66587,76,66854,76,65325,77,8559,77,8499,77,117986,77,119820,77,119872,77,119924,77,120028,77,120080,77,120132,77,120184,77,120236,77,120288,77,120340,77,120392,77,120444,77,924,77,120499,77,120557,77,120615,77,120673,77,120731,77,1018,77,11416,77,5047,77,5616,77,5846,77,42207,77,66224,77,66321,77,119847,110,119899,110,119951,110,120003,110,120055,110,120107,110,120159,110,120211,110,120263,110,120315,110,120367,110,120419,110,120471,110,1400,110,1404,110,65326,78,8469,78,117987,78,119821,78,119873,78,119925,78,119977,78,120029,78,120081,78,120185,78,120237,78,120289,78,120341,78,120393,78,120445,78,925,78,120500,78,120558,78,120616,78,120674,78,120732,78,11418,78,42208,78,66835,78,3074,111,3202,111,3330,111,3458,111,2406,111,2662,111,2790,111,3046,111,3174,111,3302,111,3430,111,3664,111,3792,111,4160,111,1637,111,1781,111,65359,111,8500,111,119848,111,119900,111,119952,111,120056,111,120108,111,120160,111,120212,111,120264,111,120316,111,120368,111,120420,111,120472,111,7439,111,7441,111,43837,111,959,111,120528,111,120586,111,120644,111,120702,111,120760,111,963,111,120532,111,120590,111,120648,111,120706,111,120764,111,11423,111,4351,111,1413,111,1505,111,1607,111,126500,111,126564,111,126596,111,65259,111,65260,111,65258,111,65257,111,1726,111,64428,111,64429,111,64427,111,64426,111,1729,111,64424,111,64425,111,64423,111,64422,111,1749,111,3360,111,4125,111,66794,111,71880,111,71895,111,66604,111,1984,79,2534,79,2918,79,12295,79,70864,79,71904,79,118000,79,120782,79,120792,79,120802,79,120812,79,120822,79,130032,79,65327,79,117988,79,119822,79,119874,79,119926,79,119978,79,120030,79,120082,79,120134,79,120186,79,120238,79,120290,79,120342,79,120394,79,120446,79,927,79,120502,79,120560,79,120618,79,120676,79,120734,79,11422,79,1365,79,11604,79,4816,79,2848,79,66754,79,42227,79,71861,79,66194,79,66219,79,66564,79,66838,79,9076,112,65360,112,119849,112,119901,112,119953,112,120005,112,120057,112,120109,112,120161,112,120213,112,120265,112,120317,112,120369,112,120421,112,120473,112,961,112,120530,112,120544,112,120588,112,120602,112,120646,112,120660,112,120704,112,120718,112,120762,112,120776,112,11427,112,65328,80,8473,80,117989,80,119823,80,119875,80,119927,80,119979,80,120031,80,120083,80,120187,80,120239,80,120291,80,120343,80,120395,80,120447,80,929,80,120504,80,120562,80,120620,80,120678,80,120736,80,11426,80,5090,80,5229,80,42193,80,66197,80,119850,113,119902,113,119954,113,120006,113,120058,113,120110,113,120162,113,120214,113,120266,113,120318,113,120370,113,120422,113,120474,113,1307,113,1379,113,1382,113,8474,81,117990,81,119824,81,119876,81,119928,81,119980,81,120032,81,120084,81,120188,81,120240,81,120292,81,120344,81,120396,81,120448,81,11605,81,119851,114,119903,114,119955,114,120007,114,120059,114,120111,114,120163,114,120215,114,120267,114,120319,114,120371,114,120423,114,120475,114,43847,114,43848,114,7462,114,11397,114,43905,114,119318,82,8475,82,8476,82,8477,82,117991,82,119825,82,119877,82,119929,82,120033,82,120189,82,120241,82,120293,82,120345,82,120397,82,120449,82,422,82,5025,82,5074,82,66740,82,5511,82,42211,82,94005,82,65363,115,119852,115,119904,115,119956,115,120008,115,120060,115,120112,115,120164,115,120216,115,120268,115,120320,115,120372,115,120424,115,120476,115,42801,115,445,115,1109,115,43946,115,71873,115,66632,115,65331,83,117992,83,119826,83,119878,83,119930,83,119982,83,120034,83,120086,83,120138,83,120190,83,120242,83,120294,83,120346,83,120398,83,120450,83,1029,83,1359,83,5077,83,5082,83,42210,83,94010,83,66198,83,66592,83,119853,116,119905,116,119957,116,120009,116,120061,116,120113,116,120165,116,120217,116,120269,116,120321,116,120373,116,120425,116,120477,116,8868,84,10201,84,128872,84,65332,84,117993,84,119827,84,119879,84,119931,84,119983,84,120035,84,120087,84,120139,84,120191,84,120243,84,120295,84,120347,84,120399,84,120451,84,932,84,120507,84,120565,84,120623,84,120681,84,120739,84,11430,84,5026,84,42196,84,93962,84,71868,84,66199,84,66225,84,66325,84,119854,117,119906,117,119958,117,120010,117,120062,117,120114,117,120166,117,120218,117,120270,117,120322,117,120374,117,120426,117,120478,117,42911,117,7452,117,43854,117,43858,117,651,117,965,117,120534,117,120592,117,120650,117,120708,117,120766,117,1405,117,66806,117,71896,117,8746,85,8899,85,117994,85,119828,85,119880,85,119932,85,119984,85,120036,85,120088,85,120140,85,120192,85,120244,85,120296,85,120348,85,120400,85,120452,85,1357,85,4608,85,66766,85,5196,85,42228,85,94018,85,71864,85,8744,118,8897,118,65366,118,8564,118,119855,118,119907,118,119959,118,120011,118,120063,118,120115,118,120167,118,120219,118,120271,118,120323,118,120375,118,120427,118,120479,118,7456,118,957,118,120526,118,120584,118,120642,118,120700,118,120758,118,1141,118,1496,118,71430,118,43945,118,71872,118,119309,86,1639,86,1783,86,8548,86,117995,86,119829,86,119881,86,119933,86,119985,86,120037,86,120089,86,120141,86,120193,86,120245,86,120297,86,120349,86,120401,86,120453,86,1140,86,11576,86,5081,86,5167,86,42719,86,42214,86,93960,86,71840,86,66845,86,623,119,119856,119,119908,119,119960,119,120012,119,120064,119,120116,119,120168,119,120220,119,120272,119,120324,119,120376,119,120428,119,120480,119,7457,119,1121,119,1309,119,1377,119,71434,119,71438,119,71439,119,43907,119,71910,87,71919,87,117996,87,119830,87,119882,87,119934,87,119986,87,120038,87,120090,87,120142,87,120194,87,120246,87,120298,87,120350,87,120402,87,120454,87,1308,87,5043,87,5076,87,42218,87,5742,120,10539,120,10540,120,10799,120,65368,120,8569,120,119857,120,119909,120,119961,120,120013,120,120065,120,120117,120,120169,120,120221,120,120273,120,120325,120,120377,120,120429,120,120481,120,5441,120,5501,120,5741,88,9587,88,66338,88,71916,88,65336,88,8553,88,117997,88,119831,88,119883,88,119935,88,119987,88,120039,88,120091,88,120143,88,120195,88,120247,88,120299,88,120351,88,120403,88,120455,88,42931,88,935,88,120510,88,120568,88,120626,88,120684,88,120742,88,11436,88,11613,88,5815,88,42219,88,66192,88,66228,88,66327,88,66855,88,611,121,7564,121,65369,121,119858,121,119910,121,119962,121,120014,121,120066,121,120118,121,120170,121,120222,121,120274,121,120326,121,120378,121,120430,121,120482,121,655,121,7935,121,43866,121,947,121,8509,121,120516,121,120574,121,120632,121,120690,121,120748,121,1199,121,4327,121,71900,121,65337,89,117998,89,119832,89,119884,89,119936,89,119988,89,120040,89,120092,89,120144,89,120196,89,120248,89,120300,89,120352,89,120404,89,120456,89,933,89,978,89,120508,89,120566,89,120624,89,120682,89,120740,89,11432,89,1198,89,5033,89,5053,89,42220,89,94019,89,71844,89,66226,89,119859,122,119911,122,119963,122,120015,122,120067,122,120119,122,120171,122,120223,122,120275,122,120327,122,120379,122,120431,122,120483,122,7458,122,43923,122,71876,122,71909,90,66293,90,65338,90,8484,90,8488,90,117999,90,119833,90,119885,90,119937,90,119989,90,120041,90,120197,90,120249,90,120301,90,120353,90,120405,90,120457,90,918,90,120493,90,120551,90,120609,90,120667,90,120725,90,5059,90,42204,90,71849,90,65282,34,65283,35,65284,36,65285,37,65286,38,65290,42,65291,43,65294,46,65295,47,65296,48,65298,50,65299,51,65300,52,65301,53,65302,54,65303,55,65304,56,65305,57,65308,60,65309,61,65310,62,65312,64,65316,68,65318,70,65319,71,65324,76,65329,81,65330,82,65333,85,65334,86,65335,87,65343,95,65346,98,65348,100,65350,102,65355,107,65357,109,65358,110,65361,113,65362,114,65364,116,65365,117,65367,119,65370,122,65371,123,65373,125,119846,109],"_default":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8216,96,8217,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"cs":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"de":[65374,126,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"es":[8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"fr":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"it":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"ja":[8211,45,8218,44,65281,33,8216,96,8245,96,180,96,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65292,44,65297,49,65307,59],"ko":[8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"pl":[65374,126,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"pt-BR":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"qps-ploc":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"ru":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,305,105,921,73,1009,112,215,120,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"tr":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"zh-hans":[160,32,65374,126,8218,44,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65297,49],"zh-hant":[8211,45,65374,126,8218,44,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89]}');
    });
  }
  static {
    this.d = new $Hf((localesStr) => {
      const locales = localesStr.split(",");
      function arrayToMap(arr) {
        const result = /* @__PURE__ */ new Map();
        for (let i = 0; i < arr.length; i += 2) {
          result.set(arr[i], arr[i + 1]);
        }
        return result;
      }
      function mergeMaps(map1, map2) {
        const result = new Map(map1);
        for (const [key, value] of map2) {
          result.set(key, value);
        }
        return result;
      }
      function intersectMaps(map1, map2) {
        if (!map1) {
          return map2;
        }
        const result = /* @__PURE__ */ new Map();
        for (const [key, value] of map1) {
          if (map2.has(key)) {
            result.set(key, value);
          }
        }
        return result;
      }
      const data = this.c.value;
      let filteredLocales = locales.filter((l) => !l.startsWith("_") && Object.hasOwn(data, l));
      if (filteredLocales.length === 0) {
        filteredLocales = ["_default"];
      }
      let languageSpecificMap = void 0;
      for (const locale of filteredLocales) {
        const map2 = arrayToMap(data[locale]);
        languageSpecificMap = intersectMaps(languageSpecificMap, map2);
      }
      const commonMap = arrayToMap(data["_common"]);
      const map = mergeMaps(commonMap, languageSpecificMap);
      return new _$Rg(map);
    });
  }
  static getInstance(locales) {
    return _$Rg.d.get(Array.from(locales).join(","));
  }
  static {
    this.e = new $Kf(() => Object.keys(_$Rg.c.value).filter((k) => !k.startsWith("_")));
  }
  static getLocales() {
    return _$Rg.e.value;
  }
  constructor(f) {
    this.f = f;
  }
  isAmbiguous(codePoint) {
    return this.f.has(codePoint);
  }
  containsAmbiguousCharacter(str) {
    for (let i = 0; i < str.length; i++) {
      const codePoint = str.codePointAt(i);
      if (typeof codePoint === "number" && this.isAmbiguous(codePoint)) {
        return true;
      }
    }
    return false;
  }
  /**
   * Returns the non basic ASCII code point that the given code point can be confused,
   * or undefined if such code point does note exist.
   */
  getPrimaryConfusable(codePoint) {
    return this.f.get(codePoint);
  }
  getConfusableCodePoints() {
    return new Set(this.f.keys());
  }
};
var $Sg = class _$Sg {
  static c() {
    return JSON.parse('{"_common":[11,12,13,127,847,1564,4447,4448,6068,6069,6155,6156,6157,6158,7355,7356,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8204,8205,8206,8207,8234,8235,8236,8237,8238,8239,8287,8288,8289,8290,8291,8292,8293,8294,8295,8296,8297,8298,8299,8300,8301,8302,8303,10240,12644,65024,65025,65026,65027,65028,65029,65030,65031,65032,65033,65034,65035,65036,65037,65038,65039,65279,65440,65520,65521,65522,65523,65524,65525,65526,65527,65528,65532,78844,119155,119156,119157,119158,119159,119160,119161,119162,917504,917505,917506,917507,917508,917509,917510,917511,917512,917513,917514,917515,917516,917517,917518,917519,917520,917521,917522,917523,917524,917525,917526,917527,917528,917529,917530,917531,917532,917533,917534,917535,917536,917537,917538,917539,917540,917541,917542,917543,917544,917545,917546,917547,917548,917549,917550,917551,917552,917553,917554,917555,917556,917557,917558,917559,917560,917561,917562,917563,917564,917565,917566,917567,917568,917569,917570,917571,917572,917573,917574,917575,917576,917577,917578,917579,917580,917581,917582,917583,917584,917585,917586,917587,917588,917589,917590,917591,917592,917593,917594,917595,917596,917597,917598,917599,917600,917601,917602,917603,917604,917605,917606,917607,917608,917609,917610,917611,917612,917613,917614,917615,917616,917617,917618,917619,917620,917621,917622,917623,917624,917625,917626,917627,917628,917629,917630,917631,917760,917761,917762,917763,917764,917765,917766,917767,917768,917769,917770,917771,917772,917773,917774,917775,917776,917777,917778,917779,917780,917781,917782,917783,917784,917785,917786,917787,917788,917789,917790,917791,917792,917793,917794,917795,917796,917797,917798,917799,917800,917801,917802,917803,917804,917805,917806,917807,917808,917809,917810,917811,917812,917813,917814,917815,917816,917817,917818,917819,917820,917821,917822,917823,917824,917825,917826,917827,917828,917829,917830,917831,917832,917833,917834,917835,917836,917837,917838,917839,917840,917841,917842,917843,917844,917845,917846,917847,917848,917849,917850,917851,917852,917853,917854,917855,917856,917857,917858,917859,917860,917861,917862,917863,917864,917865,917866,917867,917868,917869,917870,917871,917872,917873,917874,917875,917876,917877,917878,917879,917880,917881,917882,917883,917884,917885,917886,917887,917888,917889,917890,917891,917892,917893,917894,917895,917896,917897,917898,917899,917900,917901,917902,917903,917904,917905,917906,917907,917908,917909,917910,917911,917912,917913,917914,917915,917916,917917,917918,917919,917920,917921,917922,917923,917924,917925,917926,917927,917928,917929,917930,917931,917932,917933,917934,917935,917936,917937,917938,917939,917940,917941,917942,917943,917944,917945,917946,917947,917948,917949,917950,917951,917952,917953,917954,917955,917956,917957,917958,917959,917960,917961,917962,917963,917964,917965,917966,917967,917968,917969,917970,917971,917972,917973,917974,917975,917976,917977,917978,917979,917980,917981,917982,917983,917984,917985,917986,917987,917988,917989,917990,917991,917992,917993,917994,917995,917996,917997,917998,917999],"cs":[173,8203,12288],"de":[173,8203,12288],"es":[8203,12288],"fr":[173,8203,12288],"it":[160,173,12288],"ja":[173],"ko":[173,12288],"pl":[173,8203,12288],"pt-BR":[173,8203,12288],"qps-ploc":[160,173,8203,12288],"ru":[173,12288],"tr":[160,173,8203,12288],"zh-hans":[160,173,8203,12288],"zh-hant":[173,12288]}');
  }
  static {
    this.d = void 0;
  }
  static e() {
    if (!this.d) {
      this.d = new Set([...Object.values(_$Sg.c())].flat());
    }
    return this.d;
  }
  static isInvisibleCharacter(codePoint) {
    return _$Sg.e().has(codePoint);
  }
  static containsInvisibleCharacter(str) {
    for (let i = 0; i < str.length; i++) {
      const codePoint = str.codePointAt(i);
      if (typeof codePoint === "number" && (_$Sg.isInvisibleCharacter(codePoint) || codePoint === 32)) {
        return true;
      }
    }
    return false;
  }
  static get codePoints() {
    return _$Sg.e();
  }
};

// out-build/vs/base/common/extpath.js
function $Vg(code) {
  return code === 47 || code === 92;
}
function $Wg(osPath) {
  return osPath.replace(/[\\/]/g, $7.sep);
}
function $Xg(osPath) {
  if (osPath.indexOf("/") === -1) {
    osPath = $Wg(osPath);
  }
  if (/^[a-zA-Z]:(\/|$)/.test(osPath)) {
    osPath = "/" + osPath;
  }
  return osPath;
}
function $Yg(path, sep2 = $7.sep) {
  if (!path) {
    return "";
  }
  const len = path.length;
  const firstLetter = path.charCodeAt(0);
  if ($Vg(firstLetter)) {
    if ($Vg(path.charCodeAt(1))) {
      if (!$Vg(path.charCodeAt(2))) {
        let pos2 = 3;
        const start = pos2;
        for (; pos2 < len; pos2++) {
          if ($Vg(path.charCodeAt(pos2))) {
            break;
          }
        }
        if (start !== pos2 && !$Vg(path.charCodeAt(pos2 + 1))) {
          pos2 += 1;
          for (; pos2 < len; pos2++) {
            if ($Vg(path.charCodeAt(pos2))) {
              return path.slice(0, pos2 + 1).replace(/[\\/]/g, sep2);
            }
          }
        }
      }
    }
    return sep2;
  } else if ($4g(firstLetter)) {
    if (path.charCodeAt(1) === 58) {
      if ($Vg(path.charCodeAt(2))) {
        return path.slice(0, 2) + sep2;
      } else {
        return path.slice(0, 2);
      }
    }
  }
  let pos = path.indexOf("://");
  if (pos !== -1) {
    pos += 3;
    for (; pos < len; pos++) {
      if ($Vg(path.charCodeAt(pos))) {
        return path.slice(0, pos + 1);
      }
    }
  }
  return "";
}
function $3g(base, parentCandidate, ignoreCase, separator = sep) {
  if (base === parentCandidate) {
    return true;
  }
  if (!base || !parentCandidate) {
    return false;
  }
  if (parentCandidate.length > base.length) {
    return false;
  }
  if (ignoreCase) {
    const beginsWith = $ig(base, parentCandidate);
    if (!beginsWith) {
      return false;
    }
    if (parentCandidate.length === base.length) {
      return true;
    }
    let sepOffset = parentCandidate.length;
    if (parentCandidate.charAt(parentCandidate.length - 1) === separator) {
      sepOffset--;
    }
    return base.charAt(sepOffset) === separator;
  }
  if (parentCandidate.charAt(parentCandidate.length - 1) !== separator) {
    parentCandidate += separator;
  }
  return base.indexOf(parentCandidate) === 0;
}
function $4g(char0) {
  return char0 >= 65 && char0 <= 90 || char0 >= 97 && char0 <= 122;
}

// out-build/vs/base/common/network.js
var Schemas;
(function(Schemas2) {
  Schemas2.inMemory = "inmemory";
  Schemas2.vscode = "vscode";
  Schemas2.internal = "private";
  Schemas2.walkThrough = "walkThrough";
  Schemas2.walkThroughSnippet = "walkThroughSnippet";
  Schemas2.http = "http";
  Schemas2.https = "https";
  Schemas2.file = "file";
  Schemas2.mailto = "mailto";
  Schemas2.untitled = "untitled";
  Schemas2.data = "data";
  Schemas2.command = "command";
  Schemas2.vscodeRemote = "vscode-remote";
  Schemas2.vscodeRemoteResource = "vscode-remote-resource";
  Schemas2.vscodeManagedRemoteResource = "vscode-managed-remote-resource";
  Schemas2.vscodeUserData = "vscode-userdata";
  Schemas2.vscodeCustomEditor = "vscode-custom-editor";
  Schemas2.vscodeNotebookCell = "vscode-notebook-cell";
  Schemas2.vscodeNotebookCellMetadata = "vscode-notebook-cell-metadata";
  Schemas2.vscodeNotebookCellMetadataDiff = "vscode-notebook-cell-metadata-diff";
  Schemas2.vscodeNotebookCellOutput = "vscode-notebook-cell-output";
  Schemas2.vscodeNotebookCellOutputDiff = "vscode-notebook-cell-output-diff";
  Schemas2.vscodeNotebookMetadata = "vscode-notebook-metadata";
  Schemas2.vscodeInteractiveInput = "vscode-interactive-input";
  Schemas2.vscodeSettings = "vscode-settings";
  Schemas2.vscodeWorkspaceTrust = "vscode-workspace-trust";
  Schemas2.vscodeTerminal = "vscode-terminal";
  Schemas2.vscodeChatCodeBlock = "vscode-chat-code-block";
  Schemas2.vscodeChatCodeCompareBlock = "vscode-chat-code-compare-block";
  Schemas2.vscodeChatEditor = "vscode-chat-editor";
  Schemas2.vscodeChatInput = "chatSessionInput";
  Schemas2.vscodeLocalChatSession = "vscode-chat-session";
  Schemas2.webviewPanel = "webview-panel";
  Schemas2.vscodeWebview = "vscode-webview";
  Schemas2.extension = "extension";
  Schemas2.vscodeFileResource = "vscode-file";
  Schemas2.tmp = "tmp";
  Schemas2.vsls = "vsls";
  Schemas2.vscodeSourceControl = "vscode-scm";
  Schemas2.commentsInput = "comment";
  Schemas2.codeSetting = "code-setting";
  Schemas2.outputChannel = "output";
  Schemas2.accessibleView = "accessible-view";
  Schemas2.chatEditingSnapshotScheme = "chat-editing-snapshot-text-model";
  Schemas2.chatEditingModel = "chat-editing-text-model";
  Schemas2.copilotPr = "copilot-pr";
})(Schemas || (Schemas = {}));
var $dh = "tkn";
var RemoteAuthoritiesImpl = class {
  constructor() {
    this.a = /* @__PURE__ */ Object.create(null);
    this.b = /* @__PURE__ */ Object.create(null);
    this.c = /* @__PURE__ */ Object.create(null);
    this.d = "http";
    this.e = null;
    this.f = "/";
  }
  setPreferredWebSchema(schema) {
    this.d = schema;
  }
  setDelegate(delegate) {
    this.e = delegate;
  }
  setServerRootPath(product, serverBasePath) {
    this.f = $7.join(serverBasePath ?? "/", $fh(product));
  }
  getServerRootPath() {
    return this.f;
  }
  get g() {
    return $7.join(this.f, Schemas.vscodeRemoteResource);
  }
  set(authority, host, port) {
    this.a[authority] = host;
    this.b[authority] = port;
  }
  setConnectionToken(authority, connectionToken) {
    this.c[authority] = connectionToken;
  }
  getPreferredWebSchema() {
    return this.d;
  }
  rewrite(uri) {
    if (this.e) {
      try {
        return this.e(uri);
      } catch (err) {
        $nb(err);
        return uri;
      }
    }
    const authority = uri.authority;
    let host = this.a[authority];
    if (host && host.indexOf(":") !== -1 && host.indexOf("[") === -1) {
      host = `[${host}]`;
    }
    const port = this.b[authority];
    const connectionToken = this.c[authority];
    let query = `path=${encodeURIComponent(uri.path)}`;
    if (typeof connectionToken === "string") {
      query += `&${$dh}=${encodeURIComponent(connectionToken)}`;
    }
    return URI.from({
      scheme: $s ? this.d : Schemas.vscodeRemoteResource,
      authority: `${host}:${port}`,
      path: this.g,
      query
    });
  }
};
var $eh = new RemoteAuthoritiesImpl();
function $fh(product) {
  return `${product.quality ?? "oss"}-${product.commit ?? "dev"}`;
}
var $hh = "vs/../../node_modules";
var $ih = "vs/../../node_modules.asar";
var $kh = "vscode-app";
var FileAccessImpl = class _FileAccessImpl {
  static {
    this.a = $kh;
  }
  /**
   * Returns a URI to use in contexts where the browser is responsible
   * for loading (e.g. fetch()) or when used within the DOM.
   *
   * **Note:** use `dom.ts#asCSSUrl` whenever the URL is to be used in CSS context.
   */
  asBrowserUri(resourcePath) {
    const uri = this.b(resourcePath);
    return this.uriToBrowserUri(uri);
  }
  /**
   * Returns a URI to use in contexts where the browser is responsible
   * for loading (e.g. fetch()) or when used within the DOM.
   *
   * **Note:** use `dom.ts#asCSSUrl` whenever the URL is to be used in CSS context.
   */
  uriToBrowserUri(uri) {
    if (uri.scheme === Schemas.vscodeRemote) {
      return $eh.rewrite(uri);
    }
    if (
      // ...only ever for `file` resources
      uri.scheme === Schemas.file && // ...and we run in native environments
      ($q || // ...or web worker extensions on desktop
      $u === `${Schemas.vscodeFileResource}://${_FileAccessImpl.a}`)
    ) {
      return uri.with({
        scheme: Schemas.vscodeFileResource,
        // We need to provide an authority here so that it can serve
        // as origin for network and loading matters in chromium.
        // If the URI is not coming with an authority already, we
        // add our own
        authority: uri.authority || _FileAccessImpl.a,
        query: null,
        fragment: null
      });
    }
    return uri;
  }
  /**
   * Returns the `file` URI to use in contexts where node.js
   * is responsible for loading.
   */
  asFileUri(resourcePath) {
    const uri = this.b(resourcePath);
    return this.uriToFileUri(uri);
  }
  /**
   * Returns the `file` URI to use in contexts where node.js
   * is responsible for loading.
   */
  uriToFileUri(uri) {
    if (uri.scheme === Schemas.vscodeFileResource) {
      return uri.with({
        scheme: Schemas.file,
        // Only preserve the `authority` if it is different from
        // our fallback authority. This ensures we properly preserve
        // Windows UNC paths that come with their own authority.
        authority: uri.authority !== _FileAccessImpl.a ? uri.authority : null,
        query: null,
        fragment: null
      });
    }
    return uri;
  }
  b(uriOrModule) {
    if (URI.isUri(uriOrModule)) {
      return uriOrModule;
    }
    if (globalThis._VSCODE_FILE_ROOT) {
      const rootUriOrPath = globalThis._VSCODE_FILE_ROOT;
      if (/^\w[\w\d+.-]*:\/\//.test(rootUriOrPath)) {
        return URI.joinPath(URI.parse(rootUriOrPath, true), uriOrModule);
      }
      const modulePath = $0(rootUriOrPath, uriOrModule);
      return URI.file(modulePath);
    }
    throw new Error("Cannot determine URI for module id!");
  }
};
var $lh = new FileAccessImpl();
var $mh = Object.freeze({
  "Cache-Control": "no-cache, no-store"
});
var $nh = Object.freeze({
  "Document-Policy": "include-js-call-stacks-in-crash-reports"
});
var COI;
(function(COI2) {
  const coiHeaders = /* @__PURE__ */ new Map([
    ["1", { "Cross-Origin-Opener-Policy": "same-origin" }],
    ["2", { "Cross-Origin-Embedder-Policy": "require-corp" }],
    ["3", { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp" }]
  ]);
  COI2.CoopAndCoep = Object.freeze(coiHeaders.get("3"));
  const coiSearchParamName = "vscode-coi";
  function getHeadersFromQuery(url) {
    let params;
    if (typeof url === "string") {
      params = new URL(url).searchParams;
    } else if (url instanceof URL) {
      params = url.searchParams;
    } else if (URI.isUri(url)) {
      params = new URL(url.toString(true)).searchParams;
    }
    const value = params?.get(coiSearchParamName);
    if (!value) {
      return void 0;
    }
    return coiHeaders.get(value);
  }
  COI2.getHeadersFromQuery = getHeadersFromQuery;
  function addSearchParam(urlOrSearch, coop, coep) {
    if (!globalThis.crossOriginIsolated) {
      return;
    }
    const value = coop && coep ? "3" : coep ? "2" : "1";
    if (urlOrSearch instanceof URLSearchParams) {
      urlOrSearch.set(coiSearchParamName, value);
    } else {
      urlOrSearch[coiSearchParamName] = value;
    }
  }
  COI2.addSearchParam = addSearchParam;
})(COI || (COI = {}));

// out-build/vs/base/common/resources.js
function $oh(uri) {
  return $Lc(uri, true);
}
var $ph = class {
  constructor(a) {
    this.a = a;
  }
  compare(uri1, uri2, ignoreFragment = false) {
    if (uri1 === uri2) {
      return 0;
    }
    return $_f(this.getComparisonKey(uri1, ignoreFragment), this.getComparisonKey(uri2, ignoreFragment));
  }
  isEqual(uri1, uri2, ignoreFragment = false) {
    if (uri1 === uri2) {
      return true;
    }
    if (!uri1 || !uri2) {
      return false;
    }
    return this.getComparisonKey(uri1, ignoreFragment) === this.getComparisonKey(uri2, ignoreFragment);
  }
  getComparisonKey(uri, ignoreFragment = false) {
    return uri.with({
      path: this.a(uri) ? uri.path.toLowerCase() : void 0,
      fragment: ignoreFragment ? null : void 0
    }).toString();
  }
  ignorePathCasing(uri) {
    return this.a(uri);
  }
  isEqualOrParent(base, parentCandidate, ignoreFragment = false) {
    if (base.scheme === parentCandidate.scheme) {
      if (base.scheme === Schemas.file) {
        return $3g($oh(base), $oh(parentCandidate), this.a(base)) && base.query === parentCandidate.query && (ignoreFragment || base.fragment === parentCandidate.fragment);
      }
      if ($Fh(base.authority, parentCandidate.authority)) {
        return $3g(base.path, parentCandidate.path, this.a(base), "/") && base.query === parentCandidate.query && (ignoreFragment || base.fragment === parentCandidate.fragment);
      }
    }
    return false;
  }
  // --- path math
  joinPath(resource, ...pathFragment) {
    return URI.joinPath(resource, ...pathFragment);
  }
  basenameOrAuthority(resource) {
    return $xh(resource) || resource.authority;
  }
  basename(resource) {
    return $7.basename(resource.path);
  }
  extname(resource) {
    return $7.extname(resource.path);
  }
  dirname(resource) {
    if (resource.path.length === 0) {
      return resource;
    }
    let dirname;
    if (resource.scheme === Schemas.file) {
      dirname = URI.file($ab($oh(resource))).path;
    } else {
      dirname = $7.dirname(resource.path);
      if (resource.authority && dirname.length && dirname.charCodeAt(0) !== 47) {
        console.error(`dirname("${resource.toString})) resulted in a relative path`);
        dirname = "/";
      }
    }
    return resource.with({
      path: dirname
    });
  }
  normalizePath(resource) {
    if (!resource.path.length) {
      return resource;
    }
    let normalizedPath;
    if (resource.scheme === Schemas.file) {
      normalizedPath = URI.file($8($oh(resource))).path;
    } else {
      normalizedPath = $7.normalize(resource.path);
    }
    return resource.with({
      path: normalizedPath
    });
  }
  relativePath(from, to) {
    if (from.scheme !== to.scheme || !$Fh(from.authority, to.authority)) {
      return void 0;
    }
    if (from.scheme === Schemas.file) {
      const relativePath = $_($oh(from), $oh(to));
      return $m ? $Wg(relativePath) : relativePath;
    }
    let fromPath = from.path || "/";
    const toPath = to.path || "/";
    if (this.a(from)) {
      let i = 0;
      for (const len = Math.min(fromPath.length, toPath.length); i < len; i++) {
        if (fromPath.charCodeAt(i) !== toPath.charCodeAt(i)) {
          if (fromPath.charAt(i).toLowerCase() !== toPath.charAt(i).toLowerCase()) {
            break;
          }
        }
      }
      fromPath = toPath.substr(0, i) + fromPath.substr(i);
    }
    return $7.relative(fromPath, toPath);
  }
  resolvePath(base, path) {
    if (base.scheme === Schemas.file) {
      const newURI = URI.file($$($oh(base), path));
      return base.with({
        authority: newURI.authority,
        path: newURI.path
      });
    }
    path = $Xg(path);
    return base.with({
      path: $7.resolve(base.path, path)
    });
  }
  // --- misc
  isAbsolutePath(resource) {
    return !!resource.path && resource.path[0] === "/";
  }
  isEqualAuthority(a1, a2) {
    return a1 === a2 || a1 !== void 0 && a2 !== void 0 && $gg(a1, a2);
  }
  hasTrailingPathSeparator(resource, sep2 = sep) {
    if (resource.scheme === Schemas.file) {
      const fsp = $oh(resource);
      return fsp.length > $Yg(fsp).length && fsp[fsp.length - 1] === sep2;
    } else {
      const p = resource.path;
      return p.length > 1 && p.charCodeAt(p.length - 1) === 47 && !/^[a-zA-Z]:(\/$|\\$)/.test(resource.fsPath);
    }
  }
  removeTrailingPathSeparator(resource, sep2 = sep) {
    if ($Gh(resource, sep2)) {
      return resource.with({ path: resource.path.substr(0, resource.path.length - 1) });
    }
    return resource;
  }
  addTrailingPathSeparator(resource, sep2 = sep) {
    let isRootSep = false;
    if (resource.scheme === Schemas.file) {
      const fsp = $oh(resource);
      isRootSep = fsp !== void 0 && fsp.length === $Yg(fsp).length && fsp[fsp.length - 1] === sep2;
    } else {
      sep2 = "/";
      const p = resource.path;
      isRootSep = p.length === 1 && p.charCodeAt(p.length - 1) === 47;
    }
    if (!isRootSep && !$Gh(resource, sep2)) {
      return resource.with({ path: resource.path + "/" });
    }
    return resource;
  }
};
var $qh = new $ph(() => false);
var $rh = new $ph((uri) => {
  return uri.scheme === Schemas.file ? !$o : true;
});
var $sh = new $ph((_) => true);
var $th = $qh.isEqual.bind($qh);
var $uh = $qh.isEqualOrParent.bind($qh);
var $vh = $qh.getComparisonKey.bind($qh);
var $wh = $qh.basenameOrAuthority.bind($qh);
var $xh = $qh.basename.bind($qh);
var $yh = $qh.extname.bind($qh);
var $zh = $qh.dirname.bind($qh);
var $Ah = $qh.joinPath.bind($qh);
var $Bh = $qh.normalizePath.bind($qh);
var $Ch = $qh.relativePath.bind($qh);
var $Dh = $qh.resolvePath.bind($qh);
var $Eh = $qh.isAbsolutePath.bind($qh);
var $Fh = $qh.isEqualAuthority.bind($qh);
var $Gh = $qh.hasTrailingPathSeparator.bind($qh);
var $Hh = $qh.removeTrailingPathSeparator.bind($qh);
var $Ih = $qh.addTrailingPathSeparator.bind($qh);
var DataUri;
(function(DataUri2) {
  DataUri2.META_DATA_LABEL = "label";
  DataUri2.META_DATA_DESCRIPTION = "description";
  DataUri2.META_DATA_SIZE = "size";
  DataUri2.META_DATA_MIME = "mime";
  function parseMetaData(dataUri) {
    const metadata = /* @__PURE__ */ new Map();
    const meta = dataUri.path.substring(dataUri.path.indexOf(";") + 1, dataUri.path.lastIndexOf(";"));
    meta.split(";").forEach((property) => {
      const [key, value] = property.split(":");
      if (key && value) {
        metadata.set(key, value);
      }
    });
    const mime = dataUri.path.substring(0, dataUri.path.indexOf(";"));
    if (mime) {
      metadata.set(DataUri2.META_DATA_MIME, mime);
    }
    return metadata;
  }
  DataUri2.parseMetaData = parseMetaData;
})(DataUri || (DataUri = {}));

// out-build/vs/workbench/services/textMate/common/TMScopeRegistry.js
var $A$b = class {
  constructor() {
    this.a = /* @__PURE__ */ Object.create(null);
  }
  reset() {
    this.a = /* @__PURE__ */ Object.create(null);
  }
  register(def) {
    if (this.a[def.scopeName]) {
      const existingRegistration = this.a[def.scopeName];
      if (!$th(existingRegistration.location, def.location)) {
        console.warn(`Overwriting grammar scope name to file mapping for scope ${def.scopeName}.
Old grammar file: ${existingRegistration.location.toString()}.
New grammar file: ${def.location.toString()}`);
      }
    }
    this.a[def.scopeName] = def;
  }
  getGrammarDefinition(scopeName) {
    return this.a[scopeName] || null;
  }
};

// out-build/vs/workbench/services/textMate/common/TMGrammarFactory.js
var $B$b = "No TM Grammar registered for this language.";
var $C$b = class extends $Fd {
  constructor(host, grammarDefinitions, vscodeTextmate, onigLib) {
    super();
    this.a = host;
    this.b = vscodeTextmate.INITIAL;
    this.c = new $A$b();
    this.f = {};
    this.g = {};
    this.h = /* @__PURE__ */ new Map();
    this.j = this.D(new vscodeTextmate.Registry({
      onigLib,
      loadGrammar: async (scopeName) => {
        const grammarDefinition = this.c.getGrammarDefinition(scopeName);
        if (!grammarDefinition) {
          this.a.logTrace(`No grammar found for scope ${scopeName}`);
          return null;
        }
        const location = grammarDefinition.location;
        try {
          const content = await this.a.readFile(location);
          return vscodeTextmate.parseRawGrammar(content, location.path);
        } catch (e) {
          this.a.logError(`Unable to load and parse grammar for scope ${scopeName} from ${location}`, e);
          return null;
        }
      },
      getInjections: (scopeName) => {
        const scopeParts = scopeName.split(".");
        let injections = [];
        for (let i = 1; i <= scopeParts.length; i++) {
          const subScopeName = scopeParts.slice(0, i).join(".");
          injections = [...injections, ...this.f[subScopeName] || []];
        }
        return injections;
      }
    }));
    for (const validGrammar of grammarDefinitions) {
      this.c.register(validGrammar);
      if (validGrammar.injectTo) {
        for (const injectScope of validGrammar.injectTo) {
          let injections = this.f[injectScope];
          if (!injections) {
            this.f[injectScope] = injections = [];
          }
          injections.push(validGrammar.scopeName);
        }
        if (validGrammar.embeddedLanguages) {
          for (const injectScope of validGrammar.injectTo) {
            let injectedEmbeddedLanguages = this.g[injectScope];
            if (!injectedEmbeddedLanguages) {
              this.g[injectScope] = injectedEmbeddedLanguages = [];
            }
            injectedEmbeddedLanguages.push(validGrammar.embeddedLanguages);
          }
        }
      }
      if (validGrammar.language) {
        this.h.set(validGrammar.language, validGrammar.scopeName);
      }
    }
  }
  has(languageId) {
    return this.h.has(languageId);
  }
  setTheme(theme, colorMap) {
    this.j.setTheme(theme, colorMap);
  }
  getColorMap() {
    return this.j.getColorMap();
  }
  async createGrammar(languageId, encodedLanguageId) {
    const scopeName = this.h.get(languageId);
    if (typeof scopeName !== "string") {
      throw new Error($B$b);
    }
    const grammarDefinition = this.c.getGrammarDefinition(scopeName);
    if (!grammarDefinition) {
      throw new Error($B$b);
    }
    const embeddedLanguages = grammarDefinition.embeddedLanguages;
    if (this.g[scopeName]) {
      const injectedEmbeddedLanguages = this.g[scopeName];
      for (const injected of injectedEmbeddedLanguages) {
        for (const scope of Object.keys(injected)) {
          embeddedLanguages[scope] = injected[scope];
        }
      }
    }
    const containsEmbeddedLanguages = Object.keys(embeddedLanguages).length > 0;
    let grammar;
    try {
      grammar = await this.j.loadGrammarWithConfiguration(scopeName, encodedLanguageId, {
        embeddedLanguages,
        // eslint-disable-next-line local/code-no-any-casts
        tokenTypes: grammarDefinition.tokenTypes,
        balancedBracketSelectors: grammarDefinition.balancedBracketSelectors,
        unbalancedBracketSelectors: grammarDefinition.unbalancedBracketSelectors
      });
    } catch (err) {
      if (err.message && err.message.startsWith("No grammar provided for")) {
        throw new Error($B$b);
      }
      throw err;
    }
    return {
      languageId,
      grammar,
      initialState: this.b,
      containsEmbeddedLanguages,
      sourceExtensionId: grammarDefinition.sourceExtensionId
    };
  }
};

// out-build/vs/base/common/uuid.js
var $cn = function() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID.bind(crypto);
  }
  const _data = new Uint8Array(16);
  const _hex = [];
  for (let i = 0; i < 256; i++) {
    _hex.push(i.toString(16).padStart(2, "0"));
  }
  return function generateUuid() {
    crypto.getRandomValues(_data);
    _data[6] = _data[6] & 15 | 64;
    _data[8] = _data[8] & 63 | 128;
    let i = 0;
    let result = "";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += "-";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += "-";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += "-";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += "-";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    return result;
  };
}();

// out-build/vs/amdX.js
var $OK = false;
var DefineCall = class {
  constructor(id2, dependencies, callback) {
    this.id = id2;
    this.dependencies = dependencies;
    this.callback = callback;
  }
};
var AMDModuleImporterState;
(function(AMDModuleImporterState2) {
  AMDModuleImporterState2[AMDModuleImporterState2["Uninitialized"] = 1] = "Uninitialized";
  AMDModuleImporterState2[AMDModuleImporterState2["InitializedInternal"] = 2] = "InitializedInternal";
  AMDModuleImporterState2[AMDModuleImporterState2["InitializedExternal"] = 3] = "InitializedExternal";
})(AMDModuleImporterState || (AMDModuleImporterState = {}));
var AMDModuleImporter = class _AMDModuleImporter {
  static {
    this.INSTANCE = new _AMDModuleImporter();
  }
  constructor() {
    this.a = typeof self === "object" && self.constructor && self.constructor.name === "DedicatedWorkerGlobalScope";
    this.b = typeof document === "object";
    this.c = [];
    this.d = AMDModuleImporterState.Uninitialized;
  }
  g() {
    if (this.d === AMDModuleImporterState.Uninitialized) {
      if (globalThis.define) {
        this.d = AMDModuleImporterState.InitializedExternal;
        return;
      }
    } else {
      return;
    }
    this.d = AMDModuleImporterState.InitializedInternal;
    globalThis.define = (id2, dependencies, callback) => {
      if (typeof id2 !== "string") {
        callback = dependencies;
        dependencies = id2;
        id2 = null;
      }
      if (typeof dependencies !== "object" || !Array.isArray(dependencies)) {
        callback = dependencies;
        dependencies = null;
      }
      this.c.push(new DefineCall(id2, dependencies, callback));
    };
    globalThis.define.amd = true;
    if (this.b) {
      this.f = globalThis._VSCODE_WEB_PACKAGE_TTP ?? window.trustedTypes?.createPolicy("amdLoader", {
        createScriptURL(value) {
          if (value.startsWith(window.location.origin)) {
            return value;
          }
          if (value.startsWith(`${Schemas.vscodeFileResource}://${$kh}`)) {
            return value;
          }
          throw new Error(`[trusted_script_src] Invalid script url: ${value}`);
        }
      });
    } else if (this.a) {
      this.f = globalThis._VSCODE_WEB_PACKAGE_TTP ?? globalThis.trustedTypes?.createPolicy("amdLoader", {
        createScriptURL(value) {
          return value;
        }
      });
    }
  }
  async load(scriptSrc) {
    this.g();
    if (this.d === AMDModuleImporterState.InitializedExternal) {
      return new Promise((resolve) => {
        const tmpModuleId = $cn();
        globalThis.define(tmpModuleId, [scriptSrc], function(moduleResult) {
          resolve(moduleResult);
        });
      });
    }
    const defineCall = await (this.a ? this.i(scriptSrc) : this.b ? this.h(scriptSrc) : this.j(scriptSrc));
    if (!defineCall) {
      console.warn(`Did not receive a define call from script ${scriptSrc}`);
      return void 0;
    }
    const exports = {};
    const dependencyObjs = [];
    const dependencyModules = [];
    if (Array.isArray(defineCall.dependencies)) {
      for (const mod of defineCall.dependencies) {
        if (mod === "exports") {
          dependencyObjs.push(exports);
        } else {
          dependencyModules.push(mod);
        }
      }
    }
    if (dependencyModules.length > 0) {
      throw new Error(`Cannot resolve dependencies for script ${scriptSrc}. The dependencies are: ${dependencyModules.join(", ")}`);
    }
    if (typeof defineCall.callback === "function") {
      return defineCall.callback(...dependencyObjs) ?? exports;
    } else {
      return defineCall.callback;
    }
  }
  h(scriptSrc) {
    return new Promise((resolve, reject) => {
      const scriptElement = document.createElement("script");
      scriptElement.setAttribute("async", "async");
      scriptElement.setAttribute("type", "text/javascript");
      const unbind = () => {
        scriptElement.removeEventListener("load", loadEventListener);
        scriptElement.removeEventListener("error", errorEventListener);
      };
      const loadEventListener = (e) => {
        unbind();
        resolve(this.c.pop());
      };
      const errorEventListener = (e) => {
        unbind();
        reject(e);
      };
      scriptElement.addEventListener("load", loadEventListener);
      scriptElement.addEventListener("error", errorEventListener);
      if (this.f) {
        scriptSrc = this.f.createScriptURL(scriptSrc);
      }
      scriptElement.setAttribute("src", scriptSrc);
      window.document.getElementsByTagName("head")[0].appendChild(scriptElement);
    });
  }
  async i(scriptSrc) {
    if (this.f) {
      scriptSrc = this.f.createScriptURL(scriptSrc);
    }
    await import(scriptSrc);
    return this.c.pop();
  }
  async j(scriptSrc) {
    try {
      const fs = (await import(`${"fs"}`)).default;
      const vm = (await import(`${"vm"}`)).default;
      const module = (await import(`${"module"}`)).default;
      const filePath = URI.parse(scriptSrc).fsPath;
      const content = fs.readFileSync(filePath).toString();
      const scriptSource = module.wrap(content.replace(/^#!.*/, ""));
      const script = new vm.Script(scriptSource);
      const compileWrapper = script.runInThisContext();
      compileWrapper.apply();
      return this.c.pop();
    } catch (error) {
      throw error;
    }
  }
};
var cache = /* @__PURE__ */ new Map();
async function $PK(nodeModuleName, pathInsideNodeModule, isBuilt) {
  if (isBuilt === void 0) {
    const product = globalThis._VSCODE_PRODUCT_JSON;
    isBuilt = Boolean((product ?? globalThis.vscode?.context?.configuration()?.product)?.commit);
  }
  const nodeModulePath = pathInsideNodeModule ? `${nodeModuleName}/${pathInsideNodeModule}` : nodeModuleName;
  if (cache.has(nodeModulePath)) {
    return cache.get(nodeModulePath);
  }
  let scriptSrc;
  if (/^\w[\w\d+.-]*:\/\//.test(nodeModulePath)) {
    scriptSrc = nodeModulePath;
  } else {
    const useASAR = $OK && isBuilt && !$s;
    const actualNodeModulesPath = useASAR ? $ih : $hh;
    const resourcePath = `${actualNodeModulesPath}/${nodeModulePath}`;
    scriptSrc = $lh.asBrowserUri(resourcePath).toString(true);
  }
  const result = AMDModuleImporter.INSTANCE.load(scriptSrc);
  cache.set(nodeModulePath, result);
  return result;
}

// out-build/vs/base/common/symbols.js
var $lf = Symbol("MicrotaskDelay");

// out-build/vs/base/common/async.js
var $bi = class {
  constructor(runner, delay) {
    this.b = void 0;
    this.a = runner;
    this.d = delay;
    this.f = this.g.bind(this);
  }
  /**
   * Dispose RunOnceScheduler
   */
  dispose() {
    this.cancel();
    this.a = null;
  }
  /**
   * Cancel current scheduled runner (if any).
   */
  cancel() {
    if (this.isScheduled()) {
      clearTimeout(this.b);
      this.b = void 0;
    }
  }
  /**
   * Cancel previous runner (if any) & schedule a new runner.
   */
  schedule(delay = this.d) {
    this.cancel();
    this.b = setTimeout(this.f, delay);
  }
  get delay() {
    return this.d;
  }
  set delay(value) {
    this.d = value;
  }
  /**
   * Returns true if scheduled.
   */
  isScheduled() {
    return this.b !== void 0;
  }
  flush() {
    if (this.isScheduled()) {
      this.cancel();
      this.h();
    }
  }
  g() {
    this.b = void 0;
    if (this.a) {
      this.h();
    }
  }
  h() {
    this.a?.();
  }
};
var $fi;
var $gi;
(function() {
  const safeGlobal = globalThis;
  if (typeof safeGlobal.requestIdleCallback !== "function" || typeof safeGlobal.cancelIdleCallback !== "function") {
    $gi = (_targetWindow, runner, timeout) => {
      $F(() => {
        if (disposed) {
          return;
        }
        const end = Date.now() + 15;
        const deadline = {
          didTimeout: true,
          timeRemaining() {
            return Math.max(0, end - Date.now());
          }
        };
        runner(Object.freeze(deadline));
      });
      let disposed = false;
      return {
        dispose() {
          if (disposed) {
            return;
          }
          disposed = true;
        }
      };
    };
  } else {
    $gi = (targetWindow, runner, timeout) => {
      const handle = targetWindow.requestIdleCallback(runner, typeof timeout === "number" ? { timeout } : void 0);
      let disposed = false;
      return {
        dispose() {
          if (disposed) {
            return;
          }
          disposed = true;
          targetWindow.cancelIdleCallback(handle);
        }
      };
    };
  }
  $fi = (runner, timeout) => $gi(globalThis, runner, timeout);
})();
var DeferredOutcome;
(function(DeferredOutcome2) {
  DeferredOutcome2[DeferredOutcome2["Resolved"] = 0] = "Resolved";
  DeferredOutcome2[DeferredOutcome2["Rejected"] = 1] = "Rejected";
})(DeferredOutcome || (DeferredOutcome = {}));
var $mi = class _$mi {
  static fromPromise(promise) {
    const deferred = new _$mi();
    deferred.settleWith(promise);
    return deferred;
  }
  get isRejected() {
    return this.d?.outcome === 1;
  }
  get isResolved() {
    return this.d?.outcome === 0;
  }
  get isSettled() {
    return !!this.d;
  }
  get value() {
    return this.d?.outcome === 0 ? this.d?.value : void 0;
  }
  constructor() {
    this.p = new Promise((c, e) => {
      this.a = c;
      this.b = e;
    });
  }
  complete(value) {
    if (this.isSettled) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.a(value);
      this.d = { outcome: 0, value };
      resolve();
    });
  }
  error(err) {
    if (this.isSettled) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.b(err);
      this.d = { outcome: 1, value: err };
      resolve();
    });
  }
  settleWith(promise) {
    return promise.then((value) => this.complete(value), (error) => this.error(error));
  }
  cancel() {
    return this.error(new $tb());
  }
};
var Promises;
(function(Promises2) {
  async function settled(promises) {
    let firstError = void 0;
    const result = await Promise.all(promises.map((promise) => promise.then((value) => value, (error) => {
      if (!firstError) {
        firstError = error;
      }
      return void 0;
    })));
    if (typeof firstError !== "undefined") {
      throw firstError;
    }
    return result;
  }
  Promises2.settled = settled;
  function withAsyncBody(bodyFn) {
    return new Promise(async (resolve, reject) => {
      try {
        await bodyFn(resolve, reject);
      } catch (error) {
        reject(error);
      }
    });
  }
  Promises2.withAsyncBody = withAsyncBody;
})(Promises || (Promises = {}));
var AsyncIterableSourceState;
(function(AsyncIterableSourceState2) {
  AsyncIterableSourceState2[AsyncIterableSourceState2["Initial"] = 0] = "Initial";
  AsyncIterableSourceState2[AsyncIterableSourceState2["DoneOK"] = 1] = "DoneOK";
  AsyncIterableSourceState2[AsyncIterableSourceState2["DoneError"] = 2] = "DoneError";
})(AsyncIterableSourceState || (AsyncIterableSourceState = {}));
var $pi = class _$pi {
  static fromArray(items) {
    return new _$pi((writer) => {
      writer.emitMany(items);
    });
  }
  static fromPromise(promise) {
    return new _$pi(async (emitter) => {
      emitter.emitMany(await promise);
    });
  }
  static fromPromisesResolveOrder(promises) {
    return new _$pi(async (emitter) => {
      await Promise.all(promises.map(async (p) => emitter.emitOne(await p)));
    });
  }
  static merge(iterables) {
    return new _$pi(async (emitter) => {
      await Promise.all(iterables.map(async (iterable) => {
        for await (const item of iterable) {
          emitter.emitOne(item);
        }
      }));
    });
  }
  static {
    this.EMPTY = _$pi.fromArray([]);
  }
  constructor(executor, onReturn) {
    this.a = 0;
    this.b = [];
    this.d = null;
    this.f = onReturn;
    this.g = new $qf();
    queueMicrotask(async () => {
      const writer = {
        emitOne: (item) => this.h(item),
        emitMany: (items) => this.j(items),
        reject: (error) => this.l(error)
      };
      try {
        await Promise.resolve(executor(writer));
        this.k();
      } catch (err) {
        this.l(err);
      } finally {
        writer.emitOne = void 0;
        writer.emitMany = void 0;
        writer.reject = void 0;
      }
    });
  }
  [Symbol.asyncIterator]() {
    let i = 0;
    return {
      next: async () => {
        do {
          if (this.a === 2) {
            throw this.d;
          }
          if (i < this.b.length) {
            return { done: false, value: this.b[i++] };
          }
          if (this.a === 1) {
            return { done: true, value: void 0 };
          }
          await Event.toPromise(this.g.event);
        } while (true);
      },
      return: async () => {
        this.f?.();
        return { done: true, value: void 0 };
      }
    };
  }
  static map(iterable, mapFn) {
    return new _$pi(async (emitter) => {
      for await (const item of iterable) {
        emitter.emitOne(mapFn(item));
      }
    });
  }
  map(mapFn) {
    return _$pi.map(this, mapFn);
  }
  static filter(iterable, filterFn) {
    return new _$pi(async (emitter) => {
      for await (const item of iterable) {
        if (filterFn(item)) {
          emitter.emitOne(item);
        }
      }
    });
  }
  filter(filterFn) {
    return _$pi.filter(this, filterFn);
  }
  static coalesce(iterable) {
    return _$pi.filter(iterable, (item) => !!item);
  }
  coalesce() {
    return _$pi.coalesce(this);
  }
  static async toPromise(iterable) {
    const result = [];
    for await (const item of iterable) {
      result.push(item);
    }
    return result;
  }
  toPromise() {
    return _$pi.toPromise(this);
  }
  /**
   * The value will be appended at the end.
   *
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  h(value) {
    if (this.a !== 0) {
      return;
    }
    this.b.push(value);
    this.g.fire();
  }
  /**
   * The values will be appended at the end.
   *
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  j(values) {
    if (this.a !== 0) {
      return;
    }
    this.b = this.b.concat(values);
    this.g.fire();
  }
  /**
   * Calling `resolve()` will mark the result array as complete.
   *
   * **NOTE** `resolve()` must be called, otherwise all consumers of this iterable will hang indefinitely, similar to a non-resolved promise.
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  k() {
    if (this.a !== 0) {
      return;
    }
    this.a = 1;
    this.g.fire();
  }
  /**
   * Writing an error will permanently invalidate this iterable.
   * The current users will receive an error thrown, as will all future users.
   *
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  l(error) {
    if (this.a !== 0) {
      return;
    }
    this.a = 2;
    this.d = error;
    this.g.fire();
  }
};
var ProducerConsumer = class {
  constructor() {
    this.a = [];
    this.b = [];
  }
  get hasFinalValue() {
    return !!this.d;
  }
  produce(value) {
    this.f();
    if (this.a.length > 0) {
      const deferred = this.a.shift();
      this.g(deferred, value);
    } else {
      this.b.push(value);
    }
  }
  produceFinal(value) {
    this.f();
    this.d = value;
    for (const deferred of this.a) {
      this.g(deferred, value);
    }
    this.a.length = 0;
  }
  f() {
    if (this.d) {
      throw new $Eb("ProducerConsumer: cannot produce after final value has been set");
    }
  }
  g(deferred, value) {
    if (value.ok) {
      deferred.complete(value.value);
    } else {
      deferred.error(value.error);
    }
  }
  consume() {
    if (this.b.length > 0 || this.d) {
      const value = this.b.length > 0 ? this.b.shift() : this.d;
      if (value.ok) {
        return Promise.resolve(value.value);
      } else {
        return Promise.reject(value.error);
      }
    } else {
      const deferred = new $mi();
      this.a.push(deferred);
      return deferred.p;
    }
  }
};
var $ti = class _$ti {
  constructor(executor, b) {
    this.b = b;
    this.a = new ProducerConsumer();
    this.g = {
      next: () => this.a.consume(),
      return: () => {
        this.b?.();
        return Promise.resolve({ done: true, value: void 0 });
      },
      throw: async (e) => {
        this.f(e);
        return { done: true, value: void 0 };
      }
    };
    queueMicrotask(async () => {
      const p = executor({
        emitOne: (value) => this.a.produce({ ok: true, value: { done: false, value } }),
        emitMany: (values) => {
          for (const value of values) {
            this.a.produce({ ok: true, value: { done: false, value } });
          }
        },
        reject: (error) => this.f(error)
      });
      if (!this.a.hasFinalValue) {
        try {
          await p;
          this.d();
        } catch (error) {
          this.f(error);
        }
      }
    });
  }
  static fromArray(items) {
    return new _$ti((writer) => {
      writer.emitMany(items);
    });
  }
  static fromPromise(promise) {
    return new _$ti(async (emitter) => {
      emitter.emitMany(await promise);
    });
  }
  static fromPromisesResolveOrder(promises) {
    return new _$ti(async (emitter) => {
      await Promise.all(promises.map(async (p) => emitter.emitOne(await p)));
    });
  }
  static merge(iterables) {
    return new _$ti(async (emitter) => {
      await Promise.all(iterables.map(async (iterable) => {
        for await (const item of iterable) {
          emitter.emitOne(item);
        }
      }));
    });
  }
  static {
    this.EMPTY = _$ti.fromArray([]);
  }
  static map(iterable, mapFn) {
    return new _$ti(async (emitter) => {
      for await (const item of iterable) {
        emitter.emitOne(mapFn(item));
      }
    });
  }
  static tee(iterable) {
    let emitter1;
    let emitter2;
    const defer = new $mi();
    const start = async () => {
      if (!emitter1 || !emitter2) {
        return;
      }
      try {
        for await (const item of iterable) {
          emitter1.emitOne(item);
          emitter2.emitOne(item);
        }
      } catch (err) {
        emitter1.reject(err);
        emitter2.reject(err);
      } finally {
        defer.complete();
      }
    };
    const p1 = new _$ti(async (emitter) => {
      emitter1 = emitter;
      start();
      return defer.p;
    });
    const p2 = new _$ti(async (emitter) => {
      emitter2 = emitter;
      start();
      return defer.p;
    });
    return [p1, p2];
  }
  map(mapFn) {
    return _$ti.map(this, mapFn);
  }
  static coalesce(iterable) {
    return _$ti.filter(iterable, (item) => !!item);
  }
  coalesce() {
    return _$ti.coalesce(this);
  }
  static filter(iterable, filterFn) {
    return new _$ti(async (emitter) => {
      for await (const item of iterable) {
        if (filterFn(item)) {
          emitter.emitOne(item);
        }
      }
    });
  }
  filter(filterFn) {
    return _$ti.filter(this, filterFn);
  }
  d() {
    if (!this.a.hasFinalValue) {
      this.a.produceFinal({ ok: true, value: { done: true, value: void 0 } });
    }
  }
  f(error) {
    if (!this.a.hasFinalValue) {
      this.a.produceFinal({ ok: false, error });
    }
  }
  [Symbol.asyncIterator]() {
    return this.g;
  }
};
var $vi = Symbol("AsyncReaderEndOfStream");

// out-build/vs/base/common/observableInternal/debugName.js
var $Zd = class {
  constructor(owner, debugNameSource, referenceFn) {
    this.owner = owner;
    this.debugNameSource = debugNameSource;
    this.referenceFn = referenceFn;
  }
  getDebugName(target) {
    return $1d(target, this);
  }
};
var countPerName = /* @__PURE__ */ new Map();
var cachedDebugName = /* @__PURE__ */ new WeakMap();
function $1d(target, data) {
  const cached = cachedDebugName.get(target);
  if (cached) {
    return cached;
  }
  const dbgName = computeDebugName(target, data);
  if (dbgName) {
    let count = countPerName.get(dbgName) ?? 0;
    count++;
    countPerName.set(dbgName, count);
    const result = count === 1 ? dbgName : `${dbgName}#${count}`;
    cachedDebugName.set(target, result);
    return result;
  }
  return void 0;
}
function computeDebugName(self2, data) {
  const cached = cachedDebugName.get(self2);
  if (cached) {
    return cached;
  }
  const ownerStr = data.owner ? formatOwner(data.owner) + `.` : "";
  let result;
  const debugNameSource = data.debugNameSource;
  if (debugNameSource !== void 0) {
    if (typeof debugNameSource === "function") {
      result = debugNameSource();
      if (result !== void 0) {
        return ownerStr + result;
      }
    } else {
      return ownerStr + debugNameSource;
    }
  }
  const referenceFn = data.referenceFn;
  if (referenceFn !== void 0) {
    result = $3d(referenceFn);
    if (result !== void 0) {
      return ownerStr + result;
    }
  }
  if (data.owner !== void 0) {
    const key = findKey(data.owner, self2);
    if (key !== void 0) {
      return ownerStr + key;
    }
  }
  return void 0;
}
function findKey(obj, value) {
  for (const key in obj) {
    if (obj[key] === value) {
      return key;
    }
  }
  return void 0;
}
var countPerClassName = /* @__PURE__ */ new Map();
var ownerId = /* @__PURE__ */ new WeakMap();
function formatOwner(owner) {
  const id2 = ownerId.get(owner);
  if (id2) {
    return id2;
  }
  const className = $2d(owner) ?? "Object";
  let count = countPerClassName.get(className) ?? 0;
  count++;
  countPerClassName.set(className, count);
  const result = count === 1 ? className : `${className}#${count}`;
  ownerId.set(owner, result);
  return result;
}
function $2d(obj) {
  const ctor = obj.constructor;
  if (ctor) {
    if (ctor.name === "Object") {
      return void 0;
    }
    return ctor.name;
  }
  return void 0;
}
function $3d(fn) {
  const fnSrc = fn.toString();
  const regexp = /\/\*\*\s*@description\s*([^*]*)\*\//;
  const match = regexp.exec(fnSrc);
  const result = match ? match[1] : void 0;
  return result?.trim();
}

// out-build/vs/base/common/equals.js
var $Rd = (a, b) => a === b;

// out-build/vs/base/common/observableInternal/base.js
function $Yd(message) {
  const err = new Error("BugIndicatingErrorRecovery: " + message);
  $nb(err);
  console.error("recovered from an error that indicates a bug", err);
}

// out-build/vs/base/common/observableInternal/logging/logging.js
var globalObservableLogger;
function $Je(logger) {
  if (!globalObservableLogger) {
    globalObservableLogger = logger;
  } else if (globalObservableLogger instanceof ComposedLogger) {
    globalObservableLogger.loggers.push(logger);
  } else {
    globalObservableLogger = new ComposedLogger([globalObservableLogger, logger]);
  }
}
function $Ke() {
  return globalObservableLogger;
}
var globalObservableLoggerFn = void 0;
function $Le(fn) {
  globalObservableLoggerFn = fn;
}
function $Me(obs) {
  if (globalObservableLoggerFn) {
    globalObservableLoggerFn(obs);
  }
}
var ComposedLogger = class {
  constructor(loggers) {
    this.loggers = loggers;
  }
  handleObservableCreated(observable, location) {
    for (const logger of this.loggers) {
      logger.handleObservableCreated(observable, location);
    }
  }
  handleOnListenerCountChanged(observable, newCount) {
    for (const logger of this.loggers) {
      logger.handleOnListenerCountChanged(observable, newCount);
    }
  }
  handleObservableUpdated(observable, info) {
    for (const logger of this.loggers) {
      logger.handleObservableUpdated(observable, info);
    }
  }
  handleAutorunCreated(autorun, location) {
    for (const logger of this.loggers) {
      logger.handleAutorunCreated(autorun, location);
    }
  }
  handleAutorunDisposed(autorun) {
    for (const logger of this.loggers) {
      logger.handleAutorunDisposed(autorun);
    }
  }
  handleAutorunDependencyChanged(autorun, observable, change) {
    for (const logger of this.loggers) {
      logger.handleAutorunDependencyChanged(autorun, observable, change);
    }
  }
  handleAutorunStarted(autorun) {
    for (const logger of this.loggers) {
      logger.handleAutorunStarted(autorun);
    }
  }
  handleAutorunFinished(autorun) {
    for (const logger of this.loggers) {
      logger.handleAutorunFinished(autorun);
    }
  }
  handleDerivedDependencyChanged(derived, observable, change) {
    for (const logger of this.loggers) {
      logger.handleDerivedDependencyChanged(derived, observable, change);
    }
  }
  handleDerivedCleared(observable) {
    for (const logger of this.loggers) {
      logger.handleDerivedCleared(observable);
    }
  }
  handleBeginTransaction(transaction) {
    for (const logger of this.loggers) {
      logger.handleBeginTransaction(transaction);
    }
  }
  handleEndTransaction(transaction) {
    for (const logger of this.loggers) {
      logger.handleEndTransaction(transaction);
    }
  }
};

// out-build/vs/base/common/observableInternal/transaction.js
function $Ne(fn, getDebugName) {
  const tx = new $Re(fn, getDebugName);
  try {
    fn(tx);
  } finally {
    tx.finish();
  }
}
function $Qe(tx, fn, getDebugName) {
  if (!tx) {
    $Ne(fn, getDebugName);
  } else {
    fn(tx);
  }
}
var $Re = class {
  constructor(_fn, b) {
    this._fn = _fn;
    this.b = b;
    this.a = [];
    $Ke()?.handleBeginTransaction(this);
  }
  getDebugName() {
    if (this.b) {
      return this.b();
    }
    return $3d(this._fn);
  }
  updateObserver(observer, observable) {
    if (!this.a) {
      $Yd("Transaction already finished!");
      $Ne((tx) => {
        tx.updateObserver(observer, observable);
      });
      return;
    }
    this.a.push({ observer, observable });
    observer.beginUpdate(observable);
  }
  finish() {
    const updatingObservers = this.a;
    if (!updatingObservers) {
      $Yd("transaction.finish() has already been called!");
      return;
    }
    for (let i = 0; i < updatingObservers.length; i++) {
      const { observer, observable } = updatingObservers[i];
      observer.endUpdate(observable);
    }
    this.a = null;
    $Ke()?.handleEndTransaction(this);
  }
  debugGetUpdatingObservers() {
    return this.a;
  }
};

// out-build/vs/base/common/observableInternal/debugLocation.js
var DebugLocation;
(function(DebugLocation2) {
  let enabled = false;
  function enable() {
    enabled = true;
  }
  DebugLocation2.enable = enable;
  function ofCaller() {
    if (!enabled) {
      return void 0;
    }
    const Err = Error;
    const l = Err.stackTraceLimit;
    Err.stackTraceLimit = 3;
    const stack = new Error().stack;
    Err.stackTraceLimit = l;
    return DebugLocationImpl.fromStack(stack, 2);
  }
  DebugLocation2.ofCaller = ofCaller;
})(DebugLocation || (DebugLocation = {}));
var DebugLocationImpl = class _DebugLocationImpl {
  static fromStack(stack, parentIdx) {
    const lines = stack.split("\n");
    const location = parseLine(lines[parentIdx + 1]);
    if (location) {
      return new _DebugLocationImpl(location.fileName, location.line, location.column, location.id);
    } else {
      return void 0;
    }
  }
  constructor(fileName, line, column, id2) {
    this.fileName = fileName;
    this.line = line;
    this.column = column;
    this.id = id2;
  }
};
function parseLine(stackLine) {
  const match = stackLine.match(/\((.*):(\d+):(\d+)\)/);
  if (match) {
    return {
      fileName: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      id: stackLine
    };
  }
  const match2 = stackLine.match(/at ([^\(\)]*):(\d+):(\d+)/);
  if (match2) {
    return {
      fileName: match2[1],
      line: parseInt(match2[2]),
      column: parseInt(match2[3]),
      id: stackLine
    };
  }
  return void 0;
}

// out-build/vs/base/common/observableInternal/observables/baseObservable.js
var _derived;
function $Be(derived) {
  _derived = derived;
}
var _recomputeInitiallyAndOnChange;
function $Ce(recomputeInitiallyAndOnChange) {
  _recomputeInitiallyAndOnChange = recomputeInitiallyAndOnChange;
}
var _keepObserved;
function $De(keepObserved) {
  _keepObserved = keepObserved;
}
var _debugGetObservableGraph;
function $Ee(debugGetObservableGraph) {
  _debugGetObservableGraph = debugGetObservableGraph;
}
var $Fe = class {
  get TChange() {
    return null;
  }
  reportChanges() {
    this.get();
  }
  /** @sealed */
  read(reader) {
    if (reader) {
      return reader.readObservable(this);
    } else {
      return this.get();
    }
  }
  map(fnOrOwner, fnOrUndefined, debugLocation = DebugLocation.ofCaller()) {
    const owner = fnOrUndefined === void 0 ? void 0 : fnOrOwner;
    const fn = fnOrUndefined === void 0 ? fnOrOwner : fnOrUndefined;
    return _derived({
      owner,
      debugName: () => {
        const name = $3d(fn);
        if (name !== void 0) {
          return name;
        }
        const regexp = /^\s*\(?\s*([a-zA-Z_$][a-zA-Z_$0-9]*)\s*\)?\s*=>\s*\1(?:\??)\.([a-zA-Z_$][a-zA-Z_$0-9]*)\s*$/;
        const match = regexp.exec(fn.toString());
        if (match) {
          return `${this.debugName}.${match[2]}`;
        }
        if (!owner) {
          return `${this.debugName} (mapped)`;
        }
        return void 0;
      },
      debugReferenceFn: fn
    }, (reader) => fn(this.read(reader), reader), debugLocation);
  }
  /**
   * @sealed
   * Converts an observable of an observable value into a direct observable of the value.
  */
  flatten() {
    return _derived({
      owner: void 0,
      debugName: () => `${this.debugName} (flattened)`
    }, (reader) => this.read(reader).read(reader));
  }
  recomputeInitiallyAndOnChange(store, handleValue) {
    store.add(_recomputeInitiallyAndOnChange(this, handleValue));
    return this;
  }
  /**
   * Ensures that this observable is observed. This keeps the cache alive.
   * However, in case of deriveds, it does not force eager evaluation (only when the value is read/get).
   * Use `recomputeInitiallyAndOnChange` for eager evaluation.
   */
  keepObserved(store) {
    store.add(_keepObserved(this));
    return this;
  }
  get b() {
    return this.get();
  }
  get debug() {
    return new DebugHelper(this);
  }
};
var DebugHelper = class {
  constructor(observable) {
    this.observable = observable;
  }
  getDependencyGraph() {
    return _debugGetObservableGraph(this.observable, { type: "dependencies" });
  }
  getObserverGraph() {
    return _debugGetObservableGraph(this.observable, { type: "observers" });
  }
};
var $Ge = class extends $Fe {
  constructor(debugLocation) {
    super();
    this.f = /* @__PURE__ */ new Set();
    $Ke()?.handleObservableCreated(this, debugLocation);
  }
  addObserver(observer) {
    const len = this.f.size;
    this.f.add(observer);
    if (len === 0) {
      this.g();
    }
    if (len !== this.f.size) {
      $Ke()?.handleOnListenerCountChanged(this, this.f.size);
    }
  }
  removeObserver(observer) {
    const deleted = this.f.delete(observer);
    if (deleted && this.f.size === 0) {
      this.h();
    }
    if (deleted) {
      $Ke()?.handleOnListenerCountChanged(this, this.f.size);
    }
  }
  g() {
  }
  h() {
  }
  log() {
    const hadLogger = !!$Ke();
    $Me(this);
    if (!hadLogger) {
      $Ke()?.handleObservableCreated(this, DebugLocation.ofCaller());
    }
    return this;
  }
  debugGetObservers() {
    return this.f;
  }
};

// out-build/vs/base/common/observableInternal/observables/observableValue.js
function $Se(nameOrOwner, initialValue, debugLocation = DebugLocation.ofCaller()) {
  let debugNameData;
  if (typeof nameOrOwner === "string") {
    debugNameData = new $Zd(void 0, nameOrOwner, void 0);
  } else {
    debugNameData = new $Zd(nameOrOwner, void 0, void 0);
  }
  return new $Te(debugNameData, initialValue, $Rd, debugLocation);
}
var $Te = class extends $Ge {
  get debugName() {
    return this.c.getDebugName(this) ?? "ObservableValue";
  }
  constructor(c, initialValue, d, debugLocation) {
    super(debugLocation);
    this.c = c;
    this.d = d;
    this.a = initialValue;
    $Ke()?.handleObservableUpdated(this, { hadValue: false, newValue: initialValue, change: void 0, didChange: true, oldValue: void 0 });
  }
  get() {
    return this.a;
  }
  set(value, tx, change) {
    if (change === void 0 && this.d(this.a, value)) {
      return;
    }
    let _tx;
    if (!tx) {
      tx = _tx = new $Re(() => {
      }, () => `Setting ${this.debugName}`);
    }
    try {
      const oldValue = this.a;
      this.i(value);
      $Ke()?.handleObservableUpdated(this, { oldValue, newValue: value, change, didChange: true, hadValue: true });
      for (const observer of this.f) {
        tx.updateObserver(observer, this);
        observer.handleChange(this, change);
      }
    } finally {
      if (_tx) {
        _tx.finish();
      }
    }
  }
  toString() {
    return `${this.debugName}: ${this.a}`;
  }
  i(newValue) {
    this.a = newValue;
  }
  debugGetState() {
    return {
      value: this.a
    };
  }
  debugSetValue(value) {
    this.a = value;
  }
};

// out-build/vs/base/common/observableInternal/reactions/autorunImpl.js
var AutorunState;
(function(AutorunState2) {
  AutorunState2[AutorunState2["dependenciesMightHaveChanged"] = 1] = "dependenciesMightHaveChanged";
  AutorunState2[AutorunState2["stale"] = 2] = "stale";
  AutorunState2[AutorunState2["upToDate"] = 3] = "upToDate";
})(AutorunState || (AutorunState = {}));
function autorunStateToString(state) {
  switch (state) {
    case 1:
      return "dependenciesMightHaveChanged";
    case 2:
      return "stale";
    case 3:
      return "upToDate";
    default:
      return "<unknown>";
  }
}
var $6d = class {
  get debugName() {
    return this._debugNameData.getDebugName(this) ?? "(anonymous)";
  }
  constructor(_debugNameData, _runFn, j, debugLocation) {
    this._debugNameData = _debugNameData;
    this._runFn = _runFn;
    this.j = j;
    this.a = 2;
    this.b = 0;
    this.c = false;
    this.f = /* @__PURE__ */ new Set();
    this.g = /* @__PURE__ */ new Set();
    this.i = false;
    this.n = void 0;
    this.p = void 0;
    this.h = this.j?.createChangeSummary(void 0);
    $Ke()?.handleAutorunCreated(this, debugLocation);
    this.k();
    $wd(this);
  }
  dispose() {
    if (this.c) {
      return;
    }
    this.c = true;
    for (const o of this.f) {
      o.removeObserver(this);
    }
    this.f.clear();
    if (this.n !== void 0) {
      this.n.dispose();
    }
    if (this.p !== void 0) {
      this.p.dispose();
    }
    $Ke()?.handleAutorunDisposed(this);
    $xd(this);
  }
  k() {
    const emptySet = this.g;
    this.g = this.f;
    this.f = emptySet;
    this.a = 3;
    try {
      if (!this.c) {
        $Ke()?.handleAutorunStarted(this);
        const changeSummary = this.h;
        const delayedStore = this.p;
        if (delayedStore !== void 0) {
          this.p = void 0;
        }
        try {
          this.i = true;
          if (this.j) {
            this.j.beforeUpdate?.(this, changeSummary);
            this.h = this.j.createChangeSummary(changeSummary);
          }
          if (this.n !== void 0) {
            this.n.dispose();
            this.n = void 0;
          }
          this._runFn(this, changeSummary);
        } catch (e) {
          $mb(e);
        } finally {
          this.i = false;
          if (delayedStore !== void 0) {
            delayedStore.dispose();
          }
        }
      }
    } finally {
      if (!this.c) {
        $Ke()?.handleAutorunFinished(this);
      }
      for (const o of this.g) {
        o.removeObserver(this);
      }
      this.g.clear();
    }
  }
  toString() {
    return `Autorun<${this.debugName}>`;
  }
  // IObserver implementation
  beginUpdate(_observable) {
    if (this.a === 3) {
      this.a = 1;
    }
    this.b++;
  }
  endUpdate(_observable) {
    try {
      if (this.b === 1) {
        do {
          if (this.a === 1) {
            this.a = 3;
            for (const d of this.f) {
              d.reportChanges();
              if (this.a === 2) {
                break;
              }
            }
          }
          if (this.a !== 3) {
            this.k();
          }
        } while (this.a !== 3);
      }
    } finally {
      this.b--;
    }
    $5c(() => this.b >= 0);
  }
  handlePossibleChange(observable) {
    if (this.a === 3 && this.l(observable)) {
      this.a = 1;
    }
  }
  handleChange(observable, change) {
    if (this.l(observable)) {
      $Ke()?.handleAutorunDependencyChanged(this, observable, change);
      try {
        const shouldReact = this.j ? this.j.handleChange({
          changedObservable: observable,
          change,
          // eslint-disable-next-line local/code-no-any-casts
          didChange: (o) => o === observable
        }, this.h) : true;
        if (shouldReact) {
          this.a = 2;
        }
      } catch (e) {
        $mb(e);
      }
    }
  }
  l(observable) {
    return this.f.has(observable) && !this.g.has(observable);
  }
  // IReader implementation
  m() {
    if (!this.i) {
      throw new $Eb("The reader object cannot be used outside its compute function!");
    }
  }
  readObservable(observable) {
    this.m();
    if (this.c) {
      return observable.get();
    }
    observable.addObserver(this);
    const value = observable.get();
    this.f.add(observable);
    this.g.delete(observable);
    return value;
  }
  get store() {
    this.m();
    if (this.c) {
      throw new $Eb("Cannot access store after dispose");
    }
    if (this.n === void 0) {
      this.n = new $Ed();
    }
    return this.n;
  }
  get delayedStore() {
    this.m();
    if (this.c) {
      throw new $Eb("Cannot access store after dispose");
    }
    if (this.p === void 0) {
      this.p = new $Ed();
    }
    return this.p;
  }
  debugGetState() {
    return {
      isRunning: this.i,
      updateCount: this.b,
      dependencies: this.f,
      state: this.a,
      stateStr: autorunStateToString(this.a)
    };
  }
  debugRerun() {
    if (!this.i) {
      this.k();
    } else {
      this.a = 2;
    }
  }
};

// out-build/vs/base/common/observableInternal/observables/derivedImpl.js
var DerivedState;
(function(DerivedState2) {
  DerivedState2[DerivedState2["initial"] = 0] = "initial";
  DerivedState2[DerivedState2["dependenciesMightHaveChanged"] = 1] = "dependenciesMightHaveChanged";
  DerivedState2[DerivedState2["stale"] = 2] = "stale";
  DerivedState2[DerivedState2["upToDate"] = 3] = "upToDate";
})(DerivedState || (DerivedState = {}));
function derivedStateToString(state) {
  switch (state) {
    case 0:
      return "initial";
    case 1:
      return "dependenciesMightHaveChanged";
    case 2:
      return "stale";
    case 3:
      return "upToDate";
    default:
      return "<unknown>";
  }
}
var $He = class extends $Ge {
  get debugName() {
    return this._debugNameData.getDebugName(this) ?? "(anonymous)";
  }
  constructor(_debugNameData, _computeFn, w, x = void 0, y, debugLocation) {
    super(debugLocation);
    this._debugNameData = _debugNameData;
    this._computeFn = _computeFn;
    this.w = w;
    this.x = x;
    this.y = y;
    this.a = 0;
    this.c = void 0;
    this.i = 0;
    this.j = /* @__PURE__ */ new Set();
    this.k = /* @__PURE__ */ new Set();
    this.l = void 0;
    this.m = false;
    this.n = false;
    this.p = false;
    this.q = false;
    this.s = false;
    this.t = void 0;
    this.u = void 0;
    this.v = null;
    this.l = this.w?.createChangeSummary(void 0);
  }
  h() {
    this.a = 0;
    this.c = void 0;
    $Ke()?.handleDerivedCleared(this);
    for (const d of this.j) {
      d.removeObserver(this);
    }
    this.j.clear();
    if (this.t !== void 0) {
      this.t.dispose();
      this.t = void 0;
    }
    if (this.u !== void 0) {
      this.u.dispose();
      this.u = void 0;
    }
    this.x?.();
  }
  get() {
    const checkEnabled = false;
    if (this.n && checkEnabled) {
      throw new $Eb("Cyclic deriveds are not supported yet!");
    }
    if (this.f.size === 0) {
      let result;
      try {
        this.s = true;
        let changeSummary = void 0;
        if (this.w) {
          changeSummary = this.w.createChangeSummary(void 0);
          this.w.beforeUpdate?.(this, changeSummary);
        }
        result = this._computeFn(this, changeSummary);
      } finally {
        this.s = false;
      }
      this.h();
      return result;
    } else {
      do {
        if (this.a === 1) {
          for (const d of this.j) {
            d.reportChanges();
            if (this.a === 2) {
              break;
            }
          }
        }
        if (this.a === 1) {
          this.a = 3;
        }
        if (this.a !== 3) {
          this.A();
        }
      } while (this.a !== 3);
      return this.c;
    }
  }
  A() {
    let didChange = false;
    this.n = true;
    this.p = false;
    const emptySet = this.k;
    this.k = this.j;
    this.j = emptySet;
    try {
      const changeSummary = this.l;
      this.s = true;
      if (this.w) {
        this.q = true;
        this.w.beforeUpdate?.(this, changeSummary);
        this.q = false;
        this.l = this.w?.createChangeSummary(changeSummary);
      }
      const hadValue = this.a !== 0;
      const oldValue = this.c;
      this.a = 3;
      const delayedStore = this.u;
      if (delayedStore !== void 0) {
        this.u = void 0;
      }
      try {
        if (this.t !== void 0) {
          this.t.dispose();
          this.t = void 0;
        }
        this.c = this._computeFn(this, changeSummary);
      } finally {
        this.s = false;
        for (const o of this.k) {
          o.removeObserver(this);
        }
        this.k.clear();
        if (delayedStore !== void 0) {
          delayedStore.dispose();
        }
      }
      didChange = this.p || hadValue && !this.y(oldValue, this.c);
      $Ke()?.handleObservableUpdated(this, {
        oldValue,
        newValue: this.c,
        change: void 0,
        didChange,
        hadValue
      });
    } catch (e) {
      $mb(e);
    }
    this.n = false;
    if (!this.p && didChange) {
      for (const r of this.f) {
        r.handleChange(this, void 0);
      }
    } else {
      this.p = false;
    }
  }
  toString() {
    return `LazyDerived<${this.debugName}>`;
  }
  // IObserver Implementation
  beginUpdate(_observable) {
    if (this.m) {
      throw new $Eb("Cyclic deriveds are not supported yet!");
    }
    this.i++;
    this.m = true;
    try {
      const propagateBeginUpdate = this.i === 1;
      if (this.a === 3) {
        this.a = 1;
        if (!propagateBeginUpdate) {
          for (const r of this.f) {
            r.handlePossibleChange(this);
          }
        }
      }
      if (propagateBeginUpdate) {
        for (const r of this.f) {
          r.beginUpdate(this);
        }
      }
    } finally {
      this.m = false;
    }
  }
  endUpdate(_observable) {
    this.i--;
    if (this.i === 0) {
      const observers = [...this.f];
      for (const r of observers) {
        r.endUpdate(this);
      }
      if (this.v) {
        const observers2 = [...this.v];
        this.v = null;
        for (const r of observers2) {
          r.endUpdate(this);
        }
      }
    }
    $5c(() => this.i >= 0);
  }
  handlePossibleChange(observable) {
    if (this.a === 3 && this.j.has(observable) && !this.k.has(observable)) {
      this.a = 1;
      for (const r of this.f) {
        r.handlePossibleChange(this);
      }
    }
  }
  handleChange(observable, change) {
    if (this.j.has(observable) && !this.k.has(observable) || this.q) {
      $Ke()?.handleDerivedDependencyChanged(this, observable, change);
      let shouldReact = false;
      try {
        shouldReact = this.w ? this.w.handleChange({
          changedObservable: observable,
          change,
          // eslint-disable-next-line local/code-no-any-casts
          didChange: (o) => o === observable
        }, this.l) : true;
      } catch (e) {
        $mb(e);
      }
      const wasUpToDate = this.a === 3;
      if (shouldReact && (this.a === 1 || wasUpToDate)) {
        this.a = 2;
        if (wasUpToDate) {
          for (const r of this.f) {
            r.handlePossibleChange(this);
          }
        }
      }
    }
  }
  // IReader Implementation
  B() {
    if (!this.s) {
      throw new $Eb("The reader object cannot be used outside its compute function!");
    }
  }
  readObservable(observable) {
    this.B();
    observable.addObserver(this);
    const value = observable.get();
    this.j.add(observable);
    this.k.delete(observable);
    return value;
  }
  reportChange(change) {
    this.B();
    this.p = true;
    for (const r of this.f) {
      r.handleChange(this, change);
    }
  }
  get store() {
    this.B();
    if (this.t === void 0) {
      this.t = new $Ed();
    }
    return this.t;
  }
  get delayedStore() {
    this.B();
    if (this.u === void 0) {
      this.u = new $Ed();
    }
    return this.u;
  }
  addObserver(observer) {
    const shouldCallBeginUpdate = !this.f.has(observer) && this.i > 0;
    super.addObserver(observer);
    if (shouldCallBeginUpdate) {
      if (this.v && this.v.has(observer)) {
        this.v.delete(observer);
      } else {
        observer.beginUpdate(this);
      }
    }
  }
  removeObserver(observer) {
    if (this.f.has(observer) && this.i > 0) {
      if (!this.v) {
        this.v = /* @__PURE__ */ new Set();
      }
      this.v.add(observer);
    }
    super.removeObserver(observer);
  }
  debugGetState() {
    return {
      state: this.a,
      stateStr: derivedStateToString(this.a),
      updateCount: this.i,
      isComputing: this.n,
      dependencies: this.j,
      value: this.c
    };
  }
  debugSetValue(newValue) {
    this.c = newValue;
  }
  debugRecompute() {
    if (!this.n) {
      this.A();
    } else {
      this.a = 2;
    }
  }
  setValue(newValue, tx, change) {
    this.c = newValue;
    const observers = this.f;
    tx.updateObserver(this, this);
    for (const d of observers) {
      d.handleChange(this, change);
    }
  }
};

// out-build/vs/base/common/observableInternal/observables/derived.js
function $le(options, computeFn, debugLocation = DebugLocation.ofCaller()) {
  return new $He(new $Zd(options.owner, options.debugName, options.debugReferenceFn), computeFn, void 0, options.onLastObserverRemoved, options.equalsFn ?? $Rd, debugLocation);
}
$Be($le);

// out-build/vs/base/common/observableInternal/observables/observableFromEvent.js
function $7d(...args) {
  let owner;
  let event;
  let getValue;
  let debugLocation;
  if (args.length === 2) {
    [event, getValue] = args;
  } else {
    [owner, event, getValue, debugLocation] = args;
  }
  return new $9d(new $Zd(owner, void 0, getValue), event, getValue, () => $9d.globalTransaction, $Rd, debugLocation ?? DebugLocation.ofCaller());
}
var $9d = class extends $Ge {
  constructor(e, i, _getValue, j, k, debugLocation) {
    super(debugLocation);
    this.e = e;
    this.i = i;
    this._getValue = _getValue;
    this.j = j;
    this.k = k;
    this.c = false;
    this.n = (args) => {
      const newValue = this._getValue(args);
      const oldValue = this.a;
      const didChange = !this.c || !this.k(oldValue, newValue);
      let didRunTransaction = false;
      if (didChange) {
        this.a = newValue;
        if (this.c) {
          didRunTransaction = true;
          $Qe(this.j(), (tx) => {
            $Ke()?.handleObservableUpdated(this, { oldValue, newValue, change: void 0, didChange, hadValue: this.c });
            for (const o of this.f) {
              tx.updateObserver(o, this);
              o.handleChange(this, void 0);
            }
          }, () => {
            const name = this.l();
            return "Event fired" + (name ? `: ${name}` : "");
          });
        }
        this.c = true;
      }
      if (!didRunTransaction) {
        $Ke()?.handleObservableUpdated(this, { oldValue, newValue, change: void 0, didChange, hadValue: this.c });
      }
    };
  }
  l() {
    return this.e.getDebugName(this);
  }
  get debugName() {
    const name = this.l();
    return "From Event" + (name ? `: ${name}` : "");
  }
  g() {
    this.d = this.i(this.n);
  }
  h() {
    this.d.dispose();
    this.d = void 0;
    this.c = false;
    this.a = void 0;
  }
  get() {
    if (this.d) {
      if (!this.c) {
        this.n(void 0);
      }
      return this.a;
    } else {
      const value = this._getValue(void 0);
      return value;
    }
  }
  debugSetValue(value) {
    this.a = value;
  }
  debugGetState() {
    return { value: this.a, hasValue: this.c };
  }
};
(function($7d2) {
  $7d2.Observer = $9d;
  function batchEventsGlobally(tx, fn) {
    let didSet = false;
    if ($9d.globalTransaction === void 0) {
      $9d.globalTransaction = tx;
      didSet = true;
    }
    try {
      fn();
    } finally {
      if (didSet) {
        $9d.globalTransaction = void 0;
      }
    }
  }
  $7d2.batchEventsGlobally = batchEventsGlobally;
})($7d || ($7d = {}));

// out-build/vs/base/common/observableInternal/utils/utils.js
function $ve(observable) {
  const o = new $xe(false, void 0);
  observable.addObserver(o);
  return $Dd(() => {
    observable.removeObserver(o);
  });
}
$De($ve);
function $we(observable, handleValue) {
  const o = new $xe(true, handleValue);
  observable.addObserver(o);
  try {
    o.beginUpdate(observable);
  } finally {
    o.endUpdate(observable);
  }
  return $Dd(() => {
    observable.removeObserver(o);
  });
}
$Ce($we);
var $xe = class {
  constructor(b, c) {
    this.b = b;
    this.c = c;
    this.a = 0;
  }
  beginUpdate(observable) {
    this.a++;
  }
  endUpdate(observable) {
    if (this.a === 1 && this.b) {
      if (this.c) {
        this.c(observable.get());
      } else {
        observable.reportChanges();
      }
    }
    this.a--;
  }
  handlePossibleChange(observable) {
  }
  handleChange(observable, change) {
  }
};

// out-build/vs/base/common/observableInternal/logging/consoleObservableLogger.js
var consoleObservableLogger;
function $0d(obs) {
  if (!consoleObservableLogger) {
    consoleObservableLogger = new $$d();
    $Je(consoleObservableLogger);
  }
  consoleObservableLogger.addFilteredObj(obs);
}
var $$d = class {
  constructor() {
    this.a = 0;
    this.f = /* @__PURE__ */ new WeakMap();
  }
  addFilteredObj(obj) {
    if (!this.b) {
      this.b = /* @__PURE__ */ new Set();
    }
    this.b.add(obj);
  }
  c(obj) {
    return this.b?.has(obj) ?? true;
  }
  d(text) {
    return consoleTextToArgs([
      normalText(repeat("|  ", this.a)),
      text
    ]);
  }
  e(info) {
    if (!info.hadValue) {
      return [
        normalText(` `),
        styled($_d(info.newValue, 60), {
          color: "green"
        }),
        normalText(` (initial)`)
      ];
    }
    return info.didChange ? [
      normalText(` `),
      styled($_d(info.oldValue, 70), {
        color: "red",
        strikeThrough: true
      }),
      normalText(` `),
      styled($_d(info.newValue, 60), {
        color: "green"
      })
    ] : [normalText(` (unchanged)`)];
  }
  handleObservableCreated(observable) {
    if (observable instanceof $He) {
      const derived = observable;
      this.f.set(derived, /* @__PURE__ */ new Set());
      const debugTrackUpdating = false;
      if (debugTrackUpdating) {
        const updating = [];
        derived.__debugUpdating = updating;
        const existingBeginUpdate = derived.beginUpdate;
        derived.beginUpdate = (obs) => {
          updating.push(obs);
          return existingBeginUpdate.apply(derived, [obs]);
        };
        const existingEndUpdate = derived.endUpdate;
        derived.endUpdate = (obs) => {
          const idx = updating.indexOf(obs);
          if (idx === -1) {
            console.error("endUpdate called without beginUpdate", derived.debugName, obs.debugName);
          }
          updating.splice(idx, 1);
          return existingEndUpdate.apply(derived, [obs]);
        };
      }
    }
  }
  handleOnListenerCountChanged(observable, newCount) {
  }
  handleObservableUpdated(observable, info) {
    if (!this.c(observable)) {
      return;
    }
    if (observable instanceof $He) {
      this._handleDerivedRecomputed(observable, info);
      return;
    }
    console.log(...this.d([
      formatKind("observable value changed"),
      styled(observable.debugName, { color: "BlueViolet" }),
      ...this.e(info)
    ]));
  }
  formatChanges(changes) {
    if (changes.size === 0) {
      return void 0;
    }
    return styled(" (changed deps: " + [...changes].map((o) => o.debugName).join(", ") + ")", { color: "gray" });
  }
  handleDerivedDependencyChanged(derived, observable, change) {
    if (!this.c(derived)) {
      return;
    }
    this.f.get(derived)?.add(observable);
  }
  _handleDerivedRecomputed(derived, info) {
    if (!this.c(derived)) {
      return;
    }
    const changedObservables = this.f.get(derived);
    if (!changedObservables) {
      return;
    }
    console.log(...this.d([
      formatKind("derived recomputed"),
      styled(derived.debugName, { color: "BlueViolet" }),
      ...this.e(info),
      this.formatChanges(changedObservables),
      { data: [{ fn: derived._debugNameData.referenceFn ?? derived._computeFn }] }
    ]));
    changedObservables.clear();
  }
  handleDerivedCleared(derived) {
    if (!this.c(derived)) {
      return;
    }
    console.log(...this.d([
      formatKind("derived cleared"),
      styled(derived.debugName, { color: "BlueViolet" })
    ]));
  }
  handleFromEventObservableTriggered(observable, info) {
    if (!this.c(observable)) {
      return;
    }
    console.log(...this.d([
      formatKind("observable from event triggered"),
      styled(observable.debugName, { color: "BlueViolet" }),
      ...this.e(info),
      { data: [{ fn: observable._getValue }] }
    ]));
  }
  handleAutorunCreated(autorun) {
    if (!this.c(autorun)) {
      return;
    }
    this.f.set(autorun, /* @__PURE__ */ new Set());
  }
  handleAutorunDisposed(autorun) {
  }
  handleAutorunDependencyChanged(autorun, observable, change) {
    if (!this.c(autorun)) {
      return;
    }
    this.f.get(autorun).add(observable);
  }
  handleAutorunStarted(autorun) {
    const changedObservables = this.f.get(autorun);
    if (!changedObservables) {
      return;
    }
    if (this.c(autorun)) {
      console.log(...this.d([
        formatKind("autorun"),
        styled(autorun.debugName, { color: "BlueViolet" }),
        this.formatChanges(changedObservables),
        { data: [{ fn: autorun._debugNameData.referenceFn ?? autorun._runFn }] }
      ]));
    }
    changedObservables.clear();
    this.a++;
  }
  handleAutorunFinished(autorun) {
    this.a--;
  }
  handleBeginTransaction(transaction) {
    let transactionName = transaction.getDebugName();
    if (transactionName === void 0) {
      transactionName = "";
    }
    if (this.c(transaction)) {
      console.log(...this.d([
        formatKind("transaction"),
        styled(transactionName, { color: "BlueViolet" }),
        { data: [{ fn: transaction._fn }] }
      ]));
    }
    this.a++;
  }
  handleEndTransaction() {
    this.a--;
  }
};
function consoleTextToArgs(text) {
  const styles = new Array();
  const data = [];
  let firstArg = "";
  function process2(t) {
    if ("length" in t) {
      for (const item of t) {
        if (item) {
          process2(item);
        }
      }
    } else if ("text" in t) {
      firstArg += `%c${t.text}`;
      styles.push(t.style);
      if (t.data) {
        data.push(...t.data);
      }
    } else if ("data" in t) {
      data.push(...t.data);
    }
  }
  process2(text);
  const result = [firstArg, ...styles];
  result.push(...data);
  return result;
}
function normalText(text) {
  return styled(text, { color: "black" });
}
function formatKind(kind) {
  return styled(padStr(`${kind}: `, 10), { color: "black", bold: true });
}
function styled(text, options = {
  color: "black"
}) {
  function objToCss(styleObj) {
    return Object.entries(styleObj).reduce((styleString, [propName, propValue]) => {
      return `${styleString}${propName}:${propValue};`;
    }, "");
  }
  const style = {
    color: options.color
  };
  if (options.strikeThrough) {
    style["text-decoration"] = "line-through";
  }
  if (options.bold) {
    style["font-weight"] = "bold";
  }
  return {
    text,
    style: objToCss(style)
  };
}
function $_d(value, availableLen) {
  switch (typeof value) {
    case "number":
      return "" + value;
    case "string":
      if (value.length + 2 <= availableLen) {
        return `"${value}"`;
      }
      return `"${value.substr(0, availableLen - 7)}"+...`;
    case "boolean":
      return value ? "true" : "false";
    case "undefined":
      return "undefined";
    case "object":
      if (value === null) {
        return "null";
      }
      if (Array.isArray(value)) {
        return formatArray(value, availableLen);
      }
      return formatObject(value, availableLen);
    case "symbol":
      return value.toString();
    case "function":
      return `[[Function${value.name ? " " + value.name : ""}]]`;
    default:
      return "" + value;
  }
}
function formatArray(value, availableLen) {
  let result = "[ ";
  let first = true;
  for (const val of value) {
    if (!first) {
      result += ", ";
    }
    if (result.length - 5 > availableLen) {
      result += "...";
      break;
    }
    first = false;
    result += `${$_d(val, availableLen - result.length)}`;
  }
  result += " ]";
  return result;
}
function formatObject(value, availableLen) {
  if (typeof value.toString === "function" && value.toString !== Object.prototype.toString) {
    const val = value.toString();
    if (val.length <= availableLen) {
      return val;
    }
    return val.substring(0, availableLen - 3) + "...";
  }
  const className = $2d(value);
  let result = className ? className + "(" : "{ ";
  let first = true;
  for (const [key, val] of Object.entries(value)) {
    if (!first) {
      result += ", ";
    }
    if (result.length - 5 > availableLen) {
      result += "...";
      break;
    }
    first = false;
    result += `${key}: ${$_d(val, availableLen - result.length)}`;
  }
  result += className ? ")" : " }";
  return result;
}
function repeat(str, count) {
  let result = "";
  for (let i = 1; i <= count; i++) {
    result += str;
  }
  return result;
}
function padStr(str, length) {
  while (str.length < length) {
    str += " ";
  }
  return str;
}

// out-build/vs/base/common/observableInternal/logging/debugger/rpc.js
var $df = class _$df {
  static createHost(channelFactory, getHandler) {
    return new _$df(channelFactory, getHandler);
  }
  static createClient(channelFactory, getHandler) {
    return new _$df(channelFactory, getHandler);
  }
  constructor(b, c) {
    this.b = b;
    this.c = c;
    this.a = this.b({
      handleNotification: (notificationData) => {
        const m = notificationData;
        const fn = this.c().notifications[m[0]];
        if (!fn) {
          throw new Error(`Unknown notification "${m[0]}"!`);
        }
        fn(...m[1]);
      },
      handleRequest: (requestData) => {
        const m = requestData;
        try {
          const result = this.c().requests[m[0]](...m[1]);
          return { type: "result", value: result };
        } catch (e) {
          return { type: "error", value: e };
        }
      }
    });
    const requests = new Proxy({}, {
      get: (target, key) => {
        return async (...args) => {
          const result = await this.a.sendRequest([key, args]);
          if (result.type === "error") {
            throw result.value;
          } else {
            return result.value;
          }
        };
      }
    });
    const notifications = new Proxy({}, {
      get: (target, key) => {
        return (...args) => {
          this.a.sendNotification([key, args]);
        };
      }
    });
    this.api = { notifications, requests };
  }
};

// out-build/vs/base/common/observableInternal/logging/debugger/debuggerRpc.js
function $ef(channelId, createClient) {
  const g = globalThis;
  let queuedNotifications = [];
  let curHost = void 0;
  const { channel, handler } = createChannelFactoryFromDebugChannel({
    sendNotification: (data) => {
      if (curHost) {
        curHost.sendNotification(data);
      } else {
        queuedNotifications.push(data);
      }
    }
  });
  let curClient = void 0;
  (g.$$debugValueEditor_debugChannels ?? (g.$$debugValueEditor_debugChannels = {}))[channelId] = (host) => {
    curClient = createClient();
    curHost = host;
    for (const n of queuedNotifications) {
      host.sendNotification(n);
    }
    queuedNotifications = [];
    return handler;
  };
  return $df.createClient(channel, () => {
    if (!curClient) {
      throw new Error("Not supported");
    }
    return curClient;
  });
}
function createChannelFactoryFromDebugChannel(host) {
  let h;
  const channel = (handler) => {
    h = handler;
    return {
      sendNotification: (data) => {
        host.sendNotification(data);
      },
      sendRequest: (data) => {
        throw new Error("not supported");
      }
    };
  };
  return {
    channel,
    handler: {
      handleRequest: (data) => {
        if (data.type === "notification") {
          return h?.handleNotification(data.data);
        } else {
          return h?.handleRequest(data.data);
        }
      }
    }
  };
}

// out-build/vs/base/common/observableInternal/logging/debugger/utils.js
var $gf = class {
  constructor() {
    this.a = void 0;
  }
  throttle(fn, timeoutMs) {
    if (this.a === void 0) {
      this.a = setTimeout(() => {
        this.a = void 0;
        fn();
      }, timeoutMs);
    }
  }
  dispose() {
    if (this.a !== void 0) {
      clearTimeout(this.a);
    }
  }
};
function $hf(target, source) {
  for (const key in source) {
    if (!!target[key] && typeof target[key] === "object" && !!source[key] && typeof source[key] === "object") {
      $hf(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}
function $if(target, source) {
  for (const key in source) {
    if (source[key] === null) {
      delete target[key];
    } else if (!!target[key] && typeof target[key] === "object" && !!source[key] && typeof source[key] === "object") {
      $if(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

// out-build/vs/base/common/observableInternal/logging/debugger/devToolsLogger.js
var $jf = class _$jf {
  static {
    this.a = void 0;
  }
  static getInstance() {
    if (_$jf.a === void 0) {
      _$jf.a = new _$jf();
    }
    return _$jf.a;
  }
  j() {
    const affected = [];
    const txs = [...this.h];
    if (txs.length === 0) {
      return void 0;
    }
    const observerQueue = txs.flatMap((t) => t.debugGetUpdatingObservers() ?? []).map((o) => o.observer);
    const processedObservers = /* @__PURE__ */ new Set();
    while (observerQueue.length > 0) {
      const observer = observerQueue.shift();
      if (processedObservers.has(observer)) {
        continue;
      }
      processedObservers.add(observer);
      const state = this.m(observer, (d) => {
        if (!processedObservers.has(d)) {
          observerQueue.push(d);
        }
      });
      if (state) {
        affected.push(state);
      }
    }
    return { names: txs.map((t) => t.getDebugName() ?? "tx"), affected };
  }
  k(observable) {
    const info = this.f.get(observable);
    if (!info) {
      $nb(new $Eb("No info found"));
      return void 0;
    }
    return info;
  }
  l(autorun) {
    const info = this.f.get(autorun);
    if (!info) {
      $nb(new $Eb("No info found"));
      return void 0;
    }
    return info;
  }
  m(observer, queue) {
    if (observer instanceof $He) {
      const observersToUpdate = [...observer.debugGetObservers()];
      for (const o of observersToUpdate) {
        queue(o);
      }
      const info = this.k(observer);
      if (!info) {
        return;
      }
      const observerState = observer.debugGetState();
      const base = { name: observer.debugName, instanceId: info.instanceId, updateCount: observerState.updateCount };
      const changedDependencies = [...info.changedObservables].map((o) => this.f.get(o)?.instanceId).filter($ed);
      if (observerState.isComputing) {
        return { ...base, type: "observable/derived", state: "updating", changedDependencies, initialComputation: false };
      }
      switch (observerState.state) {
        case 0:
          return { ...base, type: "observable/derived", state: "noValue" };
        case 3:
          return { ...base, type: "observable/derived", state: "upToDate" };
        case 2:
          return { ...base, type: "observable/derived", state: "stale", changedDependencies };
        case 1:
          return { ...base, type: "observable/derived", state: "possiblyStale" };
      }
    } else if (observer instanceof $6d) {
      const info = this.l(observer);
      if (!info) {
        return void 0;
      }
      const base = { name: observer.debugName, instanceId: info.instanceId, updateCount: info.updateCount };
      const changedDependencies = [...info.changedObservables].map((o) => this.f.get(o).instanceId);
      if (observer.debugGetState().isRunning) {
        return { ...base, type: "autorun", state: "updating", changedDependencies };
      }
      switch (observer.debugGetState().state) {
        case 3:
          return { ...base, type: "autorun", state: "upToDate" };
        case 2:
          return { ...base, type: "autorun", state: "stale", changedDependencies };
        case 1:
          return { ...base, type: "autorun", state: "possiblyStale" };
      }
    }
    return void 0;
  }
  n(obs) {
    const info = this.k(obs);
    if (!info) {
      return void 0;
    }
    return { name: obs.debugName, instanceId: info.instanceId };
  }
  p(obs) {
    if (obs instanceof $He) {
      return { name: obs.toString(), instanceId: this.k(obs)?.instanceId };
    }
    const autorunInfo = this.l(obs);
    if (autorunInfo) {
      return { name: obs.toString(), instanceId: autorunInfo.instanceId };
    }
    return void 0;
  }
  constructor() {
    this.b = 0;
    this.c = 0;
    this.e = /* @__PURE__ */ new Map();
    this.f = /* @__PURE__ */ new WeakMap();
    this.g = /* @__PURE__ */ new Map();
    this.h = /* @__PURE__ */ new Set();
    this.i = $ef("observableDevTools", () => {
      return {
        notifications: {
          setDeclarationIdFilter: (declarationIds) => {
          },
          logObservableValue: (observableId) => {
            console.log("logObservableValue", observableId);
          },
          flushUpdates: () => {
            this.v();
          },
          resetUpdates: () => {
            this.q = null;
            this.i.api.notifications.handleChange(this.s, true);
          }
        },
        requests: {
          getDeclarations: () => {
            const result = {};
            for (const decl of this.e.values()) {
              result[decl.id] = decl;
            }
            return { decls: result };
          },
          getSummarizedInstances: () => {
            return null;
          },
          getObservableValueInfo: (instanceId) => {
            const obs = this.g.get(instanceId);
            return {
              observers: [...obs.debugGetObservers()].map((d) => this.p(d)).filter($ed)
            };
          },
          getDerivedInfo: (instanceId) => {
            const d = this.g.get(instanceId);
            return {
              dependencies: [...d.debugGetState().dependencies].map((d2) => this.n(d2)).filter($ed),
              observers: [...d.debugGetObservers()].map((d2) => this.p(d2)).filter($ed)
            };
          },
          getAutorunInfo: (instanceId) => {
            const obs = this.g.get(instanceId);
            return {
              dependencies: [...obs.debugGetState().dependencies].map((d) => this.n(d)).filter($ed)
            };
          },
          getTransactionState: () => {
            return this.j();
          },
          setValue: (instanceId, jsonValue) => {
            const obs = this.g.get(instanceId);
            if (obs instanceof $He) {
              obs.debugSetValue(jsonValue);
            } else if (obs instanceof $Te) {
              obs.debugSetValue(jsonValue);
            } else if (obs instanceof $9d) {
              obs.debugSetValue(jsonValue);
            } else {
              throw new $Eb("Observable is not supported");
            }
            const observers = [...obs.debugGetObservers()];
            for (const d of observers) {
              d.beginUpdate(obs);
            }
            for (const d of observers) {
              d.handleChange(obs, void 0);
            }
            for (const d of observers) {
              d.endUpdate(obs);
            }
          },
          getValue: (instanceId) => {
            const obs = this.g.get(instanceId);
            if (obs instanceof $He) {
              return $_d(obs.debugGetState().value, 200);
            } else if (obs instanceof $Te) {
              return $_d(obs.debugGetState().value, 200);
            }
            return void 0;
          },
          logValue: (instanceId) => {
            const obs = this.g.get(instanceId);
            if (obs && "get" in obs) {
              console.log("Logged Value:", obs.get());
            } else {
              throw new $Eb("Observable is not supported");
            }
          },
          rerun: (instanceId) => {
            const obs = this.g.get(instanceId);
            if (obs instanceof $He) {
              obs.debugRecompute();
            } else if (obs instanceof $6d) {
              obs.debugRerun();
            } else {
              throw new $Eb("Observable is not supported");
            }
          }
        }
      };
    });
    this.q = null;
    this.r = new $gf();
    this.s = {};
    this.v = () => {
      if (this.q !== null) {
        this.i.api.notifications.handleChange(this.q, false);
        this.q = null;
      }
    };
    DebugLocation.enable();
  }
  u(update) {
    $if(this.s, update);
    if (this.q === null) {
      this.q = update;
    } else {
      $hf(this.q, update);
    }
    this.r.throttle(this.v, 10);
  }
  w(type, location) {
    if (!location) {
      return -1;
    }
    let decInfo = this.e.get(location.id);
    if (decInfo === void 0) {
      decInfo = {
        id: this.b++,
        type,
        url: location.fileName,
        line: location.line,
        column: location.column
      };
      this.e.set(location.id, decInfo);
      this.u({ decls: { [decInfo.id]: decInfo } });
    }
    return decInfo.id;
  }
  handleObservableCreated(observable, location) {
    const declarationId = this.w("observable/value", location);
    const info = {
      declarationId,
      instanceId: this.c++,
      listenerCount: 0,
      lastValue: void 0,
      updateCount: 0,
      changedObservables: /* @__PURE__ */ new Set()
    };
    this.f.set(observable, info);
  }
  handleOnListenerCountChanged(observable, newCount) {
    const info = this.k(observable);
    if (!info) {
      return;
    }
    if (info.listenerCount === 0 && newCount > 0) {
      const type = observable instanceof $He ? "observable/derived" : "observable/value";
      this.g.set(info.instanceId, observable);
      this.u({
        instances: {
          [info.instanceId]: {
            instanceId: info.instanceId,
            declarationId: info.declarationId,
            formattedValue: info.lastValue,
            type,
            name: observable.debugName
          }
        }
      });
    } else if (info.listenerCount > 0 && newCount === 0) {
      this.u({
        instances: { [info.instanceId]: null }
      });
      this.g.delete(info.instanceId);
    }
    info.listenerCount = newCount;
  }
  handleObservableUpdated(observable, changeInfo) {
    if (observable instanceof $He) {
      this._handleDerivedRecomputed(observable, changeInfo);
      return;
    }
    const info = this.k(observable);
    if (info) {
      if (changeInfo.didChange) {
        info.lastValue = $_d(changeInfo.newValue, 30);
        if (info.listenerCount > 0) {
          this.u({
            instances: { [info.instanceId]: { formattedValue: info.lastValue } }
          });
        }
      }
    }
  }
  handleAutorunCreated(autorun, location) {
    const declarationId = this.w("autorun", location);
    const info = {
      declarationId,
      instanceId: this.c++,
      updateCount: 0,
      changedObservables: /* @__PURE__ */ new Set()
    };
    this.f.set(autorun, info);
    this.g.set(info.instanceId, autorun);
    if (info) {
      this.u({
        instances: {
          [info.instanceId]: {
            instanceId: info.instanceId,
            declarationId: info.declarationId,
            runCount: 0,
            type: "autorun",
            name: autorun.debugName
          }
        }
      });
    }
  }
  handleAutorunDisposed(autorun) {
    const info = this.l(autorun);
    if (!info) {
      return;
    }
    this.u({
      instances: { [info.instanceId]: null }
    });
    this.f.delete(autorun);
    this.g.delete(info.instanceId);
  }
  handleAutorunDependencyChanged(autorun, observable, change) {
    const info = this.l(autorun);
    if (!info) {
      return;
    }
    info.changedObservables.add(observable);
  }
  handleAutorunStarted(autorun) {
  }
  handleAutorunFinished(autorun) {
    const info = this.l(autorun);
    if (!info) {
      return;
    }
    info.changedObservables.clear();
    info.updateCount++;
    this.u({
      instances: { [info.instanceId]: { runCount: info.updateCount } }
    });
  }
  handleDerivedDependencyChanged(derived, observable, change) {
    const info = this.k(derived);
    if (info) {
      info.changedObservables.add(observable);
    }
  }
  _handleDerivedRecomputed(observable, changeInfo) {
    const info = this.k(observable);
    if (!info) {
      return;
    }
    const formattedValue = $_d(changeInfo.newValue, 30);
    info.updateCount++;
    info.changedObservables.clear();
    info.lastValue = formattedValue;
    if (info.listenerCount > 0) {
      this.u({
        instances: { [info.instanceId]: { formattedValue, recomputationCount: info.updateCount } }
      });
    }
  }
  handleDerivedCleared(observable) {
    const info = this.k(observable);
    if (!info) {
      return;
    }
    info.lastValue = void 0;
    info.changedObservables.clear();
    if (info.listenerCount > 0) {
      this.u({
        instances: {
          [info.instanceId]: {
            formattedValue: void 0
          }
        }
      });
    }
  }
  handleBeginTransaction(transaction) {
    this.h.add(transaction);
  }
  handleEndTransaction(transaction) {
    this.h.delete(transaction);
  }
};

// out-build/vs/base/common/observableInternal/logging/debugGetDependencyGraph.js
function $ae(obs, options) {
  const debugNamePostProcessor = options?.debugNamePostProcessor ?? ((str) => str);
  const info = Info.from(obs, debugNamePostProcessor);
  if (!info) {
    return "";
  }
  const alreadyListed = /* @__PURE__ */ new Set();
  if (options.type === "observers") {
    return formatObservableInfoWithObservers(info, 0, alreadyListed, options).trim();
  } else {
    return formatObservableInfoWithDependencies(info, 0, alreadyListed, options).trim();
  }
}
function formatObservableInfoWithDependencies(info, indentLevel, alreadyListed, options) {
  const indent = "		".repeat(indentLevel);
  const lines = [];
  const isAlreadyListed = alreadyListed.has(info.sourceObj);
  if (isAlreadyListed) {
    lines.push(`${indent}* ${info.type} ${info.name} (already listed)`);
    return lines.join("\n");
  }
  alreadyListed.add(info.sourceObj);
  lines.push(`${indent}* ${info.type} ${info.name}:`);
  lines.push(`${indent}  value: ${$_d(info.value, 50)}`);
  lines.push(`${indent}  state: ${info.state}`);
  if (info.dependencies.length > 0) {
    lines.push(`${indent}  dependencies:`);
    for (const dep of info.dependencies) {
      const info2 = Info.from(dep, options.debugNamePostProcessor ?? ((name) => name)) ?? Info.unknown(dep);
      lines.push(formatObservableInfoWithDependencies(info2, indentLevel + 1, alreadyListed, options));
    }
  }
  return lines.join("\n");
}
function formatObservableInfoWithObservers(info, indentLevel, alreadyListed, options) {
  const indent = "		".repeat(indentLevel);
  const lines = [];
  const isAlreadyListed = alreadyListed.has(info.sourceObj);
  if (isAlreadyListed) {
    lines.push(`${indent}* ${info.type} ${info.name} (already listed)`);
    return lines.join("\n");
  }
  alreadyListed.add(info.sourceObj);
  lines.push(`${indent}* ${info.type} ${info.name}:`);
  lines.push(`${indent}  value: ${$_d(info.value, 50)}`);
  lines.push(`${indent}  state: ${info.state}`);
  if (info.observers.length > 0) {
    lines.push(`${indent}  observers:`);
    for (const observer of info.observers) {
      const info2 = Info.from(observer, options.debugNamePostProcessor ?? ((name) => name)) ?? Info.unknown(observer);
      lines.push(formatObservableInfoWithObservers(info2, indentLevel + 1, alreadyListed, options));
    }
  }
  return lines.join("\n");
}
var Info = class _Info {
  static from(obs, debugNamePostProcessor) {
    if (obs instanceof $6d) {
      const state = obs.debugGetState();
      return new _Info(obs, debugNamePostProcessor(obs.debugName), "autorun", void 0, state.stateStr, Array.from(state.dependencies), []);
    } else if (obs instanceof $He) {
      const state = obs.debugGetState();
      return new _Info(obs, debugNamePostProcessor(obs.debugName), "derived", state.value, state.stateStr, Array.from(state.dependencies), Array.from(obs.debugGetObservers()));
    } else if (obs instanceof $Te) {
      const state = obs.debugGetState();
      return new _Info(obs, debugNamePostProcessor(obs.debugName), "observableValue", state.value, "upToDate", [], Array.from(obs.debugGetObservers()));
    } else if (obs instanceof $9d) {
      const state = obs.debugGetState();
      return new _Info(obs, debugNamePostProcessor(obs.debugName), "fromEvent", state.value, state.hasValue ? "upToDate" : "initial", [], Array.from(obs.debugGetObservers()));
    }
    return void 0;
  }
  static unknown(obs) {
    return new _Info(obs, "(unknown)", "unknown", void 0, "unknown", [], []);
  }
  constructor(sourceObj, name, type, value, state, dependencies, observers) {
    this.sourceObj = sourceObj;
    this.name = name;
    this.type = type;
    this.value = value;
    this.state = state;
    this.dependencies = dependencies;
    this.observers = observers;
  }
};

// out-build/vs/base/common/observableInternal/index.js
$Ee($ae);
$Le($0d);
var enableLogging = false;
if (enableLogging) {
  $Je(new $$d());
}
if ($3 && $3["VSCODE_DEV_DEBUG_OBSERVABLES"]) {
  $Je($jf.getInstance());
}

// out-build/vs/editor/common/core/ranges/offsetRange.js
var $PD = class _$PD {
  static fromTo(start, endExclusive) {
    return new _$PD(start, endExclusive);
  }
  static addRange(range, sortedRanges) {
    let i = 0;
    while (i < sortedRanges.length && sortedRanges[i].endExclusive < range.start) {
      i++;
    }
    let j = i;
    while (j < sortedRanges.length && sortedRanges[j].start <= range.endExclusive) {
      j++;
    }
    if (i === j) {
      sortedRanges.splice(i, 0, range);
    } else {
      const start = Math.min(range.start, sortedRanges[i].start);
      const end = Math.max(range.endExclusive, sortedRanges[j - 1].endExclusive);
      sortedRanges.splice(i, j - i, new _$PD(start, end));
    }
  }
  static tryCreate(start, endExclusive) {
    if (start > endExclusive) {
      return void 0;
    }
    return new _$PD(start, endExclusive);
  }
  static ofLength(length) {
    return new _$PD(0, length);
  }
  static ofStartAndLength(start, length) {
    return new _$PD(start, start + length);
  }
  static emptyAt(offset) {
    return new _$PD(offset, offset);
  }
  constructor(start, endExclusive) {
    this.start = start;
    this.endExclusive = endExclusive;
    if (start > endExclusive) {
      throw new $Eb(`Invalid range: ${this.toString()}`);
    }
  }
  get isEmpty() {
    return this.start === this.endExclusive;
  }
  delta(offset) {
    return new _$PD(this.start + offset, this.endExclusive + offset);
  }
  deltaStart(offset) {
    return new _$PD(this.start + offset, this.endExclusive);
  }
  deltaEnd(offset) {
    return new _$PD(this.start, this.endExclusive + offset);
  }
  get length() {
    return this.endExclusive - this.start;
  }
  toString() {
    return `[${this.start}, ${this.endExclusive})`;
  }
  equals(other) {
    return this.start === other.start && this.endExclusive === other.endExclusive;
  }
  containsRange(other) {
    return this.start <= other.start && other.endExclusive <= this.endExclusive;
  }
  contains(offset) {
    return this.start <= offset && offset < this.endExclusive;
  }
  /**
   * for all numbers n: range1.contains(n) or range2.contains(n) => range1.join(range2).contains(n)
   * The joined range is the smallest range that contains both ranges.
   */
  join(other) {
    return new _$PD(Math.min(this.start, other.start), Math.max(this.endExclusive, other.endExclusive));
  }
  /**
   * for all numbers n: range1.contains(n) and range2.contains(n) <=> range1.intersect(range2).contains(n)
   *
   * The resulting range is empty if the ranges do not intersect, but touch.
   * If the ranges don't even touch, the result is undefined.
   */
  intersect(other) {
    const start = Math.max(this.start, other.start);
    const end = Math.min(this.endExclusive, other.endExclusive);
    if (start <= end) {
      return new _$PD(start, end);
    }
    return void 0;
  }
  intersectionLength(range) {
    const start = Math.max(this.start, range.start);
    const end = Math.min(this.endExclusive, range.endExclusive);
    return Math.max(0, end - start);
  }
  intersects(other) {
    const start = Math.max(this.start, other.start);
    const end = Math.min(this.endExclusive, other.endExclusive);
    return start < end;
  }
  intersectsOrTouches(other) {
    const start = Math.max(this.start, other.start);
    const end = Math.min(this.endExclusive, other.endExclusive);
    return start <= end;
  }
  isBefore(other) {
    return this.endExclusive <= other.start;
  }
  isAfter(other) {
    return this.start >= other.endExclusive;
  }
  slice(arr) {
    return arr.slice(this.start, this.endExclusive);
  }
  substring(str) {
    return str.substring(this.start, this.endExclusive);
  }
  /**
   * Returns the given value if it is contained in this instance, otherwise the closest value that is contained.
   * The range must not be empty.
   */
  clip(value) {
    if (this.isEmpty) {
      throw new $Eb(`Invalid clipping range: ${this.toString()}`);
    }
    return Math.max(this.start, Math.min(this.endExclusive - 1, value));
  }
  /**
   * Returns `r := value + k * length` such that `r` is contained in this range.
   * The range must not be empty.
   *
   * E.g. `[5, 10).clipCyclic(10) === 5`, `[5, 10).clipCyclic(11) === 6` and `[5, 10).clipCyclic(4) === 9`.
   */
  clipCyclic(value) {
    if (this.isEmpty) {
      throw new $Eb(`Invalid clipping range: ${this.toString()}`);
    }
    if (value < this.start) {
      return this.endExclusive - (this.start - value) % this.length;
    }
    if (value >= this.endExclusive) {
      return this.start + (value - this.start) % this.length;
    }
    return value;
  }
  map(f) {
    const result = [];
    for (let i = this.start; i < this.endExclusive; i++) {
      result.push(f(i));
    }
    return result;
  }
  forEach(f) {
    for (let i = this.start; i < this.endExclusive; i++) {
      f(i);
    }
  }
  /**
   * this: [ 5, 10), range: [10, 15) => [5, 15)]
   * Throws if the ranges are not touching.
  */
  joinRightTouching(range) {
    if (this.endExclusive !== range.start) {
      throw new $Eb(`Invalid join: ${this.toString()} and ${range.toString()}`);
    }
    return new _$PD(this.start, range.endExclusive);
  }
  withMargin(marginStart, marginEnd) {
    if (marginEnd === void 0) {
      marginEnd = marginStart;
    }
    return new _$PD(this.start - marginStart, this.endExclusive + marginEnd);
  }
};

// out-build/vs/editor/common/core/position.js
var $GD = class _$GD {
  constructor(lineNumber, column) {
    this.lineNumber = lineNumber;
    this.column = column;
  }
  /**
   * Create a new position from this position.
   *
   * @param newLineNumber new line number
   * @param newColumn new column
   */
  with(newLineNumber = this.lineNumber, newColumn = this.column) {
    if (newLineNumber === this.lineNumber && newColumn === this.column) {
      return this;
    } else {
      return new _$GD(newLineNumber, newColumn);
    }
  }
  /**
   * Derive a new position from this position.
   *
   * @param deltaLineNumber line number delta
   * @param deltaColumn column delta
   */
  delta(deltaLineNumber = 0, deltaColumn = 0) {
    return this.with(Math.max(1, this.lineNumber + deltaLineNumber), Math.max(1, this.column + deltaColumn));
  }
  /**
   * Test if this position equals other position
   */
  equals(other) {
    return _$GD.equals(this, other);
  }
  /**
   * Test if position `a` equals position `b`
   */
  static equals(a, b) {
    if (!a && !b) {
      return true;
    }
    return !!a && !!b && a.lineNumber === b.lineNumber && a.column === b.column;
  }
  /**
   * Test if this position is before other position.
   * If the two positions are equal, the result will be false.
   */
  isBefore(other) {
    return _$GD.isBefore(this, other);
  }
  /**
   * Test if position `a` is before position `b`.
   * If the two positions are equal, the result will be false.
   */
  static isBefore(a, b) {
    if (a.lineNumber < b.lineNumber) {
      return true;
    }
    if (b.lineNumber < a.lineNumber) {
      return false;
    }
    return a.column < b.column;
  }
  /**
   * Test if this position is before other position.
   * If the two positions are equal, the result will be true.
   */
  isBeforeOrEqual(other) {
    return _$GD.isBeforeOrEqual(this, other);
  }
  /**
   * Test if position `a` is before position `b`.
   * If the two positions are equal, the result will be true.
   */
  static isBeforeOrEqual(a, b) {
    if (a.lineNumber < b.lineNumber) {
      return true;
    }
    if (b.lineNumber < a.lineNumber) {
      return false;
    }
    return a.column <= b.column;
  }
  /**
   * A function that compares positions, useful for sorting
   */
  static compare(a, b) {
    const aLineNumber = a.lineNumber | 0;
    const bLineNumber = b.lineNumber | 0;
    if (aLineNumber === bLineNumber) {
      const aColumn = a.column | 0;
      const bColumn = b.column | 0;
      return aColumn - bColumn;
    }
    return aLineNumber - bLineNumber;
  }
  /**
   * Clone this position.
   */
  clone() {
    return new _$GD(this.lineNumber, this.column);
  }
  /**
   * Convert to a human-readable representation.
   */
  toString() {
    return "(" + this.lineNumber + "," + this.column + ")";
  }
  // ---
  /**
   * Create a `Position` from an `IPosition`.
   */
  static lift(pos) {
    return new _$GD(pos.lineNumber, pos.column);
  }
  /**
   * Test if `obj` is an `IPosition`.
   */
  static isIPosition(obj) {
    return !!obj && typeof obj.lineNumber === "number" && typeof obj.column === "number";
  }
  toJSON() {
    return {
      lineNumber: this.lineNumber,
      column: this.column
    };
  }
};

// out-build/vs/editor/common/core/range.js
var $HD = class _$HD {
  constructor(startLineNumber, startColumn, endLineNumber, endColumn) {
    if (startLineNumber > endLineNumber || startLineNumber === endLineNumber && startColumn > endColumn) {
      this.startLineNumber = endLineNumber;
      this.startColumn = endColumn;
      this.endLineNumber = startLineNumber;
      this.endColumn = startColumn;
    } else {
      this.startLineNumber = startLineNumber;
      this.startColumn = startColumn;
      this.endLineNumber = endLineNumber;
      this.endColumn = endColumn;
    }
  }
  /**
   * Test if this range is empty.
   */
  isEmpty() {
    return _$HD.isEmpty(this);
  }
  /**
   * Test if `range` is empty.
   */
  static isEmpty(range) {
    return range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn;
  }
  /**
   * Test if position is in this range. If the position is at the edges, will return true.
   */
  containsPosition(position) {
    return _$HD.containsPosition(this, position);
  }
  /**
   * Test if `position` is in `range`. If the position is at the edges, will return true.
   */
  static containsPosition(range, position) {
    if (position.lineNumber < range.startLineNumber || position.lineNumber > range.endLineNumber) {
      return false;
    }
    if (position.lineNumber === range.startLineNumber && position.column < range.startColumn) {
      return false;
    }
    if (position.lineNumber === range.endLineNumber && position.column > range.endColumn) {
      return false;
    }
    return true;
  }
  /**
   * Test if `position` is in `range`. If the position is at the edges, will return false.
   * @internal
   */
  static strictContainsPosition(range, position) {
    if (position.lineNumber < range.startLineNumber || position.lineNumber > range.endLineNumber) {
      return false;
    }
    if (position.lineNumber === range.startLineNumber && position.column <= range.startColumn) {
      return false;
    }
    if (position.lineNumber === range.endLineNumber && position.column >= range.endColumn) {
      return false;
    }
    return true;
  }
  /**
   * Test if range is in this range. If the range is equal to this range, will return true.
   */
  containsRange(range) {
    return _$HD.containsRange(this, range);
  }
  /**
   * Test if `otherRange` is in `range`. If the ranges are equal, will return true.
   */
  static containsRange(range, otherRange) {
    if (otherRange.startLineNumber < range.startLineNumber || otherRange.endLineNumber < range.startLineNumber) {
      return false;
    }
    if (otherRange.startLineNumber > range.endLineNumber || otherRange.endLineNumber > range.endLineNumber) {
      return false;
    }
    if (otherRange.startLineNumber === range.startLineNumber && otherRange.startColumn < range.startColumn) {
      return false;
    }
    if (otherRange.endLineNumber === range.endLineNumber && otherRange.endColumn > range.endColumn) {
      return false;
    }
    return true;
  }
  /**
   * Test if `range` is strictly in this range. `range` must start after and end before this range for the result to be true.
   */
  strictContainsRange(range) {
    return _$HD.strictContainsRange(this, range);
  }
  /**
   * Test if `otherRange` is strictly in `range` (must start after, and end before). If the ranges are equal, will return false.
   */
  static strictContainsRange(range, otherRange) {
    if (otherRange.startLineNumber < range.startLineNumber || otherRange.endLineNumber < range.startLineNumber) {
      return false;
    }
    if (otherRange.startLineNumber > range.endLineNumber || otherRange.endLineNumber > range.endLineNumber) {
      return false;
    }
    if (otherRange.startLineNumber === range.startLineNumber && otherRange.startColumn <= range.startColumn) {
      return false;
    }
    if (otherRange.endLineNumber === range.endLineNumber && otherRange.endColumn >= range.endColumn) {
      return false;
    }
    return true;
  }
  /**
   * A reunion of the two ranges.
   * The smallest position will be used as the start point, and the largest one as the end point.
   */
  plusRange(range) {
    return _$HD.plusRange(this, range);
  }
  /**
   * A reunion of the two ranges.
   * The smallest position will be used as the start point, and the largest one as the end point.
   */
  static plusRange(a, b) {
    let startLineNumber;
    let startColumn;
    let endLineNumber;
    let endColumn;
    if (b.startLineNumber < a.startLineNumber) {
      startLineNumber = b.startLineNumber;
      startColumn = b.startColumn;
    } else if (b.startLineNumber === a.startLineNumber) {
      startLineNumber = b.startLineNumber;
      startColumn = Math.min(b.startColumn, a.startColumn);
    } else {
      startLineNumber = a.startLineNumber;
      startColumn = a.startColumn;
    }
    if (b.endLineNumber > a.endLineNumber) {
      endLineNumber = b.endLineNumber;
      endColumn = b.endColumn;
    } else if (b.endLineNumber === a.endLineNumber) {
      endLineNumber = b.endLineNumber;
      endColumn = Math.max(b.endColumn, a.endColumn);
    } else {
      endLineNumber = a.endLineNumber;
      endColumn = a.endColumn;
    }
    return new _$HD(startLineNumber, startColumn, endLineNumber, endColumn);
  }
  /**
   * A intersection of the two ranges.
   */
  intersectRanges(range) {
    return _$HD.intersectRanges(this, range);
  }
  /**
   * A intersection of the two ranges.
   */
  static intersectRanges(a, b) {
    let resultStartLineNumber = a.startLineNumber;
    let resultStartColumn = a.startColumn;
    let resultEndLineNumber = a.endLineNumber;
    let resultEndColumn = a.endColumn;
    const otherStartLineNumber = b.startLineNumber;
    const otherStartColumn = b.startColumn;
    const otherEndLineNumber = b.endLineNumber;
    const otherEndColumn = b.endColumn;
    if (resultStartLineNumber < otherStartLineNumber) {
      resultStartLineNumber = otherStartLineNumber;
      resultStartColumn = otherStartColumn;
    } else if (resultStartLineNumber === otherStartLineNumber) {
      resultStartColumn = Math.max(resultStartColumn, otherStartColumn);
    }
    if (resultEndLineNumber > otherEndLineNumber) {
      resultEndLineNumber = otherEndLineNumber;
      resultEndColumn = otherEndColumn;
    } else if (resultEndLineNumber === otherEndLineNumber) {
      resultEndColumn = Math.min(resultEndColumn, otherEndColumn);
    }
    if (resultStartLineNumber > resultEndLineNumber) {
      return null;
    }
    if (resultStartLineNumber === resultEndLineNumber && resultStartColumn > resultEndColumn) {
      return null;
    }
    return new _$HD(resultStartLineNumber, resultStartColumn, resultEndLineNumber, resultEndColumn);
  }
  /**
   * Test if this range equals other.
   */
  equalsRange(other) {
    return _$HD.equalsRange(this, other);
  }
  /**
   * Test if range `a` equals `b`.
   */
  static equalsRange(a, b) {
    if (!a && !b) {
      return true;
    }
    return !!a && !!b && a.startLineNumber === b.startLineNumber && a.startColumn === b.startColumn && a.endLineNumber === b.endLineNumber && a.endColumn === b.endColumn;
  }
  /**
   * Return the end position (which will be after or equal to the start position)
   */
  getEndPosition() {
    return _$HD.getEndPosition(this);
  }
  /**
   * Return the end position (which will be after or equal to the start position)
   */
  static getEndPosition(range) {
    return new $GD(range.endLineNumber, range.endColumn);
  }
  /**
   * Return the start position (which will be before or equal to the end position)
   */
  getStartPosition() {
    return _$HD.getStartPosition(this);
  }
  /**
   * Return the start position (which will be before or equal to the end position)
   */
  static getStartPosition(range) {
    return new $GD(range.startLineNumber, range.startColumn);
  }
  /**
   * Transform to a user presentable string representation.
   */
  toString() {
    return "[" + this.startLineNumber + "," + this.startColumn + " -> " + this.endLineNumber + "," + this.endColumn + "]";
  }
  /**
   * Create a new range using this range's start position, and using endLineNumber and endColumn as the end position.
   */
  setEndPosition(endLineNumber, endColumn) {
    return new _$HD(this.startLineNumber, this.startColumn, endLineNumber, endColumn);
  }
  /**
   * Create a new range using this range's end position, and using startLineNumber and startColumn as the start position.
   */
  setStartPosition(startLineNumber, startColumn) {
    return new _$HD(startLineNumber, startColumn, this.endLineNumber, this.endColumn);
  }
  /**
   * Create a new empty range using this range's start position.
   */
  collapseToStart() {
    return _$HD.collapseToStart(this);
  }
  /**
   * Create a new empty range using this range's start position.
   */
  static collapseToStart(range) {
    return new _$HD(range.startLineNumber, range.startColumn, range.startLineNumber, range.startColumn);
  }
  /**
   * Create a new empty range using this range's end position.
   */
  collapseToEnd() {
    return _$HD.collapseToEnd(this);
  }
  /**
   * Create a new empty range using this range's end position.
   */
  static collapseToEnd(range) {
    return new _$HD(range.endLineNumber, range.endColumn, range.endLineNumber, range.endColumn);
  }
  /**
   * Moves the range by the given amount of lines.
   */
  delta(lineCount) {
    return new _$HD(this.startLineNumber + lineCount, this.startColumn, this.endLineNumber + lineCount, this.endColumn);
  }
  isSingleLine() {
    return this.startLineNumber === this.endLineNumber;
  }
  // ---
  static fromPositions(start, end = start) {
    return new _$HD(start.lineNumber, start.column, end.lineNumber, end.column);
  }
  static lift(range) {
    if (!range) {
      return null;
    }
    return new _$HD(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
  }
  /**
   * Test if `obj` is an `IRange`.
   */
  static isIRange(obj) {
    return !!obj && typeof obj.startLineNumber === "number" && typeof obj.startColumn === "number" && typeof obj.endLineNumber === "number" && typeof obj.endColumn === "number";
  }
  /**
   * Test if the two ranges are touching in any way.
   */
  static areIntersectingOrTouching(a, b) {
    if (a.endLineNumber < b.startLineNumber || a.endLineNumber === b.startLineNumber && a.endColumn < b.startColumn) {
      return false;
    }
    if (b.endLineNumber < a.startLineNumber || b.endLineNumber === a.startLineNumber && b.endColumn < a.startColumn) {
      return false;
    }
    return true;
  }
  /**
   * Test if the two ranges are intersecting. If the ranges are touching it returns true.
   */
  static areIntersecting(a, b) {
    if (a.endLineNumber < b.startLineNumber || a.endLineNumber === b.startLineNumber && a.endColumn <= b.startColumn) {
      return false;
    }
    if (b.endLineNumber < a.startLineNumber || b.endLineNumber === a.startLineNumber && b.endColumn <= a.startColumn) {
      return false;
    }
    return true;
  }
  /**
   * Test if the two ranges are intersecting, but not touching at all.
   */
  static areOnlyIntersecting(a, b) {
    if (a.endLineNumber < b.startLineNumber - 1 || a.endLineNumber === b.startLineNumber && a.endColumn < b.startColumn - 1) {
      return false;
    }
    if (b.endLineNumber < a.startLineNumber - 1 || b.endLineNumber === a.startLineNumber && b.endColumn < a.startColumn - 1) {
      return false;
    }
    return true;
  }
  /**
   * A function that compares ranges, useful for sorting ranges
   * It will first compare ranges on the startPosition and then on the endPosition
   */
  static compareRangesUsingStarts(a, b) {
    if (a && b) {
      const aStartLineNumber = a.startLineNumber | 0;
      const bStartLineNumber = b.startLineNumber | 0;
      if (aStartLineNumber === bStartLineNumber) {
        const aStartColumn = a.startColumn | 0;
        const bStartColumn = b.startColumn | 0;
        if (aStartColumn === bStartColumn) {
          const aEndLineNumber = a.endLineNumber | 0;
          const bEndLineNumber = b.endLineNumber | 0;
          if (aEndLineNumber === bEndLineNumber) {
            const aEndColumn = a.endColumn | 0;
            const bEndColumn = b.endColumn | 0;
            return aEndColumn - bEndColumn;
          }
          return aEndLineNumber - bEndLineNumber;
        }
        return aStartColumn - bStartColumn;
      }
      return aStartLineNumber - bStartLineNumber;
    }
    const aExists = a ? 1 : 0;
    const bExists = b ? 1 : 0;
    return aExists - bExists;
  }
  /**
   * A function that compares ranges, useful for sorting ranges
   * It will first compare ranges on the endPosition and then on the startPosition
   */
  static compareRangesUsingEnds(a, b) {
    if (a.endLineNumber === b.endLineNumber) {
      if (a.endColumn === b.endColumn) {
        if (a.startLineNumber === b.startLineNumber) {
          return a.startColumn - b.startColumn;
        }
        return a.startLineNumber - b.startLineNumber;
      }
      return a.endColumn - b.endColumn;
    }
    return a.endLineNumber - b.endLineNumber;
  }
  /**
   * Test if the range spans multiple lines.
   */
  static spansMultipleLines(range) {
    return range.endLineNumber > range.startLineNumber;
  }
  toJSON() {
    return this;
  }
};

// out-build/vs/editor/common/core/ranges/lineRange.js
var $RD = class _$RD {
  static ofLength(startLineNumber, length) {
    return new _$RD(startLineNumber, startLineNumber + length);
  }
  static fromRange(range) {
    return new _$RD(range.startLineNumber, range.endLineNumber);
  }
  static fromRangeInclusive(range) {
    return new _$RD(range.startLineNumber, range.endLineNumber + 1);
  }
  static {
    this.compareByStart = $xc((l) => l.startLineNumber, $zc);
  }
  static subtract(a, b) {
    if (!b) {
      return [a];
    }
    if (a.startLineNumber < b.startLineNumber && b.endLineNumberExclusive < a.endLineNumberExclusive) {
      return [
        new _$RD(a.startLineNumber, b.startLineNumber),
        new _$RD(b.endLineNumberExclusive, a.endLineNumberExclusive)
      ];
    } else if (b.startLineNumber <= a.startLineNumber && a.endLineNumberExclusive <= b.endLineNumberExclusive) {
      return [];
    } else if (b.endLineNumberExclusive < a.endLineNumberExclusive) {
      return [new _$RD(Math.max(b.endLineNumberExclusive, a.startLineNumber), a.endLineNumberExclusive)];
    } else {
      return [new _$RD(a.startLineNumber, Math.min(b.startLineNumber, a.endLineNumberExclusive))];
    }
  }
  /**
   * @param lineRanges An array of arrays of of sorted line ranges.
   */
  static joinMany(lineRanges) {
    if (lineRanges.length === 0) {
      return [];
    }
    let result = new $SD(lineRanges[0].slice());
    for (let i = 1; i < lineRanges.length; i++) {
      result = result.getUnion(new $SD(lineRanges[i].slice()));
    }
    return result.ranges;
  }
  static join(lineRanges) {
    if (lineRanges.length === 0) {
      throw new $Eb("lineRanges cannot be empty");
    }
    let startLineNumber = lineRanges[0].startLineNumber;
    let endLineNumberExclusive = lineRanges[0].endLineNumberExclusive;
    for (let i = 1; i < lineRanges.length; i++) {
      startLineNumber = Math.min(startLineNumber, lineRanges[i].startLineNumber);
      endLineNumberExclusive = Math.max(endLineNumberExclusive, lineRanges[i].endLineNumberExclusive);
    }
    return new _$RD(startLineNumber, endLineNumberExclusive);
  }
  /**
   * @internal
   */
  static deserialize(lineRange) {
    return new _$RD(lineRange[0], lineRange[1]);
  }
  constructor(startLineNumber, endLineNumberExclusive) {
    if (startLineNumber > endLineNumberExclusive) {
      throw new $Eb(`startLineNumber ${startLineNumber} cannot be after endLineNumberExclusive ${endLineNumberExclusive}`);
    }
    this.startLineNumber = startLineNumber;
    this.endLineNumberExclusive = endLineNumberExclusive;
  }
  /**
   * Indicates if this line range contains the given line number.
   */
  contains(lineNumber) {
    return this.startLineNumber <= lineNumber && lineNumber < this.endLineNumberExclusive;
  }
  containsRange(range) {
    return this.startLineNumber <= range.startLineNumber && range.endLineNumberExclusive <= this.endLineNumberExclusive;
  }
  /**
   * Indicates if this line range is empty.
   */
  get isEmpty() {
    return this.startLineNumber === this.endLineNumberExclusive;
  }
  /**
   * Moves this line range by the given offset of line numbers.
   */
  delta(offset) {
    return new _$RD(this.startLineNumber + offset, this.endLineNumberExclusive + offset);
  }
  deltaLength(offset) {
    return new _$RD(this.startLineNumber, this.endLineNumberExclusive + offset);
  }
  /**
   * The number of lines this line range spans.
   */
  get length() {
    return this.endLineNumberExclusive - this.startLineNumber;
  }
  /**
   * Creates a line range that combines this and the given line range.
   */
  join(other) {
    return new _$RD(Math.min(this.startLineNumber, other.startLineNumber), Math.max(this.endLineNumberExclusive, other.endLineNumberExclusive));
  }
  toString() {
    return `[${this.startLineNumber},${this.endLineNumberExclusive})`;
  }
  /**
   * The resulting range is empty if the ranges do not intersect, but touch.
   * If the ranges don't even touch, the result is undefined.
   */
  intersect(other) {
    const startLineNumber = Math.max(this.startLineNumber, other.startLineNumber);
    const endLineNumberExclusive = Math.min(this.endLineNumberExclusive, other.endLineNumberExclusive);
    if (startLineNumber <= endLineNumberExclusive) {
      return new _$RD(startLineNumber, endLineNumberExclusive);
    }
    return void 0;
  }
  intersectsStrict(other) {
    return this.startLineNumber < other.endLineNumberExclusive && other.startLineNumber < this.endLineNumberExclusive;
  }
  intersectsOrTouches(other) {
    return this.startLineNumber <= other.endLineNumberExclusive && other.startLineNumber <= this.endLineNumberExclusive;
  }
  equals(b) {
    return this.startLineNumber === b.startLineNumber && this.endLineNumberExclusive === b.endLineNumberExclusive;
  }
  toInclusiveRange() {
    if (this.isEmpty) {
      return null;
    }
    return new $HD(this.startLineNumber, 1, this.endLineNumberExclusive - 1, Number.MAX_SAFE_INTEGER);
  }
  /**
   * @deprecated Using this function is discouraged because it might lead to bugs: The end position is not guaranteed to be a valid position!
  */
  toExclusiveRange() {
    return new $HD(this.startLineNumber, 1, this.endLineNumberExclusive, 1);
  }
  mapToLineArray(f) {
    const result = [];
    for (let lineNumber = this.startLineNumber; lineNumber < this.endLineNumberExclusive; lineNumber++) {
      result.push(f(lineNumber));
    }
    return result;
  }
  forEach(f) {
    for (let lineNumber = this.startLineNumber; lineNumber < this.endLineNumberExclusive; lineNumber++) {
      f(lineNumber);
    }
  }
  /**
   * @internal
   */
  serialize() {
    return [this.startLineNumber, this.endLineNumberExclusive];
  }
  /**
   * Converts this 1-based line range to a 0-based offset range (subtracts 1!).
   * @internal
   */
  toOffsetRange() {
    return new $PD(this.startLineNumber - 1, this.endLineNumberExclusive - 1);
  }
  distanceToRange(other) {
    if (this.endLineNumberExclusive <= other.startLineNumber) {
      return other.startLineNumber - this.endLineNumberExclusive;
    }
    if (other.endLineNumberExclusive <= this.startLineNumber) {
      return this.startLineNumber - other.endLineNumberExclusive;
    }
    return 0;
  }
  distanceToLine(lineNumber) {
    if (this.contains(lineNumber)) {
      return 0;
    }
    if (lineNumber < this.startLineNumber) {
      return this.startLineNumber - lineNumber;
    }
    return lineNumber - this.endLineNumberExclusive;
  }
  addMargin(marginTop, marginBottom) {
    return new _$RD(this.startLineNumber - marginTop, this.endLineNumberExclusive + marginBottom);
  }
};
var $SD = class _$SD {
  constructor(c = []) {
    this.c = c;
  }
  get ranges() {
    return this.c;
  }
  addRange(range) {
    if (range.length === 0) {
      return;
    }
    const joinRangeStartIdx = $Nb(this.c, (r) => r.endLineNumberExclusive >= range.startLineNumber);
    const joinRangeEndIdxExclusive = $Lb(this.c, (r) => r.startLineNumber <= range.endLineNumberExclusive) + 1;
    if (joinRangeStartIdx === joinRangeEndIdxExclusive) {
      this.c.splice(joinRangeStartIdx, 0, range);
    } else if (joinRangeStartIdx === joinRangeEndIdxExclusive - 1) {
      const joinRange = this.c[joinRangeStartIdx];
      this.c[joinRangeStartIdx] = joinRange.join(range);
    } else {
      const joinRange = this.c[joinRangeStartIdx].join(this.c[joinRangeEndIdxExclusive - 1]).join(range);
      this.c.splice(joinRangeStartIdx, joinRangeEndIdxExclusive - joinRangeStartIdx, joinRange);
    }
  }
  contains(lineNumber) {
    const rangeThatStartsBeforeEnd = $Kb(this.c, (r) => r.startLineNumber <= lineNumber);
    return !!rangeThatStartsBeforeEnd && rangeThatStartsBeforeEnd.endLineNumberExclusive > lineNumber;
  }
  intersects(range) {
    const rangeThatStartsBeforeEnd = $Kb(this.c, (r) => r.startLineNumber < range.endLineNumberExclusive);
    return !!rangeThatStartsBeforeEnd && rangeThatStartsBeforeEnd.endLineNumberExclusive > range.startLineNumber;
  }
  getUnion(other) {
    if (this.c.length === 0) {
      return other;
    }
    if (other.c.length === 0) {
      return this;
    }
    const result = [];
    let i1 = 0;
    let i2 = 0;
    let current = null;
    while (i1 < this.c.length || i2 < other.c.length) {
      let next = null;
      if (i1 < this.c.length && i2 < other.c.length) {
        const lineRange1 = this.c[i1];
        const lineRange2 = other.c[i2];
        if (lineRange1.startLineNumber < lineRange2.startLineNumber) {
          next = lineRange1;
          i1++;
        } else {
          next = lineRange2;
          i2++;
        }
      } else if (i1 < this.c.length) {
        next = this.c[i1];
        i1++;
      } else {
        next = other.c[i2];
        i2++;
      }
      if (current === null) {
        current = next;
      } else {
        if (current.endLineNumberExclusive >= next.startLineNumber) {
          current = new $RD(current.startLineNumber, Math.max(current.endLineNumberExclusive, next.endLineNumberExclusive));
        } else {
          result.push(current);
          current = next;
        }
      }
    }
    if (current !== null) {
      result.push(current);
    }
    return new _$SD(result);
  }
  /**
   * Subtracts all ranges in this set from `range` and returns the result.
   */
  subtractFrom(range) {
    const joinRangeStartIdx = $Nb(this.c, (r) => r.endLineNumberExclusive >= range.startLineNumber);
    const joinRangeEndIdxExclusive = $Lb(this.c, (r) => r.startLineNumber <= range.endLineNumberExclusive) + 1;
    if (joinRangeStartIdx === joinRangeEndIdxExclusive) {
      return new _$SD([range]);
    }
    const result = [];
    let startLineNumber = range.startLineNumber;
    for (let i = joinRangeStartIdx; i < joinRangeEndIdxExclusive; i++) {
      const r = this.c[i];
      if (r.startLineNumber > startLineNumber) {
        result.push(new $RD(startLineNumber, r.startLineNumber));
      }
      startLineNumber = r.endLineNumberExclusive;
    }
    if (startLineNumber < range.endLineNumberExclusive) {
      result.push(new $RD(startLineNumber, range.endLineNumberExclusive));
    }
    return new _$SD(result);
  }
  toString() {
    return this.c.map((r) => r.toString()).join(", ");
  }
  getIntersection(other) {
    const result = [];
    let i1 = 0;
    let i2 = 0;
    while (i1 < this.c.length && i2 < other.c.length) {
      const r1 = this.c[i1];
      const r2 = other.c[i2];
      const i = r1.intersect(r2);
      if (i && !i.isEmpty) {
        result.push(i);
      }
      if (r1.endLineNumberExclusive < r2.endLineNumberExclusive) {
        i1++;
      } else {
        i2++;
      }
    }
    return new _$SD(result);
  }
  getWithDelta(value) {
    return new _$SD(this.c.map((r) => r.delta(value)));
  }
};

// out-build/vs/base/common/uint.js
var Constants;
(function(Constants3) {
  Constants3[Constants3["MAX_SAFE_SMALL_INTEGER"] = 1073741824] = "MAX_SAFE_SMALL_INTEGER";
  Constants3[Constants3["MIN_SAFE_SMALL_INTEGER"] = -1073741824] = "MIN_SAFE_SMALL_INTEGER";
  Constants3[Constants3["MAX_UINT_8"] = 255] = "MAX_UINT_8";
  Constants3[Constants3["MAX_UINT_16"] = 65535] = "MAX_UINT_16";
  Constants3[Constants3["MAX_UINT_32"] = 4294967295] = "MAX_UINT_32";
  Constants3[Constants3["UNICODE_SUPPLEMENTARY_PLANE_BEGIN"] = 65536] = "UNICODE_SUPPLEMENTARY_PLANE_BEGIN";
})(Constants || (Constants = {}));
function $Mf(v) {
  if (v < 0) {
    return 0;
  }
  if (v > 4294967295) {
    return 4294967295;
  }
  return v | 0;
}

// out-build/vs/editor/common/model/prefixSumComputer.js
var $gG = class {
  constructor(values) {
    this.a = values;
    this.b = new Uint32Array(values.length);
    this.c = new Int32Array(1);
    this.c[0] = -1;
  }
  getCount() {
    return this.a.length;
  }
  insertValues(insertIndex, insertValues) {
    insertIndex = $Mf(insertIndex);
    const oldValues = this.a;
    const oldPrefixSum = this.b;
    const insertValuesLen = insertValues.length;
    if (insertValuesLen === 0) {
      return false;
    }
    this.a = new Uint32Array(oldValues.length + insertValuesLen);
    this.a.set(oldValues.subarray(0, insertIndex), 0);
    this.a.set(oldValues.subarray(insertIndex), insertIndex + insertValuesLen);
    this.a.set(insertValues, insertIndex);
    if (insertIndex - 1 < this.c[0]) {
      this.c[0] = insertIndex - 1;
    }
    this.b = new Uint32Array(this.a.length);
    if (this.c[0] >= 0) {
      this.b.set(oldPrefixSum.subarray(0, this.c[0] + 1));
    }
    return true;
  }
  setValue(index, value) {
    index = $Mf(index);
    value = $Mf(value);
    if (this.a[index] === value) {
      return false;
    }
    this.a[index] = value;
    if (index - 1 < this.c[0]) {
      this.c[0] = index - 1;
    }
    return true;
  }
  removeValues(startIndex, count) {
    startIndex = $Mf(startIndex);
    count = $Mf(count);
    const oldValues = this.a;
    const oldPrefixSum = this.b;
    if (startIndex >= oldValues.length) {
      return false;
    }
    const maxCount = oldValues.length - startIndex;
    if (count >= maxCount) {
      count = maxCount;
    }
    if (count === 0) {
      return false;
    }
    this.a = new Uint32Array(oldValues.length - count);
    this.a.set(oldValues.subarray(0, startIndex), 0);
    this.a.set(oldValues.subarray(startIndex + count), startIndex);
    this.b = new Uint32Array(this.a.length);
    if (startIndex - 1 < this.c[0]) {
      this.c[0] = startIndex - 1;
    }
    if (this.c[0] >= 0) {
      this.b.set(oldPrefixSum.subarray(0, this.c[0] + 1));
    }
    return true;
  }
  getTotalSum() {
    if (this.a.length === 0) {
      return 0;
    }
    return this.d(this.a.length - 1);
  }
  /**
   * Returns the sum of the first `index + 1` many items.
   * @returns `SUM(0 <= j <= index, values[j])`.
   */
  getPrefixSum(index) {
    if (index < 0) {
      return 0;
    }
    index = $Mf(index);
    return this.d(index);
  }
  d(index) {
    if (index <= this.c[0]) {
      return this.b[index];
    }
    let startIndex = this.c[0] + 1;
    if (startIndex === 0) {
      this.b[0] = this.a[0];
      startIndex++;
    }
    if (index >= this.a.length) {
      index = this.a.length - 1;
    }
    for (let i = startIndex; i <= index; i++) {
      this.b[i] = this.b[i - 1] + this.a[i];
    }
    this.c[0] = Math.max(this.c[0], index);
    return this.b[index];
  }
  getIndexOf(sum) {
    sum = Math.floor(sum);
    this.getTotalSum();
    let low = 0;
    let high = this.a.length - 1;
    let mid = 0;
    let midStop = 0;
    let midStart = 0;
    while (low <= high) {
      mid = low + (high - low) / 2 | 0;
      midStop = this.b[mid];
      midStart = midStop - this.a[mid];
      if (sum < midStart) {
        high = mid - 1;
      } else if (sum >= midStop) {
        low = mid + 1;
      } else {
        break;
      }
    }
    return new $iG(mid, sum - midStart);
  }
};
var $iG = class {
  constructor(index, remainder) {
    this.index = index;
    this.remainder = remainder;
    this._prefixSumIndexOfResultBrand = void 0;
    this.index = index;
    this.remainder = remainder;
  }
};

// out-build/vs/editor/common/model/mirrorTextModel.js
var $jG = class {
  constructor(uri, lines, eol, versionId) {
    this.a = uri;
    this.b = lines;
    this.c = eol;
    this.d = versionId;
    this.f = null;
    this.g = null;
  }
  dispose() {
    this.b.length = 0;
  }
  get version() {
    return this.d;
  }
  getText() {
    if (this.g === null) {
      this.g = this.b.join(this.c);
    }
    return this.g;
  }
  onEvents(e) {
    if (e.eol && e.eol !== this.c) {
      this.c = e.eol;
      this.f = null;
    }
    const changes = e.changes;
    for (const change of changes) {
      this.k(change.range);
      this.l(new $GD(change.range.startLineNumber, change.range.startColumn), change.text);
    }
    this.d = e.versionId;
    this.g = null;
  }
  h() {
    if (!this.f) {
      const eolLength = this.c.length;
      const linesLength = this.b.length;
      const lineStartValues = new Uint32Array(linesLength);
      for (let i = 0; i < linesLength; i++) {
        lineStartValues[i] = this.b[i].length + eolLength;
      }
      this.f = new $gG(lineStartValues);
    }
  }
  /**
   * All changes to a line's text go through this method
   */
  j(lineIndex, newValue) {
    this.b[lineIndex] = newValue;
    if (this.f) {
      this.f.setValue(lineIndex, this.b[lineIndex].length + this.c.length);
    }
  }
  k(range) {
    if (range.startLineNumber === range.endLineNumber) {
      if (range.startColumn === range.endColumn) {
        return;
      }
      this.j(range.startLineNumber - 1, this.b[range.startLineNumber - 1].substring(0, range.startColumn - 1) + this.b[range.startLineNumber - 1].substring(range.endColumn - 1));
      return;
    }
    this.j(range.startLineNumber - 1, this.b[range.startLineNumber - 1].substring(0, range.startColumn - 1) + this.b[range.endLineNumber - 1].substring(range.endColumn - 1));
    this.b.splice(range.startLineNumber, range.endLineNumber - range.startLineNumber);
    if (this.f) {
      this.f.removeValues(range.startLineNumber, range.endLineNumber - range.startLineNumber);
    }
  }
  l(position, insertText) {
    if (insertText.length === 0) {
      return;
    }
    const insertLines = $4f(insertText);
    if (insertLines.length === 1) {
      this.j(position.lineNumber - 1, this.b[position.lineNumber - 1].substring(0, position.column - 1) + insertLines[0] + this.b[position.lineNumber - 1].substring(position.column - 1));
      return;
    }
    insertLines[insertLines.length - 1] += this.b[position.lineNumber - 1].substring(position.column - 1);
    this.j(position.lineNumber - 1, this.b[position.lineNumber - 1].substring(0, position.column - 1) + insertLines[0]);
    const newLengths = new Uint32Array(insertLines.length - 1);
    for (let i = 1; i < insertLines.length; i++) {
      this.b.splice(position.lineNumber + i - 1, 0, insertLines[i]);
      newLengths[i - 1] = insertLines[i].length + this.c.length;
    }
    if (this.f) {
      this.f.insertValues(position.lineNumber, newLengths);
    }
  }
};

// out-build/vs/editor/common/core/misc/eolCounter.js
var StringEOL;
(function(StringEOL2) {
  StringEOL2[StringEOL2["Unknown"] = 0] = "Unknown";
  StringEOL2[StringEOL2["Invalid"] = 3] = "Invalid";
  StringEOL2[StringEOL2["LF"] = 1] = "LF";
  StringEOL2[StringEOL2["CRLF"] = 2] = "CRLF";
})(StringEOL || (StringEOL = {}));
function $GE(text) {
  let eolCount = 0;
  let firstLineLength = 0;
  let lastLineStart = 0;
  let eol = 0;
  for (let i = 0, len = text.length; i < len; i++) {
    const chr = text.charCodeAt(i);
    if (chr === 13) {
      if (eolCount === 0) {
        firstLineLength = i;
      }
      eolCount++;
      if (i + 1 < len && text.charCodeAt(i + 1) === 10) {
        eol |= 2;
        i++;
      } else {
        eol |= 3;
      }
      lastLineStart = i + 1;
    } else if (chr === 10) {
      eol |= 1;
      if (eolCount === 0) {
        firstLineLength = i;
      }
      eolCount++;
      lastLineStart = i + 1;
    }
  }
  if (eolCount === 0) {
    firstLineLength = text.length;
  }
  return [eolCount, firstLineLength, text.length - lastLineStart, eol];
}

// out-build/vs/base/common/codiconsUtil.js
var _codiconFontCharacters = /* @__PURE__ */ Object.create(null);
function $1j(id2, fontCharacter) {
  if ($7c(fontCharacter)) {
    const val = _codiconFontCharacters[fontCharacter];
    if (val === void 0) {
      throw new Error(`${id2} references an unknown codicon: ${fontCharacter}`);
    }
    fontCharacter = val;
  }
  _codiconFontCharacters[id2] = fontCharacter;
  return { id: id2 };
}

// out-build/vs/base/common/codiconsLibrary.js
var $3j = {
  add: $1j("add", 6e4),
  plus: $1j("plus", 6e4),
  gistNew: $1j("gist-new", 6e4),
  repoCreate: $1j("repo-create", 6e4),
  lightbulb: $1j("lightbulb", 60001),
  lightBulb: $1j("light-bulb", 60001),
  repo: $1j("repo", 60002),
  repoDelete: $1j("repo-delete", 60002),
  gistFork: $1j("gist-fork", 60003),
  repoForked: $1j("repo-forked", 60003),
  gitPullRequest: $1j("git-pull-request", 60004),
  gitPullRequestAbandoned: $1j("git-pull-request-abandoned", 60004),
  recordKeys: $1j("record-keys", 60005),
  keyboard: $1j("keyboard", 60005),
  tag: $1j("tag", 60006),
  gitPullRequestLabel: $1j("git-pull-request-label", 60006),
  tagAdd: $1j("tag-add", 60006),
  tagRemove: $1j("tag-remove", 60006),
  person: $1j("person", 60007),
  personFollow: $1j("person-follow", 60007),
  personOutline: $1j("person-outline", 60007),
  personFilled: $1j("person-filled", 60007),
  sourceControl: $1j("source-control", 60008),
  mirror: $1j("mirror", 60009),
  mirrorPublic: $1j("mirror-public", 60009),
  star: $1j("star", 60010),
  starAdd: $1j("star-add", 60010),
  starDelete: $1j("star-delete", 60010),
  starEmpty: $1j("star-empty", 60010),
  comment: $1j("comment", 60011),
  commentAdd: $1j("comment-add", 60011),
  alert: $1j("alert", 60012),
  warning: $1j("warning", 60012),
  search: $1j("search", 60013),
  searchSave: $1j("search-save", 60013),
  logOut: $1j("log-out", 60014),
  signOut: $1j("sign-out", 60014),
  logIn: $1j("log-in", 60015),
  signIn: $1j("sign-in", 60015),
  eye: $1j("eye", 60016),
  eyeUnwatch: $1j("eye-unwatch", 60016),
  eyeWatch: $1j("eye-watch", 60016),
  circleFilled: $1j("circle-filled", 60017),
  primitiveDot: $1j("primitive-dot", 60017),
  closeDirty: $1j("close-dirty", 60017),
  debugBreakpoint: $1j("debug-breakpoint", 60017),
  debugBreakpointDisabled: $1j("debug-breakpoint-disabled", 60017),
  debugHint: $1j("debug-hint", 60017),
  terminalDecorationSuccess: $1j("terminal-decoration-success", 60017),
  primitiveSquare: $1j("primitive-square", 60018),
  edit: $1j("edit", 60019),
  pencil: $1j("pencil", 60019),
  info: $1j("info", 60020),
  issueOpened: $1j("issue-opened", 60020),
  gistPrivate: $1j("gist-private", 60021),
  gitForkPrivate: $1j("git-fork-private", 60021),
  lock: $1j("lock", 60021),
  mirrorPrivate: $1j("mirror-private", 60021),
  close: $1j("close", 60022),
  removeClose: $1j("remove-close", 60022),
  x: $1j("x", 60022),
  repoSync: $1j("repo-sync", 60023),
  sync: $1j("sync", 60023),
  clone: $1j("clone", 60024),
  desktopDownload: $1j("desktop-download", 60024),
  beaker: $1j("beaker", 60025),
  microscope: $1j("microscope", 60025),
  vm: $1j("vm", 60026),
  deviceDesktop: $1j("device-desktop", 60026),
  file: $1j("file", 60027),
  more: $1j("more", 60028),
  ellipsis: $1j("ellipsis", 60028),
  kebabHorizontal: $1j("kebab-horizontal", 60028),
  mailReply: $1j("mail-reply", 60029),
  reply: $1j("reply", 60029),
  organization: $1j("organization", 60030),
  organizationFilled: $1j("organization-filled", 60030),
  organizationOutline: $1j("organization-outline", 60030),
  newFile: $1j("new-file", 60031),
  fileAdd: $1j("file-add", 60031),
  newFolder: $1j("new-folder", 60032),
  fileDirectoryCreate: $1j("file-directory-create", 60032),
  trash: $1j("trash", 60033),
  trashcan: $1j("trashcan", 60033),
  history: $1j("history", 60034),
  clock: $1j("clock", 60034),
  folder: $1j("folder", 60035),
  fileDirectory: $1j("file-directory", 60035),
  symbolFolder: $1j("symbol-folder", 60035),
  logoGithub: $1j("logo-github", 60036),
  markGithub: $1j("mark-github", 60036),
  github: $1j("github", 60036),
  terminal: $1j("terminal", 60037),
  console: $1j("console", 60037),
  repl: $1j("repl", 60037),
  zap: $1j("zap", 60038),
  symbolEvent: $1j("symbol-event", 60038),
  error: $1j("error", 60039),
  stop: $1j("stop", 60039),
  variable: $1j("variable", 60040),
  symbolVariable: $1j("symbol-variable", 60040),
  array: $1j("array", 60042),
  symbolArray: $1j("symbol-array", 60042),
  symbolModule: $1j("symbol-module", 60043),
  symbolPackage: $1j("symbol-package", 60043),
  symbolNamespace: $1j("symbol-namespace", 60043),
  symbolObject: $1j("symbol-object", 60043),
  symbolMethod: $1j("symbol-method", 60044),
  symbolFunction: $1j("symbol-function", 60044),
  symbolConstructor: $1j("symbol-constructor", 60044),
  symbolBoolean: $1j("symbol-boolean", 60047),
  symbolNull: $1j("symbol-null", 60047),
  symbolNumeric: $1j("symbol-numeric", 60048),
  symbolNumber: $1j("symbol-number", 60048),
  symbolStructure: $1j("symbol-structure", 60049),
  symbolStruct: $1j("symbol-struct", 60049),
  symbolParameter: $1j("symbol-parameter", 60050),
  symbolTypeParameter: $1j("symbol-type-parameter", 60050),
  symbolKey: $1j("symbol-key", 60051),
  symbolText: $1j("symbol-text", 60051),
  symbolReference: $1j("symbol-reference", 60052),
  goToFile: $1j("go-to-file", 60052),
  symbolEnum: $1j("symbol-enum", 60053),
  symbolValue: $1j("symbol-value", 60053),
  symbolRuler: $1j("symbol-ruler", 60054),
  symbolUnit: $1j("symbol-unit", 60054),
  activateBreakpoints: $1j("activate-breakpoints", 60055),
  archive: $1j("archive", 60056),
  arrowBoth: $1j("arrow-both", 60057),
  arrowDown: $1j("arrow-down", 60058),
  arrowLeft: $1j("arrow-left", 60059),
  arrowRight: $1j("arrow-right", 60060),
  arrowSmallDown: $1j("arrow-small-down", 60061),
  arrowSmallLeft: $1j("arrow-small-left", 60062),
  arrowSmallRight: $1j("arrow-small-right", 60063),
  arrowSmallUp: $1j("arrow-small-up", 60064),
  arrowUp: $1j("arrow-up", 60065),
  bell: $1j("bell", 60066),
  bold: $1j("bold", 60067),
  book: $1j("book", 60068),
  bookmark: $1j("bookmark", 60069),
  debugBreakpointConditionalUnverified: $1j("debug-breakpoint-conditional-unverified", 60070),
  debugBreakpointConditional: $1j("debug-breakpoint-conditional", 60071),
  debugBreakpointConditionalDisabled: $1j("debug-breakpoint-conditional-disabled", 60071),
  debugBreakpointDataUnverified: $1j("debug-breakpoint-data-unverified", 60072),
  debugBreakpointData: $1j("debug-breakpoint-data", 60073),
  debugBreakpointDataDisabled: $1j("debug-breakpoint-data-disabled", 60073),
  debugBreakpointLogUnverified: $1j("debug-breakpoint-log-unverified", 60074),
  debugBreakpointLog: $1j("debug-breakpoint-log", 60075),
  debugBreakpointLogDisabled: $1j("debug-breakpoint-log-disabled", 60075),
  briefcase: $1j("briefcase", 60076),
  broadcast: $1j("broadcast", 60077),
  browser: $1j("browser", 60078),
  bug: $1j("bug", 60079),
  calendar: $1j("calendar", 60080),
  caseSensitive: $1j("case-sensitive", 60081),
  check: $1j("check", 60082),
  checklist: $1j("checklist", 60083),
  chevronDown: $1j("chevron-down", 60084),
  chevronLeft: $1j("chevron-left", 60085),
  chevronRight: $1j("chevron-right", 60086),
  chevronUp: $1j("chevron-up", 60087),
  chromeClose: $1j("chrome-close", 60088),
  chromeMaximize: $1j("chrome-maximize", 60089),
  chromeMinimize: $1j("chrome-minimize", 60090),
  chromeRestore: $1j("chrome-restore", 60091),
  circleOutline: $1j("circle-outline", 60092),
  circle: $1j("circle", 60092),
  debugBreakpointUnverified: $1j("debug-breakpoint-unverified", 60092),
  terminalDecorationIncomplete: $1j("terminal-decoration-incomplete", 60092),
  circleSlash: $1j("circle-slash", 60093),
  circuitBoard: $1j("circuit-board", 60094),
  clearAll: $1j("clear-all", 60095),
  clippy: $1j("clippy", 60096),
  closeAll: $1j("close-all", 60097),
  cloudDownload: $1j("cloud-download", 60098),
  cloudUpload: $1j("cloud-upload", 60099),
  code: $1j("code", 60100),
  collapseAll: $1j("collapse-all", 60101),
  colorMode: $1j("color-mode", 60102),
  commentDiscussion: $1j("comment-discussion", 60103),
  creditCard: $1j("credit-card", 60105),
  dash: $1j("dash", 60108),
  dashboard: $1j("dashboard", 60109),
  database: $1j("database", 60110),
  debugContinue: $1j("debug-continue", 60111),
  debugDisconnect: $1j("debug-disconnect", 60112),
  debugPause: $1j("debug-pause", 60113),
  debugRestart: $1j("debug-restart", 60114),
  debugStart: $1j("debug-start", 60115),
  debugStepInto: $1j("debug-step-into", 60116),
  debugStepOut: $1j("debug-step-out", 60117),
  debugStepOver: $1j("debug-step-over", 60118),
  debugStop: $1j("debug-stop", 60119),
  debug: $1j("debug", 60120),
  deviceCameraVideo: $1j("device-camera-video", 60121),
  deviceCamera: $1j("device-camera", 60122),
  deviceMobile: $1j("device-mobile", 60123),
  diffAdded: $1j("diff-added", 60124),
  diffIgnored: $1j("diff-ignored", 60125),
  diffModified: $1j("diff-modified", 60126),
  diffRemoved: $1j("diff-removed", 60127),
  diffRenamed: $1j("diff-renamed", 60128),
  diff: $1j("diff", 60129),
  diffSidebyside: $1j("diff-sidebyside", 60129),
  discard: $1j("discard", 60130),
  editorLayout: $1j("editor-layout", 60131),
  emptyWindow: $1j("empty-window", 60132),
  exclude: $1j("exclude", 60133),
  extensions: $1j("extensions", 60134),
  eyeClosed: $1j("eye-closed", 60135),
  fileBinary: $1j("file-binary", 60136),
  fileCode: $1j("file-code", 60137),
  fileMedia: $1j("file-media", 60138),
  filePdf: $1j("file-pdf", 60139),
  fileSubmodule: $1j("file-submodule", 60140),
  fileSymlinkDirectory: $1j("file-symlink-directory", 60141),
  fileSymlinkFile: $1j("file-symlink-file", 60142),
  fileZip: $1j("file-zip", 60143),
  files: $1j("files", 60144),
  filter: $1j("filter", 60145),
  flame: $1j("flame", 60146),
  foldDown: $1j("fold-down", 60147),
  foldUp: $1j("fold-up", 60148),
  fold: $1j("fold", 60149),
  folderActive: $1j("folder-active", 60150),
  folderOpened: $1j("folder-opened", 60151),
  gear: $1j("gear", 60152),
  gift: $1j("gift", 60153),
  gistSecret: $1j("gist-secret", 60154),
  gist: $1j("gist", 60155),
  gitCommit: $1j("git-commit", 60156),
  gitCompare: $1j("git-compare", 60157),
  compareChanges: $1j("compare-changes", 60157),
  gitMerge: $1j("git-merge", 60158),
  githubAction: $1j("github-action", 60159),
  githubAlt: $1j("github-alt", 60160),
  globe: $1j("globe", 60161),
  grabber: $1j("grabber", 60162),
  graph: $1j("graph", 60163),
  gripper: $1j("gripper", 60164),
  heart: $1j("heart", 60165),
  home: $1j("home", 60166),
  horizontalRule: $1j("horizontal-rule", 60167),
  hubot: $1j("hubot", 60168),
  inbox: $1j("inbox", 60169),
  issueReopened: $1j("issue-reopened", 60171),
  issues: $1j("issues", 60172),
  italic: $1j("italic", 60173),
  jersey: $1j("jersey", 60174),
  json: $1j("json", 60175),
  kebabVertical: $1j("kebab-vertical", 60176),
  key: $1j("key", 60177),
  law: $1j("law", 60178),
  lightbulbAutofix: $1j("lightbulb-autofix", 60179),
  linkExternal: $1j("link-external", 60180),
  link: $1j("link", 60181),
  listOrdered: $1j("list-ordered", 60182),
  listUnordered: $1j("list-unordered", 60183),
  liveShare: $1j("live-share", 60184),
  loading: $1j("loading", 60185),
  location: $1j("location", 60186),
  mailRead: $1j("mail-read", 60187),
  mail: $1j("mail", 60188),
  markdown: $1j("markdown", 60189),
  megaphone: $1j("megaphone", 60190),
  mention: $1j("mention", 60191),
  milestone: $1j("milestone", 60192),
  gitPullRequestMilestone: $1j("git-pull-request-milestone", 60192),
  mortarBoard: $1j("mortar-board", 60193),
  move: $1j("move", 60194),
  multipleWindows: $1j("multiple-windows", 60195),
  mute: $1j("mute", 60196),
  noNewline: $1j("no-newline", 60197),
  note: $1j("note", 60198),
  octoface: $1j("octoface", 60199),
  openPreview: $1j("open-preview", 60200),
  package: $1j("package", 60201),
  paintcan: $1j("paintcan", 60202),
  pin: $1j("pin", 60203),
  play: $1j("play", 60204),
  run: $1j("run", 60204),
  plug: $1j("plug", 60205),
  preserveCase: $1j("preserve-case", 60206),
  preview: $1j("preview", 60207),
  project: $1j("project", 60208),
  pulse: $1j("pulse", 60209),
  question: $1j("question", 60210),
  quote: $1j("quote", 60211),
  radioTower: $1j("radio-tower", 60212),
  reactions: $1j("reactions", 60213),
  references: $1j("references", 60214),
  refresh: $1j("refresh", 60215),
  regex: $1j("regex", 60216),
  remoteExplorer: $1j("remote-explorer", 60217),
  remote: $1j("remote", 60218),
  remove: $1j("remove", 60219),
  replaceAll: $1j("replace-all", 60220),
  replace: $1j("replace", 60221),
  repoClone: $1j("repo-clone", 60222),
  repoForcePush: $1j("repo-force-push", 60223),
  repoPull: $1j("repo-pull", 60224),
  repoPush: $1j("repo-push", 60225),
  report: $1j("report", 60226),
  requestChanges: $1j("request-changes", 60227),
  rocket: $1j("rocket", 60228),
  rootFolderOpened: $1j("root-folder-opened", 60229),
  rootFolder: $1j("root-folder", 60230),
  rss: $1j("rss", 60231),
  ruby: $1j("ruby", 60232),
  saveAll: $1j("save-all", 60233),
  saveAs: $1j("save-as", 60234),
  save: $1j("save", 60235),
  screenFull: $1j("screen-full", 60236),
  screenNormal: $1j("screen-normal", 60237),
  searchStop: $1j("search-stop", 60238),
  server: $1j("server", 60240),
  settingsGear: $1j("settings-gear", 60241),
  settings: $1j("settings", 60242),
  shield: $1j("shield", 60243),
  smiley: $1j("smiley", 60244),
  sortPrecedence: $1j("sort-precedence", 60245),
  splitHorizontal: $1j("split-horizontal", 60246),
  splitVertical: $1j("split-vertical", 60247),
  squirrel: $1j("squirrel", 60248),
  starFull: $1j("star-full", 60249),
  starHalf: $1j("star-half", 60250),
  symbolClass: $1j("symbol-class", 60251),
  symbolColor: $1j("symbol-color", 60252),
  symbolConstant: $1j("symbol-constant", 60253),
  symbolEnumMember: $1j("symbol-enum-member", 60254),
  symbolField: $1j("symbol-field", 60255),
  symbolFile: $1j("symbol-file", 60256),
  symbolInterface: $1j("symbol-interface", 60257),
  symbolKeyword: $1j("symbol-keyword", 60258),
  symbolMisc: $1j("symbol-misc", 60259),
  symbolOperator: $1j("symbol-operator", 60260),
  symbolProperty: $1j("symbol-property", 60261),
  wrench: $1j("wrench", 60261),
  wrenchSubaction: $1j("wrench-subaction", 60261),
  symbolSnippet: $1j("symbol-snippet", 60262),
  tasklist: $1j("tasklist", 60263),
  telescope: $1j("telescope", 60264),
  textSize: $1j("text-size", 60265),
  threeBars: $1j("three-bars", 60266),
  thumbsdown: $1j("thumbsdown", 60267),
  thumbsup: $1j("thumbsup", 60268),
  tools: $1j("tools", 60269),
  triangleDown: $1j("triangle-down", 60270),
  triangleLeft: $1j("triangle-left", 60271),
  triangleRight: $1j("triangle-right", 60272),
  triangleUp: $1j("triangle-up", 60273),
  twitter: $1j("twitter", 60274),
  unfold: $1j("unfold", 60275),
  unlock: $1j("unlock", 60276),
  unmute: $1j("unmute", 60277),
  unverified: $1j("unverified", 60278),
  verified: $1j("verified", 60279),
  versions: $1j("versions", 60280),
  vmActive: $1j("vm-active", 60281),
  vmOutline: $1j("vm-outline", 60282),
  vmRunning: $1j("vm-running", 60283),
  watch: $1j("watch", 60284),
  whitespace: $1j("whitespace", 60285),
  wholeWord: $1j("whole-word", 60286),
  window: $1j("window", 60287),
  wordWrap: $1j("word-wrap", 60288),
  zoomIn: $1j("zoom-in", 60289),
  zoomOut: $1j("zoom-out", 60290),
  listFilter: $1j("list-filter", 60291),
  listFlat: $1j("list-flat", 60292),
  listSelection: $1j("list-selection", 60293),
  selection: $1j("selection", 60293),
  listTree: $1j("list-tree", 60294),
  debugBreakpointFunctionUnverified: $1j("debug-breakpoint-function-unverified", 60295),
  debugBreakpointFunction: $1j("debug-breakpoint-function", 60296),
  debugBreakpointFunctionDisabled: $1j("debug-breakpoint-function-disabled", 60296),
  debugStackframeActive: $1j("debug-stackframe-active", 60297),
  circleSmallFilled: $1j("circle-small-filled", 60298),
  debugStackframeDot: $1j("debug-stackframe-dot", 60298),
  terminalDecorationMark: $1j("terminal-decoration-mark", 60298),
  debugStackframe: $1j("debug-stackframe", 60299),
  debugStackframeFocused: $1j("debug-stackframe-focused", 60299),
  debugBreakpointUnsupported: $1j("debug-breakpoint-unsupported", 60300),
  symbolString: $1j("symbol-string", 60301),
  debugReverseContinue: $1j("debug-reverse-continue", 60302),
  debugStepBack: $1j("debug-step-back", 60303),
  debugRestartFrame: $1j("debug-restart-frame", 60304),
  debugAlt: $1j("debug-alt", 60305),
  callIncoming: $1j("call-incoming", 60306),
  callOutgoing: $1j("call-outgoing", 60307),
  menu: $1j("menu", 60308),
  expandAll: $1j("expand-all", 60309),
  feedback: $1j("feedback", 60310),
  gitPullRequestReviewer: $1j("git-pull-request-reviewer", 60310),
  groupByRefType: $1j("group-by-ref-type", 60311),
  ungroupByRefType: $1j("ungroup-by-ref-type", 60312),
  account: $1j("account", 60313),
  gitPullRequestAssignee: $1j("git-pull-request-assignee", 60313),
  bellDot: $1j("bell-dot", 60314),
  debugConsole: $1j("debug-console", 60315),
  library: $1j("library", 60316),
  output: $1j("output", 60317),
  runAll: $1j("run-all", 60318),
  syncIgnored: $1j("sync-ignored", 60319),
  pinned: $1j("pinned", 60320),
  githubInverted: $1j("github-inverted", 60321),
  serverProcess: $1j("server-process", 60322),
  serverEnvironment: $1j("server-environment", 60323),
  pass: $1j("pass", 60324),
  issueClosed: $1j("issue-closed", 60324),
  stopCircle: $1j("stop-circle", 60325),
  playCircle: $1j("play-circle", 60326),
  record: $1j("record", 60327),
  debugAltSmall: $1j("debug-alt-small", 60328),
  vmConnect: $1j("vm-connect", 60329),
  cloud: $1j("cloud", 60330),
  merge: $1j("merge", 60331),
  export: $1j("export", 60332),
  graphLeft: $1j("graph-left", 60333),
  magnet: $1j("magnet", 60334),
  notebook: $1j("notebook", 60335),
  redo: $1j("redo", 60336),
  checkAll: $1j("check-all", 60337),
  pinnedDirty: $1j("pinned-dirty", 60338),
  passFilled: $1j("pass-filled", 60339),
  circleLargeFilled: $1j("circle-large-filled", 60340),
  circleLarge: $1j("circle-large", 60341),
  circleLargeOutline: $1j("circle-large-outline", 60341),
  combine: $1j("combine", 60342),
  gather: $1j("gather", 60342),
  table: $1j("table", 60343),
  variableGroup: $1j("variable-group", 60344),
  typeHierarchy: $1j("type-hierarchy", 60345),
  typeHierarchySub: $1j("type-hierarchy-sub", 60346),
  typeHierarchySuper: $1j("type-hierarchy-super", 60347),
  gitPullRequestCreate: $1j("git-pull-request-create", 60348),
  runAbove: $1j("run-above", 60349),
  runBelow: $1j("run-below", 60350),
  notebookTemplate: $1j("notebook-template", 60351),
  debugRerun: $1j("debug-rerun", 60352),
  workspaceTrusted: $1j("workspace-trusted", 60353),
  workspaceUntrusted: $1j("workspace-untrusted", 60354),
  workspaceUnknown: $1j("workspace-unknown", 60355),
  terminalCmd: $1j("terminal-cmd", 60356),
  terminalDebian: $1j("terminal-debian", 60357),
  terminalLinux: $1j("terminal-linux", 60358),
  terminalPowershell: $1j("terminal-powershell", 60359),
  terminalTmux: $1j("terminal-tmux", 60360),
  terminalUbuntu: $1j("terminal-ubuntu", 60361),
  terminalBash: $1j("terminal-bash", 60362),
  arrowSwap: $1j("arrow-swap", 60363),
  copy: $1j("copy", 60364),
  personAdd: $1j("person-add", 60365),
  filterFilled: $1j("filter-filled", 60366),
  wand: $1j("wand", 60367),
  debugLineByLine: $1j("debug-line-by-line", 60368),
  inspect: $1j("inspect", 60369),
  layers: $1j("layers", 60370),
  layersDot: $1j("layers-dot", 60371),
  layersActive: $1j("layers-active", 60372),
  compass: $1j("compass", 60373),
  compassDot: $1j("compass-dot", 60374),
  compassActive: $1j("compass-active", 60375),
  azure: $1j("azure", 60376),
  issueDraft: $1j("issue-draft", 60377),
  gitPullRequestClosed: $1j("git-pull-request-closed", 60378),
  gitPullRequestDraft: $1j("git-pull-request-draft", 60379),
  debugAll: $1j("debug-all", 60380),
  debugCoverage: $1j("debug-coverage", 60381),
  runErrors: $1j("run-errors", 60382),
  folderLibrary: $1j("folder-library", 60383),
  debugContinueSmall: $1j("debug-continue-small", 60384),
  beakerStop: $1j("beaker-stop", 60385),
  graphLine: $1j("graph-line", 60386),
  graphScatter: $1j("graph-scatter", 60387),
  pieChart: $1j("pie-chart", 60388),
  bracket: $1j("bracket", 60175),
  bracketDot: $1j("bracket-dot", 60389),
  bracketError: $1j("bracket-error", 60390),
  lockSmall: $1j("lock-small", 60391),
  azureDevops: $1j("azure-devops", 60392),
  verifiedFilled: $1j("verified-filled", 60393),
  newline: $1j("newline", 60394),
  layout: $1j("layout", 60395),
  layoutActivitybarLeft: $1j("layout-activitybar-left", 60396),
  layoutActivitybarRight: $1j("layout-activitybar-right", 60397),
  layoutPanelLeft: $1j("layout-panel-left", 60398),
  layoutPanelCenter: $1j("layout-panel-center", 60399),
  layoutPanelJustify: $1j("layout-panel-justify", 60400),
  layoutPanelRight: $1j("layout-panel-right", 60401),
  layoutPanel: $1j("layout-panel", 60402),
  layoutSidebarLeft: $1j("layout-sidebar-left", 60403),
  layoutSidebarRight: $1j("layout-sidebar-right", 60404),
  layoutStatusbar: $1j("layout-statusbar", 60405),
  layoutMenubar: $1j("layout-menubar", 60406),
  layoutCentered: $1j("layout-centered", 60407),
  target: $1j("target", 60408),
  indent: $1j("indent", 60409),
  recordSmall: $1j("record-small", 60410),
  errorSmall: $1j("error-small", 60411),
  terminalDecorationError: $1j("terminal-decoration-error", 60411),
  arrowCircleDown: $1j("arrow-circle-down", 60412),
  arrowCircleLeft: $1j("arrow-circle-left", 60413),
  arrowCircleRight: $1j("arrow-circle-right", 60414),
  arrowCircleUp: $1j("arrow-circle-up", 60415),
  layoutSidebarRightOff: $1j("layout-sidebar-right-off", 60416),
  layoutPanelOff: $1j("layout-panel-off", 60417),
  layoutSidebarLeftOff: $1j("layout-sidebar-left-off", 60418),
  blank: $1j("blank", 60419),
  heartFilled: $1j("heart-filled", 60420),
  map: $1j("map", 60421),
  mapHorizontal: $1j("map-horizontal", 60421),
  foldHorizontal: $1j("fold-horizontal", 60421),
  mapFilled: $1j("map-filled", 60422),
  mapHorizontalFilled: $1j("map-horizontal-filled", 60422),
  foldHorizontalFilled: $1j("fold-horizontal-filled", 60422),
  circleSmall: $1j("circle-small", 60423),
  bellSlash: $1j("bell-slash", 60424),
  bellSlashDot: $1j("bell-slash-dot", 60425),
  commentUnresolved: $1j("comment-unresolved", 60426),
  gitPullRequestGoToChanges: $1j("git-pull-request-go-to-changes", 60427),
  gitPullRequestNewChanges: $1j("git-pull-request-new-changes", 60428),
  searchFuzzy: $1j("search-fuzzy", 60429),
  commentDraft: $1j("comment-draft", 60430),
  send: $1j("send", 60431),
  sparkle: $1j("sparkle", 60432),
  insert: $1j("insert", 60433),
  mic: $1j("mic", 60434),
  thumbsdownFilled: $1j("thumbsdown-filled", 60435),
  thumbsupFilled: $1j("thumbsup-filled", 60436),
  coffee: $1j("coffee", 60437),
  snake: $1j("snake", 60438),
  game: $1j("game", 60439),
  vr: $1j("vr", 60440),
  chip: $1j("chip", 60441),
  piano: $1j("piano", 60442),
  music: $1j("music", 60443),
  micFilled: $1j("mic-filled", 60444),
  repoFetch: $1j("repo-fetch", 60445),
  copilot: $1j("copilot", 60446),
  lightbulbSparkle: $1j("lightbulb-sparkle", 60447),
  robot: $1j("robot", 60448),
  sparkleFilled: $1j("sparkle-filled", 60449),
  diffSingle: $1j("diff-single", 60450),
  diffMultiple: $1j("diff-multiple", 60451),
  surroundWith: $1j("surround-with", 60452),
  share: $1j("share", 60453),
  gitStash: $1j("git-stash", 60454),
  gitStashApply: $1j("git-stash-apply", 60455),
  gitStashPop: $1j("git-stash-pop", 60456),
  vscode: $1j("vscode", 60457),
  vscodeInsiders: $1j("vscode-insiders", 60458),
  codeOss: $1j("code-oss", 60459),
  runCoverage: $1j("run-coverage", 60460),
  runAllCoverage: $1j("run-all-coverage", 60461),
  coverage: $1j("coverage", 60462),
  githubProject: $1j("github-project", 60463),
  mapVertical: $1j("map-vertical", 60464),
  foldVertical: $1j("fold-vertical", 60464),
  mapVerticalFilled: $1j("map-vertical-filled", 60465),
  foldVerticalFilled: $1j("fold-vertical-filled", 60465),
  goToSearch: $1j("go-to-search", 60466),
  percentage: $1j("percentage", 60467),
  sortPercentage: $1j("sort-percentage", 60467),
  attach: $1j("attach", 60468),
  goToEditingSession: $1j("go-to-editing-session", 60469),
  editSession: $1j("edit-session", 60470),
  codeReview: $1j("code-review", 60471),
  copilotWarning: $1j("copilot-warning", 60472),
  python: $1j("python", 60473),
  copilotLarge: $1j("copilot-large", 60474),
  copilotWarningLarge: $1j("copilot-warning-large", 60475),
  keyboardTab: $1j("keyboard-tab", 60476),
  copilotBlocked: $1j("copilot-blocked", 60477),
  copilotNotConnected: $1j("copilot-not-connected", 60478),
  flag: $1j("flag", 60479),
  lightbulbEmpty: $1j("lightbulb-empty", 60480),
  symbolMethodArrow: $1j("symbol-method-arrow", 60481),
  copilotUnavailable: $1j("copilot-unavailable", 60482),
  repoPinned: $1j("repo-pinned", 60483),
  keyboardTabAbove: $1j("keyboard-tab-above", 60484),
  keyboardTabBelow: $1j("keyboard-tab-below", 60485),
  gitPullRequestDone: $1j("git-pull-request-done", 60486),
  mcp: $1j("mcp", 60487),
  extensionsLarge: $1j("extensions-large", 60488),
  layoutPanelDock: $1j("layout-panel-dock", 60489),
  layoutSidebarLeftDock: $1j("layout-sidebar-left-dock", 60490),
  layoutSidebarRightDock: $1j("layout-sidebar-right-dock", 60491),
  copilotInProgress: $1j("copilot-in-progress", 60492),
  copilotError: $1j("copilot-error", 60493),
  copilotSuccess: $1j("copilot-success", 60494),
  chatSparkle: $1j("chat-sparkle", 60495),
  searchSparkle: $1j("search-sparkle", 60496),
  editSparkle: $1j("edit-sparkle", 60497),
  copilotSnooze: $1j("copilot-snooze", 60498),
  sendToRemoteAgent: $1j("send-to-remote-agent", 60499),
  commentDiscussionSparkle: $1j("comment-discussion-sparkle", 60500),
  chatSparkleWarning: $1j("chat-sparkle-warning", 60501),
  chatSparkleError: $1j("chat-sparkle-error", 60502),
  collection: $1j("collection", 60503),
  newCollection: $1j("new-collection", 60504),
  thinking: $1j("thinking", 60505),
  build: $1j("build", 60506),
  commentDiscussionQuote: $1j("comment-discussion-quote", 60507),
  cursor: $1j("cursor", 60508),
  eraser: $1j("eraser", 60509),
  fileText: $1j("file-text", 60510),
  gitLens: $1j("git-lens", 60511),
  quotes: $1j("quotes", 60512),
  rename: $1j("rename", 60513),
  runWithDeps: $1j("run-with-deps", 60514),
  debugConnected: $1j("debug-connected", 60515),
  strikethrough: $1j("strikethrough", 60516),
  openInProduct: $1j("open-in-product", 60517),
  indexZero: $1j("index-zero", 60518),
  agent: $1j("agent", 60519),
  editCode: $1j("edit-code", 60520),
  repoSelected: $1j("repo-selected", 60521),
  skip: $1j("skip", 60522),
  mergeInto: $1j("merge-into", 60523),
  gitBranchChanges: $1j("git-branch-changes", 60524),
  gitBranchStagedChanges: $1j("git-branch-staged-changes", 60525),
  gitBranchConflicts: $1j("git-branch-conflicts", 60526),
  gitBranch: $1j("git-branch", 60527),
  gitBranchCreate: $1j("git-branch-create", 60527),
  gitBranchDelete: $1j("git-branch-delete", 60527),
  searchLarge: $1j("search-large", 60528),
  terminalGitBash: $1j("terminal-git-bash", 60529),
  windowActive: $1j("window-active", 60530),
  forward: $1j("forward", 60531),
  download: $1j("download", 60532)
};

// out-build/vs/base/common/codicons.js
var $5j = {
  dialogError: $1j("dialog-error", "error"),
  dialogWarning: $1j("dialog-warning", "warning"),
  dialogInfo: $1j("dialog-info", "info"),
  dialogClose: $1j("dialog-close", "close"),
  treeItemExpanded: $1j("tree-item-expanded", "chevron-down"),
  // collapsed is done with rotation
  treeFilterOnTypeOn: $1j("tree-filter-on-type-on", "list-filter"),
  treeFilterOnTypeOff: $1j("tree-filter-on-type-off", "list-selection"),
  treeFilterClear: $1j("tree-filter-clear", "close"),
  treeItemLoading: $1j("tree-item-loading", "loading"),
  menuSelection: $1j("menu-selection", "check"),
  menuSubmenu: $1j("menu-submenu", "chevron-right"),
  menuBarMore: $1j("menubar-more", "more"),
  scrollbarButtonLeft: $1j("scrollbar-button-left", "triangle-left"),
  scrollbarButtonRight: $1j("scrollbar-button-right", "triangle-right"),
  scrollbarButtonUp: $1j("scrollbar-button-up", "triangle-up"),
  scrollbarButtonDown: $1j("scrollbar-button-down", "triangle-down"),
  toolBarMore: $1j("toolbar-more", "more"),
  quickInputBack: $1j("quick-input-back", "arrow-left"),
  dropDownButton: $1j("drop-down-button", 60084),
  symbolCustomColor: $1j("symbol-customcolor", 60252),
  exportIcon: $1j("export", 60332),
  workspaceUnspecified: $1j("workspace-unspecified", 60355),
  newLine: $1j("newline", 60394),
  thumbsDownFilled: $1j("thumbsdown-filled", 60435),
  thumbsUpFilled: $1j("thumbsup-filled", 60436),
  gitFetch: $1j("git-fetch", 60445),
  lightbulbSparkleAutofix: $1j("lightbulb-sparkle-autofix", 60447),
  debugBreakpointPending: $1j("debug-breakpoint-pending", 60377)
};
var $6j = {
  ...$3j,
  ...$5j
};

// out-build/vs/editor/common/tokenizationRegistry.js
var $FE = class {
  constructor() {
    this.a = /* @__PURE__ */ new Map();
    this.b = /* @__PURE__ */ new Map();
    this.c = new $qf();
    this.onDidChange = this.c.event;
    this.d = null;
  }
  handleChange(languageIds) {
    this.c.fire({
      changedLanguages: languageIds,
      changedColorMap: false
    });
  }
  register(languageId, support) {
    this.a.set(languageId, support);
    this.handleChange([languageId]);
    return $Dd(() => {
      if (this.a.get(languageId) !== support) {
        return;
      }
      this.a.delete(languageId);
      this.handleChange([languageId]);
    });
  }
  get(languageId) {
    return this.a.get(languageId) || null;
  }
  registerFactory(languageId, factory) {
    this.b.get(languageId)?.dispose();
    const myData = new TokenizationSupportFactoryData(this, languageId, factory);
    this.b.set(languageId, myData);
    return $Dd(() => {
      const v = this.b.get(languageId);
      if (!v || v !== myData) {
        return;
      }
      this.b.delete(languageId);
      v.dispose();
    });
  }
  async getOrCreate(languageId) {
    const tokenizationSupport = this.get(languageId);
    if (tokenizationSupport) {
      return tokenizationSupport;
    }
    const factory = this.b.get(languageId);
    if (!factory || factory.isResolved) {
      return null;
    }
    await factory.resolve();
    return this.get(languageId);
  }
  isResolved(languageId) {
    const tokenizationSupport = this.get(languageId);
    if (tokenizationSupport) {
      return true;
    }
    const factory = this.b.get(languageId);
    if (!factory || factory.isResolved) {
      return true;
    }
    return false;
  }
  setColorMap(colorMap) {
    this.d = colorMap;
    this.c.fire({
      changedLanguages: Array.from(this.a.keys()),
      changedColorMap: true
    });
  }
  getColorMap() {
    return this.d;
  }
  getDefaultBackground() {
    if (this.d && this.d.length > 2) {
      return this.d[
        2
        /* ColorId.DefaultBackground */
      ];
    }
    return null;
  }
};
var TokenizationSupportFactoryData = class extends $Fd {
  get isResolved() {
    return this.c;
  }
  constructor(f, g, h) {
    super();
    this.f = f;
    this.g = g;
    this.h = h;
    this.a = false;
    this.b = null;
    this.c = false;
  }
  dispose() {
    this.a = true;
    super.dispose();
  }
  async resolve() {
    if (!this.b) {
      this.b = this.j();
    }
    return this.b;
  }
  async j() {
    const value = await this.h.tokenizationSupport;
    this.c = true;
    if (value && !this.a) {
      this.D(this.f.register(this.g, value));
    }
  }
};

// out-build/vs/editor/common/languages.js
var $1E = class {
  constructor(tokens, endState) {
    this.tokens = tokens;
    this.endState = endState;
    this._encodedTokenizationResultBrand = void 0;
  }
};
var HoverVerbosityAction;
(function(HoverVerbosityAction2) {
  HoverVerbosityAction2[HoverVerbosityAction2["Increase"] = 0] = "Increase";
  HoverVerbosityAction2[HoverVerbosityAction2["Decrease"] = 1] = "Decrease";
})(HoverVerbosityAction || (HoverVerbosityAction = {}));
var CompletionItemKind;
(function(CompletionItemKind2) {
  CompletionItemKind2[CompletionItemKind2["Method"] = 0] = "Method";
  CompletionItemKind2[CompletionItemKind2["Function"] = 1] = "Function";
  CompletionItemKind2[CompletionItemKind2["Constructor"] = 2] = "Constructor";
  CompletionItemKind2[CompletionItemKind2["Field"] = 3] = "Field";
  CompletionItemKind2[CompletionItemKind2["Variable"] = 4] = "Variable";
  CompletionItemKind2[CompletionItemKind2["Class"] = 5] = "Class";
  CompletionItemKind2[CompletionItemKind2["Struct"] = 6] = "Struct";
  CompletionItemKind2[CompletionItemKind2["Interface"] = 7] = "Interface";
  CompletionItemKind2[CompletionItemKind2["Module"] = 8] = "Module";
  CompletionItemKind2[CompletionItemKind2["Property"] = 9] = "Property";
  CompletionItemKind2[CompletionItemKind2["Event"] = 10] = "Event";
  CompletionItemKind2[CompletionItemKind2["Operator"] = 11] = "Operator";
  CompletionItemKind2[CompletionItemKind2["Unit"] = 12] = "Unit";
  CompletionItemKind2[CompletionItemKind2["Value"] = 13] = "Value";
  CompletionItemKind2[CompletionItemKind2["Constant"] = 14] = "Constant";
  CompletionItemKind2[CompletionItemKind2["Enum"] = 15] = "Enum";
  CompletionItemKind2[CompletionItemKind2["EnumMember"] = 16] = "EnumMember";
  CompletionItemKind2[CompletionItemKind2["Keyword"] = 17] = "Keyword";
  CompletionItemKind2[CompletionItemKind2["Text"] = 18] = "Text";
  CompletionItemKind2[CompletionItemKind2["Color"] = 19] = "Color";
  CompletionItemKind2[CompletionItemKind2["File"] = 20] = "File";
  CompletionItemKind2[CompletionItemKind2["Reference"] = 21] = "Reference";
  CompletionItemKind2[CompletionItemKind2["Customcolor"] = 22] = "Customcolor";
  CompletionItemKind2[CompletionItemKind2["Folder"] = 23] = "Folder";
  CompletionItemKind2[CompletionItemKind2["TypeParameter"] = 24] = "TypeParameter";
  CompletionItemKind2[CompletionItemKind2["User"] = 25] = "User";
  CompletionItemKind2[CompletionItemKind2["Issue"] = 26] = "Issue";
  CompletionItemKind2[CompletionItemKind2["Tool"] = 27] = "Tool";
  CompletionItemKind2[CompletionItemKind2["Snippet"] = 28] = "Snippet";
})(CompletionItemKind || (CompletionItemKind = {}));
var CompletionItemKinds;
(function(CompletionItemKinds2) {
  const byKind = /* @__PURE__ */ new Map();
  byKind.set(0, $6j.symbolMethod);
  byKind.set(1, $6j.symbolFunction);
  byKind.set(2, $6j.symbolConstructor);
  byKind.set(3, $6j.symbolField);
  byKind.set(4, $6j.symbolVariable);
  byKind.set(5, $6j.symbolClass);
  byKind.set(6, $6j.symbolStruct);
  byKind.set(7, $6j.symbolInterface);
  byKind.set(8, $6j.symbolModule);
  byKind.set(9, $6j.symbolProperty);
  byKind.set(10, $6j.symbolEvent);
  byKind.set(11, $6j.symbolOperator);
  byKind.set(12, $6j.symbolUnit);
  byKind.set(13, $6j.symbolValue);
  byKind.set(15, $6j.symbolEnum);
  byKind.set(14, $6j.symbolConstant);
  byKind.set(15, $6j.symbolEnum);
  byKind.set(16, $6j.symbolEnumMember);
  byKind.set(17, $6j.symbolKeyword);
  byKind.set(28, $6j.symbolSnippet);
  byKind.set(18, $6j.symbolText);
  byKind.set(19, $6j.symbolColor);
  byKind.set(20, $6j.symbolFile);
  byKind.set(21, $6j.symbolReference);
  byKind.set(22, $6j.symbolCustomColor);
  byKind.set(23, $6j.symbolFolder);
  byKind.set(24, $6j.symbolTypeParameter);
  byKind.set(25, $6j.account);
  byKind.set(26, $6j.issues);
  byKind.set(27, $6j.tools);
  function toIcon(kind) {
    let codicon = byKind.get(kind);
    if (!codicon) {
      console.info("No codicon found for CompletionItemKind " + kind);
      codicon = $6j.symbolProperty;
    }
    return codicon;
  }
  CompletionItemKinds2.toIcon = toIcon;
  function toLabel(kind) {
    switch (kind) {
      case 0:
        return localize(847, null);
      case 1:
        return localize(848, null);
      case 2:
        return localize(849, null);
      case 3:
        return localize(850, null);
      case 4:
        return localize(851, null);
      case 5:
        return localize(852, null);
      case 6:
        return localize(853, null);
      case 7:
        return localize(854, null);
      case 8:
        return localize(855, null);
      case 9:
        return localize(856, null);
      case 10:
        return localize(857, null);
      case 11:
        return localize(858, null);
      case 12:
        return localize(859, null);
      case 13:
        return localize(860, null);
      case 14:
        return localize(861, null);
      case 15:
        return localize(862, null);
      case 16:
        return localize(863, null);
      case 17:
        return localize(864, null);
      case 18:
        return localize(865, null);
      case 19:
        return localize(866, null);
      case 20:
        return localize(867, null);
      case 21:
        return localize(868, null);
      case 22:
        return localize(869, null);
      case 23:
        return localize(870, null);
      case 24:
        return localize(871, null);
      case 25:
        return localize(872, null);
      case 26:
        return localize(873, null);
      case 27:
        return localize(874, null);
      case 28:
        return localize(875, null);
      default:
        return "";
    }
  }
  CompletionItemKinds2.toLabel = toLabel;
  const data = /* @__PURE__ */ new Map();
  data.set(
    "method",
    0
    /* CompletionItemKind.Method */
  );
  data.set(
    "function",
    1
    /* CompletionItemKind.Function */
  );
  data.set(
    "constructor",
    2
    /* CompletionItemKind.Constructor */
  );
  data.set(
    "field",
    3
    /* CompletionItemKind.Field */
  );
  data.set(
    "variable",
    4
    /* CompletionItemKind.Variable */
  );
  data.set(
    "class",
    5
    /* CompletionItemKind.Class */
  );
  data.set(
    "struct",
    6
    /* CompletionItemKind.Struct */
  );
  data.set(
    "interface",
    7
    /* CompletionItemKind.Interface */
  );
  data.set(
    "module",
    8
    /* CompletionItemKind.Module */
  );
  data.set(
    "property",
    9
    /* CompletionItemKind.Property */
  );
  data.set(
    "event",
    10
    /* CompletionItemKind.Event */
  );
  data.set(
    "operator",
    11
    /* CompletionItemKind.Operator */
  );
  data.set(
    "unit",
    12
    /* CompletionItemKind.Unit */
  );
  data.set(
    "value",
    13
    /* CompletionItemKind.Value */
  );
  data.set(
    "constant",
    14
    /* CompletionItemKind.Constant */
  );
  data.set(
    "enum",
    15
    /* CompletionItemKind.Enum */
  );
  data.set(
    "enum-member",
    16
    /* CompletionItemKind.EnumMember */
  );
  data.set(
    "enumMember",
    16
    /* CompletionItemKind.EnumMember */
  );
  data.set(
    "keyword",
    17
    /* CompletionItemKind.Keyword */
  );
  data.set(
    "snippet",
    28
    /* CompletionItemKind.Snippet */
  );
  data.set(
    "text",
    18
    /* CompletionItemKind.Text */
  );
  data.set(
    "color",
    19
    /* CompletionItemKind.Color */
  );
  data.set(
    "file",
    20
    /* CompletionItemKind.File */
  );
  data.set(
    "reference",
    21
    /* CompletionItemKind.Reference */
  );
  data.set(
    "customcolor",
    22
    /* CompletionItemKind.Customcolor */
  );
  data.set(
    "folder",
    23
    /* CompletionItemKind.Folder */
  );
  data.set(
    "type-parameter",
    24
    /* CompletionItemKind.TypeParameter */
  );
  data.set(
    "typeParameter",
    24
    /* CompletionItemKind.TypeParameter */
  );
  data.set(
    "account",
    25
    /* CompletionItemKind.User */
  );
  data.set(
    "issue",
    26
    /* CompletionItemKind.Issue */
  );
  data.set(
    "tool",
    27
    /* CompletionItemKind.Tool */
  );
  function fromString(value, strict) {
    let res = data.get(value);
    if (typeof res === "undefined" && !strict) {
      res = 9;
    }
    return res;
  }
  CompletionItemKinds2.fromString = fromString;
})(CompletionItemKinds || (CompletionItemKinds = {}));
var CompletionItemTag;
(function(CompletionItemTag2) {
  CompletionItemTag2[CompletionItemTag2["Deprecated"] = 1] = "Deprecated";
})(CompletionItemTag || (CompletionItemTag = {}));
var CompletionItemInsertTextRule;
(function(CompletionItemInsertTextRule2) {
  CompletionItemInsertTextRule2[CompletionItemInsertTextRule2["None"] = 0] = "None";
  CompletionItemInsertTextRule2[CompletionItemInsertTextRule2["KeepWhitespace"] = 1] = "KeepWhitespace";
  CompletionItemInsertTextRule2[CompletionItemInsertTextRule2["InsertAsSnippet"] = 4] = "InsertAsSnippet";
})(CompletionItemInsertTextRule || (CompletionItemInsertTextRule = {}));
var PartialAcceptTriggerKind;
(function(PartialAcceptTriggerKind2) {
  PartialAcceptTriggerKind2[PartialAcceptTriggerKind2["Word"] = 0] = "Word";
  PartialAcceptTriggerKind2[PartialAcceptTriggerKind2["Line"] = 1] = "Line";
  PartialAcceptTriggerKind2[PartialAcceptTriggerKind2["Suggest"] = 2] = "Suggest";
})(PartialAcceptTriggerKind || (PartialAcceptTriggerKind = {}));
var CompletionTriggerKind;
(function(CompletionTriggerKind2) {
  CompletionTriggerKind2[CompletionTriggerKind2["Invoke"] = 0] = "Invoke";
  CompletionTriggerKind2[CompletionTriggerKind2["TriggerCharacter"] = 1] = "TriggerCharacter";
  CompletionTriggerKind2[CompletionTriggerKind2["TriggerForIncompleteCompletions"] = 2] = "TriggerForIncompleteCompletions";
})(CompletionTriggerKind || (CompletionTriggerKind = {}));
var InlineCompletionTriggerKind;
(function(InlineCompletionTriggerKind2) {
  InlineCompletionTriggerKind2[InlineCompletionTriggerKind2["Automatic"] = 0] = "Automatic";
  InlineCompletionTriggerKind2[InlineCompletionTriggerKind2["Explicit"] = 1] = "Explicit";
})(InlineCompletionTriggerKind || (InlineCompletionTriggerKind = {}));
var InlineCompletionHintStyle;
(function(InlineCompletionHintStyle2) {
  InlineCompletionHintStyle2[InlineCompletionHintStyle2["Code"] = 1] = "Code";
  InlineCompletionHintStyle2[InlineCompletionHintStyle2["Label"] = 2] = "Label";
})(InlineCompletionHintStyle || (InlineCompletionHintStyle = {}));
var InlineCompletionEndOfLifeReasonKind;
(function(InlineCompletionEndOfLifeReasonKind2) {
  InlineCompletionEndOfLifeReasonKind2[InlineCompletionEndOfLifeReasonKind2["Accepted"] = 0] = "Accepted";
  InlineCompletionEndOfLifeReasonKind2[InlineCompletionEndOfLifeReasonKind2["Rejected"] = 1] = "Rejected";
  InlineCompletionEndOfLifeReasonKind2[InlineCompletionEndOfLifeReasonKind2["Ignored"] = 2] = "Ignored";
})(InlineCompletionEndOfLifeReasonKind || (InlineCompletionEndOfLifeReasonKind = {}));
var CodeActionTriggerType;
(function(CodeActionTriggerType2) {
  CodeActionTriggerType2[CodeActionTriggerType2["Invoke"] = 1] = "Invoke";
  CodeActionTriggerType2[CodeActionTriggerType2["Auto"] = 2] = "Auto";
})(CodeActionTriggerType || (CodeActionTriggerType = {}));
var DocumentPasteTriggerKind;
(function(DocumentPasteTriggerKind2) {
  DocumentPasteTriggerKind2[DocumentPasteTriggerKind2["Automatic"] = 0] = "Automatic";
  DocumentPasteTriggerKind2[DocumentPasteTriggerKind2["PasteAs"] = 1] = "PasteAs";
})(DocumentPasteTriggerKind || (DocumentPasteTriggerKind = {}));
var SignatureHelpTriggerKind;
(function(SignatureHelpTriggerKind2) {
  SignatureHelpTriggerKind2[SignatureHelpTriggerKind2["Invoke"] = 1] = "Invoke";
  SignatureHelpTriggerKind2[SignatureHelpTriggerKind2["TriggerCharacter"] = 2] = "TriggerCharacter";
  SignatureHelpTriggerKind2[SignatureHelpTriggerKind2["ContentChange"] = 3] = "ContentChange";
})(SignatureHelpTriggerKind || (SignatureHelpTriggerKind = {}));
var DocumentHighlightKind;
(function(DocumentHighlightKind2) {
  DocumentHighlightKind2[DocumentHighlightKind2["Text"] = 0] = "Text";
  DocumentHighlightKind2[DocumentHighlightKind2["Read"] = 1] = "Read";
  DocumentHighlightKind2[DocumentHighlightKind2["Write"] = 2] = "Write";
})(DocumentHighlightKind || (DocumentHighlightKind = {}));
var SymbolKind;
(function(SymbolKind2) {
  SymbolKind2[SymbolKind2["File"] = 0] = "File";
  SymbolKind2[SymbolKind2["Module"] = 1] = "Module";
  SymbolKind2[SymbolKind2["Namespace"] = 2] = "Namespace";
  SymbolKind2[SymbolKind2["Package"] = 3] = "Package";
  SymbolKind2[SymbolKind2["Class"] = 4] = "Class";
  SymbolKind2[SymbolKind2["Method"] = 5] = "Method";
  SymbolKind2[SymbolKind2["Property"] = 6] = "Property";
  SymbolKind2[SymbolKind2["Field"] = 7] = "Field";
  SymbolKind2[SymbolKind2["Constructor"] = 8] = "Constructor";
  SymbolKind2[SymbolKind2["Enum"] = 9] = "Enum";
  SymbolKind2[SymbolKind2["Interface"] = 10] = "Interface";
  SymbolKind2[SymbolKind2["Function"] = 11] = "Function";
  SymbolKind2[SymbolKind2["Variable"] = 12] = "Variable";
  SymbolKind2[SymbolKind2["Constant"] = 13] = "Constant";
  SymbolKind2[SymbolKind2["String"] = 14] = "String";
  SymbolKind2[SymbolKind2["Number"] = 15] = "Number";
  SymbolKind2[SymbolKind2["Boolean"] = 16] = "Boolean";
  SymbolKind2[SymbolKind2["Array"] = 17] = "Array";
  SymbolKind2[SymbolKind2["Object"] = 18] = "Object";
  SymbolKind2[SymbolKind2["Key"] = 19] = "Key";
  SymbolKind2[SymbolKind2["Null"] = 20] = "Null";
  SymbolKind2[SymbolKind2["EnumMember"] = 21] = "EnumMember";
  SymbolKind2[SymbolKind2["Struct"] = 22] = "Struct";
  SymbolKind2[SymbolKind2["Event"] = 23] = "Event";
  SymbolKind2[SymbolKind2["Operator"] = 24] = "Operator";
  SymbolKind2[SymbolKind2["TypeParameter"] = 25] = "TypeParameter";
})(SymbolKind || (SymbolKind = {}));
var $7E = {
  [
    17
    /* SymbolKind.Array */
  ]: localize(876, null),
  [
    16
    /* SymbolKind.Boolean */
  ]: localize(877, null),
  [
    4
    /* SymbolKind.Class */
  ]: localize(878, null),
  [
    13
    /* SymbolKind.Constant */
  ]: localize(879, null),
  [
    8
    /* SymbolKind.Constructor */
  ]: localize(880, null),
  [
    9
    /* SymbolKind.Enum */
  ]: localize(881, null),
  [
    21
    /* SymbolKind.EnumMember */
  ]: localize(882, null),
  [
    23
    /* SymbolKind.Event */
  ]: localize(883, null),
  [
    7
    /* SymbolKind.Field */
  ]: localize(884, null),
  [
    0
    /* SymbolKind.File */
  ]: localize(885, null),
  [
    11
    /* SymbolKind.Function */
  ]: localize(886, null),
  [
    10
    /* SymbolKind.Interface */
  ]: localize(887, null),
  [
    19
    /* SymbolKind.Key */
  ]: localize(888, null),
  [
    5
    /* SymbolKind.Method */
  ]: localize(889, null),
  [
    1
    /* SymbolKind.Module */
  ]: localize(890, null),
  [
    2
    /* SymbolKind.Namespace */
  ]: localize(891, null),
  [
    20
    /* SymbolKind.Null */
  ]: localize(892, null),
  [
    15
    /* SymbolKind.Number */
  ]: localize(893, null),
  [
    18
    /* SymbolKind.Object */
  ]: localize(894, null),
  [
    24
    /* SymbolKind.Operator */
  ]: localize(895, null),
  [
    3
    /* SymbolKind.Package */
  ]: localize(896, null),
  [
    6
    /* SymbolKind.Property */
  ]: localize(897, null),
  [
    14
    /* SymbolKind.String */
  ]: localize(898, null),
  [
    22
    /* SymbolKind.Struct */
  ]: localize(899, null),
  [
    25
    /* SymbolKind.TypeParameter */
  ]: localize(900, null),
  [
    12
    /* SymbolKind.Variable */
  ]: localize(901, null)
};
var SymbolTag;
(function(SymbolTag2) {
  SymbolTag2[SymbolTag2["Deprecated"] = 1] = "Deprecated";
})(SymbolTag || (SymbolTag = {}));
var SymbolKinds;
(function(SymbolKinds2) {
  const byKind = /* @__PURE__ */ new Map();
  byKind.set(0, $6j.symbolFile);
  byKind.set(1, $6j.symbolModule);
  byKind.set(2, $6j.symbolNamespace);
  byKind.set(3, $6j.symbolPackage);
  byKind.set(4, $6j.symbolClass);
  byKind.set(5, $6j.symbolMethod);
  byKind.set(6, $6j.symbolProperty);
  byKind.set(7, $6j.symbolField);
  byKind.set(8, $6j.symbolConstructor);
  byKind.set(9, $6j.symbolEnum);
  byKind.set(10, $6j.symbolInterface);
  byKind.set(11, $6j.symbolFunction);
  byKind.set(12, $6j.symbolVariable);
  byKind.set(13, $6j.symbolConstant);
  byKind.set(14, $6j.symbolString);
  byKind.set(15, $6j.symbolNumber);
  byKind.set(16, $6j.symbolBoolean);
  byKind.set(17, $6j.symbolArray);
  byKind.set(18, $6j.symbolObject);
  byKind.set(19, $6j.symbolKey);
  byKind.set(20, $6j.symbolNull);
  byKind.set(21, $6j.symbolEnumMember);
  byKind.set(22, $6j.symbolStruct);
  byKind.set(23, $6j.symbolEvent);
  byKind.set(24, $6j.symbolOperator);
  byKind.set(25, $6j.symbolTypeParameter);
  function toIcon(kind) {
    let icon = byKind.get(kind);
    if (!icon) {
      console.info("No codicon found for SymbolKind " + kind);
      icon = $6j.symbolProperty;
    }
    return icon;
  }
  SymbolKinds2.toIcon = toIcon;
  const byCompletionKind = /* @__PURE__ */ new Map();
  byCompletionKind.set(
    0,
    20
    /* CompletionItemKind.File */
  );
  byCompletionKind.set(
    1,
    8
    /* CompletionItemKind.Module */
  );
  byCompletionKind.set(
    2,
    8
    /* CompletionItemKind.Module */
  );
  byCompletionKind.set(
    3,
    8
    /* CompletionItemKind.Module */
  );
  byCompletionKind.set(
    4,
    5
    /* CompletionItemKind.Class */
  );
  byCompletionKind.set(
    5,
    0
    /* CompletionItemKind.Method */
  );
  byCompletionKind.set(
    6,
    9
    /* CompletionItemKind.Property */
  );
  byCompletionKind.set(
    7,
    3
    /* CompletionItemKind.Field */
  );
  byCompletionKind.set(
    8,
    2
    /* CompletionItemKind.Constructor */
  );
  byCompletionKind.set(
    9,
    15
    /* CompletionItemKind.Enum */
  );
  byCompletionKind.set(
    10,
    7
    /* CompletionItemKind.Interface */
  );
  byCompletionKind.set(
    11,
    1
    /* CompletionItemKind.Function */
  );
  byCompletionKind.set(
    12,
    4
    /* CompletionItemKind.Variable */
  );
  byCompletionKind.set(
    13,
    14
    /* CompletionItemKind.Constant */
  );
  byCompletionKind.set(
    14,
    18
    /* CompletionItemKind.Text */
  );
  byCompletionKind.set(
    15,
    13
    /* CompletionItemKind.Value */
  );
  byCompletionKind.set(
    16,
    13
    /* CompletionItemKind.Value */
  );
  byCompletionKind.set(
    17,
    13
    /* CompletionItemKind.Value */
  );
  byCompletionKind.set(
    18,
    13
    /* CompletionItemKind.Value */
  );
  byCompletionKind.set(
    19,
    17
    /* CompletionItemKind.Keyword */
  );
  byCompletionKind.set(
    20,
    13
    /* CompletionItemKind.Value */
  );
  byCompletionKind.set(
    21,
    16
    /* CompletionItemKind.EnumMember */
  );
  byCompletionKind.set(
    22,
    6
    /* CompletionItemKind.Struct */
  );
  byCompletionKind.set(
    23,
    10
    /* CompletionItemKind.Event */
  );
  byCompletionKind.set(
    24,
    11
    /* CompletionItemKind.Operator */
  );
  byCompletionKind.set(
    25,
    24
    /* CompletionItemKind.TypeParameter */
  );
  function toCompletionKind(kind) {
    let completionKind = byCompletionKind.get(kind);
    if (completionKind === void 0) {
      console.info("No completion kind found for SymbolKind " + kind);
      completionKind = 20;
    }
    return completionKind;
  }
  SymbolKinds2.toCompletionKind = toCompletionKind;
})(SymbolKinds || (SymbolKinds = {}));
var $0E = class _$0E {
  static {
    this.Comment = new _$0E("comment");
  }
  static {
    this.Imports = new _$0E("imports");
  }
  static {
    this.Region = new _$0E("region");
  }
  /**
   * Returns a {@link $0E} for the given value.
   *
   * @param value of the kind.
   */
  static fromValue(value) {
    switch (value) {
      case "comment":
        return _$0E.Comment;
      case "imports":
        return _$0E.Imports;
      case "region":
        return _$0E.Region;
    }
    return new _$0E(value);
  }
  /**
   * Creates a new {@link $0E}.
   *
   * @param value of the kind.
   */
  constructor(value) {
    this.value = value;
  }
};
var NewSymbolNameTag;
(function(NewSymbolNameTag2) {
  NewSymbolNameTag2[NewSymbolNameTag2["AIGenerated"] = 1] = "AIGenerated";
})(NewSymbolNameTag || (NewSymbolNameTag = {}));
var NewSymbolNameTriggerKind;
(function(NewSymbolNameTriggerKind2) {
  NewSymbolNameTriggerKind2[NewSymbolNameTriggerKind2["Invoke"] = 0] = "Invoke";
  NewSymbolNameTriggerKind2[NewSymbolNameTriggerKind2["Automatic"] = 1] = "Automatic";
})(NewSymbolNameTriggerKind || (NewSymbolNameTriggerKind = {}));
var Command;
(function(Command2) {
  function is(obj) {
    if (!obj || typeof obj !== "object") {
      return false;
    }
    return typeof obj.id === "string" && typeof obj.title === "string";
  }
  Command2.is = is;
})(Command || (Command = {}));
var CommentThreadCollapsibleState;
(function(CommentThreadCollapsibleState2) {
  CommentThreadCollapsibleState2[CommentThreadCollapsibleState2["Collapsed"] = 0] = "Collapsed";
  CommentThreadCollapsibleState2[CommentThreadCollapsibleState2["Expanded"] = 1] = "Expanded";
})(CommentThreadCollapsibleState || (CommentThreadCollapsibleState = {}));
var CommentThreadState;
(function(CommentThreadState2) {
  CommentThreadState2[CommentThreadState2["Unresolved"] = 0] = "Unresolved";
  CommentThreadState2[CommentThreadState2["Resolved"] = 1] = "Resolved";
})(CommentThreadState || (CommentThreadState = {}));
var CommentThreadApplicability;
(function(CommentThreadApplicability2) {
  CommentThreadApplicability2[CommentThreadApplicability2["Current"] = 0] = "Current";
  CommentThreadApplicability2[CommentThreadApplicability2["Outdated"] = 1] = "Outdated";
})(CommentThreadApplicability || (CommentThreadApplicability = {}));
var CommentMode;
(function(CommentMode2) {
  CommentMode2[CommentMode2["Editing"] = 0] = "Editing";
  CommentMode2[CommentMode2["Preview"] = 1] = "Preview";
})(CommentMode || (CommentMode = {}));
var CommentState;
(function(CommentState2) {
  CommentState2[CommentState2["Published"] = 0] = "Published";
  CommentState2[CommentState2["Draft"] = 1] = "Draft";
})(CommentState || (CommentState = {}));
var InlayHintKind;
(function(InlayHintKind2) {
  InlayHintKind2[InlayHintKind2["Type"] = 1] = "Type";
  InlayHintKind2[InlayHintKind2["Parameter"] = 2] = "Parameter";
})(InlayHintKind || (InlayHintKind = {}));
var $_E = new $FE();
var ExternalUriOpenerPriority;
(function(ExternalUriOpenerPriority2) {
  ExternalUriOpenerPriority2[ExternalUriOpenerPriority2["None"] = 0] = "None";
  ExternalUriOpenerPriority2[ExternalUriOpenerPriority2["Option"] = 1] = "Option";
  ExternalUriOpenerPriority2[ExternalUriOpenerPriority2["Default"] = 2] = "Default";
  ExternalUriOpenerPriority2[ExternalUriOpenerPriority2["Preferred"] = 3] = "Preferred";
})(ExternalUriOpenerPriority || (ExternalUriOpenerPriority = {}));

// out-build/vs/editor/common/languages/nullTokenize.js
var $NJ = new class {
  clone() {
    return this;
  }
  equals(other) {
    return this === other;
  }
}();
function $PJ(languageId, state) {
  const tokens = new Uint32Array(2);
  tokens[0] = 0;
  tokens[1] = (languageId << 0 | 0 << 8 | 0 << 11 | 1 << 15 | 2 << 24) >>> 0;
  return new $1E(tokens, state === null ? $NJ : state);
}

// out-build/vs/editor/common/model/fixedArray.js
var $QJ = class {
  constructor(b) {
    this.b = b;
    this.a = [];
  }
  get(index) {
    if (index < this.a.length) {
      return this.a[index];
    }
    return this.b;
  }
  set(index, value) {
    while (index >= this.a.length) {
      this.a[this.a.length] = this.b;
    }
    this.a[index] = value;
  }
  replace(index, oldLength, newLength) {
    if (index >= this.a.length) {
      return;
    }
    if (oldLength === 0) {
      this.insert(index, newLength);
      return;
    } else if (newLength === 0) {
      this.delete(index, oldLength);
      return;
    }
    const before = this.a.slice(0, index);
    const after = this.a.slice(index + oldLength);
    const insertArr = arrayFill(newLength, this.b);
    this.a = before.concat(insertArr, after);
  }
  delete(deleteIndex, deleteCount) {
    if (deleteCount === 0 || deleteIndex >= this.a.length) {
      return;
    }
    this.a.splice(deleteIndex, deleteCount);
  }
  insert(insertIndex, insertCount) {
    if (insertCount === 0 || insertIndex >= this.a.length) {
      return;
    }
    const arr = [];
    for (let i = 0; i < insertCount; i++) {
      arr[i] = this.b;
    }
    this.a = $lc(this.a, insertIndex, arr);
  }
};
function arrayFill(length, value) {
  const arr = [];
  for (let i = 0; i < length; i++) {
    arr[i] = value;
  }
  return arr;
}

// out-build/vs/base/common/buffer.js
var indexOfTable = new $Kf(() => new Uint8Array(256));
function $6i(source, offset) {
  return source[offset] * 2 ** 24 + source[offset + 1] * 2 ** 16 + source[offset + 2] * 2 ** 8 + source[offset + 3];
}
function $7i(destination, value, offset) {
  destination[offset + 3] = value;
  value = value >>> 8;
  destination[offset + 2] = value;
  value = value >>> 8;
  destination[offset + 1] = value;
  value = value >>> 8;
  destination[offset] = value;
}

// out-build/vs/editor/common/encodedTokenAttributes.js
var LanguageId;
(function(LanguageId2) {
  LanguageId2[LanguageId2["Null"] = 0] = "Null";
  LanguageId2[LanguageId2["PlainText"] = 1] = "PlainText";
})(LanguageId || (LanguageId = {}));
var FontStyle;
(function(FontStyle2) {
  FontStyle2[FontStyle2["NotSet"] = -1] = "NotSet";
  FontStyle2[FontStyle2["None"] = 0] = "None";
  FontStyle2[FontStyle2["Italic"] = 1] = "Italic";
  FontStyle2[FontStyle2["Bold"] = 2] = "Bold";
  FontStyle2[FontStyle2["Underline"] = 4] = "Underline";
  FontStyle2[FontStyle2["Strikethrough"] = 8] = "Strikethrough";
})(FontStyle || (FontStyle = {}));
var ColorId;
(function(ColorId2) {
  ColorId2[ColorId2["None"] = 0] = "None";
  ColorId2[ColorId2["DefaultForeground"] = 1] = "DefaultForeground";
  ColorId2[ColorId2["DefaultBackground"] = 2] = "DefaultBackground";
})(ColorId || (ColorId = {}));
var StandardTokenType;
(function(StandardTokenType2) {
  StandardTokenType2[StandardTokenType2["Other"] = 0] = "Other";
  StandardTokenType2[StandardTokenType2["Comment"] = 1] = "Comment";
  StandardTokenType2[StandardTokenType2["String"] = 2] = "String";
  StandardTokenType2[StandardTokenType2["RegEx"] = 3] = "RegEx";
})(StandardTokenType || (StandardTokenType = {}));
var MetadataConsts;
(function(MetadataConsts2) {
  MetadataConsts2[MetadataConsts2["LANGUAGEID_MASK"] = 255] = "LANGUAGEID_MASK";
  MetadataConsts2[MetadataConsts2["TOKEN_TYPE_MASK"] = 768] = "TOKEN_TYPE_MASK";
  MetadataConsts2[MetadataConsts2["BALANCED_BRACKETS_MASK"] = 1024] = "BALANCED_BRACKETS_MASK";
  MetadataConsts2[MetadataConsts2["FONT_STYLE_MASK"] = 30720] = "FONT_STYLE_MASK";
  MetadataConsts2[MetadataConsts2["FOREGROUND_MASK"] = 16744448] = "FOREGROUND_MASK";
  MetadataConsts2[MetadataConsts2["BACKGROUND_MASK"] = 4278190080] = "BACKGROUND_MASK";
  MetadataConsts2[MetadataConsts2["ITALIC_MASK"] = 2048] = "ITALIC_MASK";
  MetadataConsts2[MetadataConsts2["BOLD_MASK"] = 4096] = "BOLD_MASK";
  MetadataConsts2[MetadataConsts2["UNDERLINE_MASK"] = 8192] = "UNDERLINE_MASK";
  MetadataConsts2[MetadataConsts2["STRIKETHROUGH_MASK"] = 16384] = "STRIKETHROUGH_MASK";
  MetadataConsts2[MetadataConsts2["SEMANTIC_USE_ITALIC"] = 1] = "SEMANTIC_USE_ITALIC";
  MetadataConsts2[MetadataConsts2["SEMANTIC_USE_BOLD"] = 2] = "SEMANTIC_USE_BOLD";
  MetadataConsts2[MetadataConsts2["SEMANTIC_USE_UNDERLINE"] = 4] = "SEMANTIC_USE_UNDERLINE";
  MetadataConsts2[MetadataConsts2["SEMANTIC_USE_STRIKETHROUGH"] = 8] = "SEMANTIC_USE_STRIKETHROUGH";
  MetadataConsts2[MetadataConsts2["SEMANTIC_USE_FOREGROUND"] = 16] = "SEMANTIC_USE_FOREGROUND";
  MetadataConsts2[MetadataConsts2["SEMANTIC_USE_BACKGROUND"] = 32] = "SEMANTIC_USE_BACKGROUND";
  MetadataConsts2[MetadataConsts2["LANGUAGEID_OFFSET"] = 0] = "LANGUAGEID_OFFSET";
  MetadataConsts2[MetadataConsts2["TOKEN_TYPE_OFFSET"] = 8] = "TOKEN_TYPE_OFFSET";
  MetadataConsts2[MetadataConsts2["BALANCED_BRACKETS_OFFSET"] = 10] = "BALANCED_BRACKETS_OFFSET";
  MetadataConsts2[MetadataConsts2["FONT_STYLE_OFFSET"] = 11] = "FONT_STYLE_OFFSET";
  MetadataConsts2[MetadataConsts2["FOREGROUND_OFFSET"] = 15] = "FOREGROUND_OFFSET";
  MetadataConsts2[MetadataConsts2["BACKGROUND_OFFSET"] = 24] = "BACKGROUND_OFFSET";
})(MetadataConsts || (MetadataConsts = {}));
var $CE = class {
  static getLanguageId(metadata) {
    return (metadata & 255) >>> 0;
  }
  static getTokenType(metadata) {
    return (metadata & 768) >>> 8;
  }
  static containsBalancedBrackets(metadata) {
    return (metadata & 1024) !== 0;
  }
  static getFontStyle(metadata) {
    return (metadata & 30720) >>> 11;
  }
  static getForeground(metadata) {
    return (metadata & 16744448) >>> 15;
  }
  static getBackground(metadata) {
    return (metadata & 4278190080) >>> 24;
  }
  static getClassNameFromMetadata(metadata) {
    const foreground = this.getForeground(metadata);
    let className = "mtk" + foreground;
    const fontStyle = this.getFontStyle(metadata);
    if (fontStyle & 1) {
      className += " mtki";
    }
    if (fontStyle & 2) {
      className += " mtkb";
    }
    if (fontStyle & 4) {
      className += " mtku";
    }
    if (fontStyle & 8) {
      className += " mtks";
    }
    return className;
  }
  static getInlineStyleFromMetadata(metadata, colorMap) {
    const foreground = this.getForeground(metadata);
    const fontStyle = this.getFontStyle(metadata);
    let result = `color: ${colorMap[foreground]};`;
    if (fontStyle & 1) {
      result += "font-style: italic;";
    }
    if (fontStyle & 2) {
      result += "font-weight: bold;";
    }
    let textDecoration = "";
    if (fontStyle & 4) {
      textDecoration += " underline";
    }
    if (fontStyle & 8) {
      textDecoration += " line-through";
    }
    if (textDecoration) {
      result += `text-decoration:${textDecoration};`;
    }
    return result;
  }
  static getPresentationFromMetadata(metadata) {
    const foreground = this.getForeground(metadata);
    const fontStyle = this.getFontStyle(metadata);
    return {
      foreground,
      italic: Boolean(
        fontStyle & 1
        /* FontStyle.Italic */
      ),
      bold: Boolean(
        fontStyle & 2
        /* FontStyle.Bold */
      ),
      underline: Boolean(
        fontStyle & 4
        /* FontStyle.Underline */
      ),
      strikethrough: Boolean(
        fontStyle & 8
        /* FontStyle.Strikethrough */
      )
    };
  }
};

// out-build/vs/editor/common/tokens/lineTokens.js
var $HE = class _$HE {
  static createEmpty(lineContent, decoder) {
    const defaultMetadata = _$HE.defaultTokenMetadata;
    const tokens = new Uint32Array(2);
    tokens[0] = lineContent.length;
    tokens[1] = defaultMetadata;
    return new _$HE(tokens, lineContent, decoder);
  }
  static createFromTextAndMetadata(data, decoder) {
    let offset = 0;
    let fullText = "";
    const tokens = new Array();
    for (const { text, metadata } of data) {
      tokens.push(offset + text.length, metadata);
      offset += text.length;
      fullText += text;
    }
    return new _$HE(new Uint32Array(tokens), fullText, decoder);
  }
  static convertToEndOffset(tokens, lineTextLength) {
    const tokenCount = tokens.length >>> 1;
    const lastTokenIndex = tokenCount - 1;
    for (let tokenIndex = 0; tokenIndex < lastTokenIndex; tokenIndex++) {
      tokens[tokenIndex << 1] = tokens[tokenIndex + 1 << 1];
    }
    tokens[lastTokenIndex << 1] = lineTextLength;
  }
  static findIndexInTokensArray(tokens, desiredIndex) {
    if (tokens.length <= 2) {
      return 0;
    }
    let low = 0;
    let high = (tokens.length >>> 1) - 1;
    while (low < high) {
      const mid = low + Math.floor((high - low) / 2);
      const endOffset = tokens[mid << 1];
      if (endOffset === desiredIndex) {
        return mid + 1;
      } else if (endOffset < desiredIndex) {
        low = mid + 1;
      } else if (endOffset > desiredIndex) {
        high = mid;
      }
    }
    return low;
  }
  static {
    this.defaultTokenMetadata = (0 << 11 | 1 << 15 | 2 << 24) >>> 0;
  }
  constructor(tokens, text, decoder) {
    this._lineTokensBrand = void 0;
    const tokensLength = tokens.length > 1 ? tokens[tokens.length - 2] : 0;
    if (tokensLength !== text.length) {
      $nb(new Error("Token length and text length do not match!"));
    }
    this.a = tokens;
    this.b = this.a.length >>> 1;
    this.c = text;
    this.languageIdCodec = decoder;
  }
  getTextLength() {
    return this.c.length;
  }
  equals(other) {
    if (other instanceof _$HE) {
      return this.slicedEquals(other, 0, this.b);
    }
    return false;
  }
  slicedEquals(other, sliceFromTokenIndex, sliceTokenCount) {
    if (this.c !== other.c) {
      return false;
    }
    if (this.b !== other.b) {
      return false;
    }
    const from = sliceFromTokenIndex << 1;
    const to = from + (sliceTokenCount << 1);
    for (let i = from; i < to; i++) {
      if (this.a[i] !== other.a[i]) {
        return false;
      }
    }
    return true;
  }
  getLineContent() {
    return this.c;
  }
  getCount() {
    return this.b;
  }
  getStartOffset(tokenIndex) {
    if (tokenIndex > 0) {
      return this.a[tokenIndex - 1 << 1];
    }
    return 0;
  }
  getMetadata(tokenIndex) {
    const metadata = this.a[(tokenIndex << 1) + 1];
    return metadata;
  }
  getLanguageId(tokenIndex) {
    const metadata = this.a[(tokenIndex << 1) + 1];
    const languageId = $CE.getLanguageId(metadata);
    return this.languageIdCodec.decodeLanguageId(languageId);
  }
  getStandardTokenType(tokenIndex) {
    const metadata = this.a[(tokenIndex << 1) + 1];
    return $CE.getTokenType(metadata);
  }
  getForeground(tokenIndex) {
    const metadata = this.a[(tokenIndex << 1) + 1];
    return $CE.getForeground(metadata);
  }
  getClassName(tokenIndex) {
    const metadata = this.a[(tokenIndex << 1) + 1];
    return $CE.getClassNameFromMetadata(metadata);
  }
  getInlineStyle(tokenIndex, colorMap) {
    const metadata = this.a[(tokenIndex << 1) + 1];
    return $CE.getInlineStyleFromMetadata(metadata, colorMap);
  }
  getPresentation(tokenIndex) {
    const metadata = this.a[(tokenIndex << 1) + 1];
    return $CE.getPresentationFromMetadata(metadata);
  }
  getEndOffset(tokenIndex) {
    return this.a[tokenIndex << 1];
  }
  /**
   * Find the token containing offset `offset`.
   * @param offset The search offset
   * @return The index of the token containing the offset.
   */
  findTokenIndexAtOffset(offset) {
    return _$HE.findIndexInTokensArray(this.a, offset);
  }
  inflate() {
    return this;
  }
  sliceAndInflate(startOffset, endOffset, deltaOffset) {
    return new SliceLineTokens(this, startOffset, endOffset, deltaOffset);
  }
  sliceZeroCopy(range) {
    return this.sliceAndInflate(range.start, range.endExclusive, 0);
  }
  /**
   * @pure
   * @param insertTokens Must be sorted by offset.
  */
  withInserted(insertTokens) {
    if (insertTokens.length === 0) {
      return this;
    }
    let nextOriginalTokenIdx = 0;
    let nextInsertTokenIdx = 0;
    let text = "";
    const newTokens = new Array();
    let originalEndOffset = 0;
    while (true) {
      const nextOriginalTokenEndOffset = nextOriginalTokenIdx < this.b ? this.a[nextOriginalTokenIdx << 1] : -1;
      const nextInsertToken = nextInsertTokenIdx < insertTokens.length ? insertTokens[nextInsertTokenIdx] : null;
      if (nextOriginalTokenEndOffset !== -1 && (nextInsertToken === null || nextOriginalTokenEndOffset <= nextInsertToken.offset)) {
        text += this.c.substring(originalEndOffset, nextOriginalTokenEndOffset);
        const metadata = this.a[(nextOriginalTokenIdx << 1) + 1];
        newTokens.push(text.length, metadata);
        nextOriginalTokenIdx++;
        originalEndOffset = nextOriginalTokenEndOffset;
      } else if (nextInsertToken) {
        if (nextInsertToken.offset > originalEndOffset) {
          text += this.c.substring(originalEndOffset, nextInsertToken.offset);
          const metadata = this.a[(nextOriginalTokenIdx << 1) + 1];
          newTokens.push(text.length, metadata);
          originalEndOffset = nextInsertToken.offset;
        }
        text += nextInsertToken.text;
        newTokens.push(text.length, nextInsertToken.tokenMetadata);
        nextInsertTokenIdx++;
      } else {
        break;
      }
    }
    return new _$HE(new Uint32Array(newTokens), text, this.languageIdCodec);
  }
  getTokensInRange(range) {
    const builder = new $LE();
    const startTokenIndex = this.findTokenIndexAtOffset(range.start);
    const endTokenIndex = this.findTokenIndexAtOffset(range.endExclusive);
    for (let tokenIndex = startTokenIndex; tokenIndex <= endTokenIndex; tokenIndex++) {
      const tokenRange = new $PD(this.getStartOffset(tokenIndex), this.getEndOffset(tokenIndex));
      const length = tokenRange.intersectionLength(range);
      if (length > 0) {
        builder.add(length, this.getMetadata(tokenIndex));
      }
    }
    return builder.build();
  }
  getTokenText(tokenIndex) {
    const startOffset = this.getStartOffset(tokenIndex);
    const endOffset = this.getEndOffset(tokenIndex);
    const text = this.c.substring(startOffset, endOffset);
    return text;
  }
  forEach(callback) {
    const tokenCount = this.getCount();
    for (let tokenIndex = 0; tokenIndex < tokenCount; tokenIndex++) {
      callback(tokenIndex);
    }
  }
  toString() {
    let result = "";
    this.forEach((i) => {
      result += `[${this.getTokenText(i)}]{${this.getClassName(i)}}`;
    });
    return result;
  }
};
var SliceLineTokens = class _SliceLineTokens {
  constructor(source, startOffset, endOffset, deltaOffset) {
    this.a = source;
    this.b = startOffset;
    this.c = endOffset;
    this.d = deltaOffset;
    this.e = source.findTokenIndexAtOffset(startOffset);
    this.languageIdCodec = source.languageIdCodec;
    this.f = 0;
    for (let i = this.e, len = source.getCount(); i < len; i++) {
      const tokenStartOffset = source.getStartOffset(i);
      if (tokenStartOffset >= endOffset) {
        break;
      }
      this.f++;
    }
  }
  getMetadata(tokenIndex) {
    return this.a.getMetadata(this.e + tokenIndex);
  }
  getLanguageId(tokenIndex) {
    return this.a.getLanguageId(this.e + tokenIndex);
  }
  getLineContent() {
    return this.a.getLineContent().substring(this.b, this.c);
  }
  equals(other) {
    if (other instanceof _SliceLineTokens) {
      return this.b === other.b && this.c === other.c && this.d === other.d && this.a.slicedEquals(other.a, this.e, this.f);
    }
    return false;
  }
  getCount() {
    return this.f;
  }
  getStandardTokenType(tokenIndex) {
    return this.a.getStandardTokenType(this.e + tokenIndex);
  }
  getForeground(tokenIndex) {
    return this.a.getForeground(this.e + tokenIndex);
  }
  getEndOffset(tokenIndex) {
    const tokenEndOffset = this.a.getEndOffset(this.e + tokenIndex);
    return Math.min(this.c, tokenEndOffset) - this.b + this.d;
  }
  getClassName(tokenIndex) {
    return this.a.getClassName(this.e + tokenIndex);
  }
  getInlineStyle(tokenIndex, colorMap) {
    return this.a.getInlineStyle(this.e + tokenIndex, colorMap);
  }
  getPresentation(tokenIndex) {
    return this.a.getPresentation(this.e + tokenIndex);
  }
  findTokenIndexAtOffset(offset) {
    return this.a.findTokenIndexAtOffset(offset + this.b - this.d) - this.e;
  }
  getTokenText(tokenIndex) {
    const adjustedTokenIndex = this.e + tokenIndex;
    const tokenStartOffset = this.a.getStartOffset(adjustedTokenIndex);
    const tokenEndOffset = this.a.getEndOffset(adjustedTokenIndex);
    let text = this.a.getTokenText(adjustedTokenIndex);
    if (tokenStartOffset < this.b) {
      text = text.substring(this.b - tokenStartOffset);
    }
    if (tokenEndOffset > this.c) {
      text = text.substring(0, text.length - (tokenEndOffset - this.c));
    }
    return text;
  }
  forEach(callback) {
    for (let tokenIndex = 0; tokenIndex < this.getCount(); tokenIndex++) {
      callback(tokenIndex);
    }
  }
};
var $JE = class _$JE {
  static fromLineTokens(lineTokens) {
    const tokenInfo = [];
    for (let i = 0; i < lineTokens.getCount(); i++) {
      tokenInfo.push(new $KE(lineTokens.getEndOffset(i) - lineTokens.getStartOffset(i), lineTokens.getMetadata(i)));
    }
    return _$JE.create(tokenInfo);
  }
  static create(tokenInfo) {
    return new _$JE(tokenInfo);
  }
  constructor(a) {
    this.a = a;
  }
  toLineTokens(lineContent, decoder) {
    return $HE.createFromTextAndMetadata(this.map((r, t) => ({ text: r.substring(lineContent), metadata: t.metadata })), decoder);
  }
  forEach(cb) {
    let lengthSum = 0;
    for (const tokenInfo of this.a) {
      const range = new $PD(lengthSum, lengthSum + tokenInfo.length);
      cb(range, tokenInfo);
      lengthSum += tokenInfo.length;
    }
  }
  map(cb) {
    const result = [];
    let lengthSum = 0;
    for (const tokenInfo of this.a) {
      const range = new $PD(lengthSum, lengthSum + tokenInfo.length);
      result.push(cb(range, tokenInfo));
      lengthSum += tokenInfo.length;
    }
    return result;
  }
  slice(range) {
    const result = [];
    let lengthSum = 0;
    for (const tokenInfo of this.a) {
      const tokenStart = lengthSum;
      const tokenEndEx = tokenStart + tokenInfo.length;
      if (tokenEndEx > range.start) {
        if (tokenStart >= range.endExclusive) {
          break;
        }
        const deltaBefore = Math.max(0, range.start - tokenStart);
        const deltaAfter = Math.max(0, tokenEndEx - range.endExclusive);
        result.push(new $KE(tokenInfo.length - deltaBefore - deltaAfter, tokenInfo.metadata));
      }
      lengthSum += tokenInfo.length;
    }
    return _$JE.create(result);
  }
  append(other) {
    const result = this.a.concat(other.a);
    return _$JE.create(result);
  }
};
var $KE = class {
  constructor(length, metadata) {
    this.length = length;
    this.metadata = metadata;
  }
};
var $LE = class {
  constructor() {
    this.a = [];
  }
  add(length, metadata) {
    this.a.push(new $KE(length, metadata));
  }
  build() {
    return $JE.create(this.a);
  }
};

// out-build/vs/editor/common/tokens/contiguousTokensEditing.js
var $ME = new Uint32Array(0).buffer;
var $NE = class _$NE {
  static deleteBeginning(lineTokens, toChIndex) {
    if (lineTokens === null || lineTokens === $ME) {
      return lineTokens;
    }
    return _$NE.delete(lineTokens, 0, toChIndex);
  }
  static deleteEnding(lineTokens, fromChIndex) {
    if (lineTokens === null || lineTokens === $ME) {
      return lineTokens;
    }
    const tokens = $OE(lineTokens);
    const lineTextLength = tokens[tokens.length - 2];
    return _$NE.delete(lineTokens, fromChIndex, lineTextLength);
  }
  static delete(lineTokens, fromChIndex, toChIndex) {
    if (lineTokens === null || lineTokens === $ME || fromChIndex === toChIndex) {
      return lineTokens;
    }
    const tokens = $OE(lineTokens);
    const tokensCount = tokens.length >>> 1;
    if (fromChIndex === 0 && tokens[tokens.length - 2] === toChIndex) {
      return $ME;
    }
    const fromTokenIndex = $HE.findIndexInTokensArray(tokens, fromChIndex);
    const fromTokenStartOffset = fromTokenIndex > 0 ? tokens[fromTokenIndex - 1 << 1] : 0;
    const fromTokenEndOffset = tokens[fromTokenIndex << 1];
    if (toChIndex < fromTokenEndOffset) {
      const delta2 = toChIndex - fromChIndex;
      for (let i = fromTokenIndex; i < tokensCount; i++) {
        tokens[i << 1] -= delta2;
      }
      return lineTokens;
    }
    let dest;
    let lastEnd;
    if (fromTokenStartOffset !== fromChIndex) {
      tokens[fromTokenIndex << 1] = fromChIndex;
      dest = fromTokenIndex + 1 << 1;
      lastEnd = fromChIndex;
    } else {
      dest = fromTokenIndex << 1;
      lastEnd = fromTokenStartOffset;
    }
    const delta = toChIndex - fromChIndex;
    for (let tokenIndex = fromTokenIndex + 1; tokenIndex < tokensCount; tokenIndex++) {
      const tokenEndOffset = tokens[tokenIndex << 1] - delta;
      if (tokenEndOffset > lastEnd) {
        tokens[dest++] = tokenEndOffset;
        tokens[dest++] = tokens[(tokenIndex << 1) + 1];
        lastEnd = tokenEndOffset;
      }
    }
    if (dest === tokens.length) {
      return lineTokens;
    }
    const tmp = new Uint32Array(dest);
    tmp.set(tokens.subarray(0, dest), 0);
    return tmp.buffer;
  }
  static append(lineTokens, _otherTokens) {
    if (_otherTokens === $ME) {
      return lineTokens;
    }
    if (lineTokens === $ME) {
      return _otherTokens;
    }
    if (lineTokens === null) {
      return lineTokens;
    }
    if (_otherTokens === null) {
      return null;
    }
    const myTokens = $OE(lineTokens);
    const otherTokens = $OE(_otherTokens);
    const otherTokensCount = otherTokens.length >>> 1;
    const result = new Uint32Array(myTokens.length + otherTokens.length);
    result.set(myTokens, 0);
    let dest = myTokens.length;
    const delta = myTokens[myTokens.length - 2];
    for (let i = 0; i < otherTokensCount; i++) {
      result[dest++] = otherTokens[i << 1] + delta;
      result[dest++] = otherTokens[(i << 1) + 1];
    }
    return result.buffer;
  }
  static insert(lineTokens, chIndex, textLength) {
    if (lineTokens === null || lineTokens === $ME) {
      return lineTokens;
    }
    const tokens = $OE(lineTokens);
    const tokensCount = tokens.length >>> 1;
    let fromTokenIndex = $HE.findIndexInTokensArray(tokens, chIndex);
    if (fromTokenIndex > 0) {
      const fromTokenStartOffset = tokens[fromTokenIndex - 1 << 1];
      if (fromTokenStartOffset === chIndex) {
        fromTokenIndex--;
      }
    }
    for (let tokenIndex = fromTokenIndex; tokenIndex < tokensCount; tokenIndex++) {
      tokens[tokenIndex << 1] += textLength;
    }
    return lineTokens;
  }
};
function $OE(arr) {
  if (arr instanceof Uint32Array) {
    return arr;
  } else {
    return new Uint32Array(arr);
  }
}

// out-build/vs/editor/common/tokens/contiguousMultilineTokens.js
var $PE = class _$PE {
  static deserialize(buff, offset, result) {
    const view32 = new Uint32Array(buff.buffer);
    const startLineNumber = $6i(buff, offset);
    offset += 4;
    const count = $6i(buff, offset);
    offset += 4;
    const tokens = [];
    for (let i = 0; i < count; i++) {
      const byteCount = $6i(buff, offset);
      offset += 4;
      tokens.push(view32.subarray(offset / 4, offset / 4 + byteCount / 4));
      offset += byteCount;
    }
    result.push(new _$PE(startLineNumber, tokens));
    return offset;
  }
  /**
   * (Inclusive) start line number for these tokens.
   */
  get startLineNumber() {
    return this.a;
  }
  /**
   * (Inclusive) end line number for these tokens.
   */
  get endLineNumber() {
    return this.a + this.b.length - 1;
  }
  constructor(startLineNumber, tokens) {
    this.a = startLineNumber;
    this.b = tokens;
  }
  getLineRange() {
    return new $RD(this.a, this.a + this.b.length);
  }
  /**
   * @see {@link b}
   */
  getLineTokens(lineNumber) {
    return this.b[lineNumber - this.a];
  }
  appendLineTokens(lineTokens) {
    this.b.push(lineTokens);
  }
  serializeSize() {
    let result = 0;
    result += 4;
    result += 4;
    for (let i = 0; i < this.b.length; i++) {
      const lineTokens = this.b[i];
      if (!(lineTokens instanceof Uint32Array)) {
        throw new Error(`Not supported!`);
      }
      result += 4;
      result += lineTokens.byteLength;
    }
    return result;
  }
  serialize(destination, offset) {
    $7i(destination, this.a, offset);
    offset += 4;
    $7i(destination, this.b.length, offset);
    offset += 4;
    for (let i = 0; i < this.b.length; i++) {
      const lineTokens = this.b[i];
      if (!(lineTokens instanceof Uint32Array)) {
        throw new Error(`Not supported!`);
      }
      $7i(destination, lineTokens.byteLength, offset);
      offset += 4;
      destination.set(new Uint8Array(lineTokens.buffer), offset);
      offset += lineTokens.byteLength;
    }
    return offset;
  }
  applyEdit(range, text) {
    const [eolCount, firstLineLength] = $GE(text);
    this.c(range);
    this.d(new $GD(range.startLineNumber, range.startColumn), eolCount, firstLineLength);
  }
  c(range) {
    if (range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn) {
      return;
    }
    const firstLineIndex = range.startLineNumber - this.a;
    const lastLineIndex = range.endLineNumber - this.a;
    if (lastLineIndex < 0) {
      const deletedLinesCount = lastLineIndex - firstLineIndex;
      this.a -= deletedLinesCount;
      return;
    }
    if (firstLineIndex >= this.b.length) {
      return;
    }
    if (firstLineIndex < 0 && lastLineIndex >= this.b.length) {
      this.a = 0;
      this.b = [];
      return;
    }
    if (firstLineIndex === lastLineIndex) {
      this.b[firstLineIndex] = $NE.delete(this.b[firstLineIndex], range.startColumn - 1, range.endColumn - 1);
      return;
    }
    if (firstLineIndex >= 0) {
      this.b[firstLineIndex] = $NE.deleteEnding(this.b[firstLineIndex], range.startColumn - 1);
      if (lastLineIndex < this.b.length) {
        const lastLineTokens = $NE.deleteBeginning(this.b[lastLineIndex], range.endColumn - 1);
        this.b[firstLineIndex] = $NE.append(this.b[firstLineIndex], lastLineTokens);
        this.b.splice(firstLineIndex + 1, lastLineIndex - firstLineIndex);
      } else {
        this.b[firstLineIndex] = $NE.append(this.b[firstLineIndex], null);
        this.b = this.b.slice(0, firstLineIndex + 1);
      }
    } else {
      const deletedBefore = -firstLineIndex;
      this.a -= deletedBefore;
      this.b[lastLineIndex] = $NE.deleteBeginning(this.b[lastLineIndex], range.endColumn - 1);
      this.b = this.b.slice(lastLineIndex);
    }
  }
  d(position, eolCount, firstLineLength) {
    if (eolCount === 0 && firstLineLength === 0) {
      return;
    }
    const lineIndex = position.lineNumber - this.a;
    if (lineIndex < 0) {
      this.a += eolCount;
      return;
    }
    if (lineIndex >= this.b.length) {
      return;
    }
    if (eolCount === 0) {
      this.b[lineIndex] = $NE.insert(this.b[lineIndex], position.column - 1, firstLineLength);
      return;
    }
    this.b[lineIndex] = $NE.deleteEnding(this.b[lineIndex], position.column - 1);
    this.b[lineIndex] = $NE.insert(this.b[lineIndex], position.column - 1, firstLineLength);
    this.e(position.lineNumber, eolCount);
  }
  e(insertIndex, insertCount) {
    if (insertCount === 0) {
      return;
    }
    const lineTokens = [];
    for (let i = 0; i < insertCount; i++) {
      lineTokens[i] = null;
    }
    this.b = $lc(this.b, insertIndex, lineTokens);
  }
};

// out-build/vs/editor/common/tokens/contiguousMultilineTokensBuilder.js
var $RJ = class {
  static deserialize(buff) {
    let offset = 0;
    const count = $6i(buff, offset);
    offset += 4;
    const result = [];
    for (let i = 0; i < count; i++) {
      offset = $PE.deserialize(buff, offset, result);
    }
    return result;
  }
  constructor() {
    this.a = [];
  }
  add(lineNumber, lineTokens) {
    if (this.a.length > 0) {
      const last = this.a[this.a.length - 1];
      if (last.endLineNumber + 1 === lineNumber) {
        last.appendLineTokens(lineTokens);
        return;
      }
    }
    this.a.push(new $PE(lineNumber, [lineTokens]));
  }
  finalize() {
    return this.a;
  }
  serialize() {
    const size = this.b();
    const result = new Uint8Array(size);
    this.c(result);
    return result;
  }
  b() {
    let result = 0;
    result += 4;
    for (let i = 0; i < this.a.length; i++) {
      result += this.a[i].serializeSize();
    }
    return result;
  }
  c(destination) {
    let offset = 0;
    $7i(destination, this.a.length, offset);
    offset += 4;
    for (let i = 0; i < this.a.length; i++) {
      offset = this.a[i].serialize(destination, offset);
    }
  }
};

// out-build/vs/editor/common/model/textModelTokens.js
var Constants2;
(function(Constants3) {
  Constants3[Constants3["CHEAP_TOKENIZATION_LENGTH_LIMIT"] = 2048] = "CHEAP_TOKENIZATION_LENGTH_LIMIT";
})(Constants2 || (Constants2 = {}));
var $SJ = class {
  constructor(lineCount, tokenizationSupport) {
    this.tokenizationSupport = tokenizationSupport;
    this.a = this.tokenizationSupport.getInitialState();
    this.store = new $VJ(lineCount);
  }
  getStartState(lineNumber) {
    return this.store.getStartState(lineNumber, this.a);
  }
  getFirstInvalidLine() {
    return this.store.getFirstInvalidLine(this.a);
  }
};
var $VJ = class {
  constructor(d) {
    this.d = d;
    this.a = new $WJ();
    this.b = new $XJ();
    this.b.addRange(new $PD(1, d + 1));
  }
  getEndState(lineNumber) {
    return this.a.getEndState(lineNumber);
  }
  /**
   * @returns if the end state has changed.
   */
  setEndState(lineNumber, state) {
    if (!state) {
      throw new $Eb("Cannot set null/undefined state");
    }
    this.b.delete(lineNumber);
    const r = this.a.setEndState(lineNumber, state);
    if (r && lineNumber < this.d) {
      this.b.addRange(new $PD(lineNumber + 1, lineNumber + 2));
    }
    return r;
  }
  acceptChange(range, newLineCount) {
    this.d += newLineCount - range.length;
    this.a.acceptChange(range, newLineCount);
    this.b.addRangeAndResize(new $PD(range.startLineNumber, range.endLineNumberExclusive), newLineCount);
  }
  acceptChanges(changes) {
    for (const c of changes) {
      const [eolCount] = $GE(c.text);
      this.acceptChange(new $RD(c.range.startLineNumber, c.range.endLineNumber + 1), eolCount + 1);
    }
  }
  invalidateEndStateRange(range) {
    this.b.addRange(new $PD(range.startLineNumber, range.endLineNumberExclusive));
  }
  getFirstInvalidEndStateLineNumber() {
    return this.b.min;
  }
  getFirstInvalidEndStateLineNumberOrMax() {
    return this.getFirstInvalidEndStateLineNumber() || Number.MAX_SAFE_INTEGER;
  }
  allStatesValid() {
    return this.b.min === null;
  }
  getStartState(lineNumber, initialState) {
    if (lineNumber === 1) {
      return initialState;
    }
    return this.getEndState(lineNumber - 1);
  }
  getFirstInvalidLine(initialState) {
    const lineNumber = this.getFirstInvalidEndStateLineNumber();
    if (lineNumber === null) {
      return null;
    }
    const startState = this.getStartState(lineNumber, initialState);
    if (!startState) {
      throw new $Eb("Start state must be defined");
    }
    return { lineNumber, startState };
  }
};
var $WJ = class {
  constructor() {
    this.a = new $QJ(null);
  }
  getEndState(lineNumber) {
    return this.a.get(lineNumber);
  }
  setEndState(lineNumber, state) {
    const oldState = this.a.get(lineNumber);
    if (oldState && oldState.equals(state)) {
      return false;
    }
    this.a.set(lineNumber, state);
    return true;
  }
  acceptChange(range, newLineCount) {
    let length = range.length;
    if (newLineCount > 0 && length > 0) {
      length--;
      newLineCount--;
    }
    this.a.replace(range.startLineNumber, length, newLineCount);
  }
  acceptChanges(changes) {
    for (const c of changes) {
      const [eolCount] = $GE(c.text);
      this.acceptChange(new $RD(c.range.startLineNumber, c.range.endLineNumber + 1), eolCount + 1);
    }
  }
};
var $XJ = class {
  constructor() {
    this.a = [];
  }
  getRanges() {
    return this.a;
  }
  get min() {
    if (this.a.length === 0) {
      return null;
    }
    return this.a[0].start;
  }
  removeMin() {
    if (this.a.length === 0) {
      return null;
    }
    const range = this.a[0];
    if (range.start + 1 === range.endExclusive) {
      this.a.shift();
    } else {
      this.a[0] = new $PD(range.start + 1, range.endExclusive);
    }
    return range.start;
  }
  delete(value) {
    const idx = this.a.findIndex((r) => r.contains(value));
    if (idx !== -1) {
      const range = this.a[idx];
      if (range.start === value) {
        if (range.endExclusive === value + 1) {
          this.a.splice(idx, 1);
        } else {
          this.a[idx] = new $PD(value + 1, range.endExclusive);
        }
      } else {
        if (range.endExclusive === value + 1) {
          this.a[idx] = new $PD(range.start, value);
        } else {
          this.a.splice(idx, 1, new $PD(range.start, value), new $PD(value + 1, range.endExclusive));
        }
      }
    }
  }
  addRange(range) {
    $PD.addRange(range, this.a);
  }
  addRangeAndResize(range, newLength) {
    let idxFirstMightBeIntersecting = 0;
    while (!(idxFirstMightBeIntersecting >= this.a.length || range.start <= this.a[idxFirstMightBeIntersecting].endExclusive)) {
      idxFirstMightBeIntersecting++;
    }
    let idxFirstIsAfter = idxFirstMightBeIntersecting;
    while (!(idxFirstIsAfter >= this.a.length || range.endExclusive < this.a[idxFirstIsAfter].start)) {
      idxFirstIsAfter++;
    }
    const delta = newLength - range.length;
    for (let i = idxFirstIsAfter; i < this.a.length; i++) {
      this.a[i] = this.a[i].delta(delta);
    }
    if (idxFirstMightBeIntersecting === idxFirstIsAfter) {
      const newRange = new $PD(range.start, range.start + newLength);
      if (!newRange.isEmpty) {
        this.a.splice(idxFirstMightBeIntersecting, 0, newRange);
      }
    } else {
      const start = Math.min(range.start, this.a[idxFirstMightBeIntersecting].start);
      const endEx = Math.max(range.endExclusive, this.a[idxFirstIsAfter - 1].endExclusive);
      const newRange = new $PD(start, endEx + delta);
      if (!newRange.isEmpty) {
        this.a.splice(idxFirstMightBeIntersecting, idxFirstIsAfter - idxFirstMightBeIntersecting, newRange);
      } else {
        this.a.splice(idxFirstMightBeIntersecting, idxFirstIsAfter - idxFirstMightBeIntersecting);
      }
    }
  }
  toString() {
    return this.a.map((r) => r.toString()).join(" + ");
  }
};

// out-build/vs/workbench/services/textMate/browser/tokenizationSupport/textMateTokenizationSupport.js
var $y$b = class extends $Fd {
  get onDidEncounterLanguage() {
    return this.b.event;
  }
  constructor(c, f, g, h, j, m, n) {
    super();
    this.c = c;
    this.f = f;
    this.g = g;
    this.h = h;
    this.j = j;
    this.m = m;
    this.n = n;
    this.a = [];
    this.b = this.D(new $qf());
  }
  get backgroundTokenizerShouldOnlyVerifyTokens() {
    return this.j();
  }
  getInitialState() {
    return this.f;
  }
  tokenize(line, hasEOL, state) {
    throw new Error("Not supported!");
  }
  createBackgroundTokenizer(textModel, store) {
    if (this.h) {
      return this.h(textModel, store);
    }
    return void 0;
  }
  tokenizeEncoded(line, hasEOL, state) {
    const isRandomSample = Math.random() * 1e4 < 1;
    const shouldMeasure = this.n || isRandomSample;
    const sw = shouldMeasure ? new $kf(true) : void 0;
    const textMateResult = this.c.tokenizeLine2(line, state, 500);
    if (shouldMeasure) {
      const timeMS = sw.elapsed();
      if (isRandomSample || timeMS > 32) {
        this.m(timeMS, line.length, isRandomSample);
      }
    }
    if (textMateResult.stoppedEarly) {
      console.warn(`Time limit reached when tokenizing line: ${line.substring(0, 100)}`);
      return new $1E(textMateResult.tokens, state);
    }
    if (this.g) {
      const seenLanguages = this.a;
      const tokens = textMateResult.tokens;
      for (let i = 0, len = tokens.length >>> 1; i < len; i++) {
        const metadata = tokens[(i << 1) + 1];
        const languageId = $CE.getLanguageId(metadata);
        if (!seenLanguages[languageId]) {
          seenLanguages[languageId] = true;
          this.b.fire(languageId);
        }
      }
    }
    let endState;
    if (state.equals(textMateResult.ruleStack)) {
      endState = state;
    } else {
      endState = textMateResult.ruleStack;
    }
    return new $1E(textMateResult.tokens, endState);
  }
};

// out-build/vs/workbench/services/textMate/browser/tokenizationSupport/tokenizationSupportWithLineLimit.js
var $z$b = class extends $Fd {
  get backgroundTokenizerShouldOnlyVerifyTokens() {
    return this.b.backgroundTokenizerShouldOnlyVerifyTokens;
  }
  constructor(a, b, disposable, c) {
    super();
    this.a = a;
    this.b = b;
    this.c = c;
    this.D($ve(this.c));
    this.D(disposable);
  }
  getInitialState() {
    return this.b.getInitialState();
  }
  tokenize(line, hasEOL, state) {
    throw new Error("Not supported!");
  }
  tokenizeEncoded(line, hasEOL, state) {
    if (line.length >= this.c.get()) {
      return $PJ(this.a, state);
    }
    return this.b.tokenizeEncoded(line, hasEOL, state);
  }
  createBackgroundTokenizer(textModel, store) {
    if (this.b.createBackgroundTokenizer) {
      return this.b.createBackgroundTokenizer(textModel, store);
    } else {
      return void 0;
    }
  }
};

// out-build/vs/workbench/services/textMate/browser/backgroundTokenization/worker/textMateWorkerTokenizer.js
var $D$b = class extends $jG {
  constructor(uri, lines, eol, versionId, s, t, u, maxTokenizationLineLength) {
    super(uri, lines, eol, versionId);
    this.s = s;
    this.t = t;
    this.u = u;
    this.m = null;
    this.n = false;
    this.o = $Se(this, -1);
    this.q = new $bi(() => this.w(), 10);
    this.o.set(maxTokenizationLineLength, void 0);
    this.v();
  }
  dispose() {
    this.n = true;
    super.dispose();
  }
  onLanguageId(languageId, encodedLanguageId) {
    this.t = languageId;
    this.u = encodedLanguageId;
    this.v();
  }
  onEvents(e) {
    super.onEvents(e);
    this.m?.store.acceptChanges(e.changes);
    this.q.schedule();
  }
  acceptMaxTokenizationLineLength(maxTokenizationLineLength) {
    this.o.set(maxTokenizationLineLength, void 0);
  }
  retokenize(startLineNumber, endLineNumberExclusive) {
    if (this.m) {
      this.m.store.invalidateEndStateRange(new $RD(startLineNumber, endLineNumberExclusive));
      this.q.schedule();
    }
  }
  async v() {
    this.m = null;
    const languageId = this.t;
    const encodedLanguageId = this.u;
    const r = await this.s.getOrCreateGrammar(languageId, encodedLanguageId);
    if (this.n || languageId !== this.t || encodedLanguageId !== this.u || !r) {
      return;
    }
    if (r.grammar) {
      const tokenizationSupport = new $z$b(this.u, new $y$b(r.grammar, r.initialState, false, void 0, () => false, (timeMs, lineLength, isRandomSample) => {
        this.s.reportTokenizationTime(timeMs, languageId, r.sourceExtensionId, lineLength, isRandomSample);
      }, false), $Fd.None, this.o);
      this.m = new $SJ(this.b.length, tokenizationSupport);
    } else {
      this.m = null;
    }
    this.w();
  }
  async w() {
    if (this.n || !this.m) {
      return;
    }
    if (!this.p) {
      const { diffStateStacksRefEq } = await $PK("vscode-textmate", "release/main.js");
      this.p = diffStateStacksRefEq;
    }
    const startTime = (/* @__PURE__ */ new Date()).getTime();
    while (true) {
      let tokenizedLines = 0;
      const tokenBuilder = new $RJ();
      const stateDeltaBuilder = new StateDeltaBuilder();
      while (true) {
        const lineToTokenize = this.m.getFirstInvalidLine();
        if (lineToTokenize === null || tokenizedLines > 200) {
          break;
        }
        tokenizedLines++;
        const text = this.b[lineToTokenize.lineNumber - 1];
        const r = this.m.tokenizationSupport.tokenizeEncoded(text, true, lineToTokenize.startState);
        if (this.m.store.setEndState(lineToTokenize.lineNumber, r.endState)) {
          const delta = this.p(lineToTokenize.startState, r.endState);
          stateDeltaBuilder.setState(lineToTokenize.lineNumber, delta);
        } else {
          stateDeltaBuilder.setState(lineToTokenize.lineNumber, null);
        }
        $HE.convertToEndOffset(r.tokens, text.length);
        tokenBuilder.add(lineToTokenize.lineNumber, r.tokens);
        const deltaMs2 = (/* @__PURE__ */ new Date()).getTime() - startTime;
        if (deltaMs2 > 20) {
          break;
        }
      }
      if (tokenizedLines === 0) {
        break;
      }
      const stateDeltas = stateDeltaBuilder.getStateDeltas();
      this.s.setTokensAndStates(this.d, tokenBuilder.serialize(), stateDeltas);
      const deltaMs = (/* @__PURE__ */ new Date()).getTime() - startTime;
      if (deltaMs > 20) {
        $F(() => this.w());
        return;
      }
    }
  }
};
var StateDeltaBuilder = class {
  constructor() {
    this.a = -1;
    this.b = [];
  }
  setState(lineNumber, stackDiff) {
    if (lineNumber === this.a + 1) {
      this.b[this.b.length - 1].stateDeltas.push(stackDiff);
    } else {
      this.b.push({ startLineNumber: lineNumber, stateDeltas: [stackDiff] });
    }
    this.a = lineNumber;
  }
  getStateDeltas() {
    return this.b;
  }
};

// out-build/vs/workbench/services/textMate/browser/backgroundTokenization/worker/textMateWorkerHost.js
var $E$b = class _$E$b {
  static {
    this.CHANNEL_NAME = "textMateWorkerHost";
  }
  static getChannel(workerServer) {
    return workerServer.getChannel(_$E$b.CHANNEL_NAME);
  }
  static setChannel(workerClient, obj) {
    workerClient.setChannel(_$E$b.CHANNEL_NAME, obj);
  }
};

// out-build/vs/workbench/services/textMate/browser/backgroundTokenization/worker/textMateTokenizationWorker.worker.js
function $F$b(workerServer) {
  return new $G$b(workerServer);
}
var $G$b = class {
  constructor(workerServer) {
    this._requestHandlerBrand = void 0;
    this.b = /* @__PURE__ */ new Map();
    this.c = [];
    this.d = Promise.resolve(null);
    this.a = $E$b.getChannel(workerServer);
  }
  async $init(_createData) {
    const grammarDefinitions = _createData.grammarDefinitions.map((def) => {
      return {
        location: URI.revive(def.location),
        language: def.language,
        scopeName: def.scopeName,
        embeddedLanguages: def.embeddedLanguages,
        tokenTypes: def.tokenTypes,
        injectTo: def.injectTo,
        balancedBracketSelectors: def.balancedBracketSelectors,
        unbalancedBracketSelectors: def.unbalancedBracketSelectors,
        sourceExtensionId: def.sourceExtensionId
      };
    });
    this.d = this.f(grammarDefinitions, _createData.onigurumaWASMUri);
  }
  async f(grammarDefinitions, onigurumaWASMUri) {
    const vscodeTextmate = await $PK("vscode-textmate", "release/main.js");
    const vscodeOniguruma = await $PK("vscode-oniguruma", "release/main.js");
    const response = await fetch(onigurumaWASMUri);
    const bytes = await response.arrayBuffer();
    await vscodeOniguruma.loadWASM(bytes);
    const onigLib = Promise.resolve({
      createOnigScanner: (sources) => vscodeOniguruma.createOnigScanner(sources),
      createOnigString: (str) => vscodeOniguruma.createOnigString(str)
    });
    return new $C$b({
      logTrace: (msg) => {
      },
      logError: (msg, err) => console.error(msg, err),
      readFile: (resource) => this.a.$readFile(resource)
    }, grammarDefinitions, vscodeTextmate, onigLib);
  }
  // These methods are called by the renderer
  $acceptNewModel(data) {
    const uri = URI.revive(data.uri);
    const that = this;
    this.b.set(data.controllerId, new $D$b(uri, data.lines, data.EOL, data.versionId, {
      async getOrCreateGrammar(languageId, encodedLanguageId) {
        const grammarFactory = await that.d;
        if (!grammarFactory) {
          return Promise.resolve(null);
        }
        if (!that.c[encodedLanguageId]) {
          that.c[encodedLanguageId] = grammarFactory.createGrammar(languageId, encodedLanguageId);
        }
        return that.c[encodedLanguageId];
      },
      setTokensAndStates(versionId, tokens, stateDeltas) {
        that.a.$setTokensAndStates(data.controllerId, versionId, tokens, stateDeltas);
      },
      reportTokenizationTime(timeMs, languageId, sourceExtensionId, lineLength, isRandomSample) {
        that.a.$reportTokenizationTime(timeMs, languageId, sourceExtensionId, lineLength, isRandomSample);
      }
    }, data.languageId, data.encodedLanguageId, data.maxTokenizationLineLength));
  }
  $acceptModelChanged(controllerId, e) {
    this.b.get(controllerId).onEvents(e);
  }
  $retokenize(controllerId, startLineNumber, endLineNumberExclusive) {
    this.b.get(controllerId).retokenize(startLineNumber, endLineNumberExclusive);
  }
  $acceptModelLanguageChanged(controllerId, newLanguageId, newEncodedLanguageId) {
    this.b.get(controllerId).onLanguageId(newLanguageId, newEncodedLanguageId);
  }
  $acceptRemovedModel(controllerId) {
    const model = this.b.get(controllerId);
    if (model) {
      model.dispose();
      this.b.delete(controllerId);
    }
  }
  async $acceptTheme(theme, colorMap) {
    const grammarFactory = await this.d;
    grammarFactory?.setTheme(theme, colorMap);
  }
  $acceptMaxTokenizationLineLength(controllerId, value) {
    this.b.get(controllerId).acceptMaxTokenizationLineLength(value);
  }
};

// out-build/vs/base/common/worker/webWorker.js
var DEFAULT_CHANNEL = "default";
var INITIALIZE = "$initialize";
var MessageType;
(function(MessageType2) {
  MessageType2[MessageType2["Request"] = 0] = "Request";
  MessageType2[MessageType2["Reply"] = 1] = "Reply";
  MessageType2[MessageType2["SubscribeEvent"] = 2] = "SubscribeEvent";
  MessageType2[MessageType2["Event"] = 3] = "Event";
  MessageType2[MessageType2["UnsubscribeEvent"] = 4] = "UnsubscribeEvent";
})(MessageType || (MessageType = {}));
var RequestMessage = class {
  constructor(vsWorker, req, channel, method, args) {
    this.vsWorker = vsWorker;
    this.req = req;
    this.channel = channel;
    this.method = method;
    this.args = args;
    this.type = 0;
  }
};
var ReplyMessage = class {
  constructor(vsWorker, seq, res, err) {
    this.vsWorker = vsWorker;
    this.seq = seq;
    this.res = res;
    this.err = err;
    this.type = 1;
  }
};
var SubscribeEventMessage = class {
  constructor(vsWorker, req, channel, eventName, arg) {
    this.vsWorker = vsWorker;
    this.req = req;
    this.channel = channel;
    this.eventName = eventName;
    this.arg = arg;
    this.type = 2;
  }
};
var EventMessage = class {
  constructor(vsWorker, req, event) {
    this.vsWorker = vsWorker;
    this.req = req;
    this.event = event;
    this.type = 3;
  }
};
var UnsubscribeEventMessage = class {
  constructor(vsWorker, req) {
    this.vsWorker = vsWorker;
    this.req = req;
    this.type = 4;
  }
};
var WebWorkerProtocol = class {
  constructor(handler) {
    this.a = -1;
    this.g = handler;
    this.b = 0;
    this.c = /* @__PURE__ */ Object.create(null);
    this.d = /* @__PURE__ */ new Map();
    this.f = /* @__PURE__ */ new Map();
  }
  setWorkerId(workerId) {
    this.a = workerId;
  }
  async sendMessage(channel, method, args) {
    const req = String(++this.b);
    return new Promise((resolve, reject) => {
      this.c[req] = {
        resolve,
        reject
      };
      this.o(new RequestMessage(this.a, req, channel, method, args));
    });
  }
  listen(channel, eventName, arg) {
    let req = null;
    const emitter = new $qf({
      onWillAddFirstListener: () => {
        req = String(++this.b);
        this.d.set(req, emitter);
        this.o(new SubscribeEventMessage(this.a, req, channel, eventName, arg));
      },
      onDidRemoveLastListener: () => {
        this.d.delete(req);
        this.o(new UnsubscribeEventMessage(this.a, req));
        req = null;
      }
    });
    return emitter.event;
  }
  handleMessage(message) {
    if (!message || !message.vsWorker) {
      return;
    }
    if (this.a !== -1 && message.vsWorker !== this.a) {
      return;
    }
    this.h(message);
  }
  createProxyToRemoteChannel(channel, sendMessageBarrier) {
    const handler = {
      get: (target, name) => {
        if (typeof name === "string" && !target[name]) {
          if (propertyIsDynamicEvent(name)) {
            target[name] = (arg) => {
              return this.listen(channel, name, arg);
            };
          } else if (propertyIsEvent(name)) {
            target[name] = this.listen(channel, name, void 0);
          } else if (name.charCodeAt(0) === 36) {
            target[name] = async (...myArgs) => {
              await sendMessageBarrier?.();
              return this.sendMessage(channel, name, myArgs);
            };
          }
        }
        return target[name];
      }
    };
    return new Proxy(/* @__PURE__ */ Object.create(null), handler);
  }
  h(msg) {
    switch (msg.type) {
      case 1:
        return this.j(msg);
      case 0:
        return this.k(msg);
      case 2:
        return this.l(msg);
      case 3:
        return this.m(msg);
      case 4:
        return this.n(msg);
    }
  }
  j(replyMessage) {
    if (!this.c[replyMessage.seq]) {
      console.warn("Got reply to unknown seq");
      return;
    }
    const reply = this.c[replyMessage.seq];
    delete this.c[replyMessage.seq];
    if (replyMessage.err) {
      let err = replyMessage.err;
      if (replyMessage.err.$isError) {
        const newErr = new Error();
        newErr.name = replyMessage.err.name;
        newErr.message = replyMessage.err.message;
        newErr.stack = replyMessage.err.stack;
        err = newErr;
      }
      reply.reject(err);
      return;
    }
    reply.resolve(replyMessage.res);
  }
  k(requestMessage) {
    const req = requestMessage.req;
    const result = this.g.handleMessage(requestMessage.channel, requestMessage.method, requestMessage.args);
    result.then((r) => {
      this.o(new ReplyMessage(this.a, req, r, void 0));
    }, (e) => {
      if (e.detail instanceof Error) {
        e.detail = $pb(e.detail);
      }
      this.o(new ReplyMessage(this.a, req, void 0, $pb(e)));
    });
  }
  l(msg) {
    const req = msg.req;
    const disposable = this.g.handleEvent(msg.channel, msg.eventName, msg.arg)((event) => {
      this.o(new EventMessage(this.a, req, event));
    });
    this.f.set(req, disposable);
  }
  m(msg) {
    if (!this.d.has(msg.req)) {
      console.warn("Got event for unknown req");
      return;
    }
    this.d.get(msg.req).fire(msg.event);
  }
  n(msg) {
    if (!this.f.has(msg.req)) {
      console.warn("Got unsubscribe for unknown req");
      return;
    }
    this.f.get(msg.req).dispose();
    this.f.delete(msg.req);
  }
  o(msg) {
    const transfer = [];
    if (msg.type === 0) {
      for (let i = 0; i < msg.args.length; i++) {
        const arg = msg.args[i];
        if (arg instanceof ArrayBuffer) {
          transfer.push(arg);
        }
      }
    } else if (msg.type === 1) {
      if (msg.res instanceof ArrayBuffer) {
        transfer.push(msg.res);
      }
    }
    this.g.sendMessage(msg, transfer);
  }
};
function propertyIsEvent(name) {
  return name[0] === "o" && name[1] === "n" && $fg(name.charCodeAt(2));
}
function propertyIsDynamicEvent(name) {
  return /^onDynamic/.test(name) && $fg(name.charCodeAt(9));
}
var $1$ = class {
  constructor(postMessage, requestHandlerFactory) {
    this.b = /* @__PURE__ */ new Map();
    this.c = /* @__PURE__ */ new Map();
    this.a = new WebWorkerProtocol({
      sendMessage: (msg, transfer) => {
        postMessage(msg, transfer);
      },
      handleMessage: (channel, method, args) => this.d(channel, method, args),
      handleEvent: (channel, eventName, arg) => this.f(channel, eventName, arg)
    });
    this.requestHandler = requestHandlerFactory(this);
  }
  onmessage(msg) {
    this.a.handleMessage(msg);
  }
  d(channel, method, args) {
    if (channel === DEFAULT_CHANNEL && method === INITIALIZE) {
      return this.g(args[0]);
    }
    const requestHandler = channel === DEFAULT_CHANNEL ? this.requestHandler : this.b.get(channel);
    if (!requestHandler) {
      return Promise.reject(new Error(`Missing channel ${channel} on worker thread`));
    }
    const fn = requestHandler[method];
    if (typeof fn !== "function") {
      return Promise.reject(new Error(`Missing method ${method} on worker thread channel ${channel}`));
    }
    try {
      return Promise.resolve(fn.apply(requestHandler, args));
    } catch (e) {
      return Promise.reject(e);
    }
  }
  f(channel, eventName, arg) {
    const requestHandler = channel === DEFAULT_CHANNEL ? this.requestHandler : this.b.get(channel);
    if (!requestHandler) {
      throw new Error(`Missing channel ${channel} on worker thread`);
    }
    if (propertyIsDynamicEvent(eventName)) {
      const fn = requestHandler[eventName];
      if (typeof fn !== "function") {
        throw new Error(`Missing dynamic event ${eventName} on request handler.`);
      }
      const event = fn.call(requestHandler, arg);
      if (typeof event !== "function") {
        throw new Error(`Missing dynamic event ${eventName} on request handler.`);
      }
      return event;
    }
    if (propertyIsEvent(eventName)) {
      const event = requestHandler[eventName];
      if (typeof event !== "function") {
        throw new Error(`Missing event ${eventName} on request handler.`);
      }
      return event;
    }
    throw new Error(`Malformed event name ${eventName}`);
  }
  setChannel(channel, handler) {
    this.b.set(channel, handler);
  }
  getChannel(channel) {
    if (!this.c.has(channel)) {
      const inst = this.a.createProxyToRemoteChannel(channel);
      this.c.set(channel, inst);
    }
    return this.c.get(channel);
  }
  async g(workerId) {
    this.a.setWorkerId(workerId);
  }
};

// out-build/vs/base/common/worker/webWorkerBootstrap.js
var initialized = false;
function $2$(factory) {
  if (initialized) {
    throw new Error("WebWorker already initialized!");
  }
  initialized = true;
  const webWorkerServer = new $1$((msg) => globalThis.postMessage(msg), (workerServer) => factory(workerServer));
  globalThis.onmessage = (e) => {
    webWorkerServer.onmessage(e.data);
  };
  return webWorkerServer;
}
function $3$(factory) {
  globalThis.onmessage = (_e) => {
    if (!initialized) {
      $2$(factory);
    }
  };
}

// out-build/vs/workbench/services/textMate/browser/backgroundTokenization/worker/textMateTokenizationWorker.workerMain.js
$3$($F$b);

//# sourceMappingURL=textMateTokenizationWorker.workerMain.js.map
