"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const runCommandExecutionService_1 = require("../../../commands/common/runCommandExecutionService");
const extensionsService_1 = require("../../../extensions/common/extensionsService");
const services_1 = require("../../../test/node/services");
const nullTestProvider_1 = require("../../common/nullTestProvider");
const testProvider_1 = require("../../common/testProvider");
const setupTestDetector_1 = require("../../node/setupTestDetector");
const testDepsResolver_1 = require("../../node/testDepsResolver");
(0, vitest_1.suite)('SetupTestsDetector', () => {
    let setupTestsDetector;
    let testDepsResolver;
    let extensionService;
    let commandService;
    let testProvider;
    class TestTestDepsResolver {
        constructor() {
            this.deps = [];
        }
        getTestDeps(languageId) {
            return Promise.resolve(this.deps);
        }
    }
    (0, vitest_1.beforeEach)(() => {
        const services = (0, services_1.createPlatformServices)();
        testDepsResolver = new TestTestDepsResolver();
        services.define(testDepsResolver_1.ITestDepsResolver, testDepsResolver);
        services.define(testProvider_1.ITestProvider, new nullTestProvider_1.NullTestProvider());
        const accessor = services.createTestingAccessor();
        commandService = accessor.get(runCommandExecutionService_1.IRunCommandExecutionService);
        testProvider = accessor.get(testProvider_1.ITestProvider);
        extensionService = accessor.get(extensionsService_1.IExtensionsService);
        setupTestsDetector = accessor.get(instantiation_1.IInstantiationService).createInstance(setupTestDetector_1.SetupTestsDetector);
    });
    (0, vitest_1.suite)('shouldSuggestSetup', () => {
        (0, vitest_1.test)('suggests generic search when ambiguous', async () => {
            const document = { languageId: 'javascript' };
            const request = {};
            const output = {};
            const action = await setupTestsDetector.shouldSuggestSetup({ document }, request, output);
            (0, vitest_1.expect)(action).to.deep.equal({
                type: 3 /* SetupTestActionType.SearchGeneric */,
                context: document,
            });
        });
        (0, vitest_1.test)('suggests extension install for a framework', async () => {
            const document = { languageId: 'javascript' };
            const request = {};
            const output = {};
            testDepsResolver.deps = ['mocha'];
            const action = await setupTestsDetector.shouldSuggestSetup({ document }, request, output);
            (0, vitest_1.expect)(action).to.deep.equal({
                type: 1 /* SetupTestActionType.InstallExtensionForFramework */,
                extension: {
                    id: 'hbenl.vscode-mocha-test-adapter',
                    name: 'Mocha Test Explorer',
                },
                framework: 'mocha',
            });
        });
        (0, vitest_1.test)('does not suggest install when tests are in workspace', async () => {
            const document = { languageId: 'javascript' };
            const request = {};
            const output = {};
            vitest_1.vi.spyOn(testProvider, 'hasAnyTests').mockReturnValue(Promise.resolve(true));
            testDepsResolver.deps = ['mocha'];
            const action = await setupTestsDetector.shouldSuggestSetup({ document }, request, output);
            (0, vitest_1.expect)(action).to.be.undefined;
        });
        (0, vitest_1.test)('does not suggest extension install for a framework already installed', async () => {
            const document = { languageId: 'javascript' };
            const request = {};
            const output = {};
            testDepsResolver.deps = ['mocha'];
            extensionService.addExtension({ id: 'hbenl.vscode-mocha-test-adapter' });
            const action = await setupTestsDetector.shouldSuggestSetup({ document }, request, output);
            (0, vitest_1.expect)(action).to.be.undefined;
        });
        (0, vitest_1.test)('suggests extension search for a known framework', async () => {
            const document = { languageId: 'javascript' };
            const request = {};
            const output = {};
            testDepsResolver.deps = ['cypress'];
            const action = await setupTestsDetector.shouldSuggestSetup({ document }, request, output);
            (0, vitest_1.expect)(action).to.deep.equal({
                type: 2 /* SetupTestActionType.SearchForFramework */,
                framework: 'cypress',
            });
        });
        (0, vitest_1.test)('suggests extension install for a language', async () => {
            const document = { languageId: 'python' };
            const request = {};
            const output = {};
            const action = await setupTestsDetector.shouldSuggestSetup({ document }, request, output);
            (0, vitest_1.expect)(action).to.deep.equal({
                type: 0 /* SetupTestActionType.InstallExtensionForLanguage */,
                extension: {
                    id: 'ms-python.python',
                    name: 'Python',
                },
                language: 'python',
            });
        });
        (0, vitest_1.test)('reminds if the user already prompted', async () => {
            const document = { languageId: 'python' };
            const request = {};
            const output = {};
            const action = await setupTestsDetector.shouldSuggestSetup({ document }, request, output);
            (0, vitest_1.expect)(action).to.deep.equal({
                type: 0 /* SetupTestActionType.InstallExtensionForLanguage */,
                extension: {
                    id: 'ms-python.python',
                    name: 'Python',
                },
                language: 'python',
            });
            setupTestsDetector.showSuggestion(action);
            (0, vitest_1.expect)(await setupTestsDetector.shouldSuggestSetup({ document }, request, output)).to.deep.equal({
                type: 4 /* SetupTestActionType.Remind */,
                action: {
                    type: 0 /* SetupTestActionType.InstallExtensionForLanguage */,
                    extension: {
                        id: 'ms-python.python',
                        name: 'Python',
                    },
                    language: 'python',
                },
            });
        });
        (0, vitest_1.test)('does not suggest language extension install when already installed', async () => {
            const document = { languageId: 'python' };
            const request = {};
            const output = {};
            extensionService.addExtension({ id: 'ms-python.python' });
            const action = await setupTestsDetector.shouldSuggestSetup({ document }, request, output);
            (0, vitest_1.expect)(action).to.be.undefined;
        });
        (0, vitest_1.test)('delegates to language extension setup', async () => {
            const document = { languageId: 'python' };
            const request = {};
            const output = {};
            vitest_1.vi.spyOn(commandService, 'executeCommand').mockReturnValue(Promise.resolve({ message: 'msg', command: { command: 'followup', title: 'Follow Up' } }));
            extensionService.addExtension({ id: 'ms-python.python', packageJSON: { copilot: { tests: { getSetupConfirmation: 'my-command' } } } });
            const action = await setupTestsDetector.shouldSuggestSetup({ document }, request, output);
            (0, vitest_1.expect)(action).toMatchInlineSnapshot(`
			{
			  "command": {
			    "command": "followup",
			    "title": "Follow Up",
			  },
			  "message": "msg",
			  "type": 6,
			}
		`);
        });
        (0, vitest_1.test)('delegates to language extension setup no-op', async () => {
            const document = { languageId: 'python' };
            const request = {};
            const output = {};
            vitest_1.vi.spyOn(commandService, 'executeCommand').mockReturnValue(Promise.resolve());
            extensionService.addExtension({ id: 'ms-python.python', packageJSON: { copilot: { tests: { getSetupConfirmation: 'my-command' } } } });
            const action = await setupTestsDetector.shouldSuggestSetup({ document }, request, output);
            (0, vitest_1.expect)(action).be.undefined;
        });
    });
});
//# sourceMappingURL=setupTestDetector.spec.js.map