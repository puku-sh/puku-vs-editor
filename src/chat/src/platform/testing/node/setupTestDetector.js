"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetupTestsDetector = exports.isStartSetupTestConfirmation = exports.NullSetupTestsDetector = exports.ISetupTestsDetector = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const services_1 = require("../../../util/common/services");
const arraysFind_1 = require("../../../util/vs/base/common/arraysFind");
const assert_1 = require("../../../util/vs/base/common/assert");
const async_1 = require("../../../util/vs/base/common/async");
const vscodeTypes_1 = require("../../../vscodeTypes");
const runCommandExecutionService_1 = require("../../commands/common/runCommandExecutionService");
const configurationService_1 = require("../../configuration/common/configurationService");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const extensionsService_1 = require("../../extensions/common/extensionsService");
const setupTestExtensions_1 = require("../common/setupTestExtensions");
const testProvider_1 = require("../common/testProvider");
const testDepsResolver_1 = require("./testDepsResolver");
exports.ISetupTestsDetector = (0, services_1.createServiceIdentifier)('ISetupTestsDetector');
const DID_ALREADY_PROMPT = 'testing.setup.skipForWorkspace';
class NullSetupTestsDetector {
    shouldSuggestSetup() {
        return Promise.resolve(undefined);
    }
    showSuggestion() {
        return [];
    }
    handleInvocation() {
        return Promise.resolve(false);
    }
}
exports.NullSetupTestsDetector = NullSetupTestsDetector;
const isStartSetupTestConfirmation = (confirmationData) => confirmationData && confirmationData.$isSetupSuggestion && confirmationData.command === "workbench.action.chat.open" /* CommandIds.OpenChat */;
exports.isStartSetupTestConfirmation = isStartSetupTestConfirmation;
let SetupTestsDetector = class SetupTestsDetector {
    constructor(_configurationService, _testDepsResolver, _testService, _extensionContext, _extensionsService, _commandService) {
        this._configurationService = _configurationService;
        this._testDepsResolver = _testDepsResolver;
        this._testService = _testService;
        this._extensionContext = _extensionContext;
        this._extensionsService = _extensionsService;
        this._commandService = _commandService;
    }
    /** @inheritdoc */
    showSuggestion(action) {
        this.setDidAlreadyPrompt();
        const output = [];
        const frameworkQuery = (framework) => `@category:testing ${framework}`;
        switch (action.type) {
            case 1 /* SetupTestActionType.InstallExtensionForFramework */:
            case 0 /* SetupTestActionType.InstallExtensionForLanguage */:
                output.push(new vscodeTypes_1.ChatResponseConfirmationPart(l10n.t('We recommend installing an extension to run {0} tests.', action.type === 1 /* SetupTestActionType.InstallExtensionForFramework */ ? action.framework : action.language), l10n.t('Install {0} (`{1}`)?', action.extension.name, action.extension.id), {
                    $isSetupSuggestion: true,
                    command: "workbench.extensions.installExtension" /* CommandIds.InstallExtension */,
                    arguments: [action.extension.id, { enable: true }]
                }));
                break;
            case 2 /* SetupTestActionType.SearchForFramework */:
                output.push(new vscodeTypes_1.ChatResponseConfirmationPart(l10n.t('We recommend installing an extension to run {0} tests.', action.framework), l10n.t('Would you like to search for one now?'), {
                    $isSetupSuggestion: true,
                    command: "workbench.extensions.search" /* CommandIds.SearchExtensions */,
                    arguments: [frameworkQuery(action.framework)]
                }));
                break;
            case 3 /* SetupTestActionType.SearchGeneric */:
                output.push(new vscodeTypes_1.ChatResponseConfirmationPart(l10n.t('It looks like you may not have tests set up in this repository yet.'), l10n.t('Would you like to set them up?'), {
                    $isSetupSuggestion: true,
                    command: "workbench.action.chat.open" /* CommandIds.OpenChat */,
                    arguments: [{ query: `@workspace /setupTests` }],
                }));
                break;
            case 6 /* SetupTestActionType.CustomExtensionCommand */:
                if (action.command) {
                    output.push(new vscodeTypes_1.ChatResponseConfirmationPart(action.command.title, action.message, {
                        $isSetupSuggestion: true,
                        command: action.command.command,
                        arguments: action.command.arguments,
                    }));
                }
                else {
                    output.push(new vscodeTypes_1.ChatResponseMarkdownPart(action.message));
                }
                break;
            case 4 /* SetupTestActionType.Remind */: {
                // show the suggestion inline in a mardown parm without separate buttons:
                const action2 = action.action;
                switch (action2.type) {
                    case 1 /* SetupTestActionType.InstallExtensionForFramework */:
                    case 0 /* SetupTestActionType.InstallExtensionForLanguage */: {
                        const s = new vscodeTypes_1.MarkdownString(l10n.t('We recommend installing the {0} extension to run {1} tests.', action2.extension.name, action2.type === 1 /* SetupTestActionType.InstallExtensionForFramework */ ? action2.framework : action2.language));
                        s.appendMarkdown('\n\n');
                        output.push(new vscodeTypes_1.ChatResponseMarkdownPart(s));
                        output.push(new vscodeTypes_1.ChatResponseExtensionsPart([action2.extension.id]));
                        break;
                    }
                    case 2 /* SetupTestActionType.SearchForFramework */: {
                        const s = new vscodeTypes_1.MarkdownString(l10n.t('We recommend [installing an extension]({0}) to run {1} tests.', commandUri('workbench.extensions.search', [frameworkQuery(action2.framework)]), action2.framework));
                        s.isTrusted = { enabledCommands: ['workbench.extensions.search'] };
                        output.push(new vscodeTypes_1.ChatResponseMarkdownPart(s));
                        break;
                    }
                }
                break;
            }
            case 5 /* SetupTestActionType.WasHandled */:
                break;
            default:
                (0, assert_1.assertNever)(action);
        }
        return output;
    }
    /**
     * @inheritdoc
     *
     * See `src/platform/testing/node/setupTestDetector.png` for the flow followed here.
     */
    async shouldSuggestSetup({ document }, request, output) {
        if (request.rejectedConfirmationData?.some(r => r.$isSetupSuggestion)) {
            return undefined; // said "not now" to setup
        }
        const confirmed = request.acceptedConfirmationData?.find(r => r.$isSetupSuggestion);
        if (confirmed) {
            const exe = this._commandService.executeCommand(confirmed.command, ...confirmed.arguments);
            // Most commands search, but if they're installing an extension, show
            // nice progress and then generate the tests as requested.
            if (confirmed.command === "workbench.extensions.installExtension" /* CommandIds.InstallExtension */) {
                output.progress(l10n.t(`Installing extension {0}...`, confirmed.arguments[0]));
                await this.waitForExtensionInstall(exe, document, confirmed.arguments[0]);
                return undefined;
            }
            return { type: 5 /* SetupTestActionType.WasHandled */ };
        }
        if (!this._configurationService.getConfig(configurationService_1.ConfigKey.SetupTests) || await this._testService.hasAnyTests()) {
            return undefined;
        }
        const action = await this.getSuggestActionInner(document);
        if (action && this.getDidAlreadyPrompt()) {
            return { type: 4 /* SetupTestActionType.Remind */, action };
        }
        return action;
    }
    async waitForExtensionInstall(prom, document, extensionId) {
        await prom;
        let extension;
        do {
            extension = this._extensionsService.getExtension(extensionId);
            await (0, async_1.timeout)(100);
        } while (!extension);
        const testSection = extension.packageJSON?.copilot?.tests;
        const command = testSection?.setupTests || testSection?.getSetupConfirmation;
        return command ? await this.getDelegatedAction(command, document) : undefined;
    }
    getDidAlreadyPrompt() {
        if (this._extensionContext.extensionMode === vscodeTypes_1.ExtensionMode.Development) {
            return !!this._didAlreadyPrompt;
        }
        else {
            return this._extensionContext.workspaceState.get(DID_ALREADY_PROMPT, false);
        }
    }
    setDidAlreadyPrompt() {
        if (this._extensionContext.extensionMode === vscodeTypes_1.ExtensionMode.Development) {
            this._didAlreadyPrompt = true;
        }
        else {
            this._extensionContext.workspaceState.update(DID_ALREADY_PROMPT, true);
        }
    }
    async getDelegatedAction(command, doc) {
        try {
            const result = await this._commandService.executeCommand(command, doc.uri);
            if (result) {
                return { type: 6 /* SetupTestActionType.CustomExtensionCommand */, command: result.command, message: result.message };
            }
        }
        catch (e) {
            // ignore
        }
    }
    async getExtensionRecommendationAndDelegate(extensionInfo, doc, ifNotInstalledThen) {
        const extension = this._extensionsService.getExtension(extensionInfo.id);
        if (!extension) {
            return ifNotInstalledThen;
        }
        const command = extension.packageJSON?.copilot?.tests?.getSetupConfirmation;
        return command ? await this.getDelegatedAction(command, doc) : undefined;
    }
    async getSuggestActionInner(doc) {
        const knownByLanguage = setupTestExtensions_1.testExtensionsForLanguage.get(doc.languageId);
        const languageExt = knownByLanguage?.forLanguage?.extension;
        if (languageExt) {
            return this.getExtensionRecommendationAndDelegate(languageExt, doc, { type: 0 /* SetupTestActionType.InstallExtensionForLanguage */, language: doc.languageId, extension: languageExt });
        }
        if (!knownByLanguage?.perFramework) {
            return { type: 3 /* SetupTestActionType.SearchGeneric */, context: doc };
        }
        const frameworks = await this._testDepsResolver.getTestDeps(doc.languageId);
        const knownByFramework = (0, arraysFind_1.mapFindFirst)(frameworks, f => {
            const found = knownByLanguage.perFramework.get(f);
            return found && { extension: found, framework: f };
        });
        if (knownByFramework) {
            return this.getExtensionRecommendationAndDelegate(knownByFramework.extension, doc, { type: 1 /* SetupTestActionType.InstallExtensionForFramework */, ...knownByFramework });
        }
        if (frameworks.length) {
            return { type: 2 /* SetupTestActionType.SearchForFramework */, framework: frameworks[0] };
        }
        return { type: 3 /* SetupTestActionType.SearchGeneric */, context: doc };
    }
};
exports.SetupTestsDetector = SetupTestsDetector;
exports.SetupTestsDetector = SetupTestsDetector = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, testDepsResolver_1.ITestDepsResolver),
    __param(2, testProvider_1.ITestProvider),
    __param(3, extensionContext_1.IVSCodeExtensionContext),
    __param(4, extensionsService_1.IExtensionsService),
    __param(5, runCommandExecutionService_1.IRunCommandExecutionService)
], SetupTestsDetector);
function commandUri(command, args) {
    return `command:${command}?${encodeURIComponent(JSON.stringify(args))}`;
}
//# sourceMappingURL=setupTestDetector.js.map