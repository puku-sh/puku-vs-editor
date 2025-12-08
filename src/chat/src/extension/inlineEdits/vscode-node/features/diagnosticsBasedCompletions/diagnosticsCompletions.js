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
exports.Diagnostic = exports.DiagnosticInlineEditRequestLogContext = exports.DiagnosticCompletionItem = void 0;
exports.log = log;
exports.logList = logList;
exports.isDiagnosticWithinDistance = isDiagnosticWithinDistance;
exports.sortDiagnosticsByDistance = sortDiagnosticsByDistance;
exports.distanceToClosestDiagnostic = distanceToClosestDiagnostic;
const vscode = __importStar(require("vscode"));
const rootedLineEdit_1 = require("../../../../../platform/inlineEdits/common/dataTypes/rootedLineEdit");
const arrays_1 = require("../../../../../util/common/arrays");
const errors = __importStar(require("../../../../../util/common/errors"));
const lineEdit_1 = require("../../../../../util/vs/editor/common/core/edits/lineEdit");
const stringEdit_1 = require("../../../../../util/vs/editor/common/core/edits/stringEdit");
const textEdit_1 = require("../../../../../util/vs/editor/common/core/edits/textEdit");
const range_1 = require("../../../../../util/vs/editor/common/core/range");
const translations_1 = require("../../utils/translations");
class DiagnosticCompletionItem {
    static equals(a, b) {
        return a.documentId.toString() === b.documentId.toString() &&
            range_1.Range.equalsRange((0, translations_1.toInternalRange)(a.range), (0, translations_1.toInternalRange)(b.range)) &&
            a.insertText === b.insertText &&
            a.type === b.type &&
            a.isInlineEdit === b.isInlineEdit &&
            a.showInlineEditMenu === b.showInlineEditMenu &&
            displayLocationEquals(a.nextEditDisplayLocation, b.nextEditDisplayLocation);
    }
    get range() {
        if (!this._range) {
            this._range = (0, translations_1.toExternalRange)(this._edit.range);
        }
        return this._range;
    }
    get insertText() {
        return this._edit.text;
    }
    get nextEditDisplayLocation() {
        return this._getDisplayLocation();
    }
    get displayLocation() {
        const displayLocation = this.nextEditDisplayLocation;
        return displayLocation ? {
            range: (0, translations_1.toExternalRange)(displayLocation.range),
            label: displayLocation.label,
            kind: vscode.InlineCompletionDisplayLocationKind.Code
        } : undefined;
    }
    get documentId() {
        return this._workspaceDocument.id;
    }
    constructor(type, diagnostic, _edit, _workspaceDocument) {
        this.type = type;
        this.diagnostic = diagnostic;
        this._edit = _edit;
        this._workspaceDocument = _workspaceDocument;
        this.isInlineEdit = true;
        this.showInlineEditMenu = true;
    }
    toOffsetEdit() {
        return stringEdit_1.StringReplacement.replace(this._toOffsetRange(this._edit.range), this._edit.text);
    }
    toTextEdit() {
        return new textEdit_1.TextEdit([this._edit]);
    }
    toLineEdit() {
        return lineEdit_1.LineEdit.fromTextEdit(this.toTextEdit(), this._workspaceDocument.value.get());
    }
    getDiagnosticOffsetRange() {
        return this.diagnostic.range;
    }
    getRootedLineEdit() {
        return new rootedLineEdit_1.RootedLineEdit(this._workspaceDocument.value.get(), this.toLineEdit());
    }
    _toOffsetRange(range) {
        const transformer = this._workspaceDocument.value.get().getTransformer();
        return transformer.getOffsetRange(range);
    }
    // TODO: rethink if this needs to be updatable
    _getDisplayLocation() {
        return undefined;
    }
}
exports.DiagnosticCompletionItem = DiagnosticCompletionItem;
function displayLocationEquals(a, b) {
    return a === b || (a !== undefined && b !== undefined && a.label === b.label && range_1.Range.equalsRange(a.range, b.range));
}
// TODO: Better incorporate diagnostics logging
class DiagnosticInlineEditRequestLogContext {
    constructor() {
        this._logs = [];
        this._markedToBeLogged = false;
        this._error = undefined;
    }
    getLogs() {
        if (!this._markedToBeLogged) {
            return [];
        }
        const lines = [];
        if (this._error) {
            lines.push(`## Diagnostics Error`);
            lines.push("```");
            lines.push(errors.toString(errors.fromUnknown(this._error)));
            lines.push("```");
        }
        if (this._logs.length > 0) {
            lines.push(`## Diagnostics Logs`);
            lines.push(...this._logs);
        }
        return lines;
    }
    addLog(content) {
        this._logs.push(content.replace('\n', '\\n').replace('\t', '\\t').replace('`', '\`') + '\n');
    }
    markToBeLogged() {
        this._markedToBeLogged = true;
    }
    setError(e) {
        this._markedToBeLogged = true;
        this._error = e;
    }
}
exports.DiagnosticInlineEditRequestLogContext = DiagnosticInlineEditRequestLogContext;
class Diagnostic {
    static equals(a, b) {
        return a.equals(b);
    }
    get range() {
        return this._updatedRange;
    }
    isValid() {
        return this._isValid;
    }
    get message() {
        return this.data.message;
    }
    constructor(data) {
        this.data = data;
        this._isValid = true;
        this._updatedRange = data.range;
    }
    equals(other) {
        return this.data.equals(other.data)
            && this._updatedRange.equals(other.range)
            && this._isValid === other._isValid;
    }
    toString() {
        if (this.data.range !== this._updatedRange) {
            return `\`${this.data.toString()}\` (currently at \`${this._updatedRange.toString()}\`)`;
        }
        return `\`${this.data.toString()}\``;
    }
    updateRange(range) {
        this._updatedRange = range;
    }
    invalidate() {
        this._isValid = false;
    }
}
exports.Diagnostic = Diagnostic;
function log(message, logContext, tracer) {
    if (logContext) {
        const lines = message.split('\n');
        lines.forEach(line => logContext.addLog(line));
    }
    if (tracer) {
        tracer.trace(message);
    }
}
function logList(title, list, logContext, tracer) {
    const content = `${title}${list.map(item => `\n- ${typeof item === 'string' ? item : item.toString()}`).join('')}`;
    log(content, logContext, tracer);
}
// TODO: there must be a utility for this somewhere? Otherwise make them available
function diagnosticDistanceToPosition(workspaceDocument, diagnostic, position) {
    function positionDistance(a, b) {
        return { lineDelta: Math.abs(a.lineNumber - b.lineNumber), characterDelta: Math.abs(a.column - b.column) };
    }
    const range = workspaceDocument.value.get().getTransformer().getRange(diagnostic.range);
    const a = positionDistance(range.getStartPosition(), position);
    const b = positionDistance(range.getEndPosition(), position);
    if (a.lineDelta === b.lineDelta) {
        return a.characterDelta < b.characterDelta ? a : b;
    }
    return a.lineDelta < b.lineDelta ? a : b;
}
function isDiagnosticWithinDistance(workspaceDocument, diagnostic, position, maxLineDistance) {
    return diagnosticDistanceToPosition(workspaceDocument, diagnostic, position).lineDelta <= maxLineDistance;
}
function sortDiagnosticsByDistance(workspaceDocument, diagnostics, position) {
    const transformer = workspaceDocument.value.get().getTransformer();
    return diagnostics.sort((a, b) => {
        const aDistance = diagnosticDistanceToPosition(workspaceDocument, a, position);
        const bDistance = diagnosticDistanceToPosition(workspaceDocument, b, position);
        if (aDistance.lineDelta !== bDistance.lineDelta) {
            return aDistance.lineDelta - bDistance.lineDelta;
        }
        const aPosition = transformer.getPosition(a.range.start);
        const bPosition = transformer.getPosition(b.range.start);
        if (aPosition.lineNumber !== bPosition.lineNumber) {
            return aDistance.characterDelta - bDistance.characterDelta;
        }
        if (aDistance.lineDelta < 2) {
            return aDistance.characterDelta - bDistance.characterDelta;
        }
        // If both diagnostics are on the same line and are more than 1 line away from the cursor
        // always prefer the first diagnostic to minimize recomputation and flickering on cursor move
        return -1;
    });
}
function distanceToClosestDiagnostic(workspaceDocument, diagnostics, position) {
    if (diagnostics.length === 0) {
        return undefined;
    }
    const distances = diagnostics.map(diagnostic => diagnosticDistanceToPosition(workspaceDocument, diagnostic, position).lineDelta);
    return (0, arrays_1.min)(distances);
}
//# sourceMappingURL=diagnosticsCompletions.js.map