"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarizeDocumentPlayground = void 0;
exports.waitForStateOrReturn = waitForStateOrReturn;
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const observable_1 = require("../../../../util/vs/base/common/observable");
const types_1 = require("../../../../util/vs/base/common/types");
const vscodeTypes_1 = require("../../../../vscodeTypes");
class SummarizeDocumentPlayground {
    constructor(result, initialRange, initialCharLimit, _getUpdatedStructure, _getUpdatedResult) {
        this._getUpdatedStructure = _getUpdatedStructure;
        this._getUpdatedResult = _getUpdatedResult;
        this._text = (0, observable_1.observableValue)(this, '');
        this._range = (0, observable_1.observableValue)(this, new vscodeTypes_1.Range(0, 0, 0, 0));
        this._charLimit = (0, observable_1.observableValue)(this, 10);
        this._initialResult = (0, observable_1.observableValue)(this, undefined);
        this._structure = (0, observable_1.derived)(this, reader => {
            return (0, observable_1.observableFromPromise)(this._getUpdatedStructure(this._text.read(reader)));
        });
        this._store = new lifecycle_1.DisposableStore();
        this._result = (0, observable_1.derived)(this, reader => {
            const r = this._initialResult.read(reader);
            if (r) {
                return r;
            }
            const structure = this._structure.read(reader).read(reader).value;
            if (!structure) {
                return undefined;
            }
            return this._getUpdatedResult(this._text.read(reader), this._charLimit.read(reader), this._range.read(reader), structure);
        }).keepObserved(this._store);
        (0, observable_1.transaction)(tx => {
            this._initialResult.set(result, tx);
            this._text.set(result.originalText, tx);
            this._range.set(initialRange, tx);
            this._charLimit.set(initialCharLimit, tx);
        });
    }
    get inputDocument() {
        return {
            ...{ $fileExtension: 'textRange.w' },
            text: this._text.get(),
            range: {
                start: { lineNumber: this._range.get().start.line + 1, column: this._range.get().start.character + 1 },
                end: { lineNumber: this._range.get().end.line + 1, column: this._range.get().end.character + 1 },
            }
        };
    }
    set inputDocument(value) {
        (0, observable_1.transaction)(tx => {
            this._initialResult.set(undefined, tx);
            this._text.set(value.text, tx);
            this._range.set(new vscodeTypes_1.Range(value.range.start.lineNumber - 1, value.range.start.column - 1, value.range.end.lineNumber - 1, value.range.end.column - 1), tx);
        });
    }
    get inputOptions() {
        return {
            ...{ $fileExtension: 'jsonUi.w' },
            value: { charLimit: this._charLimit.get() },
            "schema": {
                "title": "data",
                "type": "object",
                "properties": {
                    "charLimit": {
                        "type": "number",
                        "format": "range",
                        "default": 500,
                        "minimum": 0,
                        "maximum": 10000,
                        "step": 1
                    }
                }
            },
        };
    }
    set inputOptions(value) {
        (0, observable_1.transaction)(tx => {
            this._initialResult.set(undefined, tx);
            this._charLimit.set(value.value.charLimit, tx);
        });
    }
    getAst() {
        return waitForStateOrReturn(this._result.map(r => !r ? undefined : r.getVisualization?.()), types_1.isDefined);
    }
    getSummarizedText() {
        return waitForStateOrReturn(this._result.map(r => !r ? undefined : r.text), types_1.isDefined);
    }
}
exports.SummarizeDocumentPlayground = SummarizeDocumentPlayground;
function waitForStateOrReturn(observable, predicate) {
    let result;
    let didRunImmediately = false;
    const p = new Promise(resolve => {
        let shouldDispose = false;
        const stateObs = observable.map(state => ({ isFinished: predicate(state), state }));
        let didRun = false;
        const d = (0, observable_1.autorun)(reader => {
            /** @description waitForState */
            const { isFinished, state } = stateObs.read(reader);
            if (isFinished) {
                if (!didRun) {
                    shouldDispose = true;
                }
                else {
                    d.dispose();
                }
                result = state;
                didRunImmediately = true;
                resolve(state);
            }
        });
        didRun = true;
        if (shouldDispose) {
            d.dispose();
        }
    });
    if (didRunImmediately) {
        return result;
    }
    else {
        return p;
    }
}
//# sourceMappingURL=summarizeDocumentPlayground.js.map