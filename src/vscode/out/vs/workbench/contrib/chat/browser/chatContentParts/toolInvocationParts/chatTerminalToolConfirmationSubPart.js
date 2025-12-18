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
                    label: localize('autoApprove.enable', 'Enable Auto Approve...'),
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
                                return `[\`${e.key}\`](${settingsUri.toString()} "${localize('ruleTooltip', 'View rule in settings')}")`;
                            }).join(', ');
                        }
                        const mdTrustSettings = {
                            isTrusted: {
                                enabledCommands: [openTerminalSettingsLinkCommandId]
                            }
                        };
                        if (newRules.length === 1) {
                            terminalData.autoApproveInfo = new MarkdownString(localize('newRule', 'Auto approve rule {0} added', formatRuleLinks(newRules)), mdTrustSettings);
                        }
                        else if (newRules.length > 1) {
                            terminalData.autoApproveInfo = new MarkdownString(localize('newRule.plural', 'Auto approve rules {0} added', formatRuleLinks(newRules)), mdTrustSettings);
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
                        terminalData.autoApproveInfo = new MarkdownString(`${localize('sessionApproval', 'All commands will be auto approved for this session')} ([${localize('sessionApproval.disable', 'Disable')}](${disableUri.toString()}))`, mdTrustSettings);
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
                ...getLabelAndTooltip(localize('tool.allow', "Allow"), AcceptToolConfirmationActionId),
                data: true,
                moreActions,
            },
            {
                ...getLabelAndTooltip(localize('tool.skip', "Skip"), SkipToolConfirmationActionId, localize('skip.detail', 'Proceed without executing this command')),
                data: { type: 'skip' },
                isSecondary: true,
            },
        ];
    }
    async _showAutoApproveWarning() {
        const promptResult = await this.dialogService.prompt({
            type: Severity.Info,
            message: localize('autoApprove.title', 'Enable terminal auto approve?'),
            buttons: [{
                    label: localize('autoApprove.button.enable', 'Enable'),
                    run: () => true
                }],
            cancelButton: true,
            custom: {
                icon: Codicon.shield,
                markdownDetails: [{
                        markdown: new MarkdownString(localize('autoApprove.markdown', 'This will enable a configurable subset of commands to run in the terminal autonomously. It provides *best effort protections* and assumes the agent is not acting maliciously.')),
                    }, {
                        markdown: new MarkdownString(`[${localize('autoApprove.markdown2', 'Learn more about the potential risks and how to avoid them.')}](https://code.visualstudio.com/docs/copilot/security#_security-considerations)`)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRlcm1pbmFsVG9vbENvbmZpcm1hdGlvblN1YlBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy90b29sSW52b2NhdGlvblBhcnRzL2NoYXRUZXJtaW5hbFRvb2xDb25maXJtYXRpb25TdWJQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFHbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGNBQWMsRUFBd0IsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25FLE9BQU8sUUFBUSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVE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