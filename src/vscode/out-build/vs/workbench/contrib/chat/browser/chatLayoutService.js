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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { derived } from '../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
const FONT_SIZE = 13;
let ChatLayoutService = class ChatLayoutService extends Disposable {
    constructor(configurationService) {
        super();
        const chatFontFamily = observableConfigValue('chat.fontFamily', 'default', configurationService);
        this.fontFamily = derived(reader => {
            const fontFamily = chatFontFamily.read(reader);
            return fontFamily === 'default' ? null : fontFamily;
        });
        this.fontSize = observableConfigValue('chat.fontSize', FONT_SIZE, configurationService);
    }
};
ChatLayoutService = __decorate([
    __param(0, IConfigurationService)
], ChatLayoutService);
export { ChatLayoutService };
//# sourceMappingURL=chatLayoutService.js.map