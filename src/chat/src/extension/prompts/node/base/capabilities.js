"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Capabilities = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commandService_1 = require("../../../commands/node/commandService");
const constants_1 = require("../../../common/constants");
const promptRenderer_1 = require("./promptRenderer");
let Capabilities = class Capabilities extends prompt_tsx_1.PromptElement {
    constructor(props, commandService, promptEndpoint) {
        super(props);
        this.commandService = commandService;
        this.promptEndpoint = promptEndpoint;
    }
    getIntentDescription(id) {
        const intent = this.commandService.getCommand(id, this.props.location)?.intent;
        return !intent || intent.isListedCapability === false ? undefined : intent.description;
    }
    async prepare() {
        const seen = new Set();
        const commandDescriptions = Object.entries(constants_1.agentsToCommands).reduce((prev, [agent, commands]) => {
            const intent = this.getIntentDescription(agent);
            if (intent && seen.has(intent)) {
                return prev;
            }
            if (intent) {
                seen.has(intent);
                prev += `\n* ${intent}`;
            }
            for (const command of Object.values(commands)) {
                const commandDescription = this.getIntentDescription(command);
                if (commandDescription) {
                    prev += `\n* ${commandDescription}`;
                }
            }
            return prev;
        }, '');
        return {
            modelName: this.promptEndpoint.name,
            commandDescriptions,
        };
    }
    render(state) {
        return (vscpp(vscppf, null,
            "You can answer general programming questions and perform the following tasks: ",
            state.commandDescriptions,
            vscpp("br", null),
            "You use the ",
            state.modelName,
            " large language model."));
    }
};
exports.Capabilities = Capabilities;
exports.Capabilities = Capabilities = __decorate([
    __param(1, commandService_1.ICommandService),
    __param(2, promptRenderer_1.IPromptEndpoint)
], Capabilities);
//# sourceMappingURL=capabilities.js.map