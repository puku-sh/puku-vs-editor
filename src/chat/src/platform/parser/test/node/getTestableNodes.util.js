"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.annotTestableNodes = annotTestableNodes;
const testGenParsing_1 = require("../../node/testGenParsing");
const markers_1 = require("./markers");
async function annotTestableNodes(language, source, includeSelection = false) {
    const result = await (0, testGenParsing_1._getTestableNodes)(language, source);
    if (result === null) {
        return 'testable node NOT found';
    }
    const markers = result.flatMap(node => {
        return [
            {
                startIndex: node.node.startIndex,
                endIndex: node.node.endIndex,
                kind: 'NODE',
            },
            {
                startIndex: node.identifier.range.startIndex,
                endIndex: node.identifier.range.endIndex,
                kind: 'IDENT',
            }
        ];
    });
    return (0, markers_1.insertRangeMarkers)(source, markers);
}
//# sourceMappingURL=getTestableNodes.util.js.map