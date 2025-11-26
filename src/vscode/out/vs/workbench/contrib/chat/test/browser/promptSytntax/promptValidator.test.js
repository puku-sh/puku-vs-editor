/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ResourceSet } from '../../../../../../base/common/map.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ContextKeyService } from '../../../../../../platform/contextkey/browser/contextKeyService.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ExtensionIdentifier } from '../../../../../../platform/extensions/common/extensions.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { LanguageModelToolsService } from '../../../browser/languageModelToolsService.js';
import { ChatMode, CustomChatMode, IChatModeService } from '../../../common/chatModes.js';
import { IChatService } from '../../../common/chatService.js';
import { ChatConfiguration } from '../../../common/constants.js';
import { ILanguageModelToolsService, ToolDataSource } from '../../../common/languageModelToolsService.js';
import { ILanguageModelsService } from '../../../common/languageModels.js';
import { getPromptFileExtension } from '../../../common/promptSyntax/config/promptFileLocations.js';
import { PromptValidator } from '../../../common/promptSyntax/languageProviders/promptValidator.js';
import { PromptsType } from '../../../common/promptSyntax/promptTypes.js';
import { PromptFileParser } from '../../../common/promptSyntax/promptFileParser.js';
import { PromptsStorage } from '../../../common/promptSyntax/service/promptsService.js';
import { MockChatModeService } from '../../common/mockChatModeService.js';
import { MockChatService } from '../../common/mockChatService.js';
suite('PromptValidator', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instaService;
    const existingRef1 = URI.parse('myFs://test/reference1.md');
    const existingRef2 = URI.parse('myFs://test/reference2.md');
    setup(async () => {
        const testConfigService = new TestConfigurationService();
        testConfigService.setUserConfiguration(ChatConfiguration.ExtensionToolsEnabled, true);
        instaService = workbenchInstantiationService({
            contextKeyService: () => disposables.add(new ContextKeyService(testConfigService)),
            configurationService: () => testConfigService
        }, disposables);
        const chatService = new MockChatService();
        instaService.stub(IChatService, chatService);
        instaService.stub(ILabelService, { getUriLabel: (resource) => resource.path });
        const toolService = disposables.add(instaService.createInstance(LanguageModelToolsService));
        const testTool1 = { id: 'testTool1', displayName: 'tool1', canBeReferencedInPrompt: true, modelDescription: 'Test Tool 1', source: ToolDataSource.External, inputSchema: {} };
        disposables.add(toolService.registerToolData(testTool1));
        const testTool2 = { id: 'testTool2', displayName: 'tool2', canBeReferencedInPrompt: true, toolReferenceName: 'tool2', modelDescription: 'Test Tool 2', source: ToolDataSource.External, inputSchema: {} };
        disposables.add(toolService.registerToolData(testTool2));
        const shellTool = { id: 'shell', displayName: 'shell', canBeReferencedInPrompt: true, toolReferenceName: 'shell', modelDescription: 'Runs commands in the terminal', source: ToolDataSource.External, inputSchema: {} };
        disposables.add(toolService.registerToolData(shellTool));
        const myExtSource = { type: 'extension', label: 'My Extension', extensionId: new ExtensionIdentifier('My.extension') };
        const testTool3 = { id: 'testTool3', displayName: 'tool3', canBeReferencedInPrompt: true, toolReferenceName: 'tool3', modelDescription: 'Test Tool 3', source: myExtSource, inputSchema: {} };
        disposables.add(toolService.registerToolData(testTool3));
        const prExtSource = { type: 'extension', label: 'GitHub Pull Request Extension', extensionId: new ExtensionIdentifier('github.vscode-pull-request-github') };
        const prExtTool1 = { id: 'suggestFix', canBeReferencedInPrompt: true, toolReferenceName: 'suggest-fix', modelDescription: 'tool4', displayName: 'Test Tool 4', source: prExtSource, inputSchema: {} };
        disposables.add(toolService.registerToolData(prExtTool1));
        const toolWithLegacy = { id: 'newTool', toolReferenceName: 'newToolRef', displayName: 'New Tool', canBeReferencedInPrompt: true, modelDescription: 'New Tool', source: ToolDataSource.External, inputSchema: {}, legacyToolReferenceFullNames: ['oldToolName', 'deprecatedToolName'] };
        disposables.add(toolService.registerToolData(toolWithLegacy));
        const toolSetWithLegacy = disposables.add(toolService.createToolSet(ToolDataSource.External, 'newToolSet', 'newToolSetRef', { description: 'New Tool Set', legacyFullNames: ['oldToolSet', 'deprecatedToolSet'] }));
        const toolInSet = { id: 'toolInSet', toolReferenceName: 'toolInSetRef', displayName: 'Tool In Set', canBeReferencedInPrompt: false, modelDescription: 'Tool In Set', source: ToolDataSource.External, inputSchema: {} };
        disposables.add(toolService.registerToolData(toolInSet));
        disposables.add(toolSetWithLegacy.addTool(toolInSet));
        const anotherToolWithLegacy = { id: 'anotherTool', toolReferenceName: 'anotherToolRef', displayName: 'Another Tool', canBeReferencedInPrompt: true, modelDescription: 'Another Tool', source: ToolDataSource.External, inputSchema: {}, legacyToolReferenceFullNames: ['legacyTool'] };
        disposables.add(toolService.registerToolData(anotherToolWithLegacy));
        const anotherToolSetWithLegacy = disposables.add(toolService.createToolSet(ToolDataSource.External, 'anotherToolSet', 'anotherToolSetRef', { description: 'Another Tool Set', legacyFullNames: ['legacyToolSet'] }));
        const anotherToolInSet = { id: 'anotherToolInSet', toolReferenceName: 'anotherToolInSetRef', displayName: 'Another Tool In Set', canBeReferencedInPrompt: false, modelDescription: 'Another Tool In Set', source: ToolDataSource.External, inputSchema: {} };
        disposables.add(toolService.registerToolData(anotherToolInSet));
        disposables.add(anotherToolSetWithLegacy.addTool(anotherToolInSet));
        const conflictToolSet1 = disposables.add(toolService.createToolSet(ToolDataSource.External, 'conflictSet1', 'conflictSet1Ref', { legacyFullNames: ['sharedLegacyName'] }));
        const conflictTool1 = { id: 'conflictTool1', toolReferenceName: 'conflictTool1Ref', displayName: 'Conflict Tool 1', canBeReferencedInPrompt: false, modelDescription: 'Conflict Tool 1', source: ToolDataSource.External, inputSchema: {} };
        disposables.add(toolService.registerToolData(conflictTool1));
        disposables.add(conflictToolSet1.addTool(conflictTool1));
        const conflictToolSet2 = disposables.add(toolService.createToolSet(ToolDataSource.External, 'conflictSet2', 'conflictSet2Ref', { legacyFullNames: ['sharedLegacyName'] }));
        const conflictTool2 = { id: 'conflictTool2', toolReferenceName: 'conflictTool2Ref', displayName: 'Conflict Tool 2', canBeReferencedInPrompt: false, modelDescription: 'Conflict Tool 2', source: ToolDataSource.External, inputSchema: {} };
        disposables.add(toolService.registerToolData(conflictTool2));
        disposables.add(conflictToolSet2.addTool(conflictTool2));
        instaService.set(ILanguageModelToolsService, toolService);
        const testModels = [
            { id: 'mae-4', name: 'MAE 4', vendor: 'olama', version: '1.0', family: 'mae', modelPickerCategory: undefined, extension: new ExtensionIdentifier('a.b'), isUserSelectable: true, maxInputTokens: 8192, maxOutputTokens: 1024, capabilities: { agentMode: true, toolCalling: true } },
            { id: 'mae-4.1', name: 'MAE 4.1', vendor: 'copilot', version: '1.0', family: 'mae', modelPickerCategory: undefined, extension: new ExtensionIdentifier('a.b'), isUserSelectable: true, maxInputTokens: 8192, maxOutputTokens: 1024, capabilities: { agentMode: true, toolCalling: true } },
            { id: 'mae-3.5-turbo', name: 'MAE 3.5 Turbo', vendor: 'copilot', version: '1.0', family: 'mae', modelPickerCategory: undefined, extension: new ExtensionIdentifier('a.b'), isUserSelectable: true, maxInputTokens: 8192, maxOutputTokens: 1024 }
        ];
        instaService.stub(ILanguageModelsService, {
            getLanguageModelIds() { return testModels.map(m => m.id); },
            lookupLanguageModel(name) {
                return testModels.find(m => m.id === name);
            }
        });
        const customChatMode = new CustomChatMode({
            uri: URI.parse('myFs://test/test/chatmode.md'),
            name: 'BeastMode',
            agentInstructions: { content: 'Beast mode instructions', toolReferences: [] },
            source: { storage: PromptsStorage.local }
        });
        instaService.stub(IChatModeService, new MockChatModeService({ builtin: [ChatMode.Agent, ChatMode.Ask, ChatMode.Edit], custom: [customChatMode] }));
        const existingFiles = new ResourceSet([existingRef1, existingRef2]);
        instaService.stub(IFileService, {
            exists(uri) {
                return Promise.resolve(existingFiles.has(uri));
            }
        });
    });
    async function validate(code, promptType) {
        const uri = URI.parse('myFs://test/testFile' + getPromptFileExtension(promptType));
        const result = new PromptFileParser().parse(uri, code);
        const validator = instaService.createInstance(PromptValidator);
        const markers = [];
        await validator.validate(result, promptType, m => markers.push(m));
        return markers;
    }
    suite('agents', () => {
        test('correct agent', async () => {
            const content = [
                /* 01 */ '---',
                /* 02 */ `description: "Agent mode test"`,
                /* 03 */ 'model: MAE 4.1',
                /* 04 */ `tools: ['tool1', 'tool2']`,
                /* 05 */ '---',
                /* 06 */ 'This is a chat agent test.',
                /* 07 */ 'Here is a #tool1 variable and a #file:./reference1.md as well as a [reference](./reference2.md).',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.deepStrictEqual(markers, []);
        });
        test('agent with errors (empty description, unknown tool & model)', async () => {
            const content = [
                /* 01 */ '---',
                /* 02 */ `description: ""`, // empty description -> error
                /* 03 */ 'model: MAE 4.2', // unknown model -> warning
                /* 04 */ `tools: ['tool1', 'tool2', 'tool4', 'my.extension/tool3']`, // tool4 unknown -> error
                /* 05 */ '---',
                /* 06 */ 'Body',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.deepStrictEqual(markers.map(m => ({ severity: m.severity, message: m.message })), [
                { severity: MarkerSeverity.Error, message: `The 'description' attribute should not be empty.` },
                { severity: MarkerSeverity.Warning, message: `Unknown tool 'tool4'.` },
                { severity: MarkerSeverity.Warning, message: `Unknown model 'MAE 4.2'.` },
            ]);
        });
        test('tools must be array', async () => {
            const content = [
                '---',
                'description: "Test"',
                `tools: 'tool1'`,
                '---',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.strictEqual(markers.length, 1);
            assert.deepStrictEqual(markers.map(m => m.message), [`The 'tools' attribute must be an array.`]);
        });
        test('each tool must be string', async () => {
            const content = [
                '---',
                'description: "Test"',
                `tools: ['tool1', 2]`,
                '---',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.deepStrictEqual(markers.map(m => ({ severity: m.severity, message: m.message })), [
                { severity: MarkerSeverity.Error, message: `Each tool name in the 'tools' attribute must be a string.` },
            ]);
        });
        test('old tool reference', async () => {
            const content = [
                '---',
                'description: "Test"',
                `tools: ['tool1', 'tool3']`,
                '---',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.deepStrictEqual(markers.map(m => ({ severity: m.severity, message: m.message })), [
                { severity: MarkerSeverity.Info, message: `Tool or toolset 'tool3' has been renamed, use 'my.extension/tool3' instead.` },
            ]);
        });
        test('legacy tool reference names', async () => {
            // Test using legacy tool reference name
            {
                const content = [
                    '---',
                    'description: "Test"',
                    `tools: ['tool1', 'oldToolName']`,
                    '---',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.deepStrictEqual(markers.map(m => ({ severity: m.severity, message: m.message })), [
                    { severity: MarkerSeverity.Info, message: `Tool or toolset 'oldToolName' has been renamed, use 'newToolRef' instead.` },
                ]);
            }
            // Test using another legacy tool reference name
            {
                const content = [
                    '---',
                    'description: "Test"',
                    `tools: ['tool1', 'deprecatedToolName']`,
                    '---',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.deepStrictEqual(markers.map(m => ({ severity: m.severity, message: m.message })), [
                    { severity: MarkerSeverity.Info, message: `Tool or toolset 'deprecatedToolName' has been renamed, use 'newToolRef' instead.` },
                ]);
            }
        });
        test('legacy toolset names', async () => {
            // Test using legacy toolset name
            {
                const content = [
                    '---',
                    'description: "Test"',
                    `tools: ['tool1', 'oldToolSet']`,
                    '---',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.deepStrictEqual(markers.map(m => ({ severity: m.severity, message: m.message })), [
                    { severity: MarkerSeverity.Info, message: `Tool or toolset 'oldToolSet' has been renamed, use 'newToolSetRef' instead.` },
                ]);
            }
            // Test using another legacy toolset name
            {
                const content = [
                    '---',
                    'description: "Test"',
                    `tools: ['tool1', 'deprecatedToolSet']`,
                    '---',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.deepStrictEqual(markers.map(m => ({ severity: m.severity, message: m.message })), [
                    { severity: MarkerSeverity.Info, message: `Tool or toolset 'deprecatedToolSet' has been renamed, use 'newToolSetRef' instead.` },
                ]);
            }
        });
        test('multiple legacy names in same tools list', async () => {
            // Test multiple legacy names together
            const content = [
                '---',
                'description: "Test"',
                `tools: ['legacyTool', 'legacyToolSet', 'tool3']`,
                '---',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.deepStrictEqual(markers.map(m => ({ severity: m.severity, message: m.message })), [
                { severity: MarkerSeverity.Info, message: `Tool or toolset 'legacyTool' has been renamed, use 'anotherToolRef' instead.` },
                { severity: MarkerSeverity.Info, message: `Tool or toolset 'legacyToolSet' has been renamed, use 'anotherToolSetRef' instead.` },
                { severity: MarkerSeverity.Info, message: `Tool or toolset 'tool3' has been renamed, use 'my.extension/tool3' instead.` },
            ]);
        });
        test('deprecated tool name mapping to multiple new names', async () => {
            // The toolsets are registered in setup with a shared legacy name 'sharedLegacyName'
            // This simulates the case where one deprecated name maps to multiple current names
            const content = [
                '---',
                'description: "Test"',
                `tools: ['sharedLegacyName']`,
                '---',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.strictEqual(markers.length, 1);
            assert.strictEqual(markers[0].severity, MarkerSeverity.Info);
            // When multiple toolsets share the same legacy name, the message should indicate multiple options
            // The message will say "use the following tools instead:" for multiple mappings
            const expectedMessage = `Tool or toolset 'sharedLegacyName' has been renamed, use the following tools instead: conflictSet1Ref, conflictSet2Ref`;
            assert.strictEqual(markers[0].message, expectedMessage);
        });
        test('deprecated tool name in body variable reference - single mapping', async () => {
            // Test deprecated tool name used as variable reference in body
            const content = [
                '---',
                'description: "Test"',
                '---',
                'Body with #tool:oldToolName reference',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.strictEqual(markers.length, 1);
            assert.strictEqual(markers[0].severity, MarkerSeverity.Info);
            assert.strictEqual(markers[0].message, `Tool or toolset 'oldToolName' has been renamed, use 'newToolRef' instead.`);
        });
        test('deprecated tool name in body variable reference - multiple mappings', async () => {
            // Register tools with the same legacy name to create multiple mappings
            const multiMapToolSet1 = disposables.add(instaService.get(ILanguageModelToolsService).createToolSet(ToolDataSource.External, 'multiMapSet1', 'multiMapSet1Ref', { legacyFullNames: ['multiMapLegacy'] }));
            const multiMapTool1 = { id: 'multiMapTool1', toolReferenceName: 'multiMapTool1Ref', displayName: 'Multi Map Tool 1', canBeReferencedInPrompt: true, modelDescription: 'Multi Map Tool 1', source: ToolDataSource.External, inputSchema: {} };
            disposables.add(instaService.get(ILanguageModelToolsService).registerToolData(multiMapTool1));
            disposables.add(multiMapToolSet1.addTool(multiMapTool1));
            const multiMapToolSet2 = disposables.add(instaService.get(ILanguageModelToolsService).createToolSet(ToolDataSource.External, 'multiMapSet2', 'multiMapSet2Ref', { legacyFullNames: ['multiMapLegacy'] }));
            const multiMapTool2 = { id: 'multiMapTool2', toolReferenceName: 'multiMapTool2Ref', displayName: 'Multi Map Tool 2', canBeReferencedInPrompt: true, modelDescription: 'Multi Map Tool 2', source: ToolDataSource.External, inputSchema: {} };
            disposables.add(instaService.get(ILanguageModelToolsService).registerToolData(multiMapTool2));
            disposables.add(multiMapToolSet2.addTool(multiMapTool2));
            const content = [
                '---',
                'description: "Test"',
                '---',
                'Body with #tool:multiMapLegacy reference',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.strictEqual(markers.length, 1);
            assert.strictEqual(markers[0].severity, MarkerSeverity.Info);
            // When multiple toolsets share the same legacy name, the message should indicate multiple options
            // The message will say "use the following tools instead:" for multiple mappings in body references
            const expectedMessage = `Tool or toolset 'multiMapLegacy' has been renamed, use the following tools instead: multiMapSet1Ref, multiMapSet2Ref`;
            assert.strictEqual(markers[0].message, expectedMessage);
        });
        test('unknown attribute in agent file', async () => {
            const content = [
                '---',
                'description: "Test"',
                `applyTo: '*.ts'`, // not allowed in agent file
                '---',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.deepStrictEqual(markers.map(m => ({ severity: m.severity, message: m.message })), [
                { severity: MarkerSeverity.Warning, message: `Attribute 'applyTo' is not supported in VS Code agent files. Supported: argument-hint, description, handoffs, model, name, target, tools.` },
            ]);
        });
        test('tools with invalid handoffs', async () => {
            {
                const content = [
                    '---',
                    'description: "Test"',
                    `handoffs: next`,
                    '---',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.strictEqual(markers.length, 1);
                assert.deepStrictEqual(markers.map(m => m.message), [`The 'handoffs' attribute must be an array.`]);
            }
            {
                const content = [
                    '---',
                    'description: "Test"',
                    `handoffs:`,
                    `  - label: '123'`,
                    '---',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.strictEqual(markers.length, 1);
                assert.deepStrictEqual(markers.map(m => m.message), [`Missing required properties 'agent', 'prompt' in handoff object.`]);
            }
            {
                const content = [
                    '---',
                    'description: "Test"',
                    `handoffs:`,
                    `  - label: '123'`,
                    `    agent: ''`,
                    `    prompt: ''`,
                    `    send: true`,
                    '---',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.strictEqual(markers.length, 1);
                assert.deepStrictEqual(markers.map(m => m.message), [`The 'agent' property in a handoff must be a non-empty string.`]);
            }
            {
                const content = [
                    '---',
                    'description: "Test"',
                    `handoffs:`,
                    `  - label: '123'`,
                    `    agent: 'Cool'`,
                    `    prompt: ''`,
                    `    send: true`,
                    '---',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.strictEqual(markers.length, 1);
                assert.deepStrictEqual(markers.map(m => m.message), [`Unknown agent 'Cool'. Available agents: agent, ask, edit, BeastMode.`]);
            }
        });
        test('agent with handoffs attribute', async () => {
            const content = [
                '---',
                'description: \"Test agent with handoffs\"',
                `handoffs:`,
                '  - label: Test Prompt',
                '    agent: agent',
                '    prompt: Add tests for this code',
                '  - label: Optimize Performance',
                '    agent: agent',
                '    prompt: Optimize for performance',
                '---',
                'Body',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.deepStrictEqual(markers, [], 'Expected no validation issues for handoffs attribute');
        });
        test('github-copilot agent with supported attributes', async () => {
            const content = [
                '---',
                'name: "GitHub_Copilot_Custom_Agent"',
                'description: "GitHub Copilot agent"',
                'target: github-copilot',
                `tools: ['shell', 'edit', 'search', 'custom-agent']`,
                'mcp-servers: []',
                '---',
                'Body with #search and #edit references',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.deepStrictEqual(markers, [], 'Expected no validation issues for github-copilot target');
        });
        test('github-copilot agent warns about model and handoffs attributes', async () => {
            const content = [
                '---',
                'name: "GitHubAgent"',
                'description: "GitHub Copilot agent"',
                'target: github-copilot',
                'model: MAE 4.1',
                `tools: ['shell', 'edit']`,
                `handoffs:`,
                '  - label: Test',
                '    agent: Default',
                '    prompt: Test',
                '---',
                'Body',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            const messages = markers.map(m => m.message);
            assert.deepStrictEqual(messages, [
                'Attribute \'model\' is not supported in custom GitHub Copilot agent files. Supported: description, mcp-servers, name, target, tools.',
                'Attribute \'handoffs\' is not supported in custom GitHub Copilot agent files. Supported: description, mcp-servers, name, target, tools.',
            ], 'Model and handoffs are not validated for github-copilot target');
        });
        test('github-copilot agent does not validate variable references', async () => {
            const content = [
                '---',
                'name: "GitHubAgent"',
                'description: "GitHub Copilot agent"',
                'target: github-copilot',
                `tools: ['shell', 'edit']`,
                '---',
                'Body with #unknownTool reference',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            // Variable references should not be validated for github-copilot target
            assert.deepStrictEqual(markers, [], 'Variable references are not validated for github-copilot target');
        });
        test('github-copilot agent rejects unsupported attributes', async () => {
            const content = [
                '---',
                'name: "GitHubAgent"',
                'description: "GitHub Copilot agent"',
                'target: github-copilot',
                'argument-hint: "test hint"',
                `tools: ['shell']`,
                '---',
                'Body',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.strictEqual(markers.length, 1);
            assert.strictEqual(markers[0].severity, MarkerSeverity.Warning);
            assert.ok(markers[0].message.includes(`Attribute 'argument-hint' is not supported`), 'Expected warning about unsupported attribute');
        });
        test('vscode target agent validates normally', async () => {
            const content = [
                '---',
                'description: "VS Code agent"',
                'target: vscode',
                'model: MAE 4.1',
                `tools: ['tool1', 'tool2']`,
                '---',
                'Body with #tool1',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.deepStrictEqual(markers, [], 'VS Code target should validate normally');
        });
        test('vscode target agent warns about unknown tools', async () => {
            const content = [
                '---',
                'description: "VS Code agent"',
                'target: vscode',
                `tools: ['tool1', 'unknownTool']`,
                '---',
                'Body',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            assert.strictEqual(markers.length, 1);
            assert.strictEqual(markers[0].severity, MarkerSeverity.Warning);
            assert.strictEqual(markers[0].message, `Unknown tool 'unknownTool'.`);
        });
        test('vscode target agent with mcp-servers and github-tools', async () => {
            const content = [
                '---',
                'description: "VS Code agent"',
                'target: vscode',
                `tools: ['tool1', 'edit']`,
                `mcp-servers: {}`,
                '---',
                'Body',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            const messages = markers.map(m => m.message);
            assert.deepStrictEqual(messages, [
                'Attribute \'mcp-servers\' is ignored when running locally in VS Code.',
                'Unknown tool \'edit\'.',
            ]);
        });
        test('undefined target with mcp-servers and github-tools', async () => {
            const content = [
                '---',
                'description: "VS Code agent"',
                `tools: ['tool1', 'shell']`,
                `mcp-servers: {}`,
                '---',
                'Body',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            const messages = markers.map(m => m.message);
            assert.deepStrictEqual(messages, [
                'Attribute \'mcp-servers\' is ignored when running locally in VS Code.',
            ]);
        });
        test('default target (no target specified) validates as vscode', async () => {
            const content = [
                '---',
                'description: "Agent without target"',
                'model: MAE 4.1',
                `tools: ['tool1']`,
                'argument-hint: "test hint"',
                '---',
                'Body',
            ].join('\n');
            const markers = await validate(content, PromptsType.agent);
            // Should validate normally as if target was vscode
            assert.deepStrictEqual(markers, [], 'Agent without target should validate as vscode');
        });
        test('name attribute validation', async () => {
            // Valid name
            {
                const content = [
                    '---',
                    'name: "MyAgent"',
                    'description: "Test agent"',
                    'target: vscode',
                    '---',
                    'Body',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.deepStrictEqual(markers, [], 'Valid name should not produce errors');
            }
            // Empty name
            {
                const content = [
                    '---',
                    'name: ""',
                    'description: "Test agent"',
                    'target: vscode',
                    '---',
                    'Body',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.strictEqual(markers.length, 1);
                assert.strictEqual(markers[0].severity, MarkerSeverity.Error);
                assert.strictEqual(markers[0].message, `The 'name' attribute must not be empty.`);
            }
            // Non-string name
            {
                const content = [
                    '---',
                    'name: 123',
                    'description: "Test agent"',
                    'target: vscode',
                    '---',
                    'Body',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.strictEqual(markers.length, 1);
                assert.strictEqual(markers[0].severity, MarkerSeverity.Error);
                assert.strictEqual(markers[0].message, `The 'name' attribute must be a string.`);
            }
            // Valid name with allowed characters
            {
                const content = [
                    '---',
                    'name: "My_Agent-2.0 with spaces"',
                    'description: "Test agent"',
                    'target: vscode',
                    '---',
                    'Body',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.deepStrictEqual(markers, [], 'Name with allowed characters should be valid');
            }
        });
        test('github-copilot target requires name attribute', async () => {
            // Missing name with github-copilot target
            {
                const content = [
                    '---',
                    'description: "GitHub Copilot agent"',
                    'target: github-copilot',
                    `tools: ['shell']`,
                    '---',
                    'Body',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.strictEqual(markers.length, 0);
            }
            // Valid name with github-copilot target
            {
                const content = [
                    '---',
                    'name: "GitHubAgent"',
                    'description: "GitHub Copilot agent"',
                    'target: github-copilot',
                    `tools: ['shell']`,
                    '---',
                    'Body',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.deepStrictEqual(markers, [], 'Valid github-copilot agent with name should not produce errors');
            }
            // Missing name with vscode target (should be optional)
            {
                const content = [
                    '---',
                    'description: "VS Code agent"',
                    'target: vscode',
                    `tools: ['tool1']`,
                    '---',
                    'Body',
                ].join('\n');
                const markers = await validate(content, PromptsType.agent);
                assert.deepStrictEqual(markers, [], 'Name should be optional for vscode target');
            }
        });
    });
    suite('instructions', () => {
        test('instructions valid', async () => {
            const content = [
                '---',
                'description: "Instr"',
                'applyTo: *.ts,*.js',
                '---',
            ].join('\n');
            const markers = await validate(content, PromptsType.instructions);
            assert.deepEqual(markers, []);
        });
        test('instructions invalid applyTo type', async () => {
            const content = [
                '---',
                'description: "Instr"',
                'applyTo: 5',
                '---',
            ].join('\n');
            const markers = await validate(content, PromptsType.instructions);
            assert.strictEqual(markers.length, 1);
            assert.strictEqual(markers[0].message, `The 'applyTo' attribute must be a string.`);
        });
        test('instructions invalid applyTo glob & unknown attribute', async () => {
            const content = [
                '---',
                'description: "Instr"',
                `applyTo: ''`, // empty -> invalid glob
                'model: mae-4', // model not allowed in instructions
                '---',
            ].join('\n');
            const markers = await validate(content, PromptsType.instructions);
            assert.strictEqual(markers.length, 2);
            // Order: unknown attribute warnings first (attribute iteration) then applyTo validation
            assert.strictEqual(markers[0].severity, MarkerSeverity.Warning);
            assert.ok(markers[0].message.startsWith(`Attribute 'model' is not supported in instructions files.`));
            assert.strictEqual(markers[1].message, `The 'applyTo' attribute must be a valid glob pattern.`);
        });
        test('invalid header structure (YAML array)', async () => {
            const content = [
                '---',
                '- item1',
                '---',
                'Body',
            ].join('\n');
            const markers = await validate(content, PromptsType.instructions);
            assert.strictEqual(markers.length, 1);
            assert.strictEqual(markers[0].message, 'Invalid header, expecting <key: value> pairs');
        });
        test('name attribute validation in instructions', async () => {
            // Valid name
            {
                const content = [
                    '---',
                    'name: "MyInstructions"',
                    'description: "Test instructions"',
                    'applyTo: "**/*.ts"',
                    '---',
                    'Body',
                ].join('\n');
                const markers = await validate(content, PromptsType.instructions);
                assert.deepStrictEqual(markers, [], 'Valid name should not produce errors');
            }
            // Empty name
            {
                const content = [
                    '---',
                    'name: ""',
                    'description: "Test instructions"',
                    'applyTo: "**/*.ts"',
                    '---',
                    'Body',
                ].join('\n');
                const markers = await validate(content, PromptsType.instructions);
                assert.strictEqual(markers.length, 1);
                assert.strictEqual(markers[0].severity, MarkerSeverity.Error);
                assert.strictEqual(markers[0].message, `The 'name' attribute must not be empty.`);
            }
        });
    });
    suite('prompts', () => {
        test('prompt valid with agent mode (default) and tools and a BYO model', async () => {
            // mode omitted -> defaults to Agent; tools+model should validate; model MAE 4 is agent capable
            const content = [
                '---',
                'description: "Prompt with tools"',
                'model: MAE 4.1',
                `tools: ['tool1','tool2']`,
                '---',
                'Body'
            ].join('\n');
            const markers = await validate(content, PromptsType.prompt);
            assert.deepStrictEqual(markers, []);
        });
        test('prompt model not suited for agent mode', async () => {
            // MAE 3.5 Turbo lacks agentMode capability -> warning when used in agent (default)
            const content = [
                '---',
                'description: "Prompt with unsuitable model"',
                'model: MAE 3.5 Turbo',
                '---',
                'Body'
            ].join('\n');
            const markers = await validate(content, PromptsType.prompt);
            assert.strictEqual(markers.length, 1, 'Expected one warning about unsuitable model');
            assert.strictEqual(markers[0].severity, MarkerSeverity.Warning);
            assert.strictEqual(markers[0].message, `Model 'MAE 3.5 Turbo' is not suited for agent mode.`);
        });
        test('prompt with custom agent BeastMode and tools', async () => {
            // Explicit custom agent should be recognized; BeastMode kind comes from setup; ensure tools accepted
            const content = [
                '---',
                'description: "Prompt custom mode"',
                'agent: BeastMode',
                `tools: ['tool1']`,
                '---',
                'Body'
            ].join('\n');
            const markers = await validate(content, PromptsType.prompt);
            assert.deepStrictEqual(markers, []);
        });
        test('prompt with custom mode BeastMode and tools', async () => {
            // Explicit custom mode should be recognized; BeastMode kind comes from setup; ensure tools accepted
            const content = [
                '---',
                'description: "Prompt custom mode"',
                'mode: BeastMode',
                `tools: ['tool1']`,
                '---',
                'Body'
            ].join('\n');
            const markers = await validate(content, PromptsType.prompt);
            assert.strictEqual(markers.length, 1);
            assert.deepStrictEqual(markers.map(m => m.message), [`The 'mode' attribute has been deprecated. Please rename it to 'agent'.`]);
        });
        test('prompt with custom mode an agent', async () => {
            // Explicit custom mode should be recognized; BeastMode kind comes from setup; ensure tools accepted
            const content = [
                '---',
                'description: "Prompt custom mode"',
                'mode: BeastMode',
                `agent: agent`,
                '---',
                'Body'
            ].join('\n');
            const markers = await validate(content, PromptsType.prompt);
            assert.strictEqual(markers.length, 1);
            assert.deepStrictEqual(markers.map(m => m.message), [`The 'mode' attribute has been deprecated. The 'agent' attribute is used instead.`]);
        });
        test('prompt with unknown agent Ask', async () => {
            const content = [
                '---',
                'description: "Prompt unknown agent Ask"',
                'agent: Ask',
                `tools: ['tool1','tool2']`,
                '---',
                'Body'
            ].join('\n');
            const markers = await validate(content, PromptsType.prompt);
            assert.strictEqual(markers.length, 1, 'Expected one warning about tools in non-agent mode');
            assert.strictEqual(markers[0].severity, MarkerSeverity.Warning);
            assert.strictEqual(markers[0].message, `Unknown agent 'Ask'. Available agents: agent, ask, edit, BeastMode.`);
        });
        test('prompt with agent edit', async () => {
            const content = [
                '---',
                'description: "Prompt edit mode with tool"',
                'agent: edit',
                `tools: ['tool1']`,
                '---',
                'Body'
            ].join('\n');
            const markers = await validate(content, PromptsType.prompt);
            assert.strictEqual(markers.length, 1);
            assert.strictEqual(markers[0].severity, MarkerSeverity.Warning);
            assert.strictEqual(markers[0].message, `The 'tools' attribute is only supported when using agents. Attribute will be ignored.`);
        });
        test('name attribute validation in prompts', async () => {
            // Valid name
            {
                const content = [
                    '---',
                    'name: "MyPrompt"',
                    'description: "Test prompt"',
                    '---',
                    'Body',
                ].join('\n');
                const markers = await validate(content, PromptsType.prompt);
                assert.deepStrictEqual(markers, [], 'Valid name should not produce errors');
            }
            // Empty name
            {
                const content = [
                    '---',
                    'name: ""',
                    'description: "Test prompt"',
                    '---',
                    'Body',
                ].join('\n');
                const markers = await validate(content, PromptsType.prompt);
                assert.strictEqual(markers.length, 1);
                assert.strictEqual(markers[0].severity, MarkerSeverity.Error);
                assert.strictEqual(markers[0].message, `The 'name' attribute must not be empty.`);
            }
        });
    });
    suite('body', () => {
        test('body with existing file references and known tools has no markers', async () => {
            const content = [
                '---',
                'description: "Refs"',
                '---',
                'Here is a #file:./reference1.md and a markdown [reference](./reference2.md) plus variables #tool1 and #tool2'
            ].join('\n');
            const markers = await validate(content, PromptsType.prompt);
            assert.deepStrictEqual(markers, [], 'Expected no validation issues');
        });
        test('body with missing file references reports warnings', async () => {
            const content = [
                '---',
                'description: "Missing Refs"',
                '---',
                'Here is a #file:./missing1.md and a markdown [missing link](./missing2.md).'
            ].join('\n');
            const markers = await validate(content, PromptsType.prompt);
            const messages = markers.map(m => m.message).sort();
            assert.deepStrictEqual(messages, [
                `File './missing1.md' not found at '/missing1.md'.`,
                `File './missing2.md' not found at '/missing2.md'.`
            ]);
        });
        test('body with http link', async () => {
            const content = [
                '---',
                'description: "HTTP Link"',
                '---',
                'Here is a [http link](http://example.com).'
            ].join('\n');
            const markers = await validate(content, PromptsType.prompt);
            assert.deepStrictEqual(markers, [], 'Expected no validation issues');
        });
        test('body with url link', async () => {
            const nonExistingRef = existingRef1.with({ path: '/nonexisting' });
            const content = [
                '---',
                'description: "URL Links"',
                '---',
                `Here is a [url link](${existingRef1.toString()}).`,
                `Here is a [url link](${nonExistingRef.toString()}).`
            ].join('\n');
            const markers = await validate(content, PromptsType.prompt);
            const messages = markers.map(m => m.message).sort();
            assert.deepStrictEqual(messages, [
                `File 'myFs://test/nonexisting' not found at '/nonexisting'.`,
            ]);
        });
        test('body with unknown tool variable reference warns', async () => {
            const content = [
                '---',
                'description: "Unknown tool var"',
                '---',
                'This line references known #tool:tool1 and unknown #tool:toolX'
            ].join('\n');
            const markers = await validate(content, PromptsType.prompt);
            assert.strictEqual(markers.length, 1, 'Expected one warning for unknown tool variable');
            assert.strictEqual(markers[0].severity, MarkerSeverity.Warning);
            assert.strictEqual(markers[0].message, `Unknown tool or toolset 'toolX'.`);
        });
        test('body with tool not present in tools list', async () => {
            const content = [
                '---',
                'tools: []',
                '---',
                'I need',
                '#tool:ms-azuretools.vscode-azure-github-copilot/azure_recommend_custom_modes',
                '#tool:github.vscode-pull-request-github/suggest-fix',
                '#tool:openSimpleBrowser',
            ].join('\n');
            const markers = await validate(content, PromptsType.prompt);
            const actual = markers.sort((a, b) => a.startLineNumber - b.startLineNumber).map(m => ({ message: m.message, startColumn: m.startColumn, endColumn: m.endColumn }));
            assert.deepEqual(actual, [
                { message: `Unknown tool or toolset 'ms-azuretools.vscode-azure-github-copilot/azure_recommend_custom_modes'.`, startColumn: 7, endColumn: 77 },
                { message: `Tool or toolset 'github.vscode-pull-request-github/suggest-fix' also needs to be enabled in the header.`, startColumn: 7, endColumn: 52 },
                { message: `Unknown tool or toolset 'openSimpleBrowser'.`, startColumn: 7, endColumn: 24 },
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VmFsaWRhdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvYnJvd3Nlci9wcm9tcHRTeXRudGF4L3Byb21wdFZhbGlkYXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUU1QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFDO0FBQzVILE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUVoRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDakYsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ25HLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzlELE9BQU8sRUFB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