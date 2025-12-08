"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPO_ROOT = void 0;
exports.createScoreRenderer = createScoreRenderer;
exports.printTime = printTime;
exports.fileExists = fileExists;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs = __importStar(require("fs"));
const path_1 = require("path");
exports.REPO_ROOT = (0, path_1.join)(__dirname, '..'); // This must hold for both the esbuild bundle location and the source!
function createScoreRenderer(opts, canUseBaseline) {
    // We can show pass count only when using the same number of runs as the baseline
    const maxDigitCount = String(opts.nRuns).length;
    return (canUseBaseline
        ? (score) => `${String(score * opts.nRuns).padStart(maxDigitCount, ' ')}`
        : (score) => `${String(score.toFixed(1)).padStart(3, ' ')}`);
}
function printTime(ms) {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    let seconds = (ms / 1000);
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    return `${minutes}m${Math.ceil(seconds)}s`;
}
async function fileExists(filePath) {
    try {
        await fs.promises.access(filePath);
        return true;
    }
    catch (_) {
        return false;
    }
}
//# sourceMappingURL=util.js.map