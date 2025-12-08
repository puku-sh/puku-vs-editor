"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const path_1 = __importDefault(require("path"));
const toolNames_1 = require("../../src/extension/tools/common/toolNames");
const helpers_1 = require("../../src/platform/notebook/common/helpers");
const promptContextModel_1 = require("../../src/platform/test/node/promptContextModel");
const stest_1 = require("../base/stest");
const toolSimTest_1 = require("./toolSimTest");
const tools_stest_1 = require("./tools.stest");
stest_1.ssuite.optional(tools_stest_1.shouldSkipAgentTests, {
    title: 'notebooks', subtitle: 'toolCalling', location: 'panel', configurations: []
}, (inputPath) => {
    const scenarioFolder = inputPath ?? path_1.default.join(__dirname, '..', 'test/scenarios/test-notebook-tools');
    const getState = () => (0, promptContextModel_1.deserializeWorkbenchState)(scenarioFolder, path_1.default.join(scenarioFolder, 'Chipotle1.state.json'));
    (0, stest_1.stest)('Run cell tool', (0, toolSimTest_1.generateToolTestRunner)({
        scenarioFolderPath: scenarioFolder,
        question: 'Run the first code cell.',
        expectedToolCalls: { anyOf: [toolNames_1.ToolName.RunNotebookCell, toolNames_1.ToolName.GetNotebookSummary] },
        getState,
        tools: {
            [toolNames_1.ContributedToolName.GetNotebookSummary]: true,
            [toolNames_1.ContributedToolName.RunNotebookCell]: true
        }
    }, {
        allowParallelToolCalls: true,
        toolCallValidators: {
            [toolNames_1.ToolName.RunNotebookCell]: async (toolCalls) => {
                const state = getState();
                const activeDoc = state.activeTextEditor.document;
                const solutionNotebook = state.notebookDocuments.find(doc => doc.uri.path === activeDoc.uri.path);
                const codeCellIds = solutionNotebook?.getCells().filter(c => c.kind === 2).map(c => (0, helpers_1.getCellId)(c));
                toolCalls.forEach((toolCall) => {
                    const cellId = toolCall.input.cellId;
                    assert_1.default.ok(codeCellIds.includes(cellId), `Cell ${cellId} should be found in the notebook`);
                });
            },
            [toolNames_1.ToolName.GetNotebookSummary]: async () => {
                // Ok to call this
            },
            [toolNames_1.ToolName.EditNotebook]: async () => {
                throw new Error('EditNotebook should not be called');
            }
        }
    }));
    (0, stest_1.stest)('New Notebook Tool with EditFile and EditNotebook', (0, toolSimTest_1.generateToolTestRunner)({
        scenarioFolderPath: scenarioFolder,
        question: `Create a new Jupyter Notebook using ${toolNames_1.ContributedToolName.CreateNewJupyterNotebook} with 1 cell to that adds number 1 and 2.`,
        expectedToolCalls: { anyOf: [toolNames_1.ToolName.CreateNewJupyterNotebook, toolNames_1.ToolName.EditFile, toolNames_1.ToolName.EditNotebook] },
        getState,
        tools: {
            [toolNames_1.ContributedToolName.EditFile]: true,
            [toolNames_1.ContributedToolName.EditNotebook]: true,
            [toolNames_1.ContributedToolName.CreateNewJupyterNotebook]: true
        }
    }, {
        allowParallelToolCalls: true,
        toolCallValidators: {
            [toolNames_1.ToolName.EditNotebook]: async () => {
                //
            },
            [toolNames_1.ToolName.CreateNewJupyterNotebook]: async () => {
                //
            },
            [toolNames_1.ToolName.EditFile]: async () => {
                //
            }
        }
    }));
    (0, stest_1.stest)('New Notebook Tool without EditFile and without EditNotebook', (0, toolSimTest_1.generateToolTestRunner)({
        scenarioFolderPath: scenarioFolder,
        question: `Create a new Jupyter Notebook using ${toolNames_1.ContributedToolName.CreateNewJupyterNotebook} with 1 cell to that adds number 1 and 2.`,
        expectedToolCalls: { anyOf: [toolNames_1.ToolName.CreateNewJupyterNotebook] },
        getState,
        tools: {
            [toolNames_1.ContributedToolName.CreateNewJupyterNotebook]: true
        }
    }, {
        allowParallelToolCalls: true,
        toolCallValidators: {
            [toolNames_1.ToolName.EditNotebook]: async () => {
                throw new Error('EditNotebook should not be called');
            },
            [toolNames_1.ToolName.CreateNewJupyterNotebook]: async () => {
                //
            },
            [toolNames_1.ToolName.EditFile]: async () => {
                throw new Error('EditFile should not be called');
            }
        }
    }));
    (0, stest_1.stest)('New Notebook Tool without EditFile and with EditNotebook', (0, toolSimTest_1.generateToolTestRunner)({
        scenarioFolderPath: scenarioFolder,
        question: `Create a new Jupyter Notebook using ${toolNames_1.ContributedToolName.CreateNewJupyterNotebook} with 1 cell to that adds number 1 and 2.`,
        expectedToolCalls: { anyOf: [toolNames_1.ToolName.CreateNewJupyterNotebook] },
        getState,
        tools: {
            [toolNames_1.ContributedToolName.EditNotebook]: true,
            [toolNames_1.ContributedToolName.CreateNewJupyterNotebook]: true
        }
    }, {
        allowParallelToolCalls: true,
        toolCallValidators: {
            [toolNames_1.ToolName.EditNotebook]: async () => {
                throw new Error('EditNotebook should not be called');
            },
            [toolNames_1.ToolName.CreateNewJupyterNotebook]: async () => {
                //
            },
            [toolNames_1.ToolName.EditFile]: async () => {
                throw new Error('EditFile should not be called');
            }
        }
    }));
    (0, stest_1.stest)('Run cell tool should avoid running markdown cells', (0, toolSimTest_1.generateToolTestRunner)({
        scenarioFolderPath: scenarioFolder,
        question: 'Run the first three cells.',
        expectedToolCalls: { anyOf: [toolNames_1.ToolName.RunNotebookCell, toolNames_1.ToolName.GetNotebookSummary] },
        getState,
        tools: {
            [toolNames_1.ContributedToolName.GetNotebookSummary]: true,
            [toolNames_1.ContributedToolName.RunNotebookCell]: true
        }
    }, {
        allowParallelToolCalls: true,
        toolCallValidators: {
            [toolNames_1.ToolName.RunNotebookCell]: async (toolCalls) => {
                const state = getState();
                const activeDoc = state.activeTextEditor.document;
                const solutionNotebook = state.notebookDocuments.find(doc => doc.uri.path === activeDoc.uri.path);
                const first3CodeCells = solutionNotebook?.getCells().filter(c => c.kind === 2).map(c => (0, helpers_1.getCellId)(c)).slice(0, 3);
                toolCalls.forEach((toolCall) => {
                    const cellId = toolCall.input.cellId;
                    assert_1.default.ok(first3CodeCells.includes(cellId), `Cell ${cellId} was not one of the first three code cells`);
                });
            },
            [toolNames_1.ToolName.GetNotebookSummary]: async () => {
                // Ok to call this
            },
            [toolNames_1.ToolName.EditNotebook]: async () => {
                throw new Error('EditNotebook should not be called');
            }
        }
    }));
    (0, stest_1.stest)('Run cell at a specific index', (0, toolSimTest_1.generateToolTestRunner)({
        scenarioFolderPath: scenarioFolder,
        question: 'Run the third cell.',
        expectedToolCalls: { anyOf: [toolNames_1.ToolName.RunNotebookCell, toolNames_1.ToolName.GetNotebookSummary] },
        getState,
        tools: {
            [toolNames_1.ContributedToolName.GetNotebookSummary]: true,
            [toolNames_1.ContributedToolName.RunNotebookCell]: true
        }
    }, {
        allowParallelToolCalls: true,
        toolCallValidators: {
            [toolNames_1.ToolName.RunNotebookCell]: async (toolCalls) => {
                const state = getState();
                const activeDoc = state.activeTextEditor.document;
                const solutionNotebook = state.notebookDocuments.find(doc => doc.uri.path === activeDoc.uri.path);
                const thirdCell = solutionNotebook?.getCells()[2];
                assert_1.default.equal(thirdCell?.kind, 2, 'Invalid test: The third cell should be a code cell');
                toolCalls.forEach((toolCall) => {
                    const cellId = toolCall.input.cellId;
                    assert_1.default.ok(thirdCell && (0, helpers_1.getCellId)(thirdCell) === cellId, `Cell ${cellId} should be the third code cell`);
                });
            },
            [toolNames_1.ToolName.GetNotebookSummary]: async () => {
                // Ok to call this
            },
            [toolNames_1.ToolName.EditNotebook]: async () => {
                throw new Error('EditNotebook should not be called');
            }
        }
    }));
    (0, stest_1.stest)('Edit cell tool', (0, toolSimTest_1.generateToolTestRunner)({
        scenarioFolderPath: scenarioFolder,
        question: 'Change the header in the first markdown cell to "Hello Chipotle"',
        expectedToolCalls: toolNames_1.ToolName.EditNotebook,
        getState,
        tools: {
            [toolNames_1.ContributedToolName.GetNotebookSummary]: true, // Include this tool and verify that this isn't invoked (in the past this used to get invoked as part of editing).
        }
    }, {
        allowParallelToolCalls: true,
        toolCallValidators: {
            [toolNames_1.ToolName.RunNotebookCell]: async (toolCalls) => {
                const state = getState();
                const activeDoc = state.activeTextEditor.document;
                const solutionNotebook = state.notebookDocuments.find(doc => doc.uri.path === activeDoc.uri.path);
                toolCalls.forEach((toolCall) => {
                    const cellId = toolCall.input.cellId;
                    const firstMarkdownCell = solutionNotebook?.getCells().find(c => c.kind === 1);
                    assert_1.default.equal((0, helpers_1.getCellId)(firstMarkdownCell), cellId);
                    const newCode = toolCall.input.newCode;
                    assert_1.default.notDeepEqual(newCode.indexOf('# Hello Chipotle'), -1, 'The first markdown cell should be changed to "Hello Chipotle"');
                });
            },
            [toolNames_1.ToolName.GetNotebookSummary]: async () => {
                // Ok to call this
            },
        },
    }));
});
//# sourceMappingURL=notebookTools.stest.js.map