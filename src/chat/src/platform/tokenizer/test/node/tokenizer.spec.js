"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const tokenizer_1 = require("../../../../util/common/tokenizer");
const nullTelemetryService_1 = require("../../../telemetry/common/nullTelemetryService");
const tokenizer_2 = require("../../node/tokenizer");
(0, vitest_1.suite)('Tokenization', function () {
    let multiModelTokenizer;
    (0, vitest_1.beforeAll)(() => {
        multiModelTokenizer = new tokenizer_2.TokenizerProvider(false, new nullTelemetryService_1.NullTelemetryService());
    });
    (0, vitest_1.test)('Counts tokens - basic', async function () {
        const tokens = await multiModelTokenizer.acquireTokenizer({ tokenizer: tokenizer_1.TokenizerType.O200K }).tokenLength('Hello world!');
        assert_1.default.deepStrictEqual(tokens, 3);
    });
    (0, vitest_1.test)('Counts tokens - advanced', async function () {
        const tokens = await multiModelTokenizer.acquireTokenizer({ tokenizer: tokenizer_1.TokenizerType.O200K }).tokenLength('functionfibonacci(n:number):number{if(n<=0){return0;}elseif(n==1){return1;}else{returnfibonacci(n-1)+fibonacci(n-2);}}');
        assert_1.default.deepStrictEqual(tokens, 39);
    });
});
//# sourceMappingURL=tokenizer.spec.js.map