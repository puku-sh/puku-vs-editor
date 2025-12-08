"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
const logService_1 = require("../../../platform/log/common/logService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
// import { WorkspaceChunkSearch } from '../../../platform/workspaceChunkSearch/node/workspaceChunkSearch';
function create(accessor) {
    const logService = accessor.get(logService_1.ILogService);
    accessor.get(workspaceService_1.IWorkspaceService).ensureWorkspaceIsFullyLoaded().catch(error => logService.error(error));
    // TODO @TylerLeonhardt: Bring this back once we have improved the performance of the workspace chunk search indexing
    // see https://github.com/microsoft/vscode-copilot-release/issues/784
    // await accessor.get(WorkspaceChunkSearch).triggerIndexing();
}
//# sourceMappingURL=workspaceChunkSearch.contribution.js.map