"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ITasksService = exports.TaskStatus = void 0;
const services_1 = require("../../../util/common/services");
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["Started"] = "started";
    TaskStatus["Error"] = "error";
    TaskStatus["Finished"] = "finished";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
exports.ITasksService = (0, services_1.createServiceIdentifier)('ITasksService');
//# sourceMappingURL=tasksService.js.map