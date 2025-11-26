/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { ChatMode } from '../../common/chatModes.js';
export class MockChatModeService {
    constructor(_modes = { builtin: [ChatMode.Ask], custom: [] }) {
        this._modes = _modes;
        this.onDidChangeChatModes = Event.None;
    }
    getModes() {
        return this._modes;
    }
    findModeById(id) {
        return this._modes.builtin.find(mode => mode.id === id) ?? this._modes.custom.find(mode => mode.id === id);
    }
    findModeByName(name) {
        return this._modes.builtin.find(mode => mode.name.get() === name) ?? this._modes.custom.find(mode => mode.name.get() === name);
    }
}
//# sourceMappingURL=mockChatModeService.js.map