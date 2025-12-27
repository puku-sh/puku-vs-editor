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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRNb2RlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vbW9ja0NoYXRNb2RlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBK0IsTUFBTSwyQkFBMkIsQ0FBQztBQUVsRixNQUFNLE9BQU8sbUJBQW1CO0lBSy9CLFlBQTZCLFNBQTBFLEVBQUUsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7UUFBakgsV0FBTSxHQUFOLE1BQU0sQ0FBMkc7UUFGOUgseUJBQW9CLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQztJQUVnRyxDQUFDO0lBRW5KLFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVELFlBQVksQ0FBQyxFQUFVO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzVHLENBQUM7SUFFRCxjQUFjLENBQUMsSUFBWTtRQUMxQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxJQUFJLENBQUMsQ0FBQztJQUNoSSxDQUFDO0NBQ0QifQ==