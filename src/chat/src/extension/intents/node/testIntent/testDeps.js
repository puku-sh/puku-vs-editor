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
exports.TestDeps = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const testDepsResolver_1 = require("../../../../platform/testing/node/testDepsResolver");
const tag_1 = require("../../../prompts/node/base/tag");
let TestDeps = class TestDeps extends prompt_tsx_1.PromptElement {
    constructor(props, testDepsResolver) {
        super(props);
        this.testDepsResolver = testDepsResolver;
    }
    async render(state, sizing) {
        const { languageId } = this.props;
        const testFrameworks = await this.testDepsResolver.getTestDeps(languageId);
        return testFrameworks.length > 0 &&
            vscpp(tag_1.Tag, { name: 'testDependencies', priority: this.props.priority },
                "The project has the following testing dependencies: ",
                testFrameworks.join(', '),
                ".");
    }
};
exports.TestDeps = TestDeps;
exports.TestDeps = TestDeps = __decorate([
    __param(1, testDepsResolver_1.ITestDepsResolver)
], TestDeps);
//# sourceMappingURL=testDeps.js.map