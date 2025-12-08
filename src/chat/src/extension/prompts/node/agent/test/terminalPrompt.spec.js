"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const terminalState_1 = require("../../base/terminalState");
(0, vitest_1.suite)('TerminalStatePromptElement', () => {
    const tasksService = {};
    tasksService.getTerminalForTask = (task) => {
        if (task.command === 'build') {
            return { name: 'Terminal 3', processId: 3434, id: '3' };
        }
        else if (task.command === 'watch') {
            return { name: 'Terminal 4', processId: 5545, id: '4' };
        }
        return undefined;
    };
    (0, vitest_1.test)('Terminals', async () => {
        const terminalService = {};
        tasksService.getTasks = () => [[null, []]];
        terminalService.terminals = [
            { name: 'Terminal 1', id: '1', processId: 1234 },
            { name: 'Terminal 2', id: '2', processId: 5678 },
            { name: 'Terminal 3', id: '3', processId: 3434 },
            { name: 'Terminal 4', id: '4', processId: 5545 },
        ];
        terminalService.getLastCommandForTerminal = (term) => {
            if (term.id === '1') {
                return { commandLine: 'npm run build', cwd: '/workspace', exitCode: 0 };
            }
            else if (term.id === '2') {
                return { commandLine: 'npm test', cwd: '/workspace', exitCode: 1 };
            }
            return undefined;
        };
        const prompt = new terminalState_1.TerminalStatePromptElement({}, tasksService, terminalService);
        const rendered = await prompt.render();
        const output = typeof rendered === 'string' ? rendered : JSON.stringify(rendered) ?? '';
        (0, vitest_1.assert)(output.includes('Terminal 1'));
        (0, vitest_1.assert)(output.includes('Terminal 2'));
    });
});
//# sourceMappingURL=terminalPrompt.spec.js.map