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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMatch = isMatch;
exports.shouldInclude = shouldInclude;
exports.combineGlob = combineGlob;
const picomatch_1 = __importDefault(require("picomatch"));
const path = __importStar(require("../vs/base/common/path"));
const platform_1 = require("../vs/base/common/platform");
function isMatch(uri, glob) {
    if (typeof glob === 'string') {
        return picomatch_1.default.isMatch(uri.fsPath, glob, { dot: true, windows: platform_1.isWindows });
    }
    else {
        if (uri.fsPath === glob.baseUri.fsPath && glob.pattern === '*') {
            return true;
        }
        const relativePath = path.relative(glob.baseUri.fsPath, uri.fsPath);
        if (!relativePath.startsWith('..')) {
            return picomatch_1.default.isMatch(relativePath, glob.pattern, { dot: true, windows: platform_1.isWindows });
        }
        return picomatch_1.default.isMatch(uri.fsPath, glob.pattern, { dot: true, windows: platform_1.isWindows });
    }
}
function shouldInclude(uri, options) {
    if (!options) {
        return true;
    }
    if (options.exclude?.some(x => isMatch(uri, x))) {
        return false;
    }
    if (options.include) {
        return options.include.some(x => isMatch(uri, x));
    }
    return true;
}
function combineGlob(glob1, glob2) {
    let stringGlob1 = typeof glob1 === 'string' ? glob1 : glob1.baseUri.toString() + glob1.pattern;
    let stringGlob2 = typeof glob2 === 'string' ? glob2 : glob2.baseUri.toString() + glob2.pattern;
    // Remove any bracket expansion from the globs
    stringGlob1 = stringGlob1.replace(/\{.*\}/g, '');
    stringGlob2 = stringGlob2.replace(/\{.*\}/g, '');
    // Combine them into one bracket expanded glob pattern
    return `{${stringGlob1},${stringGlob2}}`;
}
//# sourceMappingURL=glob.js.map