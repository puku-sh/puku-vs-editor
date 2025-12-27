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
var Disposable_1, DocumentSymbol_1, TaskGroup_1, Task_1, TreeItem_1, FileSystemError_1, TestMessage_1;
import { asArray } from '../../../base/common/arrays.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { illegalArgument } from '../../../base/common/errors.js';
import { Mimes } from '../../../base/common/mime.js';
import { nextCharLength } from '../../../base/common/strings.js';
import { isNumber, isObject, isString, isStringArray } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { FileSystemProviderErrorCode, markAsFileSystemProviderError } from '../../../platform/files/common/files.js';
import { RemoteAuthorityResolverErrorCode } from '../../../platform/remote/common/remoteAuthorityResolver.js';
import { es5ClassCompat } from './extHostTypes/es5ClassCompat.js';
import { MarkdownString } from './extHostTypes/markdownString.js';
import { Range } from './extHostTypes/range.js';
export { CodeActionKind } from './extHostTypes/codeActionKind.js';
export { Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, DiagnosticTag } from './extHostTypes/diagnostic.js';
export { Location } from './extHostTypes/location.js';
export { MarkdownString } from './extHostTypes/markdownString.js';
export { NotebookCellData, NotebookCellKind, NotebookCellOutput, NotebookCellOutputItem, NotebookData, NotebookEdit, NotebookRange } from './extHostTypes/notebooks.js';
export { Position } from './extHostTypes/position.js';
export { Range } from './extHostTypes/range.js';
export { Selection } from './extHostTypes/selection.js';
export { SnippetString } from './extHostTypes/snippetString.js';
export { SnippetTextEdit } from './extHostTypes/snippetTextEdit.js';
export { SymbolInformation, SymbolKind, SymbolTag } from './extHostTypes/symbolInformation.js';
export { EndOfLine, TextEdit } from './extHostTypes/textEdit.js';
export { FileEditType, WorkspaceEdit } from './extHostTypes/workspaceEdit.js';
export var TerminalOutputAnchor;
(function (TerminalOutputAnchor) {
    TerminalOutputAnchor[TerminalOutputAnchor["Top"] = 0] = "Top";
    TerminalOutputAnchor[TerminalOutputAnchor["Bottom"] = 1] = "Bottom";
})(TerminalOutputAnchor || (TerminalOutputAnchor = {}));
export var TerminalQuickFixType;
(function (TerminalQuickFixType) {
    TerminalQuickFixType[TerminalQuickFixType["TerminalCommand"] = 0] = "TerminalCommand";
    TerminalQuickFixType[TerminalQuickFixType["Opener"] = 1] = "Opener";
    TerminalQuickFixType[TerminalQuickFixType["Command"] = 3] = "Command";
})(TerminalQuickFixType || (TerminalQuickFixType = {}));
let Disposable = Disposable_1 = class Disposable {
    static from(...inDisposables) {
        let disposables = inDisposables;
        return new Disposable_1(function () {
            if (disposables) {
                for (const disposable of disposables) {
                    if (disposable && typeof disposable.dispose === 'function') {
                        disposable.dispose();
                    }
                }
                disposables = undefined;
            }
        });
    }
    #callOnDispose;
    constructor(callOnDispose) {
        this.#callOnDispose = callOnDispose;
    }
    dispose() {
        if (typeof this.#callOnDispose === 'function') {
            this.#callOnDispose();
            this.#callOnDispose = undefined;
        }
    }
};
Disposable = Disposable_1 = __decorate([
    es5ClassCompat
], Disposable);
export { Disposable };
const validateConnectionToken = (connectionToken) => {
    if (typeof connectionToken !== 'string' || connectionToken.length === 0 || !/^[0-9A-Za-z_\-]+$/.test(connectionToken)) {
        throw illegalArgument('connectionToken');
    }
};
export class ResolvedAuthority {
    static isResolvedAuthority(resolvedAuthority) {
        return resolvedAuthority
            && typeof resolvedAuthority === 'object'
            && typeof resolvedAuthority.host === 'string'
            && typeof resolvedAuthority.port === 'number'
            && (resolvedAuthority.connectionToken === undefined || typeof resolvedAuthority.connectionToken === 'string');
    }
    constructor(host, port, connectionToken) {
        if (typeof host !== 'string' || host.length === 0) {
            throw illegalArgument('host');
        }
        if (typeof port !== 'number' || port === 0 || Math.round(port) !== port) {
            throw illegalArgument('port');
        }
        if (typeof connectionToken !== 'undefined') {
            validateConnectionToken(connectionToken);
        }
        this.host = host;
        this.port = Math.round(port);
        this.connectionToken = connectionToken;
    }
}
export class ManagedResolvedAuthority {
    static isManagedResolvedAuthority(resolvedAuthority) {
        return resolvedAuthority
            && typeof resolvedAuthority === 'object'
            && typeof resolvedAuthority.makeConnection === 'function'
            && (resolvedAuthority.connectionToken === undefined || typeof resolvedAuthority.connectionToken === 'string');
    }
    constructor(makeConnection, connectionToken) {
        this.makeConnection = makeConnection;
        this.connectionToken = connectionToken;
        if (typeof connectionToken !== 'undefined') {
            validateConnectionToken(connectionToken);
        }
    }
}
export class RemoteAuthorityResolverError extends Error {
    static NotAvailable(message, handled) {
        return new RemoteAuthorityResolverError(message, RemoteAuthorityResolverErrorCode.NotAvailable, handled);
    }
    static TemporarilyNotAvailable(message) {
        return new RemoteAuthorityResolverError(message, RemoteAuthorityResolverErrorCode.TemporarilyNotAvailable);
    }
    constructor(message, code = RemoteAuthorityResolverErrorCode.Unknown, detail) {
        super(message);
        this._message = message;
        this._code = code;
        this._detail = detail;
        // workaround when extending builtin objects and when compiling to ES5, see:
        // https://github.com/microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, RemoteAuthorityResolverError.prototype);
    }
}
export var EnvironmentVariableMutatorType;
(function (EnvironmentVariableMutatorType) {
    EnvironmentVariableMutatorType[EnvironmentVariableMutatorType["Replace"] = 1] = "Replace";
    EnvironmentVariableMutatorType[EnvironmentVariableMutatorType["Append"] = 2] = "Append";
    EnvironmentVariableMutatorType[EnvironmentVariableMutatorType["Prepend"] = 3] = "Prepend";
})(EnvironmentVariableMutatorType || (EnvironmentVariableMutatorType = {}));
let Hover = class Hover {
    constructor(contents, range) {
        if (!contents) {
            throw new Error('Illegal argument, contents must be defined');
        }
        if (Array.isArray(contents)) {
            this.contents = contents;
        }
        else {
            this.contents = [contents];
        }
        this.range = range;
    }
};
Hover = __decorate([
    es5ClassCompat
], Hover);
export { Hover };
let VerboseHover = class VerboseHover extends Hover {
    constructor(contents, range, canIncreaseVerbosity, canDecreaseVerbosity) {
        super(contents, range);
        this.canIncreaseVerbosity = canIncreaseVerbosity;
        this.canDecreaseVerbosity = canDecreaseVerbosity;
    }
};
VerboseHover = __decorate([
    es5ClassCompat
], VerboseHover);
export { VerboseHover };
export var HoverVerbosityAction;
(function (HoverVerbosityAction) {
    HoverVerbosityAction[HoverVerbosityAction["Increase"] = 0] = "Increase";
    HoverVerbosityAction[HoverVerbosityAction["Decrease"] = 1] = "Decrease";
})(HoverVerbosityAction || (HoverVerbosityAction = {}));
export var DocumentHighlightKind;
(function (DocumentHighlightKind) {
    DocumentHighlightKind[DocumentHighlightKind["Text"] = 0] = "Text";
    DocumentHighlightKind[DocumentHighlightKind["Read"] = 1] = "Read";
    DocumentHighlightKind[DocumentHighlightKind["Write"] = 2] = "Write";
})(DocumentHighlightKind || (DocumentHighlightKind = {}));
let DocumentHighlight = class DocumentHighlight {
    constructor(range, kind = DocumentHighlightKind.Text) {
        this.range = range;
        this.kind = kind;
    }
    toJSON() {
        return {
            range: this.range,
            kind: DocumentHighlightKind[this.kind]
        };
    }
};
DocumentHighlight = __decorate([
    es5ClassCompat
], DocumentHighlight);
export { DocumentHighlight };
let MultiDocumentHighlight = class MultiDocumentHighlight {
    constructor(uri, highlights) {
        this.uri = uri;
        this.highlights = highlights;
    }
    toJSON() {
        return {
            uri: this.uri,
            highlights: this.highlights.map(h => h.toJSON())
        };
    }
};
MultiDocumentHighlight = __decorate([
    es5ClassCompat
], MultiDocumentHighlight);
export { MultiDocumentHighlight };
let DocumentSymbol = DocumentSymbol_1 = class DocumentSymbol {
    static validate(candidate) {
        if (!candidate.name) {
            throw new Error('name must not be falsy');
        }
        if (!candidate.range.contains(candidate.selectionRange)) {
            throw new Error('selectionRange must be contained in fullRange');
        }
        candidate.children?.forEach(DocumentSymbol_1.validate);
    }
    constructor(name, detail, kind, range, selectionRange) {
        this.name = name;
        this.detail = detail;
        this.kind = kind;
        this.range = range;
        this.selectionRange = selectionRange;
        this.children = [];
        DocumentSymbol_1.validate(this);
    }
};
DocumentSymbol = DocumentSymbol_1 = __decorate([
    es5ClassCompat
], DocumentSymbol);
export { DocumentSymbol };
export var CodeActionTriggerKind;
(function (CodeActionTriggerKind) {
    CodeActionTriggerKind[CodeActionTriggerKind["Invoke"] = 1] = "Invoke";
    CodeActionTriggerKind[CodeActionTriggerKind["Automatic"] = 2] = "Automatic";
})(CodeActionTriggerKind || (CodeActionTriggerKind = {}));
let CodeAction = class CodeAction {
    constructor(title, kind) {
        this.title = title;
        this.kind = kind;
    }
};
CodeAction = __decorate([
    es5ClassCompat
], CodeAction);
export { CodeAction };
let SelectionRange = class SelectionRange {
    constructor(range, parent) {
        this.range = range;
        this.parent = parent;
        if (parent && !parent.range.contains(this.range)) {
            throw new Error('Invalid argument: parent must contain this range');
        }
    }
};
SelectionRange = __decorate([
    es5ClassCompat
], SelectionRange);
export { SelectionRange };
export class CallHierarchyItem {
    constructor(kind, name, detail, uri, range, selectionRange) {
        this.kind = kind;
        this.name = name;
        this.detail = detail;
        this.uri = uri;
        this.range = range;
        this.selectionRange = selectionRange;
    }
}
export class CallHierarchyIncomingCall {
    constructor(item, fromRanges) {
        this.fromRanges = fromRanges;
        this.from = item;
    }
}
export class CallHierarchyOutgoingCall {
    constructor(item, fromRanges) {
        this.fromRanges = fromRanges;
        this.to = item;
    }
}
export var LanguageStatusSeverity;
(function (LanguageStatusSeverity) {
    LanguageStatusSeverity[LanguageStatusSeverity["Information"] = 0] = "Information";
    LanguageStatusSeverity[LanguageStatusSeverity["Warning"] = 1] = "Warning";
    LanguageStatusSeverity[LanguageStatusSeverity["Error"] = 2] = "Error";
})(LanguageStatusSeverity || (LanguageStatusSeverity = {}));
let CodeLens = class CodeLens {
    constructor(range, command) {
        this.range = range;
        this.command = command;
    }
    get isResolved() {
        return !!this.command;
    }
};
CodeLens = __decorate([
    es5ClassCompat
], CodeLens);
export { CodeLens };
let ParameterInformation = class ParameterInformation {
    constructor(label, documentation) {
        this.label = label;
        this.documentation = documentation;
    }
};
ParameterInformation = __decorate([
    es5ClassCompat
], ParameterInformation);
export { ParameterInformation };
let SignatureInformation = class SignatureInformation {
    constructor(label, documentation) {
        this.label = label;
        this.documentation = documentation;
        this.parameters = [];
    }
};
SignatureInformation = __decorate([
    es5ClassCompat
], SignatureInformation);
export { SignatureInformation };
let SignatureHelp = class SignatureHelp {
    constructor() {
        this.activeSignature = 0;
        this.activeParameter = 0;
        this.signatures = [];
    }
};
SignatureHelp = __decorate([
    es5ClassCompat
], SignatureHelp);
export { SignatureHelp };
export var SignatureHelpTriggerKind;
(function (SignatureHelpTriggerKind) {
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["Invoke"] = 1] = "Invoke";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["TriggerCharacter"] = 2] = "TriggerCharacter";
    SignatureHelpTriggerKind[SignatureHelpTriggerKind["ContentChange"] = 3] = "ContentChange";
})(SignatureHelpTriggerKind || (SignatureHelpTriggerKind = {}));
export var InlayHintKind;
(function (InlayHintKind) {
    InlayHintKind[InlayHintKind["Type"] = 1] = "Type";
    InlayHintKind[InlayHintKind["Parameter"] = 2] = "Parameter";
})(InlayHintKind || (InlayHintKind = {}));
let InlayHintLabelPart = class InlayHintLabelPart {
    constructor(value) {
        this.value = value;
    }
};
InlayHintLabelPart = __decorate([
    es5ClassCompat
], InlayHintLabelPart);
export { InlayHintLabelPart };
let InlayHint = class InlayHint {
    constructor(position, label, kind) {
        this.position = position;
        this.label = label;
        this.kind = kind;
    }
};
InlayHint = __decorate([
    es5ClassCompat
], InlayHint);
export { InlayHint };
export var CompletionTriggerKind;
(function (CompletionTriggerKind) {
    CompletionTriggerKind[CompletionTriggerKind["Invoke"] = 0] = "Invoke";
    CompletionTriggerKind[CompletionTriggerKind["TriggerCharacter"] = 1] = "TriggerCharacter";
    CompletionTriggerKind[CompletionTriggerKind["TriggerForIncompleteCompletions"] = 2] = "TriggerForIncompleteCompletions";
})(CompletionTriggerKind || (CompletionTriggerKind = {}));
export var CompletionItemKind;
(function (CompletionItemKind) {
    CompletionItemKind[CompletionItemKind["Text"] = 0] = "Text";
    CompletionItemKind[CompletionItemKind["Method"] = 1] = "Method";
    CompletionItemKind[CompletionItemKind["Function"] = 2] = "Function";
    CompletionItemKind[CompletionItemKind["Constructor"] = 3] = "Constructor";
    CompletionItemKind[CompletionItemKind["Field"] = 4] = "Field";
    CompletionItemKind[CompletionItemKind["Variable"] = 5] = "Variable";
    CompletionItemKind[CompletionItemKind["Class"] = 6] = "Class";
    CompletionItemKind[CompletionItemKind["Interface"] = 7] = "Interface";
    CompletionItemKind[CompletionItemKind["Module"] = 8] = "Module";
    CompletionItemKind[CompletionItemKind["Property"] = 9] = "Property";
    CompletionItemKind[CompletionItemKind["Unit"] = 10] = "Unit";
    CompletionItemKind[CompletionItemKind["Value"] = 11] = "Value";
    CompletionItemKind[CompletionItemKind["Enum"] = 12] = "Enum";
    CompletionItemKind[CompletionItemKind["Keyword"] = 13] = "Keyword";
    CompletionItemKind[CompletionItemKind["Snippet"] = 14] = "Snippet";
    CompletionItemKind[CompletionItemKind["Color"] = 15] = "Color";
    CompletionItemKind[CompletionItemKind["File"] = 16] = "File";
    CompletionItemKind[CompletionItemKind["Reference"] = 17] = "Reference";
    CompletionItemKind[CompletionItemKind["Folder"] = 18] = "Folder";
    CompletionItemKind[CompletionItemKind["EnumMember"] = 19] = "EnumMember";
    CompletionItemKind[CompletionItemKind["Constant"] = 20] = "Constant";
    CompletionItemKind[CompletionItemKind["Struct"] = 21] = "Struct";
    CompletionItemKind[CompletionItemKind["Event"] = 22] = "Event";
    CompletionItemKind[CompletionItemKind["Operator"] = 23] = "Operator";
    CompletionItemKind[CompletionItemKind["TypeParameter"] = 24] = "TypeParameter";
    CompletionItemKind[CompletionItemKind["User"] = 25] = "User";
    CompletionItemKind[CompletionItemKind["Issue"] = 26] = "Issue";
})(CompletionItemKind || (CompletionItemKind = {}));
export var CompletionItemTag;
(function (CompletionItemTag) {
    CompletionItemTag[CompletionItemTag["Deprecated"] = 1] = "Deprecated";
})(CompletionItemTag || (CompletionItemTag = {}));
let CompletionItem = class CompletionItem {
    constructor(label, kind) {
        this.label = label;
        this.kind = kind;
    }
    toJSON() {
        return {
            label: this.label,
            kind: this.kind && CompletionItemKind[this.kind],
            detail: this.detail,
            documentation: this.documentation,
            sortText: this.sortText,
            filterText: this.filterText,
            preselect: this.preselect,
            insertText: this.insertText,
            textEdit: this.textEdit
        };
    }
};
CompletionItem = __decorate([
    es5ClassCompat
], CompletionItem);
export { CompletionItem };
let CompletionList = class CompletionList {
    constructor(items = [], isIncomplete = false) {
        this.items = items;
        this.isIncomplete = isIncomplete;
    }
};
CompletionList = __decorate([
    es5ClassCompat
], CompletionList);
export { CompletionList };
let InlineSuggestion = class InlineSuggestion {
    constructor(insertText, range, command) {
        this.insertText = insertText;
        this.range = range;
        this.command = command;
    }
};
InlineSuggestion = __decorate([
    es5ClassCompat
], InlineSuggestion);
export { InlineSuggestion };
let InlineSuggestionList = class InlineSuggestionList {
    constructor(items) {
        this.commands = undefined;
        this.suppressSuggestions = undefined;
        this.items = items;
    }
};
InlineSuggestionList = __decorate([
    es5ClassCompat
], InlineSuggestionList);
export { InlineSuggestionList };
export var PartialAcceptTriggerKind;
(function (PartialAcceptTriggerKind) {
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Unknown"] = 0] = "Unknown";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Word"] = 1] = "Word";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Line"] = 2] = "Line";
    PartialAcceptTriggerKind[PartialAcceptTriggerKind["Suggest"] = 3] = "Suggest";
})(PartialAcceptTriggerKind || (PartialAcceptTriggerKind = {}));
export var InlineCompletionEndOfLifeReasonKind;
(function (InlineCompletionEndOfLifeReasonKind) {
    InlineCompletionEndOfLifeReasonKind[InlineCompletionEndOfLifeReasonKind["Accepted"] = 0] = "Accepted";
    InlineCompletionEndOfLifeReasonKind[InlineCompletionEndOfLifeReasonKind["Rejected"] = 1] = "Rejected";
    InlineCompletionEndOfLifeReasonKind[InlineCompletionEndOfLifeReasonKind["Ignored"] = 2] = "Ignored";
})(InlineCompletionEndOfLifeReasonKind || (InlineCompletionEndOfLifeReasonKind = {}));
export var InlineCompletionDisplayLocationKind;
(function (InlineCompletionDisplayLocationKind) {
    InlineCompletionDisplayLocationKind[InlineCompletionDisplayLocationKind["Code"] = 1] = "Code";
    InlineCompletionDisplayLocationKind[InlineCompletionDisplayLocationKind["Label"] = 2] = "Label";
})(InlineCompletionDisplayLocationKind || (InlineCompletionDisplayLocationKind = {}));
export var ViewColumn;
(function (ViewColumn) {
    ViewColumn[ViewColumn["Active"] = -1] = "Active";
    ViewColumn[ViewColumn["Beside"] = -2] = "Beside";
    ViewColumn[ViewColumn["One"] = 1] = "One";
    ViewColumn[ViewColumn["Two"] = 2] = "Two";
    ViewColumn[ViewColumn["Three"] = 3] = "Three";
    ViewColumn[ViewColumn["Four"] = 4] = "Four";
    ViewColumn[ViewColumn["Five"] = 5] = "Five";
    ViewColumn[ViewColumn["Six"] = 6] = "Six";
    ViewColumn[ViewColumn["Seven"] = 7] = "Seven";
    ViewColumn[ViewColumn["Eight"] = 8] = "Eight";
    ViewColumn[ViewColumn["Nine"] = 9] = "Nine";
})(ViewColumn || (ViewColumn = {}));
export var StatusBarAlignment;
(function (StatusBarAlignment) {
    StatusBarAlignment[StatusBarAlignment["Left"] = 1] = "Left";
    StatusBarAlignment[StatusBarAlignment["Right"] = 2] = "Right";
})(StatusBarAlignment || (StatusBarAlignment = {}));
export function asStatusBarItemIdentifier(extension, id) {
    return `${ExtensionIdentifier.toKey(extension)}.${id}`;
}
export var TextEditorLineNumbersStyle;
(function (TextEditorLineNumbersStyle) {
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["Off"] = 0] = "Off";
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["On"] = 1] = "On";
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["Relative"] = 2] = "Relative";
    TextEditorLineNumbersStyle[TextEditorLineNumbersStyle["Interval"] = 3] = "Interval";
})(TextEditorLineNumbersStyle || (TextEditorLineNumbersStyle = {}));
export var TextDocumentSaveReason;
(function (TextDocumentSaveReason) {
    TextDocumentSaveReason[TextDocumentSaveReason["Manual"] = 1] = "Manual";
    TextDocumentSaveReason[TextDocumentSaveReason["AfterDelay"] = 2] = "AfterDelay";
    TextDocumentSaveReason[TextDocumentSaveReason["FocusOut"] = 3] = "FocusOut";
})(TextDocumentSaveReason || (TextDocumentSaveReason = {}));
export var TextEditorRevealType;
(function (TextEditorRevealType) {
    TextEditorRevealType[TextEditorRevealType["Default"] = 0] = "Default";
    TextEditorRevealType[TextEditorRevealType["InCenter"] = 1] = "InCenter";
    TextEditorRevealType[TextEditorRevealType["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
    TextEditorRevealType[TextEditorRevealType["AtTop"] = 3] = "AtTop";
})(TextEditorRevealType || (TextEditorRevealType = {}));
export var TextEditorSelectionChangeKind;
(function (TextEditorSelectionChangeKind) {
    TextEditorSelectionChangeKind[TextEditorSelectionChangeKind["Keyboard"] = 1] = "Keyboard";
    TextEditorSelectionChangeKind[TextEditorSelectionChangeKind["Mouse"] = 2] = "Mouse";
    TextEditorSelectionChangeKind[TextEditorSelectionChangeKind["Command"] = 3] = "Command";
})(TextEditorSelectionChangeKind || (TextEditorSelectionChangeKind = {}));
export var TextEditorChangeKind;
(function (TextEditorChangeKind) {
    TextEditorChangeKind[TextEditorChangeKind["Addition"] = 1] = "Addition";
    TextEditorChangeKind[TextEditorChangeKind["Deletion"] = 2] = "Deletion";
    TextEditorChangeKind[TextEditorChangeKind["Modification"] = 3] = "Modification";
})(TextEditorChangeKind || (TextEditorChangeKind = {}));
export var TextDocumentChangeReason;
(function (TextDocumentChangeReason) {
    TextDocumentChangeReason[TextDocumentChangeReason["Undo"] = 1] = "Undo";
    TextDocumentChangeReason[TextDocumentChangeReason["Redo"] = 2] = "Redo";
})(TextDocumentChangeReason || (TextDocumentChangeReason = {}));
/**
 * These values match very carefully the values of `TrackedRangeStickiness`
 */
export var DecorationRangeBehavior;
(function (DecorationRangeBehavior) {
    /**
     * TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
     */
    DecorationRangeBehavior[DecorationRangeBehavior["OpenOpen"] = 0] = "OpenOpen";
    /**
     * TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
     */
    DecorationRangeBehavior[DecorationRangeBehavior["ClosedClosed"] = 1] = "ClosedClosed";
    /**
     * TrackedRangeStickiness.GrowsOnlyWhenTypingBefore
     */
    DecorationRangeBehavior[DecorationRangeBehavior["OpenClosed"] = 2] = "OpenClosed";
    /**
     * TrackedRangeStickiness.GrowsOnlyWhenTypingAfter
     */
    DecorationRangeBehavior[DecorationRangeBehavior["ClosedOpen"] = 3] = "ClosedOpen";
})(DecorationRangeBehavior || (DecorationRangeBehavior = {}));
(function (TextEditorSelectionChangeKind) {
    function fromValue(s) {
        switch (s) {
            case 'keyboard': return TextEditorSelectionChangeKind.Keyboard;
            case 'mouse': return TextEditorSelectionChangeKind.Mouse;
            case "api" /* TextEditorSelectionSource.PROGRAMMATIC */:
            case "code.jump" /* TextEditorSelectionSource.JUMP */:
            case "code.navigation" /* TextEditorSelectionSource.NAVIGATION */:
                return TextEditorSelectionChangeKind.Command;
        }
        return undefined;
    }
    TextEditorSelectionChangeKind.fromValue = fromValue;
})(TextEditorSelectionChangeKind || (TextEditorSelectionChangeKind = {}));
export var SyntaxTokenType;
(function (SyntaxTokenType) {
    SyntaxTokenType[SyntaxTokenType["Other"] = 0] = "Other";
    SyntaxTokenType[SyntaxTokenType["Comment"] = 1] = "Comment";
    SyntaxTokenType[SyntaxTokenType["String"] = 2] = "String";
    SyntaxTokenType[SyntaxTokenType["RegEx"] = 3] = "RegEx";
})(SyntaxTokenType || (SyntaxTokenType = {}));
(function (SyntaxTokenType) {
    function toString(v) {
        switch (v) {
            case SyntaxTokenType.Other: return 'other';
            case SyntaxTokenType.Comment: return 'comment';
            case SyntaxTokenType.String: return 'string';
            case SyntaxTokenType.RegEx: return 'regex';
        }
        return 'other';
    }
    SyntaxTokenType.toString = toString;
})(SyntaxTokenType || (SyntaxTokenType = {}));
let DocumentLink = class DocumentLink {
    constructor(range, target) {
        if (target && !(URI.isUri(target))) {
            throw illegalArgument('target');
        }
        if (!Range.isRange(range) || range.isEmpty) {
            throw illegalArgument('range');
        }
        this.range = range;
        this.target = target;
    }
};
DocumentLink = __decorate([
    es5ClassCompat
], DocumentLink);
export { DocumentLink };
let Color = class Color {
    constructor(red, green, blue, alpha) {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }
};
Color = __decorate([
    es5ClassCompat
], Color);
export { Color };
let ColorInformation = class ColorInformation {
    constructor(range, color) {
        if (color && !(color instanceof Color)) {
            throw illegalArgument('color');
        }
        if (!Range.isRange(range) || range.isEmpty) {
            throw illegalArgument('range');
        }
        this.range = range;
        this.color = color;
    }
};
ColorInformation = __decorate([
    es5ClassCompat
], ColorInformation);
export { ColorInformation };
let ColorPresentation = class ColorPresentation {
    constructor(label) {
        if (!label || typeof label !== 'string') {
            throw illegalArgument('label');
        }
        this.label = label;
    }
};
ColorPresentation = __decorate([
    es5ClassCompat
], ColorPresentation);
export { ColorPresentation };
export var ColorFormat;
(function (ColorFormat) {
    ColorFormat[ColorFormat["RGB"] = 0] = "RGB";
    ColorFormat[ColorFormat["HEX"] = 1] = "HEX";
    ColorFormat[ColorFormat["HSL"] = 2] = "HSL";
})(ColorFormat || (ColorFormat = {}));
export var SourceControlInputBoxValidationType;
(function (SourceControlInputBoxValidationType) {
    SourceControlInputBoxValidationType[SourceControlInputBoxValidationType["Error"] = 0] = "Error";
    SourceControlInputBoxValidationType[SourceControlInputBoxValidationType["Warning"] = 1] = "Warning";
    SourceControlInputBoxValidationType[SourceControlInputBoxValidationType["Information"] = 2] = "Information";
})(SourceControlInputBoxValidationType || (SourceControlInputBoxValidationType = {}));
export var TerminalExitReason;
(function (TerminalExitReason) {
    TerminalExitReason[TerminalExitReason["Unknown"] = 0] = "Unknown";
    TerminalExitReason[TerminalExitReason["Shutdown"] = 1] = "Shutdown";
    TerminalExitReason[TerminalExitReason["Process"] = 2] = "Process";
    TerminalExitReason[TerminalExitReason["User"] = 3] = "User";
    TerminalExitReason[TerminalExitReason["Extension"] = 4] = "Extension";
})(TerminalExitReason || (TerminalExitReason = {}));
export var TerminalShellExecutionCommandLineConfidence;
(function (TerminalShellExecutionCommandLineConfidence) {
    TerminalShellExecutionCommandLineConfidence[TerminalShellExecutionCommandLineConfidence["Low"] = 0] = "Low";
    TerminalShellExecutionCommandLineConfidence[TerminalShellExecutionCommandLineConfidence["Medium"] = 1] = "Medium";
    TerminalShellExecutionCommandLineConfidence[TerminalShellExecutionCommandLineConfidence["High"] = 2] = "High";
})(TerminalShellExecutionCommandLineConfidence || (TerminalShellExecutionCommandLineConfidence = {}));
export var TerminalShellType;
(function (TerminalShellType) {
    TerminalShellType[TerminalShellType["Sh"] = 1] = "Sh";
    TerminalShellType[TerminalShellType["Bash"] = 2] = "Bash";
    TerminalShellType[TerminalShellType["Fish"] = 3] = "Fish";
    TerminalShellType[TerminalShellType["Csh"] = 4] = "Csh";
    TerminalShellType[TerminalShellType["Ksh"] = 5] = "Ksh";
    TerminalShellType[TerminalShellType["Zsh"] = 6] = "Zsh";
    TerminalShellType[TerminalShellType["CommandPrompt"] = 7] = "CommandPrompt";
    TerminalShellType[TerminalShellType["GitBash"] = 8] = "GitBash";
    TerminalShellType[TerminalShellType["PowerShell"] = 9] = "PowerShell";
    TerminalShellType[TerminalShellType["Python"] = 10] = "Python";
    TerminalShellType[TerminalShellType["Julia"] = 11] = "Julia";
    TerminalShellType[TerminalShellType["NuShell"] = 12] = "NuShell";
    TerminalShellType[TerminalShellType["Node"] = 13] = "Node";
})(TerminalShellType || (TerminalShellType = {}));
export class TerminalLink {
    constructor(startIndex, length, tooltip) {
        this.startIndex = startIndex;
        this.length = length;
        this.tooltip = tooltip;
        if (typeof startIndex !== 'number' || startIndex < 0) {
            throw illegalArgument('startIndex');
        }
        if (typeof length !== 'number' || length < 1) {
            throw illegalArgument('length');
        }
        if (tooltip !== undefined && typeof tooltip !== 'string') {
            throw illegalArgument('tooltip');
        }
    }
}
export class TerminalQuickFixOpener {
    constructor(uri) {
        this.uri = uri;
    }
}
export class TerminalQuickFixCommand {
    constructor(terminalCommand) {
        this.terminalCommand = terminalCommand;
    }
}
export var TerminalLocation;
(function (TerminalLocation) {
    TerminalLocation[TerminalLocation["Panel"] = 1] = "Panel";
    TerminalLocation[TerminalLocation["Editor"] = 2] = "Editor";
})(TerminalLocation || (TerminalLocation = {}));
export class TerminalProfile {
    constructor(options) {
        this.options = options;
        if (typeof options !== 'object') {
            throw illegalArgument('options');
        }
    }
}
export var TerminalCompletionItemKind;
(function (TerminalCompletionItemKind) {
    TerminalCompletionItemKind[TerminalCompletionItemKind["File"] = 0] = "File";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Folder"] = 1] = "Folder";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Method"] = 2] = "Method";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Alias"] = 3] = "Alias";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Argument"] = 4] = "Argument";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Option"] = 5] = "Option";
    TerminalCompletionItemKind[TerminalCompletionItemKind["OptionValue"] = 6] = "OptionValue";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Flag"] = 7] = "Flag";
    TerminalCompletionItemKind[TerminalCompletionItemKind["SymbolicLinkFile"] = 8] = "SymbolicLinkFile";
    TerminalCompletionItemKind[TerminalCompletionItemKind["SymbolicLinkFolder"] = 9] = "SymbolicLinkFolder";
    TerminalCompletionItemKind[TerminalCompletionItemKind["ScmCommit"] = 10] = "ScmCommit";
    TerminalCompletionItemKind[TerminalCompletionItemKind["ScmBranch"] = 11] = "ScmBranch";
    TerminalCompletionItemKind[TerminalCompletionItemKind["ScmTag"] = 12] = "ScmTag";
    TerminalCompletionItemKind[TerminalCompletionItemKind["ScmStash"] = 13] = "ScmStash";
    TerminalCompletionItemKind[TerminalCompletionItemKind["ScmRemote"] = 14] = "ScmRemote";
    TerminalCompletionItemKind[TerminalCompletionItemKind["PullRequest"] = 15] = "PullRequest";
    TerminalCompletionItemKind[TerminalCompletionItemKind["PullRequestDone"] = 16] = "PullRequestDone";
})(TerminalCompletionItemKind || (TerminalCompletionItemKind = {}));
export class TerminalCompletionItem {
    constructor(label, replacementRange, kind, detail, documentation, isFile, isDirectory, isKeyword) {
        this.label = label;
        this.replacementRange = replacementRange;
        this.kind = kind;
        this.detail = detail;
        this.documentation = documentation;
        this.isFile = isFile;
        this.isDirectory = isDirectory;
        this.isKeyword = isKeyword;
    }
}
/**
 * Represents a collection of {@link CompletionItem completion items} to be presented
 * in the editor.
 */
