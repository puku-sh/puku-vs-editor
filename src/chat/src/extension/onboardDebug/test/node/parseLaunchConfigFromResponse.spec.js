"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const parseLaunchConfigFromResponse_1 = require("../../node/parseLaunchConfigFromResponse");
const input = `\`\`\`json
{
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Cargo Run",
      "program": "\${workspaceFolder}/target/debug/\${workspaceFolderBasename}",
      "preLaunchTask": "cargo build"
    }
  ],
  "inputs": [
    {
      "type": "promptString",
      "id": "executableName",
      "description": "Name of your executable"
    }
  ]
}
\`\`\`
It looks like you build your project using Cargo, so let's add a \`tasks.json\` to do that before each debug session:
\`\`\`json
{
  "tasks": [
    {
      "type": "shell",
      "label": "cargo build",
      "command": "cargo",
      "args": [
        "build"
      ]
    }
  ]
}
\`\`\`
`;
(0, vitest_1.suite)('parseLaunchConfigFromResponse', () => {
    (0, vitest_1.test)('works', () => {
        (0, vitest_1.expect)((0, parseLaunchConfigFromResponse_1.parseLaunchConfigFromResponse)(input, {
            allAcrossExtensionHosts: [],
        })).toMatchInlineSnapshot(`
			{
			  "configurations": [
			    {
			      "name": "Cargo Run",
			      "preLaunchTask": "cargo build",
			      "program": "\${workspaceFolder}/target/debug/\${workspaceFolderBasename}",
			      "request": "launch",
			      "type": "lldb",
			    },
			  ],
			  "inputs": [
			    {
			      "description": "Name of your executable",
			      "id": "executableName",
			      "type": "promptString",
			    },
			  ],
			  "tasks": [
			    {
			      "args": [
			        "build",
			      ],
			      "command": "cargo",
			      "label": "cargo build",
			      "type": "shell",
			    },
			  ],
			}
		`);
    });
});
//# sourceMappingURL=parseLaunchConfigFromResponse.spec.js.map