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
exports.CompletionsMutableObservableWorkspace = void 0;
const jsx_runtime_1 = require("../../../../../prompt/jsx-runtime//jsx-runtime");
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/** @jsxRuntime automatic */
/** @jsxImportSource ../../../../../prompt/jsx-runtime/ */
const assert = __importStar(require("assert"));
const sinon = __importStar(require("sinon"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const observableWorkspace_1 = require("../../../../../../../../platform/inlineEdits/common/observableWorkspace");
const instantiation_1 = require("../../../../../../../../util/vs/platform/instantiation/common/instantiation");
const components_1 = require("../../../../../prompt/src/components/components");
const virtualPrompt_1 = require("../../../../../prompt/src/components/virtualPrompt");
const prompt_1 = require("../../../../../prompt/src/prompt");
const tokenization_1 = require("../../../../../prompt/src/tokenization");
const completionsObservableWorkspace_1 = require("../../../completionsObservableWorkspace");
const completionState_1 = require("../../../completionState");
const config_1 = require("../../../config");
const featuresService_1 = require("../../../experiments/featuresService");
const telemetry_1 = require("../../../telemetry");
const context_1 = require("../../../test/context");
const telemetry_2 = require("../../../test/telemetry");
const textDocument_1 = require("../../../test/textDocument");
const textDocumentManager_1 = require("../../../textDocumentManager");
const completionsContext_1 = require("../../components/completionsContext");
const contextProviderBridge_1 = require("../../components/contextProviderBridge");
const currentFile_1 = require("../../components/currentFile");
const contextProviderRegistry_1 = require("../../contextProviderRegistry");
const prompt_2 = require("../../prompt");
const recentEditsProvider_1 = require("../../recentEdits/recentEditsProvider");
const neighborFiles_1 = require("../../similarFiles/neighborFiles");
const completionsPromptFactory_1 = require("../completionsPromptFactory");
const componentsCompletionsPromptFactory_1 = require("../componentsCompletionsPromptFactory");
suite('Completions Prompt Factory', function () {
    let telemetryData;
    let accessor;
    let serviceCollection;
    let clock;
    let cts;
    const longPrefix = Array.from({ length: 60 }, (_, i) => `const a${i} = ${i};`).join('\n');
    const defaultTextDocument = (0, textDocument_1.createTextDocument)('file:///path/basename', 'typescript', 0, (0, ts_dedent_1.default) `
			${longPrefix}
			function f|
			const b = 2;
		`);
    let promptFactory;
    function invokePromptFactory(opts = {}, factory = promptFactory) {
        const textDocument = opts.textDocument ?? defaultTextDocument;
        const position = opts.position ?? textDocument.positionAt(textDocument.getText().indexOf('|'));
        const completionState = (0, completionState_1.createCompletionState)(textDocument, position);
        const separateContext = opts.separateContext ?? false;
        const completionId = opts.completionId ?? 'completion_id';
        const contextProviderBridge = accessor.get(contextProviderBridge_1.ICompletionsContextProviderBridgeService);
        contextProviderBridge.schedule(completionState, completionId, 'opId', telemetryData);
        return factory.prompt({ completionId, completionState, telemetryData, promptOpts: { separateContext } }, cts.token);
    }
    setup(function () {
        serviceCollection = (0, context_1.createLibTestingContext)();
        accessor = serviceCollection.createTestingAccessor();
        telemetryData = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        cts = new vscode_languageserver_protocol_1.CancellationTokenSource();
        promptFactory = accessor.get(instantiation_1.IInstantiationService).createInstance(completionsPromptFactory_1.TestCompletionsPromptFactory, undefined, undefined);
    });
    teardown(function () {
        clock?.restore();
        sinon.restore();
        neighborFiles_1.NeighborSource.reset();
    });
    test('prompt should include document marker', async function () {
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result.type, 'prompt');
        assert.deepStrictEqual(result.prompt.prefix, `// Path: basename\n${longPrefix}\nfunction f`);
        assert.deepStrictEqual(result.prompt.prefixTokens, 427);
        assert.deepStrictEqual(result.prompt.suffix, 'const b = 2;');
        assert.deepStrictEqual(result.prompt.suffixTokens, 6);
    });
    test('prompt should include neighboring files', async function () {
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.setTextDocument('file:///something.ts', 'typescript', '// match function f\nfunction foo() {}');
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result.type, 'prompt');
        assert.deepStrictEqual(result.prompt.prefix, (0, ts_dedent_1.default) `
				// Path: basename
				// Compare this snippet from something.ts:
				// // match function f
				// function foo() {}
				${longPrefix}
				function f
			`);
        assert.deepStrictEqual(result.prompt.prefixTokens, 446);
        assert.deepStrictEqual(result.prompt.suffix, 'const b = 2;');
        assert.deepStrictEqual(result.prompt.suffixTokens, 6);
    });
    test('prompt should include recent edits', async function () {
        const serviceCollectionClone = serviceCollection.clone();
        const workspace = new CompletionsMutableObservableWorkspace();
        serviceCollectionClone.define(completionsObservableWorkspace_1.ICompletionsObservableWorkspace, workspace);
        // TODO: figure out how to simulate real document update events
        const rep = new MockRecentEditsProvider(undefined, workspace);
        serviceCollectionClone.define(recentEditsProvider_1.ICompletionsRecentEditsProviderService, rep);
        const accessorClone = serviceCollectionClone.createTestingAccessor();
        const promptFactory = accessorClone.get(instantiation_1.IInstantiationService).createInstance(completionsPromptFactory_1.TestCompletionsPromptFactory, undefined, undefined);
        // Ensure the document is open
        const tdm = accessorClone.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.setTextDocument(defaultTextDocument.uri, defaultTextDocument.languageId, defaultTextDocument.getText());
        // Update the distance setting to avoid having to create a huge document
        rep.config.activeDocDistanceLimitFromCursor = 10;
        rep.testUpdateRecentEdits(defaultTextDocument.uri, defaultTextDocument.getText());
        rep.testUpdateRecentEdits(defaultTextDocument.uri, defaultTextDocument.getText().replace('const a0', 'const c1'));
        const result = await invokePromptFactory({}, promptFactory);
        assert.deepStrictEqual(result.type, 'prompt');
        assert.deepStrictEqual(result.prompt.prefix, (0, ts_dedent_1.default) `
				// Path: basename
				// These are recently edited files. Do not suggest code that has been deleted.
				// File: basename
				// --- a/file:///path/basename
				// +++ b/file:///path/basename
				// @@ -1,4 +1,4 @@
				// +const c1 = 0;
				// -const a0 = 0; --- IGNORE ---
				//  const a1 = 1;
				//  const a2 = 2;
				//  const a3 = 3;
				// End of recent edits
				${longPrefix}
				function f
			`);
        assert.deepStrictEqual(result.prompt.suffix, 'const b = 2;');
    });
    test('recent edits are removed as a chunk', async function () {
        const serviceCollectionClone = serviceCollection.clone();
        const workspace = new CompletionsMutableObservableWorkspace();
        serviceCollectionClone.define(completionsObservableWorkspace_1.ICompletionsObservableWorkspace, workspace);
        // TODO: figure out how to simulate real document update events
        const rep = new MockRecentEditsProvider(undefined, workspace);
        serviceCollectionClone.define(recentEditsProvider_1.ICompletionsRecentEditsProviderService, rep);
        const accessorClone = serviceCollectionClone.createTestingAccessor();
        const promptFactory = accessorClone.get(instantiation_1.IInstantiationService).createInstance(completionsPromptFactory_1.TestCompletionsPromptFactory, undefined, undefined);
        const featuresService = accessorClone.get(featuresService_1.ICompletionsFeaturesService);
        // Ensure the document is open
        const tdm = accessorClone.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.setTextDocument(defaultTextDocument.uri, defaultTextDocument.languageId, defaultTextDocument.getText());
        // Update the distance setting to avoid having to create a huge document
        rep.config.activeDocDistanceLimitFromCursor = 10;
        rep.testUpdateRecentEdits(defaultTextDocument.uri, defaultTextDocument.getText());
        rep.testUpdateRecentEdits(defaultTextDocument.uri, defaultTextDocument.getText().replace('const a0', 'const c1'));
        featuresService.maxPromptCompletionTokens = () => 530 + prompt_1.DEFAULT_MAX_COMPLETION_LENGTH;
        featuresService.suffixPercent = () => 0;
        const result = await invokePromptFactory({}, promptFactory);
        assert.deepStrictEqual(result.type, 'prompt');
        assert.deepStrictEqual(result.prompt.prefix, (0, ts_dedent_1.default) `
				// Path: basename
				${longPrefix}
				function f
			`);
    });
    test('prompt should include context and prefix', async function () {
        const result = await invokePromptFactory({ separateContext: true });
        assert.deepStrictEqual(result.type, 'prompt');
        assert.deepStrictEqual(result.prompt.prefix, `${longPrefix}\nfunction f`);
        assert.deepStrictEqual(result.prompt.context, ['Path: basename']);
        assert.deepStrictEqual(result.prompt.suffix, 'const b = 2;');
    });
    test('prompt should include prefix and suffix tokens', async function () {
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result.type, 'prompt');
        assert.deepStrictEqual(result.prompt.prefixTokens, 427);
        assert.deepStrictEqual(result.prompt.suffixTokens, 6);
    });
    test('suffix should be cached if similar enough', async function () {
        telemetryData.filtersAndExp.exp.variables.copilotsuffixmatchthreshold = 20;
        // Call it once to cache
        await invokePromptFactory();
        const textDocument = (0, textDocument_1.createTextDocument)('untitled:', 'typescript', 1, (0, ts_dedent_1.default) `
				const a = 1;
				function f|
				const b = 1;
			`);
        const result = await invokePromptFactory({ textDocument });
        assert.deepStrictEqual(result.type, 'prompt');
        assert.deepStrictEqual(result.prompt.suffix, 'const b = 2;');
    });
    test('produces timeout prompt if timeout is exceeded', async function () {
        clock = sinon.useFakeTimers();
        const TimeoutComponent = (_, context) => {
            context.useData(componentsCompletionsPromptFactory_1.isCompletionRequestData, async (_) => {
                await clock?.tickAsync(completionsPromptFactory_1.DEFAULT_PROMPT_TIMEOUT + 1);
            });
            return (0, jsx_runtime_1.jsx)(components_1.Text, { children: "A really cool prompt" });
        };
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt(((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(completionsContext_1.CompletionsContext, { children: (0, jsx_runtime_1.jsx)(TimeoutComponent, {}) }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {})] })));
        promptFactory = accessor.get(instantiation_1.IInstantiationService).createInstance(completionsPromptFactory_1.TestCompletionsPromptFactory, virtualPrompt, undefined);
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result.type, 'promptTimeout');
    });
    test('produces valid prompts with multiple promises racing', async function () {
        const promises = [];
        for (let i = 0; i < 3; i++) {
            const textDocument = (0, textDocument_1.createTextDocument)(`file:///path/basename${i}`, 'typescript', 0, `const a = ${i}|;`);
            const promise = invokePromptFactory({ textDocument });
            promises.push(promise);
        }
        const results = await Promise.all(promises);
        for (let i = 0; i < 3; i++) {
            const result = results[i];
            assert.deepStrictEqual(result.type, 'prompt');
            assert.deepStrictEqual(result.prompt.prefix, `// Path: basename${i}\nconst a = ${i}`);
        }
    });
    test('handles errors with multiple promises racing', async function () {
        sinon
            .stub(componentsCompletionsPromptFactory_1.TestComponentsCompletionsPromptFactory.prototype, 'createPromptUnsafe')
            .callThrough()
            .onFirstCall()
            .throws(new Error('Intentional error'));
        const doc = (0, textDocument_1.createTextDocument)('file:///path/basename', 'typescript', 0, `const a = 1|;`);
        const smallDoc = (0, textDocument_1.createTextDocument)('file:///path/basename', 'typescript', 0, `c|`);
        const errorPromise = invokePromptFactory({ textDocument: doc });
        const goodPromise = invokePromptFactory({ textDocument: doc });
        const shortContextPromise = invokePromptFactory({ textDocument: smallDoc });
        const results = await Promise.all([errorPromise, goodPromise, shortContextPromise]);
        assert.deepStrictEqual(results[0], prompt_2._promptError);
        assert.deepStrictEqual(results[2], prompt_2._contextTooShort);
        const firstResult = results[1];
        assert.deepStrictEqual(firstResult.type, 'prompt');
        assert.deepStrictEqual(firstResult.prompt.prefix, `// Path: basename\nconst a = 1`);
    });
    test('produces valid prompts with sequential context provider calls', async function () {
        const featuresService = accessor.get(featuresService_1.ICompletionsFeaturesService);
        featuresService.contextProviders = () => ['traitsProvider'];
        let id = 0;
        const traitsProvider = {
            id: 'traitsProvider',
            selector: [{ language: 'typescript' }],
            resolver: {
                resolve: () => {
                    const traitId = id++;
                    return Promise.resolve([
                        { name: `test_trait${traitId}`, value: 'test_value', id: `trait${traitId}` },
                    ]);
                },
            },
        };
        accessor.get(contextProviderRegistry_1.ICompletionsContextProviderRegistryService).registerContextProvider(traitsProvider);
        const promises = [];
        for (let i = 0; i < 3; i++) {
            const textDocument = (0, textDocument_1.createTextDocument)(`file:///path/basename${i}`, 'typescript', 0, `const a = ${i}|;`);
            const promise = invokePromptFactory({ textDocument, completionId: `completion_id_${i}` });
            promises.push(promise);
        }
        const results = await Promise.all(promises);
        for (let i = 0; i < 3; i++) {
            const result = results[i];
            assert.deepStrictEqual(result.type, 'prompt');
            assert.deepStrictEqual(result.prompt.prefix, `// Path: basename${i}\n// Consider this related information:\n// test_trait${i}: test_value\nconst a = ${i}`);
            assert.deepStrictEqual(result.contextProvidersTelemetry?.length, 1);
            assert.deepStrictEqual(result.contextProvidersTelemetry?.[0].usageDetails?.length, 1);
            assert.deepStrictEqual(result.contextProvidersTelemetry?.[0].usageDetails?.[0].id, `trait${i}`);
        }
    });
    test('produces valid prompts with multiple promises racing, one blocking', async function () {
        clock = sinon.useFakeTimers();
        let timeoutMs = completionsPromptFactory_1.DEFAULT_PROMPT_TIMEOUT + 1;
        const TimeoutComponent = (_, context) => {
            context.useData(componentsCompletionsPromptFactory_1.isCompletionRequestData, async (_) => {
                const timeoutPromise = clock?.tickAsync(timeoutMs);
                timeoutMs = 0;
                await timeoutPromise;
            });
            return (0, jsx_runtime_1.jsx)(components_1.Text, { children: "A really cool prompt" });
        };
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt(((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(completionsContext_1.CompletionsContext, { children: (0, jsx_runtime_1.jsx)(TimeoutComponent, {}) }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {})] })));
        promptFactory = accessor.get(instantiation_1.IInstantiationService).createInstance(completionsPromptFactory_1.TestCompletionsPromptFactory, virtualPrompt, undefined);
        const promises = [];
        for (let i = 0; i < 2; i++) {
            const textDocument = (0, textDocument_1.createTextDocument)(`file:///${i}`, 'typescript', 0, `const a = ${i}|;`);
            const promise = invokePromptFactory({ textDocument });
            promises.push(promise);
        }
        const results = await Promise.all(promises);
        assert.deepStrictEqual(results[0].type, 'promptTimeout');
        assert.deepStrictEqual(results[1].type, 'prompt');
        assert.deepStrictEqual(results[1].prompt.prefix, '// A really cool prompt\nconst a = 1');
    });
    test('token limits can be controlled via EXP', async function () {
        const tokenizer = (0, tokenization_1.getTokenizer)();
        const longText = Array.from({ length: 1000 }, (_, i) => `const a${i} = ${i};`).join('\n');
        const longTextDocument = (0, textDocument_1.createTextDocument)('file:///path/basename', 'typescript', 0, longText + 'function f|\nconst b = 2;');
        const defaultLimitsPrompt = await invokePromptFactory({ textDocument: longTextDocument });
        assert.deepStrictEqual(defaultLimitsPrompt.type, 'prompt');
        assert.deepStrictEqual(tokenizer.tokenLength(defaultLimitsPrompt.prompt.prefix), 7007);
        assert.deepStrictEqual(tokenizer.tokenLength(defaultLimitsPrompt.prompt.suffix), 6);
        // 100 tokens are left for the prompt, 5 are used for the suffix token, so 95 are left
        telemetryData.filtersAndExp.exp.variables.maxpromptcompletionTokens =
            100 + // Prefix + suffix
                5 + // Suffix encoding
                prompt_1.DEFAULT_MAX_COMPLETION_LENGTH;
        telemetryData.filtersAndExp.exp.variables.CopilotSuffixPercent = 2;
        const expLimitsPrompt = await invokePromptFactory({ textDocument: longTextDocument });
        assert.deepStrictEqual(expLimitsPrompt.type, 'prompt');
        assert.deepStrictEqual(tokenizer.tokenLength(expLimitsPrompt.prompt.prefix), 98);
        assert.deepStrictEqual(tokenizer.tokenLength(expLimitsPrompt.prompt.suffix), 2);
    });
    test('produces context too short', async function () {
        const tinyTextDocument = (0, textDocument_1.createTextDocument)('file:///path/basename', 'typescript', 0, '');
        const result = await invokePromptFactory({ textDocument: tinyTextDocument });
        assert.deepStrictEqual(result, prompt_2._contextTooShort);
    });
    test('errors when hitting fault barrier', async function () {
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {}));
        virtualPrompt.snapshot = sinon.stub().throws(new Error('Intentional snapshot error'));
        promptFactory = accessor.get(instantiation_1.IInstantiationService).createInstance(completionsPromptFactory_1.TestCompletionsPromptFactory, virtualPrompt, undefined);
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result, prompt_2._promptError);
    });
    test('recovers from error when hitting fault barrier', async function () {
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {}));
        virtualPrompt.snapshot = sinon.stub().throws(new Error('Intentional snapshot error'));
        promptFactory = accessor.get(instantiation_1.IInstantiationService).createInstance(completionsPromptFactory_1.TestCompletionsPromptFactory, virtualPrompt, undefined);
        let result = await invokePromptFactory();
        assert.deepStrictEqual(result, prompt_2._promptError);
        result = await invokePromptFactory();
        assert.deepStrictEqual(result.type, 'prompt');
    });
    test('errors on snapshot error', async function () {
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {}));
        virtualPrompt.snapshot = sinon
            .stub()
            .returns({ snapshot: undefined, status: 'error', error: new Error('Intentional snapshot error') });
        promptFactory = accessor.get(instantiation_1.IInstantiationService).createInstance(completionsPromptFactory_1.TestCompletionsPromptFactory, virtualPrompt, undefined);
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result, prompt_2._promptError);
    });
    test('recovers from error on snapshot error', async function () {
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {}));
        virtualPrompt.snapshot = sinon
            .stub()
            .returns({ snapshot: undefined, status: 'error', error: new Error('Intentional snapshot error') });
        promptFactory = accessor.get(instantiation_1.IInstantiationService).createInstance(completionsPromptFactory_1.TestCompletionsPromptFactory, virtualPrompt, undefined);
        let result = await invokePromptFactory();
        assert.deepStrictEqual(result, prompt_2._promptError);
        result = await invokePromptFactory();
        assert.deepStrictEqual(result.type, 'prompt');
    });
    test('handles cancellation', async function () {
        cts.cancel();
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result, prompt_2._promptCancelled);
    });
    test('handles cancellation during update data', async function () {
        const CancellationComponent = (_, context) => {
            context.useData(componentsCompletionsPromptFactory_1.isCompletionRequestData, _ => {
                cts.cancel();
            });
            return (0, jsx_runtime_1.jsx)(components_1.Text, { children: "A really cool prompt" });
        };
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt(((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(CancellationComponent, {}), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {})] })));
        promptFactory = accessor.get(instantiation_1.IInstantiationService).createInstance(completionsPromptFactory_1.TestCompletionsPromptFactory, virtualPrompt, undefined);
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result, prompt_2._promptCancelled);
    });
    test('error in snapshot leads to prompt error', async function () {
        let outerSetShouldThrowError = () => { };
        const ErrorThrowingComponent = (_props, context) => {
            const [shouldThrowError, setShouldThrowError] = context.useState(false);
            outerSetShouldThrowError = setShouldThrowError;
            if (shouldThrowError) {
                throw new Error('Intentional error');
            }
            return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, {});
        };
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt((0, jsx_runtime_1.jsx)(ErrorThrowingComponent, {}));
        promptFactory = accessor.get(instantiation_1.IInstantiationService).createInstance(completionsPromptFactory_1.TestCompletionsPromptFactory, virtualPrompt, undefined);
        outerSetShouldThrowError(true);
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result, prompt_2._promptError);
    });
    test('prompt should not include context provider info if the context provider API is not enabled', async function () {
        const configProvider = accessor.get(config_1.ICompletionsConfigProvider);
        configProvider.setConfig(config_1.ConfigKey.ContextProviders, []);
        telemetryData.filtersAndExp.exp.variables.copilotcontextproviders = '';
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result.type, 'prompt');
        assert.ok(result.prompt.prefix.includes('Consider this related information:') === false);
    });
    test('prompt should include traits and code snippets if the context provider API is enabled', async function () {
        telemetryData.filtersAndExp.exp.variables.copilotcontextproviders = 'traitsProvider,codeSnippetsProvider';
        const traitsProvider = {
            id: 'traitsProvider',
            selector: [{ language: 'typescript' }],
            resolver: {
                resolve: () => Promise.resolve([{ name: 'test_trait', value: 'test_value' }]),
            },
        };
        const codeSnippetsProvider = {
            id: 'codeSnippetsProvider',
            selector: [{ language: 'typescript' }],
            resolver: {
                resolve: () => Promise.resolve([{ uri: 'file:///something.ts', value: 'function foo() { return 1; }' }]),
            },
        };
        const contextProviderRegistry = accessor.get(contextProviderRegistry_1.ICompletionsContextProviderRegistryService);
        contextProviderRegistry.registerContextProvider(traitsProvider);
        contextProviderRegistry.registerContextProvider(codeSnippetsProvider);
        // Register the documents for content exclusion
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.setTextDocument('file:///something.ts', 'typescript', 'does not matter');
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result.type, 'prompt');
        assert.deepStrictEqual(result.prompt.prefix, (0, ts_dedent_1.default) `
				// Path: basename
				// Consider this related information:
				// test_trait: test_value
				// Compare this snippet from something.ts:
				// function foo() { return 1; }
			` + `\n${longPrefix}\nfunction f`);
    });
    test('should still produce a prompt if a context provider errors', async function () {
        telemetryData.filtersAndExp.exp.variables.copilotcontextproviders = 'errorProvider,codeSnippetsProvider';
        const errorProvider = {
            id: 'errorProvider',
            selector: [{ language: 'typescript' }],
            resolver: {
                resolve: () => Promise.reject(new Error('Intentional error')),
            },
        };
        const codeSnippetsProvider = {
            id: 'codeSnippetsProvider',
            selector: [{ language: 'typescript' }],
            resolver: {
                resolve: () => Promise.resolve([{ uri: 'file:///something.ts', value: 'function foo() { return 1; }' }]),
            },
        };
        const contextProviderRegistry = accessor.get(contextProviderRegistry_1.ICompletionsContextProviderRegistryService);
        contextProviderRegistry.registerContextProvider(errorProvider);
        contextProviderRegistry.registerContextProvider(codeSnippetsProvider);
        // Register the documents for content exclusion
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.setTextDocument('file:///something.ts', 'typescript', 'does not matter');
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result.type, 'prompt');
        assert.deepStrictEqual(result.prompt.prefix, (0, ts_dedent_1.default) `
				// Path: basename
				// Compare this snippet from something.ts:
				// function foo() { return 1; }
			` + `\n${longPrefix}\nfunction f`);
    });
    test('prompt should include compute time', async function () {
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result.type, 'prompt');
        assert.ok(result.computeTimeMs > 0);
    });
    test('prompt should trim prefix and include trailingWs', async function () {
        const textDocument = (0, textDocument_1.createTextDocument)('file:///path/basename', 'typescript', 0, `const a = 1;\nfunction f\n    const b = 2;\n    `);
        const result = await invokePromptFactory({ textDocument, position: vscode_languageserver_protocol_1.Position.create(3, 4) });
        assert.deepStrictEqual(result.type, 'prompt');
        assert.deepStrictEqual(result.prompt.prefix, '// Path: basename\nconst a = 1;\nfunction f\n    const b = 2;\n');
        assert.deepStrictEqual(result.trailingWs, '    ');
    });
    test('prompt respects context blocks if separateContext is true', async function () {
        function splitContextPrompt() {
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(completionsContext_1.CompletionsContext, { children: (0, jsx_runtime_1.jsx)(components_1.Text, { children: "First context block" }) }), (0, jsx_runtime_1.jsx)(completionsContext_1.CompletionsContext, { children: (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Second context block" }) }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {})] }));
        }
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt(splitContextPrompt());
        promptFactory = accessor.get(instantiation_1.IInstantiationService).createInstance(completionsPromptFactory_1.TestCompletionsPromptFactory, virtualPrompt, componentsCompletionsPromptFactory_1.PromptOrdering.SplitContext);
        const result = await invokePromptFactory({ separateContext: true });
        assert.deepStrictEqual(result.type, 'prompt');
        assert.deepStrictEqual(result.prompt.context, ['First context block', 'Second context block']);
    });
    test('prompt does not output separate context blocks if separateContext is not specified', async function () {
        function splitContextPrompt() {
            return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(completionsContext_1.CompletionsContext, { children: (0, jsx_runtime_1.jsx)(components_1.Text, { children: "First context block" }) }), (0, jsx_runtime_1.jsx)(completionsContext_1.CompletionsContext, { children: (0, jsx_runtime_1.jsx)(components_1.Text, { children: "Second context block" }) }), (0, jsx_runtime_1.jsx)(currentFile_1.CurrentFile, {})] }));
        }
        const virtualPrompt = new virtualPrompt_1.VirtualPrompt(splitContextPrompt());
        promptFactory = accessor.get(instantiation_1.IInstantiationService).createInstance(completionsPromptFactory_1.TestCompletionsPromptFactory, virtualPrompt, componentsCompletionsPromptFactory_1.PromptOrdering.SplitContext);
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result.type, 'prompt');
        assert.deepStrictEqual(result.prompt.context, undefined);
    });
    test('produces metadata', async function () {
        const result = await invokePromptFactory();
        assert.deepStrictEqual(result.type, 'prompt');
        const metadata = result.metadata;
        assert.ok(metadata);
        assert.ok(metadata.renderId === 0);
        assert.ok(metadata.elisionTimeMs > 0);
        assert.ok(metadata.renderTimeMs > 0);
        assert.ok(metadata.updateDataTimeMs > 0);
        assert.deepStrictEqual(metadata.rendererName, 'c');
        assert.deepStrictEqual(metadata.tokenizer, tokenization_1.TokenizerName.o200k);
        const componentsUpdateDataTimeMs = metadata.componentStatistics.reduce((acc, { updateDataTimeMs }) => acc + (updateDataTimeMs ?? 0), 0);
        assert.ok(componentsUpdateDataTimeMs > 0);
        const actualStatsFiltered = metadata.componentStatistics.map(stats => {
            if (stats.updateDataTimeMs) {
                stats.updateDataTimeMs = 42;
            }
            return stats;
        });
        assert.deepStrictEqual(actualStatsFiltered, [
            {
                componentPath: '$.f[0].CompletionsContext[0].DocumentMarker',
                updateDataTimeMs: 42,
            },
            {
                componentPath: '$.f[0].CompletionsContext[1].Traits',
                updateDataTimeMs: 42,
            },
            {
                componentPath: '$.f[0].CompletionsContext[2].CodeSnippets',
                updateDataTimeMs: 42,
            },
            {
                componentPath: '$.f[0].CompletionsContext[3].SimilarFiles',
                updateDataTimeMs: 42,
            },
            {
                componentPath: '$.f[0].CompletionsContext[4].RecentEdits',
                updateDataTimeMs: 42,
            },
            {
                componentPath: '$.f[1].CurrentFile',
                updateDataTimeMs: 42,
            },
            {
                componentPath: '$.f[0].CompletionsContext[0].DocumentMarker[0].PathMarker[0].Text[0]',
                expectedTokens: 5,
                actualTokens: 5,
            },
            {
                componentPath: '$.f[1].CurrentFile[0].f[0].BeforeCursor[0].Text[0]',
                expectedTokens: 422,
                actualTokens: 422,
            },
            {
                componentPath: '$.f[1].CurrentFile[0].f[1].AfterCursor[0].Text[0]',
                expectedTokens: 6,
                actualTokens: 6,
            },
        ]);
    });
    test('telemetry should include context providers', async function () {
        telemetryData.filtersAndExp.exp.variables.copilotcontextproviders = 'traitsProvider,codeSnippetsProvider';
        const traitsContextProvider = {
            id: 'traitsProvider',
            selector: [{ language: 'typescript' }],
            resolver: {
                resolve: () => Promise.resolve([{ name: 'test_trait', value: 'test_value', id: 'trait1' }]),
            },
        };
        const codeSnippetsProvider = {
            id: 'codeSnippetsProvider',
            selector: [{ language: 'typescript' }],
            resolver: {
                resolve: () => Promise.resolve([
                    {
                        uri: 'file:///something.ts',
                        value: (0, ts_dedent_1.default) `
									function foo() {
										return 1;
									}
								`,
                        id: 'cs1',
                    },
                    {
                        uri: 'file:///somethingElse.ts',
                        value: (0, ts_dedent_1.default) `
									function bar() {
										return 'two';
									}
								`,
                        id: 'cs2',
                        origin: 'update',
                    },
                ]),
            },
        };
        // Register the documents for content exclusion
        const contextProviderRegistry = accessor.get(contextProviderRegistry_1.ICompletionsContextProviderRegistryService);
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.setTextDocument('file:///something.ts', 'typescript', 'does not matter');
        contextProviderRegistry.registerContextProvider(traitsContextProvider);
        contextProviderRegistry.registerContextProvider(codeSnippetsProvider);
        const prompt = await invokePromptFactory();
        const expectedTelemetry = [
            {
                providerId: 'traitsProvider',
                resolution: 'full',
                resolutionTimeMs: -1,
                usage: 'full',
                matched: true,
                numResolvedItems: 1,
                numUsedItems: 1,
                numPartiallyUsedItems: 0,
                usageDetails: [{ id: 'trait1', usage: 'full', expectedTokens: 7, actualTokens: 7, type: 'Trait' }],
            },
            {
                providerId: 'codeSnippetsProvider',
                resolution: 'full',
                resolutionTimeMs: -1,
                usage: 'full',
                matched: true,
                numResolvedItems: 2,
                numUsedItems: 2,
                numPartiallyUsedItems: 0,
                usageDetails: [
                    { id: 'cs1', usage: 'full', expectedTokens: 13, actualTokens: 13, type: 'CodeSnippet' },
                    { id: 'cs2', usage: 'full', expectedTokens: 13, actualTokens: 13, type: 'CodeSnippet', origin: 'update' },
                ],
            },
        ];
        assert.deepStrictEqual(prompt.type, 'prompt');
        assert.deepStrictEqual(prompt.contextProvidersTelemetry?.map(pt => {
            pt.resolutionTimeMs = -1;
            return pt;
        }), expectedTelemetry);
    });
    test('Test only sanctioned traits are included in telemetry', async function () {
        telemetryData.filtersAndExp.exp.variables.copilotcontextproviders = 'traitsProvider';
        const traitsProvider = {
            id: 'traitsProvider',
            selector: [{ language: 'typescript' }],
            resolver: {
                resolve: () => Promise.resolve([
                    { name: 'trait1', value: 'value1' },
                    { name: 'TargetFrameworks', value: 'framework value' },
                    { name: 'trait2', value: 'value2' },
                    { name: 'LanguageVersion', value: 'language version' },
                ]),
            },
        };
        const contextProviderRegistry = accessor.get(contextProviderRegistry_1.ICompletionsContextProviderRegistryService);
        contextProviderRegistry.registerContextProvider(traitsProvider);
        const { reporter } = await (0, telemetry_2.withInMemoryTelemetry)(accessor, async (_) => {
            const response = await invokePromptFactory();
            assert.deepStrictEqual(response.type, 'prompt');
            assert.deepStrictEqual(response.prompt.prefix, (0, ts_dedent_1.default) `
					// Path: basename
					// Consider this related information:
					// trait1: value1
					// TargetFrameworks: framework value
					// trait2: value2
					// LanguageVersion: language version
				` + `\n${longPrefix}\nfunction f`);
        });
        // the event should only contains sanctioned trait with expected property names.
        assert.strictEqual(reporter.hasEvent, true);
        assert.strictEqual(reporter.events.length, 1);
        assert.strictEqual(reporter.events[0].name, 'contextProvider.traits');
        assert.strictEqual(reporter.events[0].properties['targetFrameworks'], 'framework value');
        assert.strictEqual(reporter.events[0].properties['languageVersion'], 'language version');
        assert.strictEqual(reporter.events[0].properties['languageId'], 'typescript');
        assert.strictEqual(reporter.events[0].properties['trait1'], undefined);
        assert.strictEqual(reporter.events[0].properties['trait2'], undefined);
        assert.strictEqual(reporter.hasException, false);
    });
});
class MockRecentEditsProvider extends recentEditsProvider_1.FullRecentEditsProvider {
    testUpdateRecentEdits(docId, newContents) {
        return this.updateRecentEdits(docId, newContents);
    }
}
class CompletionsMutableObservableWorkspace extends observableWorkspace_1.MutableObservableWorkspace {
}
exports.CompletionsMutableObservableWorkspace = CompletionsMutableObservableWorkspace;
//# sourceMappingURL=completionsPromptFactory.test.js.map