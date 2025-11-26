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
import { append, h } from '../../../../../../base/browser/dom.js';
import { Separator } from '../../../../../../base/common/actions.js';
import { asArray } from '../../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ErrorNoTelemetry } from '../../../../../../base/common/errors.js';
import { createCommandUri, MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { thenIfNotDisposed, thenRegisterOrDispose, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../../base/common/network.js';
import Severity from '../../../../../../base/common/severity.js';
import { isObject } from '../../../../../../base/common/types.js';
import { URI } from '../../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../../base/common/uuid.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { IPreferencesService } from '../../../../../services/preferences/common/preferences.js';
import { ITerminalChatService } from '../../../../terminal/browser/terminal.js';
import { migrateLegacyTerminalToolSpecificData } from '../../../common/chat.js';
import { ChatContextKeys } from '../../../common/chatContextKeys.js';
import { IChatToolInvocation } from '../../../common/chatService.js';
import { AcceptToolConfirmationActionId, SkipToolConfirmationActionId } from '../../actions/chatToolActions.js';
import { IChatWidgetService } from '../../chat.js';
import { ChatCustomConfirmationWidget } from '../chatConfirmationWidget.js';
import { ChatMarkdownContentPart } from '../chatMarkdownContentPart.js';
import { disableSessionAutoApprovalCommandId, openTerminalSettingsLinkCommandId } from './chatTerminalToolProgressPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
export var TerminalToolConfirmationStorageKeys;
(function (TerminalToolConfirmationStorageKeys) {
    TerminalToolConfirmationStorageKeys["TerminalAutoApproveWarningAccepted"] = "chat.tools.terminal.autoApprove.warningAccepted";
})(TerminalToolConfirmationStorageKeys || (TerminalToolConfirmationStorageKeys = {}));
let ChatTerminalToolConfirmationSubPart = class ChatTerminalToolConfirmationSubPart extends BaseChatToolInvocationSubPart {
    constructor(toolInvocation, terminalData, context, renderer, editorPool, currentWidthDelegate, codeBlockModelCollection, codeBlockStartIndex, instantiationService, dialogService, keybindingService, modelService, languageService, configurationService, contextKeyService, chatWidgetService, preferencesService, storageService, terminalChatService, textModelService, hoverService) {
        super(toolInvocation);
        this.context = context;
        this.renderer = renderer;
        this.editorPool = editorPool;
        this.currentWidthDelegate = currentWidthDelegate;
        this.codeBlockModelCollection = codeBlockModelCollection;
        this.codeBlockStartIndex = codeBlockStartIndex;
        this.instantiationService = instantiationService;
        this.dialogService = dialogService;
        this.keybindingService = keybindingService;
        this.modelService = modelService;
        this.languageService = languageService;
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this.chatWidgetService = chatWidgetService;
        this.preferencesService = preferencesService;
        this.storageService = storageService;
        this.terminalChatService = terminalChatService;
        this.codeblocks = [];
        // Tag for sub-agent styling
        if (toolInvocation.fromSubAgent) {
            context.container.classList.add('from-sub-agent');
        }
        if (!toolInvocation.confirmationMessages?.title) {
            throw new Error('Confirmation messages are missing');
        }
        terminalData = migrateLegacyTerminalToolSpecificData(terminalData);
        const { title, message, disclaimer, terminalCustomActions } = toolInvocation.confirmationMessages;
        const autoApproveEnabled = this.configurationService.getValue("chat.tools.terminal.enableAutoApprove" /* TerminalContribSettingId.EnableAutoApprove */) === true;
        const autoApproveWarningAccepted = this.storageService.getBoolean("chat.tools.terminal.autoApprove.warningAccepted" /* TerminalToolConfirmationStorageKeys.TerminalAutoApproveWarningAccepted */, -1 /* StorageScope.APPLICATION */, false);
        let moreActions = undefined;
        if (autoApproveEnabled) {
            moreActions = [];
            if (!autoApproveWarningAccepted) {
                moreActions.push({
                    label: localize(5615, null),
                    data: {
                        type: 'enable'
                    }
                });
                moreActions.push(new Separator());
                if (terminalCustomActions) {
                    for (const action of terminalCustomActions) {
                        if (!(action instanceof Separator)) {
                            action.disabled = true;
                        }
                    }
                }
            }
            if (terminalCustomActions) {
                moreActions.push(...terminalCustomActions);
            }
            if (moreActions.length === 0) {
                moreActions = undefined;
            }
        }
        const codeBlockRenderOptions = {
            hideToolbar: true,
            reserveWidth: 19,
            verticalPadding: 5,
            editorOptions: {
                wordWrap: 'on',
                readOnly: false,
                tabFocusMode: true,
                ariaLabel: typeof title === 'string' ? title : title.value
            }
        };
        const languageId = this.languageService.getLanguageIdByLanguageName(terminalData.language ?? 'sh') ?? 'shellscript';
        const model = this._register(this.modelService.createModel(terminalData.commandLine.toolEdited ?? terminalData.commandLine.original, this.languageService.createById(languageId), this._getUniqueCodeBlockUri(), true));
        thenRegisterOrDispose(textModelService.createModelReference(model.uri), this._store);
        const editor = this._register(this.editorPool.get());
        const renderPromise = editor.object.render({
            codeBlockIndex: this.codeBlockStartIndex,
            codeBlockPartIndex: 0,
            element: this.context.element,
            languageId,
            renderOptions: codeBlockRenderOptions,
            textModel: Promise.resolve(model),
            chatSessionResource: this.context.element.sessionResource
        }, this.currentWidthDelegate());
        this._register(thenIfNotDisposed(renderPromise, () => this._onDidChangeHeight.fire()));
        this.codeblocks.push({
            codeBlockIndex: this.codeBlockStartIndex,
            codemapperUri: undefined,
            elementId: this.context.element.id,
            focus: () => editor.object.focus(),
            ownerMarkdownPartId: this.codeblocksPartId,
            uri: model.uri,
            uriPromise: Promise.resolve(model.uri),
            chatSessionResource: this.context.element.sessionResource
        });
        this._register(editor.object.onDidChangeContentHeight(() => {
            editor.object.layout(this.currentWidthDelegate());
            this._onDidChangeHeight.fire();
        }));
        this._register(model.onDidChangeContent(e => {
            terminalData.commandLine.userEdited = model.getValue();
        }));
        const elements = h('.chat-confirmation-message-terminal', [
            h('.chat-confirmation-message-terminal-editor@editor'),
            h('.chat-confirmation-message-terminal-disclaimer@disclaimer'),
        ]);
        append(elements.editor, editor.object.element);
        this._register(hoverService.setupDelayedHover(elements.editor, {
            content: message || '',
            style: 1 /* HoverStyle.Pointer */,
            position: { hoverPosition: 0 /* HoverPosition.LEFT */ },
        }));
        const confirmWidget = this._register(this.instantiationService.createInstance((ChatCustomConfirmationWidget), this.context, {
            title,
            icon: Codicon.terminal,
            message: elements.root,
            buttons: this._createButtons(moreActions)
        }));
        if (disclaimer) {
            this._appendMarkdownPart(elements.disclaimer, disclaimer, codeBlockRenderOptions);
        }
        const hasToolConfirmationKey = ChatContextKeys.Editing.hasToolConfirmation.bindTo(this.contextKeyService);
        hasToolConfirmationKey.set(true);
        this._register(toDisposable(() => hasToolConfirmationKey.reset()));
        this._register(confirmWidget.onDidClick(async (button) => {
            let doComplete = true;
            const data = button.data;
            let toolConfirmKind = 0 /* ToolConfirmKind.Denied */;
            if (typeof data === 'boolean') {
                if (data) {
                    toolConfirmKind = 4 /* ToolConfirmKind.UserAction */;
                    // Clear out any auto approve info since this was an explicit user action. This
                    // can happen when the auto approve feature is off.
                    if (terminalData.autoApproveInfo) {
                        terminalData.autoApproveInfo = undefined;
                    }
                }
            }
            else if (typeof data !== 'boolean') {
                switch (data.type) {
                    case 'enable': {
                        const optedIn = await this._showAutoApproveWarning();
                        if (optedIn) {
                            this.storageService.store("chat.tools.terminal.autoApprove.warningAccepted" /* TerminalToolConfirmationStorageKeys.TerminalAutoApproveWarningAccepted */, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
                            // This is good to auto approve immediately
                            if (!terminalCustomActions) {
                                toolConfirmKind = 4 /* ToolConfirmKind.UserAction */;
                            }
                            // If this would not have been auto approved, enable the options and
                            // do not complete
                            else {
                                for (const action of terminalCustomActions) {
                                    if (!(action instanceof Separator)) {
                                        action.disabled = false;
                                    }
                                }
                                confirmWidget.updateButtons(this._createButtons(terminalCustomActions));
                                doComplete = false;
                            }
                        }
                        else {
                            doComplete = false;
                        }
                        break;
                    }
                    case 'skip': {
                        toolConfirmKind = 5 /* ToolConfirmKind.Skipped */;
                        break;
                    }
                    case 'newRule': {
                        const newRules = asArray(data.rule);
                        const inspect = this.configurationService.inspect("chat.tools.terminal.autoApprove" /* TerminalContribSettingId.AutoApprove */);
                        const oldValue = inspect.user?.value ?? {};
                        let newValue;
                        if (isObject(oldValue)) {
                            newValue = { ...oldValue };
                            for (const newRule of newRules) {
                                newValue[newRule.key] = newRule.value;
                            }
                        }
                        else {
                            this.preferencesService.openSettings({
                                jsonEditor: true,
                                target: 2 /* ConfigurationTarget.USER */,
                                revealSetting: {
                                    key: "chat.tools.terminal.autoApprove" /* TerminalContribSettingId.AutoApprove */
                                },
                            });
                            throw new ErrorNoTelemetry(`Cannot add new rule, existing setting is unexpected format`);
                        }
                        await this.configurationService.updateValue("chat.tools.terminal.autoApprove" /* TerminalContribSettingId.AutoApprove */, newValue, 2 /* ConfigurationTarget.USER */);
                        function formatRuleLinks(newRules) {
                            return newRules.map(e => {
                                const settingsUri = createCommandUri(openTerminalSettingsLinkCommandId, 2 /* ConfigurationTarget.USER */);
                                return `[\`${e.key}\`](${settingsUri.toString()} "${localize(5616, null)}")`;
                            }).join(', ');
                        }
                        const mdTrustSettings = {
                            isTrusted: {
                                enabledCommands: [openTerminalSettingsLinkCommandId]
                            }
                        };
                        if (newRules.length === 1) {
                            terminalData.autoApproveInfo = new MarkdownString(localize(5617, null, formatRuleLinks(newRules)), mdTrustSettings);
                        }
                        else if (newRules.length > 1) {
                            terminalData.autoApproveInfo = new MarkdownString(localize(5618, null, formatRuleLinks(newRules)), mdTrustSettings);
                        }
                        toolConfirmKind = 4 /* ToolConfirmKind.UserAction */;
                        break;
                    }
                    case 'configure': {
                        this.preferencesService.openSettings({
                            target: 2 /* ConfigurationTarget.USER */,
                            query: `@id:${"chat.tools.terminal.autoApprove" /* TerminalContribSettingId.AutoApprove */}`,
                        });
                        doComplete = false;
                        break;
                    }
                    case 'sessionApproval': {
                        const sessionId = this.context.element.sessionId;
                        this.terminalChatService.setChatSessionAutoApproval(sessionId, true);
                        const disableUri = createCommandUri(disableSessionAutoApprovalCommandId, sessionId);
                        const mdTrustSettings = {
                            isTrusted: {
                                enabledCommands: [disableSessionAutoApprovalCommandId]
                            }
                        };
                        terminalData.autoApproveInfo = new MarkdownString(`${localize(5619, null)} ([${localize(5620, null)}](${disableUri.toString()}))`, mdTrustSettings);
                        toolConfirmKind = 4 /* ToolConfirmKind.UserAction */;
                        break;
                    }
                }
            }
            if (doComplete) {
                IChatToolInvocation.confirmWith(toolInvocation, { type: toolConfirmKind });
                this.chatWidgetService.getWidgetBySessionResource(this.context.element.sessionResource)?.focusInput();
            }
        }));
        this._register(confirmWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this.domNode = confirmWidget.domNode;
    }
    _createButtons(moreActions) {
        const getLabelAndTooltip = (label, actionId, tooltipDetail = label) => {
            const keybinding = this.keybindingService.lookupKeybinding(actionId)?.getLabel();
            const tooltip = keybinding ? `${tooltipDetail} (${keybinding})` : (tooltipDetail);
            return { label, tooltip };
        };
        return [
            {
                ...getLabelAndTooltip(localize(5621, null), AcceptToolConfirmationActionId),
                data: true,
                moreActions,
            },
            {
                ...getLabelAndTooltip(localize(5622, null), SkipToolConfirmationActionId, localize(5623, null)),
                data: { type: 'skip' },
                isSecondary: true,
            },
        ];
    }
    async _showAutoApproveWarning() {
        const promptResult = await this.dialogService.prompt({
            type: Severity.Info,
            message: localize(5624, null),
            buttons: [{
                    label: localize(5625, null),
                    run: () => true
                }],
            cancelButton: true,
            custom: {
                icon: Codicon.shield,
                markdownDetails: [{
                        markdown: new MarkdownString(localize(5626, null)),
                    }, {
                        markdown: new MarkdownString(`[${localize(5627, null)}](https://code.visualstudio.com/docs/copilot/security#_security-considerations)`)
                    }],
            }
        });
        return promptResult.result === true;
    }
    _getUniqueCodeBlockUri() {
        return URI.from({
            scheme: Schemas.vscodeChatCodeBlock,
            path: generateUuid(),
        });
    }
    _appendMarkdownPart(container, message, codeBlockRenderOptions) {
        const part = this._register(this.instantiationService.createInstance(ChatMarkdownContentPart, {
            kind: 'markdownContent',
            content: typeof message === 'string' ? new MarkdownString().appendMarkdown(message) : message
        }, this.context, this.editorPool, false, this.codeBlockStartIndex, this.renderer, undefined, this.currentWidthDelegate(), this.codeBlockModelCollection, { codeBlockRenderOptions }));
        append(container, part.domNode);
        this._register(part.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
    }
};
ChatTerminalToolConfirmationSubPart = __decorate([
    __param(8, IInstantiationService),
    __param(9, IDialogService),
    __param(10, IKeybindingService),
    __param(11, IModelService),
    __param(12, ILanguageService),
    __param(13, IConfigurationService),
    __param(14, IContextKeyService),
    __param(15, IChatWidgetService),
    __param(16, IPreferencesService),
    __param(17, IStorageService),
    __param(18, ITerminalChatService),
    __param(19, ITextModelService),
    __param(20, IHoverService)
], ChatTerminalToolConfirmationSubPart);
export { ChatTerminalToolConfirmationSubPart };
//# sourceMappingURL=chatTerminalToolConfirmationSubPart.js.map