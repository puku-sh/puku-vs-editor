/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
/**
 * Trust Context Keys
 */
export const WorkspaceTrustContext = {
    IsEnabled: new RawContextKey('isWorkspaceTrustEnabled', false, localize(14747, null)),
    IsTrusted: new RawContextKey('isWorkspaceTrusted', false, localize(14748, null))
};
export const MANAGE_TRUST_COMMAND_ID = 'workbench.trust.manage';
//# sourceMappingURL=workspace.js.map