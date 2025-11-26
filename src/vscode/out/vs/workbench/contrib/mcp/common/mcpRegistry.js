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
import { assertNever } from '../../../../base/common/assert.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { derived, observableValue, autorunSelfDisposable } from '../../../../base/common/observable.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { mcpAccessConfig } from '../../../../platform/mcp/common/mcpManagement.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../../../services/configurationResolver/common/configurationResolverExpression.js';
import { AUX_WINDOW_GROUP, IEditorService } from '../../../services/editor/common/editorService.js';
import { IMcpDevModeDebugging } from './mcpDevMode.js';
import { McpRegistryInputStorage } from './mcpRegistryInputStorage.js';
import { McpServerConnection } from './mcpServerConnection.js';
import { McpStartServerInteraction, UserInteractionRequiredError } from './mcpTypes.js';
const notTrustedNonce = '__vscode_not_trusted';
let McpRegistry = class McpRegistry extends Disposable {
    get delegates() {
        return this._delegates;
    }
    constructor(_instantiationService, _configurationResolverService, _dialogService, _notificationService, _editorService, configurationService, _quickInputService, _labelService, _logService) {
        super();
        this._instantiationService = _instantiationService;
        this._configurationResolverService = _configurationResolverService;
        this._dialogService = _dialogService;
        this._notificationService = _notificationService;
        this._editorService = _editorService;
        this._quickInputService = _quickInputService;
        this._labelService = _labelService;
        this._logService = _logService;
        this._collections = observableValue('collections', []);
        this._delegates = observableValue('delegates', []);
        this.collections = derived(reader => {
            if (this._mcpAccessValue.read(reader) === "none" /* McpAccessValue.None */) {
                return [];
            }
            return this._collections.read(reader);
        });
        this._workspaceStorage = new Lazy(() => this._register(this._instantiationService.createInstance(McpRegistryInputStorage, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */)));
        this._profileStorage = new Lazy(() => this._register(this._instantiationService.createInstance(McpRegistryInputStorage, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */)));
        this._ongoingLazyActivations = observableValue(this, 0);
        this.lazyCollectionState = derived(reader => {
            if (this._mcpAccessValue.read(reader) === "none" /* McpAccessValue.None */) {
                return { state: 2 /* LazyCollectionState.AllKnown */, collections: [] };
            }
            if (this._ongoingLazyActivations.read(reader) > 0) {
                return { state: 1 /* LazyCollectionState.LoadingUnknown */, collections: [] };
            }
            const collections = this._collections.read(reader);
            const hasUnknown = collections.some(c => c.lazy && c.lazy.isCached === false);
            return hasUnknown ? { state: 0 /* LazyCollectionState.HasUnknown */, collections: collections.filter(c => c.lazy && c.lazy.isCached === false) } : { state: 2 /* LazyCollectionState.AllKnown */, collections: [] };
        });
        this._onDidChangeInputs = this._register(new Emitter());
        this.onDidChangeInputs = this._onDidChangeInputs.event;
        this._mcpAccessValue = observableConfigValue(mcpAccessConfig, "all" /* McpAccessValue.All */, configurationService);
    }
    registerDelegate(delegate) {
        const delegates = this._delegates.get().slice();
        delegates.push(delegate);
        delegates.sort((a, b) => b.priority - a.priority);
        this._delegates.set(delegates, undefined);
        return {
            dispose: () => {
                const delegates = this._delegates.get().filter(d => d !== delegate);
                this._delegates.set(delegates, undefined);
            }
        };
    }
    registerCollection(collection) {
        const currentCollections = this._collections.get();
        const toReplace = currentCollections.find(c => c.lazy && c.id === collection.id);
        // Incoming collections replace the "lazy" versions. See `ExtensionMcpDiscovery` for an example.
        if (toReplace) {
            this._collections.set(currentCollections.map(c => c === toReplace ? collection : c), undefined);
        }
        else {
            this._collections.set([...currentCollections, collection]
                .sort((a, b) => (a.presentation?.order || 0) - (b.presentation?.order || 0)), undefined);
        }
        return {
            dispose: () => {
                const currentCollections = this._collections.get();
                this._collections.set(currentCollections.filter(c => c !== collection), undefined);
            }
        };
    }
    getServerDefinition(collectionRef, definitionRef) {
        const collectionObs = this._collections.map(cols => cols.find(c => c.id === collectionRef.id));
        return collectionObs.map((collection, reader) => {
            const server = collection?.serverDefinitions.read(reader).find(s => s.id === definitionRef.id);
            return { collection, server };
        });
    }
    async discoverCollections() {
        const toDiscover = this._collections.get().filter(c => c.lazy && !c.lazy.isCached);
        this._ongoingLazyActivations.set(this._ongoingLazyActivations.get() + 1, undefined);
        await Promise.all(toDiscover.map(c => c.lazy?.load())).finally(() => {
            this._ongoingLazyActivations.set(this._ongoingLazyActivations.get() - 1, undefined);
        });
        const found = [];
        const current = this._collections.get();
        for (const collection of toDiscover) {
            const rec = current.find(c => c.id === collection.id);
            if (!rec) {
                // ignored
            }
            else if (rec.lazy) {
                rec.lazy.removed?.(); // did not get replaced by the non-lazy version
            }
            else {
                found.push(rec);
            }
        }
        return found;
    }
    _getInputStorage(scope) {
        return scope === 1 /* StorageScope.WORKSPACE */ ? this._workspaceStorage.value : this._profileStorage.value;
    }
    _getInputStorageInConfigTarget(configTarget) {
        return this._getInputStorage(configTarget === 5 /* ConfigurationTarget.WORKSPACE */ || configTarget === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */
            ? 1 /* StorageScope.WORKSPACE */
            : 0 /* StorageScope.PROFILE */);
    }
    async clearSavedInputs(scope, inputId) {
        const storage = this._getInputStorage(scope);
        if (inputId) {
            await storage.clear(inputId);
        }
        else {
            storage.clearAll();
        }
        this._onDidChangeInputs.fire();
    }
    async editSavedInput(inputId, folderData, configSection, target) {
        const storage = this._getInputStorageInConfigTarget(target);
        const expr = ConfigurationResolverExpression.parse(inputId);
        const stored = await storage.getMap();
        const previous = stored[inputId].value;
        await this._configurationResolverService.resolveWithInteraction(folderData, expr, configSection, previous ? { [inputId.slice(2, -1)]: previous } : {}, target);
        await this._updateStorageWithExpressionInputs(storage, expr);
    }
    async setSavedInput(inputId, target, value) {
        const storage = this._getInputStorageInConfigTarget(target);
        const expr = ConfigurationResolverExpression.parse(inputId);
        for (const unresolved of expr.unresolved()) {
            expr.resolve(unresolved, value);
            break;
        }
        await this._updateStorageWithExpressionInputs(storage, expr);
    }
    getSavedInputs(scope) {
        return this._getInputStorage(scope).getMap();
    }
    async _checkTrust(collection, definition, { trustNonceBearer, interaction, promptType = 'only-new', autoTrustChanges = false, errorOnUserInteraction = false, }) {
        if (collection.trustBehavior === 0 /* McpServerTrust.Kind.Trusted */) {
            this._logService.trace(`MCP server ${definition.id} is trusted, no trust prompt needed`);
            return true;
        }
        else if (collection.trustBehavior === 1 /* McpServerTrust.Kind.TrustedOnNonce */) {
            if (definition.cacheNonce === trustNonceBearer.trustedAtNonce) {
                this._logService.trace(`MCP server ${definition.id} is unchanged, no trust prompt needed`);
                return true;
            }
            if (autoTrustChanges) {
                this._logService.trace(`MCP server ${definition.id} is was changed but user explicitly executed`);
                trustNonceBearer.trustedAtNonce = definition.cacheNonce;
                return true;
            }
            if (trustNonceBearer.trustedAtNonce === notTrustedNonce) {
                if (promptType === 'all-untrusted') {
                    if (errorOnUserInteraction) {
                        throw new UserInteractionRequiredError('serverTrust');
                    }
                    return this._promptForTrust(definition, collection, interaction, trustNonceBearer);
                }
                else {
                    this._logService.trace(`MCP server ${definition.id} is untrusted, denying trust prompt`);
                    return false;
                }
            }
            if (promptType === 'never') {
                this._logService.trace(`MCP server ${definition.id} trust state is unknown, skipping prompt`);
                return false;
            }
            if (errorOnUserInteraction) {
                throw new UserInteractionRequiredError('serverTrust');
            }
            const didTrust = await this._promptForTrust(definition, collection, interaction, trustNonceBearer);
            if (didTrust) {
                return true;
            }
            if (didTrust === undefined) {
                return undefined;
            }
            trustNonceBearer.trustedAtNonce = notTrustedNonce;
            return false;
        }
        else {
            assertNever(collection.trustBehavior);
        }
    }
    async _promptForTrust(definition, collection, interaction, trustNonceBearer) {
        interaction ??= new McpStartServerInteraction();
        interaction.participants.set(definition.id, { s: 'waiting', definition, collection });
        const trustedDefinitionIds = await new Promise(resolve => {
            autorunSelfDisposable(reader => {
                const map = interaction.participants.observable.read(reader);
                if (Iterable.some(map.values(), p => p.s === 'unknown')) {
                    return; // wait to gather all calls
                }
                reader.dispose();
                interaction.choice ??= this._promptForTrustOpenDialog([...map.values()].map((v) => v.s === 'waiting' ? v : undefined).filter(isDefined));
                resolve(interaction.choice);
            });
        });
        this._logService.trace(`MCP trusted servers:`, trustedDefinitionIds);
        if (trustedDefinitionIds) {
            trustNonceBearer.trustedAtNonce = trustedDefinitionIds.includes(definition.id)
                ? definition.cacheNonce
                : notTrustedNonce;
        }
        return !!trustedDefinitionIds?.includes(definition.id);
    }
    /**
     * Confirms with the user which of the provided definitions should be trusted.
     * Returns undefined if the user cancelled the flow, or the list of trusted
     * definition IDs otherwise.
     */
    async _promptForTrustOpenDialog(definitions) {
        function labelFor(r) {
            const originURI = r.definition.presentation?.origin?.uri || r.collection.presentation?.origin;
            let labelWithOrigin = originURI ? `[\`${r.definition.label}\`](${originURI})` : '`' + r.definition.label + '`';
            if (r.collection.source instanceof ExtensionIdentifier) {
                labelWithOrigin += ` (${localize('trustFromExt', 'from {0}', r.collection.source.value)})`;
            }
            return labelWithOrigin;
        }
        if (definitions.length === 1) {
            const def = definitions[0];
            const originURI = def.definition.presentation?.origin?.uri;
            const { result } = await this._dialogService.prompt({
                message: localize('trustTitleWithOrigin', 'Trust and run MCP server {0}?', def.definition.label),
                custom: {
                    icon: Codicon.shield,
                    markdownDetails: [{
                            markdown: new MarkdownString(localize('mcp.trust.details', 'The MCP server {0} was updated. MCP servers may add context to your chat session and lead to unexpected behavior. Do you want to trust and run this server?', labelFor(def))),
                            actionHandler: () => {
                                const editor = this._editorService.openEditor({ resource: originURI }, AUX_WINDOW_GROUP);
                                return editor.then(Boolean);
                            },
                        }]
                },
                buttons: [
                    { label: localize('mcp.trust.yes', 'Trust'), run: () => true },
                    { label: localize('mcp.trust.no', 'Do not trust'), run: () => false }
                ],
            });
            return result === undefined ? undefined : (result ? [def.definition.id] : []);
        }
        const list = definitions.map(d => `- ${labelFor(d)}`).join('\n');
        const { result } = await this._dialogService.prompt({
            message: localize('trustTitleWithOriginMulti', 'Trust and run {0} MCP servers?', definitions.length),
            custom: {
                icon: Codicon.shield,
                markdownDetails: [{
                        markdown: new MarkdownString(localize('mcp.trust.detailsMulti', 'Several updated MCP servers were discovered:\n\n{0}\n\n MCP servers may add context to your chat session and lead to unexpected behavior. Do you want to trust and run these server?', list)),
                        actionHandler: (uri) => {
                            const editor = this._editorService.openEditor({ resource: URI.parse(uri) }, AUX_WINDOW_GROUP);
                            return editor.then(Boolean);
                        },
                    }]
            },
            buttons: [
                { label: localize('mcp.trust.yes', 'Trust'), run: () => 'all' },
                { label: localize('mcp.trust.pick', 'Pick Trusted'), run: () => 'pick' },
                { label: localize('mcp.trust.no', 'Do not trust'), run: () => 'none' },
            ],
        });
        if (result === undefined) {
            return undefined;
        }
        else if (result === 'all') {
            return definitions.map(d => d.definition.id);
        }
        else if (result === 'none') {
            return [];
        }
        function isActionableButton(obj) {
            return typeof obj.action === 'function';
        }
        const store = new DisposableStore();
        const picker = store.add(this._quickInputService.createQuickPick({ useSeparators: false }));
        picker.canSelectMany = true;
        picker.items = definitions.map(({ definition, collection }) => {
            const buttons = [];
            if (definition.presentation?.origin) {
                const origin = definition.presentation.origin;
                buttons.push({
                    iconClass: 'codicon-go-to-file',
                    tooltip: 'Go to Definition',
                    action: () => this._editorService.openEditor({ resource: origin.uri, options: { selection: origin.range } })
                });
            }
            return {
                type: 'item',
                label: definition.label,
                definitonId: definition.id,
                description: collection.source instanceof ExtensionIdentifier
                    ? collection.source.value
                    : (definition.presentation?.origin ? this._labelService.getUriLabel(definition.presentation.origin.uri) : undefined),
                picked: false,
                buttons
            };
        });
        picker.placeholder = 'Select MCP servers to trust';
        picker.ignoreFocusOut = true;
        store.add(picker.onDidTriggerItemButton(e => {
            if (isActionableButton(e.button)) {
                e.button.action();
            }
        }));
        return new Promise(resolve => {
            picker.onDidAccept(() => {
                resolve(picker.selectedItems.map(item => item.definitonId));
                picker.hide();
            });
            picker.onDidHide(() => {
                resolve(undefined);
            });
            picker.show();
        }).finally(() => store.dispose());
    }
    async _updateStorageWithExpressionInputs(inputStorage, expr) {
        const secrets = {};
        const inputs = {};
        for (const [replacement, resolved] of expr.resolved()) {
            if (resolved.input?.type === 'promptString' && resolved.input.password) {
                secrets[replacement.id] = resolved;
            }
            else {
                inputs[replacement.id] = resolved;
            }
        }
        inputStorage.setPlainText(inputs);
        await inputStorage.setSecrets(secrets);
        this._onDidChangeInputs.fire();
    }
    async _replaceVariablesInLaunch(delegate, definition, launch, errorOnUserInteraction) {
        if (!definition.variableReplacement) {
            return launch;
        }
        const { section, target, folder } = definition.variableReplacement;
        const inputStorage = this._getInputStorageInConfigTarget(target);
        const [previouslyStored, withRemoteFilled] = await Promise.all([
            inputStorage.getMap(),
            delegate.substituteVariables(definition, launch),
        ]);
        // pre-fill the variables we already resolved to avoid extra prompting
        const expr = ConfigurationResolverExpression.parse(withRemoteFilled);
        for (const replacement of expr.unresolved()) {
            if (previouslyStored.hasOwnProperty(replacement.id)) {
                expr.resolve(replacement, previouslyStored[replacement.id]);
            }
        }
        // Check if there are still unresolved variables that would require interaction
        if (errorOnUserInteraction) {
            const unresolved = Array.from(expr.unresolved());
            if (unresolved.length > 0) {
                throw new UserInteractionRequiredError('variables');
            }
        }
        // resolve variables requiring user input
        await this._configurationResolverService.resolveWithInteraction(folder, expr, section, undefined, target);
        await this._updateStorageWithExpressionInputs(inputStorage, expr);
        // resolve other non-interactive variables, returning the final object
        return await this._configurationResolverService.resolveAsync(folder, expr);
    }
    async resolveConnection(opts) {
        const { collectionRef, definitionRef, interaction, logger, debug } = opts;
        let collection = this._collections.get().find(c => c.id === collectionRef.id);
        if (collection?.lazy) {
            await collection.lazy.load();
            collection = this._collections.get().find(c => c.id === collectionRef.id);
        }
        const definition = collection?.serverDefinitions.get().find(s => s.id === definitionRef.id);
        if (!collection || !definition) {
            throw new Error(`Collection or definition not found for ${collectionRef.id} and ${definitionRef.id}`);
        }
        const delegate = this._delegates.get().find(d => d.canStart(collection, definition));
        if (!delegate) {
            throw new Error('No delegate found that can handle the connection');
        }
        const trusted = await this._checkTrust(collection, definition, opts);
        interaction?.participants.set(definition.id, { s: 'resolved' });
        if (!trusted) {
            return undefined;
        }
        let launch = definition.launch;
        if (collection.resolveServerLanch) {
            launch = await collection.resolveServerLanch(definition);
            if (!launch) {
                return undefined; // interaction cancelled by user
            }
        }
        try {
            launch = await this._replaceVariablesInLaunch(delegate, definition, launch, opts.errorOnUserInteraction);
            if (definition.devMode && debug) {
                launch = await this._instantiationService.invokeFunction(accessor => accessor.get(IMcpDevModeDebugging).transform(definition, launch));
            }
        }
        catch (e) {
            if (e instanceof UserInteractionRequiredError) {
                throw e;
            }
            this._notificationService.notify({
                severity: Severity.Error,
                message: localize('mcp.launchError', 'Error starting {0}: {1}', definition.label, String(e)),
                actions: {
                    primary: collection.presentation?.origin && [
                        {
                            id: 'mcp.launchError.openConfig',
                            class: undefined,
                            enabled: true,
                            tooltip: '',
                            label: localize('mcp.launchError.openConfig', 'Open Configuration'),
                            run: () => this._editorService.openEditor({
                                resource: collection.presentation.origin,
                                options: { selection: definition.presentation?.origin?.range }
                            }),
                        }
                    ]
                }
            });
            return;
        }
        return this._instantiationService.createInstance(McpServerConnection, collection, definition, delegate, launch, logger, opts.errorOnUserInteraction);
    }
};
McpRegistry = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationResolverService),
    __param(2, IDialogService),
    __param(3, INotificationService),
    __param(4, IEditorService),
    __param(5, IConfigurationService),
    __param(6, IQuickInputService),
    __param(7, ILabelService),
    __param(8, ILogService)
], McpRegistry);
export { McpRegistry };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcFJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBZSxlQUFlLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNySCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQXVCLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDeEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxN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