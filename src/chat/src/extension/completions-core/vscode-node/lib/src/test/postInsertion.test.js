"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sinon_1 = __importDefault(require("sinon"));
const citationManager_1 = require("../citationManager");
const ghostText_1 = require("../ghostText/ghostText");
const postInsertion_1 = require("../postInsertion");
const telemetry_1 = require("../telemetry");
const textDocumentManager_1 = require("../textDocumentManager");
const promiseQueue_1 = require("../util/promiseQueue");
const context_1 = require("./context");
const fetcher_1 = require("./fetcher");
suite('postInsertionTasks', function () {
    let accessor;
    let handleIPCodeCitation;
    let docMgr;
    let doc;
    const uri = 'file:///hello.js';
    const pos = { line: 1, character: 0 };
    const completionText = 'console.log("Hello, world!")';
    let completion;
    setup(function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
        const citationManager = accessor.get(citationManager_1.ICompletionsCitationManager);
        handleIPCodeCitation = sinon_1.default.spy(citationManager, 'handleIPCodeCitation');
        docMgr = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        doc = docMgr.setTextDocument(uri, 'javascript', 'function main() {\n\n\n}');
        completion = {
            uuid: '1234-5678-9abc',
            insertText: completionText,
            range: { start: pos, end: pos },
            uri: doc.uri,
            telemetry: telemetry_1.TelemetryWithExp.createEmptyConfigForTesting(),
            displayText: 'console.log("Hello, world!")',
            position: pos,
            offset: doc.offsetAt(pos),
            index: 0,
            resultType: ghostText_1.ResultType.Network,
            clientCompletionId: '1234-5678-9abc',
        };
    });
    test('invokes CitationManager when code references are present in the completion', async function () {
        completion.copilotAnnotations = (0, fetcher_1.fakeCodeReference)(0, completionText.length);
        const citations = completion.copilotAnnotations.ip_code_citations[0].details.citations;
        docMgr.updateTextDocument(doc.uri, `function main() {\n${completionText}\n\n}`);
        (0, postInsertion_1.postInsertionTasks)(accessor, 'ghostText', completionText, completion.offset, doc.uri, completion.telemetry, { compType: 'full', acceptedLength: completionText.length, acceptedLines: 0 }, completion.copilotAnnotations);
        const promiseQueue = accessor.get(promiseQueue_1.ICompletionsPromiseQueueService);
        await promiseQueue.flush();
        sinon_1.default.assert.calledOnceWithExactly(handleIPCodeCitation, {
            inDocumentUri: doc.uri,
            offsetStart: completion.offset,
            offsetEnd: completion.offset + completionText.length,
            version: doc.version + 1,
            location: { start: pos, end: { line: pos.line, character: completionText.length } },
            matchingText: completionText,
            details: citations,
        });
    });
    test('adjusts code reference offsets for partial acceptance', async function () {
        completion.copilotAnnotations = (0, fetcher_1.fakeCodeReference)(0, completionText.length);
        const citations = completion.copilotAnnotations.ip_code_citations[0].details.citations;
        const partial = completionText.slice(0, 11);
        docMgr.updateTextDocument(doc.uri, `function main() {\n${partial}\n\n}`);
        (0, postInsertion_1.postInsertionTasks)(accessor, 'ghostText', completionText, completion.offset, doc.uri, completion.telemetry, { compType: 'partial', acceptedLength: partial.length, acceptedLines: 0 }, completion.copilotAnnotations);
        const promiseQueue = accessor.get(promiseQueue_1.ICompletionsPromiseQueueService);
        await promiseQueue.flush();
        sinon_1.default.assert.calledOnceWithExactly(handleIPCodeCitation, {
            inDocumentUri: doc.uri,
            offsetStart: completion.offset,
            offsetEnd: completion.offset + partial.length,
            version: doc.version + 1,
            location: { start: pos, end: { line: pos.line, character: partial.length } },
            matchingText: partial,
            details: citations,
        });
    });
    test('does not invoke CitationManager when partially accepted completion excludes matched code', async function () {
        completion.copilotAnnotations = (0, fetcher_1.fakeCodeReference)(12, 14); // "Hello, world!"
        const partial = completionText.slice(0, 11);
        docMgr.updateTextDocument(doc.uri, `function main() {\n${partial}\n\n}`);
        (0, postInsertion_1.postInsertionTasks)(accessor, 'ghostText', completionText, completion.offset, doc.uri, completion.telemetry, { compType: 'partial', acceptedLength: partial.length, acceptedLines: 0 }, completion.copilotAnnotations);
        const promiseQueue = accessor.get(promiseQueue_1.ICompletionsPromiseQueueService);
        await promiseQueue.flush();
        sinon_1.default.assert.notCalled(handleIPCodeCitation);
    });
    test('adjusts code reference range when additional document edits have been made since completion insertion', async function () {
        completion.copilotAnnotations = (0, fetcher_1.fakeCodeReference)(0, completionText.length);
        const citations = completion.copilotAnnotations.ip_code_citations[0].details.citations;
        // when we'd like the editor to notify us of acceptance:
        // docMgr.updateTextDocument(doc.uri, `function main() {\n${completionText}\n\n}`);
        // when it might:
        docMgr.updateTextDocument(doc.uri, `function main() {\n    ${completionText};\n\n}`);
        (0, postInsertion_1.postInsertionTasks)(accessor, 'ghostText', completionText, completion.offset, doc.uri, completion.telemetry, { compType: 'full', acceptedLength: completionText.length, acceptedLines: 3 }, completion.copilotAnnotations);
        const promiseQueue = accessor.get(promiseQueue_1.ICompletionsPromiseQueueService);
        await promiseQueue.flush();
        sinon_1.default.assert.calledOnceWithExactly(handleIPCodeCitation, {
            inDocumentUri: doc.uri,
            offsetStart: completion.offset + 4,
            offsetEnd: completion.offset + 4 + completionText.length,
            version: doc.version + 1,
            location: {
                start: { line: pos.line, character: 4 },
                end: { line: pos.line, character: 4 + completionText.length },
            },
            matchingText: completionText,
            details: citations,
        });
    });
});
//# sourceMappingURL=postInsertion.test.js.map