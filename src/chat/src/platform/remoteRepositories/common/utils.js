"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGitHubRemoteRepository = isGitHubRemoteRepository;
function isGitHubRemoteRepository(uri) {
    return uri.scheme === 'vscode-vfs' && uri.authority.startsWith('github');
}
//# sourceMappingURL=utils.js.map