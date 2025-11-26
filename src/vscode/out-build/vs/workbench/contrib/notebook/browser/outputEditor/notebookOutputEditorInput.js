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
var NotebookOutputEditorInput_1;
import * as nls from '../../../../../nls.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { INotebookEditorModelResolverService } from '../../common/notebookEditorModelResolverService.js';
import { isEqual } from '../../../../../base/common/resources.js';
class ResolvedNotebookOutputEditorInputModel {
    constructor(resolvedNotebookEditorModel, notebookUri, cell, outputId) {
        this.resolvedNotebookEditorModel = resolvedNotebookEditorModel;
        this.notebookUri = notebookUri;
        this.cell = cell;
        this.outputId = outputId;
    }
    dispose() {
        this.resolvedNotebookEditorModel.dispose();
    }
}
// TODO @Yoyokrazy -- future feat. for viewing static outputs -- encode mime + data
// export class NotebookOutputViewerInput extends EditorInput {
// 	static readonly ID: string = 'workbench.input.notebookOutputViewerInput';
// }
let NotebookOutputEditorInput = class NotebookOutputEditorInput extends EditorInput {
    static { NotebookOutputEditorInput_1 = this; }
    static { this.ID = 'workbench.input.notebookOutputEditorInput'; }
    constructor(notebookUri, cellIndex, outputId, outputIndex, notebookEditorModelResolverService) {
        super();
        this.notebookEditorModelResolverService = notebookEditorModelResolverService;
        this._notebookUri = notebookUri;
        this.cellUri = undefined;
        this.cellIndex = cellIndex;
        this.outputId = outputId;
        this.outputIndex = outputIndex;
    }
    get typeId() {
        return NotebookOutputEditorInput_1.ID;
    }
    async resolve() {
        if (!this._notebookRef) {
            this._notebookRef = await this.notebookEditorModelResolverService.resolve(this._notebookUri);
        }
        const cell = this._notebookRef.object.notebook.cells[this.cellIndex];
        if (!cell) {
            throw new Error('Cell not found');
        }
        this.cellUri = cell.uri;
        const resolvedOutputId = cell.outputs[this.outputIndex]?.outputId;
        if (!resolvedOutputId) {
            throw new Error('Output not found');
        }
        if (!this.outputId) {
            this.outputId = resolvedOutputId;
        }
        return new ResolvedNotebookOutputEditorInputModel(this._notebookRef.object, this._notebookUri, cell, resolvedOutputId);
    }
    getSerializedData() {
        // need to translate from uris -> current indexes
        // uris aren't deterministic across reloads, so indices are best option
        if (!this._notebookRef) {
            return;
        }
        const cellIndex = this._notebookRef.object.notebook.cells.findIndex(c => isEqual(c.uri, this.cellUri));
        const cell = this._notebookRef.object.notebook.cells[cellIndex];
        if (!cell) {
            return;
        }
        const outputIndex = cell.outputs.findIndex(o => o.outputId === this.outputId);
        if (outputIndex === -1) {
            return;
        }
        return {
            notebookUri: this._notebookUri,
            cellIndex: cellIndex,
            outputIndex: outputIndex,
        };
    }
    getName() {
        return nls.localize(10570, null);
    }
    get editorId() {
        return 'notebookOutputEditor';
    }
    get resource() {
        return;
    }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */;
    }
    dispose() {
        super.dispose();
    }
};
NotebookOutputEditorInput = NotebookOutputEditorInput_1 = __decorate([
    __param(4, INotebookEditorModelResolverService)
], NotebookOutputEditorInput);
export { NotebookOutputEditorInput };
//# sourceMappingURL=notebookOutputEditorInput.js.map