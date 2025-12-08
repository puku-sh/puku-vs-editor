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
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vitest_1 = require("vitest");
const fileTree_1 = require("../../../util/common/fileTree");
const uri_1 = require("../../../util/vs/base/common/uri");
(0, vitest_1.suite)('fileTreeParsing', () => {
    (0, vitest_1.test)('Simple File tree', () => {
        const baseUri = uri_1.URI.parse('file://foo/projectName');
        const fileTreePart = {
            baseUri: baseUri,
            value: [
                {
                    name: 'src',
                    children: [
                        {
                            name: 'file1.ts'
                        },
                        {
                            name: 'file2.ts'
                        },
                    ]
                },
                {
                    name: 'package.json'
                }
            ]
        };
        const fileTreeMarkdown = (0, fileTree_1.fileTreePartToMarkdown)(fileTreePart);
        assert.equal(fileTreeMarkdown, '```filetree\nprojectName\n├── src\n|   ├── file1.ts\n|   └── file2.ts\n└── package.json\n```\n');
    });
    (0, vitest_1.test)('File tree', () => {
        const baseUri = uri_1.URI.parse('file://foo/my-vscode-extension');
        const fileTreePart = {
            baseUri: baseUri,
            value: [
                {
                    name: '.vscode',
                    children: [
                        {
                            name: 'launch.json'
                        },
                        {
                            name: 'tasks.json'
                        },
                    ]
                },
                {
                    name: 'src',
                    children: [
                        {
                            name: 'extensions.ts'
                        },
                    ]
                },
                {
                    name: 'test',
                    children: [
                        {
                            name: 'extension.test.ts'
                        }
                    ]
                },
                {
                    name: 'package.json'
                },
                {
                    name: 'tsconfig.json'
                },
                {
                    name: 'README.md'
                }
            ]
        };
        const fileTreeMarkdown = (0, fileTree_1.fileTreePartToMarkdown)(fileTreePart);
        assert.equal(fileTreeMarkdown, '```filetree\nmy-vscode-extension\n├── .vscode\n|   ├── launch.json\n|   └── tasks.json\n├── src\n|   └── extensions.ts\n├── test\n|   └── extension.test.ts\n├── package.json\n├── tsconfig.json\n└── README.md\n```\n');
    });
});
//# sourceMappingURL=utils.fileTree.spec.js.map