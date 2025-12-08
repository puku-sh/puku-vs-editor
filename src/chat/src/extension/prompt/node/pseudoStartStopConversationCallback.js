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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PseudoStopStartResponseProcessor = void 0;
exports.reportCitations = reportCitations;
const l10n = __importStar(require("@vscode/l10n"));
const openai_1 = require("../../../platform/networking/common/openai");
const thinking_1 = require("../../../platform/thinking/common/thinking");
const uri_1 = require("../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../vscodeTypes");
const toolNames_1 = require("../../tools/common/toolNames");
/**
 * This IConversationCallback skips over text that is between a start and stop word and processes it for output if applicable.
 */
class PseudoStopStartResponseProcessor {
    constructor(stopStartMappings, processNonReportedDelta) {
        this.stopStartMappings = stopStartMappings;
        this.processNonReportedDelta = processNonReportedDelta;
        this.stagedDeltasToApply = [];
        this.currentStartStop = undefined;
        this.nonReportedDeltas = [];
        this.thinkingActive = false;
    }
    async processResponse(_context, inputStream, outputStream, token) {
        return this.doProcessResponse(inputStream, outputStream, token);
    }
    async doProcessResponse(responseStream, progress, token) {
        for await (const { delta } of responseStream) {
            if (token.isCancellationRequested) {
                return;
            }
            this.applyDelta(delta, progress);
        }
    }
    applyDeltaToProgress(delta, progress) {
        if (delta.thinking) {
            // Don't send parts that are only encrypted content
            if (!(0, thinking_1.isEncryptedThinkingDelta)(delta.thinking) || delta.thinking.text) {
                progress.thinkingProgress(delta.thinking);
                this.thinkingActive = true;
            }
        }
        else if (this.thinkingActive) {
            progress.thinkingProgress({ id: '', text: '', metadata: { vscodeReasoningDone: true, stopReason: delta.text ? 'text' : 'other' } });
            this.thinkingActive = false;
        }
        reportCitations(delta, progress);
        const vulnerabilities = delta.codeVulnAnnotations?.map(a => ({ title: a.details.type, description: a.details.description }));
        if (vulnerabilities?.length) {
            progress.markdownWithVulnerabilities(delta.text ?? '', vulnerabilities);
        }
        else if (delta.text) {
            progress.markdown(delta.text);
        }
        if (delta.beginToolCalls?.length) {
            progress.prepareToolInvocation((0, toolNames_1.getContributedToolName)(delta.beginToolCalls[0].name));
        }
    }
    /**
     * Update the stagedDeltasToApply list: consume deltas up to `idx` and return them, and delete `length` after that
     */
    updateStagedDeltasUpToIndex(stopWordIdx, length) {
        const result = [];
        for (let deltaOffset = 0; deltaOffset < stopWordIdx + length;) {
            const delta = this.stagedDeltasToApply.shift();
            if (delta) {
                if (deltaOffset + delta.text.length <= stopWordIdx) {
                    // This delta is in the prefix, return it
                    result.push(delta);
                }
                else if (deltaOffset < stopWordIdx || deltaOffset < stopWordIdx + length) {
                    // This delta goes over the stop word, split it
                    if (deltaOffset < stopWordIdx) {
                        const prefixDelta = { ...delta };
                        prefixDelta.text = delta.text.substring(0, stopWordIdx - deltaOffset);
                        result.push(prefixDelta);
                    }
                    // This is copying the annotation onto both sides of the split delta, better to be safe
                    const postfixDelta = { ...delta };
                    postfixDelta.text = delta.text.substring((stopWordIdx - deltaOffset) + length);
                    if (postfixDelta.text) {
                        this.stagedDeltasToApply.unshift(postfixDelta);
                    }
                }
                else {
                    // This one is already over the idx, delete it
                }
                deltaOffset += delta.text.length;
            }
            else {
                break;
            }
        }
        return result;
    }
    checkForKeyWords(pseudoStopWords, delta, applyDeltaToProgress) {
        const textDelta = this.stagedDeltasToApply.map(d => d.text).join('') + delta.text;
        // Find out if we have a complete stop word
        for (const pseudoStopWord of pseudoStopWords) {
            const stopWordIndex = textDelta.indexOf(pseudoStopWord);
            if (stopWordIndex === -1) {
                continue;
            }
            // We have a stop word, so apply the text up to the stop word
            this.stagedDeltasToApply.push(delta);
            const deltasToReport = this.updateStagedDeltasUpToIndex(stopWordIndex, pseudoStopWord.length);
            deltasToReport.forEach(item => applyDeltaToProgress(item));
            return pseudoStopWord;
        }
        // We now need to find out if we have a partial stop word
        for (const pseudoStopWord of pseudoStopWords) {
            for (let i = pseudoStopWord.length - 1; i > 0; i--) {
                const partialStopWord = pseudoStopWord.substring(0, i);
                if (textDelta.endsWith(partialStopWord)) {
                    // We have a partial stop word, so we must stage the text and wait for the rest
                    this.stagedDeltasToApply = [...this.stagedDeltasToApply, delta];
                    return;
                }
            }
        }
        // We have no stop word or partial, so apply the text to the progress and turn
        [...this.stagedDeltasToApply, delta].forEach(item => {
            applyDeltaToProgress(item);
        });
        this.stagedDeltasToApply = [];
        return;
    }
    postReportRecordProgress(delta) {
        this.nonReportedDeltas.push(delta);
    }
    applyDelta(delta, progress) {
        if (delta.retryReason) {
            this.stagedDeltasToApply = [];
            this.currentStartStop = undefined;
            this.nonReportedDeltas = [];
            this.thinkingActive = false;
            if (delta.retryReason === 'network_error') {
                progress.clearToPreviousToolInvocation(vscodeTypes_1.ChatResponseClearToPreviousToolInvocationReason.NoReason);
            }
            else if (delta.retryReason === openai_1.FilterReason.Copyright) {
                progress.clearToPreviousToolInvocation(vscodeTypes_1.ChatResponseClearToPreviousToolInvocationReason.CopyrightContentRetry);
            }
            else {
                progress.clearToPreviousToolInvocation(vscodeTypes_1.ChatResponseClearToPreviousToolInvocationReason.FilteredContentRetry);
            }
            return;
        }
        if (this.currentStartStop === undefined) {
            const stopWord = this.checkForKeyWords(this.stopStartMappings.map(e => e.stop), delta, delta => this.applyDeltaToProgress(delta, progress));
            if (stopWord) {
                this.currentStartStop = this.stopStartMappings.find(e => e.stop === stopWord);
            }
            return;
        }
        else {
            if (!this.currentStartStop.start) {
                return;
            }
            const startWord = this.checkForKeyWords([this.currentStartStop.start], delta, this.postReportRecordProgress.bind(this));
            if (startWord) {
                if (this.processNonReportedDelta) {
                    const postProcessed = this.processNonReportedDelta(this.nonReportedDeltas);
                    postProcessed.forEach((text) => this.applyDeltaToProgress({ text }, progress)); // processNonReportedDelta should not return anything that would have annotations
                }
                this.currentStartStop = undefined;
                if (this.stagedDeltasToApply.length > 0) {
                    // since there's no guarantee that applyDelta will be called again, flush the stagedTextToApply by applying a blank string
                    this.applyDelta({ text: '' }, progress);
                }
            }
        }
    }
}
exports.PseudoStopStartResponseProcessor = PseudoStopStartResponseProcessor;
/**
 * Note- IPCitations (snippy) are disabled in non-prod builds. See packagejson.ts, isProduction.
 */
function reportCitations(delta, progress) {
    const citations = delta.ipCitations;
    if (citations?.length) {
        citations.forEach(c => {
            const licenseLabel = c.citations.license === 'NOASSERTION' ?
                l10n.t('unknown') :
                c.citations.license;
            progress.codeCitation(uri_1.URI.parse(c.citations.url), licenseLabel, c.citations.snippet);
        });
    }
}
//# sourceMappingURL=pseudoStartStopConversationCallback.js.map