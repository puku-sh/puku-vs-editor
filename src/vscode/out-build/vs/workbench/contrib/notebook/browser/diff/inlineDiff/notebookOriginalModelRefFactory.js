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
import { AsyncReferenceCollection, ReferenceCollection } from '../../../../../../base/common/lifecycle.js';
import { INotebookService } from '../../../common/notebookService.js';
import { bufferToStream, VSBuffer } from '../../../../../../base/common/buffer.js';
import { createDecorator, IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ITextModelService } from '../../../../../../editor/common/services/resolverService.js';
export const INotebookOriginalModelReferenceFactory = createDecorator('INotebookOriginalModelReferenceFactory');
let OriginalNotebookModelReferenceCollection = class OriginalNotebookModelReferenceCollection extends ReferenceCollection {
    constructor(notebookService, modelService) {
        super();
        this.notebookService = notebookService;
        this.modelService = modelService;
        this.modelsToDispose = new Set();
    }
    async createReferencedObject(key, fileEntry, viewType) {
        this.modelsToDispose.delete(key);
        const uri = fileEntry.originalURI;
        const model = this.notebookService.getNotebookTextModel(uri);
        if (model) {
            return model;
        }
        const modelRef = await this.modelService.createModelReference(uri);
        const bytes = VSBuffer.fromString(modelRef.object.textEditorModel.getValue());
        const stream = bufferToStream(bytes);
        modelRef.dispose();
        return this.notebookService.createNotebookTextModel(viewType, uri, stream);
    }
    destroyReferencedObject(key, modelPromise) {
        this.modelsToDispose.add(key);
        (async () => {
            try {
                const model = await modelPromise;
                if (!this.modelsToDispose.has(key)) {
                    // return if model has been acquired again meanwhile
                    return;
                }
                // Finally we can dispose the model
                model.dispose();
            }
            catch (error) {
                // ignore
            }
            finally {
                this.modelsToDispose.delete(key); // Untrack as being disposed
            }
        })();
    }
};
OriginalNotebookModelReferenceCollection = __decorate([
    __param(0, INotebookService),
    __param(1, ITextModelService)
], OriginalNotebookModelReferenceCollection);
export { OriginalNotebookModelReferenceCollection };
let NotebookOriginalModelReferenceFactory = class NotebookOriginalModelReferenceFactory {
    get resourceModelCollection() {
        if (!this._resourceModelCollection) {
            this._resourceModelCollection = this.instantiationService.createInstance(OriginalNotebookModelReferenceCollection);
        }
        return this._resourceModelCollection;
    }
    get asyncModelCollection() {
        if (!this._asyncModelCollection) {
            this._asyncModelCollection = new AsyncReferenceCollection(this.resourceModelCollection);
        }
        return this._asyncModelCollection;
    }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        this._resourceModelCollection = undefined;
        this._asyncModelCollection = undefined;
    }
    getOrCreate(fileEntry, viewType) {
        return this.asyncModelCollection.acquire(fileEntry.originalURI.toString(), fileEntry, viewType);
    }
};
NotebookOriginalModelReferenceFactory = __decorate([
    __param(0, IInstantiationService)
], NotebookOriginalModelReferenceFactory);
export { NotebookOriginalModelReferenceFactory };
//# sourceMappingURL=notebookOriginalModelRefFactory.js.map