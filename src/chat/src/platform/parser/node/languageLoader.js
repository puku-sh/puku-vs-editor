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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageLoader = void 0;
const path = __importStar(require("../../../util/vs/base/common/path"));
const Parser = require("web-tree-sitter");
class LanguageLoader {
    constructor() {
        this.loadedLanguagesCache = new Map();
    }
    loadLanguage(wasmLanguage) {
        if (!this.loadedLanguagesCache.has(wasmLanguage)) {
            this.loadedLanguagesCache.set(wasmLanguage, this._doLoadLanguage(wasmLanguage));
        }
        return this.loadedLanguagesCache.get(wasmLanguage);
    }
    _doLoadLanguage(language) {
        // construct a path that works both for the TypeScript source, which lives under `/src`, and for
        // the transpiled JavaScript, which lives under `/dist`
        const wasmFileLang = language === 'csharp' ? 'c-sharp' : language;
        const wasmFilename = `tree-sitter-${wasmFileLang}.wasm`;
        // depending on if file is being run from the webpack bundle or source, change the relative path
        const wasmFile = path.basename(__dirname) === 'dist'
            ? path.resolve(__dirname, wasmFilename)
            : path.resolve(__dirname, '../../../../dist', wasmFilename);
        return Parser.Language.load(wasmFile);
    }
}
exports.LanguageLoader = LanguageLoader;
//# sourceMappingURL=languageLoader.js.map