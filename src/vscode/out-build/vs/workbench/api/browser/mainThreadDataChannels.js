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
import { Disposable } from '../../../base/common/lifecycle.js';
import { IDataChannelService } from '../../../platform/dataChannel/common/dataChannel.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
let MainThreadDataChannels = class MainThreadDataChannels extends Disposable {
    constructor(extHostContext, _dataChannelService) {
        super();
        this._dataChannelService = _dataChannelService;
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDataChannels);
        this._register(this._dataChannelService.onDidSendData(e => {
            this._proxy.$onDidReceiveData(e.channelId, e.data);
        }));
    }
};
MainThreadDataChannels = __decorate([
    extHostNamedCustomer(MainContext.MainThreadDataChannels),
    __param(1, IDataChannelService)
], MainThreadDataChannels);
export { MainThreadDataChannels };
//# sourceMappingURL=mainThreadDataChannels.js.map