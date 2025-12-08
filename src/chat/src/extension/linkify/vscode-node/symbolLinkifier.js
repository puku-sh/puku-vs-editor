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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymbolLinkifier = void 0;
const vscode = __importStar(require("vscode"));
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const range_1 = require("../../../util/common/range");
const vscodeTypes_1 = require("../../../vscodeTypes");
const linkifiedText_1 = require("../common/linkifiedText");
const findSymbol_1 = require("./findSymbol");
/**
 * Linkifies symbol paths in responses. For example:
 *
 * ```
 * [`symbol`](file.md)
 * ```
 */
let SymbolLinkifier = class SymbolLinkifier {
    constructor(fileSystem, workspaceService) {
        this.fileSystem = fileSystem;
        this.workspaceService = workspaceService;
    }
    async linkify(text, context, token) {
        const workspaceFolders = this.workspaceService.getWorkspaceFolders();
        if (!workspaceFolders.length) {
            return;
        }
        const out = [];
        let endLastMatch = 0;
        for (const match of text.matchAll(/\[`([^`\[\]]+?)`]\((\S+?\.\w+)\)/g)) {
            const prefix = text.slice(endLastMatch, match.index);
            if (prefix) {
                out.push(prefix);
            }
            const symbolText = match[1];
            let symbolPath = match[2];
            try {
                symbolPath = decodeURIComponent(symbolPath);
            }
            catch {
                // noop
            }
            let resolvedUri;
            for (const workspaceFolder of workspaceFolders) {
                const uri = vscodeTypes_1.Uri.joinPath(workspaceFolder, symbolPath);
                if (await this.exists(uri)) {
                    resolvedUri = uri;
                    break;
                }
            }
            if (resolvedUri) {
                const info = {
                    name: symbolText,
                    containerName: '',
                    kind: vscode.SymbolKind.Variable,
                    location: new vscode.Location(resolvedUri, new vscode.Position(0, 0))
                };
                out.push(new linkifiedText_1.LinkifySymbolAnchor(info, async (token) => {
                    let symbols;
                    try {
                        symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', resolvedUri);
                    }
                    catch (e) {
                        // Noop
                    }
                    if (symbols?.length) {
                        const matchingSymbol = (0, findSymbol_1.findBestSymbolByPath)(symbols, symbolText);
                        if (matchingSymbol) {
                            info.kind = matchingSymbol.kind;
                            // Not a real instance of 'vscode.DocumentSymbol' so use cast to check
                            if (matchingSymbol.children) {
                                const symbol = matchingSymbol;
                                info.location = new vscode.Location(resolvedUri, (0, range_1.collapseRangeToStart)(symbol.selectionRange));
                            }
                            else {
                                const symbol = matchingSymbol;
                                info.location = new vscode.Location(symbol.location.uri, (0, range_1.collapseRangeToStart)(symbol.location.range));
                            }
                        }
                    }
                    return info;
                }));
            }
            else {
                out.push('`' + symbolText + '`');
            }
            endLastMatch = match.index + match[0].length;
        }
        const suffix = text.slice(endLastMatch);
        if (suffix) {
            out.push(suffix);
        }
        return { parts: out };
    }
    async exists(uri) {
        try {
            await this.fileSystem.stat(uri);
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.SymbolLinkifier = SymbolLinkifier;
exports.SymbolLinkifier = SymbolLinkifier = __decorate([
    __param(0, fileSystemService_1.IFileSystemService),
    __param(1, workspaceService_1.IWorkspaceService)
], SymbolLinkifier);
//# sourceMappingURL=symbolLinkifier.js.map