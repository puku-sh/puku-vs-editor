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
        resultSummary = localize('copilotChat.taskFailedWithExitCode', 'Task `{0}` failed with exit code {1}.', taskLabel, result.exitCode);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza0hlbHBlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90b29scy90YXNrL3Rhc2tIZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFFakYsTUFBTSxVQUFVLDZCQUE2QixDQUFDLGVBQWtFO0lBQy9HLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FDeEIsZUFBZTtTQUNiLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUNaLENBQUMsQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUM3QyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBQ3hCLE1BQU0sSUFBSSxHQUFHLEtBQUssS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7UUFDckUsTUFBTSxHQUFHLEdBQUcsS0FBSyxLQUFLLFNBQVM7WUFDOUIsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDN0MsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1FBQzNCLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUE2QixDQUFDO0lBQ2hELENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FDUixDQUNGLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUNiLENBQUM7QUFFRCxNQUFNLFVBQVUsNkJBQTZCLENBQUMsTUFBZ0MsRUFBRSxTQUFpQixFQUFFLGlCQUFxQyxFQUFFLGVBQTZGLEVBQUUsYUFBdUI7SUFDL1AsSUFBSSxhQUFhLEdBQUcsRUFBRSxDQUFDO0lBQ3ZCLElBQUksTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDO1FBQ3RCLGFBQWEsR0FBRyxRQUFRLENBQUMsb0NBQW9DLEVBQUUsdUNBQXVDLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNySSxDQUFDO1NBQU0sQ0FBQztRQUNQLGFBQWEsSUFBSSxLQUFLLFNBQVMsVUFBVSxDQUFDO1FBQzFDLE1BQU0sWUFBWSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQztRQUM5QyxJQUFJLGFBQWEsRUFBRSxDQUFDO1lBQ25CLE9BQU8sWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxrQkFBa0IsYUFBYSxXQUFXLFlBQVksYUFBYSxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksY0FBYyxDQUFDLGtCQUFrQixhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBQ3RNLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDO1lBQzlDLGFBQWEsSUFBSSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssS0FBSyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7Z0JBQy9FLENBQUMsQ0FBQyxDQUFDLFlBQVk7b0JBQ2QsQ0FBQyxDQUFDLG1CQUFtQixZQUFZLGFBQWEsWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUU7b0JBQzdFLENBQUMsQ0FBQyxVQUFVLENBQUM7Z0JBQ2QsQ0FBQyxDQUFDLENBQUMsWUFBWTtvQkFDZCxDQUFDLENBQUMsNkRBQTZELFlBQVksYUFBYSxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRTtvQkFDdkgsQ0FBQyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7UUFDM0QsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLElBQUksY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzFDLENBQUMifQ==