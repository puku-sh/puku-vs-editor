/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { LanguageConfigurationRegistry, LanguageConfigurationServiceChangeEvent, ResolvedLanguageConfiguration } from '../../../common/languages/languageConfigurationRegistry.js';
export class TestLanguageConfigurationService extends Disposable {
    constructor() {
        super();
        this._registry = this._register(new LanguageConfigurationRegistry());
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._register(this._registry.onDidChange((e) => this._onDidChange.fire(new LanguageConfigurationServiceChangeEvent(e.languageId))));
    }
    register(languageId, configuration, priority) {
        return this._registry.register(languageId, configuration, priority);
    }
    getLanguageConfiguration(languageId) {
        return this._registry.getLanguageConfiguration(languageId) ??
            new ResolvedLanguageConfiguration('unknown', {});
    }
}
//# sourceMappingURL=testLanguageConfigurationService.js.map