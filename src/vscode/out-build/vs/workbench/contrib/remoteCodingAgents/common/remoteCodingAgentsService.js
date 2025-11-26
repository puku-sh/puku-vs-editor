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
import { Event } from '../../../../base/common/event.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
export const IRemoteCodingAgentsService = createDecorator('remoteCodingAgentsService');
let RemoteCodingAgentsService = class RemoteCodingAgentsService extends Disposable {
    constructor(contextKeyService) {
        super();
        this.contextKeyService = contextKeyService;
        this.agents = [];
        this.contextKeys = new Set();
        this._ctxHasRemoteCodingAgent = ChatContextKeys.hasRemoteCodingAgent.bindTo(this.contextKeyService);
        // Listen for context changes and re-evaluate agent availability
        this._register(Event.filter(contextKeyService.onDidChangeContext, e => e.affectsSome(this.contextKeys))(() => {
            this.updateContextKeys();
        }));
    }
    getRegisteredAgents() {
        return [...this.agents];
    }
    getAvailableAgents() {
        return this.agents.filter(agent => this.isAgentAvailable(agent));
    }
    registerAgent(agent) {
        // Check if agent already exists
        const existingIndex = this.agents.findIndex(a => a.id === agent.id);
        if (existingIndex >= 0) {
            // Update existing agent
            this.agents[existingIndex] = agent;
        }
        else {
            // Add new agent
            this.agents.push(agent);
        }
        // Track context keys from the when condition
        if (agent.when) {
            const whenExpr = ContextKeyExpr.deserialize(agent.when);
            if (whenExpr) {
                for (const key of whenExpr.keys()) {
                    this.contextKeys.add(key);
                }
            }
        }
        this.updateContextKeys();
    }
    isAgentAvailable(agent) {
        if (!agent.when) {
            return true;
        }
        const whenExpr = ContextKeyExpr.deserialize(agent.when);
        return !whenExpr || this.contextKeyService.contextMatchesRules(whenExpr);
    }
    updateContextKeys() {
        const hasAvailableAgent = this.getAvailableAgents().length > 0;
        this._ctxHasRemoteCodingAgent.set(hasAvailableAgent);
    }
};
RemoteCodingAgentsService = __decorate([
    __param(0, IContextKeyService)
], RemoteCodingAgentsService);
export { RemoteCodingAgentsService };
registerSingleton(IRemoteCodingAgentsService, RemoteCodingAgentsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=remoteCodingAgentsService.js.map