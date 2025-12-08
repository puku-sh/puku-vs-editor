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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanelNavigationType = void 0;
exports.registerPanelSupport = registerPanelSupport;
const vscode_1 = require("vscode");
const lifecycle_1 = require("../../../../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const constants = __importStar(require("../constants"));
const telemetry_1 = require("../telemetry");
const textDocumentManager_1 = require("../textDocumentManager");
const copilotSuggestionsPanelManager_1 = require("./copilotSuggestionsPanelManager");
// Exported for testing
var PanelNavigationType;
(function (PanelNavigationType) {
    PanelNavigationType["Previous"] = "previous";
    PanelNavigationType["Next"] = "next";
})(PanelNavigationType || (exports.PanelNavigationType = PanelNavigationType = {}));
function registerPanelSupport(accessor) {
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    const suggestionsPanelManager = instantiationService.createInstance(copilotSuggestionsPanelManager_1.CopilotSuggestionsPanelManager);
    const disposableStore = new lifecycle_1.DisposableStore();
    function registerOpenPanelCommand(id) {
        return (0, telemetry_1.registerCommand)(accessor, id, async () => {
            // hide ghost text while opening the generation ui
            await vscode_1.commands.executeCommand('editor.action.inlineSuggest.hide');
            await instantiationService.invokeFunction(commandOpenPanel, suggestionsPanelManager);
        });
    }
    // Register both commands to also support command palette
    disposableStore.add(registerOpenPanelCommand(constants.CMDOpenPanelChat));
    disposableStore.add(registerOpenPanelCommand(constants.CMDOpenPanelClient));
    // No command palette support needed for these commands
    disposableStore.add(suggestionsPanelManager.registerCommands());
    return disposableStore;
}
function commandOpenPanel(accessor, suggestionsPanelManager) {
    const editor = vscode_1.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const wrapped = (0, textDocumentManager_1.wrapDoc)(editor.document);
    if (!wrapped) {
        return;
    }
    const { line, character } = editor.selection.active;
    suggestionsPanelManager.renderPanel(editor.document, { line, character }, wrapped);
    return vscode_1.commands.executeCommand('setContext', constants.CopilotPanelVisible, true);
}
//# sourceMappingURL=common.js.map