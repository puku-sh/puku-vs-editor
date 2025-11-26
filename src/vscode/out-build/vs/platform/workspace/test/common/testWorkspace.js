/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isLinux, isWindows } from '../../../../base/common/platform.js';
import { URI } from '../../../../base/common/uri.js';
import { toWorkspaceFolder, Workspace as BaseWorkspace } from '../../common/workspace.js';
export class Workspace extends BaseWorkspace {
    constructor(id, folders = [], configuration = null, ignorePathCasing = () => !isLinux) {
        super(id, folders, false, configuration, ignorePathCasing);
    }
}
const wsUri = URI.file(isWindows ? 'C:\\testWorkspace' : '/testWorkspace');
export const TestWorkspace = testWorkspace(wsUri);
export function testWorkspace(resource) {
    return new Workspace(resource.toString(), [toWorkspaceFolder(resource)]);
}
//# sourceMappingURL=testWorkspace.js.map