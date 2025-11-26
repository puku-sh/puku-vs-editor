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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { IRemoteCodingAgentsService } from '../common/remoteCodingAgentsService.js';
const extensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'remoteCodingAgents',
    jsonSchema: {
        description: localize(11380, null),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: {
                    description: localize(11381, null),
                    type: 'string',
                },
                command: {
                    description: localize(11382, null),
                    type: 'string'
                },
                displayName: {
                    description: localize(11383, null),
                    type: 'string'
                },
                description: {
                    description: localize(11384, null),
                    type: 'string'
                },
                followUpRegex: {
                    description: localize(11385, null),
                    type: 'string',
                },
                when: {
                    description: localize(11386, null),
                    type: 'string'
                },
            },
            required: ['command', 'displayName'],
        }
    }
});
let RemoteCodingAgentsContribution = class RemoteCodingAgentsContribution extends Disposable {
    constructor(remoteCodingAgentsService) {
        super();
        this.remoteCodingAgentsService = remoteCodingAgentsService;
        extensionPoint.setHandler(extensions => {
            for (const ext of extensions) {
                if (!isProposedApiEnabled(ext.description, 'remoteCodingAgents')) {
                    continue;
                }
                if (!Array.isArray(ext.value)) {
                    continue;
                }
                for (const contribution of ext.value) {
                    const command = MenuRegistry.getCommand(contribution.command);
                    if (!command) {
                        continue;
                    }
                    const agent = {
                        id: contribution.id,
                        command: contribution.command,
                        displayName: contribution.displayName,
                        description: contribution.description,
                        followUpRegex: contribution.followUpRegex,
                        when: contribution.when
                    };
                    this.remoteCodingAgentsService.registerAgent(agent);
                }
            }
        });
    }
};
RemoteCodingAgentsContribution = __decorate([
    __param(0, IRemoteCodingAgentsService)
], RemoteCodingAgentsContribution);
export { RemoteCodingAgentsContribution };
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(RemoteCodingAgentsContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=remoteCodingAgents.contribution.js.map