"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertContextItems = assertContextItems;
exports.computeContext = computeContext;
exports.create = create;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const api_1 = require("../../common/api");
const contextProvider_1 = require("../../common/contextProvider");
const protocol_1 = require("../../common/protocol");
const typescripts_1 = require("../../common/typescripts");
const host_1 = require("../host");
const languageServices_1 = require("./languageServices");
function normalize(value) {
    return value.trim().replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\t+/g, ' ').replace(/\s+/g, ' ');
}
const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?(?:\+([\w.-]+))?$|^(\d+)\.(\d+)$|^(\d+)$/;
function assertCodeSnippet(actual, expected) {
    assert_1.default.strictEqual(actual.kind, expected.kind);
    assert_1.default.ok(actual.kind === protocol_1.ContextKind.Snippet, `Expected snippet, got ${actual.kind}`);
    assert_1.default.ok(expected.kind === protocol_1.ContextKind.Snippet, `Expected snippet, got ${expected.kind}`);
    assert_1.default.strictEqual(normalize(actual.value), normalize(expected.value));
    const source = actual.fileName;
    assert_1.default.ok(source.match(expected.fileName) !== null);
}
function assertTrait(actual, expected) {
    assert_1.default.strictEqual(actual.kind, expected.kind);
    assert_1.default.ok(actual.kind === protocol_1.ContextKind.Trait, `Expected trait, got ${actual.kind}`);
    assert_1.default.ok(expected.kind === protocol_1.ContextKind.Trait, `Expected trait, got ${expected.kind}`);
    assert_1.default.strictEqual(actual.name, expected.name);
    if (actual.name.startsWith('The TypeScript version used in this project is')) {
        assert_1.default.ok(semverRegex.test(actual.value), `Expected semver, got ${actual.value}`);
    }
    else {
        assert_1.default.strictEqual(actual.value, expected.value);
    }
}
function assertContextItems(actual, expected, mode = 'equals') {
    const actualSnippets = [];
    const actualTraits = [];
    for (const item of actual) {
        if (item.kind === protocol_1.ContextKind.Snippet) {
            actualSnippets.push(item);
        }
        else if (item.kind === protocol_1.ContextKind.Trait) {
            actualTraits.push(item);
        }
    }
    actualSnippets.sort((a, b) => {
        return a.priority < b.priority ? 1 : a.priority > b.priority ? -1 : 0;
    });
    const expectedSnippets = [];
    const expectedTraits = new Map();
    for (const item of expected) {
        if (item.kind === protocol_1.ContextKind.Snippet) {
            expectedSnippets.push(item);
        }
        else if (item.kind === protocol_1.ContextKind.Trait) {
            expectedTraits.set(item.name, item);
        }
    }
    if (mode === 'equals') {
        assert_1.default.strictEqual(actualSnippets.length, expectedSnippets.length);
        for (let i = 0; i < actualSnippets.length; i++) {
            assertCodeSnippet(actualSnippets[i], expectedSnippets[i]);
        }
        assert_1.default.strictEqual(actualTraits.length, expectedTraits.size);
    }
    else {
        assert_1.default.ok(actualSnippets.length >= expectedSnippets.length, `Expected ${expectedSnippets.length} snippets, got ${actualSnippets.length}`);
        const actualSnippetMap = new Map();
        for (const actualSnippet of actualSnippets) {
            actualSnippetMap.set(normalize(actualSnippet.value), actualSnippet);
        }
        for (const expectedSnippet of expectedSnippets) {
            const actualSnippet = actualSnippetMap.get(normalize(expectedSnippet.value));
            assert_1.default.ok(actualSnippet !== undefined, `Missing expected snippet ${expectedSnippet.value}`);
            assertCodeSnippet(actualSnippet, expectedSnippet);
        }
    }
    for (const actualTrait of actualTraits) {
        const expectedTrait = expectedTraits.get(actualTrait.name);
        assert_1.default.ok(expectedTrait !== undefined, `Missing expected trait ${actualTrait.name}`);
        expectedTraits.delete(actualTrait.name);
        assertTrait(actualTrait, expectedTrait);
    }
    assert_1.default.strictEqual(expectedTraits.size, 0);
}
function computeContext(session, document, position, contextKind) {
    const result = new contextProvider_1.ContextResult(new contextProvider_1.CharacterBudget(7 * 1024 * 4), new contextProvider_1.CharacterBudget(8 * 1024 * 4), new contextProvider_1.RequestContext(session.session, [], new Map(), true));
    const program = session.service.getProgram();
    if (program === undefined) {
        return [];
    }
    const sourceFile = program.getSourceFile(document);
    if (sourceFile === undefined) {
        return [];
    }
    const pos = sourceFile.getPositionOfLineAndCharacter(position.line, position.character);
    (0, api_1.computeContext)(result, session.session, session.service, document, pos, new typescripts_1.NullCancellationToken());
    return result.items().filter((item) => item.kind === contextKind);
}
class LanguageServiceTestSession extends contextProvider_1.SingleLanguageServiceSession {
    constructor(service, host) {
        super(service, host);
    }
    enableBlueprintSearch() {
        return true;
    }
}
function create(fileOrDirectory) {
    const service = languageServices_1.LanguageServices.createLanguageService(fileOrDirectory);
    const session = new LanguageServiceTestSession(service, new host_1.NodeHost());
    return { service, session };
}
//# sourceMappingURL=testing.js.map