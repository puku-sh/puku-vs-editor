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
const RUN_WITHOUT_APPROVAL = localize('runWithoutApproval', "without approval");
const CONTINUE_WITHOUT_REVIEWING_RESULTS = localize('continueWithoutReviewingResults', "without reviewing result");
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
            label: localize('allowSession', 'Allow in this Session'),
            detail: localize('allowSessionTooltip', 'Allow this tool to run in this session without confirmation.'),
            divider: !!actions.length,
            select: async () => {
                this._preExecutionToolConfirmStore.setAutoConfirmation(ref.toolId, 'session');
                return true;
            }
        }, {
            label: localize('allowWorkspace', 'Allow in this Workspace'),
            detail: localize('allowWorkspaceTooltip', 'Allow this tool to run in this workspace without confirmation.'),
            select: async () => {
                this._preExecutionToolConfirmStore.setAutoConfirmation(ref.toolId, 'workspace');
                return true;
            }
        }, {
            label: localize('allowGlobally', 'Always Allow'),
            detail: localize('allowGloballyTooltip', 'Always allow this tool to run without confirmation.'),
            select: async () => {
                this._preExecutionToolConfirmStore.setAutoConfirmation(ref.toolId, 'profile');
                return true;
            }
        });
        // Add server-level actions for MCP tools
        if (ref.source.type === 'mcp') {
            const { serverLabel, definitionId } = ref.source;
            actions.push({
                label: localize('allowServerSession', 'Allow Tools from {0} in this Session', serverLabel),
                detail: localize('allowServerSessionTooltip', 'Allow all tools from this server to run in this session without confirmation.'),
                divider: true,
                select: async () => {
                    this._preExecutionServerConfirmStore.setAutoConfirmation(definitionId, 'session');
                    return true;
                }
            }, {
                label: localize('allowServerWorkspace', 'Allow Tools from {0} in this Workspace', serverLabel),
                detail: localize('allowServerWorkspaceTooltip', 'Allow all tools from this server to run in this workspace without confirmation.'),
                select: async () => {
                    this._preExecutionServerConfirmStore.setAutoConfirmation(definitionId, 'workspace');
                    return true;
                }
            }, {
                label: localize('allowServerGlobally', 'Always Allow Tools from {0}', serverLabel),
                detail: localize('allowServerGloballyTooltip', 'Always allow all tools from this server to run without confirmation.'),
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
            label: localize('allowSessionPost', 'Allow Without Review in this Session'),
            detail: localize('allowSessionPostTooltip', 'Allow results from this tool to be sent without confirmation in this session.'),
            divider: !!actions.length,
            select: async () => {
                this._postExecutionToolConfirmStore.setAutoConfirmation(ref.toolId, 'session');
                return true;
            }
        }, {
            label: localize('allowWorkspacePost', 'Allow Without Review in this Workspace'),
            detail: localize('allowWorkspacePostTooltip', 'Allow results from this tool to be sent without confirmation in this workspace.'),
            select: async () => {
                this._postExecutionToolConfirmStore.setAutoConfirmation(ref.toolId, 'workspace');
                return true;
            }
        }, {
            label: localize('allowGloballyPost', 'Always Allow Without Review'),
            detail: localize('allowGloballyPostTooltip', 'Always allow results from this tool to be sent without confirmation.'),
            select: async () => {
                this._postExecutionToolConfirmStore.setAutoConfirmation(ref.toolId, 'profile');
                return true;
            }
        });
        // Add server-level actions for MCP tools
        if (ref.source.type === 'mcp') {
            const { serverLabel, definitionId } = ref.source;
            actions.push({
                label: localize('allowServerSessionPost', 'Allow Tools from {0} Without Review in this Session', serverLabel),
                detail: localize('allowServerSessionPostTooltip', 'Allow results from all tools from this server to be sent without confirmation in this session.'),
                divider: true,
                select: async () => {
                    this._postExecutionServerConfirmStore.setAutoConfirmation(definitionId, 'session');
                    return true;
                }
            }, {
                label: localize('allowServerWorkspacePost', 'Allow Tools from {0} Without Review in this Workspace', serverLabel),
                detail: localize('allowServerWorkspacePostTooltip', 'Allow results from all tools from this server to be sent without confirmation in this workspace.'),
                select: async () => {
                    this._postExecutionServerConfirmStore.setAutoConfirmation(definitionId, 'workspace');
                    return true;
                }
            }, {
                label: localize('allowServerGloballyPost', 'Always Allow Tools from {0} Without Review', serverLabel),
                detail: localize('allowServerGloballyPostTooltip', 'Always allow results from all tools from this server to be sent without confirmation.'),
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
                        label: localize('continueWithoutReviewing', "Continue without reviewing any tool results"),
                        checked: serverPostConfirmed
                    });
                }
                if (hasAnyPre) {
                    serverChildren.unshift({
                        type: 'server-pre',
                        serverId,
                        iconClass: ThemeIcon.asClassName(Codicon.play),
                        label: localize('runToolsWithoutApproval', "Run any tool without approval"),
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
                title: localize('workspaceScope', "Configure for this workspace only"),
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
                quickTree.placeholder = localize('configureSessionToolApprovals', "Configure session tool approvals");
            }
            else {
                quickTree.placeholder = currentScope === 'workspace'
                    ? localize('configureWorkspaceToolApprovals', "Configure workspace tool approvals")
                    : localize('configureGlobalToolApprovals', "Configure global tool approvals");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzQ29uZmlybWF0aW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9sYW5ndWFnZU1vZGVsVG9vbHNDb25maXJtYXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGtCQUFrQixFQUFrQixNQUFNLHNEQUFzRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLHVCQUF1QixFQUFFLDJCQUEyQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDdkosT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBS2hGLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLG9CQUFvQixFQUFFLGtCQUFrQixDQUFD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