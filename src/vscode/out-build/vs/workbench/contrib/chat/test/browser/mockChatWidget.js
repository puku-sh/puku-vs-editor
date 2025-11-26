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
//# sourceMappingURL=mockChatWidget.js.map