export class TerminalCompletionList {
    /**
     * Creates a new completion list.
     *
     * @param items The completion items.
     * @param isIncomplete The list is not complete.
     */
    constructor(items, resourceOptions) {
        this.items = items ?? [];
        this.resourceOptions = resourceOptions;
    }
}
export var TaskRevealKind;
(function (TaskRevealKind) {
    TaskRevealKind[TaskRevealKind["Always"] = 1] = "Always";
    TaskRevealKind[TaskRevealKind["Silent"] = 2] = "Silent";
    TaskRevealKind[TaskRevealKind["Never"] = 3] = "Never";
})(TaskRevealKind || (TaskRevealKind = {}));
export var TaskEventKind;
(function (TaskEventKind) {
    /** Indicates a task's properties or configuration have changed */
    TaskEventKind["Changed"] = "changed";
    /** Indicates a task has begun executing */
    TaskEventKind["ProcessStarted"] = "processStarted";
    /** Indicates a task process has completed */
    TaskEventKind["ProcessEnded"] = "processEnded";
    /** Indicates a task was terminated, either by user action or by the system */
    TaskEventKind["Terminated"] = "terminated";
    /** Indicates a task has started running */
    TaskEventKind["Start"] = "start";
    /** Indicates a task has acquired all needed input/variables to execute */
    TaskEventKind["AcquiredInput"] = "acquiredInput";
    /** Indicates a dependent task has started */
    TaskEventKind["DependsOnStarted"] = "dependsOnStarted";
    /** Indicates a task is actively running/processing */
    TaskEventKind["Active"] = "active";
    /** Indicates a task is paused/waiting but not complete */
    TaskEventKind["Inactive"] = "inactive";
    /** Indicates a task has completed fully */
    TaskEventKind["End"] = "end";
    /** Indicates the task's problem matcher has started */
    TaskEventKind["ProblemMatcherStarted"] = "problemMatcherStarted";
    /** Indicates the task's problem matcher has ended without errors */
    TaskEventKind["ProblemMatcherEnded"] = "problemMatcherEnded";
    /** Indicates the task's problem matcher has ended with errors */
    TaskEventKind["ProblemMatcherFoundErrors"] = "problemMatcherFoundErrors";
})(TaskEventKind || (TaskEventKind = {}));
export var TaskPanelKind;
(function (TaskPanelKind) {
    TaskPanelKind[TaskPanelKind["Shared"] = 1] = "Shared";
    TaskPanelKind[TaskPanelKind["Dedicated"] = 2] = "Dedicated";
    TaskPanelKind[TaskPanelKind["New"] = 3] = "New";
})(TaskPanelKind || (TaskPanelKind = {}));
let TaskGroup = class TaskGroup {
    static { TaskGroup_1 = this; }
    static { this.Clean = new TaskGroup_1('clean', 'Clean'); }
    static { this.Build = new TaskGroup_1('build', 'Build'); }
    static { this.Rebuild = new TaskGroup_1('rebuild', 'Rebuild'); }
    static { this.Test = new TaskGroup_1('test', 'Test'); }
    static from(value) {
        switch (value) {
            case 'clean':
                return TaskGroup_1.Clean;
            case 'build':
                return TaskGroup_1.Build;
            case 'rebuild':
                return TaskGroup_1.Rebuild;
            case 'test':
                return TaskGroup_1.Test;
            default:
                return undefined;
        }
    }
    constructor(id, label) {
        this.label = label;
        if (typeof id !== 'string') {
            throw illegalArgument('name');
        }
        if (typeof label !== 'string') {
            throw illegalArgument('name');
        }
        this._id = id;
    }
    get id() {
        return this._id;
    }
};
TaskGroup = TaskGroup_1 = __decorate([
    es5ClassCompat
], TaskGroup);
export { TaskGroup };
function computeTaskExecutionId(values) {
    let id = '';
    for (let i = 0; i < values.length; i++) {
        id += values[i].replace(/,/g, ',,') + ',';
    }
    return id;
}
let ProcessExecution = class ProcessExecution {
    constructor(process, varg1, varg2) {
        if (typeof process !== 'string') {
            throw illegalArgument('process');
        }
        this._args = [];
        this._process = process;
        if (varg1 !== undefined) {
            if (Array.isArray(varg1)) {
                this._args = varg1;
                this._options = varg2;
            }
            else {
                this._options = varg1;
            }
        }
    }
    get process() {
        return this._process;
    }
    set process(value) {
        if (typeof value !== 'string') {
            throw illegalArgument('process');
        }
        this._process = value;
    }
    get args() {
        return this._args;
    }
    set args(value) {
        if (!Array.isArray(value)) {
            value = [];
        }
        this._args = value;
    }
    get options() {
        return this._options;
    }
    set options(value) {
        this._options = value;
    }
    computeId() {
        const props = [];
        props.push('process');
        if (this._process !== undefined) {
            props.push(this._process);
        }
        if (this._args && this._args.length > 0) {
            for (const arg of this._args) {
                props.push(arg);
            }
        }
        return computeTaskExecutionId(props);
    }
};
ProcessExecution = __decorate([
    es5ClassCompat
], ProcessExecution);
export { ProcessExecution };
let ShellExecution = class ShellExecution {
    constructor(arg0, arg1, arg2) {
        this._args = [];
        if (Array.isArray(arg1)) {
            if (!arg0) {
                throw illegalArgument('command can\'t be undefined or null');
            }
            if (typeof arg0 !== 'string' && typeof arg0.value !== 'string') {
                throw illegalArgument('command');
            }
            this._command = arg0;
            if (arg1) {
                this._args = arg1;
            }
            this._options = arg2;
        }
        else {
            if (typeof arg0 !== 'string') {
                throw illegalArgument('commandLine');
            }
            this._commandLine = arg0;
            this._options = arg1;
        }
    }
    get commandLine() {
        return this._commandLine;
    }
    set commandLine(value) {
        if (typeof value !== 'string') {
            throw illegalArgument('commandLine');
        }
        this._commandLine = value;
    }
    get command() {
        return this._command ? this._command : '';
    }
    set command(value) {
        if (typeof value !== 'string' && typeof value.value !== 'string') {
            throw illegalArgument('command');
        }
        this._command = value;
    }
    get args() {
        return this._args;
    }
    set args(value) {
        this._args = value || [];
    }
    get options() {
        return this._options;
    }
    set options(value) {
        this._options = value;
    }
    computeId() {
        const props = [];
        props.push('shell');
        if (this._commandLine !== undefined) {
            props.push(this._commandLine);
        }
        if (this._command !== undefined) {
            props.push(typeof this._command === 'string' ? this._command : this._command.value);
        }
        if (this._args && this._args.length > 0) {
            for (const arg of this._args) {
                props.push(typeof arg === 'string' ? arg : arg.value);
            }
        }
        return computeTaskExecutionId(props);
    }
};
ShellExecution = __decorate([
    es5ClassCompat
], ShellExecution);
export { ShellExecution };
export var ShellQuoting;
(function (ShellQuoting) {
    ShellQuoting[ShellQuoting["Escape"] = 1] = "Escape";
    ShellQuoting[ShellQuoting["Strong"] = 2] = "Strong";
    ShellQuoting[ShellQuoting["Weak"] = 3] = "Weak";
})(ShellQuoting || (ShellQuoting = {}));
export var TaskScope;
(function (TaskScope) {
    TaskScope[TaskScope["Global"] = 1] = "Global";
    TaskScope[TaskScope["Workspace"] = 2] = "Workspace";
})(TaskScope || (TaskScope = {}));
export class CustomExecution {
    constructor(callback) {
        this._callback = callback;
    }
    computeId() {
        return 'customExecution' + generateUuid();
    }
    set callback(value) {
        this._callback = value;
    }
    get callback() {
        return this._callback;
    }
}
let Task = class Task {
    static { Task_1 = this; }
    static { this.ExtensionCallbackType = 'customExecution'; }
    static { this.ProcessType = 'process'; }
    static { this.ShellType = 'shell'; }
    static { this.EmptyType = '$empty'; }
    constructor(definition, arg2, arg3, arg4, arg5, arg6) {
        this.__deprecated = false;
        this._definition = this.definition = definition;
        let problemMatchers;
        if (typeof arg2 === 'string') {
            this._name = this.name = arg2;
            this._source = this.source = arg3;
            this.execution = arg4;
            problemMatchers = arg5;
            this.__deprecated = true;
        }
        else if (arg2 === TaskScope.Global || arg2 === TaskScope.Workspace) {
            this.target = arg2;
            this._name = this.name = arg3;
            this._source = this.source = arg4;
            this.execution = arg5;
            problemMatchers = arg6;
        }
        else {
            this.target = arg2;
            this._name = this.name = arg3;
            this._source = this.source = arg4;
            this.execution = arg5;
            problemMatchers = arg6;
        }
        if (typeof problemMatchers === 'string') {
            this._problemMatchers = [problemMatchers];
            this._hasDefinedMatchers = true;
        }
        else if (Array.isArray(problemMatchers)) {
            this._problemMatchers = problemMatchers;
            this._hasDefinedMatchers = true;
        }
        else {
            this._problemMatchers = [];
            this._hasDefinedMatchers = false;
        }
        this._isBackground = false;
        this._presentationOptions = Object.create(null);
        this._runOptions = Object.create(null);
    }
    get _id() {
        return this.__id;
    }
    set _id(value) {
        this.__id = value;
    }
    get _deprecated() {
        return this.__deprecated;
    }
    clear() {
        if (this.__id === undefined) {
            return;
        }
        this.__id = undefined;
        this._scope = undefined;
        this.computeDefinitionBasedOnExecution();
    }
    computeDefinitionBasedOnExecution() {
        if (this._execution instanceof ProcessExecution) {
            this._definition = {
                type: Task_1.ProcessType,
                id: this._execution.computeId()
            };
        }
        else if (this._execution instanceof ShellExecution) {
            this._definition = {
                type: Task_1.ShellType,
                id: this._execution.computeId()
            };
        }
        else if (this._execution instanceof CustomExecution) {
            this._definition = {
                type: Task_1.ExtensionCallbackType,
                id: this._execution.computeId()
            };
        }
        else {
            this._definition = {
                type: Task_1.EmptyType,
                id: generateUuid()
            };
        }
    }
    get definition() {
        return this._definition;
    }
    set definition(value) {
        if (value === undefined || value === null) {
            throw illegalArgument('Kind can\'t be undefined or null');
        }
        this.clear();
        this._definition = value;
    }
    get scope() {
        return this._scope;
    }
    set target(value) {
        this.clear();
        this._scope = value;
    }
    get name() {
        return this._name;
    }
    set name(value) {
        if (typeof value !== 'string') {
            throw illegalArgument('name');
        }
        this.clear();
        this._name = value;
    }
    get execution() {
        return this._execution;
    }
    set execution(value) {
        if (value === null) {
            value = undefined;
        }
        this.clear();
        this._execution = value;
        const type = this._definition.type;
        if (Task_1.EmptyType === type || Task_1.ProcessType === type || Task_1.ShellType === type || Task_1.ExtensionCallbackType === type) {
            this.computeDefinitionBasedOnExecution();
        }
    }
    get problemMatchers() {
        return this._problemMatchers;
    }
    set problemMatchers(value) {
        if (!Array.isArray(value)) {
            this.clear();
            this._problemMatchers = [];
            this._hasDefinedMatchers = false;
            return;
        }
        else {
            this.clear();
            this._problemMatchers = value;
            this._hasDefinedMatchers = true;
        }
    }
    get hasDefinedMatchers() {
        return this._hasDefinedMatchers;
    }
    get isBackground() {
        return this._isBackground;
    }
    set isBackground(value) {
        if (value !== true && value !== false) {
            value = false;
        }
        this.clear();
        this._isBackground = value;
    }
    get source() {
        return this._source;
    }
    set source(value) {
        if (typeof value !== 'string' || value.length === 0) {
            throw illegalArgument('source must be a string of length > 0');
        }
        this.clear();
        this._source = value;
    }
    get group() {
        return this._group;
    }
    set group(value) {
        if (value === null) {
            value = undefined;
        }
        this.clear();
        this._group = value;
    }
    get detail() {
        return this._detail;
    }
    set detail(value) {
        if (value === null) {
            value = undefined;
        }
        this._detail = value;
    }
    get presentationOptions() {
        return this._presentationOptions;
    }
    set presentationOptions(value) {
        if (value === null || value === undefined) {
            value = Object.create(null);
        }
        this.clear();
        this._presentationOptions = value;
    }
    get runOptions() {
        return this._runOptions;
    }
    set runOptions(value) {
        if (value === null || value === undefined) {
            value = Object.create(null);
        }
        this.clear();
        this._runOptions = value;
    }
};
Task = Task_1 = __decorate([
    es5ClassCompat
], Task);
export { Task };
export var ProgressLocation;
(function (ProgressLocation) {
    ProgressLocation[ProgressLocation["SourceControl"] = 1] = "SourceControl";
    ProgressLocation[ProgressLocation["Window"] = 10] = "Window";
    ProgressLocation[ProgressLocation["Notification"] = 15] = "Notification";
})(ProgressLocation || (ProgressLocation = {}));
export var ViewBadge;
(function (ViewBadge) {
    function isViewBadge(thing) {
        const viewBadgeThing = thing;
        if (!isNumber(viewBadgeThing.value)) {
            console.log('INVALID view badge, invalid value', viewBadgeThing.value);
            return false;
        }
        if (viewBadgeThing.tooltip && !isString(viewBadgeThing.tooltip)) {
            console.log('INVALID view badge, invalid tooltip', viewBadgeThing.tooltip);
            return false;
        }
        return true;
    }
    ViewBadge.isViewBadge = isViewBadge;
})(ViewBadge || (ViewBadge = {}));
let TreeItem = TreeItem_1 = class TreeItem {
    static isTreeItem(thing, extension) {
        const treeItemThing = thing;
        if (treeItemThing.checkboxState !== undefined) {
            const checkbox = isNumber(treeItemThing.checkboxState) ? treeItemThing.checkboxState :
                isObject(treeItemThing.checkboxState) && isNumber(treeItemThing.checkboxState.state) ? treeItemThing.checkboxState.state : undefined;
            const tooltip = !isNumber(treeItemThing.checkboxState) && isObject(treeItemThing.checkboxState) ? treeItemThing.checkboxState.tooltip : undefined;
            if (checkbox === undefined || (checkbox !== TreeItemCheckboxState.Checked && checkbox !== TreeItemCheckboxState.Unchecked) || (tooltip !== undefined && !isString(tooltip))) {
                console.log('INVALID tree item, invalid checkboxState', treeItemThing.checkboxState);
                return false;
            }
        }
        if (thing instanceof TreeItem_1) {
            return true;
        }
        if (treeItemThing.label !== undefined && !isString(treeItemThing.label) && !(treeItemThing.label?.label)) {
            console.log('INVALID tree item, invalid label', treeItemThing.label);
            return false;
        }
        if ((treeItemThing.id !== undefined) && !isString(treeItemThing.id)) {
            console.log('INVALID tree item, invalid id', treeItemThing.id);
            return false;
        }
        if ((treeItemThing.iconPath !== undefined) && !isString(treeItemThing.iconPath) && !URI.isUri(treeItemThing.iconPath) && (!treeItemThing.iconPath || !isString(treeItemThing.iconPath.id))) {
            const asLightAndDarkThing = treeItemThing.iconPath;
            if (!asLightAndDarkThing || (!isString(asLightAndDarkThing.light) && !URI.isUri(asLightAndDarkThing.light) && !isString(asLightAndDarkThing.dark) && !URI.isUri(asLightAndDarkThing.dark))) {
                console.log('INVALID tree item, invalid iconPath', treeItemThing.iconPath);
                return false;
            }
        }
        if ((treeItemThing.description !== undefined) && !isString(treeItemThing.description) && (typeof treeItemThing.description !== 'boolean')) {
            console.log('INVALID tree item, invalid description', treeItemThing.description);
            return false;
        }
        if ((treeItemThing.resourceUri !== undefined) && !URI.isUri(treeItemThing.resourceUri)) {
            console.log('INVALID tree item, invalid resourceUri', treeItemThing.resourceUri);
            return false;
        }
        if ((treeItemThing.tooltip !== undefined) && !isString(treeItemThing.tooltip) && !(treeItemThing.tooltip instanceof MarkdownString)) {
            console.log('INVALID tree item, invalid tooltip', treeItemThing.tooltip);
            return false;
        }
        if ((treeItemThing.command !== undefined) && !treeItemThing.command.command) {
            console.log('INVALID tree item, invalid command', treeItemThing.command);
            return false;
        }
        if ((treeItemThing.collapsibleState !== undefined) && (treeItemThing.collapsibleState < TreeItemCollapsibleState.None) && (treeItemThing.collapsibleState > TreeItemCollapsibleState.Expanded)) {
            console.log('INVALID tree item, invalid collapsibleState', treeItemThing.collapsibleState);
            return false;
        }
        if ((treeItemThing.contextValue !== undefined) && !isString(treeItemThing.contextValue)) {
            console.log('INVALID tree item, invalid contextValue', treeItemThing.contextValue);
            return false;
        }
        if ((treeItemThing.accessibilityInformation !== undefined) && !treeItemThing.accessibilityInformation?.label) {
            console.log('INVALID tree item, invalid accessibilityInformation', treeItemThing.accessibilityInformation);
            return false;
        }
        return true;
    }
    constructor(arg1, collapsibleState = TreeItemCollapsibleState.None) {
        this.collapsibleState = collapsibleState;
        if (URI.isUri(arg1)) {
            this.resourceUri = arg1;
        }
        else {
            this.label = arg1;
        }
    }
};
TreeItem = TreeItem_1 = __decorate([
    es5ClassCompat
], TreeItem);
export { TreeItem };
export var TreeItemCollapsibleState;
(function (TreeItemCollapsibleState) {
    TreeItemCollapsibleState[TreeItemCollapsibleState["None"] = 0] = "None";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Collapsed"] = 1] = "Collapsed";
    TreeItemCollapsibleState[TreeItemCollapsibleState["Expanded"] = 2] = "Expanded";
})(TreeItemCollapsibleState || (TreeItemCollapsibleState = {}));
export var TreeItemCheckboxState;
(function (TreeItemCheckboxState) {
    TreeItemCheckboxState[TreeItemCheckboxState["Unchecked"] = 0] = "Unchecked";
    TreeItemCheckboxState[TreeItemCheckboxState["Checked"] = 1] = "Checked";
})(TreeItemCheckboxState || (TreeItemCheckboxState = {}));
let DataTransferItem = class DataTransferItem {
    async asString() {
        return typeof this.value === 'string' ? this.value : JSON.stringify(this.value);
    }
    asFile() {
        return undefined;
    }
    constructor(value) {
        this.value = value;
    }
};
DataTransferItem = __decorate([
    es5ClassCompat
], DataTransferItem);
export { DataTransferItem };
/**
 * A data transfer item that has been created by VS Code instead of by a extension.
 *
 * Intentionally not exported to extensions.
 */
