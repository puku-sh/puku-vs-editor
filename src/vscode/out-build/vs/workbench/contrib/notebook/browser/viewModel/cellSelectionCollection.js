/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { cellRangesEqual } from '../../common/notebookRange.js';
// Challenge is List View talks about `element`, which needs extra work to convert to ICellRange as we support Folding and Cell Move
export class NotebookCellSelectionCollection extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeSelection = this._register(new Emitter());
        this._primary = { start: 0, end: 0 };
        this._selections = [{ start: 0, end: 0 }];
    }
    get onDidChangeSelection() { return this._onDidChangeSelection.event; }
    get selections() {
        return this._selections;
    }
    get focus() {
        return this._primary;
    }
    setState(primary, selections, forceEventEmit, source) {
        const validPrimary = primary ?? { start: 0, end: 0 };
        const validSelections = selections.length > 0 ? selections : [{ start: 0, end: 0 }];
        const changed = !cellRangesEqual([validPrimary], [this._primary]) || !cellRangesEqual(this._selections, validSelections);
        this._primary = validPrimary;
        this._selections = validSelections;
        if (changed || forceEventEmit) {
            this._onDidChangeSelection.fire(source);
        }
    }
    setSelections(selections, forceEventEmit, source) {
        this.setState(this._primary, selections, forceEventEmit, source);
    }
}
//# sourceMappingURL=cellSelectionCollection.js.map