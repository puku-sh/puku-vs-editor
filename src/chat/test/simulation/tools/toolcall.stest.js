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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const console_1 = require("console");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const toolsRegistry_1 = require("../../../src/extension/tools/common/toolsRegistry");
const toolsService_1 = require("../../../src/extension/tools/common/toolsService");
const conversationOptions_1 = require("../../../src/platform/chat/common/conversationOptions");
const isInExtensionHost_1 = require("../../../src/platform/test/node/isInExtensionHost");
const simulationWorkspace_1 = require("../../../src/platform/test/node/simulationWorkspace");
const mockChatResponseStream_1 = require("../../../src/util/common/test/mockChatResponseStream");
const simulationWorkspaceExtHost_1 = require("../../base/extHostContext/simulationWorkspaceExtHost");
const stest_1 = require("../../base/stest");
const scenarioLoader_1 = require("../../e2e/scenarioLoader");
const scenarioTest_1 = require("../../e2e/scenarioTest");
const toolArgsPreprocessors = {
    'get_errors': (_accessor, args, workspaceFoldersFilePaths) => {
        const filePaths = (args.filePaths ?? []).map((filePath) => {
            if (path.isAbsolute(filePath)) {
                return filePath;
            }
            // Use the first workspace folder as base path if available
            return workspaceFoldersFilePaths && workspaceFoldersFilePaths.length > 0
                ? path.resolve(workspaceFoldersFilePaths[0], filePath)
                : filePath;
        });
        return {
            ...args,
            filePaths
        };
    },
    'read_file': (_accessor, args, workspaceFoldersFilePaths) => {
        (0, console_1.assert)(args.filePath, 'read_file tool requires a file path to read');
        const filePath = args.filePath;
        // Convert to absolute path if it's relative and we have workspace folders
        const resolvedFilePath = path.isAbsolute(filePath) || !workspaceFoldersFilePaths || workspaceFoldersFilePaths.length === 0
            ? filePath
            : path.resolve(workspaceFoldersFilePaths[0], filePath);
        return {
            ...args,
            filePath: resolvedFilePath
        };
    },
    // Add more tool-specific preprocessors here as needed
    // 'another_tool': (args: any, runtime: ISimulationTestRuntime) => { ... }
};
(0, stest_1.ssuite)({ title: 'tooltest', subtitle: 'toolcall', location: 'panel' }, (inputPath) => {
    // This test suite simulates the execution of tools in a controlled environment
    if (!inputPath) {
        return;
    }
    const toolCallsFolder = inputPath;
    const scenarios = (0, scenarioLoader_1.discoverToolsCalls)(toolCallsFolder);
    for (const scenario of scenarios) {
        let outputFilePath;
        if (scenario.json.outputPath) {
            outputFilePath = path.resolve(toolCallsFolder, scenario.json.outputPath);
        }
        (0, stest_1.stest)({ description: scenario.name }, async (testingServiceCollection) => {
            try {
                const input = scenario.json.toolArgs;
                testingServiceCollection.define(conversationOptions_1.IConversationOptions, (0, scenarioTest_1.fetchConversationOptions)());
                const simulationWorkspace = isInExtensionHost_1.isInExtensionHost ? new simulationWorkspaceExtHost_1.SimulationWorkspaceExtHost() : new simulationWorkspace_1.SimulationWorkspace();
                simulationWorkspace.setupServices(testingServiceCollection);
                const accessor = testingServiceCollection.createTestingAccessor();
                simulationWorkspace.resetFromDeserializedWorkspaceState(scenario.getState?.());
                let workspaceFoldersFilePaths;
                if (scenario.stateFilePath) {
                    const stateJson = await fs.promises.readFile(scenario.stateFilePath, 'utf-8');
                    const state = JSON.parse(stateJson);
                    const stateFileDir = path.dirname(scenario.stateFilePath);
                    if (state.workspaceFoldersFilePaths) {
                        workspaceFoldersFilePaths = state.workspaceFoldersFilePaths.map((folder) => {
                            if (path.isAbsolute(folder)) {
                                return folder;
                            }
                            return path.resolve(stateFileDir, folder);
                        });
                    }
                }
                const result = await invokeTool(accessor, input.tool, input.args || {}, workspaceFoldersFilePaths);
                const output = {
                    toolName: input.tool,
                    args: input.args || {},
                    result
                };
                if (outputFilePath) {
                    await writeOutputFile(outputFilePath, output);
                }
                else {
                    console.log('Tool output:', JSON.stringify(output, null, 2));
                }
            }
            catch (error) {
                const errorOutput = {
                    error: {
                        message: error.message,
                        stack: error.stack
                    }
                };
                if (outputFilePath) {
                    await writeOutputFile(outputFilePath, errorOutput);
                }
                throw error;
            }
        });
    }
    async function writeOutputFile(filePath, content) {
        try {
            await fs.promises.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to write output file: ${error.message}`);
        }
    }
    async function invokeTool(accessor, toolName, args, workspaceFoldersFilePaths) {
        const token = {
            isCancellationRequested: false,
            onCancellationRequested: () => ({ dispose: () => { } })
        };
        const toolsService = accessor.get(toolsService_1.IToolsService);
        const tool = toolsService.getCopilotTool(toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }
        let processedArgs = args;
        if (toolArgsPreprocessors[toolName]) {
            processedArgs = await toolArgsPreprocessors[toolName](accessor, args, workspaceFoldersFilePaths);
        }
        if (tool.resolveInput) {
            const context = { stream: new mockChatResponseStream_1.SpyChatResponseStream() };
            processedArgs = await tool.resolveInput(processedArgs, context, toolsRegistry_1.CopilotToolMode.FullContext);
        }
        return await toolsService.invokeTool(toolName, {
            input: processedArgs || {},
            toolInvocationToken: undefined
        }, token);
    }
});
//# sourceMappingURL=toolcall.stest.js.map