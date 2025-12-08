"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Allow importing vscode here. eslint does not let us exclude this path: https://github.com/import-js/eslint-plugin-import/issues/2800
/* eslint-disable import/no-restricted-paths */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addExtensionHostSimulationServices = addExtensionHostSimulationServices;
const gitDiffService_1 = require("../../../src/extension/prompt/vscode-node/gitDiffService");
const extensionsService_1 = require("../../../src/platform/extensions/common/extensionsService");
const extensionsService_2 = require("../../../src/platform/extensions/vscode/extensionsService");
const fileSystemService_1 = require("../../../src/platform/filesystem/common/fileSystemService");
const fileSystemServiceImpl_1 = require("../../../src/platform/filesystem/vscode/fileSystemServiceImpl");
const gitDiffService_2 = require("../../../src/platform/git/common/gitDiffService");
const gitExtensionService_1 = require("../../../src/platform/git/common/gitExtensionService");
const gitExtensionServiceImpl_1 = require("../../../src/platform/git/vscode/gitExtensionServiceImpl");
const notebookService_1 = require("../../../src/platform/notebook/common/notebookService");
const notebookSummaryTracker_1 = require("../../../src/platform/notebook/common/notebookSummaryTracker");
const notebookServiceImpl_1 = require("../../../src/platform/notebook/vscode/notebookServiceImpl");
const notebookSummaryTrackerImpl_1 = require("../../../src/platform/notebook/vscode/notebookSummaryTrackerImpl");
const remoteRepositories_1 = require("../../../src/platform/remoteRepositories/vscode/remoteRepositories");
const searchService_1 = require("../../../src/platform/search/common/searchService");
const searchServiceImpl_1 = require("../../../src/platform/search/vscode-node/searchServiceImpl");
const tabsAndEditorsService_1 = require("../../../src/platform/tabs/common/tabsAndEditorsService");
const tabsAndEditorsServiceImpl_1 = require("../../../src/platform/tabs/vscode/tabsAndEditorsServiceImpl");
const terminalService_1 = require("../../../src/platform/terminal/common/terminalService");
const terminalServiceImpl_1 = require("../../../src/platform/terminal/vscode/terminalServiceImpl");
const descriptors_1 = require("../../../src/util/vs/platform/instantiation/common/descriptors");
/**
 * Adds a select number of 'real' services to the stest when they're running
 * in a real extension.
 */
async function addExtensionHostSimulationServices(builder) {
    builder.define(fileSystemService_1.IFileSystemService, new fileSystemServiceImpl_1.VSCodeFileSystemService());
    builder.define(notebookService_1.INotebookService, new descriptors_1.SyncDescriptor(notebookServiceImpl_1.NotebookService));
    builder.define(notebookSummaryTracker_1.INotebookSummaryTracker, new descriptors_1.SyncDescriptor(notebookSummaryTrackerImpl_1.NotebookSummaryTrackerImpl));
    builder.define(tabsAndEditorsService_1.ITabsAndEditorsService, new tabsAndEditorsServiceImpl_1.TabsAndEditorsServiceImpl());
    builder.define(terminalService_1.ITerminalService, new descriptors_1.SyncDescriptor(terminalServiceImpl_1.TerminalServiceImpl));
    // builder.define(IWorkspaceService, new SyncDescriptor(ExtensionTextDocumentManager));
    builder.define(extensionsService_1.IExtensionsService, new descriptors_1.SyncDescriptor(extensionsService_2.VSCodeExtensionsService));
    builder.define(remoteRepositories_1.IRemoteRepositoriesService, new remoteRepositories_1.RemoteRepositoriesService());
    builder.define(gitDiffService_2.IGitDiffService, new descriptors_1.SyncDescriptor(gitDiffService_1.GitDiffService));
    builder.define(gitExtensionService_1.IGitExtensionService, new descriptors_1.SyncDescriptor(gitExtensionServiceImpl_1.GitExtensionServiceImpl));
    builder.define(searchService_1.ISearchService, new descriptors_1.SyncDescriptor(searchServiceImpl_1.SearchServiceImpl));
}
//# sourceMappingURL=simulationExtHostContext.js.map