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
import * as dom from '../../../../../base/browser/dom.js';
import { ButtonWithIcon } from '../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { LanguageModelPartAudience } from '../../common/languageModels.js';
import { ChatQueryTitlePart } from './chatConfirmationWidget.js';
import { ChatToolOutputContentSubPart } from './chatToolOutputContentSubPart.js';
let ChatCollapsibleInputOutputContentPart = class ChatCollapsibleInputOutputContentPart extends Disposable {
    get codeblocks() {
        const inputCodeblocks = this._editorReferences.map(ref => {
            const cbi = this.input.codeBlockInfo;
            return cbi;
        });
        const outputCodeblocks = this._outputSubPart?.codeblocks ?? [];
        return [...inputCodeblocks, ...outputCodeblocks];
    }
    set title(s) {
        this._titlePart.title = s;
    }
    get title() {
        return this._titlePart.title;
    }
    get expanded() {
        return this._expanded.get();
    }
    constructor(title, subtitle, progressTooltip, context, input, output, isError, initiallyExpanded, contextKeyService, _instantiationService, hoverService) {
        super();
        this.context = context;
        this.input = input;
        this.output = output;
        this.contextKeyService = contextKeyService;
        this._instantiationService = _instantiationService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._currentWidth = 0;
        this._editorReferences = [];
        this._currentWidth = context.currentWidth();
        const container = dom.h('.chat-confirmation-widget-container');
        const titleEl = dom.h('.chat-confirmation-widget-title-inner');
        const elements = dom.h('.chat-confirmation-widget');
        this.domNode = container.root;
        container.root.appendChild(elements.root);
        const titlePart = this._titlePart = this._register(_instantiationService.createInstance(ChatQueryTitlePart, titleEl.root, title, subtitle));
        this._register(titlePart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        const spacer = document.createElement('span');
        spacer.style.flexGrow = '1';
        const btn = this._register(new ButtonWithIcon(elements.root, {}));
        btn.element.classList.add('chat-confirmation-widget-title', 'monaco-text-button');
        btn.labelElement.append(titleEl.root);
        const check = dom.h(isError
            ? ThemeIcon.asCSSSelector(Codicon.error)
            : output
                ? ThemeIcon.asCSSSelector(Codicon.check)
                : ThemeIcon.asCSSSelector(ThemeIcon.modify(Codicon.loading, 'spin')));
        if (progressTooltip) {
            this._register(hoverService.setupDelayedHover(check.root, {
                content: progressTooltip,
                style: 1 /* HoverStyle.Pointer */,
            }));
        }
        const expanded = this._expanded = observableValue(this, initiallyExpanded);
        this._register(autorun(r => {
            const value = expanded.read(r);
            btn.icon = isError
                ? Codicon.error
                : output
                    ? Codicon.check
                    : ThemeIcon.modify(Codicon.loading, 'spin');
            elements.root.classList.toggle('collapsed', !value);
            this._onDidChangeHeight.fire();
        }));
        const toggle = (e) => {
            if (!e.defaultPrevented) {
                const value = expanded.get();
                expanded.set(!value, undefined);
                e.preventDefault();
            }
        };
        this._register(btn.onDidClick(toggle));
        const message = dom.h('.chat-confirmation-widget-message');
        message.root.appendChild(this.createMessageContents());
        elements.root.appendChild(message.root);
        const topLevelResources = this.output?.parts
            .filter(p => p.kind === 'data')
            .filter(p => !p.audience || p.audience.includes(LanguageModelPartAudience.User));
        if (topLevelResources?.length) {
            const resourceSubPart = this._register(this._instantiationService.createInstance(ChatToolOutputContentSubPart, this.context, topLevelResources));
            const group = resourceSubPart.domNode;
            group.classList.add('chat-collapsible-top-level-resource-group');
            container.root.appendChild(group);
            this._register(autorun(r => {
                group.style.display = expanded.read(r) ? 'none' : '';
            }));
        }
    }
    createMessageContents() {
        const contents = dom.h('div', [
            dom.h('h3@inputTitle'),
            dom.h('div@input'),
            dom.h('h3@outputTitle'),
            dom.h('div@output'),
        ]);
        const { input, output } = this;
        contents.inputTitle.textContent = localize('chat.input', "Input");
        this.addCodeBlock(input, contents.input);
        if (!output) {
            contents.output.remove();
            contents.outputTitle.remove();
        }
        else {
            contents.outputTitle.textContent = localize('chat.output', "Output");
            const outputSubPart = this._register(this._instantiationService.createInstance(ChatToolOutputContentSubPart, this.context, output.parts));
            this._outputSubPart = outputSubPart;
            this._register(outputSubPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
            contents.output.appendChild(outputSubPart.domNode);
        }
        return contents.root;
    }
    addCodeBlock(part, container) {
        const data = {
            languageId: part.languageId,
            textModel: Promise.resolve(part.textModel),
            codeBlockIndex: part.codeBlockInfo.codeBlockIndex,
            codeBlockPartIndex: 0,
            element: this.context.element,
            parentContextKeyService: this.contextKeyService,
            renderOptions: part.options,
            chatSessionResource: this.context.element.sessionResource,
        };
        const editorReference = this._register(this.context.editorPool.get());
        editorReference.object.render(data, this._currentWidth || 300);
        this._register(editorReference.object.onDidChangeContentHeight(() => this._onDidChangeHeight.fire()));
        container.appendChild(editorReference.object.element);
        this._editorReferences.push(editorReference);
    }
    hasSameContent(other, followingContent, element) {
        // For now, we consider content different unless it's exactly the same instance
        return false;
    }
    layout(width) {
        this._currentWidth = width;
        this._editorReferences.forEach(r => r.object.layout(width));
        this._outputSubPart?.layout(width);
    }
};
ChatCollapsibleInputOutputContentPart = __decorate([
    __param(8, IContextKeyService),
    __param(9, IInstantiationService),
    __param(10, IHoverService)
], ChatCollapsibleInputOutputContentPart);
export { ChatCollapsibleInputOutputContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xJbnB1dE91dHB1dENvbnRlbnRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdFRvb2xJbnB1dE91dHB1dENvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRWpGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQXVCLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUdwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBSTNFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRWpFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFt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