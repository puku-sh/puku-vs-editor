"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestToolEmbeddingsComputer = void 0;
class TestToolEmbeddingsComputer {
    retrieveSimilarEmbeddingsForAvailableTools(queryEmbedding, availableToolNames, limit) {
        return Promise.resolve(availableToolNames.slice(0, limit).map(t => t.name));
    }
    computeToolGroupings(tools, limit, token) {
        // Simple test implementation that groups tools by pairs
        const groups = [];
        for (let i = 0; i < tools.length; i += 2) {
            const group = tools.slice(i, i + 2);
            groups.push(group);
        }
        return Promise.resolve(groups.slice(0, limit));
    }
}
exports.TestToolEmbeddingsComputer = TestToolEmbeddingsComputer;
//# sourceMappingURL=testVirtualTools.js.map