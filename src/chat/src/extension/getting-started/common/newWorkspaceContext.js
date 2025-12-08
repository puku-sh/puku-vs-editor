"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEW_WORKSPACE_STORAGE_KEY = void 0;
exports.saveNewWorkspaceContext = saveNewWorkspaceContext;
exports.NEW_WORKSPACE_STORAGE_KEY = 'copilot.newWorkspaceAgent.workspaceContexts';
function saveNewWorkspaceContext(add, extensionContext) {
    const contexts = extensionContext.globalState.get(exports.NEW_WORKSPACE_STORAGE_KEY, []);
    const idx = contexts.findIndex(context => context.workspaceURI === add.workspaceURI);
    if (idx >= 0) {
        contexts.splice(idx, 1);
    }
    contexts.unshift(add);
    while (contexts.length > 30) {
        contexts.pop();
    }
    extensionContext.globalState.update(exports.NEW_WORKSPACE_STORAGE_KEY, contexts);
}
//# sourceMappingURL=newWorkspaceContext.js.map