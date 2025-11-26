/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
export class NullLanguageModelsService {
    constructor() {
        this.onDidChangeLanguageModels = Event.None;
    }
    registerLanguageModelProvider(vendor, provider) {
        return Disposable.None;
    }
    updateModelPickerPreference(modelIdentifier, showInModelPicker) {
        return;
    }
    getVendors() {
        return [];
    }
    getLanguageModelIds() {
        return [];
    }
    lookupLanguageModel(identifier) {
        return undefined;
    }
    getLanguageModels() {
        return [];
    }
    setContributedSessionModels() {
        return;
    }
    clearContributedSessionModels() {
        return;
    }
    async selectLanguageModels(selector) {
        return [];
    }
    sendChatRequest(identifier, from, messages, options, token) {
        throw new Error('Method not implemented.');
    }
    computeTokenLength(identifier, message, token) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=languageModels.js.map