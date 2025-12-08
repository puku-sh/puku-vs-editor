"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notebookCellToCellData = notebookCellToCellData;
const assert_1 = __importDefault(require("assert"));
const alternativeContent_1 = require("../../src/platform/notebook/common/alternativeContent");
const vscodeTypes_1 = require("../../src/vscodeTypes");
const stest_1 = require("../base/stest");
const panelCodeMapperSimulator_1 = require("./panelCodeMapperSimulator");
const stestUtil_1 = require("./stestUtil");
function notebookCellToCellData(cell) {
    const cellData = new vscodeTypes_1.NotebookCellData(cell.kind, cell.document.getText(), cell.document.languageId);
    cellData.metadata = cell.metadata;
    cellData.executionSummary = cell.executionSummary;
    if (cell.outputs.length) {
        cellData.outputs = [...cell.outputs];
    }
    return cellData;
}
['xml', 'json', 'text'].forEach(format => {
    function onBeforeStart(accessor) {
        const altContentService = accessor.get(alternativeContent_1.IAlternativeNotebookContentService);
        altContentService.format = format;
    }
    function simulatePanelCodeMapperEx(testingServiceCollection, scenario) {
        scenario.onBeforeStart = onBeforeStart;
        return (0, panelCodeMapperSimulator_1.simulatePanelCodeMapper)(testingServiceCollection, scenario, 0 /* EditTestStrategy.Edits */);
    }
    (0, stest_1.ssuite)({ title: `notebookEdits`, subtitle: `modification - ${format}`, location: 'panel' }, () => {
        (0, stest_1.stest)({ description: 'code cell modification', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/single.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'single.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Please add a docstring to the circle_area function describing its purpose and what it returns.',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert_1.default.equal(notebookDocument.cellCount, 1);
                            const cell = notebookDocument.cellAt(0);
                            assert_1.default.ok(cell.document.getText().toLowerCase().indexOf('"""') > 0, `docstring not found in ${cell.document.getText()}`);
                        }
                    },
                ]
            });
        });
        (0, stest_1.stest)({ description: 'code cell insertion', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/single.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'single.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Please add a new cell to test the function.',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert_1.default.equal(notebookDocument.cellCount, 2);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'code cell modification, plotting', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/plot.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'plot.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Please update the code to also include a scatter plot of the same data on the same figure, using red markers',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert_1.default.equal(notebookDocument.cellCount, 1);
                            assert_1.default.ok(notebookDocument.cellAt(0).document.getText().includes('plt.scatter'), 'scatter plot added');
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'code cell modification, convert Point2D code to Point3D', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/point.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'point.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Convert the code in Point2D to a Point3D class',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert_1.default.equal(notebookDocument.cellCount, 2);
                            assert_1.default.ok(notebookDocument.cellAt(0).document.getText().includes('class Point3D'), 'Point3D class not found');
                            assert_1.default.ok(notebookDocument.cellAt(1).document.getText().includes('distance_from_origin(point: Point3D)') || notebookDocument.cellAt(1).document.getText().includes("distance_from_origin(point: 'Point3D')"), 'distance_from_origin not updated');
                        }
                    }
                ]
            });
        });
        // stest({ description: 'code cell refactoring, plotly code -> matplotlib', language: 'python' }, async (testingServiceCollection) => {
        // 	const file = fromFixture('notebook/edits/plotly_to_matplotlib.ipynb');
        // 	return simulatePanelCodeMapperEx(testingServiceCollection, {
        // 		files: [file],
        // 		queries: [
        // 			{
        // 				file: 'plotly_to_matplotlib.ipynb',
        // 				activeCell: 0,
        // 				selection: [0, 0, 0, 0],
        // 				query: 'Refactor the code so that purchases are stored in a dictionary keyed by customer_id. Each value should be a list of (product_id, quantity, price). Then update any code that computes total spend and ensure the plotting is done using matplotlibRefactor the code to use matplotlib instead of plotly for the plots.',
        // 				validate: async (outcome, workspace, accessor) => {
        // 					const notebookDocument = workspace.getNotebookDocuments()[0];
        // 					if (!notebookDocument) {
        // 						assert.fail('no notebook document');
        // 					}
        // 					assertWorkspaceEdit(outcome);
        // 					const firstImportCell = notebookDocument.getCells().find(c => c.document.getText().includes('import pandas'));
        // 					assert.ok(firstImportCell?.document.getText().includes('import matplotlib'), `Should contain 'import matplotlib' statements: ${firstImportCell?.document.getText()}`);
        // 					assert.ok(!firstImportCell?.document.getText().includes('import plotly.express'), `Should not contain 'import plotly.express' statements: ${firstImportCell?.document.getText()}`);
        // 					assert.ok(!firstImportCell?.document.getText().includes('import plotly.graph'), `Should not contain 'import plotly.graph' statements: ${firstImportCell?.document.getText()}`);
        // 					assert.ok(notebookDocument.getCells().some(c => c.document.getText().includes('plt.')), `Should contain 'plt.plot' statements`);
        // 				}
        // 			}
        // 		]
        // 	});
        // });
        (0, stest_1.stest)({ description: 'cell refactoring, plot refactoring', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/data_visualization.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'data_visualization.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Modify the plot function to add a new parameter title. This parameter should allow users to set a custom title for the plot. Add titles to all sales plots.',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert_1.default.ok(notebookDocument.cellAt(5).document.getText().includes('title'), `Should contain 'title' statements: ${notebookDocument.cellAt(5).document.getText()}`);
                            assert_1.default.ok(notebookDocument.cellAt(7).document.getText().includes('title'), `Should contain 'title' statements: ${notebookDocument.cellAt(7).document.getText()}`);
                            assert_1.default.ok(notebookDocument.cellAt(9).document.getText().includes('title'), `Should contain 'title' statements: ${notebookDocument.cellAt(9).document.getText()}`);
                        }
                    }
                ]
            });
        });
        // stest.skip({ description: 'remove single print statement from large notebook cell', language: 'python' }, async (testingServiceCollection) => {
        // 	const file = fromFixture('notebook/edits/large_cell.ipynb');
        // 	return simulatePanelCodeMapperEx(testingServiceCollection, {
        // 		files: [file],
        // 		queries: [
        // 			{
        // 				file: 'large_cell.ipynb',
        // 				activeCell: 0,
        // 				selection: [0, 0, 0, 0],
        // 				query: 'Remove the print statement',
        // 				validate: async (outcome, workspace, accessor) => {
        // 					const notebookDocument = workspace.getNotebookDocuments()[0];
        // 					if (!notebookDocument) {
        // 						assert.fail('no notebook document');
        // 					}
        // 					assertWorkspaceEdit(outcome);
        // 					assert.ok(!notebookDocument.cellAt(1).document.getText().includes('print'), `Should not contain 'print' statements: ${notebookDocument.cellAt(1).document.getText()}`);
        // 				}
        // 			}
        // 		]
        // 	});
        // });
        (0, stest_1.stest)({ description: 'new code cells in empty notebook', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/empty.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'empty.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Please add a new code cell that imports pandas and numpy.',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert_1.default.ok(notebookDocument.cellAt(0).document.getText().includes('import pandas'), 'pandas not imported');
                            assert_1.default.ok(notebookDocument.cellAt(0).document.getText().includes('import numpy'), 'numpy not imported');
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'new julia code cells in empty notebook', language: 'julia' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/empty_julia.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'empty_julia.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Please add a new Julia code cell that calculates the factorial of a given number.',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert_1.default.ok(notebookDocument.cellAt(0).document.languageId === 'julia', 'cell is not julia');
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'notebook code cell deletion', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/multicells.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'multicells.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Please remove the last code cell from the notebook.',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert_1.default.ok(notebookDocument.cellCount === 2, 'Should have 2 cells remaining after deletion');
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 're-organize python imports to top of the notebook', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/data_visualization_2.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'data_visualization_2.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Please move all import statements to the top of the notebook.',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            const firstCodeCell = notebookDocument.getCells().filter(cell => cell.kind === vscodeTypes_1.NotebookCellKind.Code)[0];
                            assert_1.default.ok(firstCodeCell, 'no code cells');
                            assert_1.default.ok(firstCodeCell.document.getText().includes('import pandas as pd'), 'pandas not imported');
                            assert_1.default.ok(firstCodeCell.document.getText().includes('import matplotlib.pyplot as plt'), 'matplotlib not imported');
                            assert_1.default.ok(firstCodeCell.document.getText().includes('import seaborn as sns'), 'seaborn not imported');
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'Insert markdown cells explaining code', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/github.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'github.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'I do not understand the code in the entire notebook, please add Markdown cells and comments clearly explaining the the output and the analysis performed by the code.',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            const markdownCells = notebookDocument.getCells().filter(cell => cell.kind === vscodeTypes_1.NotebookCellKind.Markup);
                            assert_1.default.ok(markdownCells.length > 0, 'no markdown cells added');
                            assert_1.default.ok(markdownCells.some(md => md.document.getText().toLowerCase().includes('filter issues') || md.document.getText().toLowerCase().includes('filtered issues')), `Should have a markdown cell with 'filter issues'`);
                            assert_1.default.ok(markdownCells.some(md => md.document.getText().toLowerCase().includes('assignee')), `Should have a markdown cell with 'assignee'`);
                            assert_1.default.ok(markdownCells.some(md => md.document.getText().toLowerCase().includes('label')), `Should have a markdown cell with 'label'`);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'code cell modification & insertion', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/multicells.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'multicells.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Please convert the numeric lists into NumPy arrays. Then create a new cell below the existing cells that plots the distribution of sepal lengths using matplotlib. Use any style you like for the plot.',
                        expectedIntent: 'edit',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert_1.default.ok(notebookDocument.cellCount === 3, 'Should have 2 cells remaining after deletion');
                        }
                    },
                ]
            });
        });
        (0, stest_1.stest)({ description: 'code cell modification & deletion', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/multicells.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'multicells.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Please delete the last cell.',
                        expectedIntent: 'edit',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert_1.default.ok(notebookDocument.cellCount === 2, 'Should have 2 cells remaining after deletion');
                        }
                    },
                ]
            });
        });
        (0, stest_1.stest)({ description: 'code cell modification with removal of unused imports', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/imports.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'imports.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Please delete unused imports.',
                        expectedIntent: 'edit',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            // `import os` should be removed
                            notebookDocument.getCells().forEach(cell => {
                                assert_1.default.strictEqual(cell.document.getText().includes('import os'), false);
                            });
                        }
                    },
                ]
            });
        });
        (0, stest_1.stest)({ description: 'code cell re-ordering', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/reorder.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'reorder.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Please change order of the cells to ensure cell with imports are on top.',
                        expectedIntent: 'edit',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            // First cell will contain imports and second cell print statement
                            assert_1.default.strictEqual(notebookDocument.cellCount, 2);
                            assert_1.default.strictEqual(notebookDocument.cellAt(0).document.getText().includes('import sys'), true);
                            assert_1.default.strictEqual(notebookDocument.cellAt(1).document.getText().includes('print'), true);
                        }
                    },
                ]
            });
        });
        (0, stest_1.stest)({ description: 'code cell refactoring, modification, insertion & delection of cells', language: 'python' }, async (testingServiceCollection) => {
            const file = (0, stestUtil_1.fromFixture)('notebook/edits/matplotlib_to_plotly.ipynb');
            return simulatePanelCodeMapperEx(testingServiceCollection, {
                files: [file],
                queries: [
                    {
                        file: 'matplotlib_to_plotly.ipynb',
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: 'Replace Matplotlib with Plotly for the plots, remove redundant cells, remove print statements, reorder the second Markdown cell, and add a new code cell at the bottom with a pie chart of species counts. Add Markdown cells before each plot cell to describe the plot and the data.',
                        expectedIntent: 'edit',
                        validate: async (outcome, workspace, accessor) => {
                            const notebookDocument = workspace.getNotebookDocuments()[0];
                            if (!notebookDocument) {
                                assert_1.default.fail('no notebook document');
                            }
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            // Initially 1 markdowncell and 3 code cells with a plot in each.
                            // After updates we should have at least 5 code cells with plots & 5 markdown cells.
                            const markdownCells = notebookDocument.getCells().filter(c => c.kind === vscodeTypes_1.NotebookCellKind.Markup);
                            const codeCells = notebookDocument.getCells().filter(c => c.kind === vscodeTypes_1.NotebookCellKind.Code);
                            assert_1.default.ok(markdownCells.length > 1, `Should have at least 2 markdown cells, got ${markdownCells.length}`);
                            assert_1.default.ok(codeCells.some(c => c.document.getText().includes('pie')), `Should have a code cell with a pie chart, got ${codeCells.map(c => c.document.getText()).join(',')}`);
                        }
                    },
                ]
            });
        });
    });
    (0, stest_1.ssuite)({ title: 'notebookEdits', subtitle: `bug reports - ${format}`, location: 'panel' }, () => {
        (0, stest_1.stest)({ description: 'Issue #13868' }, async (testingServiceCollection) => {
            try {
                await simulatePanelCodeMapperEx(testingServiceCollection, {
                    files: [
                        (0, stestUtil_1.toFile)({
                            fileName: "multiFile/issue-13868/data.csv",
                            fileContents: [
                                "Duration,Pulse,Maxpulse,Calories\n",
                                "60,110,130,409.1\n",
                                "60,117,145,479.0\n",
                                "60,103,135,340.0\n",
                                "45,109,175,282.4\n",
                                "45,117,148,406.0\n",
                                "60,102,127,300.0\n",
                                "60,110,136,374.0\n",
                                "45,104,134,253.3\n",
                                "30,109,133,195.1\n",
                                "60,98,124,269.0\n",
                                "60,103,147,329.3\n",
                                "60,100,120,250.7\n",
                                "60,106,128,345.3\n",
                                "60,104,132,379.3\n",
                                "60,98,123,275.0\n",
                                "60,98,120,215.2\n",
                                "60,100,120,300.0\n"
                            ].join('')
                        }),
                    ],
                    queries: [
                        {
                            file: undefined,
                            selection: undefined,
                            query: "create a new notebook to analyze #file:data.csv ",
                            validate: async (outcome, workspace, accessor) => {
                                (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                                // assert.strictEqual((await getWorkspaceDiagnostics(accessor, workspace, 'tsc')).filter(d => d.kind === 'syntactic').length, 0);
                            }
                        }
                    ]
                });
            }
            catch (ex) {
                assert_1.default.fail(ex.message);
            }
        });
    });
});
//# sourceMappingURL=notebookEdits.stest.js.map