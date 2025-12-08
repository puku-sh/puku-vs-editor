"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const gitExtensionService_1 = require("../../../../platform/git/common/gitExtensionService");
const tabsAndEditorsService_1 = require("../../../../platform/tabs/common/tabsAndEditorsService");
const simulationWorkspaceServices_1 = require("../../../../platform/test/node/simulationWorkspaceServices");
const testWorkspaceService_1 = require("../../../../platform/test/node/testWorkspaceService");
const testProvider_1 = require("../../../../platform/testing/common/testProvider");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const event_1 = require("../../../../util/vs/base/common/event");
const uri_1 = require("../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const position_1 = require("../../../../util/vs/workbench/api/common/extHostTypes/position");
const range_1 = require("../../../../util/vs/workbench/api/common/extHostTypes/range");
const services_1 = require("../../../test/node/services");
const testFailureTool_1 = require("../testFailureTool");
const toolTestUtils_1 = require("./toolTestUtils");
const upcastPartial = (value) => value;
(0, vitest_1.suite)('TestFailureTool', () => {
    let accessor;
    let instantiationService;
    let resolver;
    let failures;
    let activeTextEditor;
    let visibleTextEditors;
    let workingChanges;
    const mockTestFailure = {
        snapshot: upcastPartial({
            uri: uri_1.URI.file('/test/file.test.ts'),
            label: 'Test Suite',
        }),
        task: upcastPartial({
            messages: [{
                    message: 'Expected true to be false',
                    location: { uri: uri_1.URI.file('/test/file.test.ts'), range: new range_1.Range(1, 1, 1, 1) }
                }]
        })
    };
    const noopGitService = {
        _serviceBrand: undefined,
        onDidChange: event_1.Event.None,
        extensionAvailable: false,
        getExtensionApi: () => upcastPartial({
            getRepository: () => upcastPartial({
                state: upcastPartial({
                    indexChanges: [],
                    workingTreeChanges: workingChanges,
                    mergeChanges: [],
                    untrackedChanges: [],
                }),
            })
        })
    };
    (0, vitest_1.beforeEach)(async () => {
        failures = [mockTestFailure];
        activeTextEditor = undefined;
        visibleTextEditors = [];
        workingChanges = [];
        const testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)();
        const mockTestProvider = {
            getAllFailures: () => failures,
        };
        testingServiceCollection.define(testProvider_1.ITestProvider, mockTestProvider);
        testingServiceCollection.define(workspaceService_1.IWorkspaceService, new testWorkspaceService_1.TestWorkspaceService([uri_1.URI.file('/workspace')]));
        testingServiceCollection.define(tabsAndEditorsService_1.ITabsAndEditorsService, new simulationWorkspaceServices_1.TestingTabsAndEditorsService({
            getActiveTextEditor: () => activeTextEditor,
            getVisibleTextEditors: () => visibleTextEditors,
            getActiveNotebookEditor: () => undefined,
        }));
        testingServiceCollection.define(gitExtensionService_1.IGitExtensionService, noopGitService);
        accessor = testingServiceCollection.createTestingAccessor();
        instantiationService = accessor.get(instantiation_1.IInstantiationService);
        resolver = instantiationService.createInstance(testFailureTool_1.TestFailureTool);
    });
    (0, vitest_1.test)('returns a message when no failures exist', async () => {
        failures = [];
        const result = await resolver.invoke({ input: {}, toolInvocationToken: '' });
        (0, vitest_1.expect)(await (0, toolTestUtils_1.toolResultToString)(accessor, result)).toMatchInlineSnapshot(`"No test failures were found yet, call the tool run_tests to run tests and find failures."`);
    });
    (0, vitest_1.test)('formats stack frames', async () => {
        failures = [
            {
                snapshot: upcastPartial({ uri: uri_1.URI.file('/test/notOpen.ts'), label: 'Is an active editor in stack', parent: undefined }),
                task: upcastPartial({
                    messages: [{
                            message: upcastPartial({
                                value: 'G',
                            }),
                            stackTrace: [
                                { label: 'file1 no contents' },
                                { label: 'just uri', uri: uri_1.URI.file('/test/coolFile.ts') },
                                { label: 'with position', uri: uri_1.URI.file('/test/coolFile.ts'), position: new position_1.Position(5, 10) },
                            ]
                        }]
                }),
            }
        ];
        const result = await resolver.invoke({ input: {}, toolInvocationToken: '' });
        (0, vitest_1.expect)(await (0, toolTestUtils_1.toolResultToString)(accessor, result)).toMatchInlineSnapshot(`
			"<testFailure testCase="Is an active editor in stack" path="/test/notOpen.ts">
			<message>
			G
			</message>
			<stackFrame>
			file1 no contents
			</stackFrame>
			<stackFrame path="/test/coolFile.ts">
			just uri
			</stackFrame>
			<stackFrame path="/test/coolFile.ts" line=5 col=10 />
			</testFailure>
			## Rules:
			- Always try to find an error in the implementation code first. Don't suggest any changes in my test cases unless I tell you to.
			- If you need more information about anything in the codebase, use a tool like read_file, list_dir, or file_search to find and read it. Never ask the user to provide it themselves.
			- If you make changes to fix the test, call run_tests to run the tests and verify the fix.
			- Don't try to make the same changes you made before to fix the test. If you're stuck, ask the user for pointers.
			"
		`);
    });
    (0, vitest_1.test)('includes expected and actual output when available', async () => {
        failures = [{
                snapshot: upcastPartial({
                    uri: uri_1.URI.file('/test/file.test.ts'),
                    label: 'Test Suite',
                    parent: undefined
                }),
                task: upcastPartial({
                    messages: [{
                            message: 'Values do not match',
                            expectedOutput: 'true',
                            actualOutput: 'false'
                        }]
                })
            }];
        const result = await resolver.invoke({ input: {}, toolInvocationToken: '' });
        (0, vitest_1.expect)(await (0, toolTestUtils_1.toolResultToString)(accessor, result)).toMatchInlineSnapshot(`
			"<testFailure testCase="Test Suite" path="/test/file.test.ts">
			<expectedOutput>
			true
			</expectedOutput>
			<actualOutput>
			false
			</actualOutput>

			</testFailure>
			## Rules:
			- Always try to find an error in the implementation code first. Don't suggest any changes in my test cases unless I tell you to.
			- If you need more information about anything in the codebase, use a tool like read_file, list_dir, or file_search to find and read it. Never ask the user to provide it themselves.
			- If you make changes to fix the test, call run_tests to run the tests and verify the fix.
			- Don't try to make the same changes you made before to fix the test. If you're stuck, ask the user for pointers.
			"
		`);
    });
    (0, vitest_1.test)('ranks correctly', async () => {
        activeTextEditor = upcastPartial({ document: upcastPartial({ uri: uri_1.URI.file('/test/isActive.ts') }) });
        visibleTextEditors = [upcastPartial({ document: upcastPartial({ uri: uri_1.URI.file('/test/isVisible.ts') }) })];
        workingChanges = [{ originalUri: uri_1.URI.file('/test/workingChange.ts'), uri: uri_1.URI.file('/test/workingChange.ts'), status: 0, renameUri: undefined, }];
        failures = [
            {
                snapshot: upcastPartial({ uri: uri_1.URI.file('/test/notOpen.ts'), label: 'Not open file, no stack', parent: undefined }),
                task: upcastPartial({ messages: [{ message: 'A', }] })
            },
            {
                snapshot: upcastPartial({ uri: uri_1.URI.file('/test/workingChange.ts'), label: 'Has git working change', parent: undefined }),
                task: upcastPartial({ messages: [{ message: 'B', }] })
            },
            {
                snapshot: upcastPartial({ uri: uri_1.URI.file('/test/isVisible.ts'), label: 'Is a visible editor', parent: undefined }),
                task: upcastPartial({ messages: [{ message: 'C', }] })
            },
            {
                snapshot: upcastPartial({ uri: uri_1.URI.file('/test/isActive.ts'), label: 'Is an active editor', parent: undefined }),
                task: upcastPartial({ messages: [{ message: 'D', }] })
            },
            {
                snapshot: upcastPartial({ uri: uri_1.URI.file('/test/notOpen.ts'), label: 'Has git working change in stack', parent: undefined }),
                task: upcastPartial({ messages: [{ message: 'E', stackTrace: [{ label: 'workingChange.ts', uri: uri_1.URI.file('/test/workingChange.ts') }] }] })
            },
            {
                snapshot: upcastPartial({ uri: uri_1.URI.file('/test/notOpen.ts'), label: 'Is a visible editor in stack', parent: undefined }),
                task: upcastPartial({ messages: [{ message: 'F', stackTrace: [{ label: 'isVisible.ts', uri: uri_1.URI.file('/test/isVisible.ts') }] }] })
            },
            {
                snapshot: upcastPartial({ uri: uri_1.URI.file('/test/notOpen.ts'), label: 'Is an active editor in stack', parent: undefined }),
                task: upcastPartial({ messages: [{ message: 'G', stackTrace: [{ label: 'isActive.ts', uri: uri_1.URI.file('/test/isActive.ts') }] }] }),
            },
        ];
        const result = await resolver.invoke({ input: {}, toolInvocationToken: '' });
        (0, vitest_1.expect)(await (0, toolTestUtils_1.toolResultToString)(accessor, result)).toMatchInlineSnapshot(`
			"<testFailure testCase="Is an active editor" path="/test/isActive.ts">
			<message>
			D
			</message>

			</testFailure>
			<testFailure testCase="Is a visible editor" path="/test/isVisible.ts">
			<message>
			C
			</message>

			</testFailure>
			<testFailure testCase="Has git working change" path="/test/workingChange.ts">
			<message>
			B
			</message>

			</testFailure>
			<testFailure testCase="Is an active editor in stack" path="/test/notOpen.ts">
			<message>
			G
			</message>
			<stackFrame path="/test/isActive.ts">
			isActive.ts
			</stackFrame>

			</testFailure>
			<testFailure testCase="Is a visible editor in stack" path="/test/notOpen.ts">
			<message>
			F
			</message>
			<stackFrame path="/test/isVisible.ts">
			isVisible.ts
			</stackFrame>

			</testFailure>
			<testFailure testCase="Has git working change in stack" path="/test/notOpen.ts">
			<message>
			E
			</message>
			<stackFrame path="/test/workingChange.ts">
			workingChange.ts
			</stackFrame>

			</testFailure>
			<testFailure testCase="Not open file, no stack" path="/test/notOpen.ts">
			<message>
			A
			</message>

			</testFailure>
			## Rules:
			- Always try to find an error in the implementation code first. Don't suggest any changes in my test cases unless I tell you to.
			- If you need more information about anything in the codebase, use a tool like read_file, list_dir, or file_search to find and read it. Never ask the user to provide it themselves.
			- If you make changes to fix the test, call run_tests to run the tests and verify the fix.
			- Don't try to make the same changes you made before to fix the test. If you're stuck, ask the user for pointers.
			"
		`);
    });
});
//# sourceMappingURL=testFailure.spec.js.map