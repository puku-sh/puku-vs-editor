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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { derived, observableFromEvent, ObservableMap } from '../../../../base/common/observable.js';
import { isObject } from '../../../../base/common/types.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { observableMemento } from '../../../../platform/observable/common/observableMemento.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ChatModeKind } from '../common/constants.js';
import { ILanguageModelToolsService, ToolSet } from '../common/languageModelToolsService.js';
import { PromptsStorage } from '../common/promptSyntax/service/promptsService.js';
import { PromptFileRewriter } from './promptSyntax/promptFileRewriter.js';
var ToolEnablementStates;
(function (ToolEnablementStates) {
    function fromMap(map) {
        const toolSets = new Map(), tools = new Map();
        for (const [entry, enabled] of map.entries()) {
            if (entry instanceof ToolSet) {
                toolSets.set(entry.id, enabled);
            }
            else {
                tools.set(entry.id, enabled);
            }
        }
        return { toolSets, tools };
    }
    ToolEnablementStates.fromMap = fromMap;
    function isStoredDataV1(data) {
        return isObject(data) && data.version === undefined
            && (data.disabledTools === undefined || Array.isArray(data.disabledTools))
            && (data.disabledToolSets === undefined || Array.isArray(data.disabledToolSets));
    }
    function isStoredDataV2(data) {
        return isObject(data) && data.version === 2 && Array.isArray(data.toolSetEntries) && Array.isArray(data.toolEntries);
    }
    function fromStorage(storage) {
        try {
            const parsed = JSON.parse(storage);
            if (isStoredDataV2(parsed)) {
                return { toolSets: new Map(parsed.toolSetEntries), tools: new Map(parsed.toolEntries) };
            }
            else if (isStoredDataV1(parsed)) {
                const toolSetEntries = parsed.disabledToolSets?.map(id => [id, false]);
                const toolEntries = parsed.disabledTools?.map(id => [id, false]);
                return { toolSets: new Map(toolSetEntries), tools: new Map(toolEntries) };
            }
        }
        catch {
            // ignore
        }
        // invalid data
        return { toolSets: new Map(), tools: new Map() };
    }
    ToolEnablementStates.fromStorage = fromStorage;
    function toStorage(state) {
        const storageData = {
            version: 2,
            toolSetEntries: Array.from(state.toolSets.entries()),
            toolEntries: Array.from(state.tools.entries())
        };
        return JSON.stringify(storageData);
    }
    ToolEnablementStates.toStorage = toStorage;
})(ToolEnablementStates || (ToolEnablementStates = {}));
export var ToolsScope;
(function (ToolsScope) {
    ToolsScope[ToolsScope["Global"] = 0] = "Global";
    ToolsScope[ToolsScope["Session"] = 1] = "Session";
    ToolsScope[ToolsScope["Agent"] = 2] = "Agent";
    ToolsScope[ToolsScope["Agent_ReadOnly"] = 3] = "Agent_ReadOnly";
})(ToolsScope || (ToolsScope = {}));
let ChatSelectedTools = class ChatSelectedTools extends Disposable {
    constructor(_mode, _toolsService, _storageService, _instantiationService) {
        super();
        this._mode = _mode;
        this._toolsService = _toolsService;
        this._instantiationService = _instantiationService;
        this._sessionStates = new ObservableMap();
        /**
         * All tools and tool sets with their enabled state.
         */
        this.entriesMap = derived(r => {
            const map = new Map();
            // look up the tools in the hierarchy: session > mode > global
            const currentMode = this._mode.read(r);
            let currentMap = this._sessionStates.observable.read(r).get(currentMode.id);
            if (!currentMap && currentMode.kind === ChatModeKind.Agent) {
                const modeTools = currentMode.customTools?.read(r);
                if (modeTools) {
                    const target = currentMode.target?.read(r);
                    currentMap = ToolEnablementStates.fromMap(this._toolsService.toToolAndToolSetEnablementMap(modeTools, target));
                }
            }
            if (!currentMap) {
                currentMap = this._globalState.read(r);
            }
            for (const tool of this._allTools.read(r)) {
                if (tool.canBeReferencedInPrompt) {
                    map.set(tool, currentMap.tools.get(tool.id) !== false); // if unknown, it's enabled
                }
            }
            for (const toolSet of this._toolsService.toolSets.read(r)) {
                const toolSetEnabled = currentMap.toolSets.get(toolSet.id) !== false; // if unknown, it's enabled
                map.set(toolSet, toolSetEnabled);
                for (const tool of toolSet.getTools(r)) {
                    map.set(tool, toolSetEnabled || currentMap.tools.get(tool.id) === true); // if unknown, use toolSetEnabled
                }
            }
            return map;
        });
        this.userSelectedTools = derived(r => {
            // extract a map of tool ids
            const result = {};
            const map = this.entriesMap.read(r);
            for (const [item, enabled] of map) {
                if (!(item instanceof ToolSet)) {
                    result[item.id] = enabled;
                }
            }
            return result;
        });
        const globalStateMemento = observableMemento({
            key: 'chat/selectedTools',
            defaultValue: { toolSets: new Map(), tools: new Map() },
            fromStorage: ToolEnablementStates.fromStorage,
            toStorage: ToolEnablementStates.toStorage
        });
        this._globalState = this._store.add(globalStateMemento(0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */, _storageService));
        this._allTools = observableFromEvent(_toolsService.onDidChangeTools, () => Array.from(_toolsService.getTools()));
    }
    get entriesScope() {
        const mode = this._mode.get();
        if (this._sessionStates.has(mode.id)) {
            return ToolsScope.Session;
        }
        if (mode.kind === ChatModeKind.Agent && mode.customTools?.get() && mode.uri) {
            return mode.source?.storage !== PromptsStorage.extension ? ToolsScope.Agent : ToolsScope.Agent_ReadOnly;
        }
        return ToolsScope.Global;
    }
    get currentMode() {
        return this._mode.get();
    }
    resetSessionEnablementState() {
        const mode = this._mode.get();
        this._sessionStates.delete(mode.id);
    }
    set(enablementMap, sessionOnly) {
        const mode = this._mode.get();
        if (sessionOnly || this._sessionStates.has(mode.id)) {
            this._sessionStates.set(mode.id, ToolEnablementStates.fromMap(enablementMap));
            return;
        }
        if (mode.kind === ChatModeKind.Agent && mode.customTools?.get() && mode.uri) {
            if (mode.source?.storage !== PromptsStorage.extension) {
                // apply directly to mode file.
                this.updateCustomModeTools(mode.uri.get(), enablementMap);
                return;
            }
            else {
                // can not write to extensions, store
                this._sessionStates.set(mode.id, ToolEnablementStates.fromMap(enablementMap));
                return;
            }
        }
        this._globalState.set(ToolEnablementStates.fromMap(enablementMap), undefined);
    }
    async updateCustomModeTools(uri, enablementMap) {
        await this._instantiationService.createInstance(PromptFileRewriter).openAndRewriteTools(uri, enablementMap, CancellationToken.None);
    }
};
ChatSelectedTools = __decorate([
    __param(1, ILanguageModelToolsService),
    __param(2, IStorageService),
    __param(3, IInstantiationService)
], ChatSelectedTools);
export { ChatSelectedTools };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlbGVjdGVkVG9vbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFNlbGVjdGVkVG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQWUsbUJBQW1CLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTVELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNuSCxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRzlHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUN0RCxPQUFPLEVBQUUsMEJBQTBCLEVBQTJDLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3RJLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQW9CMUUsSUFBVSxvQkFBb0IsQ0FnRDdCO0FBaERELFdBQVUsb0JBQW9CO0lBQzdCLFNBQWdCLE9BQU8sQ0FBQyxHQUFpQztRQUN4RCxNQUFNLFFBQVEsR0FBeUIsSUFBSSxHQUFHLEVBQUUsRUFBRSxLQUFLLEdBQXlCLElBQUksR0FBRyxF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