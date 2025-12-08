"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseQueryForScenarioTest = parseQueryForScenarioTest;
exports.createWorkingSetFileVariable = createWorkingSetFileVariable;
exports.parseQueryForTest = parseQueryForTest;
const toolsService_1 = require("../../src/extension/tools/common/toolsService");
const resources_1 = require("../../src/util/vs/base/common/resources");
const vscodeTypes_1 = require("../../src/vscodeTypes");
/**
 * This has to recreate some of the variable parsing logic in VS Code so that we can write tests easily with variables
 * as strings, but then provide the extension code with the parsed variables in the extension API format.
*/
async function parseQueryForScenarioTest(accessor, testCase, simulationWorkspace) {
    const query = await parseQueryForTest(accessor, testCase.question, simulationWorkspace);
    // Simulate implicit context enablement
    const activeTextEditor = simulationWorkspace.activeTextEditor;
    if (activeTextEditor) {
        const selection = activeTextEditor.selections?.[0];
        if (selection) {
            query.variables.push({
                id: 'vscode.implicit',
                name: `file:${(0, resources_1.basename)(activeTextEditor.document.uri)}`,
                value: new vscodeTypes_1.Location(activeTextEditor.document.uri, selection),
                modelDescription: `User's active selection`
            });
        }
        else {
            query.variables.push({
                id: 'vscode.implicit',
                name: `file:${(0, resources_1.basename)(activeTextEditor.document.uri)}`,
                value: activeTextEditor.document.uri,
                modelDescription: `User's active file`
            });
        }
    }
    return query;
}
function createWorkingSetFileVariable(uri) {
    return {
        id: 'copilot.file',
        name: `file:${(0, resources_1.basename)(uri)}`,
        value: uri,
    };
}
function parseQueryForTest(accessor, query, simulationWorkspace) {
    const variableReg = /#([\w_\-]+)(?::(\S+))?(?=(\s|$|\b))/ig;
    const toolsService = accessor.get(toolsService_1.IToolsService);
    const match = query.match(/(?:@(\S+))?\s*(?:\/(\S+))?(.*)/);
    let command;
    let participantName;
    if (match) {
        participantName = match[1];
        command = match[2];
        query = match[3]?.trim() || '';
    }
    const variables = [];
    const toolReferences = [];
    let varMatch;
    while (varMatch = variableReg.exec(query)) {
        const [_, varName, arg] = varMatch;
        const range = [varMatch.index, varMatch.index + varMatch[0].length];
        if (varName === 'file') {
            const value = parseFileVariables(simulationWorkspace, arg);
            const varWithArg = `${varName}:${arg}`;
            variables.push({ id: `copilot.${varName}`, name: varWithArg, range, value });
        }
        else {
            const tool = toolsService.getToolByToolReferenceName(varName);
            if (tool) {
                toolReferences.push(tool);
            }
        }
    }
    variables.sort((a, b) => (b.range?.[0] ?? 0) - (a.range?.[0] ?? 0));
    return {
        query,
        participantName,
        command,
        variables,
        toolReferences
    };
}
function parseFileVariables(simulationWorkspace, filePath) {
    for (const doc of simulationWorkspace.documents) {
        if ((0, resources_1.basename)(doc.document.uri) === filePath) {
            return doc.document.uri;
        }
    }
    return vscodeTypes_1.Uri.joinPath(simulationWorkspace.workspaceFolders[0], filePath);
}
//# sourceMappingURL=testHelper.js.map