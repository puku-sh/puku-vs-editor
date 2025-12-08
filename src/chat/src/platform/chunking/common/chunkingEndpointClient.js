"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IChunkingEndpointClient = exports.EmbeddingsComputeQos = exports.ComputeBatchInfo = void 0;
const services_1 = require("../../../util/common/services");
class ComputeBatchInfo {
    constructor() {
        this.recomputedFileCount = 0;
        this.sentContentTextLength = 0;
    }
}
exports.ComputeBatchInfo = ComputeBatchInfo;
var EmbeddingsComputeQos;
(function (EmbeddingsComputeQos) {
    EmbeddingsComputeQos["Batch"] = "Batch";
    EmbeddingsComputeQos["Online"] = "Online";
})(EmbeddingsComputeQos || (exports.EmbeddingsComputeQos = EmbeddingsComputeQos = {}));
exports.IChunkingEndpointClient = (0, services_1.createServiceIdentifier)('IChunkingEndpointClient');
//# sourceMappingURL=chunkingEndpointClient.js.map