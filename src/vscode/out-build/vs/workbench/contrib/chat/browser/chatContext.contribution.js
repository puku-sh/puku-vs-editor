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
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IChatContextService } from './chatContextService.js';
import { isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
const extensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'chatContext',
    jsonSchema: {
        description: localize(5657, null),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: {
                    description: localize(5658, null),
                    type: 'string',
                },
                icon: {
                    description: localize(5659, null),
                    type: 'string'
                },
                displayName: {
                    description: localize(5660, null),
                    type: 'string'
                }
            },
            required: ['id', 'icon', 'displayName'],
        }
    }
});
let ChatContextContribution = class ChatContextContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatContextContribution'; }
    constructor(_chatContextService) {
        super();
        this._chatContextService = _chatContextService;
        extensionPoint.setHandler(extensions => {
            for (const ext of extensions) {
                if (!isProposedApiEnabled(ext.description, 'chatContextProvider')) {
                    continue;
                }
                if (!Array.isArray(ext.value)) {
                    continue;
                }
                for (const contribution of ext.value) {
                    const icon = contribution.icon ? ThemeIcon.fromString(contribution.icon) : undefined;
                    if (!icon) {
                        continue;
                    }
                    this._chatContextService.setChatContextProvider(`${ext.description.id}-${contribution.id}`, { title: contribution.displayName, icon });
                }
            }
        });
    }
};
ChatContextContribution = __decorate([
    __param(0, IChatContextService)
], ChatContextContribution);
export { ChatContextContribution };
registerWorkbenchContribution2(ChatContextContribution.ID, ChatContextContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=chatContext.contribution.js.map