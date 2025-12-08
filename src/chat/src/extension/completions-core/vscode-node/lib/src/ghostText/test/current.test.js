"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const current_1 = require("../current");
const ghostText_1 = require("../ghostText");
const fetch_fake_1 = require("../../openai/fetch.fake");
const assert = __importStar(require("assert"));
const uuid_1 = require("../../../../../../../util/vs/base/common/uuid");
suite('CurrentGhostText', function () {
    let current;
    setup(function () {
        current = new current_1.CurrentGhostText();
    });
    suite('getCompletionsForUserTyping', function () {
        test('returns undefined if there is no current completion', function () {
            const result = current.getCompletionsForUserTyping('func main() {\n', '');
            assert.strictEqual(result, undefined);
        });
        test('returns the current completion for an exact match', function () {
            const choice = fakeChoice();
            current.setGhostText('func main() {\n', '', [choice], ghostText_1.ResultType.Network);
            const result = current.getCompletionsForUserTyping('func main() {\n', '');
            assert.deepStrictEqual(result, [choice]);
        });
        test('returns the current completion for a prefix match', function () {
            const choice = fakeChoice();
            current.setGhostText('func main() {\n', '', [choice], ghostText_1.ResultType.Network);
            const result = current.getCompletionsForUserTyping('func main() {\nfmt.Print', '');
            assert.deepStrictEqual(result, [{ ...choice, completionText: 'ln("Hello, World!")' }]);
        });
        test('returns undefined when the prefix does not match', function () {
            const choice = fakeChoice();
            current.setGhostText('func main() {\n', '', [choice], ghostText_1.ResultType.Network);
            const result = current.getCompletionsForUserTyping('func test() {\n', '}');
            assert.strictEqual(result, undefined);
        });
        test('returns undefined when the suffix does not match', function () {
            const choice = fakeChoice();
            current.setGhostText('func main() {\n', '', [choice], ghostText_1.ResultType.Network);
            const result = current.getCompletionsForUserTyping('func main() {\n', '}');
            assert.strictEqual(result, undefined);
        });
        test('returns undefined when the completion does not match', function () {
            const choice = fakeChoice();
            current.setGhostText('func main() {\n', '', [choice], ghostText_1.ResultType.Network);
            const result = current.getCompletionsForUserTyping('func main() {\nerr', '}');
            assert.strictEqual(result, undefined);
        });
        test('returns undefined when the completion is exhausted', function () {
            const choice = fakeChoice();
            current.setGhostText('func main() {\n', '', [choice], ghostText_1.ResultType.Network);
            const result = current.getCompletionsForUserTyping('func main() {\nfmt.Println("Hello, World!")', '');
            assert.strictEqual(result, undefined);
        });
        test('does not change the current completion when TypingAsSuggested', function () {
            const choice = fakeChoice();
            current.setGhostText('func main() {\n', '', [choice], ghostText_1.ResultType.Network);
            current.setGhostText('func main() {\nfmt.', '', [fakeChoice('Println("Hello, World!")')], ghostText_1.ResultType.TypingAsSuggested);
            const result = current.getCompletionsForUserTyping('func main() {\n', '');
            assert.deepStrictEqual(result[0].requestId, choice.requestId);
        });
        test('only returns cycling completions that match', function () {
            const choice = fakeChoice();
            const choice2 = fakeChoice('err := nil', 1);
            const choice3 = fakeChoice('fmt.Println("hi")', 2);
            current.setGhostText('func main() {\n', '', [choice, choice2, choice3], ghostText_1.ResultType.Network);
            const result = current.getCompletionsForUserTyping('func main() {\nfmt', '');
            assert.deepStrictEqual(result, [
                { ...choice, completionText: '.Println("Hello, World!")' },
                { ...choice3, completionText: '.Println("hi")' },
            ]);
        });
    });
    suite('hasAcceptedCurrentCompletion', function () {
        test('returns false if there is no current completion', function () {
            assert.ok(!current.hasAcceptedCurrentCompletion('func main() {\n', ''));
        });
        test('returns false for uncompleted completions', function () {
            current.setGhostText('func main() {\n', '', [fakeChoice()], ghostText_1.ResultType.Network);
            assert.ok(!current.hasAcceptedCurrentCompletion('func main() {\n', ''));
            assert.ok(!current.hasAcceptedCurrentCompletion('func main() {\nfmt.Println', ''));
            assert.ok(!current.hasAcceptedCurrentCompletion('func main() {\nfmt.Println("hi")', ''));
        });
        test('returns true for completed completion', function () {
            current.setGhostText('func main() {\n', '', [fakeChoice()], ghostText_1.ResultType.Network);
            assert.ok(current.hasAcceptedCurrentCompletion('func main() {\nfmt.Println("Hello, World!")', ''));
        });
        test('returns false for completed completion with content_filter finish reason', function () {
            const choice = fakeChoice();
            choice.finishReason = 'content_filter';
            current.setGhostText('func main() {\n', '', [choice], ghostText_1.ResultType.Network);
            assert.ok(!current.hasAcceptedCurrentCompletion('func main() {\nfmt.Println("Hello, World!")', ''));
        });
        test('returns false for completed completion with snippy finish reason', function () {
            const choice = fakeChoice();
            choice.finishReason = 'snippy';
            current.setGhostText('func main() {\n', '', [choice], ghostText_1.ResultType.Network);
            assert.ok(!current.hasAcceptedCurrentCompletion('func main() {\nfmt.Println("Hello, World!")', ''));
        });
    });
    test('clientCompletionId returns the current completion id', function () {
        const choice = fakeChoice();
        current.setGhostText('func main() {\n', '', [choice], ghostText_1.ResultType.Network);
        assert.strictEqual(current.clientCompletionId, choice.clientCompletionId);
    });
});
function fakeChoice(completionText = 'fmt.Println("Hello, World!")', choice = 0) {
    return (0, fetch_fake_1.fakeAPIChoice)((0, uuid_1.generateUuid)(), choice, completionText);
}
//# sourceMappingURL=current.test.js.map