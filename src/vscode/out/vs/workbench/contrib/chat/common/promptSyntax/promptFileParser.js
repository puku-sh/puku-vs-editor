/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Iterable } from '../../../../../base/common/iterator.js';
import { dirname, joinPath } from '../../../../../base/common/resources.js';
import { splitLinesIncludeSeparators } from '../../../../../base/common/strings.js';
import { URI } from '../../../../../base/common/uri.js';
import { parse } from '../../../../../base/common/yaml.js';
import { Range } from '../../../../../editor/common/core/range.js';
export class PromptFileParser {
    constructor() {
    }
    parse(uri, content) {
        const linesWithEOL = splitLinesIncludeSeparators(content);
        if (linesWithEOL.length === 0) {
            return new ParsedPromptFile(uri, undefined, undefined);
        }
        let header = undefined;
        let body = undefined;
        let bodyStartLine = 0;
        if (linesWithEOL[0].match(/^---[\s\r\n]*$/)) {
            let headerEndLine = linesWithEOL.findIndex((line, index) => index > 0 && line.match(/^---[\s\r\n]*$/));
            if (headerEndLine === -1) {
                headerEndLine = linesWithEOL.length;
                bodyStartLine = linesWithEOL.length;
            }
            else {
                bodyStartLine = headerEndLine + 1;
            }
            // range starts on the line after the ---, and ends at the beginning of the line that has the closing ---
            const range = new Range(2, 1, headerEndLine + 1, 1);
            header = new PromptHeader(range, linesWithEOL);
        }
        if (bodyStartLine < linesWithEOL.length) {
            // range starts  on the line after the ---, and ends at the beginning of line after the last line
            const range = new Range(bodyStartLine + 1, 1, linesWithEOL.length + 1, 1);
            body = new PromptBody(range, linesWithEOL, uri);
        }
        return new ParsedPromptFile(uri, header, body);
    }
}
export class ParsedPromptFile {
    constructor(uri, header, body) {
        this.uri = uri;
        this.header = header;
        this.body = body;
    }
}
export var PromptHeaderAttributes;
(function (PromptHeaderAttributes) {
    PromptHeaderAttributes.name = 'name';
    PromptHeaderAttributes.description = 'description';
    PromptHeaderAttributes.agent = 'agent';
    PromptHeaderAttributes.mode = 'mode';
    PromptHeaderAttributes.model = 'model';
    PromptHeaderAttributes.applyTo = 'applyTo';
    PromptHeaderAttributes.tools = 'tools';
    PromptHeaderAttributes.handOffs = 'handoffs';
    PromptHeaderAttributes.advancedOptions = 'advancedOptions';
    PromptHeaderAttributes.argumentHint = 'argument-hint';
    PromptHeaderAttributes.excludeAgent = 'excludeAgent';
    PromptHeaderAttributes.target = 'target';
})(PromptHeaderAttributes || (PromptHeaderAttributes = {}));
export var GithubPromptHeaderAttributes;
(function (GithubPromptHeaderAttributes) {
    GithubPromptHeaderAttributes.mcpServers = 'mcp-servers';
})(GithubPromptHeaderAttributes || (GithubPromptHeaderAttributes = {}));
export var Target;
(function (Target) {
    Target["VSCode"] = "vscode";
    Target["GitHubCopilot"] = "github-copilot";
})(Target || (Target = {}));
export class PromptHeader {
    constructor(range, linesWithEOL) {
        this.range = range;
        this.linesWithEOL = linesWithEOL;
    }
    get _parsedHeader() {
        if (this._parsed === undefined) {
            const yamlErrors = [];
            const lines = this.linesWithEOL.slice(this.range.startLineNumber - 1, this.range.endLineNumber - 1).join('');
            const node = parse(lines, yamlErrors);
            const attributes = [];
            const errors = yamlErrors.map(err => ({ message: err.message, range: this.asRange(err), code: err.code }));
            if (node) {
                if (node.type !== 'object') {
                    errors.push({ message: 'Invalid header, expecting <key: value> pairs', range: this.range, code: 'INVALID_YAML' });
                }
                else {
                    for (const property of node.properties) {
                        attributes.push({
                            key: property.key.value,
                            range: this.asRange({ start: property.key.start, end: property.value.end }),
                            value: this.asValue(property.value)
                        });
                    }
                }
            }
            this._parsed = { node, attributes, errors };
        }
        return this._parsed;
    }
    asRange({ start, end }) {
        return new Range(this.range.startLineNumber + start.line, start.character + 1, this.range.startLineNumber + end.line, end.character + 1);
    }
    asValue(node) {
        switch (node.type) {
            case 'string':
                return { type: 'string', value: node.value, range: this.asRange(node) };
            case 'number':
                return { type: 'number', value: node.value, range: this.asRange(node) };
            case 'boolean':
                return { type: 'boolean', value: node.value, range: this.asRange(node) };
            case 'null':
                return { type: 'null', value: node.value, range: this.asRange(node) };
            case 'array':
                return { type: 'array', items: node.items.map(item => this.asValue(item)), range: this.asRange(node) };
            case 'object': {
                const properties = node.properties.map(property => ({ key: this.asValue(property.key), value: this.asValue(property.value) }));
                return { type: 'object', properties, range: this.asRange(node) };
            }
        }
    }
    get attributes() {
        return this._parsedHeader.attributes;
    }
    getAttribute(key) {
        return this._parsedHeader.attributes.find(attr => attr.key === key);
    }
    get errors() {
        return this._parsedHeader.errors;
    }
    getStringAttribute(key) {
        const attribute = this._parsedHeader.attributes.find(attr => attr.key === key);
        if (attribute?.value.type === 'string') {
            return attribute.value.value;
        }
        return undefined;
    }
    get name() {
        return this.getStringAttribute(PromptHeaderAttributes.name);
    }
    get description() {
        return this.getStringAttribute(PromptHeaderAttributes.description);
    }
    get agent() {
        return this.getStringAttribute(PromptHeaderAttributes.agent) ?? this.getStringAttribute(PromptHeaderAttributes.mode);
    }
    get model() {
        return this.getStringAttribute(PromptHeaderAttributes.model);
    }
    get applyTo() {
        return this.getStringAttribute(PromptHeaderAttributes.applyTo);
    }
    get argumentHint() {
        return this.getStringAttribute(PromptHeaderAttributes.argumentHint);
    }
    get target() {
        return this.getStringAttribute(PromptHeaderAttributes.target);
    }
    get tools() {
        const toolsAttribute = this._parsedHeader.attributes.find(attr => attr.key === PromptHeaderAttributes.tools);
        if (!toolsAttribute) {
            return undefined;
        }
        if (toolsAttribute.value.type === 'array') {
            const tools = [];
            for (const item of toolsAttribute.value.items) {
                if (item.type === 'string' && item.value) {
                    tools.push(item.value);
                }
            }
            return tools;
        }
        else if (toolsAttribute.value.type === 'object') {
            const tools = [];
            const collectLeafs = ({ key, value }) => {
                if (value.type === 'boolean') {
                    tools.push(key.value);
                }
                else if (value.type === 'object') {
                    value.properties.forEach(collectLeafs);
                }
            };
            toolsAttribute.value.properties.forEach(collectLeafs);
            return tools;
        }
        return undefined;
    }
    get handOffs() {
        const handoffsAttribute = this._parsedHeader.attributes.find(attr => attr.key === PromptHeaderAttributes.handOffs);
        if (!handoffsAttribute) {
            return undefined;
        }
        if (handoffsAttribute.value.type === 'array') {
            // Array format: list of objects: { agent, label, prompt, send? }
            const handoffs = [];
            for (const item of handoffsAttribute.value.items) {
                if (item.type === 'object') {
                    let agent;
                    let label;
                    let prompt;
                    let send;
                    for (const prop of item.properties) {
                        if (prop.key.value === 'agent' && prop.value.type === 'string') {
                            agent = prop.value.value;
                        }
                        else if (prop.key.value === 'label' && prop.value.type === 'string') {
                            label = prop.value.value;
                        }
                        else if (prop.key.value === 'prompt' && prop.value.type === 'string') {
                            prompt = prop.value.value;
                        }
                        else if (prop.key.value === 'send' && prop.value.type === 'boolean') {
                            send = prop.value.value;
                        }
                    }
                    if (agent && label && prompt !== undefined) {
                        handoffs.push({ agent, label, prompt, send });
                    }
                }
            }
            return handoffs;
        }
        return undefined;
    }
}
export class PromptBody {
    constructor(range, linesWithEOL, uri) {
        this.range = range;
        this.linesWithEOL = linesWithEOL;
        this.uri = uri;
    }
    get fileReferences() {
        return this.getParsedBody().fileReferences;
    }
    get variableReferences() {
        return this.getParsedBody().variableReferences;
    }
    get offset() {
        return this.getParsedBody().bodyOffset;
    }
    getParsedBody() {
        if (this._parsed === undefined) {
            const markdownLinkRanges = [];
            const fileReferences = [];
            const variableReferences = [];
            const bodyOffset = Iterable.reduce(Iterable.slice(this.linesWithEOL, 0, this.range.startLineNumber - 1), (len, line) => line.length + len, 0);
            for (let i = this.range.startLineNumber - 1, lineStartOffset = bodyOffset; i < this.range.endLineNumber - 1; i++) {
                const line = this.linesWithEOL[i];
                // Match markdown links: [text](link)
                const linkMatch = line.matchAll(/\[(.*?)\]\((.+?)\)/g);
                for (const match of linkMatch) {
                    const linkEndOffset = match.index + match[0].length - 1; // before the parenthesis
                    const linkStartOffset = match.index + match[0].length - match[2].length - 1;
                    const range = new Range(i + 1, linkStartOffset + 1, i + 1, linkEndOffset + 1);
                    fileReferences.push({ content: match[2], range, isMarkdownLink: true });
                    markdownLinkRanges.push(new Range(i + 1, match.index + 1, i + 1, match.index + match[0].length + 1));
                }
                // Match #file:<filePath> and #tool:<toolName>
                // Regarding the <toolName> pattern below, see also the variableReg regex in chatRequestParser.ts.
                const reg = /#file:(?<filePath>[^\s#]+)|#tool:(?<toolName>[\w_\-\.\/]+)/gi;
                const matches = line.matchAll(reg);
                for (const match of matches) {
                    const fullMatch = match[0];
                    const fullRange = new Range(i + 1, match.index + 1, i + 1, match.index + fullMatch.length + 1);
                    if (markdownLinkRanges.some(mdRange => Range.areIntersectingOrTouching(mdRange, fullRange))) {
                        continue;
                    }
                    const contentMatch = match.groups?.['filePath'] || match.groups?.['toolName'];
                    if (!contentMatch) {
                        continue;
                    }
                    const startOffset = match.index + fullMatch.length - contentMatch.length;
                    const endOffset = match.index + fullMatch.length;
                    const range = new Range(i + 1, startOffset + 1, i + 1, endOffset + 1);
                    if (match.groups?.['filePath']) {
                        fileReferences.push({ content: match.groups?.['filePath'], range, isMarkdownLink: false });
                    }
                    else if (match.groups?.['toolName']) {
                        variableReferences.push({ name: match.groups?.['toolName'], range, offset: lineStartOffset + match.index });
                    }
                }
                lineStartOffset += line.length;
            }
            this._parsed = { fileReferences: fileReferences.sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range)), variableReferences, bodyOffset };
        }
        return this._parsed;
    }
    getContent() {
        return this.linesWithEOL.slice(this.range.startLineNumber - 1, this.range.endLineNumber - 1).join('');
    }
    resolveFilePath(path) {
        try {
            if (path.startsWith('/')) {
                return this.uri.with({ path });
            }
            else if (path.match(/^[a-zA-Z]+:\//)) {
                return URI.parse(path);
            }
            else {
                const dirName = dirname(this.uri);
                return joinPath(dirName, path);
            }
        }
        catch {
            return undefined;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wcm9tcHRGaWxlUGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFzRCxNQUFNLG9DQUFvQyxDQUFDO0FBQy9HLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUVuRSxNQUFNLE9BQU8sZ0JBQWdCO0lBQzVCO0lBQ0EsQ0FBQztJQUVNLEtBQUssQ0FBQyxHQUFRLEVBQUUsT0FBZTtRQUNyQyxNQUFNLFlBQVksR0FBRywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDL0IsT0FBTyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUNELElBQUksTUFBTSxHQUE2QixTQUFTLENBQUM7UUFDakQsSUFBSSxJQUFJLEdBQTJCLFNBQVMsQ0FBQztRQUM3QyxJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFn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