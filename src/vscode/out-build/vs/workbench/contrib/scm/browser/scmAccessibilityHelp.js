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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { FocusedViewContext, SidebarFocusContext } from '../../../common/contextkeys.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { HISTORY_VIEW_PANE_ID, ISCMViewService, REPOSITORIES_VIEW_PANE_ID, VIEW_PANE_ID } from '../common/scm.js';
export class SCMAccessibilityHelp {
    constructor() {
        this.name = 'scm';
        this.type = "help" /* AccessibleViewType.Help */;
        this.priority = 100;
        this.when = ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals('activeViewlet', 'workbench.view.scm'), SidebarFocusContext), ContextKeyExpr.equals(FocusedViewContext.key, REPOSITORIES_VIEW_PANE_ID), ContextKeyExpr.equals(FocusedViewContext.key, VIEW_PANE_ID), ContextKeyExpr.equals(FocusedViewContext.key, HISTORY_VIEW_PANE_ID));
    }
    getProvider(accessor) {
        const commandService = accessor.get(ICommandService);
        const scmViewService = accessor.get(ISCMViewService);
        const viewsService = accessor.get(IViewsService);
        return new SCMAccessibilityHelpContentProvider(commandService, scmViewService, viewsService);
    }
}
let SCMAccessibilityHelpContentProvider = class SCMAccessibilityHelpContentProvider extends Disposable {
    constructor(_commandService, _scmViewService, _viewsService) {
        super();
        this._commandService = _commandService;
        this._scmViewService = _scmViewService;
        this._viewsService = _viewsService;
        this.id = "scm" /* AccessibleViewProviderId.SourceControl */;
        this.verbositySettingKey = "accessibility.verbosity.sourceControl" /* AccessibilityVerbositySettingId.SourceControl */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
        this._focusedView = this._viewsService.getFocusedViewName();
    }
    onClose() {
        switch (this._focusedView) {
            case 'Source Control':
                this._commandService.executeCommand('workbench.scm');
                break;
            case 'Source Control Repositories':
                this._commandService.executeCommand('workbench.scm.repositories');
                break;
            case 'Source Control Graph':
                this._commandService.executeCommand('workbench.scm.history');
                break;
            default:
                this._commandService.executeCommand('workbench.view.scm');
        }
    }
    provideContent() {
        const content = [];
        // Active Repository State
        if (this._scmViewService.visibleRepositories.length > 1) {
            const repositoryList = this._scmViewService.visibleRepositories.map(r => r.provider.name).join(', ');
            content.push(localize(11559, null, repositoryList));
        }
        const focusedRepository = this._scmViewService.focusedRepository;
        if (focusedRepository) {
            content.push(localize(11560, null, focusedRepository.provider.name));
            // History Item Reference
            const currentHistoryItemRef = focusedRepository.provider.historyProvider.get()?.historyItemRef.get();
            if (currentHistoryItemRef) {
                content.push(localize(11561, null, currentHistoryItemRef.name));
            }
            // Commit Message
            if (focusedRepository.input.visible && focusedRepository.input.enabled && focusedRepository.input.value !== '') {
                content.push(localize(11562, null, focusedRepository.input.value));
            }
            // Action Button
            const actionButton = focusedRepository.provider.actionButton.get();
            if (actionButton) {
                const label = actionButton.command.tooltip ?? actionButton.command.title;
                const enablementLabel = actionButton.enabled ? localize(11563, null) : localize(11564, null);
                content.push(localize(11565, null, label, enablementLabel));
            }
            // Resource Groups
            const resourceGroups = [];
            for (const resourceGroup of focusedRepository.provider.groups) {
                resourceGroups.push(`${resourceGroup.label} (${resourceGroup.resources.length} resource(s))`);
            }
            focusedRepository.provider.groups.map(g => g.label).join(', ');
            content.push(localize(11566, null, resourceGroups.join(', ')));
        }
        // Source Control Repositories
        content.push(localize(11567, null));
        content.push(localize(11568, null));
        content.push(localize(11569, null));
        content.push(localize(11570, null));
        content.push(localize(11571, null));
        content.push(localize(11572, null));
        // Source Control
        content.push(localize(11573, null));
        content.push(localize(11574, null));
        content.push(localize(11575, null));
        content.push(localize(11576, null));
        content.push(localize(11577, null));
        // Source Control Graph
        content.push(localize(11578, null));
        content.push(localize(11579, null));
        content.push(localize(11580, null));
        content.push(localize(11581, null));
        content.push(localize(11582, null));
        return content.join('\n');
    }
};
SCMAccessibilityHelpContentProvider = __decorate([
    __param(0, ICommandService),
    __param(1, ISCMViewService),
    __param(2, IViewsService)
], SCMAccessibilityHelpContentProvider);
//# sourceMappingURL=scmAccessibilityHelp.js.map