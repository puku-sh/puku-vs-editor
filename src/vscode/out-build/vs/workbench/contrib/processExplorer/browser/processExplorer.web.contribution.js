/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { EditorExtensions } from '../../../common/editor.js';
import { ProcessExplorerEditorInput } from './processExplorerEditorInput.js';
import { ProcessExplorerEditor } from './processExplorerEditor.js';
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(ProcessExplorerEditor, ProcessExplorerEditor.ID, localize(11126, null)), [new SyncDescriptor(ProcessExplorerEditorInput)]);
//# sourceMappingURL=processExplorer.web.contribution.js.map