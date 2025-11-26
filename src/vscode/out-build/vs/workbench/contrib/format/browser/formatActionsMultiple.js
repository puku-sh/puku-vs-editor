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
var DefaultFormatter_1;
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorAction, registerEditorAction } from '../../../../editor/browser/editorExtensions.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import * as nls from '../../../../nls.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { formatDocumentRangesWithProvider, formatDocumentWithProvider, getRealAndSyntheticDocumentFormattersOrdered, FormattingConflicts } from '../../../../editor/contrib/format/browser/format.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { IExtensionService, toExtension } from '../../../services/extensions/common/extensions.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INotificationService, NotificationPriority, Severity } from '../../../../platform/notification/common/notification.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { ILanguageStatusService } from '../../../services/languageStatus/common/languageStatusService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { generateUuid } from '../../../../base/common/uuid.js';
let DefaultFormatter = class DefaultFormatter extends Disposable {
    static { DefaultFormatter_1 = this; }
    static { this.configName = 'editor.defaultFormatter'; }
    static { this.extensionIds = []; }
    static { this.extensionItemLabels = []; }
    static { this.extensionDescriptions = []; }
    constructor(_extensionService, _extensionEnablementService, _configService, _notificationService, _dialogService, _quickInputService, _languageService, _languageFeaturesService, _languageStatusService, _editorService) {
        super();
        this._extensionService = _extensionService;
        this._extensionEnablementService = _extensionEnablementService;
        this._configService = _configService;
        this._notificationService = _notificationService;
        this._dialogService = _dialogService;
        this._quickInputService = _quickInputService;
        this._languageService = _languageService;
        this._languageFeaturesService = _languageFeaturesService;
        this._languageStatusService = _languageStatusService;
        this._editorService = _editorService;
        this._languageStatusStore = this._store.add(new DisposableStore());
        this._store.add(this._extensionService.onDidChangeExtensions(this._updateConfigValues, this));
        this._store.add(FormattingConflicts.setFormatterSelector((formatter, document, mode, kind) => this._selectFormatter(formatter, document, mode, kind)));
        this._store.add(_editorService.onDidActiveEditorChange(this._updateStatus, this));
        this._store.add(_languageFeaturesService.documentFormattingEditProvider.onDidChange(this._updateStatus, this));
        this._store.add(_languageFeaturesService.documentRangeFormattingEditProvider.onDidChange(this._updateStatus, this));
        this._store.add(_languageFeaturesService.documentFormattingEditProvider.onDidChange(this._updateConfigValues, this));
        this._store.add(_languageFeaturesService.documentRangeFormattingEditProvider.onDidChange(this._updateConfigValues, this));
        this._store.add(_configService.onDidChangeConfiguration(e => e.affectsConfiguration(DefaultFormatter_1.configName) && this._updateStatus()));
        this._updateConfigValues();
    }
    async _updateConfigValues() {
        await this._extensionService.whenInstalledExtensionsRegistered();
        let extensions = [...this._extensionService.extensions];
        // Get all formatter providers to identify which extensions actually contribute formatters
        const documentFormatters = this._languageFeaturesService.documentFormattingEditProvider.allNoModel();
        const rangeFormatters = this._languageFeaturesService.documentRangeFormattingEditProvider.allNoModel();
        const formatterExtensionIds = new Set();
        for (const formatter of documentFormatters) {
            if (formatter.extensionId) {
                formatterExtensionIds.add(ExtensionIdentifier.toKey(formatter.extensionId));
            }
        }
        for (const formatter of rangeFormatters) {
            if (formatter.extensionId) {
                formatterExtensionIds.add(ExtensionIdentifier.toKey(formatter.extensionId));
            }
        }
        extensions = extensions.sort((a, b) => {
            // Ultimate boost: extensions that actually contribute formatters
            const contributesFormatterA = formatterExtensionIds.has(ExtensionIdentifier.toKey(a.identifier));
            const contributesFormatterB = formatterExtensionIds.has(ExtensionIdentifier.toKey(b.identifier));
            if (contributesFormatterA && !contributesFormatterB) {
                return -1;
            }
            else if (!contributesFormatterA && contributesFormatterB) {
                return 1;
            }
            // Secondary boost: category-based sorting
            const boostA = a.categories?.find(cat => cat === 'Formatters' || cat === 'Programming Languages');
            const boostB = b.categories?.find(cat => cat === 'Formatters' || cat === 'Programming Languages');
            if (boostA && !boostB) {
                return -1;
            }
            else if (!boostA && boostB) {
                return 1;
            }
            else {
                return a.name.localeCompare(b.name);
            }
        });
        DefaultFormatter_1.extensionIds.length = 0;
        DefaultFormatter_1.extensionItemLabels.length = 0;
        DefaultFormatter_1.extensionDescriptions.length = 0;
        DefaultFormatter_1.extensionIds.push(null);
        DefaultFormatter_1.extensionItemLabels.push(nls.localize(9014, null));
        DefaultFormatter_1.extensionDescriptions.push(nls.localize(9015, null));
        for (const extension of extensions) {
            if (extension.main || extension.browser) {
                DefaultFormatter_1.extensionIds.push(extension.identifier.value);
                DefaultFormatter_1.extensionItemLabels.push(extension.displayName ?? '');
                DefaultFormatter_1.extensionDescriptions.push(extension.description ?? '');
            }
        }
    }
    static _maybeQuotes(s) {
        return s.match(/\s/) ? `'${s}'` : s;
    }
    async _analyzeFormatter(kind, formatter, document) {
        const defaultFormatterId = this._configService.getValue(DefaultFormatter_1.configName, {
            resource: document.uri,
            overrideIdentifier: document.getLanguageId()
        });
        if (defaultFormatterId) {
            // good -> formatter configured
            const defaultFormatter = formatter.find(formatter => ExtensionIdentifier.equals(formatter.extensionId, defaultFormatterId));
            if (defaultFormatter) {
                // formatter available
                return defaultFormatter;
            }
            // bad -> formatter gone
            const extension = await this._extensionService.getExtension(defaultFormatterId);
            if (extension && this._extensionEnablementService.isEnabled(toExtension(extension))) {
                // formatter does not target this file
                const langName = this._languageService.getLanguageName(document.getLanguageId()) || document.getLanguageId();
                const detail = kind === 1 /* FormattingKind.File */
                    ? nls.localize(9016, null, extension.displayName || extension.name, langName)
                    : nls.localize(9017, null, extension.displayName || extension.name, langName);
                return detail;
            }
        }
        else if (formatter.length === 1) {
            // ok -> nothing configured but only one formatter available
            return formatter[0];
        }
        const langName = this._languageService.getLanguageName(document.getLanguageId()) || document.getLanguageId();
        const message = !defaultFormatterId
            ? nls.localize(9018, null, DefaultFormatter_1._maybeQuotes(langName))
            : nls.localize(9019, null, defaultFormatterId);
        return message;
    }
    async _selectFormatter(formatter, document, mode, kind) {
        const formatterOrMessage = await this._analyzeFormatter(kind, formatter, document);
        if (typeof formatterOrMessage !== 'string') {
            return formatterOrMessage;
        }
        if (mode !== 2 /* FormattingMode.Silent */) {
            // running from a user action -> show modal dialog so that users configure
            // a default formatter
            const { confirmed } = await this._dialogService.confirm({
                message: nls.localize(9020, null),
                detail: formatterOrMessage,
                primaryButton: nls.localize(9021, null)
            });
            if (confirmed) {
                return this._pickAndPersistDefaultFormatter(formatter, document);
            }
        }
        else {
            // no user action -> show a silent notification and proceed
            this._notificationService.prompt(Severity.Info, formatterOrMessage, [{ label: nls.localize(9022, null), run: () => this._pickAndPersistDefaultFormatter(formatter, document) }], { priority: NotificationPriority.SILENT });
        }
        return undefined;
    }
    async _pickAndPersistDefaultFormatter(formatter, document) {
        const picks = formatter.map((formatter, index) => {
            return {
                index,
                label: formatter.displayName || (formatter.extensionId ? formatter.extensionId.value : '?'),
                description: formatter.extensionId && formatter.extensionId.value
            };
        });
        const langName = this._languageService.getLanguageName(document.getLanguageId()) || document.getLanguageId();
        const pick = await this._quickInputService.pick(picks, { placeHolder: nls.localize(9023, null, DefaultFormatter_1._maybeQuotes(langName)) });
        if (!pick || !formatter[pick.index].extensionId) {
            return undefined;
        }
        this._configService.updateValue(DefaultFormatter_1.configName, formatter[pick.index].extensionId.value, {
            resource: document.uri,
            overrideIdentifier: document.getLanguageId()
        });
        return formatter[pick.index];
    }
    // --- status item
    _updateStatus() {
        this._languageStatusStore.clear();
        const editor = getCodeEditor(this._editorService.activeTextEditorControl);
        if (!editor || !editor.hasModel()) {
            return;
        }
        const document = editor.getModel();
        const formatter = getRealAndSyntheticDocumentFormattersOrdered(this._languageFeaturesService.documentFormattingEditProvider, this._languageFeaturesService.documentRangeFormattingEditProvider, document);
        if (formatter.length === 0) {
            return;
        }
        const cts = new CancellationTokenSource();
        this._languageStatusStore.add(toDisposable(() => cts.dispose(true)));
        this._analyzeFormatter(1 /* FormattingKind.File */, formatter, document).then(result => {
            if (cts.token.isCancellationRequested) {
                return;
            }
            if (typeof result !== 'string') {
                return;
            }
            const command = { id: `formatter/configure/dfl/${generateUuid()}`, title: nls.localize(9024, null) };
            this._languageStatusStore.add(CommandsRegistry.registerCommand(command.id, () => this._pickAndPersistDefaultFormatter(formatter, document)));
            this._languageStatusStore.add(this._languageStatusService.addStatus({
                id: 'formatter.conflict',
                name: nls.localize(9025, null),
                selector: { language: document.getLanguageId(), pattern: document.uri.fsPath },
                severity: Severity.Error,
                label: nls.localize(9026, null),
                detail: result,
                busy: false,
                source: '',
                command,
                accessibilityInfo: undefined
            }));
        });
    }
};
DefaultFormatter = DefaultFormatter_1 = __decorate([
    __param(0, IExtensionService),
    __param(1, IWorkbenchExtensionEnablementService),
    __param(2, IConfigurationService),
    __param(3, INotificationService),
    __param(4, IDialogService),
    __param(5, IQuickInputService),
    __param(6, ILanguageService),
    __param(7, ILanguageFeaturesService),
    __param(8, ILanguageStatusService),
    __param(9, IEditorService)
], DefaultFormatter);
export { DefaultFormatter };
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DefaultFormatter, 3 /* LifecyclePhase.Restored */);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        [DefaultFormatter.configName]: {
            description: nls.localize(9027, null),
            type: ['string', 'null'],
            default: null,
            enum: DefaultFormatter.extensionIds,
            enumItemLabels: DefaultFormatter.extensionItemLabels,
            markdownEnumDescriptions: DefaultFormatter.extensionDescriptions
        }
    }
});
async function showFormatterPick(accessor, model, formatters) {
    const quickPickService = accessor.get(IQuickInputService);
    const configService = accessor.get(IConfigurationService);
    const languageService = accessor.get(ILanguageService);
    const overrides = { resource: model.uri, overrideIdentifier: model.getLanguageId() };
    const defaultFormatter = configService.getValue(DefaultFormatter.configName, overrides);
    let defaultFormatterPick;
    const picks = formatters.map((provider, index) => {
        const isDefault = ExtensionIdentifier.equals(provider.extensionId, defaultFormatter);
        const pick = {
            index,
            label: provider.displayName || '',
            description: isDefault ? nls.localize(9028, null) : undefined,
        };
        if (isDefault) {
            // autofocus default pick
            defaultFormatterPick = pick;
        }
        return pick;
    });
    const configurePick = {
        label: nls.localize(9029, null)
    };
    const pick = await quickPickService.pick([...picks, { type: 'separator' }, configurePick], {
        placeHolder: nls.localize(9030, null),
        activeItem: defaultFormatterPick
    });
    if (!pick) {
        // dismissed
        return undefined;
    }
    else if (pick === configurePick) {
        // config default
        const langName = languageService.getLanguageName(model.getLanguageId()) || model.getLanguageId();
        const pick = await quickPickService.pick(picks, { placeHolder: nls.localize(9031, null, DefaultFormatter._maybeQuotes(langName)) });
        if (pick && formatters[pick.index].extensionId) {
            configService.updateValue(DefaultFormatter.configName, formatters[pick.index].extensionId.value, overrides);
        }
        return undefined;
    }
    else {
        // picked one
        return pick.index;
    }
}
registerEditorAction(class FormatDocumentMultipleAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.formatDocument.multiple',
            label: nls.localize(9032, null),
            alias: 'Format Document...',
            precondition: ContextKeyExpr.and(EditorContextKeys.writable, EditorContextKeys.hasMultipleDocumentFormattingProvider),
            contextMenuOpts: {
                group: '1_modification',
                order: 1.3
            }
        });
    }
    async run(accessor, editor, args) {
        if (!editor.hasModel()) {
            return;
        }
        const instaService = accessor.get(IInstantiationService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const model = editor.getModel();
        const provider = getRealAndSyntheticDocumentFormattersOrdered(languageFeaturesService.documentFormattingEditProvider, languageFeaturesService.documentRangeFormattingEditProvider, model);
        const pick = await instaService.invokeFunction(showFormatterPick, model, provider);
        if (typeof pick === 'number') {
            await instaService.invokeFunction(formatDocumentWithProvider, provider[pick], editor, 1 /* FormattingMode.Explicit */, CancellationToken.None);
        }
    }
});
registerEditorAction(class FormatSelectionMultipleAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.formatSelection.multiple',
            label: nls.localize(9033, null),
            alias: 'Format Code...',
            precondition: ContextKeyExpr.and(ContextKeyExpr.and(EditorContextKeys.writable), EditorContextKeys.hasMultipleDocumentSelectionFormattingProvider),
            contextMenuOpts: {
                when: ContextKeyExpr.and(EditorContextKeys.hasNonEmptySelection),
                group: '1_modification',
                order: 1.31
            }
        });
    }
    async run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const instaService = accessor.get(IInstantiationService);
        const languageFeaturesService = accessor.get(ILanguageFeaturesService);
        const model = editor.getModel();
        let range = editor.getSelection();
        if (range.isEmpty()) {
            range = new Range(range.startLineNumber, 1, range.startLineNumber, model.getLineMaxColumn(range.startLineNumber));
        }
        const provider = languageFeaturesService.documentRangeFormattingEditProvider.ordered(model);
        const pick = await instaService.invokeFunction(showFormatterPick, model, provider);
        if (typeof pick === 'number') {
            await instaService.invokeFunction(formatDocumentRangesWithProvider, provider[pick], editor, range, CancellationToken.None, true);
        }
    }
});
//# sourceMappingURL=formatActionsMultiple.js.map