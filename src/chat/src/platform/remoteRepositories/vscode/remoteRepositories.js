"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteRepositoriesService = exports.IRemoteRepositoriesService = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const services_1 = require("../../../util/common/services");
exports.IRemoteRepositoriesService = (0, services_1.createServiceIdentifier)('IRemoteRepositoriesService');
/**
 * Service for interacting with the Remote Repositories API.
 */
class RemoteRepositoriesService {
    async loadWorkspaceContents(workspaceUri) {
        const api = await this.getApi();
        // TODO: Defaulted to false in case the API doesn't exist... is this the correct assumption?
        return await api.loadWorkspaceContents?.(workspaceUri) ?? false;
    }
    getApi() {
        return this.getRemoteExtension().activate();
    }
    getRemoteExtension() {
        if (this._remoteHub !== undefined) {
            return this._remoteHub;
        }
        this._remoteHub = vscode_1.extensions.getExtension('ms-vscode.remote-repositories')
            ?? vscode_1.extensions.getExtension('GitHub.remoteHub')
            ?? vscode_1.extensions.getExtension('GitHub.remoteHub-insiders');
        if (this._remoteHub === undefined) {
            throw new Error(`No Remote repository extension found.`);
        }
        return this._remoteHub;
    }
}
exports.RemoteRepositoriesService = RemoteRepositoriesService;
//# sourceMappingURL=remoteRepositories.js.map