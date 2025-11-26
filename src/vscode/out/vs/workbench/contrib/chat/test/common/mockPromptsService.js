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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja1Byb21wdHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9tb2NrUHJvbXB0c1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBVXJFLE1BQU0sT0FBTyxrQkFBa0I7SUFBL0I7UUFJa0IsZ0NBQTJCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUMxRCw0QkFBdUIsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsS0FBSyxDQUFDO1FBRWxFLGlCQUFZLEdBQW1CLEVBQUUsQ0FBQztJQWtDM0MsQ0FBQztJQWhDQSxjQUFjLENBQUMsS0FBcUI7UUFDbkMsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7UUFDMUIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZSxDQUFDLEtBQXdCO1FBQzdDLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMxQixDQUFDO0lBRUQsc0RBQXNEO0lBQ3RELGtCQUFrQixDQUFDLE1BQVcsSUFBUyxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzVFLGVBQWUsQ0FBQyxLQUFVLElBQTZCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUYseUJBQXlCLENBQUMsSUFBaUIsRUFBRSxPQUF1QixFQUFFLEtBQXdCLElBQXFDLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEssZ0JBQWdCLENBQUMsS0FBVSxJQUFvQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLHVCQUF1QixDQUFDLFFBQWdCLElBQWEsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLHlCQUF5QixDQUFDLE9BQWUsRUFBRSxNQUF5QixJQUFrQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNILElBQUksd0JBQXdCLEtBQWtCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbkYsc0JBQXNCLENBQUMsTUFBeUIsSUFBb0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6Ryx5QkFBeUIsQ0FBQyxHQUFRLEVBQUUsTUFBeUIsSUFBcUIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN2SCxLQUFLLENBQUMsSUFBUyxFQUFFLEtBQVUsRUFBRSxNQUF5QixJQUFrQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzdHLFFBQVEsQ0FBQyxJQUFTLEVBQUUsTUFBeUIsSUFBa0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRyxtQkFBbUIsQ0FBQyxTQUFxQixJQUFzQixNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BHLHVCQUF1QixDQUFDLElBQWlCLEVBQUUsSUFBWSxFQUFFLFdBQW1CLEVBQUUsR0FBUSxFQUFFLFNBQWdDLElBQWlCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUssc0JBQXNCLENBQUMsVUFBdUIsSUFBWSxNQUFNLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9GLHVCQUF1QixDQUFDLEtBQXdCLElBQW9CLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekcsWUFBWSxDQUFDLEtBQXdCLElBQW9CLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUYsMEJBQTBCLENBQUMsS0FBd0IsSUFBb0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RywyQkFBMkIsQ0FBQyxNQUFXLElBQXFCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakcsc0JBQXNCLENBQUMsSUFBaUIsSUFBaUIsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0RyxzQkFBc0IsQ0FBQyxJQUFpQixFQUFFLElBQWlCLElBQVUsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsSCxnQkFBZ0IsQ0FBQyxLQUF3QixJQUF5QyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9ILE9BQU8sS0FBVyxDQUFDO0NBQ25CIn0=