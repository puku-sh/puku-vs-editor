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
exports.VerifyTextDocumentChanges = void 0;
const vscode_1 = require("vscode");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const common_1 = require("./common");
/**
 * Verifies that VS Code content change API reports consistent document edits.
 * Tracks document states and verifies that applying reported edits to the previous state
 * produces the new document state. Reports mismatches via telemetry.
 */
let VerifyTextDocumentChanges = class VerifyTextDocumentChanges extends lifecycle_1.Disposable {
    constructor(_telemetryService) {
        super();
        this._telemetryService = _telemetryService;
        this._documentStates = new Map();
        // This comes from telemetry
        const allowedSchemes = new Set([
            "file",
            "vscode-notebook-cell",
            "untitled",
            // "vscode-local",
            // "vscode-chat-code-block",
            // "chat-editing-text-model",
            // "embedded-html",
            // "vscode-userdata",
            // "vscode-remote",
            // "git",
        ]);
        function shouldVerifyDoc(doc) {
            return allowedSchemes.has(doc.uri.scheme);
        }
        this._register(vscode_1.workspace.onDidOpenTextDocument(doc => {
            if (!shouldVerifyDoc(doc)) {
                return;
            }
            const docUri = doc.uri.toString();
            this._documentStates.set(docUri, { text: doc.getText(), linefeed: doc.eol });
        }));
        this._register(vscode_1.workspace.onDidCloseTextDocument(doc => {
            if (!shouldVerifyDoc(doc)) {
                return;
            }
            const docUri = doc.uri.toString();
            this._documentStates.delete(docUri);
        }));
        vscode_1.workspace.textDocuments.forEach(doc => {
            if (!shouldVerifyDoc(doc)) {
                return;
            }
            const docUri = doc.uri.toString();
            this._documentStates.set(docUri, { text: doc.getText(), linefeed: doc.eol });
        });
        this._register(vscode_1.workspace.onDidChangeTextDocument(e => {
            if (!shouldVerifyDoc(e.document)) {
                return;
            }
            this._verifyDocumentStateConsistency(e);
        }));
    }
    _verifyDocumentStateConsistency(e) {
        const docUri = e.document.uri.toString();
        const currentText = e.document.getText();
        const previousValue = this._documentStates.get(docUri);
        if (previousValue === undefined) {
            /* __GDPR__
                "vscode.contentChangeForUnknownDocument" : {
                    "owner": "hediet",
                    "comment": "Telemetry for verifying VSCode content change API consistency"
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('vscode.contentChangeForUnknownDocument', {}, {});
            return;
        }
        this._documentStates.set(docUri, { text: currentText, linefeed: e.document.eol });
        const edit = (0, common_1.editFromTextDocumentContentChangeEvents)(e.contentChanges);
        const expectedText = edit.apply(previousValue.text);
        if (expectedText !== currentText) {
            /* __GDPR__
                "vscode.contentChangeInconsistencyDetected" : {
                    "owner": "hediet",
                    "comment": "Telemetry for verifying VSCode content change API consistency",
                    "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Language of the currently open document." },
                    "sourceOfChange": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Source of the change." },
                    "reason": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Reason for change (1 = undo, 2 = redo).", "isMeasurement": true },
                    "previousLineFeed": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Line feed of the previously open document.", "isMeasurement": true },
                    "currentLineFeed": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Line feed of the currently open document.", "isMeasurement": true },
                    "scheme": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Scheme of the currently open document." }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('vscode.contentChangeInconsistencyDetected', {
                languageId: e.document.languageId,
                scheme: e.document.uri.scheme,
                sourceOfChange: e.detailedReason?.source || '',
            }, {
                reason: e.reason,
                previousLineFeed: previousValue.linefeed,
                currentLineFeed: e.document.eol,
            });
        }
    }
};
exports.VerifyTextDocumentChanges = VerifyTextDocumentChanges;
exports.VerifyTextDocumentChanges = VerifyTextDocumentChanges = __decorate([
    __param(0, telemetry_1.ITelemetryService)
], VerifyTextDocumentChanges);
//# sourceMappingURL=verifyTextDocumentChanges.js.map