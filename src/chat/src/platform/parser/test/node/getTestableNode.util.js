"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.srcWithAnnotatedTestableNode = srcWithAnnotatedTestableNode;
const annotatedSrc_1 = require("../../../../util/common/test/annotatedSrc");
const testGenParsing_1 = require("../../node/testGenParsing");
const markers_1 = require("./markers");
async function srcWithAnnotatedTestableNode(language, source, includeSelection = false) {
    const { deannotatedSrc, annotatedRange: selection } = (0, annotatedSrc_1.deannotateSrc)(source);
    const result = await (0, testGenParsing_1._getTestableNode)(language, deannotatedSrc, selection);
    if (result === null) {
        return 'testable node NOT found';
    }
    const markers = [];
    const ident = result.identifier;
    markers.push({
        startIndex: ident.range.startIndex,
        endIndex: ident.range.endIndex,
        kind: 'IDENT',
    });
    if (includeSelection) {
        markers.push({
            startIndex: selection.startIndex,
            endIndex: selection.endIndex,
            kind: 'SELECTION'
        });
    }
    markers.push({
        startIndex: result.node.startIndex,
        endIndex: result.node.endIndex,
        kind: `NODE(${result.node.type})`,
    });
    return (0, markers_1.insertRangeMarkers)(deannotatedSrc, markers);
}
//# sourceMappingURL=getTestableNode.util.js.map