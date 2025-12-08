"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizerError = exports.IToolGroupingCache = exports.IToolGroupingService = void 0;
const services_1 = require("../../../../util/common/services");
exports.IToolGroupingService = (0, services_1.createServiceIdentifier)('IToolGroupingService');
exports.IToolGroupingCache = (0, services_1.createServiceIdentifier)('IToolGroupingCache');
class SummarizerError extends Error {
}
exports.SummarizerError = SummarizerError;
//# sourceMappingURL=virtualToolTypes.js.map