"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const newWorkspaceInitializer_1 = require("./newWorkspaceInitializer");
function create(accessor) {
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    const disposableStore = new lifecycle_1.DisposableStore();
    disposableStore.add(instantiationService.createInstance(newWorkspaceInitializer_1.NewWorkspaceInitializer));
    return disposableStore;
}
//# sourceMappingURL=newWorkspace.contribution.js.map