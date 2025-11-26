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
import { Emitter, Event } from '../../../../base/common/event.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { codeActionCommandId, refactorCommandId, sourceActionCommandId } from '../../../../editor/contrib/codeAction/browser/codeAction.js';
import { CodeActionKind } from '../../../../editor/contrib/codeAction/common/types.js';
import * as nls from '../../../../nls.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
const createCodeActionsAutoSave = (description) => {
    return {
        type: 'string',
        enum: ['always', 'explicit', 'never', true, false],
        enumDescriptions: [
            nls.localize(6657, null),
            nls.localize(6658, null),
            nls.localize(6659, null),
            nls.localize(6660, null),
            nls.localize(6661, null)
        ],
        default: 'explicit',
        description: description
    };
};
const createNotebookCodeActionsAutoSave = (description) => {
    return {
        type: ['string', 'boolean'],
        enum: ['explicit', 'never', true, false],
        enumDescriptions: [
            nls.localize(6662, null),
            nls.localize(6663, null),
            nls.localize(6664, null),
            nls.localize(6665, null)
        ],
        default: 'explicit',
        description: description
    };
};
const codeActionsOnSaveSchema = {
    oneOf: [
        {
            type: 'object',
            additionalProperties: {
                type: 'string'
            },
        },
        {
            type: 'array',
            items: { type: 'string' }
        }
    ],
    markdownDescription: nls.localize(6666, null, '`#files.autoSave#`'),
    type: ['object', 'array'],
    additionalProperties: {
        type: 'string',
        enum: ['always', 'explicit', 'never', true, false],
    },
    default: {},
    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
};
export const editorConfiguration = Object.freeze({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.codeActionsOnSave': codeActionsOnSaveSchema
    }
});
const notebookCodeActionsOnSaveSchema = {
    oneOf: [
        {
            type: 'object',
            additionalProperties: {
                type: 'string'
            },
        },
        {
            type: 'array',
            items: { type: 'string' }
        }
    ],
    markdownDescription: nls.localize(6667, null, '`#files.autoSave#`'),
    type: 'object',
    additionalProperties: {
        type: ['string', 'boolean'],
        enum: ['explicit', 'never', true, false],
        // enum: ['explicit', 'always', 'never'], -- autosave support needs to be built first
        // nls.localize('always', 'Always triggers Code Actions on save, including autosave, focus, and window change events.'),
    },
    default: {}
};
export const notebookEditorConfiguration = Object.freeze({
    ...editorConfigurationBaseNode,
    properties: {
        'notebook.codeActionsOnSave': notebookCodeActionsOnSaveSchema
    }
});
let CodeActionsContribution = class CodeActionsContribution extends Disposable {
    constructor(keybindingService, languageFeatures) {
        super();
        this.languageFeatures = languageFeatures;
        this._onDidChangeSchemaContributions = this._register(new Emitter());
        this._allProvidedCodeActionKinds = [];
        // TODO: @justschen caching of code actions based on extensions loaded: https://github.com/microsoft/vscode/issues/216019
        this._register(Event.runAndSubscribe(Event.debounce(languageFeatures.codeActionProvider.onDidChange, () => { }, 1000), () => {
            this._allProvidedCodeActionKinds = this.getAllProvidedCodeActionKinds();
            this.updateConfigurationSchema(this._allProvidedCodeActionKinds);
            this._onDidChangeSchemaContributions.fire();
        }));
        this._register(keybindingService.registerSchemaContribution({
            getSchemaAdditions: () => this.getKeybindingSchemaAdditions(),
            onDidChange: this._onDidChangeSchemaContributions.event,
        }));
    }
    getAllProvidedCodeActionKinds() {
        const out = new Map();
        for (const provider of this.languageFeatures.codeActionProvider.allNoModel()) {
            for (const kind of provider.providedCodeActionKinds ?? []) {
                out.set(kind, new HierarchicalKind(kind));
            }
        }
        return Array.from(out.values());
    }
    updateConfigurationSchema(allProvidedKinds) {
        const properties = { ...codeActionsOnSaveSchema.properties };
        const notebookProperties = { ...notebookCodeActionsOnSaveSchema.properties };
        for (const codeActionKind of allProvidedKinds) {
            if (CodeActionKind.Source.contains(codeActionKind) && !properties[codeActionKind.value]) {
                properties[codeActionKind.value] = createCodeActionsAutoSave(nls.localize(6668, null, codeActionKind.value));
                notebookProperties[codeActionKind.value] = createNotebookCodeActionsAutoSave(nls.localize(6669, null, codeActionKind.value));
            }
        }
        codeActionsOnSaveSchema.properties = properties;
        notebookCodeActionsOnSaveSchema.properties = notebookProperties;
        Registry.as(Extensions.Configuration)
            .notifyConfigurationSchemaUpdated(editorConfiguration);
    }
    getKeybindingSchemaAdditions() {
        const conditionalSchema = (command, kinds) => {
            return {
                if: {
                    required: ['command'],
                    properties: {
                        'command': { const: command }
                    }
                },
                then: {
                    properties: {
                        'args': {
                            required: ['kind'],
                            properties: {
                                'kind': {
                                    anyOf: [
                                        { enum: Array.from(kinds) },
                                        { type: 'string' },
                                    ]
                                }
                            }
                        }
                    }
                }
            };
        };
        const filterProvidedKinds = (ofKind) => {
            const out = new Set();
            for (const providedKind of this._allProvidedCodeActionKinds) {
                if (ofKind.contains(providedKind)) {
                    out.add(providedKind.value);
                }
            }
            return Array.from(out);
        };
        return [
            conditionalSchema(codeActionCommandId, filterProvidedKinds(HierarchicalKind.Empty)),
            conditionalSchema(refactorCommandId, filterProvidedKinds(CodeActionKind.Refactor)),
            conditionalSchema(sourceActionCommandId, filterProvidedKinds(CodeActionKind.Source)),
        ];
    }
};
CodeActionsContribution = __decorate([
    __param(0, IKeybindingService),
    __param(1, ILanguageFeaturesService)
], CodeActionsContribution);
export { CodeActionsContribution };
//# sourceMappingURL=codeActionsContribution.js.map