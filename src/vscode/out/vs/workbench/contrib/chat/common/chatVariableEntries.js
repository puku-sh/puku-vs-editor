/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { basename } from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { isLocation } from '../../../../editor/common/languages.js';
import { localize } from '../../../../nls.js';
export var OmittedState;
(function (OmittedState) {
    OmittedState[OmittedState["NotOmitted"] = 0] = "NotOmitted";
    OmittedState[OmittedState["Partial"] = 1] = "Partial";
    OmittedState[OmittedState["Full"] = 2] = "Full";
})(OmittedState || (OmittedState = {}));
export var IDiagnosticVariableEntryFilterData;
(function (IDiagnosticVariableEntryFilterData) {
    IDiagnosticVariableEntryFilterData.icon = Codicon.error;
    function fromMarker(marker) {
        return {
            filterUri: marker.resource,
            owner: marker.owner,
            problemMessage: marker.message,
            filterRange: { startLineNumber: marker.startLineNumber, endLineNumber: marker.endLineNumber, startColumn: marker.startColumn, endColumn: marker.endColumn }
        };
    }
    IDiagnosticVariableEntryFilterData.fromMarker = fromMarker;
    function toEntry(data) {
        return {
            id: id(data),
            name: label(data),
            icon: IDiagnosticVariableEntryFilterData.icon,
            value: data,
            kind: 'diagnostic',
            ...data,
        };
    }
    IDiagnosticVariableEntryFilterData.toEntry = toEntry;
    function id(data) {
        return [data.filterUri, data.owner, data.filterSeverity, data.filterRange?.startLineNumber, data.filterRange?.startColumn].join(':');
    }
    IDiagnosticVariableEntryFilterData.id = id;
    function label(data) {
        let TrimThreshold;
        (function (TrimThreshold) {
            TrimThreshold[TrimThreshold["MaxChars"] = 30] = "MaxChars";
            TrimThreshold[TrimThreshold["MaxSpaceLookback"] = 10] = "MaxSpaceLookback";
        })(TrimThreshold || (TrimThreshold = {}));
        if (data.problemMessage) {
            if (data.problemMessage.length < 30 /* TrimThreshold.MaxChars */) {
                return data.problemMessage;
            }
            // Trim the message, on a space if it would not lose too much
            // data (MaxSpaceLookback) or just blindly otherwise.
            const lastSpace = data.problemMessage.lastIndexOf(' ', 30 /* TrimThreshold.MaxChars */);
            if (lastSpace === -1 || lastSpace + 10 /* TrimThreshold.MaxSpaceLookback */ < 30 /* TrimThreshold.MaxChars */) {
                return data.problemMessage.substring(0, 30 /* TrimThreshold.MaxChars */) + '…';
            }
            return data.problemMessage.substring(0, lastSpace) + '…';
        }
        let labelStr = localize('chat.attachment.problems.all', "All Problems");
        if (data.filterUri) {
            labelStr = localize('chat.attachment.problems.inFile', "Problems in {0}", basename(data.filterUri));
        }
        return labelStr;
    }
    IDiagnosticVariableEntryFilterData.label = label;
})(IDiagnosticVariableEntryFilterData || (IDiagnosticVariableEntryFilterData = {}));
export var IChatRequestVariableEntry;
(function (IChatRequestVariableEntry) {
    /**
     * Returns URI of the passed variant entry. Return undefined if not found.
     */
    function toUri(entry) {
        return URI.isUri(entry.value)
            ? entry.value
            : isLocation(entry.value)
                ? entry.value.uri
                : undefined;
    }
    IChatRequestVariableEntry.toUri = toUri;
})(IChatRequestVariableEntry || (IChatRequestVariableEntry = {}));
export function isImplicitVariableEntry(obj) {
    return obj.kind === 'implicit';
}
export function isStringVariableEntry(obj) {
    return obj.kind === 'string';
}
export function isTerminalVariableEntry(obj) {
    return obj.kind === 'terminalCommand';
}
export function isPasteVariableEntry(obj) {
    return obj.kind === 'paste';
}
export function isWorkspaceVariableEntry(obj) {
    return obj.kind === 'workspace';
}
export function isImageVariableEntry(obj) {
    return obj.kind === 'image';
}
export function isNotebookOutputVariableEntry(obj) {
    return obj.kind === 'notebookOutput';
}
export function isElementVariableEntry(obj) {
    return obj.kind === 'element';
}
export function isDiagnosticsVariableEntry(obj) {
    return obj.kind === 'diagnostic';
}
export function isChatRequestFileEntry(obj) {
    return obj.kind === 'file';
}
export function isPromptFileVariableEntry(obj) {
    return obj.kind === 'promptFile';
}
export function isPromptTextVariableEntry(obj) {
    return obj.kind === 'promptText';
}
export function isChatRequestVariableEntry(obj) {
    const entry = obj;
    return typeof entry === 'object' &&
        entry !== null &&
        typeof entry.id === 'string' &&
        typeof entry.name === 'string';
}
export function isSCMHistoryItemVariableEntry(obj) {
    return obj.kind === 'scmHistoryItem';
}
export function isSCMHistoryItemChangeVariableEntry(obj) {
    return obj.kind === 'scmHistoryItemChange';
}
export function isSCMHistoryItemChangeRangeVariableEntry(obj) {
    return obj.kind === 'scmHistoryItemChangeRange';
}
export function isStringImplicitContextValue(value) {
    const asStringImplicitContextValue = value;
    return (typeof asStringImplicitContextValue === 'object' &&
        asStringImplicitContextValue !== null &&
        (typeof asStringImplicitContextValue.value === 'string' || typeof asStringImplicitContextValue.value === 'undefined') &&
        typeof asStringImplicitContextValue.name === 'string' &&
        ThemeIcon.isThemeIcon(asStringImplicitContextValue.icon) &&
        URI.isUri(asStringImplicitContextValue.uri));
}
export var PromptFileVariableKind;
(function (PromptFileVariableKind) {
    PromptFileVariableKind["Instruction"] = "vscode.prompt.instructions.root";
    PromptFileVariableKind["InstructionReference"] = "vscode.prompt.instructions";
    PromptFileVariableKind["PromptFile"] = "vscode.prompt.file";
})(PromptFileVariableKind || (PromptFileVariableKind = {}));
/**
 * Utility to convert a {@link uri} to a chat variable entry.
 * The `id` of the chat variable can be one of the following:
 *
 * - `vscode.prompt.instructions__<URI>`: for all non-root prompt instructions references
 * - `vscode.prompt.instructions.root__<URI>`: for *root* prompt instructions references
 * - `vscode.prompt.file__<URI>`: for prompt file references
 *
 * @param uri A resource URI that points to a prompt instructions file.
 * @param kind The kind of the prompt file variable entry.
 */
