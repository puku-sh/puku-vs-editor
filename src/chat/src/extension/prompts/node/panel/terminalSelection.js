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
exports.TerminalSelection = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const terminalService_1 = require("../../../../platform/terminal/common/terminalService");
let TerminalSelection = class TerminalSelection extends prompt_tsx_1.PromptElement {
    constructor(props, _terminalService) {
        super(props);
        this._terminalService = _terminalService;
    }
    async prepare() {
        return this._terminalService.terminalSelection;
    }
    render(state, sizing) {
        if (state.trim().length === 0) {
            return (vscpp(vscppf, null,
                vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority }, "The active terminal has no selection.")));
        }
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority },
                "The active terminal's selection:",
                vscpp("br", null),
                state)));
    }
};
exports.TerminalSelection = TerminalSelection;
exports.TerminalSelection = TerminalSelection = __decorate([
    __param(1, terminalService_1.ITerminalService)
], TerminalSelection);
//# sourceMappingURL=terminalSelection.js.map