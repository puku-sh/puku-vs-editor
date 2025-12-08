"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Allow importing vscode here. eslint does not let us exclude this path: https://github.com/import-js/eslint-plugin-import/issues/2800
/* eslint-disable local/no-runtime-import */
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
exports.SimulationWorkspaceExtHost = void 0;
const fs_1 = require("fs");
const vscode = __importStar(require("vscode"));
const simulationWorkspace_1 = require("../../../src/platform/test/node/simulationWorkspace");
const resources_1 = require("../../../src/util/vs/base/common/resources");
const simulationExtHostContext_1 = require("./simulationExtHostContext");
class SimulationWorkspaceExtHost extends simulationWorkspace_1.SimulationWorkspace {
    constructor() {
        super(...arguments);
        this._root = vscode.workspace.workspaceFolders[0].uri;
    }
    setupServices(testingServiceCollection) {
        super.setupServices(testingServiceCollection);
        (0, simulationExtHostContext_1.addExtensionHostSimulationServices)(testingServiceCollection);
        vscode.commands.executeCommand('setContext', 'vscode.chat.tools.global.autoApprove.testMode', true);
        vscode.workspace.getConfiguration('chat.tools.global').update('autoApprove', true, vscode.ConfigurationTarget.Global);
        vscode.workspace.getConfiguration('chat.tools.terminal').update('autoReplyToPrompts', true, vscode.ConfigurationTarget.Global);
    }
    applyEdits(uri, edits, initialRange) {
        const res = super.applyEdits(uri, edits, initialRange);
        if ((0, resources_1.isEqualOrParent)(uri, this._root)) {
            const document = this.getDocument(uri);
            (0, fs_1.writeFileSync)(uri.fsPath, document.getText(), 'utf8');
        }
        return res;
    }
}
exports.SimulationWorkspaceExtHost = SimulationWorkspaceExtHost;
//# sourceMappingURL=simulationWorkspaceExtHost.js.map