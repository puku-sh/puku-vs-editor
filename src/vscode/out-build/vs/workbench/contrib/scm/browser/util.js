/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { Action } from '../../../../base/common/actions.js';
import { createActionViewItem, getActionBarActions, getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { equals } from '../../../../base/common/arrays.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { reset } from '../../../../base/browser/dom.js';
import { ResourceTree } from '../../../../base/common/resourceTree.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
export function isSCMViewService(element) {
    return Array.isArray(element.repositories) && Array.isArray(element.visibleRepositories);
}
export function isSCMRepository(element) {
    return !!element.provider && !!element.input;
}
export function isSCMInput(element) {
    return !!element.validateInput && typeof element.value === 'string';
}
export function isSCMActionButton(element) {
    return element.type === 'actionButton';
}
export function isSCMResourceGroup(element) {
    return !!element.provider && !!element.resources;
}
export function isSCMResource(element) {
    return !!element.sourceUri && isSCMResourceGroup(element.resourceGroup);
}
export function isSCMResourceNode(element) {
    return ResourceTree.isResourceNode(element) && isSCMResourceGroup(element.context);
}
export function isSCMHistoryItemViewModelTreeElement(element) {
    return element.type === 'historyItemViewModel';
}
export function isSCMHistoryItemLoadMoreTreeElement(element) {
    return element.type === 'historyItemLoadMore';
}
export function isSCMHistoryItemChangeViewModelTreeElement(element) {
    return element.type === 'historyItemChangeViewModel';
}
export function isSCMHistoryItemChangeNode(element) {
    return ResourceTree.isResourceNode(element) && isSCMHistoryItemViewModelTreeElement(element.context);
}
export function isSCMArtifactGroupTreeElement(element) {
    return element.type === 'artifactGroup';
}
export function isSCMArtifactNode(element) {
    return ResourceTree.isResourceNode(element) && isSCMArtifactGroupTreeElement(element.context);
}
export function isSCMArtifactTreeElement(element) {
    return element.type === 'artifact';
}
const compareActions = (a, b) => {
    if (a instanceof MenuItemAction && b instanceof MenuItemAction) {
        return a.id === b.id && a.enabled === b.enabled && a.hideActions?.isHidden === b.hideActions?.isHidden;
    }
    return a.id === b.id && a.enabled === b.enabled;
};
export function connectPrimaryMenu(menu, callback, primaryGroup, arg) {
    let cachedPrimary = [];
    let cachedSecondary = [];
    const updateActions = () => {
        const { primary, secondary } = getActionBarActions(menu.getActions({ arg, shouldForwardArgs: true }), primaryGroup);
        if (equals(cachedPrimary, primary, compareActions) && equals(cachedSecondary, secondary, compareActions)) {
            return;
        }
        cachedPrimary = primary;
        cachedSecondary = secondary;
        callback(primary, secondary);
    };
    updateActions();
    return menu.onDidChange(updateActions);
}
export function collectContextMenuActions(menu, arg) {
    return getContextMenuActions(menu.getActions({ arg, shouldForwardArgs: true }), 'inline').secondary;
}
export class StatusBarAction extends Action {
    constructor(command, commandService) {
        super(`statusbaraction{${command.id}}`, getStatusBarCommandGenericName(command), '', true);
        this.command = command;
        this.commandService = commandService;
        this.commandTitle = command.title;
        this.tooltip = command.tooltip || '';
    }
    run() {
        return this.commandService.executeCommand(this.command.id, ...(this.command.arguments || []));
    }
}
class StatusBarActionViewItem extends ActionViewItem {
    constructor(action, options) {
        super(null, action, { ...options, icon: false, label: true });
        this._commandTitle = action.commandTitle;
    }
    render(container) {
        container.classList.add('scm-status-bar-action');
        super.render(container);
    }
    updateLabel() {
        if (this.options.label && this.label) {
            // Convert text nodes to span elements to enable
            // text overflow on the left hand side of the label
            const elements = renderLabelWithIcons(this._commandTitle ?? this.action.label)
                .map(element => {
                if (typeof element === 'string') {
                    const span = document.createElement('span');
                    span.textContent = element;
                    return span;
                }
                return element;
            });
            reset(this.label, ...elements);
        }
    }
}
export function getActionViewItemProvider(instaService) {
    return (action, options) => {
        if (action instanceof StatusBarAction) {
            return new StatusBarActionViewItem(action, options);
        }
        return createActionViewItem(instaService, action, options);
    };
}
export function getProviderKey(provider) {
    return `${provider.providerId}:${provider.label}${provider.rootUri ? `:${provider.rootUri.toString()}` : ''}`;
}
export function getRepositoryResourceCount(provider) {
    return provider.groups.reduce((r, g) => r + g.resources.length, 0);
}
export function getHistoryItemEditorTitle(historyItem) {
    return `${historyItem.displayId ?? historyItem.id} - ${historyItem.subject}`;
}
export function getSCMRepositoryIcon(activeRepository, repository) {
    if (!ThemeIcon.isThemeIcon(repository.provider.iconPath)) {
        return Codicon.repo;
    }
    if (activeRepository?.pinned === true &&
        activeRepository?.repository.id === repository.id &&
        repository.provider.iconPath.id === Codicon.repo.id) {
        return Codicon.repoPinned;
    }
    return repository.provider.iconPath;
}
export function getStatusBarCommandGenericName(command) {
    let genericName = undefined;
    // Get a generic name for the status bar action, derive this from the first
    // command argument which is in the form of "<extension>.<command>/<number>"
    if (typeof command.arguments?.[0] === 'string') {
        const lastIndex = command.arguments[0].lastIndexOf('/');
        genericName = lastIndex !== -1
            ? command.arguments[0].substring(0, lastIndex)
            : command.arguments[0];
        genericName = genericName
            .replace(/^(?:git\.|remoteHub\.)/, '')
            .trim();
        if (genericName.length === 0) {
            return undefined;
        }
        // Capitalize first letter
        genericName = genericName[0].toLocaleUpperCase() + genericName.slice(1);
    }
    return genericName;
}
//# sourceMappingURL=util.js.map