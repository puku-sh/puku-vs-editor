"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const newNotebookIntent_1 = require("../../src/extension/intents/node/newNotebookIntent");
const chatMLFetcher_1 = require("../../src/platform/chat/common/chatMLFetcher");
const endpointProvider_1 = require("../../src/platform/endpoint/common/endpointProvider");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const uri_1 = require("../../src/util/vs/base/common/uri");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const stest_1 = require("../base/stest");
const scenarioTest_1 = require("../e2e/scenarioTest");
const python_1 = require("../simulation/diagnosticProviders/python");
(0, stest_1.ssuite)({ title: 'newNotebook', subtitle: 'prompt', location: 'panel' }, () => {
    (0, stest_1.stest)({ description: 'generate code cell', language: 'python' }, async (testingServiceCollection) => {
        const accessor = testingServiceCollection.createTestingAccessor();
        const endpoint = await accessor.get(endpointProvider_1.IEndpointProvider).getChatEndpoint('gpt-4.1');
        const topic = 'Creating Random Arrays with Numpy';
        const sections = [
            {
                "title": "Import Required Libraries",
                "content": "Import the necessary libraries, including NumPy."
            },
            {
                "title": "Create Random Arrays",
                "content": "Use NumPy to create random arrays of various shapes and sizes, including 1D, 2D, and 3D arrays."
            },
            {
                "title": "Seed the Random Number Generator",
                "content": "Use the seed() function to seed the random number generator for reproducibility."
            },
            {
                "title": "Generate Random Integers",
                "content": "Use the randint() function to generate random integers within a specified range."
            }
        ];
        const cells = [];
        const firstCell = await (0, newNotebookIntent_1.newNotebookCodeCell)(accessor.get(instantiation_1.IInstantiationService), accessor.get(chatMLFetcher_1.IChatMLFetcher), endpoint, (0, scenarioTest_1.fetchConversationOptions)(), undefined, topic, sections[0], '', 'python', uri_1.URI.file('sample.ipynb'), cancellation_1.CancellationToken.None);
        assert_1.default.ok(firstCell !== undefined, 'code should not be empty');
        assert_1.default.ok(firstCell.includes('import numpy as np'), 'code should include import numpy as np');
        const firstCellIsValid = await validatePythonCode(accessor, firstCell);
        assert_1.default.ok(firstCellIsValid, 'first cell code should be valid python code');
        cells.push(firstCell);
        const secondCell = await (0, newNotebookIntent_1.newNotebookCodeCell)(accessor.get(instantiation_1.IInstantiationService), accessor.get(chatMLFetcher_1.IChatMLFetcher), endpoint, (0, scenarioTest_1.fetchConversationOptions)(), undefined, topic, sections[1], cells.join('\n'), 'python', uri_1.URI.file('sample.ipynb'), cancellation_1.CancellationToken.None);
        assert_1.default.ok(secondCell !== undefined, 'code should not be empty');
        assert_1.default.ok(!secondCell.includes('import numpy'), 'code should not include import numpy again');
        // const secondCellIsValid = await validatePythonCode(accessor, secondCell!);
        // assert.ok(secondCellIsValid, 'second cell code should be valid python code');
    });
    (0, stest_1.stest)({ description: 'Generate code cell (numpy)', language: 'python' }, async (testingServiceCollection) => {
        const accessor = testingServiceCollection.createTestingAccessor();
        const endpoint = await accessor.get(endpointProvider_1.IEndpointProvider).getChatEndpoint('gpt-4.1');
        const topic = 'A Jupyter notebook that creates a structured array with NumPy.';
        const sections = [
            {
                title: 'Import Required Libraries', content: 'Import the necessary libraries, including NumPy.'
            },
            {
                title: 'Create Structured Array', content: 'Use NumPy to create a structured array with named fields and data types.'
            },
            {
                title: 'Accessing Structured Array Elements', content: 'Access individual elements of the structured array using the field names.'
            },
            {
                title: 'Iterating over Structured Arrays', content: 'Iterate over the structured array using a fo…nd access the field values for each element.'
            }
        ];
        const cells = [];
        const firstCell = await (0, newNotebookIntent_1.newNotebookCodeCell)(accessor.get(instantiation_1.IInstantiationService), accessor.get(chatMLFetcher_1.IChatMLFetcher), endpoint, (0, scenarioTest_1.fetchConversationOptions)(), undefined, topic, sections[0], '', 'python', uri_1.URI.file('sample.ipynb'), cancellation_1.CancellationToken.None);
        assert_1.default.ok(firstCell !== undefined, 'code should not be empty');
        assert_1.default.ok(firstCell.includes('import numpy as np'), 'code should include import numpy as np');
        const firstCellIsValid = await validatePythonCode(accessor, firstCell);
        assert_1.default.ok(firstCellIsValid, 'code should be valid python code');
        cells.push(firstCell);
        for (let i = 1; i < sections.length; i++) {
            const cell = await (0, newNotebookIntent_1.newNotebookCodeCell)(accessor.get(instantiation_1.IInstantiationService), accessor.get(chatMLFetcher_1.IChatMLFetcher), endpoint, (0, scenarioTest_1.fetchConversationOptions)(), undefined, topic, sections[i], cells.join('\n'), 'python', uri_1.URI.file('sample.ipynb'), cancellation_1.CancellationToken.None);
            assert_1.default.ok(cell !== undefined, 'code should not be empty');
            assert_1.default.ok(!cell.includes('import numpy'), 'code should not include import numpy again');
            const cellIsValid = await validatePythonCode(accessor, cell);
            assert_1.default.ok(cellIsValid, 'code should be valid python code');
            cells.push(cell);
        }
    });
    (0, stest_1.stest)({ description: 'Generate code cell (seaborn + pandas)', language: 'python' }, async (testingServiceCollection) => {
        const accessor = testingServiceCollection.createTestingAccessor();
        const endpoint = await accessor.get(endpointProvider_1.IEndpointProvider).getChatEndpoint('gpt-4.1');
        const topic = 'A Jupyter notebook that loads planets data from Seaborn and performs aggregation in Pandas.';
        const sections = [
            { title: 'Import Required Libraries', content: 'Import the necessary libraries, including Pandas and Seaborn.' },
            { title: 'Load Planets Data', content: 'Load the planets data from Seaborn into a Pandas DataFrame.' },
            { title: 'Data Cleaning', content: 'Clean the data by removing missing values and converting data types if necessary.' },
            { title: 'Aggregation with GroupBy', content: 'Use the groupby() function to group the data…erform aggregation operations on the groups.' },
            { title: 'Aggregation with Pivot Tables', content: 'Use the pivot_table() function to create a p… summarizes the data by one or more columns.' },
        ];
        const cells = [];
        const firstCell = await (0, newNotebookIntent_1.newNotebookCodeCell)(accessor.get(instantiation_1.IInstantiationService), accessor.get(chatMLFetcher_1.IChatMLFetcher), endpoint, (0, scenarioTest_1.fetchConversationOptions)(), undefined, topic, sections[0], '', 'python', uri_1.URI.file('sample.ipynb'), cancellation_1.CancellationToken.None);
        assert_1.default.ok(firstCell !== undefined, 'code should not be empty');
        assert_1.default.ok(firstCell.includes('import seaborn'), 'code should include import seaborn');
        assert_1.default.ok(firstCell.includes('import pandas'), 'code should include import pandas');
        const firstCellIsValid = await validatePythonCode(accessor, firstCell);
        assert_1.default.ok(firstCellIsValid, 'code should be valid python code');
        cells.push(firstCell);
        for (let i = 1; i < sections.length; i++) {
            const cell = await (0, newNotebookIntent_1.newNotebookCodeCell)(accessor.get(instantiation_1.IInstantiationService), accessor.get(chatMLFetcher_1.IChatMLFetcher), endpoint, (0, scenarioTest_1.fetchConversationOptions)(), undefined, topic, sections[i], cells.join('\n'), 'python', uri_1.URI.file('sample.ipynb'), cancellation_1.CancellationToken.None);
            assert_1.default.ok(cell !== undefined, 'code should not be empty');
            assert_1.default.ok(!cell.includes('import seaborn'), 'code should not include import seaborn again');
            assert_1.default.ok(!cell.includes('import pandas'), 'code should not include import pandas again');
            const cellIsValid = await validatePythonCode(accessor, cell);
            assert_1.default.ok(cellIsValid, 'code should be valid python code');
            cells.push(cell);
        }
    });
});
// async function validatePythonCode(pythonCode: string): Promise<boolean> {
// 	const validateCode = `
// import codeop
// import re
// def validate_python_code(code):
//     # Split the code into separate statements
//     statements = re.split(r"\\n(?=\\w)", code)
//     for statement in statements:
//         codeop.compile_command(statement)
// validate_python_code("""${pythonCode}""")
// `;
// 	if (pythonCode.startsWith('```')) {
// 		return false;
// 	}
// 	return new Promise((resolve) => {
// 		exec(`python3 -c "${validateCode.replace(/["\\]/g, '\\$&')}"`, (error, stdout, stderr) => {
// 			if (error) {
// 				return resolve(false);
// 			} else if (stderr && stderr.length > 0) {
// 				return resolve(false);
// 			}
// 			resolve(true);
// 		});
// 	});
// }
async function validatePythonCode(accessor, pythonCode) {
    const escapedPythonCode = pythonCode.replace(/`/g, 'BACKTICK_PLACEHOLDER');
    const validateCode = `
import codeop
import re

def validate_python_code(code):
    # Replace placeholder string with actual backtick
    code = code.replace('BACKTICK_PLACEHOLDER', chr(96))
    # Split the code into separate statements
    statements = re.split(r"\\n(?=\\w)", code)
    for statement in statements:
        codeop.compile_command(statement)

validate_python_code("""${escapedPythonCode}""")
`;
    return (0, python_1.isValidPythonFile)(accessor, validateCode);
}
//# sourceMappingURL=newNotebookCell.stest.js.map