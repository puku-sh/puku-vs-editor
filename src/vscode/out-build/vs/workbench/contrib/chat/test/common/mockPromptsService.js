/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
export class MockPromptsService {
    constructor() {
        this._onDidChangeCustomChatModes = new Emitter();
        this.onDidChangeCustomAgents = this._onDidChangeCustomChatModes.event;
        this._customModes = [];
    }
    setCustomModes(modes) {
        this._customModes = modes;
        this._onDidChangeCustomChatModes.fire();
    }
    async getCustomAgents(token) {
        return this._customModes;
    }
    // Stub implementations for required interface methods
    getSyntaxParserFor(_model) { throw new Error('Not implemented'); }
    listPromptFiles(_type) { throw new Error('Not implemented'); }
    listPromptFilesForStorage(type, storage, token) { throw new Error('Not implemented'); }
    getSourceFolders(_type) { throw new Error('Not implemented'); }
    isValidSlashCommandName(_command) { return false; }
    resolvePromptSlashCommand(command, _token) { throw new Error('Not implemented'); }
    get onDidChangeSlashCommands() { throw new Error('Not implemented'); }
    getPromptSlashCommands(_token) { throw new Error('Not implemented'); }
    getPromptSlashCommandName(uri, _token) { throw new Error('Not implemented'); }
    parse(_uri, _type, _token) { throw new Error('Not implemented'); }
    parseNew(_uri, _token) { throw new Error('Not implemented'); }
    getParsedPromptFile(textModel) { throw new Error('Not implemented'); }
    registerContributedFile(type, name, description, uri, extension) { throw new Error('Not implemented'); }
    getPromptLocationLabel(promptPath) { throw new Error('Not implemented'); }
    findAgentMDsInWorkspace(token) { throw new Error('Not implemented'); }
    listAgentMDs(token) { throw new Error('Not implemented'); }
    listCopilotInstructionsMDs(token) { throw new Error('Not implemented'); }
    getAgentFileURIFromModeFile(oldURI) { throw new Error('Not implemented'); }
    getDisabledPromptFiles(type) { throw new Error('Method not implemented.'); }
    setDisabledPromptFiles(type, uris) { throw new Error('Method not implemented.'); }
    findClaudeSkills(token) { throw new Error('Method not implemented.'); }
    dispose() { }
}
//# sourceMappingURL=mockPromptsService.js.map