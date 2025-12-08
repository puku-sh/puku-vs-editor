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
exports.MicrosoftExperimentationService = exports.RelatedExtensionsFilter = void 0;
const vscode = __importStar(require("vscode"));
const vscode_tas_client_1 = require("vscode-tas-client");
const types_1 = require("../../../util/vs/base/common/types");
const copilotTokenStore_1 = require("../../authentication/common/copilotTokenStore");
const configurationService_1 = require("../../configuration/common/configurationService");
const envService_1 = require("../../env/common/envService");
const packagejson_1 = require("../../env/common/packagejson");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const fetcherServiceImpl_1 = require("../../networking/vscode-node/fetcherServiceImpl");
const telemetry_1 = require("../common/telemetry");
const baseExperimentationService_1 = require("../node/baseExperimentationService");
function getTargetPopulation(isPreRelease) {
    if (isPreRelease) {
        return vscode_tas_client_1.TargetPopulation.Insiders;
    }
    return vscode_tas_client_1.TargetPopulation.Public;
}
function trimVersionSuffix(version) {
    return version.split('-')[0];
}
const CopilotRelatedPluginVersionPrefix = 'X-Copilot-RelatedPluginVersion-';
var RelatedExtensionsFilter;
(function (RelatedExtensionsFilter) {
    RelatedExtensionsFilter["CopilotRelatedPluginVersionCppTools"] = "X-Copilot-RelatedPluginVersion-msvscodecpptools";
    RelatedExtensionsFilter["CopilotRelatedPluginVersionCMakeTools"] = "X-Copilot-RelatedPluginVersion-msvscodecmaketools";
    RelatedExtensionsFilter["CopilotRelatedPluginVersionMakefileTools"] = "X-Copilot-RelatedPluginVersion-msvscodemakefiletools";
    RelatedExtensionsFilter["CopilotRelatedPluginVersionCSharpDevKit"] = "X-Copilot-RelatedPluginVersion-msdotnettoolscsdevkit";
    RelatedExtensionsFilter["CopilotRelatedPluginVersionPython"] = "X-Copilot-RelatedPluginVersion-mspythonpython";
    RelatedExtensionsFilter["CopilotRelatedPluginVersionPylance"] = "X-Copilot-RelatedPluginVersion-mspythonvscodepylance";
    RelatedExtensionsFilter["CopilotRelatedPluginVersionJavaPack"] = "X-Copilot-RelatedPluginVersion-vscjavavscodejavapack";
    RelatedExtensionsFilter["CopilotRelatedPluginVersionTypescript"] = "X-Copilot-RelatedPluginVersion-vscodetypescriptlanguagefeatures";
    RelatedExtensionsFilter["CopilotRelatedPluginVersionTypescriptNext"] = "X-Copilot-RelatedPluginVersion-msvscodevscodetypescriptnext";
    RelatedExtensionsFilter["CopilotRelatedPluginVersionCSharp"] = "X-Copilot-RelatedPluginVersion-msdotnettoolscsharp";
    // Copilot related plugins
    RelatedExtensionsFilter["CopilotRelatedPluginVersionCopilot"] = "X-Copilot-RelatedPluginVersion-githubcopilot";
    RelatedExtensionsFilter["CopilotRelatedPluginVersionCopilotChat"] = "X-Copilot-RelatedPluginVersion-githubcopilotchat";
})(RelatedExtensionsFilter || (exports.RelatedExtensionsFilter = RelatedExtensionsFilter = {}));
class RelatedExtensionsFilterProvider {
    constructor(_logService) {
        this._logService = _logService;
    }
    _getRelatedExtensions() {
        return [
            'ms-vscode.cpptools',
            'ms-vscode.cmake-tools',
            'ms-vscode.makefile-tools',
            'ms-dotnettools.csdevkit',
            'ms-python.python',
            'ms-python.vscode-pylance',
            'vscjava.vscode-java-pack',
            'vscode.typescript-language-features',
            'ms-vscode.vscode-typescript-next',
            'ms-dotnettools.csharp',
        ]
            .map(name => {
            const extpj = vscode.extensions.getExtension(name)?.packageJSON;
            if (extpj && typeof extpj === 'object' && 'version' in extpj && typeof extpj.version === 'string') {
                return { name, version: extpj.version };
            }
        })
            .filter(plugin => plugin !== undefined);
    }
    getFilters() {
        this._logService.trace(`[RelatedExtensionsFilterProvider]::getFilters looking up related extensions`);
        const filters = new Map();
        for (const extension of this._getRelatedExtensions()) {
            const filterName = CopilotRelatedPluginVersionPrefix + extension.name.replace(/[^A-Za-z]/g, '').toLowerCase();
            if (!Object.values(RelatedExtensionsFilter).includes(filterName)) {
                this._logService.warn(`[RelatedExtensionsFilterProvider]::getFilters A filter could not be registered for the unrecognized related plugin "${extension.name}".`);
                continue;
            }
            filters.set(filterName, trimVersionSuffix(extension.version));
        }
        this._logService.trace(`[RelatedExtensionsFilterProvider]::getFilters Filters: ${JSON.stringify(Array.from(filters.entries()))}`);
        return filters;
    }
}
class CopilotExtensionsFilterProvider {
    constructor(_logService) {
        this._logService = _logService;
    }
    getFilters() {
        const copilotExtensionversion = vscode.extensions.getExtension('puku')?.packageJSON.version;
        const copilotChatExtensionVersion = packagejson_1.packageJson.version;
        const completionsCoreVersion = packagejson_1.packageJson.completionsCoreVersion;
        this._logService.trace(`[CopilotExtensionsFilterProvider]::getFilters Copilot Extension Version: ${copilotExtensionversion}, Copilot Chat Extension Version: ${copilotChatExtensionVersion}, Completions Core Version: ${completionsCoreVersion}`);
        const filters = new Map();
        filters.set(RelatedExtensionsFilter.CopilotRelatedPluginVersionCopilot, copilotExtensionversion);
        filters.set(RelatedExtensionsFilter.CopilotRelatedPluginVersionCopilotChat, copilotChatExtensionVersion);
        filters.set('X-VSCode-CompletionsInChatExtensionVersion', completionsCoreVersion);
        return filters;
    }
}
class CopilotCompletionsFilterProvider {
    constructor(_getCompletionsFilters, _logService) {
        this._getCompletionsFilters = _getCompletionsFilters;
        this._logService = _logService;
    }
    getFilters() {
        const filters = new Map();
        for (const [key, value] of this._getCompletionsFilters()) {
            if (value !== "") {
                filters.set(key, value);
            }
        }
        this._logService.trace(`[CopilotCompletionsFilterProvider]::getFilters Filters: ${JSON.stringify(Array.from(filters.entries()))}`);
        return filters;
    }
}
class GithubAccountFilterProvider {
    constructor(_userInfoStore, _logService) {
        this._userInfoStore = _userInfoStore;
        this._logService = _logService;
    }
    getFilters() {
        this._logService.trace(`[GithubAccountFilterProvider]::getFilters SKU: ${this._userInfoStore.sku}, Internal Org: ${this._userInfoStore.internalOrg}, IsFcv1: ${this._userInfoStore.isFcv1}`);
        const filters = new Map();
        filters.set('X-GitHub-Copilot-SKU', this._userInfoStore.sku);
        filters.set('X-Microsoft-Internal-Org', this._userInfoStore.internalOrg);
        filters.set('X-GitHub-Copilot-IsFcv1', this._userInfoStore.isFcv1 ? '1' : '0');
        return filters;
    }
}
class DevDeviceIdFilterProvider {
    constructor(_devDeviceId) {
        this._devDeviceId = _devDeviceId;
    }
    getFilters() {
        const filters = new Map();
        filters.set('X-VSCode-DevDeviceId', this._devDeviceId);
        return filters;
    }
}
let MicrosoftExperimentationService = class MicrosoftExperimentationService extends baseExperimentationService_1.BaseExperimentationService {
    constructor(telemetryService, context, envService, copilotTokenStore, configurationService, fetcherService, logService) {
        const id = context.extension.id;
        const version = context.extension.packageJSON['version'];
        const targetPopulation = getTargetPopulation(envService.isPreRelease());
        let self = undefined;
        const delegateFn = (globalState, userInfoStore) => {
            const wrappedMemento = new ExpMementoWrapper(globalState, envService);
            return (0, vscode_tas_client_1.getExperimentationService)(id, version, targetPopulation, telemetryService, wrappedMemento, new GithubAccountFilterProvider(userInfoStore, logService), new RelatedExtensionsFilterProvider(logService), new CopilotExtensionsFilterProvider(logService), 
            // The callback is called in super ctor. At that time, self/this is not initialized yet (but also, no filter could have been possibly set).
            new CopilotCompletionsFilterProvider(() => self?.getCompletionsFilters() ?? new Map(), logService), new DevDeviceIdFilterProvider(vscode.env.devDeviceId));
        };
        super(delegateFn, context, copilotTokenStore, configurationService, logService);
        self = this; // This is now fully initialized.
        if (fetcherService instanceof fetcherServiceImpl_1.FetcherService) {
            fetcherService.setExperimentationService(this);
        }
    }
};
exports.MicrosoftExperimentationService = MicrosoftExperimentationService;
exports.MicrosoftExperimentationService = MicrosoftExperimentationService = __decorate([
    __param(0, telemetry_1.ITelemetryService),
    __param(1, extensionContext_1.IVSCodeExtensionContext),
    __param(2, envService_1.IEnvService),
    __param(3, copilotTokenStore_1.ICopilotTokenStore),
    __param(4, configurationService_1.IConfigurationService),
    __param(5, fetcherService_1.IFetcherService),
    __param(6, logService_1.ILogService)
], MicrosoftExperimentationService);
let ExpMementoWrapper = class ExpMementoWrapper {
    constructor(_actual, _envService) {
        this._actual = _actual;
        this._envService = _envService;
    }
    keys() {
        return this._actual.keys();
    }
    get(key, defaultValue) {
        const value = this._actual.get(key, defaultValue);
        if (!isWrappedExpValue(value)) {
            return defaultValue;
        }
        if (value.extensionVersion !== this._envService.getVersion()) {
            // The extension has been updated since this value was stored, so ignore it.
            return defaultValue;
        }
        const age = (new Date()).getTime() - (new Date(value.savedDateTime)).getTime();
        const maxAge = 1000 * 60 * 60 * 24 * 3; // 3 days
        if (age > maxAge) {
            // The value is too old, so ignore it.
            return defaultValue;
        }
        return value.value;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update(key, value) {
        const wrapped = {
            $$$isWrappedExpValue: true,
            savedDateTime: (new Date()).toISOString(),
            extensionVersion: this._envService.getVersion(),
            value
        };
        return this._actual.update(key, wrapped);
    }
};
ExpMementoWrapper = __decorate([
    __param(1, envService_1.IEnvService)
], ExpMementoWrapper);
function isWrappedExpValue(obj) {
    return (0, types_1.isObject)(obj) && '$$$isWrappedExpValue' in obj;
}
//# sourceMappingURL=microsoftExperimentationService.js.map