/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../../../base/common/cancellation.js';
import { match } from '../../../../../../../base/common/glob.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { basename, relativePath } from '../../../../../../../base/common/resources.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { mock } from '../../../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../../../../platform/workspace/common/workspace.js';
import { IWorkbenchEnvironmentService } from '../../../../../../services/environment/common/environmentService.js';
import { ISearchService } from '../../../../../../services/search/common/search.js';
import { IUserDataProfileService } from '../../../../../../services/userDataProfile/common/userDataProfile.js';
import { PromptsConfig } from '../../../../common/promptSyntax/config/config.js';
import { PromptsType } from '../../../../common/promptSyntax/promptTypes.js';
import { isValidGlob, PromptFilesLocator } from '../../../../common/promptSyntax/utils/promptFilesLocator.js';
import { MockFilesystem } from '../testUtils/mockFilesystem.js';
import { mockService } from './mock.js';
import { TestUserDataProfileService } from '../../../../../../test/common/workbenchTestServices.js';
import { PromptsStorage } from '../../../../common/promptSyntax/service/promptsService.js';
import { runWithFakedTimers } from '../../../../../../../base/test/common/timeTravelScheduler.js';
/**
 * Mocked instance of {@link IConfigurationService}.
 */
function mockConfigService(value) {
    return mockService({
        getValue(key) {
            assert(typeof key === 'string', `Expected string configuration key, got '${typeof key}'.`);
            if ('explorer.excludeGitIgnore' === key) {
                return false;
            }
            assert([PromptsConfig.PROMPT_LOCATIONS_KEY, PromptsConfig.INSTRUCTIONS_LOCATION_KEY, PromptsConfig.MODE_LOCATION_KEY].includes(key), `Unsupported configuration key '${key}'.`);
            return value;
        },
    });
}
/**
 * Mocked instance of {@link IWorkspaceContextService}.
 */
