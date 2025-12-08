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
exports.TestRelatedFilesProvider = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const testFiles_1 = require("../../prompt/node/testFiles");
let TestRelatedFilesProvider = class TestRelatedFilesProvider extends lifecycle_1.Disposable {
    constructor(_instantiationService, _workspaceService, _configurationService) {
        super();
        this._instantiationService = _instantiationService;
        this._workspaceService = _workspaceService;
        this._configurationService = _configurationService;
    }
    isEnabled() {
        return this._configurationService.getConfig(configurationService_1.ConfigKey.Test2SrcRelatedFilesProvider) === true;
    }
    async provideRelatedFiles(chatRequest, token) {
        if (!this.isEnabled()) {
            return;
        }
        const result = [];
        const finder = this._instantiationService.createInstance(testFiles_1.TestFileFinder);
        for (const candidate of chatRequest.files) {
            const doc = await this._workspaceService.openTextDocumentAndSnapshot(candidate);
            if (!(0, testFiles_1.isTestFile)(doc)) {
                continue;
            }
            const srcUri = await finder.findFileForTestFile(doc, token);
            if (srcUri) {
                result.push({ uri: srcUri, description: l10n.t('Tested by {0}', this._workspaceService.asRelativePath(doc.uri)) });
            }
        }
        return result;
    }
};
exports.TestRelatedFilesProvider = TestRelatedFilesProvider;
exports.TestRelatedFilesProvider = TestRelatedFilesProvider = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, configurationService_1.IConfigurationService)
], TestRelatedFilesProvider);
//# sourceMappingURL=testRelatedFilesProvider.js.map