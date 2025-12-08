"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiReplaceStringTool = void 0;
const map_1 = require("../../../util/vs/base/common/map");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const abstractReplaceStringTool_1 = require("./abstractReplaceStringTool");
class MultiReplaceStringTool extends abstractReplaceStringTool_1.AbstractReplaceStringTool {
    static { this.toolName = toolNames_1.ToolName.MultiReplaceString; }
    extractReplaceInputs(input) {
        return input.replacements.map(r => ({
            filePath: r.filePath,
            oldString: r.oldString,
            newString: r.newString,
        }));
    }
    async invoke(options, token) {
        if (!options.input.replacements || !Array.isArray(options.input.replacements)) {
            throw new Error('Invalid input, no replacements array');
        }
        const prepared = await this.prepareEdits(options, token);
        let successes = 0;
        let failures = 0;
        let individualEdits = 0;
        const uniqueUris = new map_1.ResourceSet();
        for (const edit of prepared) {
            uniqueUris.add(edit.uri);
            if (edit.generatedEdit.success) {
                successes++;
                individualEdits += edit.generatedEdit.textEdits.length;
            }
            else {
                failures++;
            }
        }
        /* __GDPR__
            "multiStringReplaceCall" : {
                "owner": "connor4312",
                "comment": "Tracks how much percent of the AI edits survived after 5 minutes of accepting",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model used for the request." },
                "successes": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The number of successful edits.", "isMeasurement": true },
                "failures": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The number of failed edits.", "isMeasurement": true },
                "uniqueUris": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The number of unique URIs edited.", "isMeasurement": true },
                "individualEdits": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The number of individual text edits made.", "isMeasurement": true }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('multiStringReplaceCall', {
            requestId: this._promptContext?.requestId,
            model: await this.modelForTelemetry(options),
        }, {
            successes,
            failures,
            individualEdits,
            uniqueUris: uniqueUris.size,
        });
        for (let i = 0; i < prepared.length; i++) {
            const e1 = prepared[i];
            uniqueUris.add(e1.uri);
            if (!e1.generatedEdit.success) {
                failures++;
                continue;
            }
            successes++;
            for (let k = i + 1; k < prepared.length; k++) {
                const e2 = prepared[k];
                // Merge successful edits of the same type and URI so that edits come in
                // a single correct batch and positions aren't later clobbered.
                if (!e2.generatedEdit.success || e2.uri.toString() !== e1.uri.toString() || (!!e2.generatedEdit.notebookEdits !== !!e1.generatedEdit.notebookEdits)) {
                    continue;
                }
                prepared.splice(k, 1);
                k--;
                if (e2.generatedEdit.notebookEdits) {
                    e1.generatedEdit.notebookEdits = mergeNotebookAndTextEdits(e1.generatedEdit.notebookEdits, e2.generatedEdit.notebookEdits);
                }
                else {
                    e1.generatedEdit.textEdits = e1.generatedEdit.textEdits.concat(e2.generatedEdit.textEdits);
                    e1.generatedEdit.textEdits.sort(textEditSorter);
                }
            }
        }
        return this.applyAllEdits(options, prepared, token);
    }
    toolName() {
        return MultiReplaceStringTool.toolName;
    }
}
exports.MultiReplaceStringTool = MultiReplaceStringTool;
toolsRegistry_1.ToolRegistry.registerTool(MultiReplaceStringTool);
function textEditSorter(a, b) {
    return b.range.end.compareTo(a.range.end) || b.range.start.compareTo(a.range.start);
}
/**
 * Merge two arrays of notebook edits or text edits grouped by URI.
 * Text edits for the same URI are concatenated and sorted in reverse file order (descending by start position).
 */
function mergeNotebookAndTextEdits(left, right) {
    const notebookEdits = [];
    const textEditsByUri = new map_1.ResourceMap();
    const add = (item) => {
        if (Array.isArray(item)) {
            const [uri, edits] = item;
            let bucket = textEditsByUri.get(uri);
            if (!bucket) {
                bucket = [];
                textEditsByUri.set(uri, bucket);
            }
            bucket.push(...edits);
        }
        else {
            notebookEdits.push(item);
        }
    };
    left.forEach(add);
    right.forEach(add);
    const mergedTextEditTuples = [];
    for (const [uri, edits] of textEditsByUri.entries()) {
        edits.sort(textEditSorter);
        mergedTextEditTuples.push([uri, edits]);
    }
    return [...notebookEdits, ...mergedTextEditTuples];
}
//# sourceMappingURL=multiReplaceStringTool.js.map