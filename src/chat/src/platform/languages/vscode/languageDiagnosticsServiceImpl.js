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
exports.LanguageDiagnosticsServiceImpl = void 0;
const vscode = __importStar(require("vscode"));
const languageDiagnosticsService_1 = require("../common/languageDiagnosticsService");
class LanguageDiagnosticsServiceImpl extends languageDiagnosticsService_1.AbstractLanguageDiagnosticsService {
    constructor() {
        super(...arguments);
        this.onDidChangeDiagnostics = vscode.languages.onDidChangeDiagnostics;
    }
    static { this.ignoredSchemes = new Set(['git', 'chat-editing-snapshot-text-model', 'chat-editing-text-model']); }
    getDiagnostics(resource) {
        return vscode.languages.getDiagnostics(resource);
    }
    getAllDiagnostics() {
        return vscode.languages.getDiagnostics()
            .filter(([uri]) => !LanguageDiagnosticsServiceImpl.ignoredSchemes.has(uri.scheme));
    }
}
exports.LanguageDiagnosticsServiceImpl = LanguageDiagnosticsServiceImpl;
//# sourceMappingURL=languageDiagnosticsServiceImpl.js.map