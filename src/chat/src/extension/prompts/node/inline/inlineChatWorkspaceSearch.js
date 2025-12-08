"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlineChatWorkspaceSearch = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const telemetryCorrelationId_1 = require("../../../../util/common/telemetryCorrelationId");
const workspaceContext_1 = require("../panel/workspace/workspaceContext");
class InlineChatWorkspaceSearch extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const { useWorkspaceChunksFromSelection, useWorkspaceChunksFromDiagnostics } = this.props;
        if (!useWorkspaceChunksFromSelection && !useWorkspaceChunksFromDiagnostics) {
            return null;
        }
        let tokenBudget = sizing.tokenBudget;
        if (useWorkspaceChunksFromSelection && useWorkspaceChunksFromDiagnostics) {
            tokenBudget = tokenBudget / 2;
        }
        return (vscpp(vscppf, null,
            useWorkspaceChunksFromSelection &&
                vscpp(workspaceContext_1.WorkspaceChunks, { ...this.getChunkSearchPropsForSelection() }),
            useWorkspaceChunksFromDiagnostics &&
                vscpp(workspaceContext_1.WorkspaceChunks, { ...this.getChunkSearchPropsForDiagnostics(tokenBudget) })));
    }
    getChunkSearchPropsForSelection() {
        const { document, wholeRange } = this.props.documentContext;
        let range = document.validateRange(wholeRange);
        this.props.diagnostics.forEach(d => {
            range = range.union(d.range);
        });
        const selectedText = document.getText(range);
        const query = [
            `Please find code that is similar to the following code block:\n`,
            '```',
            selectedText,
            '```'
        ].join('\n');
        return {
            telemetryInfo: new telemetryCorrelationId_1.TelemetryCorrelationId('InlineChatWorkspaceSearch::getChunkSearchPropsForSelection'),
            query: {
                rawQuery: query,
                resolveQueryAndKeywords: async () => ({
                    rephrasedQuery: query,
                    keywords: getKeywordsForContent(selectedText),
                }),
                resolveQuery: async () => query,
            },
            // do not return matches in the current file
            globPatterns: { exclude: [document.uri.fsPath] }, // TODO: use relativePattern once supported
            maxResults: 3,
        };
    }
    getChunkSearchPropsForDiagnostics(tokenBudget) {
        const document = this.props.documentContext.document;
        const messages = this.props.diagnostics.map(d => d.message).join(' ');
        const query = `Please find code that can help me fix the following problems: ${messages}`;
        return {
            telemetryInfo: new telemetryCorrelationId_1.TelemetryCorrelationId('InlineChatWorkspaceSearch::getChunkSearchPropsForDiagnostics'),
            query: {
                rawQuery: query,
                resolveQueryAndKeywords: async () => ({
                    rephrasedQuery: query,
                    keywords: getKeywordsForContent(messages),
                }),
                resolveQuery: async () => query,
            },
            // do not return matches in the current file
            globPatterns: { exclude: [document.uri.fsPath] },
            maxResults: 3,
        };
    }
}
exports.InlineChatWorkspaceSearch = InlineChatWorkspaceSearch;
function getKeywordsForContent(text) {
    // extract all identifiers in the selected text
    const identifiers = new Set();
    for (const match of text.matchAll(/(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g)) {
        identifiers.add(match[0]);
    }
    return Array.from(identifiers.values(), k => ({ keyword: k, variations: [] }));
}
//# sourceMappingURL=inlineChatWorkspaceSearch.js.map