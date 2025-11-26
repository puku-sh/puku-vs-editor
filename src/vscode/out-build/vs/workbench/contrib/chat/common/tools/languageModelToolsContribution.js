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
import { isFalsyOrEmpty } from '../../../../../base/common/arrays.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { transaction } from '../../../../../base/common/observable.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../services/extensionManagement/common/extensionFeatures.js';
import { isProposedApiEnabled } from '../../../../services/extensions/common/extensions.js';
import * as extensionsRegistry from '../../../../services/extensions/common/extensionsRegistry.js';
import { ILanguageModelToolsService, ToolDataSource } from '../languageModelToolsService.js';
import { toolsParametersSchemaSchemaId } from './languageModelToolsParametersSchema.js';
const languageModelToolsExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languageModelTools',
    activationEventsGenerator: function* (contributions) {
        for (const contrib of contributions) {
            yield `onLanguageModelTool:${contrib.name}`;
        }
    },
    jsonSchema: {
        description: localize(6562, null),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{
                    body: {
                        name: '${1}',
                        modelDescription: '${2}',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                '${3:name}': {
                                    type: 'string',
                                    description: '${4:description}'
                                }
                            }
                        },
                    }
                }],
            required: ['name', 'displayName', 'modelDescription'],
            properties: {
                name: {
                    description: localize(6563, null),
                    type: 'string',
                    // [\\w-]+ is OpenAI's requirement for tool names
                    pattern: '^(?!copilot_|vscode_)[\\w-]+$'
                },
                toolReferenceName: {
                    markdownDescription: localize(6564, null, '`canBeReferencedInPrompt`'),
                    type: 'string',
                    pattern: '^[\\w-]+$'
                },
                legacyToolReferenceFullNames: {
                    markdownDescription: localize(6565, null),
                    type: 'array',
                    items: {
                        type: 'string',
                        pattern: '^[\\w-]+(/[\\w-]+)?$'
                    }
                },
                displayName: {
                    description: localize(6566, null),
                    type: 'string'
                },
                userDescription: {
                    description: localize(6567, null),
                    type: 'string'
                },
                // eslint-disable-next-line local/code-no-localized-model-description
                modelDescription: {
                    description: localize(6568, null),
                    type: 'string'
                },
                inputSchema: {
                    description: localize(6569, null),
                    $ref: toolsParametersSchemaSchemaId
                },
                canBeReferencedInPrompt: {
                    markdownDescription: localize(6570, null, '`ChatRequest#toolReferences`'),
                    type: 'boolean'
                },
                icon: {
                    markdownDescription: localize(6571, null),
                    anyOf: [{
                            type: 'string'
                        },
                        {
                            type: 'object',
                            properties: {
                                light: {
                                    description: localize(6572, null),
                                    type: 'string'
                                },
                                dark: {
                                    description: localize(6573, null),
                                    type: 'string'
                                }
                            }
                        }]
                },
                when: {
                    markdownDescription: localize(6574, null),
                    type: 'string'
                },
                tags: {
                    description: localize(6575, null),
                    type: 'array',
                    items: {
                        type: 'string',
                        pattern: '^(?!copilot_|vscode_)'
                    }
                }
            }
        }
    }
});
const languageModelToolSetsExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languageModelToolSets',
    deps: [languageModelToolsExtensionPoint],
    jsonSchema: {
        description: localize(6576, null),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{
                    body: {
                        name: '${1}',
                        description: '${2}',
                        tools: ['${3}']
                    }
                }],
            required: ['name', 'description', 'tools'],
            properties: {
                name: {
                    description: localize(6577, null),
                    type: 'string',
                    pattern: '^[\\w-]+$'
                },
                legacyFullNames: {
                    markdownDescription: localize(6578, null),
                    type: 'array',
                    items: {
                        type: 'string',
                        pattern: '^[\\w-]+$'
                    }
                },
                description: {
                    description: localize(6579, null),
                    type: 'string'
                },
                icon: {
                    markdownDescription: localize(6580, null),
                    type: 'string'
                },
                tools: {
                    markdownDescription: localize(6581, null),
                    type: 'array',
                    minItems: 1,
                    items: {
                        type: 'string'
                    }
                }
            }
        }
    }
});
function toToolKey(extensionIdentifier, toolName) {
    return `${extensionIdentifier.value}/${toolName}`;
}
function toToolSetKey(extensionIdentifier, toolName) {
    return `toolset:${extensionIdentifier.value}/${toolName}`;
}
let LanguageModelToolsExtensionPointHandler = class LanguageModelToolsExtensionPointHandler {
    static { this.ID = 'workbench.contrib.toolsExtensionPointHandler'; }
    constructor(productService, languageModelToolsService) {
        this._registrationDisposables = new DisposableMap();
        languageModelToolsExtensionPoint.setHandler((_extensions, delta) => {
            for (const extension of delta.added) {
                for (const rawTool of extension.value) {
                    if (!rawTool.name || !rawTool.modelDescription || !rawTool.displayName) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register tool without name, modelDescription, and displayName: ${JSON.stringify(rawTool)}`);
                        continue;
                    }
                    if (!rawTool.name.match(/^[\w-]+$/)) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with invalid id: ${rawTool.name}. The id must match /^[\\w-]+$/.`);
                        continue;
                    }
                    if (rawTool.canBeReferencedInPrompt && !rawTool.toolReferenceName) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with 'canBeReferencedInPrompt' set without a 'toolReferenceName': ${JSON.stringify(rawTool)}`);
                        continue;
                    }
                    if ((rawTool.name.startsWith('copilot_') || rawTool.name.startsWith('vscode_')) && !isProposedApiEnabled(extension.description, 'chatParticipantPrivate')) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with name starting with "vscode_" or "copilot_"`);
                        continue;
                    }
                    if (rawTool.tags?.some(tag => tag.startsWith('copilot_') || tag.startsWith('vscode_')) && !isProposedApiEnabled(extension.description, 'chatParticipantPrivate')) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register tool with tags starting with "vscode_" or "copilot_"`);
                    }
                    if (rawTool.legacyToolReferenceFullNames && !isProposedApiEnabled(extension.description, 'chatParticipantPrivate')) {
                        extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT use 'legacyToolReferenceFullNames' without the 'chatParticipantPrivate' API proposal enabled`);
                        continue;
                    }
                    const rawIcon = rawTool.icon;
                    let icon;
                    if (typeof rawIcon === 'string') {
                        icon = ThemeIcon.fromString(rawIcon) ?? {
                            dark: joinPath(extension.description.extensionLocation, rawIcon),
                            light: joinPath(extension.description.extensionLocation, rawIcon)
                        };
                    }
                    else if (rawIcon) {
                        icon = {
                            dark: joinPath(extension.description.extensionLocation, rawIcon.dark),
                            light: joinPath(extension.description.extensionLocation, rawIcon.light)
                        };
                    }
                    // If OSS and the product.json is not set up, fall back to checking api proposal
                    const isBuiltinTool = productService.defaultChatAgent?.chatExtensionId ?
                        ExtensionIdentifier.equals(extension.description.identifier, productService.defaultChatAgent.chatExtensionId) :
                        isProposedApiEnabled(extension.description, 'chatParticipantPrivate');
                    const source = isBuiltinTool
                        ? ToolDataSource.Internal
                        : { type: 'extension', label: extension.description.displayName ?? extension.description.name, extensionId: extension.description.identifier };
                    const tool = {
                        ...rawTool,
                        source,
                        inputSchema: rawTool.inputSchema,
                        id: rawTool.name,
                        icon,
                        when: rawTool.when ? ContextKeyExpr.deserialize(rawTool.when) : undefined,
                        alwaysDisplayInputOutput: !isBuiltinTool,
                    };
                    try {
                        const disposable = languageModelToolsService.registerToolData(tool);
                        this._registrationDisposables.set(toToolKey(extension.description.identifier, rawTool.name), disposable);
                    }
                    catch (e) {
                        extension.collector.error(`Failed to register tool '${rawTool.name}': ${e}`);
                    }
                }
            }
            for (const extension of delta.removed) {
                for (const tool of extension.value) {
                    this._registrationDisposables.deleteAndDispose(toToolKey(extension.description.identifier, tool.name));
                }
            }
        });
        languageModelToolSetsExtensionPoint.setHandler((_extensions, delta) => {
            for (const extension of delta.added) {
                if (!isProposedApiEnabled(extension.description, 'contribLanguageModelToolSets')) {
                    extension.collector.error(`Extension '${extension.description.identifier.value}' CANNOT register language model tools because the 'contribLanguageModelToolSets' API proposal is not enabled.`);
                    continue;
                }
                const isBuiltinTool = productService.defaultChatAgent?.chatExtensionId ?
                    ExtensionIdentifier.equals(extension.description.identifier, productService.defaultChatAgent.chatExtensionId) :
                    isProposedApiEnabled(extension.description, 'chatParticipantPrivate');
                const source = isBuiltinTool
                    ? ToolDataSource.Internal
                    : { type: 'extension', label: extension.description.displayName ?? extension.description.name, extensionId: extension.description.identifier };
                for (const toolSet of extension.value) {
                    if (isFalsyOrWhitespace(toolSet.name)) {
                        extension.collector.error(`Tool set '${toolSet.name}' CANNOT have an empty name`);
                        continue;
                    }
                    if (toolSet.legacyFullNames && !isProposedApiEnabled(extension.description, 'contribLanguageModelToolSets')) {
                        extension.collector.error(`Tool set '${toolSet.name}' CANNOT use 'legacyFullNames' without the 'contribLanguageModelToolSets' API proposal enabled`);
                        continue;
                    }
                    if (isFalsyOrEmpty(toolSet.tools)) {
                        extension.collector.error(`Tool set '${toolSet.name}' CANNOT have an empty tools array`);
                        continue;
                    }
                    const tools = [];
                    const toolSets = [];
                    for (const toolName of toolSet.tools) {
                        const toolObj = languageModelToolsService.getToolByName(toolName, true);
                        if (toolObj) {
                            tools.push(toolObj);
                            continue;
                        }
                        const toolSetObj = languageModelToolsService.getToolSetByName(toolName);
                        if (toolSetObj) {
                            toolSets.push(toolSetObj);
                            continue;
                        }
                        extension.collector.warn(`Tool set '${toolSet.name}' CANNOT find tool or tool set by name: ${toolName}`);
                    }
                    if (toolSets.length === 0 && tools.length === 0) {
                        extension.collector.error(`Tool set '${toolSet.name}' CANNOT have an empty tools array (none of the tools were found)`);
                        continue;
                    }
                    const store = new DisposableStore();
                    const referenceName = toolSet.referenceName ?? toolSet.name;
                    const existingToolSet = languageModelToolsService.getToolSetByName(referenceName);
                    const mergeExisting = isBuiltinTool && existingToolSet?.source === ToolDataSource.Internal;
                    let obj;
                    // Allow built-in tool to update the tool set if it already exists
                    if (mergeExisting) {
                        obj = existingToolSet;
                    }
                    else {
                        obj = languageModelToolsService.createToolSet(source, toToolSetKey(extension.description.identifier, toolSet.name), referenceName, { icon: toolSet.icon ? ThemeIcon.fromString(toolSet.icon) : undefined, description: toolSet.description, legacyFullNames: toolSet.legacyFullNames });
                    }
                    transaction(tx => {
                        if (!mergeExisting) {
                            store.add(obj);
                        }
                        tools.forEach(tool => store.add(obj.addTool(tool, tx)));
                        toolSets.forEach(toolSet => store.add(obj.addToolSet(toolSet, tx)));
                    });
                    this._registrationDisposables.set(toToolSetKey(extension.description.identifier, toolSet.name), store);
                }
            }
            for (const extension of delta.removed) {
                for (const toolSet of extension.value) {
                    this._registrationDisposables.deleteAndDispose(toToolSetKey(extension.description.identifier, toolSet.name));
                }
            }
        });
    }
};
LanguageModelToolsExtensionPointHandler = __decorate([
    __param(0, IProductService),
    __param(1, ILanguageModelToolsService)
], LanguageModelToolsExtensionPointHandler);
export { LanguageModelToolsExtensionPointHandler };
// --- render
class LanguageModelToolDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.languageModelTools;
    }
    render(manifest) {
        const contribs = manifest.contributes?.languageModelTools ?? [];
        if (!contribs.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize(6582, null),
            localize(6583, null),
            localize(6584, null),
        ];
        const rows = contribs.map(t => {
            return [
                new MarkdownString(`\`${t.name}\``),
                t.displayName,
                t.userDescription ?? t.modelDescription,
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'languageModelTools',
    label: localize(6585, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(LanguageModelToolDataRenderer),
});
class LanguageModelToolSetDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.languageModelToolSets;
    }
    render(manifest) {
        const contribs = manifest.contributes?.languageModelToolSets ?? [];
        if (!contribs.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize(6586, null),
            localize(6587, null),
            localize(6588, null),
            localize(6589, null),
        ];
        const rows = contribs.map(t => {
            return [
                new MarkdownString(`\`${t.name}\``),
                t.referenceName ? new MarkdownString(`\`#${t.referenceName}\``) : 'none',
                t.tools.join(', '),
                t.description,
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'languageModelToolSets',
    label: localize(6590, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(LanguageModelToolSetDataRenderer),
});
//# sourceMappingURL=languageModelToolsContribution.js.map