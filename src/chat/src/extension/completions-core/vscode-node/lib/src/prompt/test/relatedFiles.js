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
exports.MockTraitsProvider = void 0;
const ignoreService_1 = require("../../../../../../../platform/ignore/common/ignoreService");
const instantiation_1 = require("../../../../../../../util/vs/platform/instantiation/common/instantiation");
const fileSystem_1 = require("../../fileSystem");
const logger_1 = require("../../logger");
const relatedFiles_1 = require("../similarFiles/relatedFiles");
let MockTraitsProvider = class MockTraitsProvider extends relatedFiles_1.RelatedFilesProvider {
    constructor(traits = [
        { name: 'testTraitName', value: 'testTraitValue' },
        { name: 'TargetFrameworks', value: 'net8' },
        { name: 'LanguageVersion', value: '12' },
    ], instantiationService, ignoreService, logTarget, fileSystemService) {
        super(instantiationService, ignoreService, logTarget, fileSystemService);
        this.traits = traits;
    }
    async getRelatedFilesResponse(docInfo, telemetryData) {
        return Promise.resolve({
            entries: [],
            traits: this.traits,
        });
    }
};
exports.MockTraitsProvider = MockTraitsProvider;
exports.MockTraitsProvider = MockTraitsProvider = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, ignoreService_1.IIgnoreService),
    __param(3, logger_1.ICompletionsLogTargetService),
    __param(4, fileSystem_1.ICompletionsFileSystemService)
], MockTraitsProvider);
//# sourceMappingURL=relatedFiles.js.map