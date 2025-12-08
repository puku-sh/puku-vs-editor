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
exports.ProjectLabels = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const promptWorkspaceLabels_1 = require("../../../context/node/resolvers/promptWorkspaceLabels");
const promptElement_1 = require("../base/promptElement");
const tag_1 = require("../base/tag");
let ProjectLabels = class ProjectLabels extends prompt_tsx_1.PromptElement {
    constructor(props, workspaceLabels) {
        super(props);
        this.workspaceLabels = workspaceLabels;
    }
    async render(state, sizing) {
        await this.workspaceLabels.collectContext();
        const labels = this.workspaceLabels.labels;
        if (labels.length === 0) {
            return undefined;
        }
        if (this.props.embeddedInsideUserMessage ?? promptElement_1.embeddedInsideUserMessageDefault) {
            return (vscpp(tag_1.Tag, { name: 'projectLabels', priority: this.props.priority }, this._render(labels)));
        }
        return (vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority }, this._render(labels)));
    }
    _render(labels) {
        return (vscpp(vscppf, null,
            "I am working on a project of the following nature:",
            vscpp("br", null),
            labels.reduce((prev, curr) => `${prev}\n- ${curr}`, '').trim()));
    }
};
exports.ProjectLabels = ProjectLabels;
exports.ProjectLabels = ProjectLabels = __decorate([
    __param(1, promptWorkspaceLabels_1.IPromptWorkspaceLabels)
], ProjectLabels);
//# sourceMappingURL=projectLabels.js.map