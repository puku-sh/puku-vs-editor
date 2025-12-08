"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const os_1 = __importDefault(require("os"));
const ignoreService_1 = require("../../../../../../../../platform/ignore/common/ignoreService");
const instantiation_1 = require("../../../../../../../../util/vs/platform/instantiation/common/instantiation");
const fileSystem_1 = require("../../../fileSystem");
const context_1 = require("../../../test/context");
const filesystem_1 = require("../../../test/filesystem");
const testContentExclusion_1 = require("../../../test/testContentExclusion");
const textDocument_1 = require("../../../test/textDocument");
const textDocumentManager_1 = require("../../../textDocumentManager");
const contextProviderStatistics_1 = require("../../contextProviderStatistics");
const contextProviderStatistics_2 = require("../../test/contextProviderStatistics");
const codeSnippets_1 = require("../codeSnippets");
suite('codeSnippetsContextProvider', function () {
    let accessor;
    let serviceCollection;
    let tdm;
    let ignoreService;
    const resolvedContextItems = [
        {
            providerId: 'testCodeSnippetsProvider1',
            matchScore: 1,
            resolution: 'full',
            resolutionTimeMs: 10,
            data: [
                {
                    uri: 'file:///foo.js',
                    value: 'foovalue',
                    additionalUris: ['file:///foo2.js'],
                    id: '1',
                    type: 'CodeSnippet',
                },
                {
                    uri: 'file:///bar.js',
                    value: 'barvalue',
                    id: '2',
                    type: 'CodeSnippet',
                },
                // Multiple snippets for the same file are allowed
                {
                    uri: 'file:///bar.js',
                    value: 'anotherbarvalue',
                    id: '3',
                    type: 'CodeSnippet',
                },
            ],
        },
        {
            providerId: 'testCodeSnippetsProvider2',
            matchScore: 1,
            resolution: 'full',
            resolutionTimeMs: 10,
            data: [
                { uri: 'file:///baz.js', value: 'bazvalue', id: '4', type: 'CodeSnippet' },
                { uri: 'file:///maybe.js', value: 'maybevalue', id: '5', type: 'CodeSnippet' },
            ],
        },
    ];
    setup(function () {
        serviceCollection = (0, context_1.createLibTestingContext)();
        serviceCollection.define(ignoreService_1.IIgnoreService, new testContentExclusion_1.MockIgnoreService());
        accessor = serviceCollection.createTestingAccessor();
        ignoreService = accessor.get(ignoreService_1.IIgnoreService);
        tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.setTextDocument('file:///foo.js', 'javascript', 'doesntmatter');
        tdm.setTextDocument('file:///bar.js', 'javascript', 'doesntmatter');
        tdm.setTextDocument('file:///baz.js', 'javascript', 'doesntmatter');
        tdm.setTextDocument('file:///foo2.js', 'javascript', 'doesntmatter');
    });
    test('can get code snippets from context text providers and flattens them', async function () {
        const codeSnippets = await (0, codeSnippets_1.getCodeSnippetsFromContextItems)(accessor, 'COMPLETION_ID', resolvedContextItems, 'javascript');
        assert_1.default.deepStrictEqual(codeSnippets.length, 5);
        assert_1.default.deepStrictEqual(codeSnippets.map(t => t.value), ['foovalue', 'barvalue', 'anotherbarvalue', 'bazvalue', 'maybevalue']);
    });
    test('set expectations for contextProviderStatistics', async function () {
        const statistics = new contextProviderStatistics_2.TestContextProviderStatistics();
        const serviceCollectionClone = serviceCollection.clone();
        serviceCollectionClone.define(contextProviderStatistics_1.ICompletionsContextProviderService, new contextProviderStatistics_1.ContextProviderStatistics(() => statistics));
        const accessor = serviceCollectionClone.createTestingAccessor();
        await (0, codeSnippets_1.getCodeSnippetsFromContextItems)(accessor, 'COMPLETION_ID', resolvedContextItems, 'javascript');
        assert_1.default.deepStrictEqual(statistics.expectations.size, 2);
        const expectations = statistics.expectations.get('testCodeSnippetsProvider1');
        assert_1.default.ok(expectations);
        assert_1.default.deepStrictEqual(expectations, [
            [
                {
                    uri: 'file:///foo.js',
                    value: 'foovalue',
                    additionalUris: ['file:///foo2.js'],
                    id: '1',
                    type: 'CodeSnippet',
                },
                'included',
            ],
            [{ uri: 'file:///bar.js', value: 'barvalue', id: '2', type: 'CodeSnippet' }, 'included'],
            [{ uri: 'file:///bar.js', value: 'anotherbarvalue', id: '3', type: 'CodeSnippet' }, 'included'],
        ]);
        const expectations2 = statistics.expectations.get('testCodeSnippetsProvider2');
        assert_1.default.ok(expectations2);
        assert_1.default.deepStrictEqual(expectations2, [
            [{ uri: 'file:///baz.js', value: 'bazvalue', id: '4', type: 'CodeSnippet' }, 'included'],
            [{ uri: 'file:///maybe.js', value: 'maybevalue', id: '5', type: 'CodeSnippet' }, 'included'],
        ]);
    });
    test('content excluded files are not returned', async function () {
        // maybe.js is set but not content excluded
        tdm.setTextDocument('file:///maybe.js', 'javascript', 'doesntmatter');
        const codeSnippets = await (0, codeSnippets_1.getCodeSnippetsFromContextItems)(accessor, 'COMPLETION_ID', resolvedContextItems, 'javascript');
        assert_1.default.deepStrictEqual(codeSnippets.length, 5);
        assert_1.default.ok(codeSnippets.map(t => t.uri).includes('file:///maybe.js'));
        // If it's content excluded, it's not returned
        ignoreService.setBlockListUris(['file:///maybe.js']);
        const codeSnippetsAfterExclusion = await (0, codeSnippets_1.getCodeSnippetsFromContextItems)(accessor, 'COMPLETION_ID', resolvedContextItems, 'javascript');
        assert_1.default.deepStrictEqual(codeSnippetsAfterExclusion.length, 4);
        assert_1.default.ok(!codeSnippetsAfterExclusion.map(t => t.uri).includes('file:///maybe.js'));
    });
    test('documents can be read from the file system,', async function () {
        // The additionalUri for the code snippet is not open, so we create a fake file system
        // entry depending on the OS to test the normalization of the URI.
        const drive = os_1.default.platform() === 'win32' ? 'c:' : '';
        const uriPrefix = os_1.default.platform() === 'win32' ? 'file:///c:' : 'file://';
        const serviceCollectionClone = serviceCollection.clone();
        serviceCollectionClone.define(fileSystem_1.ICompletionsFileSystemService, new filesystem_1.FakeFileSystem({
            [`${drive}/fake2.js`]: 'content',
        }));
        // Use a SimpleTestTextDocumentManager to read from the FakeFileSystem
        const tdm = accessor.get(instantiation_1.IInstantiationService).createInstance(textDocument_1.SimpleTestTextDocumentManager);
        serviceCollectionClone.define(textDocumentManager_1.ICompletionsTextDocumentManagerService, tdm);
        const accessorClone = serviceCollectionClone.createTestingAccessor();
        const additionalUri = `${uriPrefix}/fake2.js`;
        // Set the main uri as an open file
        const mainUri = `${uriPrefix}/fake.js`;
        tdm.setTextDocument(mainUri, 'javascript', 'doesntmatter');
        const resolvedContextItems = [
            {
                providerId: 'testCodeSnippetsProvider1',
                matchScore: 1,
                resolution: 'full',
                resolutionTimeMs: 10,
                data: [
                    {
                        uri: mainUri,
                        value: 'foovalue',
                        additionalUris: [additionalUri],
                        id: '1',
                        type: 'CodeSnippet',
                    },
                ],
            },
        ];
        const codeSnippets = await (0, codeSnippets_1.getCodeSnippetsFromContextItems)(accessorClone, 'COMPLETION_ID', resolvedContextItems, 'javascript');
        assert_1.default.deepStrictEqual(codeSnippets.length, 1);
    });
    test('content exclusion does not check multiple times', async function () {
        const serviceCollectionClone = serviceCollection.clone();
        const tdm = accessor.get(instantiation_1.IInstantiationService).createInstance(FakeTextDocumentManager);
        serviceCollectionClone.define(textDocumentManager_1.ICompletionsTextDocumentManagerService, tdm);
        const accessorClone = serviceCollectionClone.createTestingAccessor();
        await (0, codeSnippets_1.getCodeSnippetsFromContextItems)(accessorClone, 'COMPLETION_ID', resolvedContextItems, 'javascript');
        const uris = resolvedContextItems.map(t => t.data.flatMap(d => [d.uri, ...(d.additionalUris ?? [])])).flat();
        assert_1.default.ok(uris.length > tdm.checkedUris.length);
        assert_1.default.deepStrictEqual(tdm.checkedUris.length, new Set(tdm.checkedUris).size);
    });
    test('files are not returned if any of their additionalUris are excluded', async function () {
        ignoreService.setBlockListUris(['file:///foo2.js']);
        const codeSnippets = await (0, codeSnippets_1.getCodeSnippetsFromContextItems)(accessor, 'COMPLETION_ID', resolvedContextItems, 'javascript');
        assert_1.default.deepStrictEqual(codeSnippets.length, 4);
        assert_1.default.ok(!codeSnippets.map(t => t.uri).includes('file:///foo.js'));
    });
    test('documents do not have to be open', async function () {
        tdm.setDiskContents('file:///maybe.js', 'doesntmatter');
        const codeSnippets = await (0, codeSnippets_1.getCodeSnippetsFromContextItems)(accessor, 'COMPLETION_ID', resolvedContextItems, 'javascript');
        assert_1.default.deepStrictEqual(codeSnippets.length, 5);
        assert_1.default.ok(codeSnippets.map(t => t.uri).includes('file:///maybe.js'));
    });
});
class FakeTextDocumentManager extends textDocument_1.TestTextDocumentManager {
    constructor() {
        super(...arguments);
        this.checkedUris = [];
    }
    getTextDocumentValidation(docId) {
        this.checkedUris.push(docId.uri);
        return Promise.resolve({ status: 'valid' });
    }
}
//# sourceMappingURL=codeSnippets.test.js.map