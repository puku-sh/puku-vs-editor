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
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { $ } from '../../../../base/browser/dom.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ITerminalChatService } from './terminal.js';
import * as dom from '../../../../base/browser/dom.js';
let TerminalTabsChatEntry = class TerminalTabsChatEntry extends Disposable {
    dispose() {
        this._entry.remove();
        this._label.remove();
        super.dispose();
    }
    constructor(container, _tabContainer, _commandService, _terminalChatService) {
        super();
        this._tabContainer = _tabContainer;
        this._commandService = _commandService;
        this._terminalChatService = _terminalChatService;
        this._entry = dom.append(container, $('.terminal-tabs-chat-entry'));
        this._entry.tabIndex = 0;
        this._entry.setAttribute('role', 'button');
        const entry = dom.append(this._entry, $('.terminal-tabs-entry'));
        const icon = dom.append(entry, $('.terminal-tabs-chat-entry-icon'));
        icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.commentDiscussionSparkle));
        this._label = dom.append(entry, $('.terminal-tabs-chat-entry-label'));
        const runChatTerminalsCommand = () => {
            void this._commandService.executeCommand('workbench.action.terminal.chat.viewHiddenChatTerminals');
        };
        this._register(dom.addDisposableListener(this._entry, dom.EventType.CLICK, e => {
            e.preventDefault();
            runChatTerminalsCommand();
        }));
        this._register(dom.addDisposableListener(this._entry, dom.EventType.KEY_DOWN, e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                runChatTerminalsCommand();
            }
        }));
        this.update();
    }
    get element() {
        return this._entry;
    }
    update() {
        const hiddenChatTerminalCount = this._terminalChatService.getToolSessionTerminalInstances(true).length;
        if (hiddenChatTerminalCount <= 0) {
            this._entry.style.display = 'none';
            this._label.textContent = '';
            this._entry.removeAttribute('aria-label');
            this._entry.removeAttribute('title');
            return;
        }
        this._entry.style.display = '';
        const tooltip = localize('terminal.tabs.chatEntryTooltip', "Show hidden chat terminals");
        this._entry.setAttribute('title', tooltip);
        const hasText = this._tabContainer.classList.contains('has-text');
        if (hasText) {
            this._label.textContent = hiddenChatTerminalCount === 1
                ? localize('terminal.tabs.chatEntryLabelSingle', "{0} Hidden Terminal", hiddenChatTerminalCount)
                : localize('terminal.tabs.chatEntryLabelPlural', "{0} Hidden Terminals", hiddenChatTerminalCount);
        }
        else {
            this._label.textContent = `${hiddenChatTerminalCount}`;
        }
        const ariaLabel = hiddenChatTerminalCount === 1
            ? localize('terminal.tabs.chatEntryAriaLabelSingle', "Show 1 hidden chat terminal")
            : localize('terminal.tabs.chatEntryAriaLabelPlural', "Show {0} hidden chat terminals", hiddenChatTerminalCount);
        this._entry.setAttribute('aria-label', ariaLabel);
    }
};
TerminalTabsChatEntry = __decorate([
    __param(2, ICommandService),
    __param(3, ITerminalChatService)
], TerminalTabsChatEntry);
export { TerminalTabsChatEntry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUYWJzQ2hhdEVudHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbFRhYnNDaGF0RW50cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3BELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JELE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFFaEQsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBSzNDLE9BQU87UUFDZixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDckIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7SUFFRCxZQUNDLFNBQXNCLEVBQ0wsYUFBMEIsRUFDVCxlQUFnQyxFQUMzQixvQkFBMEM7UUFFakYsS0FBSyxFQUFFLENBQUM7UUFKUyxrQkFBYSxHQUFiLGFBQWEsQ0FBYTtRQUNULG9CQUFlLEdBQWYsZUFBZSxDQUFp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