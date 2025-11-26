/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const ILanguageModelIgnoredFilesService = createDecorator('languageModelIgnoredFilesService');
export class LanguageModelIgnoredFilesService {
    constructor() {
        this._providers = new Set();
    }
    async fileIsIgnored(uri, token) {
        // Just use the first provider
        const provider = this._providers.values().next().value;
        return provider ?
            provider.isFileIgnored(uri, token) :
            false;
    }
    registerIgnoredFileProvider(provider) {
        this._providers.add(provider);
        return toDisposable(() => {
            this._providers.delete(provider);
        });
    }
}
//# sourceMappingURL=ignoredFiles.js.map