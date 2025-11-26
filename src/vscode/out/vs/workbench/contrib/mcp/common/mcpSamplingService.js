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
import { mapFindFirst } from '../../../../base/common/arraysFind.js';
import { Sequencer } from '../../../../base/common/async.js';
import { decodeBase64 } from '../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { getConfigValueInTarget, IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { ILanguageModelsService } from '../../chat/common/languageModels.js';
import { mcpServerSamplingSection } from './mcpConfiguration.js';
import { McpSamplingLog } from './mcpSamplingLog.js';
import { McpError } from './mcpTypes.js';
var ModelMatch;
(function (ModelMatch) {
    ModelMatch[ModelMatch["UnsureAllowedDuringChat"] = 0] = "UnsureAllowedDuringChat";
    ModelMatch[ModelMatch["UnsureAllowedOutsideChat"] = 1] = "UnsureAllowedOutsideChat";
    ModelMatch[ModelMatch["NotAllowed"] = 2] = "NotAllowed";
    ModelMatch[ModelMatch["NoMatchingModel"] = 3] = "NoMatchingModel";
})(ModelMatch || (ModelMatch = {}));
let McpSamplingService = class McpSamplingService extends Disposable {
    constructor(_languageModelsService, _configurationService, _dialogService, _notificationService, _commandService, instaService) {
        super();
        this._languageModelsService = _languageModelsService;
        this._configurationService = _configurationService;
        this._dialogService = _dialogService;
        this._notificationService = _notificationService;
        this._commandService = _commandService;
        this._sessionSets = {
            allowedDuringChat: new Map(),
            allowedOutsideChat: new Map(),
        };
        this._modelSequencer = new Sequencer();
        this._logs = this._register(instaService.createInstance(McpSamplingLog));
    }
    async sample(opts, token = CancellationToken.None) {
        const messages = opts.params.messages.map((message) => {
            const content = message.content.type === 'text'
                ? { type: 'text', value: message.content.text }
                : message.content.type === 'image' || message.content.type === 'audio'
                    ? { type: 'image_url', value: { mimeType: message.content.mimeType, data: decodeBase64(message.content.data) } }
                    : undefined;
            if (!content) {
                return undefined;
            }
            return {
                role: message.role === 'assistant' ? 2 /* ChatMessageRole.Assistant */ : 1 /* ChatMessageRole.User */,
                content: [content]
            };
        }).filter(isDefined);
        if (opts.params.systemPrompt) {
            messages.unshift({ role: 0 /* ChatMessageRole.System */, content: [{ type: 'text', value: opts.params.systemPrompt }] });
        }
        const model = await this._modelSequencer.queue(() => this._getMatchingModel(opts));
        // todo@connor4312: nullExtensionDescription.identifier -> undefined with API update
        const response = await this._languageModelsService.sendChatRequest(model, new ExtensionIdentifier('core'), messages, {}, token);
        let responseText = '';
        // MCP doesn't have a notion of a multi-part sampling response, so we only preserve text
        // Ref https://github.com/modelcontextprotocol/modelcontextprotocol/issues/91
        const streaming = (async () => {
            for await (const part of response.stream) {
                if (Array.isArray(part)) {
                    for (const p of part) {
                        if (p.type === 'text') {
                            responseText += p.value;
                        }
                    }
                }
                else if (part.type === 'text') {
                    responseText += part.value;
                }
            }
        })();
        try {
            await Promise.all([response.result, streaming]);
            this._logs.add(opts.server, opts.params.messages, responseText, model);
            return {
                sample: {
                    model,
                    content: { type: 'text', text: responseText },
                    role: 'assistant', // it came from the model!
                },
            };
        }
        catch (err) {
            throw McpError.unknown(err);
        }
    }
    hasLogs(server) {
        return this._logs.has(server);
    }
    getLogText(server) {
        return this._logs.getAsText(server);
    }
    async _getMatchingModel(opts) {
        const model = await this._getMatchingModelInner(opts.server, opts.isDuringToolCall, opts.params.modelPreferences);
        if (model === 0 /* ModelMatch.UnsureAllowedDuringChat */) {
            const retry = await this._showContextual(opts.isDuringToolCall, localize('mcp.sampling.allowDuringChat.title', 'Allow MCP tools from "{0}" to make LLM requests?', opts.server.definition.label), localize('mcp.sampling.allowDuringChat.desc', 'The MCP server "{0}" has issued a request to make a language model call. Do you want to allow it to make requests during chat?', opts.server.definition.label), this.allowButtons(opts.server, 'allowedDuringChat'));
            if (retry) {
                return this._getMatchingModel(opts);
            }
            throw McpError.notAllowed();
        }
        else if (model === 1 /* ModelMatch.UnsureAllowedOutsideChat */) {
            const retry = await this._showContextual(opts.isDuringToolCall, localize('mcp.sampling.allowOutsideChat.title', 'Allow MCP server "{0}" to make LLM requests?', opts.server.definition.label), localize('mcp.sampling.allowOutsideChat.desc', 'The MCP server "{0}" has issued a request to make a language model call. Do you want to allow it to make requests, outside of tool calls during chat?', opts.server.definition.label), this.allowButtons(opts.server, 'allowedOutsideChat'));
            if (retry) {
                return this._getMatchingModel(opts);
            }
            throw McpError.notAllowed();
        }
        else if (model === 2 /* ModelMatch.NotAllowed */) {
            throw McpError.notAllowed();
        }
        else if (model === 3 /* ModelMatch.NoMatchingModel */) {
            const newlyPickedModels = opts.isDuringToolCall
                ? await this._commandService.executeCommand("workbench.mcp.configureSamplingModels" /* McpCommandIds.ConfigureSamplingModels */, opts.server)
                : await this._notify(localize('mcp.sampling.needsModels', 'MCP server "{0}" triggered a language model request, but it has no allowlisted models.', opts.server.definition.label), {
                    [localize('configure', 'Configure')]: () => this._commandService.executeCommand("workbench.mcp.configureSamplingModels" /* McpCommandIds.ConfigureSamplingModels */, opts.server),
                    [localize('cancel', 'Cancel')]: () => Promise.resolve(undefined),
                });
            if (newlyPickedModels) {
                return this._getMatchingModel(opts);
            }
            throw McpError.notAllowed();
        }
        return model;
    }
    allowButtons(server, key) {
        return {
            [localize('mcp.sampling.allow.inSession', 'Allow in this Session')]: async () => {
                this._sessionSets[key].set(server.definition.id, true);
                return true;
            },
            [localize('mcp.sampling.allow.always', 'Always')]: async () => {
                await this.updateConfig(server, c => c[key] = true);
                return true;
            },
            [localize('mcp.sampling.allow.notNow', 'Not Now')]: async () => {
                this._sessionSets[key].set(server.definition.id, false);
                return false;
            },
            [localize('mcp.sampling.allow.never', 'Never')]: async () => {
                await this.updateConfig(server, c => c[key] = false);
                return false;
            },
        };
    }
    async _showContextual(isDuringToolCall, title, message, buttons) {
        if (isDuringToolCall) {
            const result = await this._dialogService.prompt({
                type: 'question',
                title: title,
                message,
                buttons: Object.entries(buttons).map(([label, run]) => ({ label, run })),
            });
            return await result.result;
        }
        else {
            return await this._notify(message, buttons);
        }
    }
    async _notify(message, buttons) {
        return await new Promise(resolve => {
            const handle = this._notificationService.prompt(Severity.Info, message, Object.entries(buttons).map(([label, action]) => ({
                label,
                run: () => resolve(action()),
            })));
            Event.once(handle.onDidClose)(() => resolve(undefined));
        });
    }
    /**
     * Gets the matching model for the MCP server in this context, or
     * a reason why no model could be selected.
     */
    async _getMatchingModelInner(server, isDuringToolCall, preferences) {
        const config = this.getConfig(server);
        // 1. Ensure the server is allowed to sample in this context
        if (isDuringToolCall && !config.allowedDuringChat && !this._sessionSets.allowedDuringChat.has(server.definition.id)) {
            return config.allowedDuringChat === undefined ? 0 /* ModelMatch.UnsureAllowedDuringChat */ : 2 /* ModelMatch.NotAllowed */;
        }
        else if (!isDuringToolCall && !config.allowedOutsideChat && !this._sessionSets.allowedOutsideChat.has(server.definition.id)) {
            return config.allowedOutsideChat === undefined ? 1 /* ModelMatch.UnsureAllowedOutsideChat */ : 2 /* ModelMatch.NotAllowed */;
        }
        // 2. Get the configured models, or the default model(s)
        const foundModelIdsDeep = config.allowedModels?.filter(m => !!this._languageModelsService.lookupLanguageModel(m)) || this._languageModelsService.getLanguageModelIds().filter(m => this._languageModelsService.lookupLanguageModel(m)?.isDefault);
        const foundModelIds = foundModelIdsDeep.flat().sort((a, b) => b.length - a.length); // Sort by length to prefer most specific
        if (!foundModelIds.length) {
            return 3 /* ModelMatch.NoMatchingModel */;
        }
        // 3. If preferences are provided, try to match them from the allowed models
        if (preferences?.hints) {
            const found = mapFindFirst(preferences.hints, hint => foundModelIds.find(model => model.toLowerCase().includes(hint.name.toLowerCase())));
            if (found) {
                return found;
            }
        }
        return foundModelIds[0]; // Return the first matching model
    }
    _configKey(server) {
        return `${server.collection.label}: ${server.definition.label}`;
    }
    getConfig(server) {
        return this._getConfig(server).value || {};
    }
    /**
     * _getConfig reads the sampling config reads the `{ server: data }` mapping
     * from the appropriate config. We read from the most specific possible
     * config up to the default configuration location that the MCP server itself
     * is defined in. We don't go further because then workspace-specific servers
     * would get in the user settings which is not meaningful and could lead
     * to confusion.
     *
     * todo@connor4312: generalize this for other esttings when we have them
     */
    _getConfig(server) {
        const def = server.readDefinitions().get();
        const mostSpecificConfig = 8 /* ConfigurationTarget.MEMORY */;
        const leastSpecificConfig = def.collection?.configTarget || 2 /* ConfigurationTarget.USER */;
        const key = this._configKey(server);
        const resource = def.collection?.presentation?.origin;
        const configValue = this._configurationService.inspect(mcpServerSamplingSection, { resource });
        for (let target = mostSpecificConfig; target >= leastSpecificConfig; target--) {
            const mapping = getConfigValueInTarget(configValue, target);
            const config = mapping?.[key];
            if (config) {
                return { value: config, key, mapping, target, resource };
            }
        }
        return { value: undefined, mapping: getConfigValueInTarget(configValue, leastSpecificConfig), key, target: leastSpecificConfig, resource };
    }
    async updateConfig(server, mutate) {
        const { value, mapping, key, target, resource } = this._getConfig(server);
        const newConfig = { ...value };
        mutate(newConfig);
        await this._configurationService.updateValue(mcpServerSamplingSection, { ...mapping, [key]: newConfig }, { resource }, target);
        return newConfig;
    }
};
McpSamplingService = __decorate([
    __param(0, ILanguageModelsService),
    __param(1, IConfigurationService),
    __param(2, IDialogService),
    __param(3, INotificationService),
    __param(4, ICommandService),
    __param(5, IInstantiationService)
], McpSamplingService);
export { McpSamplingService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2FtcGxpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BTYW1wbGluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDakUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQXVCLHNCQUFzQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEosT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRyxPQUFPLEVBQXNFLHNC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