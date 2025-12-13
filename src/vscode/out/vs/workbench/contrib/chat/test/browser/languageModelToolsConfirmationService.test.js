/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IStorageService, InMemoryStorageService } from '../../../../../platform/storage/common/storage.js';
import { LanguageModelToolsConfirmationService } from '../../browser/languageModelToolsConfirmationService.js';
import { ToolDataSource } from '../../common/languageModelToolsService.js';
suite('LanguageModelToolsConfirmationService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let service;
    let instantiationService;
    setup(() => {
        instantiationService = store.add(new TestInstantiationService());
        instantiationService.stub(IStorageService, store.add(new InMemoryStorageService()));
        service = store.add(instantiationService.createInstance(LanguageModelToolsConfirmationService));
    });
    function createToolRef(toolId, source = ToolDataSource.Internal, parameters = {}) {
        return { toolId, source, parameters };
    }
    function createMcpToolRef(toolId, definitionId, serverLabel, parameters = {}) {
        return {
            toolId,
            source: {
                type: 'mcp',
                label: serverLabel,
                serverLabel,
                instructions: undefined,
                collectionId: 'testCollection',
                definitionId
            },
            parameters
        };
    }
    test('getPreConfirmAction returns undefined by default', () => {
        const ref = createToolRef('testTool');
        const result = service.getPreConfirmAction(ref);
        assert.strictEqual(result, undefined);
    });
    test('getPostConfirmAction returns undefined by default', () => {
        const ref = createToolRef('testTool');
        const result = service.getPostConfirmAction(ref);
        assert.strictEqual(result, undefined);
    });
    test('getPreConfirmActions returns default tool-level actions', () => {
        const ref = createToolRef('testTool');
        const actions = service.getPreConfirmActions(ref);
        assert.ok(actions.length >= 3);
        assert.ok(actions.some(a => a.label.includes('Session')));
        assert.ok(actions.some(a => a.label.includes('Workspace')));
        assert.ok(actions.some(a => a.label.includes('Always Allow')));
    });
    test('getPostConfirmActions returns default tool-level actions', () => {
        const ref = createToolRef('testTool');
        const actions = service.getPostConfirmActions(ref);
        assert.ok(actions.length >= 3);
        assert.ok(actions.some(a => a.label.includes('Session')));
        assert.ok(actions.some(a => a.label.includes('Workspace')));
        assert.ok(actions.some(a => a.label.includes('Always Allow')));
    });
    test('getPreConfirmActions includes server-level actions for MCP tools', () => {
        const ref = createMcpToolRef('mcpTool', 'serverId', 'Test Server');
        const actions = service.getPreConfirmActions(ref);
        assert.ok(actions.some(a => a.label.includes('Test Server') && a.label.includes('Session')));
        assert.ok(actions.some(a => a.label.includes('Test Server') && a.label.includes('Workspace')));
        assert.ok(actions.some(a => a.label.includes('Test Server') && a.label.includes('Always Allow')));
    });
    test('getPostConfirmActions includes server-level actions for MCP tools', () => {
        const ref = createMcpToolRef('mcpTool', 'serverId', 'Test Server');
        const actions = service.getPostConfirmActions(ref);
        assert.ok(actions.some(a => a.label.includes('Test Server') && a.label.includes('Session')));
        assert.ok(actions.some(a => a.label.includes('Test Server') && a.label.includes('Workspace')));
        assert.ok(actions.some(a => a.label.includes('Test Server') && a.label.includes('Always Allow')));
    });
    test('pre-execution session confirmation works', async () => {
        const ref = createToolRef('testTool');
        const actions = service.getPreConfirmActions(ref);
        const sessionAction = actions.find(a => a.label.includes('Session') && !a.label.includes('Server'));
        assert.ok(sessionAction);
        await sessionAction.select();
        const result = service.getPreConfirmAction(ref);
        assert.deepStrictEqual(result, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'session' });
    });
    test('pre-execution workspace confirmation works', async () => {
        const ref = createToolRef('testTool');
        const actions = service.getPreConfirmActions(ref);
        const workspaceAction = actions.find(a => a.label.includes('Workspace') && !a.label.includes('Server'));
        assert.ok(workspaceAction);
        await workspaceAction.select();
        const result = service.getPreConfirmAction(ref);
        assert.deepStrictEqual(result, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'workspace' });
    });
    test('pre-execution profile confirmation works', async () => {
        const ref = createToolRef('testTool');
        const actions = service.getPreConfirmActions(ref);
        const profileAction = actions.find(a => a.label.includes('Always Allow') && !a.label.includes('Server'));
        assert.ok(profileAction);
        await profileAction.select();
        const result = service.getPreConfirmAction(ref);
        assert.deepStrictEqual(result, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'profile' });
    });
    test('post-execution session confirmation works', async () => {
        const ref = createToolRef('testTool');
        const actions = service.getPostConfirmActions(ref);
        const sessionAction = actions.find(a => a.label.includes('Session') && !a.label.includes('Server'));
        assert.ok(sessionAction);
        await sessionAction.select();
        const result = service.getPostConfirmAction(ref);
        assert.deepStrictEqual(result, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'session' });
    });
    test('post-execution workspace confirmation works', async () => {
        const ref = createToolRef('testTool');
        const actions = service.getPostConfirmActions(ref);
        const workspaceAction = actions.find(a => a.label.includes('Workspace') && !a.label.includes('Server'));
        assert.ok(workspaceAction);
        await workspaceAction.select();
        const result = service.getPostConfirmAction(ref);
        assert.deepStrictEqual(result, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'workspace' });
    });
    test('post-execution profile confirmation works', async () => {
        const ref = createToolRef('testTool');
        const actions = service.getPostConfirmActions(ref);
        const profileAction = actions.find(a => a.label.includes('Always Allow') && !a.label.includes('Server'));
        assert.ok(profileAction);
        await profileAction.select();
        const result = service.getPostConfirmAction(ref);
        assert.deepStrictEqual(result, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'profile' });
    });
    test('MCP server-level pre-execution session confirmation works', async () => {
        const ref = createMcpToolRef('mcpTool', 'serverId', 'Test Server');
        const actions = service.getPreConfirmActions(ref);
        const serverAction = actions.find(a => a.label.includes('Test Server') && a.label.includes('Session'));
        assert.ok(serverAction);
        await serverAction.select();
        const result = service.getPreConfirmAction(ref);
        assert.deepStrictEqual(result, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'session' });
    });
    test('MCP server-level pre-execution workspace confirmation works', async () => {
        const ref = createMcpToolRef('mcpTool', 'serverId', 'Test Server');
        const actions = service.getPreConfirmActions(ref);
        const serverAction = actions.find(a => a.label.includes('Test Server') && a.label.includes('Workspace'));
        assert.ok(serverAction);
        await serverAction.select();
        const result = service.getPreConfirmAction(ref);
        assert.deepStrictEqual(result, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'workspace' });
    });
    test('MCP server-level pre-execution profile confirmation works', async () => {
        const ref = createMcpToolRef('mcpTool', 'serverId', 'Test Server');
        const actions = service.getPreConfirmActions(ref);
        const serverAction = actions.find(a => a.label.includes('Test Server') && a.label.includes('Always Allow'));
        assert.ok(serverAction);
        await serverAction.select();
        const result = service.getPreConfirmAction(ref);
        assert.deepStrictEqual(result, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'profile' });
    });
    test('MCP server-level post-execution session confirmation works', async () => {
        const ref = createMcpToolRef('mcpTool', 'serverId', 'Test Server');
        const actions = service.getPostConfirmActions(ref);
        const serverAction = actions.find(a => a.label.includes('Test Server') && a.label.includes('Session'));
        assert.ok(serverAction);
        await serverAction.select();
        const result = service.getPostConfirmAction(ref);
        assert.deepStrictEqual(result, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'session' });
    });
    test('MCP server-level confirmation applies to all tools from that server', async () => {
        const ref1 = createMcpToolRef('mcpTool1', 'serverId', 'Test Server');
        const ref2 = createMcpToolRef('mcpTool2', 'serverId', 'Test Server');
        const actions = service.getPreConfirmActions(ref1);
        const serverAction = actions.find(a => a.label.includes('Test Server') && a.label.includes('Session'));
        assert.ok(serverAction);
        await serverAction.select();
        const result1 = service.getPreConfirmAction(ref1);
        const result2 = service.getPreConfirmAction(ref2);
        assert.deepStrictEqual(result1, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'session' });
        assert.deepStrictEqual(result2, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'session' });
    });
    test('tool-level confirmation takes precedence over server-level confirmation', async () => {
        const ref = createMcpToolRef('mcpTool', 'serverId', 'Test Server');
        // Set server-level confirmation
        const serverActions = service.getPreConfirmActions(ref);
        const serverAction = serverActions.find(a => a.label.includes('Test Server') && a.label.includes('Session'));
        assert.ok(serverAction);
        await serverAction.select();
        // Set tool-level confirmation to a different scope
        const toolActions = service.getPreConfirmActions(ref);
        const toolAction = toolActions.find(a => !a.label.includes('Test Server') && a.label.includes('Workspace'));
        assert.ok(toolAction);
        await toolAction.select();
        // Tool-level should take precedence
        const result = service.getPreConfirmAction(ref);
        assert.deepStrictEqual(result, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'workspace' });
    });
    test('registerConfirmationContribution allows custom pre-confirm actions', () => {
        const contribution = {
            getPreConfirmAction: (ref) => {
                return { type: 4 /* ToolConfirmKind.UserAction */ };
            }
        };
        store.add(service.registerConfirmationContribution('customTool', contribution));
        const ref = createToolRef('customTool');
        const result = service.getPreConfirmAction(ref);
        assert.ok(result);
        assert.strictEqual(result.type, 4 /* ToolConfirmKind.UserAction */);
    });
    test('registerConfirmationContribution allows custom post-confirm actions', () => {
        const contribution = {
            getPostConfirmAction: (ref) => {
                return { type: 4 /* ToolConfirmKind.UserAction */ };
            }
        };
        store.add(service.registerConfirmationContribution('customTool', contribution));
        const ref = createToolRef('customTool');
        const result = service.getPostConfirmAction(ref);
        assert.ok(result);
        assert.strictEqual(result.type, 4 /* ToolConfirmKind.UserAction */);
    });
    test('registerConfirmationContribution allows custom pre-confirm action list', () => {
        const customActions = [
            {
                label: 'Custom Action 1',
                select: async () => true
            },
            {
                label: 'Custom Action 2',
                select: async () => true
            }
        ];
        const contribution = {
            getPreConfirmActions: (ref) => customActions
        };
        store.add(service.registerConfirmationContribution('customTool', contribution));
        const ref = createToolRef('customTool');
        const actions = service.getPreConfirmActions(ref);
        // Should include both custom actions and default actions
        assert.ok(actions.some(a => a.label === 'Custom Action 1'));
        assert.ok(actions.some(a => a.label === 'Custom Action 2'));
        assert.ok(actions.some(a => a.label.includes('Session')));
    });
    test('registerConfirmationContribution with canUseDefaultApprovals=false only shows custom actions', () => {
        const customActions = [
            {
                label: 'Custom Action Only',
                select: async () => true
            }
        ];
        const contribution = {
            canUseDefaultApprovals: false,
            getPreConfirmActions: (ref) => customActions
        };
        store.add(service.registerConfirmationContribution('customTool', contribution));
        const ref = createToolRef('customTool');
        const actions = service.getPreConfirmActions(ref);
        assert.strictEqual(actions.length, 1);
        assert.strictEqual(actions[0].label, 'Custom Action Only');
    });
    test('contribution getPreConfirmAction takes precedence over default stores', () => {
        const contribution = {
            getPreConfirmAction: (ref) => {
                return { type: 4 /* ToolConfirmKind.UserAction */ };
            }
        };
        store.add(service.registerConfirmationContribution('customTool', contribution));
        // Contribution should take precedence even without setting default
        const ref = createToolRef('customTool');
        const result = service.getPreConfirmAction(ref);
        assert.ok(result);
        assert.strictEqual(result.type, 4 /* ToolConfirmKind.UserAction */);
    });
    test('contribution with canUseDefaultApprovals=false prevents default store checks', () => {
        const contribution = {
            canUseDefaultApprovals: false,
            getPreConfirmAction: () => undefined
        };
        store.add(service.registerConfirmationContribution('customTool', contribution));
        const ref = createToolRef('customTool');
        const actions = service.getPreConfirmActions(ref);
        // Should have no actions since canUseDefaultApprovals is false
        assert.strictEqual(actions.length, 0);
    });
    test('resetToolAutoConfirmation clears all confirmations', async () => {
        const ref1 = createToolRef('tool1');
        const ref2 = createMcpToolRef('mcpTool', 'serverId', 'Test Server');
        // Set some confirmations
        const actions1 = service.getPreConfirmActions(ref1);
        const sessionAction1 = actions1.find(a => a.label.includes('Session') && !a.label.includes('Server'));
        assert.ok(sessionAction1);
        await sessionAction1.select();
        const actions2 = service.getPreConfirmActions(ref2);
        const serverAction = actions2.find(a => a.label.includes('Test Server') && a.label.includes('Session'));
        assert.ok(serverAction);
        await serverAction.select();
        // Verify they're set
        assert.ok(service.getPreConfirmAction(ref1));
        assert.ok(service.getPreConfirmAction(ref2));
        // Reset
        service.resetToolAutoConfirmation();
        // Verify they're cleared
        assert.strictEqual(service.getPreConfirmAction(ref1), undefined);
        assert.strictEqual(service.getPreConfirmAction(ref2), undefined);
    });
    test('resetToolAutoConfirmation calls contribution reset', () => {
        let resetCalled = false;
        const contribution = {
            reset: () => {
                resetCalled = true;
            }
        };
        store.add(service.registerConfirmationContribution('customTool', contribution));
        service.resetToolAutoConfirmation();
        assert.strictEqual(resetCalled, true);
    });
    test('disposing contribution registration removes it', () => {
        const contribution = {
            getPreConfirmAction: (ref) => {
                return { type: 4 /* ToolConfirmKind.UserAction */ };
            }
        };
        const disposable = service.registerConfirmationContribution('customTool', contribution);
        const ref = createToolRef('customTool');
        let result = service.getPreConfirmAction(ref);
        assert.ok(result);
        assert.strictEqual(result.type, 4 /* ToolConfirmKind.UserAction */);
        disposable.dispose();
        result = service.getPreConfirmAction(ref);
        assert.strictEqual(result, undefined);
    });
    test('different tools have independent confirmations', async () => {
        const ref1 = createToolRef('tool1');
        const ref2 = createToolRef('tool2');
        // Set session for tool1
        const actions1 = service.getPreConfirmActions(ref1);
        const sessionAction = actions1.find(a => a.label.includes('Session') && !a.label.includes('Server'));
        assert.ok(sessionAction);
        await sessionAction.select();
        // Set workspace for tool2
        const actions2 = service.getPreConfirmActions(ref2);
        const workspaceAction = actions2.find(a => a.label.includes('Workspace') && !a.label.includes('Server'));
        assert.ok(workspaceAction);
        await workspaceAction.select();
        // Verify they're independent
        const result1 = service.getPreConfirmAction(ref1);
        const result2 = service.getPreConfirmAction(ref2);
        assert.deepStrictEqual(result1, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'session' });
        assert.deepStrictEqual(result2, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'workspace' });
    });
    test('pre and post execution confirmations are independent', async () => {
        const ref = createToolRef('testTool');
        // Set pre-execution to session
        const preActions = service.getPreConfirmActions(ref);
        const preSessionAction = preActions.find(a => a.label.includes('Session') && !a.label.includes('Server'));
        assert.ok(preSessionAction);
        await preSessionAction.select();
        // Set post-execution to workspace
        const postActions = service.getPostConfirmActions(ref);
        const postWorkspaceAction = postActions.find(a => a.label.includes('Workspace') && !a.label.includes('Server'));
        assert.ok(postWorkspaceAction);
        await postWorkspaceAction.select();
        // Verify they're independent
        const preResult = service.getPreConfirmAction(ref);
        const postResult = service.getPostConfirmAction(ref);
        assert.deepStrictEqual(preResult, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'session' });
        assert.deepStrictEqual(postResult, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'workspace' });
    });
    test('different MCP servers have independent confirmations', async () => {
        const ref1 = createMcpToolRef('tool1', 'server1', 'Server 1');
        const ref2 = createMcpToolRef('tool2', 'server2', 'Server 2');
        // Set server1 to session
        const actions1 = service.getPreConfirmActions(ref1);
        const serverAction1 = actions1.find(a => a.label.includes('Server 1') && a.label.includes('Session'));
        assert.ok(serverAction1);
        await serverAction1.select();
        // Set server2 to workspace
        const actions2 = service.getPreConfirmActions(ref2);
        const serverAction2 = actions2.find(a => a.label.includes('Server 2') && a.label.includes('Workspace'));
        assert.ok(serverAction2);
        await serverAction2.select();
        // Verify they're independent
        const result1 = service.getPreConfirmAction(ref1);
        const result2 = service.getPreConfirmAction(ref2);
        assert.deepStrictEqual(result1, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'session' });
        assert.deepStrictEqual(result2, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'workspace' });
    });
    test('actions return true when select is called', async () => {
        const ref = createToolRef('testTool');
        const actions = service.getPreConfirmActions(ref);
        for (const action of actions) {
            const result = await action.select();
            assert.strictEqual(result, true);
        }
    });
    test('session confirmations are stored in memory only', async () => {
        const ref = createToolRef('testTool');
        const actions = service.getPreConfirmActions(ref);
        const sessionAction = actions.find(a => a.label.includes('Session') && !a.label.includes('Server'));
        assert.ok(sessionAction);
        await sessionAction.select();
        // Verify it's set
        const result = service.getPreConfirmAction(ref);
        assert.deepStrictEqual(result, { type: 3 /* ToolConfirmKind.LmServicePerTool */, scope: 'session' });
        // Create new service instance (simulating restart)
        const newService = store.add(instantiationService.createInstance(LanguageModelToolsConfirmationService));
        // Session confirmation should not persist
        const newResult = newService.getPreConfirmAction(ref);
        assert.strictEqual(newResult, undefined);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbFRvb2xzQ29uZmlybWF0aW9uU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2Jyb3dzZXIvbGFuZ3VhZ2VNb2RlbFRvb2xzQ29uZmlybWF0aW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBRSxlQUFlLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RyxPQUFPLEVBQUUscUNBQXFDLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUcvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFM0UsS0FBSyxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtJQUNuRCxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRXhELElBQUksT0FBOEMsQ0FBQztJQUNuRCxJQUFJLG9CQUE4QyxDQUFDO0lBRW5ELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1FBQ2pFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXBGLE9BQU8sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFD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