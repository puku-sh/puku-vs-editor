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
exports.ObservableTextEditor = exports.ObservableVsCode = void 0;
exports.rangeToOffsetRange = rangeToOffsetRange;
const vscode = __importStar(require("vscode"));
const observable_1 = require("../../../util/vs/base/common/observable");
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
class ObservableVsCode {
    constructor() {
        this._visibleTextEditors = (0, observable_1.observableFromEvent)(this, l => vscode.window.onDidChangeVisibleTextEditors(l), () => vscode.window.visibleTextEditors);
        this.visibleTextEditors = (0, observable_1.mapObservableArrayCached)(this, this._visibleTextEditors, e => new ObservableTextEditor(e));
        this._visibleTextEditorsMap = (0, observable_1.derived)(this, reader => new Map(this.visibleTextEditors.read(reader).map(v => [v.editor, v])));
        this._activeTextEditor = (0, observable_1.observableFromEvent)(this, l => vscode.window.onDidChangeActiveTextEditor(l), () => vscode.window.activeTextEditor);
        this.activeTextEditor = (0, observable_1.derived)(this, reader => {
            const editor = this._activeTextEditor.read(reader);
            if (!editor) {
                return undefined;
            }
            return this._visibleTextEditorsMap.read(reader).get(editor);
        });
    }
    static { this.instance = new ObservableVsCode(); }
}
exports.ObservableVsCode = ObservableVsCode;
class ObservableTextEditor {
    constructor(editor) {
        this.editor = editor;
        this.selection = (0, observable_1.observableFromEvent)(this, l => vscode.window.onDidChangeTextEditorSelection(l), () => this.editor.selections);
    }
}
exports.ObservableTextEditor = ObservableTextEditor;
function rangeToOffsetRange(range, document) {
    const start = document.offsetAt(range.start);
    const end = document.offsetAt(range.end);
    return new offsetRange_1.OffsetRange(start, end);
}
//# sourceMappingURL=utilsObservable.js.map