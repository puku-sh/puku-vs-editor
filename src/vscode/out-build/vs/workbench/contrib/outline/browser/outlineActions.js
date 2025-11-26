/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ctxAllCollapsed, ctxFilterOnType, ctxFollowsCursor, ctxSortMode, IOutlinePane } from './outline.js';
// --- commands
registerAction2(class CollapseAll extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.collapse',
            title: localize(10667, null),
            f1: false,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', IOutlinePane.Id), ctxAllCollapsed.isEqualTo(false))
            }
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
    }
});
registerAction2(class ExpandAll extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.expand',
            title: localize(10668, null),
            f1: false,
            icon: Codicon.expandAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', IOutlinePane.Id), ctxAllCollapsed.isEqualTo(true))
            }
        });
    }
    runInView(_accessor, view) {
        view.expandAll();
    }
});
registerAction2(class FollowCursor extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.followCursor',
            title: localize(10669, null),
            f1: false,
            toggled: ctxFollowsCursor,
            menu: {
                id: MenuId.ViewTitle,
                group: 'config',
                order: 1,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id)
            }
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.followCursor = !view.outlineViewState.followCursor;
    }
});
registerAction2(class FilterOnType extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.filterOnType',
            title: localize(10670, null),
            f1: false,
            toggled: ctxFilterOnType,
            menu: {
                id: MenuId.ViewTitle,
                group: 'config',
                order: 2,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id)
            }
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.filterOnType = !view.outlineViewState.filterOnType;
    }
});
registerAction2(class SortByPosition extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.sortByPosition',
            title: localize(10671, null),
            f1: false,
            toggled: ctxSortMode.isEqualTo(0 /* OutlineSortOrder.ByPosition */),
            menu: {
                id: MenuId.ViewTitle,
                group: 'sort',
                order: 1,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id)
            }
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.sortBy = 0 /* OutlineSortOrder.ByPosition */;
    }
});
registerAction2(class SortByName extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.sortByName',
            title: localize(10672, null),
            f1: false,
            toggled: ctxSortMode.isEqualTo(1 /* OutlineSortOrder.ByName */),
            menu: {
                id: MenuId.ViewTitle,
                group: 'sort',
                order: 2,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id)
            }
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.sortBy = 1 /* OutlineSortOrder.ByName */;
    }
});
registerAction2(class SortByKind extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.sortByKind',
            title: localize(10673, null),
            f1: false,
            toggled: ctxSortMode.isEqualTo(2 /* OutlineSortOrder.ByKind */),
            menu: {
                id: MenuId.ViewTitle,
                group: 'sort',
                order: 3,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id)
            }
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.sortBy = 2 /* OutlineSortOrder.ByKind */;
    }
});
//# sourceMappingURL=outlineActions.js.map