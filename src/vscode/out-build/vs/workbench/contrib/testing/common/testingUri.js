/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../base/common/assert.js';
import { URI } from '../../../../base/common/uri.js';
export const TEST_DATA_SCHEME = 'vscode-test-data';
export var TestUriType;
(function (TestUriType) {
    /** All console output for a task */
    TestUriType[TestUriType["TaskOutput"] = 0] = "TaskOutput";
    /** All console output for a test in a task */
    TestUriType[TestUriType["TestOutput"] = 1] = "TestOutput";
    /** Specific message in a test */
    TestUriType[TestUriType["ResultMessage"] = 2] = "ResultMessage";
    /** Specific actual output message in a test */
    TestUriType[TestUriType["ResultActualOutput"] = 3] = "ResultActualOutput";
    /** Specific expected output message in a test */
    TestUriType[TestUriType["ResultExpectedOutput"] = 4] = "ResultExpectedOutput";
})(TestUriType || (TestUriType = {}));
var TestUriParts;
(function (TestUriParts) {
    TestUriParts["Results"] = "results";
    TestUriParts["AllOutput"] = "output";
    TestUriParts["Messages"] = "message";
    TestUriParts["Text"] = "TestFailureMessage";
    TestUriParts["ActualOutput"] = "ActualOutput";
    TestUriParts["ExpectedOutput"] = "ExpectedOutput";
})(TestUriParts || (TestUriParts = {}));
export const parseTestUri = (uri) => {
    const type = uri.authority;
    const [resultId, ...request] = uri.path.slice(1).split('/');
    if (request[0] === "message" /* TestUriParts.Messages */) {
        const taskIndex = Number(request[1]);
        const testExtId = uri.query;
        const index = Number(request[2]);
        const part = request[3];
        if (type === "results" /* TestUriParts.Results */) {
            switch (part) {
                case "TestFailureMessage" /* TestUriParts.Text */:
                    return { resultId, taskIndex, testExtId, messageIndex: index, type: 2 /* TestUriType.ResultMessage */ };
                case "ActualOutput" /* TestUriParts.ActualOutput */:
                    return { resultId, taskIndex, testExtId, messageIndex: index, type: 3 /* TestUriType.ResultActualOutput */ };
                case "ExpectedOutput" /* TestUriParts.ExpectedOutput */:
                    return { resultId, taskIndex, testExtId, messageIndex: index, type: 4 /* TestUriType.ResultExpectedOutput */ };
                case "message" /* TestUriParts.Messages */:
            }
        }
    }
    if (request[0] === "output" /* TestUriParts.AllOutput */) {
        const testExtId = uri.query;
        const taskIndex = Number(request[1]);
        return testExtId
            ? { resultId, taskIndex, testExtId, type: 1 /* TestUriType.TestOutput */ }
            : { resultId, taskIndex, type: 0 /* TestUriType.TaskOutput */ };
    }
    return undefined;
};
export const buildTestUri = (parsed) => {
    const uriParts = {
        scheme: TEST_DATA_SCHEME,
        authority: "results" /* TestUriParts.Results */
    };
    if (parsed.type === 0 /* TestUriType.TaskOutput */) {
        return URI.from({
            ...uriParts,
            path: ['', parsed.resultId, "output" /* TestUriParts.AllOutput */, parsed.taskIndex].join('/'),
        });
    }
    const msgRef = (resultId, ...remaining) => URI.from({
        ...uriParts,
        query: parsed.testExtId,
        path: ['', resultId, "message" /* TestUriParts.Messages */, ...remaining].join('/'),
    });
    switch (parsed.type) {
        case 3 /* TestUriType.ResultActualOutput */:
            return msgRef(parsed.resultId, parsed.taskIndex, parsed.messageIndex, "ActualOutput" /* TestUriParts.ActualOutput */);
        case 4 /* TestUriType.ResultExpectedOutput */:
            return msgRef(parsed.resultId, parsed.taskIndex, parsed.messageIndex, "ExpectedOutput" /* TestUriParts.ExpectedOutput */);
        case 2 /* TestUriType.ResultMessage */:
            return msgRef(parsed.resultId, parsed.taskIndex, parsed.messageIndex, "TestFailureMessage" /* TestUriParts.Text */);
        case 1 /* TestUriType.TestOutput */:
            return URI.from({
                ...uriParts,
                query: parsed.testExtId,
                path: ['', parsed.resultId, "output" /* TestUriParts.AllOutput */, parsed.taskIndex].join('/'),
            });
        default:
            assertNever(parsed, 'Invalid test uri');
    }
};
//# sourceMappingURL=testingUri.js.map