"use strict";
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
exports.WalkthroughCommandContribution = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
class WalkthroughCommandContribution extends lifecycle_1.Disposable {
    constructor() {
        super();
        this._register(vscode.commands.registerCommand('puku.open.walkthrough', () => {
            vscode.commands.executeCommand('workbench.action.openWalkthrough', { category: 'GitHub.copilot-chat#copilotWelcome' }, /* toSide */ false);
        }));
        this._register(vscode.commands.registerCommand('puku.mcp.viewContext7', () => {
            const isInsiders = vscode.env.appName.includes('Insiders');
            const scheme = isInsiders ? 'vscode-insiders' : 'vscode';
            const mcpInstallParams = {
                name: 'context7',
                gallery: true,
                command: 'npx',
                args: ['-y', '@upstash/context7-mcp@latest']
            };
            const encodedParams = encodeURIComponent(JSON.stringify(mcpInstallParams));
            const context7InstallUrl = `${scheme}:mcp/install?${encodedParams}`;
            vscode.env.openExternal(vscode.Uri.parse(context7InstallUrl));
        }));
    }
}
exports.WalkthroughCommandContribution = WalkthroughCommandContribution;
//# sourceMappingURL=commands.js.map