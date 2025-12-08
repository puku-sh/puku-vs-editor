"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const uri_1 = require("../../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const fileTreeParser_1 = require("../../common/fileTreeParser");
(0, vitest_1.suite)('convertFileTreeToChatResponseFileTree', () => {
    const generatePreviewURI = (filename) => uri_1.URI.file(`/preview/${filename}`);
    (0, vitest_1.test)('should convert a simple file tree', () => {
        const fileStructure = `
project
├── file1.txt
└── file2.txt
		`;
        const { chatResponseTree, projectName } = (0, fileTreeParser_1.convertFileTreeToChatResponseFileTree)(fileStructure, generatePreviewURI);
        (0, vitest_1.expect)(projectName).toBe('project');
        (0, vitest_1.expect)(chatResponseTree).to.deep.equal(new vscodeTypes_1.ChatResponseFileTreePart([
            {
                name: 'project',
                children: [
                    { name: 'file1.txt' },
                    { name: 'file2.txt' }
                ]
            }
        ], uri_1.URI.file('/preview/project')));
    });
    (0, vitest_1.test)('should handle nested directories', () => {
        const fileStructure = `
project
├── dir1
│   └── file1.txt
└── dir2
    └── file2.txt
		`;
        const { chatResponseTree, projectName } = (0, fileTreeParser_1.convertFileTreeToChatResponseFileTree)(fileStructure, generatePreviewURI);
        (0, vitest_1.expect)(projectName).toBe('project');
        (0, vitest_1.expect)(chatResponseTree).to.deep.equal(new vscodeTypes_1.ChatResponseFileTreePart([
            {
                name: 'project',
                children: [
                    {
                        name: 'dir1',
                        children: [{ name: 'file1.txt' }]
                    },
                    {
                        name: 'dir2',
                        children: [{ name: 'file2.txt' }]
                    }
                ]
            }
        ], uri_1.URI.file('/preview/project')));
    });
    (0, vitest_1.test)('should filter out unwanted files', () => {
        const fileStructure = `
project
├── node_modules
├── file1.txt
└── file2.txt
		`;
        const { chatResponseTree, projectName } = (0, fileTreeParser_1.convertFileTreeToChatResponseFileTree)(fileStructure, generatePreviewURI);
        (0, vitest_1.expect)(projectName).toBe('project');
        (0, vitest_1.expect)(chatResponseTree).to.deep.equal(new vscodeTypes_1.ChatResponseFileTreePart([
            {
                name: 'project',
                children: [
                    { name: 'file1.txt' },
                    { name: 'file2.txt' }
                ]
            }
        ], uri_1.URI.file('/preview/project')));
    });
});
//# sourceMappingURL=fileTreeParser.spec.js.map