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
exports.CopilotListDocument = void 0;
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const common_1 = require("../lib/copilotPanel/common");
const panel_1 = require("../lib/copilotPanel/panel");
const baseListDocument_1 = require("../panelShared/baseListDocument");
/**
 * Class representing a Open Copilot list using a ITextDocument as a way of displaying results.
 * Currently only used in the VSCode extension.
 */
let CopilotListDocument = class CopilotListDocument extends baseListDocument_1.BaseListDocument {
    constructor(textDocument, position, panel, countTarget = common_1.solutionCountTarget, instantiationService) {
        super(textDocument, position, panel, countTarget, instantiationService);
    }
    createPanelCompletion(unformatted, baseCompletion) {
        return {
            insertText: baseCompletion.insertText,
            range: baseCompletion.range,
            copilotAnnotations: baseCompletion.copilotAnnotations,
            postInsertionCallback: baseCompletion.postInsertionCallback,
        };
    }
    shouldAddSolution(newItem) {
        return !this.findDuplicateSolution(newItem);
    }
    runSolutionsImpl() {
        return this.instantiationService.invokeFunction(panel_1.runSolutions, this, this);
    }
};
exports.CopilotListDocument = CopilotListDocument;
exports.CopilotListDocument = CopilotListDocument = __decorate([
    __param(4, instantiation_1.IInstantiationService)
], CopilotListDocument);
//# sourceMappingURL=copilotListDocument.js.map