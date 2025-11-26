/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
export class MockChatWidgetService {
    constructor() {
        this.onDidAddWidget = Event.None;
    }
    getWidgetByInputUri(uri) {
        return undefined;
    }
    getWidgetBySessionResource(sessionResource) {
        return undefined;
    }
    getWidgetsByLocations(location) {
        return [];
    }
    revealWidget(preserveFocus) {
        return Promise.resolve(undefined);
    }
    reveal(widget, preserveFocus) {
        return Promise.resolve(true);
    }
    getAllWidgets() {
        throw new Error('Method not implemented.');
    }
    openSession(sessionResource) {
        throw new Error('Method not implemented.');
    }
    register(newWidget) {
        return Disposable.None;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0NoYXRXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvYnJvd3Nlci9tb2NrQ2hhdFdpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBS2xGLE1BQU0sT0FBTyxxQkFBcUI7SUFBbEM7UUFDVSxtQkFBYyxHQUF1QixLQUFLLENBQUMsSUFBSSxDQUFDO0lBd0MxRCxDQUFDO0lBL0JBLG1CQUFtQixDQUFDLEdBQVE7UUFDM0IsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELDBCQUEwQixDQUFDLGVBQW9CO1FBQzlDLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxRQUEyQjtRQUNoRCxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxZQUFZLENBQUMsYUFBdUI7UUFDbkMsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBbUIsRUFBRSxhQUF1QjtRQUNsRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVELGFBQWE7UUFDWixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELFdBQVcsQ0FBQyxlQUFvQjtRQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELFFBQVEsQ0FBQyxTQUFzQjtRQUM5QixPQUFPLFVBQVUsQ0FBQyxJQUFJLENBQUM7SUFDeEIsQ0FBQztDQUNEIn0=