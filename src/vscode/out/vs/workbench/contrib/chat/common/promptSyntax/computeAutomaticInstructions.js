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
                    localize('instruction.file.reason.allFiles', 'Automatically attached as pattern is **') :
                    localize('instruction.file.reason.specificFile', 'Automatically attached as pattern {0} matches {1}', applyTo, this._labelService.getUriLabel(match.file, { relative: true }));
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
                entries.add(toPromptFileVariableEntry(file, PromptFileVariableKind.Instruction, localize('instruction.file.reason.copilot', 'Automatically attached as setting {0} is enabled', PromptsConfig.USE_COPILOT_INSTRUCTION_FILES), true));
                telemetryEvent.agentInstructionsCount++;
                this._logService.trace(`[InstructionsContextComputer] copilot-instruction.md files added: ${file.toString()}`);
            }
            await this._addReferencedInstructions(entries, telemetryEvent, token);
        }
        if (useAgentMd) {
            const files = await this._promptsService.listAgentMDs(token, false);
            for (const file of files) {
                entries.add(toPromptFileVariableEntry(file, PromptFileVariableKind.Instruction, localize('instruction.file.reason.agentsmd', 'Automatically attached as setting {0} is enabled', PromptsConfig.USE_AGENT_MD), true));
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
                const description = folderName.trim().length === 0 ? localize('instruction.file.description.agentsmd.root', 'Instructions for the workspace') : localize('instruction.file.description.agentsmd.folder', 'Instructions for folder \'{0}\'', folderName);
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
                            const reason = localize('instruction.file.reason.referenced', 'Referenced by {0}', basename(next));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZUF1dG9tYXRpY0luc3RydWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb21wdXRlQXV0b21hdGljSW5zdHJ1Y3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDakcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLHlCQUF5QixFQUFFLHlCQUF5QixFQUFFLHlCQUF5QixFQUFFLHlCQUF5QixFQUFFLHNCQUFzQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFdk0s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