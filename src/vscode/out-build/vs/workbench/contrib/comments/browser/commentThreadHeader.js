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
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Action, ActionRunner } from '../../../../base/common/actions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import * as strings from '../../../../base/common/strings.js';
import * as nls from '../../../../nls.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
const collapseIcon = registerIcon('review-comment-collapse', Codicon.chevronUp, nls.localize(6952, null));
const COLLAPSE_ACTION_CLASS = 'expand-review-action ' + ThemeIcon.asClassName(collapseIcon);
const DELETE_ACTION_CLASS = 'expand-review-action ' + ThemeIcon.asClassName(Codicon.trashcan);
function threadHasComments(comments) {
    return !!comments && comments.length > 0;
}
let CommentThreadHeader = class CommentThreadHeader extends Disposable {
    constructor(container, _delegate, _commentMenus, _commentThread, _contextKeyService, _instantiationService, _contextMenuService) {
        super();
        this._delegate = _delegate;
        this._commentMenus = _commentMenus;
        this._commentThread = _commentThread;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._contextMenuService = _contextMenuService;
        this._headElement = dom.$('.head');
        container.appendChild(this._headElement);
        this._register(toDisposable(() => this._headElement.remove()));
        this._fillHead();
    }
    _fillHead() {
        const titleElement = dom.append(this._headElement, dom.$('.review-title'));
        this._headingLabel = dom.append(titleElement, dom.$('span.filename'));
        this.createThreadLabel();
        const actionsContainer = dom.append(this._headElement, dom.$('.review-actions'));
        this._actionbarWidget = new ActionBar(actionsContainer, {
            actionViewItemProvider: createActionViewItem.bind(undefined, this._instantiationService)
        });
        this._register(this._actionbarWidget);
        const collapseClass = threadHasComments(this._commentThread.comments) ? COLLAPSE_ACTION_CLASS : DELETE_ACTION_CLASS;
        this._collapseAction = new Action("workbench.action.hideComment" /* CommentCommandId.Hide */, nls.localize(6953, null), collapseClass, true, () => this._delegate.collapse());
        if (!threadHasComments(this._commentThread.comments)) {
            const commentsChanged = this._register(new MutableDisposable());
            commentsChanged.value = this._commentThread.onDidChangeComments(() => {
                if (threadHasComments(this._commentThread.comments)) {
                    this._collapseAction.class = COLLAPSE_ACTION_CLASS;
                    commentsChanged.clear();
                }
            });
        }
        const menu = this._commentMenus.getCommentThreadTitleActions(this._contextKeyService);
        this._register(menu);
        this.setActionBarActions(menu);
        this._register(menu);
        this._register(menu.onDidChange(e => {
            this.setActionBarActions(menu);
        }));
        this._register(dom.addDisposableListener(this._headElement, dom.EventType.CONTEXT_MENU, e => {
            return this.onContextMenu(e);
        }));
        this._actionbarWidget.context = this._commentThread;
    }
    setActionBarActions(menu) {
        const groups = menu.getActions({ shouldForwardArgs: true }).reduce((r, [, actions]) => [...r, ...actions], []);
        this._actionbarWidget.clear();
        this._actionbarWidget.push([...groups, this._collapseAction], { label: false, icon: true });
    }
    updateCommentThread(commentThread) {
        this._commentThread = commentThread;
        this._actionbarWidget.context = this._commentThread;
        this.createThreadLabel();
    }
    createThreadLabel() {
        let label;
        label = this._commentThread.label;
        if (label === undefined) {
            if (!(this._commentThread.comments && this._commentThread.comments.length)) {
                label = nls.localize(6954, null);
            }
        }
        if (label) {
            this._headingLabel.textContent = strings.escape(label);
            this._headingLabel.setAttribute('aria-label', label);
        }
    }
    updateHeight(headHeight) {
        this._headElement.style.height = `${headHeight}px`;
        this._headElement.style.lineHeight = this._headElement.style.height;
    }
    onContextMenu(e) {
        const actions = this._commentMenus.getCommentThreadTitleContextActions(this._contextKeyService);
        if (!actions.length) {
            return;
        }
        const event = new StandardMouseEvent(dom.getWindow(this._headElement), e);
        if (!this._contextMenuActionRunner) {
            this._contextMenuActionRunner = this._register(new ActionRunner());
        }
        this._contextMenuService.showContextMenu({
            getAnchor: () => event,
            getActions: () => actions,
            actionRunner: this._contextMenuActionRunner,
            getActionsContext: () => {
                return {
                    commentControlHandle: this._commentThread.controllerHandle,
                    commentThreadHandle: this._commentThread.commentThreadHandle,
                    $mid: 7 /* MarshalledId.CommentThread */
                };
            },
        });
    }
};
CommentThreadHeader = __decorate([
    __param(4, IContextKeyService),
    __param(5, IInstantiationService),
    __param(6, IContextMenuService)
], CommentThreadHeader);
export { CommentThreadHeader };
//# sourceMappingURL=commentThreadHeader.js.map