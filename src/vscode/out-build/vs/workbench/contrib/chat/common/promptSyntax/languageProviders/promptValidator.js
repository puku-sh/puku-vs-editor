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
import { isEmptyPattern, parse, splitGlobAware } from '../../../../../../base/common/glob.js';
import { Iterable } from '../../../../../../base/common/iterator.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { localize } from '../../../../../../nls.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService, MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
import { IChatModeService } from '../../chatModes.js';
import { ChatModeKind } from '../../constants.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../../languageModels.js';
import { ILanguageModelToolsService } from '../../languageModelToolsService.js';
import { getPromptsTypeForLanguageId, PromptsType } from '../promptTypes.js';
import { GithubPromptHeaderAttributes, PromptHeaderAttributes, Target } from '../promptFileParser.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { Delayer } from '../../../../../../base/common/async.js';
import { ResourceMap } from '../../../../../../base/common/map.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { IPromptsService } from '../service/promptsService.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { AGENTS_SOURCE_FOLDER, LEGACY_MODE_FILE_EXTENSION } from '../config/promptFileLocations.js';
import { Lazy } from '../../../../../../base/common/lazy.js';
const MARKERS_OWNER_ID = 'prompts-diagnostics-provider';
let PromptValidator = class PromptValidator {
    constructor(languageModelsService, languageModelToolsService, chatModeService, fileService, labelService, promptsService) {
        this.languageModelsService = languageModelsService;
        this.languageModelToolsService = languageModelToolsService;
        this.chatModeService = chatModeService;
        this.fileService = fileService;
        this.labelService = labelService;
        this.promptsService = promptsService;
    }
    async validate(promptAST, promptType, report) {
        promptAST.header?.errors.forEach(error => report(toMarker(error.message, error.range, MarkerSeverity.Error)));
        this.validateHeader(promptAST, promptType, report);
        await this.validateBody(promptAST, promptType, report);
        await this.validateFileName(promptAST, promptType, report);
    }
    async validateFileName(promptAST, promptType, report) {
        if (promptType === PromptsType.agent && promptAST.uri.path.endsWith(LEGACY_MODE_FILE_EXTENSION)) {
            const location = this.promptsService.getAgentFileURIFromModeFile(promptAST.uri);
            if (location && await this.fileService.canCreateFile(location)) {
                report(toMarker(localize(6506, null, location.toString()), new Range(1, 1, 1, 4), MarkerSeverity.Warning));
            }
            else {
                report(toMarker(localize(6507, null, AGENTS_SOURCE_FOLDER), new Range(1, 1, 1, 4), MarkerSeverity.Warning));
            }
        }
    }
    async validateBody(promptAST, promptType, report) {
        const body = promptAST.body;
        if (!body) {
            return;
        }
        // Validate file references
        const fileReferenceChecks = [];
        for (const ref of body.fileReferences) {
            const resolved = body.resolveFilePath(ref.content);
            if (!resolved) {
                report(toMarker(localize(6508, null, ref.content), ref.range, MarkerSeverity.Warning));
                continue;
            }
            if (promptAST.uri.scheme === resolved.scheme) {
                // only validate if the link is in the file system of the prompt file
                fileReferenceChecks.push((async () => {
                    try {
                        const exists = await this.fileService.exists(resolved);
                        if (exists) {
                            return;
                        }
                    }
                    catch {
                    }
                    const loc = this.labelService.getUriLabel(resolved);
                    report(toMarker(localize(6509, null, ref.content, loc), ref.range, MarkerSeverity.Warning));
                })());
            }
        }
        const isGitHubTarget = isGithubTarget(promptType, promptAST.header?.target);
        // Validate variable references (tool or toolset names)
        if (body.variableReferences.length && !isGitHubTarget) {
            const headerTools = promptAST.header?.tools;
            const headerTarget = promptAST.header?.target;
            const headerToolsMap = headerTools ? this.languageModelToolsService.toToolAndToolSetEnablementMap(headerTools, headerTarget) : undefined;
            const available = new Set(this.languageModelToolsService.getQualifiedToolNames());
            const deprecatedNames = this.languageModelToolsService.getDeprecatedQualifiedToolNames();
            for (const variable of body.variableReferences) {
                if (!available.has(variable.name)) {
                    if (deprecatedNames.has(variable.name)) {
                        const currentNames = deprecatedNames.get(variable.name);
                        if (currentNames && currentNames.size > 0) {
                            if (currentNames.size === 1) {
                                const newName = Array.from(currentNames)[0];
                                report(toMarker(localize(6510, null, variable.name, newName), variable.range, MarkerSeverity.Info));
                            }
                            else {
                                const newNames = Array.from(currentNames).sort((a, b) => a.localeCompare(b)).join(', ');
                                report(toMarker(localize(6511, null, variable.name, newNames), variable.range, MarkerSeverity.Info));
                            }
                        }
                    }
                    else {
                        report(toMarker(localize(6512, null, variable.name), variable.range, MarkerSeverity.Warning));
                    }
                }
                else if (headerToolsMap) {
                    const tool = this.languageModelToolsService.getToolByQualifiedName(variable.name);
                    if (tool && headerToolsMap.get(tool) === false) {
                        report(toMarker(localize(6513, null, variable.name), variable.range, MarkerSeverity.Warning));
                    }
                }
            }
        }
        await Promise.all(fileReferenceChecks);
    }
    validateHeader(promptAST, promptType, report) {
        const header = promptAST.header;
        if (!header) {
            return;
        }
        const attributes = header.attributes;
        const isGitHubTarget = isGithubTarget(promptType, header.target);
        this.checkForInvalidArguments(attributes, promptType, isGitHubTarget, report);
        this.validateName(attributes, isGitHubTarget, report);
        this.validateDescription(attributes, report);
        this.validateArgumentHint(attributes, report);
        switch (promptType) {
            case PromptsType.prompt: {
                const agent = this.validateAgent(attributes, report);
                this.validateTools(attributes, agent?.kind ?? ChatModeKind.Agent, header.target, report);
                this.validateModel(attributes, agent?.kind ?? ChatModeKind.Agent, report);
                break;
            }
            case PromptsType.instructions:
                this.validateApplyTo(attributes, report);
                this.validateExcludeAgent(attributes, report);
                break;
            case PromptsType.agent: {
                this.validateTarget(attributes, report);
                this.validateTools(attributes, ChatModeKind.Agent, header.target, report);
                if (!isGitHubTarget) {
                    this.validateModel(attributes, ChatModeKind.Agent, report);
                    this.validateHandoffs(attributes, report);
                }
                break;
            }
        }
    }
    checkForInvalidArguments(attributes, promptType, isGitHubTarget, report) {
        const validAttributeNames = getValidAttributeNames(promptType, true, isGitHubTarget);
        const validGithubCopilotAttributeNames = new Lazy(() => new Set(getValidAttributeNames(promptType, false, true)));
        for (const attribute of attributes) {
            if (!validAttributeNames.includes(attribute.key)) {
                const supportedNames = new Lazy(() => getValidAttributeNames(promptType, false, isGitHubTarget).sort().join(', '));
                switch (promptType) {
                    case PromptsType.prompt:
                        report(toMarker(localize(6514, null, attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                        break;
                    case PromptsType.agent:
                        if (isGitHubTarget) {
                            report(toMarker(localize(6515, null, attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                        }
                        else {
                            if (validGithubCopilotAttributeNames.value.has(attribute.key)) {
                                report(toMarker(localize(6516, null, attribute.key), attribute.range, MarkerSeverity.Info));
                            }
                            else {
                                report(toMarker(localize(6517, null, attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                            }
                        }
                        break;
                    case PromptsType.instructions:
                        report(toMarker(localize(6518, null, attribute.key, supportedNames.value), attribute.range, MarkerSeverity.Warning));
                        break;
                }
            }
        }
    }
    validateName(attributes, isGitHubTarget, report) {
        const nameAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.name);
        if (!nameAttribute) {
            return;
        }
        if (nameAttribute.value.type !== 'string') {
            report(toMarker(localize(6519, null), nameAttribute.range, MarkerSeverity.Error));
            return;
        }
        if (nameAttribute.value.value.trim().length === 0) {
            report(toMarker(localize(6520, null), nameAttribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateDescription(attributes, report) {
        const descriptionAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.description);
        if (!descriptionAttribute) {
            return;
        }
        if (descriptionAttribute.value.type !== 'string') {
            report(toMarker(localize(6521, null), descriptionAttribute.range, MarkerSeverity.Error));
            return;
        }
        if (descriptionAttribute.value.value.trim().length === 0) {
            report(toMarker(localize(6522, null), descriptionAttribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateArgumentHint(attributes, report) {
        const argumentHintAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.argumentHint);
        if (!argumentHintAttribute) {
            return;
        }
        if (argumentHintAttribute.value.type !== 'string') {
            report(toMarker(localize(6523, null), argumentHintAttribute.range, MarkerSeverity.Error));
            return;
        }
        if (argumentHintAttribute.value.value.trim().length === 0) {
            report(toMarker(localize(6524, null), argumentHintAttribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateModel(attributes, agentKind, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.model);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'string') {
            report(toMarker(localize(6525, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const modelName = attribute.value.value.trim();
        if (modelName.length === 0) {
            report(toMarker(localize(6526, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const languageModes = this.languageModelsService.getLanguageModelIds();
        if (languageModes.length === 0) {
            // likely the service is not initialized yet
            return;
        }
        const modelMetadata = this.findModelByName(languageModes, modelName);
        if (!modelMetadata) {
            report(toMarker(localize(6527, null, modelName), attribute.value.range, MarkerSeverity.Warning));
        }
        else if (agentKind === ChatModeKind.Agent && !ILanguageModelChatMetadata.suitableForAgentMode(modelMetadata)) {
            report(toMarker(localize(6528, null, modelName), attribute.value.range, MarkerSeverity.Warning));
        }
    }
    findModelByName(languageModes, modelName) {
        for (const model of languageModes) {
            const metadata = this.languageModelsService.lookupLanguageModel(model);
            if (metadata && metadata.isUserSelectable !== false && ILanguageModelChatMetadata.matchesQualifiedName(modelName, metadata)) {
                return metadata;
            }
        }
        return undefined;
    }
    validateAgent(attributes, report) {
        const agentAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.agent);
        const modeAttribute = attributes.find(attr => attr.key === PromptHeaderAttributes.mode);
        if (modeAttribute) {
            if (agentAttribute) {
                report(toMarker(localize(6529, null), modeAttribute.range, MarkerSeverity.Warning));
            }
            else {
                report(toMarker(localize(6530, null), modeAttribute.range, MarkerSeverity.Error));
            }
        }
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.agent) ?? modeAttribute;
        if (!attribute) {
            return undefined; // default agent for prompts is Agent
        }
        if (attribute.value.type !== 'string') {
            report(toMarker(localize(6531, null, attribute.key), attribute.value.range, MarkerSeverity.Error));
            return undefined;
        }
        const agentValue = attribute.value.value;
        if (agentValue.trim().length === 0) {
            report(toMarker(localize(6532, null, attribute.key), attribute.value.range, MarkerSeverity.Error));
            return undefined;
        }
        return this.validateAgentValue(attribute.value, report);
    }
    validateAgentValue(value, report) {
        const agents = this.chatModeService.getModes();
        const availableAgents = [];
        // Check if agent exists in builtin or custom agents
        for (const agent of Iterable.concat(agents.builtin, agents.custom)) {
            if (agent.name.get() === value.value) {
                return agent;
            }
            availableAgents.push(agent.name.get()); // collect all available agent names
        }
        const errorMessage = localize(6533, null, value.value, availableAgents.join(', '));
        report(toMarker(errorMessage, value.range, MarkerSeverity.Warning));
        return undefined;
    }
    validateTools(attributes, agentKind, target, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.tools);
        if (!attribute) {
            return;
        }
        if (agentKind !== ChatModeKind.Agent) {
            report(toMarker(localize(6534, null), attribute.range, MarkerSeverity.Warning));
        }
        switch (attribute.value.type) {
            case 'array':
                if (target === Target.GitHubCopilot) {
                    // no validation for github-copilot target
                }
                else {
                    this.validateVSCodeTools(attribute.value, target, report);
                }
                break;
            default:
                report(toMarker(localize(6535, null), attribute.value.range, MarkerSeverity.Error));
        }
    }
    validateVSCodeTools(valueItem, target, report) {
        if (valueItem.items.length > 0) {
            const available = new Set(this.languageModelToolsService.getQualifiedToolNames());
            const deprecatedNames = this.languageModelToolsService.getDeprecatedQualifiedToolNames();
            for (const item of valueItem.items) {
                if (item.type !== 'string') {
                    report(toMarker(localize(6536, null), item.range, MarkerSeverity.Error));
                }
                else if (item.value) {
                    const toolName = target === undefined ? this.languageModelToolsService.mapGithubToolName(item.value) : item.value;
                    if (!available.has(toolName)) {
                        const currentNames = deprecatedNames.get(toolName);
                        if (currentNames) {
                            if (currentNames?.size === 1) {
                                const newName = Array.from(currentNames)[0];
                                report(toMarker(localize(6537, null, toolName, newName), item.range, MarkerSeverity.Info));
                            }
                            else {
                                const newNames = Array.from(currentNames).sort((a, b) => a.localeCompare(b)).join(', ');
                                report(toMarker(localize(6538, null, toolName, newNames), item.range, MarkerSeverity.Info));
                            }
                        }
                        else {
                            report(toMarker(localize(6539, null, toolName), item.range, MarkerSeverity.Warning));
                        }
                    }
                }
            }
        }
    }
    validateApplyTo(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.applyTo);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'string') {
            report(toMarker(localize(6540, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const pattern = attribute.value.value;
        try {
            const patterns = splitGlobAware(pattern, ',');
            if (patterns.length === 0) {
                report(toMarker(localize(6541, null), attribute.value.range, MarkerSeverity.Error));
                return;
            }
            for (const pattern of patterns) {
                const globPattern = parse(pattern);
                if (isEmptyPattern(globPattern)) {
                    report(toMarker(localize(6542, null), attribute.value.range, MarkerSeverity.Error));
                    return;
                }
            }
        }
        catch (_error) {
            report(toMarker(localize(6543, null), attribute.value.range, MarkerSeverity.Error));
        }
    }
    validateExcludeAgent(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.excludeAgent);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'array') {
            report(toMarker(localize(6544, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
    }
    validateHandoffs(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.handOffs);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'array') {
            report(toMarker(localize(6545, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        for (const item of attribute.value.items) {
            if (item.type !== 'object') {
                report(toMarker(localize(6546, null), item.range, MarkerSeverity.Error));
                continue;
            }
            const required = new Set(['label', 'agent', 'prompt']);
            for (const prop of item.properties) {
                switch (prop.key.value) {
                    case 'label':
                        if (prop.value.type !== 'string' || prop.value.value.trim().length === 0) {
                            report(toMarker(localize(6547, null), prop.value.range, MarkerSeverity.Error));
                        }
                        break;
                    case 'agent':
                        if (prop.value.type !== 'string' || prop.value.value.trim().length === 0) {
                            report(toMarker(localize(6548, null), prop.value.range, MarkerSeverity.Error));
                        }
                        else {
                            this.validateAgentValue(prop.value, report);
                        }
                        break;
                    case 'prompt':
                        if (prop.value.type !== 'string') {
                            report(toMarker(localize(6549, null), prop.value.range, MarkerSeverity.Error));
                        }
                        break;
                    case 'send':
                        if (prop.value.type !== 'boolean') {
                            report(toMarker(localize(6550, null), prop.value.range, MarkerSeverity.Error));
                        }
                        break;
                    default:
                        report(toMarker(localize(6551, null, prop.key.value), prop.value.range, MarkerSeverity.Warning));
                }
                required.delete(prop.key.value);
            }
            if (required.size > 0) {
                report(toMarker(localize(6552, null, Array.from(required).map(s => `'${s}'`).join(', ')), item.range, MarkerSeverity.Error));
            }
        }
    }
    validateTarget(attributes, report) {
        const attribute = attributes.find(attr => attr.key === PromptHeaderAttributes.target);
        if (!attribute) {
            return;
        }
        if (attribute.value.type !== 'string') {
            report(toMarker(localize(6553, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const targetValue = attribute.value.value.trim();
        if (targetValue.length === 0) {
            report(toMarker(localize(6554, null), attribute.value.range, MarkerSeverity.Error));
            return;
        }
        const validTargets = ['github-copilot', 'vscode'];
        if (!validTargets.includes(targetValue)) {
            report(toMarker(localize(6555, null, validTargets.join(', ')), attribute.value.range, MarkerSeverity.Error));
        }
    }
};
PromptValidator = __decorate([
    __param(0, ILanguageModelsService),
    __param(1, ILanguageModelToolsService),
    __param(2, IChatModeService),
    __param(3, IFileService),
    __param(4, ILabelService),
    __param(5, IPromptsService)
], PromptValidator);
export { PromptValidator };
const allAttributeNames = {
    [PromptsType.prompt]: [PromptHeaderAttributes.name, PromptHeaderAttributes.description, PromptHeaderAttributes.model, PromptHeaderAttributes.tools, PromptHeaderAttributes.mode, PromptHeaderAttributes.agent, PromptHeaderAttributes.argumentHint],
    [PromptsType.instructions]: [PromptHeaderAttributes.name, PromptHeaderAttributes.description, PromptHeaderAttributes.applyTo, PromptHeaderAttributes.excludeAgent],
    [PromptsType.agent]: [PromptHeaderAttributes.name, PromptHeaderAttributes.description, PromptHeaderAttributes.model, PromptHeaderAttributes.tools, PromptHeaderAttributes.advancedOptions, PromptHeaderAttributes.handOffs, PromptHeaderAttributes.argumentHint, PromptHeaderAttributes.target]
};
const githubCopilotAgentAttributeNames = [PromptHeaderAttributes.name, PromptHeaderAttributes.description, PromptHeaderAttributes.tools, PromptHeaderAttributes.target, GithubPromptHeaderAttributes.mcpServers];
const recommendedAttributeNames = {
    [PromptsType.prompt]: allAttributeNames[PromptsType.prompt].filter(name => !isNonRecommendedAttribute(name)),
    [PromptsType.instructions]: allAttributeNames[PromptsType.instructions].filter(name => !isNonRecommendedAttribute(name)),
    [PromptsType.agent]: allAttributeNames[PromptsType.agent].filter(name => !isNonRecommendedAttribute(name))
};
export function getValidAttributeNames(promptType, includeNonRecommended, isGitHubTarget) {
    if (isGitHubTarget && promptType === PromptsType.agent) {
        return githubCopilotAgentAttributeNames;
    }
    return includeNonRecommended ? allAttributeNames[promptType] : recommendedAttributeNames[promptType];
}
export function isNonRecommendedAttribute(attributeName) {
    return attributeName === PromptHeaderAttributes.advancedOptions || attributeName === PromptHeaderAttributes.excludeAgent || attributeName === PromptHeaderAttributes.mode;
}
// The list of tools known to be used by Puku AI custom agents
export const knownGithubCopilotTools = {
    'shell': localize(6556, null),
    'edit': localize(6557, null),
    'search': localize(6558, null),
    'custom-agent': localize(6559, null)
};
export function isGithubTarget(promptType, target) {
    return promptType === PromptsType.agent && target === Target.GitHubCopilot;
}
function toMarker(message, range, severity = MarkerSeverity.Error) {
    return { severity, message, ...range };
}
let PromptValidatorContribution = class PromptValidatorContribution extends Disposable {
    constructor(modelService, instantiationService, markerService, promptsService, languageModelsService, languageModelToolsService, chatModeService) {
        super();
        this.modelService = modelService;
        this.markerService = markerService;
        this.promptsService = promptsService;
        this.languageModelsService = languageModelsService;
        this.languageModelToolsService = languageModelToolsService;
        this.chatModeService = chatModeService;
        this.localDisposables = this._register(new DisposableStore());
        this.validator = instantiationService.createInstance(PromptValidator);
        this.updateRegistration();
    }
    updateRegistration() {
        this.localDisposables.clear();
        const trackers = new ResourceMap();
        this.localDisposables.add(toDisposable(() => {
            trackers.forEach(tracker => tracker.dispose());
            trackers.clear();
        }));
        this.modelService.getModels().forEach(model => {
            const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
            if (promptType) {
                trackers.set(model.uri, new ModelTracker(model, promptType, this.validator, this.promptsService, this.markerService));
            }
        });
        this.localDisposables.add(this.modelService.onModelAdded((model) => {
            const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
            if (promptType && !trackers.has(model.uri)) {
                trackers.set(model.uri, new ModelTracker(model, promptType, this.validator, this.promptsService, this.markerService));
            }
        }));
        this.localDisposables.add(this.modelService.onModelRemoved((model) => {
            const tracker = trackers.get(model.uri);
            if (tracker) {
                tracker.dispose();
                trackers.delete(model.uri);
            }
        }));
        this.localDisposables.add(this.modelService.onModelLanguageChanged((event) => {
            const { model } = event;
            const tracker = trackers.get(model.uri);
            if (tracker) {
                tracker.dispose();
                trackers.delete(model.uri);
            }
            const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
            if (promptType) {
                trackers.set(model.uri, new ModelTracker(model, promptType, this.validator, this.promptsService, this.markerService));
            }
        }));
        const validateAll = () => trackers.forEach(tracker => tracker.validate());
        this.localDisposables.add(this.languageModelToolsService.onDidChangeTools(() => validateAll()));
        this.localDisposables.add(this.chatModeService.onDidChangeChatModes(() => validateAll()));
        this.localDisposables.add(this.languageModelsService.onDidChangeLanguageModels(() => validateAll()));
    }
};
PromptValidatorContribution = __decorate([
    __param(0, IModelService),
    __param(1, IInstantiationService),
    __param(2, IMarkerService),
    __param(3, IPromptsService),
    __param(4, ILanguageModelsService),
    __param(5, ILanguageModelToolsService),
    __param(6, IChatModeService)
], PromptValidatorContribution);
export { PromptValidatorContribution };
let ModelTracker = class ModelTracker extends Disposable {
    constructor(textModel, promptType, validator, promptsService, markerService) {
        super();
        this.textModel = textModel;
        this.promptType = promptType;
        this.validator = validator;
        this.promptsService = promptsService;
        this.markerService = markerService;
        this.delayer = this._register(new Delayer(200));
        this._register(textModel.onDidChangeContent(() => this.validate()));
        this.validate();
    }
    validate() {
        this.delayer.trigger(async () => {
            const markers = [];
            const ast = this.promptsService.getParsedPromptFile(this.textModel);
            await this.validator.validate(ast, this.promptType, m => markers.push(m));
            this.markerService.changeOne(MARKERS_OWNER_ID, this.textModel.uri, markers);
        });
    }
    dispose() {
        this.markerService.remove(MARKERS_OWNER_ID, [this.textModel.uri]);
        super.dispose();
    }
};
ModelTracker = __decorate([
    __param(3, IPromptsService),
    __param(4, IMarkerService)
], ModelTracker);
//# sourceMappingURL=promptValidator.js.map