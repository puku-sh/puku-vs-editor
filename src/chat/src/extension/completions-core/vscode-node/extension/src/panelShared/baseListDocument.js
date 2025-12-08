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
exports.BaseListDocument = void 0;
const vscode_1 = require("vscode");
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const postInsertion_1 = require("../../../lib/src/postInsertion");
const partialSuggestions_1 = require("../../../lib/src/suggestions/partialSuggestions");
const common_1 = require("../lib/panelShared/common");
// BaseListDocument to be shared with both the copilot and comparison completion panels.
let BaseListDocument = class BaseListDocument extends common_1.SolutionManager {
    constructor(textDocument, position, panel, countTarget = common_1.solutionCountTarget, instantiationService) {
        super(textDocument, position, panel.cancellationToken, countTarget);
        this.panel = panel;
        this.instantiationService = instantiationService;
        this._solutionCount = 0;
        this._solutions = [];
    }
    // Find if two solutions are duplicates by comparing their normalized text content.
    areSolutionsDuplicates(solutionA, solutionB) {
        const stripA = (0, common_1.normalizeCompletionText)(solutionA.insertText);
        const stripB = (0, common_1.normalizeCompletionText)(solutionB.insertText);
        return stripA === stripB;
    }
    findDuplicateSolution(newItem) {
        return this._solutions.find(item => this.areSolutionsDuplicates(item, newItem));
    }
    onSolution(unformatted) {
        const offset = this.textDocument.offsetAt(this.targetPosition);
        const rank = this._solutions.length;
        const postInsertionCallback = () => {
            const telemetryData = this.savedTelemetryData.extendedBy({
                choiceIndex: unformatted.choiceIndex.toString(),
                engineName: unformatted.modelId || '',
            }, {
                compCharLen: unformatted.insertText.length,
                meanProb: unformatted.meanProb,
                rank,
            });
            return this.instantiationService.invokeFunction(postInsertion_1.postInsertionTasks, 'solution', unformatted.insertText, offset, this.textDocument.uri, telemetryData, {
                compType: 'full',
                acceptedLength: unformatted.insertText.length,
                acceptedLines: (0, partialSuggestions_1.countLines)(unformatted.insertText),
            }, unformatted.copilotAnnotations);
        };
        const baseCompletion = {
            insertText: unformatted.insertText,
            range: new vscode_1.Range(new vscode_1.Position(unformatted.range.start.line, unformatted.range.start.character), new vscode_1.Position(unformatted.range.end.line, unformatted.range.end.character)),
            copilotAnnotations: unformatted.copilotAnnotations,
            postInsertionCallback,
        };
        const newItem = this.createPanelCompletion(unformatted, baseCompletion);
        if (this.shouldAddSolution(newItem)) {
            this.panel.onItem(newItem);
            this._solutions.push(newItem);
        }
        this._solutionCount++;
        this.panel.onWorkDone({ percentage: (100 * this._solutionCount) / this.solutionCountTarget });
    }
    onFinishedNormally() {
        return this.panel.onFinished();
    }
    onFinishedWithError(_) {
        return this.onFinishedNormally();
    }
    runQuery() {
        return this.runSolutionsImpl();
    }
};
exports.BaseListDocument = BaseListDocument;
exports.BaseListDocument = BaseListDocument = __decorate([
    __param(4, instantiation_1.IInstantiationService)
], BaseListDocument);
//# sourceMappingURL=baseListDocument.js.map