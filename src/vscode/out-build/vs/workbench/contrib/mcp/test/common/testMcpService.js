/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { observableValue } from '../../../../../base/common/observable.js';
export class TestMcpService {
    constructor() {
        this.servers = observableValue(this, []);
        this.lazyCollectionState = observableValue(this, { state: 2 /* LazyCollectionState.AllKnown */, collections: [] });
    }
    resetCaches() {
    }
    resetTrust() {
    }
    cancelAutostart() {
    }
    autostart() {
        return observableValue(this, { working: false, starting: [], serversRequiringInteraction: [] });
    }
    activateCollections() {
        return Promise.resolve();
    }
}
//# sourceMappingURL=testMcpService.js.map