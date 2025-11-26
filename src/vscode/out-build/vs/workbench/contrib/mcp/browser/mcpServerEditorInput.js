/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { join } from '../../../../base/common/path.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
const MCPServerEditorIcon = registerIcon('mcp-server-editor-icon', Codicon.mcp, localize(9783, null));
export class McpServerEditorInput extends EditorInput {
    static { this.ID = 'workbench.mcpServer.input2'; }
    get typeId() {
        return McpServerEditorInput.ID;
    }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */;
    }
    get resource() {
        return URI.from({
            scheme: Schemas.extension,
            path: join(this.mcpServer.id, 'mcpServer')
        });
    }
    constructor(_mcpServer) {
        super();
        this._mcpServer = _mcpServer;
    }
    get mcpServer() { return this._mcpServer; }
    getName() {
        return localize(9784, null, this._mcpServer.label);
    }
    getIcon() {
        return MCPServerEditorIcon;
    }
    matches(other) {
        if (super.matches(other)) {
            return true;
        }
        return other instanceof McpServerEditorInput && this._mcpServer.id === other._mcpServer.id;
    }
}
//# sourceMappingURL=mcpServerEditorInput.js.map