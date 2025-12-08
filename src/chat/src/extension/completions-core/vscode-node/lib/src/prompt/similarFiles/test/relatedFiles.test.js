"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
const assert = __importStar(require("assert"));
const sinon_1 = __importDefault(require("sinon"));
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const descriptors_1 = require("../../../../../../../../util/vs/platform/instantiation/common/descriptors");
const documentTracker_1 = require("../../../documentTracker");
const expConfig_1 = require("../../../experiments/expConfig");
const telemetry_1 = require("../../../telemetry");
const context_1 = require("../../../test/context");
const textDocument_1 = require("../../../test/textDocument");
const textDocumentManager_1 = require("../../../textDocumentManager");
const uri_1 = require("../../../util/uri");
const compositeRelatedFilesProvider_1 = require("../compositeRelatedFilesProvider");
const neighborFiles_1 = require("../neighborFiles");
const relatedFiles_1 = require("../relatedFiles");
suite('PromiseExpirationCacheMap', function () {
    const r = new Map();
    const x = Promise.resolve(r);
    test('should add and retrieve entries using set and get methods', function () {
        const cache = new relatedFiles_1.PromiseExpirationCacheMap(2);
        cache.set('a', x);
        cache.set('b', x);
        cache.set('c', x);
        assert.equal(cache.get('b'), x);
        assert.equal(cache.get('c'), x);
        assert.equal(cache.get('a'), undefined, 'a should have been removed from the cache');
        assert.equal(cache.size, 2);
    });
    test('get() should evict expired cache entries', async function () {
        const cache = new relatedFiles_1.PromiseExpirationCacheMap(3, 10);
        cache.set('a', x);
        cache.set('b', x);
        await new Promise(resolve => setTimeout(resolve, 20));
        cache.set('c', x);
        // size does count existing expired entries.
        assert.equal(cache.size, 3);
        assert.equal(cache.get('a'), undefined);
        assert.equal(cache.get('b'), undefined);
        assert.equal(cache.get('c'), x);
        assert.equal(cache.size, 1);
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(cache.get('c'), undefined);
        assert.equal(cache.size, 0);
    });
    test('has() should evict expired cache entries', async function () {
        const cache = new relatedFiles_1.PromiseExpirationCacheMap(7, 10);
        cache.set('a', x);
        cache.set('b', x);
        await new Promise(resolve => setTimeout(resolve, 20));
        cache.set('c', x);
        assert.equal(cache.has('c'), true);
        assert.equal(cache.get('c'), x);
        assert.equal(cache.has('a'), false);
        assert.equal(cache.has('b'), false);
        assert.equal(cache.get('a'), undefined);
        assert.equal(cache.get('b'), undefined);
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(cache.has('c'), false);
        assert.equal(cache.get('c'), undefined);
    });
    test('clear works', function () {
        const cache = new relatedFiles_1.PromiseExpirationCacheMap(2);
        cache.set('a', x);
        cache.set('b', x);
        cache.clear();
        assert.equal(cache.get('a'), undefined);
        assert.equal(cache.get('b'), undefined);
        assert.equal(cache.size, 0);
    });
});
function createOpenFiles(root, timestamp) {
    const FILE_D = `${root}/d.py`;
    const FILE_D_TEXT = '# file d';
    const FILE_E = `${root}/e.cs`;
    const FILE_E_TEXT = '// file e';
    const FILE_R = `${root}/relative/r.jsx`;
    const FILE_R_TEXT = '// file r';
    const FILE_J = `${root}/relative/j.js`;
    const FILE_J_TEXT = '// file j';
    const FILE_K = `${root}/relative/k.md`;
    const FILE_K_TEXT = '# file k';
    return [
        { uri: FILE_D, timestamp: timestamp - 6, text: FILE_D_TEXT, language: 'python' },
        { uri: FILE_E, timestamp: timestamp - 4, text: FILE_E_TEXT, language: 'csharp' },
        { uri: FILE_R, timestamp: timestamp - 3, text: FILE_R_TEXT, language: 'javascriptreact' },
        { uri: FILE_J, timestamp: timestamp - 3, text: FILE_J_TEXT, language: 'javascript' },
        { uri: FILE_K, timestamp: timestamp - 2, text: FILE_K_TEXT, language: 'markdown' },
    ];
}
suite('relatedFiles tests', function () {
    const TIMEOUT = 1000;
    const DEFAULT_FILE_LANGUAGE = 'cpp';
    const CURRENT_TIME_STAMP = Date.now();
    const WKS_ROOTFOLDER = 'file:///test';
    this.timeout(TIMEOUT);
    const OPEN_FILES_FOR_TEST = createOpenFiles(WKS_ROOTFOLDER, CURRENT_TIME_STAMP);
    test('Test scenario where 4 files provided by the C++ related files provider are identical to 2 provided by the OpenTabs`s neighborSource', async function () {
        function getHeaderFileContent(uri) {
            return `// file ${(0, uri_1.getFsPath)(uri)}`;
        }
        const CPP_NONOPENTAB_HEADERS = [];
        const CPP_OPENTAB_HEADERS = [];
        for (let i = 0; i < 2; i++) {
            CPP_OPENTAB_HEADERS.push(`${WKS_ROOTFOLDER}/relative/cppheader${i + 1}.h`);
        }
        for (let i = 2; i < 4; i++) {
            CPP_NONOPENTAB_HEADERS.push(`${WKS_ROOTFOLDER}/relative/cppheader${i + 1}.h`);
        }
        const CPP_ALL_HEADERS = CPP_NONOPENTAB_HEADERS.concat(CPP_OPENTAB_HEADERS);
        const CURRENT_TIME_STAMP = Date.now();
        const FILE_CPP = `${WKS_ROOTFOLDER}/relative/main.cpp`;
        const FILE_CPP_TEXT = '// file main.cpp';
        OPEN_FILES_FOR_TEST.push({
            uri: FILE_CPP,
            timestamp: CURRENT_TIME_STAMP,
            text: FILE_CPP_TEXT,
            language: 'cpp',
        });
        // Add the files provided by OpenTabs that are also provided by the C++ relatedFiles provider.
        for (const openTabHeader of CPP_OPENTAB_HEADERS) {
            OPEN_FILES_FOR_TEST.push({
                uri: openTabHeader,
                timestamp: CURRENT_TIME_STAMP,
                text: getHeaderFileContent(openTabHeader),
                language: 'cpp',
            });
        }
        const DEFAULT_FILE_LANGUAGE = 'cpp';
        class MockedCppRelatedFilesProvider extends compositeRelatedFilesProvider_1.CompositeRelatedFilesProvider {
            getRelatedFilesResponse(docInfo, telemetryData) {
                const uris = CPP_ALL_HEADERS;
                return Promise.resolve({ entries: [{ type: neighborFiles_1.NeighboringFileType.RelatedCpp, uris }] });
            }
            getFileContent(uri) {
                return Promise.resolve(getHeaderFileContent(uri));
            }
        }
        const serviceCollection = (0, context_1.createLibTestingContext)();
        serviceCollection.define(relatedFiles_1.ICompletionsRelatedFilesProviderService, new descriptors_1.SyncDescriptor(MockedCppRelatedFilesProvider));
        serviceCollection.define(textDocumentManager_1.ICompletionsTextDocumentManagerService, new descriptors_1.SyncDescriptor(textDocument_1.TestTextDocumentManager));
        const accessor = serviceCollection.createTestingAccessor();
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        neighborFiles_1.NeighborSource.reset();
        // Mock up the workspace folders.
        tdm.init([{ uri: WKS_ROOTFOLDER }]);
        documentTracker_1.accessTimes.clear();
        for (const file of OPEN_FILES_FOR_TEST) {
            documentTracker_1.accessTimes.set(file.uri, file.timestamp);
            tdm.setTextDocument(file.uri, file.language, file.text);
        }
        const telemetry = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        const result = await neighborFiles_1.NeighborSource.getNeighborFilesAndTraits(accessor, FILE_CPP, DEFAULT_FILE_LANGUAGE, telemetry);
        // 4 header files, two provided by the OpenTabs neightborSource, and two provided by the C++ relatedFiles provider.
        assert.strictEqual(result.docs.size, 4);
        for (const file of CPP_ALL_HEADERS) {
            assert.strictEqual(result.docs.has(file), true);
        }
        assert.strictEqual(result.neighborSource.has(neighborFiles_1.NeighboringFileType.RelatedCpp), true);
        assert.strictEqual(result.neighborSource.has(neighborFiles_1.NeighboringFileType.OpenTabs), true);
        for (const file of CPP_OPENTAB_HEADERS) {
            assert.strictEqual(result.neighborSource.get(neighborFiles_1.NeighboringFileType.OpenTabs)?.includes(file), true);
            assert.strictEqual(result.neighborSource.get(neighborFiles_1.NeighboringFileType.RelatedCpp)?.includes(file), false);
        }
        for (const file of CPP_NONOPENTAB_HEADERS) {
            assert.strictEqual(result.neighborSource.get(neighborFiles_1.NeighboringFileType.RelatedCpp)?.includes(file), true);
            assert.strictEqual(result.neighborSource.get(neighborFiles_1.NeighboringFileType.OpenTabs)?.includes(file), false);
        }
    });
    test('Test scenarios where the C++ related files provider fails', async function () {
        const DUMMY_OPEN_CPPFILE = 'file:///test/relative/main2.cpp';
        const DUMMY_RELATED_FILE = 'file:///test/relative/related-file.cpp';
        const RETRY_COUNT = 3;
        let FailureType;
        (function (FailureType) {
            FailureType[FailureType["WithException"] = 0] = "WithException";
            FailureType[FailureType["WithUndefined"] = 1] = "WithUndefined";
            FailureType[FailureType["NoFailure"] = 2] = "NoFailure";
        })(FailureType || (FailureType = {}));
        class MockedCppRelatedFilesProvider extends compositeRelatedFilesProvider_1.CompositeRelatedFilesProvider {
            constructor() {
                super(...arguments);
                this._failureType = FailureType.NoFailure;
            }
            getRelatedFilesResponse(_docInfo, _telemetryData, _cancellationToken) {
                switch (this._failureType) {
                    case FailureType.WithException:
                        return Promise.reject(new Error('The provider failed to provide the related files'));
                    case FailureType.WithUndefined:
                        return Promise.resolve(undefined);
                    case FailureType.NoFailure:
                        return Promise.resolve({
                            entries: [{ type: neighborFiles_1.NeighboringFileType.RelatedCpp, uris: [DUMMY_RELATED_FILE] }],
                        });
                }
            }
            getFileContent(uri) {
                return Promise.resolve('// C++ dummy content');
            }
            setFailWith(type) {
                this._failureType = type;
            }
        }
        const serviceCollection = (0, context_1.createLibTestingContext)();
        serviceCollection.define(relatedFiles_1.ICompletionsRelatedFilesProviderService, new descriptors_1.SyncDescriptor(MockedCppRelatedFilesProvider));
        serviceCollection.define(textDocumentManager_1.ICompletionsTextDocumentManagerService, new descriptors_1.SyncDescriptor(textDocument_1.TestTextDocumentManager));
        const accessor = serviceCollection.createTestingAccessor();
        const cppProvider = accessor.get(relatedFiles_1.ICompletionsRelatedFilesProviderService);
        const telemetry = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
        const cppProviderGetMock = sinon_1.default.spy(cppProvider, 'getRelatedFilesResponse');
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.init([{ uri: WKS_ROOTFOLDER }]);
        const DUMMY_CPP = 'file:///test/relative/dummy.cpp';
        documentTracker_1.accessTimes.set(DUMMY_CPP, CURRENT_TIME_STAMP);
        tdm.setTextDocument(DUMMY_CPP, DEFAULT_FILE_LANGUAGE, DUMMY_RELATED_FILE);
        // One time init of NeighborSource singleton.
        neighborFiles_1.NeighborSource.reset();
        // An empty list is cached when the retryCount limit is reached for a given URI.
        let result = undefined;
        for (let i = 0; i < RETRY_COUNT; i++) {
            cppProvider.setFailWith(RETRY_COUNT % 2 === 0 ? FailureType.WithException : FailureType.WithUndefined);
            result = await neighborFiles_1.NeighborSource.getNeighborFilesAndTraits(accessor, DUMMY_CPP, DEFAULT_FILE_LANGUAGE, telemetry);
            assert.strictEqual(result.neighborSource.has(neighborFiles_1.NeighboringFileType.RelatedCpp), false);
            assert.strictEqual(cppProviderGetMock.callCount, 1);
            assert.strictEqual(cppProviderGetMock.calledOnce, true);
            cppProviderGetMock.resetHistory();
        }
        cppProvider.setFailWith(FailureType.WithException);
        for (let i = 0; i < RETRY_COUNT; i++) {
            result = await neighborFiles_1.NeighborSource.getNeighborFilesAndTraits(accessor, DUMMY_CPP, DEFAULT_FILE_LANGUAGE, telemetry);
            assert.strictEqual(result.neighborSource.has(neighborFiles_1.NeighboringFileType.RelatedCpp), false);
            assert.strictEqual(cppProviderGetMock.calledOnce, false);
            cppProviderGetMock.resetHistory();
        }
        // The actual result is cached when retrieval works within the given retryCount limit.
        documentTracker_1.accessTimes.set(DUMMY_OPEN_CPPFILE, CURRENT_TIME_STAMP);
        tdm.setTextDocument(DUMMY_OPEN_CPPFILE, DEFAULT_FILE_LANGUAGE, DUMMY_RELATED_FILE);
        cppProvider.setFailWith(FailureType.WithException);
        for (let i = 0; i < RETRY_COUNT - 1; i++) {
            result = await neighborFiles_1.NeighborSource.getNeighborFilesAndTraits(accessor, DUMMY_OPEN_CPPFILE, DEFAULT_FILE_LANGUAGE, telemetry);
            assert.strictEqual(result.neighborSource.has(neighborFiles_1.NeighboringFileType.RelatedCpp), false);
            assert.strictEqual(cppProviderGetMock.calledOnce, true);
            cppProviderGetMock.resetHistory();
        }
        cppProvider.setFailWith(FailureType.NoFailure);
        cppProviderGetMock.resetHistory();
        result = await neighborFiles_1.NeighborSource.getNeighborFilesAndTraits(accessor, DUMMY_OPEN_CPPFILE, DEFAULT_FILE_LANGUAGE, telemetry);
        assert.strictEqual(result.neighborSource.has(neighborFiles_1.NeighboringFileType.RelatedCpp), true);
        assert.strictEqual(result.docs.has(DUMMY_RELATED_FILE), true);
        assert.strictEqual(cppProviderGetMock.calledOnce, true);
        cppProviderGetMock.resetHistory();
        result = await neighborFiles_1.NeighborSource.getNeighborFilesAndTraits(accessor, DUMMY_OPEN_CPPFILE, DEFAULT_FILE_LANGUAGE, telemetry);
        assert.strictEqual(result.neighborSource.has(neighborFiles_1.NeighboringFileType.RelatedCpp), true);
        assert.strictEqual(result.docs.has(DUMMY_RELATED_FILE), true);
        assert.strictEqual(cppProviderGetMock.calledOnce, false);
        cppProviderGetMock.resetHistory();
    });
    suite('CompositeRelatedFilesProvider', function () {
        class TestCompositeRelatedFilesProvider extends compositeRelatedFilesProvider_1.CompositeRelatedFilesProvider {
            getFileContent(uri) {
                if (uri.endsWith('.js') || uri.endsWith('.ts')) {
                    return Promise.resolve('// js dummy');
                }
                else if (uri.endsWith('.cs')) {
                    return Promise.resolve('// cs dummy');
                }
                return Promise.resolve(undefined);
            }
        }
        async function compositeGetRelated(providers, telemetryWithExp, filetype = 'javascript', cancel = false) {
            const serviceCollection = (0, context_1.createLibTestingContext)();
            serviceCollection.define(textDocumentManager_1.ICompletionsTextDocumentManagerService, new descriptors_1.SyncDescriptor(textDocument_1.TestTextDocumentManager));
            serviceCollection.define(relatedFiles_1.ICompletionsRelatedFilesProviderService, new descriptors_1.SyncDescriptor(TestCompositeRelatedFilesProvider));
            const accessor = serviceCollection.createTestingAccessor();
            const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
            // Mock up the workspace folders.
            tdm.init([{ uri: WKS_ROOTFOLDER }]);
            const composite = accessor.get(relatedFiles_1.ICompletionsRelatedFilesProviderService);
            for (const { extensionId, languageId, callback } of providers) {
                composite.registerRelatedFilesProvider(extensionId, languageId, callback);
            }
            const OPEN_FILES_FOR_TEST = createOpenFiles(WKS_ROOTFOLDER, Date.now());
            const closedFiles = OPEN_FILES_FOR_TEST.map(f => ({ ...f, uri: f.uri.replace('.', '2.') }));
            for (const file of OPEN_FILES_FOR_TEST) {
                documentTracker_1.accessTimes.set(file.uri, file.timestamp);
            }
            for (const file of closedFiles) {
                tdm.setDiskContents(file.uri, file.text);
            }
            for (const file of OPEN_FILES_FOR_TEST) {
                tdm.setTextDocument(file.uri, file.language, file.text);
            }
            const uri = OPEN_FILES_FOR_TEST[filetype === 'javascript' ? 3 : 1].uri;
            const doc = await tdm.getTextDocument({ uri });
            assert.ok(doc, `missing text document ${uri}`);
            const wksFolder = tdm.getWorkspaceFolder(doc);
            assert.ok(wksFolder, `missing workspace folder for ${uri}`);
            const cts = new vscode_languageserver_protocol_1.CancellationTokenSource();
            if (cancel) {
                cts.cancel();
            }
            return (await (0, relatedFiles_1.getRelatedFilesAndTraits)(accessor, doc, telemetryWithExp, cts.token, undefined, true)).entries;
        }
        test('zero registered providers returns nothing', async function () {
            const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeTypeScript] = true;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeCSharp] = true;
            const relatedFiles = await compositeGetRelated([], telemetryWithExp);
            assert.deepStrictEqual(relatedFiles, new Map());
        });
        test('Typescript provider returns no files for JS file', async function () {
            const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeTypeScript] = true;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeCSharp] = true;
            const relatedFiles = await compositeGetRelated([
                {
                    languageId: 'typescript',
                    extensionId: 'vscode.typescript-language-features',
                    callback: (url) => Promise.resolve({
                        entries: [
                            { type: neighborFiles_1.NeighboringFileType.RelatedTypeScript, uris: [url.replace('.', '2.')] },
                        ],
                    }),
                },
            ], telemetryWithExp);
            assert.deepStrictEqual(relatedFiles, new Map());
        });
        test('Javascript provider returns nothing when cancelled', async function () {
            const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeTypeScript] = true;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeCSharp] = true;
            const relatedFiles = await compositeGetRelated([
                {
                    languageId: 'javascript',
                    extensionId: 'vscode.typescript-language-features',
                    callback: (url, context, token) => Promise.resolve({
                        entries: token.isCancellationRequested
                            ? []
                            : [{ type: neighborFiles_1.NeighboringFileType.RelatedTypeScript, uris: [url.replace('.', '2.')] }],
                    }),
                },
            ], telemetryWithExp, 'javascript', 
            /*cancel*/ true);
            assert.deepStrictEqual(relatedFiles, new Map());
        });
        test('Javascript provider returns a file for JS file', async function () {
            const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeTypeScript] = true;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeCSharp] = true;
            const relatedFiles = await compositeGetRelated([
                {
                    languageId: 'javascript',
                    extensionId: 'vscode.typescript-language-features',
                    callback: (url) => Promise.resolve({
                        entries: [
                            { type: neighborFiles_1.NeighboringFileType.RelatedTypeScript, uris: [url.replace('.', '2.')] },
                        ],
                    }),
                },
            ], telemetryWithExp);
            assert.deepStrictEqual(relatedFiles, new Map([
                [neighborFiles_1.NeighboringFileType.RelatedTypeScript, new Map([['file:///test/relative/j2.js', '// js dummy']])],
            ]));
        });
        test('Javascript and C# providers only fire Typescript provider for JS', async function () {
            const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeTypeScript] = true;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeCSharp] = true;
            const relatedFiles = await compositeGetRelated([
                {
                    languageId: 'csharp',
                    extensionId: 'ms-dotnettools.csharp',
                    callback: (url) => Promise.resolve({
                        entries: [
                            { type: neighborFiles_1.NeighboringFileType.RelatedCSharpRoslyn, uris: [url.replace('.', '2.')] },
                        ],
                    }),
                },
                {
                    languageId: 'javascript',
                    extensionId: 'vscode.typescript-language-features',
                    callback: (url) => Promise.resolve({
                        entries: [
                            { type: neighborFiles_1.NeighboringFileType.RelatedTypeScript, uris: [url.replace('.', '3.')] },
                        ],
                    }),
                },
            ], telemetryWithExp);
            assert.deepStrictEqual(relatedFiles, new Map([
                [neighborFiles_1.NeighboringFileType.RelatedTypeScript, new Map([['file:///test/relative/j3.js', '// js dummy']])],
            ]));
        });
        test('multiple registration of Typescript providers for JS only returns one file', async function () {
            const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeTypeScript] = true;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeCSharp] = true;
            const relatedFiles = await compositeGetRelated([
                {
                    languageId: 'javascript',
                    extensionId: 'vscode.typescript-language-features',
                    callback: (url) => Promise.resolve({
                        entries: [
                            { type: neighborFiles_1.NeighboringFileType.RelatedTypeScript, uris: [url.replace('.', '2.')] },
                        ],
                    }),
                },
                {
                    languageId: 'javascript',
                    extensionId: 'vscode.typescript-language-features',
                    callback: (url) => Promise.resolve({
                        entries: [
                            { type: neighborFiles_1.NeighboringFileType.RelatedTypeScript, uris: [url.replace('.', '3.')] },
                        ],
                    }),
                },
                {
                    languageId: 'javascript',
                    extensionId: 'vscode.typescript-language-features',
                    callback: (url) => Promise.resolve({
                        entries: [
                            { type: neighborFiles_1.NeighboringFileType.RelatedTypeScript, uris: [url.replace('.', '4.')] },
                        ],
                    }),
                },
            ], telemetryWithExp);
            assert.deepStrictEqual(relatedFiles, new Map([
                [neighborFiles_1.NeighboringFileType.RelatedTypeScript, new Map([['file:///test/relative/j4.js', '// js dummy']])],
            ]));
        });
        test('C# provider returns a file for .cs file', async function () {
            const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeTypeScript] = true;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeCSharp] = true;
            const relatedFiles = await compositeGetRelated([
                {
                    languageId: 'csharp',
                    extensionId: 'ms-dotnettools.csharp',
                    callback: (url) => Promise.resolve({
                        entries: [
                            { type: neighborFiles_1.NeighboringFileType.RelatedCSharpRoslyn, uris: [url.replace('.', '2.')] },
                        ],
                    }),
                },
            ], telemetryWithExp, 'csharp');
            assert.deepStrictEqual(relatedFiles, new Map([[neighborFiles_1.NeighboringFileType.RelatedCSharpRoslyn, new Map([['file:///test/e2.cs', '// cs dummy']])]]));
        });
        test('C# provider returns no files for JS file', async function () {
            const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeTypeScript] = true;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeCSharp] = true;
            const relatedFiles = await compositeGetRelated([
                {
                    languageId: 'csharp',
                    extensionId: 'ms-dotnettools.csharp',
                    callback: (url) => Promise.resolve({
                        entries: [
                            { type: neighborFiles_1.NeighboringFileType.RelatedCSharpRoslyn, uris: [url.replace('.', '2.')] },
                        ],
                    }),
                },
            ], telemetryWithExp, 'javascript');
            assert.deepStrictEqual(relatedFiles, new Map());
        });
        test('Provider that throws returns no files', async function () {
            const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeTypeScript] = true;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeCSharp] = true;
            const relatedFiles = await compositeGetRelated([
                {
                    languageId: 'javascript',
                    extensionId: 'vscode.typescript-language-features',
                    callback: (url) => Promise.reject(new Error(`Error providing files for ${url}`)),
                },
            ], telemetryWithExp);
            assert.deepStrictEqual(relatedFiles, new Map());
        });
        test('Inactive Typescript provider returns no related files', async function () {
            const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeTypeScript] = false;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeCSharp] = true;
            const relatedFiles = await compositeGetRelated([
                {
                    languageId: 'javascript',
                    extensionId: 'vscode.typescript-language-features',
                    callback: (url) => Promise.resolve({
                        entries: [
                            { type: neighborFiles_1.NeighboringFileType.RelatedTypeScript, uris: [url.replace('.', '4.')] },
                        ],
                    }),
                },
            ], telemetryWithExp);
            assert.deepStrictEqual(relatedFiles, new Map());
        });
        test('Inactive Typescript provider returns no related files with general flag enabled', async function () {
            const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeTypeScript] = false;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeCSharp] = false;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCode] = true;
            const relatedFiles = await compositeGetRelated([
                {
                    languageId: 'javascript',
                    extensionId: 'vscode.typescript-language-features',
                    callback: (url) => Promise.resolve({
                        entries: [
                            { type: neighborFiles_1.NeighboringFileType.RelatedTypeScript, uris: [url.replace('.', '4.')] },
                        ],
                    }),
                },
            ], telemetryWithExp);
            assert.deepStrictEqual(relatedFiles, new Map());
        });
        test('Python provider returns related files with general flag enabled', async function () {
            const telemetryWithExp = telemetry_1.TelemetryWithExp.createEmptyConfigForTesting();
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeTypeScript] = false;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCodeCSharp] = false;
            telemetryWithExp.filtersAndExp.exp.variables[expConfig_1.ExpTreatmentVariables.RelatedFilesVSCode] = true;
            const relatedFiles = await compositeGetRelated([
                {
                    languageId: 'python',
                    extensionId: 'ms-python.python',
                    callback: (url) => Promise.resolve({
                        entries: [{ type: neighborFiles_1.NeighboringFileType.RelatedOther, uris: [url.replace('.', '4.')] }],
                    }),
                },
            ], telemetryWithExp, 'python');
            assert.deepStrictEqual(relatedFiles, new Map());
        });
    });
});
//# sourceMappingURL=relatedFiles.test.js.map