export class InternalDataTransferItem extends DataTransferItem {
}
/**
 * A data transfer item for a file.
 *
 * Intentionally not exported to extensions as only we can create these.
 */
export class InternalFileDataTransferItem extends InternalDataTransferItem {
    #file;
    constructor(file) {
        super('');
        this.#file = file;
    }
    asFile() {
        return this.#file;
    }
}
/**
 * Intentionally not exported to extensions
 */
export class DataTransferFile {
    constructor(name, uri, itemId, getData) {
        this.name = name;
        this.uri = uri;
        this._itemId = itemId;
        this._getData = getData;
    }
    data() {
        return this._getData();
    }
}
let DataTransfer = class DataTransfer {
    #items = new Map();
    constructor(init) {
        for (const [mime, item] of init ?? []) {
            const existing = this.#items.get(this.#normalizeMime(mime));
            if (existing) {
                existing.push(item);
            }
            else {
                this.#items.set(this.#normalizeMime(mime), [item]);
            }
        }
    }
    get(mimeType) {
        return this.#items.get(this.#normalizeMime(mimeType))?.[0];
    }
    set(mimeType, value) {
        // This intentionally overwrites all entries for a given mimetype.
        // This is similar to how the DOM DataTransfer type works
        this.#items.set(this.#normalizeMime(mimeType), [value]);
    }
    forEach(callbackfn, thisArg) {
        for (const [mime, items] of this.#items) {
            for (const item of items) {
                callbackfn.call(thisArg, item, mime, this);
            }
        }
    }
    *[Symbol.iterator]() {
        for (const [mime, items] of this.#items) {
            for (const item of items) {
                yield [mime, item];
            }
        }
    }
    #normalizeMime(mimeType) {
        return mimeType.toLowerCase();
    }
};
DataTransfer = __decorate([
    es5ClassCompat
], DataTransfer);
export { DataTransfer };
let DocumentDropEdit = class DocumentDropEdit {
    constructor(insertText, title, kind) {
        this.insertText = insertText;
        this.title = title;
        this.kind = kind;
    }
};
DocumentDropEdit = __decorate([
    es5ClassCompat
], DocumentDropEdit);
export { DocumentDropEdit };
export var DocumentPasteTriggerKind;
(function (DocumentPasteTriggerKind) {
    DocumentPasteTriggerKind[DocumentPasteTriggerKind["Automatic"] = 0] = "Automatic";
    DocumentPasteTriggerKind[DocumentPasteTriggerKind["PasteAs"] = 1] = "PasteAs";
})(DocumentPasteTriggerKind || (DocumentPasteTriggerKind = {}));
export class DocumentDropOrPasteEditKind {
    static { this.sep = '.'; }
    constructor(value) {
        this.value = value;
    }
    append(...parts) {
        return new DocumentDropOrPasteEditKind((this.value ? [this.value, ...parts] : parts).join(DocumentDropOrPasteEditKind.sep));
    }
    intersects(other) {
        return this.contains(other) || other.contains(this);
    }
    contains(other) {
        return this.value === other.value || other.value.startsWith(this.value + DocumentDropOrPasteEditKind.sep);
    }
}
DocumentDropOrPasteEditKind.Empty = new DocumentDropOrPasteEditKind('');
DocumentDropOrPasteEditKind.Text = new DocumentDropOrPasteEditKind('text');
DocumentDropOrPasteEditKind.TextUpdateImports = DocumentDropOrPasteEditKind.Text.append('updateImports');
export class DocumentPasteEdit {
    constructor(insertText, title, kind) {
        this.title = title;
        this.insertText = insertText;
        this.kind = kind;
    }
}
let ThemeIcon = class ThemeIcon {
    constructor(id, color) {
        this.id = id;
        this.color = color;
    }
    static isThemeIcon(thing) {
        if (typeof thing.id !== 'string') {
            console.log('INVALID ThemeIcon, invalid id', thing.id);
            return false;
        }
        return true;
    }
};
ThemeIcon = __decorate([
    es5ClassCompat
], ThemeIcon);
export { ThemeIcon };
ThemeIcon.File = new ThemeIcon('file');
ThemeIcon.Folder = new ThemeIcon('folder');
let ThemeColor = class ThemeColor {
    constructor(id) {
        this.id = id;
    }
};
ThemeColor = __decorate([
    es5ClassCompat
], ThemeColor);
export { ThemeColor };
export var ConfigurationTarget;
(function (ConfigurationTarget) {
    ConfigurationTarget[ConfigurationTarget["Global"] = 1] = "Global";
    ConfigurationTarget[ConfigurationTarget["Workspace"] = 2] = "Workspace";
    ConfigurationTarget[ConfigurationTarget["WorkspaceFolder"] = 3] = "WorkspaceFolder";
})(ConfigurationTarget || (ConfigurationTarget = {}));
let RelativePattern = class RelativePattern {
    get base() {
        return this._base;
    }
    set base(base) {
        this._base = base;
        this._baseUri = URI.file(base);
    }
    get baseUri() {
        return this._baseUri;
    }
    set baseUri(baseUri) {
        this._baseUri = baseUri;
        this._base = baseUri.fsPath;
    }
    constructor(base, pattern) {
        if (typeof base !== 'string') {
            if (!base || !URI.isUri(base) && !URI.isUri(base.uri)) {
                throw illegalArgument('base');
            }
        }
        if (typeof pattern !== 'string') {
            throw illegalArgument('pattern');
        }
        if (typeof base === 'string') {
            this.baseUri = URI.file(base);
        }
        else if (URI.isUri(base)) {
            this.baseUri = base;
        }
        else {
            this.baseUri = base.uri;
        }
        this.pattern = pattern;
    }
    toJSON() {
        return {
            pattern: this.pattern,
            base: this.base,
            baseUri: this.baseUri.toJSON()
        };
    }
};
RelativePattern = __decorate([
    es5ClassCompat
], RelativePattern);
export { RelativePattern };
const breakpointIds = new WeakMap();
/**
 * We want to be able to construct Breakpoints internally that have a particular id, but we don't want extensions to be
 * able to do this with the exposed Breakpoint classes in extension API.
 * We also want "instanceof" to work with debug.breakpoints and the exposed breakpoint classes.
 * And private members will be renamed in the built js, so casting to any and setting a private member is not safe.
 * So, we store internal breakpoint IDs in a WeakMap. This function must be called after constructing a Breakpoint
 * with a known id.
 */
