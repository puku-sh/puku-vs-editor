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
var ChatToolOutputSubPart_1;
import * as dom from '../../../../../../base/browser/dom.js';
import { renderMarkdown } from '../../../../../../base/browser/markdownRenderer.js';
import { decodeBase64 } from '../../../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { generateUuid } from '../../../../../../base/common/uuid.js';
import { localize } from '../../../../../../nls.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IChatToolInvocation } from '../../../common/chatService.js';
import { IChatWidgetService } from '../../chat.js';
import { IChatOutputRendererService } from '../../chatOutputItemRenderer.js';
import { ChatProgressSubPart } from '../chatProgressContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
// TODO: see if we can reuse existing types instead of adding ChatToolOutputSubPart
let ChatToolOutputSubPart = class ChatToolOutputSubPart extends BaseChatToolInvocationSubPart {
    static { ChatToolOutputSubPart_1 = this; }
    /** Remembers cached state on re-render */
    static { this._cachedStates = new WeakMap(); }
    constructor(toolInvocation, context, chatOutputItemRendererService, chatWidgetService, instantiationService) {
        super(toolInvocation);
        this.context = context;
        this.chatOutputItemRendererService = chatOutputItemRendererService;
        this.chatWidgetService = chatWidgetService;
        this.instantiationService = instantiationService;
        this.codeblocks = [];
        this._disposeCts = this._register(new CancellationTokenSource());
        const details = toolInvocation.kind === 'toolInvocation'
            ? IChatToolInvocation.resultDetails(toolInvocation)
            : {
                output: {
                    type: 'data',
                    mimeType: toolInvocation.resultDetails.output.mimeType,
                    value: decodeBase64(toolInvocation.resultDetails.output.base64Data),
                },
            };
        this.domNode = dom.$('div.tool-output-part');
        const titleEl = dom.$('.output-title');
        this.domNode.appendChild(titleEl);
        if (typeof toolInvocation.invocationMessage === 'string') {
            titleEl.textContent = toolInvocation.invocationMessage;
        }
        else {
            const md = this._register(renderMarkdown(toolInvocation.invocationMessage));
            titleEl.appendChild(md.element);
        }
        this.domNode.appendChild(this.createOutputPart(toolInvocation, details));
    }
    dispose() {
        this._disposeCts.dispose(true);
        super.dispose();
    }
    createOutputPart(toolInvocation, details) {
        const vm = this.chatWidgetService.getWidgetBySessionResource(this.context.element.sessionResource)?.viewModel;
        const parent = dom.$('div.webview-output');
        parent.style.maxHeight = '80vh';
        let partState = { height: 0, webviewOrigin: generateUuid() };
        if (vm) {
            let allStates = ChatToolOutputSubPart_1._cachedStates.get(vm);
            if (!allStates) {
                allStates = new Map();
                ChatToolOutputSubPart_1._cachedStates.set(vm, allStates);
            }
            const cachedState = allStates.get(toolInvocation.toolCallId);
            if (cachedState) {
                partState = cachedState;
            }
            else {
                allStates.set(toolInvocation.toolCallId, partState);
            }
        }
        if (partState.height) {
            parent.style.height = `${partState.height}px`;
        }
        const progressMessage = dom.$('span');
        progressMessage.textContent = localize(5650, null);
        const progressPart = this._register(this.instantiationService.createInstance(ChatProgressSubPart, progressMessage, ThemeIcon.modify(Codicon.loading, 'spin'), undefined));
        parent.appendChild(progressPart.domNode);
        // TODO: we also need to show the tool output in the UI
        this.chatOutputItemRendererService.renderOutputPart(details.output.mimeType, details.output.value.buffer, parent, { origin: partState.webviewOrigin }, this._disposeCts.token).then((renderedItem) => {
            if (this._disposeCts.token.isCancellationRequested) {
                return;
            }
            this._register(renderedItem);
            progressPart.domNode.remove();
            this._onDidChangeHeight.fire();
            this._register(renderedItem.onDidChangeHeight(newHeight => {
                this._onDidChangeHeight.fire();
                partState.height = newHeight;
            }));
            this._register(renderedItem.webview.onDidWheel(e => {
                this.chatWidgetService.getWidgetBySessionResource(this.context.element.sessionResource)?.delegateScrollFromMouseWheelEvent({
                    ...e,
                    preventDefault: () => { },
                    stopPropagation: () => { }
                });
            }));
            // When the webview is disconnected from the DOM due to being hidden, we need to reload it when it is shown again.
            const widget = this.chatWidgetService.getWidgetBySessionResource(this.context.element.sessionResource);
            if (widget) {
                this._register(widget?.onDidShow(() => {
                    renderedItem.reinitialize();
                }));
            }
        }, (error) => {
            console.error('Error rendering tool output:', error);
            const errorNode = dom.$('.output-error');
            const errorHeaderNode = dom.$('.output-error-header');
            dom.append(errorNode, errorHeaderNode);
            const iconElement = dom.$('div');
            iconElement.classList.add(...ThemeIcon.asClassNameArray(Codicon.error));
            errorHeaderNode.append(iconElement);
            const errorTitleNode = dom.$('.output-error-title');
            errorTitleNode.textContent = localize(5651, null);
            errorHeaderNode.append(errorTitleNode);
            const errorMessageNode = dom.$('.output-error-details');
            errorMessageNode.textContent = error?.message || String(error);
            errorNode.append(errorMessageNode);
            progressPart.domNode.replaceWith(errorNode);
        });
        return parent;
    }
};
ChatToolOutputSubPart = ChatToolOutputSubPart_1 = __decorate([
    __param(2, IChatOutputRendererService),
    __param(3, IChatWidgetService),
    __param(4, IInstantiationService)
], ChatToolOutputSubPart);
export { ChatToolOutputSubPart };
//# sourceMappingURL=chatToolOutputPart.js.map