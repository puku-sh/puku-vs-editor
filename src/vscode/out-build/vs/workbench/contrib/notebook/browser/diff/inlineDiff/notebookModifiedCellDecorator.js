/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { NotebookOverviewRulerLane } from '../../notebookBrowser.js';
import { overviewRulerModifiedForeground } from '../../../../scm/common/quickDiff.js';
export class NotebookModifiedCellDecorator extends Disposable {
    constructor(notebookEditor) {
        super();
        this.notebookEditor = notebookEditor;
        this.decorators = this._register(new DisposableStore());
    }
    apply(diffInfo) {
        const model = this.notebookEditor.textModel;
        if (!model) {
            return;
        }
        const modifiedCells = [];
        for (const diff of diffInfo) {
            if (diff.type === 'modified') {
                const cell = model.cells[diff.modifiedCellIndex];
                modifiedCells.push(cell);
            }
        }
        const ids = this.notebookEditor.deltaCellDecorations([], modifiedCells.map(cell => ({
            handle: cell.handle,
            options: {
                overviewRuler: {
                    color: overviewRulerModifiedForeground,
                    modelRanges: [],
                    includeOutput: true,
                    position: NotebookOverviewRulerLane.Full
                }
            }
        })));
        this.clear();
        this.decorators.add(toDisposable(() => {
            if (!this.notebookEditor.isDisposed) {
                this.notebookEditor.deltaCellDecorations(ids, []);
            }
        }));
    }
    clear() {
        this.decorators.clear();
    }
}
//# sourceMappingURL=notebookModifiedCellDecorator.js.map