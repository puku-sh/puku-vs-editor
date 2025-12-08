"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SymbolKinds = exports.ScopeSelectorImpl = void 0;
const vscode_1 = require("vscode");
const codicons_1 = require("../../../util/vs/base/common/codicons");
const errors_1 = require("../../../util/vs/base/common/errors");
const symbolInformation_1 = require("../../../util/vs/workbench/api/common/extHostTypes/symbolInformation");
const dialogService_1 = require("../../dialog/common/dialogService");
const textDocumentSnapshot_1 = require("../../editing/common/textDocumentSnapshot");
const languageFeaturesService_1 = require("../../languages/common/languageFeaturesService");
const parserService_1 = require("../../parser/node/parserService");
let ScopeSelectorImpl = class ScopeSelectorImpl {
    constructor(parserService, languageFeaturesService, dialogService) {
        this.parserService = parserService;
        this.languageFeaturesService = languageFeaturesService;
        this.dialogService = dialogService;
    }
    async findEnclosingBlocks(document, range) {
        const treeSitterAST = this.parserService.getTreeSitterAST(document);
        if (treeSitterAST === undefined) {
            return undefined;
        }
        const treeSitterOffsetRange = (0, parserService_1.vscodeToTreeSitterOffsetRange)(range, document);
        const fineScopes = await treeSitterAST.getFineScopes(treeSitterOffsetRange);
        return fineScopes?.map((scope) => {
            const range = (0, parserService_1.treeSitterOffsetRangeToVSCodeRange)(document, scope);
            return { kind: 'code', name: document.lineAt(range.start).text.trim(), range };
        });
    }
    findEnclosingSymbols(rootSymbols, position) {
        for (const symbol of rootSymbols) {
            if (symbol.range.contains(position)) {
                const enclosingChild = this.findEnclosingSymbols(symbol.children, position);
                if (enclosingChild) {
                    return [symbol, ...enclosingChild];
                }
                else {
                    return [symbol];
                }
            }
        }
        return undefined;
    }
    async selectEnclosingScope(editor, options) {
        const result = await this.languageFeaturesService.getDocumentSymbols(editor.document.uri);
        if (!result) {
            return undefined;
        }
        // check that the returned result is a DocumentSymbol[] and not a SymbolInformation[]
        if (result.length > 0 && !result[0].hasOwnProperty('children')) {
            return undefined;
        }
        const initialSelection = editor.selection;
        if (!initialSelection.isEmpty) {
            return undefined;
        }
        let enclosingSymbols = this.findEnclosingSymbols(result, editor.selection.active);
        if (options?.includeBlocks) {
            // Add fine block scopes
            enclosingSymbols?.push(...(await this.findEnclosingBlocks(textDocumentSnapshot_1.TextDocumentSnapshot.create(editor.document), editor.selection) ?? []));
        }
        // If the cursor is in a position where there are no enclosing symbols or blocks, list all document symbols as options
        if (!enclosingSymbols) {
            enclosingSymbols = result;
        }
        if (enclosingSymbols?.length === 1) {
            const symbol = enclosingSymbols[0];
            editor.selection = new vscode_1.Selection(symbol.range.start, symbol.range.end);
        }
        else if (enclosingSymbols && enclosingSymbols.length > 1 || !enclosingSymbols && result.length > 1) {
            const quickPickItems = enclosingSymbols
                .sort((a, b) => b.range.start.line - a.range.start.line) // Sort the enclosing selections by start position
                .map(symbol => ({ label: `$(${symbol.kind === 'code' ? 'code' : SymbolKinds.toIcon(symbol.kind).id}) ${symbol.name}`, description: `:${symbol.range.start.line + 1}-${symbol.range.end.line + 1}`, symbol }));
            const pickedItem = await this.dialogService.showQuickPick(quickPickItems, {
                placeHolder: options?.reason ?? vscode_1.l10n.t('Select an enclosing range'),
                onDidSelectItem(item) {
                    const symbol = item.symbol;
                    if (symbol) {
                        editor.selection = new vscode_1.Selection(symbol.range.start, symbol.range.end);
                        editor.revealRange(symbol.range);
                    }
                },
            });
            if (!pickedItem) {
                editor.selection = initialSelection;
                throw new errors_1.CancellationError();
            }
        }
        return editor.selection;
    }
};
exports.ScopeSelectorImpl = ScopeSelectorImpl;
exports.ScopeSelectorImpl = ScopeSelectorImpl = __decorate([
    __param(0, parserService_1.IParserService),
    __param(1, languageFeaturesService_1.ILanguageFeaturesService),
    __param(2, dialogService_1.IDialogService)
], ScopeSelectorImpl);
var SymbolKinds;
(function (SymbolKinds) {
    const byKind = new Map();
    byKind.set(symbolInformation_1.SymbolKind.File, codicons_1.Codicon.symbolFile);
    byKind.set(symbolInformation_1.SymbolKind.Module, codicons_1.Codicon.symbolModule);
    byKind.set(symbolInformation_1.SymbolKind.Namespace, codicons_1.Codicon.symbolNamespace);
    byKind.set(symbolInformation_1.SymbolKind.Package, codicons_1.Codicon.symbolPackage);
    byKind.set(symbolInformation_1.SymbolKind.Class, codicons_1.Codicon.symbolClass);
    byKind.set(symbolInformation_1.SymbolKind.Method, codicons_1.Codicon.symbolMethod);
    byKind.set(symbolInformation_1.SymbolKind.Property, codicons_1.Codicon.symbolProperty);
    byKind.set(symbolInformation_1.SymbolKind.Field, codicons_1.Codicon.symbolField);
    byKind.set(symbolInformation_1.SymbolKind.Constructor, codicons_1.Codicon.symbolConstructor);
    byKind.set(symbolInformation_1.SymbolKind.Enum, codicons_1.Codicon.symbolEnum);
    byKind.set(symbolInformation_1.SymbolKind.Interface, codicons_1.Codicon.symbolInterface);
    byKind.set(symbolInformation_1.SymbolKind.Function, codicons_1.Codicon.symbolFunction);
    byKind.set(symbolInformation_1.SymbolKind.Variable, codicons_1.Codicon.symbolVariable);
    byKind.set(symbolInformation_1.SymbolKind.Constant, codicons_1.Codicon.symbolConstant);
    byKind.set(symbolInformation_1.SymbolKind.String, codicons_1.Codicon.symbolString);
    byKind.set(symbolInformation_1.SymbolKind.Number, codicons_1.Codicon.symbolNumber);
    byKind.set(symbolInformation_1.SymbolKind.Boolean, codicons_1.Codicon.symbolBoolean);
    byKind.set(symbolInformation_1.SymbolKind.Array, codicons_1.Codicon.symbolArray);
    byKind.set(symbolInformation_1.SymbolKind.Object, codicons_1.Codicon.symbolObject);
    byKind.set(symbolInformation_1.SymbolKind.Key, codicons_1.Codicon.symbolKey);
    byKind.set(symbolInformation_1.SymbolKind.Null, codicons_1.Codicon.symbolNull);
    byKind.set(symbolInformation_1.SymbolKind.EnumMember, codicons_1.Codicon.symbolEnumMember);
    byKind.set(symbolInformation_1.SymbolKind.Struct, codicons_1.Codicon.symbolStruct);
    byKind.set(symbolInformation_1.SymbolKind.Event, codicons_1.Codicon.symbolEvent);
    byKind.set(symbolInformation_1.SymbolKind.Operator, codicons_1.Codicon.symbolOperator);
    byKind.set(symbolInformation_1.SymbolKind.TypeParameter, codicons_1.Codicon.symbolTypeParameter);
    function toIcon(kind) {
        let icon = byKind.get(kind);
        if (!icon) {
            console.info('No codicon found for SymbolKind ' + kind);
            icon = codicons_1.Codicon.symbolProperty;
        }
        return icon;
    }
    SymbolKinds.toIcon = toIcon;
})(SymbolKinds || (exports.SymbolKinds = SymbolKinds = {}));
//# sourceMappingURL=scopeSelectionImpl.js.map