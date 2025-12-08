"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservablePromise = exports.monacoModule = exports.REPO_ROOT = void 0;
exports.genericEquals = genericEquals;
exports.scheduleRunInAction = scheduleRunInAction;
exports.fileExists = fileExists;
exports.isToolCall = isToolCall;
const fs = __importStar(require("fs"));
const mobx = __importStar(require("mobx"));
exports.REPO_ROOT = globalThis.projectRoot;
exports.monacoModule = {
    value: null // @ulugbekna: this is initialized on workbench startup and must be non-null by the time it's used
};
function genericEquals(one, other) {
    if (one === other) {
        return true;
    }
    if (one === null || one === undefined || other === null || other === undefined) {
        return false;
    }
    if (typeof one !== typeof other) {
        return false;
    }
    if (typeof one !== 'object') {
        return false;
    }
    if ((Array.isArray(one)) !== (Array.isArray(other))) {
        return false;
    }
    let i;
    let key;
    if (Array.isArray(one)) {
        if (one.length !== other.length) {
            return false;
        }
        for (i = 0; i < one.length; i++) {
            if (!genericEquals(one[i], other[i])) {
                return false;
            }
        }
    }
    else {
        const oneKeys = [];
        for (key in one) {
            oneKeys.push(key);
        }
        oneKeys.sort();
        const otherKeys = [];
        for (key in other) {
            otherKeys.push(key);
        }
        otherKeys.sort();
        if (!genericEquals(oneKeys, otherKeys)) {
            return false;
        }
        for (i = 0; i < oneKeys.length; i++) {
            if (!genericEquals(one[oneKeys[i]], other[oneKeys[i]])) {
                return false;
            }
        }
    }
    return true;
}
let pendingRunInAction = [];
/**
 * Schedules a function to be run inside a MobX action.
 * This will batch multiple callers in a single runInAction MobX call.
 *
 * @param fn - The function to be scheduled.
 */
function scheduleRunInAction(fn) {
    pendingRunInAction.push(fn);
    if (pendingRunInAction.length === 1) {
        process.nextTick(() => {
            const updates = pendingRunInAction;
            pendingRunInAction = [];
            runInAction(updates);
        });
    }
}
function runInAction(fns) {
    mobx.runInAction(() => {
        for (const fn of fns) {
            try {
                fn();
            }
            catch (err) {
                console.error(err);
            }
        }
    });
}
class ObservablePromise {
    static resolve(value) {
        return new ObservablePromise(Promise.resolve(value), value);
    }
    constructor(promise, defaultValue) {
        this.promise = promise;
        this.error = null;
        this.value = defaultValue;
        this.resolved = false;
        mobx.makeObservable(this);
        this.promise.then((value) => {
            scheduleRunInAction(() => {
                this.value = value;
                this.resolved = true;
            });
        }, (error) => {
            scheduleRunInAction(() => {
                console.error(error);
                this.error = error;
                this.resolved = true;
            });
        });
    }
}
exports.ObservablePromise = ObservablePromise;
__decorate([
    mobx.observable.ref
], ObservablePromise.prototype, "error", void 0);
__decorate([
    mobx.observable.ref
], ObservablePromise.prototype, "value", void 0);
__decorate([
    mobx.observable.ref
], ObservablePromise.prototype, "resolved", void 0);
async function fileExists(filePath) {
    try {
        await fs.promises.access(filePath);
        return true;
    }
    catch (_) {
        return false;
    }
}
function isToolCall(request) {
    return Boolean(request.response.copilotFunctionCalls?.length);
}
//# sourceMappingURL=utils.js.map