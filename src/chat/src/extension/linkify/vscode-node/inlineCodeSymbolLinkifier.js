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
exports.InlineCodeSymbolLinkifier = exports.inlineCodeRegexp = void 0;
const vscode = __importStar(require("vscode"));
const range_1 = require("../../../util/common/range");
const errors_1 = require("../../../util/vs/base/common/errors");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const linkifiedText_1 = require("../common/linkifiedText");
const commands_1 = require("./commands");
const findWord_1 = require("./findWord");
exports.inlineCodeRegexp = /(?<!\[)`([^`\n]+)`(?!\])/g;
const maxPotentialWordMatches = 8;
/**
 * Linkifies symbol names that appear as inline code.
 */
let InlineCodeSymbolLinkifier = class InlineCodeSymbolLinkifier {
    constructor(instantiationService) {
        this.resolver = instantiationService.createInstance(findWord_1.ReferencesSymbolResolver, { symbolMatchesOnly: true, maxResultCount: maxPotentialWordMatches });
    }
    async linkify(text, context, token) {
        if (!context.references.length || vscode.version.startsWith('1.94')) {
            return;
        }
        const out = [];
        let endLastMatch = 0;
        for (const match of text.matchAll(exports.inlineCodeRegexp)) {
            const prefix = text.slice(endLastMatch, match.index);
            if (prefix) {
                out.push(prefix);
            }
            const symbolText = match[1];
            const loc = await this.tryResolveSymbol(symbolText, context, token);
            if (token.isCancellationRequested) {
                throw new errors_1.CancellationError();
            }
            if (loc?.length) {
                const info = {
                    name: symbolText,
                    containerName: '',
                    kind: vscode.SymbolKind.Variable,
                    location: loc[0]
                };
                out.push(new linkifiedText_1.LinkifySymbolAnchor(info, async (token) => {
                    const dest = await (0, commands_1.resolveSymbolFromReferences)(loc.map(loc => ({ uri: loc.uri, pos: loc.range.start })), symbolText, token);
                    if (dest) {
                        const selectionRange = dest.loc.targetSelectionRange ?? dest.loc.targetRange;
                        info.location = new vscode.Location(dest.loc.targetUri, (0, range_1.collapseRangeToStart)(selectionRange));
                        // TODO: Figure out how to get the actual symbol kind here and update it
                    }
                    return info;
                }));
            }
            else {
                out.push(match[0]);
            }
            endLastMatch = match.index + match[0].length;
        }
        const suffix = text.slice(endLastMatch);
        if (suffix) {
            out.push(suffix);
        }
        return { parts: out };
    }
    async tryResolveSymbol(symbolText, context, token) {
        if (/^https?:\/\//i.test(symbolText)) {
            return;
        }
        return this.resolver.resolve(symbolText, context.references, token);
    }
};
exports.InlineCodeSymbolLinkifier = InlineCodeSymbolLinkifier;
exports.InlineCodeSymbolLinkifier = InlineCodeSymbolLinkifier = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], InlineCodeSymbolLinkifier);
//# sourceMappingURL=inlineCodeSymbolLinkifier.js.map