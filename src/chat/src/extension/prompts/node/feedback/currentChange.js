"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CurrentChange_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentChange = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const textDocumentSnapshot_1 = require("../../../../platform/editing/common/textDocumentSnapshot");
const gitExtensionService_1 = require("../../../../platform/git/common/gitExtensionService");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const tag_1 = require("../base/tag");
const safeElements_1 = require("../panel/safeElements");
const symbolAtCursor_1 = require("../panel/symbolAtCursor");
let CurrentChange = CurrentChange_1 = class CurrentChange extends prompt_tsx_1.PromptElement {
    constructor(props, parserService, ignoreService) {
        super(props);
        this.parserService = parserService;
        this.ignoreService = ignoreService;
    }
    async prepare(sizing) {
        const allowed = [];
        for (const input of this.props.input) {
            if (!await this.ignoreService.isCopilotIgnored(input.document.uri)) {
                allowed.push(input);
            }
        }
        const texts = await Promise.all(allowed.map(async (input) => {
            const { document, change, selection } = input;
            let textAll;
            if (change?.hunks.length) {
                const first = change.hunks[0];
                textAll = [
                    first.range.start.line > 0 ? CurrentChange_1.enumeratedLines(document, 0, first.range.start.line) : '',
                    ...change.hunks.map((hunk, i, a) => {
                        const nextHunkLine = i + 1 < a.length ? a[i + 1].range.start.line : document.lineCount;
                        return [
                            CurrentChange_1.enumeratedChangeLines(hunk.text, hunk.range.start.line), '\n',
                            hunk.range.end.line < nextHunkLine ? CurrentChange_1.enumeratedLines(document, hunk.range.end.line, nextHunkLine) : '',
                        ];
                    }).flat(),
                ].join('');
            }
            else if (selection) {
                const selectionEndLine = selection.end.line + (selection.end.character > 0 ? 1 : 0); // Being line-based.
                textAll = CurrentChange_1.enumeratedSelectedLines(document, 0, document.lineCount, selection.start.line, selectionEndLine);
            }
            else {
                textAll = CurrentChange_1.enumeratedLines(document, 0, document.lineCount);
            }
            return {
                input,
                hunks: [{
                        range: new vscodeTypes_1.Range(0, 0, input.document.lineCount, 0),
                        text: textAll,
                    }],
                tokens: await sizing.countTokens(textAll),
            };
        }));
        let currentTokens = texts.reduce((acc, { tokens }) => acc + tokens, 0);
        this.props.logService.info(`[CurrentChange] Full documents: ${currentTokens} tokens, ${sizing.tokenBudget} budget`);
        if (currentTokens <= sizing.tokenBudget) {
            return {
                input: texts.map(({ input, hunks }) => ({
                    input,
                    hunks,
                }))
            };
        }
        const sorted = texts.slice().sort((a, b) => b.tokens - a.tokens);
        for (const text of sorted) {
            const { input, tokens } = text;
            const { document, change, selection } = input;
            if (change?.hunks.length) {
                const definitionHunks = [];
                let definitionTokens = 0;
                for (const hunk of change.hunks) {
                    const definition = await symbolAtCursor_1.SymbolAtCursor.getDefinitionAtRange(this.ignoreService, this.parserService, document, hunk.range, false);
                    if (definition) {
                        const definitionEndLine = definition.range.end.line + (definition.range.end.character > 0 ? 1 : 0); // Being line-based.
                        const hunkEndLine = hunk.range.end.line + (hunk.range.end.character > 0 ? 1 : 0); // Being line-based.
                        const textDefinition = [
                            hunk.range.start.line > definition.range.start.line ? CurrentChange_1.enumeratedLines(document, definition.range.start.line, hunk.range.start.line) : '',
                            CurrentChange_1.enumeratedChangeLines(hunk.text, hunk.range.start.line), '\n',
                            definitionEndLine > hunkEndLine ? CurrentChange_1.enumeratedLines(document, hunkEndLine, definitionEndLine) : '',
                        ].join('');
                        definitionHunks.push({
                            range: new vscodeTypes_1.Range(Math.min(hunk.range.start.line, definition.range.start.line), 0, Math.max(definitionEndLine, hunkEndLine), 0),
                            text: textDefinition,
                        });
                        definitionTokens += await sizing.countTokens(textDefinition);
                    }
                    else {
                        const hunkText = CurrentChange_1.enumeratedChangeLines(hunk.text, hunk.range.start.line);
                        const hunkEndLine = hunk.range.end.line + (hunk.range.end.character > 0 ? 1 : 0); // Being line-based.
                        definitionHunks.push({
                            range: new vscodeTypes_1.Range(hunk.range.start.line, 0, hunkEndLine, 0),
                            text: hunkText,
                        });
                        definitionTokens += await sizing.countTokens(hunkText);
                    }
                }
                text.hunks = definitionHunks;
                text.tokens = definitionTokens;
                currentTokens += text.tokens - tokens;
            }
            else if (selection) {
                const definition = await symbolAtCursor_1.SymbolAtCursor.getDefinitionAtRange(this.ignoreService, this.parserService, document, selection, false);
                if (definition) {
                    const definitionEndLine = definition.range.end.line + (definition.range.end.character > 0 ? 1 : 0); // Being line-based.
                    const selectionEndLine = selection.end.line + (selection.end.character > 0 ? 1 : 0); // Being line-based.
                    const textDefinition = CurrentChange_1.enumeratedSelectedLines(document, definition.range.start.line, definitionEndLine, selection.start.line, selectionEndLine);
                    const textDefinitionTokens = await sizing.countTokens(textDefinition);
                    text.hunks = [{
                            range: definition.range,
                            text: textDefinition,
                        }];
                    text.tokens = textDefinitionTokens;
                    currentTokens += text.tokens - tokens;
                }
                else {
                    const selectionEndLine = selection.end.line + (selection.end.character > 0 ? 1 : 0); // Being line-based.
                    const hunkText = CurrentChange_1.enumeratedSelectedLines(document, selection.start.line, selectionEndLine, selection.start.line, selectionEndLine);
                    text.hunks = [{
                            range: new vscodeTypes_1.Range(selection.start.line, 0, selectionEndLine, 0),
                            text: hunkText,
                        }];
                    text.tokens = await sizing.countTokens(hunkText);
                    currentTokens += text.tokens - tokens;
                }
            }
            else {
                text.hunks = [];
                text.tokens = 0;
                currentTokens += text.tokens - tokens;
            }
            this.props.logService.info(`[CurrentChange] Reduced ${input.relativeDocumentPath} to defintions: ${currentTokens} tokens, ${sizing.tokenBudget} budget`);
            if (currentTokens <= sizing.tokenBudget) {
                return {
                    input: texts.map(({ input, hunks }) => ({
                        input,
                        hunks,
                    }))
                };
            }
        }
        this.props.logService.info(`[CurrentChange] Still too large: ${currentTokens} tokens, ${sizing.tokenBudget} budget, ${texts.length} inputs`);
        if (texts.length > 1) {
            const err = new Error('Split prompt.');
            err.code = 'split_input';
            throw err;
        }
        return {
            input: texts.map(({ input, hunks }) => ({
                input,
                hunks,
            }))
        };
    }
    render(state, sizing) {
        const input = state.input.filter(i => i.hunks.length > 0);
        if (!input.length) {
            return;
        }
        return (vscpp(vscppf, null,
            vscpp(tag_1.Tag, { name: 'currentChange', priority: this.props.priority }, input.map(input => (vscpp(vscppf, null,
                input.input.change ? vscpp(vscppf, null,
                    "Change at cursor:",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Each line is annotated with the line number in the file.",
                    vscpp("br", null)) : vscpp(vscppf, null,
                    "Current selection with the selected lines labeled as such:",
                    vscpp("br", null)),
                vscpp("br", null),
                "From the file: ",
                input.input.relativeDocumentPath,
                vscpp("br", null),
                input.hunks.map(hunk => (vscpp(safeElements_1.CodeBlock, { references: [new prompt_tsx_1.PromptReference(new vscodeTypes_1.Location(input.input.document.uri, hunk.range))], uri: input.input.document.uri, code: hunk.text, languageId: `${input.input.document.languageId}/${input.input.relativeDocumentPath}: FROM_LINE: ${hunk.range.start.line + 1} - TO_LINE: ${hunk.range.end.line}` }))),
                vscpp("br", null),
                vscpp("br", null)))))));
    }
    static async getCurrentChanges(gitExtensionService, group) {
        const git = gitExtensionService.getExtensionApi();
        if (!git) {
            return [];
        }
        const changes = await Promise.all(git.repositories.map(async (repository) => {
            const stats = await (group === 'index' ? repository.diffIndexWithHEAD() :
                group === 'workingTree' ? repository.diffWithHEAD() :
                    repository.diffWith('HEAD'));
            const changes = await Promise.all(stats.map(async (change) => {
                const text = await (group === 'index' ? repository.diffIndexWithHEAD(change.uri.fsPath) : repository.diffWithHEAD(change.uri.fsPath));
                return {
                    repository,
                    uri: change.uri,
                    hunks: CurrentChange_1.parseDiff(text)
                        .map(hunk => CurrentChange_1.gitHunkToHunk(hunk))
                };
            }));
            return changes;
        }));
        return changes.flat();
    }
    static async getCurrentChange(accessor, _document, cursor) {
        const document = textDocumentSnapshot_1.TextDocumentSnapshot.create(_document);
        const gitExtensionService = accessor.get(gitExtensionService_1.IGitExtensionService);
        const git = gitExtensionService.getExtensionApi();
        if (!git) {
            return;
        }
        const repository = git.getRepository(document.uri);
        if (!repository) {
            return;
        }
        const diff = await repository.diffWithHEAD(document.uri.fsPath);
        if (!diff) {
            return;
        }
        const hunks = CurrentChange_1.parseDiff(diff);
        const overlappingHunk = hunks.find(hunk => {
            return hunk.additions.some(addition => {
                const start = addition.start - 1;
                const end = start + addition.length - 1;
                return cursor.line >= start && cursor.line <= end;
            });
        });
        if (!overlappingHunk) {
            return;
        }
        return {
            repository,
            uri: document.uri,
            hunks: [CurrentChange_1.gitHunkToHunk(overlappingHunk)]
        };
    }
    static async getChanges(gitExtensionService, repositoryUri, uri, diff) {
        const git = gitExtensionService.getExtensionApi();
        if (!git) {
            return;
        }
        const hunks = CurrentChange_1.parseDiff(diff);
        const repository = git.repositories.find(r => r.rootUri.toString().toLowerCase() === repositoryUri.toString().toLowerCase());
        if (!repository) {
            return;
        }
        return {
            repository,
            uri,
            hunks: hunks.map(hunk => CurrentChange_1.gitHunkToHunk(hunk))
        };
    }
    static gitHunkToHunk(hunk) {
        const range = new vscodeTypes_1.Range(hunk.startAddedLine - 1, 0, hunk.startAddedLine - 1 + hunk.addedLines, 0);
        return {
            range,
            text: hunk.diffText,
        };
    }
    static parseDiff(diff) {
        const hunkTexts = diff.split('\n@@');
        if (hunkTexts.length && hunkTexts[hunkTexts.length - 1].endsWith('\n')) {
            hunkTexts[hunkTexts.length - 1] = hunkTexts[hunkTexts.length - 1].slice(0, -1);
        }
        const hunks = hunkTexts.map(chunk => {
            const rangeMatch = chunk.match(/-(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))?/);
            if (rangeMatch) {
                let startDeletedLine = parseInt(rangeMatch[1]);
                const deletedLines = rangeMatch[2] ? parseInt(rangeMatch[2]) : 1;
                let startAddedLine = parseInt(rangeMatch[3]);
                const addedLines = rangeMatch[4] ? parseInt(rangeMatch[4]) : 1;
                const additions = [];
                const lines = chunk.split('\n')
                    .slice(1);
                let d = 0;
                let addStart;
                for (const line of lines) {
                    const ch = line.charAt(0);
                    if (ch === '+') {
                        if (addStart === undefined) {
                            addStart = startAddedLine + d;
                        }
                        d++;
                    }
                    else {
                        if (addStart !== undefined) {
                            additions.push({ start: addStart, length: startAddedLine + d - addStart });
                            addStart = undefined;
                        }
                        if (ch === ' ') {
                            d++;
                        }
                    }
                }
                if (addStart !== undefined) {
                    additions.push({ start: addStart, length: startAddedLine + d - addStart });
                    addStart = undefined;
                }
                if (startDeletedLine === 0) {
                    startDeletedLine = 1; // when deletedLines is 0?
                }
                if (startAddedLine === 0) {
                    startAddedLine = 1; // when addedLines is 0?
                }
                return {
                    startDeletedLine, // 1-based
                    deletedLines,
                    startAddedLine, // 1-based
                    addedLines,
                    additions,
                    diffText: lines.join('\n'),
                };
            }
            return null;
        }).filter(Boolean);
        return hunks;
    }
    static enumeratedLines(document, startLine, endLine) {
        const text = document.getText(new vscodeTypes_1.Range(startLine, 0, endLine, 0));
        const lines = text.split('\n');
        const code = lines
            .map((line, i) => i === endLine - startLine ? line : `/* Line ${startLine + i + 1} */${line}`)
            .join('\n');
        return code;
    }
    static enumeratedSelectedLines(document, startLine, endLine, startSelectionLine, endSelectionLine) {
        const text = document.getText(new vscodeTypes_1.Range(startLine, 0, endLine, 0));
        const lines = text.split('\n');
        const code = lines
            .map((line, i) => {
            if (i === endLine - startLine) {
                return line;
            }
            const currentLine = startLine + i;
            return `/* ${startSelectionLine <= currentLine && currentLine < endSelectionLine ? 'Selected ' : ''}Line ${currentLine + 1} */${line}`;
        })
            .join('\n');
        return code;
    }
    static enumeratedChangeLines(text, startLine) {
        let removedLines = 0;
        const code = text.split('\n')
            .filter(line => line[0] !== '-') // TODO: Try with removed lines included.
            .map((line, i) => {
            const changeChar = line[0];
            const removal = changeChar === '-';
            if (removal) {
                removedLines++;
            }
            const addition = changeChar === '+';
            return `/* ${removal ? 'Removed Line' : `${addition ? 'Changed ' : ''}Line ${startLine + i - removedLines + 1}`} */${line.substring(1)}`;
        })
            .join('\n');
        return code;
    }
};
exports.CurrentChange = CurrentChange;
exports.CurrentChange = CurrentChange = CurrentChange_1 = __decorate([
    __param(1, parserService_1.IParserService),
    __param(2, ignoreService_1.IIgnoreService)
], CurrentChange);
//# sourceMappingURL=currentChange.js.map