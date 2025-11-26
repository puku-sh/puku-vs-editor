/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { derived, ObservableSet } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ByteSize } from '../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { stringifyPromptElementJSON } from './tools/promptTsxTypes.js';
export var ToolDataSource;
(function (ToolDataSource) {
    ToolDataSource.Internal = { type: 'internal', label: 'Built-In' };
    /** External tools may not be contributed or invoked, but may be invoked externally and described in an IChatToolInvocationSerialized */
    ToolDataSource.External = { type: 'external', label: 'External' };
    function toKey(source) {
        switch (source.type) {
            case 'extension': return `extension:${source.extensionId.value}`;
            case 'mcp': return `mcp:${source.collectionId}:${source.definitionId}`;
            case 'user': return `user:${source.file.toString()}`;
            case 'internal': return 'internal';
            case 'external': return 'external';
        }
    }
    ToolDataSource.toKey = toKey;
    function equals(a, b) {
        return toKey(a) === toKey(b);
    }
    ToolDataSource.equals = equals;
    function classify(source) {
        if (source.type === 'internal') {
            return { ordinal: 1, label: localize('builtin', 'Built-In') };
        }
        else if (source.type === 'mcp') {
            return { ordinal: 2, label: source.label };
        }
        else if (source.type === 'user') {
            return { ordinal: 0, label: localize('user', 'User Defined') };
        }
        else {
            return { ordinal: 3, label: source.label };
        }
    }
    ToolDataSource.classify = classify;
})(ToolDataSource || (ToolDataSource = {}));
export function isToolInvocationContext(obj) {
    return typeof obj === 'object' && typeof obj.sessionId === 'string' && URI.isUri(obj.sessionResource);
}
export function isToolResultInputOutputDetails(obj) {
    return typeof obj === 'object' && typeof obj?.input === 'string' && (typeof obj?.output === 'string' || Array.isArray(obj?.output));
}
export function isToolResultOutputDetails(obj) {
    return typeof obj === 'object' && typeof obj?.output === 'object' && typeof obj?.output?.mimeType === 'string' && obj?.output?.type === 'data';
}
export function toolContentToA11yString(part) {
    return part.map(p => {
        switch (p.kind) {
            case 'promptTsx':
                return stringifyPromptTsxPart(p);
            case 'text':
                return p.value;
            case 'data':
                return localize('toolResultDataPartA11y', "{0} of {1} binary data", ByteSize.formatSize(p.value.data.byteLength), p.value.mimeType || 'unknown');
        }
    }).join(', ');
}
export function toolResultHasBuffers(result) {
    return result.content.some(part => part.kind === 'data');
}
export function stringifyPromptTsxPart(part) {
    return stringifyPromptElementJSON(part.value);
}
export var ToolInvocationPresentation;
(function (ToolInvocationPresentation) {
    ToolInvocationPresentation["Hidden"] = "hidden";
    ToolInvocationPresentation["HiddenAfterComplete"] = "hiddenAfterComplete";
})(ToolInvocationPresentation || (ToolInvocationPresentation = {}));
export class ToolSet {
    constructor(id, referenceName, icon, source, description, legacyFullNames) {
        this.id = id;
        this.referenceName = referenceName;
        this.icon = icon;
        this.source = source;
        this.description = description;
        this.legacyFullNames = legacyFullNames;
        this._tools = new ObservableSet();
        this._toolSets = new ObservableSet();
        this.isHomogenous = derived(r => {
            return !Iterable.some(this._tools.observable.read(r), tool => !ToolDataSource.equals(tool.source, this.source))
                && !Iterable.some(this._toolSets.observable.read(r), toolSet => !ToolDataSource.equals(toolSet.source, this.source));
        });
    }
    addTool(data, tx) {
        this._tools.add(data, tx);
        return toDisposable(() => {
            this._tools.delete(data);
        });
    }
    addToolSet(toolSet, tx) {
        if (toolSet === this) {
            return Disposable.None;
        }
        this._toolSets.add(toolSet, tx);
        return toDisposable(() => {
            this._toolSets.delete(toolSet);
        });
    }
    getTools(r) {
        return Iterable.concat(this._tools.observable.read(r), ...Iterable.map(this._toolSets.observable.read(r), toolSet => toolSet.getTools(r)));
    }
}
export const ILanguageModelToolsService = createDecorator('ILanguageModelToolsService');
export function createToolInputUri(toolCallId) {
    return URI.from({ scheme: Schemas.inMemory, path: `/lm/tool/${toolCallId}/tool_input.json` });
}
export function createToolSchemaUri(toolOrId) {
    if (typeof toolOrId !== 'string') {
        toolOrId = toolOrId.id;
    }
    return URI.from({ scheme: Schemas.vscode, authority: 'schemas', path: `/lm/tool/${toolOrId}` });
}
export var GithubCopilotToolReference;
(function (GithubCopilotToolReference) {
    GithubCopilotToolReference.shell = 'shell';
    GithubCopilotToolReference.edit = 'edit';
    GithubCopilotToolReference.search = 'search';
    GithubCopilotToolReference.customAgent = 'custom-agent';
})(GithubCopilotToolReference || (GithubCopilotToolReference = {}));
export var VSCodeToolReference;
(function (VSCodeToolReference) {
    VSCodeToolReference.customAgent = 'agents';
    VSCodeToolReference.shell = 'shell';
    VSCodeToolReference.runSubagent = 'runSubagent';
    VSCodeToolReference.vscode = 'vscode';
    VSCodeToolReference.launch = 'launch';
})(VSCodeToolReference || (VSCodeToolReference = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2xhbmd1YWdlTW9kZWxUb29sc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFPaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQXNDLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRW5ILE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUVyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFHOUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQU83RixPQUFPLEVBQXFCLDBCQUEwQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUE4RDFGLE1BQU0sS0FBVyxjQUFjLENBZ0M5QjtBQWhDRCxXQUFpQixjQUFjO0lBRWpCLHVCQUFRLEdBQW1CLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLENBQUM7SUFFaEYsd0lBQXdJO0lBQzNILHVCQUFRLEdBQW1CLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLENBQUM7SUFFaEYsU0FBZ0IsS0FBSyxDQUFDLE1BQXNCO1FBQzNDLFFBQVEsTUFB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