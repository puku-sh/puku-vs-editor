/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { derivedHandleChanges, observableValue, runOnChange, autorun, derived } from '../../../../../base/common/observable.js';
import { StringEdit, StringReplacement } from '../../../../../editor/common/core/edits/stringEdit.js';
import { EditSources } from '../../../../../editor/common/textModelEditSource.js';
export class ObservableWorkspace {
    constructor() {
        this._version = 0;
        /**
         * Is fired when any open document changes.
        */
        this.onDidOpenDocumentChange = derivedHandleChanges({
            owner: this,
            changeTracker: {
                createChangeSummary: () => ({ didChange: false }),
                handleChange: (ctx, changeSummary) => {
                    if (!ctx.didChange(this.documents)) {
                        changeSummary.didChange = true; // A document changed
                    }
                    return true;
                }
            }
        }, (reader, changeSummary) => {
            const docs = this.documents.read(reader);
            for (const d of docs) {
                d.value.read(reader); // add dependency
            }
            if (changeSummary.didChange) {
                this._version++; // to force a change
            }
            return this._version;
            // TODO@hediet make this work:
            /*
            const docs = this.openDocuments.read(reader);
            for (const d of docs) {
                if (reader.readChangesSinceLastRun(d.value).length > 0) {
                    reader.reportChange(d);
                }
            }
            return undefined;
            */
        });
        this.lastActiveDocument = derived((reader) => {
            const obs = observableValue('lastActiveDocument', undefined);
            reader.store.add(autorun((reader) => {
                const docs = this.documents.read(reader);
                for (const d of docs) {
                    reader.store.add(runOnChange(d.value, () => {
                        obs.set(d, undefined);
                    }));
                }
            }));
            return obs;
        }).flatten();
    }
    getFirstOpenDocument() {
        return this.documents.get()[0];
    }
    getDocument(documentId) {
        return this.documents.get().find(d => d.uri.toString() === documentId.toString());
    }
}
export class StringEditWithReason extends StringEdit {
    static replace(range, newText, source = EditSources.unknown({})) {
        return new StringEditWithReason([new StringReplacement(range, newText)], source);
    }
    constructor(replacements, reason) {
        super(replacements);
        this.reason = reason;
    }
}
//# sourceMappingURL=observableWorkspace.js.map