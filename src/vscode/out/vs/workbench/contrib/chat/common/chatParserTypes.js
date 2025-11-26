/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { revive } from '../../../../base/common/marshalling.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { OffsetRange } from '../../../../editor/common/core/ranges/offsetRange.js';
import { reviveSerializedAgent } from './chatAgents.js';
import { IDiagnosticVariableEntryFilterData } from './chatVariableEntries.js';
export function getPromptText(request) {
    const message = request.parts.map(r => r.promptText).join('').trimStart();
    const diff = request.text.length - message.length;
    return { message, diff };
}
export class ChatRequestTextPart {
    static { this.Kind = 'text'; }
    constructor(range, editorRange, text) {
        this.range = range;
        this.editorRange = editorRange;
        this.text = text;
        this.kind = ChatRequestTextPart.Kind;
    }
    get promptText() {
        return this.text;
    }
}
// warning, these also show up in a regex in the parser
export const chatVariableLeader = '#';
export const chatAgentLeader = '@';
export const chatSubcommandLeader = '/';
/**
 * An invocation of a static variable that can be resolved by the variable service
 * @deprecated, but kept for backwards compatibility with old persisted chat requests
 */
class ChatRequestVariablePart {
    static { this.Kind = 'var'; }
    constructor(range, editorRange, variableName, variableArg, variableId) {
        this.range = range;
        this.editorRange = editorRange;
        this.variableName = variableName;
        this.variableArg = variableArg;
        this.variableId = variableId;
        this.kind = ChatRequestVariablePart.Kind;
    }
    get text() {
        const argPart = this.variableArg ? `:${this.variableArg}` : '';
        return `${chatVariableLeader}${this.variableName}${argPart}`;
    }
    get promptText() {
        return this.text;
    }
}
/**
 * An invocation of a tool
 */
export class ChatRequestToolPart {
    static { this.Kind = 'tool'; }
    constructor(range, editorRange, toolName, toolId, displayName, icon) {
        this.range = range;
        this.editorRange = editorRange;
        this.toolName = toolName;
        this.toolId = toolId;
        this.displayName = displayName;
        this.icon = icon;
        this.kind = ChatRequestToolPart.Kind;
    }
    get text() {
        return `${chatVariableLeader}${this.toolName}`;
    }
    get promptText() {
        return this.text;
    }
    toVariableEntry() {
        return { kind: 'tool', id: this.toolId, name: this.toolName, range: this.range, value: undefined, icon: ThemeIcon.isThemeIcon(this.icon) ? this.icon : undefined, fullName: this.displayName };
    }
}
/**
 * An invocation of a tool
 */
export class ChatRequestToolSetPart {
    static { this.Kind = 'toolset'; }
    constructor(range, editorRange, id, name, icon, tools) {
        this.range = range;
        this.editorRange = editorRange;
        this.id = id;
        this.name = name;
        this.icon = icon;
        this.tools = tools;
        this.kind = ChatRequestToolSetPart.Kind;
    }
    get text() {
        return `${chatVariableLeader}${this.name}`;
    }
    get promptText() {
        return this.text;
    }
    toVariableEntry() {
        return { kind: 'toolset', id: this.id, name: this.name, range: this.range, icon: this.icon, value: this.tools };
    }
}
/**
 * An invocation of an agent that can be resolved by the agent service
 */
export class ChatRequestAgentPart {
    static { this.Kind = 'agent'; }
    constructor(range, editorRange, agent) {
        this.range = range;
        this.editorRange = editorRange;
        this.agent = agent;
        this.kind = ChatRequestAgentPart.Kind;
    }
    get text() {
        return `${chatAgentLeader}${this.agent.name}`;
    }
    get promptText() {
        return '';
    }
}
/**
 * An invocation of an agent's subcommand
 */
export class ChatRequestAgentSubcommandPart {
    static { this.Kind = 'subcommand'; }
    constructor(range, editorRange, command) {
        this.range = range;
        this.editorRange = editorRange;
        this.command = command;
        this.kind = ChatRequestAgentSubcommandPart.Kind;
    }
    get text() {
        return `${chatSubcommandLeader}${this.command.name}`;
    }
    get promptText() {
        return '';
    }
}
/**
 * An invocation of a standalone slash command
 */
export class ChatRequestSlashCommandPart {
    static { this.Kind = 'slash'; }
    constructor(range, editorRange, slashCommand) {
        this.range = range;
        this.editorRange = editorRange;
        this.slashCommand = slashCommand;
        this.kind = ChatRequestSlashCommandPart.Kind;
    }
    get text() {
        return `${chatSubcommandLeader}${this.slashCommand.command}`;
    }
    get promptText() {
        return `${chatSubcommandLeader}${this.slashCommand.command}`;
    }
}
/**
 * An invocation of a standalone slash command
 */
