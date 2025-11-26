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
//# sourceMappingURL=chatSelectedTools.js.map