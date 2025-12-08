"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.srcWithAnnotatedNodeToDoc = srcWithAnnotatedNodeToDoc;
const annotatedSrc_1 = require("../../../../util/common/test/annotatedSrc");
const docGenParsing_1 = require("../../node/docGenParsing");
const markers_1 = require("./markers");
async function srcWithAnnotatedNodeToDoc(language, source, includeSelection = false) {
    const { deannotatedSrc, annotatedRange: selection } = (0, annotatedSrc_1.deannotateSrc)(source);
    const result = await (0, docGenParsing_1._getNodeToDocument)(language, deannotatedSrc, selection);
    const identifier = result.nodeIdentifier;
    const markers = [];
    if (identifier !== undefined && identifier !== '') {
        const identIx = deannotatedSrc.indexOf(identifier);
        if (identIx !== -1) {
            markers.push({
                startIndex: identIx,
                endIndex: identIx + identifier.length,
                kind: 'IDENT'
            });
        }
    }
    if (includeSelection) {
        markers.push({
            startIndex: selection.startIndex,
            endIndex: selection.endIndex,
            kind: 'SELECTION'
        });
    }
    markers.push({
        startIndex: result.nodeToDocument.startIndex,
        endIndex: result.nodeToDocument.endIndex,
        kind: result.nodeToDocument.type.toUpperCase(),
    });
    return (0, markers_1.insertRangeMarkers)(deannotatedSrc, markers);
}
//# sourceMappingURL=getNodeToDocument.util.js.map