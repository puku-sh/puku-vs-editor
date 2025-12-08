"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticsContextContribution = void 0;
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const languageContextProviderService_1 = require("../../../platform/languageContextProvider/common/languageContextProviderService");
const languageDiagnosticsService_1 = require("../../../platform/languages/common/languageDiagnosticsService");
const logService_1 = require("../../../platform/log/common/logService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../util/vs/base/common/observableInternal");
const uri_1 = require("../../../util/vs/base/common/uri");
const position_1 = require("../../../util/vs/editor/common/core/position");
const range_1 = require("../../../util/vs/editor/common/core/range");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptCrafting_1 = require("../../xtab/common/promptCrafting");
let DiagnosticsContextContribution = class DiagnosticsContextContribution extends lifecycle_1.Disposable {
    constructor(configurationService, logService, experimentationService, diagnosticsService, languageContextProviderService) {
        super();
        this.configurationService = configurationService;
        this.logService = logService;
        this.experimentationService = experimentationService;
        this.diagnosticsService = diagnosticsService;
        this.languageContextProviderService = languageContextProviderService;
        this._enableDiagnosticsContextProvider = configurationService.getExperimentBasedConfigObservable(configurationService_1.ConfigKey.Internal.DiagnosticsContextProvider, experimentationService);
        this._register((0, observableInternal_1.autorun)(reader => {
            if (this._enableDiagnosticsContextProvider.read(reader)) {
                reader.store.add(this.register());
            }
        }));
    }
    register() {
        const disposables = new lifecycle_1.DisposableStore();
        try {
            const resolver = new ContextResolver(this.diagnosticsService, this.configurationService, this.experimentationService);
            const provider = {
                id: 'diagnostics-context-provider',
                selector: "*",
                resolver: resolver
            };
            disposables.add(this.languageContextProviderService.registerContextProvider(provider));
        }
        catch (error) {
            this.logService.error('Error registering diagnostics context provider:', error);
        }
        return disposables;
    }
};
exports.DiagnosticsContextContribution = DiagnosticsContextContribution;
exports.DiagnosticsContextContribution = DiagnosticsContextContribution = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, logService_1.ILogService),
    __param(2, nullExperimentationService_1.IExperimentationService),
    __param(3, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(4, languageContextProviderService_1.ILanguageContextProviderService)
], DiagnosticsContextContribution);
class ContextResolver {
    constructor(diagnosticsService, configurationService, experimentationService) {
        this.diagnosticsService = diagnosticsService;
        this.configurationService = configurationService;
        this.experimentationService = experimentationService;
    }
    async resolve(request, token) {
        return []; // resolve only on timeout to ensure the state of diagnostics is as fresh as possible
    }
    resolveOnTimeout(request) {
        if (!request.documentContext.position) {
            return [];
        }
        const requestedFileResource = uri_1.URI.parse(request.documentContext.uri);
        const cursor = new position_1.Position(request.documentContext.position.line + 1, request.documentContext.position.character + 1);
        const linesAbove = this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderNLinesAbove, this.experimentationService) ?? promptCrafting_1.N_LINES_ABOVE;
        const linesBelow = this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderNLinesBelow, this.experimentationService) ?? promptCrafting_1.N_LINES_BELOW;
        const editWindow = new range_1.Range(cursor.lineNumber - linesAbove, 1, cursor.lineNumber + linesBelow, Number.MAX_SAFE_INTEGER);
        return this.getContext(requestedFileResource, cursor, {
            maxDiagnostics: 3,
            includeWarnings: true,
            includeDiagnosticsRange: editWindow,
        });
    }
    getContext(resource, cursor, options) {
        let diagnostics = this.diagnosticsService.getDiagnostics(resource);
        if (options.includeDiagnosticsRange) {
            diagnostics = diagnostics.filter(d => options.includeDiagnosticsRange.containsRange(toInternalRange(d.range)));
        }
        if (!options.includeWarnings) {
            diagnostics = diagnostics.filter(d => d.severity !== vscodeTypes_1.DiagnosticSeverity.Warning);
        }
        const diagnosticsSortedByDistance = diagnostics.sort((a, b) => {
            const aDistance = Math.abs(a.range.start.line - cursor.lineNumber);
            const bDistance = Math.abs(b.range.start.line - cursor.lineNumber);
            return aDistance - bDistance;
        });
        return diagnosticsToTraits(diagnosticsSortedByDistance.slice(0, options.maxDiagnostics));
    }
}
function diagnosticsToTraits(diagnostics) {
    const errorDiagnostics = diagnostics.filter(d => d.severity === vscodeTypes_1.DiagnosticSeverity.Error);
    const warningsDiagnostics = diagnostics.filter(d => d.severity === vscodeTypes_1.DiagnosticSeverity.Warning);
    const traits = [];
    if (errorDiagnostics.length > 0) {
        traits.push({
            name: "Errors near the user's cursor",
            value: errorDiagnostics.map(d => `- ${d.message}`).join('\n'),
        });
    }
    if (warningsDiagnostics.length > 0) {
        traits.push({
            name: "Warnings near the user's cursor",
            value: warningsDiagnostics.map(d => `- ${d.message}`).join('\n'),
        });
    }
    return traits;
}
function toInternalRange(range) {
    return new range_1.Range(range.start.line + 1, range.start.character + 1, range.end.line + 1, range.end.character + 1);
}
//# sourceMappingURL=diagnosticsContextProvider.js.map