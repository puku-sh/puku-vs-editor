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
const path_1 = __importDefault(require("path"));
const context_1 = require("../../test/context");
const uri_1 = require("../../util/uri");
const repository_1 = require("../repository");
const instantiation_1 = require("../../../../../../../util/vs/platform/instantiation/common/instantiation");
suite('Extract repo info tests', function () {
    const baseFolder = { uri: (0, uri_1.makeFsUri)(path_1.default.resolve(__dirname, '../../../../../../../../')) };
    test('Extract repo info', async function () {
        const accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
        const info = await (0, repository_1.extractRepoInfo)(accessor, baseFolder.uri);
        assert_1.default.ok(info);
        // url and pathname get their own special treatment because they depend on how the repo was cloned.
        const { url, pathname, repoId, ...repoInfo } = info;
        assert_1.default.deepStrictEqual(repoInfo, {
            baseFolder,
            hostname: 'github.com'
        });
        assert_1.default.ok(repoId);
        assert_1.default.deepStrictEqual({ org: repoId.org, repo: repoId.repo, type: repoId.type }, { org: 'microsoft', repo: 'vscode-copilot-chat', type: 'github' });
        assert_1.default.ok([
            'git@github.com:microsoft/vscode-copilot-chat',
            'https://github.com/microsoft/vscode-copilot-chat',
            'https://github.com/microsoft/vscode-copilot-chat.git',
        ].includes(url), `url is ${url}`);
        assert_1.default.ok(pathname.startsWith('/github/vscode-copilot-chat') || pathname.startsWith('/microsoft/vscode-copilot-chat'));
        assert_1.default.deepStrictEqual(await (0, repository_1.extractRepoInfo)(accessor, 'file:///tmp/does/not/exist/.git/config'), undefined);
    });
    test('Extract repo info - Jupyter Notebook vscode-notebook-cell ', async function () {
        const cellUri = baseFolder.uri.replace(/^file:/, 'vscode-notebook-cell:');
        assert_1.default.ok(cellUri.startsWith('vscode-notebook-cell:'));
        const accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const info = await (0, repository_1.extractRepoInfo)(accessor, cellUri);
        assert_1.default.ok(info);
        // url and pathname get their own special treatment because they depend on how the repo was cloned.
        const { url, pathname, repoId, ...repoInfo } = info;
        assert_1.default.deepStrictEqual(repoInfo, {
            baseFolder,
            hostname: 'github.com'
        });
        assert_1.default.ok(repoId);
        assert_1.default.deepStrictEqual({ org: repoId.org, repo: repoId.repo, type: repoId.type }, { org: 'microsoft', repo: 'vscode-copilot-chat', type: 'github' });
        assert_1.default.ok([
            'git@github.com:microsoft/vscode-copilot-chat',
            'https://github.com/microsoft/vscode-copilot-chat',
            'https://github.com/microsoft/vscode-copilot-chat.git',
        ].includes(url), `url is ${url}`);
        assert_1.default.ok(pathname.startsWith('/github/vscode-copilot-chat') || pathname.startsWith('/microsoft/vscode-copilot-chat'));
        assert_1.default.deepStrictEqual(await instantiationService.invokeFunction(repository_1.extractRepoInfo, 'file:///tmp/does/not/exist/.git/config'), undefined);
    });
});
//# sourceMappingURL=repository.test.js.map