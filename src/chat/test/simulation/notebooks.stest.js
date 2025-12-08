"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromNotebookFixture = fromNotebookFixture;
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const os_1 = require("os");
const path = __importStar(require("path"));
const diffService_1 = require("../../src/platform/diff/common/diffService");
const diffServiceImpl_1 = require("../../src/platform/diff/node/diffServiceImpl");
const alternativeContent_1 = require("../../src/platform/notebook/common/alternativeContent");
const alternativeContentEditGenerator_1 = require("../../src/platform/notebook/common/alternativeContentEditGenerator");
const alternativeContentFormat_1 = require("../../src/platform/notebook/common/alternativeContentFormat");
const notebookService_1 = require("../../src/platform/notebook/common/notebookService");
const simulationWorkspaceServices_1 = require("../../src/platform/test/node/simulationWorkspaceServices");
const notebookDocument_1 = require("../../src/util/common/test/shims/notebookDocument");
const lifecycle_1 = require("../../src/util/vs/base/common/lifecycle");
const map_1 = require("../../src/util/vs/base/common/map");
const network_1 = require("../../src/util/vs/base/common/network");
const uri_1 = require("../../src/util/vs/base/common/uri");
const descriptors_1 = require("../../src/util/vs/platform/instantiation/common/descriptors");
const stest_1 = require("../base/stest");
const diagnosticProviders_1 = require("./diagnosticProviders");
const python_1 = require("./diagnosticProviders/python");
const inlineChatSimulator_1 = require("./inlineChatSimulator");
const stestUtil_1 = require("./stestUtil");
function fromNotebookFixture(pathOrDirnameWithinFixturesDir, activeCell /** when provided, code in other cells will be emptied */) {
    const filePath = path.join((0, stestUtil_1.getFixturesDir)(), pathOrDirnameWithinFixturesDir);
    const baseDirname = path.dirname(filePath);
    const fileName = path.relative(baseDirname, filePath);
    const fileContents = fs.readFileSync(filePath).toString();
    try {
        const notebook = JSON.parse(fileContents);
        const cells = notebook.cells;
        notebook.cells = cells.map((cell, index) => {
            if (index !== activeCell) {
                return {
                    ...cell,
                    source: ['']
                };
            }
            else {
                return cell;
            }
        });
        return { kind: 'relativeFile', fileName, fileContents: JSON.stringify(notebook, undefined, 2) };
    }
    catch {
        return { kind: 'relativeFile', fileName, fileContents };
    }
}
(0, stest_1.ssuite)({ title: 'notebook', subtitle: 'edit', location: 'inline' }, () => {
    (0, stest_1.stest)({ description: 'variables', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/variables.ipynb')],
            queries: [
                {
                    file: 'variables.ipynb',
                    activeCell: 0,
                    selection: [2, 0, 2, 0],
                    query: 'print seconds in a week',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(/print\(seconds_in_a_week/.test(outcome.fileContents));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'dataframe', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/dataframe.ipynb')],
            queries: [
                {
                    file: 'dataframe.ipynb',
                    activeCell: 2,
                    selection: [0, 0, 0, 0],
                    query: 'add a new column called adjusted to the dataframe and set it to the value of the activity column minus 2',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(outcome.fileContents.includes('my_dataframe[\'adjusted\']') || outcome.fileContents.includes('my_dataframe[\"adjusted\"]'));
                        assert_1.default.ok(!outcome.fileContents.includes('import'));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'data cleansing', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/datacleansing.ipynb')],
            queries: [
                {
                    file: 'datacleansing.ipynb',
                    activeCell: 2,
                    selection: [0, 0, 0, 0],
                    query: 'check for missing values',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(!outcome.fileContents.includes('import'));
                        assert_1.default.ok(outcome.fileContents.includes('mydf'));
                        assert_1.default.ok(outcome.fileContents.includes('isnull') || outcome.fileContents.includes('dropna'));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'plot', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/plot.ipynb')],
            queries: [
                {
                    file: 'plot.ipynb',
                    activeCell: 1,
                    selection: [0, 0, 0, 0],
                    query: 'plot the data frame',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(!outcome.fileContents.includes('import'));
                        assert_1.default.ok(outcome.fileContents.includes('df.plot') || outcome.fileContents.includes('px.bar'));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: '/fix notebook exection ImportError', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/errors.ipynb')],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 0,
                    selection: [0, 0, 0, 0],
                    query: '/fix ModuleNotFoundError: No module named \'pandas\'',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(!outcome.fileContents.includes('!pip'));
                        assert_1.default.ok(outcome.fileContents.includes('%pip install'));
                        assert_1.default.ok(outcome.fileContents.indexOf('pip') === outcome.fileContents.lastIndexOf('pip'));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'edit notebook code should not duplicate the content', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/edit.ipynb')],
            queries: [
                {
                    file: 'edit.ipynb',
                    activeCell: 0,
                    selection: [6, 0, 8, 0],
                    query: 'make the plot larger',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(outcome.fileContents.includes('plt.figure')
                            || outcome.fileContents.includes('plt.gcf'));
                        // check if 'plt.figure' only shows up once
                        const matches = outcome.fileContents.match(/(plt\.figure)|(plt\.gcf)/g);
                        assert_1.default.strictEqual(matches?.length, 1);
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'set index', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/edit.ipynb')],
            queries: [
                {
                    file: 'edit.ipynb',
                    activeCell: 1,
                    selection: [13, 0, 13, 0],
                    query: 'Set the \'origin\' colum as the index of the dataframe',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(outcome.fileContents.includes('.set_index'));
                        assert_1.default.strictEqual(outcome.fileContents.match(/set\_index/g)?.length, 1);
                        assert_1.default.strictEqual(outcome.fileContents.match(/DataFrame/g)?.length, 1);
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'group by', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/edit.ipynb')],
            queries: [
                {
                    file: 'edit.ipynb',
                    activeCell: 2,
                    selection: [6, 0, 6, 0],
                    query: 'Group the entire dataframe by regiment and company',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(outcome.fileContents.includes('regiment.groupby'));
                        assert_1.default.strictEqual(outcome.fileContents.match(/groupby/g)?.length, 1);
                        assert_1.default.strictEqual(outcome.fileContents.match(/DataFrame/g)?.length, 1);
                    }
                }
            ]
        });
    });
    // import matplotlib.pyplot as plt
    // months = range(1, 13)
    // nyc_temp_2000 = [20.0, 30.5, 80.1, 80.3, 56.5, 99.6]
    // plt.plot(months, nyc_temp_2000)
    // stest({ description: '/fix Matplotlib: x and y must have same first dimension', language: 'python' }, (testingServiceCollection) => {
    // 	return runScenario(accessor, {
    // 		files: [fromFixture('notebook/errors.ipynb')],
    // 		queries: [
    // 			{
    // 				file: 'errors.ipynb',
    // 				activeCell: 6,
    // 				selection: [4, 0, 4, 0],
    // 				query: '/fix ValueError: x and y must have same first dimension, but have shapes (12,) and (6,)',
    // 				expectedIntent: 'edit',
    // 				validate: async (outcome, workspace, accessor) => {
    // 					assert.strictEqual(outcome.type, 'inlineEdit');
    // 					assert.strictEqual(outcome.appliedEdits.length, 1);
    // 					const edit = outcome.appliedEdits[0];
    // 					assert.ok(edit.newText.includes('global'));
    // 				}
    // 			}
    // 		]
    // 	});
    // });
    // NameError: name 'df' is not defined -> should suggest rerun cell
});
(0, stest_1.ssuite)({ title: 'notebook', subtitle: 'generate', location: 'inline' }, () => {
    (0, stest_1.stest)({ description: 'edit markdown cell should support code example', language: 'markdown' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/md.ipynb')],
            queries: [
                {
                    file: 'md.ipynb',
                    activeCell: 0,
                    selection: [0, 0, 0, 0],
                    query: 'describe fibonacci algorithm in markdown, along with code example',
                    expectedIntent: 'generate',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(outcome.fileContents.includes('```'));
                        const matches = outcome.fileContents.match(/\`\`\`/g);
                        assert_1.default.ok(matches && matches.length > 0 && matches.length % 2 === 0);
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'Which was the most-ordered item', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/sales.ipynb')],
            queries: [
                {
                    file: 'sales.ipynb',
                    activeCell: 13,
                    selection: [0, 0, 0, 0],
                    query: 'Which was the most-ordered item? ', // How many items were orderd in total?
                    expectedIntent: 'generate',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'How many items were orderd in total?', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/sales.ipynb')],
            queries: [
                {
                    file: 'sales.ipynb',
                    activeCell: 13,
                    selection: [0, 0, 0, 0],
                    query: 'WHow many items were orderd in total?',
                    expectedIntent: 'generate',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'create a model to predict the likelihood of a flight being delayed', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/model.ipynb')],
            queries: [
                {
                    file: 'model.ipynb',
                    activeCell: 1,
                    selection: [0, 0, 0, 0],
                    query: 'create a model to predict the likelihood of a flight being delayed based on the day of the week and the arrival airport. Use Logistic regression and calculate the accuracy of the model.', //
                    expectedIntent: 'generate',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                    }
                }
            ]
        });
    });
});
(0, stest_1.ssuite)({ title: 'notebook', subtitle: 'generate runtime', location: 'inline' }, () => {
    (0, stest_1.stest)({ description: 'generate code uses obselete variable', language: 'python' }, (testingServiceCollection) => {
        const file = (0, stestUtil_1.fromFixture)('notebook/variablesruntime.ipynb');
        const testScenario = {
            files: [file],
            queries: [
                {
                    file: 'variablesruntime.ipynb',
                    activeCell: 1,
                    selection: [2, 0, 2, 0],
                    query: 'Detect and remove outliers for delay columns',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.strictEqual(outcome.fileContents.indexOf('[delay_columns]') >= 0 || outcome.fileContents.indexOf('delay_columns =') >= 0 || outcome.fileContents.indexOf('delay_columns:') >= 0, true);
                    }
                }
            ],
            extraWorkspaceSetup: async (workspace) => {
                const notebook = workspace.getNotebookDocuments()[0];
                if (notebook) {
                    const variables = [
                        {
                            variable: {
                                name: 'delay_columns',
                                value: `['DepDelay', 'ArrDelay']`,
                                type: 'list'
                            },
                            hasNamedChildren: false,
                            indexedChildrenCount: 2
                        }
                    ];
                    testingServiceCollection.define(notebookService_1.INotebookService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationNotebookService, [
                        workspace,
                        new map_1.ResourceMap([
                            [
                                notebook.uri,
                                variables
                            ]
                        ])
                    ]));
                    testingServiceCollection.define(alternativeContent_1.IAlternativeNotebookContentService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationAlternativeNotebookContentService, []));
                    testingServiceCollection.define(alternativeContentEditGenerator_1.IAlternativeNotebookContentEditGenerator, new descriptors_1.SyncDescriptor(alternativeContentEditGenerator_1.AlternativeNotebookContentEditGenerator));
                    testingServiceCollection.define(diffService_1.IDiffService, new descriptors_1.SyncDescriptor(diffServiceImpl_1.DiffServiceImpl));
                }
            }
        };
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, testScenario);
    });
});
(0, stest_1.ssuite)({ title: 'notebook', subtitle: 'fix runtime', location: 'inline' }, () => {
    (0, stest_1.stest)({ description: '/fix notebook execution ImportError, insert at top', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/errors.ipynb')],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 0,
                    selection: [0, 0, 0, 0],
                    query: '/fix ModuleNotFoundError: No module named \'pandas\'',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        // assert(outcome.appliedEdits.length > 0, 'at least 1 edit generated');
                        assert_1.default.ok(outcome.fileContents.indexOf('import pandas') >= 0);
                        // assert.ok(await isValidPythonFile(accessor, outcome.fileContents));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: '/fix ValueError: The truth value of an array with more than one element is ambiguous', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/errors.ipynb')],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 1,
                    selection: [4, 0, 4, 0],
                    query: '/fix ValueError: The truth value of an array with more than one element is ambiguous. Use a.any() or a.all()',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        if (!outcome.fileContents.includes('A | B') && !outcome.fileContents.includes('np.logical_or(A, B)')) {
                            assert_1.default.ok(outcome.fileContents.includes('A.any()'));
                            assert_1.default.ok(outcome.fileContents.includes('B.any()'));
                        }
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: '/fix Tensorflow InvalidArgumentError', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/errors.ipynb')],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 2,
                    selection: [1, 0, 1, 0],
                    query: '/fix InvalidArgumentError: {{function_node __wrapped__Reshape_device_/job:localhost/replica:0/task:0/device:CPU:0}} Input to reshape is a tensor with 3 values, but the requested shape has 2 [Op:Reshape]',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(outcome.fileContents.includes('reshape'));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: '/fix Tensorflow model has not yet been built', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [fromNotebookFixture('notebook/errors.ipynb', 3)],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 3,
                    selection: [4, 0, 4, 0],
                    query: '/fix ValueError: This model has not yet been built. Build the model first by calling `build()` or by calling the model on a batch of data.',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        // assert.ok(outcome.fileContents.includes('.build'));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: '/fix numpy, unsupported operand types', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [fromNotebookFixture('notebook/errors.ipynb', 4)],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 4,
                    selection: [3, 0, 3, 0],
                    query: '/fix TypeError: unsupported operand type(s) for +: \'int\' and \'NoneType\'',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(!outcome.fileContents.includes('None') ||
                            outcome.fileContents.includes(' != None') ||
                            outcome.fileContents.includes(' == None') || ((outcome.fileContents.includes('np.array([1, np.nan, 3, 4])') && outcome.fileContents.includes('nansum(vals1)'))));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: '/fix UnboundLocalError, local variable referenced before assignment', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/errors.ipynb')],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 5,
                    selection: [3, 0, 3, 0],
                    query: '/fix UnboundLocalError: local variable \'a_var\' referenced before assignment',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: '/fix name conflict with builtin function', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/errors.ipynb')],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 6,
                    selection: [0, 0, 4, 16],
                    query: '/fix TypeError: \'int\' object is not callable',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(!outcome.fileContents.includes('max = 0'));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: '/fix AttributeError: can\'t set attribute', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/errors.ipynb')],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 7,
                    selection: [9, 0, 9, 0],
                    query: '/fix AttributeError: can\'t set attribute',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(outcome.fileContents.includes('@x.setter'));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: '/fix TypeError: Index does not support mutable operations', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/errors.ipynb')],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 8,
                    selection: [3, 0, 3, 0],
                    query: '/fix TypeError: Index does not support mutable operations',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(outcome.fileContents.includes('ind.set_value') || outcome.fileContents.includes('list(ind)') || outcome.fileContents.includes('ind.tolist()') || outcome.fileContents.includes('ind.delete('));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: '/fix TypeError: str object is not an iterator', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/errors.ipynb')],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 9,
                    selection: [1, 0, 1, 0],
                    query: '/fix TypeError: str object is not an iterator',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(outcome.fileContents.includes('iter('));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: '/fix TypeError: can only concatenate str (not "int") to str', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [fromNotebookFixture('notebook/errors.ipynb', 10)],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 10,
                    selection: [0, 0, 0, 0],
                    query: '/fix TypeError: can only concatenate str (not "int") to str',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(outcome.fileContents.includes('float(') || outcome.fileContents.includes('int(') || outcome.fileContents.includes('str('));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: '/fix Missing import, name \'array\' is not defined', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/errors.ipynb')],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 11,
                    selection: [0, 0, 0, 0],
                    query: '/fix NameError: name \'array\' is not defined',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(outcome.fileContents.includes('np.array') || outcome.fileContents.includes('from numpy import'));
                        // assert.ok(await isValidPythonFile(accessor, outcome.fileContents));
                    }
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: '/fix can only concatenate list (not "str") to list', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/errors.ipynb')],
            queries: [
                {
                    file: 'errors.ipynb',
                    activeCell: 12,
                    selection: [1, 0, 1, 0],
                    query: '/fix TypeError: can only concatenate list (not "str") to list',
                    expectedIntent: 'edit',
                    validate: async (outcome, workspace, accessor) => {
                        assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                        assert_1.default.ok(outcome.fileContents.includes('[\'bar\']') || outcome.fileContents.includes('foo.append'));
                        assert_1.default.ok(await (0, python_1.isValidPythonFile)(accessor, outcome.fileContents));
                    }
                }
            ]
        });
    });
});
(0, stest_1.ssuite)({ title: 'notebook', subtitle: 'fix', location: 'inline' }, () => {
    (0, stest_1.stest)({ description: 'cannot instantiate abstract class', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing0.ipynb')],
            queries: [
                {
                    file: 'fixing0.ipynb',
                    selection: [9, 4, 9, 4],
                    activeCell: 0,
                    query: `/fix Cannot instantiate abstract class "Base"\n  "Base.foo" is abstract`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'all Annotated types should include at least two type arguments', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing1.ipynb')],
            queries: [
                {
                    file: 'fixing1.ipynb',
                    selection: [4, 3, 4, 3],
                    activeCell: 0,
                    query: `/fix Expected one type argument and one or more annotations for "Annotated"`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'should not generate an error for variables declared in outer scopes', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing2.ipynb')],
            queries: [
                {
                    file: 'fixing2.ipynb',
                    selection: [24, 8, 24, 8],
                    activeCell: 0,
                    query: `/fix "d" is not defined`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'async cannot be used in a non-async function', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing3.ipynb')],
            queries: [
                {
                    file: 'fixing3.ipynb',
                    selection: [17, 4, 17, 4],
                    activeCell: 0,
                    query: `/fix Use of "async" not allowed outside of async function`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'await cannot be used in a non-async function', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing4.ipynb')],
            queries: [
                {
                    file: 'fixing4.ipynb',
                    selection: [14, 0, 14, 0],
                    activeCell: 0,
                    query: `/fix "await" allowed only within async function`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'bad token', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing5.ipynb')],
            queries: [
                {
                    file: 'fixing5.ipynb',
                    selection: [4, 7, 4, 7],
                    activeCell: 0,
                    query: `/fix Invalid character in identifier`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'Bar does not define a do_something2 method', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing6.ipynb')],
            queries: [
                {
                    file: 'fixing6.ipynb',
                    selection: [28, 0, 28, 0],
                    activeCell: 0,
                    query: [
                        `/fix Cannot access member "do_something2" for type "Bar"`,
                        `  Member "do_something2" is unknown`
                    ].join('\n'),
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    // Inspired by case 35 of /fix dataset version 10
    // In the AML run, copilot did not understand the error and did not fix it
    (0, stest_1.stest)({ description: '(AML-10-35) can not access member', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing7.ipynb')],
            queries: [
                {
                    file: 'fixing7.ipynb',
                    selection: [2, 23, 2, 23],
                    activeCell: 0,
                    query: [
                        `/fix Cannot access member "includes" for type "set[Unknown]"`,
                        `  Member "includes" is unknown`
                    ].join('\n'),
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    // Inspired by case 36 of /fix dataset version 10
    // In the AML run, copilot did not understand the error and did not fix it
    (0, stest_1.stest)({ description: '(AML-10-36) can not be assigned 2', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing8.ipynb')],
            queries: [
                {
                    file: 'fixing8.ipynb',
                    selection: [4, 19, 4, 19],
                    activeCell: 0,
                    query: `/fix Expression of type "list[None]" cannot be assigned to declared type "List[int] | None"`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    // Inspired by case 4 of /fix dataset version 10
    // In the AML run, copilot did not understand the error and did not fix it
    (0, stest_1.stest)({ description: '(AML-10-4) parameter already assigned', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing9.ipynb')],
            queries: [
                {
                    file: 'fixing9.ipynb',
                    selection: [7, 33, 7, 33],
                    activeCell: 0,
                    query: `/fix Parameter "input_shape" is already assigned`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    // Inspired by case 48 of /fix dataset version 10
    // In the AML run, copilot did not understand the error and did not fix it
    (0, stest_1.stest)({ description: '(AML-10-48) can not be assigned 3', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing10.ipynb')],
            queries: [
                {
                    file: 'fixing10.ipynb',
                    selection: [9, 14, 9, 14],
                    activeCell: 0,
                    query: [
                        `/fix Argument of type "dict[str, int]" cannot be assigned to parameter "platforms" of type "list[str] | str" in function "setup"`,
                        `  Type "dict[str, int]" cannot be assigned to type "list[str] | str"`,
                        `    "dict[str, int]" is incompatible with "list[str]"`,
                        `    "dict[str, int]" is incompatible with "str"`,
                    ].join('\n'),
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    // Inspired by case 58 of /fix dataset version 10
    // The AML run has removed a big part of the code and replaced with non-minimal edits, this initial issue was not resolved
    (0, stest_1.stest)({ description: '(AML-10-58) not defined', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing11.ipynb')],
            queries: [
                {
                    file: 'fixing11.ipynb',
                    selection: [7, 20, 7, 20],
                    activeCell: 0,
                    query: `/fix "T_Or" is not defined`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    // Inspired by case 29 of /fix dataset version 10
    (0, stest_1.stest)({ description: '(AML-10-29) instance of bool has no to_string member', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing12.ipynb')],
            queries: [
                {
                    file: 'fixing12.ipynb',
                    selection: [1, 19, 1, 19],
                    activeCell: 0,
                    query: `/fix`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    // Inspired by case 110 of /fix dataset version 8
    (0, stest_1.stest)({ description: '(AML-8-110) not defined', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing13.ipynb')],
            queries: [
                {
                    file: 'fixing13.ipynb',
                    selection: [7, 20, 7, 20],
                    activeCell: 0,
                    query: `/fix Instance methods should take a "self" parameter`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    // Inspired by case 73 of /fix dataset version 8
    (0, stest_1.stest)({ description: '(AML-8-73) no value for argument in function call', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing14.ipynb')],
            queries: [
                {
                    file: 'fixing14.ipynb',
                    selection: [12, 16, 12, 16],
                    activeCell: 0,
                    query: `/fix Argument missing for parameter "error_message"`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'undefined variable', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing15.ipynb')],
            queries: [
                {
                    file: 'fixing15.ipynb',
                    selection: [0, 0, 0, 4],
                    activeCell: 0,
                    query: `/fix "Play" is not defined`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'general type issue', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing16.ipynb')],
            queries: [
                {
                    file: 'fixing16.ipynb',
                    selection: [29, 22, 29, 25],
                    activeCell: 0,
                    query: [
                        `/fix Argument of type "Msg[Foo]" cannot be assigned to parameter "msg" of type "Msg[FooBar]" in function "handle"`,
                        `  "Msg[Foo]" is incompatible with "Msg[FooBar]"`,
                        `    Type parameter "T@Msg" is invariant, but "Foo" is not the same as "FooBar"`
                    ].join('\n'),
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'optional member access', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing17.ipynb')],
            queries: [
                {
                    file: 'fixing17.ipynb',
                    selection: [12, 23, 12, 28],
                    activeCell: 0,
                    query: `/fix "upper" is not a known member of "None"`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
    (0, stest_1.stest)({ description: 'unbound variable', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [(0, stestUtil_1.fromFixture)('notebook/fixing/fixing18.ipynb')],
            queries: [
                {
                    file: 'fixing18.ipynb',
                    selection: [4, 11, 4, 12],
                    activeCell: 0,
                    query: `/fix "a" is possibly unbound`,
                    expectedIntent: "fix" /* Intent.Fix */,
                    diagnostics: 'pyright',
                    validate: async (outcome, workspace, accessor) => assertNoCellDiagnosticsAsync(accessor, outcome, workspace, 'pyright')
                }
            ]
        });
    });
});
const shouldEvaluate = 1 >> 1;
stest_1.ssuite.optional((opes) => !shouldEvaluate, { title: 'notebook', subtitle: 'mbpp', location: 'inline' }, () => {
    const mbppFile = (0, stestUtil_1.fromFixture)('notebook/filtered-mbpp.json');
    const mbppTests = JSON.parse(mbppFile.fileContents).tests;
    const testScenarios = mbppTests.map((test) => ({
        task_id: test.task_id,
        text: test.prompt,
        test_list: test.test_list.map((line) => `${line}\n`)
    }));
    for (const test of testScenarios) {
        const prompt = test.text;
        const test_list = test.test_list;
        const task_id = test.task_id;
        (0, stest_1.stest)({ description: 'mbpp ' + task_id + ' ' + prompt, language: 'python' }, async (testingServiceCollection) => {
            const templateFile = (0, stestUtil_1.fromFixture)('notebook/mbpp.ipynb');
            const notebook = JSON.parse(templateFile.fileContents);
            const cells = notebook.cells;
            const cell = cells[1];
            cell.source = test_list;
            const notebookFile = { kind: 'relativeFile', fileName: templateFile.fileName, fileContents: JSON.stringify(notebook, undefined, 2) };
            return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
                files: [notebookFile],
                queries: [
                    {
                        file: notebookFile.fileName,
                        activeCell: 0,
                        selection: [0, 0, 0, 0],
                        query: `${prompt} Your code should pass the tests in the next cell.`,
                        expectedIntent: 'edit',
                        validate: async (outcome, _workspace, accessor) => {
                            assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                            if (shouldEvaluate) {
                                const testTimeoutPromise = new Promise((_, reject) => {
                                    setTimeout(() => reject(new Error('Test execution timed out')), 60000);
                                });
                                await Promise.race([testTimeoutPromise, assertPythonCodeIsValid(accessor, outcome.fileContents, 'Generated Code is not valid', 'Generated not did not execute without errors')]);
                                const codeWithTests = `${outcome.fileContents}${os_1.EOL}${os_1.EOL}${os_1.EOL}# Tests${os_1.EOL}${os_1.EOL}${test_list.join('')}`;
                                await Promise.race([testTimeoutPromise, assertPythonCodeIsValid(accessor, codeWithTests, 'Generated Code with Tests is not valid', 'Generated did not pass the tests')]);
                            }
                        }
                    }
                ]
            });
        });
    }
});
function generateMBPPNotebookFixture(pathOrDirnameWithinFixturesDir, tests) {
    const filePath = path.join((0, stestUtil_1.getFixturesDir)(), pathOrDirnameWithinFixturesDir);
    const baseDirname = path.dirname(filePath);
    const fileName = path.relative(baseDirname, filePath);
    const uri = uri_1.URI.parse(filePath);
    const fileContents = fs.readFileSync(filePath).toString();
    try {
        const notebook = JSON.parse(fileContents);
        const cells = notebook.cells;
        const cell = cells[1];
        cell.source = tests;
        return { kind: 'relativeFile', uri, fileName, fileContents: JSON.stringify(notebook, undefined, 2) };
    }
    catch {
        return { kind: 'relativeFile', uri, fileName, fileContents };
    }
}
stest_1.ssuite.optional((opes) => !shouldEvaluate || true, { title: 'notebook', subtitle: 'notebookEditsMbpp', location: 'panel' }, () => {
    const mbppFile = (0, stestUtil_1.fromFixture)('notebook/filtered-mbpp.json');
    const mbppTests = JSON.parse(mbppFile.fileContents).tests;
    const testScenarios = mbppTests.map((test) => ({
        task_id: test.task_id,
        text: test.prompt,
        test_list: test.test_list.map((line) => `${line}\n`)
    }));
    for (const test of testScenarios) {
        const prompt = test.text;
        const test_list = test.test_list;
        const task_id = test.task_id;
        (0, stest_1.stest)({ description: 'mbpp ' + task_id + ' ' + prompt, language: 'python' }, async (testingServiceCollection) => {
            const notebookFile = generateMBPPNotebookFixture('notebook/mbpp.ipynb', test_list);
            const disposables = new lifecycle_1.DisposableStore();
            const nbJson = JSON.parse(notebookFile.fileContents);
            const cells = nbJson.cells;
            const cell = cells[1];
            cell.source = test_list;
            let notebook;
            const currentFile = {
                kind: 'qualifiedFile',
                uri: notebookFile.uri,
                fileContents: JSON.stringify(nbJson, undefined, 2)
            };
            return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
                files: [currentFile],
                async extraWorkspaceSetup(workspace) {
                    const extHostNotebook = notebookDocument_1.ExtHostNotebookDocumentData.createJupyterNotebook(notebookFile.uri, notebookFile.fileContents, workspace);
                    notebook = extHostNotebook.document;
                    // TODO@DonJayamanne
                },
                async onBeforeStart(accessor) {
                    accessor.get(alternativeContent_1.IAlternativeNotebookContentService).format = alternativeContentFormat_1.AlternativeNotebookFormat.json;
                },
                queries: [
                    {
                        file: currentFile.uri,
                        activeCell: 0,
                        selection: [1, 0, 1, 0],
                        query: `${prompt} Your code should pass the tests in the next cell.`,
                        expectedIntent: 'edit',
                        validate: async (_outcome, _workspace, accessor) => {
                            if (shouldEvaluate) {
                                const testTimeoutPromise = new Promise((_, reject) => {
                                    setTimeout(() => reject(new Error('Test execution timed out')), 60000);
                                });
                                await Promise.race([testTimeoutPromise, assertPythonCodeIsValid(accessor, notebook.cellAt(0).document.getText(), 'Generated Code is not valid', 'Generated not did not execute without errors')]);
                                const codeWithTests = `${notebook.cellAt(0).document.getText()}${os_1.EOL}${os_1.EOL}${os_1.EOL}# Tests${os_1.EOL}${os_1.EOL}${notebook.cellAt(1).document.getText()}`;
                                await Promise.race([testTimeoutPromise, assertPythonCodeIsValid(accessor, codeWithTests, 'Generated Code with Tests is not valid', 'Generated code did not pass the tests')]);
                            }
                        }
                    }
                ]
            }).finally(() => disposables.dispose());
        });
    }
});
async function assertPythonCodeIsValid(accessor, pythonCode, validationMessage, executionMessage) {
    const cellIsValid = await (0, python_1.isValidPythonFile)(accessor, pythonCode);
    assert_1.default.ok(cellIsValid, `${validationMessage}:${os_1.EOL}${pythonCode}`);
    const cellExecutesWithoutErrors = await (0, python_1.canExecutePythonCodeWithoutErrors)(accessor, pythonCode);
    assert_1.default.ok(cellExecutesWithoutErrors, `${executionMessage}:${os_1.EOL}${pythonCode}`);
}
async function getNotebookCellDiagnostics(accessor, workspace, method) {
    const files = workspace.documents.filter(doc => doc.document.uri.scheme === network_1.Schemas.vscodeNotebookCell).map(doc => ({ fileName: workspace.getFilePath(doc.document.uri), fileContents: doc.document.getText() }));
    if (typeof method === 'string') {
        return await (0, diagnosticProviders_1.getDiagnostics)(accessor, files, method);
    }
    else {
        return await method.getDiagnostics(accessor, files);
    }
}
async function assertNoCellDiagnosticsAsync(accessor, outcome, workspace, method) {
    assert_1.default.strictEqual(outcome.type, 'inlineEdit');
    const diagnostics = await getNotebookCellDiagnostics(accessor, workspace, method);
    if (diagnostics.length > 0) {
        for (const diagnostic of diagnostics) {
            if (diagnostic.message.indexOf('indent') !== -1) {
                outcome.annotations.push({ label: 'indentation', message: diagnostic.message, severity: 'warning' });
            }
        }
    }
    assert_1.default.deepStrictEqual(diagnostics.length, 0, JSON.stringify(diagnostics, undefined, 2));
}
//# sourceMappingURL=notebooks.stest.js.map