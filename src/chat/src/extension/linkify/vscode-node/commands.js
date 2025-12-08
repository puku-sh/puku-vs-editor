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
exports.openSymbolFromReferencesCommand = void 0;
exports.registerLinkCommands = registerLinkCommands;
exports.resolveSymbolFromReferences = resolveSymbolFromReferences;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const l10n_1 = require("@vscode/l10n");
const vscode = __importStar(require("vscode"));
const range_1 = require("../../../util/common/range");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const commands_1 = require("../common/commands");
const findSymbol_1 = require("./findSymbol");
exports.openSymbolFromReferencesCommand = '_puku.openSymbolFromReferences';
function registerLinkCommands(telemetryService) {
    return (0, lifecycle_1.combinedDisposable)(vscode.commands.registerCommand(commands_1.openFileLinkCommand, async (...[path, requestId]) => {
        /* __GDPR__
            "panel.action.filelink" : {
                "owner": "digitarald",
                "comment": "Clicks on file links in the panel response",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id of the chat request." }
            }
        */
        telemetryService.sendMSFTTelemetryEvent('panel.action.filelink', {
            requestId
        });
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri;
        if (!workspaceRoot) {
            return;
        }
        const fileUri = typeof path === 'string' ? vscode.Uri.joinPath(workspaceRoot, path) : vscode.Uri.from(path);
        if (await isDirectory(fileUri)) {
            await vscode.commands.executeCommand('revealInExplorer', fileUri);
        }
        else {
            return vscode.commands.executeCommand('vscode.open', fileUri);
        }
        async function isDirectory(uri) {
            if (uri.path.endsWith('/')) {
                return true;
            }
            try {
                const stat = await vscode.workspace.fs.stat(uri);
                return stat.type === vscode.FileType.Directory;
            }
            catch {
                return false;
            }
        }
    }), 
    // Command used when we have a symbol name and file path but not a line number
    // This is currently used by the symbol for links such as: [`symbol`](file.ts)
    vscode.commands.registerCommand(commands_1.openSymbolInFileCommand, async (...[inFileUri, symbolText, requestId]) => {
        const fileUri = vscode.Uri.from(inFileUri);
        let symbols;
        try {
            symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', fileUri);
        }
        catch (e) {
            console.error(e);
        }
        if (symbols?.length) {
            const matchingSymbol = (0, findSymbol_1.findBestSymbolByPath)(symbols, symbolText);
            /* __GDPR__
                "panel.action.symbollink" : {
                    "owner": "digitarald",
                    "comment": "Clicks on symbol links in the panel response",
                    "hadMatch": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the symbol was found." },
                    "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id of the chat request." }
                }
            */
            telemetryService.sendMSFTTelemetryEvent('panel.action.symbollink', {
                requestId,
            }, {
                hadMatch: matchingSymbol ? 1 : 0
            });
            if (matchingSymbol) {
                const range = matchingSymbol instanceof vscode.SymbolInformation ? matchingSymbol.location.range : matchingSymbol.selectionRange;
                return vscode.commands.executeCommand('vscode.open', fileUri, {
                    selection: new vscode.Range(range.start, range.start), // Move cursor to the start of the symbol
                });
            }
        }
        return vscode.commands.executeCommand('vscode.open', fileUri);
    }), 
    // Command used when we have already resolved the link to a location.
    // This is currently used by the inline code linkifier for links such as `symbolName`
    vscode.commands.registerCommand(exports.openSymbolFromReferencesCommand, async (...[_word, locations, requestId]) => {
        const dest = await resolveSymbolFromReferences(locations, undefined, cancellation_1.CancellationToken.None);
        /* __GDPR__
            "panel.action.openSymbolFromReferencesLink" : {
                "owner": "mjbvz",
                "comment": "Clicks on symbol links in the panel response",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id of the chat request." },
                "resolvedDestinationType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "How the link was actually resolved." }
            }
        */
        telemetryService.sendMSFTTelemetryEvent('panel.action.openSymbolFromReferencesLink', {
            requestId,
            resolvedDestinationType: dest?.type ?? 'unresolved',
        });
        if (dest) {
            const selectionRange = dest.loc.targetSelectionRange ?? dest.loc.targetRange;
            return vscode.commands.executeCommand('vscode.open', dest.loc.targetUri, {
                selection: (0, range_1.collapseRangeToStart)(selectionRange),
            });
        }
        else {
            return vscode.window.showWarningMessage((0, l10n_1.t)('Could not resolve this symbol in the current workspace.'));
        }
    }));
}
function toLocationLink(def) {
    if ('uri' in def) {
        return { targetUri: def.uri, targetRange: def.range };
    }
    else {
        return def;
    }
}
function findSymbolByName(symbols, symbolName, maxDepth = 5) {
    for (const symbol of symbols) {
        if (symbol.name === symbolName) {
            return symbol;
        }
        // Check children if it's a DocumentSymbol and we haven't exceeded max depth
        if (maxDepth > 0 && 'children' in symbol && symbol.children) {
            const found = findSymbolByName(symbol.children, symbolName, maxDepth - 1);
            if (found) {
                return found;
            }
        }
    }
    return undefined;
}
async function resolveSymbolFromReferences(locations, symbolText, token) {
    let dest;
    // Extract the rightmost part from qualified symbol like "TextModel.undo()"
    const symbolParts = symbolText ? Array.from(symbolText.matchAll(/[#\w$][\w\d$]*/g), x => x[0]) : [];
    const targetSymbolName = symbolParts.length >= 2 ? symbolParts[symbolParts.length - 1] : undefined;
    // TODO: These locations may no longer be valid if the user has edited the file since the references were found.
    for (const loc of locations) {
        try {
            const def = (await vscode.commands.executeCommand('vscode.executeDefinitionProvider', vscode.Uri.from(loc.uri), loc.pos)).at(0);
            if (token.isCancellationRequested) {
                return;
            }
            if (def) {
                const defLoc = toLocationLink(def);
                // If we have a qualified name like "TextModel.undo()", try to find the specific symbol in the file
                if (targetSymbolName && symbolParts.length >= 2) {
                    try {
                        const symbols = await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', defLoc.targetUri);
                        if (symbols) {
                            // Search for the target symbol in the document symbols
                            const targetSymbol = findSymbolByName(symbols, targetSymbolName);
                            if (targetSymbol) {
                                let targetRange;
                                if ('selectionRange' in targetSymbol) {
                                    targetRange = targetSymbol.selectionRange;
                                }
                                else {
                                    targetRange = targetSymbol.location.range;
                                }
                                dest = {
                                    type: 'definition',
                                    loc: { targetUri: defLoc.targetUri, targetRange: targetRange, targetSelectionRange: targetRange },
                                };
                                break;
                            }
                        }
                    }
                    catch {
                        // Failed to find symbol, fall through to use the first definition
                    }
                }
                dest = {
                    type: 'definition',
                    loc: defLoc,
                };
                break;
            }
        }
        catch (e) {
            console.error(e);
        }
    }
    if (!dest) {
        const firstLoc = locations.at(0);
        if (firstLoc) {
            dest = {
                type: 'firstOccurrence',
                loc: { targetUri: vscode.Uri.from(firstLoc.uri), targetRange: new vscode.Range(firstLoc.pos, firstLoc.pos) }
            };
        }
    }
    return dest;
}
//# sourceMappingURL=commands.js.map