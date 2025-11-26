/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class InlineEdit {
    constructor(edit, commands, inlineSuggestion) {
        this.edit = edit;
        this.commands = commands;
        this.inlineSuggestion = inlineSuggestion;
    }
    get range() {
        return this.edit.range;
    }
    get text() {
        return this.edit.text;
    }
    equals(other) {
        return this.edit.equals(other.edit)
            && this.inlineSuggestion === other.inlineSuggestion;
    }
}
//# sourceMappingURL=inlineEdit.js.map