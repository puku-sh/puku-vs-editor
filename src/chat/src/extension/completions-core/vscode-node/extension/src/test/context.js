"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExtensionTestingContext = createExtensionTestingContext;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const descriptors_1 = require("../../../../../../util/vs/platform/instantiation/common/descriptors");
const services_1 = require("../../../../../test/vscode-node/services");
const config_1 = require("../../../lib/src/config");
const fileSystem_1 = require("../../../lib/src/fileSystem");
const networking_1 = require("../../../lib/src/networking");
const context_1 = require("../../../lib/src/test/context");
const fetcher_1 = require("../../../lib/src/test/fetcher");
const textDocumentManager_1 = require("../../../lib/src/textDocumentManager");
const config_2 = require("../config");
const extensionStatus_1 = require("../extensionStatus");
const fileSystem_2 = require("../fileSystem");
const textDocumentManager_2 = require("../textDocumentManager");
const config_3 = require("./config");
/**
 * A default context for VSCode extension testing, building on general one in `lib`.
 * Only includes items that are needed for almost all extension tests.
 */
function createExtensionTestingContext() {
    let serviceCollection = (0, services_1.createExtensionTestingServices)();
    serviceCollection = (0, context_1._createBaselineContext)(serviceCollection, new config_3.ExtensionTestConfigProvider());
    serviceCollection.define(networking_1.ICompletionsFetcherService, new fetcher_1.StaticFetcher());
    serviceCollection.define(config_1.ICompletionsEditorAndPluginInfo, new config_2.VSCodeEditorInfo());
    serviceCollection.define(textDocumentManager_1.ICompletionsTextDocumentManagerService, new descriptors_1.SyncDescriptor(textDocumentManager_2.ExtensionTextDocumentManager));
    serviceCollection.define(fileSystem_1.ICompletionsFileSystemService, fileSystem_2.extensionFileSystem);
    serviceCollection.define(extensionStatus_1.ICompletionsExtensionStatus, new extensionStatus_1.CopilotExtensionStatus());
    return serviceCollection;
}
//# sourceMappingURL=context.js.map