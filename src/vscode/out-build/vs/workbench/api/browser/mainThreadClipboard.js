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
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { MainContext } from '../common/extHost.protocol.js';
import { IClipboardService } from '../../../platform/clipboard/common/clipboardService.js';
import { ILogService } from '../../../platform/log/common/log.js';
let MainThreadClipboard = class MainThreadClipboard {
    constructor(_context, _clipboardService, _logService) {
        this._clipboardService = _clipboardService;
        this._logService = _logService;
    }
    dispose() {
        // nothing
    }
    $readText() {
        this._logService.trace('MainThreadClipboard#readText');
        const readText = this._clipboardService.readText();
        return readText;
    }
    $writeText(value) {
        this._logService.trace('MainThreadClipboard#writeText with text.length : ', value.length);
        return this._clipboardService.writeText(value);
    }
};
MainThreadClipboard = __decorate([
    extHostNamedCustomer(MainContext.MainThreadClipboard),
    __param(1, IClipboardService),
    __param(2, ILogService)
], MainThreadClipboard);
export { MainThreadClipboard };
//# sourceMappingURL=mainThreadClipboard.js.map