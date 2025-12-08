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
const feedbackGenerator_1 = require("../feedbackGenerator");
(0, vitest_1.suite)('Review Tests', function () {
    (0, vitest_1.test)('Correctly parses reply', function () {
        const fileContents = `1. Line 33 in \`requestLoggerImpl.ts\`, readability, low severity: The lambda function used in \`onDidChange\` could be extracted into a named function for better readability and reusability.
   \`\`\`typescript
   this._register(workspace.registerTextDocumentContentProvider(ChatRequestScheme.chatRequestScheme, {
       onDidChange: Event.map(this.onDidChangeRequests, this._mapToLatestUri),
       provideTextDocumentContent: (uri) => {
           const uriData = ChatRequestScheme.parseUri(uri.toString());
           if (!uriData) { return \`Invalid URI: \${uri}\`; }

           const entry = uriData.kind === 'latest' ? this._entries[this._entries.length - 1] : this._entries.find(e => e.id === uriData.id);
           if (!entry) { return \`Request not found\`; }

           if (entry.kind === LoggedInfoKind.Element) { return entry.html; }

           return this._renderEntryToMarkdown(entry.id, entry.entry);
       }
   }));

   private _mapToLatestUri = () => Uri.parse(ChatRequestScheme.buildUri({ kind: 'latest' }));
   \`\`\``;
        const matches = (0, feedbackGenerator_1.parseFeedbackResponse)(fileContents);
        assert_1.default.strictEqual(matches.length, 1);
        assert_1.default.strictEqual(matches[0].from, 32);
        assert_1.default.strictEqual(matches[0].content.indexOf('```'), -1);
    });
});
//# sourceMappingURL=feedbackGenerator.spec.js.map