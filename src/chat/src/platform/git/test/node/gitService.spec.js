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
const gitService_1 = require("../../common/gitService");
function assertGitIdEquals(a, b, message) {
    assert_1.default.strictEqual(a?.org, b?.org, message);
    assert_1.default.strictEqual(a?.repo, b?.repo, message);
}
(0, vitest_1.suite)('parseRemoteUrl', () => {
    (0, vitest_1.test)('Should handle basic https', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.parseRemoteUrl)('https://example.com/owner/repo.git'), { host: 'example.com', path: '/owner/repo.git' });
    });
    (0, vitest_1.test)('Should find full subdomain with https', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.parseRemoteUrl)('https://sub1.sub2.example.com/owner/repo.git'), { host: 'sub1.sub2.example.com', path: '/owner/repo.git' });
    });
    (0, vitest_1.test)('Should handle basic Azure dev ops url', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.parseRemoteUrl)('https://test@dev.azure.com/test/project/_git/vscode-stuff'), { host: 'dev.azure.com', path: '/test/project/_git/vscode-stuff' });
    });
    (0, vitest_1.test)('Should handle basic visual studio url', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.parseRemoteUrl)('https://test.visualstudio.com/project/one/_git/two'), { host: 'test.visualstudio.com', path: '/project/one/_git/two' });
    });
    (0, vitest_1.test)('Should strip out ports', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.parseRemoteUrl)('https://example.com:8080/owner/repo.git'), { host: 'example.com', path: '/owner/repo.git' });
    });
    (0, vitest_1.test)('Should handle ssh syntax', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.parseRemoteUrl)('ssh://git@github.com/owner/repo.git'), { host: 'github.com', path: '/owner/repo.git' });
    });
    (0, vitest_1.test)('Should strip user ids', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.parseRemoteUrl)('https://myname@github.com/owner/repo.git'), { host: 'github.com', path: '/owner/repo.git' }, 'https, name only');
        assert_1.default.deepStrictEqual(
        // [SuppressMessage("Microsoft.Security", "CS002:SecretInNextLine", Justification="test credentials")]
        (0, gitService_1.parseRemoteUrl)('https://myname:ghp_1234556@github.com/owner/repo.git'), { host: 'github.com', path: '/owner/repo.git' }, 'https, with name and PAT');
        assert_1.default.deepStrictEqual((0, gitService_1.parseRemoteUrl)('https://ghp_1234556@github.com/owner/repo.git'), { host: 'github.com', path: '/owner/repo.git' }, 'https, PAT only');
        assert_1.default.deepStrictEqual((0, gitService_1.parseRemoteUrl)('ssh://name@github.com/owner/repo.git'), { host: 'github.com', path: '/owner/repo.git' }, 'ssh, name only');
    });
});
(0, vitest_1.suite)('getGithubRepoIdFromFetchUrl', () => {
    (0, vitest_1.test)('should return undefined for non-GitHub URLs', () => {
        const url = 'https://example.com/owner/repo.git';
        const result = (0, gitService_1.getGithubRepoIdFromFetchUrl)(url);
        assert_1.default.strictEqual(result, undefined);
    });
    (0, vitest_1.test)('should return the repo name for git shorthand URLs', () => {
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('git@github.com:owner/repo.git'), { org: 'owner', repo: 'repo' });
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('git@xyz.ghe.com:owner/repo.git'), { org: 'owner', repo: 'repo' }, 'ghe url');
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('org-123@github.com:owner/repo.git'), { org: 'owner', repo: 'repo' }, `non 'git' user name`);
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('org-1234@xyz.github.com:owner-xyz/some-repo.git'), { org: 'owner-xyz', repo: 'some-repo' }, `non 'git' user name with subdomain alias`);
    });
    (0, vitest_1.test)('should return the repo name for HTTPS URLs', () => {
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('https://github.com/owner/repo.git'), { org: 'owner', repo: 'repo' });
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('https://xyz.ghe.com/owner/repo.git'), { org: 'owner', repo: 'repo' }, 'ghe url');
    });
    (0, vitest_1.test)('should return the repos with trailing slash', () => {
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('https://github.com/owner/repo/'), { org: 'owner', repo: 'repo' });
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('https://github.com/owner/repo.git/'), { org: 'owner', repo: 'repo' });
    });
    (0, vitest_1.test)('should return the repo name for URLs without .git extension', () => {
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('https://github.com/owner/repo'), { org: 'owner', repo: 'repo' });
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('https://github.com/owner/repo/'), { org: 'owner', repo: 'repo' }, 'With trailing slash');
    });
    (0, vitest_1.test)('should return the repo name for ssh:// URLs', () => {
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('ssh://git@github.com/owner/repo.git'), { org: 'owner', repo: 'repo' });
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('ssh://git@github.com/owner/repo'), { org: 'owner', repo: 'repo' });
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('ssh://git@ssh.github.com/owner/repo.git'), { org: 'owner', repo: 'repo' }, 'On ssh.github.com subdomain');
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('ssh://git@myco.ghe.com/owner/repo.git'), { org: 'owner', repo: 'repo' }, 'ghe.com subdomain');
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('ssh://git@github.com:443/owner/repo.git'), { org: 'owner', repo: 'repo' }, 'With port');
    });
    (0, vitest_1.test)('should return undefined for invalid GitHub URLs', () => {
        {
            const url = 'https://github.com/owner';
            const result = (0, gitService_1.getGithubRepoIdFromFetchUrl)(url);
            assert_1.default.deepStrictEqual(result, undefined);
        }
        {
            const url = 'https://github.com/';
            const result = (0, gitService_1.getGithubRepoIdFromFetchUrl)(url);
            assert_1.default.deepStrictEqual(result, undefined);
        }
    });
    (0, vitest_1.test)('should return undefined for invalid URLs', () => {
        const url = 'invalid-url';
        const result = (0, gitService_1.getGithubRepoIdFromFetchUrl)(url);
        assert_1.default.deepStrictEqual(result, undefined);
    });
    (0, vitest_1.test)('should return undefined for unsupported scheme', () => {
        const url = 'gopher://github.com/owner/repo.git';
        const result = (0, gitService_1.getGithubRepoIdFromFetchUrl)(url);
        assert_1.default.deepStrictEqual(result, undefined);
    });
    (0, vitest_1.test)('should support github url that uses www subdomain', () => {
        // Likely a mistake but we can parse it easily
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('https://www.github.com/owner/repo.git'), { org: 'owner', repo: 'repo' });
    });
    (0, vitest_1.test)('should support github url using http', () => {
        // This is a mistake but we can parse it easily
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('http://github.com/owner/repo.git'), { org: 'owner', repo: 'repo' });
    });
    (0, vitest_1.test)('should support urls with custom user names and PAT in urls', () => {
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('https://myname@github.com/owner/repo.git'), { org: 'owner', repo: 'repo' }, 'https, name only');
        assertGitIdEquals(
        // [SuppressMessage("Microsoft.Security", "CS002:SecretInNextLine", Justification="test credentials")]
        (0, gitService_1.getGithubRepoIdFromFetchUrl)('https://myname:ghp_1234556@github.com/owner/repo.git'), { org: 'owner', repo: 'repo' }, 'https, with name and PAT');
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('https://ghp_1234556@github.com/owner/repo.git'), { org: 'owner', repo: 'repo' }, 'https, PAT only');
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('ssh://name@github.com/owner/repo.git'), { org: 'owner', repo: 'repo' }, 'ssh, name only');
    });
    (0, vitest_1.test)('should support github urls that are likely ssh aliases', () => {
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('git@my-user-name-github.com:owner/repo.git'), { org: 'owner', repo: 'repo' }, 'Custom name before github.com');
        assertGitIdEquals((0, gitService_1.getGithubRepoIdFromFetchUrl)('git@github.com-my-user-name:owner/repo.git'), { org: 'owner', repo: 'repo' }, 'Custom name after github.com');
    });
});
(0, vitest_1.suite)('Sanitize Remote Repo Urls', () => {
    (0, vitest_1.test)('Https url is unchanged', () => {
        const url = 'https://github.com/owner/repo.git';
        const result = (0, gitService_1.normalizeFetchUrl)(url);
        assert_1.default.strictEqual(result, url);
    });
    (0, vitest_1.test)('Http url is converted to https', () => {
        const url = 'http://github.com/owner/repo.git';
        const result = (0, gitService_1.normalizeFetchUrl)(url);
        assert_1.default.strictEqual(result, 'https://github.com/owner/repo.git');
    });
    (0, vitest_1.test)('Query parameters are removed', () => {
        const url = 'https://github.com/owner/repo.git';
        const urlWithQuery = `${url}?query=param`;
        const result = (0, gitService_1.normalizeFetchUrl)(urlWithQuery);
        assert_1.default.strictEqual(result, url);
    });
    (0, vitest_1.test)('SSH is converted to HTTPS', () => {
        const url = 'git@github.com:owner/repo.git';
        const result = (0, gitService_1.normalizeFetchUrl)(url);
        assert_1.default.strictEqual(result, 'https://github.com/owner/repo.git');
    });
    (0, vitest_1.test)('Credentials are removed from HTTPs url', () => {
        const url = 'https://user:password@server.com/org/repo';
        const result = (0, gitService_1.normalizeFetchUrl)(url);
        assert_1.default.strictEqual(result, 'https://server.com/org/repo');
    });
    (0, vitest_1.test)('SSH ports are normalized and removed', () => {
        const url = 'ssh://git@bitbucket.company.pl:7999/project/repo.git';
        const result = (0, gitService_1.normalizeFetchUrl)(url);
        assert_1.default.strictEqual(result, 'https://bitbucket.company.pl/project/repo.git');
    });
    (0, vitest_1.test)('Bitbucket https urls are properly normalized', () => {
        const url = 'https://bitbucket.company.pl/scm/project/repo.git';
        const result = (0, gitService_1.normalizeFetchUrl)(url);
        assert_1.default.strictEqual(result, 'https://bitbucket.company.pl/project/repo.git');
    });
    (0, vitest_1.test)('Repos named scm by org foo are not improperly truncated', () => {
        const url = 'https://github.com/foo/scm.git';
        const result = (0, gitService_1.normalizeFetchUrl)(url);
        assert_1.default.strictEqual(result, 'https://github.com/foo/scm.git');
    });
    (0, vitest_1.test)('Repos named scm by user scm are not improperly truncated', () => {
        const url = 'https://github.com/scm/scm.git';
        const result = (0, gitService_1.normalizeFetchUrl)(url);
        assert_1.default.strictEqual(result, 'https://github.com/scm/scm.git');
    });
});
(0, vitest_1.suite)('getAdoRepoIdFromFetchUrl', () => {
    (0, vitest_1.test)('should return undefined for non-ADO URLs', () => {
        assert_1.default.strictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('https://example.com/owner/repo.git'), undefined);
        assert_1.default.strictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('https://github.com/scm/scm.git'), undefined);
    });
    (0, vitest_1.test)('should parse https format', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('https://dev.azure.com/organization/project/_git/repository'), new gitService_1.AdoRepoId('organization', 'project', 'repository'));
    });
    (0, vitest_1.test)('should parse https format with _optimized', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('https://dev.azure.com/organization/project/_git/_optimized/repository'), new gitService_1.AdoRepoId('organization', 'project', 'repository'));
    });
    (0, vitest_1.test)('should parse https format with _full', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('https://dev.azure.com/organization/project/_git/_full/repository'), new gitService_1.AdoRepoId('organization', 'project', 'repository'));
    });
    (0, vitest_1.test)('should parse legacy https format', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('https://organization.visualstudio.com/project/_git/repository'), new gitService_1.AdoRepoId('organization', 'project', 'repository'));
    });
    (0, vitest_1.test)('should parse legacy https format with _optimized', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('https://organization.visualstudio.com/project/_git/_optimized/repository'), new gitService_1.AdoRepoId('organization', 'project', 'repository'));
    });
    (0, vitest_1.test)('should parse legacy https format with _full', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('https://organization.visualstudio.com/project/_git/_full/repository'), new gitService_1.AdoRepoId('organization', 'project', 'repository'));
    });
    (0, vitest_1.test)('should parse ssh format', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('git@ssh.dev.azure.com:v3/organization/project/repository'), new gitService_1.AdoRepoId('organization', 'project', 'repository'));
    });
    (0, vitest_1.test)('should parse ssh format with _optimized', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('git@ssh.dev.azure.com:v3/organization/project/_optimized/repository'), new gitService_1.AdoRepoId('organization', 'project', 'repository'));
    });
    (0, vitest_1.test)('should parse ssh format with _full', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('git@ssh.dev.azure.com:v3/organization/project/_full/repository'), new gitService_1.AdoRepoId('organization', 'project', 'repository'));
    });
    (0, vitest_1.test)('should parse legacy ssh format', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('git@organization.visualstudio.com:v3/organization/project/repository'), new gitService_1.AdoRepoId('organization', 'project', 'repository'));
    });
    (0, vitest_1.test)('should parse legacy ssh format with _optimized', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('git@organization.visualstudio.com:v3/organization/project/_optimized/repository'), new gitService_1.AdoRepoId('organization', 'project', 'repository'));
    });
    (0, vitest_1.test)('should parse legacy ssh format with _full', () => {
        assert_1.default.deepStrictEqual((0, gitService_1.getAdoRepoIdFromFetchUrl)('git@organization.visualstudio.com:v3/organization/project/_full/repository'), new gitService_1.AdoRepoId('organization', 'project', 'repository'));
    });
});
//# sourceMappingURL=gitService.spec.js.map