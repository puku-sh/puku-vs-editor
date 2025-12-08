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
exports.DevContainerConfigurationServiceImpl = void 0;
const vscode = __importStar(require("vscode"));
const searchService_1 = require("../../../platform/search/common/searchService");
const path = __importStar(require("../../../util/vs/base/common/path"));
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const devContainerConfigGenerator_1 = require("../node/devContainerConfigGenerator");
let DevContainerConfigurationServiceImpl = class DevContainerConfigurationServiceImpl {
    constructor(instantiationService, searchService) {
        this.instantiationService = instantiationService;
        this.searchService = searchService;
    }
    async generateConfiguration(args, cancellationToken) {
        if (cancellationToken.isCancellationRequested) {
            return { type: 'cancelled' };
        }
        const filenames = (await Promise.all(['*', '*/*', '*/*/*']
            .map(pattern => this.searchService.findFilesWithDefaultExcludes(new vscode.RelativePattern(args.rootUri, pattern), 1000, cancellationToken))))
            .flat()
            .map(entry => path.posix.relative(args.rootUri.path, entry.path));
        const generator = this.instantiationService.createInstance(devContainerConfigGenerator_1.DevContainerConfigGenerator);
        return generator.generate(args.index, filenames, cancellationToken);
    }
};
exports.DevContainerConfigurationServiceImpl = DevContainerConfigurationServiceImpl;
exports.DevContainerConfigurationServiceImpl = DevContainerConfigurationServiceImpl = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, searchService_1.ISearchService)
], DevContainerConfigurationServiceImpl);
//# sourceMappingURL=devContainerConfigurationServiceImpl.js.map