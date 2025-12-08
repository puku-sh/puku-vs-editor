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
const vitest_1 = require("vitest");
const utils_1 = require("../../common/utils");
(0, vitest_1.suite)('formatScopingQuery', () => {
    (0, vitest_1.test)('should format a scoping query with only a repo', () => {
        const query = { repo: 'owner/repo' };
        const result = (0, utils_1.formatScopingQuery)(query);
        assert_1.default.strictEqual(result, '(repo:owner/repo)');
    });
    (0, vitest_1.test)('should format a scoping query with multiple repos', () => {
        const query = { repo: ['owner/repo', 'owner/repo2'] };
        const result = (0, utils_1.formatScopingQuery)(query);
        assert_1.default.strictEqual(result, '(repo:owner/repo OR repo:owner/repo2)');
    });
    (0, vitest_1.test)('should format a scoping query with a repo and a language', () => {
        const query = { repo: 'owner/repo', lang: ['typescript', 'javascript'] };
        const result = (0, utils_1.formatScopingQuery)(query);
        assert_1.default.strictEqual(result, '(repo:owner/repo) (lang:typescript OR lang:javascript)');
    });
    (0, vitest_1.test)('should format a scoping query with a repo and a notLang', () => {
        const query = { repo: 'owner/repo', notLang: ['python', 'ruby'] };
        const result = (0, utils_1.formatScopingQuery)(query);
        assert_1.default.strictEqual(result, '(repo:owner/repo) NOT (lang:python OR lang:ruby)');
    });
    (0, vitest_1.test)('should format a scoping query with a repo and a path', () => {
        const query = { repo: 'owner/repo', path: ['src', 'test'] };
        const result = (0, utils_1.formatScopingQuery)(query);
        assert_1.default.strictEqual(result, '(repo:owner/repo) (path:src OR path:test)');
    });
    (0, vitest_1.test)('should format a scoping query with a repo and a notPath', () => {
        const query = { repo: 'owner/repo', notPath: ['node_modules', 'dist'] };
        const result = (0, utils_1.formatScopingQuery)(query);
        assert_1.default.strictEqual(result, '(repo:owner/repo) NOT (path:node_modules OR path:dist)');
    });
    (0, vitest_1.test)('should format a scoping query with all options', () => {
        const query = {
            repo: 'owner/repo',
            lang: ['typescript', 'javascript'],
            notLang: ['python', 'ruby'],
            path: ['src', 'test'],
            notPath: ['node_modules', 'dist']
        };
        const result = (0, utils_1.formatScopingQuery)(query);
        assert_1.default.strictEqual(result, '(repo:owner/repo) (lang:typescript OR lang:javascript) NOT (lang:python OR lang:ruby) (path:src OR path:test) NOT (path:node_modules OR path:dist)');
    });
});
//# sourceMappingURL=utils.spec.js.map