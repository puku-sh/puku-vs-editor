"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolCategories = exports.byokEditToolNamesToToolNames = exports.ContributedToolName = exports.ToolName = exports.ToolCategory = void 0;
exports.getContributedToolName = getContributedToolName;
exports.getToolName = getToolName;
exports.mapContributedToolNamesInString = mapContributedToolNamesInString;
exports.mapContributedToolNamesInSchema = mapContributedToolNamesInSchema;
exports.getToolCategory = getToolCategory;
exports.getToolsForCategory = getToolsForCategory;
const objects_1 = require("../../../util/vs/base/common/objects");
/**
 * Categories for tool grouping in the virtual tools system
 */
var ToolCategory;
(function (ToolCategory) {
    ToolCategory["JupyterNotebook"] = "Jupyter Notebook Tools";
    ToolCategory["WebInteraction"] = "Web Interaction";
    ToolCategory["VSCodeInteraction"] = "VS Code Interaction";
    ToolCategory["Testing"] = "Testing";
    ToolCategory["RedundantButSpecific"] = "Redundant but Specific";
    // Core tools that should not be grouped
    ToolCategory["Core"] = "Core";
})(ToolCategory || (exports.ToolCategory = ToolCategory = {}));
var ToolName;
(function (ToolName) {
    ToolName["ApplyPatch"] = "apply_patch";
    ToolName["Codebase"] = "semantic_search";
    ToolName["VSCodeAPI"] = "get_vscode_api";
    ToolName["TestFailure"] = "test_failure";
    ToolName["RunTests"] = "run_tests";
    ToolName["FindFiles"] = "file_search";
    ToolName["FindTextInFiles"] = "grep_search";
    ToolName["ReadFile"] = "read_file";
    ToolName["ListDirectory"] = "list_dir";
    ToolName["GetErrors"] = "get_errors";
    ToolName["GetScmChanges"] = "get_changed_files";
    ToolName["UpdateUserPreferences"] = "update_user_preferences";
    ToolName["ReadProjectStructure"] = "read_project_structure";
    ToolName["CreateNewWorkspace"] = "create_new_workspace";
    ToolName["CreateNewJupyterNotebook"] = "create_new_jupyter_notebook";
    ToolName["SearchWorkspaceSymbols"] = "search_workspace_symbols";
    ToolName["Usages"] = "list_code_usages";
    ToolName["EditFile"] = "insert_edit_into_file";
    ToolName["CreateFile"] = "create_file";
    ToolName["ReplaceString"] = "replace_string_in_file";
    ToolName["MultiReplaceString"] = "multi_replace_string_in_file";
    ToolName["EditNotebook"] = "edit_notebook_file";
    ToolName["RunNotebookCell"] = "run_notebook_cell";
    ToolName["GetNotebookSummary"] = "puku_getNotebookSummary";
    ToolName["ReadCellOutput"] = "read_notebook_cell_output";
    ToolName["InstallExtension"] = "install_extension";
    ToolName["FetchWebPage"] = "fetch_webpage";
    ToolName["Memory"] = "memory";
    ToolName["FindTestFiles"] = "test_search";
    ToolName["GetProjectSetupInfo"] = "get_project_setup_info";
    ToolName["SearchViewResults"] = "get_search_view_results";
    ToolName["DocInfo"] = "get_doc_info";
    ToolName["GithubRepo"] = "github_repo";
    ToolName["SimpleBrowser"] = "open_simple_browser";
    ToolName["CreateDirectory"] = "create_directory";
    ToolName["RunVscodeCmd"] = "run_vscode_command";
    ToolName["CoreManageTodoList"] = "manage_todo_list";
    ToolName["CoreRunInTerminal"] = "run_in_terminal";
    ToolName["CoreGetTerminalOutput"] = "get_terminal_output";
    ToolName["CoreTerminalSelection"] = "terminal_selection";
    ToolName["CoreTerminalLastCommand"] = "terminal_last_command";
    ToolName["CoreCreateAndRunTask"] = "create_and_run_task";
    ToolName["CoreRunTask"] = "run_task";
    ToolName["CoreGetTaskOutput"] = "get_task_output";
    ToolName["CoreRunTest"] = "runTests";
    ToolName["ToolReplay"] = "tool_replay";
    ToolName["EditFilesPlaceholder"] = "edit_files";
    ToolName["CoreRunSubagent"] = "runSubagent";
    ToolName["CoreConfirmationTool"] = "vscode_get_confirmation";
    ToolName["CoreTerminalConfirmationTool"] = "vscode_get_terminal_confirmation";
})(ToolName || (exports.ToolName = ToolName = {}));
var ContributedToolName;
(function (ContributedToolName) {
    ContributedToolName["ApplyPatch"] = "puku_applyPatch";
    ContributedToolName["Codebase"] = "puku_searchCodebase";
    ContributedToolName["SearchWorkspaceSymbols"] = "puku_searchWorkspaceSymbols";
    ContributedToolName["Usages"] = "puku_listCodeUsages";
    ContributedToolName["UpdateUserPreferences"] = "puku_updateUserPreferences";
    ContributedToolName["VSCodeAPI"] = "puku_getVSCodeAPI";
    ContributedToolName["TestFailure"] = "puku_testFailure";
    /** @deprecated moving to core soon */
    ContributedToolName["RunTests"] = "puku_runTests1";
    ContributedToolName["FindFiles"] = "puku_findFiles";
    ContributedToolName["FindTextInFiles"] = "puku_findTextInFiles";
    ContributedToolName["ReadFile"] = "puku_readFile";
    ContributedToolName["ListDirectory"] = "puku_listDirectory";
    ContributedToolName["GetErrors"] = "puku_getErrors";
    ContributedToolName["DocInfo"] = "puku_getDocInfo";
    ContributedToolName["GetScmChanges"] = "puku_getChangedFiles";
    ContributedToolName["ReadProjectStructure"] = "puku_readProjectStructure";
    ContributedToolName["CreateNewWorkspace"] = "puku_createNewWorkspace";
    ContributedToolName["CreateNewJupyterNotebook"] = "puku_createNewJupyterNotebook";
    ContributedToolName["EditFile"] = "puku_insertEdit";
    ContributedToolName["CreateFile"] = "puku_createFile";
    ContributedToolName["ReplaceString"] = "puku_replaceString";
    ContributedToolName["MultiReplaceString"] = "puku_multiReplaceString";
    ContributedToolName["EditNotebook"] = "puku_editNotebook";
    ContributedToolName["RunNotebookCell"] = "puku_runNotebookCell";
    ContributedToolName["GetNotebookSummary"] = "puku_getNotebookSummary";
    ContributedToolName["ReadCellOutput"] = "puku_readNotebookCellOutput";
    ContributedToolName["InstallExtension"] = "puku_installExtension";
    ContributedToolName["FetchWebPage"] = "puku_fetchWebPage";
    ContributedToolName["Memory"] = "puku_memory";
    ContributedToolName["FindTestFiles"] = "puku_findTestFiles";
    ContributedToolName["GetProjectSetupInfo"] = "puku_getProjectSetupInfo";
    ContributedToolName["SearchViewResults"] = "puku_getSearchResults";
    ContributedToolName["GithubRepo"] = "puku_githubRepo";
    ContributedToolName["CreateAndRunTask"] = "puku_createAndRunTask";
    ContributedToolName["SimpleBrowser"] = "puku_openSimpleBrowser";
    ContributedToolName["CreateDirectory"] = "puku_createDirectory";
    ContributedToolName["RunVscodeCmd"] = "puku_runVscodeCommand";
    ContributedToolName["ToolReplay"] = "puku_toolReplay";
    ContributedToolName["EditFilesPlaceholder"] = "puku_editFiles";
})(ContributedToolName || (exports.ContributedToolName = ContributedToolName = {}));
exports.byokEditToolNamesToToolNames = {
    'find-replace': ToolName.ReplaceString,
    'multi-find-replace': ToolName.MultiReplaceString,
    'apply-patch': ToolName.ApplyPatch,
    'code-rewrite': ToolName.EditFile,
};
const toolNameToContributedToolNames = new Map();
const contributedToolNameToToolNames = new Map();
for (const [contributedNameKey, contributedName] of Object.entries(ContributedToolName)) {
    const toolName = ToolName[contributedNameKey];
    if (toolName) {
        toolNameToContributedToolNames.set(toolName, contributedName);
        contributedToolNameToToolNames.set(contributedName, toolName);
    }
}
function getContributedToolName(name) {
    return toolNameToContributedToolNames.get(name) ?? name;
}
function getToolName(name) {
    return contributedToolNameToToolNames.get(name) ?? name;
}
function mapContributedToolNamesInString(str) {
    contributedToolNameToToolNames.forEach((value, key) => {
        const re = new RegExp(`\\b${key}\\b`, 'g');
        str = str.replace(re, value);
    });
    return str;
}
function mapContributedToolNamesInSchema(inputSchema) {
    return (0, objects_1.cloneAndChange)(inputSchema, value => typeof value === 'string' ? mapContributedToolNamesInString(value) : undefined);
}
/**
 * Type-safe mapping of all ToolName enum values to their categories.
 * This ensures that every tool is properly categorized and provides compile-time safety.
 * When new tools are added to ToolName, they must be added here or TypeScript will error.
 */
