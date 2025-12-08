"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.deannotateSrc = deannotateSrc;
function deannotateSrc(annotatedSrc) {
    const startIndex = annotatedSrc.indexOf('<<');
    if (startIndex === -1) {
        throw new Error('No << found in the annotated source');
    }
    const endIndex = annotatedSrc.indexOf('>>') - 2;
    if (endIndex === -3 /* because `-1-2` */) {
        throw new Error('No >> found in the annotated source');
    }
    return {
        deannotatedSrc: annotatedSrc.replace('<<', '').replace('>>', ''),
        annotatedRange: {
            startIndex,
            endIndex,
        },
    };
}
//# sourceMappingURL=annotatedSrc.js.map