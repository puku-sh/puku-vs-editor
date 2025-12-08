"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopGitCommitMessageService = exports.IGitCommitMessageService = void 0;
const services_1 = require("../../../util/common/services");
exports.IGitCommitMessageService = (0, services_1.createServiceIdentifier)('IGitCommitMessageService');
/**
 * @remark For testing purposes only.
 */
class NoopGitCommitMessageService {
    generateCommitMessage() {
        return Promise.resolve(undefined);
    }
    getRepository() {
        return null;
    }
}
exports.NoopGitCommitMessageService = NoopGitCommitMessageService;
//# sourceMappingURL=gitCommitMessageService.js.map