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
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { escapeMarkdownSyntaxTokens, createMarkdownCommandLink, MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { IMarkdownRendererService, openLinkFromMarkdown } from '../../../../../platform/markdown/browser/markdownRenderer.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IMcpService } from '../../../mcp/common/mcpTypes.js';
import { startServerAndWaitForLiveTools } from '../../../mcp/common/mcpTypesUtils.js';
import { isResponseVM } from '../../common/chatViewModel.js';
import { ChatProgressContentPart } from './chatProgressContentPart.js';
import './media/chatMcpServersInteractionContent.css';
let ChatMcpServersInteractionContentPart = class ChatMcpServersInteractionContentPart extends Disposable {
    constructor(data, context, mcpService, instantiationService, _openerService, _markdownRendererService) {
        super();
        this.data = data;
        this.context = context;
        this.mcpService = mcpService;
        this.instantiationService = instantiationService;
        this._openerService = _openerService;
        this._markdownRendererService = _markdownRendererService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.interactionMd = this._register(new MutableDisposable());
        this.showSpecificServersScheduler = this._register(new RunOnceScheduler(() => this.updateDetailedProgress(this.data.state.get()), 2500));
        this.previousParts = new Lazy(() => {
            if (!isResponseVM(this.context.element)) {
                return [];
            }
            return this.context.element.session.getItems()
                .filter((r, i) => isResponseVM(r) && i < this.context.elementIndex)
                .flatMap(i => i.response.value.filter(c => c.kind === 'mcpServersStarting'))
                .map(p => p.state?.get());
        });
        this.domNode = dom.$('.chat-mcp-servers-interaction');
        // Listen to autostart state changes if available
        if (data.state) {
            this._register(autorun(reader => {
                const state = data.state.read(reader);
                this.updateForState(state);
            }));
        }
    }
    updateForState(state) {
        if (!state.working) {
            this.workingProgressPart?.domNode.remove();
            this.workingProgressPart = undefined;
            this.showSpecificServersScheduler.cancel();
        }
        else if (!this.workingProgressPart) {
            if (!this.showSpecificServersScheduler.isScheduled()) {
                this.showSpecificServersScheduler.schedule();
            }
        }
        else if (this.workingProgressPart) {
            this.updateDetailedProgress(state);
        }
        const requiringInteraction = state.serversRequiringInteraction.filter(s => {
            // don't note interaction for a server we already started
            if (this.data.didStartServerIds?.includes(s.id)) {
                return false;
            }
            // don't note interaction for a server we previously noted interaction for
            if (this.previousParts.value.some(p => p?.serversRequiringInteraction.some(s2 => s.id === s2.id))) {
                return false;
            }
            return true;
        });
        if (requiringInteraction.length > 0) {
            if (!this.interactionMd.value) {
                this.renderInteractionRequired(requiringInteraction);
            }
            else {
                this.updateInteractionRequired(this.interactionMd.value.element, requiringInteraction);
            }
        }
        else if (requiringInteraction.length === 0 && this.interactionContainer) {
            this.interactionContainer.remove();
            this.interactionContainer = undefined;
        }
        this._onDidChangeHeight.fire();
    }
    createServerCommandLinks(servers) {
        return servers.map(s => createMarkdownCommandLink({
            title: '`' + escapeMarkdownSyntaxTokens(s.label) + '`',
            id: "workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */,
            arguments: [s.id],
        }, false)).join(', ');
    }
    updateDetailedProgress(state) {
        const skipText = createMarkdownCommandLink({
            title: localize('mcp.skip.link', 'Skip?'),
            id: "workbench.mcp.skipAutostart" /* McpCommandIds.SkipCurrentAutostart */,
        });
        let content;
        if (state.starting.length === 0) {
            content = new MarkdownString(undefined, { isTrusted: true }).appendText(localize('mcp.working.mcp', 'Activating MCP extensions...') + ' ').appendMarkdown(skipText);
        }
        else {
            // Update to show specific server names as command links
            const serverLinks = this.createServerCommandLinks(state.starting);
            content = new MarkdownString(undefined, { isTrusted: true }).appendMarkdown(localize('mcp.starting.servers', 'Starting MCP servers {0}...', serverLinks) + ' ').appendMarkdown(skipText);
        }
        if (this.workingProgressPart) {
            this.workingProgressPart.updateMessage(content);
        }
        else {
            this.workingProgressPart = this._register(this.instantiationService.createInstance(ChatProgressContentPart, { kind: 'progressMessage', content }, this._markdownRendererService, this.context, true, // forceShowSpinner
            true, // forceShowMessage
            undefined, // icon
            undefined));
            this.domNode.appendChild(this.workingProgressPart.domNode);
        }
        this._onDidChangeHeight.fire();
    }
    renderInteractionRequired(serversRequiringInteraction) {
        this.interactionContainer = dom.$('.chat-mcp-servers-interaction-hint');
        // Create subtle hint message
        const messageContainer = dom.$('.chat-mcp-servers-message');
        const icon = dom.$('.chat-mcp-servers-icon');
        icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.mcp));
        const { messageMd } = this.createInteractionMessage(serversRequiringInteraction);
        messageContainer.appendChild(icon);
        messageContainer.appendChild(messageMd.element);
        this.interactionContainer.appendChild(messageContainer);
        this.domNode.prepend(this.interactionContainer);
    }
    updateInteractionRequired(oldElement, serversRequiringInteraction) {
        const { messageMd } = this.createInteractionMessage(serversRequiringInteraction);
        oldElement.replaceWith(messageMd.element);
    }
    createInteractionMessage(serversRequiringInteraction) {
        const count = serversRequiringInteraction.length;
        const links = this.createServerCommandLinks(serversRequiringInteraction);
        const content = count === 1
            ? localize('mcp.start.single', 'The MCP server {0} may have new tools and requires interaction to start. [Start it now?]({1})', links, '#start')
            : localize('mcp.start.multiple', 'The MCP servers {0} may have new tools and require interaction to start. [Start them now?]({1})', links, '#start');
        const str = new MarkdownString(content, { isTrusted: true });
        const messageMd = this.interactionMd.value = this._markdownRendererService.render(str, {
            asyncRenderCallback: () => this._onDidChangeHeight.fire(),
            actionHandler: (content) => {
                if (!content.startsWith('command:')) {
                    this._start(startLink);
                    return Promise.resolve(true);
                }
                return openLinkFromMarkdown(this._openerService, content, true);
            }
        });
        // eslint-disable-next-line no-restricted-syntax
        const startLink = [...messageMd.element.querySelectorAll('a')].find(a => !a.getAttribute('data-href')?.startsWith('command:'));
        if (!startLink) {
            // Should not happen
            return { messageMd, startLink: undefined };
        }
        startLink.setAttribute('role', 'button');
        startLink.href = '';
        return { messageMd, startLink };
    }
    async _start(startLink) {
        // Update to starting state
        startLink.style.pointerEvents = 'none';
        startLink.style.opacity = '0.7';
        try {
            if (!this.data.state) {
                return;
            }
            const state = this.data.state.get();
            const serversToStart = state.serversRequiringInteraction;
            // Start servers in sequence with progress updates
            for (let i = 0; i < serversToStart.length; i++) {
                const serverInfo = serversToStart[i];
                startLink.textContent = localize('mcp.starting', "Starting {0}...", serverInfo.label);
                this._onDidChangeHeight.fire();
                const server = this.mcpService.servers.get().find(s => s.definition.id === serverInfo.id);
                if (server) {
                    await startServerAndWaitForLiveTools(server, { promptType: 'all-untrusted' });
                    this.data.didStartServerIds ??= [];
                    this.data.didStartServerIds.push(serverInfo.id);
                }
            }
            // Remove the interaction container after successful start
            if (this.interactionContainer) {
                this.interactionContainer.remove();
                this.interactionContainer = undefined;
            }
        }
        catch (error) {
            // Reset link on error
            startLink.style.pointerEvents = '';
            startLink.style.opacity = '';
            startLink.textContent = 'Start now?';
        }
        finally {
            this._onDidChangeHeight.fire();
        }
    }
    hasSameContent(other) {
        // Simple implementation that checks if it's the same type
        return other.kind === 'mcpServersStarting';
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatMcpServersInteractionContentPart = __decorate([
    __param(2, IMcpService),
    __param(3, IInstantiationService),
    __param(4, IOpenerService),
    __param(5, IMarkdownRendererService)
], ChatMcpServersInteractionContentPart);
export { ChatMcpServersInteractionContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1jcFNlcnZlcnNJbnRlcmFjdGlvbkNvbnRlbnRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdE1jcFNlcnZlcnNJbnRlcmFjdGlvbkNvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUseUJBQXlCLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDbEksT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRTlILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURB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