export function setBreakpointId(bp, id) {
    breakpointIds.set(bp, id);
}
let Breakpoint = class Breakpoint {
    constructor(enabled, condition, hitCondition, logMessage, mode) {
        this.enabled = typeof enabled === 'boolean' ? enabled : true;
        if (typeof condition === 'string') {
            this.condition = condition;
        }
        if (typeof hitCondition === 'string') {
            this.hitCondition = hitCondition;
        }
        if (typeof logMessage === 'string') {
            this.logMessage = logMessage;
        }
        if (typeof mode === 'string') {
            this.mode = mode;
        }
    }
    get id() {
        if (!this._id) {
            this._id = breakpointIds.get(this) ?? generateUuid();
        }
        return this._id;
    }
};
Breakpoint = __decorate([
    es5ClassCompat
], Breakpoint);
export { Breakpoint };
let SourceBreakpoint = class SourceBreakpoint extends Breakpoint {
    constructor(location, enabled, condition, hitCondition, logMessage, mode) {
        super(enabled, condition, hitCondition, logMessage, mode);
        if (location === null) {
            throw illegalArgument('location');
        }
        this.location = location;
    }
};
SourceBreakpoint = __decorate([
    es5ClassCompat
], SourceBreakpoint);
export { SourceBreakpoint };
let FunctionBreakpoint = class FunctionBreakpoint extends Breakpoint {
    constructor(functionName, enabled, condition, hitCondition, logMessage, mode) {
        super(enabled, condition, hitCondition, logMessage, mode);
        this.functionName = functionName;
    }
};
FunctionBreakpoint = __decorate([
    es5ClassCompat
], FunctionBreakpoint);
export { FunctionBreakpoint };
let DataBreakpoint = class DataBreakpoint extends Breakpoint {
    constructor(label, dataId, canPersist, enabled, condition, hitCondition, logMessage, mode) {
        super(enabled, condition, hitCondition, logMessage, mode);
        if (!dataId) {
            throw illegalArgument('dataId');
        }
        this.label = label;
        this.dataId = dataId;
        this.canPersist = canPersist;
    }
};
DataBreakpoint = __decorate([
    es5ClassCompat
], DataBreakpoint);
export { DataBreakpoint };
let DebugAdapterExecutable = class DebugAdapterExecutable {
    constructor(command, args, options) {
        this.command = command;
        this.args = args || [];
        this.options = options;
    }
};
DebugAdapterExecutable = __decorate([
    es5ClassCompat
], DebugAdapterExecutable);
export { DebugAdapterExecutable };
let DebugAdapterServer = class DebugAdapterServer {
    constructor(port, host) {
        this.port = port;
        this.host = host;
    }
};
DebugAdapterServer = __decorate([
    es5ClassCompat
], DebugAdapterServer);
export { DebugAdapterServer };
let DebugAdapterNamedPipeServer = class DebugAdapterNamedPipeServer {
    constructor(path) {
        this.path = path;
    }
};
DebugAdapterNamedPipeServer = __decorate([
    es5ClassCompat
], DebugAdapterNamedPipeServer);
export { DebugAdapterNamedPipeServer };
let DebugAdapterInlineImplementation = class DebugAdapterInlineImplementation {
    constructor(impl) {
        this.implementation = impl;
    }
};
DebugAdapterInlineImplementation = __decorate([
    es5ClassCompat
], DebugAdapterInlineImplementation);
export { DebugAdapterInlineImplementation };
export class DebugStackFrame {
    constructor(session, threadId, frameId) {
        this.session = session;
        this.threadId = threadId;
        this.frameId = frameId;
    }
}
export class DebugThread {
    constructor(session, threadId) {
        this.session = session;
        this.threadId = threadId;
    }
}
let EvaluatableExpression = class EvaluatableExpression {
    constructor(range, expression) {
        this.range = range;
        this.expression = expression;
    }
};
EvaluatableExpression = __decorate([
    es5ClassCompat
], EvaluatableExpression);
export { EvaluatableExpression };
export var InlineCompletionTriggerKind;
(function (InlineCompletionTriggerKind) {
    InlineCompletionTriggerKind[InlineCompletionTriggerKind["Invoke"] = 0] = "Invoke";
    InlineCompletionTriggerKind[InlineCompletionTriggerKind["Automatic"] = 1] = "Automatic";
})(InlineCompletionTriggerKind || (InlineCompletionTriggerKind = {}));
export var InlineCompletionsDisposeReasonKind;
(function (InlineCompletionsDisposeReasonKind) {
    InlineCompletionsDisposeReasonKind[InlineCompletionsDisposeReasonKind["Other"] = 0] = "Other";
    InlineCompletionsDisposeReasonKind[InlineCompletionsDisposeReasonKind["Empty"] = 1] = "Empty";
    InlineCompletionsDisposeReasonKind[InlineCompletionsDisposeReasonKind["TokenCancellation"] = 2] = "TokenCancellation";
    InlineCompletionsDisposeReasonKind[InlineCompletionsDisposeReasonKind["LostRace"] = 3] = "LostRace";
    InlineCompletionsDisposeReasonKind[InlineCompletionsDisposeReasonKind["NotTaken"] = 4] = "NotTaken";
})(InlineCompletionsDisposeReasonKind || (InlineCompletionsDisposeReasonKind = {}));
let InlineValueText = class InlineValueText {
    constructor(range, text) {
        this.range = range;
        this.text = text;
    }
};
InlineValueText = __decorate([
    es5ClassCompat
], InlineValueText);
export { InlineValueText };
let InlineValueVariableLookup = class InlineValueVariableLookup {
    constructor(range, variableName, caseSensitiveLookup = true) {
        this.range = range;
        this.variableName = variableName;
        this.caseSensitiveLookup = caseSensitiveLookup;
    }
};
InlineValueVariableLookup = __decorate([
    es5ClassCompat
], InlineValueVariableLookup);
export { InlineValueVariableLookup };
let InlineValueEvaluatableExpression = class InlineValueEvaluatableExpression {
    constructor(range, expression) {
        this.range = range;
        this.expression = expression;
    }
};
InlineValueEvaluatableExpression = __decorate([
    es5ClassCompat
], InlineValueEvaluatableExpression);
export { InlineValueEvaluatableExpression };
let InlineValueContext = class InlineValueContext {
    constructor(frameId, range) {
        this.frameId = frameId;
        this.stoppedLocation = range;
    }
};
InlineValueContext = __decorate([
    es5ClassCompat
], InlineValueContext);
export { InlineValueContext };
export var NewSymbolNameTag;
(function (NewSymbolNameTag) {
    NewSymbolNameTag[NewSymbolNameTag["AIGenerated"] = 1] = "AIGenerated";
})(NewSymbolNameTag || (NewSymbolNameTag = {}));
export var NewSymbolNameTriggerKind;
(function (NewSymbolNameTriggerKind) {
    NewSymbolNameTriggerKind[NewSymbolNameTriggerKind["Invoke"] = 0] = "Invoke";
    NewSymbolNameTriggerKind[NewSymbolNameTriggerKind["Automatic"] = 1] = "Automatic";
})(NewSymbolNameTriggerKind || (NewSymbolNameTriggerKind = {}));
export class NewSymbolName {
    constructor(newSymbolName, tags) {
        this.newSymbolName = newSymbolName;
        this.tags = tags;
    }
}
//#region file api
export var FileChangeType;
(function (FileChangeType) {
    FileChangeType[FileChangeType["Changed"] = 1] = "Changed";
    FileChangeType[FileChangeType["Created"] = 2] = "Created";
    FileChangeType[FileChangeType["Deleted"] = 3] = "Deleted";
})(FileChangeType || (FileChangeType = {}));
let FileSystemError = FileSystemError_1 = class FileSystemError extends Error {
    static FileExists(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileExists, FileSystemError_1.FileExists);
    }
    static FileNotFound(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileNotFound, FileSystemError_1.FileNotFound);
    }
    static FileNotADirectory(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileNotADirectory, FileSystemError_1.FileNotADirectory);
    }
    static FileIsADirectory(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.FileIsADirectory, FileSystemError_1.FileIsADirectory);
    }
    static NoPermissions(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.NoPermissions, FileSystemError_1.NoPermissions);
    }
    static Unavailable(messageOrUri) {
        return new FileSystemError_1(messageOrUri, FileSystemProviderErrorCode.Unavailable, FileSystemError_1.Unavailable);
    }
    constructor(uriOrMessage, code = FileSystemProviderErrorCode.Unknown, terminator) {
        super(URI.isUri(uriOrMessage) ? uriOrMessage.toString(true) : uriOrMessage);
        this.code = terminator?.name ?? 'Unknown';
        // mark the error as file system provider error so that
        // we can extract the error code on the receiving side
        markAsFileSystemProviderError(this, code);
        // workaround when extending builtin objects and when compiling to ES5, see:
        // https://github.com/microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, FileSystemError_1.prototype);
        if (typeof Error.captureStackTrace === 'function' && typeof terminator === 'function') {
            // nice stack traces
            Error.captureStackTrace(this, terminator);
        }
    }
};
FileSystemError = FileSystemError_1 = __decorate([
    es5ClassCompat
], FileSystemError);
export { FileSystemError };
//#endregion
//#region folding api
let FoldingRange = class FoldingRange {
    constructor(start, end, kind) {
        this.start = start;
        this.end = end;
        this.kind = kind;
    }
};
FoldingRange = __decorate([
    es5ClassCompat
], FoldingRange);
export { FoldingRange };
export var FoldingRangeKind;
(function (FoldingRangeKind) {
    FoldingRangeKind[FoldingRangeKind["Comment"] = 1] = "Comment";
    FoldingRangeKind[FoldingRangeKind["Imports"] = 2] = "Imports";
    FoldingRangeKind[FoldingRangeKind["Region"] = 3] = "Region";
})(FoldingRangeKind || (FoldingRangeKind = {}));
//#endregion
//#region Comment
export var CommentThreadCollapsibleState;
(function (CommentThreadCollapsibleState) {
    /**
     * Determines an item is collapsed
     */
    CommentThreadCollapsibleState[CommentThreadCollapsibleState["Collapsed"] = 0] = "Collapsed";
    /**
     * Determines an item is expanded
     */
    CommentThreadCollapsibleState[CommentThreadCollapsibleState["Expanded"] = 1] = "Expanded";
})(CommentThreadCollapsibleState || (CommentThreadCollapsibleState = {}));
export var CommentMode;
(function (CommentMode) {
    CommentMode[CommentMode["Editing"] = 0] = "Editing";
    CommentMode[CommentMode["Preview"] = 1] = "Preview";
})(CommentMode || (CommentMode = {}));
export var CommentState;
(function (CommentState) {
    CommentState[CommentState["Published"] = 0] = "Published";
    CommentState[CommentState["Draft"] = 1] = "Draft";
})(CommentState || (CommentState = {}));
export var CommentThreadState;
(function (CommentThreadState) {
    CommentThreadState[CommentThreadState["Unresolved"] = 0] = "Unresolved";
    CommentThreadState[CommentThreadState["Resolved"] = 1] = "Resolved";
})(CommentThreadState || (CommentThreadState = {}));
export var CommentThreadApplicability;
(function (CommentThreadApplicability) {
    CommentThreadApplicability[CommentThreadApplicability["Current"] = 0] = "Current";
    CommentThreadApplicability[CommentThreadApplicability["Outdated"] = 1] = "Outdated";
})(CommentThreadApplicability || (CommentThreadApplicability = {}));
export var CommentThreadFocus;
(function (CommentThreadFocus) {
    CommentThreadFocus[CommentThreadFocus["Reply"] = 1] = "Reply";
    CommentThreadFocus[CommentThreadFocus["Comment"] = 2] = "Comment";
})(CommentThreadFocus || (CommentThreadFocus = {}));
//#endregion
//#region Semantic Coloring
export class SemanticTokensLegend {
    constructor(tokenTypes, tokenModifiers = []) {
        this.tokenTypes = tokenTypes;
        this.tokenModifiers = tokenModifiers;
    }
}
function isStrArrayOrUndefined(arg) {
    return ((typeof arg === 'undefined') || isStringArray(arg));
}
export class SemanticTokensBuilder {
    constructor(legend) {
        this._prevLine = 0;
        this._prevChar = 0;
        this._dataIsSortedAndDeltaEncoded = true;
        this._data = [];
        this._dataLen = 0;
        this._tokenTypeStrToInt = new Map();
        this._tokenModifierStrToInt = new Map();
        this._hasLegend = false;
        if (legend) {
            this._hasLegend = true;
            for (let i = 0, len = legend.tokenTypes.length; i < len; i++) {
                this._tokenTypeStrToInt.set(legend.tokenTypes[i], i);
            }
            for (let i = 0, len = legend.tokenModifiers.length; i < len; i++) {
                this._tokenModifierStrToInt.set(legend.tokenModifiers[i], i);
            }
        }
    }
    push(arg0, arg1, arg2, arg3, arg4) {
        if (typeof arg0 === 'number' && typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'number' && (typeof arg4 === 'number' || typeof arg4 === 'undefined')) {
            if (typeof arg4 === 'undefined') {
                arg4 = 0;
            }
            // 1st overload
            return this._pushEncoded(arg0, arg1, arg2, arg3, arg4);
        }
        if (Range.isRange(arg0) && typeof arg1 === 'string' && isStrArrayOrUndefined(arg2)) {
            // 2nd overload
            return this._push(arg0, arg1, arg2);
        }
        throw illegalArgument();
    }
    _push(range, tokenType, tokenModifiers) {
        if (!this._hasLegend) {
            throw new Error('Legend must be provided in constructor');
        }
        if (range.start.line !== range.end.line) {
            throw new Error('`range` cannot span multiple lines');
        }
        if (!this._tokenTypeStrToInt.has(tokenType)) {
            throw new Error('`tokenType` is not in the provided legend');
        }
        const line = range.start.line;
        const char = range.start.character;
        const length = range.end.character - range.start.character;
        const nTokenType = this._tokenTypeStrToInt.get(tokenType);
        let nTokenModifiers = 0;
        if (tokenModifiers) {
            for (const tokenModifier of tokenModifiers) {
                if (!this._tokenModifierStrToInt.has(tokenModifier)) {
                    throw new Error('`tokenModifier` is not in the provided legend');
                }
                const nTokenModifier = this._tokenModifierStrToInt.get(tokenModifier);
                nTokenModifiers |= (1 << nTokenModifier) >>> 0;
            }
        }
        this._pushEncoded(line, char, length, nTokenType, nTokenModifiers);
    }
    _pushEncoded(line, char, length, tokenType, tokenModifiers) {
        if (this._dataIsSortedAndDeltaEncoded && (line < this._prevLine || (line === this._prevLine && char < this._prevChar))) {
            // push calls were ordered and are no longer ordered
            this._dataIsSortedAndDeltaEncoded = false;
            // Remove delta encoding from data
            const tokenCount = (this._data.length / 5) | 0;
            let prevLine = 0;
            let prevChar = 0;
            for (let i = 0; i < tokenCount; i++) {
                let line = this._data[5 * i];
                let char = this._data[5 * i + 1];
                if (line === 0) {
                    // on the same line as previous token
                    line = prevLine;
                    char += prevChar;
                }
                else {
                    // on a different line than previous token
                    line += prevLine;
                }
                this._data[5 * i] = line;
                this._data[5 * i + 1] = char;
                prevLine = line;
                prevChar = char;
            }
        }
        let pushLine = line;
        let pushChar = char;
        if (this._dataIsSortedAndDeltaEncoded && this._dataLen > 0) {
            pushLine -= this._prevLine;
            if (pushLine === 0) {
                pushChar -= this._prevChar;
            }
        }
        this._data[this._dataLen++] = pushLine;
        this._data[this._dataLen++] = pushChar;
        this._data[this._dataLen++] = length;
        this._data[this._dataLen++] = tokenType;
        this._data[this._dataLen++] = tokenModifiers;
        this._prevLine = line;
        this._prevChar = char;
    }
    static _sortAndDeltaEncode(data) {
        const pos = [];
        const tokenCount = (data.length / 5) | 0;
        for (let i = 0; i < tokenCount; i++) {
            pos[i] = i;
        }
        pos.sort((a, b) => {
            const aLine = data[5 * a];
            const bLine = data[5 * b];
            if (aLine === bLine) {
                const aChar = data[5 * a + 1];
                const bChar = data[5 * b + 1];
                return aChar - bChar;
            }
            return aLine - bLine;
        });
        const result = new Uint32Array(data.length);
        let prevLine = 0;
        let prevChar = 0;
        for (let i = 0; i < tokenCount; i++) {
            const srcOffset = 5 * pos[i];
            const line = data[srcOffset + 0];
            const char = data[srcOffset + 1];
            const length = data[srcOffset + 2];
            const tokenType = data[srcOffset + 3];
            const tokenModifiers = data[srcOffset + 4];
            const pushLine = line - prevLine;
            const pushChar = (pushLine === 0 ? char - prevChar : char);
            const dstOffset = 5 * i;
            result[dstOffset + 0] = pushLine;
            result[dstOffset + 1] = pushChar;
            result[dstOffset + 2] = length;
            result[dstOffset + 3] = tokenType;
            result[dstOffset + 4] = tokenModifiers;
            prevLine = line;
            prevChar = char;
        }
        return result;
    }
    build(resultId) {
        if (!this._dataIsSortedAndDeltaEncoded) {
            return new SemanticTokens(SemanticTokensBuilder._sortAndDeltaEncode(this._data), resultId);
        }
        return new SemanticTokens(new Uint32Array(this._data), resultId);
    }
}
export class SemanticTokens {
    constructor(data, resultId) {
        this.resultId = resultId;
        this.data = data;
    }
}
export class SemanticTokensEdit {
    constructor(start, deleteCount, data) {
        this.start = start;
        this.deleteCount = deleteCount;
        this.data = data;
    }
}
export class SemanticTokensEdits {
    constructor(edits, resultId) {
        this.resultId = resultId;
        this.edits = edits;
    }
}
//#endregion
//#region debug
export var DebugConsoleMode;
(function (DebugConsoleMode) {
    /**
     * Debug session should have a separate debug console.
     */
    DebugConsoleMode[DebugConsoleMode["Separate"] = 0] = "Separate";
    /**
     * Debug session should share debug console with its parent session.
     * This value has no effect for sessions which do not have a parent session.
     */
    DebugConsoleMode[DebugConsoleMode["MergeWithParent"] = 1] = "MergeWithParent";
})(DebugConsoleMode || (DebugConsoleMode = {}));
export class DebugVisualization {
    constructor(name) {
        this.name = name;
    }
}
//#endregion
export var QuickInputButtonLocation;
(function (QuickInputButtonLocation) {
    QuickInputButtonLocation[QuickInputButtonLocation["Title"] = 1] = "Title";
    QuickInputButtonLocation[QuickInputButtonLocation["Inline"] = 2] = "Inline";
    QuickInputButtonLocation[QuickInputButtonLocation["Input"] = 3] = "Input";
})(QuickInputButtonLocation || (QuickInputButtonLocation = {}));
let QuickInputButtons = class QuickInputButtons {
    static { this.Back = { iconPath: new ThemeIcon('arrow-left') }; }
    constructor() { }
};
QuickInputButtons = __decorate([
    es5ClassCompat
], QuickInputButtons);
export { QuickInputButtons };
export var QuickPickItemKind;
(function (QuickPickItemKind) {
    QuickPickItemKind[QuickPickItemKind["Separator"] = -1] = "Separator";
    QuickPickItemKind[QuickPickItemKind["Default"] = 0] = "Default";
})(QuickPickItemKind || (QuickPickItemKind = {}));
export var InputBoxValidationSeverity;
(function (InputBoxValidationSeverity) {
    InputBoxValidationSeverity[InputBoxValidationSeverity["Info"] = 1] = "Info";
    InputBoxValidationSeverity[InputBoxValidationSeverity["Warning"] = 2] = "Warning";
    InputBoxValidationSeverity[InputBoxValidationSeverity["Error"] = 3] = "Error";
})(InputBoxValidationSeverity || (InputBoxValidationSeverity = {}));
export var ExtensionKind;
(function (ExtensionKind) {
    ExtensionKind[ExtensionKind["UI"] = 1] = "UI";
    ExtensionKind[ExtensionKind["Workspace"] = 2] = "Workspace";
})(ExtensionKind || (ExtensionKind = {}));
export class FileDecoration {
    static validate(d) {
        if (typeof d.badge === 'string') {
            let len = nextCharLength(d.badge, 0);
            if (len < d.badge.length) {
                len += nextCharLength(d.badge, len);
            }
            if (d.badge.length > len) {
                throw new Error(`The 'badge'-property must be undefined or a short character`);
            }
        }
        else if (d.badge) {
            if (!ThemeIcon.isThemeIcon(d.badge)) {
                throw new Error(`The 'badge'-property is not a valid ThemeIcon`);
            }
        }
        if (!d.color && !d.badge && !d.tooltip) {
            throw new Error(`The decoration is empty`);
        }
        return true;
    }
    constructor(badge, tooltip, color) {
        this.badge = badge;
        this.tooltip = tooltip;
        this.color = color;
    }
}
//#region Theming
let ColorTheme = class ColorTheme {
    constructor(kind) {
        this.kind = kind;
    }
};
ColorTheme = __decorate([
    es5ClassCompat
], ColorTheme);
export { ColorTheme };
export var ColorThemeKind;
(function (ColorThemeKind) {
    ColorThemeKind[ColorThemeKind["Light"] = 1] = "Light";
    ColorThemeKind[ColorThemeKind["Dark"] = 2] = "Dark";
    ColorThemeKind[ColorThemeKind["HighContrast"] = 3] = "HighContrast";
    ColorThemeKind[ColorThemeKind["HighContrastLight"] = 4] = "HighContrastLight";
})(ColorThemeKind || (ColorThemeKind = {}));
//#endregion Theming
//#region Notebook
export class CellErrorStackFrame {
    /**
     * @param label The name of the stack frame
     * @param file The file URI of the stack frame
     * @param position The position of the stack frame within the file
     */
    constructor(label, uri, position) {
        this.label = label;
        this.uri = uri;
        this.position = position;
    }
}
export var NotebookCellExecutionState;
(function (NotebookCellExecutionState) {
    NotebookCellExecutionState[NotebookCellExecutionState["Idle"] = 1] = "Idle";
    NotebookCellExecutionState[NotebookCellExecutionState["Pending"] = 2] = "Pending";
    NotebookCellExecutionState[NotebookCellExecutionState["Executing"] = 3] = "Executing";
})(NotebookCellExecutionState || (NotebookCellExecutionState = {}));
export var NotebookCellStatusBarAlignment;
(function (NotebookCellStatusBarAlignment) {
    NotebookCellStatusBarAlignment[NotebookCellStatusBarAlignment["Left"] = 1] = "Left";
    NotebookCellStatusBarAlignment[NotebookCellStatusBarAlignment["Right"] = 2] = "Right";
})(NotebookCellStatusBarAlignment || (NotebookCellStatusBarAlignment = {}));
export var NotebookEditorRevealType;
(function (NotebookEditorRevealType) {
    NotebookEditorRevealType[NotebookEditorRevealType["Default"] = 0] = "Default";
    NotebookEditorRevealType[NotebookEditorRevealType["InCenter"] = 1] = "InCenter";
    NotebookEditorRevealType[NotebookEditorRevealType["InCenterIfOutsideViewport"] = 2] = "InCenterIfOutsideViewport";
    NotebookEditorRevealType[NotebookEditorRevealType["AtTop"] = 3] = "AtTop";
})(NotebookEditorRevealType || (NotebookEditorRevealType = {}));
export class NotebookCellStatusBarItem {
    constructor(text, alignment) {
        this.text = text;
        this.alignment = alignment;
    }
}
export var NotebookControllerAffinity;
(function (NotebookControllerAffinity) {
    NotebookControllerAffinity[NotebookControllerAffinity["Default"] = 1] = "Default";
    NotebookControllerAffinity[NotebookControllerAffinity["Preferred"] = 2] = "Preferred";
})(NotebookControllerAffinity || (NotebookControllerAffinity = {}));
export var NotebookControllerAffinity2;
(function (NotebookControllerAffinity2) {
    NotebookControllerAffinity2[NotebookControllerAffinity2["Default"] = 1] = "Default";
    NotebookControllerAffinity2[NotebookControllerAffinity2["Preferred"] = 2] = "Preferred";
    NotebookControllerAffinity2[NotebookControllerAffinity2["Hidden"] = -1] = "Hidden";
})(NotebookControllerAffinity2 || (NotebookControllerAffinity2 = {}));
export class NotebookRendererScript {
    constructor(uri, provides = []) {
        this.uri = uri;
        this.provides = asArray(provides);
    }
}
export class NotebookKernelSourceAction {
    constructor(label) {
        this.label = label;
    }
}
export var NotebookVariablesRequestKind;
(function (NotebookVariablesRequestKind) {
    NotebookVariablesRequestKind[NotebookVariablesRequestKind["Named"] = 1] = "Named";
    NotebookVariablesRequestKind[NotebookVariablesRequestKind["Indexed"] = 2] = "Indexed";
})(NotebookVariablesRequestKind || (NotebookVariablesRequestKind = {}));
//#endregion
//#region Timeline
let TimelineItem = class TimelineItem {
    constructor(label, timestamp) {
        this.label = label;
        this.timestamp = timestamp;
    }
};
TimelineItem = __decorate([
    es5ClassCompat
], TimelineItem);
export { TimelineItem };
//#endregion Timeline
//#region ExtensionContext
export var ExtensionMode;
(function (ExtensionMode) {
    /**
     * The extension is installed normally (for example, from the marketplace
     * or VSIX) in VS Code.
     */
    ExtensionMode[ExtensionMode["Production"] = 1] = "Production";
    /**
     * The extension is running from an `--extensionDevelopmentPath` provided
     * when launching VS Code.
     */
    ExtensionMode[ExtensionMode["Development"] = 2] = "Development";
    /**
     * The extension is running from an `--extensionDevelopmentPath` and
     * the extension host is running unit tests.
     */
    ExtensionMode[ExtensionMode["Test"] = 3] = "Test";
})(ExtensionMode || (ExtensionMode = {}));
export var ExtensionRuntime;
(function (ExtensionRuntime) {
    /**
     * The extension is running in a NodeJS extension host. Runtime access to NodeJS APIs is available.
     */
    ExtensionRuntime[ExtensionRuntime["Node"] = 1] = "Node";
    /**
     * The extension is running in a Webworker extension host. Runtime access is limited to Webworker APIs.
     */
    ExtensionRuntime[ExtensionRuntime["Webworker"] = 2] = "Webworker";
})(ExtensionRuntime || (ExtensionRuntime = {}));
//#endregion ExtensionContext
export var StandardTokenType;
(function (StandardTokenType) {
    StandardTokenType[StandardTokenType["Other"] = 0] = "Other";
    StandardTokenType[StandardTokenType["Comment"] = 1] = "Comment";
    StandardTokenType[StandardTokenType["String"] = 2] = "String";
    StandardTokenType[StandardTokenType["RegEx"] = 3] = "RegEx";
})(StandardTokenType || (StandardTokenType = {}));
export class LinkedEditingRanges {
    constructor(ranges, wordPattern) {
        this.ranges = ranges;
        this.wordPattern = wordPattern;
    }
}
//#region ports
export class PortAttributes {
    constructor(autoForwardAction) {
        this._autoForwardAction = autoForwardAction;
    }
    get autoForwardAction() {
        return this._autoForwardAction;
    }
}
//#endregion ports
//#region Testing
export var TestResultState;
(function (TestResultState) {
    TestResultState[TestResultState["Queued"] = 1] = "Queued";
    TestResultState[TestResultState["Running"] = 2] = "Running";
    TestResultState[TestResultState["Passed"] = 3] = "Passed";
    TestResultState[TestResultState["Failed"] = 4] = "Failed";
    TestResultState[TestResultState["Skipped"] = 5] = "Skipped";
    TestResultState[TestResultState["Errored"] = 6] = "Errored";
})(TestResultState || (TestResultState = {}));
export var TestRunProfileKind;
(function (TestRunProfileKind) {
    TestRunProfileKind[TestRunProfileKind["Run"] = 1] = "Run";
    TestRunProfileKind[TestRunProfileKind["Debug"] = 2] = "Debug";
    TestRunProfileKind[TestRunProfileKind["Coverage"] = 3] = "Coverage";
})(TestRunProfileKind || (TestRunProfileKind = {}));
export class TestRunProfileBase {
    constructor(controllerId, profileId, kind) {
        this.controllerId = controllerId;
        this.profileId = profileId;
        this.kind = kind;
    }
}
let TestRunRequest = class TestRunRequest {
    constructor(include = undefined, exclude = undefined, profile = undefined, continuous = false, preserveFocus = true) {
        this.include = include;
        this.exclude = exclude;
        this.profile = profile;
        this.continuous = continuous;
        this.preserveFocus = preserveFocus;
    }
};
TestRunRequest = __decorate([
    es5ClassCompat
], TestRunRequest);
export { TestRunRequest };
let TestMessage = TestMessage_1 = class TestMessage {
    static diff(message, expected, actual) {
        const msg = new TestMessage_1(message);
        msg.expectedOutput = expected;
        msg.actualOutput = actual;
        return msg;
    }
    constructor(message) {
        this.message = message;
    }
};
TestMessage = TestMessage_1 = __decorate([
    es5ClassCompat
], TestMessage);
export { TestMessage };
let TestTag = class TestTag {
    constructor(id) {
        this.id = id;
    }
};
TestTag = __decorate([
    es5ClassCompat
], TestTag);
export { TestTag };
export class TestMessageStackFrame {
    /**
     * @param label The name of the stack frame
     * @param file The file URI of the stack frame
     * @param position The position of the stack frame within the file
     */
    constructor(label, uri, position) {
        this.label = label;
        this.uri = uri;
        this.position = position;
    }
}
//#endregion
//#region Test Coverage
export class TestCoverageCount {
    constructor(covered, total) {
        this.covered = covered;
        this.total = total;
        validateTestCoverageCount(this);
    }
}
export function validateTestCoverageCount(cc) {
    if (!cc) {
        return;
    }
    if (cc.covered > cc.total) {
        throw new Error(`The total number of covered items (${cc.covered}) cannot be greater than the total (${cc.total})`);
    }
    if (cc.total < 0) {
        throw new Error(`The number of covered items (${cc.total}) cannot be negative`);
    }
}
export class FileCoverage {
    static fromDetails(uri, details) {
        const statements = new TestCoverageCount(0, 0);
        const branches = new TestCoverageCount(0, 0);
        const decl = new TestCoverageCount(0, 0);
        for (const detail of details) {
            if ('branches' in detail) {
                statements.total += 1;
                statements.covered += detail.executed ? 1 : 0;
                for (const branch of detail.branches) {
                    branches.total += 1;
                    branches.covered += branch.executed ? 1 : 0;
                }
            }
            else {
                decl.total += 1;
                decl.covered += detail.executed ? 1 : 0;
            }
        }
        const coverage = new FileCoverage(uri, statements, branches.total > 0 ? branches : undefined, decl.total > 0 ? decl : undefined);
        coverage.detailedCoverage = details;
        return coverage;
    }
    constructor(uri, statementCoverage, branchCoverage, declarationCoverage, includesTests = []) {
        this.uri = uri;
        this.statementCoverage = statementCoverage;
        this.branchCoverage = branchCoverage;
        this.declarationCoverage = declarationCoverage;
        this.includesTests = includesTests;
    }
}
export class StatementCoverage {
    // back compat until finalization:
    get executionCount() { return +this.executed; }
    set executionCount(n) { this.executed = n; }
    constructor(executed, location, branches = []) {
        this.executed = executed;
        this.location = location;
        this.branches = branches;
    }
}
export class BranchCoverage {
    // back compat until finalization:
    get executionCount() { return +this.executed; }
    set executionCount(n) { this.executed = n; }
    constructor(executed, location, label) {
        this.executed = executed;
        this.location = location;
        this.label = label;
    }
}
export class DeclarationCoverage {
    // back compat until finalization:
    get executionCount() { return +this.executed; }
    set executionCount(n) { this.executed = n; }
    constructor(name, executed, location) {
        this.name = name;
        this.executed = executed;
        this.location = location;
    }
}
//#endregion
export var ExternalUriOpenerPriority;
(function (ExternalUriOpenerPriority) {
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["None"] = 0] = "None";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Option"] = 1] = "Option";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Default"] = 2] = "Default";
    ExternalUriOpenerPriority[ExternalUriOpenerPriority["Preferred"] = 3] = "Preferred";
})(ExternalUriOpenerPriority || (ExternalUriOpenerPriority = {}));
export var WorkspaceTrustState;
(function (WorkspaceTrustState) {
    WorkspaceTrustState[WorkspaceTrustState["Untrusted"] = 0] = "Untrusted";
    WorkspaceTrustState[WorkspaceTrustState["Trusted"] = 1] = "Trusted";
    WorkspaceTrustState[WorkspaceTrustState["Unspecified"] = 2] = "Unspecified";
})(WorkspaceTrustState || (WorkspaceTrustState = {}));
export var PortAutoForwardAction;
(function (PortAutoForwardAction) {
    PortAutoForwardAction[PortAutoForwardAction["Notify"] = 1] = "Notify";
    PortAutoForwardAction[PortAutoForwardAction["OpenBrowser"] = 2] = "OpenBrowser";
    PortAutoForwardAction[PortAutoForwardAction["OpenPreview"] = 3] = "OpenPreview";
    PortAutoForwardAction[PortAutoForwardAction["Silent"] = 4] = "Silent";
    PortAutoForwardAction[PortAutoForwardAction["Ignore"] = 5] = "Ignore";
    PortAutoForwardAction[PortAutoForwardAction["OpenBrowserOnce"] = 6] = "OpenBrowserOnce";
})(PortAutoForwardAction || (PortAutoForwardAction = {}));
export class TypeHierarchyItem {
    constructor(kind, name, detail, uri, range, selectionRange) {
        this.kind = kind;
        this.name = name;
        this.detail = detail;
        this.uri = uri;
        this.range = range;
        this.selectionRange = selectionRange;
    }
}
//#region Tab Inputs
export class TextTabInput {
    constructor(uri) {
        this.uri = uri;
    }
}
export class TextDiffTabInput {
    constructor(original, modified) {
        this.original = original;
        this.modified = modified;
    }
}
export class TextMergeTabInput {
    constructor(base, input1, input2, result) {
        this.base = base;
        this.input1 = input1;
        this.input2 = input2;
        this.result = result;
    }
}
export class CustomEditorTabInput {
    constructor(uri, viewType) {
        this.uri = uri;
        this.viewType = viewType;
    }
}
export class WebviewEditorTabInput {
    constructor(viewType) {
        this.viewType = viewType;
    }
}
export class NotebookEditorTabInput {
    constructor(uri, notebookType) {
        this.uri = uri;
        this.notebookType = notebookType;
    }
}
export class NotebookDiffEditorTabInput {
    constructor(original, modified, notebookType) {
        this.original = original;
        this.modified = modified;
        this.notebookType = notebookType;
    }
}
export class TerminalEditorTabInput {
    constructor() { }
}
export class InteractiveWindowInput {
    constructor(uri, inputBoxUri) {
        this.uri = uri;
        this.inputBoxUri = inputBoxUri;
    }
}
export class ChatEditorTabInput {
    constructor() { }
}
export class TextMultiDiffTabInput {
    constructor(textDiffs) {
        this.textDiffs = textDiffs;
    }
}
//#endregion
//#region Chat
export var InteractiveSessionVoteDirection;
(function (InteractiveSessionVoteDirection) {
    InteractiveSessionVoteDirection[InteractiveSessionVoteDirection["Down"] = 0] = "Down";
    InteractiveSessionVoteDirection[InteractiveSessionVoteDirection["Up"] = 1] = "Up";
})(InteractiveSessionVoteDirection || (InteractiveSessionVoteDirection = {}));
export var ChatCopyKind;
(function (ChatCopyKind) {
    ChatCopyKind[ChatCopyKind["Action"] = 1] = "Action";
    ChatCopyKind[ChatCopyKind["Toolbar"] = 2] = "Toolbar";
})(ChatCopyKind || (ChatCopyKind = {}));
export var ChatVariableLevel;
(function (ChatVariableLevel) {
    ChatVariableLevel[ChatVariableLevel["Short"] = 1] = "Short";
    ChatVariableLevel[ChatVariableLevel["Medium"] = 2] = "Medium";
    ChatVariableLevel[ChatVariableLevel["Full"] = 3] = "Full";
})(ChatVariableLevel || (ChatVariableLevel = {}));
export class ChatCompletionItem {
    constructor(id, label, values) {
        this.id = id;
        this.label = label;
        this.values = values;
    }
}
export var ChatEditingSessionActionOutcome;
(function (ChatEditingSessionActionOutcome) {
    ChatEditingSessionActionOutcome[ChatEditingSessionActionOutcome["Accepted"] = 1] = "Accepted";
    ChatEditingSessionActionOutcome[ChatEditingSessionActionOutcome["Rejected"] = 2] = "Rejected";
    ChatEditingSessionActionOutcome[ChatEditingSessionActionOutcome["Saved"] = 3] = "Saved";
})(ChatEditingSessionActionOutcome || (ChatEditingSessionActionOutcome = {}));
export var ChatRequestEditedFileEventKind;
(function (ChatRequestEditedFileEventKind) {
    ChatRequestEditedFileEventKind[ChatRequestEditedFileEventKind["Keep"] = 1] = "Keep";
    ChatRequestEditedFileEventKind[ChatRequestEditedFileEventKind["Undo"] = 2] = "Undo";
    ChatRequestEditedFileEventKind[ChatRequestEditedFileEventKind["UserModification"] = 3] = "UserModification";
})(ChatRequestEditedFileEventKind || (ChatRequestEditedFileEventKind = {}));
//#endregion
//#region Interactive Editor
export var InteractiveEditorResponseFeedbackKind;
(function (InteractiveEditorResponseFeedbackKind) {
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Unhelpful"] = 0] = "Unhelpful";
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Helpful"] = 1] = "Helpful";
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Undone"] = 2] = "Undone";
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Accepted"] = 3] = "Accepted";
    InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Bug"] = 4] = "Bug";
})(InteractiveEditorResponseFeedbackKind || (InteractiveEditorResponseFeedbackKind = {}));
export var ChatResultFeedbackKind;
(function (ChatResultFeedbackKind) {
    ChatResultFeedbackKind[ChatResultFeedbackKind["Unhelpful"] = 0] = "Unhelpful";
    ChatResultFeedbackKind[ChatResultFeedbackKind["Helpful"] = 1] = "Helpful";
})(ChatResultFeedbackKind || (ChatResultFeedbackKind = {}));
export class ChatResponseMarkdownPart {
    constructor(value) {
        if (typeof value !== 'string' && value.isTrusted === true) {
            throw new Error('The boolean form of MarkdownString.isTrusted is NOT supported for chat participants.');
        }
        this.value = typeof value === 'string' ? new MarkdownString(value) : value;
    }
}
/**
 * TODO if 'vulnerabilities' is finalized, this should be merged with the base ChatResponseMarkdownPart. I just don't see how to do that while keeping
 * vulnerabilities in a seperate API proposal in a clean way.
 */
