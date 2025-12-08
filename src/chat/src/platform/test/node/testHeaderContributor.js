"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestHeaderContributor = void 0;
class TestHeaderContributor {
    constructor() {
        this.headerKey = 'test';
    }
    contributeHeaderValues(headers) {
        headers[this.headerKey] = 'true';
    }
}
exports.TestHeaderContributor = TestHeaderContributor;
//# sourceMappingURL=testHeaderContributor.js.map