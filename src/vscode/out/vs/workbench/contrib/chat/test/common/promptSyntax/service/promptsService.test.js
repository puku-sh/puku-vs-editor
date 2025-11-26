/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { CancellationToken } from '../../../../../../../base/common/cancellation.js';
import { ResourceSet } from '../../../../../../../base/common/map.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../../editor/common/services/model.js';
import { ModelService } from '../../../../../../../editor/common/services/modelService.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILabelService } from '../../../../../../../platform/label/common/label.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { ITelemetryService } from '../../../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../../../platform/workspace/common/workspace.js';
import { testWorkspace } from '../../../../../../../platform/workspace/test/common/testWorkspace.js';
import { IWorkbenchEnvironmentService } from '../../../../../../services/environment/common/environmentService.js';
import { IFilesConfigurationService } from '../../../../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IUserDataProfileService } from '../../../../../../services/userDataProfile/common/userDataProfile.js';
import { TestContextService, TestUserDataProfileService } from '../../../../../../test/common/workbenchTestServices.js';
import { ChatRequestVariableSet, isPromptFileVariableEntry, toFileVariableEntry } from '../../../../common/chatVariableEntries.js';
import { ComputeAutomaticInstructions, newInstructionsCollectionEvent } from '../../../../common/promptSyntax/computeAutomaticInstructions.js';
import { PromptsConfig } from '../../../../common/promptSyntax/config/config.js';
import { INSTRUCTION_FILE_EXTENSION, INSTRUCTIONS_DEFAULT_SOURCE_FOLDER, LEGACY_MODE_DEFAULT_SOURCE_FOLDER, PROMPT_DEFAULT_SOURCE_FOLDER, PROMPT_FILE_EXTENSION } from '../../../../common/promptSyntax/config/promptFileLocations.js';
import { INSTRUCTIONS_LANGUAGE_ID, PROMPT_LANGUAGE_ID, PromptsType } from '../../../../common/promptSyntax/promptTypes.js';
import { IPromptsService, PromptsStorage } from '../../../../common/promptSyntax/service/promptsService.js';
import { PromptsService } from '../../../../common/promptSyntax/service/promptsServiceImpl.js';
import { mockFiles } from '../testUtils/mockFilesystem.js';
import { InMemoryStorageService, IStorageService } from '../../../../../../../platform/storage/common/storage.js';
import { IPathService } from '../../../../../../services/path/common/pathService.js';
import { ISearchService } from '../../../../../../services/search/common/search.js';
suite('PromptsService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let service;
    let instaService;
    let workspaceContextService;
    let testConfigService;
    let fileService;
    setup(async () => {
        instaService = disposables.add(new TestInstantiationService());
        instaService.stub(ILogService, new NullLogService());
        workspaceContextService = new TestContextService();
        instaService.stub(IWorkspaceContextService, workspaceContextService);
        testConfigService = new TestConfigurationService();
        testConfigService.setUserConfiguration(PromptsConfig.USE_COPILOT_INSTRUCTION_FILES, true);
        testConfigService.setUserConfiguration(PromptsConfig.USE_AGENT_MD, true);
        testConfigService.setUserConfiguration(PromptsConfig.USE_NESTED_AGENT_MD, false);
        testConfigService.setUserConfiguration(PromptsConfig.INSTRUCTIONS_LOCATION_KEY, { [INSTRUCTIONS_DEFAULT_SOURCE_FOLDER]: true });
        testConfigService.setUserConfiguration(PromptsConfig.PROMPT_LOCATIONS_KEY, { [PROMPT_DEFAULT_SOURCE_FOLDER]: true });
        testConfigService.setUserConfiguration(PromptsConfig.MODE_LOCATION_KEY, { [LEGACY_MODE_DEFAULT_SOURCE_FOLDER]: true });
        instaService.stub(IConfigurationService, testConfigService);
        instaService.stub(IWorkbenchEnvironmentService, {});
        instaService.stub(IUserDataProfileService, new TestUserDataProfileService());
        instaService.stub(ITelemetryService, NullTelemetryService);
        instaService.stub(IStorageService, InMemoryStorageService);
        fileService = disposables.add(instaService.createInstance(FileService));
        instaService.stub(IFileService, fileService);
        const modelService = disposables.add(instaService.createInstance(ModelService));
        instaService.stub(IModelService, modelService);
        instaService.stub(ILanguageService, {
            guessLanguageIdByFilepathOrFirstLine(uri) {
                if (uri.path.endsWith(PROMPT_FILE_EXTENSION)) {
                    return PROMPT_LANGUAGE_ID;
                }
                if (uri.path.endsWith(INSTRUCTION_FILE_EXTENSION)) {
                    return INSTRUCTIONS_LANGUAGE_ID;
                }
                return 'plaintext';
            }
        });
        instaService.stub(ILabelService, { getUriLabel: (uri) => uri.path });
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.file, fileSystemProvider));
        instaService.stub(IFilesConfigurationService, { updateReadonly: () => Promise.resolve() });
        const pathService = {
            userHome: () => {
                return Promise.resolve(URI.file('/home/user'));
            },
        };
        instaService.stub(IPathService, pathService);
        instaService.stub(ISearchService, {});
        service = disposables.add(instaService.createInstance(PromptsService));
        instaService.stub(IPromptsService, service);
    });
    suite('parse', () => {
        test('explicit', async function () {
            const rootFolderName = 'resolves-nested-file-references';
            const rootFolder = `/${rootFolderName}`;
            const rootFileName = 'file2.prompt.md';
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            const rootFileUri = URI.joinPath(rootFolderUri, rootFileName);
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/file1.prompt.md`,
                    contents: [
                        '## Some Header',
                        'some contents',
                        ' ',
                    ],
                },
                {
                    path: `${rootFolder}/${rootFileName}`,
                    contents: [
                        '---',
                        'description: \'Root prompt description.\'',
                        'tools: [\'my-tool1\', , true]',
                        'agent: "agent" ',
                        '---',
                        '## Files',
                        '\t- this file #file:folder1/file3.prompt.md ',
                        '\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!',
                        '## Vars',
                        '\t- #tool:my-tool',
                        '\t- #tool:my-other-tool',
                        ' ',
                    ],
                },
                {
                    path: `${rootFolder}/folder1/file3.prompt.md`,
                    contents: [
                        '---',
                        'tools: [ false, \'my-tool1\' , ]',
                        'agent: \'edit\'',
                        '---',
                        '',
                        '[](./some-other-folder/non-existing-folder)',
                        `\t- some seemingly random #file:${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.instructions.md contents`,
                        ' some more\t content',
                    ],
                },
                {
                    path: `${rootFolder}/folder1/some-other-folder/file4.prompt.md`,
                    contents: [
                        '---',
                        'tools: [\'my-tool1\', "my-tool2", true, , ]',
                        'something: true',
                        'agent: \'ask\'\t',
                        'description: "File 4 splendid description."',
                        '---',
                        'this file has a non-existing #file:./some-non-existing/file.prompt.md\t\treference',
                        '',
                        '',
                        'and some',
                        ' non-prompt #file:./some-non-prompt-file.md\t\t \t[](../../folder1/)\t',
                    ],
                },
                {
                    path: `${rootFolder}/folder1/some-other-folder/file.txt`,
                    contents: [
                        '---',
                        'description: "Non-prompt file description".',
                        'tools: ["my-tool-24"]',
                        '---',
                    ],
                },
                {
                    path: `${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.instructions.md`,
                    contents: [
                        '---',
                        'description: "Another file description."',
                        'tools: [\'my-tool3\', false, "my-tool2" ]',
                        'applyTo: "**/*.tsx"',
                        '---',
                        `[](${rootFolder}/folder1/some-other-folder)`,
                        'another-file.instructions.md contents\t [#file:file.txt](../file.txt)',
                    ],
                },
                {
                    path: `${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/one_more_file_just_in_case.prompt.md`,
                    contents: ['one_more_file_just_in_case.prompt.md contents'],
                },
            ]);
            const file3 = URI.joinPath(rootFolderUri, 'folder1/file3.prompt.md');
            const file4 = URI.joinPath(rootFolderUri, 'folder1/some-other-folder/file4.prompt.md');
            const someOtherFolder = URI.joinPath(rootFolderUri, '/folder1/some-other-folder');
            const someOtherFolderFile = URI.joinPath(rootFolderUri, '/folder1/some-other-folder/file.txt');
            const nonExistingFolder = URI.joinPath(rootFolderUri, 'folder1/some-other-folder/non-existing-folder');
            const yetAnotherFile = URI.joinPath(rootFolderUri, 'folder1/some-other-folder/yetAnotherFolder🤭/another-file.instructions.md');
            const result1 = await service.parseNew(rootFileUri, CancellationToken.None);
            assert.deepEqual(result1.uri, rootFileUri);
            assert.deepEqual(result1.header?.description, 'Root prompt description.');
            assert.deepEqual(result1.header?.tools, ['my-tool1']);
            assert.deepEqual(result1.header?.agent, 'agent');
            assert.ok(result1.body);
            assert.deepEqual(result1.body.fileReferences.map(r => result1.body?.resolveFilePath(r.content)), [file3, file4]);
            assert.deepEqual(result1.body.variableReferences, [
                { name: 'my-tool', range: new Range(10, 10, 10, 17), offset: 240 },
                { name: 'my-other-tool', range: new Range(11, 10, 11, 23), offset: 257 },
            ]);
            const result2 = await service.parseNew(file3, CancellationToken.None);
            assert.deepEqual(result2.uri, file3);
            assert.deepEqual(result2.header?.agent, 'edit');
            assert.ok(result2.body);
            assert.deepEqual(result2.body.fileReferences.map(r => result2.body?.resolveFilePath(r.content)), [nonExistingFolder, yetAnotherFile]);
            const result3 = await service.parseNew(yetAnotherFile, CancellationToken.None);
            assert.deepEqual(result3.uri, yetAnotherFile);
            assert.deepEqual(result3.header?.description, 'Another file description.');
            assert.deepEqual(result3.header?.applyTo, '**/*.tsx');
            assert.ok(result3.body);
            assert.deepEqual(result3.body.fileReferences.map(r => result3.body?.resolveFilePath(r.content)), [someOtherFolder, someOtherFolderFile]);
            assert.deepEqual(result3.body.variableReferences, []);
            const result4 = await service.parseNew(file4, CancellationToken.None);
            assert.deepEqual(result4.uri, file4);
            assert.deepEqual(result4.header?.description, 'File 4 splendid description.');
            assert.ok(result4.body);
            assert.deepEqual(result4.body.fileReferences.map(r => result4.body?.resolveFilePath(r.content)), [
                URI.joinPath(rootFolderUri, '/folder1/some-other-folder/some-non-existing/file.prompt.md'),
                URI.joinPath(rootFolderUri, '/folder1/some-other-folder/some-non-prompt-file.md'),
                URI.joinPath(rootFolderUri, '/folder1/'),
            ]);
            assert.deepEqual(result4.body.variableReferences, []);
        });
    });
    suite('findInstructionFilesFor', () => {
        teardown(() => {
            sinon.restore();
        });
        test('finds correct instruction files', async () => {
            const rootFolderName = 'finds-instruction-files';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            const userPromptsFolderName = '/tmp/user-data/prompts';
            const userPromptsFolderUri = URI.file(userPromptsFolderName);
            sinon.stub(service, 'listPromptFiles')
                .returns(Promise.resolve([
                // local instructions
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file3.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file4.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                // user instructions
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file10.instructions.md'),
                    storage: PromptsStorage.user,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file11.instructions.md'),
                    storage: PromptsStorage.user,
                    type: PromptsType.instructions,
                },
            ]));
            // mock current workspace file structure
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/file1.prompt.md`,
                    contents: [
                        '## Some Header',
                        'some contents',
                        ' ',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file1.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 1.\'',
                        'applyTo: "**/*.tsx"',
                        '---',
                        'Some instructions 1 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file2.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 2.\'',
                        'applyTo: "**/folder1/*.tsx"',
                        '---',
                        'Some instructions 2 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file3.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 3.\'',
                        'applyTo: "**/folder2/*.tsx"',
                        '---',
                        'Some instructions 3 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file4.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 4.\'',
                        'applyTo: "src/build/*.tsx"',
                        '---',
                        'Some instructions 4 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file5.prompt.md`,
                    contents: [
                        '---',
                        'description: \'Prompt file 5.\'',
                        '---',
                        'Some prompt 5 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/folder1/main.tsx`,
                    contents: [
                        'console.log("Haalou!")'
                    ]
                }
            ]);
            // mock user data instructions
            await mockFiles(fileService, [
                {
                    path: `${userPromptsFolderName}/file10.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 10.\'',
                        'applyTo: "**/folder1/*.tsx"',
                        '---',
                        'Some instructions 10 contents.',
                    ]
                },
                {
                    path: `${userPromptsFolderName}/file11.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 11.\'',
                        'applyTo: "**/folder1/*.py"',
                        '---',
                        'Some instructions 11 contents.',
                    ]
                },
                {
                    path: `${userPromptsFolderName}/file12.prompt.md`,
                    contents: [
                        '---',
                        'description: \'Prompt file 12.\'',
                        '---',
                        'Some prompt 12 contents.',
                    ]
                }
            ]);
            const instructionFiles = await service.listPromptFiles(PromptsType.instructions, CancellationToken.None);
            const contextComputer = instaService.createInstance(ComputeAutomaticInstructions, undefined);
            const context = {
                files: new ResourceSet([
                    URI.joinPath(rootFolderUri, 'folder1/main.tsx'),
                ]),
                instructions: new ResourceSet(),
            };
            const result = new ChatRequestVariableSet();
            await contextComputer.addApplyingInstructions(instructionFiles, context, result, newInstructionsCollectionEvent(), CancellationToken.None);
            assert.deepStrictEqual(result.asArray().map(i => isPromptFileVariableEntry(i) ? i.value.path : undefined), [
                // local instructions
                URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md').path,
                URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md').path,
                // user instructions
                URI.joinPath(userPromptsFolderUri, 'file10.instructions.md').path,
            ], 'Must find correct instruction files.');
        });
        test('does not have duplicates', async () => {
            const rootFolderName = 'finds-instruction-files-without-duplicates';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            const userPromptsFolderName = '/tmp/user-data/prompts';
            const userPromptsFolderUri = URI.file(userPromptsFolderName);
            sinon.stub(service, 'listPromptFiles')
                .returns(Promise.resolve([
                // local instructions
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file3.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file4.instructions.md'),
                    storage: PromptsStorage.local,
                    type: PromptsType.instructions,
                },
                // user instructions
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file10.instructions.md'),
                    storage: PromptsStorage.user,
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file11.instructions.md'),
                    storage: PromptsStorage.user,
                    type: PromptsType.instructions,
                },
            ]));
            // mock current workspace file structure
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/file1.prompt.md`,
                    contents: [
                        '## Some Header',
                        'some contents',
                        ' ',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file1.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 1.\'',
                        'applyTo: "**/*.tsx"',
                        '---',
                        'Some instructions 1 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file2.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 2.\'',
                        'applyTo: "**/folder1/*.tsx"',
                        '---',
                        'Some instructions 2 contents. [](./file1.instructions.md)',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file3.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 3.\'',
                        'applyTo: "**/folder2/*.tsx"',
                        '---',
                        'Some instructions 3 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file4.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 4.\'',
                        'applyTo: "src/build/*.tsx"',
                        '---',
                        '[](./file3.instructions.md) Some instructions 4 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/prompts/file5.prompt.md`,
                    contents: [
                        '---',
                        'description: \'Prompt file 5.\'',
                        '---',
                        'Some prompt 5 contents.',
                    ]
                },
                {
                    path: `${rootFolder}/folder1/main.tsx`,
                    contents: [
                        'console.log("Haalou!")'
                    ]
                }
            ]);
            // mock user data instructions
            await mockFiles(fileService, [
                {
                    path: `${userPromptsFolderName}/file10.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 10.\'',
                        'applyTo: "**/folder1/*.tsx"',
                        '---',
                        'Some instructions 10 contents.',
                    ]
                },
                {
                    path: `${userPromptsFolderName}/file11.instructions.md`,
                    contents: [
                        '---',
                        'description: \'Instructions file 11.\'',
                        'applyTo: "**/folder1/*.py"',
                        '---',
                        'Some instructions 11 contents.',
                    ]
                },
                {
                    path: `${userPromptsFolderName}/file12.prompt.md`,
                    contents: [
                        '---',
                        'description: \'Prompt file 12.\'',
                        '---',
                        'Some prompt 12 contents.',
                    ]
                }
            ]);
            const instructionFiles = await service.listPromptFiles(PromptsType.instructions, CancellationToken.None);
            const contextComputer = instaService.createInstance(ComputeAutomaticInstructions, undefined);
            const context = {
                files: new ResourceSet([
                    URI.joinPath(rootFolderUri, 'folder1/main.tsx'),
                    URI.joinPath(rootFolderUri, 'folder1/index.tsx'),
                    URI.joinPath(rootFolderUri, 'folder1/constants.tsx'),
                ]),
                instructions: new ResourceSet(),
            };
            const result = new ChatRequestVariableSet();
            await contextComputer.addApplyingInstructions(instructionFiles, context, result, newInstructionsCollectionEvent(), CancellationToken.None);
            assert.deepStrictEqual(result.asArray().map(i => isPromptFileVariableEntry(i) ? i.value.path : undefined), [
                // local instructions
                URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md').path,
                URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md').path,
                // user instructions
                URI.joinPath(userPromptsFolderUri, 'file10.instructions.md').path,
            ], 'Must find correct instruction files.');
        });
        test('copilot-instructions and AGENTS.md', async () => {
            const rootFolderName = 'copilot-instructions-and-agents';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            // mock current workspace file structure
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/codestyle.md`,
                    contents: [
                        'Can you see this?',
                    ]
                },
                {
                    path: `${rootFolder}/AGENTS.md`,
                    contents: [
                        'What about this?',
                    ]
                },
                {
                    path: `${rootFolder}/README.md`,
                    contents: [
                        'Thats my project?',
                    ]
                },
                {
                    path: `${rootFolder}/.github/copilot-instructions.md`,
                    contents: [
                        'Be nice and friendly. Also look at instructions at #file:../codestyle.md and [more-codestyle.md](./more-codestyle.md).',
                    ]
                },
                {
                    path: `${rootFolder}/.github/more-codestyle.md`,
                    contents: [
                        'I like it clean.',
                    ]
                },
                {
                    path: `${rootFolder}/folder1/AGENTS.md`,
                    contents: [
                        'An AGENTS.md file in another repo'
                    ]
                }
            ]);
            const contextComputer = instaService.createInstance(ComputeAutomaticInstructions, undefined);
            const context = new ChatRequestVariableSet();
            context.add(toFileVariableEntry(URI.joinPath(rootFolderUri, 'README.md')));
            await contextComputer.collect(context, CancellationToken.None);
            assert.deepStrictEqual(context.asArray().map(i => isPromptFileVariableEntry(i) ? i.value.path : undefined).filter(e => !!e).sort(), [
                URI.joinPath(rootFolderUri, '.github/copilot-instructions.md').path,
                URI.joinPath(rootFolderUri, '.github/more-codestyle.md').path,
                URI.joinPath(rootFolderUri, 'AGENTS.md').path,
                URI.joinPath(rootFolderUri, 'codestyle.md').path,
            ].sort(), 'Must find correct instruction files.');
        });
    });
    suite('getCustomAgents', () => {
        teardown(() => {
            sinon.restore();
        });
        test('header with handOffs', async () => {
            const rootFolderName = 'custom-agents-with-handoffs';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/agents/agent1.agent.md`,
                    contents: [
                        '---',
                        'description: \'Agent file 1.\'',
                        'handoffs: [ { agent: "Edit", label: "Do it", prompt: "Do it now" } ]',
                        '---',
                    ]
                }
            ]);
            const result = (await service.getCustomAgents(CancellationToken.None)).map(agent => ({ ...agent, uri: URI.from(agent.uri) }));
            const expected = [
                {
                    name: 'agent1',
                    description: 'Agent file 1.',
                    handOffs: [{ agent: 'Edit', label: 'Do it', prompt: 'Do it now', send: undefined }],
                    agentInstructions: {
                        content: '',
                        toolReferences: [],
                        metadata: undefined
                    },
                    model: undefined,
                    argumentHint: undefined,
                    tools: undefined,
                    target: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/agent1.agent.md'),
                    source: { storage: PromptsStorage.local }
                },
            ];
            assert.deepEqual(result, expected, 'Must get custom agents.');
        });
        test('body with tool references', async () => {
            const rootFolderName = 'custom-agents';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            // mock current workspace file structure
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/agents/agent1.agent.md`,
                    contents: [
                        '---',
                        'description: \'Agent file 1.\'',
                        'tools: [ tool1, tool2 ]',
                        '---',
                        'Do it with #tool:tool1',
                    ]
                },
                {
                    path: `${rootFolder}/.github/agents/agent2.agent.md`,
                    contents: [
                        'First use #tool:tool2\nThen use #tool:tool1',
                    ]
                }
            ]);
            const result = (await service.getCustomAgents(CancellationToken.None)).map(agent => ({ ...agent, uri: URI.from(agent.uri) }));
            const expected = [
                {
                    name: 'agent1',
                    description: 'Agent file 1.',
                    tools: ['tool1', 'tool2'],
                    agentInstructions: {
                        content: 'Do it with #tool:tool1',
                        toolReferences: [{ name: 'tool1', range: { start: 11, endExclusive: 17 } }],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    model: undefined,
                    argumentHint: undefined,
                    target: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/agent1.agent.md'),
                    source: { storage: PromptsStorage.local },
                },
                {
                    name: 'agent2',
                    agentInstructions: {
                        content: 'First use #tool:tool2\nThen use #tool:tool1',
                        toolReferences: [
                            { name: 'tool1', range: { start: 31, endExclusive: 37 } },
                            { name: 'tool2', range: { start: 10, endExclusive: 16 } }
                        ],
                        metadata: undefined
                    },
                    uri: URI.joinPath(rootFolderUri, '.github/agents/agent2.agent.md'),
                    source: { storage: PromptsStorage.local },
                }
            ];
            assert.deepEqual(result, expected, 'Must get custom agents.');
        });
        test('header with argumentHint', async () => {
            const rootFolderName = 'custom-agents-with-argument-hint';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/agents/agent1.agent.md`,
                    contents: [
                        '---',
                        'description: \'Code review agent.\'',
                        'argument-hint: \'Provide file path or code snippet to review\'',
                        'tools: [ code-analyzer, linter ]',
                        '---',
                        'I will help review your code for best practices.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/agents/agent2.agent.md`,
                    contents: [
                        '---',
                        'description: \'Documentation generator.\'',
                        'argument-hint: \'Specify function or class name to document\'',
                        '---',
                        'I generate comprehensive documentation.',
                    ]
                }
            ]);
            const result = (await service.getCustomAgents(CancellationToken.None)).map(agent => ({ ...agent, uri: URI.from(agent.uri) }));
            const expected = [
                {
                    name: 'agent1',
                    description: 'Code review agent.',
                    argumentHint: 'Provide file path or code snippet to review',
                    tools: ['code-analyzer', 'linter'],
                    agentInstructions: {
                        content: 'I will help review your code for best practices.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    model: undefined,
                    target: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/agent1.agent.md'),
                    source: { storage: PromptsStorage.local }
                },
                {
                    name: 'agent2',
                    description: 'Documentation generator.',
                    argumentHint: 'Specify function or class name to document',
                    agentInstructions: {
                        content: 'I generate comprehensive documentation.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    model: undefined,
                    tools: undefined,
                    target: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/agent2.agent.md'),
                    source: { storage: PromptsStorage.local }
                },
            ];
            assert.deepEqual(result, expected, 'Must get custom agents with argumentHint.');
        });
        test('header with target', async () => {
            const rootFolderName = 'custom-agents-with-target';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/agents/github-agent.agent.md`,
                    contents: [
                        '---',
                        'description: \'GitHub Copilot specialized agent.\'',
                        'target: \'github-copilot\'',
                        'tools: [ github-api, code-search ]',
                        '---',
                        'I am optimized for GitHub Copilot workflows.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/agents/vscode-agent.agent.md`,
                    contents: [
                        '---',
                        'description: \'VS Code specialized agent.\'',
                        'target: \'vscode\'',
                        'model: \'gpt-4\'',
                        '---',
                        'I am specialized for VS Code editor tasks.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/agents/generic-agent.agent.md`,
                    contents: [
                        '---',
                        'description: \'Generic agent without target.\'',
                        '---',
                        'I work everywhere.',
                    ]
                }
            ]);
            const result = (await service.getCustomAgents(CancellationToken.None)).map(agent => ({ ...agent, uri: URI.from(agent.uri) }));
            const expected = [
                {
                    name: 'github-agent',
                    description: 'GitHub Copilot specialized agent.',
                    target: 'github-copilot',
                    tools: ['github-api', 'code-search'],
                    agentInstructions: {
                        content: 'I am optimized for GitHub Copilot workflows.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    model: undefined,
                    argumentHint: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/github-agent.agent.md'),
                    source: { storage: PromptsStorage.local }
                },
                {
                    name: 'vscode-agent',
                    description: 'VS Code specialized agent.',
                    target: 'vscode',
                    model: 'gpt-4',
                    agentInstructions: {
                        content: 'I am specialized for VS Code editor tasks.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    argumentHint: undefined,
                    tools: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/vscode-agent.agent.md'),
                    source: { storage: PromptsStorage.local }
                },
                {
                    name: 'generic-agent',
                    description: 'Generic agent without target.',
                    agentInstructions: {
                        content: 'I work everywhere.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    model: undefined,
                    argumentHint: undefined,
                    tools: undefined,
                    target: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/generic-agent.agent.md'),
                    source: { storage: PromptsStorage.local }
                },
            ];
            assert.deepEqual(result, expected, 'Must get custom agents with target attribute.');
        });
        test('agents with .md extension (no .agent.md)', async () => {
            const rootFolderName = 'custom-agents-md-extension';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.github/agents/demonstrate.md`,
                    contents: [
                        '---',
                        'description: \'Demonstrate agent.\'',
                        'tools: [ demo-tool ]',
                        '---',
                        'This is a demonstration agent using .md extension.',
                    ]
                },
                {
                    path: `${rootFolder}/.github/agents/test.md`,
                    contents: [
                        'Test agent without header.',
                    ]
                }
            ]);
            const result = (await service.getCustomAgents(CancellationToken.None)).map(agent => ({ ...agent, uri: URI.from(agent.uri) }));
            const expected = [
                {
                    name: 'demonstrate',
                    description: 'Demonstrate agent.',
                    tools: ['demo-tool'],
                    agentInstructions: {
                        content: 'This is a demonstration agent using .md extension.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    handOffs: undefined,
                    model: undefined,
                    argumentHint: undefined,
                    target: undefined,
                    uri: URI.joinPath(rootFolderUri, '.github/agents/demonstrate.md'),
                    source: { storage: PromptsStorage.local },
                },
                {
                    name: 'test',
                    agentInstructions: {
                        content: 'Test agent without header.',
                        toolReferences: [],
                        metadata: undefined
                    },
                    uri: URI.joinPath(rootFolderUri, '.github/agents/test.md'),
                    source: { storage: PromptsStorage.local },
                }
            ];
            assert.deepEqual(result, expected, 'Must get custom agents with .md extension from .github/agents/ folder.');
        });
    });
    suite('listPromptFiles - extensions', () => {
        test('Contributed prompt file', async () => {
            const uri = URI.parse('file://extensions/my-extension/textMate.instructions.md');
            const extension = {};
            const registered = service.registerContributedFile(PromptsType.instructions, 'TextMate Instructions', 'Instructions to follow when authoring TextMate grammars', uri, extension);
            const actual = await service.listPromptFiles(PromptsType.instructions, CancellationToken.None);
            assert.strictEqual(actual.length, 1);
            assert.strictEqual(actual[0].uri.toString(), uri.toString());
            assert.strictEqual(actual[0].name, 'TextMate Instructions');
            assert.strictEqual(actual[0].storage, PromptsStorage.extension);
            assert.strictEqual(actual[0].type, PromptsType.instructions);
            registered.dispose();
        });
    });
    suite('findClaudeSkills', () => {
        teardown(() => {
            sinon.restore();
        });
        test('should return undefined when USE_CLAUDE_SKILLS is disabled', async () => {
            testConfigService.setUserConfiguration(PromptsConfig.USE_CLAUDE_SKILLS, false);
            const result = await service.findClaudeSkills(CancellationToken.None);
            assert.strictEqual(result, undefined);
        });
        test('should find Claude skills in workspace and user home', async () => {
            testConfigService.setUserConfiguration(PromptsConfig.USE_CLAUDE_SKILLS, true);
            const rootFolderName = 'claude-skills-test';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            // Create mock filesystem with skills
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.claude/skills/project-skill-1/SKILL.md`,
                    contents: [
                        '---',
                        'name: "Project Skill 1"',
                        'description: "A project skill for testing"',
                        '---',
                        'This is project skill 1 content',
                    ],
                },
                {
                    path: `${rootFolder}/.claude/skills/project-skill-2/SKILL.md`,
                    contents: [
                        '---',
                        'description: "Invalid skill, no name"',
                        '---',
                        'This is project skill 2 content',
                    ],
                },
                {
                    path: `${rootFolder}/.claude/skills/not-a-skill-dir/README.md`,
                    contents: ['This is not a skill'],
                },
                {
                    path: '/home/user/.claude/skills/personal-skill-1/SKILL.md',
                    contents: [
                        '---',
                        'name: "Personal Skill 1"',
                        'description: "A personal skill for testing"',
                        '---',
                        'This is personal skill 1 content',
                    ],
                },
                {
                    path: '/home/user/.claude/skills/not-a-skill/other-file.md',
                    contents: ['Not a skill file'],
                },
            ]);
            const result = await service.findClaudeSkills(CancellationToken.None);
            assert.ok(result, 'Should return results when Claude skills are enabled');
            assert.strictEqual(result.length, 2, 'Should find 2 skills total');
            // Check project skills
            const projectSkills = result.filter(skill => skill.type === 'project');
            assert.strictEqual(projectSkills.length, 1, 'Should find 1 project skill');
            const projectSkill1 = projectSkills.find(skill => skill.name === 'Project Skill 1');
            assert.ok(projectSkill1, 'Should find project skill 1');
            assert.strictEqual(projectSkill1.description, 'A project skill for testing');
            assert.strictEqual(projectSkill1.uri.path, `${rootFolder}/.claude/skills/project-skill-1/SKILL.md`);
            // Check personal skills
            const personalSkills = result.filter(skill => skill.type === 'personal');
            assert.strictEqual(personalSkills.length, 1, 'Should find 1 personal skill');
            const personalSkill1 = personalSkills[0];
            assert.strictEqual(personalSkill1.name, 'Personal Skill 1');
            assert.strictEqual(personalSkill1.description, 'A personal skill for testing');
            assert.strictEqual(personalSkill1.uri.path, '/home/user/.claude/skills/personal-skill-1/SKILL.md');
        });
        test('should handle parsing errors gracefully', async () => {
            testConfigService.setUserConfiguration(PromptsConfig.USE_CLAUDE_SKILLS, true);
            const rootFolderName = 'claude-skills-error-test';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            // Create mock filesystem with malformed skill file
            await mockFiles(fileService, [
                {
                    path: `${rootFolder}/.claude/skills/valid-skill/SKILL.md`,
                    contents: [
                        '---',
                        'name: "Valid Skill"',
                        'description: "A valid skill"',
                        '---',
                        'Valid skill content',
                    ],
                },
                {
                    path: `${rootFolder}/.claude/skills/invalid-skill/SKILL.md`,
                    contents: [
                        '---',
                        'invalid yaml: [unclosed',
                        '---',
                        'Invalid skill content',
                    ],
                },
            ]);
            const result = await service.findClaudeSkills(CancellationToken.None);
            // Should still return the valid skill, even if one has parsing errors
            assert.ok(result, 'Should return results even with parsing errors');
            assert.strictEqual(result.length, 1, 'Should find 1 valid skill');
            assert.strictEqual(result[0].name, 'Valid Skill');
            assert.strictEqual(result[0].type, 'project');
        });
        test('should return empty array when no skills found', async () => {
            testConfigService.setUserConfiguration(PromptsConfig.USE_CLAUDE_SKILLS, true);
            const rootFolderName = 'empty-workspace';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            workspaceContextService.setWorkspace(testWorkspace(rootFolderUri));
            // Create empty mock filesystem
            await mockFiles(fileService, []);
            const result = await service.findClaudeSkills(CancellationToken.None);
            assert.ok(result, 'Should return results array');
            assert.strictEqual(result.length, 0, 'Should find no skills');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3NlcnZpY2UvcHJvbXB0c1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDckYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDM0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDNUcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0scUZBQXFGLENBQUM7QUFFL0gsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyREFBMkQsQ0FB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