function mockWorkspaceService(folders) {
    return mockService({
        getWorkspace() {
            return new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.folders = folders;
                }
            };
        },
        getWorkspaceFolder() {
            return null;
        }
    });
}
function testT(name, fn) {
    return test(name, () => runWithFakedTimers({ useFakeTimers: true }, fn));
}
suite('PromptFilesLocator', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    // if (isWindows) {
    // 	return;
    // }
    let instantiationService;
    setup(async () => {
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(ILogService, new NullLogService());
        const fileService = disposables.add(instantiationService.createInstance(FileService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.file, fileSystemProvider));
        instantiationService.stub(IFileService, fileService);
    });
    /**
     * Create a new instance of {@link PromptFilesLocator} with provided mocked
     * values for configuration and workspace services.
     */
    const createPromptsLocator = async (configValue, workspaceFolderPaths, filesystem) => {
        const mockFs = instantiationService.createInstance(MockFilesystem, filesystem);
        await mockFs.mock();
        instantiationService.stub(IConfigurationService, mockConfigService(configValue));
        const workspaceFolders = workspaceFolderPaths.map((path, index) => {
            const uri = URI.file(path);
            return new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.uri = uri;
                    this.name = basename(uri);
                    this.index = index;
                }
            };
        });
        instantiationService.stub(IWorkspaceContextService, mockWorkspaceService(workspaceFolders));
        instantiationService.stub(IWorkbenchEnvironmentService, {});
        instantiationService.stub(IUserDataProfileService, new TestUserDataProfileService());
        instantiationService.stub(ISearchService, {
            async fileSearch(query) {
                // mock the search service
                const fs = instantiationService.get(IFileService);
                const findFilesInLocation = async (location, results = []) => {
                    try {
                        const resolve = await fs.resolve(location);
                        if (resolve.isFile) {
                            results.push(resolve.resource);
                        }
                        else if (resolve.isDirectory && resolve.children) {
                            for (const child of resolve.children) {
                                await findFilesInLocation(child.resource, results);
                            }
                        }
                    }
                    catch (error) {
                    }
                    return results;
                };
                const results = [];
                for (const folderQuery of query.folderQueries) {
                    const allFiles = await findFilesInLocation(folderQuery.folder);
                    for (const resource of allFiles) {
                        const pathInFolder = relativePath(folderQuery.folder, resource) ?? '';
                        if (query.filePattern === undefined || match(query.filePattern, pathInFolder)) {
                            results.push({ resource });
                        }
                    }
                }
                return { results, messages: [] };
            }
        });
        const locator = instantiationService.createInstance(PromptFilesLocator);
        return {
            async listFiles(type, storage, token) {
                return locator.listFiles(type, storage, token);
            },
            getConfigBasedSourceFolders(type) {
                return locator.getConfigBasedSourceFolders(type);
            },
            async disposeAsync() {
                await mockFs.delete();
            }
        };
    };
    suite('empty workspace', () => {
        const EMPTY_WORKSPACE = [];
        suite('empty filesystem', () => {
            testT('no config value', async () => {
                const locator = await createPromptsLocator(undefined, EMPTY_WORKSPACE, []);
                assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [], 'No prompts must be found.');
                await locator.disposeAsync();
            });
            testT('object config value', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts/': true,
                    '/tmp/prompts/': false,
                }, EMPTY_WORKSPACE, []);
                assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [], 'No prompts must be found.');
                await locator.disposeAsync();
            });
            testT('array config value', async () => {
                const locator = await createPromptsLocator([
                    'relative/path/to/prompts/',
                    '/abs/path',
                ], EMPTY_WORKSPACE, []);
                assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [], 'No prompts must be found.');
                await locator.disposeAsync();
            });
            testT('null config value', async () => {
                const locator = await createPromptsLocator(null, EMPTY_WORKSPACE, []);
                assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [], 'No prompts must be found.');
                await locator.disposeAsync();
            });
            testT('string config value', async () => {
                const locator = await createPromptsLocator('/etc/hosts/prompts', EMPTY_WORKSPACE, []);
                assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [], 'No prompts must be found.');
                await locator.disposeAsync();
            });
        });
        suite('non-empty filesystem', () => {
            testT('core logic', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': true,
                }, EMPTY_WORKSPACE, [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                ]);
                assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                    '/Users/legomushroom/repos/prompts/test.prompt.md',
                    '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
                    '/tmp/prompts/translate.to-rust.prompt.md'
                ], 'Must find correct prompts.');
                await locator.disposeAsync();
            });
            suite('absolute', () => {
                testT('wild card', async () => {
                    const settings = [
                        '/Users/legomushroom/repos/vscode/**',
                        '/Users/legomushroom/repos/vscode/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**',
                        '/Users/legomushroom/repos/vscode/deps/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**',
                        '/Users/legomushroom/repos/vscode/**/text/**/*',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.prompt.md',
                    ];
                    for (const setting of settings) {
                        const locator = await createPromptsLocator({ [setting]: true }, EMPTY_WORKSPACE, [
                            {
                                name: '/Users/legomushroom/repos/vscode',
                                children: [
                                    {
                                        name: 'deps/text',
                                        children: [
                                            {
                                                name: 'my.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'nested',
                                                children: [
                                                    {
                                                        name: 'specific.prompt.md',
                                                        contents: 'oh hi, bot!',
                                                    },
                                                    {
                                                        name: 'unspecific1.prompt.md',
                                                        contents: 'oh hi, robot!',
                                                    },
                                                    {
                                                        name: 'unspecific2.prompt.md',
                                                        contents: 'oh hi, rabot!',
                                                    },
                                                    {
                                                        name: 'readme.md',
                                                        contents: 'non prompt file',
                                                    },
                                                ],
                                            }
                                        ],
                                    },
                                ],
                            },
                        ]);
                        assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                            '/Users/legomushroom/repos/vscode/deps/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md',
                        ], 'Must find correct prompts.');
                        await locator.disposeAsync();
                    }
                });
                testT(`specific`, async () => {
                    const testSettings = [
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific*',
                            '/Users/legomushroom/repos/vscode/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/nested/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/deps/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/text/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/*spec*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2*.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        const vscodeSettings = {};
                        for (const setting of settings) {
                            vscodeSettings[setting] = true;
                        }
                        const locator = await createPromptsLocator(vscodeSettings, EMPTY_WORKSPACE, [
                            {
                                name: '/Users/legomushroom/repos/vscode',
                                children: [
                                    {
                                        name: 'deps/text',
                                        children: [
                                            {
                                                name: 'my.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'nested',
                                                children: [
                                                    {
                                                        name: 'default.prompt.md',
                                                        contents: 'oh hi, bot!',
                                                    },
                                                    {
                                                        name: 'specific.prompt.md',
                                                        contents: 'oh hi, bot!',
                                                    },
                                                    {
                                                        name: 'unspecific1.prompt.md',
                                                        contents: 'oh hi, robot!',
                                                    },
                                                    {
                                                        name: 'unspecific2.prompt.md',
                                                        contents: 'oh hi, rawbot!',
                                                    },
                                                    {
                                                        name: 'readme.md',
                                                        contents: 'non prompt file',
                                                    },
                                                ],
                                            }
                                        ],
                                    },
                                ],
                            },
                        ]);
                        assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md',
                        ], 'Must find correct prompts.');
                        await locator.disposeAsync();
                    }
                });
            });
        });
    });
    suite('single-root workspace', () => {
        suite('glob pattern', () => {
            suite('relative', () => {
                testT('wild card', async () => {
                    const testSettings = [
                        '**',
                        '**/*.prompt.md',
                        '**/*.md',
                        '**/*',
                        'deps/**',
                        'deps/**/*.prompt.md',
                        'deps/**/*',
                        'deps/**/*.md',
                        '**/text/**',
                        '**/text/**/*',
                        '**/text/**/*.md',
                        '**/text/**/*.prompt.md',
                        'deps/text/**',
                        'deps/text/**/*',
                        'deps/text/**/*.md',
                        'deps/text/**/*.prompt.md',
                    ];
                    for (const setting of testSettings) {
                        const locator = await createPromptsLocator({ [setting]: true }, ['/Users/legomushroom/repos/vscode'], [
                            {
                                name: '/Users/legomushroom/repos/vscode',
                                children: [
                                    {
                                        name: 'deps/text',
                                        children: [
                                            {
                                                name: 'my.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'nested',
                                                children: [
                                                    {
                                                        name: 'specific.prompt.md',
                                                        contents: 'oh hi, bot!',
                                                    },
                                                    {
                                                        name: 'unspecific1.prompt.md',
                                                        contents: 'oh hi, robot!',
                                                    },
                                                    {
                                                        name: 'unspecific2.prompt.md',
                                                        contents: 'oh hi, rabot!',
                                                    },
                                                    {
                                                        name: 'readme.md',
                                                        contents: 'non prompt file',
                                                    },
                                                ],
                                            }
                                        ],
                                    },
                                ],
                            },
                        ]);
                        assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                            '/Users/legomushroom/repos/vscode/deps/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md',
                        ], 'Must find correct prompts.');
                        await locator.disposeAsync();
                    }
                });
                testT(`specific`, async () => {
                    const testSettings = [
                        [
                            '**/*specific*',
                        ],
                        [
                            '**/*specific*.prompt.md',
                        ],
                        [
                            '**/*specific*.md',
                        ],
                        [
                            '**/specific*',
                            '**/unspecific1.prompt.md',
                            '**/unspecific2.prompt.md',
                        ],
                        [
                            '**/specific.prompt.md',
                            '**/unspecific*.prompt.md',
                        ],
                        [
                            '**/nested/specific.prompt.md',
                            '**/nested/unspecific*.prompt.md',
                        ],
                        [
                            '**/nested/*specific*',
                        ],
                        [
                            '**/*spec*.prompt.md',
                        ],
                        [
                            '**/*spec*',
                        ],
                        [
                            '**/*spec*.md',
                        ],
                        [
                            '**/deps/**/*spec*.md',
                        ],
                        [
                            '**/text/**/*spec*.md',
                        ],
                        [
                            'deps/text/nested/*spec*',
                        ],
                        [
                            'deps/text/nested/*specific*',
                        ],
                        [
                            'deps/**/*specific*',
                        ],
                        [
                            'deps/**/specific*',
                            'deps/**/unspecific*.prompt.md',
                        ],
                        [
                            'deps/**/specific*.md',
                            'deps/**/unspecific*.md',
                        ],
                        [
                            'deps/**/specific.prompt.md',
                            'deps/**/unspecific1.prompt.md',
                            'deps/**/unspecific2.prompt.md',
                        ],
                        [
                            'deps/**/specific.prompt.md',
                            'deps/**/unspecific1*.md',
                            'deps/**/unspecific2*.md',
                        ],
                        [
                            'deps/text/**/*specific*',
                        ],
                        [
                            'deps/text/**/specific*',
                            'deps/text/**/unspecific*.prompt.md',
                        ],
                        [
                            'deps/text/**/specific*.md',
                            'deps/text/**/unspecific*.md',
                        ],
                        [
                            'deps/text/**/specific.prompt.md',
                            'deps/text/**/unspecific1.prompt.md',
                            'deps/text/**/unspecific2.prompt.md',
                        ],
                        [
                            'deps/text/**/specific.prompt.md',
                            'deps/text/**/unspecific1*.md',
                            'deps/text/**/unspecific2*.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        const vscodeSettings = {};
                        for (const setting of settings) {
                            vscodeSettings[setting] = true;
                        }
                        const locator = await createPromptsLocator(vscodeSettings, ['/Users/legomushroom/repos/vscode'], [
                            {
                                name: '/Users/legomushroom/repos/vscode',
                                children: [
                                    {
                                        name: 'deps/text',
                                        children: [
                                            {
                                                name: 'my.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'nested',
                                                children: [
                                                    {
                                                        name: 'default.prompt.md',
                                                        contents: 'oh hi, bot!',
                                                    },
                                                    {
                                                        name: 'specific.prompt.md',
                                                        contents: 'oh hi, bot!',
                                                    },
                                                    {
                                                        name: 'unspecific1.prompt.md',
                                                        contents: 'oh hi, robot!',
                                                    },
                                                    {
                                                        name: 'unspecific2.prompt.md',
                                                        contents: 'oh hi, rawbot!',
                                                    },
                                                    {
                                                        name: 'readme.md',
                                                        contents: 'non prompt file',
                                                    },
                                                ],
                                            }
                                        ],
                                    },
                                ],
                            },
                        ]);
                        assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md',
                        ], 'Must find correct prompts.');
                        await locator.disposeAsync();
                    }
                });
            });
            suite('absolute', () => {
                testT('wild card', async () => {
                    const settings = [
                        '/Users/legomushroom/repos/vscode/**',
                        '/Users/legomushroom/repos/vscode/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**',
                        '/Users/legomushroom/repos/vscode/deps/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/**/*',
                        '/Users/legomushroom/repos/vscode/deps/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**',
                        '/Users/legomushroom/repos/vscode/**/text/**/*',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/**/text/**/*.prompt.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.md',
                        '/Users/legomushroom/repos/vscode/deps/text/**/*.prompt.md',
                    ];
                    for (const setting of settings) {
                        const locator = await createPromptsLocator({ [setting]: true }, ['/Users/legomushroom/repos/vscode'], [
                            {
                                name: '/Users/legomushroom/repos/vscode',
                                children: [
                                    {
                                        name: 'deps/text',
                                        children: [
                                            {
                                                name: 'my.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'nested',
                                                children: [
                                                    {
                                                        name: 'specific.prompt.md',
                                                        contents: 'oh hi, bot!',
                                                    },
                                                    {
                                                        name: 'unspecific1.prompt.md',
                                                        contents: 'oh hi, robot!',
                                                    },
                                                    {
                                                        name: 'unspecific2.prompt.md',
                                                        contents: 'oh hi, rabot!',
                                                    },
                                                    {
                                                        name: 'readme.md',
                                                        contents: 'non prompt file',
                                                    },
                                                ],
                                            }
                                        ],
                                    },
                                ],
                            },
                        ]);
                        assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                            '/Users/legomushroom/repos/vscode/deps/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md',
                        ], 'Must find correct prompts.');
                        await locator.disposeAsync();
                    }
                });
                testT(`specific`, async () => {
                    const testSettings = [
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*specific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific*',
                            '/Users/legomushroom/repos/vscode/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/**/nested/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/nested/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/deps/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/**/text/**/*spec*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/*spec*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/**/unspecific2*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/*specific*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/deps/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific1*.md',
                            '/Users/legomushroom/repos/vscode/deps/text/**/unspecific2*.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        const vscodeSettings = {};
                        for (const setting of settings) {
                            vscodeSettings[setting] = true;
                        }
                        const locator = await createPromptsLocator(vscodeSettings, ['/Users/legomushroom/repos/vscode'], [
                            {
                                name: '/Users/legomushroom/repos/vscode',
                                children: [
                                    {
                                        name: 'deps/text',
                                        children: [
                                            {
                                                name: 'my.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'nested',
                                                children: [
                                                    {
                                                        name: 'default.prompt.md',
                                                        contents: 'oh hi, bot!',
                                                    },
                                                    {
                                                        name: 'specific.prompt.md',
                                                        contents: 'oh hi, bot!',
                                                    },
                                                    {
                                                        name: 'unspecific1.prompt.md',
                                                        contents: 'oh hi, robot!',
                                                    },
                                                    {
                                                        name: 'unspecific2.prompt.md',
                                                        contents: 'oh hi, rawbot!',
                                                    },
                                                    {
                                                        name: 'readme.md',
                                                        contents: 'non prompt file',
                                                    },
                                                ],
                                            }
                                        ],
                                    },
                                ],
                            },
                        ]);
                        assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                            '/Users/legomushroom/repos/vscode/deps/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/deps/text/nested/unspecific2.prompt.md',
                        ], 'Must find correct prompts.');
                        await locator.disposeAsync();
                    }
                });
            });
        });
    });
    testT('core logic', async () => {
        const locator = await createPromptsLocator({
            '/Users/legomushroom/repos/prompts': true,
            '/tmp/prompts/': true,
            '/absolute/path/prompts': false,
            '.copilot/prompts': true,
        }, [
            '/Users/legomushroom/repos/vscode',
        ], [
            {
                name: '/Users/legomushroom/repos/prompts',
                children: [
                    {
                        name: 'test.prompt.md',
                        contents: 'Hello, World!',
                    },
                    {
                        name: 'refactor-tests.prompt.md',
                        contents: 'some file content goes here',
                    },
                ],
            },
            {
                name: '/tmp/prompts',
                children: [
                    {
                        name: 'translate.to-rust.prompt.md',
                        contents: 'some more random file contents',
                    },
                ],
            },
            {
                name: '/absolute/path/prompts',
                children: [
                    {
                        name: 'some-prompt-file.prompt.md',
                        contents: 'hey hey hey',
                    },
                ],
            },
            {
                name: '/Users/legomushroom/repos/vscode',
                children: [
                    {
                        name: '.copilot/prompts',
                        children: [
                            {
                                name: 'default.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                        ],
                    },
                    {
                        name: '.github/prompts',
                        children: [
                            {
                                name: 'my.prompt.md',
                                contents: 'oh hi, bot!',
                            },
                        ],
                    },
                ],
            },
        ]);
        assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
            '/Users/legomushroom/repos/vscode/.github/prompts/my.prompt.md',
            '/Users/legomushroom/repos/prompts/test.prompt.md',
            '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
            '/tmp/prompts/translate.to-rust.prompt.md',
            '/Users/legomushroom/repos/vscode/.copilot/prompts/default.prompt.md',
        ], 'Must find correct prompts.');
        await locator.disposeAsync();
    });
    testT('with disabled `.github/prompts` location', async () => {
        const locator = await createPromptsLocator({
            '/Users/legomushroom/repos/prompts': true,
            '/tmp/prompts/': true,
            '/absolute/path/prompts': false,
            '.copilot/prompts': true,
            '.github/prompts': false,
        }, [
            '/Users/legomushroom/repos/vscode',
        ], [
            {
                name: '/Users/legomushroom/repos/prompts',
                children: [
                    {
                        name: 'test.prompt.md',
                        contents: 'Hello, World!',
                    },
                    {
                        name: 'refactor-tests.prompt.md',
                        contents: 'some file content goes here',
                    },
                ],
            },
            {
                name: '/tmp/prompts',
                children: [
                    {
                        name: 'translate.to-rust.prompt.md',
                        contents: 'some more random file contents',
                    },
                ],
            },
            {
                name: '/absolute/path/prompts',
                children: [
                    {
                        name: 'some-prompt-file.prompt.md',
                        contents: 'hey hey hey',
                    },
                ],
            },
            {
                name: '/Users/legomushroom/repos/vscode',
                children: [
                    {
                        name: '.copilot/prompts',
                        children: [
                            {
                                name: 'default.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                        ],
                    },
                    {
                        name: '.github/prompts',
                        children: [
                            {
                                name: 'my.prompt.md',
                                contents: 'oh hi, bot!',
                            },
                            {
                                name: 'your.prompt.md',
                                contents: 'oh hi, bot!',
                            },
                        ],
                    },
                ],
            },
        ]);
        assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
            '/Users/legomushroom/repos/prompts/test.prompt.md',
            '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
            '/tmp/prompts/translate.to-rust.prompt.md',
            '/Users/legomushroom/repos/vscode/.copilot/prompts/default.prompt.md',
        ], 'Must find correct prompts.');
        await locator.disposeAsync();
    });
    suite('multi-root workspace', () => {
        suite('core logic', () => {
            testT('without top-level `.github` folder', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': false,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is not part of the workspace, so prompt files are `ignored`
                    {
                        name: '/Users/legomushroom/repos/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                    '/Users/legomushroom/repos/vscode/.github/prompts/default.prompt.md',
                    '/Users/legomushroom/repos/node/.github/prompts/refactor-static-classes.prompt.md',
                    '/Users/legomushroom/repos/prompts/test.prompt.md',
                    '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
                    '/tmp/prompts/translate.to-rust.prompt.md',
                ], 'Must find correct prompts.');
                await locator.disposeAsync();
            });
            testT('with top-level `.github` folder', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': false,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                    '/var/shared/prompts',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is part of the workspace, so prompt files are `included`
                    {
                        name: '/var/shared/prompts/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                    '/Users/legomushroom/repos/vscode/.github/prompts/default.prompt.md',
                    '/Users/legomushroom/repos/node/.github/prompts/refactor-static-classes.prompt.md',
                    '/var/shared/prompts/.github/prompts/prompt-name.prompt.md',
                    '/var/shared/prompts/.github/prompts/name-of-the-prompt.prompt.md',
                    '/Users/legomushroom/repos/prompts/test.prompt.md',
                    '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
                    '/tmp/prompts/translate.to-rust.prompt.md',
                ], 'Must find correct prompts.');
                await locator.disposeAsync();
            });
            testT('with disabled `.github/prompts` location', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/prompts': true,
                    '/tmp/prompts/': true,
                    '/absolute/path/prompts': false,
                    '.copilot/prompts': false,
                    '.github/prompts': false,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                    '/var/shared/prompts',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is part of the workspace, so prompt files are `included`
                    {
                        name: '/var/shared/prompts/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                    '/Users/legomushroom/repos/prompts/test.prompt.md',
                    '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
                    '/tmp/prompts/translate.to-rust.prompt.md',
                ], 'Must find correct prompts.');
                await locator.disposeAsync();
            });
            testT('mixed', async () => {
                const locator = await createPromptsLocator({
                    '/Users/legomushroom/repos/**/*test*': true,
                    '.copilot/prompts': false,
                    '.github/prompts': true,
                    '/absolute/path/prompts/some-prompt-file.prompt.md': true,
                }, [
                    '/Users/legomushroom/repos/vscode',
                    '/Users/legomushroom/repos/node',
                    '/var/shared/prompts',
                ], [
                    {
                        name: '/Users/legomushroom/repos/prompts',
                        children: [
                            {
                                name: 'test.prompt.md',
                                contents: 'Hello, World!',
                            },
                            {
                                name: 'refactor-tests.prompt.md',
                                contents: 'some file content goes here',
                            },
                            {
                                name: 'elf.prompt.md',
                                contents: 'haalo!',
                            },
                        ],
                    },
                    {
                        name: '/tmp/prompts',
                        children: [
                            {
                                name: 'translate.to-rust.prompt.md',
                                contents: 'some more random file contents',
                            },
                        ],
                    },
                    {
                        name: '/absolute/path/prompts',
                        children: [
                            {
                                name: 'some-prompt-file.prompt.md',
                                contents: 'hey hey hey',
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/vscode',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt1.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'default.prompt.md',
                                        contents: 'oh hi, bot!',
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: '/Users/legomushroom/repos/node',
                        children: [
                            {
                                name: '.copilot/prompts',
                                children: [
                                    {
                                        name: 'prompt5.prompt.md',
                                        contents: 'oh hi, robot!',
                                    },
                                ],
                            },
                            {
                                name: '.github/prompts',
                                children: [
                                    {
                                        name: 'refactor-static-classes.prompt.md',
                                        contents: 'file contents',
                                    },
                                ],
                            },
                        ],
                    },
                    // note! this folder is part of the workspace, so prompt files are `included`
                    {
                        name: '/var/shared/prompts/.github/prompts',
                        children: [
                            {
                                name: 'prompt-name.prompt.md',
                                contents: 'oh hi, robot!',
                            },
                            {
                                name: 'name-of-the-prompt.prompt.md',
                                contents: 'oh hi, raw bot!',
                            },
                        ],
                    },
                ]);
                assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                    // all of these are due to the `.github/prompts` setting
                    '/Users/legomushroom/repos/vscode/.github/prompts/default.prompt.md',
                    '/Users/legomushroom/repos/node/.github/prompts/refactor-static-classes.prompt.md',
                    '/var/shared/prompts/.github/prompts/prompt-name.prompt.md',
                    '/var/shared/prompts/.github/prompts/name-of-the-prompt.prompt.md',
                    // all of these are due to the `/Users/legomushroom/repos/**/*test*` setting
                    '/Users/legomushroom/repos/prompts/test.prompt.md',
                    '/Users/legomushroom/repos/prompts/refactor-tests.prompt.md',
                    // this one is due to the specific `/absolute/path/prompts/some-prompt-file.prompt.md` setting
                    '/absolute/path/prompts/some-prompt-file.prompt.md',
                ], 'Must find correct prompts.');
                await locator.disposeAsync();
            });
        });
        suite('glob pattern', () => {
            suite('relative', () => {
                testT('wild card', async () => {
                    const testSettings = [
                        '**',
                        '**/*.prompt.md',
                        '**/*.md',
                        '**/*',
                        'gen*/**',
                        'gen*/**/*.prompt.md',
                        'gen*/**/*',
                        'gen*/**/*.md',
                        '**/gen*/**',
                        '**/gen*/**/*',
                        '**/gen*/**/*.md',
                        '**/gen*/**/*.prompt.md',
                        '{generic,general,gen}/**',
                        '{generic,general,gen}/**/*.prompt.md',
                        '{generic,general,gen}/**/*',
                        '{generic,general,gen}/**/*.md',
                        '**/{generic,general,gen}/**',
                        '**/{generic,general,gen}/**/*',
                        '**/{generic,general,gen}/**/*.md',
                        '**/{generic,general,gen}/**/*.prompt.md',
                    ];
                    for (const setting of testSettings) {
                        const locator = await createPromptsLocator({ [setting]: true }, [
                            '/Users/legomushroom/repos/vscode',
                            '/Users/legomushroom/repos/prompts',
                        ], [
                            {
                                name: '/Users/legomushroom/repos/vscode',
                                children: [
                                    {
                                        name: 'gen/text',
                                        children: [
                                            {
                                                name: 'my.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'nested',
                                                children: [
                                                    {
                                                        name: 'specific.prompt.md',
                                                        contents: 'oh hi, bot!',
                                                    },
                                                    {
                                                        name: 'unspecific1.prompt.md',
                                                        contents: 'oh hi, robot!',
                                                    },
                                                    {
                                                        name: 'unspecific2.prompt.md',
                                                        contents: 'oh hi, rabot!',
                                                    },
                                                    {
                                                        name: 'readme.md',
                                                        contents: 'non prompt file',
                                                    },
                                                ],
                                            }
                                        ],
                                    },
                                ],
                            },
                            {
                                name: '/Users/legomushroom/repos/prompts',
                                children: [
                                    {
                                        name: 'general',
                                        children: [
                                            {
                                                name: 'common.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'uncommon-10.prompt.md',
                                                contents: 'oh hi, robot!',
                                            },
                                            {
                                                name: 'license.md',
                                                contents: 'non prompt file',
                                            },
                                        ],
                                    }
                                ],
                            },
                        ]);
                        assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md',
                            // -
                            '/Users/legomushroom/repos/prompts/general/common.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md',
                        ], 'Must find correct prompts.');
                        await locator.disposeAsync();
                    }
                });
                testT(`specific`, async () => {
                    const testSettings = [
                        [
                            '**/my.prompt.md',
                            '**/*specific*',
                            '**/*common*',
                        ],
                        [
                            '**/my.prompt.md',
                            '**/*specific*.prompt.md',
                            '**/*common*.prompt.md',
                        ],
                        [
                            '**/my*.md',
                            '**/*specific*.md',
                            '**/*common*.md',
                        ],
                        [
                            '**/my*.md',
                            '**/specific*',
                            '**/unspecific*',
                            '**/common*',
                            '**/uncommon*',
                        ],
                        [
                            '**/my.prompt.md',
                            '**/specific.prompt.md',
                            '**/unspecific1.prompt.md',
                            '**/unspecific2.prompt.md',
                            '**/common.prompt.md',
                            '**/uncommon-10.prompt.md',
                        ],
                        [
                            'gen*/**/my.prompt.md',
                            'gen*/**/*specific*',
                            'gen*/**/*common*',
                        ],
                        [
                            'gen*/**/my.prompt.md',
                            'gen*/**/*specific*.prompt.md',
                            'gen*/**/*common*.prompt.md',
                        ],
                        [
                            'gen*/**/my*.md',
                            'gen*/**/*specific*.md',
                            'gen*/**/*common*.md',
                        ],
                        [
                            'gen*/**/my*.md',
                            'gen*/**/specific*',
                            'gen*/**/unspecific*',
                            'gen*/**/common*',
                            'gen*/**/uncommon*',
                        ],
                        [
                            'gen*/**/my.prompt.md',
                            'gen*/**/specific.prompt.md',
                            'gen*/**/unspecific1.prompt.md',
                            'gen*/**/unspecific2.prompt.md',
                            'gen*/**/common.prompt.md',
                            'gen*/**/uncommon-10.prompt.md',
                        ],
                        [
                            'gen/text/my.prompt.md',
                            'gen/text/nested/specific.prompt.md',
                            'gen/text/nested/unspecific1.prompt.md',
                            'gen/text/nested/unspecific2.prompt.md',
                            'general/common.prompt.md',
                            'general/uncommon-10.prompt.md',
                        ],
                        [
                            'gen/text/my.prompt.md',
                            'gen/text/nested/*specific*',
                            'general/*common*',
                        ],
                        [
                            'gen/text/my.prompt.md',
                            'gen/text/**/specific.prompt.md',
                            'gen/text/**/unspecific1.prompt.md',
                            'gen/text/**/unspecific2.prompt.md',
                            'general/*',
                        ],
                        [
                            '{gen,general}/**/my.prompt.md',
                            '{gen,general}/**/*specific*',
                            '{gen,general}/**/*common*',
                        ],
                        [
                            '{gen,general}/**/my.prompt.md',
                            '{gen,general}/**/*specific*.prompt.md',
                            '{gen,general}/**/*common*.prompt.md',
                        ],
                        [
                            '{gen,general}/**/my*.md',
                            '{gen,general}/**/*specific*.md',
                            '{gen,general}/**/*common*.md',
                        ],
                        [
                            '{gen,general}/**/my*.md',
                            '{gen,general}/**/specific*',
                            '{gen,general}/**/unspecific*',
                            '{gen,general}/**/common*',
                            '{gen,general}/**/uncommon*',
                        ],
                        [
                            '{gen,general}/**/my.prompt.md',
                            '{gen,general}/**/specific.prompt.md',
                            '{gen,general}/**/unspecific1.prompt.md',
                            '{gen,general}/**/unspecific2.prompt.md',
                            '{gen,general}/**/common.prompt.md',
                            '{gen,general}/**/uncommon-10.prompt.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        const vscodeSettings = {};
                        for (const setting of settings) {
                            vscodeSettings[setting] = true;
                        }
                        const locator = await createPromptsLocator(vscodeSettings, [
                            '/Users/legomushroom/repos/vscode',
                            '/Users/legomushroom/repos/prompts',
                        ], [
                            {
                                name: '/Users/legomushroom/repos/vscode',
                                children: [
                                    {
                                        name: 'gen/text',
                                        children: [
                                            {
                                                name: 'my.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'nested',
                                                children: [
                                                    {
                                                        name: 'specific.prompt.md',
                                                        contents: 'oh hi, bot!',
                                                    },
                                                    {
                                                        name: 'unspecific1.prompt.md',
                                                        contents: 'oh hi, robot!',
                                                    },
                                                    {
                                                        name: 'unspecific2.prompt.md',
                                                        contents: 'oh hi, rabot!',
                                                    },
                                                    {
                                                        name: 'readme.md',
                                                        contents: 'non prompt file',
                                                    },
                                                ],
                                            }
                                        ],
                                    },
                                ],
                            },
                            {
                                name: '/Users/legomushroom/repos/prompts',
                                children: [
                                    {
                                        name: 'general',
                                        children: [
                                            {
                                                name: 'common.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'uncommon-10.prompt.md',
                                                contents: 'oh hi, robot!',
                                            },
                                            {
                                                name: 'license.md',
                                                contents: 'non prompt file',
                                            },
                                        ],
                                    }
                                ],
                            },
                        ]);
                        assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md',
                            // -
                            '/Users/legomushroom/repos/prompts/general/common.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md',
                        ], 'Must find correct prompts.');
                        await locator.disposeAsync();
                    }
                });
            });
            suite('absolute', () => {
                testT('wild card', async () => {
                    const testSettings = [
                        '/Users/legomushroom/repos/**',
                        '/Users/legomushroom/repos/**/*.prompt.md',
                        '/Users/legomushroom/repos/**/*.md',
                        '/Users/legomushroom/repos/**/*',
                        '/Users/legomushroom/repos/**/gen*/**',
                        '/Users/legomushroom/repos/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/**/gen*/**/*',
                        '/Users/legomushroom/repos/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/**/gen*/**',
                        '/Users/legomushroom/repos/**/gen*/**/*',
                        '/Users/legomushroom/repos/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/gen*/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.prompt.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.md',
                        '/Users/legomushroom/repos/{vscode,prompts}/**/{general,gen}/**/*.prompt.md',
                    ];
                    for (const setting of testSettings) {
                        const locator = await createPromptsLocator({ [setting]: true }, [
                            '/Users/legomushroom/repos/vscode',
                            '/Users/legomushroom/repos/prompts',
                        ], [
                            {
                                name: '/Users/legomushroom/repos/vscode',
                                children: [
                                    {
                                        name: 'gen/text',
                                        children: [
                                            {
                                                name: 'my.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'nested',
                                                children: [
                                                    {
                                                        name: 'specific.prompt.md',
                                                        contents: 'oh hi, bot!',
                                                    },
                                                    {
                                                        name: 'unspecific1.prompt.md',
                                                        contents: 'oh hi, robot!',
                                                    },
                                                    {
                                                        name: 'unspecific2.prompt.md',
                                                        contents: 'oh hi, rabot!',
                                                    },
                                                    {
                                                        name: 'readme.md',
                                                        contents: 'non prompt file',
                                                    },
                                                ],
                                            }
                                        ],
                                    },
                                ],
                            },
                            {
                                name: '/Users/legomushroom/repos/prompts',
                                children: [
                                    {
                                        name: 'general',
                                        children: [
                                            {
                                                name: 'common.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'uncommon-10.prompt.md',
                                                contents: 'oh hi, robot!',
                                            },
                                            {
                                                name: 'license.md',
                                                contents: 'non prompt file',
                                            },
                                        ],
                                    }
                                ],
                            },
                        ]);
                        assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md',
                            // -
                            '/Users/legomushroom/repos/prompts/general/common.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md',
                        ], 'Must find correct prompts.');
                        await locator.disposeAsync();
                    }
                });
                testT(`specific`, async () => {
                    const testSettings = [
                        [
                            '/Users/legomushroom/repos/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/*specific*',
                            '/Users/legomushroom/repos/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my*.md',
                            '/Users/legomushroom/repos/**/*specific*.md',
                            '/Users/legomushroom/repos/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my*.md',
                            '/Users/legomushroom/repos/**/specific*',
                            '/Users/legomushroom/repos/**/unspecific*',
                            '/Users/legomushroom/repos/**/common*',
                            '/Users/legomushroom/repos/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/specific.prompt.md',
                            '/Users/legomushroom/repos/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/**/common.prompt.md',
                            '/Users/legomushroom/repos/**/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/*specific*',
                            '/Users/legomushroom/repos/**/gen*/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my*.md',
                            '/Users/legomushroom/repos/**/gen*/**/*specific*.md',
                            '/Users/legomushroom/repos/**/gen*/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my*.md',
                            '/Users/legomushroom/repos/**/gen*/**/specific*',
                            '/Users/legomushroom/repos/**/gen*/**/unspecific*',
                            '/Users/legomushroom/repos/**/gen*/**/common*',
                            '/Users/legomushroom/repos/**/gen*/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/gen*/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/specific.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/common.prompt.md',
                            '/Users/legomushroom/repos/**/gen*/**/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/common.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/*specific*',
                            '/Users/legomushroom/repos/prompts/general/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/**/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*specific*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*specific*.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/specific*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/unspecific*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/common*',
                            '/Users/legomushroom/repos/**/{gen,general}/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/**/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/specific.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/common.prompt.md',
                            '/Users/legomushroom/repos/**/{gen,general}/**/uncommon-10.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*specific*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*common*',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*specific*.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*common*.prompt.md',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*specific*.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/*common*.md',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my*.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/specific*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/unspecific*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/common*',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/uncommon*',
                        ],
                        [
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/my.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/specific.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/unspecific2.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/common.prompt.md',
                            '/Users/legomushroom/repos/{prompts,vscode,copilot}/{gen,general}/**/uncommon-10.prompt.md',
                        ],
                    ];
                    for (const settings of testSettings) {
                        const vscodeSettings = {};
                        for (const setting of settings) {
                            vscodeSettings[setting] = true;
                        }
                        const locator = await createPromptsLocator(vscodeSettings, [
                            '/Users/legomushroom/repos/vscode',
                            '/Users/legomushroom/repos/prompts',
                        ], [
                            {
                                name: '/Users/legomushroom/repos/vscode',
                                children: [
                                    {
                                        name: 'gen/text',
                                        children: [
                                            {
                                                name: 'my.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'nested',
                                                children: [
                                                    {
                                                        name: 'specific.prompt.md',
                                                        contents: 'oh hi, bot!',
                                                    },
                                                    {
                                                        name: 'unspecific1.prompt.md',
                                                        contents: 'oh hi, robot!',
                                                    },
                                                    {
                                                        name: 'unspecific2.prompt.md',
                                                        contents: 'oh hi, rabot!',
                                                    },
                                                    {
                                                        name: 'readme.md',
                                                        contents: 'non prompt file',
                                                    },
                                                ],
                                            }
                                        ],
                                    },
                                ],
                            },
                            {
                                name: '/Users/legomushroom/repos/prompts',
                                children: [
                                    {
                                        name: 'general',
                                        children: [
                                            {
                                                name: 'common.prompt.md',
                                                contents: 'oh hi, bot!',
                                            },
                                            {
                                                name: 'uncommon-10.prompt.md',
                                                contents: 'oh hi, robot!',
                                            },
                                            {
                                                name: 'license.md',
                                                contents: 'non prompt file',
                                            },
                                        ],
                                    }
                                ],
                            },
                        ]);
                        assertOutcome(await locator.listFiles(PromptsType.prompt, PromptsStorage.local, CancellationToken.None), [
                            '/Users/legomushroom/repos/vscode/gen/text/my.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/specific.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific1.prompt.md',
                            '/Users/legomushroom/repos/vscode/gen/text/nested/unspecific2.prompt.md',
                            // -
                            '/Users/legomushroom/repos/prompts/general/common.prompt.md',
                            '/Users/legomushroom/repos/prompts/general/uncommon-10.prompt.md',
                        ], 'Must find correct prompts.');
                        await locator.disposeAsync();
                    }
                });
            });
        });
    });
    suite('isValidGlob', () => {
        testT('valid patterns', async () => {
            const globs = [
                '**',
                '\*',
                '\**',
                '**/*',
                '**/*.prompt.md',
                '/Users/legomushroom/**/*.prompt.md',
                '/Users/legomushroom/*.prompt.md',
                '/Users/legomushroom/*',
                '/Users/legomushroom/repos/{repo1,test}',
                '/Users/legomushroom/repos/{repo1,test}/**',
                '/Users/legomushroom/repos/{repo1,test}/*',
                '/Users/legomushroom/**/{repo1,test}/**',
                '/Users/legomushroom/**/{repo1,test}',
                '/Users/legomushroom/**/{repo1,test}/*',
                '/Users/legomushroom/**/repo[1,2,3]',
                '/Users/legomushroom/**/repo[1,2,3]/**',
                '/Users/legomushroom/**/repo[1,2,3]/*',
                '/Users/legomushroom/**/repo[1,2,3]/**/*.prompt.md',
                'repo[1,2,3]/**/*.prompt.md',
                'repo[[1,2,3]/**/*.prompt.md',
                '{repo1,test}/*.prompt.md',
                '{repo1,test}/*',
                '/{repo1,test}/*',
                '/{repo1,test}}/*',
            ];
            for (const glob of globs) {
                assert((isValidGlob(glob) === true), `'${glob}' must be a 'valid' glob pattern.`);
            }
        });
        testT('invalid patterns', async () => {
            const globs = [
                '.',
                '\\*',
                '\\?',
                '\\*\\?\\*',
                'repo[1,2,3',
                'repo1,2,3]',
                'repo\\[1,2,3]',
                'repo[1,2,3\\]',
                'repo\\[1,2,3\\]',
                '{repo1,repo2',
                'repo1,repo2}',
                '\\{repo1,repo2}',
                '{repo1,repo2\\}',
                '\\{repo1,repo2\\}',
                '/Users/legomushroom/repos',
                '/Users/legomushroom/repo[1,2,3',
                '/Users/legomushroom/repo1,2,3]',
                '/Users/legomushroom/repo\\[1,2,3]',
                '/Users/legomushroom/repo[1,2,3\\]',
                '/Users/legomushroom/repo\\[1,2,3\\]',
                '/Users/legomushroom/{repo1,repo2',
                '/Users/legomushroom/repo1,repo2}',
                '/Users/legomushroom/\\{repo1,repo2}',
                '/Users/legomushroom/{repo1,repo2\\}',
                '/Users/legomushroom/\\{repo1,repo2\\}',
            ];
            for (const glob of globs) {
                assert((isValidGlob(glob) === false), `'${glob}' must be an 'invalid' glob pattern.`);
            }
        });
    });
    suite('getConfigBasedSourceFolders', () => {
        testT('gets unambiguous list of folders', async () => {
            const locator = await createPromptsLocator({
                '.github/prompts': true,
                '/Users/**/repos/**': true,
                'gen/text/**': true,
                'gen/text/nested/*.prompt.md': true,
                'general/*': true,
                '/Users/legomushroom/repos/vscode/my-prompts': true,
                '/Users/legomushroom/repos/vscode/your-prompts/*.md': true,
                '/Users/legomushroom/repos/prompts/shared-prompts/*': true,
            }, [
                '/Users/legomushroom/repos/vscode',
                '/Users/legomushroom/repos/prompts',
            ], []);
            assertOutcome(locator.getConfigBasedSourceFolders(PromptsType.prompt), [
                '/Users/legomushroom/repos/vscode/.github/prompts',
                '/Users/legomushroom/repos/prompts/.github/prompts',
                '/Users/legomushroom/repos/vscode/gen/text/nested',
                '/Users/legomushroom/repos/prompts/gen/text/nested',
                '/Users/legomushroom/repos/vscode/general',
                '/Users/legomushroom/repos/prompts/general',
                '/Users/legomushroom/repos/vscode/my-prompts',
                '/Users/legomushroom/repos/vscode/your-prompts',
                '/Users/legomushroom/repos/prompts/shared-prompts',
            ], 'Must find correct prompts.');
            await locator.disposeAsync();
        });
    });
});
function assertOutcome(actual, expected, message) {
    assert.deepStrictEqual(actual.map((uri) => uri.path), expected, message);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZXNMb2NhdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC91dGlscy9wcm9tcHRGaWxlc0xvY2F0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDckYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDckUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekcsT0FBTyxFQUEyQixxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ3JJLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDeEYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFDdEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scUZBQXFGLENBQUM7QUFDL0gsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM5RixPQUFPLEVBQWMs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