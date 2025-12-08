"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeActionData = void 0;
class CodeActionData {
    constructor(title, diagnostics, edits) {
        this.title = title;
        this.diagnostics = diagnostics;
        this.edits = edits;
    }
    toString() {
        return `${this.title}: ${this.diagnostics.map(d => d.toString())}) => ${this.edits?.map(e => e.toString())}`;
    }
    equals(other) {
        const edits = this.edits || [];
        const otherEdits = other.edits || [];
        return this.title === other.title
            && this.diagnostics.length === other.diagnostics.length
            && this.diagnostics.every((d, i) => d.equals(other.diagnostics[i]))
            && edits.length === otherEdits.length
            && edits.every((e, i) => e.equals(otherEdits[i]));
    }
}
exports.CodeActionData = CodeActionData;
//# sourceMappingURL=codeActionData.js.map