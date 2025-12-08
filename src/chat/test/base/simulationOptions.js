"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationOptions = exports.BASELINE_RUN_COUNT = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const minimist_1 = __importDefault(require("minimist"));
const embeddingsComputer_1 = require("../../src/platform/embeddings/common/embeddingsComputer");
const simulationContext_1 = require("./simulationContext");
/** Number of runs that are stored in baseline.json */
exports.BASELINE_RUN_COUNT = 10;
class SimulationOptions {
    static fromProcessArgs() {
        return new SimulationOptions(process.argv);
    }
    static fromArray(argv) {
        return new SimulationOptions(argv);
    }
    constructor(processArgv) {
        const argv = (0, minimist_1.default)(processArgv.slice(2));
        this.argv = argv;
        this.help = boolean(argv['help'], false);
        this.listModels = boolean(argv['list-models'], false);
        this.listTests = boolean(argv['list-tests'], false);
        this.listSuites = boolean(argv['list-suites'], false);
        this.jsonOutput = boolean(argv['json'], false);
        this.isUpdateBaseline = boolean(argv['update-baseline'] ?? argv['u'], false);
        this.boost = boolean(argv['boost'], false);
        const fetch = boolean(argv['fetch'], true);
        this.noFetch = !fetch; // `--no-fetch` becomes argv[`fetch`] because of how minimist works
        const cachePointer = boolean(argv['cache-pointer'], true);
        this.noCachePointer = !cachePointer; // `--no-cache-pointer` becomes argv[`cache-pointer`] because of how minimist works
        this.nRuns = typeof argv['n'] === 'number' ? argv['n'] : (this.isUpdateBaseline || argv['ci'] ? exports.BASELINE_RUN_COUNT : 10);
        this.chatModel = this.argv['model'];
        this.smartChatModel = this.argv['smart-model'];
        this.fastChatModel = this.argv['fast-model'];
        this.fastRewriteModel = this.argv['fast-rewrite-model'];
        this.summarizeHistory = boolean(argv['summarize-history'], true);
        this.swebenchPrompt = boolean(argv['swebench-prompt'], false);
        this.embeddingType = cliOptionsToWellKnownEmbeddingsType(this.argv['embedding-model']);
        this.parallelism = this.argv['parallelism'] ?? this.argv['p'] ?? 20;
        this.modelCacheMode = this.argv['skip-model-cache'] ? simulationContext_1.CacheMode.Disable : simulationContext_1.CacheMode.Default;
        this.lmCacheMode = (this.argv['skip-cache'] ? simulationContext_1.CacheMode.Disable
            : (this.argv['require-cache'] ? simulationContext_1.CacheMode.Require : simulationContext_1.CacheMode.Default));
        this.resourcesCacheMode = (this.argv['skip-resources-cache'] ? simulationContext_1.CacheMode.Disable : simulationContext_1.CacheMode.Default);
        this.externalScenarios = this.argv['external-scenarios'];
        this.externalBaseline = this.argv['external-baseline']; // must be set after `externalScenarios`
        this.validateExternalBaseline();
        this.output = this.argv['output'];
        this.cachePath = this.argv['cache-location'];
        this.inline = boolean(this.argv['inline'], false);
        this.sidebar = boolean(this.argv['sidebar'], false);
        this.applyChatCodeBlocks = boolean(this.argv['apply-chat-code-blocks'], false);
        this.stageCacheEntries = boolean(this.argv['stage-cache-entries'], false);
        this.ci = boolean(this.argv['ci'], false);
        this.gc = boolean(this.argv['gc'], false);
        this.externalCacheLayersPath = argv['external-cache-layers-path'];
        this.verbose = this.argv['verbose'];
        this.grep = argv['grep'];
        this.omitGrep = argv['omit-grep'];
        this.heapSnapshots = argv['heap-snapshots'];
        this.scenarioTest = argv['scenarioTest'] ?? argv['scenario-test'];
        this.label = argv['label'] ?? '';
        this.inExtensionHost = boolean(argv['in-extension-host'], false);
        this.installExtensions = argv['install-extension'] ? argv['install-extension'].split(',') : [];
        this.headless = boolean(argv['headless'], true);
        this.runNumber = Number(argv['run-number']) || 0;
        this.runServerPoweredNesProvider = boolean(argv['runServerPoweredNesProvider'], false);
        this.nes = SimulationOptions.validateNesArgument(argv['nes']);
        this.nesUrl = argv['nes-url'];
        // [SuppressMessage("Microsoft.Security", "CS002:SecretInNextLine", Justification="used for local simulation tests")]
        this.nesApiKey = argv['nes-api-key'];
        SimulationOptions.validateNesUrlOverride(this.nesUrl, this.nesApiKey);
        this.disabledTools = argv['disable-tools'] ? new Set(argv['disable-tools'].split(',')) : new Set();
        this.useScenarioWorkspace = boolean(argv['scenario-workspace-folder'], false);
        this.useExperimentalCodeSearchService = boolean(argv['use-experimental-code-search-service'], false);
        this.configFile = argv['config-file'];
        this.modelConfigFile = argv['model-config-file'];
    }
    printHelp() {
        console.log([
            `Example usages: `,
            `  npm run simulate`,
            `  npm run simulate -- --external-scenarios=<path> --inline --output=<path>`,
            `  npm run simulate -- --external-scenarios=<path> --sidebar --output=<path>`,
            `  npm run simulate -- --external-scenarios=<path> --nes --output=<path>`,
            `  npm run simulate -- --update-baseline`,
            ``,
            `  -u, --update-baseline              Updates scores in baseline.json if they change as a result of your changes to prompts sent to the model`,
            `  --external-scenarios               Path to a directory containing scenarios to run`,
            `  --inline                           Run inline chat external scenarios`,
            `  --sidebar                          Run sidebar chat external scenarios`,
            `  --nes                              Run NES external scenarios`,
            `  --output                           Path to a directory where to generate output`,
            `  --n                                Run each scenario N times`,
            `  --ci                               Equivalent to --n=${exports.BASELINE_RUN_COUNT} but throws if the baseline is not up-to-date`,
            `  --gc                               Used with --require-cache to compact cache layers into the baseline cache`,
            `  --external-cache-layers-path       Used to specify the path to the external cache layers`,
            `  --grep                             Run a test which contains the passed-in string`,
            `  --omit-grep                        Run a test which does not contain the passed-in string`,
            `  --embedding-model                  Specify the model to use for the embedding endpoint (default: ada)`,
            `                                     Values: ada, text3small, text3large`,
            `  --list-models                      List available chat models`,
            `  --model                            Specify the model to use for the chat endpoint (use --list-models to see valid options)`,
            `  --smart-model                      Specify the model to use in place of the smarter slower model, i.e GPT 4o`,
            `  --fast-model                       Specify the model to use in place of the faster / less smart model, i.e GPT 4o mini`,
            `  --fast-rewrite-model               [experimental] Specify the model to use for the fast rewrite endpoint`,
            `  -p, --parallelism                  [experimental] Run tests in parallel (default: 1)`,
            `  --skip-cache                       [experimental] Do not use the cache for language model requests`,
            `  --require-cache                    [experimental] Require cache hits, fail on cache misses`,
            `  --regenerate-cache                 [experimental] Fetch all responses and refresh the cache`,
            `  --skip-resources-cache             [experimental] Do not use the cache for computed resources`,
            `  --skip-model-cache                 [experimental] Do not use the cache for model metadata`,
            `  --stage-cache-entries              [experimental] Stage cache files that were used in current simulation run`,
            `  --list-tests                       List tests without running them`,
            `  --json                             Print output in JSONL format`,
            `  --verbose                          Print more information about test and assertion failures`,
            `  --scenario-test                    Run tests from provided scenario test file name, e.g., 'docComment.stest' or 'docComment.stest.ts' (--scenarioTest is supported but will be deprecated in future)`,
            `  --no-fetch                         Do not send requests to the model endpoint (uses cache but doesn't write to it) (useful to make sure prompts are unchanged by observing cache misses)`,
            `  --no-cache-pointer                 [experimental] Do not write files to outcome/`,
            `  --label                            A label for the current simulation run, to be displayed in the UI for distinguishing between runs`,
            `  --nes-url                           To override endpoint URL for NES (must be used with --nes-api-key)`,
            `  --nes-api-key                        API key for endpoint URL provided via NES (must be used with --nes-url)`,
            `  --runServerPoweredNesProvider      Run stests against the http server powered NES provider (server must be run at port 8001)`,
            `  --disable-tools                    A comma-separated list of tools to disable`,
            `  --swebench-prompt                  Use the headless swebench prompt for agent mode`,
            `  --summarize-history                Enable experimental conversation history summarization in agent mode`,
            `  --scenario-workspace-folder        If true, runs the stest inline in the scenario's workspace folder`,
            `  --config-file                      Path to a JSON file containing configuration options`,
            `  --model-config-file                Path to a JSON file containing model configuration options`,
            ``,
        ].join('\n'));
    }
    validateExternalBaseline() {
        if (this.externalBaseline && !this.externalScenarios) {
            throw new Error("External scenarios must be provided for external baseline to work.");
        }
    }
    static validateNesArgument(nes) {
        if (nes === undefined || nes === null) {
            return undefined;
        }
        if (typeof nes === 'boolean') { // this's for backward compat because previously it was possible to just pass `--nes` to run external stests against NES
            return 'external';
        }
        if (typeof nes !== 'string') {
            throw new Error(`--nes must be a string, but got: ${typeof nes}`);
        }
        switch (nes) {
            case 'external':
            case 'coffe':
                return nes;
            default:
                throw new Error(`--nes can only be 'external' or 'coffe', but got: ${nes}`);
        }
    }
    static validateNesUrlOverride(nesUrl, nesApiKey) {
        if (nesUrl !== undefined && nesApiKey === undefined) {
            throw new Error(`--nesApiKey must be provided when --nesUrl is set`);
        }
        if (nesUrl === undefined && nesApiKey !== undefined) {
            throw new Error(`--nesUrl must be provided when --nesApiKey is set`);
        }
    }
}
exports.SimulationOptions = SimulationOptions;
function cliOptionsToWellKnownEmbeddingsType(model) {
    switch (model) {
        case 'text3small':
        case embeddingsComputer_1.EmbeddingType.text3small_512.id:
            return embeddingsComputer_1.EmbeddingType.text3small_512;
        case 'metis':
        case embeddingsComputer_1.EmbeddingType.metis_1024_I16_Binary.id:
            return embeddingsComputer_1.EmbeddingType.metis_1024_I16_Binary;
        case undefined:
            return undefined;
        default:
            throw new Error(`Unknown embedding model: ${model}`);
    }
}
function boolean(value, defaultValue) {
    if (typeof value === 'undefined') {
        return defaultValue;
    }
    if (value === 'false') {
        // treat the string 'false' as false
        return false;
    }
    return Boolean(value);
}
//# sourceMappingURL=simulationOptions.js.map