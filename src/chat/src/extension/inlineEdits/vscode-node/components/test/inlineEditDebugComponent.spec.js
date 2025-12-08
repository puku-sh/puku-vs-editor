"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const inlineEditDebugComponent_1 = require("../inlineEditDebugComponent");
(0, vitest_1.suite)('filter recording for sensitive files', () => {
    (0, vitest_1.test)('should filter out settings.json files', () => {
        const log = [
            {
                documentType: "workspaceRecording@1.0",
                kind: "header",
                repoRootUri: "file:///path/to/repo",
                time: 1733253792609,
                uuid: "233d78f2-202a-4d3e-9b90-0f1acc058125"
            },
            {
                kind: "documentEncountered",
                id: 1,
                relativePath: "package.json",
                time: 1733253735332
            },
            {
                kind: "documentEncountered",
                id: 2,
                relativePath: ".vscode/settings.json",
                time: 1733253735340
            },
            {
                kind: "setContent",
                id: 1,
                v: 1,
                content: "{ \"name\": \"example\" }",
                time: 1733253735332
            },
            {
                kind: "setContent",
                id: 2,
                v: 1,
                content: "{ \"sensitive\": \"data\" }",
                time: 1733253735340
            }
        ];
        const result = (0, inlineEditDebugComponent_1.filterLogForSensitiveFiles)(log);
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
			[
			  {
			    "documentType": "workspaceRecording@1.0",
			    "kind": "header",
			    "repoRootUri": "file:///path/to/repo",
			    "time": 1733253792609,
			    "uuid": "233d78f2-202a-4d3e-9b90-0f1acc058125",
			  },
			  {
			    "id": 1,
			    "kind": "documentEncountered",
			    "relativePath": "package.json",
			    "time": 1733253735332,
			  },
			  {
			    "content": "{ "name": "example" }",
			    "id": 1,
			    "kind": "setContent",
			    "time": 1733253735332,
			    "v": 1,
			  },
			]
		`);
    });
});
//# sourceMappingURL=inlineEditDebugComponent.spec.js.map