"use strict";
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
var TestGenLensProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestGenLensContribution = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const logService_1 = require("../../../platform/log/common/logService");
const parserService_1 = require("../../../platform/parser/node/parserService");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
let TestGenLensProvider = class TestGenLensProvider {
    static { TestGenLensProvider_1 = this; }
    static { this.codeLensTitle = vscode.l10n.t('Generate tests using Copilot'); }
    static isEnabled(configService) {
        return configService.getConfig(configurationService_1.ConfigKey.GenerateTestsCodeLens);
    }
    constructor(logService, parserService) {
        this.logService = logService;
        this.parserService = parserService;
        this.store = new lifecycle_1.DisposableStore();
        this.onDidChangeCodeLenses = vscode.tests.onDidChangeTestResults;
    }
    dispose() {
        this.store.dispose();
    }
    provideCodeLenses(document, token) {
        return this.computeCodeLens(document, token);
    }
    async computeCodeLens(document, token) {
        // don't show code lenses for output channels
        if (document.uri.scheme === 'output') {
            return [];
        }
        const testResults = vscode.tests.testResults;
        if (testResults.length === 0) {
            this.logService.trace('No test results');
            return [];
        }
        const lastTest = testResults[0];
        let detailedCoverage;
        try {
            detailedCoverage = await lastTest.getDetailedCoverage?.(document.uri, token);
        }
        catch (e) {
            this.logService.error(e);
            return [];
        }
        if (!detailedCoverage || detailedCoverage.length === 0) {
            return [];
        }
        const codeLens = [];
        for (const detail of detailedCoverage) {
            if (detail instanceof vscode.DeclarationCoverage) {
                this.logService.trace(`Received statement coverage for ${detail.name}. (detail.executed: ${detail.executed})`);
                const wasExecuted = !!detail.executed;
                if (wasExecuted) {
                    continue;
                }
                const locationAsRange = detail.location instanceof vscode.Range ? detail.location : new vscode.Range(detail.location, detail.location);
                codeLens.push(this.createCodeLens(document, locationAsRange));
            }
            else if (detail instanceof vscode.StatementCoverage) {
                this.logService.trace('Received statement coverage; did nothing');
            }
            else {
                this.logService.error('Unexpected coverage type');
            }
        }
        if (codeLens.length === 0) {
            // try identifying untested declarations using tree sitter based approach
            const ast = this.parserService.getTreeSitterAST(document);
            if (ast === undefined) {
                return codeLens;
            }
            const testableNodes = await ast.getTestableNodes();
            if (testableNodes === null) {
                return codeLens;
            }
            const uncoveredLines = detailedCoverage.flatMap(cov => !!cov.executed ? [] : (cov.location instanceof vscode.Position ? [cov.location.line] : this.toLineNumbers(cov.location)));
            const uncoveredLinesSet = new Set(uncoveredLines);
            for (const node of testableNodes) {
                const start = document.positionAt(node.node.startIndex);
                const end = document.positionAt(node.node.endIndex);
                const codeLensRange = new vscode.Range(start, end);
                if ((0, arrays_1.range)(start.line, end.line).every(lineN => uncoveredLinesSet.has(lineN))) {
                    codeLens.push(this.createCodeLens(document, codeLensRange));
                }
            }
        }
        return codeLens;
    }
    createCodeLens(document, range) {
        return new vscode.CodeLens(range, {
            title: TestGenLensProvider_1.codeLensTitle,
            command: 'puku.chat.generateTests',
            arguments: [{ document, selection: range }],
        });
    }
    toLineNumbers(range) {
        const lineNumbers = [];
        for (let i = range.start.line; i <= range.end.line; i++) {
            lineNumbers.push(i);
        }
        return lineNumbers;
    }
};
TestGenLensProvider = TestGenLensProvider_1 = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, parserService_1.IParserService)
], TestGenLensProvider);
let TestGenLensContribution = class TestGenLensContribution extends lifecycle_1.Disposable {
    constructor(configurationService, instantiationService) {
        super();
        if (TestGenLensProvider.isEnabled(configurationService)) {
            const testGenCodeLensProvider = this._register(instantiationService.createInstance(TestGenLensProvider));
            this._register(vscode.languages.registerCodeLensProvider('*', testGenCodeLensProvider));
        }
    }
};
exports.TestGenLensContribution = TestGenLensContribution;
exports.TestGenLensContribution = TestGenLensContribution = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, instantiation_1.IInstantiationService)
], TestGenLensContribution);
//# sourceMappingURL=testGenLens.js.map