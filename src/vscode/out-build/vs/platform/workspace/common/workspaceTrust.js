/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var WorkspaceTrustScope;
(function (WorkspaceTrustScope) {
    WorkspaceTrustScope[WorkspaceTrustScope["Local"] = 0] = "Local";
    WorkspaceTrustScope[WorkspaceTrustScope["Remote"] = 1] = "Remote";
})(WorkspaceTrustScope || (WorkspaceTrustScope = {}));
export const IWorkspaceTrustEnablementService = createDecorator('workspaceTrustEnablementService');
export const IWorkspaceTrustManagementService = createDecorator('workspaceTrustManagementService');
export var WorkspaceTrustUriResponse;
(function (WorkspaceTrustUriResponse) {
    WorkspaceTrustUriResponse[WorkspaceTrustUriResponse["Open"] = 1] = "Open";
    WorkspaceTrustUriResponse[WorkspaceTrustUriResponse["OpenInNewWindow"] = 2] = "OpenInNewWindow";
    WorkspaceTrustUriResponse[WorkspaceTrustUriResponse["Cancel"] = 3] = "Cancel";
})(WorkspaceTrustUriResponse || (WorkspaceTrustUriResponse = {}));
export const IWorkspaceTrustRequestService = createDecorator('workspaceTrustRequestService');
//# sourceMappingURL=workspaceTrust.js.map