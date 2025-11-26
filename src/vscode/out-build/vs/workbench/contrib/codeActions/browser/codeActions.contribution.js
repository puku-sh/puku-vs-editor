/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { CodeActionsContribution, editorConfiguration, notebookEditorConfiguration } from './codeActionsContribution.js';
Registry.as(Extensions.Configuration)
    .registerConfiguration(editorConfiguration);
Registry.as(Extensions.Configuration)
    .registerConfiguration(notebookEditorConfiguration);
Registry.as(WorkbenchExtensions.Workbench)
    .registerWorkbenchContribution(CodeActionsContribution, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=codeActions.contribution.js.map