export function toPromptFileVariableEntry(uri, kind, originLabel, automaticallyAdded = false, toolReferences) {
    //  `id` for all `prompt files` starts with the well-defined part that the copilot extension(or other chatbot) can rely on
    return {
        id: `${kind}__${uri.toString()}`,
        name: `prompt:${basename(uri)}`,
        value: uri,
        kind: 'promptFile',
        modelDescription: 'Prompt instructions file',
        isRoot: kind !== PromptFileVariableKind.InstructionReference,
        originLabel,
        toolReferences,
        automaticallyAdded
    };
}
export function toPromptTextVariableEntry(content, automaticallyAdded = false, toolReferences) {
    return {
        id: `vscode.prompt.instructions.text`,
        name: `prompt:instructionsList`,
        value: content,
        kind: 'promptText',
        modelDescription: 'Prompt instructions list',
        automaticallyAdded,
        toolReferences
    };
}
export function toFileVariableEntry(uri, range) {
    return {
        kind: 'file',
        value: range ? { uri, range } : uri,
        id: uri.toString() + (range?.toString() ?? ''),
        name: basename(uri),
    };
}
export function toToolVariableEntry(entry, range) {
    return {
        kind: 'tool',
        id: entry.id,
        icon: ThemeIcon.isThemeIcon(entry.icon) ? entry.icon : undefined,
        name: entry.displayName,
        value: undefined,
        range
    };
}
export function toToolSetVariableEntry(entry, range) {
    return {
        kind: 'toolset',
        id: entry.id,
        icon: entry.icon,
        name: entry.referenceName,
        value: Array.from(entry.getTools()).map(t => toToolVariableEntry(t)),
        range
    };
}
export class ChatRequestVariableSet {
    constructor(entries) {
        this._ids = new Set();
        this._entries = [];
        if (entries) {
            this.add(...entries);
        }
    }
    add(...entry) {
        for (const e of entry) {
            if (!this._ids.has(e.id)) {
                this._ids.add(e.id);
                this._entries.push(e);
            }
        }
    }
    insertFirst(entry) {
        if (!this._ids.has(entry.id)) {
            this._ids.add(entry.id);
            this._entries.unshift(entry);
        }
    }
    remove(entry) {
        this._ids.delete(entry.id);
        this._entries = this._entries.filter(e => e.id !== entry.id);
    }
    has(entry) {
        return this._ids.has(entry.id);
    }
    asArray() {
        return this._entries.slice(0); // return a copy
    }
    get length() {
        return this._entries.length;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZhcmlhYmxlRW50cmllcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRWYXJpYWJsZUVudHJpZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3JELE9BQU8sRUFBRSxVQUFVLEVBQXdCLE1BQU0sd0NBQXdDLENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBc0M5QyxNQUFNLENBQU4sSUFBa0IsWUFJakI7QUFKRCxXQUFrQixZQUFZO0lBQzdCLDJEQUFVLENBQUE7SUFDVixxREFBTyxDQUFBO0lBQ1AsK0NBQUksQ0FBQTtBQUNMLENBQUMsRUFKaUIsWUFBWSxLQUFaLFlBQVksUUFJN0I7QUE4RkQsTUFBTSxLQUFXLGtDQUFrQyxDQW9EbEQ7QUFwREQsV0FBaUIsa0NBQWtDO0lBQ3JDLHVDQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztJQUVsQyxTQUFnQixVQUFVLENBQUMsTUFBZTtRQUN6QyxPQUFPO1lBQ04sU0FBUyxFQUFFLE1BQU0sQ0FBQyxRQUFRO1lBQzFCLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSztZQUNuQixjQUFjLEVBQUUsTUFBTSxDQUFDLE9BQU87WUFDOUIsV0FBVyxFQUFFLEVBQUUsZUFBZSxFQUFFLE1BQU0sQ0FBQyxlQUFlLEVBQUUsYUFBYSxFQUFFLE1B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