export class ChatResponseMarkdownWithVulnerabilitiesPart {
    constructor(value, vulnerabilities) {
        if (typeof value !== 'string' && value.isTrusted === true) {
            throw new Error('The boolean form of MarkdownString.isTrusted is NOT supported for chat participants.');
        }
        this.value = typeof value === 'string' ? new MarkdownString(value) : value;
        this.vulnerabilities = vulnerabilities;
    }
}
export class ChatResponseConfirmationPart {
    constructor(title, message, data, buttons) {
        this.title = title;
        this.message = message;
        this.data = data;
        this.buttons = buttons;
    }
}
export class ChatResponseFileTreePart {
    constructor(value, baseUri) {
        this.value = value;
        this.baseUri = baseUri;
    }
}
export class ChatResponseMultiDiffPart {
    constructor(value, title, readOnly) {
        this.value = value;
        this.title = title;
        this.readOnly = readOnly;
    }
}
export class ChatResponseExternalEditPart {
    constructor(uris, callback) {
        this.uris = uris;
        this.callback = callback;
        this.applied = new Promise((resolve) => {
            this.didGetApplied = resolve;
        });
    }
}
export class ChatResponseAnchorPart {
    constructor(value, title) {
        // eslint-disable-next-line local/code-no-any-casts
        this.value = value;
        this.value2 = value;
        this.title = title;
    }
}
export class ChatResponseProgressPart {
    constructor(value) {
        this.value = value;
    }
}
export class ChatResponseProgressPart2 {
    constructor(value, task) {
        this.value = value;
        this.task = task;
    }
}
export class ChatResponseThinkingProgressPart {
    constructor(value, id, metadata) {
        this.value = value;
        this.id = id;
        this.metadata = metadata;
    }
}
export class ChatResponseWarningPart {
    constructor(value) {
        if (typeof value !== 'string' && value.isTrusted === true) {
            throw new Error('The boolean form of MarkdownString.isTrusted is NOT supported for chat participants.');
        }
        this.value = typeof value === 'string' ? new MarkdownString(value) : value;
    }
}
export class ChatResponseCommandButtonPart {
    constructor(value) {
        this.value = value;
    }
}
export class ChatResponseReferencePart {
    constructor(value, iconPath, options) {
        this.value = value;
        this.iconPath = iconPath;
        this.options = options;
    }
}
export class ChatResponseCodeblockUriPart {
    constructor(value, isEdit) {
        this.value = value;
        this.isEdit = isEdit;
    }
}
export class ChatResponseCodeCitationPart {
    constructor(value, license, snippet) {
        this.value = value;
        this.license = license;
        this.snippet = snippet;
    }
}
export class ChatResponseMovePart {
    constructor(uri, range) {
        this.uri = uri;
        this.range = range;
    }
}
export class ChatResponseExtensionsPart {
    constructor(extensions) {
        this.extensions = extensions;
    }
}
export class ChatResponsePullRequestPart {
    constructor(uri, title, description, author, linkTag) {
        this.uri = uri;
        this.title = title;
        this.description = description;
        this.author = author;
        this.linkTag = linkTag;
    }
    toJSON() {
        return {
            $mid: 26 /* MarshalledId.ChatResponsePullRequestPart */,
            uri: this.uri,
            title: this.title,
            description: this.description,
            author: this.author
        };
    }
}
export class ChatResponseTextEditPart {
    constructor(uri, editsOrDone) {
        this.uri = uri;
        if (editsOrDone === true) {
            this.isDone = true;
            this.edits = [];
        }
        else {
            this.edits = Array.isArray(editsOrDone) ? editsOrDone : [editsOrDone];
        }
    }
}
export class ChatResponseNotebookEditPart {
    constructor(uri, editsOrDone) {
        this.uri = uri;
        if (editsOrDone === true) {
            this.isDone = true;
            this.edits = [];
        }
        else {
            this.edits = Array.isArray(editsOrDone) ? editsOrDone : [editsOrDone];
        }
    }
}
export class ChatPrepareToolInvocationPart {
    /**
     * @param toolName The name of the tool being prepared for invocation.
     */
    constructor(toolName) {
        this.toolName = toolName;
    }
}
export class ChatToolInvocationPart {
    constructor(toolName, toolCallId, isError) {
        this.toolName = toolName;
        this.toolCallId = toolCallId;
        this.isError = isError;
    }
}
export class ChatRequestTurn {
    constructor(prompt, command, references, participant, toolReferences, editedFileEvents) {
        this.prompt = prompt;
        this.command = command;
        this.references = references;
        this.participant = participant;
        this.toolReferences = toolReferences;
        this.editedFileEvents = editedFileEvents;
    }
}
export class ChatResponseTurn {
    constructor(response, result, participant, command) {
        this.response = response;
        this.result = result;
        this.participant = participant;
        this.command = command;
    }
}
export class ChatResponseTurn2 {
    constructor(response, result, participant, command) {
        this.response = response;
        this.result = result;
        this.participant = participant;
        this.command = command;
    }
}
export var ChatLocation;
(function (ChatLocation) {
    ChatLocation[ChatLocation["Panel"] = 1] = "Panel";
    ChatLocation[ChatLocation["Terminal"] = 2] = "Terminal";
    ChatLocation[ChatLocation["Notebook"] = 3] = "Notebook";
    ChatLocation[ChatLocation["Editor"] = 4] = "Editor";
})(ChatLocation || (ChatLocation = {}));
export var ChatSessionStatus;
(function (ChatSessionStatus) {
    ChatSessionStatus[ChatSessionStatus["Failed"] = 0] = "Failed";
    ChatSessionStatus[ChatSessionStatus["Completed"] = 1] = "Completed";
    ChatSessionStatus[ChatSessionStatus["InProgress"] = 2] = "InProgress";
})(ChatSessionStatus || (ChatSessionStatus = {}));
export var ChatResponseReferencePartStatusKind;
(function (ChatResponseReferencePartStatusKind) {
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Complete"] = 1] = "Complete";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Partial"] = 2] = "Partial";
    ChatResponseReferencePartStatusKind[ChatResponseReferencePartStatusKind["Omitted"] = 3] = "Omitted";
})(ChatResponseReferencePartStatusKind || (ChatResponseReferencePartStatusKind = {}));
export var ChatResponseClearToPreviousToolInvocationReason;
(function (ChatResponseClearToPreviousToolInvocationReason) {
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["NoReason"] = 0] = "NoReason";
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["FilteredContentRetry"] = 1] = "FilteredContentRetry";
    ChatResponseClearToPreviousToolInvocationReason[ChatResponseClearToPreviousToolInvocationReason["CopyrightContentRetry"] = 2] = "CopyrightContentRetry";
})(ChatResponseClearToPreviousToolInvocationReason || (ChatResponseClearToPreviousToolInvocationReason = {}));
export class ChatRequestEditorData {
    constructor(document, selection, wholeRange) {
        this.document = document;
        this.selection = selection;
        this.wholeRange = wholeRange;
    }
}
export class ChatRequestNotebookData {
    constructor(cell) {
        this.cell = cell;
    }
}
export class ChatReferenceBinaryData {
    constructor(mimeType, data, reference) {
        this.mimeType = mimeType;
        this.data = data;
        this.reference = reference;
    }
}
export class ChatReferenceDiagnostic {
    constructor(diagnostics) {
        this.diagnostics = diagnostics;
    }
}
export var LanguageModelChatMessageRole;
(function (LanguageModelChatMessageRole) {
    LanguageModelChatMessageRole[LanguageModelChatMessageRole["User"] = 1] = "User";
    LanguageModelChatMessageRole[LanguageModelChatMessageRole["Assistant"] = 2] = "Assistant";
    LanguageModelChatMessageRole[LanguageModelChatMessageRole["System"] = 3] = "System";
})(LanguageModelChatMessageRole || (LanguageModelChatMessageRole = {}));
export class LanguageModelToolResultPart {
    constructor(callId, content, isError) {
        this.callId = callId;
        this.content = content;
        this.isError = isError ?? false;
    }
}
export var ChatErrorLevel;
(function (ChatErrorLevel) {
    ChatErrorLevel[ChatErrorLevel["Info"] = 0] = "Info";
    ChatErrorLevel[ChatErrorLevel["Warning"] = 1] = "Warning";
    ChatErrorLevel[ChatErrorLevel["Error"] = 2] = "Error";
})(ChatErrorLevel || (ChatErrorLevel = {}));
export class LanguageModelChatMessage {
    static User(content, name) {
        return new LanguageModelChatMessage(LanguageModelChatMessageRole.User, content, name);
    }
    static Assistant(content, name) {
        return new LanguageModelChatMessage(LanguageModelChatMessageRole.Assistant, content, name);
    }
    set content(value) {
        if (typeof value === 'string') {
            // we changed this and still support setting content with a string property. this keep the API runtime stable
            // despite the breaking change in the type definition.
            this._content = [new LanguageModelTextPart(value)];
        }
        else {
            this._content = value;
        }
    }
    get content() {
        return this._content;
    }
    constructor(role, content, name) {
        this._content = [];
        this.role = role;
        this.content = content;
        this.name = name;
    }
}
export class LanguageModelChatMessage2 {
    static User(content, name) {
        return new LanguageModelChatMessage2(LanguageModelChatMessageRole.User, content, name);
    }
    static Assistant(content, name) {
        return new LanguageModelChatMessage2(LanguageModelChatMessageRole.Assistant, content, name);
    }
    set content(value) {
        if (typeof value === 'string') {
            // we changed this and still support setting content with a string property. this keep the API runtime stable
            // despite the breaking change in the type definition.
            this._content = [new LanguageModelTextPart(value)];
        }
        else {
            this._content = value;
        }
    }
    get content() {
        return this._content;
    }
    // Temp to avoid breaking changes
    set content2(value) {
        if (value) {
            this.content = value.map(part => {
                if (typeof part === 'string') {
                    return new LanguageModelTextPart(part);
                }
                return part;
            });
        }
    }
    get content2() {
        return this.content.map(part => {
            if (part instanceof LanguageModelTextPart) {
                return part.value;
            }
            return part;
        });
    }
    constructor(role, content, name) {
        this._content = [];
        this.role = role;
        this.content = content;
        this.name = name;
    }
}
export class LanguageModelToolCallPart {
    constructor(callId, name, input) {
        this.callId = callId;
        this.name = name;
        this.input = input;
    }
}
export var LanguageModelPartAudience;
(function (LanguageModelPartAudience) {
    LanguageModelPartAudience[LanguageModelPartAudience["Assistant"] = 0] = "Assistant";
    LanguageModelPartAudience[LanguageModelPartAudience["User"] = 1] = "User";
    LanguageModelPartAudience[LanguageModelPartAudience["Extension"] = 2] = "Extension";
})(LanguageModelPartAudience || (LanguageModelPartAudience = {}));
export class LanguageModelTextPart {
    constructor(value, audience) {
        this.value = value;
        audience = audience;
    }
    toJSON() {
        return {
            $mid: 21 /* MarshalledId.LanguageModelTextPart */,
            value: this.value,
            audience: this.audience,
        };
    }
}
export class LanguageModelDataPart {
    constructor(data, mimeType, audience) {
        this.mimeType = mimeType;
        this.data = data;
        this.audience = audience;
    }
    static image(data, mimeType) {
        return new LanguageModelDataPart(data, mimeType);
    }
    static json(value, mime = 'text/x-json') {
        const rawStr = JSON.stringify(value, undefined, '\t');
        return new LanguageModelDataPart(VSBuffer.fromString(rawStr).buffer, mime);
    }
    static text(value, mime = Mimes.text) {
        return new LanguageModelDataPart(VSBuffer.fromString(value).buffer, mime);
    }
    toJSON() {
        return {
            $mid: 24 /* MarshalledId.LanguageModelDataPart */,
            mimeType: this.mimeType,
            data: this.data,
            audience: this.audience
        };
    }
}
export var ChatImageMimeType;
(function (ChatImageMimeType) {
    ChatImageMimeType["PNG"] = "image/png";
    ChatImageMimeType["JPEG"] = "image/jpeg";
    ChatImageMimeType["GIF"] = "image/gif";
    ChatImageMimeType["WEBP"] = "image/webp";
    ChatImageMimeType["BMP"] = "image/bmp";
})(ChatImageMimeType || (ChatImageMimeType = {}));
export class LanguageModelThinkingPart {
    constructor(value, id, metadata) {
        this.value = value;
        this.id = id;
        this.metadata = metadata;
    }
    toJSON() {
        return {
            $mid: 22 /* MarshalledId.LanguageModelThinkingPart */,
            value: this.value,
            id: this.id,
            metadata: this.metadata,
        };
    }
}
export class LanguageModelPromptTsxPart {
    constructor(value) {
        this.value = value;
    }
    toJSON() {
        return {
            $mid: 23 /* MarshalledId.LanguageModelPromptTsxPart */,
            value: this.value,
        };
    }
}
/**
 * @deprecated
 */
