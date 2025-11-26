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
import { $, clearNode } from '../../../../../base/browser/dom.js';
import { ThinkingDisplayMode } from '../../common/constants.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { IMarkdownRendererService } from '../../../../../platform/markdown/browser/markdownRenderer.js';
import { ChatCollapsibleContentPart } from './chatCollapsibleContentPart.js';
import { localize } from '../../../../../nls.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { autorun } from '../../../../../base/common/observable.js';
import './media/chatThinkingContent.css';
function extractTextFromPart(content) {
    const raw = Array.isArray(content.value) ? content.value.join('') : (content.value || '');
    return raw.trim();
}
function extractTitleFromThinkingContent(content) {
    const headerMatch = content.match(/^\*\*([^*]+)\*\*/);
    return headerMatch ? headerMatch[1] : undefined;
}
let ChatThinkingContentPart = class ChatThinkingContentPart extends ChatCollapsibleContentPart {
    constructor(content, context, instantiationService, configurationService, markdownRendererService) {
        const initialText = extractTextFromPart(content);
        const extractedTitle = extractTitleFromThinkingContent(initialText)
            ?? localize('chat.thinking.header', 'Thinking...');
        super(extractedTitle, context);
        this.configurationService = configurationService;
        this.markdownRendererService = markdownRendererService;
        this.defaultTitle = localize('chat.thinking.header', 'Thinking...');
        this.fixedScrollingMode = false;
        this.hasMultipleItems = false;
        this.id = content.id;
        const configuredMode = this.configurationService.getValue('chat.agent.thinkingStyle') ?? ThinkingDisplayMode.Collapsed;
        this.fixedScrollingMode = configuredMode === ThinkingDisplayMode.FixedScrolling;
        this.currentTitle = extractedTitle;
        if (extractedTitle !== this.defaultTitle) {
            this.lastExtractedTitle = extractedTitle;
        }
        this.currentThinkingValue = initialText;
        if (configuredMode === ThinkingDisplayMode.Collapsed) {
            this.setExpanded(false);
        }
        else {
            this.setExpanded(true);
        }
        if (this.fixedScrollingMode) {
            this.setExpanded(false);
        }
        const node = this.domNode;
        node.classList.add('chat-thinking-box');
        node.tabIndex = 0;
        if (this.fixedScrollingMode) {
            node.classList.add('chat-thinking-fixed-mode');
            this.currentTitle = this.defaultTitle;
            if (this._collapseButton) {
                this._collapseButton.icon = ThemeIcon.modify(Codicon.loading, 'spin');
            }
            // override for codicon chevron in the collapsible part
            this._register(autorun(r => {
                this.expanded.read(r);
                if (this._collapseButton && this.wrapper) {
                    if (this.wrapper.classList.contains('chat-thinking-streaming')) {
                        this._collapseButton.icon = ThemeIcon.modify(Codicon.loading, 'spin');
                    }
                    else {
                        this._collapseButton.icon = Codicon.check;
                    }
                }
            }));
        }
        const label = (this.lastExtractedTitle ?? '') + (this.hasMultipleItems ? '...' : '');
        this.setTitle(label);
    }
    // @TODO: @justschen Convert to template for each setting?
    initContent() {
        this.wrapper = $('.chat-used-context-list.chat-thinking-collapsible');
        if (this.fixedScrollingMode) {
            this.wrapper.classList.add('chat-thinking-streaming');
        }
        this.textContainer = $('.chat-thinking-item.markdown-content');
        this.wrapper.appendChild(this.textContainer);
        if (this.currentThinkingValue) {
            this.renderMarkdown(this.currentThinkingValue);
        }
        this.updateDropdownClickability();
        return this.wrapper;
    }
    renderMarkdown(content, reuseExisting) {
        // Guard against rendering after disposal to avoid leaking disposables
        if (this._store.isDisposed) {
            return;
        }
        const cleanedContent = content.trim();
        if (!cleanedContent) {
            if (this.markdownResult) {
                this.markdownResult.dispose();
                this.markdownResult = undefined;
            }
            clearNode(this.textContainer);
            return;
        }
        // If the entire content is bolded, strip the bold markers for rendering
        let contentToRender = cleanedContent;
        if (cleanedContent.startsWith('**') && cleanedContent.endsWith('**')) {
            contentToRender = cleanedContent.slice(2, -2);
        }
        const target = reuseExisting ? this.markdownResult?.element : undefined;
        if (this.markdownResult) {
            this.markdownResult.dispose();
            this.markdownResult = undefined;
        }
        const rendered = this._register(this.markdownRendererService.render(new MarkdownString(contentToRender), undefined, target));
        this.markdownResult = rendered;
        if (!target) {
            clearNode(this.textContainer);
            this.textContainer.appendChild(rendered.element);
        }
    }
    setDropdownClickable(clickable) {
        if (this._collapseButton) {
            this._collapseButton.element.style.pointerEvents = clickable ? 'auto' : 'none';
        }
    }
    updateDropdownClickability() {
        if (this.wrapper && this.wrapper.children.length > 1) {
            this.setDropdownClickable(true);
            return;
        }
        const contentWithoutTitle = this.currentThinkingValue.trim();
        const titleToCompare = this.lastExtractedTitle ?? this.currentTitle;
        const stripMarkdown = (text) => {
            return text
                .replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1').trim();
        };
        const strippedContent = stripMarkdown(contentWithoutTitle);
        const shouldDisable = !strippedContent || strippedContent === titleToCompare;
        this.setDropdownClickable(!shouldDisable);
    }
    resetId() {
        this.id = undefined;
    }
    collapseContent() {
        this.setExpanded(false);
    }
    updateThinking(content) {
        // If disposed, ignore late updates coming from renderer diffing
        if (this._store.isDisposed) {
            return;
        }
        const raw = extractTextFromPart(content);
        const next = raw;
        if (next === this.currentThinkingValue) {
            return;
        }
        const previousValue = this.currentThinkingValue;
        const reuseExisting = !!(this.markdownResult && next.startsWith(previousValue) && next.length > previousValue.length);
        this.currentThinkingValue = next;
        this.renderMarkdown(next, reuseExisting);
        if (this.fixedScrollingMode && this.wrapper) {
            this.wrapper.scrollTop = this.wrapper.scrollHeight;
        }
        const extractedTitle = extractTitleFromThinkingContent(raw);
        if (!extractedTitle || extractedTitle === this.currentTitle) {
            return;
        }
        this.lastExtractedTitle = extractedTitle;
        const label = (this.lastExtractedTitle ?? '') + (this.hasMultipleItems ? '...' : '');
        this.setTitle(label);
        this.currentTitle = label;
        this.updateDropdownClickability();
    }
    finalizeTitleIfDefault() {
        if (this.fixedScrollingMode) {
            let finalLabel;
            if (this.lastExtractedTitle) {
                finalLabel = localize('chat.thinking.fixed.done.withHeader', '{0}{1}', this.lastExtractedTitle, this.hasMultipleItems ? '...' : '');
            }
            else {
                finalLabel = localize('chat.thinking.fixed.done.generic', 'Thought for a few seconds');
            }
            this.currentTitle = finalLabel;
            this.wrapper.classList.remove('chat-thinking-streaming');
            if (this._collapseButton) {
                this._collapseButton.icon = Codicon.check;
                this._collapseButton.label = finalLabel;
            }
        }
        else {
            if (this.currentTitle === this.defaultTitle) {
                const suffix = localize('chat.thinking.fixed.done.generic', 'Thought for a few seconds');
                this.setTitle(suffix);
                this.currentTitle = suffix;
            }
        }
        this.updateDropdownClickability();
    }
    appendItem(content) {
        this.wrapper.appendChild(content);
        if (this.fixedScrollingMode && this.wrapper) {
            this.wrapper.scrollTop = this.wrapper.scrollHeight;
        }
        const dropdownClickable = this.wrapper.children.length > 1;
        this.setDropdownClickable(dropdownClickable);
    }
    // makes a new text container. when we update, we now update this container.
    setupThinkingContainer(content, context) {
        // Avoid creating new containers after disposal
        if (this._store.isDisposed) {
            return;
        }
        this.hasMultipleItems = true;
        this.textContainer = $('.chat-thinking-item.markdown-content');
        this.wrapper.appendChild(this.textContainer);
        this.id = content?.id;
        this.updateThinking(content);
        this.updateDropdownClickability();
    }
    setTitle(title) {
        if (this.fixedScrollingMode && this._collapseButton && this.wrapper.classList.contains('chat-thinking-streaming')) {
            const thinkingLabel = localize('chat.thinking.fixed.progress.withHeader', 'Thinking: {0}', title);
            this._collapseButton.label = thinkingLabel;
        }
        else {
            super.setTitle(title);
        }
    }
    hasSameContent(other, _followingContent, _element) {
        // only need this check if we are adding tools into thinking dropdown.
        // if (other.kind === 'toolInvocation' || other.kind === 'toolInvocationSerialized') {
        // 	return true;
        // }
        if (other.kind !== 'thinking') {
            return false;
        }
        return other?.id !== this.id;
    }
    dispose() {
        if (this.markdownResult) {
            this.markdownResult.dispose();
            this.markdownResult = undefined;
        }
        super.dispose();
    }
};
ChatThinkingContentPart = __decorate([
    __param(2, IInstantiationService),
    __param(3, IConfigurationService),
    __param(4, IMarkdownRendererService)
], ChatThinkingContentPart);
export { ChatThinkingContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRoaW5raW5nQ29udGVudFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0VGhpbmtpbmdDb250ZW50UGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBSWxFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRWhFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUV4RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkUsT0FBTyxpQ0FBaUMsQ0FBQztBQUd6QyxTQUFTLG1CQUFtQixDQUFDLE9BQTBCO0lBQ3RELE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFP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