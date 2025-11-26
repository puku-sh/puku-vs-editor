/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../base/common/assert.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { createMarkdownCommandLink } from '../../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import Severity from '../../../../../base/common/severity.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { CommandsRegistry, ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { IMcpRegistry } from '../../../mcp/common/mcpRegistryTypes.js';
import { IMcpService, IMcpWorkbenchService } from '../../../mcp/common/mcpTypes.js';
import { startServerAndWaitForLiveTools } from '../../../mcp/common/mcpTypesUtils.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ILanguageModelToolsService, ToolDataSource } from '../../common/languageModelToolsService.js';
import { ConfigureToolSets } from '../tools/toolSetsContribution.js';
var BucketOrdinal;
(function (BucketOrdinal) {
    BucketOrdinal[BucketOrdinal["User"] = 0] = "User";
    BucketOrdinal[BucketOrdinal["BuiltIn"] = 1] = "BuiltIn";
    BucketOrdinal[BucketOrdinal["Mcp"] = 2] = "Mcp";
    BucketOrdinal[BucketOrdinal["Extension"] = 3] = "Extension";
})(BucketOrdinal || (BucketOrdinal = {}));
// Type guards for new QuickTree types
function isBucketTreeItem(item) {
    return item.itemType === 'bucket';
}
function isToolSetTreeItem(item) {
    return item.itemType === 'toolset';
}
function isToolTreeItem(item) {
    return item.itemType === 'tool';
}
function isCallbackTreeItem(item) {
    return item.itemType === 'callback';
}
/**
 * Maps different icon types (ThemeIcon or URI-based) to QuickTreeItem icon properties.
 * Handles the conversion between ToolSet/IToolData icon formats and tree item requirements.
 * Provides a default tool icon when no icon is specified.
 *
 * @param icon - Icon to map (ThemeIcon, URI object, or undefined)
 * @param useDefaultToolIcon - Whether to use a default tool icon when none is provided
 * @returns Object with iconClass (for ThemeIcon) or iconPath (for URIs) properties
 */
function mapIconToTreeItem(icon, useDefaultToolIcon = false) {
    if (!icon) {
        if (useDefaultToolIcon) {
            return { iconClass: ThemeIcon.asClassName(Codicon.tools) };
        }
        return {};
    }
    if (ThemeIcon.isThemeIcon(icon)) {
        return { iconClass: ThemeIcon.asClassName(icon) };
    }
    else {
        return { iconPath: icon };
    }
}
function createToolTreeItemFromData(tool, checked) {
    const iconProps = mapIconToTreeItem(tool.icon, true); // Use default tool icon if none provided
    return {
        itemType: 'tool',
        tool,
        id: tool.id,
        label: tool.toolReferenceName ?? tool.displayName,
        description: tool.userDescription ?? tool.modelDescription,
        checked,
        ...iconProps
    };
}
function createToolSetTreeItem(toolset, checked, editorService) {
    const iconProps = mapIconToTreeItem(toolset.icon);
    const buttons = [];
    if (toolset.source.type === 'user') {
        const resource = toolset.source.file;
        buttons.push({
            iconClass: ThemeIcon.asClassName(Codicon.edit),
            tooltip: localize(5274, null),
            action: () => editorService.openEditor({ resource })
        });
    }
    return {
        itemType: 'toolset',
        toolset,
        buttons,
        id: toolset.id,
        label: toolset.referenceName,
        description: toolset.description,
        checked,
        children: undefined,
        collapsed: true,
        ...iconProps
    };
}
/**
 * New QuickTree implementation of the tools picker.
 * Uses IQuickTree to provide a true hierarchical tree structure with:
 * - Collapsible nodes for buckets and toolsets
 * - Checkbox state management with parent-child relationships
 * - Special handling for MCP servers (server as bucket, tools as direct children)
 * - Built-in filtering and search capabilities
 *
 * @param accessor - Service accessor for dependency injection
 * @param placeHolder - Placeholder text shown in the picker
 * @param description - Optional description text shown in the picker
 * @param toolsEntries - Optional initial selection state for tools and toolsets
 * @param onUpdate - Optional callback fired when the selection changes
 * @returns Promise resolving to the final selection map, or undefined if cancelled
 */
export async function showToolsPicker(accessor, placeHolder, description, getToolsEntries) {
    const quickPickService = accessor.get(IQuickInputService);
    const mcpService = accessor.get(IMcpService);
    const mcpRegistry = accessor.get(IMcpRegistry);
    const commandService = accessor.get(ICommandService);
    const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
    const editorService = accessor.get(IEditorService);
    const mcpWorkbenchService = accessor.get(IMcpWorkbenchService);
    const toolsService = accessor.get(ILanguageModelToolsService);
    const toolLimit = accessor.get(IContextKeyService).getContextKeyValue(ChatContextKeys.chatToolGroupingThreshold.key);
    const mcpServerByTool = new Map();
    for (const server of mcpService.servers.get()) {
        for (const tool of server.tools.get()) {
            mcpServerByTool.set(tool.id, server);
        }
    }
    function computeItems(previousToolsEntries) {
        // Create default entries if none provided
        let toolsEntries = getToolsEntries ? new Map(getToolsEntries()) : undefined;
        if (!toolsEntries) {
            const defaultEntries = new Map();
            for (const tool of toolsService.getTools()) {
                if (tool.canBeReferencedInPrompt) {
                    defaultEntries.set(tool, false);
                }
            }
            for (const toolSet of toolsService.toolSets.get()) {
                defaultEntries.set(toolSet, false);
            }
            toolsEntries = defaultEntries;
        }
        previousToolsEntries?.forEach((value, key) => {
            toolsEntries.set(key, value);
        });
        // Build tree structure
        const treeItems = [];
        const bucketMap = new Map();
        const getKey = (source) => {
            switch (source.type) {
                case 'mcp':
                case 'extension':
                    return ToolDataSource.toKey(source);
                case 'internal':
                    return 1 /* BucketOrdinal.BuiltIn */.toString();
                case 'user':
                    return 0 /* BucketOrdinal.User */.toString();
                case 'external':
                    throw new Error('should not be reachable');
                default:
                    assertNever(source);
            }
        };
        const mcpServers = new Map(mcpService.servers.get().map(s => [s.definition.id, { server: s, seen: false }]));
        const createBucket = (source, key) => {
            if (source.type === 'mcp') {
                const mcpServerEntry = mcpServers.get(source.definitionId);
                if (!mcpServerEntry) {
                    return undefined;
                }
                mcpServerEntry.seen = true;
                const mcpServer = mcpServerEntry.server;
                const buttons = [];
                const collection = mcpRegistry.collections.get().find(c => c.id === mcpServer.collection.id);
                if (collection?.source) {
                    buttons.push({
                        iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                        tooltip: localize(5275, null, collection.label),
                        action: () => collection.source ? collection.source instanceof ExtensionIdentifier ? extensionsWorkbenchService.open(collection.source.value, { tab: "features" /* ExtensionEditorTab.Features */, feature: 'mcp' }) : mcpWorkbenchService.open(collection.source, { tab: "configuration" /* McpServerEditorTab.Configuration */ }) : undefined
                    });
                }
                else if (collection?.presentation?.origin) {
                    buttons.push({
                        iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                        tooltip: localize(5276, null, collection.label),
                        action: () => editorService.openEditor({
                            resource: collection.presentation.origin,
                        })
                    });
                }
                if (mcpServer.connectionState.get().state === 3 /* McpConnectionState.Kind.Error */) {
                    buttons.push({
                        iconClass: ThemeIcon.asClassName(Codicon.warning),
                        tooltip: localize(5277, null),
                        action: () => mcpServer.showOutput(),
                    });
                }
                const cacheState = mcpServer.cacheState.get();
                const children = [];
                let collapsed = true;
                if (cacheState === 0 /* McpServerCacheState.Unknown */ || cacheState === 2 /* McpServerCacheState.Outdated */) {
                    collapsed = false;
                    children.push({
                        itemType: 'callback',
                        iconClass: ThemeIcon.asClassName(Codicon.sync),
                        label: localize(5278, null),
                        pickable: false,
                        run: () => {
                            treePicker.busy = true;
                            (async () => {
                                const ok = await startServerAndWaitForLiveTools(mcpServer, { promptType: 'all-untrusted' });
                                if (!ok) {
                                    mcpServer.showOutput();
                                    treePicker.hide();
                                    return;
                                }
                                treePicker.busy = false;
                                computeItems(collectResults());
                            })();
                            return false;
                        },
                    });
                }
                const bucket = {
                    itemType: 'bucket',
                    ordinal: 2 /* BucketOrdinal.Mcp */,
                    id: key,
                    label: source.label,
                    checked: undefined,
                    collapsed,
                    children,
                    buttons,
                    sortOrder: 2,
                };
                const iconPath = mcpServer.serverMetadata.get()?.icons.getUrl(22);
                if (iconPath) {
                    bucket.iconPath = iconPath;
                }
                else {
                    bucket.iconClass = ThemeIcon.asClassName(Codicon.mcp);
                }
                return bucket;
            }
            else if (source.type === 'extension') {
                return {
                    itemType: 'bucket',
                    ordinal: 3 /* BucketOrdinal.Extension */,
                    id: key,
                    label: source.label,
                    checked: undefined,
                    children: [],
                    buttons: [],
                    collapsed: true,
                    iconClass: ThemeIcon.asClassName(Codicon.extensions),
                    sortOrder: 3,
                };
            }
            else if (source.type === 'internal') {
                return {
                    itemType: 'bucket',
                    ordinal: 1 /* BucketOrdinal.BuiltIn */,
                    id: key,
                    label: localize(5279, null),
                    checked: undefined,
                    children: [],
                    buttons: [],
                    collapsed: false,
                    sortOrder: 1,
                };
            }
            else {
                return {
                    itemType: 'bucket',
                    ordinal: 0 /* BucketOrdinal.User */,
                    id: key,
                    label: localize(5280, null),
                    checked: undefined,
                    children: [],
                    buttons: [],
                    collapsed: true,
                    sortOrder: 4,
                };
            }
        };
        const getBucket = (source) => {
            const key = getKey(source);
            let bucket = bucketMap.get(key);
            if (!bucket) {
                bucket = createBucket(source, key);
                if (bucket) {
                    bucketMap.set(key, bucket);
                }
            }
            return bucket;
        };
        for (const toolSet of toolsService.toolSets.get()) {
            if (!toolsEntries.has(toolSet)) {
                continue;
            }
            const bucket = getBucket(toolSet.source);
            if (!bucket) {
                continue;
            }
            const toolSetChecked = toolsEntries.get(toolSet) === true;
            if (toolSet.source.type === 'mcp') {
                // bucket represents the toolset
                bucket.toolset = toolSet;
                if (toolSetChecked) {
                    bucket.checked = toolSetChecked;
                }
                // all mcp tools are part of toolsService.getTools()
            }
            else {
                const treeItem = createToolSetTreeItem(toolSet, toolSetChecked, editorService);
                bucket.children.push(treeItem);
                const children = [];
                for (const tool of toolSet.getTools()) {
                    const toolChecked = toolSetChecked || toolsEntries.get(tool) === true;
                    const toolTreeItem = createToolTreeItemFromData(tool, toolChecked);
                    children.push(toolTreeItem);
                }
                if (children.length > 0) {
                    treeItem.children = children;
                }
            }
        }
        for (const tool of toolsService.getTools()) {
            if (!tool.canBeReferencedInPrompt || !toolsEntries.has(tool)) {
                continue;
            }
            const bucket = getBucket(tool.source);
            if (!bucket) {
                continue;
            }
            const toolChecked = bucket.checked === true || toolsEntries.get(tool) === true;
            const toolTreeItem = createToolTreeItemFromData(tool, toolChecked);
            bucket.children.push(toolTreeItem);
        }
        // Show entries for MCP servers that don't have any tools in them and might need to be started.
        for (const { server, seen } of mcpServers.values()) {
            const cacheState = server.cacheState.get();
            if (!seen && (cacheState === 0 /* McpServerCacheState.Unknown */ || cacheState === 2 /* McpServerCacheState.Outdated */)) {
                getBucket({ type: 'mcp', definitionId: server.definition.id, label: server.definition.label, instructions: '', serverLabel: '', collectionId: server.collection.id });
            }
        }
        // Convert bucket map to sorted tree items
        const sortedBuckets = Array.from(bucketMap.values()).sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) {
                return a.sortOrder - b.sortOrder;
            }
            return a.label.localeCompare(b.label);
        });
        for (const bucket of sortedBuckets) {
            treeItems.push(bucket);
            // Sort children alphabetically
            bucket.children.sort((a, b) => a.label.localeCompare(b.label));
            for (const child of bucket.children) {
                if (isToolSetTreeItem(child) && child.children) {
                    child.children.sort((a, b) => a.label.localeCompare(b.label));
                }
            }
        }
        if (treeItems.length === 0) {
            treePicker.placeholder = localize(5281, null);
        }
        else {
            treePicker.placeholder = placeHolder;
        }
        treePicker.setItemTree(treeItems);
    }
    // Create and configure the tree picker
    const store = new DisposableStore();
    const treePicker = store.add(quickPickService.createQuickTree());
    treePicker.placeholder = placeHolder;
    treePicker.ignoreFocusOut = true;
    treePicker.description = description;
    treePicker.matchOnDescription = true;
    treePicker.matchOnLabel = true;
    treePicker.sortByLabel = false;
    computeItems();
    // Handle button triggers
    store.add(treePicker.onDidTriggerItemButton(e => {
        if (e.button && typeof e.button.action === 'function') {
            e.button.action();
            store.dispose();
        }
    }));
    const updateToolLimitMessage = () => {
        if (toolLimit) {
            let count = 0;
            const traverse = (items) => {
                for (const item of items) {
                    if (isBucketTreeItem(item) || isToolSetTreeItem(item)) {
                        if (item.children) {
                            traverse(item.children);
                        }
                    }
                    else if (isToolTreeItem(item) && item.checked) {
                        count++;
                    }
                }
            };
            traverse(treePicker.itemTree);
            if (count > toolLimit) {
                treePicker.severity = Severity.Warning;
                treePicker.validationMessage = localize(5282, null, count, createMarkdownCommandLink({ title: String(toolLimit), id: '_chat.toolPicker.closeAndOpenVirtualThreshold' }));
            }
            else {
                treePicker.severity = Severity.Ignore;
                treePicker.validationMessage = undefined;
            }
        }
    };
    updateToolLimitMessage();
    const collectResults = () => {
        const result = new Map();
        const traverse = (items) => {
            for (const item of items) {
                if (isBucketTreeItem(item)) {
                    if (item.toolset) { // MCP server
                        // MCP toolset is enabled only if all tools are enabled
                        const allChecked = item.checked === true;
                        result.set(item.toolset, allChecked);
                    }
                    traverse(item.children);
                }
                else if (isToolSetTreeItem(item)) {
                    result.set(item.toolset, item.checked === true);
                    if (item.children) {
                        traverse(item.children);
                    }
                }
                else if (isToolTreeItem(item)) {
                    result.set(item.tool, item.checked || result.get(item.tool) === true); // tools can be in user tool sets and other buckets
                }
            }
        };
        traverse(treePicker.itemTree);
        return result;
    };
    // Temporary command to close the picker and open settings, for use in the validation message
    store.add(CommandsRegistry.registerCommand({
        id: '_chat.toolPicker.closeAndOpenVirtualThreshold',
        handler: () => {
            treePicker.hide();
            commandService.executeCommand('workbench.action.openSettings', 'github.copilot.chat.virtualTools.threshold');
        }
    }));
    // Handle checkbox state changes
    store.add(treePicker.onDidChangeCheckedLeafItems(() => updateToolLimitMessage()));
    // Handle acceptance
    let didAccept = false;
    const didAcceptFinalItem = store.add(new Emitter());
    store.add(treePicker.onDidAccept(() => {
        // Check if a callback item was activated
        const activeItems = treePicker.activeItems;
        const callbackItem = activeItems.find(isCallbackTreeItem);
        if (!callbackItem) {
            didAccept = true;
            treePicker.hide();
            return;
        }
        const ret = callbackItem.run();
        if (ret !== false) {
            didAcceptFinalItem.fire();
        }
    }));
    const addMcpServerButton = {
        iconClass: ThemeIcon.asClassName(Codicon.mcp),
        tooltip: localize(5283, null)
    };
    const installExtension = {
        iconClass: ThemeIcon.asClassName(Codicon.extensions),
        tooltip: localize(5284, null)
    };
    const configureToolSets = {
        iconClass: ThemeIcon.asClassName(Codicon.gear),
        tooltip: localize(5285, null)
    };
    treePicker.title = localize(5286, null);
    treePicker.buttons = [addMcpServerButton, installExtension, configureToolSets];
    store.add(treePicker.onDidTriggerButton(button => {
        if (button === addMcpServerButton) {
            commandService.executeCommand("workbench.mcp.addConfiguration" /* McpCommandIds.AddConfiguration */);
        }
        else if (button === installExtension) {
            extensionsWorkbenchService.openSearch('@tag:language-model-tools');
        }
        else if (button === configureToolSets) {
            commandService.executeCommand(ConfigureToolSets.ID);
        }
        treePicker.hide();
    }));
    treePicker.show();
    await Promise.race([Event.toPromise(Event.any(treePicker.onDidHide, didAcceptFinalItem.event), store)]);
    store.dispose();
    return didAccept ? collectResults() : undefined;
}
//# sourceMappingURL=chatToolPicker.js.map