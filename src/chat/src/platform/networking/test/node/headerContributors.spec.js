"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const sinon = __importStar(require("sinon"));
const vitest_1 = require("vitest");
const testHeaderContributor_1 = require("../../../test/node/testHeaderContributor");
const networking_1 = require("../../common/networking");
(0, vitest_1.suite)('HeaderContributors', () => {
    let contributorCollection;
    let contributor;
    (0, vitest_1.beforeEach)(() => {
        contributorCollection = new networking_1.HeaderContributors();
        contributor = new testHeaderContributor_1.TestHeaderContributor();
        contributorCollection.add(contributor);
    });
    (0, vitest_1.test)('should allow adding a contributor', function () {
        assert_1.default.strictEqual(contributorCollection.size(), 1);
    });
    (0, vitest_1.test)('should call all registered contributors', function () {
        const spy = sinon.spy(contributor, 'contributeHeaderValues');
        const headers = {};
        contributorCollection.contributeHeaders(headers);
        assert_1.default.strictEqual(spy.callCount, 1);
        assert_1.default.strictEqual(spy.calledWith(headers), true);
    });
    (0, vitest_1.test)('should allow removing a contributor', () => {
        contributorCollection.remove(contributor);
        assert_1.default.strictEqual(contributorCollection.size(), 0);
    });
});
//# sourceMappingURL=headerContributors.spec.js.map