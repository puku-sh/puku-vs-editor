"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const languageToolsProvider_1 = require("../../src/extension/onboardDebug/node/languageToolsProvider");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const stest_1 = require("../base/stest");
// Use to print the model's suggested tool list for all languages.
// Set to true and run with: npm run simulate -- --grep "print all languages" -n=1
const PRINT_LANGUAGE_TOOLS = false;
(0, stest_1.ssuite)({ title: 'Debug tools list', location: 'context' }, () => {
    async function score(testingServiceCollection, languages, expected) {
        const accessor = testingServiceCollection.createTestingAccessor();
        const tools = accessor.get(instantiation_1.IInstantiationService).createInstance(languageToolsProvider_1.LanguageToolsProvider);
        const result = await tools.getToolsForLanguages(languages, cancellation_1.CancellationToken.None);
        if (!result.ok) {
            throw new Error('Expected tools to be found');
        }
        let found = 0;
        for (const tool of expected) {
            if (result.commands.includes(tool)) {
                found++;
            }
        }
        accessor.get(stest_1.ISimulationTestRuntime).setExplicitScore(found / expected.length);
    }
    (0, stest_1.stest)({ description: 'javascript' }, async (testingServiceCollection) => {
        await score(testingServiceCollection, ['javascript'], ['npm', 'node', 'npx', 'mocha']);
    });
    (0, stest_1.stest)({ description: 'c' }, async (testingServiceCollection) => {
        await score(testingServiceCollection, ['c'], ['gcc', 'clang', 'make', 'cmake', 'gdb']);
    });
    (0, stest_1.stest)({ description: 'python' }, async (testingServiceCollection) => {
        await score(testingServiceCollection, ['python'], ['python', 'pip', 'pytest', 'tox']);
    });
    (0, stest_1.stest)({ description: 'typescript' }, async (testingServiceCollection) => {
        await score(testingServiceCollection, ['javascript'], ['npm', 'node', 'npx', 'mocha']);
    });
    (0, stest_1.stest)({ description: 'ruby' }, async (testingServiceCollection) => {
        await score(testingServiceCollection, ['ruby'], ['ruby', 'cucumber', 'rake', 'irb']);
    });
    (0, stest_1.stest)({ description: 'csharp' }, async (testingServiceCollection) => {
        await score(testingServiceCollection, ['csharp'], ['dotnet', 'msbuild', 'xunit', 'vstest']);
    });
    (0, stest_1.stest)({ description: 'elixir' }, async (testingServiceCollection) => {
        await score(testingServiceCollection, ['elixir'], ['mix', 'iex']);
    });
    (0, stest_1.stest)({ description: 'lua' }, async (testingServiceCollection) => {
        await score(testingServiceCollection, ['lua'], ['lua', 'busted']);
    });
    (0, stest_1.stest)({ description: 'go' }, async (testingServiceCollection) => {
        // it's a short list, because everything in Go is invoked with `go`.
        // Amusingly the model sometimes just lists "go" 10 times.
        await score(testingServiceCollection, ['go'], ['go']);
    });
    if (PRINT_LANGUAGE_TOOLS) {
        (0, stest_1.stest)({ description: 'print all languages' }, async (testingServiceCollection) => {
            const accessor = testingServiceCollection.createTestingAccessor();
            const tools = accessor.get(instantiation_1.IInstantiationService).createInstance(languageToolsProvider_1.LanguageToolsProvider);
            const allTools = new Set();
            const allLanguageIds = new Set([
                ...baseLanguageIds,
                ...additionalLanguageIds,
                ...omittedLanguages,
            ]);
            for (const language of allLanguageIds) {
                if (omittedLanguages.includes(language)) {
                    continue;
                }
                console.log('Getting tools for', language);
                const result = await tools.getToolsForLanguages([language], cancellation_1.CancellationToken.None);
                if (!result.ok) {
                    throw new Error('Expected tools to be found');
                }
                for (const tool of result.commands) {
                    allTools.add(tool);
                }
            }
            console.log(`const KNOWN_DEBUGGABLE_LANGUAGES = ${JSON.stringify([...allLanguageIds].sort())};`);
            console.log(`const KNOWN_DEBUGGABLE_COMMANDS = ${JSON.stringify([...allTools].sort())};`);
        });
    }
});
// Some additional languages popular in the 2024 SO developer survey
const additionalLanguageIds = [
    "dart",
    "zig",
    "kotlin",
    "matlab",
];
// Languages we don't want to bother getting tools for. These are text
// languages, markup languages that aren't specific to any one set of tools,
// or duplicates (e.g. vue and vue-html).
const omittedLanguages = [
    'bat',
    'bibtex',
    'code-refactoring',
    'coffeescript',
    'css',
    'diff',
    'dockercompose',
    'dockerfile',
    'git-commit',
    'git-rebase',
    'github-issues',
    'graphql',
    'haml',
    'handlebars',
    'html',
    'ini',
    'jade',
    'json',
    'jsonc',
    'less',
    'log',
    'pip-requirements',
    'plaintext',
    'pug',
    'razor',
    'scss',
    'shellscript',
    'slim',
    'snippets',
    'stylus',
    'tex',
    'text',
    'toml',
    'vue-html',
    'xml',
    'xsl',
    'yaml',
];
// Base language list seeded from https://code.visualstudio.com/docs/languages/identifiers#_known-language-identifiers
const baseLanguageIds = [
    "abap",
    "bat",
    "bibtex",
    "clojure",
    "coffeescript",
    "c",
    "cpp",
    "csharp",
    "dockercompose",
    "css",
    "cuda-cpp",
    "d",
    "pascal",
    "diff",
    "dockerfile",
    "erlang",
    "fsharp",
    "git-commit",
    "git-rebase",
    "go",
    "groovy",
    "handlebars",
    "haml",
    "haskell",
    "html",
    "ini",
    "java",
    "javascript",
    "javascriptreact",
    "json",
    "jsonc",
    "julia",
    "latex",
    "less",
    "lua",
    "makefile",
    "markdown",
    "objective-c",
    "objective-cpp",
    "ocaml",
    "pascal",
    "perl",
    "perl6",
    "php",
    "plaintext",
    "powershell",
    "jade",
    "pug",
    "python",
    "r",
    "razor",
    "ruby",
    "rust",
    "scss",
    "sass",
    "shaderlab",
    "shellscript",
    "slim",
    "sql",
    "stylus",
    "svelte",
    "swift",
    "typescript",
    "typescriptreact",
    "tex",
    "vb",
    "vue",
    "vue-html",
    "xml",
    "xsl",
    "yaml"
];
//# sourceMappingURL=debugTools.stest.js.map