"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailingDevContainerConfigurationService = exports.IDevContainerConfigurationService = void 0;
const services_1 = require("../../../util/common/services");
exports.IDevContainerConfigurationService = (0, services_1.createServiceIdentifier)('IDevContainerConfigurationService');
/**
 * @remark For testing purposes only.
 */
class FailingDevContainerConfigurationService {
    generateConfiguration(_args, _cancellationToken) {
        return Promise.resolve({ type: 'failure', message: 'For testing: not implemented' });
    }
}
exports.FailingDevContainerConfigurationService = FailingDevContainerConfigurationService;
//# sourceMappingURL=devContainerConfigurationService.js.map