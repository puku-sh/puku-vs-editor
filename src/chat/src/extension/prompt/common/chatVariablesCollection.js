"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatVariablesCollection = void 0;
exports.isPromptInstruction = isPromptInstruction;
exports.isPromptFile = isPromptFile;
class ChatVariablesCollection {
    static merge(...collections) {
        const allReferences = [];
        const seen = new Set();
        for (const collection of collections) {
            for (const variable of collection) {
                const ref = variable.reference;
                // simple dedupe
                let key;
                try {
                    key = JSON.stringify(ref.value);
                }
                catch {
                    key = ref.id + String(ref.value);
                }
                if (!seen.has(key)) {
                    seen.add(key);
                    allReferences.push(ref);
                }
            }
        }
        return new ChatVariablesCollection(allReferences);
    }
    constructor(_source = []) {
        this._source = _source;
        this._variables = null;
    }
    _getVariables() {
        if (!this._variables) {
            this._variables = [];
            for (let i = 0; i < this._source.length; i++) {
                const variable = this._source[i];
                // Rewrite the message to use the variable header name
                if (variable.value) {
                    const originalName = variable.name;
                    const uniqueName = this.uniqueFileName(originalName, this._source.slice(0, i));
                    this._variables.push({ reference: variable, originalName, uniqueName, value: variable.value, range: variable.range, isMarkedReadonly: variable.isReadonly });
                }
            }
        }
        return this._variables;
    }
    reverse() {
        const sourceCopy = this._source.slice(0);
        sourceCopy.reverse();
        return new ChatVariablesCollection(sourceCopy);
    }
    find(predicate) {
        return this._getVariables().find(predicate);
    }
    filter(predicate) {
        const resultingReferences = [];
        for (const variable of this._getVariables()) {
            if (predicate(variable)) {
                resultingReferences.push(variable.reference);
            }
        }
        return new ChatVariablesCollection(resultingReferences);
    }
    *[Symbol.iterator]() {
        yield* this._getVariables();
    }
    substituteVariablesWithReferences(userQuery) {
        // no rewriting at the moment
        return userQuery;
    }
    hasVariables() {
        return this._getVariables().length > 0;
    }
    uniqueFileName(name, variables) {
        const count = variables.filter(v => v.name === name).length;
        return count === 0 ? name : `${name}-${count}`;
    }
}
exports.ChatVariablesCollection = ChatVariablesCollection;
/**
 * Check if provided variable is a "prompt instruction".
 */
function isPromptInstruction(variable) {
    return variable.reference.id.startsWith('vscode.prompt.instructions');
}
/**
 * Check if provided variable is a "prompt file".
 */
function isPromptFile(variable) {
    return variable.reference.id.startsWith('vscode.prompt.file');
}
//# sourceMappingURL=chatVariablesCollection.js.map