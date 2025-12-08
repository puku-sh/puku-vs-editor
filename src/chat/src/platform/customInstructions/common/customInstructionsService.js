"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomInstructionsService = exports.ICustomInstructionsService = exports.CustomInstructionsKind = void 0;
const services_1 = require("../../../util/common/services");
const glob_1 = require("../../../util/vs/base/common/glob");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const network_1 = require("../../../util/vs/base/common/network");
const path_1 = require("../../../util/vs/base/common/path");
const resources_1 = require("../../../util/vs/base/common/resources");
const types_1 = require("../../../util/vs/base/common/types");
const vscodeTypes_1 = require("../../../vscodeTypes");
const configurationService_1 = require("../../configuration/common/configurationService");
const envService_1 = require("../../env/common/envService");
const extensionsService_1 = require("../../extensions/common/extensionsService");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const logService_1 = require("../../log/common/logService");
const promptPathRepresentationService_1 = require("../../prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../workspace/common/workspaceService");
var CustomInstructionsKind;
(function (CustomInstructionsKind) {
    CustomInstructionsKind[CustomInstructionsKind["File"] = 0] = "File";
    CustomInstructionsKind[CustomInstructionsKind["Setting"] = 1] = "Setting";
})(CustomInstructionsKind || (exports.CustomInstructionsKind = CustomInstructionsKind = {}));
exports.ICustomInstructionsService = (0, services_1.createServiceIdentifier)('ICustomInstructionsService');
function isCodeGenerationImportInstruction(instruction) {
    if (typeof instruction === 'object' && instruction !== null) {
        return typeof instruction.file === 'string' && (instruction.language === undefined || typeof instruction.language === 'string');
    }
    return false;
}
function isCodeGenerationTextInstruction(instruction) {
    if (typeof instruction === 'object' && instruction !== null) {
        return typeof instruction.text === 'string' && (instruction.language === undefined || typeof instruction.language === 'string');
    }
    return false;
}
const INSTRUCTION_FILE_EXTENSION = '.instructions.md';
const INSTRUCTIONS_LOCATION_KEY = 'chat.instructionsFilesLocations';
const COPILOT_INSTRUCTIONS_PATH = '.github/copilot-instructions.md';
let CustomInstructionsService = class CustomInstructionsService extends lifecycle_1.Disposable {
    constructor(configurationService, envService, workspaceService, fileSystemService, promptPathRepresentationService, logService, extensionService) {
        super();
        this.configurationService = configurationService;
        this.envService = envService;
        this.workspaceService = workspaceService;
        this.fileSystemService = fileSystemService;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.logService = logService;
        this.extensionService = extensionService;
        this._register(this.extensionService.onDidChange(() => {
            this._contributedInstructions = undefined;
        }));
    }
    async fetchInstructionsFromFile(fileUri) {
        return await this.readInstructionsFromFile(fileUri);
    }
    async getAgentInstructions() {
        const result = [];
        if (this.configurationService.getConfig(configurationService_1.ConfigKey.UseInstructionFiles)) {
            for (const folder of this.workspaceService.getWorkspaceFolders()) {
                try {
                    const uri = (0, resources_1.joinPath)(folder, COPILOT_INSTRUCTIONS_PATH);
                    if ((await this.fileSystemService.stat(uri)).type === vscodeTypes_1.FileType.File) {
                        result.push(uri);
                    }
                }
                catch (e) {
                    // ignore non-existing instruction files
                }
            }
        }
        return result;
    }
    async fetchInstructionsFromSetting(configKey) {
        const result = [];
        const instructions = [];
        const seenFiles = new Set();
        const inspect = this.configurationService.inspectConfig(configKey);
        if (inspect) {
            await this.collectInstructionsFromSettings([inspect.workspaceFolderValue, inspect.workspaceValue, inspect.globalValue], seenFiles, instructions, result);
        }
        const reference = vscodeTypes_1.Uri.from({ scheme: this.envService.uriScheme, authority: 'settings', path: `/${configKey.fullyQualifiedId}` });
        if (instructions.length > 0) {
            result.push({
                kind: CustomInstructionsKind.Setting,
                content: instructions,
                reference,
            });
        }
        return result;
    }
    async collectInstructionsFromSettings(instructionsArrays, seenFiles, instructions, result) {
        const seenInstructions = new Set();
        for (const instructionsArray of instructionsArrays) {
            if (Array.isArray(instructionsArray)) {
                for (const entry of instructionsArray) {
                    if (isCodeGenerationImportInstruction(entry) && !seenFiles.has(entry.file)) {
                        seenFiles.add(entry.file);
                        await this._collectInstructionsFromFile(entry.file, entry.language, result);
                    }
                    if (isCodeGenerationTextInstruction(entry) && !seenInstructions.has(entry.text)) {
                        seenInstructions.add(entry.text);
                        instructions.push({ instruction: entry.text, languageId: entry.language });
                    }
                }
            }
        }
    }
    async _collectInstructionsFromFile(customInstructionsFile, language, result) {
        this.logService.debug(`Collect instructions from file: ${customInstructionsFile}`);
        const promises = this.workspaceService.getWorkspaceFolders().map(async (folderUri) => {
            const fileUri = vscodeTypes_1.Uri.joinPath(folderUri, customInstructionsFile);
            const instruction = await this.readInstructionsFromFile(fileUri);
            if (instruction) {
                result.push(instruction);
            }
        });
        await Promise.all(promises);
    }
    async readInstructionsFromFile(fileUri, languageId) {
        try {
            const fileContents = await this.fileSystemService.readFile(fileUri);
            const content = new TextDecoder().decode(fileContents);
            const instruction = content.trim();
            if (!instruction) {
                this.logService.debug(`Instructions file is empty: ${fileUri.toString()}`);
                return;
            }
            return {
                kind: CustomInstructionsKind.File,
                content: [{ instruction, languageId }],
                reference: fileUri
            };
        }
        catch (e) {
            this.logService.debug(`Instructions file not found: ${fileUri.toString()}`);
            return undefined;
        }
    }
    isExternalInstructionsFile(uri) {
        if (!uri.path.endsWith(INSTRUCTION_FILE_EXTENSION)) {
            return false;
        }
        if (uri.scheme === network_1.Schemas.vscodeUserData) {
            return true;
        }
        if (this.getInstructionURLFromExtensionPoint().has(uri)) {
            return true;
        }
        if (uri.scheme !== network_1.Schemas.file) {
            return false;
        }
        const instructionFilePath = this.promptPathRepresentationService.getFilePath(uri);
        const instructionFolderPath = (0, path_1.dirname)(instructionFilePath);
        const locations = this.configurationService.getNonExtensionConfig(INSTRUCTIONS_LOCATION_KEY);
        if ((0, types_1.isObject)(locations)) {
            for (const key in locations) {
                const location = key.trim();
                const value = locations[key];
                if (value === true && (0, path_1.isAbsolute)(location)) {
                    const pathToMatch = location.endsWith('/') || location.endsWith('*') ? instructionFolderPath : location;
                    if ((0, glob_1.match)(pathToMatch, location)) {
                        return true;
                    }
                }
            }
        }
        return true;
    }
    getInstructionURLFromExtensionPoint() {
        if (!this._contributedInstructions) {
            const result = new map_1.ResourceSet();
            for (const extension of this.extensionService.all) {
                const chatInstructions = extension.packageJSON['contributes']?.['chatInstructions'];
                if (Array.isArray(chatInstructions)) {
                    for (const contribution of chatInstructions) {
                        if (contribution.path) {
                            const fileUri = (0, resources_1.joinPath)(extension.extensionUri, contribution.path);
                            result.add(fileUri);
                        }
                    }
                }
            }
            this._contributedInstructions = result;
        }
        return this._contributedInstructions;
    }
};
exports.CustomInstructionsService = CustomInstructionsService;
exports.CustomInstructionsService = CustomInstructionsService = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, envService_1.IEnvService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, fileSystemService_1.IFileSystemService),
    __param(4, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(5, logService_1.ILogService),
    __param(6, extensionsService_1.IExtensionsService)
], CustomInstructionsService);
//# sourceMappingURL=customInstructionsService.js.map