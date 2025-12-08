"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.srcWithAnnotatedLastTest = srcWithAnnotatedLastTest;
const testGenParsing_1 = require("../../../node/testGenParsing");
const markers_1 = require("../markers");
async function srcWithAnnotatedLastTest(language, src) {
    const result = await (0, testGenParsing_1._findLastTest)(language, src);
    if (result === null) {
        return 'test NOT FOUND';
    }
    const markers = [];
    markers.push({
        startIndex: result.startIndex,
        endIndex: result.endIndex,
        kind: 'TEST',
    });
    return (0, markers_1.insertRangeMarkers)(src, markers);
}
//# sourceMappingURL=util.js.map