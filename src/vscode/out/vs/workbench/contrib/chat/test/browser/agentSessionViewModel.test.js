/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AgentSessionsViewModel, isAgentSession, isAgentSessionsViewModel, isLocalAgentSessionItem } from '../../browser/agentSessions/agentSessionViewModel.js';
import { AgentSessionsViewFilter } from '../../browser/agentSessions/agentSessionsViewFilter.js';
import { IChatSessionsService, localChatSessionType } from '../../common/chatSessionsService.js';
import { LocalChatSessionUri } from '../../common/chatUri.js';
import { MockChatSessionsService } from '../common/mockChatSessionsService.js';
import { TestLifecycleService, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
suite('AgentSessionsViewModel', () => {
    const disposables = new DisposableStore();
    let mockChatSessionsService;
    let mockLifecycleService;
    let viewModel;
    let instantiationService;
    function createViewModel() {
        return disposables.add(instantiationService.createInstance(AgentSessionsViewModel, { filterMenuId: MenuId.ViewTitle }));
    }
    setup(() => {
        mockChatSessionsService = new MockChatSessionsService();
        mockLifecycleService = disposables.add(new TestLifecycleService());
        instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
        instantiationService.stub(IChatSessionsService, mockChatSessionsService);
        instantiationService.stub(ILifecycleService, mockLifecycleService);
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should initialize with empty sessions', () => {
        viewModel = createViewModel();
        assert.strictEqual(viewModel.sessions.length, 0);
    });
    test('should resolve sessions from providers', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = {
                chatSessionType: 'test-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        resource: URI.parse('test://session-1'),
                        label: 'Test Session 1',
                        description: 'Description 1',
                        timing: { startTime: Date.now() }
                    },
                    {
                        resource: URI.parse('test://session-2'),
                        label: 'Test Session 2',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            await viewModel.resolve(undefined);
            assert.strictEqual(viewModel.sessions.length, 2);
            assert.strictEqual(viewModel.sessions[0].resource.toString(), 'test://session-1');
            assert.strictEqual(viewModel.sessions[0].label, 'Test Session 1');
            assert.strictEqual(viewModel.sessions[1].resource.toString(), 'test://session-2');
            assert.strictEqual(viewModel.sessions[1].label, 'Test Session 2');
        });
    });
    test('should resolve sessions from multiple providers', async () => {
        return runWithFakedTimers({}, async () => {
            const provider1 = {
                chatSessionType: 'type-1',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        resource: URI.parse('test://session-1'),
                        label: 'Session 1',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            const provider2 = {
                chatSessionType: 'type-2',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        resource: URI.parse('test://session-2'),
                        label: 'Session 2',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider1);
            mockChatSessionsService.registerChatSessionItemProvider(provider2);
            viewModel = createViewModel();
            await viewModel.resolve(undefined);
            assert.strictEqual(viewModel.sessions.length, 2);
            assert.strictEqual(viewModel.sessions[0].resource.toString(), 'test://session-1');
            assert.strictEqual(viewModel.sessions[1].resource.toString(), 'test://session-2');
        });
    });
    test('should fire onWillResolve and onDidResolve events', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = {
                chatSessionType: 'test-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => []
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            let willResolveFired = false;
            let didResolveFired = false;
            disposables.add(viewModel.onWillResolve(() => {
                willResolveFired = true;
                assert.strictEqual(didResolveFired, false, 'onDidResolve should not fire before onWillResolve completes');
            }));
            disposables.add(viewModel.onDidResolve(() => {
                didResolveFired = true;
                assert.strictEqual(willResolveFired, true, 'onWillResolve should fire before onDidResolve');
            }));
            await viewModel.resolve(undefined);
            assert.strictEqual(willResolveFired, true, 'onWillResolve should have fired');
            assert.strictEqual(didResolveFired, true, 'onDidResolve should have fired');
        });
    });
    test('should fire onDidChangeSessions event after resolving', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = {
                chatSessionType: 'test-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        resource: URI.parse('test://session-1'),
                        label: 'Test Session',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            let sessionsChangedFired = false;
            disposables.add(viewModel.onDidChangeSessions(() => {
                sessionsChangedFired = true;
            }));
            await viewModel.resolve(undefined);
            assert.strictEqual(sessionsChangedFired, true, 'onDidChangeSessions should have fired');
        });
    });
    test('should handle session with all properties', async () => {
        return runWithFakedTimers({}, async () => {
            const startTime = Date.now();
            const endTime = startTime + 1000;
            const provider = {
                chatSessionType: 'test-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        resource: URI.parse('test://session-1'),
                        label: 'Test Session',
                        description: new MarkdownString('**Bold** description'),
                        status: 1 /* ChatSessionStatus.Completed */,
                        tooltip: 'Session tooltip',
                        iconPath: ThemeIcon.fromId('check'),
                        timing: { startTime, endTime },
                        statistics: { files: 1, insertions: 10, deletions: 5 }
                    }
                ]
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            await viewModel.resolve(undefined);
            assert.strictEqual(viewModel.sessions.length, 1);
            const session = viewModel.sessions[0];
            assert.strictEqual(session.resource.toString(), 'test://session-1');
            assert.strictEqual(session.label, 'Test Session');
            assert.ok(session.description instanceof MarkdownString);
            if (session.description instanceof MarkdownString) {
                assert.strictEqual(session.description.value, '**Bold** description');
            }
            assert.strictEqual(session.status, 1 /* ChatSessionStatus.Completed */);
            assert.strictEqual(session.timing.startTime, startTime);
            assert.strictEqual(session.timing.endTime, endTime);
            assert.deepStrictEqual(session.statistics, { files: 1, insertions: 10, deletions: 5 });
        });
    });
    test('should handle resolve with specific provider', async () => {
        return runWithFakedTimers({}, async () => {
            const provider1 = {
                chatSessionType: 'type-1',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        resource: URI.parse('test://session-1'),
                        label: 'Session 1',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            const provider2 = {
                chatSessionType: 'type-2',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        id: 'session-2',
                        resource: URI.parse('test://session-2'),
                        label: 'Session 2',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider1);
            mockChatSessionsService.registerChatSessionItemProvider(provider2);
            viewModel = createViewModel();
            // First resolve all
            await viewModel.resolve(undefined);
            assert.strictEqual(viewModel.sessions.length, 2);
            // Now resolve only type-1
            await viewModel.resolve('type-1');
            // Should still have both sessions, but only type-1 was re-resolved
            assert.strictEqual(viewModel.sessions.length, 2);
        });
    });
    test('should handle resolve with multiple specific providers', async () => {
        return runWithFakedTimers({}, async () => {
            const provider1 = {
                chatSessionType: 'type-1',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        resource: URI.parse('test://session-1'),
                        label: 'Session 1',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            const provider2 = {
                chatSessionType: 'type-2',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        id: 'session-2',
                        resource: URI.parse('test://session-2'),
                        label: 'Session 2',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider1);
            mockChatSessionsService.registerChatSessionItemProvider(provider2);
            viewModel = createViewModel();
            await viewModel.resolve(['type-1', 'type-2']);
            assert.strictEqual(viewModel.sessions.length, 2);
        });
    });
    test('should respond to onDidChangeItemsProviders event', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = {
                chatSessionType: 'test-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        resource: URI.parse('test://session-1'),
                        label: 'Test Session',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            const sessionsChangedPromise = Event.toPromise(viewModel.onDidChangeSessions);
            // Trigger event - this should automatically call resolve
            mockChatSessionsService.fireDidChangeItemsProviders(provider);
            // Wait for the sessions to be resolved
            await sessionsChangedPromise;
            assert.strictEqual(viewModel.sessions.length, 1);
        });
    });
    test('should respond to onDidChangeAvailability event', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = {
                chatSessionType: 'test-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        resource: URI.parse('test://session-1'),
                        label: 'Test Session',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            const sessionsChangedPromise = Event.toPromise(viewModel.onDidChangeSessions);
            // Trigger event - this should automatically call resolve
            mockChatSessionsService.fireDidChangeAvailability();
            // Wait for the sessions to be resolved
            await sessionsChangedPromise;
            assert.strictEqual(viewModel.sessions.length, 1);
        });
    });
    test('should respond to onDidChangeSessionItems event', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = {
                chatSessionType: 'test-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        resource: URI.parse('test://session-1'),
                        label: 'Test Session',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            const sessionsChangedPromise = Event.toPromise(viewModel.onDidChangeSessions);
            // Trigger event - this should automatically call resolve
            mockChatSessionsService.fireDidChangeSessionItems('test-type');
            // Wait for the sessions to be resolved
            await sessionsChangedPromise;
            assert.strictEqual(viewModel.sessions.length, 1);
        });
    });
    test('should maintain provider reference in session view model', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = {
                chatSessionType: 'test-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        resource: URI.parse('test://session-1'),
                        label: 'Test Session',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            await viewModel.resolve(undefined);
            assert.strictEqual(viewModel.sessions.length, 1);
            assert.strictEqual(viewModel.sessions[0].providerType, 'test-type');
        });
    });
    test('should handle empty provider results', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = {
                chatSessionType: 'test-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => []
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            await viewModel.resolve(undefined);
            assert.strictEqual(viewModel.sessions.length, 0);
        });
    });
    test('should handle sessions with different statuses', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = {
                chatSessionType: 'test-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        id: 'session-failed',
                        resource: URI.parse('test://session-failed'),
                        label: 'Failed Session',
                        status: 0 /* ChatSessionStatus.Failed */,
                        timing: { startTime: Date.now() }
                    },
                    {
                        id: 'session-completed',
                        resource: URI.parse('test://session-completed'),
                        label: 'Completed Session',
                        status: 1 /* ChatSessionStatus.Completed */,
                        timing: { startTime: Date.now() }
                    },
                    {
                        id: 'session-inprogress',
                        resource: URI.parse('test://session-inprogress'),
                        label: 'In Progress Session',
                        status: 2 /* ChatSessionStatus.InProgress */,
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            await viewModel.resolve(undefined);
            assert.strictEqual(viewModel.sessions.length, 3);
            assert.strictEqual(viewModel.sessions[0].status, 0 /* ChatSessionStatus.Failed */);
            assert.strictEqual(viewModel.sessions[1].status, 1 /* ChatSessionStatus.Completed */);
            assert.strictEqual(viewModel.sessions[2].status, 2 /* ChatSessionStatus.InProgress */);
        });
    });
    test('should replace sessions on re-resolve', async () => {
        return runWithFakedTimers({}, async () => {
            let sessionCount = 1;
            const provider = {
                chatSessionType: 'test-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => {
                    const sessions = [];
                    for (let i = 0; i < sessionCount; i++) {
                        sessions.push({
                            resource: URI.parse(`test://session-${i}`),
                            label: `Session ${i}`,
                            timing: { startTime: Date.now() }
                        });
                    }
                    return sessions;
                }
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            await viewModel.resolve(undefined);
            assert.strictEqual(viewModel.sessions.length, 1);
            sessionCount = 3;
            await viewModel.resolve(undefined);
            assert.strictEqual(viewModel.sessions.length, 3);
        });
    });
    test('should handle local agent session type specially', async () => {
        return runWithFakedTimers({}, async () => {
            const provider = {
                chatSessionType: localChatSessionType,
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        id: 'local-session',
                        resource: LocalChatSessionUri.forSession('local-session'),
                        label: 'Local Session',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            await viewModel.resolve(undefined);
            assert.strictEqual(viewModel.sessions.length, 1);
            assert.strictEqual(viewModel.sessions[0].providerType, localChatSessionType);
        });
    });
    test('should correctly construct resource URIs for sessions', async () => {
        return runWithFakedTimers({}, async () => {
            const resource = URI.parse('custom://my-session/path');
            const provider = {
                chatSessionType: 'test-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => [
                    {
                        resource: resource,
                        label: 'Test Session',
                        timing: { startTime: Date.now() }
                    }
                ]
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            await viewModel.resolve(undefined);
            assert.strictEqual(viewModel.sessions.length, 1);
            assert.strictEqual(viewModel.sessions[0].resource.toString(), resource.toString());
        });
    });
    test('should throttle multiple rapid resolve calls', async () => {
        return runWithFakedTimers({}, async () => {
            let providerCallCount = 0;
            const provider = {
                chatSessionType: 'test-type',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => {
                    providerCallCount++;
                    return [
                        {
                            resource: URI.parse('test://session-1'),
                            label: 'Test Session',
                            timing: { startTime: Date.now() }
                        }
                    ];
                }
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider);
            viewModel = createViewModel();
            // Make multiple rapid resolve calls
            const resolvePromises = [
                viewModel.resolve(undefined),
                viewModel.resolve(undefined),
                viewModel.resolve(undefined)
            ];
            await Promise.all(resolvePromises);
            // Should only call provider once due to throttling
            assert.strictEqual(providerCallCount, 1);
            assert.strictEqual(viewModel.sessions.length, 1);
        });
    });
    test('should preserve sessions from non-resolved providers', async () => {
        return runWithFakedTimers({}, async () => {
            let provider1CallCount = 0;
            let provider2CallCount = 0;
            const provider1 = {
                chatSessionType: 'type-1',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => {
                    provider1CallCount++;
                    return [
                        {
                            resource: URI.parse('test://session-1'),
                            label: `Session 1 (call ${provider1CallCount})`,
                            timing: { startTime: Date.now() }
                        }
                    ];
                }
            };
            const provider2 = {
                chatSessionType: 'type-2',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => {
                    provider2CallCount++;
                    return [
                        {
                            resource: URI.parse('test://session-2'),
                            label: `Session 2 (call ${provider2CallCount})`,
                            timing: { startTime: Date.now() }
                        }
                    ];
                }
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider1);
            mockChatSessionsService.registerChatSessionItemProvider(provider2);
            viewModel = createViewModel();
            // First resolve all
            await viewModel.resolve(undefined);
            assert.strictEqual(viewModel.sessions.length, 2);
            assert.strictEqual(provider1CallCount, 1);
            assert.strictEqual(provider2CallCount, 1);
            const originalSession1Label = viewModel.sessions[0].label;
            // Now resolve only type-2
            await viewModel.resolve('type-2');
            // Should still have both sessions
            assert.strictEqual(viewModel.sessions.length, 2);
            // Provider 1 should not be called again
            assert.strictEqual(provider1CallCount, 1);
            // Provider 2 should be called again
            assert.strictEqual(provider2CallCount, 2);
            // Session 1 should be preserved with original label
            assert.strictEqual(viewModel.sessions.find(s => s.resource.toString() === 'test://session-1')?.label, originalSession1Label);
        });
    });
    test('should accumulate providers when resolve is called with different provider types', async () => {
        return runWithFakedTimers({}, async () => {
            let resolveCount = 0;
            const resolvedProviders = [];
            const provider1 = {
                chatSessionType: 'type-1',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => {
                    resolveCount++;
                    resolvedProviders.push('type-1');
                    return [{
                            resource: URI.parse('test://session-1'),
                            label: 'Session 1',
                            timing: { startTime: Date.now() }
                        }];
                }
            };
            const provider2 = {
                chatSessionType: 'type-2',
                onDidChangeChatSessionItems: Event.None,
                provideChatSessionItems: async () => {
                    resolveCount++;
                    resolvedProviders.push('type-2');
                    return [{
                            resource: URI.parse('test://session-2'),
                            label: 'Session 2',
                            timing: { startTime: Date.now() }
                        }];
                }
            };
            mockChatSessionsService.registerChatSessionItemProvider(provider1);
            mockChatSessionsService.registerChatSessionItemProvider(provider2);
            viewModel = createViewModel();
            // Call resolve with different types rapidly - they should accumulate
            const promise1 = viewModel.resolve('type-1');
            const promise2 = viewModel.resolve(['type-2']);
            await Promise.all([promise1, promise2]);
            // Both providers should be resolved
            assert.strictEqual(viewModel.sessions.length, 2);
        });
    });
});
suite('AgentSessionsViewModel - Helper Functions', () => {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('isLocalAgentSessionItem should identify local sessions', () => {
        const localSession = {
            providerType: localChatSessionType,
            providerLabel: 'Local',
            icon: Codicon.chatSparkle,
            resource: URI.parse('test://local-1'),
            label: 'Local',
            description: 'test',
            timing: { startTime: Date.now() },
            archived: false,
            status: 1 /* ChatSessionStatus.Completed */
        };
        const remoteSession = {
            providerType: 'remote',
            providerLabel: 'Remote',
            icon: Codicon.chatSparkle,
            resource: URI.parse('test://remote-1'),
            label: 'Remote',
            description: 'test',
            timing: { startTime: Date.now() },
            archived: false,
            status: 1 /* ChatSessionStatus.Completed */
        };
        assert.strictEqual(isLocalAgentSessionItem(localSession), true);
        assert.strictEqual(isLocalAgentSessionItem(remoteSession), false);
    });
    test('isAgentSession should identify session view models', () => {
        const session = {
            providerType: 'test',
            providerLabel: 'Local',
            icon: Codicon.chatSparkle,
            resource: URI.parse('test://test-1'),
            label: 'Test',
            description: 'test',
            timing: { startTime: Date.now() },
            archived: false,
            status: 1 /* ChatSessionStatus.Completed */
        };
        // Test with a session object
        assert.strictEqual(isAgentSession(session), true);
        // Test with a sessions container - pass as session to see it returns false
        const sessionOrContainer = session;
        assert.strictEqual(isAgentSession(sessionOrContainer), true);
    });
    test('isAgentSessionsViewModel should identify sessions view models', () => {
        const session = {
            providerType: 'test',
            providerLabel: 'Local',
            icon: Codicon.chatSparkle,
            resource: URI.parse('test://test-1'),
            label: 'Test',
            description: 'test',
            timing: { startTime: Date.now() },
            archived: false,
            status: 1 /* ChatSessionStatus.Completed */
        };
        // Test with actual view model
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const lifecycleService = disposables.add(new TestLifecycleService());
        instantiationService.stub(IChatSessionsService, new MockChatSessionsService());
        instantiationService.stub(ILifecycleService, lifecycleService);
        const actualViewModel = disposables.add(instantiationService.createInstance(AgentSessionsViewModel, { filterMenuId: MenuId.ViewTitle }));
        assert.strictEqual(isAgentSessionsViewModel(actualViewModel), true);
        // Test with session object
        assert.strictEqual(isAgentSessionsViewModel(session), false);
    });
});
suite('AgentSessionsViewFilter', () => {
    const disposables = new DisposableStore();
    let mockChatSessionsService;
    let instantiationService;
    setup(() => {
        mockChatSessionsService = new MockChatSessionsService();
        instantiationService = disposables.add(workbenchInstantiationService(undefined, disposables));
        instantiationService.stub(IChatSessionsService, mockChatSessionsService);
    });
    teardown(() => {
        disposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should filter out sessions from excluded provider', () => {
        const storageService = instantiationService.get(IStorageService);
        const filter = disposables.add(instantiationService.createInstance(AgentSessionsViewFilter, { filterMenuId: MenuId.ViewTitle }));
        const provider1 = {
            chatSessionType: 'type-1',
            onDidChangeChatSessionItems: Event.None,
            provideChatSessionItems: async () => []
        };
        const provider2 = {
            chatSessionType: 'type-2',
            onDidChangeChatSessionItems: Event.None,
            provideChatSessionItems: async () => []
        };
        const session1 = {
            providerType: provider1.chatSessionType,
            providerLabel: 'Provider 1',
            icon: Codicon.chatSparkle,
            resource: URI.parse('test://session-1'),
            label: 'Session 1',
            timing: { startTime: Date.now() },
            archived: false,
            status: 1 /* ChatSessionStatus.Completed */
        };
        const session2 = {
            providerType: provider2.chatSessionType,
            providerLabel: 'Provider 2',
            icon: Codicon.chatSparkle,
            resource: URI.parse('test://session-2'),
            label: 'Session 2',
            timing: { startTime: Date.now() },
            archived: false,
            status: 1 /* ChatSessionStatus.Completed */
        };
        // Initially, no sessions should be filtered
        assert.strictEqual(filter.exclude(session1), false);
        assert.strictEqual(filter.exclude(session2), false);
        // Exclude type-1 by setting it in storage
        const excludes = {
            providers: ['type-1'],
            states: [],
            archived: true
        };
        storageService.store('agentSessions.filterExcludes', JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        // After excluding type-1, session1 should be filtered but not session2
        assert.strictEqual(filter.exclude(session1), true);
        assert.strictEqual(filter.exclude(session2), false);
    });
    test('should filter out archived sessions', () => {
        const storageService = instantiationService.get(IStorageService);
        const filter = disposables.add(instantiationService.createInstance(AgentSessionsViewFilter, { filterMenuId: MenuId.ViewTitle }));
        const provider = {
            chatSessionType: 'test-type',
            onDidChangeChatSessionItems: Event.None,
            provideChatSessionItems: async () => []
        };
        const archivedSession = {
            providerType: provider.chatSessionType,
            providerLabel: 'Test Provider',
            icon: Codicon.chatSparkle,
            resource: URI.parse('test://archived-session'),
            label: 'Archived Session',
            timing: { startTime: Date.now() },
            archived: true,
            status: 1 /* ChatSessionStatus.Completed */
        };
        const activeSession = {
            providerType: provider.chatSessionType,
            providerLabel: 'Test Provider',
            icon: Codicon.chatSparkle,
            resource: URI.parse('test://active-session'),
            label: 'Active Session',
            timing: { startTime: Date.now() },
            archived: false,
            status: 1 /* ChatSessionStatus.Completed */
        };
        // By default, archived sessions should be filtered (archived: true in default excludes)
        assert.strictEqual(filter.exclude(archivedSession), true);
        assert.strictEqual(filter.exclude(activeSession), false);
        // Include archived by setting archived to false in storage
        const excludes = {
            providers: [],
            states: [],
            archived: false
        };
        storageService.store('agentSessions.filterExcludes', JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        // After including archived, both sessions should not be filtered
        assert.strictEqual(filter.exclude(archivedSession), false);
        assert.strictEqual(filter.exclude(activeSession), false);
    });
    test('should filter out sessions with excluded status', () => {
        const storageService = instantiationService.get(IStorageService);
        const filter = disposables.add(instantiationService.createInstance(AgentSessionsViewFilter, { filterMenuId: MenuId.ViewTitle }));
        const provider = {
            chatSessionType: 'test-type',
            onDidChangeChatSessionItems: Event.None,
            provideChatSessionItems: async () => []
        };
        const failedSession = {
            providerType: provider.chatSessionType,
            providerLabel: 'Test Provider',
            icon: Codicon.chatSparkle,
            resource: URI.parse('test://failed-session'),
            label: 'Failed Session',
            timing: { startTime: Date.now() },
            archived: false,
            status: 0 /* ChatSessionStatus.Failed */
        };
        const completedSession = {
            providerType: provider.chatSessionType,
            providerLabel: 'Test Provider',
            icon: Codicon.chatSparkle,
            resource: URI.parse('test://completed-session'),
            label: 'Completed Session',
            timing: { startTime: Date.now() },
            archived: false,
            status: 1 /* ChatSessionStatus.Completed */
        };
        const inProgressSession = {
            providerType: provider.chatSessionType,
            providerLabel: 'Test Provider',
            icon: Codicon.chatSparkle,
            resource: URI.parse('test://inprogress-session'),
            label: 'In Progress Session',
            timing: { startTime: Date.now() },
            archived: false,
            status: 2 /* ChatSessionStatus.InProgress */
        };
        // Initially, no sessions should be filtered by status
        assert.strictEqual(filter.exclude(failedSession), false);
        assert.strictEqual(filter.exclude(completedSession), false);
        assert.strictEqual(filter.exclude(inProgressSession), false);
        // Exclude failed status by setting it in storage
        const excludes = {
            providers: [],
            states: [0 /* ChatSessionStatus.Failed */],
            archived: false
        };
        storageService.store('agentSessions.filterExcludes', JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        // After excluding failed status, only failedSession should be filtered
        assert.strictEqual(filter.exclude(failedSession), true);
        assert.strictEqual(filter.exclude(completedSession), false);
        assert.strictEqual(filter.exclude(inProgressSession), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uVmlld01vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvYnJvd3Nlci9hZ2VudFNlc3Npb25WaWV3TW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQTBCLGNBQWMsRUFBRSx3QkFBd0IsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3pMLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2pHLE9BQU8sRUFBaUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoSyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN4SCxPQUFPLEVBQUUsa0JB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