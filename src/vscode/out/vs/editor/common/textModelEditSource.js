/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { sumBy } from '../../base/common/arrays.js';
import { prefixedUuid } from '../../base/common/uuid.js';
import { LineEdit } from './core/edits/lineEdit.js';
import { TextLength } from './core/text/textLength.js';
const privateSymbol = Symbol('TextModelEditSource');
export class TextModelEditSource {
    constructor(metadata, _privateCtorGuard) {
        this.metadata = metadata;
    }
    toString() {
        return `${this.metadata.source}`;
    }
    getType() {
        const metadata = this.metadata;
        switch (metadata.source) {
            case 'cursor':
                return metadata.kind;
            case 'inlineCompletionAccept':
                return metadata.source + (metadata.$nes ? ':nes' : '');
            case 'unknown':
                return metadata.name || 'unknown';
            default:
                return metadata.source;
        }
    }
    /**
     * Converts the metadata to a key string.
     * Only includes properties/values that have `level` many `$` prefixes or less.
    */
    toKey(level, filter = {}) {
        const metadata = this.metadata;
        const keys = Object.entries(metadata).filter(([key, value]) => {
            const filterVal = filter[key];
            if (filterVal !== undefined) {
                return filterVal;
            }
            const prefixCount = (key.match(/\$/g) || []).length;
            return prefixCount <= level && value !== undefined && value !== null && value !== '';
        }).map(([key, value]) => `${key}:${value}`);
        return keys.join('-');
    }
    get props() {
        // eslint-disable-next-line local/code-no-any-casts, @typescript-eslint/no-explicit-any
        return this.metadata;
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createEditSource(metadata) {
    // eslint-disable-next-line local/code-no-any-casts, @typescript-eslint/no-explicit-any
    return new TextModelEditSource(metadata, privateSymbol);
}
export function isAiEdit(source) {
    switch (source.metadata.source) {
        case 'inlineCompletionAccept':
        case 'inlineCompletionPartialAccept':
        case 'inlineChat.applyEdits':
        case 'Chat.applyEdits':
            return true;
    }
    return false;
}
export function isUserEdit(source) {
    switch (source.metadata.source) {
        case 'cursor':
            return source.metadata.kind === 'type';
    }
    return false;
}
export const EditSources = {
    unknown(data) {
        return createEditSource({
            source: 'unknown',
            name: data.name,
        });
    },
    rename: (oldName, newName) => createEditSource({ source: 'rename', $$$oldName: oldName, $$$newName: newName }),
    chatApplyEdits(data) {
        return createEditSource({
            source: 'Chat.applyEdits',
            $modelId: avoidPathRedaction(data.modelId),
            $extensionId: data.extensionId?.extensionId,
            $extensionVersion: data.extensionId?.version,
            $$languageId: data.languageId,
            $$sessionId: data.sessionId,
            $$requestId: data.requestId,
            $$mode: data.mode,
            $$codeBlockSuggestionId: data.codeBlockSuggestionId,
        });
    },
    chatUndoEdits: () => createEditSource({ source: 'Chat.undoEdits' }),
    chatReset: () => createEditSource({ source: 'Chat.reset' }),
    inlineCompletionAccept(data) {
        return createEditSource({
            source: 'inlineCompletionAccept',
            $nes: data.nes,
            ...toProperties(data.providerId),
            $$requestUuid: data.requestUuid,
            $$languageId: data.languageId,
        });
    },
    inlineCompletionPartialAccept(data) {
        return createEditSource({
            source: 'inlineCompletionPartialAccept',
            type: data.type,
            $nes: data.nes,
            ...toProperties(data.providerId),
            $$requestUuid: data.requestUuid,
            $$languageId: data.languageId,
        });
    },
    inlineChatApplyEdit(data) {
        return createEditSource({
            source: 'inlineChat.applyEdits',
            $modelId: avoidPathRedaction(data.modelId),
            $extensionId: data.extensionId?.extensionId,
            $extensionVersion: data.extensionId?.version,
            $$sessionId: data.sessionId,
            $$requestId: data.requestId,
            $$languageId: data.languageId,
        });
    },
    reloadFromDisk: () => createEditSource({ source: 'reloadFromDisk' }),
    cursor(data) {
        return createEditSource({
            source: 'cursor',
            kind: data.kind,
            detailedSource: data.detailedSource,
        });
    },
    setValue: () => createEditSource({ source: 'setValue' }),
    eolChange: () => createEditSource({ source: 'eolChange' }),
    applyEdits: () => createEditSource({ source: 'applyEdits' }),
    snippet: () => createEditSource({ source: 'snippet' }),
    suggest: (data) => createEditSource({ source: 'suggest', ...toProperties(data.providerId) }),
    codeAction: (data) => createEditSource({ source: 'codeAction', $kind: data.kind, ...toProperties(data.providerId) })
};
function toProperties(version) {
    if (!version) {
        return {};
    }
    return {
        $extensionId: version.extensionId,
        $extensionVersion: version.extensionVersion,
        $providerId: version.providerId,
    };
}
function avoidPathRedaction(str) {
    if (str === undefined) {
        return undefined;
    }
    // To avoid false-positive file path redaction.
    return str.replaceAll('/', '|');
}
export class EditDeltaInfo {
    static fromText(text) {
        const linesAdded = TextLength.ofText(text).lineCount;
        const charsAdded = text.length;
        return new EditDeltaInfo(linesAdded, 0, charsAdded, 0);
    }
    /** @internal */
    static fromEdit(edit, originalString) {
        const lineEdit = LineEdit.fromStringEdit(edit, originalString);
        const linesAdded = sumBy(lineEdit.replacements, r => r.newLines.length);
        const linesRemoved = sumBy(lineEdit.replacements, r => r.lineRange.length);
        const charsAdded = sumBy(edit.replacements, r => r.getNewLength());
        const charsRemoved = sumBy(edit.replacements, r => r.replaceRange.length);
        return new EditDeltaInfo(linesAdded, linesRemoved, charsAdded, charsRemoved);
    }
    static tryCreate(linesAdded, linesRemoved, charsAdded, charsRemoved) {
        if (linesAdded === undefined || linesRemoved === undefined || charsAdded === undefined || charsRemoved === undefined) {
            return undefined;
        }
        return new EditDeltaInfo(linesAdded, linesRemoved, charsAdded, charsRemoved);
    }
    constructor(linesAdded, linesRemoved, charsAdded, charsRemoved) {
        this.linesAdded = linesAdded;
        this.linesRemoved = linesRemoved;
        this.charsAdded = charsAdded;
        this.charsRemoved = charsRemoved;
    }
}
export var EditSuggestionId;
(function (EditSuggestionId) {
    /**
     * Use AiEditTelemetryServiceImpl to create a new id!
    */
    function newId(genPrefixedUuid) {
        const id = genPrefixedUuid ? genPrefixedUuid('sgt') : prefixedUuid('sgt');
        return toEditIdentity(id);
    }
    EditSuggestionId.newId = newId;
})(EditSuggestionId || (EditSuggestionId = {}));
function toEditIdentity(id) {
    return id;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsRWRpdFNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdGV4dE1vZGVsRWRpdFNvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUdwRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFHdkQsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFFcEQsTUFBTSxPQUFPLG1CQUFtQjtJQUMvQixZQUNpQixRQUFzQyxFQUN0RCxpQkFBdUM7UUFEdkIsYUFBUSxHQUFSLFFBQVEsQ0FBOEI7SUFFbkQsQ0FBQztJQUVFLFFBQVE7UUFDZCxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRU0sT0FBTztRQUNiLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7UUFDL0IsUUFBUSxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDekIsS0FBSyxRQUFRO2dCQUNaLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQztZQUN0QixLQUFLLHdCQUF3QjtnQkFDNUIsT0FBTyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN4RCxLQUFLLFNBQVM7Z0JBQ2IsT0FBTyxRQUFRLENBQUMsSUFB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