"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputType = exports.InterceptedRequest = exports.RUN_METADATA = exports.SCORECARD_FILENAME = exports.REPORT_FILENAME = exports.AML_OUTPUT_PATH = exports.PRODUCED_BASELINE_FILENAME = exports.OLD_BASELINE_FILENAME = exports.STDOUT_FILENAME = exports.SIMULATION_FOLDER_NAME = exports.NEXT_EDIT_SUGGESTION_TAG = exports.NES_LOG_CONTEXT_TAG = exports.NES_USER_EDITS_HISTORY_TAG = exports.SIDEBAR_RAW_RESPONSE_TAG = exports.INLINE_NOTEBOOK_EXECUTION_TAG = exports.INLINE_STATE_TAG = exports.INLINE_CHANGED_DOC_TAG = exports.INLINE_INITIAL_DOC_TAG = exports.REQUESTS_TAG = exports.SIMULATION_REQUESTS_FILENAME = exports.IMPLICIT_LOG_TAG = exports.SIMULATION_IMPLICIT_LOG_FILENAME = exports.EXPLICIT_LOG_TAG = exports.SIMULATION_EXPLICIT_LOG_FILENAME = void 0;
exports.generateOutputFolderName = generateOutputFolderName;
/**
 * Types shared between simulation framework and simulation workbench.
 */
exports.SIMULATION_EXPLICIT_LOG_FILENAME = 'sim-log.md';
exports.EXPLICIT_LOG_TAG = 'explicit-log-tag';
exports.SIMULATION_IMPLICIT_LOG_FILENAME = 'sim-log.txt';
exports.IMPLICIT_LOG_TAG = 'implicit-log-tag';
/** Suffix for files that keep intercepted requests; these files are written and read with tag `REQUESTS_TAG`.  */
exports.SIMULATION_REQUESTS_FILENAME = 'sim-requests.txt'; // using .txt instead of .json to avoid breaking automation scripts
/** This tag is used to read `SIMULATION_REQUESTS_FILENAME` */
exports.REQUESTS_TAG = 'requests-tag';
exports.INLINE_INITIAL_DOC_TAG = 'inline-initial-doc-tag';
exports.INLINE_CHANGED_DOC_TAG = 'inline-changed-doc-tag';
exports.INLINE_STATE_TAG = 'inline-state-tag';
exports.INLINE_NOTEBOOK_EXECUTION_TAG = 'inline-notebook-execution-tag';
exports.SIDEBAR_RAW_RESPONSE_TAG = 'sidebar-raw-response-tag';
exports.NES_USER_EDITS_HISTORY_TAG = 'nes-user-edits-history-tag';
exports.NES_LOG_CONTEXT_TAG = 'nes-log-context-tag';
exports.NEXT_EDIT_SUGGESTION_TAG = 'next-edit-suggestion-tag';
exports.SIMULATION_FOLDER_NAME = '.simulation';
exports.STDOUT_FILENAME = 'stdout.json.txt'; // using .txt instead of .json to avoid breaking automation scripts
exports.OLD_BASELINE_FILENAME = 'baseline.old.json.txt'; // using .txt instead of .json to avoid breaking automation scripts
exports.PRODUCED_BASELINE_FILENAME = 'baseline.produced.json.txt'; // using .txt instead of .json to avoid breaking automation scripts
exports.AML_OUTPUT_PATH = 'test/aml/out';
exports.REPORT_FILENAME = 'report.json';
exports.SCORECARD_FILENAME = 'scorecard.csv';
exports.RUN_METADATA = 'metadata.json';
class InterceptedRequest {
    constructor(requestMessages, requestOptions, response, cacheKey, model, duration) {
        this.requestMessages = requestMessages;
        this.requestOptions = requestOptions;
        this.response = response;
        this.cacheKey = cacheKey;
        this.model = model;
        this.duration = duration;
        // console.log('InterceptedRequest', requestMessages, requestOptions, response, cacheKey, model);
    }
    static fromJSON(json) {
        const request = new InterceptedRequest(json.requestMessages, json.requestOptions, json.response, json.cacheKey, json.model, json.duration);
        return request;
    }
    toJSON() {
        return {
            requestMessages: this.requestMessages,
            requestOptions: this.requestOptions,
            response: this.response,
            cacheKey: this.cacheKey,
            model: this.model,
            duration: this.duration
        };
    }
}
exports.InterceptedRequest = InterceptedRequest;
var OutputType;
(function (OutputType) {
    OutputType["detectedTest"] = "detectedTest";
    OutputType["detectedSuite"] = "detectedSuite";
    OutputType["initialTestSummary"] = "initialTestSummary";
    OutputType["skippedTest"] = "skippedTest";
    OutputType["testRunStart"] = "testRunStart";
    OutputType["testRunEnd"] = "testRunEnd";
    /** Currently sent only when early termination happens, e.g., because of `--require-cache` option */
    OutputType["terminated"] = "terminated";
    OutputType["deviceCodeCallback"] = "deviceCodeCallback";
})(OutputType || (exports.OutputType = OutputType = {}));
/**
 * Generates a unique output folder name based on the current date and time.
 * @returns A string representing the output folder name.
 */
function generateOutputFolderName() {
    const twodigits = (n) => String(n).padStart(2, '0');
    const d = new Date();
    const date = `${d.getFullYear()}${twodigits(d.getMonth() + 1)}${twodigits(d.getDate())}`;
    const time = `${twodigits(d.getHours())}${twodigits(d.getMinutes())}${twodigits(d.getSeconds())}`;
    return `out-${date}-${time}`;
}
//# sourceMappingURL=sharedTypes.js.map