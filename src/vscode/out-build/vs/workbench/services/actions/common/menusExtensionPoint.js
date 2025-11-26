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
import { localize } from '../../../../nls.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import * as resources from '../../../../base/common/resources.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { index } from '../../../../base/common/arrays.js';
import { isProposedApiEnabled } from '../../extensions/common/extensions.js';
import { Extensions as ExtensionFeaturesExtensions } from '../../extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { platform } from '../../../../base/common/process.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
const apiMenus = [
    {
        key: 'commandPalette',
        id: MenuId.CommandPalette,
        description: localize(14917, null),
        supportsSubmenus: false
    },
    {
        key: 'touchBar',
        id: MenuId.TouchBarContext,
        description: localize(14918, null),
        supportsSubmenus: false
    },
    {
        key: 'editor/title',
        id: MenuId.EditorTitle,
        description: localize(14919, null)
    },
    {
        key: 'editor/title/run',
        id: MenuId.EditorTitleRun,
        description: localize(14920, null)
    },
    {
        key: 'editor/context',
        id: MenuId.EditorContext,
        description: localize(14921, null)
    },
    {
        key: 'editor/context/copy',
        id: MenuId.EditorContextCopy,
        description: localize(14922, null)
    },
    {
        key: 'editor/context/share',
        id: MenuId.EditorContextShare,
        description: localize(14923, null),
        proposed: 'contribShareMenu'
    },
    {
        key: 'explorer/context',
        id: MenuId.ExplorerContext,
        description: localize(14924, null)
    },
    {
        key: 'explorer/context/share',
        id: MenuId.ExplorerContextShare,
        description: localize(14925, null),
        proposed: 'contribShareMenu'
    },
    {
        key: 'editor/title/context',
        id: MenuId.EditorTitleContext,
        description: localize(14926, null)
    },
    {
        key: 'editor/title/context/share',
        id: MenuId.EditorTitleContextShare,
        description: localize(14927, null),
        proposed: 'contribShareMenu'
    },
    {
        key: 'debug/callstack/context',
        id: MenuId.DebugCallStackContext,
        description: localize(14928, null)
    },
    {
        key: 'debug/variables/context',
        id: MenuId.DebugVariablesContext,
        description: localize(14929, null)
    },
    {
        key: 'debug/watch/context',
        id: MenuId.DebugWatchContext,
        description: localize(14930, null)
    },
    {
        key: 'debug/toolBar',
        id: MenuId.DebugToolBar,
        description: localize(14931, null)
    },
    {
        key: 'debug/createConfiguration',
        id: MenuId.DebugCreateConfiguration,
        proposed: 'contribDebugCreateConfiguration',
        description: localize(14932, null)
    },
    {
        key: 'notebook/variables/context',
        id: MenuId.NotebookVariablesContext,
        description: localize(14933, null)
    },
    {
        key: 'menuBar/home',
        id: MenuId.MenubarHomeMenu,
        description: localize(14934, null),
        proposed: 'contribMenuBarHome',
        supportsSubmenus: false
    },
    {
        key: 'menuBar/edit/copy',
        id: MenuId.MenubarCopy,
        description: localize(14935, null)
    },
    {
        key: 'scm/title',
        id: MenuId.SCMTitle,
        description: localize(14936, null)
    },
    {
        key: 'scm/sourceControl',
        id: MenuId.SCMSourceControl,
        description: localize(14937, null)
    },
    {
        key: 'scm/repositories/title',
        id: MenuId.SCMSourceControlTitle,
        description: localize(14938, null),
        proposed: 'contribSourceControlTitleMenu'
    },
    {
        key: 'scm/repository',
        id: MenuId.SCMSourceControlInline,
        description: localize(14939, null),
    },
    {
        key: 'scm/resourceState/context',
        id: MenuId.SCMResourceContext,
        description: localize(14940, null)
    },
    {
        key: 'scm/resourceFolder/context',
        id: MenuId.SCMResourceFolderContext,
        description: localize(14941, null)
    },
    {
        key: 'scm/resourceGroup/context',
        id: MenuId.SCMResourceGroupContext,
        description: localize(14942, null)
    },
    {
        key: 'scm/change/title',
        id: MenuId.SCMChangeContext,
        description: localize(14943, null)
    },
    {
        key: 'scm/inputBox',
        id: MenuId.SCMInputBox,
        description: localize(14944, null),
        proposed: 'contribSourceControlInputBoxMenu'
    },
    {
        key: 'scm/history/title',
        id: MenuId.SCMHistoryTitle,
        description: localize(14945, null),
        proposed: 'contribSourceControlHistoryTitleMenu'
    },
    {
        key: 'scm/historyItem/context',
        id: MenuId.SCMHistoryItemContext,
        description: localize(14946, null),
        proposed: 'contribSourceControlHistoryItemMenu'
    },
    {
        key: 'scm/historyItemRef/context',
        id: MenuId.SCMHistoryItemRefContext,
        description: localize(14947, null),
        proposed: 'contribSourceControlHistoryItemMenu'
    },
    {
        key: 'scm/artifactGroup/context',
        id: MenuId.SCMArtifactGroupContext,
        description: localize(14948, null),
        proposed: 'contribSourceControlArtifactGroupMenu'
    },
    {
        key: 'scm/artifact/context',
        id: MenuId.SCMArtifactContext,
        description: localize(14949, null),
        proposed: 'contribSourceControlArtifactMenu'
    },
    {
        key: 'statusBar/remoteIndicator',
        id: MenuId.StatusBarRemoteIndicatorMenu,
        description: localize(14950, null),
        supportsSubmenus: false
    },
    {
        key: 'terminal/context',
        id: MenuId.TerminalInstanceContext,
        description: localize(14951, null)
    },
    {
        key: 'terminal/title/context',
        id: MenuId.TerminalTabContext,
        description: localize(14952, null)
    },
    {
        key: 'view/title',
        id: MenuId.ViewTitle,
        description: localize(14953, null)
    },
    {
        key: 'viewContainer/title',
        id: MenuId.ViewContainerTitle,
        description: localize(14954, null),
        proposed: 'contribViewContainerTitle'
    },
    {
        key: 'view/item/context',
        id: MenuId.ViewItemContext,
        description: localize(14955, null)
    },
    {
        key: 'comments/comment/editorActions',
        id: MenuId.CommentEditorActions,
        description: localize(14956, null),
        proposed: 'contribCommentEditorActionsMenu'
    },
    {
        key: 'comments/commentThread/title',
        id: MenuId.CommentThreadTitle,
        description: localize(14957, null)
    },
    {
        key: 'comments/commentThread/context',
        id: MenuId.CommentThreadActions,
        description: localize(14958, null),
        supportsSubmenus: false
    },
    {
        key: 'comments/commentThread/additionalActions',
        id: MenuId.CommentThreadAdditionalActions,
        description: localize(14959, null),
        supportsSubmenus: true,
        proposed: 'contribCommentThreadAdditionalMenu'
    },
    {
        key: 'comments/commentThread/title/context',
        id: MenuId.CommentThreadTitleContext,
        description: localize(14960, null),
        proposed: 'contribCommentPeekContext'
    },
    {
        key: 'comments/comment/title',
        id: MenuId.CommentTitle,
        description: localize(14961, null)
    },
    {
        key: 'comments/comment/context',
        id: MenuId.CommentActions,
        description: localize(14962, null),
        supportsSubmenus: false
    },
    {
        key: 'comments/commentThread/comment/context',
        id: MenuId.CommentThreadCommentContext,
        description: localize(14963, null),
        proposed: 'contribCommentPeekContext'
    },
    {
        key: 'commentsView/commentThread/context',
        id: MenuId.CommentsViewThreadActions,
        description: localize(14964, null),
        proposed: 'contribCommentsViewThreadMenus'
    },
    {
        key: 'notebook/toolbar',
        id: MenuId.NotebookToolbar,
        description: localize(14965, null)
    },
    {
        key: 'notebook/kernelSource',
        id: MenuId.NotebookKernelSource,
        description: localize(14966, null),
        proposed: 'notebookKernelSource'
    },
    {
        key: 'notebook/cell/title',
        id: MenuId.NotebookCellTitle,
        description: localize(14967, null)
    },
    {
        key: 'notebook/cell/execute',
        id: MenuId.NotebookCellExecute,
        description: localize(14968, null)
    },
    {
        key: 'interactive/toolbar',
        id: MenuId.InteractiveToolbar,
        description: localize(14969, null),
    },
    {
        key: 'interactive/cell/title',
        id: MenuId.InteractiveCellTitle,
        description: localize(14970, null),
    },
    {
        key: 'issue/reporter',
        id: MenuId.IssueReporter,
        description: localize(14971, null)
    },
    {
        key: 'testing/item/context',
        id: MenuId.TestItem,
        description: localize(14972, null),
    },
    {
        key: 'testing/item/gutter',
        id: MenuId.TestItemGutter,
        description: localize(14973, null),
    },
    {
        key: 'testing/profiles/context',
        id: MenuId.TestProfilesContext,
        description: localize(14974, null),
    },
    {
        key: 'testing/item/result',
        id: MenuId.TestPeekElement,
        description: localize(14975, null),
    },
    {
        key: 'testing/message/context',
        id: MenuId.TestMessageContext,
        description: localize(14976, null),
    },
    {
        key: 'testing/message/content',
        id: MenuId.TestMessageContent,
        description: localize(14977, null),
    },
    {
        key: 'extension/context',
        id: MenuId.ExtensionContext,
        description: localize(14978, null)
    },
    {
        key: 'timeline/title',
        id: MenuId.TimelineTitle,
        description: localize(14979, null)
    },
    {
        key: 'timeline/item/context',
        id: MenuId.TimelineItemContext,
        description: localize(14980, null)
    },
    {
        key: 'ports/item/context',
        id: MenuId.TunnelContext,
        description: localize(14981, null)
    },
    {
        key: 'ports/item/origin/inline',
        id: MenuId.TunnelOriginInline,
        description: localize(14982, null)
    },
    {
        key: 'ports/item/port/inline',
        id: MenuId.TunnelPortInline,
        description: localize(14983, null)
    },
    {
        key: 'file/newFile',
        id: MenuId.NewFile,
        description: localize(14984, null),
        supportsSubmenus: false,
    },
    {
        key: 'webview/context',
        id: MenuId.WebviewContext,
        description: localize(14985, null)
    },
    {
        key: 'file/share',
        id: MenuId.MenubarShare,
        description: localize(14986, null),
        proposed: 'contribShareMenu'
    },
    {
        key: 'editor/inlineCompletions/actions',
        id: MenuId.InlineCompletionsActions,
        description: localize(14987, null),
        supportsSubmenus: false,
        proposed: 'inlineCompletionsAdditions'
    },
    {
        key: 'editor/content',
        id: MenuId.EditorContent,
        description: localize(14988, null),
        proposed: 'contribEditorContentMenu'
    },
    {
        key: 'editor/lineNumber/context',
        id: MenuId.EditorLineNumberContext,
        description: localize(14989, null)
    },
    {
        key: 'mergeEditor/result/title',
        id: MenuId.MergeInputResultToolbar,
        description: localize(14990, null),
        proposed: 'contribMergeEditorMenus'
    },
    {
        key: 'multiDiffEditor/resource/title',
        id: MenuId.MultiDiffEditorFileToolbar,
        description: localize(14991, null),
        proposed: 'contribMultiDiffEditorMenus'
    },
    {
        key: 'diffEditor/gutter/hunk',
        id: MenuId.DiffEditorHunkToolbar,
        description: localize(14992, null),
        proposed: 'contribDiffEditorGutterToolBarMenus'
    },
    {
        key: 'diffEditor/gutter/selection',
        id: MenuId.DiffEditorSelectionToolbar,
        description: localize(14993, null),
        proposed: 'contribDiffEditorGutterToolBarMenus'
    },
    {
        key: 'searchPanel/aiResults/commands',
        id: MenuId.SearchActionMenu,
        description: localize(14994, null),
    },
    {
        key: 'editor/context/chat',
        id: MenuId.ChatTextEditorMenu,
        description: localize(14995, null),
        supportsSubmenus: false,
        proposed: 'chatParticipantPrivate'
    },
    {
        // TODO: rename this to something like: `chatSessions/item/inline`
        key: 'chat/chatSessions',
        id: MenuId.ChatSessionsMenu,
        description: localize(14996, null),
        supportsSubmenus: false,
        proposed: 'chatSessionsProvider'
    },
    {
        key: 'chatSessions/newSession',
        id: MenuId.ChatSessionsCreateSubMenu,
        description: localize(14997, null),
        supportsSubmenus: false,
        proposed: 'chatSessionsProvider'
    },
    {
        key: 'chat/multiDiff/context',
        id: MenuId.ChatMultiDiffContext,
        description: localize(14998, null),
        supportsSubmenus: false,
        proposed: 'chatSessionsProvider',
    },
];
var schema;
(function (schema) {
    // --- menus, submenus contribution point
    function isMenuItem(item) {
        return typeof item.command === 'string';
    }
    schema.isMenuItem = isMenuItem;
    function isValidMenuItem(item, collector) {
        if (typeof item.command !== 'string') {
            collector.error(localize(14999, null, 'command'));
            return false;
        }
        if (item.alt && typeof item.alt !== 'string') {
            collector.error(localize(15000, null, 'alt'));
            return false;
        }
        if (item.when && typeof item.when !== 'string') {
            collector.error(localize(15001, null, 'when'));
            return false;
        }
        if (item.group && typeof item.group !== 'string') {
            collector.error(localize(15002, null, 'group'));
            return false;
        }
        return true;
    }
    schema.isValidMenuItem = isValidMenuItem;
    function isValidSubmenuItem(item, collector) {
        if (typeof item.submenu !== 'string') {
            collector.error(localize(15003, null, 'submenu'));
            return false;
        }
        if (item.when && typeof item.when !== 'string') {
            collector.error(localize(15004, null, 'when'));
            return false;
        }
        if (item.group && typeof item.group !== 'string') {
            collector.error(localize(15005, null, 'group'));
            return false;
        }
        return true;
    }
    schema.isValidSubmenuItem = isValidSubmenuItem;
    function isValidItems(items, collector) {
        if (!Array.isArray(items)) {
            collector.error(localize(15006, null));
            return false;
        }
        for (const item of items) {
            if (isMenuItem(item)) {
                if (!isValidMenuItem(item, collector)) {
                    return false;
                }
            }
            else {
                if (!isValidSubmenuItem(item, collector)) {
                    return false;
                }
            }
        }
        return true;
    }
    schema.isValidItems = isValidItems;
    function isValidSubmenu(submenu, collector) {
        if (typeof submenu !== 'object') {
            collector.error(localize(15007, null));
            return false;
        }
        if (typeof submenu.id !== 'string') {
            collector.error(localize(15008, null, 'id'));
            return false;
        }
        if (typeof submenu.label !== 'string') {
            collector.error(localize(15009, null, 'label'));
            return false;
        }
        return true;
    }
    schema.isValidSubmenu = isValidSubmenu;
    const menuItem = {
        type: 'object',
        required: ['command'],
        properties: {
            command: {
                description: localize(15010, null),
                type: 'string'
            },
            alt: {
                description: localize(15011, null),
                type: 'string'
            },
            when: {
                description: localize(15012, null),
                type: 'string'
            },
            group: {
                description: localize(15013, null),
                type: 'string'
            }
        }
    };
    const submenuItem = {
        type: 'object',
        required: ['submenu'],
        properties: {
            submenu: {
                description: localize(15014, null),
                type: 'string'
            },
            when: {
                description: localize(15015, null),
                type: 'string'
            },
            group: {
                description: localize(15016, null),
                type: 'string'
            }
        }
    };
    const submenu = {
        type: 'object',
        required: ['id', 'label'],
        properties: {
            id: {
                description: localize(15017, null),
                type: 'string'
            },
            label: {
                description: localize(15018, null),
                type: 'string'
            },
            icon: {
                description: localize(15019, null),
                anyOf: [{
                        type: 'string'
                    },
                    {
                        type: 'object',
                        properties: {
                            light: {
                                description: localize(15020, null),
                                type: 'string'
                            },
                            dark: {
                                description: localize(15021, null),
                                type: 'string'
                            }
                        }
                    }]
            }
        }
    };
    schema.menusContribution = {
        description: localize(15022, null),
        type: 'object',
        properties: index(apiMenus, menu => menu.key, menu => ({
            markdownDescription: menu.proposed ? localize(15023, null, menu.proposed, menu.description) : menu.description,
            type: 'array',
            items: menu.supportsSubmenus === false ? menuItem : { oneOf: [menuItem, submenuItem] }
        })),
        additionalProperties: {
            description: 'Submenu',
            type: 'array',
            items: { oneOf: [menuItem, submenuItem] }
        }
    };
    schema.submenusContribution = {
        description: localize(15024, null),
        type: 'array',
        items: submenu
    };
    function isValidCommand(command, collector) {
        if (!command) {
            collector.error(localize(15025, null));
            return false;
        }
        if (isFalsyOrWhitespace(command.command)) {
            collector.error(localize(15026, null, 'command'));
            return false;
        }
        if (!isValidLocalizedString(command.title, collector, 'title')) {
            return false;
        }
        if (command.shortTitle && !isValidLocalizedString(command.shortTitle, collector, 'shortTitle')) {
            return false;
        }
        if (command.enablement && typeof command.enablement !== 'string') {
            collector.error(localize(15027, null, 'precondition'));
            return false;
        }
        if (command.category && !isValidLocalizedString(command.category, collector, 'category')) {
            return false;
        }
        if (!isValidIcon(command.icon, collector)) {
            return false;
        }
        return true;
    }
    schema.isValidCommand = isValidCommand;
    function isValidIcon(icon, collector) {
        if (typeof icon === 'undefined') {
            return true;
        }
        if (typeof icon === 'string') {
            return true;
        }
        else if (typeof icon.dark === 'string' && typeof icon.light === 'string') {
            return true;
        }
        collector.error(localize(15028, null));
        return false;
    }
    function isValidLocalizedString(localized, collector, propertyName) {
        if (typeof localized === 'undefined') {
            collector.error(localize(15029, null, propertyName));
            return false;
        }
        else if (typeof localized === 'string' && isFalsyOrWhitespace(localized)) {
            collector.error(localize(15030, null, propertyName));
            return false;
        }
        else if (typeof localized !== 'string' && (isFalsyOrWhitespace(localized.original) || isFalsyOrWhitespace(localized.value))) {
            collector.error(localize(15031, null, `${propertyName}.value`, `${propertyName}.original`));
            return false;
        }
        return true;
    }
    const commandType = {
        type: 'object',
        required: ['command', 'title'],
        properties: {
            command: {
                description: localize(15032, null),
                type: 'string'
            },
            title: {
                description: localize(15033, null),
                type: 'string'
            },
            shortTitle: {
                markdownDescription: localize(15034, null),
                type: 'string'
            },
            category: {
                description: localize(15035, null),
                type: 'string'
            },
            enablement: {
                description: localize(15036, null),
                type: 'string'
            },
            icon: {
                description: localize(15037, null),
                anyOf: [{
                        type: 'string'
                    },
                    {
                        type: 'object',
                        properties: {
                            light: {
                                description: localize(15038, null),
                                type: 'string'
                            },
                            dark: {
                                description: localize(15039, null),
                                type: 'string'
                            }
                        }
                    }]
            }
        }
    };
    schema.commandsContribution = {
        description: localize(15040, null),
        oneOf: [
            commandType,
            {
                type: 'array',
                items: commandType
            }
        ]
    };
})(schema || (schema = {}));
const _commandRegistrations = new DisposableStore();
export const commandsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'commands',
    jsonSchema: schema.commandsContribution,
    activationEventsGenerator: function* (contribs) {
        for (const contrib of contribs) {
            if (contrib.command) {
                yield `onCommand:${contrib.command}`;
            }
        }
    }
});
commandsExtensionPoint.setHandler(extensions => {
    function handleCommand(userFriendlyCommand, extension) {
        if (!schema.isValidCommand(userFriendlyCommand, extension.collector)) {
            return;
        }
        const { icon, enablement, category, title, shortTitle, command } = userFriendlyCommand;
        let absoluteIcon;
        if (icon) {
            if (typeof icon === 'string') {
                absoluteIcon = ThemeIcon.fromString(icon) ?? { dark: resources.joinPath(extension.description.extensionLocation, icon), light: resources.joinPath(extension.description.extensionLocation, icon) };
            }
            else {
                absoluteIcon = {
                    dark: resources.joinPath(extension.description.extensionLocation, icon.dark),
                    light: resources.joinPath(extension.description.extensionLocation, icon.light)
                };
            }
        }
        const existingCmd = MenuRegistry.getCommand(command);
        if (existingCmd) {
            if (existingCmd.source) {
                extension.collector.info(localize(15041, null, userFriendlyCommand.command, existingCmd.source.title, existingCmd.source.id));
            }
            else {
                extension.collector.info(localize(15042, null, userFriendlyCommand.command));
            }
        }
        _commandRegistrations.add(MenuRegistry.addCommand({
            id: command,
            title,
            source: { id: extension.description.identifier.value, title: extension.description.displayName ?? extension.description.name },
            shortTitle,
            tooltip: title,
            category,
            precondition: ContextKeyExpr.deserialize(enablement),
            icon: absoluteIcon
        }));
    }
    // remove all previous command registrations
    _commandRegistrations.clear();
    for (const extension of extensions) {
        const { value } = extension;
        if (Array.isArray(value)) {
            for (const command of value) {
                handleCommand(command, extension);
            }
        }
        else {
            handleCommand(value, extension);
        }
    }
});
const _submenus = new Map();
const submenusExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'submenus',
    jsonSchema: schema.submenusContribution
});
submenusExtensionPoint.setHandler(extensions => {
    _submenus.clear();
    for (const extension of extensions) {
        const { value, collector } = extension;
        for (const [, submenuInfo] of Object.entries(value)) {
            if (!schema.isValidSubmenu(submenuInfo, collector)) {
                continue;
            }
            if (!submenuInfo.id) {
                collector.warn(localize(15043, null, submenuInfo.id));
                continue;
            }
            if (_submenus.has(submenuInfo.id)) {
                collector.info(localize(15044, null, submenuInfo.id));
                continue;
            }
            if (!submenuInfo.label) {
                collector.warn(localize(15045, null, submenuInfo.label));
                continue;
            }
            let absoluteIcon;
            if (submenuInfo.icon) {
                if (typeof submenuInfo.icon === 'string') {
                    absoluteIcon = ThemeIcon.fromString(submenuInfo.icon) || { dark: resources.joinPath(extension.description.extensionLocation, submenuInfo.icon) };
                }
                else {
                    absoluteIcon = {
                        dark: resources.joinPath(extension.description.extensionLocation, submenuInfo.icon.dark),
                        light: resources.joinPath(extension.description.extensionLocation, submenuInfo.icon.light)
                    };
                }
            }
            const item = {
                id: MenuId.for(`api:${submenuInfo.id}`),
                label: submenuInfo.label,
                icon: absoluteIcon
            };
            _submenus.set(submenuInfo.id, item);
        }
    }
});
const _apiMenusByKey = new Map(apiMenus.map(menu => ([menu.key, menu])));
const _menuRegistrations = new DisposableStore();
const _submenuMenuItems = new Map();
const menusExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'menus',
    jsonSchema: schema.menusContribution,
    deps: [submenusExtensionPoint]
});
menusExtensionPoint.setHandler(extensions => {
    // remove all previous menu registrations
    _menuRegistrations.clear();
    _submenuMenuItems.clear();
    for (const extension of extensions) {
        const { value, collector } = extension;
        for (const entry of Object.entries(value)) {
            if (!schema.isValidItems(entry[1], collector)) {
                continue;
            }
            let menu = _apiMenusByKey.get(entry[0]);
            if (!menu) {
                const submenu = _submenus.get(entry[0]);
                if (submenu) {
                    menu = {
                        key: entry[0],
                        id: submenu.id,
                        description: ''
                    };
                }
            }
            if (!menu) {
                continue;
            }
            if (menu.proposed && !isProposedApiEnabled(extension.description, menu.proposed)) {
                collector.error(localize(15046, null, entry[0], menu.proposed, extension.description.identifier.value));
                continue;
            }
            for (const menuItem of entry[1]) {
                let item;
                if (schema.isMenuItem(menuItem)) {
                    const command = MenuRegistry.getCommand(menuItem.command);
                    const alt = menuItem.alt && MenuRegistry.getCommand(menuItem.alt) || undefined;
                    if (!command) {
                        collector.error(localize(15047, null, menuItem.command));
                        continue;
                    }
                    if (menuItem.alt && !alt) {
                        collector.warn(localize(15048, null, menuItem.alt));
                    }
                    if (menuItem.command === menuItem.alt) {
                        collector.info(localize(15049, null));
                    }
                    item = { command, alt, group: undefined, order: undefined, when: undefined };
                }
                else {
                    if (menu.supportsSubmenus === false) {
                        collector.error(localize(15050, null));
                        continue;
                    }
                    const submenu = _submenus.get(menuItem.submenu);
                    if (!submenu) {
                        collector.error(localize(15051, null, menuItem.submenu));
                        continue;
                    }
                    let submenuRegistrations = _submenuMenuItems.get(menu.id.id);
                    if (!submenuRegistrations) {
                        submenuRegistrations = new Set();
                        _submenuMenuItems.set(menu.id.id, submenuRegistrations);
                    }
                    if (submenuRegistrations.has(submenu.id.id)) {
                        collector.warn(localize(15052, null, menuItem.submenu, entry[0]));
                        continue;
                    }
                    submenuRegistrations.add(submenu.id.id);
                    item = { submenu: submenu.id, icon: submenu.icon, title: submenu.label, group: undefined, order: undefined, when: undefined };
                }
                if (menuItem.group) {
                    const idx = menuItem.group.lastIndexOf('@');
                    if (idx > 0) {
                        item.group = menuItem.group.substr(0, idx);
                        item.order = Number(menuItem.group.substr(idx + 1)) || undefined;
                    }
                    else {
                        item.group = menuItem.group;
                    }
                }
                if (menu.id === MenuId.ViewContainerTitle && !menuItem.when?.includes('viewContainer == workbench.view.debug')) {
                    // Not a perfect check but enough to communicate that this proposed extension point is currently only for the debug view container
                    collector.error(localize(15053, null, '`viewContainer/title`', '`viewContainer == workbench.view.debug`', '"when"'));
                    continue;
                }
                item.when = ContextKeyExpr.deserialize(menuItem.when);
                _menuRegistrations.add(MenuRegistry.appendMenuItem(menu.id, item));
            }
        }
    }
});
let CommandsTableRenderer = class CommandsTableRenderer extends Disposable {
    constructor(_keybindingService) {
        super();
        this._keybindingService = _keybindingService;
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.commands;
    }
    render(manifest) {
        const rawCommands = manifest.contributes?.commands || [];
        const commands = rawCommands.map(c => ({
            id: c.command,
            title: c.title,
            keybindings: [],
            menus: []
        }));
        const byId = index(commands, c => c.id);
        const menus = manifest.contributes?.menus || {};
        // Add to commandPalette array any commands not explicitly contributed to it
        const implicitlyOnCommandPalette = index(commands, c => c.id);
        if (menus['commandPalette']) {
            for (const command of menus['commandPalette']) {
                delete implicitlyOnCommandPalette[command.command];
            }
        }
        if (Object.keys(implicitlyOnCommandPalette).length) {
            if (!menus['commandPalette']) {
                menus['commandPalette'] = [];
            }
            for (const command in implicitlyOnCommandPalette) {
                menus['commandPalette'].push({ command });
            }
        }
        for (const context in menus) {
            for (const menu of menus[context]) {
                // This typically happens for the commandPalette context
                if (menu.when === 'false') {
                    continue;
                }
                if (menu.command) {
                    let command = byId[menu.command];
                    if (command) {
                        if (!command.menus.includes(context)) {
                            command.menus.push(context);
                        }
                    }
                    else {
                        command = { id: menu.command, title: '', keybindings: [], menus: [context] };
                        byId[command.id] = command;
                        commands.push(command);
                    }
                }
            }
        }
        const rawKeybindings = manifest.contributes?.keybindings ? (Array.isArray(manifest.contributes.keybindings) ? manifest.contributes.keybindings : [manifest.contributes.keybindings]) : [];
        rawKeybindings.forEach(rawKeybinding => {
            const keybinding = this.resolveKeybinding(rawKeybinding);
            if (!keybinding) {
                return;
            }
            let command = byId[rawKeybinding.command];
            if (command) {
                command.keybindings.push(keybinding);
            }
            else {
                command = { id: rawKeybinding.command, title: '', keybindings: [keybinding], menus: [] };
                byId[command.id] = command;
                commands.push(command);
            }
        });
        if (!commands.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize(15054, null),
            localize(15055, null),
            localize(15056, null),
            localize(15057, null)
        ];
        const rows = commands.sort((a, b) => a.id.localeCompare(b.id))
            .map(command => {
            return [
                new MarkdownString().appendMarkdown(`\`${command.id}\``),
                typeof command.title === 'string' ? command.title : command.title.value,
                command.keybindings,
                new MarkdownString().appendMarkdown(`${command.menus.sort((a, b) => a.localeCompare(b)).map(menu => `\`${menu}\``).join('&nbsp;')}`),
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
    resolveKeybinding(rawKeyBinding) {
        let key;
        switch (platform) {
            case 'win32':
                key = rawKeyBinding.win;
                break;
            case 'linux':
                key = rawKeyBinding.linux;
                break;
            case 'darwin':
                key = rawKeyBinding.mac;
                break;
        }
        return this._keybindingService.resolveUserBinding(key ?? rawKeyBinding.key)[0];
    }
};
CommandsTableRenderer = __decorate([
    __param(0, IKeybindingService)
], CommandsTableRenderer);
Registry.as(ExtensionFeaturesExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'commands',
    label: localize(15058, null),
    access: {
        canToggle: false,
    },
    renderer: new SyncDescriptor(CommandsTableRenderer),
});
//# sourceMappingURL=menusExtensionPoint.js.map