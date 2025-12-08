"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnippyService = void 0;
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const logService_1 = require("../../log/common/logService");
const SnippyCompute = __importStar(require("./snippyCompute"));
const snippyFetcher_1 = require("./snippyFetcher");
const snippyNotifier_1 = require("./snippyNotifier");
let SnippyService = class SnippyService {
    constructor(instantiationService, logService) {
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.notifier = this.instantiationService.createInstance(snippyNotifier_1.SnippyNotifier);
        this.fetcher = this.instantiationService.createInstance(snippyFetcher_1.SnippyFetchService);
    }
    async handlePostInsertion(documentUri, documentBeforeEdits, singleEdit) {
        const sourceToCheck = this.computeSourceToCheck(documentBeforeEdits, singleEdit);
        if (!sourceToCheck) {
            return;
        }
        let matchResponse;
        try {
            matchResponse = await this.fetcher.fetchMatch(sourceToCheck.source, cancellation_1.CancellationToken.None);
        }
        catch (e) {
            throw e;
        }
        if (!matchResponse) {
            throw new Error(`Failed to parse match response: ${matchResponse}`);
        }
        if (matchResponse.isError()) {
            throw new Error(`Failed to match: ${matchResponse.err}`);
        }
        if (matchResponse.val.snippets.length === 0) {
            // no match found
            return;
        }
        const { snippets } = matchResponse.val;
        const citationPromises = snippets.map(async (snippet) => {
            const response = await this.fetcher.fetchFilesForMatch(snippet.cursor, cancellation_1.CancellationToken.None);
            if (!response || response.isError()) {
                return;
            }
            const { file_matches: files, license_stats: licenseStats } = response.val;
            return {
                match: snippet,
                files,
                licenseStats
            };
        });
        this.notifier.notify();
        const citations = await Promise.all(citationPromises);
        const filteredCitations = citations.filter(c => !!c);
        if (filteredCitations.length === 0) {
            return;
        }
        for (const citation of filteredCitations) {
            const licensesSet = new Set(Object.keys(citation.licenseStats?.count ?? {}));
            if (licensesSet.delete('NOASSERTION')) {
                licensesSet.add('unknown');
            }
            const allLicenses = Array.from(licensesSet).sort();
            const matchLocation = `[Ln ${sourceToCheck.startPosition.lineNumber}, Col ${sourceToCheck.startPosition.column}]`;
            const shortenedMatchText = `${citation.match.matched_source
                .slice(0, 100)
                .replace(/[\r\n\t]+|^[ \t]+/gm, ' ')
                .trim()}...`;
            this.logService.info([
                '[CODE REFERENCING]',
                documentUri,
                `Similar code with ${pluralize(allLicenses.length, 'license type')}`,
                `[${allLicenses.join(', ')}]`,
                `${citation.match.github_url.replace(/,\s*$/, '')}&editor=vscode`,
                matchLocation,
                shortenedMatchText
            ].join(' '));
        }
    }
    computeSourceToCheck(documentBeforeEdits, singleEdit) {
        if (singleEdit.newText === '') { // If the edit is a deletion, snippy shouldn't do anything (?)
            return;
        }
        const edit = stringEdit_1.StringEdit.single(singleEdit);
        const newRanges = edit.getNewRanges();
        const newTotalRange = newRanges.reduce((acc, range) => acc.join(range));
        const documentAfterEdits = edit.applyOnText(documentBeforeEdits);
        let startOffset = newTotalRange.start;
        let potentialMatchContext = documentAfterEdits.value.substring(newTotalRange.start, newTotalRange.endExclusive);
        // replicates behavior of copilot-client (ghost text extension)
        // In many cases, we will get completion that is shorter than 65 tokens,
        // e.g. a single line or word completion.
        // When a completion is too short, we should try and get the preceding tokens and
        // pass that to snippy as part of the context.
        if (!SnippyCompute.hasMinLexemeLength(potentialMatchContext)) {
            const textWithoutCompletion = documentAfterEdits.value.slice(0, newTotalRange.start);
            const minLexemeStartOffset = SnippyCompute.offsetLastLexemes(textWithoutCompletion, SnippyCompute.MinTokenLength);
            startOffset = minLexemeStartOffset;
            potentialMatchContext = documentAfterEdits.value.slice(minLexemeStartOffset, newTotalRange.start + singleEdit.newText.length);
        }
        if (!SnippyCompute.hasMinLexemeLength(potentialMatchContext)) {
            return;
        }
        const trans = documentAfterEdits.getTransformer();
        const startPosition = trans.getPosition(startOffset);
        return {
            source: potentialMatchContext,
            startPosition,
        };
    }
};
exports.SnippyService = SnippyService;
exports.SnippyService = SnippyService = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, logService_1.ILogService)
], SnippyService);
const pluralize = (count, noun, suffix = 's') => `${count} ${noun}${count !== 1 ? suffix : ''}`;
//# sourceMappingURL=snippyServiceImpl.js.map