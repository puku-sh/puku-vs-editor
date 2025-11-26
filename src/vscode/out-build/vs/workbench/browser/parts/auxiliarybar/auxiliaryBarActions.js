/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { AuxiliaryBarMaximizedContext, AuxiliaryBarVisibleContext, IsAuxiliaryWindowContext } from '../../../common/contextkeys.js';
import { ViewContainerLocationToString } from '../../../common/views.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { SwitchCompositeViewAction } from '../compositeBarActions.js';
import { closeIcon as panelCloseIcon } from '../panel/panelActions.js';
const maximizeIcon = registerIcon('auxiliarybar-maximize', Codicon.screenFull, localize(3344, null));
const closeIcon = registerIcon('auxiliarybar-close', panelCloseIcon, localize(3345, null));
const auxiliaryBarRightIcon = registerIcon('auxiliarybar-right-layout-icon', Codicon.layoutSidebarRight, localize(3346, null));
const auxiliaryBarRightOffIcon = registerIcon('auxiliarybar-right-off-layout-icon', Codicon.layoutSidebarRightOff, localize(3347, null));
const auxiliaryBarLeftIcon = registerIcon('auxiliarybar-left-layout-icon', Codicon.layoutSidebarLeft, localize(3348, null));
const auxiliaryBarLeftOffIcon = registerIcon('auxiliarybar-left-off-layout-icon', Codicon.layoutSidebarLeftOff, localize(3349, null));
export class ToggleAuxiliaryBarAction extends Action2 {
    static { this.ID = 'workbench.action.toggleAuxiliaryBar'; }
    static { this.LABEL = localize2(3360, "Toggle Secondary Side Bar Visibility"); }
    constructor() {
        super({
            id: ToggleAuxiliaryBarAction.ID,
            title: ToggleAuxiliaryBarAction.LABEL,
            toggled: {
                condition: AuxiliaryBarVisibleContext,
                title: localize(3350, null),
                icon: closeIcon,
                mnemonicTitle: localize(3351, null),
            },
            icon: closeIcon,
            category: Categories.View,
            metadata: {
                description: localize(3352, null),
            },
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 32 /* KeyCode.KeyB */
            },
            menu: [
                {
                    id: MenuId.LayoutControlMenuSubmenu,
                    group: '0_workbench_layout',
                    order: 1
                },
                {
                    id: MenuId.MenubarAppearanceMenu,
                    group: '2_workbench_layout',
                    order: 2
                }
            ]
        });
    }
    async run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        const isCurrentlyVisible = layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        layoutService.setPartHidden(isCurrentlyVisible, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        // Announce visibility change to screen readers
        const alertMessage = isCurrentlyVisible
            ? localize(3353, null)
            : localize(3354, null);
        alert(alertMessage);
    }
}
registerAction2(ToggleAuxiliaryBarAction);
MenuRegistry.appendMenuItem(MenuId.AuxiliaryBarTitle, {
    command: {
        id: ToggleAuxiliaryBarAction.ID,
        title: localize(3355, null),
        icon: closeIcon
    },
    group: 'navigation',
    order: 2,
    when: ContextKeyExpr.equals(`config.${"workbench.activityBar.location" /* LayoutSettings.ACTIVITY_BAR_LOCATION */}`, "default" /* ActivityBarPosition.DEFAULT */)
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.closeAuxiliaryBar',
            title: localize2(3361, 'Hide Secondary Side Bar'),
            category: Categories.View,
            precondition: AuxiliaryBarVisibleContext,
            f1: true,
        });
    }
    run(accessor) {
        accessor.get(IWorkbenchLayoutService).setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
    }
});
registerAction2(class FocusAuxiliaryBarAction extends Action2 {
    static { this.ID = 'workbench.action.focusAuxiliaryBar'; }
    static { this.LABEL = localize2(3362, "Focus into Secondary Side Bar"); }
    constructor() {
        super({
            id: FocusAuxiliaryBarAction.ID,
            title: FocusAuxiliaryBarAction.LABEL,
            category: Categories.View,
            f1: true,
        });
    }
    async run(accessor) {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        const layoutService = accessor.get(IWorkbenchLayoutService);
        // Show auxiliary bar
        if (!layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)) {
            layoutService.setPartHidden(false, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */);
        }
        // Focus into active composite
        const composite = paneCompositeService.getActivePaneComposite(2 /* ViewContainerLocation.AuxiliaryBar */);
        composite?.focus();
    }
});
MenuRegistry.appendMenuItems([
    {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: ToggleAuxiliaryBarAction.ID,
                title: localize(3356, null),
                toggled: { condition: AuxiliaryBarVisibleContext, icon: auxiliaryBarLeftIcon },
                icon: auxiliaryBarLeftOffIcon,
            },
            when: ContextKeyExpr.and(IsAuxiliaryWindowContext.negate(), ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')), ContextKeyExpr.equals('config.workbench.sideBar.location', 'right')),
            order: 0
        }
    }, {
        id: MenuId.LayoutControlMenu,
        item: {
            group: '2_pane_toggles',
            command: {
                id: ToggleAuxiliaryBarAction.ID,
                title: localize(3357, null),
                toggled: { condition: AuxiliaryBarVisibleContext, icon: auxiliaryBarRightIcon },
                icon: auxiliaryBarRightOffIcon,
            },
            when: ContextKeyExpr.and(IsAuxiliaryWindowContext.negate(), ContextKeyExpr.or(ContextKeyExpr.equals('config.workbench.layoutControl.type', 'toggles'), ContextKeyExpr.equals('config.workbench.layoutControl.type', 'both')), ContextKeyExpr.equals('config.workbench.sideBar.location', 'left')),
            order: 2
        }
    }, {
        id: MenuId.ViewContainerTitleContext,
        item: {
            group: '3_workbench_layout_move',
            command: {
                id: ToggleAuxiliaryBarAction.ID,
                title: localize2(3363, 'Hide Secondary Side Bar'),
            },
            when: ContextKeyExpr.and(AuxiliaryBarVisibleContext, ContextKeyExpr.equals('viewContainerLocation', ViewContainerLocationToString(2 /* ViewContainerLocation.AuxiliaryBar */))),
            order: 2
        }
    }
]);
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.previousAuxiliaryBarView',
            title: localize2(3364, 'Previous Secondary Side Bar View'),
            category: Categories.View,
            f1: true
        }, 2 /* ViewContainerLocation.AuxiliaryBar */, -1);
    }
});
registerAction2(class extends SwitchCompositeViewAction {
    constructor() {
        super({
            id: 'workbench.action.nextAuxiliaryBarView',
            title: localize2(3365, 'Next Secondary Side Bar View'),
            category: Categories.View,
            f1: true
        }, 2 /* ViewContainerLocation.AuxiliaryBar */, 1);
    }
});
// --- Maximized Mode
class MaximizeAuxiliaryBar extends Action2 {
    static { this.ID = 'workbench.action.maximizeAuxiliaryBar'; }
    constructor() {
        super({
            id: MaximizeAuxiliaryBar.ID,
            title: localize2(3366, 'Maximize Secondary Side Bar'),
            tooltip: localize(3358, null),
            category: Categories.View,
            f1: true,
            precondition: AuxiliaryBarMaximizedContext.negate(),
            icon: maximizeIcon,
            menu: {
                id: MenuId.AuxiliaryBarTitle,
                group: 'navigation',
                order: 1,
                when: AuxiliaryBarMaximizedContext.negate()
            }
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setAuxiliaryBarMaximized(true);
    }
}
registerAction2(MaximizeAuxiliaryBar);
class RestoreAuxiliaryBar extends Action2 {
    static { this.ID = 'workbench.action.restoreAuxiliaryBar'; }
    constructor() {
        super({
            id: RestoreAuxiliaryBar.ID,
            title: localize2(3367, 'Restore Secondary Side Bar'),
            tooltip: localize(3359, null),
            category: Categories.View,
            f1: true,
            precondition: AuxiliaryBarMaximizedContext,
            toggled: AuxiliaryBarMaximizedContext,
            icon: maximizeIcon,
            menu: {
                id: MenuId.AuxiliaryBarTitle,
                group: 'navigation',
                order: 1,
                when: AuxiliaryBarMaximizedContext
            }
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.setAuxiliaryBarMaximized(false);
    }
}
registerAction2(RestoreAuxiliaryBar);
class ToggleMaximizedAuxiliaryBar extends Action2 {
    static { this.ID = 'workbench.action.toggleMaximizedAuxiliaryBar'; }
    constructor() {
        super({
            id: ToggleMaximizedAuxiliaryBar.ID,
            title: localize2(3368, 'Toggle Maximized Secondary Side Bar'),
            f1: true,
            category: Categories.View
        });
    }
    run(accessor) {
        const layoutService = accessor.get(IWorkbenchLayoutService);
        layoutService.toggleMaximizedAuxiliaryBar();
    }
}
registerAction2(ToggleMaximizedAuxiliaryBar);
//# sourceMappingURL=auxiliaryBarActions.js.map