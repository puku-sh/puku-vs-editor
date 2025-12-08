"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestInformation = exports.ITestInformation = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const services_1 = require("../../src/util/common/services");
exports.ITestInformation = (0, services_1.createServiceIdentifier)('ITestInformation');
class TestInformation {
    constructor(_testInfo) {
        this._testInfo = _testInfo;
    }
    get fullTestName() {
        return this._testInfo.fullName;
    }
    get testFileName() {
        return this._testInfo.options.location?.path;
    }
}
exports.TestInformation = TestInformation;
//# sourceMappingURL=testInformation.js.map