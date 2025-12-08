"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const services_1 = require("../../../test/node/services");
const promptVariablesService_1 = require("../promptVariablesService");
(0, vitest_1.describe)('PromptVariablesServiceImpl', () => {
    let accessor;
    let service;
    (0, vitest_1.beforeEach)(() => {
        const testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)();
        accessor = testingServiceCollection.createTestingAccessor();
        // Create the service via DI so its dependencies (fs + workspace) come from the test container
        service = accessor.get(instantiation_1.IInstantiationService).createInstance(promptVariablesService_1.PromptVariablesServiceImpl);
    });
    (0, vitest_1.test)('replaces variable ranges with link markdown', async () => {
        const original = 'Start #VARIABLE1 #VARIABLE2 End #VARIABLE3';
        const variables = [];
        ['#VARIABLE1', '#VARIABLE2', '#VARIABLE3'].forEach((varName, index) => {
            const start = original.indexOf(varName);
            const end = start + varName.length;
            variables.push({
                id: 'file' + index,
                name: 'file' + index,
                value: vscodeTypes_1.Uri.file(`/virtual/workspace/sample${index}.txt`),
                range: [start, end]
            });
        });
        const { message } = await service.resolveVariablesInPrompt(original, variables);
        (0, vitest_1.expect)(message).toBe('Start [#file0](#file0-context) [#file1](#file1-context) End [#file2](#file2-context)');
    });
    (0, vitest_1.test)('replaces multiple tool references (deduplicating identical ranges) in reverse-sorted order', async () => {
        // message with two target substrings we will replace: TOOLX and TOOLY
        const message = 'Call #TOOLX then maybe #TOOLY finally done';
        const toolRefs = [];
        ['#TOOLX', '#TOOLY'].forEach((toolRef, index) => {
            const start = message.indexOf(toolRef);
            const end = start + toolRef.length;
            toolRefs.push({
                name: 'tool' + index,
                range: [start, end]
            });
            toolRefs.push({
                name: 'tool' + index + 'Duplicate',
                range: [start, end]
            });
        });
        const rewritten = await service.resolveToolReferencesInPrompt(message, toolRefs);
        // Expect TOOLY replaced, then TOOLX replaced; duplicates ignored
        (0, vitest_1.expect)(rewritten).toBe('Call #tool0 then maybe #tool1 finally done');
    });
    (0, vitest_1.test)('handles no-op when no variables or tool references', async () => {
        const msg = 'Nothing to change';
        const { message: out } = await service.resolveVariablesInPrompt(msg, []);
        const rewritten = await service.resolveToolReferencesInPrompt(out, []);
        (0, vitest_1.expect)(rewritten).toBe(msg);
    });
});
//# sourceMappingURL=promptVariablesService.spec.js.map