/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IDataChannelService } from '../../../../platform/dataChannel/common/dataChannel.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
export class DataChannelService extends Disposable {
    constructor() {
        super();
        this._onDidSendData = this._register(new Emitter());
        this.onDidSendData = this._onDidSendData.event;
    }
    getDataChannel(channelId) {
        return new CoreDataChannelImpl(channelId, this._onDidSendData);
    }
}
class CoreDataChannelImpl {
    constructor(channelId, _onDidSendData) {
        this.channelId = channelId;
        this._onDidSendData = _onDidSendData;
    }
    sendData(data) {
        this._onDidSendData.fire({
            channelId: this.channelId,
            data
        });
    }
}
registerSingleton(IDataChannelService, DataChannelService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=dataChannelService.js.map