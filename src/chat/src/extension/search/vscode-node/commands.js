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
exports.SearchPanelCommands = void 0;
const vscode = __importStar(require("vscode"));
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const feedbackReporter_1 = require("../../prompt/node/feedbackReporter");
const semanticSearchTextSearchProvider_1 = require("../../workspaceSemanticSearch/node/semanticSearchTextSearchProvider");
let SearchPanelCommands = class SearchPanelCommands extends lifecycle_1.Disposable {
    constructor(telemetryService, feedbackReporter) {
        super();
        this.telemetryService = telemetryService;
        this.feedbackReporter = feedbackReporter;
        this._register(vscode.commands.registerCommand('puku.search.markHelpful', () => {
            this.sendFeedback("helpful" /* SearchFeedbackKind.Helpful */);
        }));
        this._register(vscode.commands.registerCommand('puku.search.markUnhelpful', () => {
            this.sendFeedback("unhelpful" /* SearchFeedbackKind.Unhelpful */);
        }));
        this._register(vscode.commands.registerCommand('puku.search.feedback', () => {
            this.sendFeedback("feedback" /* SearchFeedbackKind.Feedback */);
            vscode.commands.executeCommand('puku.report', `Copilot search feedback: "${semanticSearchTextSearchProvider_1.SemanticSearchTextSearchProvider.latestQuery}"`);
        }));
    }
    sendFeedback(kind) {
        this.feedbackReporter.reportSearch(kind);
        vscode.commands.executeCommand('setContext', semanticSearchTextSearchProvider_1.SemanticSearchTextSearchProvider.feedBackSentKey, true);
    }
};
exports.SearchPanelCommands = SearchPanelCommands;
exports.SearchPanelCommands = SearchPanelCommands = __decorate([
    __param(0, telemetry_1.ITelemetryService),
    __param(1, feedbackReporter_1.IFeedbackReporter)
], SearchPanelCommands);
//# sourceMappingURL=commands.js.map