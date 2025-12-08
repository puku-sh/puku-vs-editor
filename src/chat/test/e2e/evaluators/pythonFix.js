"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.pythonFixEvaluators = void 0;
const markdown_1 = require("../../../src/util/common/markdown");
const python_1 = require("../../simulation/diagnosticProviders/python");
async function pythonTestFnEvaluator(accessor, query, response, testFn) {
    const codeBlock = (0, markdown_1.extractCodeBlocks)(response).filter(x => x.language === 'python').at(0);
    if (!codeBlock) {
        return { success: false, errorMessage: 'No python code block found in response' };
    }
    const testCode = "\n" + codeBlock.code + '\n\n' + testFn + '\n\n' + 'test()';
    const isValid = await (0, python_1.isValidPythonFile)(accessor, testCode);
    return isValid ? { success: true } : { success: false, errorMessage: 'Unit test failed' };
}
const testFnSubArrayMinMaxSum = `
def test():
    assert subarray_min_max_sum([1,2,3,4,5,6,7,8,9]) == (36,44)
    assert subarray_min_max_sum([1,1,1]) == (2,2)
    assert subarray_min_max_sum([-1,-1,-1]) == (-2,-2)
    assert subarray_min_max_sum([-1,0,1]) == (-1,1)
    assert subarray_min_max_sum([1]) == None
`;
const testFnPalindrome = `
def test():
    assert palindrome('') == ''
    assert palindrome('a') == 'a'
    assert palindrome('aaaaaa') == 'aaaaaa'
    assert palindrome('aaaaa') == 'aaaaa'
    assert palindrome('abcddcba') == 'abcddcba'
    assert palindrome('abcdcba') == 'abcdcba'
    assert palindrome('xabcddcba') == 'abcddcba'
    assert palindrome('axbcdcba') == 'abcdcba'
    assert palindrome('abcxdcba') == 'abcdcba'
    assert palindrome('abcdxcba') == 'abcxcba'
    assert palindrome('abcdcxba') == 'abcdcba'
    assert palindrome('abcdcbxa') == 'abcdcba'
    assert palindrome('abcdcbax') == 'abcdcba'
    assert palindrome('xabcdcbay') == None
    assert palindrome('axbcdcbax') == None
`;
const PythonTestFnEvaluatorGenerator = (testFn) => {
    return (accessor, question, answer) => pythonTestFnEvaluator(accessor, question, answer, testFn);
};
exports.pythonFixEvaluators = {
    'case1.conversation.json': PythonTestFnEvaluatorGenerator(testFnSubArrayMinMaxSum),
    'case2.conversation.json': PythonTestFnEvaluatorGenerator(testFnSubArrayMinMaxSum),
    'case3.conversation.json': PythonTestFnEvaluatorGenerator(testFnSubArrayMinMaxSum),
    'case4.conversation.json': PythonTestFnEvaluatorGenerator(testFnSubArrayMinMaxSum),
    'case5.conversation.json': PythonTestFnEvaluatorGenerator(testFnSubArrayMinMaxSum),
    'case6.conversation.json': PythonTestFnEvaluatorGenerator(testFnPalindrome),
    'case7.conversation.json': PythonTestFnEvaluatorGenerator(testFnPalindrome),
    'case8.conversation.json': PythonTestFnEvaluatorGenerator(testFnPalindrome),
    'case9.conversation.json': PythonTestFnEvaluatorGenerator(testFnPalindrome),
    'case10.conversation.json': PythonTestFnEvaluatorGenerator(testFnPalindrome),
    'case11.conversation.json': PythonTestFnEvaluatorGenerator(testFnPalindrome),
    'case12.conversation.json': PythonTestFnEvaluatorGenerator(testFnPalindrome),
};
//# sourceMappingURL=pythonFix.js.map