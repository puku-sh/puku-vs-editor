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
var ExtHostChatSessions_1;
import { coalesce } from '../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { CancellationError } from '../../../base/common/errors.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { revive } from '../../../base/common/marshalling.js';
import { URI } from '../../../base/common/uri.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
import { MainContext } from './extHost.protocol.js';
import { ChatAgentResponseStream } from './extHostChatAgents2.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import * as typeConvert from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
class ExtHostChatSession {
    constructor(session, extension, request, proxy, commandsConverter, sessionDisposables) {
        this.session = session;
        this.extension = extension;
        this.proxy = proxy;
        this.commandsConverter = commandsConverter;
        this.sessionDisposables = sessionDisposables;
        this._stream = new ChatAgentResponseStream(extension, request, proxy, commandsConverter, sessionDisposables);
    }
    get activeResponseStream() {
        return this._stream;
    }
    getActiveRequestStream(request) {
        return new ChatAgentResponseStream(this.extension, request, this.proxy, this.commandsConverter, this.sessionDisposables);
    }
}
let ExtHostChatSessions = class ExtHostChatSessions extends Disposable {
    static { ExtHostChatSessions_1 = this; }
    static { this._sessionHandlePool = 0; }
    constructor(commands, _languageModels, _extHostRpc, _logService) {
        super();
        this.commands = commands;
        this._languageModels = _languageModels;
        this._extHostRpc = _extHostRpc;
        this._logService = _logService;
        this._chatSessionItemProviders = new Map();
        this._chatSessionContentProviders = new Map();
        this._nextChatSessionItemProviderHandle = 0;
        this._nextChatSessionContentProviderHandle = 0;
        /**
         * Map of uri -> chat session items
         *
         * TODO: this isn't cleared/updated properly
         */
        this._sessionItems = new ResourceMap();
        /**
         * Map of uri -> chat sessions infos
         */
        this._extHostChatSessions = new ResourceMap();
        this._proxy = this._extHostRpc.getProxy(MainContext.MainThreadChatSessions);
        commands.registerArgumentProcessor({
            processArgument: (arg) => {
                if (arg && arg.$mid === 25 /* MarshalledId.ChatSessionContext */) {
                    const id = arg.session.resource || arg.sessionId;
                    const sessionContent = this._sessionItems.get(id);
                    if (sessionContent) {
                        return sessionContent;
                    }
                    else {
                        this._logService.warn(`No chat session found for ID: ${id}`);
                        return arg;
                    }
                }
                return arg;
            }
        });
    }
    registerChatSessionItemProvider(extension, chatSessionType, provider) {
        const handle = this._nextChatSessionItemProviderHandle++;
        const disposables = new DisposableStore();
        this._chatSessionItemProviders.set(handle, { provider, extension, disposable: disposables, sessionType: chatSessionType });
        this._proxy.$registerChatSessionItemProvider(handle, chatSessionType);
        if (provider.onDidChangeChatSessionItems) {
            disposables.add(provider.onDidChangeChatSessionItems(() => {
                this._proxy.$onDidChangeChatSessionItems(handle);
            }));
        }
        if (provider.onDidCommitChatSessionItem) {
            disposables.add(provider.onDidCommitChatSessionItem((e) => {
                const { original, modified } = e;
                this._proxy.$onDidCommitChatSessionItem(handle, original.resource, modified.resource);
            }));
        }
        return {
            dispose: () => {
                this._chatSessionItemProviders.delete(handle);
                disposables.dispose();
                this._proxy.$unregisterChatSessionItemProvider(handle);
            }
        };
    }
    registerChatSessionContentProvider(extension, chatSessionScheme, chatParticipant, provider, capabilities) {
        const handle = this._nextChatSessionContentProviderHandle++;
        const disposables = new DisposableStore();
        this._chatSessionContentProviders.set(handle, { provider, extension, capabilities, disposable: disposables });
        this._proxy.$registerChatSessionContentProvider(handle, chatSessionScheme);
        return new extHostTypes.Disposable(() => {
            this._chatSessionContentProviders.delete(handle);
            disposables.dispose();
            this._proxy.$unregisterChatSessionContentProvider(handle);
        });
    }
    convertChatSessionStatus(status) {
        if (status === undefined) {
            return undefined;
        }
        switch (status) {
            case 0: // vscode.ChatSessionStatus.Failed
                return 0 /* ChatSessionStatus.Failed */;
            case 1: // vscode.ChatSessionStatus.Completed
                return 1 /* ChatSessionStatus.Completed */;
            case 2: // vscode.ChatSessionStatus.InProgress
                return 2 /* ChatSessionStatus.InProgress */;
            default:
                return undefined;
        }
    }
    convertChatSessionItem(sessionType, sessionContent) {
        return {
            resource: sessionContent.resource,
            label: sessionContent.label,
            description: sessionContent.description ? typeConvert.MarkdownString.from(sessionContent.description) : undefined,
            status: this.convertChatSessionStatus(sessionContent.status),
            tooltip: typeConvert.MarkdownString.fromStrict(sessionContent.tooltip),
            timing: {
                startTime: sessionContent.timing?.startTime ?? 0,
                endTime: sessionContent.timing?.endTime
            },
            statistics: sessionContent.statistics ? {
                files: sessionContent.statistics?.files ?? 0,
                insertions: sessionContent.statistics?.insertions ?? 0,
                deletions: sessionContent.statistics?.deletions ?? 0
            } : undefined
        };
    }
    async $provideNewChatSessionItem(handle, options, token) {
        const entry = this._chatSessionItemProviders.get(handle);
        if (!entry || !entry.provider.provideNewChatSessionItem) {
            throw new Error(`No provider registered for handle ${handle} or provider does not support creating sessions`);
        }
        try {
            const model = await this.getModelForRequest(options.request, entry.extension);
            const vscodeRequest = typeConvert.ChatAgentRequest.to(revive(options.request), undefined, model, [], new Map(), entry.extension, this._logService);
            const vscodeOptions = {
                request: vscodeRequest,
                metadata: options.metadata
            };
            const chatSessionItem = await entry.provider.provideNewChatSessionItem(vscodeOptions, token);
            if (!chatSessionItem) {
                throw new Error('Provider did not create session');
            }
            this._sessionItems.set(chatSessionItem.resource, chatSessionItem);
            return this.convertChatSessionItem(entry.sessionType, chatSessionItem);
        }
        catch (error) {
            this._logService.error(`Error creating chat session: ${error}`);
            throw error;
        }
    }
    async $provideChatSessionItems(handle, token) {
        const entry = this._chatSessionItemProviders.get(handle);
        if (!entry) {
            this._logService.error(`No provider registered for handle ${handle}`);
            return [];
        }
        const sessions = await entry.provider.provideChatSessionItems(token);
        if (!sessions) {
            return [];
        }
        const response = [];
        for (const sessionContent of sessions) {
            this._sessionItems.set(sessionContent.resource, sessionContent);
            response.push(this.convertChatSessionItem(entry.sessionType, sessionContent));
        }
        return response;
    }
    async $provideChatSessionContent(handle, sessionResourceComponents, token) {
        const provider = this._chatSessionContentProviders.get(handle);
        if (!provider) {
            throw new Error(`No provider for handle ${handle}`);
        }
        const sessionResource = URI.revive(sessionResourceComponents);
        const session = await provider.provider.provideChatSessionContent(sessionResource, token);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        const sessionDisposables = new DisposableStore();
        const sessionId = ExtHostChatSessions_1._sessionHandlePool++;
        const id = sessionResource.toString();
        const chatSession = new ExtHostChatSession(session, provider.extension, {
            sessionId: `${id}.${sessionId}`,
            sessionResource,
            requestId: 'ongoing',
            agentId: id,
            message: '',
            variables: { variables: [] },
            location: ChatAgentLocation.Chat,
        }, {
            $handleProgressChunk: (requestId, chunks) => {
                return this._proxy.$handleProgressChunk(handle, sessionResource, requestId, chunks);
            },
            $handleAnchorResolve: (requestId, requestHandle, anchor) => {
                this._proxy.$handleAnchorResolve(handle, sessionResource, requestId, requestHandle, anchor);
            },
        }, this.commands.converter, sessionDisposables);
        const disposeCts = sessionDisposables.add(new CancellationTokenSource());
        this._extHostChatSessions.set(sessionResource, { sessionObj: chatSession, disposeCts });
        // Call activeResponseCallback immediately for best user experience
        if (session.activeResponseCallback) {
            Promise.resolve(session.activeResponseCallback(chatSession.activeResponseStream.apiObject, disposeCts.token)).finally(() => {
                // complete
                this._proxy.$handleProgressComplete(handle, sessionResource, 'ongoing');
            });
        }
        const { capabilities } = provider;
        return {
            id: sessionId + '',
            resource: URI.revive(sessionResource),
            hasActiveResponseCallback: !!session.activeResponseCallback,
            hasRequestHandler: !!session.requestHandler,
            supportsInterruption: !!capabilities?.supportsInterruptions,
            options: session.options,
            history: session.history.map(turn => {
                if (turn instanceof extHostTypes.ChatRequestTurn) {
                    return this.convertRequestTurn(turn);
                }
                else {
                    return this.convertResponseTurn(turn, sessionDisposables);
                }
            })
        };
    }
    async $provideHandleOptionsChange(handle, sessionResourceComponents, updates, token) {
        const sessionResource = URI.revive(sessionResourceComponents);
        const provider = this._chatSessionContentProviders.get(handle);
        if (!provider) {
            this._logService.warn(`No provider for handle ${handle}`);
            return;
        }
        if (!provider.provider.provideHandleOptionsChange) {
            this._logService.debug(`Provider for handle ${handle} does not implement provideHandleOptionsChange`);
            return;
        }
        try {
            await provider.provider.provideHandleOptionsChange(sessionResource, updates, token);
        }
        catch (error) {
            this._logService.error(`Error calling provideHandleOptionsChange for handle ${handle}, sessionResource ${sessionResource}:`, error);
        }
    }
    async $provideChatSessionProviderOptions(handle, token) {
        const entry = this._chatSessionContentProviders.get(handle);
        if (!entry) {
            this._logService.warn(`No provider for handle ${handle} when requesting chat session options`);
            return;
        }
        const provider = entry.provider;
        if (!provider.provideChatSessionProviderOptions) {
            return;
        }
        try {
            const { optionGroups } = await provider.provideChatSessionProviderOptions(token);
            if (!optionGroups) {
                return;
            }
            return {
                optionGroups,
            };
        }
        catch (error) {
            this._logService.error(`Error calling provideChatSessionProviderOptions for handle ${handle}:`, error);
            return;
        }
    }
    async $interruptChatSessionActiveResponse(providerHandle, sessionResource, requestId) {
        const entry = this._extHostChatSessions.get(URI.revive(sessionResource));
        entry?.disposeCts.cancel();
    }
    async $disposeChatSessionContent(providerHandle, sessionResource) {
        const entry = this._extHostChatSessions.get(URI.revive(sessionResource));
        if (!entry) {
            this._logService.warn(`No chat session found for resource: ${sessionResource}`);
            return;
        }
        entry.disposeCts.cancel();
        entry.sessionObj.sessionDisposables.dispose();
        this._extHostChatSessions.delete(URI.revive(sessionResource));
    }
    async $invokeChatSessionRequestHandler(handle, sessionResource, request, history, token) {
        const entry = this._extHostChatSessions.get(URI.revive(sessionResource));
        if (!entry || !entry.sessionObj.session.requestHandler) {
            return {};
        }
        const chatRequest = typeConvert.ChatAgentRequest.to(request, undefined, await this.getModelForRequest(request, entry.sessionObj.extension), [], new Map(), entry.sessionObj.extension, this._logService);
        const stream = entry.sessionObj.getActiveRequestStream(request);
        await entry.sessionObj.session.requestHandler(chatRequest, { history: history }, stream.apiObject, token);
        // TODO: do we need to dispose the stream object?
        return {};
    }
    async getModelForRequest(request, extension) {
        let model;
        if (request.userSelectedModelId) {
            model = await this._languageModels.getLanguageModelByIdentifier(extension, request.userSelectedModelId);
        }
        if (!model) {
            model = await this._languageModels.getDefaultLanguageModel(extension);
            if (!model) {
                throw new Error('Language model unavailable');
            }
        }
        return model;
    }
    convertRequestTurn(turn) {
        const variables = turn.references.map(ref => this.convertReferenceToVariable(ref));
        return {
            type: 'request',
            prompt: turn.prompt,
            participant: turn.participant,
            command: turn.command,
            variableData: variables.length > 0 ? { variables } : undefined
        };
    }
    convertReferenceToVariable(ref) {
        const value = ref.value && typeof ref.value === 'object' && 'uri' in ref.value && 'range' in ref.value
            ? typeConvert.Location.from(ref.value)
            : ref.value;
        const range = ref.range ? { start: ref.range[0], endExclusive: ref.range[1] } : undefined;
        const isFile = URI.isUri(value) || (value && typeof value === 'object' && 'uri' in value);
        return {
            id: ref.id,
            name: ref.id,
            value,
            modelDescription: ref.modelDescription,
            range,
            kind: isFile ? 'file' : 'generic'
        };
    }
    convertResponseTurn(turn, sessionDisposables) {
        const parts = coalesce(turn.response.map(r => typeConvert.ChatResponsePart.from(r, this.commands.converter, sessionDisposables)));
        return {
            type: 'response',
            parts,
            participant: turn.participant
        };
    }
};
ExtHostChatSessions = ExtHostChatSessions_1 = __decorate([
    __param(2, IExtHostRpcService),
    __param(3, ILogService)
], ExtHostChatSessions);
export { ExtHostChatSessions };
//# sourceMappingURL=extHostChatSessions.js.map