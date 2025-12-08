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
exports.CommandServiceImpl = exports.ICommandService = void 0;
const services_1 = require("../../../util/common/services");
const intentService_1 = require("../../intents/node/intentService");
exports.ICommandService = (0, services_1.createServiceIdentifier)('ICommandService');
let CommandServiceImpl = class CommandServiceImpl {
    constructor(intentService) {
        this.intentService = intentService;
    }
    getCommands(location) {
        return this.intentService.getIntents(location)
            .filter(candidate => !candidate.commandInfo || !candidate.commandInfo.hiddenFromUser)
            .map(intent => ({ commandId: intent.id, intent, details: intent.description, locations: intent.locations, toolEquivalent: intent.commandInfo?.toolEquivalent }));
    }
    getCommand(id, location) {
        return this.getCommands(location).find(c => c.commandId === id);
    }
};
exports.CommandServiceImpl = CommandServiceImpl;
exports.CommandServiceImpl = CommandServiceImpl = __decorate([
    __param(0, intentService_1.IIntentService)
], CommandServiceImpl);
//# sourceMappingURL=commandService.js.map