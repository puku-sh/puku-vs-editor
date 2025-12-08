"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAlternativeNotebookContentService = void 0;
const alternativeContent_1 = require("./alternativeContent");
class MockAlternativeNotebookContentService {
    constructor(format = 'json') {
        this.format = format;
        //
    }
    getFormat() {
        return this.format;
    }
    create(format) {
        return (0, alternativeContent_1.getAlternativeNotebookDocumentProvider)(format);
    }
}
exports.MockAlternativeNotebookContentService = MockAlternativeNotebookContentService;
//# sourceMappingURL=mockAlternativeContentService.js.map