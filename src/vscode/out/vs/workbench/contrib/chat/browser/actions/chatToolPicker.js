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
            tooltip: localize('editUserBucket', "Edit Tool Set"),
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
                        tooltip: localize('configMcpCol', "Configure {0}", collection.label),
                        action: () => collection.source ? collection.source instanceof ExtensionIdentifier ? extensionsWorkbenchService.open(collection.source.value, { tab: "features" /* ExtensionEditorTab.Features */, feature: 'mcp' }) : mcpWorkbenchService.open(collection.source, { tab: "configuration" /* McpServerEditorTab.Configuration */ }) : undefined
                    });
                }
                else if (collection?.presentation?.origin) {
                    buttons.push({
                        iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                        tooltip: localize('configMcpCol', "Configure {0}", collection.label),
                        action: () => editorService.openEditor({
                            resource: collection.presentation.origin,
                        })
                    });
                }
                if (mcpServer.connectionState.get().state === 3 /* McpConnectionState.Kind.Error */) {
                    buttons.push({
                        iconClass: ThemeIcon.asClassName(Codicon.warning),
                        tooltip: localize('mcpShowOutput', "Show Output"),
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
                        label: localize('mcpUpdate', "Update Tools"),
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
                    label: localize('defaultBucketLabel', "Built-In"),
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
                    label: localize('userBucket', "User Defined Tool Sets"),
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
            treePicker.placeholder = localize('noTools', "Add tools to chat");
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
                treePicker.validationMessage = localize('toolLimitExceeded', "{0} tools are enabled. You may experience degraded tool calling above {1} tools.", count, createMarkdownCommandLink({ title: String(toolLimit), id: '_chat.toolPicker.closeAndOpenVirtualThreshold' }));
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
        tooltip: localize('addMcpServer', 'Add MCP Server...')
    };
    const installExtension = {
        iconClass: ThemeIcon.asClassName(Codicon.extensions),
        tooltip: localize('addExtensionButton', 'Install Extension...')
    };
    const configureToolSets = {
        iconClass: ThemeIcon.asClassName(Codicon.gear),
        tooltip: localize('configToolSets', 'Configure Tool Sets...')
    };
    treePicker.title = localize('configureTools', "Configure Tools");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xQaWNrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0VG9vbFBpY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sUUFBUSxNQUFNLHdDQUF3QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBRTlGLE9BQU8sRUFBcUIsa0JBQWtCLEVBQWtDLE1BQU0seURBQXlELENBQUM7QUFDaEosT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JGLE9BQU8sRUFBc0IsMkJBQTJCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUUzRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7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