export class LanguageModelChatSystemMessage {
    constructor(content) {
        this.content = content;
    }
}
/**
 * @deprecated
 */
export class LanguageModelChatUserMessage {
    constructor(content, name) {
        this.content = content;
        this.name = name;
    }
}
/**
 * @deprecated
 */
export class LanguageModelChatAssistantMessage {
    constructor(content, name) {
        this.content = content;
        this.name = name;
    }
}
export class LanguageModelError extends Error {
    static #name = 'LanguageModelError';
    static NotFound(message) {
        return new LanguageModelError(message, LanguageModelError.NotFound.name);
    }
    static NoPermissions(message) {
        return new LanguageModelError(message, LanguageModelError.NoPermissions.name);
    }
    static Blocked(message) {
        return new LanguageModelError(message, LanguageModelError.Blocked.name);
    }
    static tryDeserialize(data) {
        if (data.name !== LanguageModelError.#name) {
            return undefined;
        }
        return new LanguageModelError(data.message, data.code, data.cause);
    }
    constructor(message, code, cause) {
        super(message, { cause });
        this.name = LanguageModelError.#name;
        this.code = code ?? '';
    }
}
export class LanguageModelToolResult {
    constructor(content) {
        this.content = content;
    }
    toJSON() {
        return {
            $mid: 20 /* MarshalledId.LanguageModelToolResult */,
            content: this.content,
        };
    }
}
export class LanguageModelToolResult2 {
    constructor(content) {
        this.content = content;
    }
    toJSON() {
        return {
            $mid: 20 /* MarshalledId.LanguageModelToolResult */,
            content: this.content,
        };
    }
}
export class ExtendedLanguageModelToolResult extends LanguageModelToolResult {
}
export var LanguageModelChatToolMode;
(function (LanguageModelChatToolMode) {
    LanguageModelChatToolMode[LanguageModelChatToolMode["Auto"] = 1] = "Auto";
    LanguageModelChatToolMode[LanguageModelChatToolMode["Required"] = 2] = "Required";
})(LanguageModelChatToolMode || (LanguageModelChatToolMode = {}));
export class LanguageModelToolExtensionSource {
    constructor(id, label) {
        this.id = id;
        this.label = label;
    }
}
export class LanguageModelToolMCPSource {
    constructor(label, name, instructions) {
        this.label = label;
        this.name = name;
        this.instructions = instructions;
    }
}
//#endregion
//#region ai
export var RelatedInformationType;
(function (RelatedInformationType) {
    RelatedInformationType[RelatedInformationType["SymbolInformation"] = 1] = "SymbolInformation";
    RelatedInformationType[RelatedInformationType["CommandInformation"] = 2] = "CommandInformation";
    RelatedInformationType[RelatedInformationType["SearchInformation"] = 3] = "SearchInformation";
    RelatedInformationType[RelatedInformationType["SettingInformation"] = 4] = "SettingInformation";
})(RelatedInformationType || (RelatedInformationType = {}));
export var SettingsSearchResultKind;
(function (SettingsSearchResultKind) {
    SettingsSearchResultKind[SettingsSearchResultKind["EMBEDDED"] = 1] = "EMBEDDED";
    SettingsSearchResultKind[SettingsSearchResultKind["LLM_RANKED"] = 2] = "LLM_RANKED";
    SettingsSearchResultKind[SettingsSearchResultKind["CANCELED"] = 3] = "CANCELED";
})(SettingsSearchResultKind || (SettingsSearchResultKind = {}));
//#endregion
//#region Speech
export var SpeechToTextStatus;
(function (SpeechToTextStatus) {
    SpeechToTextStatus[SpeechToTextStatus["Started"] = 1] = "Started";
    SpeechToTextStatus[SpeechToTextStatus["Recognizing"] = 2] = "Recognizing";
    SpeechToTextStatus[SpeechToTextStatus["Recognized"] = 3] = "Recognized";
    SpeechToTextStatus[SpeechToTextStatus["Stopped"] = 4] = "Stopped";
    SpeechToTextStatus[SpeechToTextStatus["Error"] = 5] = "Error";
})(SpeechToTextStatus || (SpeechToTextStatus = {}));
export var TextToSpeechStatus;
(function (TextToSpeechStatus) {
    TextToSpeechStatus[TextToSpeechStatus["Started"] = 1] = "Started";
    TextToSpeechStatus[TextToSpeechStatus["Stopped"] = 2] = "Stopped";
    TextToSpeechStatus[TextToSpeechStatus["Error"] = 3] = "Error";
})(TextToSpeechStatus || (TextToSpeechStatus = {}));
export var KeywordRecognitionStatus;
(function (KeywordRecognitionStatus) {
    KeywordRecognitionStatus[KeywordRecognitionStatus["Recognized"] = 1] = "Recognized";
    KeywordRecognitionStatus[KeywordRecognitionStatus["Stopped"] = 2] = "Stopped";
})(KeywordRecognitionStatus || (KeywordRecognitionStatus = {}));
//#endregion
//#region MCP
export var McpToolAvailability;
(function (McpToolAvailability) {
    McpToolAvailability[McpToolAvailability["Initial"] = 0] = "Initial";
    McpToolAvailability[McpToolAvailability["Dynamic"] = 1] = "Dynamic";
})(McpToolAvailability || (McpToolAvailability = {}));
export class McpStdioServerDefinition {
    constructor(label, command, args, env = {}, version, metadata) {
        this.label = label;
        this.command = command;
        this.args = args;
        this.env = env;
        this.version = version;
        this.metadata = metadata;
    }
}
export class McpHttpServerDefinition {
    constructor(label, uri, headers = {}, version, metadata, authentication) {
        this.label = label;
        this.uri = uri;
        this.headers = headers;
        this.version = version;
        this.metadata = metadata;
        this.authentication = authentication;
    }
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7OztBQUtoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQW1CLE1BQU0sZ0NBQWdDLENBQUM7QUFHbEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDNUYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUU1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQXlCLE1BQU0sbURBQW1ELENBQUM7QUFDL0csT0FBTyxFQUFFLDJCQUEyQixFQUFFLDZCQUE2QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckgsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFJOUcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUVsRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFNaEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtD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