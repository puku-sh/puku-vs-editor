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
            description: localize(6457, null, point),
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
                        description: localize(6458, null),
                        type: 'string',
                        pattern: '^[\\w.-]+$'
                    },
                    path: {
                        description: localize(6459, null),
                        type: 'string'
                    },
                    description: {
                        description: localize(6460, null),
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
                        ext.collector.error(localize(6461, null, ext.description.identifier.value, contributionPoint, raw.name));
                        continue;
                    }
                    if (!raw.path) {
                        ext.collector.error(localize(6462, null, ext.description.identifier.value, contributionPoint, raw.name));
                        continue;
                    }
                    if (!raw.description) {
                        ext.collector.error(localize(6463, null, ext.description.identifier.value, contributionPoint, raw.name));
                        continue;
                    }
                    const fileUri = joinPath(ext.description.extensionLocation, raw.path);
                    if (!isEqualOrParent(fileUri, ext.description.extensionLocation)) {
                        ext.collector.error(localize(6464, null, ext.description.identifier.value, contributionPoint, raw.name));
                        continue;
                    }
                    try {
                        const d = this.promptsService.registerContributedFile(type, raw.name, raw.description, fileUri, ext.description);
                        this.registrations.set(key(ext.description.identifier, type, raw.name), d);
                    }
                    catch (e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        ext.collector.error(localize(6465, null, contributionPoint, raw.name, msg));
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
//# sourceMappingURL=chatPromptFilesContribution.js.map