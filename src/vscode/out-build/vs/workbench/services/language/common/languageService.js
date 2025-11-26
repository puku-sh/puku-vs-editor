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
import { localize } from '../../../../nls.js';
import { clearConfiguredLanguageAssociations, registerConfiguredLanguageAssociation } from '../../../../editor/common/services/languagesAssociations.js';
import { joinPath } from '../../../../base/common/resources.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { LanguageService } from '../../../../editor/common/services/languageService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { FILES_ASSOCIATIONS_CONFIG } from '../../../../platform/files/common/files.js';
import { IExtensionService } from '../../extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions } from '../../extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { index } from '../../../../base/common/arrays.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { isString } from '../../../../base/common/types.js';
export const languagesExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languages',
    jsonSchema: {
        description: localize(15567, null),
        type: 'array',
        items: {
            type: 'object',
            defaultSnippets: [{ body: { id: '${1:languageId}', aliases: ['${2:label}'], extensions: ['${3:extension}'], configuration: './language-configuration.json' } }],
            properties: {
                id: {
                    description: localize(15568, null),
                    type: 'string'
                },
                aliases: {
                    description: localize(15569, null),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                extensions: {
                    description: localize(15570, null),
                    default: ['.foo'],
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                filenames: {
                    description: localize(15571, null),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                filenamePatterns: {
                    description: localize(15572, null),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                mimetypes: {
                    description: localize(15573, null),
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                },
                firstLine: {
                    description: localize(15574, null),
                    type: 'string'
                },
                configuration: {
                    description: localize(15575, null),
                    type: 'string',
                    default: './language-configuration.json'
                },
                icon: {
                    type: 'object',
                    description: localize(15576, null),
                    properties: {
                        light: {
                            description: localize(15577, null),
                            type: 'string'
                        },
                        dark: {
                            description: localize(15578, null),
                            type: 'string'
                        }
                    }
                }
            }
        }
    },
    activationEventsGenerator: function* (languageContributions) {
        for (const languageContribution of languageContributions) {
            if (languageContribution.id && languageContribution.configuration) {
                yield `onLanguage:${languageContribution.id}`;
            }
        }
    }
});
class LanguageTableRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.languages;
    }
    render(manifest) {
        const contributes = manifest.contributes;
        const rawLanguages = contributes?.languages || [];
        const languages = [];
        for (const l of rawLanguages) {
            if (isValidLanguageExtensionPoint(l)) {
                languages.push({
                    id: l.id,
                    name: (l.aliases || [])[0] || l.id,
                    extensions: l.extensions || [],
                    hasGrammar: false,
                    hasSnippets: false
                });
            }
        }
        const byId = index(languages, l => l.id);
        const grammars = contributes?.grammars || [];
        grammars.forEach(grammar => {
            if (!isString(grammar.language)) {
                // ignore the grammars that are only used as includes in other grammars
                return;
            }
            let language = byId[grammar.language];
            if (language) {
                language.hasGrammar = true;
            }
            else {
                language = { id: grammar.language, name: grammar.language, extensions: [], hasGrammar: true, hasSnippets: false };
                byId[language.id] = language;
                languages.push(language);
            }
        });
        const snippets = contributes?.snippets || [];
        snippets.forEach(snippet => {
            if (!isString(snippet.language)) {
                // ignore invalid snippets
                return;
            }
            let language = byId[snippet.language];
            if (language) {
                language.hasSnippets = true;
            }
            else {
                language = { id: snippet.language, name: snippet.language, extensions: [], hasGrammar: false, hasSnippets: true };
                byId[language.id] = language;
                languages.push(language);
            }
        });
        if (!languages.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize(15579, null),
            localize(15580, null),
            localize(15581, null),
            localize(15582, null),
            localize(15583, null)
        ];
        const rows = languages.sort((a, b) => a.id.localeCompare(b.id))
            .map(l => {
            return [
                l.id, l.name,
                new MarkdownString().appendMarkdown(`${l.extensions.map(e => `\`${e}\``).join('&nbsp;')}`),
                l.hasGrammar ? '✔︎' : '\u2014',
                l.hasSnippets ? '✔︎' : '\u2014'
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
    id: 'languages',
    label: localize(15584, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(LanguageTableRenderer),
});
let WorkbenchLanguageService = class WorkbenchLanguageService extends LanguageService {
    constructor(extensionService, configurationService, environmentService, logService) {
        super(environmentService.verbose || environmentService.isExtensionDevelopment || !environmentService.isBuilt);
        this.logService = logService;
        this._configurationService = configurationService;
        this._extensionService = extensionService;
        languagesExtPoint.setHandler((extensions) => {
            const allValidLanguages = [];
            for (let i = 0, len = extensions.length; i < len; i++) {
                const extension = extensions[i];
                if (!Array.isArray(extension.value)) {
                    extension.collector.error(localize(15585, null, languagesExtPoint.name));
                    continue;
                }
                for (let j = 0, lenJ = extension.value.length; j < lenJ; j++) {
                    const ext = extension.value[j];
                    if (isValidLanguageExtensionPoint(ext, extension.collector)) {
                        let configuration = undefined;
                        if (ext.configuration) {
                            configuration = joinPath(extension.description.extensionLocation, ext.configuration);
                        }
                        allValidLanguages.push({
                            id: ext.id,
                            extensions: ext.extensions,
                            filenames: ext.filenames,
                            filenamePatterns: ext.filenamePatterns,
                            firstLine: ext.firstLine,
                            aliases: ext.aliases,
                            mimetypes: ext.mimetypes,
                            configuration: configuration,
                            icon: ext.icon && {
                                light: joinPath(extension.description.extensionLocation, ext.icon.light),
                                dark: joinPath(extension.description.extensionLocation, ext.icon.dark)
                            }
                        });
                    }
                }
            }
            this._registry.setDynamicLanguages(allValidLanguages);
        });
        this.updateMime();
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(FILES_ASSOCIATIONS_CONFIG)) {
                this.updateMime();
            }
        }));
        this._extensionService.whenInstalledExtensionsRegistered().then(() => {
            this.updateMime();
        });
        this._register(this.onDidRequestRichLanguageFeatures((languageId) => {
            // extension activation
            this._extensionService.activateByEvent(`onLanguage:${languageId}`);
            this._extensionService.activateByEvent(`onLanguage`);
        }));
    }
    updateMime() {
        const configuration = this._configurationService.getValue();
        // Clear user configured mime associations
        clearConfiguredLanguageAssociations();
        // Register based on settings
        if (configuration.files?.associations) {
            Object.keys(configuration.files.associations).forEach(pattern => {
                const langId = configuration.files.associations[pattern];
                if (typeof langId !== 'string') {
                    this.logService.warn(`Ignoring configured 'files.associations' for '${pattern}' because its type is not a string but '${typeof langId}'`);
                    return; // https://github.com/microsoft/vscode/issues/147284
                }
                const mimeType = this.getMimeType(langId) || `text/x-${langId}`;
                registerConfiguredLanguageAssociation({ id: langId, mime: mimeType, filepattern: pattern });
            });
        }
        this._onDidChange.fire();
    }
};
WorkbenchLanguageService = __decorate([
    __param(0, IExtensionService),
    __param(1, IConfigurationService),
    __param(2, IEnvironmentService),
    __param(3, ILogService)
], WorkbenchLanguageService);
export { WorkbenchLanguageService };
function isUndefinedOrStringArray(value) {
    if (typeof value === 'undefined') {
        return true;
    }
    if (!Array.isArray(value)) {
        return false;
    }
    return value.every(item => typeof item === 'string');
}
function isValidLanguageExtensionPoint(value, collector) {
    if (!value) {
        collector?.error(localize(15586, null, languagesExtPoint.name));
        return false;
    }
    if (typeof value.id !== 'string') {
        collector?.error(localize(15587, null, 'id'));
        return false;
    }
    if (!isUndefinedOrStringArray(value.extensions)) {
        collector?.error(localize(15588, null, 'extensions'));
        return false;
    }
    if (!isUndefinedOrStringArray(value.filenames)) {
        collector?.error(localize(15589, null, 'filenames'));
        return false;
    }
    if (typeof value.firstLine !== 'undefined' && typeof value.firstLine !== 'string') {
        collector?.error(localize(15590, null, 'firstLine'));
        return false;
    }
    if (typeof value.configuration !== 'undefined' && typeof value.configuration !== 'string') {
        collector?.error(localize(15591, null, 'configuration'));
        return false;
    }
    if (!isUndefinedOrStringArray(value.aliases)) {
        collector?.error(localize(15592, null, 'aliases'));
        return false;
    }
    if (!isUndefinedOrStringArray(value.mimetypes)) {
        collector?.error(localize(15593, null, 'mimetypes'));
        return false;
    }
    if (typeof value.icon !== 'undefined') {
        if (typeof value.icon !== 'object' || typeof value.icon.light !== 'string' || typeof value.icon.dark !== 'string') {
            collector?.error(localize(15594, null, 'icon', 'light', 'dark'));
            return false;
        }
    }
    return true;
}
registerSingleton(ILanguageService, WorkbenchLanguageService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=languageService.js.map