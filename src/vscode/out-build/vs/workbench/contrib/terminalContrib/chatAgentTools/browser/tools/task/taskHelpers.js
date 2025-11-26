/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../nls.js';
import { OutputMonitorState } from '../monitoring/types.js';
import { MarkdownString } from '../../../../../../../base/common/htmlContent.js';
export function toolResultDetailsFromResponse(terminalResults) {
    return Array.from(new Map(terminalResults
        .flatMap(r => r.resources?.filter(res => res.uri).map(res => {
        const range = res.range;
        const item = range !== undefined ? { uri: res.uri, range } : res.uri;
        const key = range !== undefined
            ? `${res.uri.toString()}-${range.toString()}`
            : `${res.uri.toString()}`;
        return [key, item];
    }) ?? [])).values());
}
export function toolResultMessageFromResponse(result, taskLabel, toolResultDetails, terminalResults, getOutputTool) {
    let resultSummary = '';
    if (result?.exitCode) {
        resultSummary = localize(13193, null, taskLabel, result.exitCode);
    }
    else {
        resultSummary += `\`${taskLabel}\` task `;
        const problemCount = toolResultDetails.length;
        if (getOutputTool) {
            return problemCount ? new MarkdownString(`Got output for ${resultSummary} with \`${problemCount}\` problem${problemCount === 1 ? '' : 's'}`) : new MarkdownString(`Got output for ${resultSummary}`);
        }
        else {
            const problemCount = toolResultDetails.length;
            resultSummary += terminalResults.every(r => r.state === OutputMonitorState.Idle)
                ? (problemCount
                    ? `finished with \`${problemCount}\` problem${problemCount === 1 ? '' : 's'}`
                    : 'finished')
                : (problemCount
                    ? `started and will continue to run in the background with \`${problemCount}\` problem${problemCount === 1 ? '' : 's'}`
                    : 'started and will continue to run in the background');
        }
    }
    return new MarkdownString(resultSummary);
}
//# sourceMappingURL=taskHelpers.js.map