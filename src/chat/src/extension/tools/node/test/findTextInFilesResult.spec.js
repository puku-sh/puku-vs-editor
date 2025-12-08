"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vitest_1 = require("vitest");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const uri_1 = require("../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
const services_1 = require("../../../test/node/services");
const findTextInFilesTool_1 = require("../findTextInFilesTool");
(0, vitest_1.suite)('FindTextInFilesResult', () => {
    let services;
    (0, vitest_1.beforeAll)(() => {
        services = (0, services_1.createExtensionUnitTestingServices)().createTestingAccessor();
    });
    (0, vitest_1.afterAll)(() => {
        services.dispose();
    });
    async function toString(results) {
        const clz = class extends prompt_tsx_1.PromptElement {
            render() {
                return vscpp(prompt_tsx_1.UserMessage, null,
                    vscpp(findTextInFilesTool_1.FindTextInFilesResult, { textResults: results, maxResults: 20 }));
            }
        };
        const endpoint = await services.get(endpointProvider_1.IEndpointProvider).getChatEndpoint('gpt-4.1');
        const renderer = promptRenderer_1.PromptRenderer.create(services.get(instantiation_1.IInstantiationService), endpoint, clz, {});
        const r = await renderer.render();
        return r.messages
            .map(m => m.content
            .map(c => c.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text ? c.text : JSON.stringify(c)).join('')).join('\n').replace(/\\+/g, '/');
    }
    (0, vitest_1.test)('returns simple single line matches', async () => {
        (0, vitest_1.expect)(await toString([
            {
                lineNumber: 5,
                previewText: 'Line before\nThis is a test\nLine after',
                ranges: [
                    {
                        previewRange: new vscodeTypes_1.Range(1, 5, 1, 7),
                        sourceRange: new vscodeTypes_1.Range(5, 5, 5, 7),
                    }
                ],
                uri: uri_1.URI.file('/file.txt'),
            }
        ])).toMatchInlineSnapshot(`
			"1 match
			<match path="/file.txt" line=6>
			Line before
			This is a test
			Line after
			</match>
			"
		`);
    });
    (0, vitest_1.test)('elides long single line content before match', async () => {
        (0, vitest_1.expect)(await toString([
            {
                lineNumber: 5,
                previewText: `Line ${'before'.repeat(1000)}\nThis is a test\nLine after`,
                ranges: [
                    {
                        previewRange: new vscodeTypes_1.Range(1, 5, 1, 7),
                        sourceRange: new vscodeTypes_1.Range(5, 5, 5, 7),
                    }
                ],
                uri: uri_1.URI.file('/file.txt'),
            }
        ])).toMatchInlineSnapshot(`
			"1 match
			<match path="/file.txt" line=6>
			...rebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebeforebefore
			This is a test
			Line after
			</match>
			"
		`);
    });
    (0, vitest_1.test)('elides long single line content after match', async () => {
        (0, vitest_1.expect)(await toString([
            {
                lineNumber: 5,
                previewText: `Line before\nThis is a test\nLine ${'after'.repeat(1000)}`,
                ranges: [{
                        previewRange: new vscodeTypes_1.Range(1, 5, 1, 7),
                        sourceRange: new vscodeTypes_1.Range(5, 5, 5, 7),
                    }],
                uri: uri_1.URI.file('/file.txt'),
            }
        ])).toMatchInlineSnapshot(`
			"1 match
			<match path="/file.txt" line=6>
			Line before
			This is a test
			Line afterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafterafteraf...
			</match>
			"
		`);
    });
    (0, vitest_1.test)('adjusts line number if prefix text is omitted', async () => {
        const prefix = ('Line before'.repeat(25) + '\n').repeat(3);
        (0, vitest_1.expect)(await toString([
            {
                lineNumber: 5,
                previewText: `${prefix}This is a test\nLine after`,
                ranges: [{
                        previewRange: new vscodeTypes_1.Range(3, 5, 3, 7),
                        sourceRange: new vscodeTypes_1.Range(5, 5, 5, 7),
                    }],
                uri: uri_1.URI.file('/file.txt'),
            }
        ])).toMatchInlineSnapshot(`
			"1 match
			<match path="/file.txt" line=6>
			...ne beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine before
			Line beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine beforeLine before
			This is a test
			Line after
			</match>
			"
		`);
    });
    (0, vitest_1.test)('elides text on the same line as the match', async () => {
        (0, vitest_1.expect)(await toString([
            {
                lineNumber: 5,
                previewText: `${'x'.repeat(1000)}This is a test${'y'.repeat(1000)}`,
                ranges: [{
                        previewRange: new vscodeTypes_1.Range(5, 1000 + 5, 5, 1000 + 7),
                        sourceRange: new vscodeTypes_1.Range(5, 1000 + 5, 5, 1000 + 7),
                    }],
                uri: uri_1.URI.file('/file.txt'),
            }
        ])).toMatchInlineSnapshot(`
			"1 match
			<match path="/file.txt" line=6>
			...xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxThis is a testyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy...
			</match>
			"
		`);
    });
});
//# sourceMappingURL=findTextInFilesResult.spec.js.map