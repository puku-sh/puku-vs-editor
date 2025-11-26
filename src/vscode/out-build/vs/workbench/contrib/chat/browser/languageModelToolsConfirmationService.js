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
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { inputActiveOptionBackground, inputActiveOptionBorder, inputActiveOptionForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../platform/theme/common/colorUtils.js';
const RUN_WITHOUT_APPROVAL = localize(6179, null);
const CONTINUE_WITHOUT_REVIEWING_RESULTS = localize(6180, null);
class GenericConfirmStore extends Disposable {
    constructor(_storageKey, _instantiationService) {
        super();
        this._storageKey = _storageKey;
        this._instantiationService = _instantiationService;
        this._memoryStore = new Set();
        this._workspaceStore = new Lazy(() => this._register(this._instantiationService.createInstance(ToolConfirmStore, 1 /* StorageScope.WORKSPACE */, this._storageKey)));
        this._profileStore = new Lazy(() => this._register(this._instantiationService.createInstance(ToolConfirmStore, 0 /* StorageScope.PROFILE */, this._storageKey)));
    }
    setAutoConfirmation(id, scope) {
        // Clear from all scopes first
        this._workspaceStore.value.setAutoConfirm(id, false);
        this._profileStore.value.setAutoConfirm(id, false);
        this._memoryStore.delete(id);
        // Set in the appropriate scope
        if (scope === 'workspace') {
            this._workspaceStore.value.setAutoConfirm(id, true);
        }
        else if (scope === 'profile') {
            this._profileStore.value.setAutoConfirm(id, true);
        }
        else if (scope === 'session') {
            this._memoryStore.add(id);
        }
    }
    getAutoConfirmation(id) {
        if (this._workspaceStore.value.getAutoConfirm(id)) {
            return 'workspace';
        }
        if (this._profileStore.value.getAutoConfirm(id)) {
            return 'profile';
        }
        if (this._memoryStore.has(id)) {
            return 'session';
        }
        return 'never';
    }
    getAutoConfirmationIn(id, scope) {
        if (scope === 'workspace') {
            return this._workspaceStore.value.getAutoConfirm(id);
        }
        else if (scope === 'profile') {
            return this._profileStore.value.getAutoConfirm(id);
        }
        else {
            return this._memoryStore.has(id);
        }
    }
    reset() {
        this._workspaceStore.value.reset();
        this._profileStore.value.reset();
        this._memoryStore.clear();
    }
    checkAutoConfirmation(id) {
        if (this._workspaceStore.value.getAutoConfirm(id)) {
            return { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'workspace' };
        }
        if (this._profileStore.value.getAutoConfirm(id)) {
            return { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'profile' };
        }
        if (this._memoryStore.has(id)) {
            return { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'session' };
        }
        return undefined;
    }
    getAllConfirmed() {
        const all = new Set();
        for (const key of this._workspaceStore.value.getAll()) {
            all.add(key);
        }
        for (const key of this._profileStore.value.getAll()) {
            all.add(key);
        }
        for (const key of this._memoryStore) {
            all.add(key);
        }
        return all;
    }
}
let ToolConfirmStore = class ToolConfirmStore extends Disposable {
    constructor(_scope, _storageKey, storageService) {
        super();
        this._scope = _scope;
        this._storageKey = _storageKey;
        this.storageService = storageService;
        this._autoConfirmTools = new LRUCache(100);
        this._didChange = false;
        const stored = storageService.getObject(this._storageKey, this._scope);
        if (stored) {
            for (const key of stored) {
                this._autoConfirmTools.set(key, true);
            }
        }
        this._register(storageService.onWillSaveState(() => {
            if (this._didChange) {
                this.storageService.store(this._storageKey, [...this._autoConfirmTools.keys()], this._scope, 1 /* StorageTarget.MACHINE */);
                this._didChange = false;
            }
        }));
    }
    reset() {
        this._autoConfirmTools.clear();
        this._didChange = true;
    }
    getAutoConfirm(id) {
        if (this._autoConfirmTools.get(id)) {
            this._didChange = true;
            return true;
        }
        return false;
    }
    setAutoConfirm(id, autoConfirm) {
        if (autoConfirm) {
            this._autoConfirmTools.set(id, true);
        }
        else {
            this._autoConfirmTools.delete(id);
        }
        this._didChange = true;
    }
    getAll() {
        return [...this._autoConfirmTools.keys()];
    }
};
ToolConfirmStore = __decorate([
    __param(2, IStorageService)
], ToolConfirmStore);
let LanguageModelToolsConfirmationService = class LanguageModelToolsConfirmationService extends Disposable {
    constructor(_instantiationService, _quickInputService) {
        super();
        this._instantiationService = _instantiationService;
        this._quickInputService = _quickInputService;
        this._contributions = new Map();
        this._preExecutionToolConfirmStore = this._register(new GenericConfirmStore('chat/autoconfirm', this._instantiationService));
        this._postExecutionToolConfirmStore = this._register(new GenericConfirmStore('chat/autoconfirm-post', this._instantiationService));
        this._preExecutionServerConfirmStore = this._register(new GenericConfirmStore('chat/servers/autoconfirm', this._instantiationService));
        this._postExecutionServerConfirmStore = this._register(new GenericConfirmStore('chat/servers/autoconfirm-post', this._instantiationService));
    }
    getPreConfirmAction(ref) {
        // Check contribution first
        const contribution = this._contributions.get(ref.toolId);
        if (contribution?.getPreConfirmAction) {
            const result = contribution.getPreConfirmAction(ref);
            if (result) {
                return result;
            }
        }
        // If contribution disables default approvals, don't check default stores
        if (contribution && contribution.canUseDefaultApprovals === false) {
            return undefined;
        }
        // Check tool-level confirmation
        const toolResult = this._preExecutionToolConfirmStore.checkAutoConfirmation(ref.toolId);
        if (toolResult) {
            return toolResult;
        }
        // Check server-level confirmation for MCP tools
        if (ref.source.type === 'mcp') {
            const serverResult = this._preExecutionServerConfirmStore.checkAutoConfirmation(ref.source.definitionId);
            if (serverResult) {
                return serverResult;
            }
        }
        return undefined;
    }
    getPostConfirmAction(ref) {
        // Check contribution first
        const contribution = this._contributions.get(ref.toolId);
        if (contribution?.getPostConfirmAction) {
            const result = contribution.getPostConfirmAction(ref);
            if (result) {
                return result;
            }
        }
        // If contribution disables default approvals, don't check default stores
        if (contribution && contribution.canUseDefaultApprovals === false) {
            return undefined;
        }
        // Check tool-level confirmation
        const toolResult = this._postExecutionToolConfirmStore.checkAutoConfirmation(ref.toolId);
        if (toolResult) {
            return toolResult;
        }
        // Check server-level confirmation for MCP tools
        if (ref.source.type === 'mcp') {
            const serverResult = this._postExecutionServerConfirmStore.checkAutoConfirmation(ref.source.definitionId);
            if (serverResult) {
                return serverResult;
            }
        }
        return undefined;
    }
    getPreConfirmActions(ref) {
        const actions = [];
        // Add contribution actions first
        const contribution = this._contributions.get(ref.toolId);
        if (contribution?.getPreConfirmActions) {
            actions.push(...contribution.getPreConfirmActions(ref));
        }
        // If contribution disables default approvals, only return contribution actions
        if (contribution && contribution.canUseDefaultApprovals === false) {
            return actions;
        }
        // Add default tool-level actions
        actions.push({
            label: localize(6181, null),
            detail: localize(6182, null),
            divider: !!actions.length,
            select: async () => {
                this._preExecutionToolConfirmStore.setAutoConfirmation(ref.toolId, 'session');
                return true;
            }
        }, {
            label: localize(6183, null),
            detail: localize(6184, null),
            select: async () => {
                this._preExecutionToolConfirmStore.setAutoConfirmation(ref.toolId, 'workspace');
                return true;
            }
        }, {
            label: localize(6185, null),
            detail: localize(6186, null),
            select: async () => {
                this._preExecutionToolConfirmStore.setAutoConfirmation(ref.toolId, 'profile');
                return true;
            }
        });
        // Add server-level actions for MCP tools
        if (ref.source.type === 'mcp') {
            const { serverLabel, definitionId } = ref.source;
            actions.push({
                label: localize(6187, null, serverLabel),
                detail: localize(6188, null),
                divider: true,
                select: async () => {
                    this._preExecutionServerConfirmStore.setAutoConfirmation(definitionId, 'session');
                    return true;
                }
            }, {
                label: localize(6189, null, serverLabel),
                detail: localize(6190, null),
                select: async () => {
                    this._preExecutionServerConfirmStore.setAutoConfirmation(definitionId, 'workspace');
                    return true;
                }
            }, {
                label: localize(6191, null, serverLabel),
                detail: localize(6192, null),
                select: async () => {
                    this._preExecutionServerConfirmStore.setAutoConfirmation(definitionId, 'profile');
                    return true;
                }
            });
        }
        return actions;
    }
    getPostConfirmActions(ref) {
        const actions = [];
        // Add contribution actions first
        const contribution = this._contributions.get(ref.toolId);
        if (contribution?.getPostConfirmActions) {
            actions.push(...contribution.getPostConfirmActions(ref));
        }
        // If contribution disables default approvals, only return contribution actions
        if (contribution && contribution.canUseDefaultApprovals === false) {
            return actions;
        }
        // Add default tool-level actions
        actions.push({
            label: localize(6193, null),
            detail: localize(6194, null),
            divider: !!actions.length,
            select: async () => {
                this._postExecutionToolConfirmStore.setAutoConfirmation(ref.toolId, 'session');
                return true;
            }
        }, {
            label: localize(6195, null),
            detail: localize(6196, null),
            select: async () => {
                this._postExecutionToolConfirmStore.setAutoConfirmation(ref.toolId, 'workspace');
                return true;
            }
        }, {
            label: localize(6197, null),
            detail: localize(6198, null),
            select: async () => {
                this._postExecutionToolConfirmStore.setAutoConfirmation(ref.toolId, 'profile');
                return true;
            }
        });
        // Add server-level actions for MCP tools
        if (ref.source.type === 'mcp') {
            const { serverLabel, definitionId } = ref.source;
            actions.push({
                label: localize(6199, null, serverLabel),
                detail: localize(6200, null),
                divider: true,
                select: async () => {
                    this._postExecutionServerConfirmStore.setAutoConfirmation(definitionId, 'session');
                    return true;
                }
            }, {
                label: localize(6201, null, serverLabel),
                detail: localize(6202, null),
                select: async () => {
                    this._postExecutionServerConfirmStore.setAutoConfirmation(definitionId, 'workspace');
                    return true;
                }
            }, {
                label: localize(6203, null, serverLabel),
                detail: localize(6204, null),
                select: async () => {
                    this._postExecutionServerConfirmStore.setAutoConfirmation(definitionId, 'profile');
                    return true;
                }
            });
        }
        return actions;
    }
    registerConfirmationContribution(toolName, contribution) {
        this._contributions.set(toolName, contribution);
        return {
            dispose: () => {
                this._contributions.delete(toolName);
            }
        };
    }
    manageConfirmationPreferences(tools, options) {
        // Helper to track tools under servers
        const trackServerTool = (serverId, label, toolId, serversWithTools) => {
            if (!serversWithTools.has(serverId)) {
                serversWithTools.set(serverId, { label, tools: new Set() });
            }
            serversWithTools.get(serverId).tools.add(toolId);
        };
        // Helper to add server tool from source
        const addServerToolFromSource = (source, toolId, serversWithTools) => {
            if (source.type === 'mcp') {
                trackServerTool(source.definitionId, source.serverLabel || source.label, toolId, serversWithTools);
            }
            else if (source.type === 'extension') {
                trackServerTool(source.extensionId.value, source.label, toolId, serversWithTools);
            }
        };
        // Determine which tools should be shown
        const relevantTools = new Set();
        const serversWithTools = new Map();
        // Add tools that request approval
        for (const tool of tools) {
            if (tool.canRequestPreApproval || tool.canRequestPostApproval || this._contributions.has(tool.id)) {
                relevantTools.add(tool.id);
                addServerToolFromSource(tool.source, tool.id, serversWithTools);
            }
        }
        // Add tools that have stored approvals (but we can't display them without metadata)
        for (const id of this._preExecutionToolConfirmStore.getAllConfirmed()) {
            if (!relevantTools.has(id)) {
                // Only add if we have the tool data
                const tool = tools.find(t => t.id === id);
                if (tool) {
                    relevantTools.add(id);
                    addServerToolFromSource(tool.source, id, serversWithTools);
                }
            }
        }
        for (const id of this._postExecutionToolConfirmStore.getAllConfirmed()) {
            if (!relevantTools.has(id)) {
                // Only add if we have the tool data
                const tool = tools.find(t => t.id === id);
                if (tool) {
                    relevantTools.add(id);
                    addServerToolFromSource(tool.source, id, serversWithTools);
                }
            }
        }
        if (relevantTools.size === 0) {
            return; // Nothing to show
        }
        // Determine initial scope from options
        let currentScope = options?.defaultScope ?? 'workspace';
        // Helper function to build tree items based on current scope
        const buildTreeItems = () => {
            const treeItems = [];
            // Add server nodes
            for (const [serverId, serverInfo] of serversWithTools) {
                const serverChildren = [];
                // Add server-level controls as first children
                const hasAnyPre = Array.from(serverInfo.tools).some(toolId => {
                    const tool = tools.find(t => t.id === toolId);
                    return tool?.canRequestPreApproval;
                });
                const hasAnyPost = Array.from(serverInfo.tools).some(toolId => {
                    const tool = tools.find(t => t.id === toolId);
                    return tool?.canRequestPostApproval;
                });
                const serverPreConfirmed = this._preExecutionServerConfirmStore.getAutoConfirmationIn(serverId, currentScope);
                const serverPostConfirmed = this._postExecutionServerConfirmStore.getAutoConfirmationIn(serverId, currentScope);
                // Add individual tools from this server as children
                for (const toolId of serverInfo.tools) {
                    const tool = tools.find(t => t.id === toolId);
                    if (!tool) {
                        continue;
                    }
                    const toolChildren = [];
                    const hasPre = !serverPreConfirmed && (tool.canRequestPreApproval || this._preExecutionToolConfirmStore.getAutoConfirmationIn(tool.id, currentScope));
                    const hasPost = !serverPostConfirmed && (tool.canRequestPostApproval || this._postExecutionToolConfirmStore.getAutoConfirmationIn(tool.id, currentScope));
                    // Add child items for granular control when both approval types exist
                    if (hasPre && hasPost) {
                        toolChildren.push({
                            type: 'tool-pre',
                            toolId: tool.id,
                            label: RUN_WITHOUT_APPROVAL,
                            checked: this._preExecutionToolConfirmStore.getAutoConfirmationIn(tool.id, currentScope)
                        });
                        toolChildren.push({
                            type: 'tool-post',
                            toolId: tool.id,
                            label: CONTINUE_WITHOUT_REVIEWING_RESULTS,
                            checked: this._postExecutionToolConfirmStore.getAutoConfirmationIn(tool.id, currentScope)
                        });
                    }
                    // Tool item always has a checkbox
                    const preApproval = this._preExecutionToolConfirmStore.getAutoConfirmationIn(tool.id, currentScope);
                    const postApproval = this._postExecutionToolConfirmStore.getAutoConfirmationIn(tool.id, currentScope);
                    let checked;
                    let description;
                    if (hasPre && hasPost) {
                        // Both: checkbox is mixed if only one is enabled
                        checked = preApproval && postApproval ? true : (!preApproval && !postApproval ? false : 'mixed');
                    }
                    else if (hasPre) {
                        checked = preApproval;
                        description = RUN_WITHOUT_APPROVAL;
                    }
                    else if (hasPost) {
                        checked = postApproval;
                        description = CONTINUE_WITHOUT_REVIEWING_RESULTS;
                    }
                    else {
                        continue;
                    }
                    serverChildren.push({
                        type: 'tool',
                        toolId: tool.id,
                        label: tool.displayName || tool.id,
                        description,
                        checked,
                        collapsed: true,
                        children: toolChildren.length > 0 ? toolChildren : undefined
                    });
                }
                serverChildren.sort((a, b) => a.label.localeCompare(b.label));
                if (hasAnyPost) {
                    serverChildren.unshift({
                        type: 'server-post',
                        serverId,
                        iconClass: ThemeIcon.asClassName(Codicon.play),
                        label: localize(6205, null),
                        checked: serverPostConfirmed
                    });
                }
                if (hasAnyPre) {
                    serverChildren.unshift({
                        type: 'server-pre',
                        serverId,
                        iconClass: ThemeIcon.asClassName(Codicon.play),
                        label: localize(6206, null),
                        checked: serverPreConfirmed
                    });
                }
                // Server node has checkbox to control both pre and post
                const serverHasPre = this._preExecutionServerConfirmStore.getAutoConfirmationIn(serverId, currentScope);
                const serverHasPost = this._postExecutionServerConfirmStore.getAutoConfirmationIn(serverId, currentScope);
                let serverChecked;
                if (hasAnyPre && hasAnyPost) {
                    serverChecked = serverHasPre && serverHasPost ? true : (!serverHasPre && !serverHasPost ? false : 'mixed');
                }
                else if (hasAnyPre) {
                    serverChecked = serverHasPre;
                }
                else if (hasAnyPost) {
                    serverChecked = serverHasPost;
                }
                else {
                    serverChecked = false;
                }
                const existingItem = quickTree.itemTree.find(i => i.serverId === serverId);
                treeItems.push({
                    type: 'server',
                    serverId,
                    label: serverInfo.label,
                    checked: serverChecked,
                    children: serverChildren,
                    collapsed: existingItem ? quickTree.isCollapsed(existingItem) : true,
                    pickable: false
                });
            }
            // Add individual tool nodes (only for non-MCP/extension tools)
            const sortedTools = tools.slice().sort((a, b) => a.displayName.localeCompare(b.displayName));
            for (const tool of sortedTools) {
                if (!relevantTools.has(tool.id)) {
                    continue;
                }
                // Skip tools that belong to MCP/extension servers (they're shown under server nodes)
                if (tool.source.type === 'mcp' || tool.source.type === 'extension') {
                    continue;
                }
                const contributed = this._contributions.get(tool.id);
                const toolChildren = [];
                const manageActions = contributed?.getManageActions?.();
                if (manageActions) {
                    toolChildren.push(...manageActions.map(action => ({
                        type: 'manage',
                        ...action,
                    })));
                }
                let checked = false;
                let description;
                let pickable = false;
                if (contributed?.canUseDefaultApprovals !== false) {
                    pickable = true;
                    const hasPre = tool.canRequestPreApproval || this._preExecutionToolConfirmStore.getAutoConfirmationIn(tool.id, currentScope);
                    const hasPost = tool.canRequestPostApproval || this._postExecutionToolConfirmStore.getAutoConfirmationIn(tool.id, currentScope);
                    // Add child items for granular control when both approval types exist
                    if (hasPre && hasPost) {
                        toolChildren.push({
                            type: 'tool-pre',
                            toolId: tool.id,
                            label: RUN_WITHOUT_APPROVAL,
                            checked: this._preExecutionToolConfirmStore.getAutoConfirmationIn(tool.id, currentScope)
                        });
                        toolChildren.push({
                            type: 'tool-post',
                            toolId: tool.id,
                            label: CONTINUE_WITHOUT_REVIEWING_RESULTS,
                            checked: this._postExecutionToolConfirmStore.getAutoConfirmationIn(tool.id, currentScope)
                        });
                    }
                    // Tool item always has a checkbox
                    const preApproval = this._preExecutionToolConfirmStore.getAutoConfirmationIn(tool.id, currentScope);
                    const postApproval = this._postExecutionToolConfirmStore.getAutoConfirmationIn(tool.id, currentScope);
                    if (hasPre && hasPost) {
                        // Both: checkbox is mixed if only one is enabled
                        checked = preApproval && postApproval ? true : (!preApproval && !postApproval ? false : 'mixed');
                    }
                    else if (hasPre) {
                        checked = preApproval;
                        description = RUN_WITHOUT_APPROVAL;
                    }
                    else if (hasPost) {
                        checked = postApproval;
                        description = CONTINUE_WITHOUT_REVIEWING_RESULTS;
                    }
                    else {
                        // No approval capabilities - shouldn't happen but handle it
                        checked = false;
                    }
                }
                treeItems.push({
                    type: 'tool',
                    toolId: tool.id,
                    label: tool.displayName || tool.id,
                    description,
                    checked,
                    pickable,
                    collapsed: true,
                    children: toolChildren.length > 0 ? toolChildren : undefined
                });
            }
            return treeItems;
        };
        const disposables = new DisposableStore();
        const quickTree = disposables.add(this._quickInputService.createQuickTree());
        quickTree.ignoreFocusOut = true;
        quickTree.sortByLabel = false;
        // Only show toggle if not in session scope
        if (currentScope !== 'session') {
            const scopeToggle = disposables.add(new Toggle({
                title: localize(6207, null),
                icon: Codicon.folder,
                isChecked: currentScope === 'workspace',
                inputActiveOptionBorder: asCssVariable(inputActiveOptionBorder),
                inputActiveOptionForeground: asCssVariable(inputActiveOptionForeground),
                inputActiveOptionBackground: asCssVariable(inputActiveOptionBackground)
            }));
            quickTree.toggles = [scopeToggle];
            disposables.add(scopeToggle.onChange(() => {
                currentScope = currentScope === 'workspace' ? 'profile' : 'workspace';
                updatePlaceholder();
                quickTree.setItemTree(buildTreeItems());
            }));
        }
        const updatePlaceholder = () => {
            if (currentScope === 'session') {
                quickTree.placeholder = localize(6208, null);
            }
            else {
                quickTree.placeholder = currentScope === 'workspace'
                    ? localize(6209, null)
                    : localize(6210, null);
            }
        };
        updatePlaceholder();
        quickTree.setItemTree(buildTreeItems());
        disposables.add(quickTree.onDidChangeCheckboxState(item => {
            const newState = item.checked ? currentScope : 'never';
            if (item.type === 'server' && item.serverId) {
                // Server-level checkbox: update both pre and post based on server capabilities
                const serverInfo = serversWithTools.get(item.serverId);
                if (serverInfo) {
                    this._preExecutionServerConfirmStore.setAutoConfirmation(item.serverId, newState);
                    this._postExecutionServerConfirmStore.setAutoConfirmation(item.serverId, newState);
                }
            }
            else if (item.type === 'tool' && item.toolId) {
                const tool = tools.find(t => t.id === item.toolId);
                if (tool?.canRequestPostApproval || newState === 'never') {
                    this._postExecutionToolConfirmStore.setAutoConfirmation(item.toolId, newState);
                }
                if (tool?.canRequestPreApproval || newState === 'never') {
                    this._preExecutionToolConfirmStore.setAutoConfirmation(item.toolId, newState);
                }
            }
            else if (item.type === 'tool-pre' && item.toolId) {
                this._preExecutionToolConfirmStore.setAutoConfirmation(item.toolId, newState);
            }
            else if (item.type === 'tool-post' && item.toolId) {
                this._postExecutionToolConfirmStore.setAutoConfirmation(item.toolId, newState);
            }
            else if (item.type === 'server-pre' && item.serverId) {
                this._preExecutionServerConfirmStore.setAutoConfirmation(item.serverId, newState);
                quickTree.setItemTree(buildTreeItems());
            }
            else if (item.type === 'server-post' && item.serverId) {
                this._postExecutionServerConfirmStore.setAutoConfirmation(item.serverId, newState);
                quickTree.setItemTree(buildTreeItems());
            }
            else if (item.type === 'manage') {
                item.onDidChangeChecked?.(!!item.checked);
            }
        }));
        disposables.add(quickTree.onDidTriggerItemButton(i => {
            if (i.item.type === 'manage') {
                i.item.onDidTriggerItemButton?.(i.button);
            }
        }));
        disposables.add(quickTree.onDidAccept(() => {
            for (const item of quickTree.activeItems) {
                if (item.type === 'manage') {
                    item.onDidOpen?.();
                }
            }
            quickTree.hide();
        }));
        disposables.add(quickTree.onDidHide(() => {
            disposables.dispose();
        }));
        quickTree.show();
    }
    resetToolAutoConfirmation() {
        this._preExecutionToolConfirmStore.reset();
        this._postExecutionToolConfirmStore.reset();
        this._preExecutionServerConfirmStore.reset();
        this._postExecutionServerConfirmStore.reset();
        // Reset all contributions
        for (const contribution of this._contributions.values()) {
            contribution.reset?.();
        }
    }
};
LanguageModelToolsConfirmationService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IQuickInputService)
], LanguageModelToolsConfirmationService);
export { LanguageModelToolsConfirmationService };
//# sourceMappingURL=languageModelToolsConfirmationService.js.map