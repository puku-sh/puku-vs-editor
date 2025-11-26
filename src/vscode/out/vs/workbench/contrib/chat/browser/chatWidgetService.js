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
import { raceCancellablePromises, timeout } from '../../../../base/common/async.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { combinedDisposable, Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../base/common/resources.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { IEditorService } from '../../../../workbench/services/editor/common/editorService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ChatViewId, ChatViewPaneTarget, IQuickChatService, isIChatViewViewContext } from './chat.js';
import { ChatEditor } from './chatEditor.js';
import { findExistingChatEditorByUri } from './chatSessions/common.js';
let ChatWidgetService = class ChatWidgetService extends Disposable {
    constructor(editorGroupsService, viewsService, quickChatService, layoutService, editorService) {
        super();
        this.editorGroupsService = editorGroupsService;
        this.viewsService = viewsService;
        this.quickChatService = quickChatService;
        this.layoutService = layoutService;
        this.editorService = editorService;
        this._widgets = [];
        this._lastFocusedWidget = undefined;
        this._onDidAddWidget = this._register(new Emitter());
        this.onDidAddWidget = this._onDidAddWidget.event;
    }
    get lastFocusedWidget() {
        return this._lastFocusedWidget;
    }
    getAllWidgets() {
        return this._widgets;
    }
    getWidgetsByLocations(location) {
        return this._widgets.filter(w => w.location === location);
    }
    getWidgetByInputUri(uri) {
        return this._widgets.find(w => isEqual(w.input.inputUri, uri));
    }
    getWidgetBySessionResource(sessionResource) {
        return this._widgets.find(w => isEqual(w.viewModel?.sessionResource, sessionResource));
    }
    async revealWidget(preserveFocus) {
        const last = this.lastFocusedWidget;
        if (last && await this.reveal(last, preserveFocus)) {
            return last;
        }
        return (await this.viewsService.openView(ChatViewId, !preserveFocus))?.widget;
    }
    async reveal(widget, preserveFocus) {
        if (widget.viewModel?.sessionResource) {
            const alreadyOpenWidget = await this.revealSessionIfAlreadyOpen(widget.viewModel.sessionResource, preserveFocus);
            if (alreadyOpenWidget) {
                return true;
            }
        }
        if (isIChatViewViewContext(widget.viewContext)) {
            const view = await this.viewsService.openView(widget.viewContext.viewId, !preserveFocus);
            if (!preserveFocus) {
                view?.focus();
            }
            return !!view;
        }
        return false;
    }
    async openSession(sessionResource, target, options) {
        const alreadyOpenWidget = await this.revealSessionIfAlreadyOpen(sessionResource);
        if (alreadyOpenWidget) {
            return alreadyOpenWidget;
        }
        // Load this session in chat view
        if (target === ChatViewPaneTarget) {
            const chatViewPane = await this.viewsService.openView(ChatViewId, true);
            if (chatViewPane) {
                await chatViewPane.loadSession(sessionResource);
                chatViewPane.focusInput();
            }
            return chatViewPane?.widget;
        }
        // Open in chat editor
        const pane = await this.editorService.openEditor({ resource: sessionResource, options }, target);
        return pane instanceof ChatEditor ? pane.widget : undefined;
    }
    async revealSessionIfAlreadyOpen(sessionResource, preserveFocus) {
        // Already open in chat view?
        const chatView = this.viewsService.getViewWithId(ChatViewId);
        if (chatView?.widget.viewModel?.sessionResource && isEqual(chatView.widget.viewModel.sessionResource, sessionResource)) {
            const view = await this.viewsService.openView(ChatViewId, true);
            if (!preserveFocus) {
                view?.focus();
            }
            return chatView.widget;
        }
        // Already open in an editor?
        const existingEditor = findExistingChatEditorByUri(sessionResource, this.editorGroupsService);
        if (existingEditor) {
            // focus transfer to other documents is async. If we depend on the focus
            // being synchronously transferred in consuming code, this can fail, so
            // wait for it to propagate
            const isGroupActive = () => dom.getWindowId(dom.getWindow(this.layoutService.activeContainer)) === existingEditor.group.windowId;
            let ensureFocusTransfer;
            if (!isGroupActive()) {
                ensureFocusTransfer = raceCancellablePromises([
                    timeout(500),
                    Event.toPromise(Event.once(Event.filter(this.layoutService.onDidChangeActiveContainer, isGroupActive))),
                ]);
            }
            const pane = await this.editorService.openEditor(existingEditor.editor, existingEditor.group);
            await ensureFocusTransfer;
            return pane instanceof ChatEditor ? pane.widget : undefined;
        }
        // Already open in quick chat?
        if (isEqual(sessionResource, this.quickChatService.sessionResource)) {
            this.quickChatService.focus();
            return undefined;
        }
        return undefined;
    }
    setLastFocusedWidget(widget) {
        if (widget === this._lastFocusedWidget) {
            return;
        }
        this._lastFocusedWidget = widget;
    }
    register(newWidget) {
        if (this._widgets.some(widget => widget === newWidget)) {
            throw new Error('Cannot register the same widget multiple times');
        }
        this._widgets.push(newWidget);
        this._onDidAddWidget.fire(newWidget);
        return combinedDisposable(newWidget.onDidFocus(() => this.setLastFocusedWidget(newWidget)), toDisposable(() => this._widgets.splice(this._widgets.indexOf(newWidget), 1)));
    }
};
ChatWidgetService = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IViewsService),
    __param(2, IQuickChatService),
    __param(3, ILayoutService),
    __param(4, IEditorService)
], ChatWidgetService);
export { ChatWidgetService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdpZGdldFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFdpZGdldFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUUvRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdEYsT0FBTyxFQUFFLGNBQWMsRUFBa0IsTUFBTSwrREFBK0QsQ0FBQztBQUMvRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFL0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBbUMsaUJBQWlCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDdkksT0FBTyxFQUFFLFVBQVUsRUFBc0IsTUFBTSxpQkFBaUIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUdoRSxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7SUFVaEQsWUFDdUIs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