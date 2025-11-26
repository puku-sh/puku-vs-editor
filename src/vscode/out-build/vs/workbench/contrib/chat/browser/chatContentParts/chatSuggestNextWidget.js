/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
export class ChatSuggestNextWidget extends Disposable {
    constructor() {
        super();
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._onDidSelectPrompt = this._register(new Emitter());
        this.onDidSelectPrompt = this._onDidSelectPrompt.event;
        this.domNode = this.createSuggestNextWidget();
    }
    get height() {
        return this.domNode.style.display === 'none' ? 0 : this.domNode.offsetHeight;
    }
    getCurrentMode() {
        return this._currentMode;
    }
    createSuggestNextWidget() {
        // Reuse welcome view classes for consistent styling
        const container = dom.$('.chat-suggest-next-widget.chat-welcome-view-suggested-prompts');
        container.style.display = 'none';
        // Title element using welcome view class
        this.titleElement = dom.append(container, dom.$('.chat-welcome-view-suggested-prompts-title'));
        // Container for prompt buttons
        this.promptsContainer = container;
        return container;
    }
    render(mode) {
        const handoffs = mode.handOffs?.get();
        if (!handoffs || handoffs.length === 0) {
            this.hide();
            return;
        }
        this._currentMode = mode;
        // Update title with mode name: "Proceed from {Mode}"
        const modeName = mode.name.get() || mode.label.get() || localize(5566, null);
        this.titleElement.textContent = localize(5567, null, modeName);
        // Clear existing prompt buttons (keep title which is first child)
        const childrenToRemove = [];
        for (let i = 1; i < this.promptsContainer.children.length; i++) {
            childrenToRemove.push(this.promptsContainer.children[i]);
        }
        for (const child of childrenToRemove) {
            this.promptsContainer.removeChild(child);
        }
        // Create prompt buttons using welcome view classes
        for (const handoff of handoffs) {
            const promptButton = this.createPromptButton(handoff);
            this.promptsContainer.appendChild(promptButton);
        }
        this.domNode.style.display = 'flex';
        this._onDidChangeHeight.fire();
    }
    createPromptButton(handoff) {
        // Reuse welcome view prompt button class
        const button = dom.$('.chat-welcome-view-suggested-prompt');
        button.setAttribute('tabindex', '0');
        button.setAttribute('role', 'button');
        button.setAttribute('aria-label', localize(5568, null, handoff.label));
        // Title element using welcome view class
        const titleElement = dom.append(button, dom.$('.chat-welcome-view-suggested-prompt-title'));
        titleElement.textContent = handoff.label;
        // Click handler
        this._register(dom.addDisposableListener(button, 'click', () => {
            this._onDidSelectPrompt.fire({ handoff });
        }));
        // Keyboard handler
        this._register(dom.addDisposableListener(button, 'keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._onDidSelectPrompt.fire({ handoff });
            }
        }));
        return button;
    }
    hide() {
        if (this.domNode.style.display !== 'none') {
            this._currentMode = undefined;
            this.domNode.style.display = 'none';
            this._onDidChangeHeight.fire();
        }
    }
}
//# sourceMappingURL=chatSuggestNextWidget.js.map