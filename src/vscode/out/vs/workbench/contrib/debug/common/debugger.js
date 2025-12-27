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
import * as nls from '../../../../nls.js';
import { isObject } from '../../../../base/common/types.js';
import { IDebugService, debuggerDisabledMessage, DebugConfigurationProviderTriggerKind } from './debug.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import * as ConfigurationResolverUtils from '../../../services/configurationResolver/common/configurationResolverUtils.js';
import { ITextResourcePropertiesService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { URI } from '../../../../base/common/uri.js';
import { Schemas } from '../../../../base/common/network.js';
import { isDebuggerMainContribution } from './debugUtils.js';
import { cleanRemoteAuthority } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { filter } from '../../../../base/common/objects.js';
let Debugger = class Debugger {
    constructor(adapterManager, dbgContribution, extensionDescription, configurationService, resourcePropertiesService, configurationResolverService, environmentService, debugService, contextKeyService) {
        this.adapterManager = adapterManager;
        this.configurationService = configurationService;
        this.resourcePropertiesService = resourcePropertiesService;
        this.configurationResolverService = configurationResolverService;
        this.environmentService = environmentService;
        this.debugService = debugService;
        this.contextKeyService = contextKeyService;
        this.mergedExtensionDescriptions = [];
        this.debuggerContribution = { type: dbgContribution.type };
        this.merge(dbgContribution, extensionDescription);
        this.debuggerWhen = typeof this.debuggerContribution.when === 'string' ? ContextKeyExpr.deserialize(this.debuggerContribution.when) : undefined;
        this.debuggerHiddenWhen = typeof this.debuggerContribution.hiddenWhen === 'string' ? ContextKeyExpr.deserialize(this.debuggerContribution.hiddenWhen) : undefined;
    }
    merge(otherDebuggerContribution, extensionDescription) {
        /**
         * Copies all properties of source into destination. The optional parameter "overwrite" allows to control
         * if existing non-structured properties on the destination should be overwritten or not. Defaults to true (overwrite).
         */
        function mixin(destination, source, overwrite, level = 0) {
            if (!isObject(destination)) {
                return source;
            }
            if (isObject(source)) {
                Object.keys(source).forEach(key => {
                    if (key !== '__proto__') {
                        if (isObject(destination[key]) && isObject(source[key])) {
                            mixin(destination[key], source[key], overwrite, level + 1);
                        }
                        else {
                            if (key in destination) {
                                if (overwrite) {
                                    if (level === 0 && key === 'type') {
                                        // don't merge the 'type' property
                                    }
                                    else {
                                        destination[key] = source[key];
                                    }
                                }
                            }
                            else {
                                destination[key] = source[key];
                            }
                        }
                    }
                });
            }
            return destination;
        }
        // only if not already merged
        if (this.mergedExtensionDescriptions.indexOf(extensionDescription) < 0) {
            // remember all extensions that have been merged for this debugger
            this.mergedExtensionDescriptions.push(extensionDescription);
            // merge new debugger contribution into existing contributions (and don't overwrite values in built-in extensions)
            mixin(this.debuggerContribution, otherDebuggerContribution, extensionDescription.isBuiltin);
            // remember the extension that is considered the "main" debugger contribution
            if (isDebuggerMainContribution(otherDebuggerContribution)) {
                this.mainExtensionDescription = extensionDescription;
            }
        }
    }
    async startDebugging(configuration, parentSessionId) {
        const parentSession = this.debugService.getModel().getSession(parentSessionId);
        return await this.debugService.startDebugging(undefined, configuration, { parentSession }, undefined);
    }
    async createDebugAdapter(session) {
        await this.adapterManager.activateDebuggers('onDebugAdapterProtocolTracker', this.type);
        const da = this.adapterManager.createDebugAdapter(session);
        if (da) {
            return Promise.resolve(da);
        }
        throw new Error(nls.localize('cannot.find.da', "Cannot find debug adapter for type '{0}'.", this.type));
    }
    async substituteVariables(folder, config) {
        const substitutedConfig = await this.adapterManager.substituteVariables(this.type, folder, config);
        return await this.configurationResolverService.resolveWithInteractionReplace(folder, substitutedConfig, 'launch', this.variables, substitutedConfig.__configurationTarget);
    }
    runInTerminal(args, sessionId) {
        return this.adapterManager.runInTerminal(this.type, args, sessionId);
    }
    get label() {
        return this.debuggerContribution.label || this.debuggerContribution.type;
    }
    get type() {
        return this.debuggerContribution.type;
    }
    get variables() {
        return this.debuggerContribution.variables;
    }
    get configurationSnippets() {
        return this.debuggerContribution.configurationSnippets;
    }
    get languages() {
        return this.debuggerContribution.languages;
    }
    get when() {
        return this.debuggerWhen;
    }
    get hiddenWhen() {
        return this.debuggerHiddenWhen;
    }
    get enabled() {
        return !this.debuggerWhen || this.contextKeyService.contextMatchesRules(this.debuggerWhen);
    }
    get isHiddenFromDropdown() {
        if (!this.debuggerHiddenWhen) {
            return false;
        }
        return this.contextKeyService.contextMatchesRules(this.debuggerHiddenWhen);
    }
    get strings() {
        return this.debuggerContribution.strings ?? this.debuggerContribution.uiMessages;
    }
    interestedInLanguage(languageId) {
        return !!(this.languages && this.languages.indexOf(languageId) >= 0);
    }
    hasInitialConfiguration() {
        return !!this.debuggerContribution.initialConfigurations;
    }
    hasDynamicConfigurationProviders() {
        return this.debugService.getConfigurationManager().hasDebugConfigurationProvider(this.type, DebugConfigurationProviderTriggerKind.Dynamic);
    }
    hasConfigurationProvider() {
        return this.debugService.getConfigurationManager().hasDebugConfigurationProvider(this.type);
    }
    getInitialConfigurationContent(initialConfigs) {
        // at this point we got some configs from the package.json and/or from registered DebugConfigurationProviders
        let initialConfigurations = this.debuggerContribution.initialConfigurations || [];
        if (initialConfigs) {
            initialConfigurations = initialConfigurations.concat(initialConfigs);
        }
        const eol = this.resourcePropertiesService.getEOL(URI.from({ scheme: Schemas.untitled, path: '1' })) === '\r\n' ? '\r\n' : '\n';
        const configs = JSON.stringify(initialConfigurations, null, '\t').split('\n').map(line => '\t' + line).join(eol).trim();
        const comment1 = nls.localize('launch.config.comment1', "Use IntelliSense to learn about possible attributes.");
        const comment2 = nls.localize('launch.config.comment2', "Hover to view descriptions of existing attributes.");
        const comment3 = nls.localize('launch.config.comment3', "For more information, visit: {0}", 'https://go.microsoft.com/fwlink/?linkid=830387');
        let content = [
            '{',
            `\t// ${comment1}`,
            `\t// ${comment2}`,
            `\t// ${comment3}`,
            `\t"version": "0.2.0",`,
            `\t"configurations": ${configs}`,
            '}'
        ].join(eol);
        // fix formatting
        const editorConfig = this.configurationService.getValue();
        if (editorConfig.editor && editorConfig.editor.insertSpaces) {
            content = content.replace(new RegExp('\t', 'g'), ' '.repeat(editorConfig.editor.tabSize));
        }
        return Promise.resolve(content);
    }
    getMainExtensionDescriptor() {
        return this.mainExtensionDescription || this.mergedExtensionDescriptions[0];
    }
    getCustomTelemetryEndpoint() {
        const aiKey = this.debuggerContribution.aiKey;
        if (!aiKey) {
            return undefined;
        }
        const sendErrorTelemtry = cleanRemoteAuthority(this.environmentService.remoteAuthority) !== 'other';
        return {
            id: `${this.getMainExtensionDescriptor().publisher}.${this.type}`,
            aiKey,
            sendErrorTelemetry: sendErrorTelemtry
        };
    }
    getSchemaAttributes(definitions) {
        if (!this.debuggerContribution.configurationAttributes) {
            return null;
        }
        // fill in the default configuration attributes shared by all adapters.
        return Object.entries(this.debuggerContribution.configurationAttributes).map(([request, attributes]) => {
            const definitionId = `${this.type}:${request}`;
            const platformSpecificDefinitionId = `${this.type}:${request}:platform`;
            const defaultRequired = ['name', 'type', 'request'];
            attributes.required = attributes.required && attributes.required.length ? defaultRequired.concat(attributes.required) : defaultRequired;
            attributes.additionalProperties = false;
            attributes.type = 'object';
            if (!attributes.properties) {
                attributes.properties = {};
            }
            const properties = attributes.properties;
            properties['type'] = {
                enum: [this.type],
                enumDescriptions: [this.label],
                description: nls.localize('debugType', "Type of configuration."),
                pattern: '^(?!node2)',
                deprecationMessage: this.debuggerContribution.deprecated || (this.enabled ? undefined : debuggerDisabledMessage(this.type)),
                doNotSuggest: !!this.debuggerContribution.deprecated,
                errorMessage: nls.localize('debugTypeNotRecognised', "The debug type is not recognized. Make sure that you have a corresponding debug extension installed and that it is enabled."),
                patternErrorMessage: nls.localize('node2NotSupported', "\"node2\" is no longer supported, use \"node\" instead and set the \"protocol\" attribute to \"inspector\".")
            };
            properties['request'] = {
                enum: [request],
                description: nls.localize('debugRequest', "Request type of configuration. Can be \"launch\" or \"attach\"."),
            };
            for (const prop in definitions['common'].properties) {
                properties[prop] = {
                    $ref: `#/definitions/common/properties/${prop}`
                };
            }
            Object.keys(properties).forEach(name => {
                // Use schema allOf property to get independent error reporting #21113
                ConfigurationResolverUtils.applyDeprecatedVariableMessage(properties[name]);
            });
            definitions[definitionId] = { ...attributes };
            definitions[platformSpecificDefinitionId] = {
                type: 'object',
                additionalProperties: false,
                properties: filter(properties, key => key !== 'type' && key !== 'request' && key !== 'name')
            };
            // Don't add the OS props to the real attributes object so they don't show up in 'definitions'
            const attributesCopy = { ...attributes };
            attributesCopy.properties = {
                ...properties,
                ...{
                    windows: {
                        $ref: `#/definitions/${platformSpecificDefinitionId}`,
                        description: nls.localize('debugWindowsConfiguration', "Windows specific launch configuration attributes."),
                    },
                    osx: {
                        $ref: `#/definitions/${platformSpecificDefinitionId}`,
                        description: nls.localize('debugOSXConfiguration', "OS X specific launch configuration attributes."),
                    },
                    linux: {
                        $ref: `#/definitions/${platformSpecificDefinitionId}`,
                        description: nls.localize('debugLinuxConfiguration', "Linux specific launch configuration attributes."),
                    }
                }
            };
            return attributesCopy;
        });
    }
};
Debugger = __decorate([
    __param(3, IConfigurationService),
    __param(4, ITextResourcePropertiesService),
    __param(5, IConfigurationResolverService),
    __param(6, IWorkbenchEnvironmentService),
    __param(7, IDebugService),
    __param(8, IContextKeyService)
], Debugger);
export { Debugger };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdnZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHNUQsT0FBTyxFQUE0RixhQUFhLEVBQUUsdUJBQXVCLEVBQXFCLHFDQUFxQyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3hOLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ3hILE9BQU8sS0FBSywwQkFBMEIsTUFBTSw4RUFBOEUsQ0FBQztBQUMzSCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNqSCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRzdELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9GLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxjQUFjLEVBQXdCLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDaEksT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRXJELElBQU0sUUFBUSxHQUFkLE1BQU0sUUFBUTtJQVNwQixZ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