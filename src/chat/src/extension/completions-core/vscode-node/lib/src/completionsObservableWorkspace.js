"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletionsObservableWorkspace = exports.ICompletionsObservableWorkspace = void 0;
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeWorkspace_1 = require("../../../../inlineEdits/vscode-node/parts/vscodeWorkspace");
exports.ICompletionsObservableWorkspace = (0, instantiation_1.createDecorator)('ICompletionsObservableWorkspace');
class CompletionsObservableWorkspace extends vscodeWorkspace_1.VSCodeWorkspace {
}
exports.CompletionsObservableWorkspace = CompletionsObservableWorkspace;
//# sourceMappingURL=completionsObservableWorkspace.js.map