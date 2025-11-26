/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../../base/common/uri.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { TerminalCompletionService } from '../../browser/terminalCompletionService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import assert, { fail } from 'assert';
import { isWindows } from '../../../../../../base/common/platform.js';
import { createFileStat } from '../../../../../test/common/workbenchTestServices.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { ShellEnvDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/shellEnvDetectionCapability.js';
import { TerminalCompletionItemKind } from '../../browser/terminalCompletionItem.js';
import { count } from '../../../../../../base/common/strings.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { gitBashToWindowsPath, windowsToGitBashPath } from '../../browser/terminalGitBashHelpers.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { TestPathService, workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
const pathSeparator = isWindows ? '\\' : '/';
/**
 * Assert the set of completions exist exactly, including their order.
 */
function assertCompletions(actual, expected, expectedConfig, pathSep) {
    const sep = pathSep ?? pathSeparator;
    assert.deepStrictEqual(actual?.map(e => ({
        label: e.label,
        detail: e.detail ?? '',
        kind: e.kind ?? TerminalCompletionItemKind.Folder,
        replacementRange: e.replacementRange,
    })), expected.map(e => ({
        label: e.label.replaceAll('/', sep),
        detail: e.detail ? e.detail.replaceAll('/', sep) : '',
        kind: e.kind ?? TerminalCompletionItemKind.Folder,
        replacementRange: expectedConfig.replacementRange,
    })));
}
/**
 * Assert a set of completions exist within the actual set.
 */
function assertPartialCompletionsExist(actual, expectedPartial, expectedConfig) {
    if (!actual) {
        fail();
    }
    const expectedMapped = expectedPartial.map(e => ({
        label: e.label.replaceAll('/', pathSeparator),
        detail: e.detail ? e.detail.replaceAll('/', pathSeparator) : '',
        kind: e.kind ?? TerminalCompletionItemKind.Folder,
        replacementRange: expectedConfig.replacementRange,
    }));
    for (const expectedItem of expectedMapped) {
        assert.deepStrictEqual(actual.map(e => ({
            label: e.label,
            detail: e.detail ?? '',
            kind: e.kind ?? TerminalCompletionItemKind.Folder,
            replacementRange: e.replacementRange,
        })).find(e => e.detail === expectedItem.detail), expectedItem);
    }
}
const testEnv = {
    HOME: '/home/user',
    USERPROFILE: '/home/user'
};
let homeDir = isWindows ? testEnv['USERPROFILE'] : testEnv['HOME'];
if (!homeDir.endsWith('/')) {
    homeDir += '/';
}
const standardTildeItem = Object.freeze({ label: '~', detail: homeDir });
suite('TerminalCompletionService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let capabilities;
    let validResources;
    let childResources;
    let terminalCompletionService;
    const provider = 'testProvider';
    setup(() => {
        instantiationService = workbenchInstantiationService({
            pathService: () => new TestPathService(URI.file(homeDir ?? '/')),
        }, store);
        configurationService = new TestConfigurationService();
        instantiationService.stub(ITerminalLogService, new NullLogService());
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IFileService, {
            async stat(resource) {
                if (!validResources.map(e => e.path).includes(resource.path)) {
                    throw new Error('Doesn\'t exist');
                }
                return createFileStat(resource);
            },
            async resolve(resource, options) {
                const children = childResources.filter(child => {
                    const childFsPath = child.resource.path.replace(/\/$/, '');
                    const parentFsPath = resource.path.replace(/\/$/, '');
                    return (childFsPath.startsWith(parentFsPath) &&
                        count(childFsPath, '/') === count(parentFsPath, '/') + 1);
                });
                return createFileStat(resource, undefined, undefined, undefined, undefined, children);
            },
            async realpath(resource) {
                if (resource.path.includes('symlink-file')) {
                    return resource.with({ path: '/target/actual-file.txt' });
                }
                else if (resource.path.includes('symlink-folder')) {
                    return resource.with({ path: '/target/actual-folder' });
                }
                return undefined;
            }
        });
        terminalCompletionService = store.add(instantiationService.createInstance(TerminalCompletionService));
        terminalCompletionService.processEnv = testEnv;
        validResources = [];
        childResources = [];
        capabilities = store.add(new TerminalCapabilityStore());
    });
    suite('resolveResources should return undefined', () => {
        test('if neither showFiles nor showFolders are true', async () => {
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            const result = await terminalCompletionService.resolveResources(resourceOptions, 'cd ', 3, provider, capabilities);
            assert(!result);
        });
    });
    suite('resolveResources should return folder completions', () => {
        setup(() => {
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true, isFile: false },
                { resource: URI.parse('file:///test/file1.txt'), isDirectory: false, isFile: true },
            ];
        });
        test('| should return root-level completions', async () => {
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceOptions, '', 1, provider, capabilities);
            assertCompletions(result, [
                { label: '.', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: '../', detail: '/' },
                standardTildeItem,
            ], { replacementRange: [1, 1] });
        });
        test('./| should return folder completions', async () => {
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceOptions, './', 3, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './../', detail: '/' },
            ], { replacementRange: [1, 3] });
        });
        test('cd ./| should return folder completions', async () => {
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceOptions, 'cd ./', 5, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './../', detail: '/' },
            ], { replacementRange: [3, 5] });
        });
        test('cd ./f| should return folder completions', async () => {
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceOptions, 'cd ./f', 6, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './../', detail: '/' },
            ], { replacementRange: [3, 6] });
        });
    });
    suite('resolveResources should handle file and folder completion requests correctly', () => {
        setup(() => {
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/.hiddenFile'), isFile: true },
                { resource: URI.parse('file:///test/.hiddenFolder/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/file1.txt'), isFile: true },
            ];
        });
        test('./| should handle hidden files and folders', async () => {
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                showFiles: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceOptions, './', 2, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './.hiddenFile', detail: '/test/.hiddenFile', kind: TerminalCompletionItemKind.File },
                { label: './.hiddenFolder/', detail: '/test/.hiddenFolder/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './file1.txt', detail: '/test/file1.txt', kind: TerminalCompletionItemKind.File },
                { label: './../', detail: '/' },
            ], { replacementRange: [0, 2] });
        });
        test('./h| should handle hidden files and folders', async () => {
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                showFiles: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceOptions, './h', 3, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './.hiddenFile', detail: '/test/.hiddenFile', kind: TerminalCompletionItemKind.File },
                { label: './.hiddenFolder/', detail: '/test/.hiddenFolder/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './file1.txt', detail: '/test/file1.txt', kind: TerminalCompletionItemKind.File },
                { label: './../', detail: '/' },
            ], { replacementRange: [0, 3] });
        });
    });
    suite('~ -> $HOME', () => {
        let resourceOptions;
        let shellEnvDetection;
        setup(() => {
            shellEnvDetection = store.add(new ShellEnvDetectionCapability());
            shellEnvDetection.setEnvironment({
                HOME: '/home',
                USERPROFILE: '/home'
            }, true);
            capabilities.add(5 /* TerminalCapability.ShellEnvDetection */, shellEnvDetection);
            resourceOptions = {
                cwd: URI.parse('file:///test/folder1'), // Updated to reflect home directory
                showFiles: true,
                showDirectories: true,
                pathSeparator
            };
            validResources = [
                URI.parse('file:///test'),
                URI.parse('file:///test/folder1'),
                URI.parse('file:///home'),
                URI.parse('file:///home/vscode'),
                URI.parse('file:///home/vscode/foo'),
                URI.parse('file:///home/vscode/bar.txt'),
            ];
            childResources = [
                { resource: URI.parse('file:///home/vscode'), isDirectory: true },
                { resource: URI.parse('file:///home/vscode/foo'), isDirectory: true },
                { resource: URI.parse('file:///home/vscode/bar.txt'), isFile: true },
            ];
        });
        test('~| should return completion for ~', async () => {
            assertPartialCompletionsExist(await terminalCompletionService.resolveResources(resourceOptions, '~', 1, provider, capabilities), [
                { label: '~', detail: '/home/' },
            ], { replacementRange: [0, 1] });
        });
        test('~/| should return folder completions relative to $HOME', async () => {
            assertCompletions(await terminalCompletionService.resolveResources(resourceOptions, '~/', 2, provider, capabilities), [
                { label: '~/', detail: '/home/' },
                { label: '~/vscode/', detail: '/home/vscode/' },
            ], { replacementRange: [0, 2] });
        });
        test('~/vscode/| should return folder completions relative to $HOME/vscode', async () => {
            assertCompletions(await terminalCompletionService.resolveResources(resourceOptions, '~/vscode/', 9, provider, capabilities), [
                { label: '~/vscode/', detail: '/home/vscode/' },
                { label: '~/vscode/foo/', detail: '/home/vscode/foo/' },
                { label: '~/vscode/bar.txt', detail: '/home/vscode/bar.txt', kind: TerminalCompletionItemKind.File },
            ], { replacementRange: [0, 9] });
        });
    });
    suite('resolveResources edge cases and advanced scenarios', () => {
        setup(() => {
            validResources = [];
            childResources = [];
        });
        if (isWindows) {
            test('C:/Foo/| absolute paths on Windows', async () => {
                const resourceOptions = {
                    cwd: URI.parse('file:///C:'),
                    showDirectories: true,
                    pathSeparator
                };
                validResources = [URI.parse('file:///C:/Foo')];
                childResources = [
                    { resource: URI.parse('file:///C:/Foo/Bar'), isDirectory: true, isFile: false },
                    { resource: URI.parse('file:///C:/Foo/Baz.txt'), isDirectory: false, isFile: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceOptions, 'C:/Foo/', 7, provider, capabilities);
                assertCompletions(result, [
                    { label: 'C:/Foo/', detail: 'C:/Foo/' },
                    { label: 'C:/Foo/Bar/', detail: 'C:/Foo/Bar/' },
                ], { replacementRange: [0, 7] });
            });
            test('c:/foo/| case insensitivity on Windows', async () => {
                const resourceOptions = {
                    cwd: URI.parse('file:///c:'),
                    showDirectories: true,
                    pathSeparator
                };
                validResources = [URI.parse('file:///c:/foo')];
                childResources = [
                    { resource: URI.parse('file:///c:/foo/Bar'), isDirectory: true, isFile: false }
                ];
                const result = await terminalCompletionService.resolveResources(resourceOptions, 'c:/foo/', 7, provider, capabilities);
                assertCompletions(result, [
                    // Note that the detail is normalizes drive letters to capital case intentionally
                    { label: 'c:/foo/', detail: 'C:/foo/' },
                    { label: 'c:/foo/Bar/', detail: 'C:/foo/Bar/' },
                ], { replacementRange: [0, 7] });
            });
        }
        else {
            test('/foo/| absolute paths NOT on Windows', async () => {
                const resourceOptions = {
                    cwd: URI.parse('file:///'),
                    showDirectories: true,
                    pathSeparator
                };
                validResources = [URI.parse('file:///foo')];
                childResources = [
                    { resource: URI.parse('file:///foo/Bar'), isDirectory: true, isFile: false },
                    { resource: URI.parse('file:///foo/Baz.txt'), isDirectory: false, isFile: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceOptions, '/foo/', 5, provider, capabilities);
                assertCompletions(result, [
                    { label: '/foo/', detail: '/foo/' },
                    { label: '/foo/Bar/', detail: '/foo/Bar/' },
                ], { replacementRange: [0, 5] });
            });
        }
        if (isWindows) {
            test('.\\folder | Case insensitivity should resolve correctly on Windows', async () => {
                const resourceOptions = {
                    cwd: URI.parse('file:///C:/test'),
                    showDirectories: true,
                    pathSeparator: '\\'
                };
                validResources = [URI.parse('file:///C:/test')];
                childResources = [
                    { resource: URI.parse('file:///C:/test/FolderA/'), isDirectory: true },
                    { resource: URI.parse('file:///C:/test/anotherFolder/'), isDirectory: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceOptions, '.\\folder', 8, provider, capabilities);
                assertCompletions(result, [
                    { label: '.\\', detail: 'C:\\test\\' },
                    { label: '.\\FolderA\\', detail: 'C:\\test\\FolderA\\' },
                    { label: '.\\anotherFolder\\', detail: 'C:\\test\\anotherFolder\\' },
                    { label: '.\\..\\', detail: 'C:\\' },
                ], { replacementRange: [0, 8] });
            });
        }
        else {
            test('./folder | Case sensitivity should resolve correctly on Mac/Unix', async () => {
                const resourceOptions = {
                    cwd: URI.parse('file:///test'),
                    showDirectories: true,
                    pathSeparator: '/'
                };
                validResources = [URI.parse('file:///test')];
                childResources = [
                    { resource: URI.parse('file:///test/FolderA/'), isDirectory: true },
                    { resource: URI.parse('file:///test/foldera/'), isDirectory: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceOptions, './folder', 8, provider, capabilities);
                assertCompletions(result, [
                    { label: './', detail: '/test/' },
                    { label: './FolderA/', detail: '/test/FolderA/' },
                    { label: './foldera/', detail: '/test/foldera/' },
                    { label: './../', detail: '/' }
                ], { replacementRange: [0, 8] });
            });
        }
        test('| Empty input should resolve to current directory', async () => {
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder2/'), isDirectory: true }
            ];
            const result = await terminalCompletionService.resolveResources(resourceOptions, '', 0, provider, capabilities);
            assertCompletions(result, [
                { label: '.', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './folder2/', detail: '/test/folder2/' },
                { label: '../', detail: '/' },
                standardTildeItem,
            ], { replacementRange: [0, 0] });
        });
        test('should ignore environment variable setting prefixes', async () => {
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder2/'), isDirectory: true }
            ];
            const result = await terminalCompletionService.resolveResources(resourceOptions, 'FOO=./', 2, provider, capabilities);
            // Must not include FOO= prefix in completions
            assertCompletions(result, [
                { label: '.', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './folder2/', detail: '/test/folder2/' },
                { label: '../', detail: '/' },
                standardTildeItem,
            ], { replacementRange: [0, 2] });
        });
        test('./| should handle large directories with many results gracefully', async () => {
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            childResources = Array.from({ length: 1000 }, (_, i) => ({
                resource: URI.parse(`file:///test/folder${i}/`),
                isDirectory: true
            }));
            const result = await terminalCompletionService.resolveResources(resourceOptions, './', 2, provider, capabilities);
            assert(result);
            // includes the 1000 folders + ./ and ./../
            assert.strictEqual(result?.length, 1002);
            assert.strictEqual(result[0].label, `.${pathSeparator}`);
            assert.strictEqual(result.at(-1)?.label, `.${pathSeparator}..${pathSeparator}`);
        });
        test('./folder| should include current folder with trailing / is missing', async () => {
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder2/'), isDirectory: true }
            ];
            const result = await terminalCompletionService.resolveResources(resourceOptions, './folder1', 10, provider, capabilities);
            assertCompletions(result, [
                { label: './', detail: '/test/' },
                { label: './folder1/', detail: '/test/folder1/' },
                { label: './folder2/', detail: '/test/folder2/' },
                { label: './../', detail: '/' }
            ], { replacementRange: [1, 10] });
        });
        test('test/| should normalize current and parent folders', async () => {
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                pathSeparator
            };
            validResources = [
                URI.parse('file:///test'),
                URI.parse('file:///test/folder1'),
                URI.parse('file:///test/folder2')
            ];
            childResources = [
                { resource: URI.parse('file:///test/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder2/'), isDirectory: true }
            ];
            const result = await terminalCompletionService.resolveResources(resourceOptions, 'test/', 5, provider, capabilities);
            assertCompletions(result, [
                { label: './test/', detail: '/test/' },
                { label: './test/folder1/', detail: '/test/folder1/' },
                { label: './test/folder2/', detail: '/test/folder2/' },
                { label: './test/../', detail: '/' }
            ], { replacementRange: [0, 5] });
        });
    });
    suite('cdpath', () => {
        let shellEnvDetection;
        setup(() => {
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///cdpath_value/folder1/'), isDirectory: true },
                { resource: URI.parse('file:///cdpath_value/file1.txt'), isFile: true },
            ];
            shellEnvDetection = store.add(new ShellEnvDetectionCapability());
            shellEnvDetection.setEnvironment({ CDPATH: '/cdpath_value' }, true);
            capabilities.add(5 /* TerminalCapability.ShellEnvDetection */, shellEnvDetection);
        });
        test('cd | should show paths from $CDPATH (relative)', async () => {
            configurationService.setUserConfiguration('terminal.integrated.suggest.cdPath', 'relative');
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                showFiles: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceOptions, 'cd ', 3, provider, capabilities);
            assertPartialCompletionsExist(result, [
                { label: 'folder1', detail: 'CDPATH /cdpath_value/folder1/' },
            ], { replacementRange: [3, 3] });
        });
        test('cd | should show paths from $CDPATH (absolute)', async () => {
            configurationService.setUserConfiguration('terminal.integrated.suggest.cdPath', 'absolute');
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                showFiles: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceOptions, 'cd ', 3, provider, capabilities);
            assertPartialCompletionsExist(result, [
                { label: '/cdpath_value/folder1/', detail: 'CDPATH' },
            ], { replacementRange: [3, 3] });
        });
        test('cd | should support pulling from multiple paths in $CDPATH', async () => {
            configurationService.setUserConfiguration('terminal.integrated.suggest.cdPath', 'relative');
            const pathPrefix = isWindows ? 'c:\\' : '/';
            const delimeter = isWindows ? ';' : ':';
            const separator = isWindows ? '\\' : '/';
            shellEnvDetection.setEnvironment({ CDPATH: `${pathPrefix}cdpath1_value${delimeter}${pathPrefix}cdpath2_value${separator}inner_dir` }, true);
            const uriPathPrefix = isWindows ? 'file:///c:/' : 'file:///';
            validResources = [
                URI.parse(`${uriPathPrefix}test`),
                URI.parse(`${uriPathPrefix}cdpath1_value`),
                URI.parse(`${uriPathPrefix}cdpath2_value`),
                URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir`)
            ];
            childResources = [
                { resource: URI.parse(`${uriPathPrefix}cdpath1_value/folder1/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath1_value/folder2/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath1_value/file1.txt`), isFile: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir/folder1/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir/folder2/`), isDirectory: true },
                { resource: URI.parse(`${uriPathPrefix}cdpath2_value/inner_dir/file1.txt`), isFile: true },
            ];
            const resourceOptions = {
                cwd: URI.parse(`${uriPathPrefix}test`),
                showDirectories: true,
                showFiles: true,
                pathSeparator
            };
            const result = await terminalCompletionService.resolveResources(resourceOptions, 'cd ', 3, provider, capabilities);
            const finalPrefix = isWindows ? 'C:\\' : '/';
            assertPartialCompletionsExist(result, [
                { label: 'folder1', detail: `CDPATH ${finalPrefix}cdpath1_value/folder1/` },
                { label: 'folder2', detail: `CDPATH ${finalPrefix}cdpath1_value/folder2/` },
                { label: 'folder1', detail: `CDPATH ${finalPrefix}cdpath2_value/inner_dir/folder1/` },
                { label: 'folder2', detail: `CDPATH ${finalPrefix}cdpath2_value/inner_dir/folder2/` },
            ], { replacementRange: [3, 3] });
        });
    });
    if (isWindows) {
        suite('gitbash', () => {
            test('should convert Git Bash absolute path to Windows absolute path', () => {
                assert.strictEqual(gitBashToWindowsPath('/'), 'C:\\');
                assert.strictEqual(gitBashToWindowsPath('/c/'), 'C:\\');
                assert.strictEqual(gitBashToWindowsPath('/c/Users/foo'), 'C:\\Users\\foo');
                assert.strictEqual(gitBashToWindowsPath('/d/bar'), 'D:\\bar');
            });
            test('should convert Windows absolute path to Git Bash absolute path', () => {
                assert.strictEqual(windowsToGitBashPath('C:\\'), '/c/');
                assert.strictEqual(windowsToGitBashPath('C:\\Users\\foo'), '/c/Users/foo');
                assert.strictEqual(windowsToGitBashPath('D:\\bar'), '/d/bar');
                assert.strictEqual(windowsToGitBashPath('E:\\some\\path'), '/e/some/path');
            });
            test('resolveResources with c:/ style absolute path for Git Bash', async () => {
                const resourceOptions = {
                    cwd: URI.file('C:\\Users\\foo'),
                    showDirectories: true,
                    showFiles: true,
                    pathSeparator: '/'
                };
                validResources = [
                    URI.file('C:\\Users\\foo'),
                    URI.file('C:\\Users\\foo\\bar'),
                    URI.file('C:\\Users\\foo\\baz.txt')
                ];
                childResources = [
                    { resource: URI.file('C:\\Users\\foo\\bar'), isDirectory: true, isFile: false },
                    { resource: URI.file('C:\\Users\\foo\\baz.txt'), isFile: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceOptions, 'C:/Users/foo/', 13, provider, capabilities, "gitbash" /* WindowsShellType.GitBash */);
                assertCompletions(result, [
                    { label: 'C:/Users/foo/', detail: 'C:\\Users\\foo\\' },
                    { label: 'C:/Users/foo/bar/', detail: 'C:\\Users\\foo\\bar\\' },
                    { label: 'C:/Users/foo/baz.txt', detail: 'C:\\Users\\foo\\baz.txt', kind: TerminalCompletionItemKind.File },
                ], { replacementRange: [0, 13] }, '/');
            });
            test('resolveResources with cwd as Windows path (relative)', async () => {
                const resourceOptions = {
                    cwd: URI.file('C:\\Users\\foo'),
                    showDirectories: true,
                    showFiles: true,
                    pathSeparator: '/'
                };
                validResources = [
                    URI.file('C:\\Users\\foo'),
                    URI.file('C:\\Users\\foo\\bar'),
                    URI.file('C:\\Users\\foo\\baz.txt')
                ];
                childResources = [
                    { resource: URI.file('C:\\Users\\foo\\bar'), isDirectory: true },
                    { resource: URI.file('C:\\Users\\foo\\baz.txt'), isFile: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceOptions, './', 2, provider, capabilities, "gitbash" /* WindowsShellType.GitBash */);
                assertCompletions(result, [
                    { label: './', detail: 'C:\\Users\\foo\\' },
                    { label: './bar/', detail: 'C:\\Users\\foo\\bar\\' },
                    { label: './baz.txt', detail: 'C:\\Users\\foo\\baz.txt', kind: TerminalCompletionItemKind.File },
                    { label: './../', detail: 'C:\\Users\\' }
                ], { replacementRange: [0, 2] }, '/');
            });
            test('resolveResources with cwd as Windows path (absolute)', async () => {
                const resourceOptions = {
                    cwd: URI.file('C:\\Users\\foo'),
                    showDirectories: true,
                    showFiles: true,
                    pathSeparator: '/'
                };
                validResources = [
                    URI.file('C:\\Users\\foo'),
                    URI.file('C:\\Users\\foo\\bar'),
                    URI.file('C:\\Users\\foo\\baz.txt')
                ];
                childResources = [
                    { resource: URI.file('C:\\Users\\foo\\bar'), isDirectory: true },
                    { resource: URI.file('C:\\Users\\foo\\baz.txt'), isFile: true }
                ];
                const result = await terminalCompletionService.resolveResources(resourceOptions, '/c/Users/foo/', 13, provider, capabilities, "gitbash" /* WindowsShellType.GitBash */);
                assertCompletions(result, [
                    { label: '/c/Users/foo/', detail: 'C:\\Users\\foo\\' },
                    { label: '/c/Users/foo/bar/', detail: 'C:\\Users\\foo\\bar\\' },
                    { label: '/c/Users/foo/baz.txt', detail: 'C:\\Users\\foo\\baz.txt', kind: TerminalCompletionItemKind.File },
                ], { replacementRange: [0, 13] }, '/');
            });
        });
    }
    if (!isWindows) {
        suite('symlink support', () => {
            test('should include symlink target information in completions', async () => {
                const resourceOptions = {
                    cwd: URI.parse('file:///test'),
                    pathSeparator,
                    showFiles: true,
                    showDirectories: true
                };
                validResources = [URI.parse('file:///test')];
                // Create mock children including a symbolic link
                childResources = [
                    { resource: URI.parse('file:///test/regular-file.txt'), isFile: true },
                    { resource: URI.parse('file:///test/symlink-file'), isFile: true, isSymbolicLink: true },
                    { resource: URI.parse('file:///test/symlink-folder'), isDirectory: true, isSymbolicLink: true },
                    { resource: URI.parse('file:///test/regular-folder'), isDirectory: true },
                ];
                const result = await terminalCompletionService.resolveResources(resourceOptions, 'ls ', 3, provider, capabilities);
                // Find the symlink completion
                const symlinkFileCompletion = result?.find(c => c.label === './symlink-file');
                const symlinkFolderCompletion = result?.find(c => c.label === './symlink-folder/');
                assert.strictEqual(symlinkFileCompletion?.detail, '/test/symlink-file -> /target/actual-file.txt', 'Symlink file detail should match target');
                assert.strictEqual(symlinkFolderCompletion?.detail, '/test/symlink-folder -> /target/actual-folder', 'Symlink folder detail should match target');
            });
        });
    }
    suite('completion label escaping', () => {
        test('| should escape special characters in file/folder names for POSIX shells', async () => {
            const resourceOptions = {
                cwd: URI.parse('file:///test'),
                showDirectories: true,
                showFiles: true,
                pathSeparator
            };
            validResources = [URI.parse('file:///test')];
            childResources = [
                { resource: URI.parse('file:///test/[folder1]/'), isDirectory: true },
                { resource: URI.parse('file:///test/folder 2/'), isDirectory: true },
                { resource: URI.parse('file:///test/!special$chars&/'), isDirectory: true },
                { resource: URI.parse('file:///test/!special$chars2&'), isFile: true }
            ];
            const result = await terminalCompletionService.resolveResources(resourceOptions, '', 0, provider, capabilities);
            assertCompletions(result, [
                { label: '.', detail: '/test/' },
                { label: './[folder1]/', detail: '/test/\[folder1]\/' },
                { label: './folder\ 2/', detail: '/test/folder\ 2/' },
                { label: './\!special\$chars\&/', detail: '/test/\!special\$chars\&/' },
                { label: './\!special\$chars2\&', detail: '/test/\!special\$chars2\&', kind: TerminalCompletionItemKind.File },
                { label: '../', detail: '/' },
                standardTildeItem,
            ], { replacementRange: [0, 0] });
        });
    });
    suite('Provider Configuration', () => {
        // Test class that extends TerminalCompletionService to access protected methods
        class TestTerminalCompletionService extends TerminalCompletionService {
            getEnabledProviders(providers) {
                return super._getEnabledProviders(providers);
            }
        }
        let testTerminalCompletionService;
        setup(() => {
            testTerminalCompletionService = store.add(instantiationService.createInstance(TestTerminalCompletionService));
        });
        // Mock provider for testing
        function createMockProvider(id) {
            return {
                id,
                provideCompletions: async () => [{
                        label: `completion-from-${id}`,
                        kind: TerminalCompletionItemKind.Method,
                        replacementRange: [0, 0],
                        provider: id
                    }]
            };
        }
        test('should enable providers by default when no configuration exists', () => {
            const defaultProvider = createMockProvider('terminal-suggest');
            const newProvider = createMockProvider('new-extension-provider');
            const providers = [defaultProvider, newProvider];
            // Set empty configuration (no provider keys)
            configurationService.setUserConfiguration("terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */, {});
            const result = testTerminalCompletionService.getEnabledProviders(providers);
            // Both providers should be enabled since they're not explicitly disabled
            assert.strictEqual(result.length, 2, 'Should enable both providers by default');
            assert.ok(result.includes(defaultProvider), 'Should include default provider');
            assert.ok(result.includes(newProvider), 'Should include new provider');
        });
        test('should disable providers when explicitly set to false', () => {
            const provider1 = createMockProvider('provider1');
            const provider2 = createMockProvider('provider2');
            const providers = [provider1, provider2];
            // Disable provider1, leave provider2 unconfigured
            configurationService.setUserConfiguration("terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */, {
                'provider1': false
            });
            const result = testTerminalCompletionService.getEnabledProviders(providers);
            // Only provider2 should be enabled
            assert.strictEqual(result.length, 1, 'Should enable only one provider');
            assert.ok(result.includes(provider2), 'Should include unconfigured provider');
            assert.ok(!result.includes(provider1), 'Should not include disabled provider');
        });
        test('should enable providers when explicitly set to true', () => {
            const provider1 = createMockProvider('provider1');
            const provider2 = createMockProvider('provider2');
            const providers = [provider1, provider2];
            // Explicitly enable provider1, leave provider2 unconfigured
            configurationService.setUserConfiguration("terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */, {
                'provider1': true
            });
            const result = testTerminalCompletionService.getEnabledProviders(providers);
            // Both providers should be enabled
            assert.strictEqual(result.length, 2, 'Should enable both providers');
            assert.ok(result.includes(provider1), 'Should include explicitly enabled provider');
            assert.ok(result.includes(provider2), 'Should include unconfigured provider');
        });
        test('should handle mixed configuration correctly', () => {
            const provider1 = createMockProvider('provider1');
            const provider2 = createMockProvider('provider2');
            const provider3 = createMockProvider('provider3');
            const providers = [provider1, provider2, provider3];
            // Mixed configuration: enable provider1, disable provider2, leave provider3 unconfigured
            configurationService.setUserConfiguration("terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */, {
                'provider1': true,
                'provider2': false
            });
            const result = testTerminalCompletionService.getEnabledProviders(providers);
            // provider1 and provider3 should be enabled, provider2 should be disabled
            assert.strictEqual(result.length, 2, 'Should enable two providers');
            assert.ok(result.includes(provider1), 'Should include explicitly enabled provider');
            assert.ok(result.includes(provider3), 'Should include unconfigured provider');
            assert.ok(!result.includes(provider2), 'Should not include disabled provider');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvdGVzdC9icm93c2VyL3Rlcm1pbmFsQ29tcGxldGlvblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFlBQVksRUFBc0QsTUFBTSxrREFBa0QsQ0FBQztBQUNwSSxPQUFPLEVBQUUseUJBQXlCLEVBQXVFLE1BQU0sNENBQTRDLENBQUM7QUFDNUosT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDdEMsT0FBTyxFQUFFLFNBQVMsRUFBNEIsTUFBTSwyQ0FBMkMsQ0FBQztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDNUgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0ZBQW9GLENBQUM7QUFDN0gsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0ZBQXdGLENBQUM7QUFFckksT0FBTyxFQUF1QiwwQkFBMEIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsbUJBQW1CLEVBQW9C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