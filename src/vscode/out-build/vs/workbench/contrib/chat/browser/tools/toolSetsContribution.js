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
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { observableFromEvent, observableSignalFromEvent, autorun, transaction } from '../../../../../base/common/observable.js';
import { basename, joinPath } from '../../../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { assertType, isObject } from '../../../../../base/common/types.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IUserDataProfileService } from '../../../../services/userDataProfile/common/userDataProfile.js';
import { CHAT_CATEGORY, CHAT_CONFIG_MENU_ID } from '../actions/chatActions.js';
import { ILanguageModelToolsService, ToolDataSource } from '../../common/languageModelToolsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { Codicon, getAllCodicons } from '../../../../../base/common/codicons.js';
import { isValidBasename } from '../../../../../base/common/extpath.js';
import { ITextFileService } from '../../../../services/textfile/common/textfiles.js';
import { parse } from '../../../../../base/common/jsonc.js';
import * as JSONContributionRegistry from '../../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ChatViewId } from '../chat.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
const toolEnumValues = [];
const toolEnumDescriptions = [];
const toolSetSchemaId = 'vscode://schemas/toolsets';
const toolSetsSchema = {
    id: toolSetSchemaId,
    allowComments: true,
    allowTrailingCommas: true,
    defaultSnippets: [{
            label: localize(6323, null),
            body: { '${1:toolSetName}': { 'tools': ['${2:someTool}', '${3:anotherTool}'], 'description': '${4:description}', 'icon': '${5:tools}' } }
        }],
    type: 'object',
    description: localize(6324, null),
    additionalProperties: {
        type: 'object',
        required: ['tools'],
        additionalProperties: false,
        properties: {
            tools: {
                description: localize(6325, null),
                type: 'array',
                minItems: 1,
                items: {
                    type: 'string',
                    enum: toolEnumValues,
                    enumDescriptions: toolEnumDescriptions,
                }
            },
            icon: {
                description: localize(6326, null),
                type: 'string',
                enum: Array.from(getAllCodicons(), icon => icon.id),
                markdownEnumDescriptions: Array.from(getAllCodicons(), icon => `$(${icon.id})`),
            },
            description: {
                description: localize(6327, null),
                type: 'string'
            },
        },
    }
};
const reg = Registry.as(JSONContributionRegistry.Extensions.JSONContribution);
class RawToolSetsShape {
    static { this.suffix = '.toolsets.jsonc'; }
    static isToolSetFileName(uri) {
        return basename(uri).endsWith(RawToolSetsShape.suffix);
    }
    static from(data, logService) {
        if (!isObject(data)) {
            throw new Error(`Invalid tool set data`);
        }
        const map = new Map();
        for (const [name, value] of Object.entries(data)) {
            if (isFalsyOrWhitespace(name)) {
                logService.error(`Tool set name cannot be empty`);
            }
            if (isFalsyOrEmpty(value.tools)) {
                logService.error(`Tool set '${name}' cannot have an empty tools array`);
            }
            map.set(name, {
                name,
                tools: value.tools,
                description: value.description,
                icon: value.icon,
            });
        }
        return new class extends RawToolSetsShape {
        }(map);
    }
    constructor(entries) {
        this.entries = Object.freeze(new Map(entries));
    }
}
let UserToolSetsContributions = class UserToolSetsContributions extends Disposable {
    static { this.ID = 'chat.userToolSets'; }
    constructor(extensionService, lifecycleService, _languageModelToolsService, _userDataProfileService, _fileService, _logService) {
        super();
        this._languageModelToolsService = _languageModelToolsService;
        this._userDataProfileService = _userDataProfileService;
        this._fileService = _fileService;
        this._logService = _logService;
        Promise.allSettled([
            extensionService.whenInstalledExtensionsRegistered,
            lifecycleService.when(3 /* LifecyclePhase.Restored */)
        ]).then(() => this._initToolSets());
        const toolsObs = observableFromEvent(this, _languageModelToolsService.onDidChangeTools, () => Array.from(_languageModelToolsService.getTools()));
        const store = this._store.add(new DisposableStore());
        this._store.add(autorun(r => {
            const tools = toolsObs.read(r);
            const toolSets = this._languageModelToolsService.toolSets.read(r);
            const data = [];
            for (const tool of tools) {
                if (tool.canBeReferencedInPrompt) {
                    data.push({
                        name: tool.toolReferenceName ?? tool.displayName,
                        sourceLabel: ToolDataSource.classify(tool.source).label,
                        sourceOrdinal: ToolDataSource.classify(tool.source).ordinal,
                        description: tool.userDescription ?? tool.modelDescription
                    });
                }
            }
            for (const toolSet of toolSets) {
                data.push({
                    name: toolSet.referenceName,
                    sourceLabel: ToolDataSource.classify(toolSet.source).label,
                    sourceOrdinal: ToolDataSource.classify(toolSet.source).ordinal,
                    description: toolSet.description
                });
            }
            toolEnumValues.length = 0;
            toolEnumDescriptions.length = 0;
            data.sort((a, b) => {
                if (a.sourceOrdinal !== b.sourceOrdinal) {
                    return a.sourceOrdinal - b.sourceOrdinal;
                }
                if (a.sourceLabel !== b.sourceLabel) {
                    return a.sourceLabel.localeCompare(b.sourceLabel);
                }
                return a.name.localeCompare(b.name);
            });
            for (const item of data) {
                toolEnumValues.push(item.name);
                toolEnumDescriptions.push(localize(6328, null, item.sourceLabel, item.name, item.description));
            }
            store.clear(); // reset old schema
            reg.registerSchema(toolSetSchemaId, toolSetsSchema, store);
        }));
    }
    _initToolSets() {
        const promptFolder = observableFromEvent(this, this._userDataProfileService.onDidChangeCurrentProfile, () => this._userDataProfileService.currentProfile.promptsHome);
        const toolsSig = observableSignalFromEvent(this, this._languageModelToolsService.onDidChangeTools);
        const fileEventSig = observableSignalFromEvent(this, Event.filter(this._fileService.onDidFilesChange, e => e.affects(promptFolder.get())));
        const store = this._store.add(new DisposableStore());
        const getFilesInFolder = async (folder) => {
            try {
                return (await this._fileService.resolve(folder)).children ?? [];
            }
            catch (err) {
                return []; // folder does not exist or cannot be read
            }
        };
        this._store.add(autorun(async (r) => {
            store.clear();
            toolsSig.read(r); // SIGNALS
            fileEventSig.read(r);
            const uri = promptFolder.read(r);
            const cts = new CancellationTokenSource();
            store.add(toDisposable(() => cts.dispose(true)));
            const entries = await getFilesInFolder(uri);
            if (cts.token.isCancellationRequested) {
                return;
            }
            for (const entry of entries) {
                if (!entry.isFile || !RawToolSetsShape.isToolSetFileName(entry.resource)) {
                    // not interesting
                    continue;
                }
                // watch this file
                store.add(this._fileService.watch(entry.resource));
                let data;
                try {
                    const content = await this._fileService.readFile(entry.resource, undefined, cts.token);
                    const rawObj = parse(content.value.toString());
                    data = RawToolSetsShape.from(rawObj, this._logService);
                }
                catch (err) {
                    this._logService.error(`Error reading tool set file ${entry.resource.toString()}:`, err);
                    continue;
                }
                if (cts.token.isCancellationRequested) {
                    return;
                }
                for (const [name, value] of data.entries) {
                    const tools = [];
                    const toolSets = [];
                    value.tools.forEach(name => {
                        const tool = this._languageModelToolsService.getToolByName(name);
                        if (tool) {
                            tools.push(tool);
                            return;
                        }
                        const toolSet = this._languageModelToolsService.getToolSetByName(name);
                        if (toolSet) {
                            toolSets.push(toolSet);
                            return;
                        }
                    });
                    if (tools.length === 0 && toolSets.length === 0) {
                        // NO tools in this set
                        continue;
                    }
                    const toolset = this._languageModelToolsService.createToolSet({ type: 'user', file: entry.resource, label: basename(entry.resource) }, `user/${entry.resource.toString()}/${name}`, name, {
                        // toolReferenceName: value.referenceName,
                        icon: value.icon ? ThemeIcon.fromId(value.icon) : undefined,
                        description: value.description
                    });
                    transaction(tx => {
                        store.add(toolset);
                        tools.forEach(tool => store.add(toolset.addTool(tool, tx)));
                        toolSets.forEach(toolSet => store.add(toolset.addToolSet(toolSet, tx)));
                    });
                }
            }
        }));
    }
};
UserToolSetsContributions = __decorate([
    __param(0, IExtensionService),
    __param(1, ILifecycleService),
    __param(2, ILanguageModelToolsService),
    __param(3, IUserDataProfileService),
    __param(4, IFileService),
    __param(5, ILogService)
], UserToolSetsContributions);
export { UserToolSetsContributions };
// ---- actions
export class ConfigureToolSets extends Action2 {
    static { this.ID = 'chat.configureToolSets'; }
    constructor() {
        super({
            id: ConfigureToolSets.ID,
            title: localize2(6335, 'Configure Tool Sets...'),
            shortTitle: localize(6329, null),
            category: CHAT_CATEGORY,
            f1: true,
            precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.Tools.toolsCount.greater(0)),
            menu: {
                id: CHAT_CONFIG_MENU_ID,
                when: ContextKeyExpr.equals('view', ChatViewId),
                order: 11,
                group: '2_level'
            },
        });
    }
    async run(accessor) {
        const toolsService = accessor.get(ILanguageModelToolsService);
        const quickInputService = accessor.get(IQuickInputService);
        const editorService = accessor.get(IEditorService);
        const userDataProfileService = accessor.get(IUserDataProfileService);
        const fileService = accessor.get(IFileService);
        const textFileService = accessor.get(ITextFileService);
        const picks = [];
        picks.push({
            label: localize(6330, null),
            alwaysShow: true,
            iconClass: ThemeIcon.asClassName(Codicon.plus)
        });
        for (const toolSet of toolsService.toolSets.get()) {
            if (toolSet.source.type !== 'user') {
                continue;
            }
            picks.push({
                label: toolSet.referenceName,
                toolset: toolSet,
                tooltip: toolSet.description,
                iconClass: ThemeIcon.asClassName(toolSet.icon)
            });
        }
        const pick = await quickInputService.pick(picks, {
            canPickMany: false,
            placeHolder: localize(6331, null),
        });
        if (!pick) {
            return; // user cancelled
        }
        let resource;
        if (!pick.toolset) {
            const name = await quickInputService.input({
                placeHolder: localize(6332, null),
                validateInput: async (input) => {
                    if (!input) {
                        return localize(6333, null);
                    }
                    if (!isValidBasename(input)) {
                        return localize(6334, null, input);
                    }
                    return undefined;
                }
            });
            if (isFalsyOrWhitespace(name)) {
                return; // user cancelled
            }
            resource = joinPath(userDataProfileService.currentProfile.promptsHome, `${name}${RawToolSetsShape.suffix}`);
            if (!await fileService.exists(resource)) {
                await textFileService.write(resource, [
                    '// Place your tool sets here...',
                    '// Example:',
                    '// {',
                    '// \t"toolSetName": {',
                    '// \t\t"tools": [',
                    '// \t\t\t"someTool",',
                    '// \t\t\t"anotherTool"',
                    '// \t\t],',
                    '// \t\t"description": "description",',
                    '// \t\t"icon": "tools"',
                    '// \t}',
                    '// }',
                ].join('\n'));
            }
        }
        else {
            assertType(pick.toolset.source.type === 'user');
            resource = pick.toolset.source.file;
        }
        await editorService.openEditor({ resource, options: { pinned: true } });
    }
}
//# sourceMappingURL=toolSetsContribution.js.map