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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Load env
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Needed for better stack traces as captureLocation parses the stack trace to find stests
require("source-map-support/register");
// Load other imports
const fs = __importStar(require("fs"));
const minimist_1 = __importDefault(require("minimist"));
const net_1 = require("net");
const path = __importStar(require("path"));
const v8 = __importStar(require("v8"));
const rpc_1 = require("../src/extension/onboardDebug/node/copilotDebugWorker/rpc");
const services_1 = require("../src/extension/test/node/services");
const endpointProvider_1 = require("../src/platform/endpoint/common/endpointProvider");
const fileSystemService_1 = require("../src/platform/filesystem/common/fileSystemService");
const logService_1 = require("../src/platform/log/common/logService");
const parserWithCaching_1 = require("../src/platform/parser/node/parserWithCaching");
const structure_1 = require("../src/platform/parser/node/structure");
const nullTelemetryService_1 = require("../src/platform/telemetry/common/nullTelemetryService");
const tokenizer_1 = require("../src/platform/tokenizer/node/tokenizer");
const assert_1 = require("../src/util/vs/base/common/assert");
const cache_1 = require("./base/cache");
const cachingResourceFetcher_1 = require("./base/cachingResourceFetcher");
const chatMLCache_1 = require("./base/chatMLCache");
const completionsCache_1 = require("./base/completionsCache");
const embeddingsCache_1 = require("./base/embeddingsCache");
const salts_1 = require("./base/salts");
const simulationBaseline_1 = require("./base/simulationBaseline");
const simulationContext_1 = require("./base/simulationContext");
const simulationEndpointHealth_1 = require("./base/simulationEndpointHealth");
const simulationOptions_1 = require("./base/simulationOptions");
const simulationOutcome_1 = require("./base/simulationOutcome");
const stdout_1 = require("./base/stdout");
const stest_1 = require("./base/stest");
const jsonOutputPrinter_1 = require("./jsonOutputPrinter");
const outputColorer_1 = require("./outputColorer");
const externalScenarios_1 = require("./simulation/externalScenarios");
const nesCoffeTests_1 = require("./simulation/nesCoffeTests");
const nesExternalTests_1 = require("./simulation/nesExternalTests");
const sharedTypes_1 = require("./simulation/shared/sharedTypes");
const simulationLogger_1 = require("./simulationLogger");
const testExecutor_1 = require("./testExecutor");
const util_1 = require("./util");
const dotSimulationPath = path.join(__dirname, `../${sharedTypes_1.SIMULATION_FOLDER_NAME}`);
async function main() {
    const errors = [];
    process.env['SIMULATION'] = '1';
    process.on('unhandledRejection', (reason, promise) => {
        console.error('\n\nUnhandled Rejection at: Promise', promise, 'reason:', reason);
        errors.push('unhandled rejection: ' + reason);
    });
    try {
        if (process.env.VSCODE_SIMULATION_EXTENSION_ENTRY) {
            await runInExtensionHost();
        }
        else {
            const opts = simulationOptions_1.SimulationOptions.fromProcessArgs();
            const result = await run(opts);
            if (result) {
                errors.push(...result.errors);
            }
        }
    }
    catch (err) {
        errors.push(err?.stack || err?.message || String(err));
    }
    if (errors.length > 0) {
        console.error(`\n${(0, outputColorer_1.red)("⚠️⚠️⚠️  Command failed with:")}\n\n`);
        for (let i = 0; i < errors.length; i++) {
            const idx = `Error${errors.length === 1 ? '' : ` ${i + 1})`} `;
            console.error(`\t${idx}${errors[i]}\n\n`);
        }
    }
    await (0, stdout_1.drainStdoutAndExit)(errors.length === 0 ? 0 : 1);
}
async function run(opts) {
    const jsonOutputPrinter = opts.jsonOutput ? new jsonOutputPrinter_1.ConsoleJSONOutputPrinter() : new jsonOutputPrinter_1.CollectingJSONOutputPrinter();
    if (opts.externalCacheLayersPath) {
        process.env['EXTERNAL_CACHE_LAYERS_PATH'] = opts.externalCacheLayersPath;
    }
    switch (true) {
        case opts.help:
            return opts.printHelp();
        case opts.listModels:
            await listChatModels(opts.modelCacheMode === simulationContext_1.CacheMode.Disable);
            return;
        case opts.listSuites: // intentional fallthrough
        case opts.listTests: {
            // stest runner extension runs with both `list-tests` and `list-suites` flags, so they should not be mutually exclusive
            const { allSuites } = await loadTests(opts);
            if (opts.listSuites) {
                listSuites(allSuites, opts, jsonOutputPrinter);
            }
            if (opts.listTests) {
                listTests(allSuites, opts, jsonOutputPrinter);
            }
            return;
        }
        default:
            return runTests(opts, jsonOutputPrinter);
    }
}
async function runInExtensionHost() {
    const nodeOptions = process.env.NODE_OPTIONS;
    // Hook for the js-debug bootloader, which is not automatically executed in the extension host
    if (nodeOptions) {
        // NODE_OPTIONS is a CLI argument fragment that we need to parse here
        const regex = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g;
        const parsed = (0, minimist_1.default)(Array.from(nodeOptions.matchAll(regex), match => {
            let arg = match[0];
            // Remove surrounding quotes and unescape internal quotes if necessary
            if (arg[0] === arg.at(-1) && (arg[0] === '"' || arg[0] === '\'')) {
                arg = arg.slice(1, -1).replaceAll(`\\${arg[0]}`, arg[0]);
            }
            return arg;
        }));
        if (parsed.require) {
            const reqPaths = Array.isArray(parsed.require) ? parsed.require : [parsed.require];
            simulationLogger_1.logger.info(`Loading NODE_OPTIONS require: ${reqPaths.join(', ')}`);
            reqPaths.forEach(r => require(r));
        }
    }
    const port = Number(process.env.VSCODE_SIMULATION_CONTROL_PORT);
    const rpc = await new Promise((resolve, reject) => {
        const socket = (0, net_1.createConnection)({ host: '127.0.0.1', port });
        socket.on('connect', () => resolve(new rpc_1.SimpleRPC(socket)));
        socket.on('error', reject);
    });
    const vscode = require('vscode');
    const folder = vscode.workspace.workspaceFolders[0];
    cache_1.Cache.Instance.on('deviceCodeCallback', (url) => {
        rpc.callMethod('deviceCodeCallback', { url });
    });
    rpc.registerMethod('runTest', async (params) => {
        const { simulationTestContext, tests } = await allTests;
        simulationTestContext.baseline.clear();
        simulationTestContext.simulationEndpointHealth.failures.splice(0, simulationTestContext.simulationEndpointHealth.failures.length);
        const test = tests.get(params.testName);
        if (!test) {
            throw new Error(`Test ${params.testName} not found`);
        }
        const result = await (0, testExecutor_1.executeTestOnce)(simulationTestContext, 1, params.outcomeDirectory, test, params.runNumber, true);
        return { result };
    });
    const allTests = rpc.callMethod('init', { folder: folder.uri.fsPath }).then(async (res) => {
        const opts = simulationOptions_1.SimulationOptions.fromArray(res.argv);
        const { testsToRun } = await loadTests(opts);
        const { simulationTestContext } = await prepareTestEnvironment(opts, new jsonOutputPrinter_1.ProxiedSONOutputPrinter(rpc), rpc);
        return { opts, tests: new Map(testsToRun.map(t => [t.fullName, t])), simulationTestContext };
    });
    return new Promise(resolve => {
        rpc.registerMethod('close', async () => {
            resolve();
        });
    });
}
async function prepareTestEnvironment(opts, jsonOutputPrinter, rpcInExtensionHost) {
    if (opts.verbose) {
        simulationLogger_1.logger.setLogLevel(logService_1.LogLevel.Trace);
    }
    // Configure caching
    if (opts.parallelism > 1) {
        // To get good cache behavior, we must increase the cache size considerably
        parserWithCaching_1.ParserWithCaching.CACHE_SIZE_PER_LANGUAGE = Math.max(5, 2 * opts.parallelism);
        structure_1.structureComputer.setCacheSize(Math.max(5, 2 * opts.parallelism));
    }
    fileSystemService_1.fileSystemServiceReadAsJSON.enable();
    const { allSuites, testsToRun, externalScenariosPath } = await loadTests(opts);
    let outputPath = opts.output;
    if (outputPath === undefined) {
        outputPath = path.join(dotSimulationPath, (0, sharedTypes_1.generateOutputFolderName)());
    }
    else {
        // If it's not an absolute path, make it relative to the current working directory
        if (!path.isAbsolute(outputPath)) {
            outputPath = path.join(process.cwd(), outputPath);
        }
    }
    if (!rpcInExtensionHost) { // don't clean if we're just one participant in a larger run
        await clearOrCreateDir(outputPath);
    }
    jsonOutputPrinter.print({
        type: sharedTypes_1.OutputType.initialTestSummary,
        runOutputFolderName: path.basename(outputPath),
        testsToRun: testsToRun.map(t => t.fullName),
        nRuns: opts.nRuns
    });
    const allTests = allSuites.flatMap(cur => cur.tests);
    const hasFilteredTests = testsToRun.length !== allTests.length;
    if (!opts.jsonOutput) {
        if (hasFilteredTests) {
            console.log(`Due to grep filters, will execute ${testsToRun.length} out of ${allTests.length} simulations. Each simulation runs ${opts.nRuns} time(s).\n`);
        }
        else {
            console.log(`Will execute ${testsToRun.length} simulations. Each simulation runs ${opts.nRuns} time(s).\n`);
        }
    }
    writeHeapSnapshot(opts.heapSnapshots, 'before');
    const canUseBaseline = (opts.nRuns === simulationOptions_1.BASELINE_RUN_COUNT); // only use baseline if running N times
    const runningAllTests = (opts.grep === undefined && opts.omitGrep === undefined);
    const baselinePath = opts.externalBaseline
        ? ((0, assert_1.assert)(opts.externalScenarios !== undefined, 'externalBaseline must be set only with externalScenarios'),
            path.join(opts.externalScenarios, 'baseline.json'))
        : simulationBaseline_1.SimulationBaseline.DEFAULT_BASELINE_PATH;
    const baseline = await simulationBaseline_1.SimulationBaseline.readFromDisk(baselinePath, runningAllTests);
    if (canUseBaseline) { // copy current baseline as the baseline before the run
        await fs.promises.copyFile(baseline.baselinePath, path.join(outputPath, sharedTypes_1.OLD_BASELINE_FILENAME));
    }
    let configs;
    if (opts.configFile) {
        const configFilePath = path.isAbsolute(opts.configFile) ? opts.configFile : path.join(process.cwd(), opts.configFile);
        const configFileContents = await fs.promises.readFile(configFilePath, 'utf-8');
        configs = JSON.parse(configFileContents);
        if (!configs || typeof configs !== 'object') {
            throw new Error('Invalid configuration file ' + opts.configFile);
        }
    }
    return {
        ...createSimulationTestContext(opts, runningAllTests, baseline, canUseBaseline, jsonOutputPrinter, outputPath, externalScenariosPath, rpcInExtensionHost, configs),
        testsToRun,
        baseline,
        canUseBaseline,
        outputPath,
        runningAllTests,
        hasFilteredTests,
    };
}
async function runTests(opts, jsonOutputPrinter) {
    const errors = [];
    cache_1.Cache.Instance.on('deviceCodeCallback', (url) => {
        if (opts.jsonOutput) {
            jsonOutputPrinter.print({ type: sharedTypes_1.OutputType.deviceCodeCallback, url });
        }
        else {
            console.log(`⚠️ \x1b[31mAuth Required!\x1b[0m Please open the link: ${url}`);
        }
    });
    const { simulationEndpointHealth, simulationOutcome, simulationTestContext, testsToRun, baseline, canUseBaseline, outputPath, runningAllTests, hasFilteredTests } = await prepareTestEnvironment(opts, jsonOutputPrinter);
    if (opts.gc) {
        if (opts.gc && opts.externalCacheLayersPath) {
            throw new Error('--gc is currently not compatible with --external-cache-layers-path');
        }
        cache_1.Cache.Instance.gcStart();
    }
    const totalStartTime = Date.now();
    const { testResultsPromises, getGroupedScores } = await (0, testExecutor_1.executeTests)(simulationTestContext, testsToRun);
    console.log('Waiting on test results...');
    const testResults = await Promise.all(testResultsPromises);
    writeHeapSnapshot(opts.heapSnapshots, 'after');
    const totalTime = Date.now() - totalStartTime;
    if (opts.gc) {
        cache_1.Cache.Instance.gcEnd();
    }
    for (const result of testResults) {
        for (const [idx, o] of result.outcomes.entries()) {
            if (o?.kind === 'failed' && o.critical) {
                errors.push(`Test failed: ${result.test}, run ${idx}\n` + o.error);
            }
        }
    }
    // this allows to quickly identify which new cache entries were created in this particular simulation run
    if (opts.stageCacheEntries && !opts.externalScenarios) {
        // TODO@joaomoreno
        console.warn('!!! Determining new cache entries is not yet working in Redis, ask Joao to implement it');
    }
    const groupedScores = await getGroupedScores();
    printOutcome(groupedScores, testsToRun, baseline, opts, canUseBaseline, runningAllTests, testResults, totalTime);
    const tableData = buildScoreTable(groupedScores);
    const suiteScoreCard = path.join(outputPath, sharedTypes_1.SCORECARD_FILENAME);
    await fs.promises.writeFile(suiteScoreCard, toCsv(tableData));
    if (simulationOutcome instanceof simulationOutcome_1.SimulationOutcomeImpl) {
        if (!opts.noCachePointer) {
            await simulationOutcome.write();
        }
        if (!opts.externalScenarios && !hasFilteredTests) {
            await simulationOutcome.cleanFolder();
        }
    }
    if (canUseBaseline) {
        await baseline.writeToDisk(path.join(outputPath, sharedTypes_1.PRODUCED_BASELINE_FILENAME));
    }
    if (opts.isUpdateBaseline) {
        if (canUseBaseline) {
            await baseline.writeToDisk();
        }
        else {
            errors.push(`Cannot update baseline for ${opts.nRuns} run(s). Please use --n=${simulationOptions_1.BASELINE_RUN_COUNT}.`);
        }
    }
    await jsonOutputPrinter.flush?.(outputPath);
    const filePath = path.join(outputPath, sharedTypes_1.REPORT_FILENAME);
    await fs.promises.writeFile(filePath, JSON.stringify(testResults, null, '\t'));
    if (opts.label) {
        const runMetadata = path.join(outputPath, sharedTypes_1.RUN_METADATA);
        await fs.promises.writeFile(runMetadata, JSON.stringify({ label: opts.label }, null, '\t'));
    }
    // Enable if you want to see which cache entries were used in this simulation run
    const writeUsedOtherCaches = false;
    if (writeUsedOtherCaches) {
        await fs.promises.writeFile('other-caches.json', JSON.stringify([]
            .concat(Array.from(embeddingsCache_1.usedEmbeddingsCaches))
            .concat(Array.from(cachingResourceFetcher_1.usedResourceCaches))));
    }
    if (opts.ci && !opts.isUpdateBaseline) {
        const changeStats = baseline.compare();
        const error = validateChangeStats(changeStats);
        if (error) {
            errors.push((0, outputColorer_1.red)(`${error.errorMessage}. Please run 'npm run simulate-update-baseline' and check in baseline.json.`));
        }
    }
    else {
        if (simulationEndpointHealth.failures.length > 0) {
            const rateLimitedCount = simulationEndpointHealth.failures.filter(f => f.request.type === 'rateLimited').length;
            const failedCount = simulationEndpointHealth.failures.filter(f => f.request.type === 'failed').length;
            // If there were simulation endpoint failures and we are doing a
            // CI baseline update, fail the CI so that we block PR merge
            if (opts.ci && opts.isUpdateBaseline) {
                errors.push((0, outputColorer_1.red)(`Encountered server failures while running simulation: ${rateLimitedCount} rate limited responses, ${failedCount} other failed responses. Please rerun the simulation!`), ...simulationEndpointHealth.failures.map(f => `- ${f.testInfo.testName}: ${f.request.reason}`));
            }
        }
    }
    return { errors };
}
async function loadTests(opts) {
    let allSuites = [];
    let testsToRun = [];
    let externalScenariosPath = opts.externalScenarios;
    if (externalScenariosPath) {
        let usageError = false;
        if (!opts.inline && !opts.sidebar && !opts.nes) {
            usageError = true;
            console.error(`Missing --inline or --sidebar or --nes flag`);
        }
        if ([opts.inline, opts.sidebar, opts.nes].filter(Boolean).length > 1) {
            usageError = true;
            console.error(`Can only have one of --inline or --sidebar or --nes flags set`);
        }
        if (typeof opts.output !== 'string') {
            usageError = true;
            console.error(`Missing --output flag`);
        }
        if (usageError) { // process.exit() if there's a usage error
            console.error(`Usage: npm run simulate -- --external-scenarios=<path> --inline --output=<path>`);
            console.error(`Usage: npm run simulate -- --external-scenarios=<path> --sidebar --output=<path>`);
            await (0, stdout_1.drainStdoutAndExit)(1);
        }
        // Update paths to be absolute
        // If it's not an absolute path, make it relative to the current working directory
        if (!path.isAbsolute(externalScenariosPath)) {
            externalScenariosPath = path.join(process.cwd(), externalScenariosPath);
        }
        if (opts.scenarioTest) {
            stest_1.SimulationTestsRegistry.setInputPath(externalScenariosPath);
        }
        else {
            const filter = (0, stest_1.createSimulationTestFilter)(opts.grep, opts.omitGrep);
            if (opts.nes) {
                if (opts.nes === 'external') {
                    // run external stests
                    allSuites = [await (0, nesExternalTests_1.discoverNesTests)(externalScenariosPath, opts)];
                }
                else {
                    // run coffe stests
                    allSuites = [await (0, nesCoffeTests_1.discoverCoffeTests)(externalScenariosPath, opts)];
                }
            }
            else {
                const testDiscoveryOptions = {
                    chatKind: (opts.inline && !opts.sidebar) ? 'inline' : 'panel',
                    applyChatCodeBlocks: opts.applyChatCodeBlocks,
                };
                allSuites = await (0, externalScenarios_1.discoverTests)(externalScenariosPath, testDiscoveryOptions);
            }
            testsToRun = allSuites
                .flatMap(suite => suite.tests)
                .filter(filter)
                .sort((t0, t1) => t0.fullName.localeCompare(t1.fullName));
        }
    }
    if (testsToRun.length === 0) {
        stest_1.SimulationTestsRegistry.setFilters(opts.scenarioTest, opts.grep, opts.omitGrep);
        await Promise.resolve().then(() => __importStar(require('./simulationTests')));
        allSuites = stest_1.SimulationTestsRegistry.getAllSuites();
        testsToRun = stest_1.SimulationTestsRegistry.getAllTests();
    }
    return { allSuites, testsToRun, externalScenariosPath };
}
function listSuites(allSuites, opts, jsonOutputPrinter) {
    for (const suite of allSuites) {
        jsonOutputPrinter.print({ type: sharedTypes_1.OutputType.detectedSuite, name: suite.fullName, location: suite.options.location });
    }
}
function listTests(allSuites, opts, jsonOutputPrinter) {
    // we should just list all tests
    const allTests = allSuites.flatMap(suite => suite.tests);
    for (const test of allTests) {
        jsonOutputPrinter.print({ type: sharedTypes_1.OutputType.detectedTest, suiteName: test.suite.fullName, name: test.fullName, location: test.options.location });
        if (!opts.jsonOutput) {
            console.log(` - ${test.fullName}`);
        }
    }
}
async function listChatModels(skipCache = false) {
    const accessor = (0, services_1.createExtensionUnitTestingServices)(undefined, undefined, { skipModelMetadataCache: skipCache }).createTestingAccessor();
    const endpointProvider = accessor.get(endpointProvider_1.IEndpointProvider);
    const chatEndpoints = await endpointProvider.getAllChatEndpoints();
    console.log('Available Chat Models:\n');
    // Group models by family
    const modelsByFamily = new Map();
    for (const endpoint of chatEndpoints) {
        const family = endpoint.family || 'Other'; // Default family name if not specified
        if (!modelsByFamily.has(family)) {
            modelsByFamily.set(family, []);
        }
        modelsByFamily.get(family).push(endpoint.model);
    }
    // Print each family with its models
    const tableData = [];
    // Convert to array and sort by family name for consistent display
    const sortedFamilies = Array.from(modelsByFamily.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [family, models] of sortedFamilies) {
        // Sort models within each family
        models.sort();
        tableData.push({
            Family: family,
            Models: models.join(', ')
        });
    }
    console.table(tableData);
    return;
}
function createSimulationTestContext(opts, runningAllTests, baseline, canUseBaseline, jsonOutputPrinter, outputPath, externalScenariosPath, rpcInExtensionHost, configs) {
    const simulationEndpointHealth = rpcInExtensionHost ? new simulationEndpointHealth_1.ProxiedSimulationEndpointHealth(rpcInExtensionHost) : new simulationEndpointHealth_1.SimulationEndpointHealthImpl();
    let createChatMLCache;
    let createNesFetchCache;
    if (opts.lmCacheMode === simulationContext_1.CacheMode.Disable) {
        console.warn('❗ Not using any cache');
        createChatMLCache = undefined;
        createNesFetchCache = undefined;
    }
    else {
        createChatMLCache = (info) => new chatMLCache_1.ChatMLSQLiteCache(salts_1.TestingCacheSalts.requestCacheSalt, info);
        createNesFetchCache = (info) => new completionsCache_1.CompletionsSQLiteCache(salts_1.TestingCacheSalts.nesFetchCacheSalt, info);
    }
    const simulationServicesOptions = {
        createChatMLCache,
        createNesFetchCache,
        chatModelThrottlingTaskLaunchers: (0, simulationContext_1.createSimulationChatModelThrottlingTaskLaunchers)(opts.boost),
        isNoFetchModeEnabled: opts.noFetch,
        languageModelCacheMode: opts.lmCacheMode,
        resourcesCacheMode: opts.resourcesCacheMode,
        disabledTools: opts.disabledTools,
        summarizeHistory: opts.summarizeHistory,
        swebenchPrompt: opts.swebenchPrompt,
        useExperimentalCodeSearchService: opts.useExperimentalCodeSearchService,
        configs
    };
    const customModelConfigMap = new Map();
    if (opts.modelConfigFile) {
        console.log("Using model configuration file: " + opts.modelConfigFile);
        const customModelConfigs = parseModelConfigFile(opts.modelConfigFile);
        customModelConfigs.forEach(config => {
            customModelConfigMap.set(config.id, config);
        });
    }
    const modelConfig = {
        chatModel: opts.chatModel,
        fastChatModel: opts.fastChatModel,
        smartChatModel: opts.smartChatModel,
        embeddingType: opts.embeddingType,
        fastRewriteModel: opts.fastRewriteModel,
        skipModelMetadataCache: opts.modelCacheMode === simulationContext_1.CacheMode.Disable,
        customModelConfigs: customModelConfigMap,
    };
    const simulationOutcome = rpcInExtensionHost ? new simulationOutcome_1.ProxiedSimulationOutcome(rpcInExtensionHost) : new simulationOutcome_1.SimulationOutcomeImpl(runningAllTests);
    const simulationTestContext = {
        opts,
        baseline,
        canUseBaseline,
        jsonOutputPrinter,
        outputPath,
        externalScenariosPath,
        modelConfig,
        simulationServicesOptions,
        simulationOutcome,
        simulationEndpointHealth,
        tokenizerProvider: new tokenizer_1.TokenizerProvider(false, new nullTelemetryService_1.NullTelemetryService()) // this is expensive so we share it across all stests
    };
    return { simulationTestContext, simulationEndpointHealth, simulationOutcome };
}
function printOutcome(groupedScores, testsToRun, baseline, opts, canUseBaseline, runningAllTests, testResults, totalTime) {
    const shouldShowSummaries = (testsToRun.length >= 10); // only when running at least 10 tests
    const shouldBeBrief = (testsToRun.length === 1); // when running a single test, be brief
    if (shouldShowSummaries) {
        const modelComparisonTable = [];
        for (const [suiteName, scoresPerSuite] of groupedScores.entries()) {
            const testScores = new Map();
            for (const [_language, scoresPerLanguage] of scoresPerSuite.entries()) {
                for (const [model, scoresPerModel] of scoresPerLanguage.entries()) {
                    if (!model) {
                        continue;
                    }
                    const data = testScores.get(model) || { count: 0, scoreSum: 0 };
                    data.count += scoresPerModel.length;
                    data.scoreSum += scoresPerModel.reduce((acc, curr) => acc + curr, 0);
                    testScores.set(model, data);
                }
            }
            let modelCount = 0;
            modelCount += (testScores.has("gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */) ? 1 : 0);
            modelCount += (testScores.has("gpt-4o-mini" /* CHAT_MODEL.GPT4OMINI */) ? 1 : 0);
            if (modelCount > 1) {
                const gpt4o = testScores.get("gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */) ?? { count: 0, scoreSum: 0 };
                const gpt4oMini = testScores.get("gpt-4o-mini" /* CHAT_MODEL.GPT4OMINI */) ?? { count: 0, scoreSum: 0 };
                const row = {
                    Suite: suiteName,
                    '# of tests': (gpt4o.count === 0 || gpt4oMini.count === 0) ? gpt4o.count || gpt4oMini.count : `${gpt4o.count} <> ${gpt4oMini.count}`, 'GPT-4o': gpt4o.count ? Number(gpt4o.scoreSum / gpt4o.count * 100).toFixed(2) : '-',
                    'GPT-4o-mini': gpt4oMini.count ? Number(gpt4oMini.scoreSum / gpt4oMini.count * 100).toFixed(2) : '-',
                };
                modelComparisonTable.push(row);
            }
        }
        if (modelComparisonTable.length !== 0) {
            console.log(`\n${(0, outputColorer_1.yellow)('Suite Summary by Model:')}`);
            console.table(modelComparisonTable);
        }
        console.log(`\n${(0, outputColorer_1.yellow)('Suite Summary by Language:')}`);
        const tableData = buildScoreTable(groupedScores);
        console.table(tableData);
    }
    const changeStats = baseline.compare();
    const scoreToString = (0, util_1.createScoreRenderer)(opts, canUseBaseline);
    const printChanged = (changedScenarios) => {
        for (const scenario of changedScenarios) {
            const prettyScore = `${scoreToString(scenario.prevScore)} -> ${scoreToString(scenario.currScore)}`;
            const color = scenario.currScore > scenario.prevScore ? outputColorer_1.green : outputColorer_1.red;
            console.log(`  - [${color(prettyScore)}] ${scenario.name}`);
        }
    };
    if (canUseBaseline) {
        console.log(`\nSummary:`);
        if (!shouldBeBrief && !runningAllTests) {
            console.log(`  Tests Score: ${baseline.currentScore.toFixed(2)}%`);
        }
        if (!shouldBeBrief) {
            console.log(`Overall Score: ${baseline.overallScore.toFixed(2)}%`);
        }
        if (changeStats.nImproved > 0) {
            console.log(`${(0, outputColorer_1.green)('▲')} - Score improved in ${changeStats.nImproved} scenarios`);
        }
        if (changeStats.nWorsened > 0) {
            console.log(`${(0, outputColorer_1.red)('▼')} - Score decreased in ${changeStats.nWorsened} scenarios`);
        }
    }
    else {
        if (!shouldBeBrief) {
            console.log(`\n${(0, outputColorer_1.yellow)(`Approximate Summary (due to using --n=${opts.nRuns} instead of --n=${simulationOptions_1.BASELINE_RUN_COUNT}):`)}`);
            const score = testResults.reduce((prev, curr) => prev + curr.score, 0);
            console.log(`Overall Approximate Score: ${(score / testsToRun.length * 100).toFixed(2)} / 100`);
        }
        if (changeStats.nImproved > 0) {
            console.log(`${(0, outputColorer_1.green)('▲')} - Score clearly improved in ${changeStats.nImproved} scenarios`);
        }
        if (changeStats.nWorsened > 0) {
            console.log(`${(0, outputColorer_1.red)('▼')} - Score clearly decreased in ${changeStats.nWorsened} scenarios`);
        }
    }
    if (changeStats.nUnchanged > 0) {
        console.log(`= - Score unchanged in ${changeStats.nUnchanged} scenarios`);
    }
    if (changeStats.addedScenarios > 0) {
        console.log(`${(0, outputColorer_1.violet)('◆')} - New scenarios count - ${changeStats.addedScenarios}`);
    }
    if (changeStats.removedScenarios > 0) {
        console.log(`${(0, outputColorer_1.orange)('●')} - Missing ${changeStats.removedScenarios} scenarios.`);
    }
    if (changeStats.skippedScenarios > 0) {
        console.log(`${(0, outputColorer_1.yellow)('●')} - Skipped ${changeStats.skippedScenarios} scenarios.`);
    }
    if (changeStats.improvedScenarios.length > 0 || changeStats.worsenedScenarios.length > 0) {
        console.log();
    }
    if (changeStats.improvedScenarios.length > 0) {
        console.log(`${(0, outputColorer_1.green)('Improved')}:`);
        printChanged(changeStats.improvedScenarios);
    }
    if (changeStats.worsenedScenarios.length > 0) {
        console.log(`${(0, outputColorer_1.red)('Worsened')}:`);
        printChanged(changeStats.worsenedScenarios);
    }
    console.log(`\n  Simulation finished(${(0, util_1.printTime)(totalTime)}) \n`);
}
function buildScoreTable(groupedScores) {
    const tableData = [];
    for (const [suiteName, scoresPerSuite] of groupedScores.entries()) {
        for (const [language, scoresPerLanguage] of scoresPerSuite.entries()) {
            for (const [model, scoresPerModel] of scoresPerLanguage.entries()) {
                const row = {
                    Suite: suiteName,
                    Language: language ?? '-',
                    Model: model ?? '-',
                    '# of tests': scoresPerModel.length,
                    'Score(%)': Number((scoresPerModel.reduce((acc, curr) => acc + curr, 0) / scoresPerModel.length * 100).toFixed(2)),
                };
                tableData.push(row);
            }
        }
    }
    return tableData;
}
function validateChangeStats(changeStats) {
    if (changeStats.nWorsened > 0) {
        // if any worsened, fail
        return { errorMessage: 'Some scenarios have worsened' };
    }
    if (changeStats.nImproved > 0) {
        // if any improved, fail
        return { errorMessage: 'Some scenarios have improved' };
    }
    if (changeStats.addedScenarios > 0) {
        // if any added, fail
        return { errorMessage: 'New scenarios detected' };
    }
    if (changeStats.removedScenarios > 0) {
        // if any removed, fail
        return { errorMessage: 'Some scenarios were removed' };
    }
    if (changeStats.mandatory.skippedScenarios > 0) {
        // only fail if mandatory scenarios are skipped
        return { errorMessage: 'Some mandatory scenarios were skipped' };
    }
    return undefined;
}
function writeHeapSnapshot(snapshotFilename, label) {
    if (snapshotFilename === undefined || snapshotFilename === false) {
        return;
    }
    const fileName = typeof snapshotFilename === 'string' ? `${snapshotFilename}-${label}.heapsnapshot` : undefined;
    console.log(`Writing heap snapshot: ${v8.writeHeapSnapshot(fileName)}`);
}
async function clearOrCreateDir(path) {
    if (await (0, util_1.fileExists)(path)) {
        await fs.promises.rm(path, { recursive: true, force: true });
    }
    await fs.promises.mkdir(path, { recursive: true });
}
function toCsv(rows) {
    if (rows.length === 0) {
        return '';
    }
    const header = Object.keys(rows[0]).join(',') + '\n';
    const rowsStr = rows.map(obj => Object.values(obj).join(',') + '\n').join('');
    return header + rowsStr;
}
function parseModelConfigFile(modelConfigFilePath) {
    const resolvedModelConfigFilePath = path.isAbsolute(modelConfigFilePath) ? modelConfigFilePath : path.join(process.cwd(), modelConfigFilePath);
    const configFileContents = fs.readFileSync(resolvedModelConfigFilePath, 'utf-8');
    let modelConfig;
    try {
        modelConfig = JSON.parse(configFileContents);
    }
    catch (error) {
        throw new Error(`Invalid JSON configuration file ${resolvedModelConfigFilePath}: ${error.message}`);
    }
    if (!modelConfig || typeof modelConfig !== 'object') {
        throw new Error('Invalid configuration file ' + resolvedModelConfigFilePath);
    }
    /**
     * the modelConfigFile.json should contain objects of the form:
    ```
        "<model id>": {
            "name": "<model name>",
            "version": "<model version>",
            "type": "<model type>", // 'openai' or 'azureOpenai'
            "useDeveloperRole": <boolean>, // optional, defaults to false
            "url": "<endpoint URL>",
            "capabilities"?: {
                "supports"?: {
                    "parallel_tool_calls"?: <boolean>,
                    "streaming"?: <boolean>,
                    "tool_calls"?: <boolean>,
                    "vision"?: <boolean>,
                    "prediction"?: <boolean>
                },
                "limits"?: {
                    "max_prompt_tokens"?: <number>,
                    "max_output_tokens"?: <number>,
                    "max_context_window_tokens"?: <number>
                }
            },
            "auth?": {
                "useBearerHeader"?: <boolean>, // Use Bearer token for authentication. Defaults to false
                "useApiKeyHeader"?: <boolean>, // Use API key for authentication. Defaults to false
                "apiKeyEnvName": "<environment variable name for API key to be used for the above headers>"
            },
            "overrides"?: {
                "requestHeaders"?: { "<header name>": "<header value>" }, // optional, custom request headers
                "temperature"?: <number> | null, // optional, if null removes from request body
                "top_p"?: <number> | null, // optional, if null removes from request body
                "snippy"?: <boolean> | null, // optional, if null removes from request body
                "max_tokens"?: <number> | null, // optional, if null removes from request body
                "max_completion_tokens"?: <number> | null, // optional, if null removes from request body
                "intent"?: <boolean> | null // optional, if null removes from request body
            }
        },
        ...
    ```
    */
    const checkProperty = (obj, prop, type, optional, nullable) => {
        if (!(prop in obj)) {
            if (optional) {
                return;
            }
            throw new Error(`Missing property '${prop}' in model configuration file ${resolvedModelConfigFilePath}`);
        }
        if (nullable && obj[prop] === null) {
            return;
        }
        if (typeof obj[prop] !== type) {
            throw new Error(`Property '${prop}' in model configuration file ${resolvedModelConfigFilePath} must be of type '${type}', but got '${typeof obj[prop]}'`);
        }
    };
    const modelConfigs = [];
    for (const modelId in modelConfig) {
        const model = modelConfig[modelId];
        if (typeof model !== 'object') {
            throw new Error(`Model configuration for '${modelId}' must be an object`);
        }
        checkProperty(model, 'name', 'string');
        checkProperty(model, 'version', 'string');
        checkProperty(model, 'type', 'string');
        if (model.type !== 'openai' && model.type !== 'azureOpenai') {
            throw new Error(`Model type '${model.type}' is not supported. Only 'openai' and 'azureOpenai' are allowed.`);
        }
        checkProperty(model, 'useDeveloperRole', 'boolean', true);
        checkProperty(model, 'url', 'string');
        checkProperty(model, 'capabilities', 'object', true);
        checkProperty(model.capabilities, 'supports', 'object', true);
        if (model.capabilities?.supports) {
            checkProperty(model.capabilities.supports, 'parallel_tool_calls', 'boolean', true);
            checkProperty(model.capabilities.supports, 'streaming', 'boolean', true);
            checkProperty(model.capabilities.supports, 'tool_calls', 'boolean', true);
            checkProperty(model.capabilities.supports, 'vision', 'boolean', true);
            checkProperty(model.capabilities.supports, 'prediction', 'boolean', true);
            checkProperty(model.capabilities.supports, 'thinking', 'boolean', true);
        }
        checkProperty(model.capabilities, 'limits', 'object', true);
        if (model.capabilities?.limits) {
            checkProperty(model.capabilities.limits, 'max_prompt_tokens', 'number', true);
            checkProperty(model.capabilities.limits, 'max_output_tokens', 'number', true);
            checkProperty(model.capabilities.limits, 'max_context_window_tokens', 'number', true);
        }
        checkProperty(model, 'auth', 'object', true);
        if (model.auth) {
            checkProperty(model.auth, 'useBearerHeader', 'boolean', true);
            checkProperty(model.auth, 'useApiKeyHeader', 'boolean', true);
            checkProperty(model.auth, 'apiKeyEnvName', 'string');
        }
        checkProperty(model, 'overrides', 'object', true);
        if (model.overrides) {
            const overrides = model.overrides;
            checkProperty(overrides, 'requestHeaders', 'object', true, true);
            checkProperty(overrides, 'temperature', 'number', true, true);
            checkProperty(overrides, 'top_p', 'number', true, true);
            checkProperty(overrides, 'snippy', 'boolean', true, true);
            checkProperty(overrides, 'intent', 'boolean', true, true);
            checkProperty(overrides, 'max_tokens', 'number', true, true);
            checkProperty(overrides, 'max_completion_tokens', 'number', true, true);
        }
        // Validate supported_endpoints
        if (model.supported_endpoints) {
            if (!Array.isArray(model.supported_endpoints)) {
                throw new Error(`Property 'supported_endpoints' in model configuration file ${resolvedModelConfigFilePath} must be an array`);
            }
            for (const endpointSuffix of model.supported_endpoints) {
                if (!Object.values(endpointProvider_1.ModelSupportedEndpoint).includes(endpointSuffix)) {
                    throw new Error(`Invalid endpoint suffix '${endpointSuffix}' in supported_endpoints for model '${modelId}'. Must be one of: ${Object.values(endpointProvider_1.ModelSupportedEndpoint).join(', ')}`);
                }
            }
        }
        modelConfigs.push({
            id: modelId,
            name: model.name,
            version: model.version,
            type: model.type,
            useDeveloperRole: model.useDeveloperRole ?? false,
            url: model.url,
            capabilities: {
                supports: {
                    parallel_tool_calls: model.capabilities?.supports?.parallel_tool_calls ?? false,
                    streaming: model.capabilities?.supports?.streaming ?? false,
                    tool_calls: model.capabilities?.supports?.tool_calls ?? false,
                    vision: model.capabilities?.supports?.vision ?? false,
                    prediction: model.capabilities?.supports?.prediction ?? false,
                    thinking: model.capabilities?.supports?.thinking ?? false
                },
                limits: {
                    max_prompt_tokens: model.capabilities?.limits?.max_prompt_tokens ?? 128000,
                    max_output_tokens: model.capabilities?.limits?.max_output_tokens ?? Number.MAX_SAFE_INTEGER,
                    max_context_window_tokens: model.capabilities?.limits?.max_context_window_tokens
                }
            },
            supported_endpoints: model.supported_endpoints?.length ? model.supported_endpoints : [endpointProvider_1.ModelSupportedEndpoint.ChatCompletions],
            auth: {
                useBearerHeader: model.auth?.useBearerHeader ?? false,
                useApiKeyHeader: model.auth?.useApiKeyHeader ?? false,
                apiKeyEnvName: model.auth?.apiKeyEnvName
            },
            overrides: {
                requestHeaders: model.overrides?.hasOwnProperty('requestHeaders') ? model.overrides.requestHeaders : {},
                temperature: model.overrides?.hasOwnProperty('temperature') ? model.overrides.temperature : undefined,
                top_p: model.overrides?.hasOwnProperty('top_p') ? model.overrides.top_p : undefined,
                snippy: model.overrides?.hasOwnProperty('snippy') ? model.overrides.snippy : undefined,
                intent: model.overrides?.hasOwnProperty('intent') ? model.overrides.intent : undefined,
                max_tokens: model.overrides?.hasOwnProperty('max_tokens') ? model.overrides.max_tokens : undefined,
                max_completion_tokens: model.overrides?.hasOwnProperty('max_completion_tokens') ? model.overrides.max_completion_tokens : undefined,
            }
        });
    }
    return modelConfigs;
}
(async () => main())();
//# sourceMappingURL=simulationMain.js.map