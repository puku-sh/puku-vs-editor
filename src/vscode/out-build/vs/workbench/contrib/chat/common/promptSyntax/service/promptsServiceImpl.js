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
import { CancellationError } from '../../../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../../../../base/common/map.js';
import { dirname, isEqual } from '../../../../../../base/common/resources.js';
import { URI } from '../../../../../../base/common/uri.js';
import { OffsetRange } from '../../../../../../editor/common/core/ranges/offsetRange.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IFilesConfigurationService } from '../../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { IUserDataProfileService } from '../../../../../services/userDataProfile/common/userDataProfile.js';
import { PromptsConfig } from '../config/config.js';
import { getCleanPromptName } from '../config/promptFileLocations.js';
import { PROMPT_LANGUAGE_ID, PromptsType, getPromptsTypeForLanguageId } from '../promptTypes.js';
import { PromptFilesLocator } from '../utils/promptFilesLocator.js';
import { PromptFileParser, PromptHeaderAttributes } from '../promptFileParser.js';
import { PromptsStorage } from './promptsService.js';
import { Delayer } from '../../../../../../base/common/async.js';
import { Schemas } from '../../../../../../base/common/network.js';
/**
 * Provides prompt services.
 */
let PromptsService = class PromptsService extends Disposable {
    constructor(logger, labelService, modelService, instantiationService, userDataService, configurationService, fileService, filesConfigService, storageService) {
        super();
        this.logger = logger;
        this.labelService = labelService;
        this.modelService = modelService;
        this.instantiationService = instantiationService;
        this.userDataService = userDataService;
        this.configurationService = configurationService;
        this.fileService = fileService;
        this.filesConfigService = filesConfigService;
        this.storageService = storageService;
        /**
         * Cache for parsed prompt files keyed by URI.
         * The number in the returned tuple is textModel.getVersionId(), which is an internal VS Code counter that increments every time the text model's content changes.
         */
        this.cachedParsedPromptFromModels = new ResourceMap();
        /**
         * Cached file locations commands. Caching only happens if the corresponding `fileLocatorEvents` event is used.
         */
        this.cachedFileLocations = {};
        /**
         * Lazily created events that notify listeners when the file locations for a given prompt type change.
         * An event is created on demand for each prompt type and can be used by consumers to react to updates
         * in the set of prompt files (e.g., when prompt files are added, removed, or modified).
         */
        this.fileLocatorEvents = {};
        /**
         * Contributed files from extensions keyed by prompt type then name.
         */
        this.contributedFiles = {
            [PromptsType.prompt]: new ResourceMap(),
            [PromptsType.instructions]: new ResourceMap(),
            [PromptsType.agent]: new ResourceMap(),
        };
        // --- Enabled Prompt Files -----------------------------------------------------------
        this.disabledPromptsStorageKeyPrefix = 'chat.disabledPromptFiles.';
        this.fileLocator = this.instantiationService.createInstance(PromptFilesLocator);
        this._register(this.modelService.onModelRemoved((model) => {
            this.cachedParsedPromptFromModels.delete(model.uri);
        }));
        const modelChangeEvent = this._register(new ModelChangeTracker(this.modelService)).onDidPromptChange;
        this.cachedCustomAgents = this._register(new CachedPromise((token) => this.computeCustomAgents(token), () => Event.any(this.getFileLocatorEvent(PromptsType.agent), Event.filter(modelChangeEvent, e => e.promptType === PromptsType.agent))));
        this.cachedSlashCommands = this._register(new CachedPromise((token) => this.computePromptSlashCommands(token), () => Event.any(this.getFileLocatorEvent(PromptsType.prompt), Event.filter(modelChangeEvent, e => e.promptType === PromptsType.prompt))));
    }
    getFileLocatorEvent(type) {
        let event = this.fileLocatorEvents[type];
        if (!event) {
            event = this.fileLocatorEvents[type] = this._register(this.fileLocator.createFilesUpdatedEvent(type)).event;
            this._register(event(() => {
                this.cachedFileLocations[type] = undefined;
            }));
        }
        return event;
    }
    getParsedPromptFile(textModel) {
        const cached = this.cachedParsedPromptFromModels.get(textModel.uri);
        if (cached && cached[0] === textModel.getVersionId()) {
            return cached[1];
        }
        const ast = new PromptFileParser().parse(textModel.uri, textModel.getValue());
        if (!cached || cached[0] < textModel.getVersionId()) {
            this.cachedParsedPromptFromModels.set(textModel.uri, [textModel.getVersionId(), ast]);
        }
        return ast;
    }
    async listPromptFiles(type, token) {
        let listPromise = this.cachedFileLocations[type];
        if (!listPromise) {
            listPromise = this.computeListPromptFiles(type, token);
            if (!this.fileLocatorEvents[type]) {
                return listPromise;
            }
            this.cachedFileLocations[type] = listPromise;
            return listPromise;
        }
        return listPromise;
    }
    async computeListPromptFiles(type, token) {
        const prompts = await Promise.all([
            this.fileLocator.listFiles(type, PromptsStorage.user, token).then(uris => uris.map(uri => ({ uri, storage: PromptsStorage.user, type }))),
            this.fileLocator.listFiles(type, PromptsStorage.local, token).then(uris => uris.map(uri => ({ uri, storage: PromptsStorage.local, type }))),
            this.getExtensionContributions(type)
        ]);
        return [...prompts.flat()];
    }
    async listPromptFilesForStorage(type, storage, token) {
        switch (storage) {
            case PromptsStorage.extension:
                return this.getExtensionContributions(type);
            case PromptsStorage.local:
                return this.fileLocator.listFiles(type, PromptsStorage.local, token).then(uris => uris.map(uri => ({ uri, storage: PromptsStorage.local, type })));
            case PromptsStorage.user:
                return this.fileLocator.listFiles(type, PromptsStorage.user, token).then(uris => uris.map(uri => ({ uri, storage: PromptsStorage.user, type })));
            default:
                throw new Error(`[listPromptFilesForStorage] Unsupported prompt storage type: ${storage}`);
        }
    }
    async getExtensionContributions(type) {
        return Promise.all(this.contributedFiles[type].values());
    }
    getSourceFolders(type) {
        const result = [];
        if (type === PromptsType.agent) {
            const folders = this.fileLocator.getAgentSourceFolder();
            for (const uri of folders) {
                result.push({ uri, storage: PromptsStorage.local, type });
            }
        }
        else {
            for (const uri of this.fileLocator.getConfigBasedSourceFolders(type)) {
                result.push({ uri, storage: PromptsStorage.local, type });
            }
        }
        const userHome = this.userDataService.currentProfile.promptsHome;
        result.push({ uri: userHome, storage: PromptsStorage.user, type });
        return result;
    }
    // slash prompt commands
    /**
     * Emitter for slash commands change events.
     */
    get onDidChangeSlashCommands() {
        return this.cachedSlashCommands.onDidChange;
    }
    async getPromptSlashCommands(token) {
        return this.cachedSlashCommands.get(token);
    }
    async computePromptSlashCommands(token) {
        const promptFiles = await this.listPromptFiles(PromptsType.prompt, token);
        const details = await Promise.all(promptFiles.map(async (promptPath) => {
            try {
                const parsedPromptFile = await this.parseNew(promptPath.uri, token);
                return this.asChatPromptSlashCommand(parsedPromptFile, promptPath);
            }
            catch (e) {
                this.logger.error(`[computePromptSlashCommands] Failed to parse prompt file for slash command: ${promptPath.uri}`, e instanceof Error ? e.message : String(e));
                return undefined;
            }
        }));
        const result = [];
        const seen = new ResourceSet();
        for (const detail of details) {
            if (detail) {
                result.push(detail);
                seen.add(detail.promptPath.uri);
            }
        }
        for (const model of this.modelService.getModels()) {
            if (model.getLanguageId() === PROMPT_LANGUAGE_ID && model.uri.scheme === Schemas.untitled && !seen.has(model.uri)) {
                const parsedPromptFile = this.getParsedPromptFile(model);
                result.push(this.asChatPromptSlashCommand(parsedPromptFile, { uri: model.uri, storage: PromptsStorage.local, type: PromptsType.prompt }));
            }
        }
        return result;
    }
    isValidSlashCommandName(command) {
        return command.match(/^[\p{L}\d_\-\.]+$/u) !== null;
    }
    async resolvePromptSlashCommand(name, token) {
        const commands = await this.getPromptSlashCommands(token);
        return commands.find(cmd => cmd.name === name);
    }
    asChatPromptSlashCommand(parsedPromptFile, promptPath) {
        let name = parsedPromptFile?.header?.name ?? promptPath.name ?? getCleanPromptName(promptPath.uri);
        name = name.replace(/[^\p{L}\d_\-\.]+/gu, '-'); // replace spaces with dashes
        return {
            name: name,
            description: parsedPromptFile?.header?.description ?? promptPath.description,
            argumentHint: parsedPromptFile?.header?.argumentHint,
            parsedPromptFile,
            promptPath
        };
    }
    async getPromptSlashCommandName(uri, token) {
        const slashCommands = await this.getPromptSlashCommands(token);
        const slashCommand = slashCommands.find(c => isEqual(c.promptPath.uri, uri));
        if (!slashCommand) {
            return getCleanPromptName(uri);
        }
        return slashCommand.name;
    }
    // custom agents
    /**
     * Emitter for custom agents change events.
     */
    get onDidChangeCustomAgents() {
        return this.cachedCustomAgents.onDidChange;
    }
    async getCustomAgents(token) {
        return this.cachedCustomAgents.get(token);
    }
    async computeCustomAgents(token) {
        let agentFiles = await this.listPromptFiles(PromptsType.agent, token);
        const disabledAgents = this.getDisabledPromptFiles(PromptsType.agent);
        agentFiles = agentFiles.filter(promptPath => !disabledAgents.has(promptPath.uri));
        const customAgents = await Promise.all(agentFiles.map(async (promptPath) => {
            const uri = promptPath.uri;
            const ast = await this.parseNew(uri, token);
            let metadata;
            if (ast.header) {
                const advanced = ast.header.getAttribute(PromptHeaderAttributes.advancedOptions);
                if (advanced && advanced.value.type === 'object') {
                    metadata = {};
                    for (const [key, value] of Object.entries(advanced.value)) {
                        if (['string', 'number', 'boolean'].includes(value.type)) {
                            metadata[key] = value;
                        }
                    }
                }
            }
            const toolReferences = [];
            if (ast.body) {
                const bodyOffset = ast.body.offset;
                const bodyVarRefs = ast.body.variableReferences;
                for (let i = bodyVarRefs.length - 1; i >= 0; i--) { // in reverse order
                    const { name, offset } = bodyVarRefs[i];
                    const range = new OffsetRange(offset - bodyOffset, offset - bodyOffset + name.length + 1);
                    toolReferences.push({ name, range });
                }
            }
            const agentInstructions = {
                content: ast.body?.getContent() ?? '',
                toolReferences,
                metadata,
            };
            const name = ast.header?.name ?? promptPath.name ?? getCleanPromptName(uri);
            const source = IAgentSource.fromPromptPath(promptPath);
            if (!ast.header) {
                return { uri, name, agentInstructions, source };
            }
            const { description, model, tools, handOffs, argumentHint, target } = ast.header;
            return { uri, name, description, model, tools, handOffs, argumentHint, target, agentInstructions, source };
        }));
        return customAgents;
    }
    async parseNew(uri, token) {
        const model = this.modelService.getModel(uri);
        if (model) {
            return this.getParsedPromptFile(model);
        }
        const fileContent = await this.fileService.readFile(uri);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        return new PromptFileParser().parse(uri, fileContent.value.toString());
    }
    registerContributedFile(type, name, description, uri, extension) {
        const bucket = this.contributedFiles[type];
        if (bucket.has(uri)) {
            // keep first registration per extension (handler filters duplicates per extension already)
            return Disposable.None;
        }
        const entryPromise = (async () => {
            try {
                await this.filesConfigService.updateReadonly(uri, true);
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                this.logger.error(`[registerContributedFile] Failed to make prompt file readonly: ${uri}`, msg);
            }
            return { uri, name, description, storage: PromptsStorage.extension, type, extension };
        })();
        bucket.set(uri, entryPromise);
        const flushCachesIfRequired = () => {
            this.cachedFileLocations[type] = undefined;
            switch (type) {
                case PromptsType.agent:
                    this.cachedCustomAgents.refresh();
                    break;
                case PromptsType.prompt:
                    this.cachedSlashCommands.refresh();
                    break;
            }
        };
        flushCachesIfRequired();
        return {
            dispose: () => {
                bucket.delete(uri);
                flushCachesIfRequired();
            }
        };
    }
    getPromptLocationLabel(promptPath) {
        switch (promptPath.storage) {
            case PromptsStorage.local: return this.labelService.getUriLabel(dirname(promptPath.uri), { relative: true });
            case PromptsStorage.user: return localize(6560, null);
            case PromptsStorage.extension: {
                return localize(6561, null, promptPath.extension.displayName ?? promptPath.extension.id);
            }
            default: throw new Error('Unknown prompt storage type');
        }
    }
    findAgentMDsInWorkspace(token) {
        return this.fileLocator.findAgentMDsInWorkspace(token);
    }
    async listAgentMDs(token, includeNested) {
        const useAgentMD = this.configurationService.getValue(PromptsConfig.USE_AGENT_MD);
        if (!useAgentMD) {
            return [];
        }
        if (includeNested) {
            return await this.fileLocator.findAgentMDsInWorkspace(token);
        }
        else {
            return await this.fileLocator.findAgentMDsInWorkspaceRoots(token);
        }
    }
    async listCopilotInstructionsMDs(token) {
        const useCopilotInstructionsFiles = this.configurationService.getValue(PromptsConfig.USE_COPILOT_INSTRUCTION_FILES);
        if (!useCopilotInstructionsFiles) {
            return [];
        }
        return await this.fileLocator.findCopilotInstructionsMDsInWorkspace(token);
    }
    getAgentFileURIFromModeFile(oldURI) {
        return this.fileLocator.getAgentFileURIFromModeFile(oldURI);
    }
    getDisabledPromptFiles(type) {
        // Migration: if disabled key absent but legacy enabled key present, convert once.
        const disabledKey = this.disabledPromptsStorageKeyPrefix + type;
        const value = this.storageService.get(disabledKey, 0 /* StorageScope.PROFILE */, '[]');
        const result = new ResourceSet();
        try {
            const arr = JSON.parse(value);
            if (Array.isArray(arr)) {
                for (const s of arr) {
                    try {
                        result.add(URI.revive(s));
                    }
                    catch {
                        // ignore
                    }
                }
            }
        }
        catch {
            // ignore invalid storage values
        }
        return result;
    }
    setDisabledPromptFiles(type, uris) {
        const disabled = Array.from(uris).map(uri => uri.toJSON());
        this.storageService.store(this.disabledPromptsStorageKeyPrefix + type, JSON.stringify(disabled), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        if (type === PromptsType.agent) {
            this.cachedCustomAgents.refresh();
        }
    }
    // Claude skills
    async findClaudeSkills(token) {
        const useClaudeSkills = this.configurationService.getValue(PromptsConfig.USE_CLAUDE_SKILLS);
        if (useClaudeSkills) {
            const result = [];
            const process = async (uri, type) => {
                try {
                    const parsedFile = await this.parseNew(uri, token);
                    const name = parsedFile.header?.name;
                    if (name) {
                        result.push({ uri, type, name, description: parsedFile.header?.description });
                    }
                    else {
                        this.logger.error(`[findClaudeSkills] Claude skill file missing name attribute: ${uri}`);
                    }
                }
                catch (e) {
                    this.logger.error(`[findClaudeSkills] Failed to parse Claude skill file: ${uri}`, e instanceof Error ? e.message : String(e));
                }
            };
            const workspaceSkills = await this.fileLocator.findClaudeSkillsInWorkspace(token);
            await Promise.all(workspaceSkills.map(uri => process(uri, 'project')));
            const userSkills = await this.fileLocator.findClaudeSkillsInUserHome(token);
            await Promise.all(userSkills.map(uri => process(uri, 'personal')));
            return result;
        }
        return undefined;
    }
};
PromptsService = __decorate([
    __param(0, ILogService),
    __param(1, ILabelService),
    __param(2, IModelService),
    __param(3, IInstantiationService),
    __param(4, IUserDataProfileService),
    __param(5, IConfigurationService),
    __param(6, IFileService),
    __param(7, IFilesConfigurationService),
    __param(8, IStorageService)
], PromptsService);
export { PromptsService };
// helpers
class CachedPromise extends Disposable {
    constructor(computeFn, getEvent, delay = 0) {
        super();
        this.computeFn = computeFn;
        this.getEvent = getEvent;
        this.delay = delay;
        this.cachedPromise = undefined;
        this.onDidUpdatePromiseEmitter = undefined;
    }
    get onDidChange() {
        if (!this.onDidUpdatePromiseEmitter) {
            const emitter = this.onDidUpdatePromiseEmitter = this._register(new Emitter());
            const delayer = this._register(new Delayer(this.delay));
            this._register(this.getEvent()(() => {
                this.cachedPromise = undefined;
                delayer.trigger(() => emitter.fire());
            }));
        }
        return this.onDidUpdatePromiseEmitter.event;
    }
    get(token) {
        if (this.cachedPromise !== undefined) {
            return this.cachedPromise;
        }
        const result = this.computeFn(token);
        if (!this.onDidUpdatePromiseEmitter) {
            return result; // only cache if there is an event listener
        }
        this.cachedPromise = result;
        this.onDidUpdatePromiseEmitter.fire();
        return result;
    }
    refresh() {
        this.cachedPromise = undefined;
        this.onDidUpdatePromiseEmitter?.fire();
    }
}
class ModelChangeTracker extends Disposable {
    get onDidPromptChange() {
        return this.onDidPromptModelChange.event;
    }
    constructor(modelService) {
        super();
        this.listeners = new ResourceMap();
        this.onDidPromptModelChange = this._register(new Emitter());
        const onAdd = (model) => {
            const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
            if (promptType !== undefined) {
                this.listeners.set(model.uri, model.onDidChangeContent(() => this.onDidPromptModelChange.fire({ uri: model.uri, promptType })));
            }
        };
        const onRemove = (languageId, uri) => {
            const promptType = getPromptsTypeForLanguageId(languageId);
            if (promptType !== undefined) {
                this.listeners.get(uri)?.dispose();
                this.listeners.delete(uri);
                this.onDidPromptModelChange.fire({ uri, promptType });
            }
        };
        this._register(modelService.onModelAdded(model => onAdd(model)));
        this._register(modelService.onModelLanguageChanged(e => {
            onRemove(e.oldLanguageId, e.model.uri);
            onAdd(e.model);
        }));
        this._register(modelService.onModelRemoved(model => onRemove(model.getLanguageId(), model.uri)));
    }
    dispose() {
        super.dispose();
        this.listeners.forEach(listener => listener.dispose());
        this.listeners.clear();
    }
}
var IAgentSource;
(function (IAgentSource) {
    function fromPromptPath(promptPath) {
        if (promptPath.storage === PromptsStorage.extension) {
            return {
                storage: PromptsStorage.extension,
                extensionId: promptPath.extension.identifier
            };
        }
        else {
            return {
                storage: promptPath.storage
            };
        }
    }
    IAgentSource.fromPromptPath = fromPromptPath;
})(IAgentSource || (IAgentSource = {}));
//# sourceMappingURL=promptsServiceImpl.js.map