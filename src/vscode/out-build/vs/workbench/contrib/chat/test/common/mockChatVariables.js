/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ResourceMap } from '../../../../../base/common/map.js';
export class MockChatVariablesService {
    constructor() {
        this._dynamicVariables = new ResourceMap();
        this._selectedToolAndToolSets = new ResourceMap();
    }
    getDynamicVariables(sessionResource) {
        return this._dynamicVariables.get(sessionResource) ?? [];
    }
    getSelectedToolAndToolSets(sessionResource) {
        return this._selectedToolAndToolSets.get(sessionResource) ?? new Map();
    }
    setDynamicVariables(sessionResource, variables) {
        this._dynamicVariables.set(sessionResource, variables);
    }
    setSelectedToolAndToolSets(sessionResource, tools) {
        this._selectedToolAndToolSets.set(sessionResource, tools);
    }
}
//# sourceMappingURL=mockChatVariables.js.map