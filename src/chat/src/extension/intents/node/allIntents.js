"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const descriptors_1 = require("../../../util/vs/platform/instantiation/common/descriptors");
const inlineChatIntent_1 = require("../../inlineChat/node/inlineChatIntent");
const intentRegistry_1 = require("../../prompt/node/intentRegistry");
const agentIntent_1 = require("./agentIntent");
const askAgentIntent_1 = require("./askAgentIntent");
const docIntent_1 = require("./docIntent");
const editCodeIntent_1 = require("./editCodeIntent");
const editCodeIntent2_1 = require("./editCodeIntent2");
const explainIntent_1 = require("./explainIntent");
const fixIntent_1 = require("./fixIntent");
const generateCodeIntent_1 = require("./generateCodeIntent");
const newIntent_1 = require("./newIntent");
const newNotebookIntent_contribution_1 = require("./newNotebookIntent.contribution");
const notebookEditorIntent_1 = require("./notebookEditorIntent");
const reviewIntent_1 = require("./reviewIntent");
const searchIntent_1 = require("./searchIntent");
const searchKeywordsIntent_1 = require("./searchKeywordsIntent");
const searchPanelIntent_1 = require("./searchPanelIntent");
const setupTests_1 = require("./setupTests");
const terminalExplainIntent_1 = require("./terminalExplainIntent");
const terminalIntent_1 = require("./terminalIntent");
const testIntent_1 = require("./testIntent/testIntent");
const unknownIntent_1 = require("./unknownIntent");
const vscodeIntent_1 = require("./vscodeIntent");
const workspaceIntent_1 = require("./workspaceIntent");
intentRegistry_1.IntentRegistry.setIntents([
    new descriptors_1.SyncDescriptor(docIntent_1.InlineDocIntent),
    new descriptors_1.SyncDescriptor(editCodeIntent_1.EditCodeIntent),
    new descriptors_1.SyncDescriptor(editCodeIntent2_1.EditCode2Intent),
    new descriptors_1.SyncDescriptor(agentIntent_1.AgentIntent),
    new descriptors_1.SyncDescriptor(searchIntent_1.SearchIntent),
    new descriptors_1.SyncDescriptor(workspaceIntent_1.WorkspaceIntent),
    new descriptors_1.SyncDescriptor(testIntent_1.TestsIntent),
    new descriptors_1.SyncDescriptor(fixIntent_1.FixIntent),
    new descriptors_1.SyncDescriptor(explainIntent_1.ExplainIntent),
    new descriptors_1.SyncDescriptor(reviewIntent_1.ReviewIntent),
    new descriptors_1.SyncDescriptor(terminalIntent_1.TerminalIntent),
    new descriptors_1.SyncDescriptor(terminalExplainIntent_1.TerminalExplainIntent),
    new descriptors_1.SyncDescriptor(unknownIntent_1.UnknownIntent),
    new descriptors_1.SyncDescriptor(generateCodeIntent_1.GenerateCodeIntent),
    new descriptors_1.SyncDescriptor(newNotebookIntent_contribution_1.NewNotebookIntent),
    new descriptors_1.SyncDescriptor(newIntent_1.NewWorkspaceIntent),
    new descriptors_1.SyncDescriptor(vscodeIntent_1.VscodeIntent),
    new descriptors_1.SyncDescriptor(setupTests_1.SetupTestsIntent),
    new descriptors_1.SyncDescriptor(searchPanelIntent_1.SearchPanelIntent),
    new descriptors_1.SyncDescriptor(searchKeywordsIntent_1.SearchKeywordsIntent),
    new descriptors_1.SyncDescriptor(askAgentIntent_1.AskAgentIntent),
    new descriptors_1.SyncDescriptor(notebookEditorIntent_1.NotebookEditorIntent),
    new descriptors_1.SyncDescriptor(inlineChatIntent_1.InlineChatIntent)
]);
//# sourceMappingURL=allIntents.js.map