exports.toolCategories = {
    // Core tools (not grouped - expanded by default)
    [ToolName.Codebase]: ToolCategory.Core,
    [ToolName.FindTextInFiles]: ToolCategory.Core,
    [ToolName.ReadFile]: ToolCategory.Core,
    [ToolName.CreateFile]: ToolCategory.Core,
    [ToolName.ApplyPatch]: ToolCategory.Core,
    [ToolName.ReplaceString]: ToolCategory.Core,
    [ToolName.EditFile]: ToolCategory.Core,
    [ToolName.CoreRunInTerminal]: ToolCategory.Core,
    [ToolName.ListDirectory]: ToolCategory.Core,
    [ToolName.CoreGetTerminalOutput]: ToolCategory.Core,
    [ToolName.CoreManageTodoList]: ToolCategory.Core,
    [ToolName.MultiReplaceString]: ToolCategory.Core,
    [ToolName.FindFiles]: ToolCategory.Core,
    [ToolName.CreateDirectory]: ToolCategory.Core,
    [ToolName.ReadProjectStructure]: ToolCategory.Core,
    [ToolName.CoreRunSubagent]: ToolCategory.Core,
    [ToolName.Memory]: ToolCategory.Core,
    // already enabled only when tasks are enabled
    [ToolName.CoreRunTask]: ToolCategory.Core,
    [ToolName.CoreGetTaskOutput]: ToolCategory.Core,
    // never enabled, so it doesn't matter where it's categorized
    [ToolName.EditFilesPlaceholder]: ToolCategory.Core,
    // Jupyter Notebook Tools
    [ToolName.CreateNewJupyterNotebook]: ToolCategory.JupyterNotebook,
    [ToolName.EditNotebook]: ToolCategory.JupyterNotebook,
    [ToolName.RunNotebookCell]: ToolCategory.JupyterNotebook,
    [ToolName.GetNotebookSummary]: ToolCategory.JupyterNotebook,
    [ToolName.ReadCellOutput]: ToolCategory.JupyterNotebook,
    // Web Interaction
    [ToolName.FetchWebPage]: ToolCategory.WebInteraction,
    [ToolName.SimpleBrowser]: ToolCategory.WebInteraction,
    [ToolName.GithubRepo]: ToolCategory.WebInteraction,
    // VS Code Interaction
    [ToolName.SearchWorkspaceSymbols]: ToolCategory.VSCodeInteraction,
    [ToolName.Usages]: ToolCategory.VSCodeInteraction,
    [ToolName.GetErrors]: ToolCategory.VSCodeInteraction,
    [ToolName.VSCodeAPI]: ToolCategory.VSCodeInteraction,
    [ToolName.GetScmChanges]: ToolCategory.VSCodeInteraction,
    [ToolName.CreateNewWorkspace]: ToolCategory.VSCodeInteraction,
    [ToolName.InstallExtension]: ToolCategory.VSCodeInteraction,
    [ToolName.GetProjectSetupInfo]: ToolCategory.VSCodeInteraction,
    [ToolName.CoreCreateAndRunTask]: ToolCategory.VSCodeInteraction,
    [ToolName.RunVscodeCmd]: ToolCategory.VSCodeInteraction,
    [ToolName.SearchViewResults]: ToolCategory.VSCodeInteraction,
    [ToolName.CoreTerminalSelection]: ToolCategory.VSCodeInteraction,
    [ToolName.CoreTerminalLastCommand]: ToolCategory.VSCodeInteraction,
    // Testing
    [ToolName.RunTests]: ToolCategory.Testing,
    [ToolName.TestFailure]: ToolCategory.Testing,
    [ToolName.FindTestFiles]: ToolCategory.Testing,
    [ToolName.CoreRunTest]: ToolCategory.Testing,
    // Redundant but Specific
    [ToolName.DocInfo]: ToolCategory.RedundantButSpecific,
    // Other tools - categorize appropriately
    [ToolName.UpdateUserPreferences]: ToolCategory.VSCodeInteraction,
    [ToolName.ToolReplay]: ToolCategory.RedundantButSpecific,
    [ToolName.CoreConfirmationTool]: ToolCategory.VSCodeInteraction,
    [ToolName.CoreTerminalConfirmationTool]: ToolCategory.VSCodeInteraction,
};
/**
 * Get the category for a tool, checking both ToolName enum and external tools.
 */
function getToolCategory(toolName) {
    return exports.toolCategories.hasOwnProperty(toolName) ? exports.toolCategories[toolName] : undefined;
}
/**
 * Get all tools for a specific category.
 */
function getToolsForCategory(category) {
    const result = [];
    // Add tools from ToolName enum
    for (const [toolName, toolCategory] of Object.entries(exports.toolCategories)) {
        if (toolCategory === category) {
            result.push(toolName);
        }
    }
    return result;
}
//# sourceMappingURL=toolNames.js.map