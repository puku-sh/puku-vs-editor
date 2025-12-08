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
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseActivate = baseActivate;
exports.createInstantiationService = createInstantiationService;
const l10n = __importStar(require("@vscode/l10n"));
const vscode_1 = require("vscode");
const envService_1 = require("../../../platform/env/common/envService");
const packagejson_1 = require("../../../platform/env/common/packagejson");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const services_1 = require("../../../util/common/services");
const extensionApi_1 = require("../../api/vscode/extensionApi");
const contributions_1 = require("../../common/contributions");
async function baseActivate(configuration) {
    const context = configuration.context;
    if (context.extensionMode === vscode_1.ExtensionMode.Test && !configuration.forceActivation && !envService_1.isScenarioAutomation) {
        // FIXME Running in tests, don't activate the extension
        // Avoid bundling the extension code in the test bundle
        return context;
    }
    // Check if the extension is running in a pre-release version of VS Code
    const isStableVsCode = !(vscode_1.env.appName.includes('Insiders') || vscode_1.env.appName.includes('Exploration') || vscode_1.env.appName.includes('OSS'));
    const showSwitchToReleaseViewCtxKey = 'puku.interactiveSession.switchToReleaseChannel';
    if (context.extension.packageJSON.isPreRelease && isStableVsCode) {
        // Prevent activation of the extension if the user is using a pre-release version in stable VS Code
        vscode_1.commands.executeCommand('setContext', showSwitchToReleaseViewCtxKey, true);
        return context;
    }
    else {
        vscode_1.commands.executeCommand('setContext', showSwitchToReleaseViewCtxKey, undefined);
    }
    if (vscode_1.l10n.bundle) {
        l10n.config({ contents: vscode_1.l10n.bundle });
    }
    if (!packagejson_1.isProduction) {
        // Must do this before creating all the services which may rely on keys from .env
        configuration.configureDevPackages?.();
    }
    const instantiationService = createInstantiationService(configuration);
    await instantiationService.invokeFunction(async (accessor) => {
        const expService = accessor.get(nullExperimentationService_1.IExperimentationService);
        // Await intialization of exp service. This ensure cache is fresh.
        // It will then auto refresh every 30 minutes after that.
        await expService.hasTreatments();
        // THIS is awaited because some contributions can block activation
        // via `IExtensionContribution#activationBlocker`
        const contributions = instantiationService.createInstance(contributions_1.ContributionCollection, configuration.contributions);
        context.subscriptions.push(contributions);
        await contributions.waitForActivationBlockers();
    });
    if (vscode_1.ExtensionMode.Test === context.extensionMode && !envService_1.isScenarioAutomation) {
        return instantiationService; // The returned accessor is used in tests
    }
    return {
        getAPI(version) {
            if (version > extensionApi_1.CopilotExtensionApi.version) {
                throw new Error('Invalid Copilot Chat extension API version. Please upgrade Copilot Chat.');
            }
            return instantiationService.createInstance(extensionApi_1.CopilotExtensionApi);
        }
    };
}
function createInstantiationService(configuration) {
    const accessor = new services_1.InstantiationServiceBuilder();
    configuration.registerServices(accessor, configuration.context);
    const instantiationService = accessor.seal();
    configuration.context.subscriptions.push(instantiationService);
    instantiationService.invokeFunction(accessor => {
        // Does the initial read of ignore files, but don't block
        accessor.get(ignoreService_1.IIgnoreService).init();
    });
    return instantiationService;
}
//# sourceMappingURL=extension.js.map