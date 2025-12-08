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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const outdent_1 = require("outdent");
const namingConvention_1 = require("../../src/extension/renameSuggestions/common/namingConvention");
const renameSuggestionsProvider_1 = require("../../src/extension/renameSuggestions/node/renameSuggestionsProvider");
const annotatedSrc_1 = require("../../src/util/common/test/annotatedSrc");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../src/vscodeTypes");
const stest_1 = require("../base/stest");
const inlineChatSimulator_1 = require("./inlineChatSimulator");
const sharedTypes_1 = require("./shared/sharedTypes");
function offsetRangeToPositionRange(offsetRange, document) {
    const startPos = document.positionAt(offsetRange.startIndex);
    const endPos = document.positionAt(offsetRange.endIndex);
    const range = new vscodeTypes_1.Range(startPos, endPos);
    return range;
}
(0, stest_1.ssuite)({ title: 'Rename suggestions', location: 'external' }, () => {
    class AlwaysEnabledNewSymbolNamesProvider extends renameSuggestionsProvider_1.RenameSuggestionsProvider {
        isEnabled() {
            return true;
        }
    }
    /**
     * Asserts that each newSymbolName includes at least one of the searchStrings.
     *
     * @remark lower-cases symbol names for string search but not search-strings
     */
    function assertIncludesLowercased(newSymbolNames, searchStrings) {
        searchStrings = Array.isArray(searchStrings) ? searchStrings : [searchStrings];
        searchStrings = searchStrings.map(s => s.toLowerCase());
        for (const symbol of newSymbolNames) {
            const newSymbolNameLowercase = symbol.newSymbolName.toLowerCase();
            assert.ok(searchStrings.some(searchString => newSymbolNameLowercase.includes(searchString)), `expected to include ${searchStrings.map(s => `'${s}'`).join(' or ')} but received '${newSymbolNameLowercase}'`);
        }
    }
    function assertLength(newSymbolNames) {
        assert.ok(newSymbolNames.length > 1, `expected at least ${1} newSymbolNames but received ${newSymbolNames.length}\n${JSON.stringify(newSymbolNames.map(v => v.newSymbolName), null, '\t')}`);
    }
    function countMatches(newSymbolNames, searchStrings) {
        const searchStringsLowercased = searchStrings.toLowerCase();
        return newSymbolNames.filter(symbol => symbol.newSymbolName.toLowerCase().includes(searchStringsLowercased)).length;
    }
    async function provideNewSymbolNames(testingServiceCollection, files) {
        // find current file from files, deannoate it and put it at the end
        const currentFileIx = files.length === 1 ? 0 : files.findIndex(f => f.isCurrent);
        if (currentFileIx < 0) {
            throw new Error(`No current file found from files:\n ${JSON.stringify(files, null, '\t')}`);
        }
        let currentFile = files[currentFileIx];
        files.splice(currentFileIx, 1);
        const { deannotatedSrc, annotatedRange } = (0, annotatedSrc_1.deannotateSrc)(currentFile.fileContents);
        currentFile = {
            ...currentFile,
            fileContents: deannotatedSrc,
        };
        files.push(currentFile);
        // set up workspace
        const workspace = (0, inlineChatSimulator_1.setupSimulationWorkspace)(testingServiceCollection, { files });
        const accessor = testingServiceCollection.createTestingAccessor();
        try {
            const document = workspace.getDocument(currentFile.fileName).document;
            const renameRange = offsetRangeToPositionRange(annotatedRange, document);
            // write initial file contents to disk to be able to view it from swb
            const testRuntime = accessor.get(stest_1.ISimulationTestRuntime);
            const workspacePath = workspace.getFilePath(document.uri);
            await testRuntime.writeFile(workspacePath + '.txt', document.getText(), sharedTypes_1.INLINE_INITIAL_DOC_TAG); // using .txt instead of real file extension to avoid breaking automation scripts
            // get rename suggestions
            const provider = accessor.get(instantiation_1.IInstantiationService).createInstance(AlwaysEnabledNewSymbolNamesProvider);
            const symbols = await provider.provideNewSymbolNames(document, renameRange, vscodeTypes_1.NewSymbolNameTriggerKind.Invoke, cancellation_1.CancellationToken.None);
            return symbols;
        }
        finally {
            await (0, inlineChatSimulator_1.teardownSimulationWorkspace)(accessor, workspace);
        }
    }
    (0, stest_1.stest)('rename a function at its definition', async (testingServiceCollection) => {
        const fileContents = (0, outdent_1.outdent) `
			export function <<fibonacci>>(n: number): number {
				if (n <= 1) {
					return 1;
				}
				return fibonacci(n - 1) + fibonacci(n - 2);
			}
		`;
        const file = {
            kind: 'relativeFile',
            fileName: 'fibonacci.ts',
            languageId: 'typescript',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols, `Expected symbols to be non-null`);
        assertLength(symbols);
        assert.ok(countMatches(symbols, 'fib') >= Math.floor(symbols.length * 0.8), 'Expected 80% of symbols to include fib: ' + JSON.stringify(symbols.map(s => s.newSymbolName)));
    });
    (0, stest_1.stest)('rename follows naming convention _ - rename a function (with underscore) at its definition', async (testingServiceCollection) => {
        const fileContents = (0, outdent_1.outdent) `
			export function <<_fib>>(n: number): number {
				if (n <= 1) {
					return 1;
				}
				return _fib(n - 1) + _fib(n - 2);
			}
		`;
        const file = {
            kind: 'relativeFile',
            fileName: 'fibonacci.ts',
            languageId: 'typescript',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols, `Expected symbols to be non-null`);
        assertLength(symbols);
        assert.ok(symbols.some(s => s.newSymbolName.startsWith('_')), 'Expected to include symbols with underscore');
        assertIncludesLowercased(symbols, ['fib', 'sequence']);
    });
    (0, stest_1.stest)('rename a variable reference within a function', async (testingServiceCollection) => {
        const fileContents = ((0, outdent_1.outdent) `
			function fromQueryMatches(matches: Parser.QueryMatch[]): InSourceTreeSitterQuery[] {
				const captures = matches.flatMap(({ captures }) => captures)
					.sort((a, b) => a.node.startIndex - b.node.startIndex || b.node.endIndex - a.node.endIndex);

				const qs: InSourceTreeSitterQuery[] = [];
				for (let i = 0; i < captures.length;) {
					const capture = captures[i];
					if (capture.name === 'call_expression' && captures[i + 2].name === 'target_language' && captures[i + 3].name === 'query_src_with_quotes') {
						<<qs>>.push(new InSourceTreeSitterQuery(captures[i + 2].node, captures[i + 3].node));
						i += 4;
					} else {
						i++;
					}
				}

				return qs;
			}
		`);
        const file = {
            kind: 'relativeFile',
            fileName: 'queryDiagnosticsProvider.ts',
            languageId: 'typescript',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols, `Expected symbols to be non-null`);
        assertLength(symbols);
        assertIncludesLowercased(symbols, ['quer']);
    });
    (0, stest_1.stest)('rename a SCREAMING_SNAKE_CASE enum member', async (testingServiceCollection) => {
        const fileContents = ((0, outdent_1.outdent) `
			enum LoadStatus {
				NOT_LOADED,
				LOADING_FROM_CACHE,
				<<LOADING_FROM_SRVER>>,
				LOADED,
			}
		`);
        const file = {
            kind: 'relativeFile',
            fileName: 'queryDiagnosticsProvider.ts',
            languageId: 'typescript',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols, `Expected symbols to be non-null`);
        assertLength(symbols);
        assert.ok(symbols.every(symbol => (0, namingConvention_1.guessNamingConvention)(symbol.newSymbolName) === namingConvention_1.NamingConvention.ScreamingSnakeCase), 'Expected all symbols to be SCREAMING_SNAKE_CASE');
    });
    (0, stest_1.stest)('respect context: infer name based on existing code - enum member', async (testingServiceCollection) => {
        const fileContents = ((0, outdent_1.outdent) `
			enum Direction {
				UP,
				DOWN,
				RIGHT,
				<<TODO>>,
			}
		`);
        const file = {
            kind: 'relativeFile',
            fileName: 'direction.ts',
            languageId: 'typescript',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols, `Expected symbols to be non-null`);
        assertLength(symbols);
        assert.ok(symbols.every(symbol => [namingConvention_1.NamingConvention.Uppercase, namingConvention_1.NamingConvention.ScreamingSnakeCase].includes((0, namingConvention_1.guessNamingConvention)(symbol.newSymbolName))), 'Expected all symbols to be SCREAMING_SNAKE_CASE or UPPERCASE');
    });
    (0, stest_1.stest)('rename a function call - definition in same file', async (testingServiceCollection) => {
        const fileContents = ((0, outdent_1.outdent) `
			export function f(n: number): number {
				if (n <= 1) {
					return 1;
				}
				return f(n - 1) + f(n - 2);
			}

			const result = <<f>>(10);
		`);
        const file = {
            kind: 'relativeFile',
            fileName: 'script.ts',
            languageId: 'typescript',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols && symbols.length > 1, 'Expected to provide > 1 symbols');
        assertIncludesLowercased(symbols, ['fib', 'sequence']);
    });
    (0, stest_1.stest)('rename a function call - definition in different file', async (testingServiceCollection) => {
        const currentFile = {
            kind: 'relativeFile',
            fileName: 'script.ts',
            languageId: 'typescript',
            fileContents: (0, outdent_1.outdent) `
				import { f } from './impl';

				const result = <<f>>(10);
			`,
            isCurrent: true,
        };
        const fileWithFnDef = {
            kind: 'relativeFile',
            fileName: 'impl.ts',
            languageId: 'typescript',
            fileContents: (0, outdent_1.outdent) `
				export function f(n: number): number {
					if (n <= 1) {
						return 1;
					}
					return f(n - 1) + f(n - 2);
				}
			`,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [currentFile, fileWithFnDef]);
        assert.ok(symbols && symbols.length > 1, 'Expected to provide > 1 symbols');
        assertIncludesLowercased(symbols, ['fib', 'sequence']);
    });
    (0, stest_1.stest)('rename type definition', async (testingServiceCollection) => {
        const fileContents = ((0, outdent_1.outdent) `
			type <<t>> = {
				firstName: string;
				lastName: string;
			}
		`);
        const file = {
            kind: 'relativeFile',
            fileName: 'script.ts',
            languageId: 'typescript',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols && symbols.length > 1, 'Expected to provide > 1 symbols');
        assert.ok(symbols.some(s => s.newSymbolName.toLowerCase().includes('person')), 'Inludes person');
    });
    (0, stest_1.stest)('rename type definition when it is used in the same file', async (testingServiceCollection) => {
        const fileContents = ((0, outdent_1.outdent) `
			type <<t>> = {
				firstName: string;
				lastName: string;
			}

			function greet(p: t): string {
				return 'Hello ' + p.firstName + ' ' + p.lastName;
			}
		`);
        const file = {
            kind: 'relativeFile',
            fileName: 'script.ts',
            languageId: 'typescript',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols && symbols.length > 1, 'Expected to provide > 1 symbols');
        assert.ok(symbols.some(s => s.newSymbolName.toLowerCase().includes('person')), 'Inludes person');
    });
    (0, stest_1.stest)('rename type reference - same file', async (testingServiceCollection) => {
        const fileContents = ((0, outdent_1.outdent) `
			type t = {
				firstName: string;
				lastName: string;
			}

			function greet(p: <<t>>): string {
				return 'Hello ' + p.firstName + ' ' + p.lastName;
			}
		`);
        const file = {
            kind: 'relativeFile',
            fileName: 'script.ts',
            languageId: 'typescript',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols && symbols.length > 1, 'Expected to provide > 1 symbols');
        assert.ok(symbols.some(s => s.newSymbolName.toLowerCase().includes('person')), 'Includes person');
    });
    (0, stest_1.stest)('rename type reference - same file with 2 possible defs', async (testingServiceCollection) => {
        const fileContents = ((0, outdent_1.outdent) `
			type t = {
				firstName: string;
				lastName: string;
			}

			const t = {
				bar: 1
			}

			function greet(p: <<t>>): string {
				return 'Hello ' + p.firstName + ' ' + p.lastName;
			}
		`);
        const file = {
            kind: 'relativeFile',
            fileName: 'script.ts',
            languageId: 'typescript',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols && symbols.length > 1, 'Expected to provide > 1 symbols');
        assert.ok(symbols.some(s => s.newSymbolName.toLowerCase().includes('person')), 'Includes person');
    });
    (0, stest_1.stest)('rename class - same file', async (testingServiceCollection) => {
        const fileContents = (0, outdent_1.outdent) `
			class <<P>> {
				firstName: string;
				lastName: string;
			}
		`;
        const file = {
            kind: 'relativeFile',
            fileName: 'script.ts',
            languageId: 'typescript',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols && symbols.length > 1, 'Expected to provide > 1 symbols');
        assert.ok(symbols.some(s => s.newSymbolName.toLowerCase().includes('person')), 'Inludes person');
    });
    (0, stest_1.stest)('rename class reference - same file', async (testingServiceCollection) => {
        const fileContents = (0, outdent_1.outdent) `
			class P {
				firstName: string;
				lastName: string;
			}

			function greet(p: <<P>>): string {
				return 'Hello ' + p.firstName + ' ' + p.lastName;
			}
		`;
        const file = {
            kind: 'relativeFile',
            fileName: 'script.ts',
            languageId: 'typescript',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols && symbols.length > 1, 'Expected to provide > 1 symbols');
        assert.ok(symbols.some(s => s.newSymbolName.toLowerCase().includes('person')), 'Inludes person');
    });
    (0, stest_1.stest)('rename method with field-awareness', async (testingServiceCollection) => {
        const fileContents = (0, outdent_1.outdent) `
			class Processor {
				private stdoutBuffer: string = '';

				<<clearBuffer>>() {
					// TODO: implement
				}
			}
		`;
        const file = {
            kind: 'relativeFile',
            fileName: 'script.ts',
            languageId: 'typescript',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols && symbols.length > 1, 'Expected to provide > 1 symbols');
        assert.ok(symbols.some(s => s.newSymbolName.toLowerCase().includes('stdout')), 'Knows about `stdoutBuffer`');
    });
    (0, stest_1.stest)('non-tree-sitter language', async (testingServiceCollection) => {
        const fileContents = (0, outdent_1.outdent) `
			let rec <<f>> n = if n <= 1 then 1 else f (n - 1) + f (n - 2)
		`;
        const file = {
            kind: 'relativeFile',
            fileName: 'impl.ml',
            languageId: 'ocaml',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols && symbols.length > 1, 'Expected to provide > 1 symbols');
        assert.ok(symbols.some(s => s.newSymbolName.toLowerCase().includes('fib')), 'Includes fib');
    });
    (0, stest_1.stest)('rename class name - CSS', async (testingServiceCollection) => {
        const fileContents = (0, outdent_1.outdent) `
			.box {
				background-color: #fff;
			}

			<<.button>> {
				color: #fff;
				background-color: #000;
			}
		`;
        const file = {
            kind: 'relativeFile',
            fileName: 'style.css',
            languageId: 'css',
            fileContents,
            isCurrent: true,
        };
        const symbols = await provideNewSymbolNames(testingServiceCollection, [file]);
        assert.ok(symbols && symbols.length > 1, 'Expected to provide > 1 symbols');
        assert.ok(symbols.every(s => s.newSymbolName.match(/^\.([a-zA-Z]+)/)), 'All symbols are class names');
    });
});
//# sourceMappingURL=renameSuggestionsProvider.stest.js.map