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
import * as dom from '../../../../../../base/browser/dom.js';
import { status } from '../../../../../../base/browser/ui/aria/aria.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IChatToolInvocation } from '../../../common/chatService.js';
import { ChatProgressContentPart } from '../chatProgressContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
let ChatToolProgressSubPart = class ChatToolProgressSubPart extends BaseChatToolInvocationSubPart {
    constructor(toolInvocation, context, renderer, announcedToolProgressKeys, instantiationService, configurationService) {
        super(toolInvocation);
        this.context = context;
        this.renderer = renderer;
        this.announcedToolProgressKeys = announcedToolProgressKeys;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.codeblocks = [];
        this.domNode = this.createProgressPart();
    }
    createProgressPart() {
        if (IChatToolInvocation.isComplete(this.toolInvocation) && this.toolIsConfirmed && this.toolInvocation.pastTenseMessage) {
            const key = this.getAnnouncementKey('complete');
            const completionContent = this.toolInvocation.pastTenseMessage ?? this.toolInvocation.invocationMessage;
            const shouldAnnounce = this.toolInvocation.kind === 'toolInvocation' && this.hasMeaningfulContent(completionContent) ? this.computeShouldAnnounce(key) : false;
            const part = this.renderProgressContent(completionContent, shouldAnnounce);
            this._register(part);
            return part.domNode;
        }
        else {
            const container = document.createElement('div');
            const progressObservable = this.toolInvocation.kind === 'toolInvocation' ? this.toolInvocation.state.map((s, r) => s.type === 1 /* IChatToolInvocation.StateKind.Executing */ ? s.progress.read(r) : undefined) : undefined;
            this._register(autorun(reader => {
                const progress = progressObservable?.read(reader);
                const key = this.getAnnouncementKey('progress');
                const progressContent = progress?.message ?? this.toolInvocation.invocationMessage;
                const shouldAnnounce = this.toolInvocation.kind === 'toolInvocation' && this.hasMeaningfulContent(progressContent) ? this.computeShouldAnnounce(key) : false;
                const part = reader.store.add(this.renderProgressContent(progressContent, shouldAnnounce));
                dom.reset(container, part.domNode);
            }));
            return container;
        }
    }
    get toolIsConfirmed() {
        const c = IChatToolInvocation.executionConfirmedOrDenied(this.toolInvocation);
        return !!c && c.type !== 0 /* ToolConfirmKind.Denied */;
    }
    renderProgressContent(content, shouldAnnounce) {
        if (typeof content === 'string') {
            content = new MarkdownString().appendText(content);
        }
        const progressMessage = {
            kind: 'progressMessage',
            content
        };
        if (shouldAnnounce) {
            this.provideScreenReaderStatus(content);
        }
        return this.instantiationService.createInstance(ChatProgressContentPart, progressMessage, this.renderer, this.context, undefined, true, this.getIcon(), this.toolInvocation);
    }
    getAnnouncementKey(kind) {
        return `${kind}:${this.toolInvocation.toolCallId}`;
    }
    computeShouldAnnounce(key) {
        if (!this.announcedToolProgressKeys) {
            return false;
        }
        if (!this.configurationService.getValue("accessibility.verboseChatProgressUpdates" /* AccessibilityWorkbenchSettingId.VerboseChatProgressUpdates */)) {
            return false;
        }
        if (this.announcedToolProgressKeys.has(key)) {
            return false;
        }
        this.announcedToolProgressKeys.add(key);
        return true;
    }
    provideScreenReaderStatus(content) {
        const message = typeof content === 'string' ? content : content.value;
        status(message);
    }
    hasMeaningfulContent(content) {
        if (!content) {
            return false;
        }
        const text = typeof content === 'string' ? content : content.value;
        return text.trim().length > 0;
    }
};
ChatToolProgressSubPart = __decorate([
    __param(4, IInstantiationService),
    __param(5, IConfigurationService)
], ChatToolProgressSubPart);
export { ChatToolProgressSubPart };
//# sourceMappingURL=chatToolProgressPart.js.map