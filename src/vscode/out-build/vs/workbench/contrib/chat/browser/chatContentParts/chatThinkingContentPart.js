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
            ?? localize(5572, null);
        super(extractedTitle, context);
        this.configurationService = configurationService;
        this.markdownRendererService = markdownRendererService;
        this.defaultTitle = localize(5571, null);
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
                finalLabel = localize(5573, null, this.lastExtractedTitle, this.hasMultipleItems ? '...' : '');
            }
            else {
                finalLabel = localize(5574, null);
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
                const suffix = localize(5575, null);
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
            const thinkingLabel = localize(5576, null, title);
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
//# sourceMappingURL=chatThinkingContentPart.js.map