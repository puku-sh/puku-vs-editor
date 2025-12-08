"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.extensionHostWorkspaceUri = exports.isInExtensionHost = void 0;
// For use with the `--in-ext-host` mode of the simulation works.ace
exports.isInExtensionHost = !!process.env.VSCODE_SIMULATION_EXTENSION_ENTRY;
const extensionHostWorkspaceUri = () => require('vscode').workspace.workspaceFolders[0].uri;
exports.extensionHostWorkspaceUri = extensionHostWorkspaceUri;
//# sourceMappingURL=isInExtensionHost.js.map