export class ChatRequestSlashPromptPart {
    static { this.Kind = 'prompt'; }
    constructor(range, editorRange, name) {
        this.range = range;
        this.editorRange = editorRange;
        this.name = name;
        this.kind = ChatRequestSlashPromptPart.Kind;
    }
    get text() {
        return `${chatSubcommandLeader}${this.name}`;
    }
    get promptText() {
        return `${chatSubcommandLeader}${this.name}`;
    }
}
/**
 * An invocation of a dynamic reference like '#file:'
 */
export class ChatRequestDynamicVariablePart {
    static { this.Kind = 'dynamic'; }
    constructor(range, editorRange, text, id, modelDescription, data, fullName, icon, isFile, isDirectory) {
        this.range = range;
        this.editorRange = editorRange;
        this.text = text;
        this.id = id;
        this.modelDescription = modelDescription;
        this.data = data;
        this.fullName = fullName;
        this.icon = icon;
        this.isFile = isFile;
        this.isDirectory = isDirectory;
        this.kind = ChatRequestDynamicVariablePart.Kind;
    }
    get referenceText() {
        return this.text.replace(chatVariableLeader, '');
    }
    get promptText() {
        return this.text;
    }
    toVariableEntry() {
        if (this.id === 'vscode.problems') {
            return IDiagnosticVariableEntryFilterData.toEntry(this.data.filter);
        }
        return { kind: this.isDirectory ? 'directory' : this.isFile ? 'file' : 'generic', id: this.id, name: this.referenceText, range: this.range, value: this.data, fullName: this.fullName, icon: this.icon };
    }
}
export function reviveParsedChatRequest(serialized) {
    return {
        text: serialized.text,
        parts: serialized.parts.map(part => {
            if (part.kind === ChatRequestTextPart.Kind) {
                return new ChatRequestTextPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.text);
            }
            else if (part.kind === ChatRequestVariablePart.Kind) {
                return new ChatRequestVariablePart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.variableName, part.variableArg, part.variableId || '');
            }
            else if (part.kind === ChatRequestToolPart.Kind) {
                return new ChatRequestToolPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.toolName, part.toolId, part.displayName, part.icon);
            }
            else if (part.kind === ChatRequestToolSetPart.Kind) {
                return new ChatRequestToolSetPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.id, part.name, part.icon, part.tools ?? []);
            }
            else if (part.kind === ChatRequestAgentPart.Kind) {
                let agent = part.agent;
                agent = reviveSerializedAgent(agent);
                return new ChatRequestAgentPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, agent);
            }
            else if (part.kind === ChatRequestAgentSubcommandPart.Kind) {
                return new ChatRequestAgentSubcommandPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.command);
            }
            else if (part.kind === ChatRequestSlashCommandPart.Kind) {
                return new ChatRequestSlashCommandPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.slashCommand);
            }
            else if (part.kind === ChatRequestSlashPromptPart.Kind) {
                return new ChatRequestSlashPromptPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.name);
            }
            else if (part.kind === ChatRequestDynamicVariablePart.Kind) {
                return new ChatRequestDynamicVariablePart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.text, part.id, part.modelDescription, revive(part.data), part.fullName, part.icon, part.isFile, part.isDirectory);
            }
            else {
                throw new Error(`Unknown chat request part: ${part.kind}`);
            }
        })
    };
}
export function extractAgentAndCommand(parsed) {
    const agentPart = parsed.parts.find((r) => r instanceof ChatRequestAgentPart);
    const commandPart = parsed.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
    return { agentPart, commandPart };
}
export function formatChatQuestion(chatAgentService, location, prompt, participant = null, command = null) {
    let question = '';
    if (participant && participant !== chatAgentService.getDefaultAgent(location)?.id) {
        const agent = chatAgentService.getAgent(participant);
        if (!agent) {
            // Refers to agent that doesn't exist
            return undefined;
        }
        question += `${chatAgentLeader}${agent.name} `;
        if (command) {
            question += `${chatSubcommandLeader}${command} `;
        }
    }
    return question + prompt;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhcnNlclR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFBhcnNlclR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFnQixXQUFXLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVqRyxPQUFPLEVBQXdELHFCQUFxQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFLOUcsT0FBTyxFQUE4RSxrQ0FBa0MsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBa0IxSixNQUFNLFVBQVUsYUFBYSxDQUFDLE9BQTJCO0lBQ3hELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUMxRSxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO0lBRWxELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDMUIsQ0FBQztBQUVELE1BQU0sT0FBTyxtQkFBbUI7YUFDZixTQUFJLEdBQUcsTUFBTSxBQUFULENBQVU7SUFFOUIsWUFBcUIsS0FBa0IsRUFBVyxXQUFtQixFQUFXLElBQVk7UUFBdkUsVUFBSyxHQUFMLEtBQUssQ0FBYTtRQUFXLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQVcsU0FBSSxH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