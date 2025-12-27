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
        const modeName = mode.name.get() || mode.label.get() || localize('chat.currentMode', 'current mode');
        this.titleElement.textContent = localize('chat.proceedFrom', 'Proceed from {0}', modeName);
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
        button.setAttribute('aria-label', localize('chat.suggestNext.item', '{0}', handoff.label));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFN1Z2dlc3ROZXh0V2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdFN1Z2dlc3ROZXh0V2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFRakQsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFVBQVU7SUFhcEQ7UUFDQyxLQUFLLEVBQUUsQ0FBQztRQVhRLHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQzFELHNCQUFpQixHQUFnQixJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDO1FBRTlELHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXdCLENBQUMsQ0FBQztRQUMxRSxzQkFBaUIsR0FBZ0MsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQVE5RixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO0lBQy9DLENBQUM7SUFFRCxJQUFXLE1BQU07UUFDaEIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFB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