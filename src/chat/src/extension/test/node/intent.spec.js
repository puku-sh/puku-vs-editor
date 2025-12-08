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
const vitest_1 = require("vitest");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const mockEndpoint_1 = require("../../../platform/endpoint/test/node/mockEndpoint");
const chatResponseStreamImpl_1 = require("../../../util/common/chatResponseStreamImpl");
const textDocument_1 = require("../../../util/common/test/shims/textDocument");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const chatVariablesCollection_1 = require("../../prompt/common/chatVariablesCollection");
const conversation_1 = require("../../prompt/common/conversation");
const intents_1 = require("../../prompt/node/intents");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const inlineChatEditCodePrompt_1 = require("../../prompts/node/inline/inlineChatEditCodePrompt");
const services_1 = require("./services");
(0, vitest_1.suite)('Intent Streaming', function () {
    let accessor;
    (0, vitest_1.beforeEach)(function () {
        accessor = (0, services_1.createExtensionUnitTestingServices)().createTestingAccessor();
    });
    vitest_1.test.skip('[Bug] Stream processing may never terminate if model responds with something other than an edit #2080', async function () {
        const data = (0, textDocument_1.createTextDocumentData)(uri_1.URI.from({ scheme: 'test', path: '/path/file.txt' }), 'Hello', 'fooLang');
        const doc = textDocumentSnapshot_1.TextDocumentSnapshot.create(data.document);
        const context = {
            document: doc,
            language: { languageId: doc.languageId, lineComment: { start: '//' } },
            fileIndentInfo: undefined,
            wholeRange: new vscodeTypes_1.Range(0, 0, 1, 0),
            selection: new vscodeTypes_1.Selection(0, 0, 0, 0),
        };
        const endpoint = accessor.get(instantiation_1.IInstantiationService).createInstance(mockEndpoint_1.MockEndpoint, undefined);
        const progressReporter = { report() { } };
        const renderer = promptRenderer_1.PromptRenderer.create(accessor.get(instantiation_1.IInstantiationService), endpoint, inlineChatEditCodePrompt_1.InlineChatEditCodePrompt, {
            documentContext: context,
            promptContext: {
                query: 'hello',
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([]),
                history: [],
            }
        });
        const result = await renderer.render(progressReporter, cancellation_1.CancellationToken.None);
        const replyInterpreter = result.metadata.get(intents_1.ReplyInterpreterMetaData).replyInterpreter;
        const stream = new chatResponseStreamImpl_1.ChatResponseStreamImpl((value) => {
            if (value instanceof vscodeTypes_1.ChatResponseTextEditPart) {
                values.push(...value.edits);
            }
        }, () => { });
        const values = [];
        const part = {
            delta: {
                text: 'What can be done'
            }
        };
        const context2 = {
            addAnnotations: function (annotations) {
                // nothing
            },
            storeInInlineSession: function (store) {
                // nothing
            },
            chatSessionId: '',
            turn: null,
            messages: []
        };
        await replyInterpreter.processResponse(context2, async_1.AsyncIterableObject.fromArray([part]), stream, cancellation_1.CancellationToken.None);
        assert_1.default.strictEqual(values.length, 0);
    });
});
(0, vitest_1.suite)('Reference Processing', function () {
    (0, vitest_1.test)('combines adjacent lines and full file overlap', async () => {
        const uri1 = vscodeTypes_1.Uri.file('1.txt');
        const uri2 = vscodeTypes_1.Uri.file('2.txt');
        const uri3 = vscodeTypes_1.Uri.file('3.txt');
        const references = [
            new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(0, 0, 2, 0),
            }), new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(3, 0, 4, 0),
            }), new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(5, 0, 7, 0),
            }), new conversation_1.PromptReference({
                uri: uri2,
                range: new vscodeTypes_1.Range(0, 0, 4, 0),
            }), new conversation_1.PromptReference(uri3),
            new conversation_1.PromptReference({
                uri: uri3,
                range: new vscodeTypes_1.Range(0, 0, 4, 0),
            })
        ];
        const result = (0, conversation_1.getUniqueReferences)(references);
        assert_1.default.deepEqual(result, [
            new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(0, 0, 7, 0),
            }), new conversation_1.PromptReference({
                uri: uri2,
                range: new vscodeTypes_1.Range(0, 0, 4, 0),
            }), new conversation_1.PromptReference(uri3)
        ]);
    });
    (0, vitest_1.test)('combines overlaping ranges', async () => {
        const uri1 = vscodeTypes_1.Uri.file('1.txt');
        const uri2 = vscodeTypes_1.Uri.file('2.txt');
        const references = [
            new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(0, 0, 2, 0),
            }), new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(5, 0, 10, 0),
            }), new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(3, 0, 6, 0),
            }), new conversation_1.PromptReference({
                uri: uri2,
                range: new vscodeTypes_1.Range(1, 0, 4, 0),
            }), new conversation_1.PromptReference({
                uri: uri2,
                range: new vscodeTypes_1.Range(0, 0, 5, 0),
            })
        ];
        const result = (0, conversation_1.getUniqueReferences)(references);
        assert_1.default.deepEqual(result, [
            new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(0, 0, 10, 0),
            }), new conversation_1.PromptReference({
                uri: uri2,
                range: new vscodeTypes_1.Range(0, 0, 5, 0),
            })
        ]);
    });
    (0, vitest_1.test)('removes duplicates', async () => {
        const uri1 = vscodeTypes_1.Uri.file('1.txt');
        const uri2 = vscodeTypes_1.Uri.file('2.txt');
        const references = [
            new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(3, 0, 4, 0),
            }), new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(3, 0, 4, 0),
            }), new conversation_1.PromptReference({
                uri: uri2,
                range: new vscodeTypes_1.Range(3, 0, 4, 0),
            }), new conversation_1.PromptReference({
                uri: uri2,
                range: new vscodeTypes_1.Range(3, 0, 4, 0),
            })
        ];
        const result = (0, conversation_1.getUniqueReferences)(references);
        assert_1.default.deepEqual(result, [
            new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(3, 0, 4, 0),
            }), new conversation_1.PromptReference({
                uri: uri2,
                range: new vscodeTypes_1.Range(3, 0, 4, 0),
            }),
        ]);
    });
    (0, vitest_1.test)('leaves distinct ranges alone, but sorts them', async () => {
        const uri1 = vscodeTypes_1.Uri.file('1.txt');
        const uri2 = vscodeTypes_1.Uri.file('2.txt');
        const references = [
            new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(7, 0, 10, 0),
            }),
            new conversation_1.PromptReference({
                uri: uri2,
                range: new vscodeTypes_1.Range(4, 0, 5, 0),
            }),
            new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(0, 0, 2, 0),
            }), new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(4, 0, 5, 0),
            }),
        ];
        const result = (0, conversation_1.getUniqueReferences)(references);
        assert_1.default.deepEqual(result, [
            new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(0, 0, 2, 0),
            }), new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(4, 0, 5, 0),
            }),
            new conversation_1.PromptReference({
                uri: uri1,
                range: new vscodeTypes_1.Range(7, 0, 10, 0),
            }),
            new conversation_1.PromptReference({
                uri: uri2,
                range: new vscodeTypes_1.Range(4, 0, 5, 0),
            }),
        ]);
    });
});
//# sourceMappingURL=intent.spec.js.map