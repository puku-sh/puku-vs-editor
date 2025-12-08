"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseReplay = parseReplay;
function isValidPrompt(prompt) {
    return 'prompt' in prompt && 'logs' in prompt && Array.isArray(prompt.logs);
}
function parseReplay(content) {
    const parsed = JSON.parse(content);
    const prompts = (parsed.prompts && Array.isArray(parsed.prompts) ? parsed.prompts : [parsed]);
    const validPrompts = prompts.filter(isValidPrompt);
    if (validPrompts.length !== prompts.length) {
        console.warn(`Found invalid prompt(s) in replay content. Skipping invalid prompts.`);
    }
    const steps = [];
    for (const prompt of validPrompts) {
        parsePrompt(prompt, steps);
    }
    let stepIx = 0;
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (stepIx < steps.length) {
            const step = steps[stepIx];
            if (step.kind === 'userQuery') {
                // Re-encode the query to match JSON representation in the file and remove surrounding quotes
                const encodedQuery = JSON.stringify(step.query).slice(1, -1);
                if (line.indexOf(`"prompt": "${encodedQuery}`) !== -1) {
                    step.line = index + 1;
                    stepIx++;
                }
            }
            else {
                if (line.indexOf(`"id": "${step.id}"`) !== -1) {
                    step.line = index + 1;
                    stepIx++;
                }
            }
        }
    });
    return steps;
}
function parsePrompt(prompt, steps) {
    steps.push({
        kind: 'userQuery',
        query: prompt.prompt,
        line: 0,
    });
    for (const log of prompt.logs) {
        if (log.kind === 'toolCall') {
            steps.push({
                kind: 'toolCall',
                id: log.id,
                line: 0,
                toolName: log.tool,
                args: JSON.parse(log.args),
                edits: log.edits,
                results: Array.isArray(log.response) ? log.response : log.response.message
            });
        }
        else if (log.kind === 'request') {
            steps.push({
                kind: 'request',
                id: log.id,
                line: 0,
                prompt: log.messages,
                result: Array.isArray(log.response) ? log.response.join('\n') : log.response.message.join('\n')
            });
        }
    }
    return steps;
}
//# sourceMappingURL=replayParser.js.map