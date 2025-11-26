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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE1jcFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvdGVzdC9jb21tb24vdGVzdE1jcFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRzNFLE1BQU0sT0FBTyxjQUFjO0lBQTNCO1FBRVEsWUFBTyxHQUFHLGVBQWUsQ0FBd0IsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBZ0IzRCx3QkFBbUIsR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLEVBQUUsS0FBSyxzQ0FBOEIsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUs5RyxDQUFDO0lBcEJBLFdBQVc7SUFFWCxDQUFDO0lBQ0QsVUFBVTtJQUVWLENBQUM7SUFFRCxlQUFlO0lBRWYsQ0FBQztJQUVELFNBQVM7UUFDUixPQUFPLGVBQWUsQ0FBbUIsSUFBSSxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLDJCQUEyQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbkgsQ0FBQztJQUlELG1CQUFtQjtRQUNsQixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMxQixDQUFDO0NBQ0QifQ==