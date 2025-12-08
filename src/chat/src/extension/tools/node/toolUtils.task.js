"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskRepresentation = getTaskRepresentation;
function getTaskRepresentation(task) {
    if ('label' in task) {
        return task.label;
    }
    else if ('script' in task) {
        return task.script;
    }
    else if ('command' in task) {
        return task.command;
    }
    return '';
}
//# sourceMappingURL=toolUtils.task.js.map