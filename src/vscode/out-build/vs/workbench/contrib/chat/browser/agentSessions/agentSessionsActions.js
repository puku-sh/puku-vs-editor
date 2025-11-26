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
import './media/agentsessionsactions.css';
import { localize, localize2 } from '../../../../../nls.js';
import { Action } from '../../../../../base/common/actions.js';
import { ActionViewItem } from '../../../../../base/browser/ui/actionbar/actionViewItems.js';
import { CommandsRegistry, ICommandService } from '../../../../../platform/commands/common/commands.js';
import { EventHelper, h, hide, show } from '../../../../../base/browser/dom.js';
import { assertReturnsDefined } from '../../../../../base/common/types.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ViewAction } from '../../../../browser/parts/views/viewPane.js';
import { AGENT_SESSIONS_VIEW_ID, AgentSessionProviders } from './agentSessions.js';
import { IChatService } from '../../common/chatService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { resetFilter } from './agentSessionsViewFilter.js';
//#region Diff Statistics Action
export class AgentSessionShowDiffAction extends Action {
    static { this.ID = 'agentSession.showDiff'; }
    constructor(session) {
        super(AgentSessionShowDiffAction.ID, localize(5309, null), undefined, true);
        this.session = session;
    }
    async run() {
        // This will be handled by the action view item
    }
    getSession() {
        return this.session;
    }
}
let AgentSessionDiffActionViewItem = class AgentSessionDiffActionViewItem extends ActionViewItem {
    get action() {
        return super.action;
    }
    constructor(action, options, commandService) {
        super(null, action, options);
        this.commandService = commandService;
    }
    render(container) {
        super.render(container);
        const label = assertReturnsDefined(this.label);
        label.textContent = '';
        const session = this.action.getSession();
        const diff = session.statistics;
        if (!diff) {
            return;
        }
        const elements = h('div.agent-session-diff-container@diffContainer', [
            h('span.agent-session-diff-files@filesSpan'),
            h('span.agent-session-diff-added@addedSpan'),
            h('span.agent-session-diff-removed@removedSpan')
        ]);
        if (diff.files > 0) {
            elements.filesSpan.textContent = diff.files === 1 ? localize(5310, null) : localize(5311, null, diff.files);
            show(elements.filesSpan);
        }
        else {
            hide(elements.filesSpan);
        }
        if (diff.insertions > 0) {
            elements.addedSpan.textContent = `+${diff.insertions}`;
            show(elements.addedSpan);
        }
        else {
            hide(elements.addedSpan);
        }
        if (diff.deletions > 0) {
            elements.removedSpan.textContent = `-${diff.deletions}`;
            show(elements.removedSpan);
        }
        else {
            hide(elements.removedSpan);
        }
        label.appendChild(elements.diffContainer);
    }
    onClick(event) {
        EventHelper.stop(event, true);
        const session = this.action.getSession();
        this.commandService.executeCommand(`agentSession.${session.providerType}.openChanges`, this.action.getSession().resource);
    }
};
AgentSessionDiffActionViewItem = __decorate([
    __param(2, ICommandService)
], AgentSessionDiffActionViewItem);
export { AgentSessionDiffActionViewItem };
CommandsRegistry.registerCommand(`agentSession.${AgentSessionProviders.Local}.openChanges`, async (accessor, resource) => {
    const chatService = accessor.get(IChatService);
    const session = chatService.getSession(resource);
    session?.editingSession?.show();
});
//#endregion
//#region View Actions
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'agentSessionsView.refresh',
            title: localize2(5314, "Refresh Agent Sessions"),
            icon: Codicon.refresh,
            menu: {
                id: MenuId.AgentSessionsTitle,
                group: 'navigation',
                order: 1
            },
            viewId: AGENT_SESSIONS_VIEW_ID
        });
    }
    runInView(accessor, view) {
        view.refresh();
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'agentSessionsView.find',
            title: localize2(5315, "Find Agent Session"),
            icon: Codicon.search,
            menu: {
                id: MenuId.AgentSessionsTitle,
                group: 'navigation',
                order: 2
            },
            viewId: AGENT_SESSIONS_VIEW_ID
        });
    }
    runInView(accessor, view) {
        view.openFind();
    }
});
MenuRegistry.appendMenuItem(MenuId.AgentSessionsTitle, {
    submenu: MenuId.AgentSessionsFilterSubMenu,
    title: localize(5312, null),
    group: 'navigation',
    order: 100,
    icon: Codicon.filter
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'agentSessions.filter.resetExcludes',
            title: localize(5313, null),
            menu: {
                id: MenuId.AgentSessionsFilterSubMenu,
                group: '4_reset',
                order: 0,
            },
        });
    }
    run(accessor) {
        const storageService = accessor.get(IStorageService);
        resetFilter(storageService);
    }
});
//#endregion
//# sourceMappingURL=agentSessionsActions.js.map