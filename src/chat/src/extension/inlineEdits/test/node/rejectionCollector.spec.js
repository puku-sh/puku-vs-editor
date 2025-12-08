"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const outdent_1 = require("outdent");
const vitest_1 = require("vitest");
const documentId_1 = require("../../../../platform/inlineEdits/common/dataTypes/documentId");
const observableWorkspace_1 = require("../../../../platform/inlineEdits/common/observableWorkspace");
const observableInternal_1 = require("../../../../util/vs/base/common/observableInternal");
const uri_1 = require("../../../../util/vs/base/common/uri");
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const rejectionCollector_1 = require("../../common/rejectionCollector");
const fileLoading_1 = require("./fileLoading");
const runRecording_1 = require("./runRecording");
(0, vitest_1.describe)('RejectionCollector[visualizable]', () => {
    (0, vitest_1.test)('test1', async () => {
        const result = await (0, runRecording_1.runRecording)(await (0, fileLoading_1.loadJSON)({
            filePath: (0, fileLoading_1.relativeFile)("recordings/RejectionCollector.test1.w.json"),
        }), ctx => {
            const rejs = [];
            const rejectionCollector = ctx.store.add(new rejectionCollector_1.RejectionCollector(ctx.workspace, console.log));
            ctx.workspace.lastActiveDocument.recomputeInitiallyAndOnChange(ctx.store);
            const getEdit = (doc = undefined) => {
                if (!doc) {
                    doc = ctx.workspace.lastActiveDocument.get();
                }
                if (!doc) {
                    return undefined;
                }
                const edit = createEdit(doc.value.get().value, `items.push([[oldItem ? item.withIdentity(oldItem.identity) : item]]);`, `OLDiTEM`);
                if (!edit) {
                    return undefined;
                }
                return { edit, doc };
            };
            while (!getEdit()) {
                if (!ctx.step()) {
                    return { rejs };
                }
            }
            const { doc } = getEdit();
            ctx.store.add((0, observableInternal_1.runOnChange)(ctx.workspace.onDidOpenDocumentChange, () => {
                const e = getEdit(doc);
                if (e) {
                    rejs.push(rejectionCollector.isRejected(doc.id, e.edit));
                }
                else {
                    rejs.push('edit not found');
                }
            }));
            ctx.stepSkipNonContentChanges();
            const { edit } = getEdit();
            rejectionCollector.reject(doc.id, edit);
            ctx.finishReplay();
            return { rejs };
        });
        (0, vitest_1.expect)(result.rejs).toMatchInlineSnapshot(`
			[
			  false,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  true,
			  "edit not found",
			]
		`);
    });
    vitest_1.test.skip('overlapping', () => {
        const observableWorkspace = new observableWorkspace_1.MutableObservableWorkspace();
        const doc = observableWorkspace.addDocument({
            id: documentId_1.DocumentId.create(uri_1.URI.file('/test/test.ts').toString()),
            initialValue: (0, outdent_1.outdent) `
class Point {
	constructor(
		private readonly x: number,
		private readonly y: number,
	) { }
	getDistance() {
		return Math.sqrt(this.x ** 2 + this.y ** 2);
	}
}
`.trim()
        });
        const rejectionCollector = new rejectionCollector_1.RejectionCollector(observableWorkspace, console.log);
        try {
            const edit1 = stringEdit_1.StringReplacement.replace(offsetRange_1.OffsetRange.fromTo(96, 107), 'fo');
            (0, vitest_1.expect)(rejectionCollector.isRejected(doc.id, edit1)).toBe(false);
            const rej1 = stringEdit_1.StringReplacement.replace(offsetRange_1.OffsetRange.fromTo(96, 107), 'foobar');
            rejectionCollector.reject(doc.id, rej1);
            (0, vitest_1.expect)(rejectionCollector.isRejected(doc.id, rej1)).toBe(true);
            (0, vitest_1.expect)(rejectionCollector.isRejected(doc.id, edit1)).toBe(false);
            doc.applyEdit(stringEdit_1.StringEdit.single(edit1));
            (0, vitest_1.expect)(rejectionCollector.isRejected(doc.id, stringEdit_1.StringReplacement.replace(offsetRange_1.OffsetRange.fromTo(98, 98), 'obar'))).toBe(true);
            const edit2 = stringEdit_1.StringReplacement.replace(offsetRange_1.OffsetRange.fromTo(98, 98), 'ob');
            (0, vitest_1.expect)(rejectionCollector.isRejected(doc.id, edit2)).toBe(false);
            doc.applyEdit(stringEdit_1.StringEdit.single(edit2));
            (0, vitest_1.expect)(rejectionCollector.isRejected(doc.id, stringEdit_1.StringReplacement.replace(offsetRange_1.OffsetRange.fromTo(100, 100), 'ar'))).toBe(true);
            const edit3 = stringEdit_1.StringReplacement.replace(offsetRange_1.OffsetRange.fromTo(100, 100), 'A');
            (0, vitest_1.expect)(rejectionCollector.isRejected(doc.id, edit3)).toBe(false);
            doc.applyEdit(stringEdit_1.StringEdit.single(edit3));
            // now evicted
            (0, vitest_1.expect)(rejectionCollector.isRejected(doc.id, stringEdit_1.StringReplacement.replace(offsetRange_1.OffsetRange.fromTo(101, 101), 'r'))).toBe(false);
        }
        finally {
            rejectionCollector.dispose();
        }
    });
});
/**
 * Match is context[[valueToReplace]]context
*/
function createEdit(base, match, newValue) {
    let cleanedMatch;
    const idxStart = match.indexOf('[[');
    const idxEnd = match.indexOf(']]') - 2;
    let range;
    if (idxStart === -1 || idxEnd === -3) {
        range = new offsetRange_1.OffsetRange(0, match.length);
        cleanedMatch = match;
    }
    else {
        range = new offsetRange_1.OffsetRange(idxStart, idxEnd);
        cleanedMatch = match.replace('[[', '').replace(']]', '');
    }
    const idx = base.indexOf(cleanedMatch);
    if (idx === -1) {
        return undefined;
    }
    const r = range.delta(idx);
    return stringEdit_1.StringReplacement.replace(r, newValue);
}
//# sourceMappingURL=rejectionCollector.spec.js.map