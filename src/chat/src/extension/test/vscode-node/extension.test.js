"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const vscode_1 = require("vscode");
const contributions_1 = require("../../extension/vscode-node/contributions");
const services_1 = require("../../extension/vscode-node/services");
const extension_1 = require("../../extension/vscode/extension");
suite('Extension tests', function () {
    let disposables = [];
    teardown(() => {
        disposables.forEach(d => d.dispose());
        disposables = [];
    });
    test('can create production context', async function () {
        const globalState = {
            get: () => undefined,
            update: () => Promise.resolve(),
            keys: () => [],
        };
        const extensionContext = {
            extensionMode: vscode_1.ExtensionMode.Production,
            extension: {
                packageJSON: {
                    name: 'copilot',
                },
            },
            globalState,
            subscriptions: [],
        };
        const accessor = (0, extension_1.createInstantiationService)({
            context: extensionContext,
            contributions: contributions_1.vscodeNodeContributions,
            registerServices: services_1.registerServices
        });
        disposables.push(accessor);
        assert_1.default.ok(accessor);
    });
    // TODO@lramos15 has to be skipped, when we don't have a token, because
    // of the eventual call to `getOrCreateTestingCopilotTokenManager` which
    // requires a token in a sync fashion.
    test.skip('can create test context', async function () {
        const extensionContext = {
            extensionMode: vscode_1.ExtensionMode.Test,
            subscriptions: [],
            extension: {
                id: 'copilot.extension-test',
                packageJSON: {},
            },
        };
        const accessor = (0, extension_1.createInstantiationService)({
            context: extensionContext,
            contributions: contributions_1.vscodeNodeContributions,
            registerServices: services_1.registerServices
        });
        disposables.push(accessor);
        assert_1.default.ok(accessor);
    });
});
//# sourceMappingURL=extension.test.js.map