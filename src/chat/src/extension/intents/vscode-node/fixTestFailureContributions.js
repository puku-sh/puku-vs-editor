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
exports.FixTestFailureContribution = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const vscode = __importStar(require("vscode"));
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const testProvider_1 = require("../../../platform/testing/common/testProvider");
const arraysFind_1 = require("../../../util/vs/base/common/arraysFind");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
let FixTestFailureContribution = class FixTestFailureContribution extends lifecycle_1.Disposable {
    constructor(testProvider, telemetryService, configurationService) {
        super();
        const store = this._register(new lifecycle_1.DisposableStore());
        registerTestMessageSparkles(store, telemetryService, testProvider);
        registerTestFailureCodeAction(testProvider, configurationService, store);
    }
};
exports.FixTestFailureContribution = FixTestFailureContribution;
exports.FixTestFailureContribution = FixTestFailureContribution = __decorate([
    __param(0, testProvider_1.ITestProvider),
    __param(1, telemetry_1.ITelemetryService),
    __param(2, configurationService_1.IConfigurationService)
], FixTestFailureContribution);
function registerTestMessageSparkles(store, telemetryService, testProvider) {
    function getLastFailureForItemOrChildren(item) {
        const failure = testProvider.getLastFailureFor(item);
        return failure || (0, arraysFind_1.mapFindFirst)(item.children, ([, item]) => getLastFailureForItemOrChildren(item));
    }
    store.add(vscode.commands.registerCommand('puku.tests.fixTestFailure.fromInline', (item) => {
        const failure = getLastFailureForItemOrChildren(item);
        if (failure) {
            openFixChat({
                message: failure.task.messages[0],
                test: failure.snapshot,
                source: 'testResultsPanel',
            });
        }
    }));
    store.add(vscode.commands.registerCommand('puku.tests.fixTestFailure', openFixChat));
    async function openFixChat(args) {
        if (!args.test.uri) {
            return; // should not happen based on context keys
        }
        /* __GDPR__
        "intent.fixTestFailure.actioned" : {
            "owner": "connor4312",
            "comment": "Reports when we show a ",
            "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Where the action was taken" }
        }
        */
        telemetryService.sendMSFTTelemetryEvent('intent.fixTestFailure.actioned', {
            source: args.source ?? 'testResultsPanel',
        });
        const doc = await vscode.workspace.openTextDocument(args.test.uri);
        await vscode.window.showTextDocument(doc, {
            preserveFocus: false, // must transfer focus so editor chat starts at the right place
            preview: true,
            selection: args.test.range ? new vscode.Range(args.test.range.start, args.test.range.start) : undefined
        });
        await vscode.commands.executeCommand('vscode.editorChat.start', {
            message: `/${"fix" /* Intent.Fix */} the #testFailure`,
            autoSend: true,
        });
    }
}
function registerTestFailureCodeAction(testProvider, configurationService, store) {
    store.add(vscode.languages.registerCodeActionsProvider('*', {
        provideCodeActions(document, range, context, token) {
            const copilotCodeActionsEnabled = configurationService.getConfig(configurationService_1.ConfigKey.EnableCodeActions);
            if (!copilotCodeActionsEnabled) {
                return;
            }
            const test = testProvider.getFailureAtPosition(document.uri, range.start);
            if (!test) {
                return undefined;
            }
            const ca = new vscode.CodeAction(l10n.t('Fix test failure'), vscode.CodeActionKind.QuickFix);
            ca.isAI = true;
            ca.command = {
                title: l10n.t('Fix test failure'),
                command: 'puku.tests.fixTestFailure',
                arguments: [{
                        message: test.task.messages[0],
                        test: test.snapshot,
                        source: 'sparkles',
                    }]
            };
            return [ca];
        },
    }));
}
//# sourceMappingURL=fixTestFailureContributions.js.map