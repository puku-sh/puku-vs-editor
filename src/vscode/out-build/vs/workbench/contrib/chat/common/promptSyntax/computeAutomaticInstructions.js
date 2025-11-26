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
import { match, splitGlobAware } from '../../../../../base/common/glob.js';
import { ResourceMap, ResourceSet } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { basename, dirname } from '../../../../../base/common/resources.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { ChatRequestVariableSet, IChatRequestVariableEntry, isPromptFileVariableEntry, toPromptFileVariableEntry, toPromptTextVariableEntry, PromptFileVariableKind } from '../chatVariableEntries.js';
import { PromptsConfig } from './config/config.js';
import { isPromptOrInstructionsFile } from './config/promptFileLocations.js';
import { PromptsType } from './promptTypes.js';
import { IPromptsService } from './service/promptsService.js';
export function newInstructionsCollectionEvent() {
    return { applyingInstructionsCount: 0, referencedInstructionsCount: 0, agentInstructionsCount: 0, listedInstructionsCount: 0, totalInstructionsCount: 0 };
}
let ComputeAutomaticInstructions = class ComputeAutomaticInstructions {
    constructor(_readFileTool, _promptsService, _logService, _labelService, _configurationService, _workspaceService, _fileService, _telemetryService) {
        this._readFileTool = _readFileTool;
        this._promptsService = _promptsService;
        this._logService = _logService;
        this._labelService = _labelService;
        this._configurationService = _configurationService;
        this._workspaceService = _workspaceService;
        this._fileService = _fileService;
        this._telemetryService = _telemetryService;
        this._parseResults = new ResourceMap();
    }
    async _parseInstructionsFile(uri, token) {
        if (this._parseResults.has(uri)) {
            return this._parseResults.get(uri);
        }
        try {
            const result = await this._promptsService.parseNew(uri, token);
            this._parseResults.set(uri, result);
            return result;
        }
        catch (error) {
            this._logService.error(`[InstructionsContextComputer] Failed to parse instruction file: ${uri}`, error);
            return undefined;
        }
    }
    async collect(variables, token) {
        const instructionFiles = await this._promptsService.listPromptFiles(PromptsType.instructions, token);
        this._logService.trace(`[InstructionsContextComputer] ${instructionFiles.length} instruction files available.`);
        const telemetryEvent = newInstructionsCollectionEvent();
        const context = this._getContext(variables);
        // find instructions where the `applyTo` matches the attached context
        await this.addApplyingInstructions(instructionFiles, context, variables, telemetryEvent, token);
        // add all instructions referenced by all instruction files that are in the context
        await this._addReferencedInstructions(variables, telemetryEvent, token);
        // get copilot instructions
        await this._addAgentInstructions(variables, telemetryEvent, token);
        const instructionsWithPatternsList = await this._getInstructionsWithPatternsList(instructionFiles, variables, token);
        if (instructionsWithPatternsList.length > 0) {
            const text = instructionsWithPatternsList.join('\n');
            variables.add(toPromptTextVariableEntry(text, true));
            telemetryEvent.listedInstructionsCount++;
        }
        this.sendTelemetry(telemetryEvent);
    }
    sendTelemetry(telemetryEvent) {
        // Emit telemetry
        telemetryEvent.totalInstructionsCount = telemetryEvent.agentInstructionsCount + telemetryEvent.referencedInstructionsCount + telemetryEvent.applyingInstructionsCount + telemetryEvent.listedInstructionsCount;
        this._telemetryService.publicLog2('instructionsCollected', telemetryEvent);
    }
    /** public for testing */
    async addApplyingInstructions(instructionFiles, context, variables, telemetryEvent, token) {
        for (const { uri } of instructionFiles) {
            const parsedFile = await this._parseInstructionsFile(uri, token);
            if (!parsedFile) {
                this._logService.trace(`[InstructionsContextComputer] Unable to read: ${uri}`);
                continue;
            }
            const applyTo = parsedFile.header?.applyTo;
            if (!applyTo) {
                this._logService.trace(`[InstructionsContextComputer] No 'applyTo' found: ${uri}`);
                continue;
            }
            if (context.instructions.has(uri)) {
                // the instruction file is already part of the input or has already been processed
                this._logService.trace(`[InstructionsContextComputer] Skipping already processed instruction file: ${uri}`);
                continue;
            }
            const match = this._matches(context.files, applyTo);
            if (match) {
                this._logService.trace(`[InstructionsContextComputer] Match for ${uri} with ${match.pattern}${match.file ? ` for file ${match.file}` : ''}`);
                const reason = !match.file ?
                    localize(6466, null) :
                    localize(6467, null, applyTo, this._labelService.getUriLabel(match.file, { relative: true }));
                variables.add(toPromptFileVariableEntry(uri, PromptFileVariableKind.Instruction, reason, true));
                telemetryEvent.applyingInstructionsCount++;
            }
            else {
                this._logService.trace(`[InstructionsContextComputer] No match for ${uri} with ${applyTo}`);
            }
        }
    }
    _getContext(attachedContext) {
        const files = new ResourceSet();
        const instructions = new ResourceSet();
        for (const variable of attachedContext.asArray()) {
            if (isPromptFileVariableEntry(variable)) {
                instructions.add(variable.value);
            }
            else {
                const uri = IChatRequestVariableEntry.toUri(variable);
                if (uri) {
                    files.add(uri);
                }
            }
        }
        return { files, instructions };
    }
    async _addAgentInstructions(variables, telemetryEvent, token) {
        const useCopilotInstructionsFiles = this._configurationService.getValue(PromptsConfig.USE_COPILOT_INSTRUCTION_FILES);
        const useAgentMd = this._configurationService.getValue(PromptsConfig.USE_AGENT_MD);
        if (!useCopilotInstructionsFiles && !useAgentMd) {
            this._logService.trace(`[InstructionsContextComputer] No agent instructions files added (settings disabled).`);
            return;
        }
        const entries = new ChatRequestVariableSet();
        if (useCopilotInstructionsFiles) {
            const files = await this._promptsService.listCopilotInstructionsMDs(token);
            for (const file of files) {
                entries.add(toPromptFileVariableEntry(file, PromptFileVariableKind.Instruction, localize(6468, null, PromptsConfig.USE_COPILOT_INSTRUCTION_FILES), true));
                telemetryEvent.agentInstructionsCount++;
                this._logService.trace(`[InstructionsContextComputer] copilot-instruction.md files added: ${file.toString()}`);
            }
            await this._addReferencedInstructions(entries, telemetryEvent, token);
        }
        if (useAgentMd) {
            const files = await this._promptsService.listAgentMDs(token, false);
            for (const file of files) {
                entries.add(toPromptFileVariableEntry(file, PromptFileVariableKind.Instruction, localize(6469, null, PromptsConfig.USE_AGENT_MD), true));
                telemetryEvent.agentInstructionsCount++;
                this._logService.trace(`[InstructionsContextComputer] AGENTS.md files added: ${file.toString()}`);
            }
        }
        for (const entry of entries.asArray()) {
            variables.add(entry);
        }
    }
    _matches(files, applyToPattern) {
        const patterns = splitGlobAware(applyToPattern, ',');
        const patterMatches = (pattern) => {
            pattern = pattern.trim();
            if (pattern.length === 0) {
                // if glob pattern is empty, skip it
                return undefined;
            }
            if (pattern === '**' || pattern === '**/*' || pattern === '*') {
                // if glob pattern is one of the special wildcard values,
                // add the instructions file event if no files are attached
                return { pattern };
            }
            if (!pattern.startsWith('/') && !pattern.startsWith('**/')) {
                // support relative glob patterns, e.g. `src/**/*.js`
                pattern = '**/' + pattern;
            }
            // match each attached file with each glob pattern and
            // add the instructions file if its rule matches the file
            for (const file of files) {
                // if the file is not a valid URI, skip it
                if (match(pattern, file.path, { ignoreCase: true })) {
                    return { pattern, file }; // return the matched pattern and file URI
                }
            }
            return undefined;
        };
        for (const pattern of patterns) {
            const matchResult = patterMatches(pattern);
            if (matchResult) {
                return matchResult; // return the first matched pattern and file URI
            }
        }
        return undefined;
    }
    async _getInstructionsWithPatternsList(instructionFiles, _existingVariables, token) {
        if (!this._readFileTool) {
            this._logService.trace('[InstructionsContextComputer] No readFile tool available, skipping instructions with patterns list.');
            return [];
        }
        const searchNestedAgentMd = this._configurationService.getValue(PromptsConfig.USE_NESTED_AGENT_MD);
        const agentsMdPromise = searchNestedAgentMd ? this._promptsService.findAgentMDsInWorkspace(token) : Promise.resolve([]);
        const toolName = 'read_file'; // workaround https://github.com/microsoft/vscode/issues/252167
        const entries = [
            'Here is a list of instruction files that contain rules for modifying or creating new code.',
            'These files are important for ensuring that the code is modified or created correctly.',
            'Please make sure to follow the rules specified in these files when working with the codebase.',
            `If the file is not already available as attachment, use the \`${toolName}\` tool to acquire it.`,
            'Make sure to acquire the instructions before making any changes to the code.',
            '| File | Applies To | Description |',
            '| ------- | --------- | ----------- |',
        ];
        let hasContent = false;
        for (const { uri } of instructionFiles) {
            const parsedFile = await this._parseInstructionsFile(uri, token);
            if (parsedFile) {
                const applyTo = parsedFile.header?.applyTo ?? '';
                const description = parsedFile.header?.description ?? '';
                entries.push(`| '${getFilePath(uri)}' | ${applyTo} | ${description} |`);
                hasContent = true;
            }
        }
        const agentsMdFiles = await agentsMdPromise;
        for (const uri of agentsMdFiles) {
            if (uri) {
                const folderName = this._labelService.getUriLabel(dirname(uri), { relative: true });
                const description = folderName.trim().length === 0 ? localize(6470, null) : localize(6471, null, folderName);
                entries.push(`| '${getFilePath(uri)}' |    | ${description} |`);
                hasContent = true;
            }
        }
        if (!hasContent) {
            entries.length = 0; // clear entries
        }
        else {
            entries.push('', ''); // add trailing newline
        }
        const claudeSkills = await this._promptsService.findClaudeSkills(token);
        if (claudeSkills && claudeSkills.length > 0) {
            entries.push('Here is a list of skills that contain domain specific knowledge on a variety of topics.', 'Each skill comes with a description of the topic and a file path that contains the detailed instructions.', 'When a user asks you to perform a task that falls within the domain of a skill, use the \`${toolName}\` tool to acquire the full instructions from the file URI.', '| Name | Description | File', '| ------- | --------- | ----------- |');
            for (const skill of claudeSkills) {
                entries.push(`| ${skill.name} | ${skill.description} | '${getFilePath(skill.uri)}' |`);
            }
        }
        return entries;
    }
    async _addReferencedInstructions(attachedContext, telemetryEvent, token) {
        const seen = new ResourceSet();
        const todo = [];
        for (const variable of attachedContext.asArray()) {
            if (isPromptFileVariableEntry(variable)) {
                if (!seen.has(variable.value)) {
                    todo.push(variable.value);
                    seen.add(variable.value);
                }
            }
        }
        let next = todo.pop();
        while (next) {
            const result = await this._parseInstructionsFile(next, token);
            if (result && result.body) {
                const refsToCheck = [];
                for (const ref of result.body.fileReferences) {
                    const url = result.body.resolveFilePath(ref.content);
                    if (url && !seen.has(url) && (isPromptOrInstructionsFile(url) || this._workspaceService.getWorkspaceFolder(url) !== undefined)) {
                        // only add references that are either prompt or instruction files or are part of the workspace
                        refsToCheck.push({ resource: url });
                        seen.add(url);
                    }
                }
                if (refsToCheck.length > 0) {
                    const stats = await this._fileService.resolveAll(refsToCheck);
                    for (let i = 0; i < stats.length; i++) {
                        const stat = stats[i];
                        const uri = refsToCheck[i].resource;
                        if (stat.success && stat.stat?.isFile) {
                            if (isPromptOrInstructionsFile(uri)) {
                                // only recursively parse instruction files
                                todo.push(uri);
                            }
                            const reason = localize(6472, null, basename(next));
                            attachedContext.add(toPromptFileVariableEntry(uri, PromptFileVariableKind.InstructionReference, reason, true));
                            telemetryEvent.referencedInstructionsCount++;
                            this._logService.trace(`[InstructionsContextComputer] ${uri.toString()} added, referenced by ${next.toString()}`);
                        }
                    }
                }
            }
            next = todo.pop();
        }
    }
};
ComputeAutomaticInstructions = __decorate([
    __param(1, IPromptsService),
    __param(2, ILogService),
    __param(3, ILabelService),
    __param(4, IConfigurationService),
    __param(5, IWorkspaceContextService),
    __param(6, IFileService),
    __param(7, ITelemetryService)
], ComputeAutomaticInstructions);
export { ComputeAutomaticInstructions };
function getFilePath(uri) {
    if (uri.scheme === Schemas.file || uri.scheme === Schemas.vscodeRemote) {
        return uri.fsPath;
    }
    return uri.toString();
}
//# sourceMappingURL=computeAutomaticInstructions.js.map