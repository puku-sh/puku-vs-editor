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
        progressMessage.textContent = localize('loading', 'Rendering tool output...');
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
            errorTitleNode.textContent = localize('chat.toolOutputError', "Error rendering the tool output");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xPdXRwdXRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvdG9vbEludm9jYXRpb25QYXJ0cy9jaGF0VG9vbE91dHB1dFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN4RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLG1CQUFtQixFQUFxRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3hJLE9BQU8sRUFBc0Isa0JBQWtCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDdkUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDcEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFP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