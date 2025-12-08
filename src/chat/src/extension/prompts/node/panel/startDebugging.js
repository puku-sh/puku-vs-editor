"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartDebuggingPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const envService_1 = require("../../../../platform/env/common/envService");
const extensionsService_1 = require("../../../../platform/extensions/common/extensionsService");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const map_1 = require("../../../../util/vs/base/common/map");
const path_1 = require("../../../../util/vs/base/common/path");
const uri_1 = require("../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const parseLaunchConfigFromResponse_1 = require("../../../onboardDebug/node/parseLaunchConfigFromResponse");
const copilotIdentity_1 = require("../base/copilotIdentity");
const instructionMessage_1 = require("../base/instructionMessage");
const promptRenderer_1 = require("../base/promptRenderer");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const conversationHistory_1 = require("./conversationHistory");
const fileVariable_1 = require("./fileVariable");
const projectLabels_1 = require("./projectLabels");
const visualFileTree_1 = require("./workspace/visualFileTree");
const workspaceStructure_1 = require("./workspace/workspaceStructure");
function getLaunchConfigExamples(inputType, outputStyle) {
    const o1Object = {
        configurations: [{
                type: 'node',
                request: 'launch',
                name: 'Launch Program',
                program: '${workspaceFolder}/app/index.js',
                args: ['--serve'],
            }],
    };
    const o2Object = {
        configurations: [{
                type: 'cppvsdbg',
                request: 'launch',
                name: 'Launch Program',
                program: '${workspaceFolder}/${input:executableName}.exe',
                stopAtEntry: true,
            }],
        inputs: [
            {
                type: "promptString",
                id: 'executableName',
                description: "Name of your executable",
            }
        ]
    };
    const styleOutput = (output) => outputStyle === 1 /* OutputStyle.ConfigOnly */
        ? JSON.stringify(output) : `\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\``;
    if (inputType === 0 /* StartDebuggingType.UserQuery */) {
        return `# Example
User:
My operating system is macOS.
Create a debug configuration to do the following: launch my node app

Assistant:
${styleOutput(o1Object)}

# Example
User:
My operating system is Windows.
Create a debug configuration to do the following: debug my c++ program

Assistant:
${styleOutput(o2Object)}
`;
    }
    else {
        return `# Example
User:
My operating system is macOS.
In the working directory \${workspaceFolder}/app, I ran this on the command line: node ./index --serve

Assistant:
${styleOutput(o1Object)}

# Example
User:
My operating system is Windows.
In the working directory \${workspaceFolder}, I ran this on the command line: make test

Assistant:
${styleOutput(o2Object)}
`;
    }
}
let StartDebuggingPrompt = class StartDebuggingPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, workspace, endpointProvider, instantiationService, extensionsService, fileSystemService, ignoreService, envService) {
        super(props);
        this.workspace = workspace;
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.extensionsService = extensionsService;
        this.fileSystemService = fileSystemService;
        this.ignoreService = ignoreService;
        this.envService = envService;
    }
    async prepare(sizing, progress, token) {
        if (token.isCancellationRequested) {
            return {};
        }
        if (token.isCancellationRequested) {
            return {};
        }
        const debuggerType = await this.getDebuggerType(progress, token);
        const [resources, schema] = await Promise.all([
            this.getResources(debuggerType, progress, token),
            this.getSchema(debuggerType, progress, token)
        ]);
        return { resources, schema };
    }
    async getFiles(requestedFiles, structureMetadata) {
        const fileResults = new map_1.ResourceSet();
        const returnedUris = workspaceStructure_1.MultirootWorkspaceStructure.toURIs(this.workspace, requestedFiles);
        const fileExists = (file) => this.fileSystemService.stat(file).then(() => true, () => false);
        const tryAdd = async (file) => {
            if (fileResults.has(file)) {
                return true;
            }
            const [exists, ignored] = await Promise.all([
                fileExists(file),
                this.ignoreService.isCopilotIgnored(file),
            ]);
            if (exists && !ignored) {
                fileResults.add(file);
                return true;
            }
            return false;
        };
        const todo = returnedUris.map(async ({ file, relativePath }) => {
            if (!structureMetadata || await fileExists(file)) {
                return tryAdd(file);
            }
            // The model sometimes doesn't fully qualify the path to nested files.
            // In these cases, try to guess what it means by looking at the what it does give us
            const bestGuess = structureMetadata.value
                .flatMap(root => root.tree.files.filter(f => f.path.endsWith(relativePath)))
                .sort((a, b) => a.path.length - b.path.length) // get the least-nested candidate
                .at(0);
            if (bestGuess) {
                return tryAdd(bestGuess);
            }
        });
        const defaultWorkspaceFolder = this.workspace.getWorkspaceFolders().at(0);
        const fileNeedle = returnedUris.at(0) ?? (defaultWorkspaceFolder && { file: defaultWorkspaceFolder, workspaceFolder: defaultWorkspaceFolder });
        if (fileNeedle) {
            for (const file of ['launch.json', 'tasks.json']) {
                todo.push(tryAdd(uri_1.URI.joinPath(fileNeedle.workspaceFolder, '.vscode', file)));
            }
            for (const usefulFile of ['README.md', 'CONTRIBUTING.md']) {
                const folderFsPath = fileNeedle.workspaceFolder.fsPath;
                // limit this to avoid looking for files in parent directories of the workspace
                todo.push(nearestDirectoryWhere(fileNeedle.file.fsPath, dir => dir.length >= folderFsPath.length ? tryAdd(uri_1.URI.joinPath(uri_1.URI.file(dir), usefulFile)) : Promise.resolve(undefined)));
            }
        }
        await Promise.all(todo);
        return [...fileResults];
    }
    async getResources(debuggerType, progress, token) {
        const r = await this.queryModelForRequestedFiles(debuggerType, progress, token);
        if (!r?.requestedFiles.length || token.isCancellationRequested) {
            return;
        }
        return this.getFiles(r.requestedFiles, r.structureMetadata);
    }
    async queryModelForRequestedFiles(debuggerType, progress, token) {
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const promptRenderer = this.props.input.type === 1 /* StartDebuggingType.CommandLine */
            ? promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, ReferenceFilesFromCliPrompt, { debuggerType, input: this.props.input, os: this.envService.OS }) : promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, ReferenceFilesFromQueryPrompt, { debuggerType, input: this.props.input, os: this.envService.OS });
        const prompt = await promptRenderer.render(undefined, token);
        const structureMetadata = prompt.metadata.get(workspaceStructure_1.WorkspaceStructureMetadata);
        const fetchResult = await endpoint.makeChatRequest('referenceFiles', prompt.messages, undefined, token, commonTypes_1.ChatLocation.Panel);
        if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            return undefined;
        }
        let requestedFiles;
        try {
            requestedFiles = JSON.parse(fetchResult.value);
        }
        catch {
            return;
        }
        if (!Array.isArray(requestedFiles)) {
            return;
        }
        if (this.props.input.type === 0 /* StartDebuggingType.UserQuery */) {
            // We will check for existing config
            requestedFiles.push('launch.json');
            if (!this.props.input.userQuery) {
                requestedFiles.push('README.md');
            }
        }
        progress?.report(new vscodeTypes_1.ChatResponseProgressPart('Requesting resources'));
        return { requestedFiles, structureMetadata };
    }
    async getSchema(debuggerType, progress, token) {
        if (!debuggerType) {
            return;
        }
        const schema = (0, parseLaunchConfigFromResponse_1.getSchemasForTypeAsList)(debuggerType, this.extensionsService);
        if (!schema) {
            return;
        }
        progress?.report(new vscodeTypes_1.ChatResponseProgressPart("Identified launch config properties"));
        return schema;
    }
    async getDebuggerType(progress, token) {
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, DebugTypePrompt, { debuggerTypes: this.getAllDebuggerTypes(), input: this.props.input, os: this.envService.OS });
        const prompt = await promptRenderer.render(undefined, token);
        const fetchResult = await endpoint.makeChatRequest('debugType', prompt.messages, undefined, token, commonTypes_1.ChatLocation.Panel);
        if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            return undefined;
        }
        // The model likes to return text like "You should use `node", so detect backticks
        return /`(.*?)`/.exec(fetchResult.value)?.[1] || fetchResult.value;
    }
    getAllDebuggerTypes() {
        return this.extensionsService.allAcrossExtensionHosts.filter(e => !!e.packageJSON?.contributes?.debuggers).map(e => {
            const result = [];
            for (const d of e.packageJSON?.contributes?.debuggers) {
                if (d.type === '*' || d.deprecated) {
                    continue;
                }
                result.push(`- ${d.type}: ${d.label} (${e.id})`);
            }
            return result;
        }).flat();
    }
    render(state, sizing) {
        const style = this.props.input.type === 1 /* StartDebuggingType.CommandLine */ ? 1 /* OutputStyle.ConfigOnly */ : 0 /* OutputStyle.Readable */;
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                style === 1 /* OutputStyle.ConfigOnly */ ? (vscpp(vscppf, null,
                    "You are a Visual Studio Code assistant who specializes in debugging and creating launch configurations. Your task is to create a launch configuration for the user's query.",
                    vscpp("br", null))) : (vscpp(vscppf, null,
                    "You are a Visual Studio Code assistant who specializes in debugging, searching for existing launch configurations, and creating launch configurations. Your task is to find an existing launch configuration that matches the query or to create a launch configuration for the user's query if no match is found. If there's no query, still provide a response, checking for existing configurations in the launch.json file, if any.",
                    vscpp("br", null))),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { historyPriority: 600, passPriority: true, history: this.props.history },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    style === 0 /* OutputStyle.Readable */ && vscpp(vscppf, null,
                        "The user cannot see the context you are given, so you must not mention it. If you want to refer to it, you must include it in your reply.",
                        vscpp("br", null)),
                    "Print out the VS Code `launch.json` file needed to debug the command, formatted as JSON.",
                    vscpp("br", null),
                    "If there are build steps needed before the program can be debugged, be sure to include a `preLaunchTask` property in the launch configuration. If you include a `preLaunchTask` property, ",
                    state.resources?.some(r => r.path.endsWith('launch.json'))
                        ? vscpp(vscppf, null,
                            ' ',
                            "it must either refer to an existing a suitable task in the `tasks.json` file, or you must include a `tasks.json` file in your response that contains that configuration.")
                        : vscpp(vscppf, null,
                            ' ',
                            "you MUST also include `tasks.json` file in your response that contains that configuration."),
                    style === 0 /* OutputStyle.Readable */ && vscpp(vscppf, null,
                        ' ',
                        "Include a brief one or two sentence explaination of any such task definition is needed.",
                        vscpp("br", null)),
                    vscpp("br", null),
                    "Pay attention to my operating system and suggest the best tool for the platform I'm working on. For example, for debugging native code on Windows, you would not suggest the `lldb` type.",
                    vscpp("br", null),
                    "If there are unknowns, such as the path to the program, use the `inputs` field in the launch.json schema to prompt the user with an informative message. Input types may either be `promptString` for free text input or `pickString` with an `options` array for enumerations.",
                    vscpp("br", null),
                    "Do not give any other explanation.",
                    vscpp("br", null),
                    "If there are unknowns, such as the path to the program, use the `inputs` field in the launch.json schema to prompt the user with an informative message. Input types may either be `promptString` for free text input or `pickString` with an `options` array for enumerations. Do not include a default value for the input field.",
                    vscpp("br", null),
                    "Always include the following properties in the launch.json file:",
                    vscpp("br", null),
                    "- type: the type of debugger to use for this launch configuration. Every installed debug extension introduces a type: node for the built-in Node debugger, for example, or php and go for the PHP and Go extensions.",
                    vscpp("br", null),
                    "- request:  the request type of this launch configuration. Currently, launch and attach are supported.",
                    vscpp("br", null),
                    "- name:  the reader-friendly name to appear in the Debug launch configuration dropdown.",
                    vscpp("br", null),
                    "If a result is not a valid answer, but it still relates to Visual Studio Code, please still respond.",
                    vscpp("br", null),
                    "Please do not guess a response and instead just respond with a polite apology if you are unsure.",
                    vscpp("br", null),
                    "If you believe the given context given to you is incorrect or not relevant you may ignore it.",
                    vscpp("br", null),
                    getLaunchConfigExamples(this.props.input.type, style),
                    vscpp("br", null))),
            vscpp(prompt_tsx_1.UserMessage, { priority: 700 },
                state.docSearchResults && state.docSearchResults.length > 0 && vscpp(vscppf, null,
                    "Below is a list of information from the Visual Studio Code documentation which might be relevant to the question. ",
                    vscpp("br", null)),
                state.docSearchResults && state.docSearchResults.map((result) => {
                    if (result?.title && result.contents) {
                        vscpp(prompt_tsx_1.TextChunk, null,
                            "##",
                            result?.title?.trim(),
                            " - ",
                            result.path,
                            vscpp("br", null),
                            result.contents);
                    }
                })),
            vscpp(prompt_tsx_1.UserMessage, { priority: 850 }, state.schema && vscpp(vscppf, null,
                "Below is a list of properties that the launch config might include. ",
                vscpp("br", null),
                state.schema.map((property) => {
                    return vscpp(prompt_tsx_1.TextChunk, null,
                        property,
                        vscpp("br", null));
                }),
                ")",
                vscpp("br", null))),
            vscpp(prompt_tsx_1.UserMessage, { priority: 700, flexGrow: 1 }, this.props.input.type === 0 /* StartDebuggingType.UserQuery */
                ? vscpp(vscppf, null,
                    "If a program property is included in the launch config, and its path does not exist in the workspace or there are multiple files that could work, use the `inputs` field in the launch.json schema to prompt the user with an informative message.",
                    vscpp("br", null),
                    vscpp(workspaceStructure_1.MultirootWorkspaceStructure, { maxSize: 1000 }))
                : vscpp(StructureOfWorkingDirectory, { input: this.props.input })),
            vscpp(prompt_tsx_1.UserMessage, { priority: 800 },
                state.resources && state.resources.length > 0 && vscpp(vscppf, null,
                    "Below is a list of file contents from the workspace that might be useful in building the launch config. ",
                    vscpp("br", null)),
                state.resources && state.resources.map((resource) => {
                    const containingFolder = this.workspace.getWorkspaceFolder(resource);
                    const name = containingFolder ? resource.path.substring(containingFolder.path.length + 1) : (0, path_1.basename)(resource.path);
                    return vscpp(fileVariable_1.FileVariable, { variableName: name, variableValue: resource });
                })),
            vscpp(prompt_tsx_1.UserMessage, { priority: 850 }, this.props.input.type === 0 /* StartDebuggingType.UserQuery */ && state.resources?.some(r => r.path.endsWith('launch.json')) && (vscpp(vscppf, null,
                this.props.input.userQuery
                    ? vscpp(vscppf, null,
                        "Search in that provided launch.json file for an existing configuration based on the query \"",
                        this.props.input.userQuery,
                        "\". Pay particular attention to the name of the launch configuration and compare it to the query. If a match is found, include that configuration. Do not include the whole launch.json context. End the response with HAS_MATCH.",
                        vscpp("br", null))
                    : vscpp(vscppf, null,
                        "Scan any provided documentation to determine which configuration in the provided launch.json file is recommended, if any. Show some, not all, of the launch configurations that are available. End the response with HAS_CONFIG_NO_QUERY.",
                        vscpp("br", null)),
                "If no match is found, include the new configuration that was generated. End the response with GENERATED_CONFIG.",
                vscpp("br", null)))),
            style === 1 /* OutputStyle.ConfigOnly */
                ? vscpp(prompt_tsx_1.UserMessage, { priority: 850 },
                    vscpp(tag_1.Tag, { name: 'example' },
                        "In this example, we're debugging a simple Python file, so we only need a launch.json:",
                        vscpp("br", null),
                        vscpp(tag_1.Tag, { name: 'request' },
                            "In the working directory, I ran this on the command line: `python main.py`",
                            vscpp("br", null)),
                        vscpp(tag_1.Tag, { name: 'response' },
                            "launch.json:",
                            vscpp("br", null),
                            "```json",
                            vscpp("br", null),
                            JSON.stringify({
                                type: 'python',
                                request: 'launch',
                                name: 'Launch Program',
                                program: '${workspaceFolder}/main.py',
                            }, null, '\t'),
                            vscpp("br", null),
                            "```",
                            vscpp("br", null))),
                    vscpp(tag_1.Tag, { name: 'example' },
                        "In this example, generate both a launch.json and tasks.json because the program needs to be built before it can be debugged:",
                        vscpp("br", null),
                        vscpp(tag_1.Tag, { name: 'request' },
                            "In the working directory, I ran this on the command line: `./my-program.exe`",
                            vscpp("br", null)),
                        vscpp(tag_1.Tag, { name: 'response' },
                            "launch.json:",
                            vscpp("br", null),
                            "```json",
                            vscpp("br", null),
                            JSON.stringify({
                                configurations: [{
                                        "type": "cppvsdbg",
                                        "request": "launch",
                                        "name": "Launch Program",
                                        "program": "${workspaceFolder}/my-program.exe",
                                        "preLaunchTask": "build"
                                    }]
                            }, null, '\t'),
                            vscpp("br", null),
                            "```",
                            vscpp("br", null),
                            "tasks.json:",
                            vscpp("br", null),
                            "```json",
                            vscpp("br", null),
                            JSON.stringify({
                                tasks: [{
                                        "type": "shell",
                                        "label": "build",
                                        "command": "make",
                                        "args": ["build"]
                                    }]
                            }, null, '\t'),
                            vscpp("br", null),
                            "```",
                            vscpp("br", null))))
                : vscpp(prompt_tsx_1.UserMessage, { priority: 850 },
                    vscpp(tag_1.Tag, { name: 'example' },
                        "In this example, we're debugging a simple Python file, so we only need a launch.json:",
                        vscpp("br", null),
                        vscpp(tag_1.Tag, { name: 'request' },
                            "Here's a description of the app I want to debug: \"python file\"",
                            vscpp("br", null),
                            "In my workspace I have the files main.py, tox.ini, and README.md.",
                            vscpp("br", null)),
                        vscpp(tag_1.Tag, { name: 'response' },
                            "Here is your `launch.json` configuration:",
                            vscpp("br", null),
                            "```json",
                            vscpp("br", null),
                            JSON.stringify({
                                type: 'python',
                                request: 'launch',
                                name: 'Launch Program',
                                program: '${workspaceFolder}/main.py',
                            }, null, '\t'),
                            vscpp("br", null),
                            "```",
                            vscpp("br", null))),
                    vscpp(tag_1.Tag, { name: 'example' },
                        "In this example, generate both a launch.json and tasks.json because the program needs to be built before it can be debugged:",
                        vscpp("br", null),
                        vscpp(tag_1.Tag, { name: 'request' },
                            "Here's a description of the app I want to debug: \"my-program\"",
                            vscpp("br", null),
                            "In my workspace I have the files Makefile, my-program.cpp.",
                            vscpp("br", null)),
                        vscpp(tag_1.Tag, { name: 'response' },
                            "Here is your `launch.json` configuration:",
                            vscpp("br", null),
                            "```json",
                            vscpp("br", null),
                            JSON.stringify({
                                configurations: [{
                                        "type": "cppvsdbg",
                                        "request": "launch",
                                        "name": "Launch Program",
                                        "program": "${workspaceFolder}/my-program.exe",
                                        "preLaunchTask": "build"
                                    }]
                            }, null, '\t'),
                            vscpp("br", null),
                            "```",
                            vscpp("br", null),
                            "It looks like you build your project using your Makefile, so let's add a `tasks.json` to do that before each debug session:",
                            vscpp("br", null),
                            "```json",
                            vscpp("br", null),
                            JSON.stringify({
                                tasks: [{
                                        "type": "shell",
                                        "label": "build",
                                        "command": "make",
                                        "args": ["build"]
                                    }]
                            }, null, '\t'),
                            vscpp("br", null),
                            "```",
                            vscpp("br", null)))),
            vscpp(InputDescription, { priority: 900, input: this.props.input, os: this.envService.OS })));
    }
};
exports.StartDebuggingPrompt = StartDebuggingPrompt;
exports.StartDebuggingPrompt = StartDebuggingPrompt = __decorate([
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, endpointProvider_1.IEndpointProvider),
    __param(3, instantiation_1.IInstantiationService),
    __param(4, extensionsService_1.IExtensionsService),
    __param(5, fileSystemService_1.IFileSystemService),
    __param(6, ignoreService_1.IIgnoreService),
    __param(7, envService_1.IEnvService)
], StartDebuggingPrompt);
let StructureOfWorkingDirectory = class StructureOfWorkingDirectory extends prompt_tsx_1.PromptElement {
    constructor(props, instantiationService, workspaceService) {
        super(props);
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
    }
    async render(_state, sizing, _progress, token) {
        const maxSize = sizing.tokenBudget / 2; // note: size in the tree is in chars, /2 to be safe
        const wf = this.props.input.relativeCwd
            ? this.workspaceService.getWorkspaceFolder(uri_1.URI.file(this.props.input.absoluteCwd))
            : undefined;
        if (wf) {
            const tree = await this.instantiationService.invokeFunction(accessor => (0, visualFileTree_1.workspaceVisualFileTree)(accessor, wf, { maxLength: maxSize }, token ?? cancellation_1.CancellationToken.None));
            return vscpp(vscppf, null,
                "My workspace folder (`$",
                '{',
                "workspaceFolder",
                '}',
                "`) has the following structure:",
                vscpp("br", null),
                vscpp("br", null),
                vscpp("meta", { value: new workspaceStructure_1.WorkspaceStructureMetadata([{ label: '', tree }]), local: true }),
                tree.tree);
        }
        return vscpp(workspaceStructure_1.MultirootWorkspaceStructure, { maxSize: maxSize });
    }
};
StructureOfWorkingDirectory = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, workspaceService_1.IWorkspaceService)
], StructureOfWorkingDirectory);
class ReferenceFilesFromQueryPrompt extends prompt_tsx_1.PromptElement {
    render(_state, _sizing) {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 10 },
                "You are a Visual Studio Code assistant who specializes in debugging and creating launch configurations. Your job is to return an array of file names that may contain useful information to translate a user query into a VS Code debug configuration.",
                vscpp("br", null),
                "The user will give you a file tree. Make sure to fully qualify paths you return from the tree, including their parent directories:",
                vscpp("br", null),
                "Do not give any other explanation and return only a JSON array of strings. Avoid wrapping the whole response in triple backticks. Do not include any other information in your response.",
                vscpp("br", null),
                vscpp(prompt_tsx_1.TextChunk, { priority: 8 },
                    "# Example 1",
                    vscpp("br", null),
                    "## User: ",
                    vscpp("br", null),
                    "I am working in a workspace that has the following structure: ",
                    `
\`\`\`
src/
	index.js
	app.js
package.json
\`\`\`
`,
                    "I want to: Create node app launch configuration",
                    vscpp("br", null),
                    "## Response:",
                    vscpp("br", null),
                    JSON.stringify(['package.json', 'src/index.js', 'src/app.js']),
                    vscpp("br", null),
                    vscpp("br", null),
                    "# Example 2",
                    vscpp("br", null),
                    "## User: ",
                    vscpp("br", null),
                    "I am working in a workspace that has the following structure: ",
                    `
\`\`\`
src/
	main.rs
	lib.rs
Cargo.toml
\`\`\`
`,
                    "I want to: Launch a rust app with lldb",
                    vscpp("br", null),
                    "## Response:",
                    vscpp("br", null),
                    JSON.stringify(['Cargo.toml', 'src/main.rs']),
                    vscpp("br", null),
                    vscpp("br", null),
                    "# Example 3",
                    vscpp("br", null),
                    "## User: ",
                    vscpp("br", null),
                    "I want to: Launch a go app",
                    vscpp("br", null),
                    "## Response:",
                    vscpp("br", null),
                    JSON.stringify(['main.go', 'go.mod']),
                    vscpp("br", null),
                    vscpp("br", null))),
            vscpp(prompt_tsx_1.UserMessage, { priority: 7 },
                vscpp(workspaceStructure_1.MultirootWorkspaceStructure, { maxSize: 1000 })),
            vscpp(InputDescription, { priority: 4, ...this.props })));
    }
}
class ReferenceFilesFromCliPrompt extends prompt_tsx_1.PromptElement {
    render(_state, _sizing) {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 10 },
                "You are a Visual Studio Code assistant who specializes in debugging and creating launch configurations. Your job is to return an array of file names that may contain useful information to translate a command line invocation into a VS Code debug configuration and build task.",
                vscpp("br", null),
                "For example, when running a command `make tests`, you should ask for the `Makefile` because it contains information about how the tests are run.",
                vscpp("br", null),
                "The user will give you a file tree. Make sure to fully qualify paths you return from the tree, including their parent directories:",
                vscpp("br", null),
                "Do not give any other explanation and return only a JSON array of strings. Avoid wrapping the whole response in triple backticks. Do not include any other information in your response.",
                vscpp("br", null),
                vscpp(prompt_tsx_1.TextChunk, { priority: 8 },
                    "# Example",
                    vscpp("br", null),
                    "## User: ",
                    vscpp("br", null),
                    "I am working in a workspace that has the following structure: ",
                    `
\`\`\`
myapp/
	package.json
\`\`\`
`,
                    "I ran this on the command line: `npm run start`",
                    vscpp("br", null),
                    "## Response:",
                    vscpp("br", null),
                    JSON.stringify(['myapp/package.json']),
                    vscpp("br", null),
                    vscpp("br", null),
                    "# Example",
                    vscpp("br", null),
                    "## User: ",
                    vscpp("br", null),
                    "I ran this on the command line: cargo run",
                    vscpp("br", null),
                    "## Response:",
                    vscpp("br", null),
                    JSON.stringify(['Cargo.toml']),
                    vscpp("br", null),
                    vscpp("br", null))),
            vscpp(prompt_tsx_1.UserMessage, { priority: 7, flexGrow: 1 },
                vscpp(StructureOfWorkingDirectory, { input: this.props.input })),
            vscpp(InputDescription, { priority: 4, ...this.props })));
    }
}
class InputDescription extends prompt_tsx_1.PromptElement {
    render() {
        if (this.props.input.type === 0 /* StartDebuggingType.UserQuery */ && this.props.input.userQuery) {
            return vscpp(prompt_tsx_1.UserMessage, null,
                "Here's a description of the app I want to debug: ",
                this.props.input.userQuery,
                this.props.debuggerType ? ` and the debugging type: ${this.props.debuggerType}` : '');
        }
        else if (this.props.input.type === 0 /* StartDebuggingType.UserQuery */) {
            if (this.props.debuggerType) {
                return vscpp(prompt_tsx_1.UserMessage, null,
                    "I want to use the $",
                    this.props.debuggerType,
                    " debug type for my configuration.");
            }
            else {
                return vscpp(prompt_tsx_1.UserMessage, null, "Find an existing launch config for my app or create one based on my project stucture and workspace");
            }
        }
        else {
            return vscpp(prompt_tsx_1.UserMessage, null,
                "My operating system is ",
                this.props.os,
                ".",
                vscpp("br", null),
                "In the working directory `",
                (this.props.input.relativeCwd || this.props.input.absoluteCwd).replaceAll('\\', '/'),
                "`, I ran this on the command line:",
                vscpp("br", null),
                '```\n' + this.props.input.args.map(a => a.replaceAll('\n', '\\n')).join(' \\\n  ') + '\n```');
        }
    }
}
class DebugTypePrompt extends prompt_tsx_1.PromptElement {
    render(_state, _sizing) {
        const cli = this.props.input.type === 1 /* StartDebuggingType.CommandLine */;
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 10 },
                "You are a Visual Studio Code assistant. Your job is to assist users in using Visual Studio Code by providing knowledge to accomplish their task. Please do not guess a response and instead just respond with a polite apology if you are unsure.",
                vscpp("br", null),
                "You are a debugging expert. Your job is to return the debug type to use for launch config for the given use case.",
                vscpp("br", null),
                "Pay attention to my operating system and suggest the best tool for the platform I'm working on. For example, for debugging native code on Windows, you would not suggest the `lldb` type.",
                vscpp("br", null),
                this.props.input.type === 1 /* StartDebuggingType.CommandLine */ && vscpp(vscppf, null,
                    "The command I give you is used to run code that I'm working on. Although the command itself might not directly be my program, you should suggest a tool to debug the likely language I'm working in.",
                    vscpp("br", null)),
                "The user will list the debug types they have installed, but this is not a complete list of debug types available. You may suggest a type outside of that list if it's a better fit.",
                vscpp("br", null),
                vscpp("br", null),
                vscpp(prompt_tsx_1.TextChunk, { priority: 8 },
                    "# Example 1",
                    vscpp("br", null),
                    "## User: ",
                    vscpp("br", null),
                    cli ? 'npx mocha' : 'Node.js',
                    vscpp("br", null),
                    "## Response:",
                    vscpp("br", null),
                    "`node`",
                    vscpp("br", null),
                    vscpp("br", null),
                    "# Example 2",
                    vscpp("br", null),
                    "## User: ",
                    vscpp("br", null),
                    cli ? 'python3 example.py' : 'Python',
                    vscpp("br", null),
                    "## Response:",
                    vscpp("br", null),
                    "`debugpy`",
                    vscpp("br", null),
                    vscpp("br", null),
                    "# Example 3",
                    vscpp("br", null),
                    "## User: ",
                    vscpp("br", null),
                    cli ? 'mvn test -Dtest=TestCircle' : 'Java',
                    vscpp("br", null),
                    "## Response:",
                    vscpp("br", null),
                    "`java`",
                    vscpp("br", null),
                    vscpp("br", null)),
                "Suggest the right debug type for my use case. Print ONLY the debug type. NEVER print any other explanation.",
                vscpp("br", null)),
            vscpp(projectLabels_1.ProjectLabels, { flexGrow: 1, priority: 7, embeddedInsideUserMessage: false }),
            vscpp(InputDescription, { ...this.props, priority: 6 }),
            vscpp(prompt_tsx_1.UserMessage, { priority: 5, flexGrow: 1 },
                vscpp(prompt_tsx_1.TextChunk, null, "Here are the debug types I have installed:"),
                vscpp(prompt_tsx_1.TextChunk, { flexGrow: 1, breakOnWhitespace: true }, this.props.debuggerTypes.join('\n')))));
    }
}
async function nearestDirectoryWhere(rootDir, predicate) {
    while (true) {
        const value = await predicate(rootDir);
        if (value !== undefined) {
            return value;
        }
        const parent = (0, path_1.dirname)(rootDir);
        if (parent === rootDir) {
            return undefined;
        }
        rootDir = parent;
    }
}
//# sourceMappingURL=startDebugging.js.map