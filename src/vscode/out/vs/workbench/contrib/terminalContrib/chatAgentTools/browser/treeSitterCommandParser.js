/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { BugIndicatingError, ErrorNoTelemetry } from '../../../../../base/common/errors.js';
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable, MutableDisposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ITreeSitterLibraryService } from '../../../../../editor/common/services/treeSitter/treeSitterLibraryService.js';
export var TreeSitterCommandParserLanguage;
(function (TreeSitterCommandParserLanguage) {
    TreeSitterCommandParserLanguage["Bash"] = "bash";
    TreeSitterCommandParserLanguage["PowerShell"] = "powershell";
})(TreeSitterCommandParserLanguage || (TreeSitterCommandParserLanguage = {}));
let TreeSitterCommandParser = class TreeSitterCommandParser extends Disposable {
    constructor(_treeSitterLibraryService) {
        super();
        this._treeSitterLibraryService = _treeSitterLibraryService;
        this._treeCache = this._register(new TreeCache());
        this._parser = new Lazy(() => this._treeSitterLibraryService.getParserClass().then(ParserCtor => new ParserCtor()));
    }
    async extractSubCommands(languageId, commandLine) {
        const captures = await this._queryTree(languageId, commandLine, '(command) @command');
        return captures.map(e => e.node.text);
    }
    async extractPwshDoubleAmpersandChainOperators(commandLine) {
        const captures = await this._queryTree("powershell" /* TreeSitterCommandParserLanguage.PowerShell */, commandLine, [
            '(',
            '  (pipeline',
            '    (pipeline_chain_tail) @double.ampersand)',
            ')',
        ].join('\n'));
        return captures;
    }
    async getFileWrites(languageId, commandLine) {
        let query;
        switch (languageId) {
            case "bash" /* TreeSitterCommandParserLanguage.Bash */:
                query = [
                    '(file_redirect',
                    '  destination: [(word) (string (string_content)) (raw_string) (concatenation)] @file)',
                ].join('\n');
                break;
            case "powershell" /* TreeSitterCommandParserLanguage.PowerShell */:
                query = [
                    '(redirection',
                    '  (redirected_file_name) @file)',
                ].join('\n');
                break;
        }
        const captures = await this._queryTree(languageId, commandLine, query);
        return captures.map(e => e.node.text.trim());
    }
    async _queryTree(languageId, commandLine, querySource) {
        const { tree, query } = await this._doQuery(languageId, commandLine, querySource);
        return query.captures(tree.rootNode);
    }
    async _doQuery(languageId, commandLine, querySource) {
        const language = await this._treeSitterLibraryService.getLanguagePromise(languageId);
        if (!language) {
            throw new BugIndicatingError('Failed to fetch language grammar');
        }
        let tree = this._treeCache.get(languageId, commandLine);
        if (!tree) {
            const parser = await this._parser.value;
            parser.setLanguage(language);
            const parsedTree = parser.parse(commandLine);
            if (!parsedTree) {
                throw new ErrorNoTelemetry('Failed to parse tree');
            }
            tree = parsedTree;
            this._treeCache.set(languageId, commandLine, tree);
        }
        const query = await this._treeSitterLibraryService.createQuery(language, querySource);
        if (!query) {
            throw new BugIndicatingError('Failed to create tree sitter query');
        }
        return { tree, query };
    }
};
TreeSitterCommandParser = __decorate([
    __param(0, ITreeSitterLibraryService)
], TreeSitterCommandParser);
export { TreeSitterCommandParser };
/**
 * Caches trees temporarily to avoid reparsing the same command line multiple
 * times in quick succession.
 */
class TreeCache extends Disposable {
    constructor() {
        super();
        this._cache = new Map();
        this._clearScheduler = this._register(new MutableDisposable());
        this._register(toDisposable(() => this._cache.clear()));
    }
    get(languageId, commandLine) {
        this._resetClearTimer();
        return this._cache.get(this._getCacheKey(languageId, commandLine));
    }
    set(languageId, commandLine, tree) {
        this._resetClearTimer();
        this._cache.set(this._getCacheKey(languageId, commandLine), tree);
    }
    _getCacheKey(languageId, commandLine) {
        return `${languageId}:${commandLine}`;
    }
    _resetClearTimer() {
        this._clearScheduler.value = new RunOnceScheduler(() => {
            this._cache.clear();
        }, 10000);
        this._clearScheduler.value.schedule();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlckNvbW1hbmRQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90cmVlU2l0dGVyQ29tbWFuZFBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw4RUFBOEUsQ0FBQztBQUV6SCxNQUFNLENBQU4sSUFBa0IsK0JBR2pCO0FBSEQsV0FBa0IsK0JBQStCO0lBQ2hELGdEQUFhLENBQUE7SUFDYiw0REFBeUIsQ0FBQTtBQUMxQixDQUFDLEVBSGlCLCtCQUErQixLQUEvQiwrQkFBK0IsUUFHaEQ7QUFFTSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFJdEQsWUFDNEIseUJBQXFFO1FBRWhHLEtBQUssRUFBRSxDQUFDO1FBRm9DLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBMkI7UUFIaEYsZUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBTTdELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFB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