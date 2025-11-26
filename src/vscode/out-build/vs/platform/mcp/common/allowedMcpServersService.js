/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../base/common/lifecycle.js';
import * as nls from '../../../nls.js';
import { createCommandUri, MarkdownString } from '../../../base/common/htmlContent.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { Emitter } from '../../../base/common/event.js';
import { mcpAccessConfig } from './mcpManagement.js';
let AllowedMcpServersService = class AllowedMcpServersService extends Disposable {
    constructor(configurationService) {
        super();
        this.configurationService = configurationService;
        this._onDidChangeAllowedMcpServers = this._register(new Emitter());
        this.onDidChangeAllowedMcpServers = this._onDidChangeAllowedMcpServers.event;
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(mcpAccessConfig)) {
                this._onDidChangeAllowedMcpServers.fire();
            }
        }));
    }
    isAllowed(mcpServer) {
        if (this.configurationService.getValue(mcpAccessConfig) !== "none" /* McpAccessValue.None */) {
            return true;
        }
        const settingsCommandLink = createCommandUri('workbench.action.openSettings', { query: `@id:${mcpAccessConfig}` }).toString();
        return new MarkdownString(nls.localize(2176, null, settingsCommandLink));
    }
};
AllowedMcpServersService = __decorate([
    __param(0, IConfigurationService)
], AllowedMcpServersService);
export { AllowedMcpServersService };
//# sourceMappingURL=allowedMcpServersService.js.map