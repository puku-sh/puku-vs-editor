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
exports.CriticalError = exports.executeTestOnce = void 0;
exports.executeTests = executeTests;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const path = __importStar(require("path"));
const promptWorkspaceLabels_1 = require("../src/extension/context/node/resolvers/promptWorkspaceLabels");
const newIntent_1 = require("../src/extension/intents/node/newIntent");
const intents_1 = require("../src/extension/prompt/node/intents");
const toolsService_1 = require("../src/extension/tools/common/toolsService");
const testToolsService_1 = require("../src/extension/tools/node/test/testToolsService");
const endpointProvider_1 = require("../src/platform/endpoint/common/endpointProvider");
const testEndpointProvider_1 = require("../src/platform/endpoint/test/node/testEndpointProvider");
const logService_1 = require("../src/platform/log/common/logService");
const simulationTestContext_1 = require("../src/platform/simulationTestContext/common/simulationTestContext");
const tasksService_1 = require("../src/platform/tasks/common/tasksService");
const testTasksService_1 = require("../src/platform/tasks/common/testTasksService");
const tokenizer_1 = require("../src/platform/tokenizer/node/tokenizer");
const arrays_1 = require("../src/util/common/arrays");
const collections_1 = require("../src/util/vs/base/common/collections");
const errors_1 = require("../src/util/vs/base/common/errors");
const lazy_1 = require("../src/util/vs/base/common/lazy");
const objects_1 = require("../src/util/vs/base/common/objects");
const descriptors_1 = require("../src/util/vs/platform/instantiation/common/descriptors");
const simulationExtHostToolsService_1 = require("./base/extHostContext/simulationExtHostToolsService");
const simulationContext_1 = require("./base/simulationContext");
const simulationEndpointHealth_1 = require("./base/simulationEndpointHealth");
const simulationOutcome_1 = require("./base/simulationOutcome");
const spyingChatMLFetcher_1 = require("./base/spyingChatMLFetcher");
const stest_1 = require("./base/stest");
const jsonOutputPrinter_1 = require("./jsonOutputPrinter");
const outputColorer_1 = require("./outputColorer");
const externalScenarios_1 = require("./simulation/externalScenarios");
const shared = __importStar(require("./simulation/shared/sharedTypes"));
const testSnapshot_1 = require("./simulation/testSnapshot");
const taskRunner_1 = require("./taskRunner");
const testExecutionInExtension_1 = require("./testExecutionInExtension");
const util_1 = require("./util");
function mergeGroupedScopes(into, from) {
    for (const [key, value] of from) {
        const intoValue = into.get(key);
        if (!intoValue) {
            into.set(key, value);
            continue;
        }
        for (const [language, scores] of value) {
            const intoScores = intoValue.get(language);
            if (intoScores) {
                for (const [model, score] of scores) {
                    if (intoScores.has(model)) {
                        intoScores.set(model, [...intoScores.get(model), ...score]);
                    }
                    else {
                        intoScores.set(model, score);
                    }
                }
            }
            else {
                intoValue.set(language, scores);
            }
        }
    }
}
async function executeTests(ctx, testsToRun) {
    const location = (0, collections_1.groupBy)(testsToRun, test => (test.suite.extHost ?? ctx.opts.inExtensionHost) ? 'extHost' : 'local');
    const extensionRunner = new lazy_1.Lazy(() => testExecutionInExtension_1.TestExecutionInExtension.create(ctx));
    const [extHost, local] = await Promise.all([
        executeTestsUsing(ctx, location['extHost'] ?? [], (...args) => extensionRunner.value.then(e => e.executeTest(...args))),
        executeTestsUsing(ctx, location['local'] ?? [], exports.executeTestOnce),
    ]);
    return {
        testResultsPromises: [...extHost.testResultsPromises, ...local.testResultsPromises],
        getGroupedScores: async () => {
            const [fromExtHost, fromLocal] = await Promise.all([extHost.getGroupedScores(), local.getGroupedScores()]);
            await extensionRunner.rawValue?.then(r => r.dispose());
            mergeGroupedScopes(fromLocal, fromExtHost);
            return fromLocal;
        },
    };
}
async function executeTestsUsing(ctx, testsToRun, executeTestFn) {
    const { opts, jsonOutputPrinter } = ctx;
    const groupedScores = new Map();
    const taskRunner = new taskRunner_1.TaskRunner(opts.parallelism);
    const testResultsPromises = [];
    for (const test of testsToRun) {
        if (test.options.optional && (test.options.skip(ctx.opts) || opts.ci)) { // CI never runs optional stests
            // Avoid spamming the console, we now have very many skipped stests
            // console.log(`  Skipping ${test.fullName}`);
            ctx.baseline.setSkippedTest(test.fullName);
            jsonOutputPrinter.print({ type: shared.OutputType.skippedTest, name: test.fullName });
            continue;
        }
        const testRun = executeTestNTimes(ctx, taskRunner, test, groupedScores, executeTestFn);
        testResultsPromises.push(testRun);
        if (opts.parallelism === 1) {
            await testRun;
        }
    }
    return {
        testResultsPromises,
        getGroupedScores: async () => {
            await Promise.all(testResultsPromises);
            return groupedScores;
        },
    };
}
/** Runs a single scenario `nRuns` times. */
async function executeTestNTimes(ctx, taskRunner, test, groupedScores, executeTestFn) {
    const { opts } = ctx;
    const outcomeDirectory = path.join(ctx.outputPath, (0, stest_1.toDirname)(test.fullName));
    const testStartTime = Date.now();
    const scheduledTestRuns = [];
    for (let kthRun = 0; kthRun < opts.nRuns; kthRun++) {
        scheduledTestRuns.push(taskRunner.run(() => executeTestFn(ctx, taskRunner.parallelism, outcomeDirectory, test, kthRun)));
    }
    const runResults = await Promise.all(scheduledTestRuns);
    const testElapsedTime = Date.now() - testStartTime;
    const testSummary = {
        results: runResults,
        hasCacheMisses: runResults.some(x => x.hasCacheMiss),
        contentFilterCount: runResults.filter(x => x.contentFilterCount > 0).length,
    };
    if (!opts.externalScenarios) {
        await ctx.simulationOutcome.set(test, testSummary.results);
    }
    const testResultToScore = (result) => result.kind === 'pass' ? (result.explicitScore ?? 1) : 0;
    const scoreTotal = Math.round(testSummary.results.reduce((total, result) => total + testResultToScore(result), 0) * 1000) / 1000;
    const currentScore = scoreTotal / testSummary.results.length;
    const currentPassCount = (0, arrays_1.count)(testSummary.results, s => s.kind === 'pass');
    const baselineComparison = ctx.baseline.setCurrentResult({
        name: test.fullName,
        optional: test.options.optional ? true : undefined,
        contentFilterCount: testSummary.contentFilterCount,
        passCount: currentPassCount,
        failCount: testSummary.results.length - currentPassCount,
        score: currentScore,
        attributes: test.attributes
    });
    printTestRunResultsToCli({ testSummary, ctx, test, currentScore, testElapsedTime, baselineComparison, });
    if (opts.verbose !== undefined) {
        printVerbose(opts, testSummary);
    }
    updateGroupedScores({ test, currentScore, groupedScores });
    const duration = testSummary.results.reduce((acc, c) => acc + c.duration, 0);
    const initial = { completion_tokens: 0, prompt_tokens: 0, total_tokens: 0, prompt_tokens_details: { cached_tokens: 0 } };
    const usage = testSummary.results.reduce((acc, c) => {
        if (c.usage === undefined) {
            return acc;
        }
        const { completion_tokens, prompt_tokens, total_tokens, prompt_tokens_details } = c.usage;
        return {
            completion_tokens: acc.completion_tokens + completion_tokens,
            prompt_tokens: acc.prompt_tokens + prompt_tokens,
            total_tokens: acc.total_tokens + total_tokens,
            prompt_tokens_details: {
                cached_tokens: (acc.prompt_tokens_details?.cached_tokens ?? 0) + (prompt_tokens_details?.cached_tokens ?? 0),
            }
        };
    }, initial);
    return {
        test: test.fullName,
        outcomeDirectory: path.relative(ctx.outputPath, outcomeDirectory),
        conversationPath: test.options.conversationPath,
        score: currentScore,
        duration,
        usage,
        outcomes: testSummary.results.map(r => r.outcome),
        cacheInfo: testSummary.results.map(r => r.cacheInfo),
        originalResults: testSummary.results,
    };
}
function printTestRunResultsToCli({ testSummary, ctx, test, currentScore, testElapsedTime, baselineComparison }) {
    const scoreToString = (0, util_1.createScoreRenderer)(ctx.opts, ctx.canUseBaseline);
    const didScoreChange = !baselineComparison.isNew && baselineComparison.prevScore !== baselineComparison.currScore;
    const prettyScoreValue = didScoreChange
        ? `${scoreToString(baselineComparison.prevScore)} -> ${scoreToString(baselineComparison.currScore)}`
        : `${scoreToString(currentScore)}`;
    let icon = '=';
    let color = (x) => x;
    if (baselineComparison.isNew) {
        icon = '◆';
        color = outputColorer_1.violet;
    }
    else if (baselineComparison.isImproved) {
        icon = '▲';
        color = outputColorer_1.green;
    }
    else if (baselineComparison.isWorsened) {
        icon = '▼';
        color = outputColorer_1.red;
    }
    const prettyTestTime = ctx.opts.parallelism === 1 ? ` (${(testElapsedTime > 10 ? (0, outputColorer_1.yellow)((0, util_1.printTime)(testElapsedTime)) : (0, util_1.printTime)(testElapsedTime))})` : '';
    const prettyContentFilter = (testSummary.contentFilterCount ? (0, outputColorer_1.yellow)(` (⚠️ content filter affected ${testSummary.contentFilterCount} runs)`) : '');
    const hadCacheMisses = testSummary.hasCacheMisses ? (0, outputColorer_1.yellow)(' (️️️💸 cache miss)') : '';
    console.log(`  ${color(icon)} [${color(prettyScoreValue)}] ${color(test.fullName)}${prettyTestTime}${hadCacheMisses}${prettyContentFilter}`);
}
function printVerbose(opts, testSummary) {
    for (let i = 0; i < testSummary.results.length; i++) {
        const result = testSummary.results[i];
        console.log(`    ${i + 1} - ${result.kind === 'pass' ? (0, outputColorer_1.green)(result.kind) : (0, outputColorer_1.red)(result.kind)}`);
        if (result.kind === 'fail' && result.message && opts.verbose !== 0) {
            // indent the message and print
            console.error(result.message.split(/\r\n|\r|\n/g).map(line => `      ${line}`).join('\n'));
        }
    }
}
function updateGroupedScores({ test, currentScore, groupedScores }) {
    const suiteName = test.suite.fullName;
    const model = test.model;
    if (groupedScores.has(suiteName)) {
        const scoresPerSuite = groupedScores.get(suiteName);
        if (scoresPerSuite.has(test.language)) {
            const scoresPerLanguage = scoresPerSuite.get(test.language);
            if (scoresPerLanguage.has(model)) {
                scoresPerLanguage.set(model, [...scoresPerLanguage.get(model), currentScore]);
            }
            else {
                scoresPerLanguage?.set(model, [currentScore]);
            }
        }
        else {
            scoresPerSuite.set(test.language, new Map([[model, [currentScore]]]));
        }
    }
    else {
        groupedScores.set(suiteName, new Map());
        groupedScores.get(suiteName).set(test.language, new Map([[model, [currentScore]]]));
    }
}
const executeTestOnce = async (ctx, parallelism, outcomeDirectory, test, runNumber, isInRealExtensionHost = false) => {
    const { opts, jsonOutputPrinter } = ctx;
    const fetchRequestCollector = new spyingChatMLFetcher_1.FetchRequestCollector();
    const currentTestRunInfo = {
        test,
        testRunNumber: runNumber,
        fetchRequestCollector: fetchRequestCollector,
        isInRealExtensionHost,
    };
    const testingServiceCollection = await (0, simulationContext_1.createSimulationAccessor)(ctx.modelConfig, ctx.simulationServicesOptions, currentTestRunInfo);
    testingServiceCollection.define(simulationOutcome_1.ISimulationOutcome, ctx.simulationOutcome);
    testingServiceCollection.define(tokenizer_1.ITokenizerProvider, ctx.tokenizerProvider);
    testingServiceCollection.define(simulationEndpointHealth_1.ISimulationEndpointHealth, ctx.simulationEndpointHealth);
    testingServiceCollection.define(jsonOutputPrinter_1.IJSONOutputPrinter, ctx.jsonOutputPrinter);
    testingServiceCollection.define(tasksService_1.ITasksService, new testTasksService_1.TestTasksService());
    if (test.model || test.embeddingType) {
        // We prefer opts that come from the CLI over test specific args since Opts are global and must apply to the entire simulation
        const smartChatModel = (opts.smartChatModel ?? opts.chatModel) ?? test.model;
        const fastChatModel = (opts.fastChatModel ?? opts.chatModel) ?? test.model;
        const fastRewriteModel = (opts.fastRewriteModel ?? opts.chatModel) ?? test.model;
        testingServiceCollection.define(endpointProvider_1.IEndpointProvider, new descriptors_1.SyncDescriptor(testEndpointProvider_1.TestEndpointProvider, [smartChatModel, fastChatModel, fastRewriteModel, currentTestRunInfo, opts.modelCacheMode === simulationContext_1.CacheMode.Disable, undefined]));
    }
    const simulationTestRuntime = (ctx.externalScenariosPath !== undefined)
        ? new externalScenarios_1.ExternalSimulationTestRuntime(ctx.outputPath, outcomeDirectory, runNumber)
        : new stest_1.SimulationTestRuntime(ctx.outputPath, outcomeDirectory, runNumber);
    testingServiceCollection.define(stest_1.ISimulationTestRuntime, simulationTestRuntime);
    testingServiceCollection.define(simulationTestContext_1.ISimulationTestContext, simulationTestRuntime);
    testingServiceCollection.define(logService_1.ILogService, new descriptors_1.SyncDescriptor(logService_1.LogServiceImpl, [[new logService_1.ConsoleLog(`🪵 ${currentTestRunInfo.test.fullName} (Run #${currentTestRunInfo.testRunNumber + 1}):\n`), simulationTestRuntime]]));
    testingServiceCollection.define(newIntent_1.INewWorkspacePreviewContentManager, new descriptors_1.SyncDescriptor(newIntent_1.NewWorkspacePreviewContentManagerImpl));
    let snapshots;
    if (test.options.location) {
        snapshots = new testSnapshot_1.TestSnapshotsImpl(test.options.location.path, test.fullName, runNumber);
        testingServiceCollection.define(testSnapshot_1.ITestSnapshots, snapshots);
    }
    testingServiceCollection.define(promptWorkspaceLabels_1.IPromptWorkspaceLabels, new descriptors_1.SyncDescriptor(promptWorkspaceLabels_1.PromptWorkspaceLabels));
    if (isInRealExtensionHost) {
        testingServiceCollection.define(toolsService_1.IToolsService, new descriptors_1.SyncDescriptor(simulationExtHostToolsService_1.SimulationExtHostToolsService, [ctx.simulationServicesOptions.disabledTools]));
    }
    else {
        testingServiceCollection.define(toolsService_1.IToolsService, new descriptors_1.SyncDescriptor(testToolsService_1.TestToolsService, [ctx.simulationServicesOptions.disabledTools]));
    }
    jsonOutputPrinter.print({ type: shared.OutputType.testRunStart, name: test.fullName, runNumber });
    if (process.stdout.isTTY && parallelism === 1) {
        process.stdout.write(`  Running scenario: ${test.fullName} - ${runNumber + 1}/${opts.nRuns}`.substring(0, process.stdout.columns - 1));
    }
    const testStartTime = Date.now();
    let pass = true;
    let err;
    try {
        await test.run(testingServiceCollection);
        await snapshots?.dispose();
        await fetchRequestCollector.complete();
        const result = {
            kind: 'pass',
            explicitScore: simulationTestRuntime.getExplicitScore(),
            usage: fetchRequestCollector.usage,
            contentFilterCount: fetchRequestCollector.contentFilterCount,
            duration: Date.now() - testStartTime,
            outcome: simulationTestRuntime.getOutcome(),
            cacheInfo: fetchRequestCollector.cacheInfo,
            hasCacheMiss: fetchRequestCollector.hasCacheMiss,
        };
        return result;
    }
    catch (e) {
        pass = false;
        err = e;
        let msg = err instanceof Error ? (err.stack ? err.stack : err.message) : (0, objects_1.safeStringify)(err);
        await fetchRequestCollector.complete();
        let critical = false;
        if (e instanceof errors_1.BugIndicatingError || e instanceof TypeError) {
            critical = true;
        }
        if (e instanceof CriticalError) {
            critical = true;
            msg = e.message;
        }
        const result = {
            kind: 'fail',
            message: msg,
            contentFilterCount: fetchRequestCollector.contentFilterCount,
            duration: Date.now() - testStartTime,
            usage: fetchRequestCollector.usage,
            outcome: {
                kind: 'failed',
                error: msg,
                hitContentFilter: fetchRequestCollector.contentFilterCount > 0,
                critical,
            },
            cacheInfo: fetchRequestCollector.cacheInfo,
            hasCacheMiss: fetchRequestCollector.hasCacheMiss,
        };
        return result;
    }
    finally {
        // (context.safeGet(ILanguageFeaturesService) as { dispose?: () => Promise<void> })?.dispose?.();
        await simulationTestRuntime.writeFile(shared.SIMULATION_REQUESTS_FILENAME, JSON.stringify(fetchRequestCollector.interceptedRequests.map(r => r.toJSON()), undefined, 2), shared.REQUESTS_TAG);
        if (err) {
            simulationTestRuntime.log(`Scenario failed due to an error:`, err);
            if (err.code !== 'ERR_ASSERTION' && !(err instanceof intents_1.IntentError)) {
                // Make visible to the console unexpected errors
                console.log(`Scenario ${test.fullName} failed due to an error:`);
                console.log(err);
            }
        }
        await simulationTestRuntime.flushLogs();
        jsonOutputPrinter.print({
            type: shared.OutputType.testRunEnd,
            name: test.fullName,
            runNumber,
            duration: Date.now() - testStartTime,
            writtenFiles: simulationTestRuntime.getWrittenFiles(),
            error: err instanceof Error ? `${err.message}\n${err.stack}` : JSON.stringify(err),
            pass,
            explicitScore: simulationTestRuntime.getExplicitScore(),
            annotations: simulationTestRuntime.getOutcome()?.annotations,
            averageRequestDuration: fetchRequestCollector.averageRequestDuration,
            requestCount: fetchRequestCollector.interceptedRequests.length,
            hasCacheMiss: fetchRequestCollector.hasCacheMiss,
        });
        if (process.stdout.isTTY && parallelism === 1) {
            process.stdout.write('\r\x1b[K');
        }
        testingServiceCollection.dispose();
    }
};
exports.executeTestOnce = executeTestOnce;
/**
 * When thrown, fails stest CI.
*/
class CriticalError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CriticalError';
    }
}
exports.CriticalError = CriticalError;
//# sourceMappingURL=testExecutor.js.map