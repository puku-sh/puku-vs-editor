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
import { localize } from '../../../../../nls.js';
import * as extensionsRegistry from '../../../../services/extensions/common/extensionsRegistry.js';
import { joinPath, isEqualOrParent } from '../../../../../base/common/resources.js';
import { IPromptsService } from './service/promptsService.js';
import { PromptsType } from './promptTypes.js';
import { DisposableMap } from '../../../../../base/common/lifecycle.js';
function registerChatFilesExtensionPoint(point) {
    return extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
        extensionPoint: point,
        jsonSchema: {
            description: localize('chatContribution.schema.description', 'Contributes {0} for chat prompts.', point),
            type: 'array',
            items: {
                additionalProperties: false,
                type: 'object',
                defaultSnippets: [{
                        body: {
                            name: 'exampleName',
                            path: './relative/path/to/file.md',
                            description: 'Optional description'
                        }
                    }],
                required: ['name', 'path'],
                properties: {
                    name: {
                        description: localize('chatContribution.property.name', 'Identifier for this file. Must be unique within this extension for this contribution point.'),
                        type: 'string',
                        pattern: '^[\\w.-]+$'
                    },
                    path: {
                        description: localize('chatContribution.property.path', 'Path to the file relative to the extension root.'),
                        type: 'string'
                    },
                    description: {
                        description: localize('chatContribution.property.description', '(Optional) Description of the file.'),
                        type: 'string'
                    }
                }
            }
        }
    });
}
const epPrompt = registerChatFilesExtensionPoint('chatPromptFiles');
const epInstructions = registerChatFilesExtensionPoint('chatInstructions');
const epAgents = registerChatFilesExtensionPoint('chatAgents');
function pointToType(contributionPoint) {
    switch (contributionPoint) {
        case 'chatPromptFiles': return PromptsType.prompt;
        case 'chatInstructions': return PromptsType.instructions;
        case 'chatAgents': return PromptsType.agent;
    }
}
function key(extensionId, type, name) {
    return `${extensionId.value}/${type}/${name}`;
}
let ChatPromptFilesExtensionPointHandler = class ChatPromptFilesExtensionPointHandler {
    static { this.ID = 'workbench.contrib.chatPromptFilesExtensionPointHandler'; }
    constructor(promptsService) {
        this.promptsService = promptsService;
        this.registrations = new DisposableMap();
        this.handle(epPrompt, 'chatPromptFiles');
        this.handle(epInstructions, 'chatInstructions');
        this.handle(epAgents, 'chatAgents');
    }
    handle(extensionPoint, contributionPoint) {
        extensionPoint.setHandler((_extensions, delta) => {
            for (const ext of delta.added) {
                const type = pointToType(contributionPoint);
                for (const raw of ext.value) {
                    if (!raw.name || !raw.name.match(/^[\w.-]+$/)) {
                        ext.collector.error(localize('extension.invalid.name', "Extension '{0}' cannot register {1} entry with invalid name '{2}'.", ext.description.identifier.value, contributionPoint, raw.name));
                        continue;
                    }
                    if (!raw.path) {
                        ext.collector.error(localize('extension.missing.path', "Extension '{0}' cannot register {1} entry '{2}' without path.", ext.description.identifier.value, contributionPoint, raw.name));
                        continue;
                    }
                    if (!raw.description) {
                        ext.collector.error(localize('extension.missing.description', "Extension '{0}' cannot register {1} entry '{2}' without description.", ext.description.identifier.value, contributionPoint, raw.name));
                        continue;
                    }
                    const fileUri = joinPath(ext.description.extensionLocation, raw.path);
                    if (!isEqualOrParent(fileUri, ext.description.extensionLocation)) {
                        ext.collector.error(localize('extension.invalid.path', "Extension '{0}' {1} entry '{2}' path resolves outside the extension.", ext.description.identifier.value, contributionPoint, raw.name));
                        continue;
                    }
                    try {
                        const d = this.promptsService.registerContributedFile(type, raw.name, raw.description, fileUri, ext.description);
                        this.registrations.set(key(ext.description.identifier, type, raw.name), d);
                    }
                    catch (e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        ext.collector.error(localize('extension.registration.failed', "Failed to register {0} entry '{1}': {2}", contributionPoint, raw.name, msg));
                    }
                }
            }
            for (const ext of delta.removed) {
                const type = pointToType(contributionPoint);
                for (const raw of ext.value) {
                    this.registrations.deleteAndDispose(key(ext.description.identifier, type, raw.name));
                }
            }
        });
    }
};
ChatPromptFilesExtensionPointHandler = __decorate([
    __param(0, IPromptsService)
], ChatPromptFilesExtensionPointHandler);
export { ChatPromptFilesExtensionPointHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdEZpbGVzQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NoYXRQcm9tcHRGaWxlc0NvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFakQsT0FBTyxLQUFLLGtCQUFrQixNQUFNLDhEQUE4RCxDQUFDO0FBRW5HLE9BQU8sRUFBRSxRQUFRLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFVeEUsU0FBUywrQkFBK0IsQ0FBQyxLQUE0QjtJQUNwRSxPQUFPLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUE2QjtRQUMvRixjQUFjLEVBQUUsS0FBSztRQUNyQixVQUFVLEVBQUU7WUFDWCxXQUFXLEVBQUUsUUFBUSxDQUFDLHFDQUFxQyxFQUFFLG1DQUFtQyxFQUFFLEtBQUssQ0FBQztZQUN4RyxJQUFJLEVBQUUsT0FBTztZQUNiLEtBQUssRUFBRTtnQkFDTixvQkFBb0IsRUFBRSxLQUFLO2dCQUMzQixJQUFJLEVBQUUsUUFBUTtnQkFDZCxlQUFlLEVBQUUsQ0FBQzt3QkFDakIsSUFBSSxFQUFFOzRCQUNMLElBQUksRUFBRSxhQUFhOzRCQUNuQixJQUFJLEVBQUUsNEJBQTRCOzRCQUNsQyxXQUFXLEVBQUUsc0JB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