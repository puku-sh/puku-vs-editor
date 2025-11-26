/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ChatAgentService } from '../../common/chatAgents.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
const testAgentId = 'testAgent';
const testAgentData = {
    id: testAgentId,
    name: 'Test Agent',
    extensionDisplayName: '',
    extensionId: new ExtensionIdentifier(''),
    extensionVersion: undefined,
    extensionPublisherId: '',
    locations: [],
    modes: [],
    metadata: {},
    slashCommands: [],
    disambiguation: [],
};
class TestingContextKeyService extends MockContextKeyService {
    constructor() {
        super(...arguments);
        this._contextMatchesRulesReturnsTrue = false;
    }
    contextMatchesRulesReturnsTrue() {
        this._contextMatchesRulesReturnsTrue = true;
    }
    contextMatchesRules(rules) {
        return this._contextMatchesRulesReturnsTrue;
    }
}
suite('ChatAgents', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let chatAgentService;
    let contextKeyService;
    setup(() => {
        contextKeyService = new TestingContextKeyService();
        chatAgentService = store.add(new ChatAgentService(contextKeyService, new TestConfigurationService()));
    });
    test('registerAgent', async () => {
        assert.strictEqual(chatAgentService.getAgents().length, 0);
        const agentRegistration = chatAgentService.registerAgent(testAgentId, testAgentData);
        assert.strictEqual(chatAgentService.getAgents().length, 1);
        assert.strictEqual(chatAgentService.getAgents()[0].id, testAgentId);
        assert.throws(() => chatAgentService.registerAgent(testAgentId, testAgentData));
        agentRegistration.dispose();
        assert.strictEqual(chatAgentService.getAgents().length, 0);
    });
    test('agent when clause', async () => {
        assert.strictEqual(chatAgentService.getAgents().length, 0);
        store.add(chatAgentService.registerAgent(testAgentId, {
            ...testAgentData,
            when: 'myKey'
        }));
        assert.strictEqual(chatAgentService.getAgents().length, 0);
        contextKeyService.contextMatchesRulesReturnsTrue();
        assert.strictEqual(chatAgentService.getAgents().length, 1);
    });
    suite('registerAgentImplementation', function () {
        const agentImpl = {
            invoke: async () => { return {}; },
            provideFollowups: async () => { return []; },
        };
        test('should register an agent implementation', () => {
            store.add(chatAgentService.registerAgent(testAgentId, testAgentData));
            store.add(chatAgentService.registerAgentImplementation(testAgentId, agentImpl));
            const agents = chatAgentService.getActivatedAgents();
            assert.strictEqual(agents.length, 1);
            assert.strictEqual(agents[0].id, testAgentId);
        });
        test('can dispose an agent implementation', () => {
            store.add(chatAgentService.registerAgent(testAgentId, testAgentData));
            const implRegistration = chatAgentService.registerAgentImplementation(testAgentId, agentImpl);
            implRegistration.dispose();
            const agents = chatAgentService.getActivatedAgents();
            assert.strictEqual(agents.length, 0);
        });
        test('should throw error if agent does not exist', () => {
            assert.throws(() => chatAgentService.registerAgentImplementation('nonexistentAgent', agentImpl));
        });
        test('should throw error if agent already has an implementation', () => {
            store.add(chatAgentService.registerAgent(testAgentId, testAgentData));
            store.add(chatAgentService.registerAgentImplementation(testAgentId, agentImpl));
            assert.throws(() => chatAgentService.registerAgentImplementation(testAgentId, agentImpl));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFnZW50cy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9jaGF0QWdlbnRzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ2hILE9BQU8sRUFBRSxnQkFBZ0IsRUFBNEMsTUFBTSw0QkFBNEIsQ0FBQztBQUN4RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUV6SCxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUM7QUFDaEMsTUFBTSxhQUFhLEdBQW1CO0lBQ3JDLEVBQUUsRUFBRSxXQUFXO0lBQ2YsSUFBSSxFQUFFLFlBQVk7SUFDbEIsb0JBQW9CLEVBQUUsRUFBRTtJQUN4QixXQUFXLEVBQUUsSUFBSSxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7SUFDeEMsZ0JBQWdCLEVBQUUsU0FBUztJQUMzQixvQkFBb0IsRUFBRSxFQUFFO0lBQ3hCLFNBQVMsRUFBRSxFQUFFO0lBQ2IsS0FBSyxFQUFFLEVBQUU7SUFDVCxRQUFRLEVBQUUsRUFBRTtJQUNaLGFBQWEsRUFBRSxFQUFFO0lBQ2pCLGNBQWMsRUFBRSxFQUFFO0NBQ2xCLENBQUM7QUFFRixNQUFNLHdCQUF5QixTQUFRLHFCQUFxQjtJQUE1RDs7UUFDUyxvQ0FBK0IsR0FBRyxLQUFLLENBQUM7SUFRakQsQ0FBQztJQVBPLDhCQUE4QjtR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