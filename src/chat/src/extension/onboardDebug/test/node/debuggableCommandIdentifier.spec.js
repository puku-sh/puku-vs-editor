"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const sinon_1 = require("sinon");
const vitest_1 = require("vitest");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const path_1 = require("../../../../util/vs/base/common/path");
const uri_1 = require("../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const services_1 = require("../../../test/node/services");
const debuggableCommandIdentifier_1 = require("../../node/debuggableCommandIdentifier");
const languageToolsProvider_1 = require("../../node/languageToolsProvider");
(0, vitest_1.describe)('DebuggableCommandIdentifier', () => {
    let accessor;
    let debuggableCommandIdentifier;
    let getToolsForLanguages;
    const setConfigEnabled = (enabled) => accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.TerminalToDebuggerEnabled, enabled);
    (0, vitest_1.beforeEach)(() => {
        getToolsForLanguages = (0, sinon_1.stub)().resolves({ ok: true, commands: ['mytool'] });
        const testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)();
        testingServiceCollection.define(languageToolsProvider_1.ILanguageToolsProvider, {
            _serviceBrand: undefined,
            getToolsForLanguages
        });
        accessor = testingServiceCollection.createTestingAccessor();
        setConfigEnabled(true);
        debuggableCommandIdentifier = accessor
            .get(instantiation_1.IInstantiationService)
            .createInstance(debuggableCommandIdentifier_1.DebuggableCommandIdentifier);
    });
    (0, vitest_1.afterEach)(() => {
        debuggableCommandIdentifier.dispose();
    });
    (0, vitest_1.it)('should return false if globally disabled', async () => {
        setConfigEnabled(false);
        const result = await debuggableCommandIdentifier.isDebuggable(undefined, 'node index.js', cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(result).to.be.false;
    });
    (0, vitest_1.it)('should return true for well-known commands', async () => {
        const result = await debuggableCommandIdentifier.isDebuggable(undefined, 'node index.js', cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(result).to.be.true;
    });
    (0, vitest_1.it)('should return false for unknown commands', async () => {
        const result = await debuggableCommandIdentifier.isDebuggable(undefined, 'mytool', cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(result).to.be.false;
        (0, vitest_1.expect)(getToolsForLanguages.called).to.be.false;
    });
    (0, vitest_1.it)('should return true for locals', async () => {
        const result = await debuggableCommandIdentifier.isDebuggable(undefined, 'mytool', cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(result).to.be.false;
        (0, vitest_1.expect)(getToolsForLanguages.called).to.be.false;
    });
    // todo@connor4312: these work on macos locally but fail in CI, look into it
    vitest_1.it.skip('should return true if referencing an absolute path', async () => {
        const result = await debuggableCommandIdentifier.isDebuggable(undefined, __filename, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(result).to.be.true;
    });
    // todo@connor4312: these work on macos locally but fail in CI, look into it
    vitest_1.it.skip('should return true if referencing a relative path in a cwd', async () => {
        const result = await debuggableCommandIdentifier.isDebuggable(uri_1.URI.file(__dirname), (0, path_1.basename)(__filename), cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(result).to.be.true;
    });
    (0, vitest_1.it)('should not call the model tools for known languages', async () => {
        accessor.get(workspaceService_1.IWorkspaceService)
            .didOpenTextDocumentEmitter.fire({ languageId: 'javascript' });
        const result = await debuggableCommandIdentifier.isDebuggable(undefined, 'othertool hello', cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(result).to.be.false;
        (0, vitest_1.expect)(getToolsForLanguages.callCount).to.equal(0);
    });
    (0, vitest_1.it)('should return true for model provided commands', async () => {
        accessor.get(workspaceService_1.IWorkspaceService)
            .didOpenTextDocumentEmitter.fire({ languageId: 'mylang' });
        const result = await debuggableCommandIdentifier.isDebuggable(undefined, 'mytool hello', cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(result).to.be.true;
        (0, vitest_1.expect)(getToolsForLanguages.calledWith(['mylang'])).to.be.true;
        // should not call again because no new langauge was seen:
        const result2 = await debuggableCommandIdentifier.isDebuggable(undefined, 'othertool hello', cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(result2).to.be.false;
        (0, vitest_1.expect)(getToolsForLanguages.callCount).to.equal(1);
    });
    (0, vitest_1.it)('returns treatment value 1', async () => {
        accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.AdvancedExperimental.TerminalToDebuggerPatterns, ['othert']);
        const result = await debuggableCommandIdentifier.isDebuggable(undefined, 'othert hello', cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(result).to.be.true;
    });
    (0, vitest_1.it)('return treatment value 2', async () => {
        accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.AdvancedExperimental.TerminalToDebuggerPatterns, ['!mytool']);
        const result = await debuggableCommandIdentifier.isDebuggable(undefined, 'mytool hello', cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(result).to.be.false;
    });
    // it('should return true for commands matching specific treatment', async () => {
    // 	(configurationService.getConfig as sinon.SinonStub).returns(['node']);
    // 	const result = await debuggableCommandIdentifier.isDebuggable(undefined, 'node index.js', CancellationToken.None);
    // 	expect(result).to.be.true;
    // });
    // it('should return false for commands matching specific exclusion', async () => {
    // 	(configurationService.getConfig as sinon.SinonStub).returns(['!node']);
    // 	const result = await debuggableCommandIdentifier.isDebuggable(undefined, 'node index.js', CancellationToken.None);
    // 	expect(result).to.be.false;
    // });
    // it('should query language model for unknown commands', async () => {
    // 	(context.globalState.get as sinon.SinonStub).returns({ languages: ['unknown'], commands: [] });
    // 	(instantiationService.createInstance().getToolsForLanguages as sinon.SinonStub).resolves({ commands: ['unknowncommand'], ok: true });
    // 	const result = await debuggableCommandIdentifier.isDebuggable(undefined, 'unknowncommand', CancellationToken.None);
    // 	expect(result).to.be.true;
    // });
});
//# sourceMappingURL=debuggableCommandIdentifier.spec.js.map