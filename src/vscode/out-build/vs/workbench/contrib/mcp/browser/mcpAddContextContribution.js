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
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, derived } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IChatContextPickService } from '../../chat/browser/chatContextPickService.js';
import { IMcpService } from '../common/mcpTypes.js';
import { McpResourcePickHelper } from './mcpResourceQuickAccess.js';
let McpAddContextContribution = class McpAddContextContribution extends Disposable {
    constructor(_chatContextPickService, _instantiationService, mcpService) {
        super();
        this._chatContextPickService = _chatContextPickService;
        this._instantiationService = _instantiationService;
        this._addContextMenu = this._register(new MutableDisposable());
        const hasServersWithResources = derived(reader => {
            let enabled = false;
            for (const server of mcpService.servers.read(reader)) {
                const cap = server.capabilities.read(undefined);
                if (cap === undefined) {
                    enabled = true; // until we know more
                }
                else if (cap & 16 /* McpCapability.Resources */) {
                    enabled = true;
                    break;
                }
            }
            return enabled;
        });
        this._register(autorun(reader => {
            const enabled = hasServersWithResources.read(reader);
            if (enabled && !this._addContextMenu.value) {
                this._registerAddContextMenu();
            }
            else {
                this._addContextMenu.clear();
            }
        }));
    }
    _registerAddContextMenu() {
        this._addContextMenu.value = this._chatContextPickService.registerChatContextItem({
            type: 'pickerPick',
            label: localize(9521, null),
            icon: Codicon.mcp,
            isEnabled(widget) {
                return !!widget.attachmentCapabilities.supportsMCPAttachments;
            },
            asPicker: () => {
                const helper = this._instantiationService.createInstance(McpResourcePickHelper);
                return {
                    placeholder: localize(9522, null),
                    picks: (_query, token) => this._getResourcePicks(token, helper),
                    goBack: () => {
                        return helper.navigateBack();
                    },
                    dispose: () => {
                        helper.dispose();
                    }
                };
            },
        });
    }
    _getResourcePicks(token, helper) {
        const picksObservable = helper.getPicks(token);
        return derived(this, reader => {
            const pickItems = picksObservable.read(reader);
            const picks = [];
            for (const [server, resources] of pickItems.picks) {
                if (resources.length === 0) {
                    continue;
                }
                picks.push(McpResourcePickHelper.sep(server));
                for (const resource of resources) {
                    picks.push({
                        ...McpResourcePickHelper.item(resource),
                        asAttachment: () => helper.toAttachment(resource, server)
                    });
                }
            }
            return { picks, busy: pickItems.isBusy };
        });
    }
};
McpAddContextContribution = __decorate([
    __param(0, IChatContextPickService),
    __param(1, IInstantiationService),
    __param(2, IMcpService)
], McpAddContextContribution);
export { McpAddContextContribution };
//# sourceMappingURL=mcpAddContextContribution.js.map