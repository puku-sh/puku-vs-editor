"use strict";
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceSetupResult = exports.GetWorkspaceSetupInfoTool = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const errors_1 = require("../../../../util/vs/base/common/errors");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
const toolNames_1 = require("../../common/toolNames");
const toolsRegistry_1 = require("../../common/toolsRegistry");
const setupInfo = [
    {
        projectType: 'vscode-extension',
        description: 'A template for creating a VS Code extension using Yeoman and Generator-Code.',
        executionCommands: [{
                command: 'npx --package yo --package generator-code -- yo code . --skipOpen',
                arguments: [
                    // { argName: '-i, --insiders', description: 'Show the insiders options for the generator' },
                    { argName: '-t, --extensionType', description: 'Specify extension type: ts, js, command-ts, command-js, colortheme, language, snippets, keymap, extensionpack, localization, commandweb, notebook', default: 'ts' },
                    { argName: '-n, --extensionDisplayName', description: 'Set the display name of the extension.' },
                    { argName: '--extensionId', description: 'Set the unique ID of the extension. Do not select this option if the user has not requested a unique ID.' },
                    { argName: '--extensionDescription', description: 'Provide a description for the extension' },
                    { argName: '--pkgManager', description: 'Specify package manager: npm, yarn, or pnpm', default: 'npm' },
                    { argName: '--bundler', description: 'Bundle the extension using webpack or esbuild' },
                    { argName: '--gitInit', description: 'Initialize a Git repository for the extension' },
                    { argName: '--snippetFolder', description: 'Specify the location of the snippet folder' },
                    { argName: '--snippetLanguage', description: 'Set the language for snippets' }
                ]
            },
        ],
        rules: [
            'Follow these rules strictly and do not deviate from them.',
            '1. Do not remove any arguments from the command. You can only add arguments if the user requests them.',
            `2. Call the tool ${toolNames_1.ToolName.VSCodeAPI} with the users query to get the relevant references. `,
            `3. After the tool ${toolNames_1.ToolName.VSCodeAPI} has completed, only then begin to modify the project.`,
        ]
    },
    {
        projectType: 'next-js',
        description: 'A React based framework for building server-rendered web applications.',
        executionCommands: [{
                command: 'npx create-next-app@latest .',
                arguments: [
                    { argName: '--ts, --typescript', description: 'Initialize as a TypeScript project. This is the default.' },
                    { argName: '--js, --javascript', description: 'Initialize as a JavaScript project.' },
                    { argName: '--tailwind', description: 'Initialize with Tailwind CSS config. This is the default.' },
                    { argName: '--eslint', description: 'Initialize with ESLint config.' },
                    { argName: '--app', description: 'Initialize as an App Router project.' },
                    { argName: '--src-dir', description: "Initialize inside a 'src/' directory." },
                    { argName: '--turbopack', description: 'Enable Turbopack by default for development.' },
                    { argName: '--import-alias <prefix/*>', description: 'Specify import alias to use.(default is "@/*")' },
                    { argName: '--api', description: 'Initialize a headless API using the App Router.' },
                    { argName: '--empty', description: 'Initialize an empty project.' },
                    { argName: '--use-npm', description: 'Explicitly tell the CLI to bootstrap the application using npm.' },
                    { argName: '--use-pnpm', description: 'Explicitly tell the CLI to bootstrap the application using pnpm.' },
                    { argName: '--use-yarn', description: 'Explicitly tell the CLI to bootstrap the application using Yarn.' },
                    { argName: '--use-bun', description: 'Explicitly tell the CLI to bootstrap the application using Bun.' }
                ]
            }]
    },
    {
        projectType: 'vite',
        description: 'A front end build tool for web applications that focuses on speed and performance. Can be used with React, Vue, Preact, Lit, Svelte, Solid, and Qwik.',
        executionCommands: [{
                command: 'npx create-vite@latest .',
                arguments: [
                    { argName: '-t, --template NAME', description: 'Use a specific template. Available templates: vanilla-ts, vanilla, vue-ts, vue, react-ts, react, react-swc-ts, react-swc, preact-ts, preact, lit-ts, lit, svelte-ts, svelte, solid-ts, solid, qwik-ts, qwik' }
                ]
            }]
    },
    {
        projectType: 'mcp-server',
        description: 'A Model Context Protocol (MCP) server project. This project supports multiple programming languages including TypeScript, JavaScript, Python, C#, Java, and Kotlin.',
        rules: [
            'Follow these rules strictly and do not deviate from them.',
            '1. First, visit https://github.com/modelcontextprotocol to find the correct SDK and setup instructions for the requested language. Default to TypeScript if no language is specified.',
            `2. Use the ${toolNames_1.ToolName.FetchWebPage} to find the correct implementation instructions from https://modelcontextprotocol.io/llms-full.txt`,
            '3. Update the copilot-instructions.md file in the .github directory to include references to the SDK documentation',
            '4. Create an `mcp.json` file in the `.vscode` folder in the project root with the following content: `{ "servers": { "mcp-server-name": { "type": "stdio", "command": "command-to-run", "args": [list-of-args] } } }`.',
            '- mcp-server-name: The name of the MCP server. Create a unique name that reflects what this MCP server does.',
            '- command-to-run: The command to run to start the MCP server. This is the command you would use to run the project you just created.',
            '- list-of-args: The arguments to pass to the command. This is the list of arguments you would use to run the project you just created.',
            '5. Install any required VS Code extensions based on the chosen language (e.g., Python extension for Python projects).',
            '6. Inform the user that they can now debug this MCP server using VS Code.',
        ]
    },
    {
        projectType: 'python-script',
        description: 'A simple Python script project which should be chosen when just a single script wants to be created.',
        requiredExtensions: ['ms-python.python', 'ms-python.vscode-python-envs'],
        rules: [
            'Follow these rules strictly and do not deviate from them.',
            `1. Call the tool ${toolNames_1.ToolName.RunVscodeCmd} to correctly create a new Python script project in VS Code. Call the command with the following arguments.`,
            `Note that "python-script" and "true" are constants while  "New Project Name" and "/path/to/new/project" are placeholders for the project name and path respectively.`,
            `{ `,
            `"name": "python-envs.createNewProjectFromTemplate",`,
            `"commandId": "python-envs.createNewProjectFromTemplate",`,
            `"args": [ "python-script", "true" , "New Project Name", "/path/to/new/project"]`,
            `}`,
        ]
    },
    {
        projectType: 'python-package',
        description: 'A Python package project which can be used to create a distributable package.',
        requiredExtensions: ['ms-python.python', 'ms-python.vscode-python-envs'],
        rules: [
            'Follow these rules strictly and do not deviate from them.',
            `1. Call the tool ${toolNames_1.ToolName.RunVscodeCmd} to correctly create a new Python package project in VS Code. Call the command with the following arguments:`,
            `Note that "python-package" and "true" are constants while  "New Package Name" and "/path/to/new/project" are placeholders for the package name and path respectively.`,
            `{ `,
            `"name": "python-envs.createNewProjectFromTemplate",`,
            `"commandId": "python-envs.createNewProjectFromTemplate",`,
            `"args": [ "python-package", "true" , "New Package Name", "/path/to/new/project"]`,
            `}`,
        ]
    }
];
let GetWorkspaceSetupInfoTool = class GetWorkspaceSetupInfoTool {
    static { this.toolName = toolNames_1.ToolName.GetProjectSetupInfo; }
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    async prepareInvocation(options, token) {
        return {
            invocationMessage: l10n.t `Getting setup information`,
        };
    }
    async invoke(options, token) {
        const { projectType } = options.input;
        const selectedSetupInfo = setupInfo.find((info) => info.projectType === projectType);
        const json = await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, WorkspaceSetupResult, { projectSetupInfo: selectedSetupInfo });
        if (token.isCancellationRequested) {
            throw new errors_1.CancellationError();
        }
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(json),
        ]);
    }
};
exports.GetWorkspaceSetupInfoTool = GetWorkspaceSetupInfoTool;
exports.GetWorkspaceSetupInfoTool = GetWorkspaceSetupInfoTool = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], GetWorkspaceSetupInfoTool);
toolsRegistry_1.ToolRegistry.registerTool(GetWorkspaceSetupInfoTool);
let WorkspaceSetupResult = class WorkspaceSetupResult extends prompt_tsx_1.PromptElement {
    constructor(props, configurationService) {
        super(props);
        this.configurationService = configurationService;
    }
    async render(state, sizing) {
        const useContext7 = this.configurationService.getConfig(configurationService_1.ConfigKey.NewWorkspaceUseContext7);
        if (useContext7) {
            return vscpp(vscppf, null,
                " ",
                vscpp(prompt_tsx_1.TextChunk, null,
                    "Use context7 tools to find the latest libraries, APIs, and documentation to help the user create and customize their project.",
                    vscpp("br", null),
                    "1. Call mcp_context7_resolve-library-id with your project requirements.",
                    vscpp("br", null),
                    "2. Call mcp_context7_get-library-docs to get scaffolding instructions.",
                    vscpp("br", null),
                    "You must call these tools before proceeding and confirm that you did NOT skip this step.",
                    vscpp("br", null),
                    vscpp("br", null)));
        }
        const { projectSetupInfo } = this.props;
        if (!projectSetupInfo) {
            return vscpp(vscppf, null,
                " ",
                vscpp(prompt_tsx_1.TextChunk, null,
                    "No project setup information found.",
                    vscpp("br", null)));
        }
        const setupInfo = JSON.stringify(projectSetupInfo, null, 2);
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.TextChunk, null,
                "Use the Project Setup Information:",
                vscpp("br", null),
                "$",
                setupInfo,
                vscpp("br", null)));
    }
};
exports.WorkspaceSetupResult = WorkspaceSetupResult;
exports.WorkspaceSetupResult = WorkspaceSetupResult = __decorate([
    __param(1, configurationService_1.IConfigurationService)
], WorkspaceSetupResult);
//# sourceMappingURL=projectSetupInfoTool.js.map