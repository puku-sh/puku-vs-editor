/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { disposableTimeout, RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { basename, isAbsolute } from '../../../../base/common/path.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ILanguageModelToolsService, ToolDataSource, } from '../../chat/common/languageModelToolsService.js';
import { TestId } from './testId.js';
import { getTotalCoveragePercent } from './testCoverage.js';
import { TestingContextKeys } from './testingContextKeys.js';
import { collectTestStateCounts, getTestProgressText } from './testingProgressMessages.js';
import { isFailedState } from './testingStates.js';
import { ITestResultService } from './testResultService.js';
import { ITestService, testsInFile, waitForTestToBeIdle } from './testService.js';
import { Position } from '../../../../editor/common/core/position.js';
import { ITestProfileService } from './testProfileService.js';
let TestingChatAgentToolContribution = class TestingChatAgentToolContribution extends Disposable {
    static { this.ID = 'workbench.contrib.testing.chatAgentTool'; }
    constructor(instantiationService, toolsService, contextKeyService) {
        super();
        const runTestsTool = instantiationService.createInstance(RunTestTool);
        this._register(toolsService.registerTool(RunTestTool.DEFINITION, runTestsTool));
        this._register(toolsService.launchToolSet.addTool(RunTestTool.DEFINITION));
        // todo@connor4312: temporary for 1.103 release during changeover
        contextKeyService.createKey('chat.coreTestFailureToolEnabled', true).set(true);
    }
};
TestingChatAgentToolContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILanguageModelToolsService),
    __param(2, IContextKeyService)
], TestingChatAgentToolContribution);
export { TestingChatAgentToolContribution };
let RunTestTool = class RunTestTool {
    static { this.ID = 'runTests'; }
    static { this.DEFINITION = {
        id: this.ID,
        toolReferenceName: 'runTests',
        legacyToolReferenceFullNames: ['runTests'],
        canBeReferencedInPrompt: true,
        when: TestingContextKeys.hasRunnableTests,
        displayName: 'Run tests',
        modelDescription: 'Runs unit tests in files. Use this tool if the user asks to run tests or when you want to validate changes using unit tests, and prefer using this tool instead of the terminal tool. When possible, always try to provide `files` paths containing the relevant unit tests in order to avoid unnecessarily long test runs. This tool outputs detailed information about the results of the test run. Set mode="coverage" to also collect coverage and optionally provide coverageFiles for focused reporting.',
        icon: Codicon.beaker,
        inputSchema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Absolute paths to the test files to run. If not provided, all test files will be run.',
                },
                testNames: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'An array of test names to run. Depending on the context, test names defined in code may be strings or the names of functions or classes containing the test cases. If not provided, all tests in the files will be run.',
                },
                mode: {
                    type: 'string',
                    enum: ['run', 'coverage'],
                    description: 'Execution mode: "run" (default) runs tests normally, "coverage" collects coverage.',
                },
                coverageFiles: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'When mode="coverage": absolute file paths to include detailed coverage info for. Only the first matching file will be summarized.'
                }
            },
        },
        userDescription: localize('runTestTool.userDescription', 'Run unit tests (optionally with coverage)'),
        source: ToolDataSource.Internal,
        tags: [
            'vscode_editing_with_tests',
            'enable_other_tool_copilot_readFile',
            'enable_other_tool_copilot_listDirectory',
            'enable_other_tool_copilot_findFiles',
            'enable_other_tool_copilot_runTests',
            'enable_other_tool_copilot_runTestsWithCoverage',
            'enable_other_tool_copilot_testFailure',
        ],
    }; }
    constructor(_testService, _uriIdentityService, _workspaceContextService, _testResultService, _testProfileService) {
        this._testService = _testService;
        this._uriIdentityService = _uriIdentityService;
        this._workspaceContextService = _workspaceContextService;
        this._testResultService = _testResultService;
        this._testProfileService = _testProfileService;
    }
    async invoke(invocation, countTokens, progress, token) {
        const params = invocation.parameters;
        const mode = (params.mode === 'coverage' ? 'coverage' : 'run');
        let group = (mode === 'coverage' ? 8 /* TestRunProfileBitset.Coverage */ : 2 /* TestRunProfileBitset.Run */);
        const coverageFiles = (mode === 'coverage' ? (params.coverageFiles && params.coverageFiles.length ? params.coverageFiles : undefined) : undefined);
        const testFiles = await this._getFileTestsToRun(params, progress);
        const testCases = await this._getTestCasesToRun(params, testFiles, progress);
        if (!testCases.length) {
            return {
                content: [{ kind: 'text', value: 'No tests found in the files. Ensure the correct absolute paths are passed to the tool.' }],
                toolResultError: localize('runTestTool.noTests', 'No tests found in the files'),
            };
        }
        progress.report({ message: localize('runTestTool.invoke.progress', 'Starting test run...') });
        // If the model asks for coverage but the test provider doesn't support it, use normal 'run' mode
        if (group === 8 /* TestRunProfileBitset.Coverage */) {
            if (!testCases.some(tc => this._testProfileService.capabilitiesForTest(tc.item) & 8 /* TestRunProfileBitset.Coverage */)) {
                group = 2 /* TestRunProfileBitset.Run */;
            }
        }
        const result = await this._captureTestResult(testCases, group, token);
        if (!result) {
            return {
                content: [{ kind: 'text', value: 'No test run was started. Instruct the user to ensure their test runner is correctly configured' }],
                toolResultError: localize('runTestTool.noRunStarted', 'No test run was started. This may be an issue with your test runner or extension.'),
            };
        }
        await this._monitorRunProgress(result, progress, token);
        if (token.isCancellationRequested) {
            this._testService.cancelTestRun(result.id);
            return {
                content: [{ kind: 'text', value: localize('runTestTool.invoke.cancelled', 'Test run was cancelled.') }],
                toolResultMessage: localize('runTestTool.invoke.cancelled', 'Test run was cancelled.'),
            };
        }
        const summary = await this._buildSummary(result, mode, coverageFiles);
        const content = [{ kind: 'text', value: summary }];
        return {
            content: content,
            toolResultMessage: getTestProgressText(collectTestStateCounts(false, [result])),
        };
    }
    async _buildSummary(result, mode, coverageFiles) {
        const failures = result.counts[6 /* TestResultState.Errored */] + result.counts[4 /* TestResultState.Failed */];
        let str = `<summary passed=${result.counts[3 /* TestResultState.Passed */]} failed=${failures} />\n`;
        if (failures !== 0) {
            str += await this._getFailureDetails(result);
        }
        if (mode === 'coverage') {
            str += await this._getCoverageSummary(result, coverageFiles);
        }
        return str;
    }
    async _getCoverageSummary(result, coverageFiles) {
        if (!coverageFiles || !coverageFiles.length) {
            return '';
        }
        for (const task of result.tasks) {
            const coverage = task.coverage.get();
            if (!coverage) {
                continue;
            }
            const normalized = coverageFiles.map(file => URI.file(file).fsPath);
            const coveredFilesMap = new Map();
            for (const file of coverage.getAllFiles().values()) {
                coveredFilesMap.set(file.uri.fsPath, file);
            }
            for (const path of normalized) {
                const file = coveredFilesMap.get(path);
                if (!file) {
                    continue;
                }
                let summary = `<coverage task=${JSON.stringify(task.name || '')}>\n`;
                const pct = getTotalCoveragePercent(file.statement, file.branch, file.declaration) * 100;
                summary += `<firstUncoveredFile path=${JSON.stringify(path)} statementsCovered=${file.statement.covered} statementsTotal=${file.statement.total}`;
                if (file.branch) {
                    summary += ` branchesCovered=${file.branch.covered} branchesTotal=${file.branch.total}`;
                }
                if (file.declaration) {
                    summary += ` declarationsCovered=${file.declaration.covered} declarationsTotal=${file.declaration.total}`;
                }
                summary += ` percent=${pct.toFixed(2)}`;
                try {
                    const details = await file.details();
                    for (const detail of details) {
                        if (detail.count || !detail.location) {
                            continue;
                        }
                        let startLine;
                        let endLine;
                        if (Position.isIPosition(detail.location)) {
                            startLine = endLine = detail.location.lineNumber;
                        }
                        else {
                            startLine = detail.location.startLineNumber;
                            endLine = detail.location.endLineNumber;
                        }
                        summary += ` firstUncoveredStart=${startLine} firstUncoveredEnd=${endLine}`;
                        break;
                    }
                }
                catch { /* ignore */ }
                summary += ` />\n`;
                summary += `</coverage>\n`;
                return summary;
            }
        }
        return '';
    }
    async _getFailureDetails(result) {
        let str = '';
        let hadMessages = false;
        for (const failure of result.tests) {
            if (!isFailedState(failure.ownComputedState)) {
                continue;
            }
            const [, ...testPath] = TestId.split(failure.item.extId);
            const testName = testPath.pop();
            str += `<testFailure name=${JSON.stringify(testName)} path=${JSON.stringify(testPath.join(' > '))}>\n`;
            // Extract detailed failure information from error messages
            for (const task of failure.tasks) {
                for (const message of task.messages.filter(m => m.type === 0 /* TestMessageType.Error */)) {
                    hadMessages = true;
                    // Add expected/actual outputs if available
                    if (message.expected !== undefined && message.actual !== undefined) {
                        str += `<expectedOutput>\n${message.expected}\n</expectedOutput>\n`;
                        str += `<actualOutput>\n${message.actual}\n</actualOutput>\n`;
                    }
                    else {
                        // Fallback to the message content
                        const messageText = typeof message.message === 'string' ? message.message : message.message.value;
                        str += `<message>\n${messageText}\n</message>\n`;
                    }
                    // Add stack trace information if available (limit to first 10 frames)
                    if (message.stackTrace && message.stackTrace.length > 0) {
                        for (const frame of message.stackTrace.slice(0, 10)) {
                            if (frame.uri && frame.position) {
                                str += `<stackFrame path="${frame.uri.fsPath}" line="${frame.position.lineNumber}" col="${frame.position.column}" />\n`;
                            }
                            else if (frame.uri) {
                                str += `<stackFrame path="${frame.uri.fsPath}">${frame.label}</stackFrame>\n`;
                            }
                            else {
                                str += `<stackFrame>${frame.label}</stackFrame>\n`;
                            }
                        }
                    }
                    // Add location information if available
                    if (message.location) {
                        str += `<location path="${message.location.uri.fsPath}" line="${message.location.range.startLineNumber}" col="${message.location.range.startColumn}" />\n`;
                    }
                }
            }
            str += `</testFailure>\n`;
        }
        if (!hadMessages) { // some adapters don't have any per-test messages and just output
            const output = result.tasks.map(t => t.output.getRange(0, t.output.length).toString().trim()).join('\n');
            if (output) {
                str += `<output>\n${output}\n</output>\n`;
            }
        }
        return str;
    }
    /** Updates the UI progress as the test runs, resolving when the run is finished. */
    async _monitorRunProgress(result, progress, token) {
        const store = new DisposableStore();
        const update = () => {
            const counts = collectTestStateCounts(!result.completedAt, [result]);
            const text = getTestProgressText(counts);
            progress.report({ message: text, progress: counts.runSoFar / counts.totalWillBeRun });
        };
        const throttler = store.add(new RunOnceScheduler(update, 500));
        return new Promise(resolve => {
            store.add(result.onChange(() => {
                if (!throttler.isScheduled) {
                    throttler.schedule();
                }
            }));
            store.add(token.onCancellationRequested(() => {
                this._testService.cancelTestRun(result.id);
                resolve();
            }));
            store.add(result.onComplete(() => {
                update();
                resolve();
            }));
        }).finally(() => store.dispose());
    }
    /**
     * Captures the test result. This is a little tricky because some extensions
     * trigger an 'out of bound' test run, so we actually wait for the first
     * test run to come in that contains one or more tasks and treat that as the
     * one we're looking for.
     */
    async _captureTestResult(testCases, group, token) {
        const store = new DisposableStore();
        const onDidTimeout = store.add(new Emitter());
        return new Promise(resolve => {
            store.add(onDidTimeout.event(() => {
                resolve(undefined);
            }));
            store.add(this._testResultService.onResultsChanged(ev => {
                if ('started' in ev) {
                    store.add(ev.started.onNewTask(() => {
                        store.dispose();
                        resolve(ev.started);
                    }));
                }
            }));
            this._testService.runTests({
                group,
                tests: testCases,
                preserveFocus: true,
            }, token).then(() => {
                if (!store.isDisposed) {
                    store.add(disposableTimeout(() => onDidTimeout.fire(), 5_000));
                }
            });
        }).finally(() => store.dispose());
    }
    /** Filters the test files to individual test cases based on the provided parameters. */
    async _getTestCasesToRun(params, tests, progress) {
        if (!params.testNames?.length) {
            return tests;
        }
        progress.report({ message: localize('runTestTool.invoke.filterProgress', 'Filtering tests...') });
        const testNames = params.testNames.map(t => t.toLowerCase().trim());
        const filtered = [];
        const doFilter = async (test) => {
            const name = test.item.label.toLowerCase().trim();
            if (testNames.some(tn => name.includes(tn))) {
                filtered.push(test);
                return;
            }
            if (test.expand === 1 /* TestItemExpandState.Expandable */) {
                await this._testService.collection.expand(test.item.extId, 1);
            }
            await waitForTestToBeIdle(this._testService, test);
            await Promise.all([...test.children].map(async (id) => {
                const item = this._testService.collection.getNodeById(id);
                if (item) {
                    await doFilter(item);
                }
            }));
        };
        await Promise.all(tests.map(doFilter));
        return filtered;
    }
    /** Gets the file tests to run based on the provided parameters. */
    async _getFileTestsToRun(params, progress) {
        if (!params.files?.length) {
            return [...this._testService.collection.rootItems];
        }
        progress.report({ message: localize('runTestTool.invoke.filesProgress', 'Discovering tests...') });
        const firstWorkspaceFolder = this._workspaceContextService.getWorkspace().folders.at(0)?.uri;
        const uris = params.files.map(f => {
            if (isAbsolute(f)) {
                return URI.file(f);
            }
            else if (firstWorkspaceFolder) {
                return URI.joinPath(firstWorkspaceFolder, f);
            }
            else {
                return undefined;
            }
        }).filter(isDefined);
        const tests = [];
        for (const uri of uris) {
            for await (const files of testsInFile(this._testService, this._uriIdentityService, uri, undefined, false)) {
                for (const file of files) {
                    tests.push(file);
                }
            }
        }
        return tests;
    }
    prepareToolInvocation(context, token) {
        const params = context.parameters;
        const title = localize('runTestTool.confirm.title', 'Allow test run?');
        const inFiles = params.files?.map((f) => '`' + basename(f) + '`');
        return Promise.resolve({
            invocationMessage: localize('runTestTool.confirm.invocation', 'Running tests...'),
            confirmationMessages: {
                title,
                message: inFiles?.length
                    ? new MarkdownString().appendMarkdown(localize('runTestTool.confirm.message', 'The model wants to run tests in {0}.', inFiles.join(', ')))
                    : localize('runTestTool.confirm.all', 'The model wants to run all tests.'),
                allowAutoConfirm: true,
            },
        });
    }
};
RunTestTool = __decorate([
    __param(0, ITestService),
    __param(1, IUriIdentityService),
    __param(2, IWorkspaceContextService),
    __param(3, ITestResultService),
    __param(4, ITestProfileService)
], RunTestTool);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NoYXRBZ2VudFRvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0aW5nQ2hhdEFnZW50VG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV2RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ25GLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdkUsT0FBTyxFQUFFLFNBQVMsRUFBVyxNQUFNLGtDQUFrQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFOUYsT0FBTyxFQUVOLDBCQUEwQixFQU8xQixjQUFjLEdBRWQsTUFBTSxn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