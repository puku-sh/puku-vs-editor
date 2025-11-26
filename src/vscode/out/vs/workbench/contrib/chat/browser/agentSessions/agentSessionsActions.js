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
        super(AgentSessionShowDiffAction.ID, localize('showDiff', "Open Changes"), undefined, true);
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
            elements.filesSpan.textContent = diff.files === 1 ? localize('diffFile', "1 file") : localize('diffFiles', "{0} files", diff.files);
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
            title: localize2('refresh', "Refresh Agent Sessions"),
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
            title: localize2('find', "Find Agent Session"),
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
    title: localize('filterAgentSessions', "Filter Agent Sessions"),
    group: 'navigation',
    order: 100,
    icon: Codicon.filter
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'agentSessions.filter.resetExcludes',
            title: localize('agentSessions.filter.reset', 'Reset'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uc0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWdlbnRTZXNzaW9ucy9hZ2VudFNlc3Npb25zQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLGtDQUFrQyxDQUFDO0FBQzFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFNUQsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLHVDQUF1QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxjQUFjLEVBQTBCLE1BQU0sNkRBQTZELENBQUM7QUFDckgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFnQixNQUFNLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2pJLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFHbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzNELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFM0QsZ0NBQWdDO0FBRWhDLE1BQU0sT0FBTywwQkFBMkIsU0FBUSxNQUFNO2FBRTlDLE9BQUUsR0FBRyx1QkFBdUIsQ0FBQztJQUVwQyxZQUNrQixPQUErQjtRQUVoRCxLQUFLLENBQUMsMEJBQTBCLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRjNFLFlBQU8sR0FBUCxPQUFPLENBQXdCO0lBR2pELENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRztRQUNqQiwrQ0FBK0M7SUFDaEQsQ0FBQztJQUVELFVBQVU7UUFDVCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDckIsQ0FBQzs7QUFHSyxJQUFNLDhCQUE4QixHQUFwQyxNQUFNLDhCQUErQixTQUFRLGNBQWM7SUFFakUsSUFBYSxNQUFNO1FBQ2xCLE9BQU8sS0FBSyxDQUFDLE1BQW9DLENBQUM7SUFDbkQsQ0FBQztJQUVELFlBQ0MsTUFBZSxFQUNmLE9BQStCLEVBQ0csY0FBK0I7UUFFakUsS0FBSyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFGSyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7SUFHbEUsQ0FBQztJQUVRLE1BQU0sQ0FBQyxTQUFzQjtRQUNyQyxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXhCLE1BQU0sS0FBSyxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQyxLQUFLLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUV2QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3pDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUM7UUFDaEMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTztRQUNSLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQ2pCLGdEQUFnRCxFQUNoRDtZQUNDLENBQUMsQ0FBQyx5Q0FBeUMsQ0FBQztZQUM1QyxDQUFDLENBQUMseUNBQXlDLENBQUM7WUFDNUMsQ0FBQyxDQUFDLDZDQUE2QyxDQUFDO1NBQ2hELENBQ0QsQ0FBQztRQUVGLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwQixRQUFRLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUIsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFCLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDekIsUUFBUSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMxQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUIsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN4QixRQUFRLENBQUMsV0FBVyxDQUFDLFdBQVcsR0FBRyxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN4RCxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzVCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBRUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVRLE9BQU8sQ0FBQyxLQUFpQjtRQUNqQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUU5QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBRXpDLElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLGdCQUFnQixPQUFPLENBQUMsWUFBWSxjQUFjLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzSCxDQUFDO0NBQ0QsQ0FBQTtBQWxFWSw4QkFBOEI7SUFTeEMsV0FBQSxlQUFlLENBQUE7R0FUTCw4QkFBOEIsQ0FrRTFDOztBQUVELGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IscUJBQXFCLENBQUMsS0FBSyxjQUFjLEVBQUUsS0FBSyxFQUFFLFFBQTBCLEVBQUUsUUFBYSxFQUFFLEVBQUU7SUFDL0ksTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUUvQyxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2pELE9BQU8sRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUM7QUFFSCxZQUFZO0FBRVosc0JBQXNCO0FBRXRCLGVBQWUsQ0FBQyxLQUFNLFNBQVEsVUFBNkI7SUFDMUQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsMkJBQTJCO1lBQy9CLEtBQUssRUFBRSxTQUFTLENBQUMsU0FBUyxFQUFFLHdCQUF3QixDQUFDO1lBQ3JELElBQUksRUFBRSxPQUFPLENBQUMsT0FBTztZQUNyQixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxrQkFBa0I7Z0JBQzdCLEtBQUssRUFBRSxZQUFZO2dCQUNuQixLQUFLLEVBQUUsQ0FBQzthQUNSO1lBQ0QsTUFBTSxFQUFFLHNCQUFzQjtTQUM5QixDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsU0FBUyxDQUFDLFFBQTBCLEVBQUUsSUFBdUI7UUFDNUQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2hCLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxlQUFlLENBQUMsS0FBTSxTQUFRLFVBQTZCO0lBQzFEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHdCQUF3QjtZQUM1QixLQUFLLEVBQUUsU0FBUyxDQUFDLE1BQU0sRUFBRSxvQkFBb0IsQ0FBQztZQUM5QyxJQUFJLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDcEIsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsa0JBQWtCO2dCQUM3QixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsS0FBSyxFQUFFLENBQUM7YUFDUjtZQUNELE1BQU0sRUFBRSxzQkFBc0I7U0FDOUIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNELFNBQVMsQ0FBQyxRQUEwQixFQUFFLElBQXVCO1FBQzVELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNqQixDQUFDO0NBQ0QsQ0FBQyxDQUFDO0FBRUgsWUFBWSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUU7SUFDdEQsT0FBTyxFQUFFLE1BQU0sQ0FBQywwQkFBMEI7SUFDMUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSx1QkFBdUIsQ0FBQztJQUMvRCxLQUFLLEVBQUUsWUFBWTtJQUNuQixLQUFLLEVBQUUsR0FBRztJQUNWLElBQUksRUFBRSxPQUFPLENBQUMsTUFBTTtDQUNHLENBQUMsQ0FBQztBQUUxQixlQUFlLENBQUMsS0FBTSxTQUFRLE9BQU87SUFDcEM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsb0NBQW9DO1lBQ3hDLEtBQUssRUFBRSxRQUFRLENBQUMsNEJBQTRCLEVBQUUsT0FBTyxDQUFDO1lBQ3RELElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLDBCQUEwQjtnQkFDckMsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLEtBQUssRUFBRSxDQUFDO2FBQ1I7U0FDRCxDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsR0FBRyxDQUFDLFFBQTBCO1FBQzdCLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFckQsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQzdCLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSCxZQUFZIn0=