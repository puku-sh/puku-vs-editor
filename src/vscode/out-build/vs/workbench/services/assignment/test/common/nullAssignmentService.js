/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
export class NullWorkbenchAssignmentService {
    constructor() {
        this.onDidRefetchAssignments = Event.None;
    }
    async getCurrentExperiments() {
        return [];
    }
    async getTreatment(name) {
        return undefined;
    }
    addTelemetryAssignmentFilter(filter) { }
}
//# sourceMappingURL=nullAssignmentService.js.map