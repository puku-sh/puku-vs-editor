"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logComments = logComments;
const assert_1 = __importDefault(require("assert"));
const path_1 = __importDefault(require("path"));
const feedbackGenerator_1 = require("../../src/extension/prompt/node/feedbackGenerator");
const textDocumentSnapshot_1 = require("../../src/platform/editing/common/textDocumentSnapshot");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../src/vscodeTypes");
const stest_1 = require("../base/stest");
const inlineChatSimulator_1 = require("../simulation/inlineChatSimulator");
const stestUtil_1 = require("../simulation/stestUtil");
const models = ["gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */];
(0, stest_1.ssuite)({ title: '/review', location: 'inline' }, (0, stestUtil_1.forEachModel)(models, model => {
    (0, stest_1.stest)({ description: 'Binary search with incorrect stop condition', language: 'javascript', model }, async (testingServiceCollection) => {
        const comments = await generateComments(testingServiceCollection, 'review/binary-search-1.js');
        const expectedLine = 4;
        const expectedContent = 'left <= right';
        const expectedMinRelevance = 10;
        const expectedKind = 'bug';
        assertComment(comments, expectedLine, expectedContent, expectedMinRelevance, expectedKind);
    });
    (0, stest_1.stest)({ description: 'Binary search with correct stop condition', language: 'javascript', model }, async (testingServiceCollection) => {
        const comments = await generateComments(testingServiceCollection, 'review/binary-search-2.js');
        assertNoHighPriorityCommentOrBug(comments);
    });
    (0, stest_1.stest)({ description: 'Bank account with missing lock acquisition', language: 'python', model }, async (testingServiceCollection) => {
        const comments = await generateComments(testingServiceCollection, 'review/bank-account-1.py');
        const expectedLines = [15, 16, 18, 19];
        const expectedContent = 'lock';
        const expectedMinRelevance = 5;
        const expectedKinds = ['bug', 'consistency'];
        assertComment(comments, expectedLines, expectedContent, expectedMinRelevance, expectedKinds);
    });
    (0, stest_1.stest)({ description: 'Bank account with lock acquisition', language: 'python', model }, async (testingServiceCollection) => {
        const comments = await generateComments(testingServiceCollection, 'review/bank-account-2.py');
        const unexpected = comments.filter(c => ['bug', 'consistency'].includes(c.kind) && (typeof c.body === 'string' ? c.body : c.body.value).indexOf('lock') !== -1);
        assert_1.default.strictEqual(unexpected.length, 0);
    });
    (0, stest_1.stest)({ description: 'InstantiationService this scoping bug', language: 'typescript', model }, async (testingServiceCollection) => {
        const comments = await generateComments(testingServiceCollection, 'review/nested-services-1.ts');
        const expectedLine = 9;
        const expectedContent = 'this._parent._children.delete';
        const expectedMinRelevance = 5;
        const expectedKind = 'bug';
        assertComment(comments, expectedLine, expectedContent, expectedMinRelevance, expectedKind);
    });
    (0, stest_1.stest)({ description: 'InstantiationService this scoping fixed', language: 'typescript', model }, async (testingServiceCollection) => {
        const comments = await generateComments(testingServiceCollection, 'review/nested-services-2.ts');
        const unexpected = comments.filter(c => c.kind === 'bug' && c.range.start.line === 10);
        assert_1.default.strictEqual(unexpected.length, 0);
    });
}));
async function generateComments(testingServiceCollection, relativeFixturePath) {
    const workspace = (0, inlineChatSimulator_1.setupSimulationWorkspace)(testingServiceCollection, { files: [(0, stestUtil_1.fromFixture)(relativeFixturePath)] });
    const accessor = testingServiceCollection.createTestingAccessor();
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    const source = new vscodeTypes_1.CancellationTokenSource();
    try {
        const relativeDocumentPath = path_1.default.basename(relativeFixturePath);
        const document = textDocumentSnapshot_1.TextDocumentSnapshot.create(workspace.getDocument(relativeDocumentPath).document);
        const feedbackGenerator = instantiationService.createInstance(feedbackGenerator_1.FeedbackGenerator);
        const result = await feedbackGenerator.generateComments([
            {
                document,
                relativeDocumentPath,
                selection: new vscodeTypes_1.Range(0, 0, document.lineCount, 0),
            }
        ], source.token);
        return result.type === 'success' ? result.comments : [];
    }
    finally {
        source.dispose();
        await (0, inlineChatSimulator_1.teardownSimulationWorkspace)(accessor, workspace);
    }
}
function assertComment(comments, expectedLines, expectedContent, expectedMinRelevance, expectedKind) {
    const lines = Array.isArray(expectedLines) ? expectedLines : [expectedLines];
    const lineComment = comments?.find(d => lines.indexOf(d.range.start.line) !== -1);
    assert_1.default.ok(lineComment, `Expected comment for line(s) ${lines.join(', ')}.`);
    const message = typeof lineComment.body === 'string' ? lineComment.body : lineComment.body.value;
    assert_1.default.ok(message.includes(expectedContent), `Expected comment for line(s) ${lines.join(', ')} to contain "${expectedContent}"`);
    // assert.ok(typeof lineComment.relevance === 'number' && lineComment.relevance >= expectedMinRelevance, `Expected comment to have relevance >= ${expectedMinRelevance}, was: ${lineComment.relevance}`);
    const kinds = Array.isArray(expectedKind) ? expectedKind : [expectedKind];
    assert_1.default.ok(kinds.indexOf(lineComment.kind) !== -1, `Expected ${kinds.join(', ')} comment, was: ${lineComment.kind}`);
}
function assertNoHighPriorityCommentOrBug(comments) {
    // const highPriority = comments.filter(d => d.relevance === 10);
    // assert.strictEqual(highPriority.length, 0, `Expected no high priority comment`);
    const bugs = comments.filter(d => d.kind === 'bug');
    assert_1.default.strictEqual(bugs.length, 0, `Expected no bug comment`);
}
function logComments(comments) {
    console.log(JSON.stringify(comments.map(c => ({
        line: c.range.start.line,
        content: typeof c.body === 'string' ? c.body : c.body.value,
        severity: c.severity,
        kind: c.kind
    })), null, 2));
}
//# sourceMappingURL=review.stest.js.map